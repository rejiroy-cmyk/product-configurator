/**
 * catalog-census.cjs — snapshot EVERY article profishop currently lists.
 * ---------------------------------------------------------------------------
 * The catalogue moves weekly: articles appear, articles are dropped, prices are
 * re-issued. Nothing in this repo noticed — every injector was a one-shot import
 * of a chapter, so `custom-data.json` is a photograph of the day it ran and a
 * dropped article stays orderable in the configurator forever.
 *
 * This is the missing feed. The shop's own catalogue browse is backed by a
 * FACT-Finder search service, and it hands back the whole product record:
 *
 *   search.ws  event=GET_CATALOG  is_options-rows=200&is_options-page=N
 *     result.totalHits            26'971 master articles (the 7-digit bases)
 *     result.hits[].masterValues  MasterArticleNr, UnitOfOrder, Margin, …
 *     result.hits[].variantValues one entry PER SKU — the full colour matrix:
 *       ArticleNr        13 digits, the orderable art-Nr
 *       Availability     "True" / "False"   ← the question this file answers
 *       Price            numeric, exkl. MwSt, the same basis as prices.json
 *       Title / Description_short / Description_long
 *       Brand · Warengruppe (= productType) · Produktlinie · Farbe · VarDim_ColorCode
 *       ImageURL         the REAL PG1 url, read from the vendor, never synthesized
 *       EAN · SupplierArticleNr · Montageart · CategoryPath_lvl0..2
 *       RecoAccessories / RecoDownstream   related art-Nrs, as art-Nr strings
 *
 * ⚠ NO LOGIN. `article.ws` needs a SESSION, not credentials (see CLAUDE.md), and
 * so does this: an ordinary anonymous page visit mints one. That is the whole
 * reason this can run unattended — cookie.txt is a human refreshing a token every
 * 20 minutes, and a weekly job cannot depend on that.
 *
 * `rows` caps at 200 server-side (500 silently returns 200), so a full census is
 * ~135 requests. Paced deliberately: this is a vendor system, not ours.
 *
 * Two fields that LOOK useful and are not — do not build on them:
 *   PublishingDate  constant "2012/01/01" on every article
 *   FaceOffDate     constant "2099/12/31" on every article
 * They are unmaintained in the vendor's index. `IsNew` does vary (~6% "Ja") but
 * it is a merchandising badge, not a changelog. The only trustworthy signal for
 * "what changed" is diffing two censuses — which is what catalog-diff.cjs does.
 *
 * Usage:  node st-scraper/catalog-census.cjs            # writes census/<today>.json
 *         OUT=… node st-scraper/catalog-census.cjs      # explicit path
 * Resume: re-running reuses the page cache in census/.partial-<date>.json.
 */
'use strict';
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const DIR = path.join(__dirname, 'census');
fs.mkdirSync(DIR, { recursive: true });
const STAMP = new Date().toISOString().slice(0, 10);
const OUT = process.env.OUT || path.join(DIR, `${STAMP}.json.gz`);   // ~8 MB gz / ~98 MB raw
const PARTIAL = path.join(DIR, `.partial-${STAMP}`);   // ONE FILE PER PAGE — see below
const ROWS = 200;                       // server cap; 500 silently returns 200
const HOST = 'https://profishop.sanitastroesch.ch';
const WS = '/business(bD1kZSZjPTAwMQ==)/webservices/search.ws';

const sleep = ms => new Promise(r => setTimeout(r, ms));
const rnd = (a, b) => a + Math.random() * (b - a);
const fmtArt = d => `${d.slice(0, 4)} ${d.slice(4, 7)}.${d.slice(7, 10)}.${d.slice(10, 13)}`;
const one = v => (Array.isArray(v) ? v[0] : v);

