const fs = require('fs');
const data = JSON.parse(fs.readFileSync('custom-data.json', 'utf8'));

const pool = data.zubehoer_pool.trays;
const cabinets = pool.filter(t => (t.label || t.name || '').toLowerCase().includes('spiegelschrank'));

console.log(`Total Mirror Cabinets in Zubehör Pool: ${cabinets.length}`);

function extractBreite(obj) {
    const label = (obj.label || obj.name || '');
    // Regex from factories.js
    const bMatch = label.match(/(?:Breite|B)[:\s]+([\d,.]+)\s*(cm|mm)?/i);
    if (bMatch) {
        let val = bMatch[1].replace(',', '.');
        let unit = (bMatch[2] || 'mm').toLowerCase();
        if (unit === 'mm' || parseFloat(val) > 250) return (parseFloat(val) / 10);
        return parseFloat(val);
    }
    return 'unknown';
}

const widths = {};
cabinets.forEach(c => {
    const w = extractBreite(c);
    const rounded = w === 'unknown' ? 'unknown' : Math.round(w);
    widths[rounded] = (widths[rounded] || 0) + 1;
    if (rounded == 80) {
       // console.log(`Found 80cm: ${c.label.substring(0, 100)}...`);
    }
});

console.log('Width distribution (Rounded):');
console.log(widths);
