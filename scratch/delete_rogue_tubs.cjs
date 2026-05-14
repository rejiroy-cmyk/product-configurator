const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'custom-data.json');
const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

const rogueArtNrs = [
    '1111 258.100.000',
    '1111 264.100.000',
    '1111 251.100.000',
    '1111 263.100.000',
    '1111 262.100.000',
    '1111 261.100.000',
    '1111 252.100.000',
    '1111 253.100.000',
    '1111 257.100.000',
    '1111 254.100.000',
];

const before = data.badewanne.trays.length;
data.badewanne.trays = data.badewanne.trays.filter(t => !rogueArtNrs.includes(t.artNr));
const after = data.badewanne.trays.length;

fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
console.log(`Done. Removed ${before - after} rogue tubs. Total bathtubs now: ${after}`);
