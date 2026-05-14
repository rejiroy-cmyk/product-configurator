const fs = require('fs');
const data = JSON.parse(fs.readFileSync('./custom-data.json', 'utf8'));

if (data.waschtisch && data.waschtisch.trays) {
    const missing = data.waschtisch.trays.filter(t => !t.label.toLowerCase().includes('abstell') && !t.label.toLowerCase().includes('ablage'));
    console.log(`Missing count: ${missing.length}`);
    if (missing.length > 0) {
        console.log(`First missing article number: ${missing[0].artNr}`);
        console.log(`First missing label: ${missing[0].label}`);
    }
}
