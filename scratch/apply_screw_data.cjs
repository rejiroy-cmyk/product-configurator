const fs = require('fs');

const dataPath = './custom-data.json';
const screwDataPath = './screw-data.json';

let data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
let screwData = JSON.parse(fs.readFileSync(screwDataPath, 'utf8'));

let updatedCount = 0;

data.waschtisch.trays.forEach(basin => {
    const artNr = basin.artNr;
    if (screwData[artNr]) {
        const qty = screwData[artNr];
        
        if (!basin.mountingMaterials) basin.mountingMaterials = [];
        
        // Remove existing Dübelschraube if already present to prevent duplicates
        basin.mountingMaterials = basin.mountingMaterials.filter(m => m.id !== 'mat_duebelschraube');

        // Add the Dübelschraube with the scraped quantity
        basin.mountingMaterials.push({
            id: 'mat_duebelschraube',
            name: 'Befestigung',
            options: [{
                artNr: '8211 113.000.000',
                label: 'Dübelschraube 145 mm, Länge 145 mm, Kunststoffdübel, M 12',
                type: 'Zubehör',
                menge: qty
            }]
        });
        updatedCount++;
    }
});

fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));

console.log(`Successfully added Dübelschrauben to ${updatedCount} washbasins.`);
