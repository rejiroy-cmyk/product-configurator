/**
 * inject-ch6-auslaufventil.cjs
 * Adds the Ch6 'waschtrog'-classified Auslaufventil products into the Waschtröge
 * (waschtrog) app's `parts` pool as wash-station faucets. Each colour/finish SKU
 * (base + variants) becomes its own flat part — matching the existing 3 Auslaufventil
 * parts — so every Ausladung/finish is selectable in the "Wandbatterie / Ventil" slot.
 *
 * role:'faucet' + faucetType:'Ventil' + bundlesVerschraubung:false  ==>  the washStation
 * builder (createRelationalApp buildWashStationSlots) automatically gives these NO
 * Abstellverschraubung (single-outlet valve rule). Prices -> prices.json.
 *
 * Usage:  node inject-ch6-auslaufventil.cjs          # DRY RUN
 *         node inject-ch6-auslaufventil.cjs --apply  # writes custom-data.json + prices.json
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { classify } = require('./classify-ch6.cjs');

const ROOT = path.resolve(path.dirname(fs.realpathSync(__filename)), '..');
const DATA = path.join(ROOT, 'custom-data.json');
const PRICES = path.join(ROOT, 'prices.json');
const API = path.join(ROOT, 'st-scraper/catalogue-inspection/ch6-api.json');
const VARS = path.join(ROOT, 'st-scraper/chapter-6-variants-scraped.json');
const APPLY = process.argv.includes('--apply');

const api = JSON.parse(fs.readFileSync(API, 'utf8'));
const vars = JSON.parse(fs.readFileSync(VARS, 'utf8'));
const data = JSON.parse(fs.readFileSync(DATA, 'utf8'));
const pricesFile = JSON.parse(fs.readFileSync(PRICES, 'utf8'));
const prices = pricesFile.prices || pricesFile;

const digits = a => String(a || '').replace(/[^0-9]/g, '');
const proxy = u => (u && /^https?:\/\//.test(u) && !/_nV|_000_000|no-image/.test(u)) ? ('https://wsrv.nl/?url=' + u.replace(/^https?:\/\//, '')) : '';
// Derive the canonical product image URL from an art-Nr (same pattern the existing
// waschtrog Auslaufventil parts already use), for SKUs the API image field misses.
// Art-Nr = <article><finish3><suffix3>; filename = <article padded to 8>_<finish>_<suffix>.png
const imgFromArt = (art) => {
    const d = digits(art);
    if (d.length < 12) return '';
    const article = d.slice(0, d.length - 6).padStart(8, '0');
    const finish = d.slice(d.length - 6, d.length - 3);
    const suffix = d.slice(d.length - 3);
    return 'https://wsrv.nl/?url=profishop.sanitastroesch.ch/multimedia/Web/PG1/' + article + '_' + finish + '_' + suffix + '.png';
};
const BRANDS = ['Alterna', 'KWC', 'Hansgrohe', 'Axor', 'Dornbracht', 'Laufen', 'Gessi', 'Similor', 'Arwa', 'Franke', 'Nussbaum', 'Keuco', 'Kludi', 'Fantini', 'Steinberg', 'Nobili', 'Hansa'];
const brandOf = (label) => { for (const b of BRANDS) if (new RegExp('\\b' + b + '\\b', 'i').test(label || '')) return b; return 'Andere'; };
const ausladungOf = (label) => { const m = String(label || '').match(/A\s*(\d{2,3})\s*mm/i); return m ? m[1] + ' mm' : ''; };

if (!data.waschtrog) data.waschtrog = { trays: [], parts: [], finishes: [] };
if (!Array.isArray(data.waschtrog.parts)) data.waschtrog.parts = [];
const parts = data.waschtrog.parts;
const have = new Set(parts.map(p => digits(p.artNr)));

let added = 0, skipped = 0, pricesAdded = 0, bases = 0;
const setPrice = (art, p) => { if (p != null && art) { const kk = String(art); if (!(kk in prices)) pricesAdded++; prices[kk] = p; } };

for (const [b, e] of Object.entries(api)) {
    if (!e || !e.maktx || classify(e) !== 'waschtrog') continue;
    bases++;
    const v = vars[b];
    // expand: base SKU + variant SKUs
    const skus = new Map();  // artNr -> {label, price, image}
    const baseArt = (v && v.mainArt) || e.matnr;
    skus.set(baseArt, { label: e.maktx, price: e.net && e.net.price != null ? e.net.price : null, image: e.image || '' });
    if (v && v.variants) for (const [a, vd] of Object.entries(v.variants)) {
        skus.set(a, { label: vd.desc || e.maktx, price: vd.price != null ? vd.price : null, image: '' });
    }
    for (const [art, sk] of skus) {
        const dg = digits(art);
        if (!dg || have.has(dg)) { skipped++; continue; }
        have.add(dg);
        parts.push({
            id: 'wt_av_' + dg,
            manufacturer: brandOf(sk.label),
            form: 'Armatur',
            size: ausladungOf(sk.label),
            montageart: 'alle',
            artNr: art,
            label: sk.label,
            menge: 1,
            imgUrl: proxy(sk.image) || imgFromArt(art),
            variants: [],
            mountingMaterials: [],
            description: sk.label,
            role: 'faucet',
            faucetType: 'Ventil',
            bundlesVerschraubung: false,
        });
        setPrice(art, sk.price);
        added++;
    }
}

console.log(`=== inject-ch6-auslaufventil ${APPLY ? '(APPLY)' : '(DRY RUN)'} ===`);
console.log(`  waschtrog (Auslaufventil) bases : ${bases}`);
console.log(`  faucet parts ADDED             : ${added}`);
console.log(`  SKUs skipped (already present) : ${skipped}`);
console.log(`  new prices added               : ${pricesAdded}`);
console.log(`  waschtrog parts total now      : ${parts.length}`);
const av = parts.filter(p => /auslaufventil/i.test(p.label));
console.log(`  Auslaufventil parts total      : ${av.length}`);
console.log('\n--- SAMPLE added part ---');
const s = parts.find(p => p.id.startsWith('wt_av_'));
if (s) console.log(JSON.stringify({ id: s.id, manufacturer: s.manufacturer, size: s.size, artNr: s.artNr, label: s.label.slice(0, 55), imgUrl: s.imgUrl.slice(0, 55), role: s.role, faucetType: s.faucetType }, null, 1));

if (APPLY) {
    fs.copyFileSync(DATA, DATA + '.bak-ch6av');
    fs.writeFileSync(DATA, JSON.stringify(data, null, 2) + '\n');
    if (pricesFile.prices) pricesFile.prices = prices; else Object.assign(pricesFile, prices);
    fs.writeFileSync(PRICES, JSON.stringify(pricesFile, null, 2));
    console.log('\nWROTE custom-data.json (backup .bak-ch6av) + prices.json');
} else {
    console.log('\nDRY RUN — nothing written. Re-run with --apply to commit.');
}
