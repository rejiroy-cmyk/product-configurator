const fs = require('fs');
const data = JSON.parse(fs.readFileSync('custom-data.json', 'utf8'));

let calima = data.duschenwanne.trays.find(t => t.label.toLowerCase().includes('calima'));
let wt = calima.mountingMaterials.find(m => m.id === 'mat_wannentraeger' || (m.name || '').toLowerCase().includes('träger'));
console.log(JSON.stringify(wt, null, 2));
