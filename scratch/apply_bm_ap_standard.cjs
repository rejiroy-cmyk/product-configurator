const fs = require('fs');
const dataPath = './custom-data.json';
const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

// 1. Find the Vorlage
let vorlageItem = null;
if (data.vorlagen && data.vorlagen.trays) {
    vorlageItem = data.vorlagen.trays.find(t => t.artNr === 'BM AP Standard 501');
} else {
    Object.keys(data).forEach(appKey => {
        if (data[appKey].trays) {
            const found = data[appKey].trays.find(t => t.artNr === 'BM AP Standard 501');
            if (found) vorlageItem = found;
        }
    });
}

if (!vorlageItem) {
    console.error('Could not find Vorlage BM AP Standard 501');
    process.exit(1);
}

console.log('Found Vorlage:', vorlageItem.artNr, 'with', vorlageItem.mountingMaterials ? vorlageItem.mountingMaterials.length : 0, 'material groups.');

const materialsToCopy = JSON.parse(JSON.stringify(vorlageItem.mountingMaterials || []));

// 2. Apply to all Bademischer from Laufen and Alterna
let count = 0;
if (data.bademischer && data.bademischer.trays) {
    data.bademischer.trays.forEach(t => {
        const manufacturer = (t.manufacturer || '').toLowerCase();
        if (manufacturer === 'laufen' || manufacturer === 'alterna') {
            t.mountingMaterials = JSON.parse(JSON.stringify(materialsToCopy));
            count++;
        }
    });
}

fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
console.log(`Successfully applied Vorlage to ${count} Laufen and Alterna products in bademischer.`);

// 3. Increment Data Version
const dataJsPath = './modules/data.js';
let dataJs = fs.readFileSync(dataJsPath, 'utf8');
dataJs = dataJs.replace(/export const DATA_VERSION = '(.*?)';/, (match, p1) => {
    let parts = p1.split('.');
    parts[2] = parseInt(parts[2]) + 1;
    return `export const DATA_VERSION = '${parts.join('.')}';`;
});
fs.writeFileSync(dataJsPath, dataJs);
console.log('Incremented DATA_VERSION in modules/data.js');
