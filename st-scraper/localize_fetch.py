#!/usr/bin/env python3
"""
localize_fetch.py — download the catalogue images and resize them locally.

Second half of the localisation pipeline. localize-images.cjs --emit-jobs writes
localize-jobs.json ([{url, width, file}]); this fetches each original from the vendor
and writes a resized WebP into public/img/.

Why not a proxy: the previous version resized via wsrv.nl, which blocked this IP
(Cloudflare 1106) after ~3,500 images. Pillow does the same job locally, so the
pipeline no longer depends on anyone else's service — which is the entire point of
localising in the first place.

Vendor politeness: every URL here is HEAD-verified real, so this is ordinary asset
fetching, not the fabricated-URL pattern that got the account shadow-banned. Still
paced deliberately — 3 workers, retry with backoff, and a hard stop if the vendor
starts refusing us (see CONSECUTIVE_FAIL_LIMIT).

Resumable: a file already on disk is never re-fetched. Safe to re-run.

Usage:  python3 st-scraper/localize_fetch.py [--workers 3] [--limit N]
"""

import argparse
import io
import json
import os
import queue
import sys
import threading
import time
import urllib.error
import urllib.request

from urllib.parse import quote, urlsplit, urlunsplit

from PIL import Image, PngImagePlugin

# Vendor PNGs carry large embedded colour profiles / metadata. Pillow's default 1 MB
# text-chunk ceiling is a decompression-bomb guard, and it rejected 802 otherwise
# perfectly good catalogue images. These are files we fetched ourselves from a known
# host, so raise the ceiling rather than lose them.
PngImagePlugin.MAX_TEXT_CHUNK = 512 * 1024 * 1024
PngImagePlugin.MAX_TEXT_MEMORY = 512 * 1024 * 1024

DIR = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(DIR)
JOBS = os.path.join(DIR, 'localize-jobs.json')
OUT_DIR = os.path.join(ROOT, 'public', 'img')
FAILURES = os.path.join(DIR, 'localize-failures.json')

UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36'
TIMEOUT = 45
RETRIES = 3
# q75/method=6, matching the 2026-08-07 recompression of the whole corpus. At the 60-200 px
# widths these are stored at, q75 is indistinguishable from the old q82 even on polished
# chrome and knurled metal, and method=6 buys a few percent more for encode time paid once.
# Keep these in step with the corpus, or freshly scraped images drift heavier than the rest.
QUALITY = 75
METHOD = 6
MIN_BYTES = 100
# If the vendor starts refusing us, stop immediately rather than hammering it —
# a long run of failures is how a rate-limit turns into a ban.
CONSECUTIVE_FAIL_LIMIT = 40

lock = threading.Lock()
state = {'done': 0, 'fetched': 0, 'skipped': 0, 'bytes': 0, 'in_bytes': 0,
         'consecutive_fail': 0, 'abort': False, 'dead': 0}
failures = []


def safe_url(u):
    """Percent-encode the path. Some catalogue filenames contain spaces and commas
    (e.g. '06111855, 859_535_000.png'); urllib rejects those outright as InvalidURL,
    which cost 104 real images on the first pass. Commas and parens are legal in a
    path, so keep them literal and only escape what actually needs it."""
    p = urlsplit(u)
    return urlunsplit((p.scheme, p.netloc, quote(p.path, safe="/,()-_.~"), p.query, p.fragment))


def fetch(url):
    req = urllib.request.Request(safe_url(url), headers={'User-Agent': UA, 'Accept': 'image/*'})
    with urllib.request.urlopen(req, timeout=TIMEOUT) as r:
        if r.status != 200:
            raise RuntimeError('HTTP %s' % r.status)
        return r.read()


