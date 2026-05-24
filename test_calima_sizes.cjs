const fs = require('fs');
const data = JSON.parse(fs.readFileSync('custom-data.json', 'utf8'));

let calimas = data.duschenwanne.trays.filter(t => t.label.toLowerCase().includes('calima'));
console.log('Total Calima Trays:', calimas.length);

let withWT = calimas.filter(t => {
    if (!t.mountingMaterials) return false;
    return t.mountingMaterials.some(m => m.id === 'mat_wannentraeger' || (m.name || '').toLowerCase().includes('träger'));
});
console.log('Calima Trays WITH Wannenträger:', withWT.length);
console.log('Sizes with WT:', withWT.map(t => t.size).join(', '));
