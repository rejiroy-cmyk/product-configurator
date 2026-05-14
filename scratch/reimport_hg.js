import fs from 'fs';

const customDataPath = './custom-data.json';
const elmPath = './ELM_hg.csv';
const wandPath = './Wandmischer_HG.csv';

function parseCsv(content) {
    const lines = content.split(/\r?\n/).filter(l => l.trim());
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    return lines.slice(1).map(line => {
        // Simple CSV parse (doesn't handle quotes perfectly but should work for these files)
        const cols = [];
        let cur = '';
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
            if (line[i] === '"') inQuotes = !inQuotes;
            else if (line[i] === ',' && !inQuotes) {
                cols.push(cur.trim());
                cur = '';
            } else cur += line[i];
        }
        cols.push(cur.trim());
        
        const obj = {};
        headers.forEach((h, i) => obj[h] = cols[i]);
        return obj;
    });
}

const customData = JSON.parse(fs.readFileSync(customDataPath, 'utf8'));

// Initialize apps if missing
if (!customData.waschtischmischer) customData.waschtischmischer = { trays: [] };
if (!customData.wandmischer) customData.wandmischer = { trays: [] };

const elmProducts = parseCsv(fs.readFileSync(elmPath, 'utf8'));
const wandProducts = parseCsv(fs.readFileSync(wandPath, 'utf8'));

function importToApp(products, appId) {
    products.forEach(p => {
        if (!p.artnr || !p.label) return;
        
        const artNr = p.artnr.trim();
        const label = p.label.trim();
        
        let manufacturer = 'Hansgrohe'; // Force for these files
        
        const parts = artNr.replace(/\s/g, '').split('.');
        const imgUrl = `https://profishop.sanitastroesch.ch/multimedia/Web/PG1/${parts[0].padStart(8, '0')}_${parts[1]}_${parts[2]}.png`;
        
        const existingIdx = customData[appId].trays.findIndex(t => t.artNr === artNr);
        const tray = {
            id: existingIdx >= 0 ? customData[appId].trays[existingIdx].id : 'csv_' + Math.random().toString(36).substr(2, 5),
            manufacturer,
            form: "Standard",
            size: "Standard",
            artNr,
            label,
            menge: 1,
            imgUrl,
            variants: [],
            mountingMaterials: []
        };
        
        if (existingIdx >= 0) customData[appId].trays[existingIdx] = tray;
        else customData[appId].trays.push(tray);
    });
}

importToApp(elmProducts, 'waschtischmischer');
importToApp(wandProducts, 'wandmischer');

fs.writeFileSync(customDataPath, JSON.stringify(customData, null, 2));
console.log(`Imported ${elmProducts.length} ELM and ${wandProducts.length} Wandmischer.`);
