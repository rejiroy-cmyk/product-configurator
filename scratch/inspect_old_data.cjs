const fs = require('fs');

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
        if (char === '{') {
            braceCount++;
        } else if (char === '}') {
            braceCount--;
        }
        endIdx++;
    }
    
    const valueStr = oldHtml.substring(startIdx, endIdx);
    try {
        return eval(`(${valueStr})`);
    } catch(e) {
        console.error("Eval error for " + varName + ":", e.message);
        return null;
    }
}

const targetCategories = {
    badewanne: 'je',
    duschenwanne: 'Je',
    zubehoer_pool: 'Ye'
};

for (const [catName, varName] of Object.entries(targetCategories)) {
    console.log(`\n=== Old Dist Category: ${catName} (${varName}) ===`);
    const obj = extractVarFromHtml(varName);
    if (obj) {
        console.log("Keys of category object:", Object.keys(obj));
        if (obj.trays) {
            console.log(`Number of trays: ${obj.trays.length}`);
            if (obj.trays.length > 0) {
                console.log("Sample tray keys:", Object.keys(obj.trays[0]));
                console.log("Sample tray label:", obj.trays[0].label);
                console.log("Sample tray mountingMaterials count:", obj.trays[0].mountingMaterials ? obj.trays[0].mountingMaterials.length : 0);
                if (obj.trays[0].mountingMaterials && obj.trays[0].mountingMaterials.length > 0) {
                    console.log("Sample tray first mountingMaterial name:", obj.trays[0].mountingMaterials[0].name);
                    console.log("Sample tray first mountingMaterial options count:", obj.trays[0].mountingMaterials[0].options ? obj.trays[0].mountingMaterials[0].options.length : 0);
                }
            }
        }
    } else {
        console.warn(`Could not extract ${varName}`);
    }
}
