#!/usr/bin/env python3
"""Exhaustive font-aware Sanitas Troesch catalogue parser.

Per the proven pipeline (see memory catalog-pdf-pipeline):
 - pdfplumber extract_text_lines(x_tolerance=1)
 - Bold (-Bd) line WITHOUT a base art-Nr  -> product title (series)
 - Bold/Roman line WITH a base art-Nr     -> a variant (size + baseNr, optionally price)
 - Roman (-Roman) line without baseNr     -> description
 - Light (-Lt) / tiny font                -> side-tab noise, dropped
Captures EVERY base art-Nr so nothing is dropped (the old catalog JSON was lossy).

Usage: python3 parse_catalogue.py <chapter> <firstPdfPage> <lastPdfPage>
Outputs (in this dir): ch<chapter>-products.json, ch<chapter>-allbases.json
"""
import pdfplumber, re, json, sys, os

PDF = os.path.expanduser('~/Downloads/2026.6_DE_Sanitas_Troesch_Katalog.pdf')
HERE = os.path.dirname(os.path.abspath(__file__))

BASE = re.compile(r'\b(\d{4})\s(\d{3})\b')                 # base art-Nr "3161 180"
PRICE = re.compile(r"([\d'’]+(?:\.\d{2}|\.—))")            # 129.— or 26.50
COLOUR = re.compile(r'^Farbe:\s*(\d{3})\b')               # multi-colour row prefix
DIM = re.compile(r'\d+\s*(?:x|×)\s*\d+|\bØ\s*\d+|\b\d+\s*(?:cm|mm)\b')

def price_val(tok):
    tok = tok.replace("'", '').replace('’', '')
    if tok.endswith('.—'): return float(tok[:-2])
    try: return float(tok)
    except: return None

def dom_font(line):
    f = {}
    sizes = []
    for ch in line['chars']:
        f[ch['fontname']] = f.get(ch['fontname'], 0) + 1
        sizes.append(ch['size'])
    dom = max(f, key=f.get) if f else ''
    avg = sum(sizes)/len(sizes) if sizes else 0
    return dom, avg

def is_bold(fn): return fn.endswith('-Bd') or 'Bold' in fn or '-Bd' in fn
def is_light(fn): return '-Lt' in fn or 'Light' in fn

def printed_marker(page, chapter):
    # read the X.YYY token ONLY from the genuine footer line (contains Richtpreise / 2026.6)
    for ln in page.extract_text_lines(x_tolerance=1):
        t = ln['text']
        if 'Richtpreise' in t or '2026.6' in t:
            m = re.search(r'\b(%s\.\d{1,3})\b' % chapter, t)
            if m: return m.group(1)
    return None

def parse_chapter(chapter, first, last):
    products = []
    allbases = {}     # base(nospace) -> first page seen
    cur = None
    def flush():
        nonlocal cur
        if cur and (cur['variants'] or cur['series']):
            products.append(cur)
        cur = None
    with pdfplumber.open(PDF) as pdf:
        for i in range(first-1, last):
            page = pdf.pages[i]
            marker = printed_marker(page, chapter)
            lines = page.extract_text_lines(x_tolerance=1)
            for ln in lines:
                text = ln['text'].strip()
                if not text: continue
                fn, sz = dom_font(ln)
                if sz and sz < 6: continue            # side-tab / footnote noise
                if is_light(fn): continue
                bases = [f'{a} {b}' for a, b in BASE.findall(text)]
                for a, b in BASE.findall(text): allbases.setdefault(a+b, marker or (i+1))
                bold = is_bold(fn)
                # footer / header noise
                if 'Richtpreise' in text or text.startswith('Nr. exkl'): continue

                if bold and not bases:
                    # new product title (series)
                    flush()
                    cur = {'chapter': chapter, 'page': marker, 'pdfPage': i+1,
                           'series': text, 'description': [], 'variants': [], 'rawBaseLines': []}
                    continue
                if cur is None:
                    cur = {'chapter': chapter, 'page': marker, 'pdfPage': i+1,
                           'series': None, 'description': [], 'variants': [], 'rawBaseLines': []}
                if bases:
                    cur['rawBaseLines'].append(text)
                    prices = [price_val(p) for p in PRICE.findall(text)]
                    prices = [p for p in prices if p is not None]
                    colour = COLOUR.match(text)
                    dim = DIM.search(text)
                    for bs in bases:
                        v = {'artNr': bs}
                        if colour: v['colourCode'] = colour.group(1)
                        if dim and not colour: v['size'] = dim.group(0)
                        if len(prices) >= 2: v['net'], v['gross'] = prices[0], prices[1]
                        elif len(prices) == 1: v['net'] = prices[0]
                        cur['variants'].append(v)
                else:
                    # description line (roman, no baseNr)
                    if len(text) > 2 and not PRICE.fullmatch(text):
                        cur['description'].append(text)
    flush()
    # tidy
    for p in products:
        p['description'] = ' '.join(p['description'])[:600]
        del p['rawBaseLines']
    json.dump(products, open(f'{HERE}/ch{chapter}-products.json', 'w'), ensure_ascii=False)
    json.dump(allbases, open(f'{HERE}/ch{chapter}-allbases.json', 'w'), ensure_ascii=False)
    nvar = sum(len(p['variants']) for p in products)
    print(f'ch{chapter}: {len(products)} products | {nvar} variant-lines | {len(allbases)} distinct base art-Nrs | pp {first}-{last}')
    return products

if __name__ == '__main__':
    ch, lo, hi = sys.argv[1], int(sys.argv[2]), int(sys.argv[3])
    parse_chapter(ch, lo, hi)
