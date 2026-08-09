/**
 * heal-ch2-waschtisch.cjs
 * Re-syncs the injected Ch2 basins (`waschtisch.trays`, ids `ch2_*`) against a FRESH profishop
 * variant scrape. The printed catalogue is a yearly snapshot; profishop is updated continuously,
 * so the shop is authoritative for which SKU is current and which finishes actually exist.
 *
 * What it corrects per base:
 *   - the main art-Nr        (tray.artNr  <- scrape mainArt)
 *   - the colour variants    (tray.variants <- every other SKU on that base)
 *   - prices                 (merged into prices.json for main + variants, additive)
 *
 * Getting a fresh scrape (run on a machine that can reach profishop — this repo's proven
 * Puppeteer scraper, which supports a targeted base list):
 *
 *   ONLY_BASES=$(tr '\n' ',' < st-scraper/catalogue-inspection/ch2-verify-bases.txt) \
 *   CHAPTER=2 OUT_FILE=chapter-2-variants-rescraped.json \
 *   node st-scraper/scrape-armaturen-variants.js
 *
 *   node st-scraper/heal-ch2-waschtisch.cjs --vars=st-scraper/chapter-2-variants-rescraped.json
 *   node st-scraper/heal-ch2-waschtisch.cjs --vars=… --apply
 *
 * Usage:  node st-scraper/heal-ch2-waschtisch.cjs [--vars=<file>] [--apply]
 *         (default --vars=st-scraper/chapter-2-variants-scraped.json)
 */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(path.dirname(fs.realpathSync(__filename)), '..');
const DATA = path.join(ROOT, 'custom-data.json');
const PRICES = path.join(ROOT, 'prices.json');
const COLORS = path.join(ROOT, 'modules/factories/_colorCodes.js');
const APPLY = process.argv.includes('--apply');
const varsArg = process.argv.find(a => a.startsWith('--vars='));
const VARS = path.resolve(ROOT, varsArg ? varsArg.slice('--vars='.length) : 'st-scraper/chapter-2-variants-scraped.json');

// ---------------------------------------------------------------------------
// Expert-confirmed corrections that no local source can settle.
// The 3rd art-Nr triplet is a surface treatment: the catalogue prints
// "Farbe: 228, 423, 535, 536  202: Cleaneffekt", so schwarz matt Cleaneffekt is .535.202.
// prices.json still carries a stale .535.000 for this base; profishop is authoritative.
// Confirmed by the repo owner against the printed page + shop, 2026-08-09.
// Entries are removed once a fresh scrape covers the base.
// ---------------------------------------------------------------------------
// Prices are the catalogue's own "202: Cleaneffekt" group rate for each base; a scrape overwrites
// them with the live shop price.
// `artNr` = the main article, `keep` = further real SKUs to carry as variants, `drop` = SKUs
// that turned out not to exist and must not survive anywhere on the tray.
const CORRECTIONS = {
    '2231666': {
        artNr: '2231 666.105.000', price: 292,
        keep: { '2231 666.535.202': 407 },
        drop: ['2231 666.535.000'],
        why: 'Weiss Cleaneffekt is the main per the neutral rule; Schwarz matt is .535.202, and .535.000 never existed',
    },
    '2231665': {
        artNr: '2231 665.105.000', price: 316,
        keep: { '2231 665.535.202': 474 },
        drop: ['2231 665.535.000'],
        why: 'Weiss Cleaneffekt is the main per the neutral rule; Schwarz matt is .535.202, and .535.000 never existed',
    },
};
// The .105.000 SKUs and the .202 Schwarz matt were confirmed in the shop by the repo owner
// (2026-08-09). The remaining catalogue finishes for these bowls (.228/.423/.536 .202) are
// listed on the printed page but unconfirmed, so they are deliberately NOT added.

const digits = a => String(a || '').replace(/[^0-9]/g, '');
const base7 = a => digits(a).slice(0, 7);
const imgFromArt = (art) => {
    const dg = digits(art);
    if (dg.length < 12) return '';
    return 'https://wsrv.nl/?url=profishop.sanitastroesch.ch/multimedia/Web/PG1/'
        + dg.slice(0, dg.length - 6).padStart(8, '0') + '_' + dg.slice(dg.length - 6, dg.length - 3) + '_' + dg.slice(dg.length - 3) + '.png';
};
const COLOR_NAMES = (() => {
    const src = fs.readFileSync(COLORS, 'utf8');
    const map = {};
    for (const m of src.matchAll(/'(\d{3})'\s*:\s*"([^"]*)"/g)) map[m[1]] = m[2];
    return map;
})();
const colourOf = art => COLOR_NAMES[digits(art).slice(7, 10)] || '';

