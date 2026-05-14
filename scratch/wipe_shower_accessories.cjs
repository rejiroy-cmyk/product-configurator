const fs = require('fs');
const path = require('path');

const dataPath = '/Users/jenistonsellathamby/Desktop/product-configurator/custom-data.json';

function wipe() {
    console.log('--- STARTING SELECTIVE SHOWER ACCESSORY WIPE ---');
    if (!fs.existsSync(dataPath)) {
        console.error('Data file not found!');
        return;
    }

    let data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
    let wipedCount = 0;
    let skippedCount = 0;

    if (data.duschenwanne && data.duschenwanne.trays) {
        data.duschenwanne.trays.forEach(tray => {
            const lbl = tray.label.toLowerCase();
            // Exclusion logic
            if (lbl.includes('calima') || lbl.includes('laufen pro')) {
                skippedCount++;
                return;
            }

            if (tray.mountingMaterials && tray.mountingMaterials.length > 0) {
                tray.mountingMaterials = [];
                wipedCount++;
            }
        });
    }

    fs.writeFileSync(dataPath, JSON.stringify(data));
    console.log(`\nWIPE COMPLETE:`);
    console.log(` - Trays Wiped: ${wipedCount}`);
    console.log(` - Trays Skipped (Exclusion List): ${skippedCount}`);
}

wipe();
