/**
 * inject-ch6-shower-accessories.cjs
 * Injects the Ch6 shower-accessory families — Handbrause, Brauseschlauch, Brausehalter,
 * Brausearm/Deckenanschluss, Regenbrause/Kopfbrause — into zubehoer_pool WITH their colour
 * variants, prices and images, tagged by productType. This is the pool the Duschmischer app
 * queries to colour-match a mandatory accessory to the main mixer's brand + finish (C), to
 * populate the optional Regenbrause dropdown (G), and it fixes the missing thumbnails (D) and
 * prices (F) at the source.
 *
 * Usage:  node st-scraper/inject-ch6-shower-accessories.cjs          # DRY RUN
 *         node st-scraper/inject-ch6-shower-accessories.cjs --apply  # writes
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

// family prefix -> productType tag (label-prefix identity: the leading noun IS the product type)
const FAMILIES = [
    [/^handbrause/i, 'Handbrause'],
    [/^stabhandbrause/i, 'Handbrause'],
    [/^(brauseschlauch|metallbrauseschlauch|brausenschlauch)/i, 'Brauseschlauch'],
    [/^brausehalter/i, 'Brausehalter'],
    [/^(regenbrause|kopfbrause|regenpaneel|doppelkopfbrause|seitenbrause|schulterbrause)/i, 'Regenbrause'],
    [/^(brausearm|brausenwandarm|brausewandarm|deckenanschluss|brausekopfhalter)/i, 'Brausearm'],
    [/^(duschengleitstange|duschgleitstange|gleitstange)/i, 'Gleitstange'],
    [/^anschlussbogen/i, 'Anschlussbogen'],
];
const familyOf = (label) => { for (const [re, t] of FAMILIES) if (re.test(label || '')) return t; return null; };

if (!data.zubehoer_pool) data.zubehoer_pool = { trays: [], parts: [], finishes: [] };
const trays = data.zubehoer_pool.trays;
const byArt = new Map(trays.map((t, i) => [digits(t.artNr), i]));

let bases = 0, added = 0, updated = 0, variantsAdded = 0, pricesAdded = 0;
const byType = {};
const setPrice = (art, p) => { if (p != null && art) { const kk = String(art); if (!(kk in prices)) pricesAdded++; prices[kk] = p; } };

for (const [b, e] of Object.entries(api)) {
    if (!e || !e.maktx) continue;
    const family = familyOf(e.maktx);
    if (!family) continue;
    bases++;
    const v = vars[b];
    const mainArt = (v && v.mainArt) || e.matnr;
    if (!mainArt) continue;
    const brand = brandOf(e.maktx);
    const variantList = (v && v.variants) ? Object.entries(v.variants)
        .filter(([a]) => digits(a) !== digits(mainArt))
        .map(([a, vd]) => ({ artNr: a, label: vd.desc || e.maktx, menge: 1, imgUrl: imgFromArt(a) })) : [];
    setPrice(mainArt, e.net && e.net.price != null ? e.net.price : (v && v.variants && v.variants[mainArt] && v.variants[mainArt].price));
    if (v && v.variants) for (const [a, vd] of Object.entries(v.variants)) setPrice(a, vd.price);
    variantsAdded += variantList.length;
    byType[family] = (byType[family] || 0) + 1;

    const tray = {
        id: 'acc6_' + b,
        manufacturer: brand,
        form: 'Zubehör',
        size: 'Standard',
        montageart: 'alle',
        artNr: mainArt,
        label: e.maktx,
        menge: 1,
        imgUrl: proxy(e.image) || imgFromArt(mainArt),
        variants: variantList,
        mountingMaterials: [],
        description: e.description || '',
        productType: family,
    };
    const k = digits(mainArt);
    if (byArt.has(k)) {
        const idx = byArt.get(k); const ex = trays[idx]; const merged = { ...ex };
        if (!(ex.variants && ex.variants.length) && variantList.length) merged.variants = variantList;
        if (!ex.productType) merged.productType = family;
        if (!ex.manufacturer || ex.manufacturer === 'Andere') merged.manufacturer = brand;
        if (!(ex.imgUrl && ex.imgUrl.trim()) && tray.imgUrl) merged.imgUrl = tray.imgUrl;
        trays[idx] = merged; updated++;
    } else { trays.push(tray); byArt.set(k, trays.length - 1); added++; }
}

console.log(`=== inject-ch6-shower-accessories ${APPLY ? '(APPLY)' : '(DRY RUN)'} ===`);
console.log(`  accessory bases found     : ${bases}`);
console.log(`  trays ADDED               : ${added}`);
console.log(`  trays UPDATED (enriched)  : ${updated}`);
console.log(`  colour variant SKUs       : ${variantsAdded}`);
console.log(`  new prices                : ${pricesAdded}`);
console.log(`  pool total trays now      : ${trays.length}`);
console.log('  --- by family (in pool) ---');
const poolByType = {};
trays.forEach(t => { if (FAMILIES.some(([, ft]) => ft === t.productType)) { const s = poolByType[t.productType] = poolByType[t.productType] || { n: 0, v: 0, brands: new Set() }; s.n++; s.v += (t.variants || []).length; s.brands.add(t.manufacturer); } });
for (const [ty, s] of Object.entries(poolByType)) console.log(`    ${ty}: ${s.n} families, ${s.v} colour SKUs, brands: ${[...s.brands].join('/')}`);

if (APPLY) {
    fs.copyFileSync(DATA, DATA + '.bak-ch6acc');
    fs.writeFileSync(DATA, JSON.stringify(data, null, 2) + '\n');
    if (pricesFile.prices) pricesFile.prices = prices; else Object.assign(pricesFile, prices);
    fs.writeFileSync(PRICES, JSON.stringify(pricesFile, null, 2));
    console.log('\nWROTE custom-data.json (backup .bak-ch6acc) + prices.json');
} else {
    console.log('\nDRY RUN — nothing written. Re-run with --apply to commit.');
}
