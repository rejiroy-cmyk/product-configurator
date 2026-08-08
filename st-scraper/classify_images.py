#!/usr/bin/env python3
"""
classify_images.py — tell product photos apart from Milieubilder and CAD drawings.

The localisation pipeline copies whatever URL the data points at, faithfully. That
includes ~1,849 shared "grouped" images (a photo of a whole product family, often an
installed-in-a-bathroom scene) and an unknown number of technical line drawings that
live in Web/PG1 alongside real photos, so no filename rule can find them.

This looks at PIXELS, entirely offline — no vendor API, no cookie, no network. Run it
over public/img/ to find out how much of the catalogue is showing something other
than the product on its own.

Signals, measured on the thumbnail:
  bg_border  fraction of the 1px frame that is transparent or near-white. A studio
             product shot is cut out or sits on white, so its border is ~all
             background; a Milieubild is a photograph that bleeds to every edge.
  sat        mean saturation of the non-background pixels. Line drawings are grey.
  colours    distinct quantised colours. Drawings use very few; photos use many.
  ink        fraction of clearly dark pixels — drawings are thin strokes on white.

Usage:
  python3 st-scraper/classify_images.py public/img            # whole set -> report
  python3 st-scraper/classify_images.py a.png b.png --verbose # explain each file
"""

import argparse
import json
import os
import sys
from collections import Counter

import numpy as np
from PIL import Image

THUMB = 200


def measure(path):
    im = Image.open(path).convert('RGBA')
    if max(im.size) > THUMB:
        im.thumbnail((THUMB, THUMB), Image.LANCZOS)
    a = np.asarray(im, dtype=np.int16)
    h, w = a.shape[0], a.shape[1]
    r, g, b, al = a[..., 0], a[..., 1], a[..., 2], a[..., 3]

    bg = (al < 32) | ((r > 238) & (g > 238) & (b > 238))
    fg_mask = ~bg

    border = np.concatenate([bg[0, :], bg[-1, :], bg[:, 0], bg[:, -1]])
    bg_border = float(border.mean()) if border.size else 1.0

    fg = int(fg_mask.sum())
    if fg == 0:
        return {'bg_border': round(bg_border, 3), 'sat': 0.0, 'colours': 0,
                'ink': 0.0, 'fg_ratio': 0.0, 'run': 0.0, 'lum_levels': 0}

    fr, fg_, fb = r[fg_mask], g[fg_mask], b[fg_mask]
    mx = np.maximum(np.maximum(fr, fg_), fb)
    mn = np.minimum(np.minimum(fr, fg_), fb)
    sat = float(np.where(mx == 0, 0, (mx - mn) / np.maximum(mx, 1)).mean())

    lum = 0.299 * fr + 0.587 * fg_ + 0.114 * fb
    ink = float((lum < 90).mean())
    # Tonal spread: a photographed chrome fitting carries specular highlights and
    # reflections across many luminance bands; a wireframe is flat line-on-white.
    bands = np.bincount((lum.astype(np.int32) >> 4).clip(0, 15), minlength=16)
    lum_levels = int((bands / fg >= 0.02).sum())

    q = ((fr >> 4).astype(np.int32) << 8) | ((fg_ >> 4).astype(np.int32) << 4) | (fb >> 4)
    colours = int(np.unique(q).size)

    # Stroke-vs-solid. Colour stats cannot separate a CAD wireframe from a photo of a
    # white tray — both are grey and near-colourless. Geometry can: a drawing is thin
    # outlines, so a scanline crossing it hits short foreground runs separated by
    # white. A photographed solid object gives one long run across its body.
    rows = fg_mask[::3]
    padded = np.zeros((rows.shape[0], w + 2), dtype=bool)
    padded[:, 1:-1] = rows
    d = np.diff(padded.astype(np.int8), axis=1)
    starts = int((d == 1).sum())
    mean_run = (float(rows.sum()) / starts / w) if starts else 0.0

    return {
        'bg_border': round(bg_border, 3),
        'sat': round(sat, 3),
        'colours': colours,
        'ink': round(ink, 3),
        'fg_ratio': round(fg / float(w * h), 3),
        'run': round(mean_run, 3),
        'lum_levels': lum_levels,
    }


def classify(m):
    # A scene photo reaches the edges of the frame AND carries the colour/tonal range of
    # a photograph. The border test alone is not enough: a white shower tray shot
    # edge-to-edge also has no white border, and an earlier version flagged ~130 of
    # those as Milieubilder. Real scenes measured 98-280 quantised colours and 10-14
    # tonal bands; the tray false-positives measured 4-14 colours and 3-4 bands.
    if m['bg_border'] < 0.55 and m['colours'] >= 40 and m['lum_levels'] >= 6:
        return 'lifestyle'
    # Colourless AND made of thin strokes => wireframe. Both conditions are required:
    # colour alone flags every white tray, and thinness alone flags glass partitions
    # (a real product that is mostly transparent). Validated against a small hand-
    # checked set — drawings measured run 0.05, a glass panel 0.13, a solid tray 0.40 —
    # so treat this as triage, not proof.
    if m['sat'] < 0.12 and m['run'] < 0.09 and m['lum_levels'] < 8:
        return 'drawing'
    return 'product'


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('paths', nargs='+')
    ap.add_argument('--verbose', action='store_true')
    ap.add_argument('--json', dest='json_out')
    args = ap.parse_args()

    files = []
    for p in args.paths:
        if os.path.isdir(p):
            files += [os.path.join(p, f) for f in sorted(os.listdir(p))
                      if f.lower().endswith(('.webp', '.png', '.jpg', '.jpeg'))]
        else:
            files.append(p)

    counts = Counter()
    out = {}
    for i, f in enumerate(files, 1):
        try:
            m = measure(f)
        except Exception as e:                       # noqa: BLE001
            counts['error'] += 1
            continue
        kind = classify(m)
        counts[kind] += 1
        out[os.path.basename(f)] = kind
        if args.verbose:
            print('%-46s %-10s %s' % (os.path.basename(f)[:44], kind, m))
        elif i % 2000 == 0:
            print('  %d/%d ...' % (i, len(files)))
            sys.stdout.flush()

    total = sum(counts[k] for k in ('product', 'lifestyle', 'drawing'))
    print('\nclassified %d images' % total)
    for k in ('product', 'lifestyle', 'drawing'):
        pct = 100.0 * counts[k] / total if total else 0
        print('  %-10s %6d  (%.1f%%)' % (k, counts[k], pct))
    if counts['error']:
        print('  unreadable %d' % counts['error'])

    if args.json_out:
        with open(args.json_out, 'w') as fh:
            json.dump(out, fh, indent=1)
        print('\nper-file verdicts -> %s' % args.json_out)


if __name__ == '__main__':
    main()
