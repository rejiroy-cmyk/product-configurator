const fs = require('fs');
const path = require('path');

const csvPro = fs.readFileSync(path.join(__dirname, '../Vorlage_Duschenwanne/Vorlage_Import_Konfigurator laufen Pro.csv'), 'utf8');
const csvProS = fs.readFileSync(path.join(__dirname, '../Vorlage_Duschenwanne/Vorlage_Import_Konfigurator laufen Pro S.csv'), 'utf8');

const parseCsv = (csv) => {
    const lines = csv.split(/\r?\n/).filter(line => line.trim() !== '');
    const data = [];
    // skip header
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
        
        if (values.length >= 6) {
            data.push({
                artNr: values[0].replace(/\s/g, ''),
                label: values[1],
                manufacturer: values[2],
                size: values[3],
                material: values[4],
                form: values[5]
            });
        }
    }
    return data;
};

const traysPro = parseCsv(csvPro);
const traysProS = parseCsv(csvProS);

let dataPath = path.join(__dirname, '../custom-data.json');
let data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

let duschenwanne = data['duschenwanne'] || { trays: [] };
let existingArtNrs = new Set(duschenwanne.trays.map(t => t.artNr.replace(/\s/g, '')));

let missing = [...traysPro, ...traysProS].filter(t => !existingArtNrs.has(t.artNr));
console.log("Missing in custom-data.json:", missing.length);

missing.forEach(t => {
    duschenwanne.trays.push({
        id: 'lauf_' + t.artNr,
        artNr: t.artNr.replace(/(\d{4})(\d{3})(\d{3})/, '$1 $2.$3'), 
        label: t.label,
        manufacturer: t.manufacturer,
        size: t.size,
        material: t.material,
        form: t.form,
        serie: 'Laufen Pro',
        imgUrl: `https://profishop.sanitastroesch.ch/multimedia/Web/PG1/0${t.artNr}.png`
    });
});

if (missing.length > 0) {
    fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
    console.log("Added and saved!");
}

