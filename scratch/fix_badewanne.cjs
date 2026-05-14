const fs = require('fs');

const dataPath = '/Users/jenistonsellathamby/Desktop/product-configurator/custom-data.json';
const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

let fixedCount = 0;

data.badewanne.trays.forEach(tray => {
    if (tray.mountingMaterials && tray.mountingMaterials.length > 0) {
        // If the first item doesn't have 'options', it's the flat structure
        if (!tray.mountingMaterials[0].options) {
            const newMaterials = tray.mountingMaterials.map(mat => {
                return {
                    id: 'mat_' + Math.random().toString(36).substr(2, 5),
                    name: mat.label ? mat.label.split(' ')[0] : 'Zubehör',
                    options: [{
                        artNr: mat.artNr || '',
                        label: mat.label || '',
                        type: mat.type || 'Zubehör',
                        imgUrl: mat.imgUrl || ''
                    }]
                };
            });
            tray.mountingMaterials = newMaterials;
            fixedCount++;
        }
    }
});

if (fixedCount > 0) {
    fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
    console.log(`Fixed ${fixedCount} Badewanne items to use the standard group -> options structure.`);
} else {
    console.log('No Badewanne items needed fixing.');
}