def process(job):
    dest = os.path.join(OUT_DIR, job['file'])
    if os.path.exists(dest) and os.path.getsize(dest) >= MIN_BYTES:
        with lock:
            state['skipped'] += 1
            state['done'] += 1
            state['bytes'] += os.path.getsize(dest)
        return

    raw = None
    why = None
    for attempt in range(1, RETRIES + 1):
        if state['abort']:
            return
        try:
            raw = fetch(job['url'])
            break
        except Exception as e:                       # noqa: BLE001 - report, don't crash the worker
            why = getattr(e, 'code', None) or e.__class__.__name__
            if why == 404:
                break                                # dead URL, no point retrying
            time.sleep(0.5 * attempt)

    if raw is None:
        with lock:
            failures.append({'url': job['url'], 'why': str(why)})
            state['done'] += 1
            # A 404 means custom-data.json holds a dead URL — our problem, not the
            # vendor refusing us, and they cluster (the data has runs of them). Only
            # 403/429/timeouts indicate we are being throttled, so only those may
            # trip the abort; counting 404s here would halt a perfectly healthy run.
            if why == 404:
                state['dead'] += 1
                state['consecutive_fail'] = 0
            else:
                state['consecutive_fail'] += 1
                if state['consecutive_fail'] >= CONSECUTIVE_FAIL_LIMIT:
                    state['abort'] = True
        return

    try:
        im = Image.open(io.BytesIO(raw))
        # keep alpha: these are palette PNGs with transparency, and the UI renders
        # them on a dark card — flattening onto white would box every product
        im = im.convert('RGBA' if ('A' in im.getbands() or im.mode == 'P') else 'RGB')
        if im.mode == 'RGBA' and im.getextrema()[3][0] == 255:
            im = im.convert('RGB')               # fully opaque: the alpha channel is dead weight
        if im.width > job['width']:
            h = max(1, round(im.height * job['width'] / im.width))
            im = im.resize((job['width'], h), Image.LANCZOS)
        buf = io.BytesIO()
        im.save(buf, 'WEBP', quality=QUALITY, method=METHOD)
        data = buf.getvalue()
        if len(data) < MIN_BYTES:
            raise RuntimeError('encoded too small')
        tmp = dest + '.tmp'
        with open(tmp, 'wb') as fh:
            fh.write(data)
        os.replace(tmp, dest)                        # atomic: no half-written file on interrupt
    except Exception as e:                           # noqa: BLE001
        with lock:
            failures.append({'url': job['url'], 'why': 'decode: %s' % e})
            state['done'] += 1
        return

    with lock:
        state['fetched'] += 1
        state['done'] += 1
        state['bytes'] += len(data)
        state['in_bytes'] += len(raw)
        state['consecutive_fail'] = 0


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--workers', type=int, default=3)
    ap.add_argument('--limit', type=int, default=0)
    ap.add_argument('--jobs', default=JOBS, help='alternate job list (same {url,width,file} shape)')
    args = ap.parse_args()

    with open(args.jobs) as fh:
        jobs = json.load(fh)
    os.makedirs(OUT_DIR, exist_ok=True)

    todo = [j for j in jobs if not (os.path.exists(os.path.join(OUT_DIR, j['file']))
                                    and os.path.getsize(os.path.join(OUT_DIR, j['file'])) >= MIN_BYTES)]
    if args.limit:
        todo = todo[:args.limit]

    print('jobs total   : %d' % len(jobs))
    print('already done : %d' % (len(jobs) - len([j for j in jobs if not os.path.exists(os.path.join(OUT_DIR, j['file']))])))
    print('to fetch     : %d  (workers=%d)' % (len(todo), args.workers))
    sys.stdout.flush()

    q = queue.Queue()
    for j in todo:
        q.put(j)

    started = time.time()

    def worker():
        while not state['abort']:
            try:
                job = q.get_nowait()
            except queue.Empty:
                return
            process(job)
            n = state['done']
            if n % 250 == 0:
                el = time.time() - started
                rate = n / el if el else 0
                eta = (len(todo) - n) / rate / 60 if rate else 0
                print('  %d/%d  (%d new, %d failed)  out %.0f MB / in %.1f GB  ~%d min left'
                      % (n, len(todo), state['fetched'], len(failures),
                         state['bytes'] / 1048576, state['in_bytes'] / 1073741824, eta))
                sys.stdout.flush()
            q.task_done()

    threads = [threading.Thread(target=worker, daemon=True) for _ in range(args.workers)]
    for t in threads:
        t.start()
    for t in threads:
        t.join()

    if state['abort']:
        print('\nABORTED: %d consecutive failures — the vendor is refusing requests.' % CONSECUTIVE_FAIL_LIMIT)
        print('Nothing was lost; re-run later to resume from here.')

    print('\nfetched   : %d' % state['fetched'])
    print('skipped   : %d' % state['skipped'])
    print('failed    : %d  (of which %d are dead URLs already in custom-data.json)' % (len(failures), state['dead']))
    print('downloaded: %.2f GB   stored: %.1f MB'
          % (state['in_bytes'] / 1073741824, state['bytes'] / 1048576))
    if failures:
        with open(FAILURES, 'w') as fh:
            json.dump(failures, fh, indent=2)
        print('  (detail in st-scraper/localize-failures.json)')
        for f in failures[:8]:
            print('   %s  %s' % (f['why'], f['url'].rsplit('/', 1)[-1]))
    sys.exit(1 if state['abort'] else 0)


if __name__ == '__main__':
    main()
