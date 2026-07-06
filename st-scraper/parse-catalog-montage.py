# Re-parse the Sanitas Troesch catalog PDF to recover Montagepauschale per product group.
# Each product group is followed by a "Montage" section whose Montagepauschale rows belong
# to that group -> map every product BASE art-Nr to its group's Montage art-Nrs/labels/prices.
# Usage: python3 parse-catalog-montage.py [firstPage] [lastPage]  (0-indexed; default whole ch1)
import pdfplumber, re, json, sys

PDF = '/Users/jenistonsellathamby/Downloads/2026.6_DE_Sanitas_Troesch_Katalog.pdf'
OUT = '/Users/jenistonsellathamby/Desktop/product-configurator/st-scraper/catalog-montage.json'

ART = re.compile(r'\b(\d{4}\s\d{3})\b')                       # 7-digit art-Nr "1372 688"
# Montagepauschale line: "...text... <artNr> NN <net>.— <gross>"
MONT = re.compile(r'^(Montagepauschale.*?)\s(\d{4}\s\d{3})\s+NN\s*([\d\'’.]+)\.', re.I)

def parse_pages(first, last):
    base_to_mont = {}   # base(no space) -> list of {artNr,label,net}
    # Concatenate ALL pages into one line stream (in page order) so a group whose bases sit
    # at the bottom of page N connects to its Montage at the top of page N+1.
    lines = []
    with pdfplumber.open(PDF) as pdf:
        for i in range(first, min(last, len(pdf.pages))):
            txt = pdf.pages[i].extract_text(x_tolerance=1) or ''
            lines.extend(txt.split('\n'))

    groups = []           # (bases[], montages[])
    cur_bases, cur_mont = [], []
    last_was_mont = False
    for raw in lines:
        line = raw.strip()
        mm = MONT.match(line)
        if mm:
            label = re.sub(r'\s+', ' ', mm.group(1)).strip()
            art = mm.group(2)
            net = float(mm.group(3).replace("'", '').replace('’', ''))
            cur_mont.append({'artNr': art, 'label': label, 'net': net})
            last_was_mont = True
            continue
        bases = [a for a in ART.findall(line) if not line.lower().startswith('montagepauschale')]
        if bases:
            if last_was_mont:          # new group starts after a Montage section -> flush
                if cur_bases:
                    groups.append((cur_bases, cur_mont))
                cur_bases, cur_mont, last_was_mont = [], [], False
            cur_bases.extend(bases)
    if cur_bases:
        groups.append((cur_bases, cur_mont))

    for bases, monts in groups:
        if not monts:
            continue
        for b in bases:
            key = b.replace(' ', '')
            existing = {m['artNr'].replace(' ', '') for m in base_to_mont.get(key, [])}
            for m in monts:
                if m['artNr'].replace(' ', '') not in existing:
                    base_to_mont.setdefault(key, []).append(m)
    return base_to_mont

if __name__ == '__main__':
    first = int(sys.argv[1]) if len(sys.argv) > 1 else 25
    last = int(sys.argv[2]) if len(sys.argv) > 2 else 448
    m = parse_pages(first, last)
    json.dump(m, open(OUT, 'w'), ensure_ascii=False)
    print(f'bases with montage: {len(m)}  (pages {first}-{last}) -> {OUT}')
    # sample: S300 area
    for k in ['1372688', '1372689', '1372692']:
        if k in m:
            print(f'  {k}: ' + ' | '.join(f"{x['artNr']} ({x['label'][:35]}, {x['net']})" for x in m[k]))
