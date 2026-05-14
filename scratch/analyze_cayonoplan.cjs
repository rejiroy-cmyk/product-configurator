const fs = require('fs');
const data = JSON.parse(fs.readFileSync('/Users/jenistonsellathamby/Desktop/product-configurator/custom-data.json', 'utf8'));

const cayoTrays = data.duschenwanne.trays.filter(t => (t.label || '').toLowerCase().includes('cayonoplan'));

cayoTrays.forEach(t => {
    const carrierMat = t.mountingMaterials && t.mountingMaterials.find(m => m.name.includes('Wannenträger Cayonoplan'));
    if (!carrierMat || !carrierMat.options || carrierMat.options.length === 0) {
        console.log(`TRAY: ${t.label} => NO CARRIER LINKED!`);
    } else {
        console.log(`TRAY: ${t.label} => LINKED TO => ${carrierMat.options[0].label}`);
    }
});
