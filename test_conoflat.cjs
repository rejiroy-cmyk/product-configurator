const fs = require('fs');
const data = JSON.parse(fs.readFileSync('original-shower-data.json', 'utf8'));

const cono = data.filter(i => i.artNr === '1313 258.100.000')[0];
if (!cono) { console.log('not found'); process.exit(1); }

const sizeLabel = (cono.size || '').toLowerCase();
let l = 0, w = 0, maxSide = 0;
if (sizeLabel && sizeLabel.includes('x')) {
    const parts = sizeLabel.split('x').map(p => parseFloat(p.replace(/[^0-9.]/g, '')));
    if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
        l = parts[0];
        w = parts[1];
        maxSide = Math.max(l, w);
    }
}
console.log('Size:', sizeLabel);
console.log('l:', l, 'w:', w, 'maxSide:', maxSide);
