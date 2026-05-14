const fs = require('fs');

const dataPath = './custom-data.json';
const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

let exclusionCount = 0;

function performExclusions(cat) {
    if (!data[cat] || !data[cat].trays) return;
    
    data[cat].trays.forEach(t => {
        if (!t.mountingMaterials) return;
        
        // 1. "needs only Grundkörper and Duschgleitstange"
        if (t.artNr === '6323 124.501.000' || 
            t.artNr === '6171 127.501.000' || 
            t.artNr === '6323 750.501.000') {
            
            const originalLen = t.mountingMaterials.length;
            t.mountingMaterials = t.mountingMaterials.filter(mat => {
                const name = (mat.name || '').toLowerCase();
                return name.includes('grundkörper') || name.includes('gleitstange') || name.includes('montageschiene');
            });
            
            if (t.mountingMaterials.length < originalLen) {
                exclusionCount++;
                console.log(`Isolated Grundkörper & Duschgleitstange for: ${t.artNr}`);
            }
        }
        
        // 2. "doesn't need Anschlussbogen"
        if (t.artNr === '6323 751.501.000' || 
            t.artNr === '6323 125.501.000' || 
            t.artNr === '6111 377.501.000') {
            
            const originalLen = t.mountingMaterials.length;
            t.mountingMaterials = t.mountingMaterials.filter(mat => {
                const name = (mat.name || '').toLowerCase();
                return !name.includes('anschlussbogen');
            });
            
            if (t.mountingMaterials.length < originalLen) {
                exclusionCount++;
                console.log(`Removed Anschlussbogen for: ${t.artNr}`);
            }
        }
    });
}

performExclusions('duschenmischer');
performExclusions('bademischer');

fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
console.log(`Successfully completed surgical exclusions on ${exclusionCount} products.`);

const dataJsPath = './modules/data.js';
let dataJs = fs.readFileSync(dataJsPath, 'utf8');
dataJs = dataJs.replace(/export const DATA_VERSION = '(.*?)';/, (match, p1) => {
    let parts = p1.split('.');
    parts[2] = parseInt(parts[2]) + 1;
    return `export const DATA_VERSION = '${parts.join('.')}';`;
});
fs.writeFileSync(dataJsPath, dataJs);
console.log('Incremented DATA_VERSION in modules/data.js');
