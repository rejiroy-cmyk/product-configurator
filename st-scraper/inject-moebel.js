// Inject the FULL Waschtischmöbel set (Ch2/Ch3) into zubehoer_pool for the MM Möbel toggle.
// Data: catalogue-inspection/moebel-skus.json + moebel-images.json (API-healed). Tags productType
// 'Waschtischmöbel' + targetSubcats:['mixandmatch']. RE-TAGS the ~179 old CSV Waschtischmöbel in place.
// Usage: node inject-moebel.js [--apply]
const fs = require('fs'); const path = require('path');
const APPLY = process.argv.includes('--apply');
const DATA = path.resolve(__dirname, '../custom-data.json');
const PRICES = path.resolve(__dirname, '../prices.json');
const SKUS = path.resolve(__dirname, 'catalogue-inspection/moebel-skus.json');
const IMGS = path.resolve(__dirname, 'catalogue-inspection/moebel-images.json');

const getSanitasImgUrl = (a) => { const c = String(a).replace(/[^0-9.]/g, ''); if (!c) return ''; const p = c.split('.'); let p1 = p[0]; if (p1.length === 7) p1 = '0' + p1; return p.length >= 3 ? `https://profishop.sanitastroesch.ch/multimedia/Web/PG1/${p1}_${p[1]}_${p[2]}.png` : `https://profishop.sanitastroesch.ch/multimedia/Web/PG1/${p1}.png`; };
const BRANDS = ['Alterna', 'Keramag', 'Geberit', 'Laufen', 'Duravit', 'KWC', 'Emco', 'Keuco', 'Schmidlin', 'Kaldewei', 'Talsee', 'Sanitas Troesch'];
const brandOf = (t) => BRANDS.find(b => t.includes(b)) || 'Andere';
const sizeOf = (t) => { const m = t.match(/Breite\s*[\d.,]+\s*cm/) || t.match(/[\d.,]+\s*x\s*[\d.,]+\s*cm/) || t.match(/[\d.,]+\s*cm/); return m ? m[0].replace(/Breite\s*/, '').trim() : 'Standard'; };

const data = JSON.parse(fs.readFileSync(DATA, 'utf8'));
const pricesFile = JSON.parse(fs.readFileSync(PRICES, 'utf8')); const prices = pricesFile.prices;
const skus = JSON.parse(fs.readFileSync(SKUS, 'utf8'));
const images = fs.existsSync(IMGS) ? JSON.parse(fs.readFileSync(IMGS, 'utf8')) : {};
const pool = data.zubehoer_pool;
const byArt = new Map(); pool.trays.forEach(t => { if (t && t.artNr) byArt.set(t.artNr, t); });

const newTrays = []; let pricesAdded = 0, retagged = 0, dup = 0;
for (const s of skus) {
    const ex = byArt.get(s.artNr);
    if (ex) {
        if (!ex.productType) {              // re-tag old CSV entry in place
            if (APPLY) {
                ex.productType = s.productType; ex.targetSubcats = ['mixandmatch'];
                if (images[s.artNr]) ex.imgUrl = images[s.artNr];
                if (!ex.manufacturer || ex.manufacturer === 'Andere') ex.manufacturer = brandOf(s.label);
            }
            retagged++;
        } else dup++;
        continue;
    }
    byArt.set(s.artNr, true);
    newTrays.push({
        id: 'moebel_' + s.artNr.replace(/[^0-9]/g, ''),
        manufacturer: brandOf(s.label), form: 'Standard', size: sizeOf(s.label),
        artNr: s.artNr, label: s.label, description: s.label, menge: 1,
        imgUrl: images[s.artNr] || getSanitasImgUrl(s.artNr),
        productType: s.productType, targetSubcats: ['mixandmatch'],
    });
    if (s.price != null && prices[s.artNr] == null) { if (APPLY) prices[s.artNr] = s.price; pricesAdded++; }
}

console.log(`=== inject-moebel ${APPLY ? '(APPLY)' : '(DRY)'} ===`);
console.log(`SKUs in file: ${skus.length}`);
console.log(`new trays: ${newTrays.length} | re-tagged CSV: ${retagged} | already-tagged dup: ${dup} | prices to add: ${pricesAdded}`);
console.log(`pool.trays: ${pool.trays.length} -> ${pool.trays.length + newTrays.length}`);
console.log('sample:', JSON.stringify(newTrays[0]));

if (APPLY) {
    pool.trays.push(...newTrays);
    pricesFile.meta.entries = Object.keys(prices).length;
    fs.writeFileSync(DATA, JSON.stringify(data));
    fs.writeFileSync(PRICES, JSON.stringify(pricesFile));
    console.log(`\nWROTE custom-data.json (+${newTrays.length} trays, ${retagged} retagged) + prices.json.`);
} else console.log('\nDRY — re-run with --apply.');
