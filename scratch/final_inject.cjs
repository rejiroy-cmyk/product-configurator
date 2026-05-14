const fs = require('fs');
const data = JSON.parse(fs.readFileSync('custom-data.json', 'utf8'));

const fullAccessories = [
  {
    "id": "mat_howjw",
    "name": "Abstellverschraubung,",
    "options": [
      {
        "artNr": "6521 108.501.000",
        "label": "Abstellverschraubung, ½\" x ½\", mit flacher Rosette, Verchromt",
        "menge": 2,
        "type": "Zubehör",
        "imgUrl": "https://profishop.sanitastroesch.ch/multimedia/Web/PG1/06521108_501_000.png"
      }
    ]
  },
  {
    "id": "mat_dweg4",
    "name": "Brauseschlauch",
    "options": [
      {
        "artNr": "6542 317.501.000",
        "label": "Brauseschlauch Alterna flexline, 1600 mm, ½\"x½\", Kunststoff mit Metalleffekt,",
        "menge": 1,
        "type": "Zubehör",
        "imgUrl": "https://profishop.sanitastroesch.ch/multimedia/Web/PG1/06542317_501_000.png"
      }
    ]
  },
  {
    "id": "mat_5utlf",
    "name": "Handbrause",
    "options": [
      {
        "artNr": "6541 326.501.000",
        "label": "Handbrause Alterna easyline, Ø 101 mm, 1-jet, SoftRain, Einlage des",
        "menge": 1,
        "type": "Zubehör",
        "imgUrl": "https://profishop.sanitastroesch.ch/multimedia/Web/PG1/06541326_501_000.png"
      }
    ]
  },
  {
    "id": "mat_37d4w",
    "name": "Duschgleitstange",
    "options": [
      {
        "artNr": "6531 403.501.000",
        "label": "Duschgleitstange Alterna fit, 610 mm, Gelenkhalter, Arretierungshebel,",
        "menge": 1,
        "type": "Zubehör",
        "imgUrl": "https://profishop.sanitastroesch.ch/multimedia/Web/PG1/06531403_501_000.png"
      },
      {
        "artNr": "6531 404.501.000",
        "label": "Duschgleitstange Alterna fit, 1100 mm, Gelenkhalter, Arretierungshebel,",
        "menge": 1,
        "type": "Option",
        "imgUrl": "https://profishop.sanitastroesch.ch/multimedia/Web/PG1/06531404_501_000.png"
      }
    ]
  }
];

// Restore Reference Product
data.duschenmischer.trays.forEach(t => {
    if (t.artNr === '6211 321.501.000') {
        t.mountingMaterials = fullAccessories;
    }
});

// Inject to others
let count = 0;
data.duschenmischer.trays.forEach(t => {
    if (t.artNr === '6211 321.501.000') return; // Skip reference
    
    const l = t.label.toLowerCase();
    if (l.includes('ad 153 mm') && !l.includes('endmontageset') && !l.includes('grundkörper')) {
        
        const filteredMat = JSON.parse(JSON.stringify(fullAccessories)).filter(mat => {
            const name = mat.name.toLowerCase();
            
            // Explicit OHNE
            if (name.includes('abstell') && l.includes('ohne abstell')) return true;
            if (name.includes('schlauch') && (l.includes('ohne brauseschlauch') || l.includes('ohne schlauch'))) return true;
            if (name.includes('handbrause') && (l.includes('ohne handbrause') || l.includes('ohne brause'))) return true;
            
            // Explicit MIT / INKL
            if (name.includes('abstell') && (l.includes('inkl. abstell') || l.includes('mit abstell') || l.includes('abstellverschraubungen ½" x ½"'))) return false;
            if (name.includes('schlauch') && (l.includes('inkl. brauseschlauch') || l.includes('mit brauseschlauch') || l.includes('brauseschlauch'))) return false;
            if (name.includes('handbrause') && (l.includes('inkl. handbrause') || l.includes('mit handbrause') || l.includes('handbrause'))) return false;
            
            return true; // Default keep (Gleitstange etc)
        });

        if (filteredMat.length > 0) {
            t.mountingMaterials = filteredMat;
            count++;
        }
    }
});

fs.writeFileSync('custom-data.json', JSON.stringify(data, null, 2));
console.log(`Restored ref and injected to ${count} others.`);
