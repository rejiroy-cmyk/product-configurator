const fs = require('fs');
const data = JSON.parse(fs.readFileSync('./custom-data.json', 'utf8'));
let count = 0;

Object.keys(data).forEach(appKey => {
    const app = data[appKey];
    if (app.trays) {
        app.trays.forEach(t => {
            if (t.label && t.label.includes('Bademischer-Endmontageset Laufen')) {
                console.log(`Found in app ${appKey}:`, t.label, t.artNr);
                count++;
            }
        });
    }
});
console.log(`Total found: ${count}`);
