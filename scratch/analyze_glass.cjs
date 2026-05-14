const fs = require('fs');

const content = fs.readFileSync('./lin.csv', 'utf8');
const lines = content.split(/\r?\n/).filter(l => l.trim());
const headers = lines[0].split(',');

const results = [];
let currentMain = null;

function extractType(label) {
    const l = label.toLowerCase();
    if (l.includes('eckeinstieg')) return 'Eckeinstieg';
    if (l.includes('pendeltür') || l.includes('flügeltür')) return 'Pendeltür';
    if (l.includes('schiebetür')) return 'Schiebetür';
    if (l.includes('nischentür')) return 'Nischentür';
    if (l.includes('walk-in') || l.includes('walkin')) return 'Walk-In';
    if (l.includes('seitenwand') || l.includes('festwand')) return 'Seitenwand';
    return 'Andere';
}

const mainProducts = [];
const stats = {
    totalRows: lines.length - 1,
    mainCount: 0,
    serviceCount: 0,
    types: {},
    manufacturers: {}
};

for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    const cols = [];
    let cur = '';
    let inQuotes = false;
    for (let j = 0; j < line.length; j++) {
        if (line[j] === '"') inQuotes = !inQuotes;
        else if (line[j] === ',' && !inQuotes) {
            cols.push(cur.trim());
            cur = '';
        } else cur += line[j];
    }
    cols.push(cur.trim());

    const artNr = cols[0];
    const label = cols[1];
    const manufacturer = cols[2];

    if (!label) continue;

    const isService = label.startsWith('Montagepauschale') || 
                      label.startsWith('Massaufnahme') || 
                      label.startsWith('Anfahrtspauschale');

    if (!isService) {
        stats.mainCount++;
        const type = extractType(label);
        stats.types[type] = (stats.types[type] || 0) + 1;
        stats.manufacturers[manufacturer] = (stats.manufacturers[manufacturer] || 0) + 1;
    } else {
        stats.serviceCount++;
    }
}

console.log('--- ANALYSIS SUMMARY ---');
console.log(JSON.stringify(stats, null, 2));
