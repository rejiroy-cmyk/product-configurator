/**
 * clean_bathtub_labels.cjs
 * ---------------------------------------------------------------
 * Cleans the stray pricing/legal text appended to Schmidlin
 * Badewanne labels in custom-data.json. Trims anything after
 * the first occurrence of "Preisübersicht" or "Weiss " followed
 * by a long run of non-product text.
 * ---------------------------------------------------------------
 * Run: node scratch/clean_bathtub_labels.cjs
 */

const fs = require('fs');
const path = require('path');

const dataPath = path.resolve(__dirname, '../custom-data.json');
const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

if (!data.badewanne || !Array.isArray(data.badewanne.trays)) {
    console.log('No badewanne.trays found.');
    process.exit(0);
}

let fixed = 0;

data.badewanne.trays.forEach(tray => {
    const original = tray.label || '';

    // Cut off at the start of stray pricing/legal boilerplate
    // Patterns seen: "Preisübersicht", "Preisänderung", "Unverbindliche Richtpreise"
    const cutMarkers = [
        ' Preisübersicht',
        ' Preisänderung',
        ' Unverbindliche Richtpreise',
        ' Total',      // e.g. "Total461'621.00"
    ];

    let cleaned = original;
    for (const marker of cutMarkers) {
        const idx = cleaned.indexOf(marker);
        if (idx !== -1) {
            cleaned = cleaned.slice(0, idx).trim();
        }
    }

    if (cleaned !== original) {
        console.log(`\nFixed [${tray.artNr}]:`);
        console.log(`  Before: ${original.slice(0, 120)}...`);
        console.log(`  After:  ${cleaned}`);
        tray.label = cleaned;
        fixed++;
    }
});

if (fixed === 0) {
    console.log('All labels already clean. Nothing to do.');
} else {
    fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
    console.log(`\n✅ Cleaned ${fixed} label(s) in badewanne.trays.`);
}
