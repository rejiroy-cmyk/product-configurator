const fs = require('fs');

const dataPath = './custom-data.json';
const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

let restoredCount = 0;

function processCategory(cat) {
    if (!data[cat] || !data[cat].trays) return;
    
    data[cat].trays.forEach(t => {
        if (!t.mountingMaterials) return;
        
        // Find Grundkörper and Montageschiene
        let gkOpt = null;
        let msMat = null;
        
        t.mountingMaterials.forEach(mat => {
            if (mat.name === 'Grundkörper' && mat.options && mat.options.length > 0) {
                gkOpt = mat.options[0];
            }
            if (mat.name === 'Montageschiene' && mat.options && mat.options.length > 0) {
                msMat = mat;
            }
        });

        if (gkOpt && msMat && (msMat.options[0].artNr === 'ohne_ms' || msMat.options[0].artNr === t.artNr)) {
            const gkLabel = (gkOpt.label || '').toLowerCase();
            const mainLabel = (t.label || '').toLowerCase();
            
            let newMsArtNr = null;
            let newMsLabel = null;
            let newImgUrl = "";

            if (gkLabel.includes('simibox') || gkLabel.includes('alterna') || mainLabel.includes('simibox') || mainLabel.includes('alterna')) {
                newMsArtNr = "6158 120.000.000";
                newMsLabel = "Montageset Laufen Simibox, 2 Montageschienen 560 mm";
                newImgUrl = "https://profishop.sanitastroesch.ch/multimedia/Web/PG1/06158120_000_000.png";
            } else if (gkLabel.includes('ibox') || gkLabel.includes('hansgrohe') || mainLabel.includes('hansgrohe')) {
                newMsArtNr = "6418 111.000.000";
                newMsLabel = "Montageset Hansgrohe iBox Universal, 2 Montageschienen 550 mm";
                newImgUrl = "https://profishop.sanitastroesch.ch/multimedia/Web/PG1/06418111_000_000.png";
            } else if (gkLabel.includes('homebox') || mainLabel.includes('homebox')) {
                newMsArtNr = "6118 149.000.000";
                newMsLabel = "Montageschiene KWC, zu Einbaukörper KWC Homebox";
                newImgUrl = "https://profishop.sanitastroesch.ch/multimedia/Web/PG1/06118149_000_000.png";
            } else if (gkLabel.includes('bluebox') || mainLabel.includes('kwc')) {
                newMsArtNr = "6118 122.000.000";
                newMsLabel = "Montageschiene KWC, zu Einbaukörper KWC Bluebox";
                newImgUrl = "https://profishop.sanitastroesch.ch/multimedia/Web/PG1/06118122_000_000.png";
            }

            if (newMsArtNr) {
                msMat.options = [
                    {
                        artNr: newMsArtNr,
                        label: newMsLabel,
                        type: "Montageschiene",
                        menge: 1,
                        imgUrl: newImgUrl
                    },
                    {
                        artNr: "ohne_ms",
                        label: "Ohne Montageschiene",
                        type: "Montageschiene",
                        menge: 0,
                        imgUrl: ""
                    }
                ];
                restoredCount++;
                console.log(`Restored Montageschiene for: ${t.artNr} -> ${newMsArtNr} (${newMsLabel})`);
            }
        }
    });
}

processCategory('duschenmischer');
processCategory('bademischer');

fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
console.log(`Successfully restored ${restoredCount} Montageschiene entries.`);

const dataJsPath = './modules/data.js';
let dataJs = fs.readFileSync(dataJsPath, 'utf8');
dataJs = dataJs.replace(/export const DATA_VERSION = '(.*?)';/, (match, p1) => {
    let parts = p1.split('.');
    parts[2] = parseInt(parts[2]) + 1;
    return `export const DATA_VERSION = '${parts.join('.')}';`;
});
fs.writeFileSync(dataJsPath, dataJs);
console.log('Incremented DATA_VERSION in modules/data.js');
