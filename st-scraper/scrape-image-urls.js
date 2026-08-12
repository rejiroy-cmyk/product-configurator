/**
 * scrape-image-urls.js
 *
 * Human-like image URL scraper for products missing a distinctive imgUrl
 * (_nV placeholder or empty) in custom-data.json.
 *
 * Approach (mimics a real user):
 *   1. Each worker opens the profishop homepage.
 *   2. Types the artNr into the search box with realistic keystroke delays.
 *   3. Presses Enter and waits for the search results.
 *   4. Clicks the first product link to open the PDP.
 *   5. Scrolls the page so lazy-loaded images appear.
 *   6. Extracts the primary CDN image src.
 *   7. Falls back to the search-result card image if PDP yields nothing.
 *
 * Output : st-scraper/image-urls-scraped.json  →  { "<artNr>": "<url>" | null }
 * Resume : any artNr already in the output file is skipped on re-run.
 *
 * Usage:
 *   node scrape-image-urls.js          # all products that need scraping
 *   node scrape-image-urls.js 200      # cap to N products this run
 *
 * Workers: 5 parallel browser windows (headless = false).
 */

'use strict';

const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

const fs   = require('fs');
const path = require('path');

// Paths are always relative to THIS script, regardless of cwd
const SCRIPT_DIR = path.dirname(fs.realpathSync(__filename));
const DATA_PATH  = path.resolve(SCRIPT_DIR, '../custom-data.json');
const OUT_PATH   = path.resolve(SCRIPT_DIR, 'image-urls-scraped.json');

const ORIGIN  = 'https://profishop.sanitastroesch.ch';
const HOME    = `${ORIGIN}/business/`;
// 5 by default; override with WORKERS=n. Each worker is a visible Chrome window, so
// the ceiling is the machine and the vendor's tolerance, not the script.
const WORKERS = parseInt(process.env.WORKERS || '5', 10);
const MAX     = parseInt(process.argv[2] || '999999', 10);

// Placeholder signals — a URL containing any of these is NOT distinctive
const PLACEHOLDER = ['_nV', 'no-image', 'placeholder'];

// CDN paths that indicate a real product image
const CDN = ['/multimedia/Web/PG', '/multimedia/Web/PS', '/multimedia/Web/'];

// ─── UTILS ───────────────────────────────────────────────────────────────────
const rnd   = (a, b) => a + Math.random() * (b - a);
const sleep = ms => new Promise(r => setTimeout(r, ms));

// ONLY_EMPTY=1 targets ONLY slots with no image at all.
//
// Without it, `_nV` counts as a placeholder and ~5.2k records that already carry a
// working local drawing are re-targeted. That blocklist predates the finding recorded
// in CLAUDE.md: _nV is the per-article technical drawing profishop itself lists as the
// primary thumbnail — real in PG1, an 859-byte placeholder only in PS1. Re-scraping
// those is a legitimate UPGRADE (drawing -> photo) but it overwrites working images,
// so it is opt-out rather than the default.
const ONLY_EMPTY = process.env.ONLY_EMPTY === '1';
function isDistinctive(url) {
    if (!url || !url.trim()) return false;
    if (ONLY_EMPTY) return true;
    return !PLACEHOLDER.some(s => url.includes(s));
}

function isCdnImage(src) {
    return CDN.some(p => src.includes(p)) && !PLACEHOLDER.some(s => src.includes(s));
}

/** Simulate realistic mouse move then click on an element */
async function humanClick(page, el) {
    const box = await el.boundingBox();
    if (!box) { await el.click(); return; }
    await page.mouse.move(
        box.x + box.width / 2,
        box.y + box.height / 2,
        { steps: Math.round(rnd(8, 18)) }
    );
    await sleep(rnd(120, 380));
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
}

/** Human-like scroll to load lazy images */
async function humanScroll(page, steps = 4) {
    for (let i = 0; i < steps; i++) {
        await page.mouse.wheel({ deltaY: rnd(300, 600) });
        await sleep(rnd(250, 550));
    }
}

/** Clear + type into the search input */
async function typeIntoSearch(page, query) {
    // Wait for search input to be present
    await page.waitForSelector('input[name="q"]', { timeout: 15000 });
    const input = await page.$('input[name="q"]');
    if (!input) throw new Error('Search input not found');

    await humanClick(page, input);
    await sleep(rnd(200, 450));

    // Clear any existing value
    await page.evaluate(() => {
        const i = document.querySelector('input[name="q"]');
        if (i) { i.value = ''; i.dispatchEvent(new Event('input', { bubbles: true })); }
    });
    await sleep(rnd(100, 250));

    // Type character by character with human-like delays
    await page.type('input[name="q"]', query, { delay: rnd(70, 160) });
    await sleep(rnd(400, 900));
}

