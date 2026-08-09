/**
 * suggest-ch2-skus.cjs
 * Regenerates `ch2-waschtisch-offen-vorschlag.csv` — proposed full art-Nrs for the Ch2 basins
 * that no source could confirm, reconstructed from the catalogue's printed colour/price table.
 *
 * CATALOGUE GRAMMAR (confirmed against the printed pages and 510 basins with known SKUs):
 *
 *     Farbe: 105                          292.— 315.65      ->  <base>.105.000
 *     Farbe: 228, 423, 535, 536  202: Cleaneffekt  407.— 439.95
 *                                                           ->  <base>.228.202, .423.202, …
 *
 * i.e. `Farbe: <codes> [<TTT>: <name>] <netto>.— <brutto>`. The optional `<TTT>:` group is the
 * THIRD art-Nr triplet — a surface treatment, not a colour. Absent means `000`. Colour 105 is
 * "Weiss Cleaneffekt" in its own right, which is why it needs no 202.
 * (Domain correction from the user, 2026-08-09; the earlier parser required the price to follow
 * the codes directly and therefore dropped every treated group.)
 *
 * A `Farbe:` NOT followed by a price is a Befestigungsmaterial colour, not a SKU finish — those
 * are ignored, which is why the price pair is part of the pattern.
 *
 * ACCURACY — measured against the 510 basin bases that DO have a confirmed SKU:
 *   88.2% exact · 7.8% proposed a finish with no confirmed SKU · 3.9% missed a real SKU.
 * That is a review aid, NOT an injection source. Nothing here is written into custom-data.json;
 * inject-ch2-waschtisch.cjs still refuses to ship an art-Nr it cannot confirm.
 *
 * Usage:  node st-scraper/catalogue-inspection/suggest-ch2-skus.cjs
 */
'use strict';
const fs = require('fs');
const path = require('path');

const HERE = __dirname;
const ROOT = path.resolve(HERE, '../..');
const REPORT = path.join(HERE, 'ch2-waschtisch-injection-report.json');
const PRODUCTS = path.join(HERE, 'ch2-products.json');
const COLORS = path.join(ROOT, 'modules/factories/_colorCodes.js');
const OUT = path.join(HERE, 'ch2-waschtisch-offen-vorschlag.csv');

const report = JSON.parse(fs.readFileSync(REPORT, 'utf8'));
const products = JSON.parse(fs.readFileSync(PRODUCTS, 'utf8'));
const COLOR_NAMES = (() => {
    const src = fs.readFileSync(COLORS, 'utf8');
    const map = {};
    for (const m of src.matchAll(/'(\d{3})'\s*:\s*"([^"]*)"/g)) map[m[1]] = m[2];
    return map;
})();

const base7 = a => String(a || '').replace(/[^0-9]/g, '').slice(0, 7);
const fmt = b => b.slice(0, 4) + ' ' + b.slice(4);

// `Farbe: <codes> [<third>: <treatment>] <netto>.— <brutto>`  ->  ["105.000", "228.202", …]
const SKU_TABLE = /Farbe:\s*((?:\d{3})(?:\s*,\s*\d{3})*)\s*(?:(\d{3}):\s*(\S+)\s*)?[\d'’]+\.[—–]/g;
const skusFromEntry = (desc) => {
    const out = new Map();          // "ccc.ttt" -> treatment name ('' when none)
    let m;
    SKU_TABLE.lastIndex = 0;
    while ((m = SKU_TABLE.exec(desc || ''))) {
        const third = m[2] || '000';
        const treat = m[3] || '';
        for (const c of m[1].split(/\s*,\s*/)) out.set(c + '.' + third, treat);
    }
    return [...out.entries()];
};

const entryOf = b => products.find(p => (p.variants || []).some(v => base7(v.artNr) === b));
const esc = s => String(s == null ? '' : s).replace(/;/g, ',').replace(/[\r\n]+/g, ' ').trim();

const rows = [[
    'Art-Nr (Basis)', 'Serie', 'Beschreibung', 'PDF-Seite',
    'VORSCHLAG (bitte prüfen!)', 'Farben laut Katalog', 'Volle Art-Nr (bestätigt)',
].join(';')];

let withSuggestion = 0;
for (const x of report.skippedUnresolved) {
    const b = x.base;
    const e = entryOf(b);
    const skus = e ? skusFromEntry(e.description) : [];
    const suggestion = skus.map(([s]) => fmt(b) + '.' + s).join('/');
    const legend = skus.map(([s, treat]) => {
        const [c, t] = s.split('.');
        return c + '=' + (COLOR_NAMES[c] || '?') + (t !== '000' ? ' +' + t + (treat ? ' ' + treat : '') : '');
    }).join(' / ');
    if (suggestion) withSuggestion++;
    rows.push([fmt(b), esc(x.series), esc(x.description).slice(0, 80), x.pdfPage, suggestion, esc(legend), ''].join(';'));
}

fs.writeFileSync(OUT, rows.join('\n') + '\n');
console.log(`wrote ${path.basename(OUT)}: ${report.skippedUnresolved.length} rows, ${withSuggestion} with a suggestion, ${report.skippedUnresolved.length - withSuggestion} without`);
console.log('\nSuggestions are a review aid — 3.9% miss a real SKU and 7.8% propose one that may not exist.');
console.log('Confirm each in the webshop/ERP and put the verified value in the last column.\n');
for (const r of rows.slice(0, 4)) console.log('  ' + r);
