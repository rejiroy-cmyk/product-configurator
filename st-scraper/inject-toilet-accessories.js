const fs = require('fs');
const path = require('path');

const dataPath = path.resolve(__dirname, '../custom-data.json');
const accessoriesPath = path.resolve(__dirname, 'toilet-accessories.json');

if (!fs.existsSync(dataPath) || !fs.existsSync(accessoriesPath)) {
    console.log("Missing data files.");
    process.exit(1);
}

const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
const accessoriesData = JSON.parse(fs.readFileSync(accessoriesPath, 'utf8'));

let updatedCount = 0;

['wandklosett', 'standklosett'].forEach(category => {
    if (data[category] && data[category].trays) {
        data[category].trays.forEach(tray => {
            const acc = accessoriesData[tray.artNr];
            if (acc) {
                // Preserve existing items that are NOT seats, isolations, or sleeves
                if (!tray.mountingMaterials) {
                    tray.mountingMaterials = [];
                } else {
                    tray.mountingMaterials = tray.mountingMaterials.filter(m => 
                        !m.name.includes('WC-Sitz') && 
                        !m.name.includes('Schallschutz') && 
                        !m.name.includes('Manschette')
                    );
                }

                // 1. Inject Seats
                if (acc.seats && acc.seats.length > 0) {
                    tray.mountingMaterials.push({
                        id: 'wc_sitz_' + tray.artNr.replace(/\s/g, ''),
                        name: 'WC-Sitz',
                        options: acc.seats.map(s => ({
                            artNr: s.artNr,
                            label: s.label,
                            type: 'WC-Sitz',
                            menge: 1
                        }))
                    });
                }

                // 2. Inject Schallschutz
                if (acc.isolation && acc.isolation.length > 0) {
                    tray.mountingMaterials.push({
                        id: 'schallschutz_' + tray.artNr.replace(/\s/g, ''),
                        name: 'Schallschutz',
                        options: acc.isolation.map(i => ({
                            artNr: i.artNr,
                            label: i.label,
                            type: 'Schallschutz',
                            menge: 1
                        }))
                    });
                }

                // 3. Inject Specific Sleeves if found (overrides the default Manschettengarnitur)
                if (acc.sleeves && acc.sleeves.length > 0) {
                    tray.mountingMaterials.push({
                        id: 'manschette_' + tray.artNr.replace(/\s/g, ''),
                        name: 'Manschette',
                        options: acc.sleeves.map(sl => ({
                            artNr: sl.artNr,
                            label: sl.label,
                            type: 'Technik',
                            menge: 1
                        }))
                    });
                }

                updatedCount++;
            }
        });
    }
});

fs.writeFileSync(dataPath, JSON.stringify(data, null, 4));
console.log(`Successfully injected accessories into ${updatedCount} toilets in custom-data.json!`);
