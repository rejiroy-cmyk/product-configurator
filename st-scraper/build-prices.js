// Build ../prices.json = catalog price table ∪ scraped prices (scraper wins on conflict).
// Re-run anytime (e.g. after the scrape progresses / a new catalog release).
const fs = require('fs');
const path = require('path');

const CATALOG = '/Users/jenistonsellathamby/Downloads/sanitas_prices_2026.6.json';
const SCRAPED = path.resolve(__dirname, 'sanitas-scraped.json');
const SERVICES = path.resolve(__dirname, 'service-prices.json');
const OUT = path.resolve(__dirname, '../prices.json');

const prices = {};
let nCat = 0, nScr = 0, nSvc = 0;

// 1) catalog (baseline)
try {
    const cat = JSON.parse(fs.readFileSync(CATALOG, 'utf8')).prices || {};
    for (const [a, p] of Object.entries(cat)) { prices[a] = p; nCat++; }
} catch (e) { console.log('no catalog price file:', e.message); }

// 2) scraped products (authoritative over catalog — overwrites)
try {
    const scr = JSON.parse(fs.readFileSync(SCRAPED, 'utf8'));
    for (const base of Object.keys(scr)) {
        const v = scr[base] && scr[base].variants;
        if (!v) continue;
        for (const [a, p] of Object.entries(v)) { prices[a] = p; nScr++; }
    }
} catch (e) { console.log('no scraped file yet:', e.message); }

// 3) service/installation charges (catalog service tables — base-only art-Nrs the
//    product scrape can't reach). Merged LAST = authoritative.
try {
    const svc = JSON.parse(fs.readFileSync(SERVICES, 'utf8'));
    for (const [a, p] of Object.entries(svc)) {
        if (a.startsWith('_') || typeof p !== 'number') continue;
        prices[a] = p; nSvc++;
    }
} catch (e) { console.log('no service-prices file:', e.message); }

const out = {
    meta: {
        source: 'Sanitas Troesch 2026.6 — catalog ∪ scrape',
        priceBasis: 'ohne MwSt (exkl. MWSt) — ‹without taxes›',
        entries: Object.keys(prices).length,
        fromCatalog: nCat, fromScrape: nScr, fromServices: nSvc,
    },
    prices,
};
fs.writeFileSync(OUT, JSON.stringify(out));
console.log(`prices.json written: ${out.meta.entries} entries (catalog ${nCat}, scrape overrides ${nScr}, services ${nSvc}) -> ${OUT}`);
