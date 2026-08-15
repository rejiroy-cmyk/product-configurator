// 3-AGENT (parallel), human-paced, headless=false VARIANT + DESCRIPTION scraper for catalogue
// CHAPTER 6 — "Armaturen, Duschsysteme, Armaturen-Steuerungen".
// Same per-base behaviour as scrape-dusche-variants.js (one visit per BASE art-Nr -> harvests the
// whole "Weitere Varianten" matrix + the base's own description), but runs AGENTS independent Chrome
// WINDOWS concurrently, each on its own session, each human-paced. Bases come from the parsed catalogue
// (chapter 6). One shared results file, written after every base -> fully resumable (rerun to continue).
// Usage:  node scrape-armaturen-variants.js [maxBasesThisRun]
//   env:  AGENTS=3 (default)  CHAPTER=6  ONLY_BASES=1234567,2345678  (comma list, overrides todo)
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());
const fs = require('fs');
const path = require('path');

const CATALOG = path.resolve(process.env.HOME, 'Downloads/sanitas_catalog_2026.6.json');
const CHAPTER = String(process.env.CHAPTER || '6');
// Optional catalog p.page (absolute PDF page) range to scrape only part of a chapter, e.g. printed
// "7.35"-"7.48" == p.page 1843-1856. Omit both to scrape the whole chapter.
const PAGE_MIN = process.env.PAGE_MIN ? parseInt(process.env.PAGE_MIN, 10) : null;
const PAGE_MAX = process.env.PAGE_MAX ? parseInt(process.env.PAGE_MAX, 10) : null;
const OUT = path.resolve(__dirname, process.env.OUT_FILE || `chapter-${CHAPTER}${PAGE_MIN != null ? `-p${PAGE_MIN}-${PAGE_MAX}` : ''}-variants-scraped.json`);
const AGENTS = parseInt(process.env.AGENTS || '3', 10);
const MAX = parseInt(process.argv[2] || '999999', 10);
const RESTART_EVERY = 100;      // recycle each window after this many bases (memory hygiene)
const SCRAPE_VERSION = 1;

const rnd = (a, b) => a + Math.random() * (b - a);
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function moveClick(page, el) {
    const b = await el.boundingBox(); if (!b) { await el.click(); return; }
    await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: Math.round(rnd(8, 16)) });
    await sleep(rnd(180, 480)); await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2);
}
async function scroll(page, n) { for (let i = 0; i < n; i++) { await page.mouse.wheel({ deltaY: rnd(280, 520) }); await sleep(rnd(300, 650)); } }

// ---- bases from catalogue chapter 6 (all distinct 7-digit base art-Nrs) ----
function buildBases() {
    if (process.env.ONLY_BASES) {
        return process.env.ONLY_BASES.split(',').map(s => s.trim()).filter(Boolean);
    }
    if (!fs.existsSync(CATALOG)) return [];
    const cat = JSON.parse(fs.readFileSync(CATALOG, 'utf8'));
    const bases = new Set();
    const add = (s) => { if (!s) return; const d = String(s).replace(/[^0-9]/g, ''); if (d.length >= 7) bases.add(d.slice(0, 7)); };
    for (const p of cat.products) {
        if (String(p.chapter) !== CHAPTER) continue;
        if (PAGE_MIN != null && (p.page == null || p.page < PAGE_MIN)) continue;
        if (PAGE_MAX != null && (p.page == null || p.page > PAGE_MAX)) continue;
        for (const v of (p.variants || [])) { add(v.baseNr); for (const sku of (v.skus || [])) add(sku.artNr); }
    }
    return [...bases].sort();
}

