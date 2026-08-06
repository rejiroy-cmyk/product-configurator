// Inject Hochschrank + Seitenschrank (Ch2/Ch3 furniture) into zubehoer_pool for the new MM
// "Schränke" toggle. Data: catalogue-inspection/schraenke-skus.json (from Ch2/Ch3 scrapes) +
// schraenke-images.json (API-healed real images). Tags productType + targetSubcats:['mixandmatch'].
// Usage: node inject-schraenke.js [--apply]
const fs = require('fs'); const path = require('path');
const APPLY = process.argv.includes('--apply');
const DATA = path.resolve(__dirname, '../custom-data.json');
const PRICES = path.resolve(__dirname, '../prices.json');
const SKUS = path.resolve(__dirname, 'catalogue-inspection/schraenke-skus.json');
const IMGS = path.resolve(__dirname, 'catalogue-inspection/schraenke-images.json');

const getSanitasImgUrl = (artNr) => {
    const c = String(artNr).replace(/[^0-9.]/g, ''); if (!c) return '';
    const p = c.split('.'); let p1 = p[0]; if (p1.length === 7) p1 = '0' + p1;
    return p.length >= 3 ? `https://profishop.sanitastroesch.ch/multimedia/Web/PG1/${p1}_${p[1]}_${p[2]}.png`
        : `https://profishop.sanitastroesch.ch/multimedia/Web/PG1/${p1}.png`;
};
const BRANDS = ['Alterna', 'Keramag', 'Geberit', 'Laufen', 'Duravit', 'KWC', 'Emco', 'Keuco', 'Schmidlin', 'Kaldewei', 'Talsee', 'Sanitas Troesch'];
const brandOf = (t) => BRANDS.find(b => t.includes(b)) || 'Andere';
const sizeOf = (t) => { const m = t.match(/Breite\s*[\d.,]+\s*cm/) || t.match(/[\d.,]+\s*x\s*[\d.,]+\s*cm/) || t.match(/[\d.,]+\s*cm/); return m ? m[0].replace(/Breite\s*/, '').trim() : 'Standard'; };

const data = JSON.parse(fs.readFileSync(DATA, 'utf8'));
const pricesFile = JSON.parse(fs.readFileSync(PRICES, 'utf8')); const prices = pricesFile.prices;
const skus = JSON.parse(fs.readFileSync(SKUS, 'utf8'));
const images = JSON.parse(fs.readFileSync(IMGS, 'utf8'));
const pool = data.zubehoer_pool;
const existing = new Set(pool.trays.map(t => t && t.artNr).filter(Boolean));

const newTrays = []; let pricesAdded = 0, dup = 0; const byType = {};
for (const s of skus) {
    byType[s.productType] = (byType[s.productType] || 0) + 1;
    if (existing.has(s.artNr)) { dup++; continue; }
    existing.add(s.artNr);
    newTrays.push({
        id: 'schr_' + s.artNr.replace(/[^0-9]/g, ''),
        manufacturer: brandOf(s.label), form: 'Standard', size: sizeOf(s.label),
        artNr: s.artNr, label: s.label, description: s.label, menge: 1,
        imgUrl: images[s.artNr] || getSanitasImgUrl(s.artNr),
        productType: s.productType, targetSubcats: ['mixandmatch'],
    });
    if (s.price != null && prices[s.artNr] == null) { if (APPLY) prices[s.artNr] = s.price; pricesAdded++; }
}

console.log(`=== inject-schraenke ${APPLY ? '(APPLY)' : '(DRY)'} ===`);
console.log('SKUs by type:', byType);
console.log(`new trays: ${newTrays.length} | dup skipped: ${dup} | prices to add: ${pricesAdded}`);
console.log(`pool.trays: ${pool.trays.length} -> ${pool.trays.length + newTrays.length}`);
console.log('sample:', JSON.stringify(newTrays[0]));

if (APPLY) {
    pool.trays.push(...newTrays);
    pricesFile.meta.entries = Object.keys(prices).length;
    fs.writeFileSync(DATA, JSON.stringify(data));
    fs.writeFileSync(PRICES, JSON.stringify(pricesFile));
    console.log(`\nWROTE custom-data.json (+${newTrays.length} trays) + prices.json.`);
} else console.log('\nDRY — re-run with --apply.');
