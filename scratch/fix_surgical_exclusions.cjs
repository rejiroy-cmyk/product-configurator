const fs = require('fs');

const dataPath = './custom-data.json';
const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

const targetArts = [
    '6323 124.501.000',
    '6171 127.501.000',
    '6323 750.501.000',
    '6323 751.501.000',
    '6323 125.501.000',
    '6111 377.501.000'
];

function getStandardMats(artNr) {
    const randomId = () => Math.random().toString(36).substr(2, 5);
    return [
        {
            id: "mat_anschluss_" + randomId(),
            name: "Anschlussbogen",
            options: [
                { artNr: "6544 164.501.000", label: "Anschlussbogen Laufen City, mit Rückflussverhinderer, Rosette rund", type: "Anschlussbogen", menge: 1, imgUrl: "https://profishop.sanitastroesch.ch/multimedia/Web/PG1/06544164_501_000.png" },
                { artNr: "6544 166.501.000", label: "Anschlussbogen Laufen City 1/2\" mit integriertem Brausehalter", type: "Anschlussbogen", menge: 1, imgUrl: "https://profishop.sanitastroesch.ch/multimedia/Web/PG1/06544166_501_000.png" },
                { artNr: "ohne_anschluss", label: "Ohne Anschlussbogen", type: "Anschlussbogen", menge: 0, imgUrl: "" }
            ]
        },
        {
            id: "mat_schlauch_" + randomId(),
            name: "Brauseschlauch",
            options: [
                { artNr: "6542 317.501.000", label: "Brauseschlauch Alterna flexline, 1600 mm", type: "Brauseschlauch", menge: 1, imgUrl: "https://profishop.sanitastroesch.ch/multimedia/Web/PG1/06542317_501_000.png" },
                { artNr: "ohne_schlauch", label: "Ohne Brauseschlauch", type: "Brauseschlauch", menge: 0, imgUrl: "" }
            ]
        },
        {
            id: "mat_handbrause_" + randomId(),
            name: "Handbrause",
            options: [
                { artNr: "6541 326.501.000", label: "Handbrause Alterna easyline, Ø 101 mm, 1-jet", type: "Handbrause", menge: 1, imgUrl: "https://profishop.sanitastroesch.ch/multimedia/Web/PG1/06541326_501_000.png" },
                { artNr: "ohne_handbrause", label: "Ohne Handbrause", type: "Handbrause", menge: 0, imgUrl: "" }
            ]
        },
        {
            id: "mat_gleitstange_" + randomId(),
            name: "Duschgleitstange",
            options: [
                { artNr: "6531 404.501.000", label: "Duschgleitstange Alterna fit, 1100 mm", type: "Gleitstange", menge: 1, imgUrl: "https://profishop.sanitastroesch.ch/multimedia/Web/PG1/06531404_501_000.png" },
                { artNr: "ohne_gleitstange", label: "Ohne Duschgleitstange", type: "Gleitstange", menge: 0, imgUrl: "" }
            ]
        }
    ];
}

function fixExclusions(cat) {
    if (!data[cat] || !data[cat].trays) return;
    
    data[cat].trays.forEach(t => {
        if (!targetArts.includes(t.artNr)) return;
        
        // Reset: Add standard mats if they are missing
        const currentNames = (t.mountingMaterials || []).map(m => m.name.toLowerCase());
        const standardMats = getStandardMats(t.artNr);
        
        standardMats.forEach(sm => {
            if (!currentNames.some(cn => cn.includes(sm.name.toLowerCase()))) {
                t.mountingMaterials.push(sm);
            }
        });

        // Now re-apply surgical exclusions with the Montageschiene fix
        if (t.artNr === '6323 124.501.000' || 
            t.artNr === '6171 127.501.000' || 
            t.artNr === '6323 750.501.000') {
            
            t.mountingMaterials = t.mountingMaterials.filter(mat => {
                const name = (mat.name || '').toLowerCase();
                return name.includes('grundkörper') || name.includes('gleitstange') || name.includes('montageschiene');
            });
            console.log(`Fixed Isolation for: ${t.artNr} (Keeping GK, MS, GS)`);
        }
        
        if (t.artNr === '6323 751.501.000' || 
            t.artNr === '6323 125.501.000' || 
            t.artNr === '6111 377.501.000') {
            
            t.mountingMaterials = t.mountingMaterials.filter(mat => {
                const name = (mat.name || '').toLowerCase();
                return !name.includes('anschlussbogen');
            });
            console.log(`Fixed Anschlussbogen removal for: ${t.artNr}`);
        }
    });
}

fixExclusions('duschenmischer');
fixExclusions('bademischer');

fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
console.log('Successfully corrected surgical exclusions.');

// Increment version to force reload
const dataJsPath = './modules/data.js';
let dataJs = fs.readFileSync(dataJsPath, 'utf8');
dataJs = dataJs.replace(/export const DATA_VERSION = '(.*?)';/, (match, p1) => {
    let parts = p1.split('.');
    parts[2] = parseInt(parts[2]) + 1;
    return `export const DATA_VERSION = '${parts.join('.')}';`;
});
fs.writeFileSync(dataJsPath, dataJs);
