/**
 * inject-ch3-siphon.cjs
 * Injects the branded DESIGNER siphons from catalogue pages 3.23–3.27 (Gessi, Hansgrohe,
 * Axor, Fantini, Laufen, Vola) into zubehoer_pool WITH their colour variants, so Mix & Match
 * can colour-match the visible Siphon to the faucet's brand + finish (like the Regulierventil).
 *
 * The colour SKUs aren't in the article API — they live in the catalogue description's
 * "Farbe: <code>, <code> …" lists. We parse those codes and build <base7>.<code>.000 SKUs
 * (verified to resolve on the CDN). Base = the .501 (Verchromt) SKU; the rest are variants.
 * Per-colour net prices are parsed from the same description tiers where present.
 *
 * Usage:  node st-scraper/inject-ch3-siphon.cjs          # DRY RUN
 *         node st-scraper/inject-ch3-siphon.cjs --apply  # writes
 */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(path.dirname(fs.realpathSync(__filename)), '..');
const DATA = path.join(ROOT, 'custom-data.json');
const PRICES = path.join(ROOT, 'prices.json');
const CH3 = path.join(ROOT, 'st-scraper/catalogue-inspection/ch3-products.json');
const APPLY = process.argv.includes('--apply');

const ch3raw = JSON.parse(fs.readFileSync(CH3, 'utf8'));
const ch3 = Array.isArray(ch3raw) ? ch3raw : (ch3raw.products || Object.values(ch3raw));
const data = JSON.parse(fs.readFileSync(DATA, 'utf8'));
const pricesFile = JSON.parse(fs.readFileSync(PRICES, 'utf8'));
const prices = pricesFile.prices || pricesFile;

const PAGES = ['3.23', '3.24', '3.25', '3.26', '3.27'];
// Only siphons whose brand is also a faucet brand (so "same brand" matching can fire).
const BRAND_RE = /^sifon\s+(gessi|hansgrohe|axor|fantini|laufen|vola)\b/i;
const BRANDS = ['Gessi', 'Hansgrohe', 'Axor', 'Fantini', 'Laufen', 'Vola'];
const brandOf = s => { for (const b of BRANDS) if (new RegExp('\\b' + b + '\\b', 'i').test(s || '')) return b; return 'Andere'; };
const digits = a => String(a || '').replace(/[^0-9]/g, '');
const base7 = a => digits(a).slice(0, 7);
const skuOf = (b7, code) => `${b7.slice(0, 4)} ${b7.slice(4, 7)}.${code}.000`;
const imgFromArt = (art) => { const dg = digits(art); if (dg.length < 12) return ''; const a = dg.slice(0, dg.length - 6).padStart(8, '0'), f = dg.slice(dg.length - 6, dg.length - 3), s = dg.slice(dg.length - 3); return 'https://wsrv.nl/?url=profishop.sanitastroesch.ch/multimedia/Web/PG1/' + a + '_' + f + '_' + s + '.png'; };

// Parse the "Farbe: <codes> <net>.— <gross>" tiers -> {code: net}. Codes are comma-separated
// 3-digit tokens right after "Farbe:"; the price follows separated by a space.
function parseFarbeTiers(desc) {
    const out = {};
    const re = /Farbe:\s*(\d{3}(?:\s*,\s*\d{3})*)\s+(\d+(?:\.\d+)?)/g;
    let m;
    while ((m = re.exec(desc || ''))) {
        const codes = m[1].split(/\s*,\s*/);
        const net = parseFloat(m[2]);
        for (const c of codes) if (!(c in out)) out[c] = net;
    }
    // codes that appear with no trailing price (e.g. "Farbe: 501" alone) -> null price
    const re2 = /Farbe:\s*(\d{3}(?:\s*,\s*\d{3})*)/g;
    while ((m = re2.exec(desc || ''))) for (const c of m[1].split(/\s*,\s*/)) if (!(c in out)) out[c] = null;
    return out;
}

