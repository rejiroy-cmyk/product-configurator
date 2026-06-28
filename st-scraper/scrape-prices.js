// Resumable, human-paced price scraper for profishop.sanitastroesch.ch
// One visit per BASE article number -> harvests the whole "Weitere Varianten" colour/finish
// matrix (full art-Nr + ‹without taxes› URP price). Saves after every base; rerun to resume.
// Usage: node scrape-prices.js [maxBasesThisRun]
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());
const fs = require('fs');
const path = require('path');

const DATA = path.resolve(__dirname, '../custom-data.json');
const PRICES = path.resolve(__dirname, '../../..'); // unused
const CATALOG_PRICES = '/Users/jenistonsellathamby/Downloads/sanitas_prices_2026.6.json';
const OUT = path.resolve(__dirname, 'sanitas-scraped.json');
const MAX = parseInt(process.argv[2] || '999999', 10);

const rnd = (a, b) => a + Math.random() * (b - a);
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const fmtArt = (digits) => `${digits.slice(0, 4)} ${digits.slice(4, 7)}.${digits.slice(7, 10)}.${digits.slice(10, 13)}`;

async function moveClick(page, el) {
    const b = await el.boundingBox(); if (!b) { await el.click(); return; }
    await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: Math.round(rnd(8, 16)) });
    await sleep(rnd(180, 480)); await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2);
}
async function scroll(page, n) { for (let i = 0; i < n; i++) { await page.mouse.wheel({ deltaY: rnd(280, 520) }); await sleep(rnd(300, 650)); } }

// ---- build the base worklist (distinct configurator bases, gaps-first) ----
function buildBases() {
    const data = JSON.parse(fs.readFileSync(DATA, 'utf8'));
    const artRe = /\b(\d{4}) (\d{3})\.\d{3}\.\d{3}\b/;
    const bases = new Set();
    (function walk(o) {
        if (Array.isArray(o)) return o.forEach(walk);
        if (o && typeof o === 'object') {
            const a = o.artNr;
            if (typeof a === 'string') { const m = a.match(artRe); if (m) bases.add(m[1] + m[2]); }
            for (const k in o) walk(o[k]);
        }
    })(data);
    let priced = new Set();
    try {
        const pj = JSON.parse(fs.readFileSync(CATALOG_PRICES, 'utf8')).prices || {};
        priced = new Set(Object.keys(pj).map(a => a.slice(0, 4) + a.slice(5, 8)));
    } catch (e) {}
    // gaps-first: bases NOT already priced by the catalog come first
    return [...bases].sort((x, y) => (priced.has(x) - priced.has(y)) || x.localeCompare(y));
}

