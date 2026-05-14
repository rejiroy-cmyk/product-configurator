/**
 * revert_cloned_accessories.cjs
 * ---------------------------------------------------------------
 * Reverts the incorrectly cloned mountingMaterials on the 10 moved
 * Schmidlin Norm Classic "mit Loch" bathtubs back to empty [].
 * These will be properly auto-linked by the app's sync engine.
 * ---------------------------------------------------------------
 */
const fs = require('fs');
const path = require('path');

const dataPath = path.resolve(__dirname, '../custom-data.json');
const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

// Identify the 10 moved tubs by their artNr range (1111 25x / 26x)
const movedArtNrs = new Set([
    '1111 258.100.000',
    '1111 264.100.000',
    '1111 251.100.000',
    '1111 263.100.000',
    '1111 262.100.000',
    '1111 261.100.000',
    '1111 252.100.000',
    '1111 253.100.000',
    '1111 257.100.000',
    '1111 254.100.000',
]);

let fixed = 0;
data.badewanne.trays.forEach(t => {
    if (movedArtNrs.has(t.artNr)) {
        t.mountingMaterials = [];
        console.log(`  Reset [${t.artNr}]`);
        fixed++;
    }
});

fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
console.log(`\nReverted ${fixed} trays back to empty mountingMaterials [].`);
