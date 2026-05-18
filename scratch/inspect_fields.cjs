const fs = require('fs');
const path = require('path');

const data = JSON.parse(fs.readFileSync('/Users/jenistonsellathamby/Desktop/product-configurator/custom-data.json', 'utf8'));

// Helper to parse a simple CSV to map of ArtNr -> Label
function getCsvLabels(filePath) {
    if (!fs.existsSync(filePath)) return {};
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split(/\r?\n/).filter(l => l.trim() !== '');
    const map = {};
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        let inQuotes = false;
        let values = [];
        let curVal = '';
        for (let j = 0; j < line.length; j++) {
            const c = line[j];
            if (c === '"') {
                inQuotes = !inQuotes;
            } else if (c === ',' && !inQuotes) {
                values.push(curVal);
                curVal = '';
            } else {
                curVal += c;
            }
        }
        values.push(curVal);
        if (values.length >= 2) {
            const artNr = values[0].trim();
            const label = values[1].trim();
            if (artNr && label) {
                map[artNr.replace(/\s/g,'')] = label;
            }
        }
    }
    return map;
}

const csvFiles = [
    '/Users/jenistonsellathamby/Desktop/product-configurator/dw_kaldewei.csv',
    '/Users/jenistonsellathamby/Desktop/product-configurator/swissline.csv',
    '/Users/jenistonsellathamby/Desktop/product-configurator/import_bathtubs_updated.csv',
    '/Users/jenistonsellathamby/Desktop/product-configurator/bw mit loch.csv'
];

// Let's also scan Vorlage_Duschenwanne directory for CSVs
const vorlageDir = '/Users/jenistonsellathamby/Desktop/product-configurator/Vorlage_Duschenwanne';
if (fs.existsSync(vorlageDir)) {
    const files = fs.readdirSync(vorlageDir);
    files.forEach(f => {
        if (f.endsWith('.csv')) {
            csvFiles.push(path.join(vorlageDir, f));
        }
    });
}

const csvMap = {};
csvFiles.forEach(f => {
    Object.assign(csvMap, getCsvLabels(f));
});

console.log(`Loaded ${Object.keys(csvMap).length} labels from CSV files.`);

let count = 0;
['duschenwanne', 'badewanne'].forEach(cat => {
    data[cat].trays.forEach(t => {
        const cleanArt = t.artNr.replace(/\s/g,'');
        const csvLabel = csvMap[cleanArt];
        if (csvLabel) {
            const currentLen = t.label.length;
            const csvLen = csvLabel.length;
            if (csvLen > currentLen + 5) {
                count++;
                console.log(`\nArtNr: ${t.artNr} (${cat})`);
                console.log(` - Current (${currentLen} chars): "${t.label}"`);
                console.log(` - CSV (${csvLen} chars): "${csvLabel}"`);
            }
        }
    });
});

console.log(`\nTotal trays with shorter labels in custom-data.json than in CSVs: ${count}`);
