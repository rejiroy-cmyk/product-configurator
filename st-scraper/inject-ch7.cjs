#!/usr/bin/env node
/**
 * inject-ch7.cjs — inject Chapter 7 (Waschen, Trocknen — Waschtröge, Ausgussbecken,
 * Wassererwärmer, PDF pages 1811-1862) into custom-data.json.
 *
 * Ch7 was a pilot: only the Waschtröge themselves were injected, so the wash-station
 * builder has slots (Unterbau, Rückwand, Tablar, Rost, Kleinboiler …) that no part in
 * the pool could ever fill. This closes that gap — no new app code needed, the slots
 * are already coded in createRelationalApp#buildWashStationSlots.
 *
 * Routing is NOT decided here — `classify-ch7.cjs` owns it, including the 205
 * V-ZUG / Electrolux white goods excluded per the user's decision.
 *
 * Sources (a full art-Nr is NEVER fabricated — every injected SKU comes from one of these):
 *   catalogue-inspection/ch7-api.json   — matnr, maktx, description, image, net.price, tech
 *   chapter-7-variants-scraped.json     — variant SKUs + prices (347 bases)
 *   prices.json                         — existing price table, merged into
 *
 * Usage:  node st-scraper/inject-ch7.cjs           # DRY RUN — writes nothing
 *         node st-scraper/inject-ch7.cjs --apply   # writes (backups .bak-ch7)
 */
'use strict';
const fs = require('fs');
const path = require('path');
const C = require('./classify-ch7.cjs');
// custom-data.json is stored INTERNED (repeated mountingMaterials options and
// services live once in a shared table) — readData/writeData hide that. Reading it
// with fs directly yields the STRING "o412" where an option object is expected.
const { readData, writeData } = require('./_dataFile.cjs');

const DIR = __dirname;
const ROOT = path.resolve(DIR, '..');
const DATA = path.join(ROOT, 'custom-data.json');
const PRICES = path.join(ROOT, 'prices.json');
const API = path.join(DIR, 'catalogue-inspection', 'ch7-api.json');
const SCRAPE = path.join(DIR, 'chapter-7-variants-scraped.json');
const REPORT = path.join(DIR, 'catalogue-inspection', 'ch7-injection-report.json');
const APPLY = process.argv.includes('--apply');

const readJSON = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
const base7 = (s) => { const d = String(s || '').replace(/[^0-9]/g, ''); return d.length >= 7 ? d.slice(0, 7) : ''; };
const clean = (s) => String(s || '').replace(/<br\s*\/?>/gi, ' ').replace(/\s+/g, ' ').trim();

