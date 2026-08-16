#!/usr/bin/env node
/**
 * inject-ch2-progetto.cjs — Waschtischkombination Alterna progetto 46.
 *
 * Six bases (`2116 121`–`2116 126`, catalogue pp. 2.9–2.10) in two finishes each.
 * `inject-ch2-waschtisch.cjs` logged all six under `skippedUnresolved` and they
 * have been missing ever since: the Waschtischkombination that the house's OWN
 * brand builds is absent while Laufen's and Duravit's are in.
 *
 * Why they were skipped, and why it is safe to inject them now:
 *   · `chapter-2-variants-scraped.json` has 34 other `2116*` bases but none of
 *     these — no variant page was ever fetched.
 *   · `catalogue-inspection/ch2-api.json` holds all six keys with the value
 *     **null** — the webservice returns nothing for them, so there is no matnr,
 *     no maktx, no image to read.
 *   · The CATALOGUE states the finishes outright: each entry ends
 *     "Farbe: 379 871.— 941.55  Farbe: 713 965.— 1043.15" — the finish codes AND
 *     their net prices. So `2116 121.379.000` is read off the page, not
 *     synthesized, which is the same standard inject-cws-panels.cjs works to.
 *
 * Shape follows the Duravit Waschtischkombinationen already in the pool: one tray
 * per base at the first finish, the second finish as a `variants[]` entry, and
 * `mountingMaterials: []`. The catalogue lists Möbelsifon `3163 172` as Zubehör
 * against every one of them, and it is deliberately NOT attached — the Duravit and
 * Laufen combinations carry theirs the same way (empty), and Mix & Match already
 * decides the Siphon itself. Attaching it here would give progetto a Siphon row no
 * other Kombination gets.
 *
 * Images: the shop's own PG1 URL per SKU, from `ch2-gap-images.json`
 * (`BASES=… OUT=ch2-gap-images.json node st-scraper/scrape-ch7-images.cjs`). The
 * scrape ALSO confirms the art-Nrs derived here: all 12 match the shop exactly,
 * which the sibling `inject-ch2-unresolved.cjs` cannot say of its first pass — the
 * Catalano coloured SKUs turned out to take a third group of 202, not 000. Run the
 * localisation pipeline afterwards; a remote URL in the data is a live vendor
 * request on every render.
 *
 * IDEMPOTENT: matched by art-Nr; a re-run refreshes text and price, never dupes.
 *
 *   node st-scraper/inject-ch2-progetto.cjs            # dry run
 *   node st-scraper/inject-ch2-progetto.cjs --write    # apply (backs up first)
 */
'use strict';
const fs = require('fs');
const path = require('path');
// custom-data.json is stored INTERNED (repeated mountingMaterials options and
// services live once in a shared table) — readData/writeData hide that. Reading it
// with fs directly yields the STRING "o412" where an option object is expected.
const { readData, writeData } = require('./_dataFile.cjs');

const WRITE = process.argv.includes('--write');
const ROOT = path.join(__dirname, '..');
const DATA = path.join(ROOT, 'custom-data.json');
const PRICES = path.join(ROOT, 'prices.json');
const PRODUCTS = path.join(__dirname, 'catalogue-inspection', 'ch2-products.json');
const API = path.join(__dirname, 'catalogue-inspection', 'ch2-api.json');
const COLORS = path.join(ROOT, 'modules', 'factories', '_colorCodes.js');
const SHOP_IMAGES = path.join(__dirname, 'ch2-gap-images.json');

const SERIES_RX = /^Waschtischkombination Alterna progetto/i;
const SERIE = 'progetto 46';
const BRAND = 'Alterna';

// ── Colour names come from the one table, never from a literal here ──────────
const colorSrc = fs.readFileSync(COLORS, 'utf8');
const COLOR_NAMES = {};
for (const m of colorSrc.matchAll(/'(\d{3})'\s*:\s*"([^"]+)"/g)) COLOR_NAMES[m[1]] = m[2];

// ── Text healing ─────────────────────────────────────────────────────────────
// The PDF breaks words with U+2010 + newline; the parser left "Armaturenlö‐ cher"
// and "Befestigungsma‐ terial". Rejoin before anything reads them — productText()
// normalises that hyphen to ASCII and would otherwise keep the split word forever.
const heal = (s) => String(s || '')
    .replace(/[‐‑]\s+/g, '')
    .replace(/\s+/g, ' ')
    .trim();