/** Extract the best CDN image from the current page */
async function extractImage(page) {
    return page.evaluate((cdnPaths, placeholders) => {
        // Priority 1 — main product hero / gallery image
        const heroSelectors = [
            '.product-detail-image img',
            '.product-image-gallery img',
            '.product-hero img',
            '.article-image img',
            '.main-image img',
            '[class*="product-image"] img',
            '[class*="productImage"] img',
            '[class*="gallery"] img',
        ];
        for (const sel of heroSelectors) {
            const el = document.querySelector(sel);
            if (el && el.src) {
                const ok  = cdnPaths.some(p => el.src.includes(p));
                const bad = placeholders.some(s => el.src.includes(s));
                if (ok && !bad) return el.src;
            }
        }

        // Priority 2 — product card images (search results)
        const cardSelectors = [
            '.product-tile img',
            '.product-list-item img',
            '.search-result img',
            '.product-card img',
            '[class*="product-tile"] img',
            '[class*="productTile"] img',
        ];
        for (const sel of cardSelectors) {
            const el = document.querySelector(sel);
            if (el && el.src) {
                const ok  = cdnPaths.some(p => el.src.includes(p));
                const bad = placeholders.some(s => el.src.includes(s));
                if (ok && !bad) return el.src;
            }
        }

        // Priority 3 — any CDN image anywhere on the page
        for (const img of Array.from(document.querySelectorAll('img'))) {
            if (!img.src) continue;
            const ok  = cdnPaths.some(p => img.src.includes(p));
            const bad = placeholders.some(s => img.src.includes(s));
            if (ok && !bad) return img.src;
        }

        return null;
    }, CDN, PLACEHOLDER);
}

// ─── COLLECT WORK LIST ────────────────────────────────────────────────────────
console.log('📂 DATA_PATH :', DATA_PATH);
console.log('📂 OUT_PATH  :', OUT_PATH);

if (!fs.existsSync(DATA_PATH)) {
    console.error('❌ custom-data.json not found at', DATA_PATH);
    process.exit(1);
}

const data     = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
const existing = fs.existsSync(OUT_PATH) ? JSON.parse(fs.readFileSync(OUT_PATH, 'utf8')) : {};
console.log('📂 Output file exists?', fs.existsSync(OUT_PATH), '| Already resolved:', Object.keys(existing).length);

const todo = [];
const seenArt = new Set();
// Recursive walk: collect EVERY object with an artNr + non-distinctive imgUrl,
// including nested variants[] and mountingMaterials[].options[]. Deduped by artNr.
function collect(node, category) {
    if (Array.isArray(node)) { for (const el of node) collect(el, category); return; }
    if (!node || typeof node !== 'object') return;
    if (node.artNr && 'imgUrl' in node) {
        const art = node.artNr;
        // "ohne_wannentraeger" / "none" are opt-out sentinels, not articles. Searching
        // the shop for them returns nothing and burns a full search+PDP cycle — junk
        // traffic is exactly what tripped the shadow-ban before. A real art-Nr has
        // 10+ digits.
        const isSentinel = String(art).replace(/\D/g, '').length < 10;
        if (!isSentinel && !isDistinctive(node.imgUrl) && !(art in existing) && !seenArt.has(art)) {
            seenArt.add(art);
            todo.push({ artNr: art, category });
        }
    }
    for (const k of Object.keys(node)) collect(node[k], category);
}
for (const category of Object.keys(data)) collect(data[category], category);

const run = todo.slice(0, MAX);
console.log(`\n📋 Products needing image URL : ${todo.length}`);
console.log(`🚀 This run : ${run.length}  |  Workers : ${WORKERS}  |  headless : false\n`);

if (run.length === 0) {
    console.log('✅ Nothing to do — all products already have a distinctive imgUrl or were attempted.');
    process.exit(0);
}

// ─── SAVE ────────────────────────────────────────────────────────────────────
function save() {
    fs.writeFileSync(OUT_PATH, JSON.stringify(existing, null, 2));
}