// ---- per-base scrape (identical to the proven Dusche scraper) ----
async function scrapeBase(page, baseDigits) {
    const input = await page.$('input[name="q"]');
    await moveClick(page, input);
    await page.evaluate(() => { const i = document.querySelector('input[name="q"]'); if (i) i.value = ''; });
    await page.type('input[name="q"]', baseDigits, { delay: rnd(80, 170) });
    await sleep(rnd(500, 1100));
    await page.keyboard.press('Enter');
    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 }).catch(() => {});
    await sleep(rnd(1500, 2600));
    if (/Keine Ergebnisse|0 Suchergebnisse/i.test(await page.evaluate(() => document.body.innerText.slice(0, 400))))
        return { status: 'notfound', variants: {} };
    await scroll(page, 2);
    // Navigate straight to the product page. A mouse-coordinate click on the result link misses when
    // it sits below the fold (longer Armaturen result lists) — leaving us stranded on the search page.
    const href = await page.evaluate(() => { const a = Array.from(document.querySelectorAll('a')).find(a => a.href && a.href.includes('/business/article-')); return a ? a.href : null; });
    if (!href) return { status: 'notfound', variants: {} };
    await page.goto(href, { waitUntil: 'networkidle2', timeout: 30000 }).catch(() => {});
    await sleep(rnd(1800, 2800));
    // Open "Weitere Varianten" robustly: on longer Armaturen pages the tab is below the fold, where a
    // mouse-coordinate click misses — scroll it into view and DOM-click it, then scroll the matrix to
    // trigger lazy rendering of the variant tiles.
    await page.evaluate(() => {
        const tab = Array.from(document.querySelectorAll('a,button,li,span,div'))
            .find(e => /^\s*Weitere Varianten\s*$/i.test(e.innerText || '') && (e.innerText || '').length < 25);
        if (tab) { tab.scrollIntoView({ block: 'center' }); tab.click(); }
    });
    await sleep(rnd(1600, 2600));
    for (let i = 0; i < 6; i++) { await page.mouse.wheel({ deltaY: rnd(400, 700) }); await sleep(rnd(320, 620)); }
    await sleep(rnd(700, 1300));

    const harvest = await page.evaluate((base) => {
        const clean = s => (s || '').replace(/\s+/g, ' ').trim();
        // strip the product page's jump-nav / price / wishlist chrome from a description
        const cleanDesc = d => clean(d).split(/\s*(?:Springe direkt zu|Technische Details|Weitere Varianten|Umrechnungsfaktoren|Verwandte Artikel|Zur Wunschliste|Dokumente\b|URP\b|Artikel noch nicht)/)[0].replace(/^.*?Alle auswählen\s*/i, '').trim().slice(0, 220);
        const priceOf = t => { const m = t.match(/URP\s*([\d'’]+[.,]\d{2}|[\d'’]+\.—)\s*CHF/) || t.match(/([\d'’]+[.,]\d{2})\s*CHF/); return m ? parseFloat(String(m[1]).replace(/['’]/g, '').replace('.—', '').replace(',', '.')) : null; };
        const variants = {};
        // Each variant's art-Nr sits in its own tight element; the colour + price live in a sibling.
        // For every same-base art-Nr element, walk UP to the smallest ancestor carrying a "CHF" price —
        // that ancestor is the variant tile ("... Finox Art-Nr. 6542 600.149.000 URP 68.50 CHF ...").
        document.querySelectorAll('*').forEach(e => {
            if (e.children.length > 3) return;
            const t = clean(e.innerText);
            const m = t.match(/^Art-Nr\.?\s*(\d{4}\s?\d{3}\.\d{3}\.\d{3})/) || (t.length < 40 && t.match(/(\d{4}\s?\d{3}\.\d{3}\.\d{3})/));
            if (!m) return;
            const artNr = m[1].replace(/\s+/g, ' ');
            if (artNr.replace(/[ .]/g, '').slice(0, 7) !== base) return;
            let node = e, tile = '';
            for (let up = 0; up < 6 && node; up++) { const tt = clean(node.innerText); if (/CHF/.test(tt) && tt.length < 320) { tile = tt; break; } node = node.parentElement; }
            let desc = '', price = null;
            if (tile) {
                price = priceOf(tile);
                const ai = tile.indexOf('Art-Nr');
                desc = cleanDesc(ai > 0 ? tile.slice(0, ai) : tile);
            }
            const prev = variants[artNr];
            if (!prev || (desc && desc.length > (prev.desc || '').length) || (price != null && prev.price == null)) {
                variants[artNr] = { desc: desc || (prev && prev.desc) || '', price: price != null ? price : (prev ? prev.price : null) };
            }
        });
        // Safety net: every same-base art-Nr in the page text must be present (art-Nr is the key data).
        (document.body.innerText.match(/\d{4}\s?\d{3}\.\d{3}\.\d{3}/g) || []).forEach(a => {
            const artNr = a.replace(/\s+/g, ' ');
            if (artNr.replace(/[ .]/g, '').slice(0, 7) === base && !variants[artNr]) variants[artNr] = { desc: '', price: null };
        });
        // Main product: header art-Nr + fullest description + header price.
        const body = document.body.innerText;
        const aM = body.match(/Art-Nr\.?\s*(\d{4}\s?\d{3}\.\d{3}\.\d{3})/);
        const mainArt = aM ? aM[1].replace(/\s+/g, ' ') : null;
        let mainDesc = '';
        const h1 = document.querySelector('h1');
        if (h1) mainDesc = cleanDesc(h1.innerText);
        if (!mainDesc) {
            const cand = Array.from(document.querySelectorAll('p, li, .product-description, [class*="description"]'))
                .map(e => cleanDesc(e.innerText)).filter(s => s.length > 15 && s.length < 300 && !/Springe direkt|Technische Details/.test(s));
            if (cand.length) mainDesc = cand.sort((a, b) => b.length - a.length)[0];
        }
        if (mainArt && variants[mainArt]) {
            // the main tile's desc is the page header (chrome-heavy) — prefer the clean h1 title
            if (!variants[mainArt].desc || /Springe direkt|Technische Details|URP/.test(variants[mainArt].desc)) variants[mainArt].desc = mainDesc || cleanDesc(variants[mainArt].desc);
            if (variants[mainArt].price == null) variants[mainArt].price = priceOf(body.slice(0, 600));
            variants[mainArt].main = true;
        }
        return { variants, mainArt, mainDesc };
    }, baseDigits);

    return { status: 'done', mainArt: harvest.mainArt, mainDesc: harvest.mainDesc, variants: harvest.variants };
}

