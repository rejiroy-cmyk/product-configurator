// One-off diagnostic: open an Armaturen product and dump how its variants/tabs are presented,
// so the harvest in scrape-armaturen-variants.js can be fixed. headless=true for speed.
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());
const sleep = ms => new Promise(r => setTimeout(r, ms));
const BASE = process.argv[2] || '6542600';

(async () => {
    const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'], defaultViewport: { width: 1400, height: 1000 } });
    const page = await browser.newPage();
    await page.goto('https://profishop.sanitastroesch.ch/', { waitUntil: 'networkidle2', timeout: 60000 });
    await sleep(2500);
    const ck = await page.evaluateHandle(() => Array.from(document.querySelectorAll('button,a')).find(b => /Hinweis schliessen|Alle zulassen/i.test(b.innerText || '')));
    if (ck && ck.asElement()) await ck.asElement().click();
    await sleep(1500);
    await page.type('input[name="q"]', BASE, { delay: 60 });
    await page.keyboard.press('Enter');
    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 }).catch(() => {});
    await sleep(2500);
    const link = await page.evaluateHandle(() => Array.from(document.querySelectorAll('a')).find(a => a.href && a.href.includes('/business/article-')));
    if (link && link.asElement()) { await link.asElement().click(); await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 }).catch(() => {}); }
    await sleep(2500);

    // click "Weitere Varianten" then scroll to load the matrix
    const tab = await page.evaluateHandle(() => Array.from(document.querySelectorAll('a,button,li,span,div'))
        .find(e => /^\s*Weitere Varianten\s*$/i.test(e.innerText || '') && (e.innerText || '').length < 25));
    if (tab && tab.asElement()) { await tab.asElement().click(); await sleep(2000); }
    for (let i = 0; i < 5; i++) { await page.mouse.wheel({ deltaY: 500 }); await sleep(500); }

    const diag = await page.evaluate((base) => {
        const clean = s => (s || '').replace(/\s+/g, ' ').trim();
        // For each same-base art-Nr element, walk UP to the smallest ancestor whose text carries a
        // price ("CHF") — that ancestor is the variant tile (colour + price + art-Nr).
        const tiles = {};
        document.querySelectorAll('*').forEach(e => {
            if (e.children.length > 3) return;
            const t = clean(e.innerText);
            const m = t.match(/^Art-Nr\.?\s*(\d{4}\s?\d{3}\.\d{3}\.\d{3})/) || (t.length < 40 && t.match(/(\d{4}\s?\d{3}\.\d{3}\.\d{3})/));
            if (!m) return;
            const art = m[1].replace(/\s+/g, ' ');
            if (art.replace(/[ .]/g, '').slice(0, 7) !== base) return;
            let node = e, tile = '';
            for (let up = 0; up < 6 && node; up++) { const tt = clean(node.innerText); if (/CHF/.test(tt) && tt.length < 300) { tile = tt; break; } node = node.parentElement; }
            if (!tiles[art] || (tile && tile.length > (tiles[art] || '').length)) tiles[art] = tile || tiles[art] || '';
        });
        const body = document.body.innerText;
        const allArts = [...new Set((body.match(/\d{4}\s?\d{3}\.\d{3}\.\d{3}/g) || []).map(a => a.replace(/\s+/g, ' ')))]
            .filter(a => a.replace(/[ .]/g, '').slice(0, 7) === base);
        return { sameBaseArtCount: allArts.length, tilesWithPrice: Object.values(tiles).filter(Boolean).length, sampleTiles: Object.entries(tiles).slice(0, 6).map(([a, t]) => a + '  ::  ' + (t || '(no CHF tile)').slice(0, 150)) };
    }, BASE);
    console.log(JSON.stringify(diag, null, 2));
    await browser.close();
})();
