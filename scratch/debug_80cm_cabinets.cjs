const fs = require('fs');
const data = JSON.parse(fs.readFileSync('custom-data.json', 'utf8'));

const pool = data.zubehoer_pool.trays;
const cabinets = pool.filter(t => (t.label || t.name || '').toLowerCase().includes('spiegelschrank'));

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

console.log('80cm Cabinets:');
cabinets.forEach(c => {
    const w = extractBreite(c);
    if (w === 80 || Math.round(w) === 80) {
        console.log(`- [${w}] ${c.label.substring(0, 80)}...`);
    }
});
