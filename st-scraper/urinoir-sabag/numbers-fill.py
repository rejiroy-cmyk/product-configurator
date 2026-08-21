#!/usr/bin/env python3
"""
numbers-fill.py — turn the Matrix table's floating pictures into CELL IMAGE FILLS.

Numbers imports the .xlsx pictures as free-floating objects: they sit ON the sheet,
not IN a cell, so the frozen header rows scroll out from under them. This rewrites
them as per-cell background fills (Numbers' own Image Fill), which belong to the cell
and therefore freeze and scroll with it, then deletes the floating originals so the
two do not double up.

Numbers fills with technique ScaleToFill -- it scales to COVER the cell and crops the
overflow -- so each thumbnail is first padded to its cell's exact aspect ratio, in that
cell's own background colour, or the article gets cropped and the header loses its
colour banding.

Columns are located by reading the sheet's OWN header row, never by index, so columns
deleted by hand in Numbers (URP CHF, Installationselement) carry through untouched.

    python3 st-scraper/urinoir-sabag/numbers-fill.py <in.numbers> [out.numbers]
"""
import io, os, re, sys
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import matrix                                   # thumb() + the article/urinal lists

from numbers_parser import Document, Style, BackgroundImage

ART = re.compile(r'^\d{4} \d{3}$')
SCALE = 2                                       # 2x cell size, for a crisp fill


def pad(blob, cw, ch, bg):
    """Letterbox a thumbnail onto a cell-shaped canvas so ScaleToFill cannot crop it."""
    W, H = int(round(cw * SCALE)), int(round(ch * SCALE))
    im = Image.open(io.BytesIO(blob)).convert('RGBA')
    flat = Image.new('RGBA', im.size, bg + (255,)); flat.alpha_composite(im)
    im = flat.convert('RGB')
    inner = (int(W * 0.88), int(H * 0.88))
    im.thumbnail(inner, Image.LANCZOS)
    canvas = Image.new('RGB', (W, H), bg)
    canvas.paste(im, ((W - im.width) // 2, (H - im.height) // 2))
    buf = io.BytesIO(); canvas.save(buf, 'PNG'); return buf.getvalue()


def raw_geometry(model, tid):
    """Row heights / column widths exactly as stored.

    Table.row_height() adds half the top and bottom border widths to what the file
    holds, so feeding its result back in inflates every row by a point per pass.
    Read the buckets directly instead.
    """
    tm = model.objects[tid]
    rows_bucket = model.objects[tm.base_data_store.rowHeaders.buckets[0].identifier].headers
    cols_bucket = model.objects[tm.base_data_store.columnHeaders.identifier].headers
    rmap = {h.index: h.size for h in rows_bucket}
    cmap = {h.index: h.size for h in cols_bucket}
    rh = lambda i: rmap[i] if rmap.get(i) else tm.default_row_height
    cw = lambda j: cmap[j] if cmap.get(j) else tm.default_column_width
    return rh, cw


def bg_of(cell):
    c = getattr(cell.style, 'bg_color', None)
    if c is None: return (255, 255, 255)
    if isinstance(c, list): c = c[0]             # gradients report a list of stops
    return (c.r, c.g, c.b)


def main(src, dst):
    doc = Document(src)
    sheet = next(s for s in doc.sheets if s.name == 'Matrix')
    t = sheet.tables[0]
    grid = [[('' if c.value is None else str(c.value).strip()) for c in r] for r in t.rows()]
    rh, cw = raw_geometry(doc._model, t._table_id)             # captured BEFORE any rewrite
    row_h = [rh(i) for i in range(t.num_rows)]
    col_w = [cw(j) for j in range(t.num_cols)]

    # --- locate the header row and the columns, from the file itself ---
    hdr_r = next(i for i, r in enumerate(grid) if 'Art-Nr' in r and 'Serie' in r)
    hdr = grid[hdr_r]
    art_c = hdr.index('Art-Nr')
    bild_c = hdr.index('Bild') if 'Bild' in hdr else 0
    part_cols = [(c, v) for c, v in enumerate(hdr) if ART.match(v)]
    img_r = hdr_r - 1
    if any(grid[img_r]):
        sys.exit(f'row {img_r+1} above the header is not empty -- refusing to overwrite it')
    data = [(i, r[art_c]) for i, r in enumerate(grid) if i > hdr_r and ART.match(r[art_c])]
    print(f'header row {hdr_r+1} | image row {img_r+1} | {len(part_cols)} Artikelspalten | {len(data)} Urinoirzeilen')

    # --- cell image fills ---
    n = miss = 0
    cache = {}                                   # 13 art-Nrs repeat; one style serves all
    def fill(r, c, art, cw, ch):
        nonlocal n, miss
        blob = matrix.thumb(art)
        if not blob: miss += 1; return
        bg = bg_of(t.cell(r, c))
        key = (art, cw, ch, bg)
        if key not in cache:
            name = f'fill_{len(cache)}_{art}'
            cache[key] = doc.add_style(
                name=name,
                bg_image=BackgroundImage(pad(blob, cw, ch, bg), name + '.png'))
        t.set_cell_style(r, c, cache[key]); n += 1

    for c, art in part_cols:
        fill(img_r, c, art, t.col_width(c), t.row_height(img_r))
    for r, art in data:
        fill(r, bild_c, art, t.col_width(bild_c), t.row_height(r))
    print(f'cell fills written: {n} ({len(cache)} Bilder)' + (f' | ohne Bild: {miss}' if miss else ''))

    # --- restore the geometry ---
    # Rewriting the table drops explicit row heights, so Numbers auto-fits on reopen and
    # the art-Nr header row collapses. Re-apply exactly what the source file had.
    tid = t._table_id
    for i in range(t.num_rows):
        doc._model.row_height(tid, i, row_h[i])
    for j in range(t.num_cols):
        doc._model.col_width(tid, j, col_w[j])
    print(f'geometry restored: {len(row_h)} Zeilenhöhen, {len(col_w)} Spaltenbreiten')

    # --- delete the floating originals ---
    objs = doc._model.objects
    arch = next(o for o in objs._objects.values()
                if type(o).__name__ == 'SheetArchive' and o.name == 'Matrix')
    keep = [d for d in arch.drawable_infos
            if type(objs[d.identifier]).__name__ != 'ImageArchive']
    dropped = len(arch.drawable_infos) - len(keep)
    del arch.drawable_infos[:]
    arch.drawable_infos.extend(keep)
    print(f'floating images removed: {dropped} (drawables left: {len(keep)})')

    if os.path.exists(dst): os.remove(dst)
    doc.save(dst)
    print('saved', dst, f'({os.path.getsize(dst):,} bytes)')


if __name__ == '__main__':
    src = sys.argv[1] if len(sys.argv) > 1 else os.path.expanduser('~/Downloads/Urinoir-Matrix.numbers')
    dst = sys.argv[2] if len(sys.argv) > 2 else os.path.splitext(src)[0] + '-Zellfuellung.numbers'
    main(src, dst)
