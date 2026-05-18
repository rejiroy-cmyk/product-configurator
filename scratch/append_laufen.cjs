const fs = require('fs');
const path = require('path');

const csvPro = fs.readFileSync(path.join(__dirname, '../Vorlage_Duschenwanne/Vorlage_Import_Konfigurator laufen Pro.csv'), 'utf8');
const csvProS = fs.readFileSync(path.join(__dirname, '../Vorlage_Duschenwanne/Vorlage_Import_Konfigurator laufen Pro S.csv'), 'utf8');

const parseCsv = (csv) => {
    const lines = csv.split(/\r?\n/).filter(line => line.trim() !== '');
    // skip header
    const data = lines.slice(1).map(line => {
        // Simple regex to split by comma outside quotes
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
const traysProS = parseCsv(csvProS);

let dataPath = path.join(__dirname, '../custom-data.json');
let data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

let duschenwanne = data['duschenwanne'] || { trays: [] };
let existingArtNrs = new Set(duschenwanne.trays.map(t => t.artNr.replace(/\s/g, '')));

let added = 0;
const addTrays = (trays, serie) => {
    trays.forEach(t => {
        if (!existingArtNrs.has(t.artNr)) {
            duschenwanne.trays.push({
                id: 'lauf_' + t.artNr,
                artNr: t.artNr.replace(/(\d{4})(\d{3})(\d{3})(\d{3})/, '$1 $2.$3.$4'), // Format as "1171 398.536.000" if possible, but actually let's just use raw or basic formatting
                label: t.label,
                manufacturer: t.manufacturer,
                size: t.size,
                material: t.material,
                form: t.form,
                serie: serie,
                imgUrl: `https://profishop.sanitastroesch.ch/multimedia/Web/PG1/0${t.artNr}.png`
            });
            existingArtNrs.add(t.artNr);
            added++;
        }
    });
};

addTrays(traysPro, 'Pro');
addTrays(traysProS, 'Pro S');

data['duschenwanne'] = duschenwanne;
fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));

console.log(`Added ${added} new Laufen trays.`);
