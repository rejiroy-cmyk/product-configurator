/**
 * inject-ch6-regulierventil.cjs
 * Injects the Ch6 Regulierventil families (with their colour/finish variants) into
 * zubehoer_pool, so Mix & Match can colour-match the visible Regulierventil to the
 * faucet's brand + colour. Each tray: manufacturer (brand), variants[] (colour SKUs),
 * productType 'Regulierventil'. Existing pool entries (e.g. Laufen 6511 201) are
 * enriched with their variants without clobbering. Prices -> prices.json.
 *
 * Usage:  node st-scraper/inject-ch6-regulierventil.cjs          # DRY RUN
 *         node st-scraper/inject-ch6-regulierventil.cjs --apply  # writes
 */
'use strict';
const fs = require('fs');
const path = require('path');

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
const imgFromArt = (art) => { const dg = digits(art); if (dg.length < 12) return ''; const a = dg.slice(0, dg.length - 6).padStart(8, '0'), f = dg.slice(dg.length - 6, dg.length - 3), s = dg.slice(dg.length - 3); return 'https://wsrv.nl/?url=profishop.sanitastroesch.ch/multimedia/Web/PG1/' + a + '_' + f + '_' + s + '.png'; };
const BRANDS = ['Alterna', 'KWC', 'Hansgrohe', 'Axor', 'Dornbracht', 'Laufen', 'Gessi', 'Similor', 'Arwa', 'Franke', 'Nussbaum', 'Neoperl', 'Keuco', 'Kludi', 'Fantini', 'Steinberg', 'Nobili', 'Hansa', 'Emporio'];
const brandOf = (label) => { for (const b of BRANDS) if (new RegExp('\\b' + b + '\\b', 'i').test(label || '')) return b; return 'Andere'; };

if (!data.zubehoer_pool) data.zubehoer_pool = { trays: [], parts: [], finishes: [] };
const trays = data.zubehoer_pool.trays;
const byArt = new Map(trays.map((t, i) => [digits(t.artNr), i]));

let added = 0, updated = 0, variantsAdded = 0, pricesAdded = 0, bases = 0;
const setPrice = (art, p) => { if (p != null && art) { const kk = String(art); if (!(kk in prices)) pricesAdded++; prices[kk] = p; } };
const sample = [];

for (const [b, e] of Object.entries(api)) {
    // label-prefix by design: a product literally starting with "Regulierventil" IS one.
    if (!e || !e.maktx || !/^regulierventil/i.test(e.maktx)) continue;
    bases++;
    const v = vars[b];
    const mainArt = (v && v.mainArt) || e.matnr;
    if (!mainArt) continue;
    const label = e.maktx;
    const brand = brandOf(label);
    const variantList = (v && v.variants) ? Object.entries(v.variants)
        .filter(([a]) => digits(a) !== digits(mainArt))
        .map(([a, vd]) => ({ artNr: a, label: vd.desc || label, menge: 1, imgUrl: imgFromArt(a) })) : [];
    setPrice(mainArt, e.net && e.net.price != null ? e.net.price : (v && v.variants && v.variants[mainArt] && v.variants[mainArt].price));
    if (v && v.variants) for (const [a, vd] of Object.entries(v.variants)) setPrice(a, vd.price);
    variantsAdded += variantList.length;

    const tray = {
        id: 'reg6_' + b,
        manufacturer: brand,
        form: 'Zubehör',
        size: 'Standard',
        montageart: 'alle',
        artNr: mainArt,
        label,
        menge: 1,
        imgUrl: proxy(e.image) || imgFromArt(mainArt),
        variants: variantList,
        mountingMaterials: [],
        description: e.description || '',
        productType: 'Regulierventil',
    };
    const k = digits(mainArt);
    if (byArt.has(k)) {
        const idx = byArt.get(k); const ex = trays[idx]; const merged = { ...ex };
        if (!(ex.variants && ex.variants.length) && variantList.length) merged.variants = variantList;
        if (!ex.productType) merged.productType = 'Regulierventil';
        if (!ex.manufacturer || ex.manufacturer === 'Andere') merged.manufacturer = brand;
        if (!(ex.imgUrl && ex.imgUrl.trim()) && tray.imgUrl) merged.imgUrl = tray.imgUrl;
        trays[idx] = merged; updated++;
    } else { trays.push(tray); byArt.set(k, trays.length - 1); added++; }
    if (sample.length < 6) sample.push({ brand, artNr: mainArt, colours: [...new Set([mainArt, ...variantList.map(x => x.artNr)].map(a => { const m = String(a).match(/\.(\d{3})(?:\.|$)/); return m ? m[1] : null; }).filter(Boolean))].length, label: label.slice(0, 45) });
}

console.log(`=== inject-ch6-regulierventil ${APPLY ? '(APPLY)' : '(DRY RUN)'} ===`);
console.log(`  Regulierventil bases      : ${bases}`);
console.log(`  trays ADDED               : ${added}`);
console.log(`  trays UPDATED (enriched)  : ${updated}`);
console.log(`  variant SKUs attached     : ${variantsAdded}`);
console.log(`  new prices                : ${pricesAdded}`);
console.log(`  pool total trays now      : ${trays.length}`);
console.log('  --- by brand ---');
const byBrand = {};
trays.filter(t => t.productType === 'Regulierventil').forEach(t => { (byBrand[t.manufacturer] = byBrand[t.manufacturer] || { n: 0, v: 0 }); byBrand[t.manufacturer].n++; byBrand[t.manufacturer].v += (t.variants || []).length; });
for (const [b, s] of Object.entries(byBrand)) console.log(`    ${b}: ${s.n} families, ${s.v} colour variants`);
console.log('  --- sample ---'); sample.forEach(s => console.log('   ', s.brand, s.artNr, '| colours:', s.colours, '|', s.label));

if (APPLY) {
    fs.copyFileSync(DATA, DATA + '.bak-ch6reg');
    fs.writeFileSync(DATA, JSON.stringify(data, null, 2) + '\n');
    if (pricesFile.prices) pricesFile.prices = prices; else Object.assign(pricesFile, prices);
    fs.writeFileSync(PRICES, JSON.stringify(pricesFile, null, 2));
    console.log('\nWROTE custom-data.json (backup .bak-ch6reg) + prices.json');
} else {
    console.log('\nDRY RUN — nothing written. Re-run with --apply to commit.');
}
