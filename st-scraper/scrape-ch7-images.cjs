/**
 * scrape-ch7-images.cjs — harvest product image URLs for the Ch7 gap articles.
 *
 * The variant scraper (scrape-armaturen-variants.js) returns art-Nr + description +
 * price but not the image, and api-heal-images.cjs needs an authenticated session.
 * This visits the same PUBLIC product page anonymously and reads the image out of the DOM.
 *
 * The URL is taken from the page, never constructed: guessing multimedia paths is what
 * produced the 404 storm that retired getSanitasImgUrl (see CLAUDE.md / image notes).
 * Distinguishes PG1 (real product shot) from PS1 (per-article drawing) so the injector
 * can prefer the former, and skips obvious sprites/logos.
 *
 * Not Ch7-only despite the name — OUT= points it at another chapter's file rather
 * than forking the script. Every image filter in this toolkit that WAS forked drifted
 * (see _imagePick.cjs); keep this one copy.
 *
 * Usage: BASES=7311101,7311130 node scrape-ch7-images.cjs
 *        BASES=… OUT=ch2-gap-images.json node scrape-ch7-images.cjs
 * Output: st-scraper/<OUT>  { "<base>": {url, kind, all:[{art,url,kind}]} | null }
 *   `all` carries every per-SKU image the page showed, so one visit can cover a
 *   base's colour variants instead of one visit per SKU.
 */
'use strict';
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());
const fs = require('fs');
const path = require('path');

const OUT = path.join(__dirname, process.env.OUT || 'ch7-gap-images.json');
const BASES = (process.env.BASES || '').split(',').map(s => s.trim()).filter(Boolean);
if (!BASES.length) { console.error('set BASES=<comma-separated 7-digit bases>'); process.exit(1); }

const rnd = (a, b) => a + Math.random() * (b - a);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const out = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, 'utf8')) : {};

(async () => {
    const browser = await puppeteer.launch({ headless: false, args: ['--window-size=900,1000', '--no-sandbox'], defaultViewport: null, protocolTimeout: 90000 });
    const page = (await browser.pages())[0] || await browser.newPage();
    await page.goto('https://profishop.sanitastroesch.ch/', { waitUntil: 'networkidle2', timeout: 60000 });
    await sleep(rnd(2500, 3500));
    const ck = await page.evaluateHandle(() => Array.from(document.querySelectorAll('button,a')).find(b => /Hinweis schliessen|Alle zulassen/i.test(b.innerText || '')));
    if (ck && ck.asElement()) { await ck.asElement().click(); await sleep(rnd(1200, 2000)); }

    let done = 0;
    for (const base of BASES) {
        if (out[base]) { done++; continue; }
        try {
            await page.goto(`https://profishop.sanitastroesch.ch/business/search?q=${base}`, { waitUntil: 'networkidle2', timeout: 30000 });
            await sleep(rnd(1400, 2400));
            const href = await page.evaluate(() => {
                const a = Array.from(document.querySelectorAll('a')).find(a => a.href && a.href.includes('/business/article-'));
                return a ? a.href : null;
            });
            if (!href) { out[base] = null; console.log(`${base} ❌ no product page`); done++; continue; }
            await page.goto(href, { waitUntil: 'networkidle2', timeout: 30000 });
            await sleep(rnd(1600, 2600));
            const hit = await page.evaluate(b => {
                const imgs = Array.from(document.querySelectorAll('img'))
                    .map(i => i.currentSrc || i.src || '')
                    .filter(u => /multimedia/i.test(u) && !/logo|sprite|icon|placeholder/i.test(u));
                const abs = u => (u.startsWith('http') ? u : 'https://profishop.sanitastroesch.ch' + u);
                const kindOf = u => (/\/PG1\//i.test(u) ? 'PG1' : (/\/PS1\//i.test(u) ? 'PS1' : 'other'));
                // Prefer an image whose filename carries this base, then any PG1, then any.
                const mine = imgs.filter(u => u.replace(/[^0-9]/g, '').includes(b));
                const pick = mine.find(u => /\/PG1\//i.test(u)) || mine[0]
                    || imgs.find(u => /\/PG1\//i.test(u)) || imgs[0];
                if (!pick) return null;
                // Every per-SKU image the page showed. The variant matrix renders one
                // thumbnail per finish, so a single visit can cover the whole base
                // instead of one page load per colour. Keyed by the 13-digit art-Nr
                // read out of the FILENAME — never constructed.
                const all = [];
                const seen = new Set();
                for (const u of mine) {
                    const m = /(\d{8})_(\d{3})_(\d{3})/.exec(u.split('/').pop() || '');
                    if (!m) continue;
                    const art = `${m[1].slice(1, 5)} ${m[1].slice(5)}.${m[2]}.${m[3]}`;
                    const key = art + '|' + kindOf(u);
                    if (seen.has(key)) continue;
                    seen.add(key);
                    all.push({ art, url: abs(u), kind: kindOf(u) });
                }
                return { url: abs(pick), kind: kindOf(pick), all };
            }, base);
            out[base] = hit;
            console.log(`${base} ${hit ? '✅ ' + hit.kind + ' ' + hit.url.slice(-46) : '❌ no image on page'}`);
        } catch (e) {
            out[base] = null;
            console.log(`${base} ❌ ${String(e).slice(0, 60)}`);
        }
        fs.writeFileSync(OUT, JSON.stringify(out, null, 2));
        done++;
        await sleep(rnd(2200, 4200));
    }
    await browser.close();
    const ok = Object.values(out).filter(Boolean).length;
    console.log(`\nDONE ${done} bases | with image ${ok} | → ${OUT}`);
})();
