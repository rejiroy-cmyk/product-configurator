const fs = require('fs');

const dataPath = './custom-data.json';
const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

let fixedCount = 0;

if (data.duschenmischer && data.duschenmischer.trays) {
    data.duschenmischer.trays.forEach(t => {
        if (t.mountingMaterials) {
            t.mountingMaterials.forEach(mat => {
                if (mat.name === 'Montageschiene' || mat.name === '2. Montageschiene' || (mat.options && mat.options[0] && mat.options[0].type === 'Montageschiene')) {
                    const opt = mat.options[0];
                    if (opt && (opt.label === 'Produktbeschreibung' || opt.artNr === t.artNr)) {
                        console.log(`Fixing false-positive Montageschiene for: ${t.artNr} - ${t.label}`);
                        // Overwrite with empty option
                        mat.options = [
                            {
                                artNr: "ohne_ms",
                                label: "Ohne Montageschiene (im Grundkörper integriert oder bauseits)",
                                type: "Montageschiene",
                                menge: 0,
                                imgUrl: ""
                            }
                        ];
                        fixedCount++;
                    }
                }
            });
        }
    });
}

// Check bademischer too just in case
if (data.bademischer && data.bademischer.trays) {
    data.bademischer.trays.forEach(t => {
        if (t.mountingMaterials) {
            t.mountingMaterials.forEach(mat => {
                if (mat.name === 'Montageschiene' || mat.name === '2. Montageschiene' || (mat.options && mat.options[0] && mat.options[0].type === 'Montageschiene')) {
                    const opt = mat.options[0];
                    if (opt && (opt.label === 'Produktbeschreibung' || opt.artNr === t.artNr)) {
                        console.log(`Fixing false-positive Montageschiene for Bademischer: ${t.artNr}`);
                        mat.options = [
                            {
                                artNr: "ohne_ms",
                                label: "Ohne Montageschiene (im Grundkörper integriert oder bauseits)",
                                type: "Montageschiene",
                                menge: 0,
                                imgUrl: ""
                            }
                        ];
                        fixedCount++;
                    }
                }
            });
        }
    });
}

fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
console.log(`Successfully fixed ${fixedCount} corrupted Montageschiene entries.`);

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
