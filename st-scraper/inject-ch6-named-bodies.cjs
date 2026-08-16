#!/usr/bin/env node
/**
 * inject-ch6-named-bodies.cjs — the Einbaukörper a Regenbrause NAMES but the
 * catalogue never carried.
 *
 * A concealed rain head is sold without its body and states the art-Nr it needs in
 * its own text ("… ohne Einbaukörper 6418 163"). `requiredBodyFor` in _shared.js
 * resolves that through `findArticleByBase` and, when the body is absent, renders a
 * VISIBLE WARNING ROW instead of guessing a finish triplet. Those warnings are what
 * this script clears: 75 SKUs across bademischer / duschenmischer / waschtischmischer /
 * zubehoer_pool named 21 distinct bodies that were simply never injected, though 20 of
 * them sit fully specified in the Ch6 API dump.
 *
 * NOT the same job as inject-ch6-einbaukoerper.cjs — that one attaches a body to UP
 * mixers from the CATALOGUE's Zubehör bundles. This one closes the gap left by a
 * head's own TEXT reference, and takes its work-list from the live data rather than a
 * hard-coded list, so a re-run after any future injection only adds what is still
 * missing. IDEMPOTENT: a base already resolvable is never touched.
 *
 * FULL-TEXT RULE: the reference lives in the description — the label truncates long
 * before the number — and ERP breaks lines INSIDE it ("6438<br>844"), so markup is
 * stripped before matching. Same regex as _shared.js, deliberately.
 *
 * ⚠ THE ART-NR IS CROSS-CHECKED, not trusted (CLAUDE.md, the Ch2 lesson). SAP's own
 * `matnr` is authoritative, but the shop's image filename carries the full 13-digit
 * art-Nr, so `ch6-body-images.json` (scrape-ch7-images.cjs, anonymous) is used to
 * confirm every SKU exists and that the two agree. A base the shop has no page for is
 * REPORTED and skipped — it keeps its warning row, which is the honest outcome.
 *
 * Images: the verified PG1 URL is written as a REMOTE url and MUST then be localised —
 *   node st-scraper/localize-images.cjs --emit-jobs
 *   python3 st-scraper/localize_fetch.py
 *   node st-scraper/localize-images.cjs --rewrite
 * or the data holds a vendor URL that fires a request on every render.
 *
 *   node st-scraper/inject-ch6-named-bodies.cjs            # dry run
 *   node st-scraper/inject-ch6-named-bodies.cjs --write    # apply (backs up first)
 */
'use strict';
const fs = require('fs');
const path = require('path');

const WRITE = process.argv.includes('--write');
const ROOT = path.join(__dirname, '..');
const DATA = path.join(ROOT, 'custom-data.json');
const PRICES = path.join(ROOT, 'prices.json');
const IMAGES = path.join(__dirname, 'ch6-body-images.json');
const REPORT = path.join(__dirname, 'catalogue-inspection', 'ch6-bodies-injection-report.json');
const API_DUMPS = ['ch1', 'ch2', 'ch3', 'ch6', 'ch7', 'ch8']
    .map(c => path.join(__dirname, 'catalogue-inspection', `${c}-api.json`))
    .concat([path.join(__dirname, 'catalogue-inspection', 'ch6-api-refetch.json')])
    .filter(fs.existsSync);

// Same reference regex as _shared.js#_RX_REQUIRED_BODY — keep the two in step.
const RX_REQUIRED_BODY = /ohne\s+(?:einbau|grund)k[öo]rper\s+(\d{4})\s?(\d{3})/i;
// label-prefix by design: a label starting with "Einbaukörper"/"Grundkörper" states
// what the article IS. A head's description merely NAMES one (the partner-reference
// trap), so identity is read off the head of the referenced article's own short text.
const RX_IS_BODY = /^(?:einbau|grund)k[öo]rper\b/i;
// Non-criteria attributes, dropped at ingest exactly as apply-refetched-text.cjs does.
const TECH_DROP = new Set(['Volumen', 'Gewicht', 'Geräuschgruppe', 'Energieeffizienzklasse']);
const BRANDS = /\b(Dornbracht|Hansgrohe|Axor|Gessi|Fantini|KWC|Laufen|Geberit|Similor|Alterna|Emporio|Kludi|Grohe|Ideal Standard)\b/i;

