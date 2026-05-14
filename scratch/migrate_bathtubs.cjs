/**
 * migrate_bathtubs.cjs
 * ---------------------------------------------------------------
 * Finds Schmidlin Badewanne entries incorrectly stored under the
 * 'waschtischmischer' key in custom-data.json and moves them to
 * the 'badewanne' key. Purely surgical — touches nothing else.
 * ---------------------------------------------------------------
 * Run: node scratch/migrate_bathtubs.cjs
 */

const fs = require('fs');
const path = require('path');

const dataPath = path.resolve(__dirname, '../custom-data.json');
const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

// Ensure source exists
if (!data.waschtischmischer || !Array.isArray(data.waschtischmischer.trays)) {
    console.log('No waschtischmischer.trays found. Nothing to migrate.');
    process.exit(0);
}

// Ensure destination exists
if (!data.badewanne) {
    data.badewanne = { trays: [] };
}
if (!Array.isArray(data.badewanne.trays)) {
    data.badewanne.trays = [];
}

// --- Identify misrouted bathtubs ---
// A product belongs in 'badewanne' if its label contains 'badewanne' (case-insensitive)
const isBathtub = (t) => (t.label || '').toLowerCase().includes('badewanne');

const toMove   = data.waschtischmischer.trays.filter(isBathtub);
const toKeep   = data.waschtischmischer.trays.filter(t => !isBathtub(t));

if (toMove.length === 0) {
    console.log('No Badewanne entries found in waschtischmischer. Nothing to migrate.');
    process.exit(0);
}

console.log(`\nFound ${toMove.length} Badewanne entry/entries to migrate:\n`);
toMove.forEach(t => console.log(`  [${t.artNr}]  ${t.label}`));

// --- Move ---
// Avoid duplicates: only add if artNr not already in badewanne
let added = 0;
toMove.forEach(tray => {
    const alreadyExists = data.badewanne.trays.some(b => b.artNr === tray.artNr);
    if (!alreadyExists) {
        data.badewanne.trays.push(tray);
        added++;
    } else {
        console.log(`  ⚠ Skipped duplicate: ${tray.artNr} already in badewanne`);
    }
});

// Remove them from waschtischmischer
data.waschtischmischer.trays = toKeep;

// --- Write back ---
fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));

console.log(`\n✅ Migration complete:`);
console.log(`   Moved to badewanne:         ${added}`);
console.log(`   Remaining in waschtischmischer: ${toKeep.length}`);
console.log(`   Total in badewanne now:        ${data.badewanne.trays.length}`);
