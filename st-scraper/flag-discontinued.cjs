/**
 * flag-discontinued.cjs — mark the art-Nrs the shop no longer sells.
 * ---------------------------------------------------------------------------
 * Takes the GONE bucket of catalog-diff.cjs, VERIFIES every candidate against a
 * second source, and writes the survivors to ONE top-level key:
 *
 *   custom-data.json  _discontinued: { "1111 600.100.000": {
 *                       label, pools:[…], since:"2026-08-22", why:"no-image" } }
 *
 * Keyed by art-Nr and kept in one place on purpose. The same art-Nr shows up as a
 * tray, as a variant, as an interned mountingMaterials option and as a pool
 * accessory; setting a flag on 143 records scattered through a 41 MB file means
 * 143 chances to miss one, and touching interned options renumbers keys for a
 * cosmetic field. A lookup by art-Nr covers every surface at once, and an article
 * that comes back simply drops out of the list on the next run.
 *
 * ⚠ ABSENCE FROM THE CENSUS IS NOT ENOUGH ON ITS OWN. The census indexes the
 * CATALOGUE, and some orderable positions were never in it — Montagepauschale,
 * Demontage und Entsorgung, Nettobetrag lines. So every candidate is put to the
 * shop's own SEARCH, one visit per 7-digit base, and the two must agree.
 *
 *     article.ws status ERROR      → purged from SAP entirely      → flag  purged
 *     search finds nothing         → the product is gone           → flag  base-gone
 *     search finds the base, but
 *       our art-Nr is not in it    → this FINISH was replaced       → flag  variant-gone
 *                                    (the census lists the survivors — successors)
 *     anything else                → held back and REPORTED, never flagged
 *
 * ⚠ DO NOT go back to testing `article.ws result.image`. It is the obvious check
 * and it is wrong: the media file outlives the listing. That test cleared 45
 * articles as alive — every Axor ShowerSolution hose and every Hansgrohe Raindance
 * E head — whose bases the shop's own search answers with 0 Suchergebnisse, the
 * same answer it gives for articles nobody disputes are dead. An image proves a
 * picture exists, not that the article can be ordered.
 *
 * Idempotent and self-healing: the list is rebuilt from scratch every run, so a
 * re-listed article loses its flag without anyone editing anything. `since` is
 * carried over from the previous run where the art-Nr was already flagged, so the
 * date means "first seen gone", not "last time this ran".
 *
 * Usage:  node st-scraper/flag-discontinued.cjs           # dry run, writes nothing
 *         node st-scraper/flag-discontinued.cjs --write
 */
'use strict';
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const { readData, writeData } = require('./_dataFile.cjs');
const { ourArticles } = require('./_ourArticles.cjs');

const WRITE = process.argv.includes('--write');
const DIR = path.join(__dirname, 'census');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const rnd = (a, b) => a + Math.random() * (b - a);

const censusFile = (() => {
    const f = fs.readdirSync(DIR).filter(x => /^\d{4}-\d{2}-\d{2}\.json(\.gz)?$/.test(x)).sort();
    if (!f.length) { console.error('no census — run: npm run catalog:census'); process.exit(1); }
    return path.join(DIR, f[f.length - 1]);
})();
const census = JSON.parse(censusFile.endsWith('.gz')
    ? zlib.gunzipSync(fs.readFileSync(censusFile))
    : fs.readFileSync(censusFile, 'utf8'));
const STAMP = census.meta.takenAt.slice(0, 10);

