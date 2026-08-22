/**
 * catalog-diff.cjs — what changed between the shop and us.
 * ---------------------------------------------------------------------------
 * Reads a census (catalog-census.cjs) and answers the three questions that
 * `custom-data.json` cannot answer about itself:
 *
 *   GONE      an art-Nr we can put in a Stückliste that the shop no longer
 *             lists. This is the expensive one — it reaches SAP as an order
 *             line for an article that cannot be delivered.
 *   PRICE     an art-Nr whose price moved. Ours are "2026.6"; the shop reissues
 *             continuously, and every one found so far moved UP, so a stale
 *             price is money quoted away, silently.
 *   UNCOVERED an art-Nr the shop lists that no configurator can reach. Not a
 *             defect on its own — plenty is out of scope (Hebeanlagen, spare
 *             parts) — but it is where next week's new products land, and the
 *             only place they can be seen.
 *
 * Diffing TWO censuses (--since <file>) narrows UNCOVERED to what genuinely
 * appeared since that date, which is the weekly work-list. Without it you get
 * the whole standing gap, which is a one-off backlog, not a weekly signal.
 *
 * This script REPORTS. It never edits custom-data.json — routing a new article
 * into a pool is a decision (classify-ch3.cjs, the injectors), and an automated
 * write here would be an injector with no rules and no test.
 *
 * Usage:
 *   node st-scraper/catalog-diff.cjs                        # newest census vs our data
 *   node st-scraper/catalog-diff.cjs --since census/2026-08-15.json
 *   node st-scraper/catalog-diff.cjs --json report.json
 */
'use strict';
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const { readData } = require('./_dataFile.cjs');
const { ourArticles, ART } = require('./_ourArticles.cjs');

const DIR = path.join(__dirname, 'census');
const arg = (n, d) => { const i = process.argv.indexOf(n); return i > -1 ? process.argv[i + 1] : d; };

const readCensus = (p) => JSON.parse(p.endsWith('.gz') ? zlib.gunzipSync(fs.readFileSync(p)) : fs.readFileSync(p, 'utf8'));

function newestCensus() {
    const f = fs.readdirSync(DIR).filter(x => /^\d{4}-\d{2}-\d{2}\.json(\.gz)?$/.test(x)).sort();
    if (!f.length) { console.error('no census yet — run: node st-scraper/catalog-census.cjs'); process.exit(1); }
    return path.join(DIR, f[f.length - 1]);
}

const censusPath = arg('--census', newestCensus());
const census = readCensus(censusPath);
const sincePath = arg('--since', null);
const since = sincePath ? readCensus(path.resolve(sincePath)) : null;

// ---- everything WE can order, and where it sits -----------------------------
// The walk lives in _ourArticles.cjs — flag-discontinued.cjs asks the same question
// and a second copy of it would drift.
const data = readData();
const ours = ourArticles(data);

const prices = (() => { try { return JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'prices.json'), 'utf8')).prices || {}; } catch (e) { return {}; } })();
const shop = census.articles;

// ---- the three buckets ------------------------------------------------------
const gone = [], priceMoved = [], uncovered = [], appeared = [];
for (const [art, r] of ours) {
    const s = shop[art];
    if (!s) { gone.push({ art, pools: [...r.where].join(','), label: r.label }); continue; }
    const ourP = prices[art];
    if (typeof ourP === 'number' && ourP > 0 && typeof s.price === 'number' && s.price > 0) {
        const d = (s.price - ourP) / ourP;
        if (Math.abs(d) > 0.005) priceMoved.push({ art, ours: ourP, shop: s.price, pct: +(d * 100).toFixed(1), label: (r.label || s.short).slice(0, 60) });
    }
}
for (const [art, s] of Object.entries(shop)) {
    if (ours.has(art)) continue;
    uncovered.push({ art, wg: s.warengruppe, brand: s.brand, cat: s.cat[0] || '', short: s.short.slice(0, 60), isNew: s.isNew });
    if (since && !since.articles[art]) appeared.push({ art, wg: s.warengruppe, brand: s.brand, short: s.short.slice(0, 70) });
}
const vanished = since ? Object.keys(since.articles).filter(a => !shop[a]) : null;

// ---- report -----------------------------------------------------------------
const bar = s => console.log('\n' + s + '\n' + '─'.repeat(s.length));
const tally = (rows, f, n = 12) => {
    const m = {}; rows.forEach(r => { const k = r[f] || '(none)'; m[k] = (m[k] || 0) + 1; });
    return Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, n);
};

console.log(`census ${path.basename(censusPath)} — ${census.meta.skus} SKUs, taken ${census.meta.takenAt.slice(0, 16).replace('T', ' ')}`);
console.log(`ours          — ${ours.size} orderable art-Nrs across ${new Set([...ours.values()].flatMap(r => [...r.where])).size} pools`);
if (since) console.log(`compared with ${path.basename(sincePath)} — ${since.meta.skus} SKUs`);

bar(`⚠ GONE — ${gone.length} art-Nr we can order, the shop no longer lists`);
tally(gone, 'pools').forEach(([k, n]) => console.log(`   ${String(n).padStart(5)}  ${k}`));
gone.slice(0, 15).forEach(g => console.log(`   ${g.art}  [${g.pools}]  ${g.label}`));

bar(`↕ PRICE — ${priceMoved.length} of ${ours.size} moved (${((priceMoved.length / ours.size) * 100).toFixed(1)}%)`);
if (priceMoved.length) {
    const up = priceMoved.filter(p => p.pct > 0), dn = priceMoved.filter(p => p.pct < 0);
    const sum = priceMoved.reduce((a, p) => a + (p.shop - p.ours), 0);
    console.log(`   ${up.length} up · ${dn.length} down · net CHF ${sum.toFixed(0)} un-billed across one of each`);
    console.log(`   biggest moves:`);
    priceMoved.sort((a, b) => Math.abs(b.shop - b.ours) - Math.abs(a.shop - a.ours)).slice(0, 12)
        .forEach(p => console.log(`   ${p.art}  ${String(p.ours).padStart(7)} → ${String(p.shop).padStart(7)}  ${(p.pct > 0 ? '+' : '') + p.pct}%  ${p.label}`));
}

bar(`○ UNCOVERED — ${uncovered.length} shop SKUs no configurator can reach`);
tally(uncovered, 'cat', 8).forEach(([k, n]) => console.log(`   ${String(n).padStart(6)}  ${k}`));
console.log('   top Warengruppen:');
tally(uncovered, 'wg', 12).forEach(([k, n]) => console.log(`   ${String(n).padStart(6)}  ${k}`));
console.log(`   flagged "Neuheit" by the shop: ${uncovered.filter(u => u.isNew).length}`);

if (since) {
    bar(`＋ APPEARED since ${path.basename(sincePath)} — ${appeared.length}`);
    appeared.slice(0, 25).forEach(a => console.log(`   ${a.art}  ${a.brand}  ${a.short}`));
    bar(`－ VANISHED since ${path.basename(sincePath)} — ${vanished.length}`);
    vanished.slice(0, 25).forEach(a => console.log(`   ${a}${ours.has(a) ? '   ⚠ WE USE THIS' : ''}`));
}

const jsonOut = arg('--json', null);
if (jsonOut) {
    fs.writeFileSync(path.resolve(jsonOut), JSON.stringify({ census: path.basename(censusPath), gone, priceMoved, uncovered, appeared, vanished }, null, 1));
    console.log(`\nfull report → ${jsonOut}`);
}
