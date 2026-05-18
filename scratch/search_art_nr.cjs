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
        if (char === '{') braceCount++;
        else if (char === '}') braceCount--;
        endIdx++;
    }
    const valueStr = oldHtml.substring(startIdx, endIdx);
    return eval(`(${valueStr})`);
}

const oldJe = extractVarFromHtml('Je');
const found = oldJe.trays.find(t => t.artNr === "1313 150.100.185");
if (found) {
    console.log("Kaldewei Calima found in old dist's Je!");
    console.log(JSON.stringify(found, null, 2));
} else {
    console.log("Kaldewei Calima NOT found in old dist's Je!");
}