const TECH_DROP = new Set(['Volumen', 'Gewicht', 'Geräuschgruppe', 'Energieeffizienzklasse']);
function techMap(arr) {
    const out = {};
    for (const line of (Array.isArray(arr) ? arr : [])) {
        const i = String(line).indexOf(':');
        if (i < 0) continue;
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

const known = new Set();
for (const key of Object.keys(data)) {
    const pool = data[key];
    if (!pool) continue;
    for (const listKey of ['trays', 'parts']) {
        for (const t of (pool[listKey] || [])) {
            known.add(base7(t.artNr));
            for (const v of (t.variants || [])) known.add(base7(v.artNr));
            for (const m of (t.mountingMaterials || [])) for (const o of (m.options || [])) known.add(base7(o.artNr));
        }
    }
}
known.delete('');

// The slot keys the wash-station builder actually reads. An accType outside this set
// would be injected and then never offered, so it is reported as a defect, not silently
// accepted.
const LIVE_SLOTS = new Set(['Waschtrogunterbau', 'Rückwand', 'Tablar', 'Auflagerost', 'Rosthalter',
    'Handtuchstange', 'Handtuchhalter', 'Konsole', 'Kleinboiler', 'WandbatterieDrucklos',
    'Anlageteile', 'Anschlussstutzen', 'Abstellverschraubung', 'ablaufventil', 'Siebventil',
    'Standrohr', 'Siphon', 'Bohrung']);
const basinBases = new Set((data.waschtrog.trays || []).map(t => base7(t.artNr)));

const report = {
    generatedFor: 'Chapter 7 — Waschen, Trocknen (Waschtröge, Ausgussbecken, Wassererwärmer)',
    mode: APPLY ? 'APPLY' : 'DRY RUN',
    apiEntries: api.length,
    skippedWhiteGoods: 0, skippedAlreadyPresent: 0, skippedNoArtNr: 0,
    byAccType: {}, toPool: 0,
    deadSlots: [], parentBaseHits: 0, orphanParentRefs: [],
    newPrices: 0, variantsAttached: 0,
    parts: [], poolItems: [],
};

const newParts = [], newPool = [], priceAdds = {};

for (const e of api) {
    const artNr = clean(e.matnr);
    const b = base7(artNr);
    if (!b) { report.skippedNoArtNr++; continue; }
    if (C.isWhiteGood(e)) { report.skippedWhiteGoods++; continue; }
    if (known.has(b)) { report.skippedAlreadyPresent++; continue; }

    const dest = C.classify(e);
    if (dest === 'skip') { report.skippedWhiteGoods++; continue; }

    const tech = techMap(e.tech);
    const rec = scrape[b];
    const variants = [];
    for (const [vArt, v] of Object.entries((rec && rec.variants) || {})) {
        if (!v || v.main) continue;
        variants.push({ artNr: clean(vArt), label: clean(v.desc) || clean(e.maktx), menge: 1, imgUrl: '' });
        if (v.price != null && prices[clean(vArt)] == null) priceAdds[clean(vArt)] = v.price;
    }
    report.variantsAttached += variants.length;
    if (e.net && e.net.price != null && prices[artNr] == null) priceAdds[artNr] = e.net.price;

    const common = {
        id: 'ch7_' + b,
        artNr,
        label: clean(e.maktx),
        manufacturer: tech.Marke || 'Andere',
        imgUrl: e.image || '',
        menge: 1,
        description: clean(e.description),
    };
    if (Object.keys(tech).length) common.tech = tech;
    if (variants.length) common.variants = variants;

    if (dest === 'waschtrog_parts') {
        const accType = C.accTypeOf(e);
        if (!LIVE_SLOTS.has(accType)) report.deadSlots.push({ artNr, accType });
        const parents = C.parentBasesOf(e);
        // A "zu <artNr>" that names no basin we actually stock would silently hide the
        // part (linked() requires the list to match). Report it and treat as unlinked.
        const good = parents.filter(p => basinBases.has(p));
        if (parents.length && !good.length) report.orphanParentRefs.push({ artNr, refs: parents });
        if (good.length) report.parentBaseHits++;

        const part = {
            ...common,
            form: 'Zubehör',
            size: '',
            montageart: 'alle',
            productType: accType,
            role: 'accessory',
            accType,
            parentBases: good,
            compulsory: false,          // Ch7 additions are all optional add-ons
        };
        if (C.isUniversal(e)) part.universal = true;
        newParts.push(part);
        report.byAccType[accType] = (report.byAccType[accType] || 0) + 1;
        report.parts.push({ artNr, accType, parentBases: good, universal: !!part.universal,
            price: (e.net && e.net.price) ?? null, hasImage: !!e.image, label: common.label.slice(0, 76) });
    } else {
        newPool.push({ ...common, productType: 'Waschraum' });
        report.toPool++;
        report.poolItems.push({ artNr, price: (e.net && e.net.price) ?? null, label: common.label.slice(0, 76) });
    }
}

report.newPrices = Object.keys(priceAdds).length;
report.summary = {
    apiEntries: api.length,
    intoWaschtrogParts: newParts.length,
    intoZubehoerPool: newPool.length,
    skippedWhiteGoods: report.skippedWhiteGoods,
    skippedAlreadyPresent: report.skippedAlreadyPresent,
    withPrice: report.parts.filter(p => p.price != null).length + report.poolItems.filter(p => p.price != null).length,
    withImage: report.parts.filter(p => p.hasImage).length,
    linkedToSpecificBasins: report.parentBaseHits,
    deadSlots: report.deadSlots.length,
    orphanParentRefs: report.orphanParentRefs.length,
    newPriceRows: report.newPrices,
    variantsAttached: report.variantsAttached,
    partsBefore: data.waschtrog.parts.length,
    partsAfter: data.waschtrog.parts.length + newParts.length,
};

fs.writeFileSync(REPORT, JSON.stringify(report, null, 2));
console.log(`\n=== inject-ch7 — ${report.mode} ===`);
console.log(JSON.stringify(report.summary, null, 2));
console.log('\naccType:', JSON.stringify(report.byAccType));
if (report.deadSlots.length) console.log('\n!! accType with no slot in buildWashStationSlots:', JSON.stringify(report.deadSlots.slice(0, 8)));
if (report.orphanParentRefs.length) console.log('\n!! "zu <artNr>" naming a basin not in the pool:', JSON.stringify(report.orphanParentRefs.slice(0, 8)));
console.log(`\nreport → ${path.relative(ROOT, REPORT)}`);

if (!APPLY) { console.log('\nDRY RUN — custom-data.json and prices.json untouched. Re-run with --apply to write.'); process.exit(0); }

fs.copyFileSync(DATA, DATA + '.bak-ch7');
fs.copyFileSync(PRICES, PRICES + '.bak-ch7');
data.waschtrog.parts.push(...newParts);
data.zubehoer_pool.trays.push(...newPool);
Object.assign(prices, priceAdds);
if (pricesFile.meta) pricesFile.meta.entries = Object.keys(prices).length;
writeData(data, { backup: false });
fs.writeFileSync(PRICES, JSON.stringify(pricesFile, null, 2));
console.log(`\nAPPLIED — ${newParts.length} wash-station parts, ${newPool.length} pool items, ${report.newPrices} new prices.`);
console.log('backups: custom-data.json.bak-ch7, prices.json.bak-ch7');
