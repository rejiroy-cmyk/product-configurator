const fs = require('fs');
const path = require('path');

const csvPro = fs.readFileSync(path.join(__dirname, '../Vorlage_Duschenwanne/Vorlage_Import_Konfigurator laufen Pro.csv'), 'utf8');

const parseCsv = (csv) => {
    const lines = csv.split(/\r?\n/).filter(line => line.trim() !== '');
    // skip header
    const data = lines.slice(1).map(line => {
        const match = line.match(/(?:^|,)("(?:[^"]|"")*"|[^,]*)/g);
        if (!match) return null;
        const row = match.map(val => {
            let v = val.replace(/^,/, '').trim();
            if (v.startsWith('"') && v.endsWith('"')) {
                v = v.slice(1, -1).replace(/""/g, '"');
            }
            return v;
        });
        if (row.length < 6) return null;
        return {
            artNr: row[0].replace(/\s/g, ''),
            label: row[1],
            manufacturer: row[2] || 'Laufen',
            size: row[3],
            material: row[4],
            form: row[5]
        };
    }).filter(Boolean);
    return data;
};

const traysPro = parseCsv(csvPro);
console.log("Parsed from CSV:", traysPro.length);
if (traysPro.length > 0) {
    console.log("First item:", traysPro[0]);
}

let dataPath = path.join(__dirname, '../custom-data.json');
let data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

let duschenwanne = data['duschenwanne'] || { trays: [] };
let existingArtNrs = new Set(duschenwanne.trays.map(t => t.artNr.replace(/\s/g, '')));

let missing = traysPro.filter(t => !existingArtNrs.has(t.artNr));
console.log("Missing in custom-data.json:", missing.length);

