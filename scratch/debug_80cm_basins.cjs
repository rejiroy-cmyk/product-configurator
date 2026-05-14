const fs = require('fs');
const data = JSON.parse(fs.readFileSync('custom-data.json', 'utf8'));

const basins = data.waschtisch ? data.waschtisch.trays : (data.mixandmatch ? data.mixandmatch.basinTrays : []);

function extractBreite(obj) {
    const label = (obj.label || obj.name || '');
    const bMatch = label.match(/(?:Breite|B)[:\s]+([\d,.]+)\s*(cm|mm)?/i);
    if (bMatch) {
        let val = bMatch[1].replace(',', '.');
        let unit = (bMatch[2] || 'mm').toLowerCase();
        if (unit === 'mm' || parseFloat(val) > 250) return (parseFloat(val) / 10);
        return parseFloat(val);
    }
    const size = (obj.size || '');
    const match = size.match(/^(\d+(?:[.,]\d+)?)/);
    return match ? parseFloat(match[1].replace(',', '.')) : 'unknown';
}

console.log('80cm Basins:');
basins.forEach(b => {
    const w = extractBreite(b);
    if (w === 80 || Math.round(w) === 80) {
        console.log(`- [${w}] ${b.label.substring(0, 80)}...`);
    }
});