(async () => {
    // A census is dated, and re-taking today's costs eight minutes to reproduce a
    // file that already exists — which is what a hand re-run of the weekly job
    // would do. The scheduled run always lands on a new date, so this only ever
    // short-circuits a repeat.
    if (fs.existsSync(OUT) && !process.env.FORCE) {
        const have = JSON.parse(OUT.endsWith('.gz') ? zlib.gunzipSync(fs.readFileSync(OUT)) : fs.readFileSync(OUT, 'utf8'));
        console.log(`census for ${STAMP} already taken — ${have.meta.skus} SKUs, ${have.meta.masters} bases.`);
        console.log(`  ${path.relative(process.cwd(), OUT)}   (FORCE=1 to re-take it)`);
        return;
    }
    const t0 = Date.now();
    const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'], defaultViewport: { width: 1400, height: 900 } });
    const page = (await browser.pages())[0] || await browser.newPage();
    process.stdout.write('minting an anonymous session… ');
    await page.goto(`${HOST}/business/catalogue?rows=12&page=1`, { waitUntil: 'networkidle2', timeout: 60000 });
    await sleep(2500);
    console.log('ok');

    const fetchPage = (pg) => page.evaluate(async (ws, rows, pg) => {
        const body = `event=GET_CATALOG&is_options-rows=${rows}&is_options-sort-name=score&is_options-sort-order=desc&is_options-page=${pg}&`;
        const r = await fetch(ws, {
            method: 'POST', credentials: 'include',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8', 'X-Requested-With': 'XMLHttpRequest' },
            body,
        });
        return await r.text();
    }, WS, ROWS, pg);

    // Resume cache: one file per page. It was a single { pages: {…} } JSON and that
    // threw `Invalid string length` at page ~100 — 135 pages of raw FACT-Finder JSON
    // is ~500 MB, past V8's max string length, so the whole run died at 79% with
    // nothing written. Never buffer the raw pages into one string.
    fs.mkdirSync(PARTIAL, { recursive: true });
    const pageFile = pg => path.join(PARTIAL, `p${pg}.json`);
    // A run that died under the old single-file cache leaves a ~500 MB orphan that
    // nothing ever collects, because the resume path is a directory now.
    for (const f of fs.readdirSync(DIR)) {
        if (/^\.partial-\d{4}-\d{2}-\d{2}\.json$/.test(f)) {
            fs.unlinkSync(path.join(DIR, f));
            console.log(`  (removed a stale single-file resume cache: ${f})`);
        }
    }
    const articles = {};        // artNr (masked) -> record
    const bases = {};           // 7-digit base -> { skus: [...] , master }
    let total = null, pages = null, empty = 0;

    for (let pg = 1; pages === null || pg <= pages; pg++) {
        let txt = fs.existsSync(pageFile(pg)) ? fs.readFileSync(pageFile(pg), 'utf8') : null;
        if (!txt) {
            let tries = 0;
            while (true) {
                try { txt = await fetchPage(pg); JSON.parse(txt); break; }
                catch (e) {
                    if (++tries >= 3) throw new Error(`page ${pg} failed 3x: ${e.message}`);
                    await sleep(4000 * tries);
                }
            }
            fs.writeFileSync(pageFile(pg), txt);
            await sleep(rnd(400, 900));
        }
        const res = (JSON.parse(txt) || {}).result || {};
        if (total === null) { total = res.totalHits; pages = Math.ceil(total / ROWS); console.log(`${total} master articles → ${pages} pages of ${ROWS}`); }
        const hits = res.hits || [];
        if (!hits.length) { if (++empty >= 2) break; continue; }

        for (const h of hits) {
            const mv = h.masterValues || {};
            const base = mv.MasterArticleNr;
            if (!base) continue;
            const skus = [];
            for (const v of (h.variantValues || [])) {
                const d = String(v.ArticleNr || '').replace(/[^0-9]/g, '');
                if (d.length !== 13) continue;
                const art = v.ArticleNr_masked || fmtArt(d);
                skus.push(art);
                articles[art] = {
                    art, base,
                    available: v.Availability === 'True' || v.Availability === true,
                    price: typeof v.Price === 'number' ? v.Price : null,
                    title: v.Title || '',
                    short: v.Description_short || '',
                    long: v.Description_long || '',
                    brand: v.Brand || '',
                    warengruppe: one(v.Warengruppe) || '',
                    linie: one(v.Produktlinie) || '',
                    farbe: one(v.Farbe) || '',
                    colorCode: v.VarDim_ColorCode || '',
                    img: v.ImageURL || '',
                    ean: v.EAN || '',
                    supplierNr: v.SupplierArticleNr || '',
                    montage: one(v.Montageart) || '',
                    cat: [one(v.CategoryPath_lvl0), one(v.CategoryPath_lvl1), one(v.CategoryPath_lvl2)].filter(Boolean),
                    isNew: v.IsNew === 'Ja',
                    reco: [v.RecoAccessories, v.RecoDownstream].filter(Boolean).join('|'),
                };
            }
            bases[base] = { base, masked: mv.MasterArticleNr_masked || '', unit: mv.UnitOfOrder || '', skus };
        }
        if (pg % 10 === 0 || pg === pages) process.stdout.write(`  page ${pg}/${pages} — ${Object.keys(articles).length} SKUs\r`);
    }

    const arts = Object.values(articles);
    const out = {
        meta: {
            takenAt: new Date().toISOString(),
            source: `${HOST} search.ws GET_CATALOG (anonymous)`,
            priceBasis: 'CHF exkl. MwSt (unverb. Richtpreis)',
            masters: Object.keys(bases).length,
            totalHitsReported: total,
            skus: arts.length,
            unavailable: arts.filter(a => !a.available).length,
            seconds: Math.round((Date.now() - t0) / 1000),
        },
        bases,
        articles,
    };
    // gzip: a census is ~98 MB of mostly German prose, ~8 MB compressed. Weekly
    // snapshots are the whole point, so uncompressed would be ~5 GB a year on disk.
    // census/ is git-ignored — these are reproducible in 8 minutes, not source.
    const body = JSON.stringify(out);
    fs.writeFileSync(OUT, OUT.endsWith('.gz') ? zlib.gzipSync(body, { level: 6 }) : body);

    // keep the last 8 so a week-over-week diff always has a baseline
    const olds = fs.readdirSync(DIR).filter(f => /^\d{4}-\d{2}-\d{2}\.json(\.gz)?$/.test(f)).sort();
    for (const f of olds.slice(0, Math.max(0, olds.length - 8))) fs.unlinkSync(path.join(DIR, f));
    fs.rmSync(PARTIAL, { recursive: true, force: true });
    console.log(`\n\ncensus → ${path.relative(process.cwd(), OUT)}`);
    console.log(`  ${out.meta.masters} bases · ${out.meta.skus} SKUs · ${out.meta.unavailable} flagged NOT available · ${out.meta.seconds}s`);
    await browser.close();
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
