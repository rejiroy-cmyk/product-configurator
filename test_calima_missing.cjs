const fs = require('fs');
const data = JSON.parse(fs.readFileSync('custom-data.json', 'utf8'));

let calimas = data.duschenwanne.trays.filter(t => t.label.toLowerCase().includes('calima'));
let noWT = calimas.filter(t => {
    if (!t.mountingMaterials) return true;
    return !t.mountingMaterials.some(m => m.id === 'mat_carrier' || (m.name || '').toLowerCase().includes('träger'));
});
console.log('Total Calima:', calimas.length);
console.log('Without WT:', noWT.length);
noWT.forEach(t => console.log(t.size));
