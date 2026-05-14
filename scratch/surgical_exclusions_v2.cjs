const fs = require('fs');

const dataPath = './custom-data.json';
const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

const targetArts = [
    '6111 365.501.000',
    '6111 363.501.000',
    '6111 373.501.000',
    '6111 375.501.000',
    '6111 361.501.000',
    '6111 371.501.000',
    '6111 367.501.000',
    '6111 369.501.000'
];

let removedCount = 0;

function performExclusions(cat) {
    if (!data[cat] || !data[cat].trays) return;
    
    data[cat].trays.forEach(t => {
        if (targetArts.includes(t.artNr)) {
            if (t.mountingMaterials) {
                const originalLen = t.mountingMaterials.length;
                t.mountingMaterials = t.mountingMaterials.filter(mat => {
                    const name = (mat.name || '').toLowerCase();
                    return !name.includes('anschlussbogen');
                });
                
                if (t.mountingMaterials.length < originalLen) {
                    removedCount++;
                    console.log(`Removed Anschlussbogen for: ${t.artNr}`);
                }
            }
        }
    });
}

performExclusions('duschenmischer');
performExclusions('bademischer');

fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
console.log(`Successfully completed surgical exclusions V2.0 on ${removedCount} products.`);

// Increment version to force reload
const dataJsPath = './modules/data.js';
let dataJs = fs.readFileSync(dataJsPath, 'utf8');
dataJs = dataJs.replace(/export const DATA_VERSION = '(.*?)';/, (match, p1) => {
    let parts = p1.split('.');
    parts[2] = parseInt(parts[2]) + 1;
    return `export const DATA_VERSION = '${parts.join('.')}';`;
});
fs.writeFileSync(dataJsPath, dataJs);
console.log('Incremented DATA_VERSION in modules/data.js');
