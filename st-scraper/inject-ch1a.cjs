#!/usr/bin/env node
/**
 * inject-ch1a.cjs — Chapter 1, PASS A: standalone products only.
 *
 * Appends to pools; never touches an existing tray. Pass B (the ~690 Träger, Rahmen,
 * Zargen and Garnituren that attach to existing trays) is a separate script because it
 * MUTATES working configurators and needs its own review.
 *
 * Routing lives in `classify-ch1.cjs`. Anything it cannot positively identify as a
 * standalone product falls to Pass B — Pass A never takes an article by default.
 *
 * Sources (a full art-Nr is NEVER fabricated):
 *   catalogue-inspection/ch1-api.json  — matnr, maktx, description, image, net.price, tech
 *   chapter-1-variants-scraped.json    — variant SKUs + prices (3594 bases, scraped 2026-08-12)
 *   prices.json                        — existing price table, merged into
 *
 * The `dampfdusche` pool is NEW. This script creates the pool and its products only;
 * registering the app + subcategory is a separate code change, so the data can be
 * reviewed before any UI depends on it.
 *
 * Usage:  node st-scraper/inject-ch1a.cjs           # DRY RUN
 *         node st-scraper/inject-ch1a.cjs --apply   # writes (backups .bak-ch1a)
 */
'use strict';
const fs = require('fs');
const path = require('path');
const C = require('./classify-ch1.cjs');
// custom-data.json is stored INTERNED (repeated mountingMaterials options and
// services live once in a shared table) — readData/writeData hide that. Reading it
// with fs directly yields the STRING "o412" where an option object is expected.
const { readData, writeData } = require('./_dataFile.cjs');

const DIR = __dirname, ROOT = path.resolve(DIR, '..');
const DATA = path.join(ROOT, 'custom-data.json');
const PRICES = path.join(ROOT, 'prices.json');
const API = path.join(DIR, 'catalogue-inspection', 'ch1-api.json');
const SCRAPE = path.join(DIR, 'chapter-1-variants-scraped.json');
const REPORT = path.join(DIR, 'catalogue-inspection', 'ch1a-injection-report.json');
const APPLY = process.argv.includes('--apply');

const readJSON = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
const b7 = (s) => { const d = String(s || '').replace(/[^0-9]/g, ''); return d.length >= 7 ? d.slice(0, 7) : ''; };
const clean = (s) => String(s || '').replace(/<br\s*\/?>/gi, ' ').replace(/\s+/g, ' ').trim();
const TECH_DROP = new Set(['Volumen', 'Gewicht', 'Geräuschgruppe', 'Energieeffizienzklasse']);
function techMap(arr) {
    const out = {};
    for (const line of (Array.isArray(arr) ? arr : [])) {
        const i = String(line).indexOf(':'); if (i < 0) continue;
        const k = String(line).slice(0, i).trim(), v = String(line).slice(i + 1).trim();
        if (k && v && !TECH_DROP.has(k)) out[k] = v;
    }
    return out;
}

const data = readData();
const pricesFile = readJSON(PRICES);
const prices = pricesFile.prices;
const apiRaw = readJSON(API);
const api = (Array.isArray(apiRaw) ? apiRaw : Object.values(apiRaw)).filter(Boolean);
const scrape = fs.existsSync(SCRAPE) ? readJSON(SCRAPE) : {};

// ---------------------------------------------------------------------------
// SCRAPE FALLBACK. The API dump covers only 2015 of Ch1's 3890 catalogue bases,
// and iterating it alone silently skipped everything it does not hold — the two
// Ronal Mimesi Dampfdusche lines (24 bases) among them, even though the overnight
// scrape had all of them with full art-Nrs. A base the API never mentions is not
// absent from the catalogue; it is absent from ONE source.
//
// So: for every scraped base with no API entry, synthesise an entry from the scrape
// record. Same downstream pipeline, same classifier, same "never fabricate an
// art-Nr" guarantee — mainArt comes from the shop's own product page.
// ---------------------------------------------------------------------------
const apiBases = new Set(api.map(e => b7(e.matnr)));
const fromScrape = [];
for (const [base, rec] of Object.entries(scrape)) {
    if (!rec || rec.status !== 'done' || apiBases.has(base)) continue;
    const vs = rec.variants || {};
    const mainArt = clean(rec.mainArt) || clean(Object.keys(vs)[0]);
    if (!mainArt) continue;
    const main = vs[mainArt] || {};
    fromScrape.push({
        matnr: mainArt,
        maktx: clean(rec.mainDesc || main.desc),
        description: clean(main.desc || rec.mainDesc),
        image: '',                                   // scrape carries no image URL
        net: main.price != null ? { price: main.price } : null,
        tech: [],
        _fromScrape: true,
    });
}
const entries = api.concat(fromScrape);

// Known-set over trays AND parts AND variants AND mountingMaterials options. Walking
// only `trays` is what made Ch7 look like 64 items of work when it was zero.
const known = new Set();
for (const key of Object.keys(data)) {
    const pool = data[key]; if (!pool) continue;
    for (const lk of ['trays', 'parts']) for (const t of (pool[lk] || [])) {
        known.add(b7(t.artNr));
        for (const v of (t.variants || [])) known.add(b7(v.artNr));
        for (const m of (t.mountingMaterials || [])) for (const o of (m.options || [])) known.add(b7(o.artNr));
    }
}
known.delete('');

