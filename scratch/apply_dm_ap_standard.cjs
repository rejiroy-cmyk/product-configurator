const fs = require('fs');

const dataPath = './custom-data.json';
const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

// The standard BOM structure for Duschenmischer Aufputz
const standardMaterials = [
  {
    id: "mat_abstell",
    name: "Abstellverschraubung",
    options: [
      {
        artNr: "6521 108.501.000",
        label: "Abstellverschraubung, 1/2\" x 1/2\", mit flacher Rosette, Verchromt",
        type: "Abstellverschraubung",
        menge: 2,
        imgUrl: "https://profishop.sanitastroesch.ch/multimedia/Web/PG1/06521108_501_000.png"
      },
      {
        artNr: "ohne_abstell",
        label: "Ohne Abstellverschraubung",
        type: "Abstellverschraubung",
        menge: 0,
        imgUrl: ""
      }
    ]
  },
  {
    id: "mat_schlauch",
    name: "Brauseschlauch",
    options: [
      {
        artNr: "6542 317.501.000",
        label: "Brauseschlauch Alterna flexline, 1600 mm, 1/2\"x1/2\"",
        type: "Brauseschlauch",
        menge: 1,
        imgUrl: "https://profishop.sanitastroesch.ch/multimedia/Web/PG1/06542317_501_000.png"
      },
      {
        artNr: "6542 316.501.000",
        label: "Brauseschlauch Alterna flexline, 1250 mm, 1/2\"x1/2\"",
        type: "Brauseschlauch",
        menge: 1,
        imgUrl: "https://profishop.sanitastroesch.ch/multimedia/Web/PG1/06542316_501_000.png"
      },
      {
        artNr: "6542 318.501.000",
        label: "Brauseschlauch Alterna flexline, 1800 mm, 1/2\"x1/2\"",
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
  },
  {
    id: "mat_handbrause",
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
  },
  {
    id: "mat_gleitstange",
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
  }
];

let count = 0;

if (data.duschenmischer && data.duschenmischer.trays) {
    data.duschenmischer.trays.forEach(t => {
        const labelLower = (t.label || '').toLowerCase();
        // Condition for Aufputz
        if (
            labelLower.includes('aufputz') || 
            labelLower.includes(' ap ') || 
            labelLower.includes('wandbatterie') || 
            labelLower.includes('wandmischer') || 
            labelLower.includes('ad 153')
        ) {
            // Apply standard materials
            t.mountingMaterials = JSON.parse(JSON.stringify(standardMaterials));
            count++;
        }
    });
}

fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
console.log(`Successfully applied standard Aufputz materials to ${count} Duschenmischer products.`);

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
