// Build ../prices.json = catalog price table ∪ scraped prices (scraper wins on conflict).
// Re-run anytime (e.g. after the scrape progresses / a new catalog release).
const fs = require('fs');
const path = require('path');

const CATALOG = '/Users/jenistonsellathamby/Downloads/sanitas_prices_2026.6.json';
const SCRAPED = path.resolve(__dirname, 'sanitas-scraped.json');
const OUT = path.resolve(__dirname, '../prices.json');

const prices = {};
let nCat = 0, nScr = 0;

// 1) catalog (baseline)
try {
    const cat = JSON.parse(fs.readFileSync(CATALOG, 'utf8')).prices || {};
    for (const [a, p] of Object.entries(cat)) { prices[a] = p; nCat++; }
} catch (e) { console.log('no catalog price file:', e.message); }

// 2) scraped (authoritative — overwrites)
try {
    const scr = JSON.parse(fs.readFileSync(SCRAPED, 'utf8'));
    for (const base of Object.keys(scr)) {
        const v = scr[base] && scr[base].variants;
        if (!v) continue;
        for (const [a, p] of Object.entries(v)) { prices[a] = p; nScr++; }
    }
} catch (e) { console.log('no scraped file yet:', e.message); }

const out = {
    meta: {
        source: 'Sanitas Troesch 2026.6 — catalog ∪ scrape',
        priceBasis: 'ohne MwSt (exkl. MWSt) — ‹without taxes›',
        entries: Object.keys(prices).length,
        fromCatalog: nCat, fromScrape: nScr,
    },
    prices,
};
fs.writeFileSync(OUT, JSON.stringify(out));
console.log(`prices.json written: ${out.meta.entries} entries (catalog ${nCat}, scrape overrides ${nScr}) -> ${OUT}`);
