import fs from 'fs';
const data = JSON.parse(fs.readFileSync('./custom-data.json', 'utf8'));
const trays = data.waschtisch.trays;
console.log("Total Trays:", trays.length);
const newTrays = trays.slice(-5);
newTrays.forEach(t => {
    let text = (t.label || '').toLowerCase();
    let hl = text.includes('loch') || text.includes('armaturenloch') ? '1' : 'unknown';
    let ul = text.includes('überlauf') || text.includes('ueberlauf') ? 'mit' : 'unknown';
    console.log(`- ${t.label}\n  HL: ${hl}, UL: ${ul}`);
});
