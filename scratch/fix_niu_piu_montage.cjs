const fs = require('fs');

const dataPath = './custom-data.json';
const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

let fixedCount = 0;

function fixNiuPiu(cat) {
    if (!data[cat] || !data[cat].trays) return;
    
    data[cat].trays.forEach(t => {
        if (!t.mountingMaterials) return;
        
        let hasNiuPiuGK = false;

        // Clean up Grundkörper options and check if it uses Niu/Piu
        t.mountingMaterials.forEach(mat => {
            if (mat.name === 'Grundkörper') {
                if (mat.options && mat.options.length > 0) {
                    if (mat.options[0].artNr === '6252 890.000.000' || mat.options[0].label.includes('più / niù')) {
                        hasNiuPiuGK = true;
                    }
                }
                
                // Remove the Befestigungsset from Grundkörper options to avoid duplication
                if (mat.options) {
                    mat.options = mat.options.filter(opt => opt.artNr !== '6252 894.000.000');
                }
            }
        });

        // Set the correct Montageschiene
        if (hasNiuPiuGK) {
            t.mountingMaterials.forEach(mat => {
                if (mat.name === 'Montageschiene') {
                    mat.options = [
                        {
                            artNr: "6252 894.000.000",
                            label: "Befestigungsset Gessi, zu Einbaukörper 6252 858 / 888 / 890",
                            type: "Montageschiene",
                            menge: 1,
                            imgUrl: "https://profishop.sanitastroesch.ch/multimedia/Web/PG1/06252894_000_000.png"
                        },
                        {
                            artNr: "ohne_ms",
                            label: "Ohne Montageschiene",
                            type: "Montageschiene",
                            menge: 0,
                            imgUrl: ""
                        }
                    ];
                    fixedCount++;
                    console.log(`Fixed Montageschiene for Niù/Più: ${t.artNr}`);
                }
            });
        }
    });
}

fixNiuPiu('duschenmischer');
fixNiuPiu('bademischer');

fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
console.log(`Successfully fixed ${fixedCount} Niù/Più Montageschiene entries.`);

const dataJsPath = './modules/data.js';
let dataJs = fs.readFileSync(dataJsPath, 'utf8');
dataJs = dataJs.replace(/export const DATA_VERSION = '(.*?)';/, (match, p1) => {
    let parts = p1.split('.');
    parts[2] = parseInt(parts[2]) + 1;
    return `export const DATA_VERSION = '${parts.join('.')}';`;
});
fs.writeFileSync(dataJsPath, dataJs);
console.log('Incremented DATA_VERSION in modules/data.js');
