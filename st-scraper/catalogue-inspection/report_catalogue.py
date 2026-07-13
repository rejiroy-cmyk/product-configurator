#!/usr/bin/env python3
"""Build per-chapter reports + master inventory from the parse (+ API enrichment)."""
import json, os, re
from collections import Counter, defaultdict

HERE = os.path.dirname(os.path.abspath(__file__))
CH = {
 '1': ('Baden, Duschen, Wellness', '26-447',
       'PARTIAL — badewanne / duschenwanne / duschtrennwand / badeabtrennung / duschenrinne exist; Wellness (Whirl/Dampf/Sauna) & other bath products UNINJECTED'),
 '2': ('Keramik – Waschtische, Klosetts, Bidets, Urinoirs, Möbel', '453-695',
       'PARTIAL — waschtisch / wandklosett / standklosett exist; Waschtischmöbel, Bidets, Urinoirs UNINJECTED'),
 '3': ('Einzelsanitärapparate und Installationssysteme', '699-828', 'UNINJECTED (scraped only 305 of ~1046 bases)'),
 '4': ('Accessoires, Waschraum, Haltegriffe, Badheizkörper', '830-1092', 'DONE — injected into zubehoer_pool'),
 '5': ('Spiegelschränke, Spiegel, Lichtspiegel, Kosmetikspiegel', '1097-1262', 'DONE — injected into zubehoer_pool'),
 '6': ('Armaturen, Duschsysteme, Armaturen-Steuerungen', '1272-1810',
       'PARTIAL — mischer (bade/dusche/waschtisch) exist; Duschsysteme & Steuerungen UNINJECTED'),
 '7': ('Waschen, Trocknen – Waschtröge, Ausgussbecken, Wassererwärmer', '1811-1862',
       'PILOT — waschtrog pilot only; Wassererwärmer, Ausgussbecken & rest UNINJECTED'),
 '8': ('Ablaufanschlüsse, Dichtung, Reinigungsmaterial', '1863-1874', 'UNINJECTED (not scraped)'),
}

def load(ch):
    prods = json.load(open(f'{HERE}/ch{ch}-products.json'))
    api = {}
    if os.path.exists(f'{HERE}/ch{ch}-api.json'):
        api = {k: v for k, v in json.load(open(f'{HERE}/ch{ch}-api.json')).items() if v}
    return prods, api

def family(series):
    if not series: return '(untitled)'
    return series.split(',')[0].strip().split(' ')[0]

def chapter_report(ch):
    prods, api = load(ch)
    title, pages, status = CH[ch]
    bases = json.load(open(f'{HERE}/ch{ch}-allbases.json'))
    fams = Counter(family(p['series']) for p in prods if p.get('series'))
    # mounting materials
    mount_products = sum(1 for v in api.values() if v.get('additionalMaterials'))
    mount_arts = set()
    for v in api.values():
        for g in v.get('additionalMaterials', []):
            for a in g['articles']:
                if re.search(r'Befestigungs|Montage|Schraube|Dübel|Duebel|Wandanker|Konsole|Klebeset|Traverse|Grundplatte|Wandflansch|Einbaukörper|Einbaurahmen', a['label'], re.I):
                    mount_arts.add(a['artNr'])
    # price range from API
    nets = [v['net'] for v in api.values() if isinstance(v.get('net'), (int, float))]
    out = []
    out.append(f'# Chapter {ch}: {title}\n')
    out.append(f'- **PDF pages:** {pages}')
    out.append(f'- **Injection status:** {status}')
    out.append(f'- **Products parsed:** {len(prods)}  |  **distinct base art-Nrs:** {len(bases)}')
    out.append(f'- **API-enriched:** {len(api)} bases (image + specs + price + mounting)')
    if nets: out.append(f'- **Price range (net, CHF):** {min(nets):.2f} – {max(nets):.2f}')
    out.append(f'- **Mounting materials found:** {mount_products} products carry them; {len(mount_arts)} distinct mounting art-Nrs\n')
    out.append('## Product families (by series leading noun)\n')
    out.append('| Family | # series |')
    out.append('|---|---|')
    for fam, n in fams.most_common(60):
        out.append(f'| {fam} | {n} |')
    out.append('\n## Sample products (with API detail where available)\n')
    shown = 0
    for p in prods:
        if not p.get('series') or not p.get('variants'): continue
        b = p['variants'][0]['artNr'].replace(' ', '')
        a = api.get(b)
        line = f"- **{p['series']}** — {p.get('description','')[:90]}"
        if a:
            line += f"\n   - `{a['matnr']}` · CHF {a.get('net','?')} · img:{'yes' if a.get('image') else 'no'}"
            if a.get('tech'): line += f" · {'; '.join(a['tech'][:3])}"
            if a.get('additionalMaterials'):
                ms = [x['artNr'] for g in a['additionalMaterials'] for x in g['articles']][:4]
                line += f"\n   - mounting/related: {', '.join(ms)}"
        out.append(line)
        shown += 1
        if shown >= 25: break
    txt = '\n'.join(out) + '\n'
    open(f'{HERE}/ch{ch}-report.md', 'w').write(txt)
    return dict(chapter=ch, title=title, pages=pages, status=status,
                products=len(prods), bases=len(bases), enriched=len(api),
                families=len(fams), mountProducts=mount_products, mountArts=len(mount_arts),
                priceMin=min(nets) if nets else None, priceMax=max(nets) if nets else None)

def master(summ):
    o = ['# Catalogue Inspection — 2026.6 Sanitas Troesch\n',
         'Exhaustive font-aware re-parse of the catalogue PDF (all 8 chapters) + profishop API enrichment.',
         'Rebuilt because the original catalog JSON was lossy (dropped ~half the art-Nrs, as Ch4 proved).\n',
         '## Overview\n',
         '| Ch | Title | Pages | Products | Bases | API✓ | Mount arts | Status |',
         '|---|---|---|---|---|---|---|---|']
    for s in summ:
        o.append(f"| {s['chapter']} | {s['title'][:40]} | {s['pages']} | {s['products']} | {s['bases']} | {s['enriched']} | {s['mountArts']} | {s['status'][:22]} |")
    tot_b = sum(s['bases'] for s in summ); tot_e = sum(s['enriched'] for s in summ)
    o.append(f"\n**Totals:** {sum(s['products'] for s in summ)} products · {tot_b} distinct base art-Nrs · {tot_e} API-enriched.\n")
    o.append('## Uninjected chapters — where the opportunity is\n')
    for s in summ:
        if 'DONE' in s['status']: continue
        o.append(f"### Ch{s['chapter']} — {s['title']}")
        o.append(f"{s['status']}")
        o.append(f"- {s['bases']} base art-Nrs, {s['enriched']} enriched, {s['mountProducts']} with mounting materials. See `ch{s['chapter']}-report.md`.\n")
    open(f'{HERE}/CATALOGUE-INSPECTION.md', 'w').write('\n'.join(o) + '\n')

if __name__ == '__main__':
    summ = [chapter_report(c) for c in ['1', '2', '3', '4', '5', '6', '7', '8']]
    master(summ)
    print('Reports written:', ', '.join(f"ch{s['chapter']}" for s in summ))
    print('Master: CATALOGUE-INSPECTION.md')
