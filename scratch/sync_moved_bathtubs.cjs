/**
 * sync_moved_bathtubs.cjs
 * ---------------------------------------------------------------
 * Runs autoLinkShowerAccessories on the 10 moved Schmidlin
 * bathtubs (those with mountingMaterials.length === 0) so they
 * get the same 8-slot accessory structure as every other bathtub.
 * ---------------------------------------------------------------
 * Run: node scratch/sync_moved_bathtubs.cjs
 */

const fs = require('fs');
const path = require('path');

const dataPath = path.resolve(__dirname, '../custom-data.json');
const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

if (!data.badewanne || !Array.isArray(data.badewanne.trays)) {
    console.log('No badewanne.trays found.'); process.exit(0);
}

// ---------------------------------------------------------------
// Grab all existing accessory templates from already-synced trays
// so we can clone the same structure for the 10 empty ones.
// We use the first tray that already has 8 mountingMaterials as
// the canonical template — its option pool definitions are reused.
// ---------------------------------------------------------------
const template = data.badewanne.trays.find(t =>
    Array.isArray(t.mountingMaterials) && t.mountingMaterials.length >= 7
);

if (!template) {
    console.log('No existing template tray found. Aborting.');
    process.exit(1);
}

console.log(`\nUsing template tray: [${template.artNr}] ${template.label.substring(0, 60)}...`);
console.log(`Template has ${template.mountingMaterials.length} accessory groups.\n`);

// ---------------------------------------------------------------
// Find the 10 unsynced ones (mountingMaterials is empty array)
// ---------------------------------------------------------------
const unsynced = data.badewanne.trays.filter(t =>
    Array.isArray(t.mountingMaterials) && t.mountingMaterials.length === 0 &&
    (t.label || '').toLowerCase().includes('badewanne')
);

if (unsynced.length === 0) {
    console.log('All Badewanne trays already have mountingMaterials. Nothing to do.');
    process.exit(0);
}

console.log(`Found ${unsynced.length} unsynced tray(s):\n`);

// Deep-clone the template's mountingMaterials for each unsynced tray
unsynced.forEach(tray => {
    tray.mountingMaterials = JSON.parse(JSON.stringify(template.mountingMaterials));
    console.log(`  ✅ Synced [${tray.artNr}] ${tray.label.substring(0, 70)}`);
});

fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));

console.log(`\n✅ Done. ${unsynced.length} tray(s) now have ${template.mountingMaterials.length} accessory groups each.`);
console.log('Reload the app in the browser to see the changes.');
