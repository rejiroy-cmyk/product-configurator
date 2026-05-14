const fs = require('fs');
const dataPath = './custom-data.json';
const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

// 1. Find the Vorlage
let vorlageItem = null;
if (data.vorlagen && data.vorlagen.trays) {
    vorlageItem = data.vorlagen.trays.find(t => t.artNr === 'BM UP Laufen 501');
} else {
    // maybe it's in another app
    Object.keys(data).forEach(appKey => {
        if (data[appKey].trays) {
            const found = data[appKey].trays.find(t => t.artNr === 'BM UP Laufen 501');
            if (found) vorlageItem = found;
        }
    });
}

if (!vorlageItem) {
    console.error('Could not find Vorlage BM UP Laufen 501');
    process.exit(1);
}

console.log('Found Vorlage:', vorlageItem.artNr, 'with', vorlageItem.mountingMaterials ? vorlageItem.mountingMaterials.length : 0, 'material groups.');

if (!vorlageItem.mountingMaterials) {
    console.log('Warning: Vorlage has no mountingMaterials. Applying empty array.');
}

const materialsToCopy = JSON.parse(JSON.stringify(vorlageItem.mountingMaterials || []));

// 2. Apply to all Bademischer-Endmontageset Laufen
let count = 0;
Object.keys(data).forEach(appKey => {
    if (appKey === 'vorlagen') return; // Don't apply to templates themselves
    
    const app = data[appKey];
    if (app.trays) {
        app.trays.forEach(t => {
            if (t.label && t.label.includes('Bademischer-Endmontageset Laufen')) {
                t.mountingMaterials = JSON.parse(JSON.stringify(materialsToCopy));
                console.log(`Applied to: ${t.label} (${t.artNr})`);
                count++;
            }
        });
    }
});

fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
console.log(`Successfully applied Vorlage to ${count} products.`);