// ---------------------------------------------------------------------------
// HOUSE RULE (repo owner, 2026-08-09): the MAIN article of a product is the neutral
// finish — Weiss for ceramics/furniture, Verchromt for fittings, Echtglas klar for glass.
// Every other finish is a variant/SKU hanging off it. Derived from the colour-code names
// rather than a hand-kept list, so a new white code is covered automatically.
// A model with no neutral finish at all (e.g. the Echtholz-furniert combos, which only ship
// in Nussbaum/Eiche) keeps whatever the shop calls its main article.
// ---------------------------------------------------------------------------
const NEUTRAL_NAME = /weiss|white|verchromt|chrom|echtglas klar|glas klar|klarglas/i;
const isNeutralFinish = code => NEUTRAL_NAME.test(COLOR_NAMES[code] || '');
// Rank so the plainest white wins when several exist (Weiss > Weiss Cleaneffekt > matt > gloss).
const NEUTRAL_ORDER = ['100', '105', '101', '536', '713', '379', '104', '114', '501', '124', '123'];
const neutralRank = code => { const i = NEUTRAL_ORDER.indexOf(code); return i === -1 ? NEUTRAL_ORDER.length : i; };

const data = JSON.parse(fs.readFileSync(DATA, 'utf8'));
const pricesFile = JSON.parse(fs.readFileSync(PRICES, 'utf8'));
const prices = pricesFile.prices || pricesFile;
let scrape = {};
try { scrape = JSON.parse(fs.readFileSync(VARS, 'utf8')); }
catch (e) { console.log('no variants file at ' + VARS + ' (' + e.message + ') — corrections only'); }

const trays = data.waschtisch.trays;
const injected = trays.filter(t => String(t.id).startsWith('ch2_'));
let artChanged = [], variantsChanged = 0, variantSkus = 0, pricesAdded = 0, corrected = [], neutralised = [], untouched = 0;

const setPrice = (art, p) => { if (p != null && art && !(String(art) in prices)) { prices[String(art)] = p; pricesAdded++; } };

