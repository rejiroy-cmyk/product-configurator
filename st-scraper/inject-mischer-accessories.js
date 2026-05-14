const fs = require('fs');
const path = require('path');

const dataPath = path.resolve(__dirname, '../custom-data.json');
const accessoriesPath = path.resolve(__dirname, 'mischer-accessories.json');

if (!fs.existsSync(dataPath) || !fs.existsSync(accessoriesPath)) {
    console.log("Missing data files.");
    process.exit(1);
}

const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
const accessoriesData = JSON.parse(fs.readFileSync(accessoriesPath, 'utf8'));

let updatedCount = 0;

if (data.duschenmischer && data.duschenmischer.trays) {
    data.duschenmischer.trays.forEach(tray => {
        const acc = accessoriesData[tray.artNr];
        if (acc) {
            // Keep existing non-scraped items if any, though normally we'd replace the relevant ones.
            // For a clean state, let's rebuild the mountingMaterials array.
            tray.mountingMaterials = [];

            // Helper to add a group if it has options
            const addGroup = (name, type, optionsArray, defaultMenge = 1) => {
                if (optionsArray && optionsArray.length > 0) {
                    tray.mountingMaterials.push({
                        id: `${type.toLowerCase()}_${tray.artNr.replace(/\s/g, '')}`,
                        name: name,
                        options: [
                            ...optionsArray.map(opt => ({
                                artNr: opt.artNr,
                                label: opt.label,
                                type: type,
                                menge: defaultMenge
                            })),
                            {
                                artNr: 'none',
                                label: 'Ohne ' + name,
                                type: type,
                                menge: 0
                            }
                        ]
                    });
                }
            };

            // STRICT 8-STEP HIERARCHY
            // 1. Endmontageset (This is the main product tray, no need to inject)
            
            // 2. Abstellverschraubung (Needs quantity 2 for Aufputz)
            addGroup('Abstellverschraubung', 'Abstellverschraubung', acc.abstellverschraubung, 2);

            // 3. Grundkörper
            addGroup('Grundkörper', 'Grundkörper', acc.grundkoerper);
            
            // 4. Montageschiene
            addGroup('Montageschiene / Montageset', 'Montageschiene', acc.montageschiene);
            
            // 5. Anschlussbogen
            addGroup('Anschlussbogen', 'Anschlussbogen', acc.anschlussbogen);
            
            // 5. Brauseschlauch
            addGroup('Brauseschlauch', 'Brauseschlauch', acc.brauseschlauch);
            
            // 6. Handbrause
            addGroup('Handbrause', 'Handbrause', acc.handbrause);
            
            // 7. Brausehalter
            addGroup('Brausehalter', 'Brausehalter', acc.brausehalter);
            
            // 8. Duschengleitstange
            addGroup('Duschengleitstange', 'Gleitstange', acc.gleitstange);

            updatedCount++;
        }
    });
}

fs.writeFileSync(dataPath, JSON.stringify(data, null, 4));
console.log(`Successfully injected accessories into ${updatedCount} Duschenmischer products in custom-data.json!`);
