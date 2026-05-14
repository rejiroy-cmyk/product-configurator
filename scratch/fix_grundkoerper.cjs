const fs = require('fs');

const dataPath = './custom-data.json';
const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

let fixedCount = 0;

function cleanGrundkoerper(cat) {
    if (!data[cat] || !data[cat].trays) return;
    
    data[cat].trays.forEach(t => {
        if (!t.mountingMaterials) return;
        
        t.mountingMaterials.forEach(mat => {
            if (mat.name === 'Grundkörper' && mat.options && mat.options.length > 0) {
                const originalLength = mat.options.length;
                
                // Filter out any option that contains 'umsteller' in the label
                mat.options = mat.options.filter(opt => {
                    const labelLower = (opt.label || '').toLowerCase();
                    return !labelLower.includes('umsteller');
                });
                
                if (mat.options.length < originalLength) {
                    fixedCount += (originalLength - mat.options.length);
                    console.log(`Removed false-positive Grundkörper (Umsteller) for: ${t.artNr}`);
                }
            }
        });
    });
}

cleanGrundkoerper('duschenmischer');
cleanGrundkoerper('bademischer');

fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
console.log(`Successfully removed ${fixedCount} false-positive Grundkörper entries (Umsteller).`);

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
