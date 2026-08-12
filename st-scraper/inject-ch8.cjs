#!/usr/bin/env node
/**
 * inject-ch8.cjs — inject Chapter 8 (Ablaufanschlüsse, Dichtung, Reinigungsmaterial,
 * PDF pages 1863-1874) into custom-data.json.
 *
 * The smallest chapter and the simplest shape: 133 catalogue bases of small parts,
 * none of them configurable, all destined for `zubehoer_pool`. Run first as the
 * canary for the Ch1/Ch7 injections behind it.
 *
 * Routing is NOT decided here — `classify-ch8.cjs` owns it (productType and
 * targetSubcats included), so the rules stay testable on their own.
 *
 * Sources (a full art-Nr is NEVER fabricated — every injected SKU comes from one of these):
 *   catalogue-inspection/ch8-api.json    — matnr, maktx, description, image, net.price, tech
 *   chapter-8-variants-scraped.json      — variant SKUs + prices (66 bases)
 *   prices.json                          — existing price table, merged into
 *
 * Images are emitted as the API's own vendor URL; a localize pass pulls them into
 * public/img afterwards, like every other image in the app.
 *
 * Usage:  node st-scraper/inject-ch8.cjs           # DRY RUN — writes nothing
 *         node st-scraper/inject-ch8.cjs --apply   # writes (backups .bak-ch8)
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { classify, productText, targetsFor, productTypeOf } = require('./classify-ch8.cjs');

const DIR = __dirname;
const ROOT = path.resolve(DIR, '..');
const DATA = path.join(ROOT, 'custom-data.json');
const PRICES = path.join(ROOT, 'prices.json');
const API = path.join(DIR, 'catalogue-inspection', 'ch8-api.json');
const SCRAPE = path.join(DIR, 'chapter-8-variants-scraped.json');
const REPORT = path.join(DIR, 'catalogue-inspection', 'ch8-injection-report.json');
const APPLY = process.argv.includes('--apply');

const readJSON = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
const base7 = (s) => { const d = String(s || '').replace(/[^0-9]/g, ''); return d.length >= 7 ? d.slice(0, 7) : ''; };
const clean = (s) => String(s || '').replace(/<br\s*\/?>/gi, ' ').replace(/\s+/g, ' ').trim();

// tech arrives as ["Marke: Geberit", "Höhe: 210", …]. Store the FLAT map the app
// expects (CLAUDE.md: array form costs +16.3 MB), minus the four non-criteria labels
// that are dropped at ingest everywhere else.
const TECH_DROP = new Set(['Volumen', 'Gewicht', 'Geräuschgruppe', 'Energieeffizienzklasse']);
function techMap(arr) {
    const out = {};
    for (const line of (Array.isArray(arr) ? arr : [])) {
        const i = String(line).indexOf(':');
        if (i < 0) continue;
        const k = String(line).slice(0, i).trim();
        const v = String(line).slice(i + 1).trim();
        if (k && v && !TECH_DROP.has(k)) out[k] = v;
    }
    return out;
}

// ---------------------------------------------------------------------------
const data = readJSON(DATA);
const pricesFile = readJSON(PRICES);
const prices = pricesFile.prices;
const api = (Array.isArray(readJSON(API)) ? readJSON(API) : Object.values(readJSON(API))).filter(Boolean);
const scrape = fs.existsSync(SCRAPE) ? readJSON(SCRAPE) : {};

// Every base already anywhere in the app — injection must be idempotent and must
// never duplicate an article that another chapter already placed.
const known = new Set();
for (const key of Object.keys(data)) {
    const pool = data[key];
    if (!pool || !Array.isArray(pool.trays)) continue;
    for (const t of pool.trays) {
        known.add(base7(t.artNr));
        for (const v of (t.variants || [])) known.add(base7(v.artNr));
        for (const m of (t.mountingMaterials || [])) for (const o of (m.options || [])) known.add(base7(o.artNr));
    }
}
known.delete('');

const report = {
    generatedFor: 'Chapter 8 — Ablaufanschlüsse, Dichtung, Reinigungsmaterial',
    mode: APPLY ? 'APPLY' : 'DRY RUN',
    apiEntries: api.length,
    skipped: { alreadyPresent: [], noArtNr: [], routedSkip: [] },
    byProductType: {},
    byTargetSubcat: {},
    newPrices: 0,
    variantsAttached: 0,
    injected: [],
};

const newTrays = [];
const priceAdds = {};

for (const e of api) {
    const artNr = clean(e.matnr);
    const b = base7(artNr);
    if (!b) { report.skipped.noArtNr.push(clean(e.maktx).slice(0, 70)); continue; }
    if (classify(e) === 'skip') { report.skipped.routedSkip.push(artNr); continue; }
    if (known.has(b)) { report.skipped.alreadyPresent.push(artNr); continue; }

    const productType = productTypeOf(e);
    const targets = targetsFor(e);
    const tech = techMap(e.tech);

    // Variants from the overnight scrape. The scrape keys on the 7-digit base and its
    // `variants` is an OBJECT keyed by full art-Nr (CLAUDE.md gotcha), never an array.
    const rec = scrape[b];
    const variants = [];
    for (const [vArt, v] of Object.entries((rec && rec.variants) || {})) {
        if (!v || v.main) continue;                 // `main` is the base itself, not a variant
        variants.push({ artNr: clean(vArt), label: clean(v.desc) || clean(e.maktx), menge: 1, imgUrl: '' });
        if (v.price != null && prices[clean(vArt)] == null) priceAdds[clean(vArt)] = v.price;
    }
    report.variantsAttached += variants.length;

    // Price: the API's net price is authoritative; only ADD, never overwrite an
    // existing entry that another source already established.
    if (e.net && e.net.price != null && prices[artNr] == null) priceAdds[artNr] = e.net.price;

    const tray = {
        id: 'ch8_' + b,
        artNr,
        label: clean(e.maktx),
        manufacturer: tech.Marke || 'Andere',
        imgUrl: e.image || '',                      // vendor URL; localize pass rewrites it
        menge: 1,
        productType,
        description: clean(e.description),
    };
    if (targets.length) tray.targetSubcats = targets;
    if (Object.keys(tech).length) tray.tech = tech;
    if (variants.length) tray.variants = variants;

    newTrays.push(tray);
    report.byProductType[productType] = (report.byProductType[productType] || 0) + 1;
    for (const s of (targets.length ? targets : ['(search only)'])) {
        report.byTargetSubcat[s] = (report.byTargetSubcat[s] || 0) + 1;
    }
    report.injected.push({
        artNr, productType, targetSubcats: targets,
        price: (e.net && e.net.price) ?? prices[artNr] ?? null,
        variants: variants.length,
        hasImage: !!e.image,
        label: tray.label.slice(0, 78),
    });
}

report.newPrices = Object.keys(priceAdds).length;
report.summary = {
    apiEntries: api.length,
    injected: newTrays.length,
    alreadyPresent: report.skipped.alreadyPresent.length,
    noArtNr: report.skipped.noArtNr.length,
    withImage: report.injected.filter(x => x.hasImage).length,
    withPrice: report.injected.filter(x => x.price != null).length,
    withTargets: report.injected.filter(x => x.targetSubcats.length).length,
    searchOnly: report.injected.filter(x => !x.targetSubcats.length).length,
    newPriceRows: report.newPrices,
    variantsAttached: report.variantsAttached,
    poolBefore: data.zubehoer_pool.trays.length,
    poolAfter: data.zubehoer_pool.trays.length + newTrays.length,
};

fs.writeFileSync(REPORT, JSON.stringify(report, null, 2));

console.log(`\n=== inject-ch8 — ${report.mode} ===`);
console.log(JSON.stringify(report.summary, null, 2));
console.log('\nproductType:', JSON.stringify(report.byProductType));
console.log('targetSubcats:', JSON.stringify(report.byTargetSubcat));
console.log(`\nreport → ${path.relative(ROOT, REPORT)}`);

if (!APPLY) {
    console.log('\nDRY RUN — custom-data.json and prices.json untouched. Re-run with --apply to write.');
    process.exit(0);
}

fs.copyFileSync(DATA, DATA + '.bak-ch8');
fs.copyFileSync(PRICES, PRICES + '.bak-ch8');
data.zubehoer_pool.trays.push(...newTrays);
Object.assign(prices, priceAdds);
if (pricesFile.meta) pricesFile.meta.entries = Object.keys(prices).length;
fs.writeFileSync(DATA, JSON.stringify(data, null, 2));
fs.writeFileSync(PRICES, JSON.stringify(pricesFile, null, 2));
console.log(`\nAPPLIED — ${newTrays.length} trays into zubehoer_pool, ${report.newPrices} new prices.`);
console.log('backups: custom-data.json.bak-ch8, prices.json.bak-ch8');