const clean = (s) => String(s || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
const digits = (a) => String(a || '').replace(/[^0-9]/g, '');
const baseOf = (a) => digits(a).slice(0, 7);
const fmtArt = (raw) => {
    const d = digits(raw);
    return d.length === 13 ? `${d.slice(0, 4)} ${d.slice(4, 7)}.${d.slice(7, 10)}.${d.slice(10)}` : String(raw || '').trim();
};
const techMap = (t) => {
    const out = {};
    for (const e of (Array.isArray(t) ? t : [])) {
        let k, v;
        if (e && typeof e === 'object') { k = e.label; v = e.value; }
        else { const m = /^([^:]+):\s*(.*)$/.exec(String(e || '')); if (m) { k = m[1]; v = m[2]; } }
        k = clean(k); v = clean(v);
        if (k && v && !TECH_DROP.has(k)) out[k] = v;
    }
    return out;
};

// ── 1. the work-list, computed from the live data ────────────────────────────
const data = JSON.parse(fs.readFileSync(DATA, 'utf8'));
const traysOf = (pool) => (pool && pool.trays) || (Array.isArray(pool) ? pool : []) || [];

// Every art-Nr base findArticleByBase can reach: trays, their variants, and the
// options inside every mounting group — the index _shared.js builds at runtime.
const resolvable = new Set();
const eachArticle = (fn) => {
    for (const key of Object.keys(data)) {
        for (const t of traysOf(data[key])) {
            fn(t, key);
            for (const v of t.variants || []) fn(v, key);
            for (const g of t.mountingMaterials || []) for (const o of g.options || []) fn(o, key);
        }
    }
};
eachArticle((a) => { if (a && a.artNr && a.label) { const b = baseOf(a.artNr); if (b.length === 7) resolvable.add(b); } });

const refs = [];   // every article that names a body
eachArticle((a, pool) => {
    if (!a || !a.artNr) return;
    const text = clean([a.label, a.description, a.specs && Object.values(a.specs).join(' ')].filter(Boolean).join(' '));
    const m = RX_REQUIRED_BODY.exec(text);
    if (m) refs.push({ pool, artNr: a.artNr, label: clean(a.label).slice(0, 80), base: m[1] + m[2] });
});
const unresolvedRefs = refs.filter(r => !resolvable.has(r.base));
const wanted = [...new Set(unresolvedRefs.map(r => r.base))].sort();
const refCount = (b) => unresolvedRefs.filter(r => r.base === b).length;

console.log(`articles naming a body : ${refs.length}  (${new Set(refs.map(r => r.base)).size} distinct bodies)`);
console.log(`resolve today          : ${refs.length - unresolvedRefs.length}`);
console.log(`UNRESOLVED             : ${unresolvedRefs.length} SKUs → ${wanted.length} bodies\n`);
if (!wanted.length) { console.log('nothing to do — every named body resolves.'); process.exit(0); }

// ── 2. the sources: SAP record + the shop's own image filename ───────────────
const api = {};
for (const f of API_DUMPS) {
    const dump = JSON.parse(fs.readFileSync(f, 'utf8'));
    for (const [b, rec] of Object.entries(dump)) {
        if (!rec || !rec.matnr || !rec.maktx) continue;
        const k = baseOf(b) || baseOf(rec.matnr);
        // the longer short text wins where two dumps disagree
        if (!api[k] || clean(rec.maktx).length > clean(api[k].maktx).length) api[k] = { ...rec, _src: path.basename(f) };
    }
}
const shop = fs.existsSync(IMAGES) ? JSON.parse(fs.readFileSync(IMAGES, 'utf8')) : {};
if (!fs.existsSync(IMAGES)) {
    console.warn(`⚠ ${path.basename(IMAGES)} missing — run the scrape first, or every base is skipped:\n` +
        `   BASES=${wanted.join(',')} OUT=ch6-body-images.json node st-scraper/scrape-ch7-images.cjs\n`);
}

const pricesFile = JSON.parse(fs.readFileSync(PRICES, 'utf8'));
const prices = pricesFile.prices || pricesFile;
const pool = traysOf(data.zubehoer_pool);
if (!pool.length) { console.error('zubehoer_pool.trays is empty — wrong file?'); process.exit(1); }

const added = [], skipped = [];
let pricesAdded = 0, seq = 0;

for (const base of wanted) {
    const rec = api[base];
    const img = shop[base];
    const note = (reason, detail) => skipped.push({ base, reason, detail, unblocks: refCount(base), namedBy: unresolvedRefs.filter(r => r.base === base).map(r => r.artNr) });

    if (!rec) { note('no SAP record in any api dump', img && img.url ? 'shop has a page though' : 'shop has no page either'); continue; }
    const label = clean([rec.maktx, rec.maktx2].filter(Boolean).join(' '));
    const description = clean(rec.description);
    // identity, not partner reference — see RX_IS_BODY
    if (!RX_IS_BODY.test(label) && !RX_IS_BODY.test(description)) { note('referenced article is not a body', label.slice(0, 70)); continue; }
    // ⚠ the shop is the authority on whether the SKU exists at all
    if (!img || !img.url) { note('shop has no product page — art-Nr unconfirmed', label.slice(0, 70)); continue; }

    const artNr = fmtArt(rec.matnr);
    const shopArt = (img.all || []).map(x => fmtArt(x.art)).find(a => baseOf(a) === base);
    if (shopArt && shopArt !== artNr) { note('art-Nr conflict: SAP vs shop image filename', `${artNr} ≠ ${shopArt}`); continue; }

    const tech = techMap(rec.tech);
    const manufacturer = tech['Marke'] || (BRANDS.exec(label) || [])[1] || 'Andere';
    pool.push({
        id: 'ekn_' + base + (++seq),
        manufacturer,
        form: 'Standard',
        size: 'Standard',
        montageart: 'alle',
        artNr,
        label,
        menge: 1,
        imgUrl: img.url,            // remote — localise straight after, see header
        variants: [],
        mountingMaterials: [],
        productType: 'Einbaukörper',
        tech: Object.keys(tech).length ? tech : undefined,
        description,
    });
    const net = rec.net && rec.net.price;
    if (net != null && !(artNr in prices)) { prices[artNr] = net; pricesAdded++; }
    added.push({ base, artNr, label, manufacturer, net, unblocks: refCount(base), imgKind: img.kind, src: rec._src });
}

// ── 3. report ────────────────────────────────────────────────────────────────
added.sort((a, b) => b.unblocks - a.unblocks);
console.log(`INJECTED into zubehoer_pool: ${added.length} bodies, clearing ${added.reduce((s, a) => s + a.unblocks, 0)} of ${unresolvedRefs.length} warning rows`);
for (const a of added) console.log(`   ${a.artNr}  ${String(a.unblocks).padStart(3)} SKUs  CHF ${String(a.net).padStart(5)}  ${a.imgKind}  ${a.label.slice(0, 62)}`);
if (skipped.length) {
    console.log(`\nSKIPPED (keep their warning row): ${skipped.length} bodies, ${skipped.reduce((s, x) => s + x.unblocks, 0)} SKUs`);
    for (const s of skipped) console.log(`   ${s.base}  ${String(s.unblocks).padStart(3)} SKUs  — ${s.reason}${s.detail ? ' (' + s.detail + ')' : ''}`);
}
console.log(`\nnew price rows: ${pricesAdded}`);

const report = {
    generatedFor: 'Ch6 — the Einbaukörper a Regenbrause names in its own text',
    mode: WRITE ? 'APPLIED' : 'DRY RUN',
    refsTotal: refs.length,
    refsResolvedBefore: refs.length - unresolvedRefs.length,
    refsUnresolvedBefore: unresolvedRefs.length,
    bodiesWanted: wanted.length,
    injected: added.length,
    warningRowsCleared: added.reduce((s, a) => s + a.unblocks, 0),
    newPriceRows: pricesAdded,
    items: added,
    skipped,
    unresolvedRefs,
};

if (!WRITE) {
    fs.writeFileSync(REPORT, JSON.stringify(report, null, 2));
    console.log(`\nDRY RUN — nothing written to custom-data.json. Report: ${path.relative(ROOT, REPORT)}`);
    console.log('Re-run with --write to apply.');
    process.exit(0);
}
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
fs.copyFileSync(DATA, `${DATA}.bak-${stamp}`);
fs.writeFileSync(DATA, JSON.stringify(data, null, 2));   // MUST stay indent-2, or the diff is all 94k records
fs.writeFileSync(PRICES, JSON.stringify(pricesFile, null, 2));
fs.writeFileSync(REPORT, JSON.stringify(report, null, 2));
console.log(`\nbackup : custom-data.json.bak-${stamp}`);
console.log('written: custom-data.json, prices.json');
console.log(`report : ${path.relative(ROOT, REPORT)}`);
console.log('\nNEXT — localise the images, or the data holds vendor URLs:');
console.log('   node st-scraper/localize-images.cjs --emit-jobs && python3 st-scraper/localize_fetch.py && node st-scraper/localize-images.cjs --rewrite');