// ─── WORKER ──────────────────────────────────────────────────────────────────
async function worker(id, queue) {
    // Stagger startup so windows don't all hit the site simultaneously
    await sleep(id * rnd(2500, 4500));

    const xOffset = 30 + ((id - 1) % 5) * 420;
    const yOffset = 30;

    let browser, page;

    async function launch() {
        if (browser) { try { await browser.close(); } catch (_) {} }
        browser = await puppeteer.launch({
            headless: false,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--window-size=400,900',
                `--window-position=${xOffset},${yOffset}`,
            ],
            defaultViewport: null,
            protocolTimeout: 90000,
        });
        page = (await browser.pages())[0] || await browser.newPage();

        // Navigate to homepage first (establishes session cookies)
        await page.goto(HOME, { waitUntil: 'networkidle2', timeout: 60000 });
        await sleep(rnd(2000, 3500));

        // Dismiss cookie/GDPR banner if present
        try {
            const banner = await page.evaluateHandle(() =>
                Array.from(document.querySelectorAll('button, a')).find(el =>
                    /Hinweis schliessen|Alle zulassen|Akzeptieren|Accept/i.test(el.innerText || '')
                )
            );
            if (banner && banner.asElement()) {
                await humanClick(page, banner.asElement());
                await sleep(rnd(800, 1500));
            }
        } catch (_) {}
    }

    await launch();

    let localDone = 0, localFound = 0, localFail = 0;
    // Recycle browser every 80 products to avoid memory build-up
    const RECYCLE_EVERY = 80;

    while (queue.index < queue.items.length) {
        const item = queue.items[queue.index++];
        if (!item) continue;

        const { artNr, category } = item;
        const totalDone = Object.keys(existing).length;
        console.log(`[W${id}] [${totalDone + 1}/${run.length}] ${category} | ${artNr}`);

        try {
            // ── Step 1: Type artNr into the search box ──────────────────────
            // Use only the digit-base for searching (more reliable than full artNr with dots)
            const digits = artNr.replace(/[^0-9]/g, '');
            const searchQuery = digits.length >= 7 ? digits.slice(0, 7) : artNr.trim();

            await typeIntoSearch(page, searchQuery);
            await page.keyboard.press('Enter');
            await page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 25000 }).catch(() => {});
            await sleep(rnd(1500, 2500));

            const searchUrl = page.url();
            const noResults = /Keine Ergebnisse|0 Suchergebnisse/i.test(
                await page.evaluate(() => document.body.innerText.slice(0, 500))
            );

            // ── Step 2: Try full artNr if 7-digit gave no results ──────────
            if (noResults && searchQuery !== artNr.trim()) {
                console.log(`   ↳ No results for base, trying full artNr…`);
                await typeIntoSearch(page, artNr.trim());
                await page.keyboard.press('Enter');
                await page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 25000 }).catch(() => {});
                await sleep(rnd(1200, 2000));
            }

            // ── Step 3: Grab image from search-result card (quick win) ──────
            await humanScroll(page, 2);
            let found = await extractImage(page);

            // ── Step 4: Click into the PDP for a higher-quality image ───────
            if (page.url().includes('/search') || page.url().includes('?q=')) {
                const href = await page.evaluate(() => {
                    const a = Array.from(document.querySelectorAll('a')).find(
                        el => el.href && el.href.includes('/business/article-')
                    );
                    return a ? a.href : null;
                });

                if (href) {
                    await page.goto(href, { waitUntil: 'domcontentloaded', timeout: 25000 }).catch(() => {});
                    await sleep(rnd(1500, 2500));
                    await humanScroll(page, 3);
                    await sleep(rnd(800, 1500));
                    const pdpImage = await extractImage(page);
                    if (pdpImage) found = pdpImage;
                }
            } else {
                // Search redirected straight to PDP
                await humanScroll(page, 3);
                await sleep(rnd(800, 1500));
                const pdpImage = await extractImage(page);
                if (pdpImage) found = pdpImage;
            }

            // ── Record result ───────────────────────────────────────────────
            existing[artNr] = found || null;
            localDone++;

            if (found) {
                localFound++;
                console.log(`   ✅ ${found.replace(ORIGIN, '').substring(0, 75)}`);
            } else {
                localFail++;
                console.log(`   ⚠️  No image found`);
            }

            // Save every 20 resolved items
            if (localDone % 20 === 0) save();

            // Recycle browser periodically
            if (localDone % RECYCLE_EVERY === 0) {
                console.log(`   [W${id}] ↻ Recycling browser (memory hygiene)…`);
                save();
                await launch();
            } else {
                // Return to homepage every 10 products for a fresh session feel
                if (localDone % 10 === 0) {
                    await page.goto(HOME, { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {});
                    await sleep(rnd(1200, 2500));
                }
            }

            await sleep(rnd(1800, 3500));

        } catch (err) {
            existing[artNr] = null;
            localFail++;
            localDone++;
            console.log(`   ❌ Error: ${String(err.message).split('\n')[0].slice(0, 100)}`);
            save();

            // Recover with a fresh browser session
            console.log(`   [W${id}] ↻ Recovering after error…`);
            try { await launch(); } catch (_) {}
        }
    }

    save();
    try { await browser.close(); } catch (_) {}
    console.log(`\n[W${id}] Finished — found: ${localFound}  |  not found: ${localFail}`);
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
(async () => {
    const queue = { items: run, index: 0 };
    const t0 = Date.now();

    await Promise.all(Array.from({ length: WORKERS }, (_, i) => worker(i + 1, queue)));
    save();

    const total    = Object.keys(existing).length;
    const resolved = Object.values(existing).filter(v => v !== null).length;
    const nulls    = total - resolved;
    const mins     = ((Date.now() - t0) / 60000).toFixed(1);

    console.log(`
════════════════════════════════════════
✅  scrape-image-urls.js  complete
   Runtime      : ${mins} min
   This run     : ${run.length} products
   Found URL    : ${resolved}
   No image     : ${nulls}
   Output       : ${OUT_PATH}
════════════════════════════════════════
`);
})();