(async () => {
    const data = readData();
    const ours = ourArticles(data);
    const prev = data._discontinued || {};
    const candidates = [...ours.keys()].filter(a => !census.articles[a]);
    console.log(`census ${path.basename(censusFile)} · ${ours.size} orderable art-Nrs · ${candidates.length} not listed`);
    if (!candidates.length) { console.log('nothing to flag.'); return; }

    console.log(`verifying — article.ws per art-Nr, then the shop's own search per base…`);
    const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'], defaultViewport: { width: 1400, height: 900 } });
    const page = (await browser.pages())[0] || await browser.newPage();
    await page.goto('https://profishop.sanitastroesch.ch/', { waitUntil: 'networkidle2', timeout: 60000 });
    await sleep(2500);

    // One search per BASE, not per art-Nr: a dropped finish range is a dozen art-Nrs
    // behind one product page, and that page load is the slow part.
    const searchCache = new Map();
    const baseListed = async (base) => {
        if (searchCache.has(base)) return searchCache.get(base);
        let v = null;
        for (let t = 0; t < 3 && v === null; t++) {
            try {
                await page.goto(`https://profishop.sanitastroesch.ch/business/search?q=${base}`, { waitUntil: 'networkidle2', timeout: 40000 });
                await sleep(rnd(2200, 3000));
                v = await page.evaluate(() => {
                    const t = document.body.innerText;
                    if (/keine?\s+(Suchergebnisse|Treffer|Ergebnisse)/i.test(t)) return false;
                    const m = t.match(/([\d'\u2019.]+)\s*Suchergebnisse/i);
                    if (m) return parseInt(m[1].replace(/[^\d]/g, ''), 10) > 0;
                    return document.querySelectorAll('a[href*="/business/article-"]').length > 0;
                });
            } catch (e) { await sleep(3000 * (t + 1)); }
        }
        searchCache.set(base, v);
        return v;
    };

    const flagged = {}, kept = [], unchecked = [];
    const bases = [...new Set(candidates.map(a => a.replace(/[^0-9]/g, '').slice(0, 7)))];
    console.log(`  ${candidates.length} art-Nrs across ${bases.length} bases`);
    let i = 0;
    for (const art of candidates) {
        i++;
        const m = art.replace(/[^0-9]/g, '');
        const base = m.slice(0, 7);
        let j = null;
        for (let t = 0; t < 3 && !j; t++) {
            try {
                j = JSON.parse(await page.evaluate(async m => await (await fetch(
                    `/business(bD1kZSZjPTAwMQ==)/webservices/article.ws?event=GET_DETAILS&matnr=${m}&menge=1`,
                    { credentials: 'include' })).text(), m));
            } catch (e) { await sleep(2500 * (t + 1)); }
        }
        const r = (j && j.result) || {};
        const purged = !!j && (j.status !== 'OK' || r.matnrDisplay === 'ERROR' || /EDIV - manueller Artikel/.test(r.maktx || ''));
        const rec = ours.get(art);
        let why = null;
        if (!j) { unchecked.push(art); }
        else if (purged) why = 'purged';
        else {
            const listed = await baseListed(base);
            if (listed === null) unchecked.push(art);
            else if (!listed) why = 'base-gone';
            else why = 'variant-gone';
        }
        if (why) {
            const survivors = (census.bases[base] && census.bases[base].skus) || [];
            flagged[art] = {
                label: rec.label || (r.maktx || '').trim(),
                pools: [...rec.where].sort(),
                since: (prev[art] && prev[art].since) || STAMP,
                seen: STAMP,
                why,
                ...(survivors.length ? { siblings: survivors } : {}),
            };
        } else if (j && !purged) kept.push({ art, label: rec.label, maktx: (r.maktx || '').slice(0, 50) });
        if (i % 10 === 0) process.stdout.write(`  ${i}/${candidates.length} — ${Object.keys(flagged).length} confirmed\r`);
        await sleep(rnd(280, 600));
    }
    await browser.close();

    const gone = Object.keys(flagged);
    const revived = Object.keys(prev).filter(a => !flagged[a]);
    const by = w => gone.filter(a => flagged[a].why === w).length;
    console.log(`\n\nCONFIRMED discontinued: ${gone.length}  (purged ${by('purged')} · product gone ${by('base-gone')} · finish replaced ${by('variant-gone')})`);
    const byPool = {};
    gone.forEach(a => flagged[a].pools.forEach(p => { byPool[p] = (byPool[p] || 0) + 1; }));
    Object.entries(byPool).sort((a, b) => b[1] - a[1]).forEach(([p, n]) => console.log(`   ${String(n).padStart(4)}  ${p}`));

    if (kept.length) {
        console.log(`\nNOT flagged — the shop still lists these, they are just outside the catalogue index (${kept.length}):`);
        kept.forEach(k => console.log(`   ${k.art}  ${(k.label || k.maktx).slice(0, 78)}`));
    }
    if (unchecked.length) console.log(`\n⚠ could not be checked (left unflagged): ${unchecked.join(', ')}`);
    if (revived.length) console.log(`\n↻ back in the catalogue, flag removed: ${revived.join(', ')}`);

    if (!WRITE) { console.log('\ndry run — nothing written. Re-run with --write'); return; }
    if (gone.length) data._discontinued = flagged; else delete data._discontinued;
    writeData(data);
    console.log(`\n✔ custom-data.json._discontinued = ${gone.length} art-Nrs`);
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
