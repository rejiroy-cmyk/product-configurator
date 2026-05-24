const fs = require('fs');
const dataFile = 'custom-data.json';
const data = JSON.parse(fs.readFileSync(dataFile, 'utf8'));

let modifiedCount = 0;

if (data.duschenwanne && data.duschenwanne.trays) {
    data.duschenwanne.trays.forEach(t => {
        if ((t.label || '').toLowerCase().includes('vario')) {
            t.serie = 'Vario (Massgeschneidert)';
            modifiedCount++;
        }
    });
}

fs.writeFileSync(dataFile, JSON.stringify(data, null, 2));
console.log('Successfully bundled ' + modifiedCount + ' Vario trays.');
