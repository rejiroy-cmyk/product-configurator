const fs = require('fs');

const dataFile = 'custom-data.json';
const data = JSON.parse(fs.readFileSync(dataFile, 'utf8'));

const carriers = data.zubehoer_pool.trays.filter(z => 
  z.label && 
  z.label.toLowerCase().includes('schmidlin') && 
  (z.label.toLowerCase().includes('träger') || z.label.toLowerCase().includes('wannenträger'))
);

const carrierMap = new Map();
carriers.forEach(c => {
  const match = c.label.match(/(\d+(?:\.\d+)?)\s*[xX]\s*(\d+(?:\.\d+)?)\s*[xX]\s*(\d+(?:\.\d+)?)/);
  if (match) {
    const d1 = parseFloat(match[1]) / 10;
    const d2 = parseFloat(match[2]) / 10;
    const d3 = parseFloat(match[3]) / 10;
    
    // Sort d1 and d2 so larger is always first
    let l = d1, w = d2;
    if (w > l) { l = d2; w = d1; }
    
    carrierMap.set(l + 'x' + w + 'x' + d3, c);
  }
});

const BUNDLE = [
  {
    "artNr": "1441 791.000.000",
    "label": "Montageschaum Alterna, zu Bade- und Duschenwannenträger, Kartusche 400 ml",
    "imgUrl": "https://profishop.sanitastroesch.ch/multimedia/Web/PS1/01441791_000_000.png",
    "type": "Zubehör",
    "menge": 1
  },
  {
    "artNr": "1445 782.000.000",
    "label": "Schallschutzset Alterna - Stahl, zu Duschenwannenträger bis 2000 x 1000 mm, zu Stahlwannen, 1 PU Kleber MDI- frei, 2 Mineralfasermatte, 3 Bitumenmatten 400 x 150 mm, Reinigungstuch (zur Montage auf Betonboden)",
    "type": "Zubehör",
    "imgUrl": "https://profishop.sanitastroesch.ch/multimedia/Web/PG1/01445782_000_000.png",
    "menge": 1
  }
];

let linkedCount = 0;

data.duschenwanne.trays.forEach(t => {
  if (t.manufacturer === 'Schmidlin') {
    const sizeMatch = (t.size || '').match(/(\d+(?:\.\d+)?)\s*x\s*(\d+(?:\.\d+)?)\s*x\s*(\d+(?:\.\d+)?)/);
    if (!sizeMatch) return;
    
    let l = parseFloat(sizeMatch[1]);
    let w = parseFloat(sizeMatch[2]);
    const h = parseFloat(sizeMatch[3]);
    
    if (w > l) { const temp = l; l = w; w = temp; }
    
    const key = l + 'x' + w + 'x' + h;
    const carrier = carrierMap.get(key);
    
    if (carrier) {
      if (!t.mountingMaterials) t.mountingMaterials = [];
      
      // Check if carrier is already linked
      if (t.mountingMaterials.find(m => m.id === 'mat_carrier')) return;
      
      // Pre-existing rules for Viva, Floor, Contura -> they ONLY support Omnia!
      // The user explicitly stated in a previous task:
      // "Series Viva only supports Montagerahmen Omnia"
      // "Series Schmidlin Floor also only supports Montagerahmen Omnia"
      // "Series Contura also only supports Montagerahmen Omnia"
      const lblLower = t.label.toLowerCase();
      if (lblLower.includes('viva') || lblLower.includes('floor') || lblLower.includes('contura')) {
        return; // skip these per the user's previous exclusive rule
      }
      
      t.mountingMaterials.push({
        "id": "mat_carrier",
        "name": "Wannenträger System",
        "options": [
          {
            "artNr": carrier.artNr,
            "label": carrier.label,
            "imgUrl": carrier.imgUrl || "https://profishop.sanitastroesch.ch/multimedia/Web/PS1/01441021-063_000_000.png",
            "type": "Zubehör",
            "menge": 1
          }
        ],
        "bundle": BUNDLE
      });
      linkedCount++;
    }
  }
});

fs.writeFileSync(dataFile, JSON.stringify(data, null, 2));
console.log('Successfully linked carriers to ' + linkedCount + ' Schmidlin trays.');
