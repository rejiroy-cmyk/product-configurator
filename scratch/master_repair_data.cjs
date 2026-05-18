const fs = require('fs');
const path = require('path');

// 1. Read current custom-data.json
const currentDataPath = '/Users/jenistonsellathamby/Desktop/product-configurator/custom-data.json';
const currentData = JSON.parse(fs.readFileSync(currentDataPath, 'utf8'));

// 2. Read old dist file
const oldDistPath = '/Users/jenistonsellathamby/Desktop/product-configurator/old_dist/dist/index.html';
const oldHtml = fs.readFileSync(oldDistPath, 'utf8');

// 3. Extractor helper for a minified variable in index.html
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
    return eval(`(${valueStr})`);
}

// 4. Overwrite categories mapping
const targetCategories = {
    bademischer: 'Ke',
    duschenmischer: 'Oe',
    duschtrennwand: 'qe',
    badewanne: 'je',
    duschenwanne: 'Je',
    zubehoer_pool: 'Ye',
    vorlagen: 'et'
};

// 5. Let's count current items before overwrite
const statsBefore = {};
const statsAfter = {};

Object.keys(currentData).forEach(cat => {
    const beforeCount = (currentData[cat].trays?.length || 0) + (currentData[cat].parts?.length || 0) + (currentData[cat].finishes?.length || 0);
    statsBefore[cat] = beforeCount;
});

// 6. Overwrite target categories from old dist
console.log('--- Overwriting categories from old dist index.html ---');
for (const [catName, varName] of Object.entries(targetCategories)) {
    console.log(`Extracting ${catName} using var ${varName}...`);
    const oldObj = extractVarFromHtml(varName);
    if (oldObj) {
        currentData[catName] = oldObj;
        console.log(`- SUCCESSFULLY overwritten ${catName}.`);
    } else {
        console.warn(`- WARNING: Could not find or parse ${varName} for category ${catName}`);
    }
}

// 7. Count items after overwrite
Object.keys(currentData).forEach(cat => {
    const afterCount = (currentData[cat].trays?.length || 0) + (currentData[cat].parts?.length || 0) + (currentData[cat].finishes?.length || 0);
    statsAfter[cat] = afterCount;
});

// 8. Save updated custom-data.json
fs.writeFileSync(currentDataPath, JSON.stringify(currentData, null, 4));
console.log('\n--- SUCCESSFULLY saved overwritten data to custom-data.json! ---');

// 9. Print beautiful summary table
console.log('\nCategory Overwrite Statistics Comparison:');
console.table(Object.keys(currentData).map(cat => ({
    Category: cat,
    'Current Count': statsBefore[cat],
    'New Count (Old Dist)': statsAfter[cat],
    Status: targetCategories[cat] ? 'OVERWRITTEN' : 'EXCLUDED (PRESERVED)'
})));