(async () => {
    const allBases = buildBases();
    const results = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, 'utf8')) : {};
    const ONLY = (process.env.ONLY_BASES || '').split(',').map(s => s.trim()).filter(Boolean);
    let todo = ONLY.length ? ONLY : allBases.filter(b => !results[b] || results[b].status === 'error' || results[b].v !== SCRAPE_VERSION);
    todo = todo.slice(0, MAX);
    console.log(`Armaturen (ch${CHAPTER}) bases: ${allBases.length} | already done: ${allBases.length - todo.length} | this run: ${todo.length} | agents: ${AGENTS}`);
    if (!todo.length) { console.log('Nothing to do.'); return; }

    let qi = 0;                                   // single-threaded => atomic hand-out
    const nextBase = () => (qi < todo.length ? todo[qi++] : null);
    let doneCount = 0, skuCount = 0; const t0 = Date.now();
    const save = () => fs.writeFileSync(OUT, JSON.stringify(results));   // sync => safe across workers

    async function worker(id) {
        let browser = null, page = null, sinceRestart = 0, localCount = 0;
        const xoff = 30 + id * 470, yoff = 30 + id * 40;
        const launch = async () => {
            if (browser) { try { await browser.close(); } catch (e) {} }
            browser = await puppeteer.launch({ headless: false, args: ['--window-size=900,1000', `--window-position=${xoff},${yoff}`, '--no-sandbox'], defaultViewport: null, protocolTimeout: 90000 });
            page = (await browser.pages())[0] || await browser.newPage();
            await page.goto('https://profishop.sanitastroesch.ch/', { waitUntil: 'networkidle2', timeout: 60000 });
            await sleep(rnd(2500, 3500));
            const ck = await page.evaluateHandle(() => Array.from(document.querySelectorAll('button,a')).find(b => /Hinweis schliessen|Alle zulassen/i.test(b.innerText || '')));
            if (ck && ck.asElement()) await moveClick(page, ck.asElement());
            await sleep(rnd(1200, 2000));
        };
        await sleep(id * rnd(3500, 6000));        // stagger so the 3 windows don't hit the site in lockstep
        await launch();
        while (true) {
            const base = nextBase();
            if (base == null) break;
            if (sinceRestart >= RESTART_EVERY) { console.log(`  [A${id}] ↻ recycling window…`); await launch(); sinceRestart = 0; }
            let rec;
            try { rec = await scrapeBase(page, base); }
            catch (e) {
                console.log(`  [A${id}] ! ${base} ${String(e).slice(0, 50)} — recycle + retry`);
                try { await launch(); sinceRestart = 0; } catch (e2) {}
                try { rec = await scrapeBase(page, base); } catch (e2) { rec = { status: 'error', error: String(e2).slice(0, 120), variants: {} }; }
            }
            rec.ts = Math.round((Date.now() - t0) / 1000); rec.v = SCRAPE_VERSION; rec.agent = id;
            results[base] = rec; save();
            doneCount++; localCount++; sinceRestart++;
            const nv = Object.keys(rec.variants || {}).length; skuCount += nv;
            const rate = (Date.now() - t0) / 1000 / doneCount;
            const eta = ((todo.length - doneCount) * rate / 60).toFixed(0);
            console.log(`[${doneCount}/${todo.length}] A${id} ${base} -> ${rec.status} (${nv} var) | ${rate.toFixed(1)}s/base | ${skuCount} SKUs | ETA ~${eta}m`);
            await sleep(rnd(2200, 4500));
            if (localCount % 7 === 0) { await page.goto('https://profishop.sanitastroesch.ch/', { waitUntil: 'networkidle2' }).catch(() => {}); await sleep(rnd(1500, 3000)); }
        }
        try { await browser.close(); } catch (e) {}
        console.log(`  [A${id}] finished — ${localCount} bases.`);
    }

    await Promise.all(Array.from({ length: AGENTS }, (_, i) => worker(i)));
    console.log(`\nDONE this run: ${doneCount} bases, ${skuCount} SKUs. Total in file: ${Object.keys(results).length} bases -> ${OUT}`);
    await sleep(1500);
})();
