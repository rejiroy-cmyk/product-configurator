const fs = require('fs');

const dataFile = './custom-data.json';
let customData = {};
if (fs.existsSync(dataFile)) {
    customData = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
}

if (!customData['duschenmischer']) customData['duschenmischer'] = { trays: [], mainImgUrl: 'https://profishop.sanitastroesch.ch/multimedia/Web/PG1/01113324.png' };
if (!customData['bademischer']) customData['bademischer'] = { trays: [], mainImgUrl: 'https://profishop.sanitastroesch.ch/multimedia/Web/PG1/06410221_463_000.png' };

const parseCsvLine = (line, delimiter) => {
    const cols = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (inQuotes) {
            if (char === '"') {
                if (line[i+1] === '"') { current += '"'; i++; } // Escaped quote
                else inQuotes = false;
            } else current += char;
        } else {
            if (char === '"') inQuotes = true;
            else if (char === delimiter) { cols.push(current); current = ''; }
            else current += char;
        }
    }
    cols.push(current);
    return cols.map(c => c.trim());
};

const csvFile = './Wandbatterie_alterna_mischer.csv';
const lines = fs.readFileSync(csvFile, 'utf8').split(/\r?\n/).filter(l => l.trim().length > 0);

let addedDuschen = 0;
let addedBade = 0;

for (const line of lines) {
    const cols = parseCsvLine(line, ','); // simple CSV uses comma or semicolon?
    if (cols.length < 2) continue;
    
    // In our Wandbatterie CSV it's Brand, ArtNr, Label, Menge? Actually it's simple CSV.
    // So let's extract by matching
    let artNr = cols[1] || '';
    if (!artNr.match(/\d{4} \d{3}\.\d{3}\.\d{3}/)) {
        artNr = cols[0];
    }
    const label = cols[cols.length > 2 ? 2 : 1] || '';
    const manufacturer = cols.length > 3 ? cols[3] : 'Alterna';
    const menge = 1;

    let targetAppId = 'duschenmischer'; // default fallback
    const lblLower = label.toLowerCase();
    
    if (lblLower.includes('bademischer') || lblLower.includes('wannen')) {
        targetAppId = 'bademischer';
    } else if (lblLower.includes('duschmischer') || lblLower.includes('duschenmischer') || lblLower.includes('wandbatterie') || lblLower.includes('wandmischer')) {
        targetAppId = 'duschenmischer';
    }
    
    let productImgUrl = undefined;
    const parts = artNr.replace(/\s/g, '').split('.');
    if (parts.length >= 3) {
        productImgUrl = `https://profishop.sanitastroesch.ch/multimedia/Web/PG1/${parts[0].padStart(8, '0')}_${parts[1]}_${parts[2]}.png`;
    }
    
    const existing = customData[targetAppId].trays.find(t => t.artNr === artNr);
    if (existing) continue;

    const currentTray = { 
        id: 'csv_'+Math.random().toString(36).substr(2,5), 
        manufacturer, form: "Standard", size: "Standard", artNr, label, menge,
        imgUrl: productImgUrl,
        variants: [], mountingMaterials: []
    };
    
    customData[targetAppId].trays.push(currentTray);
    if (targetAppId === 'duschenmischer') addedDuschen++;
    if (targetAppId === 'bademischer') addedBade++;
}

fs.writeFileSync(dataFile, JSON.stringify(customData, null, 2));
console.log(`Successfully built configurator data! Duschenmischer: ${addedDuschen}, Bademischer: ${addedBade}`);
