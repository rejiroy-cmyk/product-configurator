// Resumable, human-paced (headless=false) VARIANT + DESCRIPTION scraper for the
// "Dusche" category EXCEPT the Duschtrennwand sub-cat — i.e. Duschenwanne, Duschenrinne,
// Duschenmischer. One visit per BASE art-Nr -> harvests the whole "Weitere Varianten"
// matrix: every variant's full art-Nr + its descriptor + price, plus the base product's
// own description. Saves after every base; rerun to resume.
// Usage: node scrape-dusche-variants.js [maxBasesThisRun]
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());
const fs = require('fs');
const path = require('path');

const DATA = path.resolve(__dirname, '../custom-data.json');
const OUT = path.resolve(__dirname, 'dusche-variants-scraped.json');
const MAX = parseInt(process.argv[2] || '999999', 10);
const SCRAPE_VERSION = 1;
const CATEGORIES = ['duschenwanne', 'duschenrinne', 'duschenmischer']; // Dusche minus Duschtrennwand

const rnd = (a, b) => a + Math.random() * (b - a);
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function moveClick(page, el) {
    const b = await el.boundingBox(); if (!b) { await el.click(); return; }
    await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: Math.round(rnd(8, 16)) });
    await sleep(rnd(180, 480)); await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2);
}
async function scroll(page, n) { for (let i = 0; i < n; i++) { await page.mouse.wheel({ deltaY: rnd(280, 520) }); await sleep(rnd(300, 650)); } }

