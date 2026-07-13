// Apply heal-pool-images-results.json to custom-data.json:
//  1. overwrite each zubehoer_pool tray's imgUrl with the REAL profishop image (result.image)
//  2. extract the mounting materials from additionalMaterials into a report (heal-mounting-materials.json)
// Usage:  node apply-heal-images.js          # DRY (counts + samples)
//         node apply-heal-images.js --apply   # write custom-data.json (minified) + the report
const fs = require('fs');
const path = require('path');
const APPLY = process.argv.includes('--apply');
const DATA = path.resolve(__dirname, '../custom-data.json');
const RES = path.resolve(__dirname, 'heal-pool-images-results.json');
const REPORT = path.resolve(__dirname, 'heal-mounting-materials.json');

// mounting-material keywords (the "necessary mounting materials" — not general Zubehör/Ersatzteile)
const MOUNT_RE = /Befestigungs|Montageplatte|Montageset|Montagematerial|Montageschiene|Schraube|Dübel|Duebel|Wandanker|Wandflansch|Wandhalter|Wandbefestigung|Konsole|Traverse|Grundplatte|Trägerplatte|Klebeset|Einbaurahmen|Einbaukörper|Einbauset|Nivodübel|Wannenanker/i;

const data = JSON.parse(fs.readFileSync(DATA, 'utf8'));
const results = JSON.parse(fs.readFileSync(RES, 'utf8'));
const trays = data.zubehoer_pool.trays;

let imgUpdated = 0, imgSame = 0, imgNoData = 0;
for (const t of trays) {
    if (!t || !t.artNr) continue;
    const r = results[t.artNr];
    const img = r && r.image;
    if (!img) { imgNoData++; continue; }
    if (t.imgUrl === img) { imgSame++; continue; }
    if (APPLY) t.imgUrl = img;
    imgUpdated++;
}

// mounting-materials mapping: product artNr -> [{artNr,label}] (deduped)
const mounting = {}; let mountLinks = 0; const mountArts = new Set();
for (const [artNr, r] of Object.entries(results)) {
    const mats = [];
    for (const g of (r.additionalMaterials || []))
        for (const a of (g.articles || []))
            if (a.artNr && MOUNT_RE.test(a.label || '')) { mats.push({ artNr: a.artNr, label: a.label, section: g.label }); mountArts.add(a.artNr); }
    if (mats.length) { mounting[artNr] = mats; mountLinks += mats.length; }
}

console.log(`=== apply-heal-images ${APPLY ? '(APPLY)' : '(DRY)'} ===`);
console.log(`pool trays: ${trays.length}`);
console.log(`imgUrl: updated ${imgUpdated} | already-correct ${imgSame} | no-API-image ${imgNoData}`);
console.log(`mounting materials: ${Object.keys(mounting).length} products carry them | ${mountLinks} links | ${mountArts.size} distinct mounting art-Nrs`);
const ex = Object.entries(mounting).slice(0, 4);
console.log('samples:');
for (const [art, mats] of ex) console.log(`  ${art} -> ${mats.map(m => m.artNr + ' «' + m.label.slice(0, 32) + '»').join(' | ')}`);

if (APPLY) {
    fs.writeFileSync(DATA, JSON.stringify(data));
    fs.writeFileSync(REPORT, JSON.stringify(mounting, null, 1));
    console.log(`\nWROTE custom-data.json (${imgUpdated} imgUrls) + heal-mounting-materials.json (${Object.keys(mounting).length} products).`);
} else {
    console.log('\nDRY — nothing written. Re-run with --apply.');
}