const report = {
    generatedFor: 'Chapter 1 PASS A — standalone products (Baden, Duschen, Wellness)',
    mode: APPLY ? 'APPLY' : 'DRY RUN',
    apiEntries: api.length, scrapeOnlyEntries: fromScrape.length,
    alreadyKnown: 0, deferredToPassB: 0,
    byPool: {}, newPrices: 0, variantsAttached: 0,
    missingSize: [], missingPrice: [], missingImage: [],
    items: [],
};
const add = {}, priceAdds = {};

for (const e of entries) {
    const artNr = clean(e.matnr), b = b7(artNr);
    if (!b) continue;
    if (known.has(b)) { report.alreadyKnown++; continue; }
    if (C.passOf(e) !== 'A') { report.deferredToPassB++; continue; }

    const dest = C.destinationA(e);
    const tech = techMap(e.tech);
    const size = C.sizeOf(e, dest);
    const form = C.formOf(e, dest);

    const rec = scrape[b];
    const variants = [];
    for (const [vArt, v] of Object.entries((rec && rec.variants) || {})) {
        if (!v || v.main) continue;
        variants.push({ artNr: clean(vArt), label: clean(v.desc) || clean(e.maktx), menge: 1, imgUrl: '' });
        if (v.price != null && prices[clean(vArt)] == null) priceAdds[clean(vArt)] = v.price;
    }
    report.variantsAttached += variants.length;
    const price = (e.net && e.net.price != null) ? e.net.price : null;
    if (price != null && prices[artNr] == null) priceAdds[artNr] = price;

    const tray = {
        id: 'ch1_' + b,
        manufacturer: tech.Marke || 'Andere',
        form,
        size,
        montageart: 'alle',
        artNr,
        label: clean(e.maktx),
        menge: 1,
        imgUrl: e.image || '',
        variants,
        mountingMaterials: [],
        description: clean(e.description),
    };
    if (Object.keys(tech).length) tray.tech = tech;
    if (dest === 'dampfdusche') tray.form = C.handingOf(e);
    if (dest === 'zubehoer_pool') {
        delete tray.montageart; delete tray.mountingMaterials;
        tray.productType = 'Duschvorhang';
    }

    (add[dest] = add[dest] || []).push(tray);
    report.byPool[dest] = (report.byPool[dest] || 0) + 1;
    if (!size && dest !== 'zubehoer_pool') report.missingSize.push({ artNr, label: tray.label.slice(0, 70) });
    if (price == null) report.missingPrice.push(artNr);
    if (!e.image) report.missingImage.push(artNr);
    report.items.push({ artNr, dest, size, form: tray.form, price, variants: variants.length, src: e._fromScrape ? 'scrape' : 'api',
        hasImage: !!e.image, label: tray.label.slice(0, 74) });
}

report.newPrices = Object.keys(priceAdds).length;
report.summary = {
    apiEntries: api.length, scrapeOnlyEntries: fromScrape.length,
    alreadyKnown: report.alreadyKnown,
    deferredToPassB: report.deferredToPassB,
    injected: Object.values(report.byPool).reduce((a, b) => a + b, 0),
    byPool: report.byPool,
    withSize: report.items.filter(i => i.size).length,
    missingSize: report.missingSize.length,
    withPrice: report.items.filter(i => i.price != null).length,
    withImage: report.items.filter(i => i.hasImage).length,
    variantsAttached: report.variantsAttached,
    newPriceRows: report.newPrices,
    poolSizesAfter: Object.fromEntries(Object.entries(add).map(([k, v]) =>
        [k, ((data[k] && data[k].trays) ? data[k].trays.length : 0) + v.length])),
};
fs.writeFileSync(REPORT, JSON.stringify(report, null, 2));

console.log(`\n=== inject-ch1a (PASS A) — ${report.mode} ===`);
console.log(JSON.stringify(report.summary, null, 2));
if (report.missingSize.length) {
    console.log(`\n!! ${report.missingSize.length} without a parseable size — they would be unreachable behind the Grösse filter:`);
    report.missingSize.slice(0, 10).forEach(x => console.log('   ' + x.artNr + '  ' + x.label));
}
console.log(`\nreport → ${path.relative(ROOT, REPORT)}`);

if (!APPLY) { console.log('\nDRY RUN — custom-data.json and prices.json untouched. Re-run with --apply to write.'); process.exit(0); }

fs.copyFileSync(DATA, DATA + '.bak-ch1a');
fs.copyFileSync(PRICES, PRICES + '.bak-ch1a');
for (const [dest, trays] of Object.entries(add)) {
    if (!data[dest]) data[dest] = { trays: [], mainImgUrl: '' };   // creates dampfdusche
    data[dest].trays.push(...trays);
}
Object.assign(prices, priceAdds);
if (pricesFile.meta) pricesFile.meta.entries = Object.keys(prices).length;
writeData(data, { backup: false });
fs.writeFileSync(PRICES, JSON.stringify(pricesFile, null, 2));
console.log(`\nAPPLIED — ${report.summary.injected} products, ${report.newPrices} new prices.`);
console.log('backups: custom-data.json.bak-ch1a, prices.json.bak-ch1a');