// ---- bases only from the three Dusche sub-categories ----
function buildBases() {
    const data = JSON.parse(fs.readFileSync(DATA, 'utf8'));
    const artRe = /\b(\d{4}) (\d{3})\.\d{3}\.\d{3}\b/;
    const bases = new Set();
    for (const cat of CATEGORIES) {
        const o = data[cat]; if (!o) continue;
        const rows = o.trays || o.parts || [];
        for (const t of rows) {
            if (!t) continue;
            for (const a of [t.artNr, ...((t.variants || []).map(v => v && v.artNr))]) {
                if (typeof a === 'string') { const m = a.match(artRe); if (m) bases.add(m[1] + m[2]); }
            }
        }
    }
    return [...bases].sort();
}

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
    const link = await page.evaluateHandle(() => Array.from(document.querySelectorAll('a')).find(a => a.href && a.href.includes('/business/article-')));
    if (!link || !link.asElement()) return { status: 'notfound', variants: {} };
    await moveClick(page, link.asElement());
    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 }).catch(() => {});
    await sleep(rnd(1800, 2800));
    const tab = await page.evaluateHandle(() => Array.from(document.querySelectorAll('a,button,li,span,div'))
        .find(e => /^\s*Weitere Varianten\s*$/i.test(e.innerText || '') && (e.innerText || '').length < 25));
    if (tab && tab.asElement()) { await moveClick(page, tab.asElement()); await sleep(rnd(1400, 2400)); }
    await scroll(page, 3);

    const harvest = await page.evaluate((base) => {
        const seen = {}, rows = [];
        const re = /Art-Nr\.\s*(\d{4}\s?\d{3}\.\d{3}\.\d{3})[\s\S]{0,120}?URP\s*([\d'’.]+)\s*CHF/;
        document.querySelectorAll('*').forEach(e => {
            if (e.children.length > 6) return;
            const t = (e.innerText || '').replace(/\s+/g, ' ').trim();
            if (t.length > 320) return;
            const m = t.match(re);
            if (!m) return;
            const artNr = m[1].replace(/\s+/g, ' ');
            if (artNr.replace(/[ .]/g, '').slice(0, 7) !== base) return;
            if (seen[artNr]) return; seen[artNr] = 1;
            const price = parseFloat(m[2].replace(/['’]/g, ''));
            let desc = t.slice(0, t.indexOf('Art-Nr.')).trim();
            desc = desc.replace(/^.*?Alle auswählen\s*/i, '').trim().slice(0, 220); // strip "Weitere Varianten … Alle auswählen" tab noise
            rows.push({ artNr, desc, price });
        });
        // base product: header art-Nr + price + the fullest description block on the page
        const body = document.body.innerText;
        const aM = body.match(/Art-Nr\.\s*(\d{4}\s?\d{3}\.\d{3}\.\d{3})/);
        const pM = body.match(/URP\s*([\d'’.]+)\s*CHF/);
        let mainDesc = '';
        const h1 = document.querySelector('h1');
        if (h1) mainDesc = (h1.innerText || '').replace(/\s+/g, ' ').trim();
        // grab a longer description paragraph if present (longest <p>/<div> under 400 chars near top)
        const cand = Array.from(document.querySelectorAll('p, li, .product-description, [class*="description"]'))
            .map(e => (e.innerText || '').replace(/\s+/g, ' ').trim())
            .filter(s => s.length > mainDesc.length && s.length < 400 && !/URP|CHF|Art-Nr/.test(s));
        if (cand.length) mainDesc = cand.sort((a, b) => b.length - a.length)[0];
        return { rows, mainArt: aM ? aM[1].replace(/\s+/g, ' ') : null, mainPrice: pM ? parseFloat(pM[1].replace(/['’]/g, '')) : null, mainDesc };
    }, baseDigits);

    const variants = {};
    for (const r of harvest.rows) variants[r.artNr] = { desc: r.desc, price: r.price };
    if (harvest.mainArt && harvest.mainArt.replace(/[ .]/g, '').slice(0, 7) === baseDigits && !variants[harvest.mainArt]) {
        variants[harvest.mainArt] = { desc: harvest.mainDesc || '', price: harvest.mainPrice, main: true };
    }
    return { status: 'done', mainArt: harvest.mainArt, mainDesc: harvest.mainDesc, variants };
}

(async () => {
    const bases = buildBases();
    const results = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, 'utf8')) : {};
    let todo = bases.filter(b => !results[b] || results[b].status === 'error' || results[b].v !== SCRAPE_VERSION);
    const ONLY = (process.env.ONLY_BASES || '').split(',').map(s => s.trim()).filter(Boolean);
    if (ONLY.length) todo = ONLY;
    console.log(`Dusche(-Duschtrennwand) bases: ${bases.length} | already done: ${bases.length - todo.length} | this run cap: ${Math.min(MAX, todo.length)}`);

    const RESTART_EVERY = 100;
    let browser = null, page = null;
    const launch = async () => {
        if (browser) { try { await browser.close(); } catch (e) {} }
        browser = await puppeteer.launch({ headless: false, args: ['--window-size=1450,1020', '--no-sandbox'], defaultViewport: null, protocolTimeout: 90000 });
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
        if (sinceRestart >= RESTART_EVERY) { console.log('  ↻ recycling browser…'); await launch(); sinceRestart = 0; }
        let rec;
        try { rec = await scrapeBase(page, base); }
        catch (e) {
            console.log(`  ! ${base} ${String(e).slice(0, 55)} — recycle + retry`);
            try { await launch(); sinceRestart = 0; } catch (e2) {}
            try { rec = await scrapeBase(page, base); } catch (e2) { rec = { status: 'error', error: String(e2).slice(0, 120), variants: {} }; }
        }
        rec.ts = Math.round((Date.now() - t0) / 1000); rec.v = SCRAPE_VERSION;
        results[base] = rec;
        fs.writeFileSync(OUT, JSON.stringify(results));
        done++; sinceRestart++; skus += Object.keys(rec.variants || {}).length;
        const rate = (Date.now() - t0) / 1000 / done;
        console.log(`[${done}/${Math.min(MAX, todo.length)}] ${base} -> ${rec.status} (${Object.keys(rec.variants || {}).length} variants) | avg ${rate.toFixed(1)}s/base | ${skus} total`);
        await sleep(rnd(2200, 4500));
        if (done % 7 === 0) { await page.goto('https://profishop.sanitastroesch.ch/', { waitUntil: 'networkidle2' }).catch(() => {}); await sleep(rnd(1500, 3000)); }
    }
    console.log(`\nDONE this run: ${done} bases, ${skus} variants. Total in file: ${Object.keys(results).length} bases.`);
    await sleep(rnd(2000, 4000));
    try { await browser.close(); } catch (e) {}
})();