if (!data.zubehoer_pool) data.zubehoer_pool = { trays: [], parts: [], finishes: [] };
const trays = data.zubehoer_pool.trays;
const byArt = new Map(trays.map((t, i) => [digits(t.artNr), i]));
const setPrice = (art, p) => { if (p != null && art) { const kk = String(art); if (!(kk in prices)) pricesAdded++; prices[kk] = p; } };

let added = 0, updated = 0, variantsAdded = 0, pricesAdded = 0, families = 0;
const sample = [];

for (const prod of ch3) {
    if (!PAGES.includes(String(prod.page))) continue;
    if (!BRAND_RE.test(prod.series || '')) continue;
    const b7 = base7((prod.variants || [])[0] && prod.variants[0].artNr);
    if (!b7 || b7.length < 7) continue;
    families++;
    const brand = brandOf(prod.series);
    const tiers = parseFarbeTiers(prod.description);
    const codes = Object.keys(tiers);
    if (!codes.length) continue;
    // Base = the Verchromt (.501) SKU if present, else the first code.
    const baseCode = codes.includes('501') ? '501' : codes[0];
    const baseArt = skuOf(b7, baseCode);
    const label = `${prod.series}, ${(prod.description || '').split('Farbe:')[0].trim()}`.replace(/,\s*$/, '');
    const variantList = codes.filter(c => c !== baseCode).map(c => ({ artNr: skuOf(b7, c), label: `${prod.series} (Farbe ${c})`, menge: 1, imgUrl: imgFromArt(skuOf(b7, c)) }));
    setPrice(baseArt, tiers[baseCode]);
    for (const c of codes) setPrice(skuOf(b7, c), tiers[c]);
    variantsAdded += variantList.length;

    const tray = {
        id: 'sif3_' + b7,
        manufacturer: brand,
        form: 'Zubehör',
        size: 'Standard',
        montageart: 'alle',
        artNr: baseArt,
        label: label.slice(0, 120),
        menge: 1,
        imgUrl: imgFromArt(baseArt),
        variants: variantList,
        mountingMaterials: [],
        description: prod.description || '',
        productType: 'Siphon',
    };
    const k = digits(baseArt);
    if (byArt.has(k)) {
        const idx = byArt.get(k); const ex = trays[idx]; const merged = { ...ex };
        if (!(ex.variants && ex.variants.length) && variantList.length) merged.variants = variantList;
        if (!ex.productType) merged.productType = 'Siphon';
        if (!ex.manufacturer || ex.manufacturer === 'Andere') merged.manufacturer = brand;
        trays[idx] = merged; updated++;
    } else { trays.push(tray); byArt.set(k, trays.length - 1); added++; }
    if (sample.length < 8) sample.push({ brand, base: baseArt, colours: codes.length, codes: codes.join(',') });
}

console.log(`=== inject-ch3-siphon ${APPLY ? '(APPLY)' : '(DRY RUN)'} ===`);
console.log(`  designer-siphon families  : ${families}`);
console.log(`  trays ADDED               : ${added}`);
console.log(`  trays UPDATED             : ${updated}`);
console.log(`  colour variant SKUs       : ${variantsAdded}`);
console.log(`  new prices                : ${pricesAdded}`);
console.log(`  pool total trays now      : ${trays.length}`);
console.log('  --- sample ---'); sample.forEach(s => console.log('   ', s.brand, s.base, '| colours:', s.colours, '| codes:', s.codes));

if (APPLY) {
    fs.copyFileSync(DATA, DATA + '.bak-ch3sif');
    fs.writeFileSync(DATA, JSON.stringify(data, null, 2) + '\n');
    if (pricesFile.prices) pricesFile.prices = prices; else Object.assign(pricesFile, prices);
    fs.writeFileSync(PRICES, JSON.stringify(pricesFile, null, 2));
    console.log('\nWROTE custom-data.json (backup .bak-ch3sif) + prices.json');
} else {
    console.log('\nDRY RUN — nothing written. Re-run with --apply to commit.');
}