for (const t of injected) {
    const b = base7(t.artNr);
    const sc = scrape[b];
    const fix = CORRECTIONS[b];
    let changed = false;

    // Work from the UNION of every SKU known for this base, then pick the main from it. Deciding
    // main and variants in one step (rather than mutating in sequence) is what makes this
    // idempotent — an earlier version re-synced the main from the scrape and THEN applied the
    // neutral rule, so a second run flipped the main back and silently dropped the promoted SKU.
    const known = new Map();     // digits -> { artNr, label, price }
    const remember = (art, label, price) => {
        if (!art || digits(art).length < 12) return;
        const k = digits(art);
        const prev = known.get(k) || {};
        known.set(k, { artNr: art, label: label || prev.label || t.label, price: price != null ? price : prev.price });
    };
    remember(t.artNr, t.label);
    for (const v of t.variants || []) remember(v.artNr, v.label);
    if (sc && sc.status === 'done') {
        remember(sc.mainArt, sc.mainDesc);
        for (const [a, vd] of Object.entries(sc.variants || {})) remember(a, vd.desc, vd.price);
    }
    if (fix && fix.artNr) remember(fix.artNr, t.label, fix.price);
    if (fix && fix.keep) for (const [a, p] of Object.entries(fix.keep)) remember(a, t.label, p);
    // a SKU proven not to exist must not linger as a variant either
    if (fix && fix.drop) for (const a of fix.drop) known.delete(digits(a));
    for (const e of known.values()) setPrice(e.artNr, e.price);

    // main: an expert correction wins outright; otherwise the neutral finish (house rule);
    // otherwise whatever profishop calls the main article; otherwise what we already had.
    const finishOf = a => digits(a).slice(7, 10);
    // NB: only promote when the incumbent is NOT neutral. Weiss hochglanz, Weiss matt and Weiss
    // are all "the white one" — once a tray leads with any of them there is nothing to fix, and
    // re-ranking between whites would override what the shop actually calls the main article.
    const neutrals = isNeutralFinish(finishOf(t.artNr)) ? [] :
        [...known.values()].filter(e => isNeutralFinish(finishOf(e.artNr)))
            .sort((a, b) => neutralRank(finishOf(a.artNr)) - neutralRank(finishOf(b.artNr)));
    const scrapeMain = sc && sc.status === 'done' && sc.mainArt;
    const keepMain = isNeutralFinish(finishOf(t.artNr));
    const wantArt = (fix && fix.artNr) || (neutrals[0] && neutrals[0].artNr) || (keepMain ? t.artNr : scrapeMain) || t.artNr;

    if (digits(wantArt) !== digits(t.artNr)) {
        const rec = { id: t.id, from: t.artNr, to: wantArt, fromC: colourOf(t.artNr), toC: colourOf(wantArt) };
        if (fix) { rec.why = fix.why; corrected.push(rec); }
        else if (neutrals[0] && digits(neutrals[0].artNr) === digits(wantArt)) neutralised.push(rec);
        else artChanged.push({ ...rec, why: 'profishop main article' });
        if (!t.imgUrl || t.imgUrl === imgFromArt(t.artNr)) t.imgUrl = imgFromArt(wantArt);
        const lbl = (known.get(digits(wantArt)) || {}).label;
        if (lbl && lbl.length > 15) t.label = lbl;
        t.artNr = wantArt;
        changed = true;
    }

    // variants: every other known SKU, in a stable order so re-runs produce identical output
    const list = [...known.values()]
        .filter(e => digits(e.artNr) !== digits(t.artNr))
        .sort((a, b) => digits(a.artNr).localeCompare(digits(b.artNr)))
        .map(e => ({ artNr: e.artNr, label: e.label, farbe: colourOf(e.artNr), imgUrl: imgFromArt(e.artNr) }));
    const before = (t.variants || []).map(v => digits(v.artNr)).sort().join(',');
    const after = list.map(v => digits(v.artNr)).sort().join(',');
    if (before !== after) { t.variants = list; variantsChanged++; changed = true; }
    else t.variants = list;                      // refresh farbe/img without counting a change
    variantSkus += list.length;

    if (!changed) untouched++;
}

console.log(`=== heal-ch2-waschtisch ${APPLY ? '(APPLY)' : '(DRY RUN)'} ===`);
console.log(`  variants file            : ${path.relative(ROOT, VARS)}${Object.keys(scrape).length ? ' (' + Object.keys(scrape).length + ' bases)' : ' — MISSING'}`);
console.log(`  injected basins checked  : ${injected.length}`);
console.log(`  main art-Nr corrected    : ${corrected.length}  (expert-confirmed)`);
console.log(`  main art-Nr re-synced    : ${artChanged.length}  (from the scrape)`);
console.log(`  main set to neutral SKU  : ${neutralised.length}  (Weiss/Verchromt/Klarglas house rule)`);
console.log(`  variant lists rebuilt    : ${variantsChanged}  (${variantSkus} SKUs total)`);
console.log(`  new prices merged        : ${pricesAdded}`);
console.log(`  unchanged                : ${untouched}`);
for (const c of corrected) console.log(`    FIX  ${c.id}: ${c.from} -> ${c.to}   (${c.why})`);
for (const n of neutralised.slice(0, 15)) console.log(`    NEUTRAL ${n.id}: ${n.from} (${n.fromC}) -> ${n.to} (${n.toC})`);
if (neutralised.length > 15) console.log(`    … and ${neutralised.length - 15} more`);
for (const c of artChanged.slice(0, 15)) console.log(`    SYNC ${c.id}: ${c.from} -> ${c.to}`);
if (artChanged.length > 15) console.log(`    … and ${artChanged.length - 15} more`);

if (APPLY) {
    fs.copyFileSync(DATA, DATA + '.bak-ch2heal');
    fs.writeFileSync(DATA, JSON.stringify(data, null, 2) + '\n');
    if (pricesFile.prices) { pricesFile.prices = prices; pricesFile.meta = { ...pricesFile.meta, entries: Object.keys(prices).length }; }
    else Object.assign(pricesFile, prices);
    fs.writeFileSync(PRICES, JSON.stringify(pricesFile, null, 2));
    console.log('\nWROTE custom-data.json (backup .bak-ch2heal) + prices.json');
} else {
    console.log('\nDRY RUN — nothing written. Re-run with --apply to commit.');
}