// The "Farbe: … Zubehör" tail is catalogue price formatting, not product text.
// Leaving it in `description` would feed "379 871" to every classifier.
const specOnly = (s) => heal(s).replace(/\s*Farbe:.*$/i, '').replace(/\s*Zubehör\s*$/i, '').replace(/[,\s]+$/, '');

// "Farbe: 379 871.— 941.55 Farbe: 713 965.— 1043.15" → [{code:'379',net:871}, …]
const parseFinishes = (raw) => {
    const out = [];
    for (const m of heal(raw).matchAll(/Farbe:\s*(\d{3})\s+([\d'’]+(?:[.,]\d{2})?)(?:\s*\.—)?/g)) {
        const net = parseFloat(m[2].replace(/['’]/g, '').replace(',', '.'));
        if (Number.isFinite(net)) out.push({ code: m[1], net });
    }
    return out;
};

const num = (s) => parseFloat(String(s).replace(',', '.'));
const dim = (text, word) => { const m = new RegExp(word + '\\s+([\\d,.]+)\\s*cm', 'i').exec(text); return m ? num(m[1]) : null; };
const fmt = (n) => (n == null ? null : String(n).replace('.', ','));

// ── Gather ───────────────────────────────────────────────────────────────────
const products = JSON.parse(fs.readFileSync(PRODUCTS, 'utf8'));
const entries = (Array.isArray(products) ? products : Object.values(products))
    .filter(p => SERIES_RX.test(p.series || '') && (p.variants || []).length);

const api = JSON.parse(fs.readFileSync(API, 'utf8'));
// Shop ground truth: art-Nr → PG1 URL, both read out of the image filename.
const SHOP_IMG = {};
if (fs.existsSync(SHOP_IMAGES)) {
    for (const v of Object.values(JSON.parse(fs.readFileSync(SHOP_IMAGES, 'utf8')))) {
        for (const a of ((v && v.all) || [])) SHOP_IMG[a.art] = a.url;
    }
}
const data = readData();
const trays = (data.waschtisch && data.waschtisch.trays) || [];
if (!trays.length) { console.error('waschtisch.trays is empty — wrong data file?'); process.exit(1); }

const built = [];
const problems = [];

for (const e of entries) {
    // The FIRST variant of a catalogue entry is the product; anything after it is
    // the Zubehör column (here always Möbelsifon 3163 172).
    const base = String((e.variants[0] || {}).artNr || '').trim();
    if (!/^\d{4}\s\d{3}$/.test(base)) { problems.push(`unreadable base in ${e.page}: ${base}`); continue; }
    if (api[base.replace(/\s/g, '')]) problems.push(`${base}: the API dump has a record now — prefer inject-ch2-waschtisch.cjs`);

    const spec = specOnly(e.description);
    const finishes = parseFinishes(e.description);
    if (!finishes.length) { problems.push(`${base}: no "Farbe:" codes in the catalogue text — skipped`); continue; }
    for (const f of finishes) {
        if (!COLOR_NAMES[f.code]) problems.push(`${base}: finish code ${f.code} is not in COLOR_NAMES`);
    }

    const breite = dim(spec, 'Breite'), tiefe = dim(spec, 'Tiefe'), hoehe = dim(spec, 'Höhe');
    if (breite == null || tiefe == null) { problems.push(`${base}: no Breite/Tiefe in "${spec.slice(0, 60)}…"`); continue; }
    const material = /kunstharz/i.test(spec) ? 'Kunstharz' : null;
    // 124 / 125 / 126 are all "Breite 122 cm, Tiefe 46 cm, Höhe 57 cm" — the only
    // things that tell them apart are the bowl count and the drawer count, and both
    // live in the description. Put them IN the label: a BOM row is pasted into a real
    // order, and three lines that read alike are three chances to order the wrong one.
    const doppel = /doppelwaschtisch/i.test(spec) ? 'Doppelwaschtisch' : null;
    const schubladen = (spec.match(/(\d+)\s*Schubladen/i) || [])[1];
    const loecher = (spec.match(/(\d+)\s*Armaturenlöcher/i) || [])[1]
        || (/\barmaturenloch\b/i.test(spec) ? '1' : null);

    const head = `Waschtischkombination ${BRAND} ${SERIE}`;
    const skus = finishes.map(f => {
        const farbe = COLOR_NAMES[f.code] || f.code;
        return {
            artNr: `${base}.${f.code}.000`,
            // Same shape as the Duravit combinations already in the pool: series,
            // material, dimensions, what tells it from its siblings, finish.
            label: [head, material, `Breite ${fmt(breite)} cm`, `Tiefe ${fmt(tiefe)} cm`,
                hoehe != null ? `Höhe ${fmt(hoehe)} cm` : null,
                doppel,
                loecher ? `${loecher} ${loecher === '1' ? 'Armaturenloch' : 'Armaturenlöcher'}` : null,
                schubladen ? `${schubladen} Schubladen` : null,
                farbe].filter(Boolean).join(', '),
            // Opens with the same words so fullLabel() can dedupe the overlap.
            description: `${head}, ${spec}, ${farbe}`,
            farbe,
            net: f.net,
        };
    });

    built.push({
        base,
        page: e.page,
        main: skus[0],
        variants: skus.slice(1),
        size: `${breite} x ${tiefe}`.replace(/,/g, '.'),
    });
}

if (problems.length) {
    console.log(`⚠  ${problems.length} problem(s):`);
    problems.forEach(p => console.log(`     ${p}`));
}
console.log(`\nCatalogue entries: ${entries.length} → ${built.length} base(s), ${built.reduce((n, b) => n + 1 + b.variants.length, 0)} SKU(s)\n`);

// ── Upsert ───────────────────────────────────────────────────────────────────
const byArt = new Map(trays.map(t => [t.artNr, t]));
let added = 0, refreshed = 0;

for (const b of built) {
    const rec = {
        id: `ch2_${b.base.replace(/\s/g, '')}`,
        manufacturer: BRAND,
        form: 'Standard',
        size: b.size,
        artNr: b.main.artNr,
        label: b.main.label,
        description: b.main.description,
        serie: SERIE,
        menge: 1,
        imgUrl: SHOP_IMG[b.main.artNr] || '',
        variants: b.variants.map(v => ({ artNr: v.artNr, label: v.label, farbe: v.farbe, imgUrl: SHOP_IMG[v.artNr] || '' })),
        // The catalogue's Zubehör for these is Möbelsifon 3163 172 — left off on
        // purpose; see the header. Mix & Match decides the Siphon itself.
        mountingMaterials: [],
    };
    const existing = byArt.get(rec.artNr);
    if (existing) {
        // A LOCAL img/ path is the localisation pipeline's output — never overwrite it
        // with a remote URL (that would be a live vendor request on every render).
        const keepLocal = String(existing.imgUrl || '').startsWith('img/');
        Object.assign(existing, rec, keepLocal ? { imgUrl: existing.imgUrl } : {});
        refreshed++;
    } else {
        trays.push(rec);
        added++;
    }
    console.log(`   ${rec.artNr}  ${String(b.main.net).padStart(6)}  ${rec.label}`);
    b.variants.forEach(v => console.log(`   ${v.artNr}  ${String(v.net).padStart(6)}  ${v.label}`));
}

// ── Prices ───────────────────────────────────────────────────────────────────
const priceDoc = JSON.parse(fs.readFileSync(PRICES, 'utf8'));
let pAdded = 0;
const pConflict = [];
for (const b of built) {
    for (const s of [b.main, ...b.variants]) {
        const cur = priceDoc.prices[s.artNr];
        if (cur == null) { priceDoc.prices[s.artNr] = s.net; pAdded++; }
        else if (Math.abs(cur - s.net) > 0.01) pConflict.push(`${s.artNr}: prices.json ${cur} vs catalogue ${s.net}`);
    }
}

console.log(`\nTrays : +${added} added, ${refreshed} refreshed`);
console.log(`Prices: +${pAdded} added`);
if (pConflict.length) {
    console.log(`⚠  ${pConflict.length} price conflict(s) LEFT AS-IS (prices.json wins):`);
    pConflict.forEach(c => console.log(`     ${c}`));
}

if (!WRITE) { console.log('\n(dry run — pass --write to apply)'); process.exit(0); }

for (const f of [DATA, PRICES]) fs.copyFileSync(f, `${f}.bak-progetto`);
writeData(data, { backup: false });
fs.writeFileSync(PRICES, JSON.stringify(priceDoc, null, 2));
console.log('\n✅ written (backups: *.bak-progetto)');
