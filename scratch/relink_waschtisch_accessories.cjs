const fs = require('fs');
const path = require('path');

const dataPath = path.resolve(__dirname, '../custom-data.json');
const libraryPath = path.resolve(__dirname, 'shower_accessory_library.json');
const csvPath = path.resolve(__dirname, '../WT_schallschutz_wanne.csv');

// 1. Read CSV and add to library
const csvContent = fs.readFileSync(csvPath, 'utf8').split('\n').slice(1).filter(l => l.trim().length > 0);
const newAccessories = [];

for (const line of csvContent) {
    // Basic CSV parse (handles simple quotes)
    const matches = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g);
    if (!matches) continue;
    const parts = line.split(',');
    const artNr = parts[0].trim();
    const brand = parts.length > 2 ? parts[2].trim() : 'Andere';
    let label = line.substring(line.indexOf('"') + 1, line.lastIndexOf('"'));
    if (!label) {
        // Fallback
        label = parts[1];
    }
    
    const acc = {
        artNr,
        label,
        manufacturer: brand,
        w: null,
        h: null,
        depth: null,
        imgUrl: `https://profishop.sanitastroesch.ch/multimedia/Web/PG1/0${artNr.replace(/\s+/g, '').replace(/\./g, '_')}.png`
    };
    newAccessories.push(acc);
}

const library = JSON.parse(fs.readFileSync(libraryPath, 'utf8'));
for (const na of newAccessories) {
    if (!library.some(a => a.artNr === na.artNr)) {
        library.push(na);
    }
}
fs.writeFileSync(libraryPath, JSON.stringify(library, null, 2));

// 2. Relink Waschtische
const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

if (!data.waschtisch || !data.waschtisch.trays) {
    console.log("No Waschtische found.");
    process.exit(1);
}

let updated = 0;
data.waschtisch.trays.forEach(basin => {
    // Extract width from size (usually the first or max number)
    let widthCm = 0;
    if (basin.size) {
        const dims = basin.size.replace(',', '.').match(/([\d.]+)/g);
        if (dims && dims.length > 0) {
            // Find max dimension in cm
            const maxDim = Math.max(...dims.map(d => parseFloat(d)));
            // Some sizes might be in mm by mistake, let's normalize (if > 300, it's mm, divide by 10 to get cm)
            widthCm = maxDim > 300 ? maxDim / 10 : maxDim;
        }
    } else {
        // Fallback to extract from label
        const match = basin.label.match(/([\d.]+)\s*x/);
        if (match) {
            const w = parseFloat(match[1].replace(',', '.'));
            widthCm = w > 300 ? w / 10 : w;
        }
    }

    if (widthCm > 0) {
        let setArtNr = null;
        if (widthCm <= 80) setArtNr = "3171 110.000.000";
        else if (widthCm <= 110) setArtNr = "3171 120.000.000";
        else if (widthCm <= 160) setArtNr = "3171 150.000.000";
        else setArtNr = "3171 160.000.000";

        const acousticSet = library.find(a => a.artNr === setArtNr);
        
        if (acousticSet) {
            if (!basin.mountingMaterials) basin.mountingMaterials = [];
            
            // Remove existing acoustic sets if any
            basin.mountingMaterials = basin.mountingMaterials.filter(m => !m.options.some(o => o.artNr.startsWith('3171')));

            basin.mountingMaterials.push({
                id: 'mat_schallschutz',
                name: 'Schallschutz Iso-Set',
                options: [{
                    ...acousticSet,
                    type: 'Zubehör',
                    menge: 1
                }]
            });
            updated++;
        }
    }
});

fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
console.log(`Successfully linked Hafner acoustic sets to ${updated} washbasins.`);
