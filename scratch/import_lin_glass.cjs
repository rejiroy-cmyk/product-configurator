const fs = require('fs');

const customDataPath = './custom-data.json';
const csvPath = './lin.csv';

function parseCsv(content) {
    const lines = content.split(/\r?\n/).filter(l => l.trim());
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    
    const products = [];
    let currentProduct = null;

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
        const size = cols[3];

        if (!label || label === 'Label') continue;

        const cleanLabel = label.replace(/^["']|["']$/g, '').trim();
        const isService = cleanLabel.startsWith('Montagepauschale') || 
                          cleanLabel.startsWith('Massaufnahme') || 
                          cleanLabel.startsWith('Anfahrtspauschale');

        if (!isService) {
            // New Main Product
            currentProduct = {
                id: 'lin_' + artNr.replace(/\s+/g, '_'),
                label: cleanLabel,
                artNr: artNr,
                manufacturer: manufacturer || 'Alterna',
                serie: cleanLabel.includes('lin.3') || cleanLabel.includes('lin3') ? 'lin.3' : 'lin',
                size: size || extractSizeFromLabel(cleanLabel),
                services: []
            };
            products.push(currentProduct);
        } else if (currentProduct) {
            // Service for the current main product
            currentProduct.services.push({
                artNr: artNr,
                label: cleanLabel,
                qty: 1
            });
        }
    }
    return products;
}

function extractSizeFromLabel(label) {
    const m = label.match(/(\d+\.?\d*)\s*[xX]\s*(\d+\.?\d*)/);
    return m ? `${m[1]} x ${m[2]}` : '';
}

// 1. Load CSV
const csvContent = fs.readFileSync(csvPath, 'utf8');
const newGlass = parseCsv(csvContent);

// 2. Load Existing Custom Data
let customData = { duschtrennwand: { trays: [] } };
if (fs.existsSync(customDataPath)) {
    customData = JSON.parse(fs.readFileSync(customDataPath, 'utf8'));
}

// 3. Update duschtrennwand.trays
// We replace the old trays with new ones if they have the same ArtNr, or just append
if (!customData.duschtrennwand) customData.duschtrennwand = { trays: [] };

// For this specific task, we'll replace the Alterna lin.3 collection entirely to avoid duplicates
const otherTrays = customData.duschtrennwand.trays.filter(t => !t.label.includes('lin.3'));
customData.duschtrennwand.trays = [...otherTrays, ...newGlass];

// 4. Save
fs.writeFileSync(customDataPath, JSON.stringify(customData, null, 2));

console.log(`✅ Successfully imported ${newGlass.length} main glass products with their services into custom-data.json`);