async function scrapeBase(page, baseDigits) {
    const q = baseDigits;                 // 7-digit base, no space
    // type into search bar like a human
    const input = await page.$('input[name="q"]');
    await moveClick(page, input);
    await page.evaluate(() => { const i = document.querySelector('input[name="q"]'); if (i) i.value = ''; });
    await page.type('input[name="q"]', q, { delay: rnd(80, 170) });
    await sleep(rnd(500, 1100));
    await page.keyboard.press('Enter');
    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 }).catch(() => {});
    await sleep(rnd(1500, 2600));
    if (/Keine Ergebnisse|0 Suchergebnisse/i.test(await page.evaluate(() => document.body.innerText.slice(0, 400))))
        return { status: 'notfound', variants: [] };
    await scroll(page, 2);
    const link = await page.evaluateHandle(() => Array.from(document.querySelectorAll('a')).find(a => a.href && a.href.includes('/business/article-')));
    if (!link || !link.asElement()) return { status: 'notfound', variants: [] };
    await moveClick(page, link.asElement());
    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 }).catch(() => {});
    await sleep(rnd(1800, 2800));
    // click "Weitere Varianten" tab if present
    const tab = await page.evaluateHandle(() => Array.from(document.querySelectorAll('a,button,li,span,div'))
        .find(e => /^\s*Weitere Varianten\s*$/i.test(e.innerText || '') && (e.innerText || '').length < 25));
    if (tab && tab.asElement()) { await moveClick(page, tab.asElement()); await sleep(rnd(1400, 2400)); }
    await scroll(page, 3);
    // harvest every variant row (full art-Nr + URP price) belonging to this base
    const variants = await page.evaluate((base) => {
        const seen = {}, rows = [];
        const re = /Art-Nr\.\s*(\d{4}\s?\d{3}\.\d{3}\.\d{3})[\s\S]{0,90}?URP\s*([\d'’.]+)\s*CHF/;
        document.querySelectorAll('*').forEach(e => {
            if (e.children.length > 6) return;
            const t = (e.innerText || '').replace(/\s+/g, ' ').trim();
            if (t.length > 260) return;
            const m = t.match(re);
            if (!m) return;
            const artNr = m[1].replace(/\s+/g, ' ');
            if (artNr.replace(/[ .]/g, '').slice(0, 7) !== base) return;     // same base only
            if (seen[artNr]) return; seen[artNr] = 1;
            const price = parseFloat(m[2].replace(/['’]/g, ''));
            const desc = t.slice(0, t.indexOf('Art-Nr.')).trim().slice(0, 160);
            rows.push({ artNr, price, desc });
        });
        // also the main landed variant (URL + first URP)
        const url = location.href.match(/(\d{13})$/);
        const mainP = (document.body.innerText.match(/URP\s*([\d'’.]+)\s*CHF/) || [])[1];
        return { rows, mainDigits: url ? url[1] : null, mainPrice: mainP ? parseFloat(mainP.replace(/['’]/g, '')) : null };
    }, baseDigits);
    const out = {};
    if (variants.mainDigits && variants.mainDigits.slice(0, 7) === baseDigits && variants.mainPrice)
        out[fmtArt(variants.mainDigits)] = variants.mainPrice;
    for (const r of variants.rows) out[r.artNr] = r.price;
    return { status: 'done', variants: out };
}

(async () => {
    const bases = buildBases();
    const results = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, 'utf8')) : {};
    const todo = bases.filter(b => !results[b] || results[b].status === 'error');
    console.log(`Total bases: ${bases.length} | already done: ${bases.length - todo.length} | this run cap: ${Math.min(MAX, todo.length)}`);

    const RESTART_EVERY = 100;   // recycle the browser to avoid long-session memory degradation
    let browser = null, page = null;
    const launch = async () => {
        if (browser) { try { await browser.close(); } catch (e) {} }
        browser = await puppeteer.launch({
            headless: false, args: ['--window-size=1450,1020', '--no-sandbox'],
            defaultViewport: null, protocolTimeout: 90000,
        });
        page = await browser.newPage();
        await page.goto('https://profishop.sanitastroesch.ch/', { waitUntil: 'networkidle2', timeout: 60000 });
        await sleep(rnd(2500, 3500));
        const ck = await page.evaluateHandle(() => Array.from(document.querySelectorAll('button,a')).find(b => /Hinweis schliessen|Alle zulassen/i.test(b.innerText || '')));
        if (ck && ck.asElement()) await moveClick(page, ck.asElement());
        await sleep(rnd(1200, 2000));
    };
    await launch();

    let done = 0, t0 = Date.now(), skus = 0, sinceRestart = 0;
    for (const base of todo) {
        if (done >= MAX) break;
        if (sinceRestart >= RESTART_EVERY) { console.log('  ↻ recycling browser (fresh session)…'); await launch(); sinceRestart = 0; }
        let rec;
        try {
            rec = await scrapeBase(page, base);
        } catch (e) {
            console.log(`  ! ${base} ${String(e).slice(0, 55)} — recycling + retry once`);
            try { await launch(); sinceRestart = 0; } catch (e2) {}
            try { rec = await scrapeBase(page, base); }
            catch (e2) { rec = { status: 'error', error: String(e2).slice(0, 120), variants: {} }; }
        }
        rec.ts = Math.round((Date.now() - t0) / 1000);
        results[base] = rec;
        fs.writeFileSync(OUT, JSON.stringify(results));   // save after EVERY base (resumable)
        done++; sinceRestart++; skus += Object.keys(rec.variants || {}).length;
        const rate = (Date.now() - t0) / 1000 / done;
        console.log(`[${done}/${Math.min(MAX, todo.length)}] ${base} -> ${rec.status} (${Object.keys(rec.variants || {}).length} SKUs) | avg ${rate.toFixed(1)}s/base | ${skus} SKUs total`);
        // human-like gap between products, occasionally return home
        await sleep(rnd(2200, 4500));
        if (done % 7 === 0) { await page.goto('https://profishop.sanitastroesch.ch/', { waitUntil: 'networkidle2' }).catch(() => {}); await sleep(rnd(1500, 3000)); }
    }
    console.log(`\nDONE this run: ${done} bases, ${skus} SKUs. Total in file: ${Object.keys(results).length} bases.`);
    await sleep(rnd(2000, 4000));
    try { await browser.close(); } catch (e) {}
})();
