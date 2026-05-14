const fs = require('fs');

const dataPath = './custom-data.json';
const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

let replacedCount = 0;

function replaceAnschlussbogen(cat) {
    if (!data[cat] || !data[cat].trays) return;
    
    data[cat].trays.forEach(t => {
        if (!t.mountingMaterials) return;
        
        // Only target Alterna items
        if ((t.manufacturer || '').toLowerCase() === 'alterna') {
            t.mountingMaterials.forEach(mat => {
                if (mat.name === 'Anschlussbogen' || mat.name.includes('Anschlussbogen')) {
                    let changed = false;
                    
                    mat.options.forEach(opt => {
                        if (opt.artNr === '6544 164.501.000') {
                            opt.artNr = '6544 100.501.000';
                            opt.label = 'Anschlussbogen Alterna 1/2", Rosette rund, für Handbrause Geräuschgruppe NT Verchromt';
                            opt.imgUrl = 'https://profishop.sanitastroesch.ch/multimedia/Web/PG1/06544100_501_000.png';
                            changed = true;
                        } else if (opt.artNr === '6544 166.501.000') {
                            opt.artNr = '6544 102.501.000';
                            opt.label = 'Anschlussbogen Alterna 1/2" mit integriertem Brausehalter Rosette rund Geräuschgruppe NT Verchromt';
                            opt.imgUrl = 'https://profishop.sanitastroesch.ch/multimedia/Web/PG1/06544102_501_000.png';
                            changed = true;
                        }
                    });
                    
                    if (changed) {
                        replacedCount++;
                        console.log(`Replaced Anschlussbogen for Alterna product: ${t.artNr}`);
                    }
                }
            });
        }
    });
}

replaceAnschlussbogen('duschenmischer');
replaceAnschlussbogen('bademischer');

fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
console.log(`Successfully replaced Anschlussbogen for ${replacedCount} Alterna products.`);

const dataJsPath = './modules/data.js';
let dataJs = fs.readFileSync(dataJsPath, 'utf8');
dataJs = dataJs.replace(/export const DATA_VERSION = '(.*?)';/, (match, p1) => {
    let parts = p1.split('.');
    parts[2] = parseInt(parts[2]) + 1;
    return `export const DATA_VERSION = '${parts.join('.')}';`;
});
fs.writeFileSync(dataJsPath, dataJs);
console.log('Incremented DATA_VERSION in modules/data.js');
