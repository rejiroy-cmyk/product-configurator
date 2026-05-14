const fs = require('fs');

const dataPath = './custom-data.json';
const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

let count = 0;

if (data.duschenmischer && data.duschenmischer.trays) {
    data.duschenmischer.trays.forEach(t => {
        const labelLower = (t.label || '').toLowerCase();
        
        // Detect Unterputz
        if (
            labelLower.includes('unterputz') ||
            labelLower.includes(' up ') ||
            labelLower.includes('einbau') ||
            labelLower.includes('endmontageset') ||
            labelLower.includes('grundkörper') ||
            labelLower.includes('grundkoerper')
        ) {
            
            // Extract existing Grundkörper and Montageschiene
            let existingGK = null;
            let existingMS = null;

            if (t.mountingMaterials) {
                t.mountingMaterials.forEach(mat => {
                    const nameLower = (mat.name || '').toLowerCase();
                    const typeLower = (mat.options && mat.options[0] && mat.options[0].type) ? mat.options[0].type.toLowerCase() : '';
                    
                    if (nameLower.includes('grundkörper') || nameLower.includes('grundkoerper') || typeLower === 'grundkörper') {
                        existingGK = mat;
                    }
                    if (nameLower.includes('montageschiene') || typeLower === 'montageschiene') {
                        existingMS = mat;
                    }
                });
            }

            const newMats = [];

            // 1. Grundkörper
            if (existingGK) {
                existingGK.name = "Grundkörper";
                newMats.push(existingGK);
            } else {
                newMats.push({ id: "mat_gk_" + Math.random().toString(36).substr(2,5), name: "Grundkörper", options: [{ artNr: "ohne_gk", label: "Ohne Grundkörper", type: "Grundkörper", menge: 0 }] });
            }

            // 2. Montageschiene
            if (existingMS) {
                existingMS.name = "Montageschiene";
                newMats.push(existingMS);
            } else {
                newMats.push({ id: "mat_ms_" + Math.random().toString(36).substr(2,5), name: "Montageschiene", options: [{ artNr: "ohne_ms", label: "Ohne Montageschiene", type: "Montageschiene", menge: 0 }] });
            }

            // 3. Anschlussbogen
            newMats.push({
                id: "mat_anschluss_" + Math.random().toString(36).substr(2,5),
                name: "Anschlussbogen",
                options: [
                  {
                    artNr: "6544 164.501.000",
                    label: "Anschlussbogen Laufen City, mit Rückflussverhinderer, Rosette rund",
                    type: "Anschlussbogen",
                    menge: 1,
                    imgUrl: "https://profishop.sanitastroesch.ch/multimedia/Web/PG1/06544164_501_000.png"
                  },
                  {
                    artNr: "6544 166.501.000",
                    label: "Anschlussbogen Laufen City 1/2\" mit integriertem Brausehalter",
                    type: "Anschlussbogen",
                    menge: 1,
                    imgUrl: "https://profishop.sanitastroesch.ch/multimedia/Web/PG1/06544166_501_000.png"
                  },
                  {
                    artNr: "ohne_anschluss",
                    label: "Ohne Anschlussbogen",
                    type: "Anschlussbogen",
                    menge: 0,
                    imgUrl: ""
                  }
                ]
            });

            // 4. Brauseschlauch
            newMats.push({
                id: "mat_schlauch_" + Math.random().toString(36).substr(2,5),
                name: "Brauseschlauch",
                options: [
                  {
                    artNr: "6542 317.501.000",
                    label: "Brauseschlauch Alterna flexline, 1600 mm",
                    type: "Brauseschlauch",
                    menge: 1,
                    imgUrl: "https://profishop.sanitastroesch.ch/multimedia/Web/PG1/06542317_501_000.png"
                  },
                  {
                    artNr: "6542 316.501.000",
                    label: "Brauseschlauch Alterna flexline, 1250 mm",
                    type: "Brauseschlauch",
                    menge: 1,
                    imgUrl: "https://profishop.sanitastroesch.ch/multimedia/Web/PG1/06542316_501_000.png"
                  },
                  {
                    artNr: "6542 318.501.000",
                    label: "Brauseschlauch Alterna flexline, 1800 mm",
                    type: "Brauseschlauch",
                    menge: 1,
                    imgUrl: "https://profishop.sanitastroesch.ch/multimedia/Web/PG1/06542318_501_000.png"
                  },
                  {
                    artNr: "ohne_schlauch",
                    label: "Ohne Brauseschlauch",
                    type: "Brauseschlauch",
                    menge: 0,
                    imgUrl: ""
                  }
                ]
            });

            // 5. Handbrause
            newMats.push({
                id: "mat_handbrause_" + Math.random().toString(36).substr(2,5),
                name: "Handbrause",
                options: [
                  {
                    artNr: "6541 326.501.000",
                    label: "Handbrause Alterna easyline, Ø 101 mm, 1-jet",
                    type: "Handbrause",
                    menge: 1,
                    imgUrl: "https://profishop.sanitastroesch.ch/multimedia/Web/PG1/06541326_501_000.png"
                  },
                  {
                    artNr: "ohne_handbrause",
                    label: "Ohne Handbrause",
                    type: "Handbrause",
                    menge: 0,
                    imgUrl: ""
                  }
                ]
            });

            // 6. Duschgleitstange
            newMats.push({
                id: "mat_gleitstange_" + Math.random().toString(36).substr(2,5),
                name: "Duschgleitstange",
                options: [
                  {
                    artNr: "6531 404.501.000",
                    label: "Duschgleitstange Alterna fit, 1100 mm",
                    type: "Gleitstange",
                    menge: 1,
                    imgUrl: "https://profishop.sanitastroesch.ch/multimedia/Web/PG1/06531404_501_000.png"
                  },
                  {
                    artNr: "6531 403.501.000",
                    label: "Duschgleitstange Alterna fit, 610 mm",
                    type: "Gleitstange",
                    menge: 1,
                    imgUrl: "https://profishop.sanitastroesch.ch/multimedia/Web/PG1/06531403_501_000.png"
                  },
                  {
                    artNr: "ohne_gleitstange",
                    label: "Ohne Duschgleitstange",
                    type: "Gleitstange",
                    menge: 0,
                    imgUrl: ""
                  }
                ]
            });

            t.mountingMaterials = newMats;
            count++;
        }
    });
}

fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
console.log(`Successfully applied standard Unterputz materials to ${count} Duschenmischer products.`);

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
