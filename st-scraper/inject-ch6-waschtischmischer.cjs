/**
 * inject-ch6-waschtischmischer.cjs
 * Upserts all Ch6 'waschtischmischer'-classified products into custom-data.json's
 * waschtischmischer app. Each tray gets its colour/finish variants[] (InlineBOM) and
 * mountingMaterials[] (BOM-surfaced accessories: Zubehör 'Z' + Stücklisten 'S' from
 * the API; Ersatzteile 'E' excluded), sub-grouped by accessory type. Prices -> prices.json.
 *
 * Guess-free images: base imgUrl from the API's real image field (wsrv-proxied);
 * variant imgUrls left '' (InlineBOM is a text dropdown) — resolved by a later image pass.
 *
 * Usage:  node inject-ch6-waschtischmischer.cjs          # DRY RUN (no writes, prints report)
 *         node inject-ch6-waschtischmischer.cjs --apply  # writes custom-data.json + prices.json
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { classify, destinationsOf } = require('./classify-ch6.cjs');
// custom-data.json is stored INTERNED (repeated mountingMaterials options and
// services live once in a shared table) — readData/writeData hide that. Reading it
// with fs directly yields the STRING "o412" where an option object is expected.
const { readData, writeData } = require('./_dataFile.cjs');

const ROOT = path.resolve(path.dirname(fs.realpathSync(__filename)), '..');
const DATA = path.join(ROOT, 'custom-data.json');
const PRICES = path.join(ROOT, 'prices.json');
const API = path.join(ROOT, 'st-scraper/catalogue-inspection/ch6-api.json');
const REFETCH = path.join(ROOT, 'st-scraper/catalogue-inspection/ch6-api-refetch.json');
const VARS = path.join(ROOT, 'st-scraper/chapter-6-variants-scraped.json');
const APPLY = process.argv.includes('--apply');
const DEST = 'waschtischmischer';

const api = JSON.parse(fs.readFileSync(API, 'utf8'));
const refetch = fs.existsSync(REFETCH) ? JSON.parse(fs.readFileSync(REFETCH, 'utf8')) : {};
const vars = JSON.parse(fs.readFileSync(VARS, 'utf8'));
const data = readData();
const pricesFile = JSON.parse(fs.readFileSync(PRICES, 'utf8'));
const prices = pricesFile.prices || pricesFile;

const key = b => String(b).replace(/[^0-9]/g, '').slice(0, 7);
const proxy = u => (u && /^https?:\/\//.test(u) && !/_nV|_000_000|_100_000|no-image/.test(u)) ? ('https://wsrv.nl/?url=' + u.replace(/^https?:\/\//, '')) : '';
const BRANDS = ['Emporio', 'Alterna', 'KWC', 'Hansgrohe', 'Axor', 'Dornbracht', 'Laufen', 'Gessi', 'Similor', 'Arwa', 'Franke', 'Nussbaum', 'Neoperl', 'Keuco', 'Kludi', 'Fantini', 'MEM', 'Kartell', 'Bossini', 'Steinberg', 'Nobili', 'Hansa'];
const NOISE_TOK = new Set(['und', 'oder', 'mit', 'für', 'zur', 'ohne', 'bade', 'dusch', 'wannen', 'the', 'and', '-']);
// FULL-TEXT: brand can be truncated off the label, so read label + description.
const brandOf = (label, desc) => {
    const full = (label || '') + ' ' + (desc || '');
    for (const b of BRANDS) if (new RegExp('\\b' + b + '\\b', 'i').test(full)) return b;
    const toks = full.split(/[\s,]+/).filter(Boolean);
    return toks.find((t, i) => i > 0 && !NOISE_TOK.has(t.toLowerCase()) && /^[A-ZÄÖÜ]/.test(t)) || 'Andere';
};
const leadNoun = (label) => (label || '').split(/[\s,]/)[0].replace(/[‐\-].*$/, '') || 'Zubehör';
const slug = s => String(s || 'x').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 8) || 'x';

// collect the bases: classified in ch6-api as waschtischmischer + resolved-null bases whose scraped desc classifies here
const bases = new Map();  // base7 -> {matnr,label,image,net,additionalMaterials}
for (const [b, e] of Object.entries(api)) {
    if (e && e.maktx && destinationsOf(e).includes(DEST)) bases.set(key(b), e);   // includes dual bath+shower mixers
}
for (const [b, v] of Object.entries(refetch)) {           // resolved nulls (no api entry) via scraped desc
    if (v) continue;                                       // v null = still unresolved; skip
}
for (const [b, vObj] of Object.entries(vars)) {            // fold resolved-null bases classified via mainDesc
    const k = key(b);
    if (bases.has(k) || !vObj || vObj.status !== 'done' || !vObj.mainDesc) continue;
    if (api[k] || api[b]) continue;                        // already have api entry
    if (destinationsOf({ maktx: vObj.mainDesc, description: vObj.mainDesc }).includes(DEST)) {
        bases.set(k, { matnr: vObj.mainArt, maktx: vObj.mainDesc, image: '', net: null, additionalMaterials: [] });
    }
}

function buildMounting(am) {
    if (!Array.isArray(am)) return [];
    const groups = [];
    // Zubehör (Z) — sub-group by accessory type; Stücklisten (S) — one group. Ersatzteile (E) excluded.
    const zub = am.filter(g => g.type === 'Z').flatMap(g => g.articles || []).filter(a => a && a.artNr && a.label);
    const byType = {};
    for (const a of zub) { const t = leadNoun(a.label); (byType[t] = byType[t] || []).push(a); }
    for (const [t, arts] of Object.entries(byType)) {
        groups.push({
            id: 'mat_' + slug(t) + '_' + slug(arts[0].artNr),
            name: t,
            options: arts.map((a, i) => ({ artNr: a.artNr, label: a.label, menge: 1, type: i === 0 ? 'Zubehör' : 'Option', imgUrl: '' }))
                .concat([{ artNr: 'ohne_' + slug(t), label: 'Ohne ' + t, menge: 0, type: 'Option', imgUrl: '' }])
        });
    }
    const stk = am.filter(g => g.type === 'S').flatMap(g => g.articles || []).filter(a => a && a.artNr && a.label);
    if (stk.length) groups.push({ id: 'mat_stk_' + slug(stk[0].artNr), name: 'Stücklisten Artikel', options: stk.map(a => ({ artNr: a.artNr, label: a.label, menge: 1, type: 'Zubehör', imgUrl: '' })) });
    return groups;
}

if (!data[DEST]) data[DEST] = { trays: [] };
const trays = data[DEST].trays;
const byArt = new Map(trays.map((t, i) => [t.artNr, i]));

let added = 0, updated = 0, variantsAdded = 0, mountingGroups = 0, pricesAdded = 0;
let sample = null;
for (const [b, e] of bases) {
    const v = vars[b];
    const mainArt = (v && v.mainArt) || e.matnr;
    if (!mainArt) continue;
    const label = e.maktx || (v && v.mainDesc) || '';
    const variantList = (v && v.variants) ? Object.entries(v.variants)
        .filter(([a, vd]) => a.replace(/[^0-9]/g, '') !== String(mainArt).replace(/[^0-9]/g, ''))
        .map(([a, vd]) => ({ artNr: a, label: vd.desc || label, menge: 1, imgUrl: '' })) : [];
    const mounting = buildMounting(e.additionalMaterials);
    const tray = {
        id: 'wm6_' + b,
        manufacturer: brandOf(label, e.description),
        artNr: mainArt,
        label,
        description: e.description || '',
        menge: 1,
        imgUrl: proxy(e.image),
        variants: variantList,
        mountingMaterials: mounting,
    };
    // prices: main + variants
    const setPrice = (art, p) => { if (p != null && art) { const kk = String(art); if (!(kk in prices)) pricesAdded++; prices[kk] = p; } };
    setPrice(mainArt, e.net && e.net.price != null ? e.net.price : (v && v.variants && v.variants[mainArt] && v.variants[mainArt].price));
    if (v && v.variants) for (const [a, vd] of Object.entries(v.variants)) setPrice(a, vd.price);

    variantsAdded += variantList.length; mountingGroups += mounting.length;
    if (byArt.has(mainArt)) {
        // Existing tray — enrich WITHOUT clobbering hand-curated data: only fill empty fields.
        const idx = byArt.get(mainArt); const ex = trays[idx]; const merged = { ...ex };
        if (!(ex.variants && ex.variants.length) && variantList.length) merged.variants = variantList;
        if (!(ex.mountingMaterials && ex.mountingMaterials.length) && mounting.length) merged.mountingMaterials = mounting;
        if (!(ex.imgUrl && ex.imgUrl.trim()) && tray.imgUrl) merged.imgUrl = tray.imgUrl;
        if (!ex.manufacturer && tray.manufacturer) merged.manufacturer = tray.manufacturer;
        trays[idx] = merged; updated++;
    } else { trays.push(tray); added++; }
    if (!sample && variantList.length >= 2 && mounting.length >= 1) sample = tray;
}

console.log(`=== inject-ch6-waschtischmischer ${APPLY ? '(APPLY)' : '(DRY RUN)'} ===`);
console.log(`  waschtischmischer bases considered : ${bases.size}`);
console.log(`  trays ADDED (new products)      : ${added}`);
console.log(`  trays UPDATED (existing)        : ${updated}`);
console.log(`  variant SKUs attached           : ${variantsAdded}`);
console.log(`  mountingMaterials groups        : ${mountingGroups}`);
console.log(`  new prices added                : ${pricesAdded}`);
console.log(`  waschtischmischer total trays now  : ${trays.length}`);
if (sample) {
    console.log('\n--- SAMPLE injected tray ---');
    console.log(JSON.stringify({ artNr: sample.artNr, manufacturer: sample.manufacturer, label: sample.label.slice(0, 60), imgUrl: sample.imgUrl.slice(0, 45), variantCount: sample.variants.length, sampleVariant: sample.variants[0], mountingGroups: sample.mountingMaterials.map(g => `${g.name}(${g.options.length})`) }, null, 1));
}
if (APPLY) {
    fs.copyFileSync(DATA, DATA + '.bak-ch6wm');
    writeData(data, { backup: false });
    if (pricesFile.prices) pricesFile.prices = prices; else Object.assign(pricesFile, prices);
    fs.writeFileSync(PRICES, JSON.stringify(pricesFile, null, 2));
    console.log('\nWROTE custom-data.json (backup .bak-ch6wm) + prices.json');
} else {
    console.log('\nDRY RUN — nothing written. Re-run with --apply to commit.');
}
