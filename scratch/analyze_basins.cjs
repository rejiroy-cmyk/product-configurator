const fs = require('fs');
const data = JSON.parse(fs.readFileSync('custom-data.json', 'utf8'));

// Basins are usually in the 'waschtisch' app or 'mixandmatch'
const basins = data.waschtisch ? data.waschtisch.trays : (data.mixandmatch ? data.mixandmatch.basinTrays : []);

console.log(`Total Basins: ${basins.length}`);

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

const widthCounts = {};
basins.forEach(b => {
    const w = extractBreite(b);
    const rounded = w === 'unknown' ? 'unknown' : Math.round(w);
    widthCounts[rounded] = (widthCounts[rounded] || 0) + 1;
});

console.log('Basin Width distribution (Rounded):');
console.log(widthCounts);
