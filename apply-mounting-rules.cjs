const fs = require('fs');

const dataFile = 'custom-data.json';
const data = JSON.parse(fs.readFileSync(dataFile, 'utf8'));

// 1. Gather Swiss Line Sets
let omniaItems = [];
data.duschenwanne.trays.forEach(t => {
  if (t.mountingMaterials) {
    t.mountingMaterials.forEach(m => {
      if (m.options) {
        m.options.forEach(o => {
          if (o.label && o.label.toLowerCase().includes('omnia')) omniaItems.push(o);
        });
      }
    });
  }
});
if (data.zubehoer_pool) {
    data.zubehoer_pool.trays.forEach(z => {
      if (z.label && z.label.toLowerCase().includes('omnia')) omniaItems.push(z);
    });
}
const swissLineSets = [...new Map(omniaItems.filter(i => i.label.toLowerCase().includes('swiss line')).map(item => [item.artNr, item])).values()];

let modifiedCount = 0;

data.duschenwanne.trays.forEach(t => {
    if (!t.label || !t.mountingMaterials) return;
    
    const labelLower = t.label.toLowerCase();
    
    // RULE 1, 2, 3: Viva, Floor, Contura ONLY support Montagerahmen Omnia
    if (labelLower.includes('viva') || labelLower.includes('floor') || labelLower.includes('contura')) {
        const originalCount = t.mountingMaterials.length;
        // Keep only siphon, deckel, tape, and frame
        t.mountingMaterials = t.mountingMaterials.filter(m => {
            return m.id === 'mat_siphon' || m.id === 'mat_deckel' || m.id === 'mat_tape' || m.id === 'mat_frame';
        });
        
        // Also ensure selections are updated (remove removed items from selections)
        if (t.selections) {
            Object.keys(t.selections).forEach(key => {
                if (!['mat_siphon', 'mat_deckel', 'mat_tape', 'mat_frame'].includes(key)) {
                    delete t.selections[key];
                }
            });
        }
        
        if (t.mountingMaterials.length !== originalCount) {
            modifiedCount++;
        }
    }
    
    // RULE 4: Swiss Line uses ALL IN ONE mounting set
    if (labelLower.includes('swiss line')) {
        const dimMatch = t.label.match(/(\d{3,4})\s*x\s*(\d{3,4})/);
        if (dimMatch) {
            const l = parseInt(dimMatch[1]);
            const w = parseInt(dimMatch[2]);
            const matchedSet = swissLineSets.find(s => s.label.includes(`${l} x ${w}`) || s.label.includes(`${w} x ${l}`));
            
            if (matchedSet) {
                t.mountingMaterials = [
                    {
                        id: "mat_frame",
                        name: "Duschen- Montageset",
                        options: [
                            {
                                artNr: matchedSet.artNr,
                                label: matchedSet.label,
                                type: "montagerahmen",
                                imgUrl: matchedSet.imgUrl || "https://profishop.sanitastroesch.ch/multimedia/Web/PG1/01435167.png",
                                menge: 1
                            }
                        ],
                        bundle: [],
                        bundleRules: []
                    }
                ];
                
                t.selections = {
                    "mat_frame": matchedSet.artNr
                };
                
                modifiedCount++;
            } else {
                console.warn("No matched set for Swiss Line tray:", t.label);
            }
        }
    }
});

fs.writeFileSync(dataFile, JSON.stringify(data, null, 2));
console.log('Successfully updated ' + modifiedCount + ' trays based on new mounting rules.');
