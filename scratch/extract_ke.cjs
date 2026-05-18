const fs = require('fs');

const html = fs.readFileSync('/Users/jenistonsellathamby/Desktop/product-configurator/old_dist/dist/index.html', 'utf8');

const match = html.match(/const\s+Ke\s*=\s*\{/);
if (!match) {
    console.error("Could not find const Ke={");
    process.exit(1);
}

const startIdx = match.index + match[0].length - 1; // index of '{'
let braceCount = 1;
let endIdx = startIdx + 1;

while (braceCount > 0 && endIdx < html.length) {
    const char = html[endIdx];
    if (char === '{') {
        braceCount++;
    } else if (char === '}') {
        braceCount--;
    }
    endIdx++;
}

const keText = html.substring(startIdx, endIdx);
console.log("Extracted Ke length:", keText.length);
fs.writeFileSync('/Users/jenistonsellathamby/Desktop/product-configurator/scratch/extracted_ke.js', 'export const Ke = ' + keText + ';');
console.log("Saved to scratch/extracted_ke.js");
