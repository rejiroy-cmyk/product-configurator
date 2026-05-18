const fs = require('fs');

const currentData = JSON.parse(fs.readFileSync('/Users/jenistonsellathamby/Desktop/product-configurator/custom-data.json', 'utf8'));

// Load old HTML
const oldHtml = fs.readFileSync('/Users/jenistonsellathamby/Desktop/product-configurator/old_dist/dist/index.html', 'utf8');

function extractVarFromHtml(varName) {
    const regex = new RegExp(`(?:const\\s+|,|\\b)(${varName})\\s*=\\s*\\{`, 'g');
    let match = regex.exec(oldHtml);
    if (!match) return null;
    const startIdx = match.index + match[0].length - 1; // '{'
    let braceCount = 1;
    let endIdx = startIdx + 1;
    while (braceCount > 0 && endIdx < oldHtml.length) {
        const char = oldHtml[endIdx];
        if (char === '{') braceCount++;
        else if (char === '}') braceCount--;
        endIdx++;
    }
    const valueStr = oldHtml.substring(startIdx, endIdx);
    return eval(`(${valueStr})`);
}

const oldJe = extractVarFromHtml('Je'); // duschenwanne
const oldJeTrays = oldJe ? oldJe.trays || [] : [];
const oldJeMap = new Map(oldJeTrays.map(t => [t.artNr.replace(/\s/g,''), t]));

const oldJeBath = extractVarFromHtml('je'); // badewanne
const oldJeBathTrays = oldJeBath ? oldJeBath.trays || [] : [];
const oldJeBathMap = new Map(oldJeBathTrays.map(t => [t.artNr.replace(/\s/g,''), t]));

console.log(`Loaded ${oldJeTrays.length} shower trays and ${oldJeBathTrays.length} bath trays from old dist.`);

console.log("\n--- SHOWER TRAYS DIFFERENCES ---");
currentData.duschenwanne.trays.forEach(t => {
    const cleanArt = t.artNr.replace(/\s/g,'');
    const oldTray = oldJeMap.get(cleanArt);
    if (oldTray) {
        if (t.label !== oldTray.label) {
            console.log(`[Dusche] ArtNr: ${t.artNr}`);
            console.log(` - Current:  "${t.label}"`);
            console.log(` - Old Dist: "${oldTray.label}"`);
        }
    } else {
        console.log(`[Dusche] New Tray not in old dist: ${t.artNr} - "${t.label}"`);
    }
});

console.log("\n--- BATH TRAYS DIFFERENCES ---");
currentData.badewanne.trays.forEach(t => {
    const cleanArt = t.artNr.replace(/\s/g,'');
    const oldTray = oldJeBathMap.get(cleanArt);
    if (oldTray) {
        if (t.label !== oldTray.label) {
            console.log(`[Bad] ArtNr: ${t.artNr}`);
            console.log(` - Current:  "${t.label}"`);
            console.log(` - Old Dist: "${oldTray.label}"`);
        }
    } else {
        console.log(`[Bad] New Tray not in old dist: ${t.artNr} - "${t.label}"`);
    }
});
