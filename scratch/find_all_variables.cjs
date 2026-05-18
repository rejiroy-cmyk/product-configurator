const fs = require('fs');

const html = fs.readFileSync('/Users/jenistonsellathamby/Desktop/product-configurator/old_dist/dist/index.html', 'utf8');

// Find all occurrences of "const [a-zA-Z0-9_]+={"
const regex = /const\s+([a-zA-Z0-9_$]+)\s*=\s*\{/g;
let match;
const vars = [];
while ((match = regex.exec(html)) !== null) {
    vars.push({ name: match[1], index: match.index });
}

console.log("Found variables:", vars.map(v => v.name));

for (const v of vars) {
    const startIdx = v.index + html.substring(v.index).indexOf('{');
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

    const valueStr = html.substring(startIdx, endIdx);
    
    // Let's identify the content of this variable by checking for unique strings in its body
    console.log(`\nVariable: ${v.name} (length: ${valueStr.length})`);
    
    // We can evaluate it in a safe context or parse it as JS
    try {
        const obj = eval(`(${valueStr})`);
        const keys = Object.keys(obj);
        console.log(`- Keys:`, keys);
        if (obj.trays && Array.isArray(obj.trays)) {
            console.log(`- trays length: ${obj.trays.length}`);
            if (obj.trays.length > 0) {
                const sample = obj.trays[0];
                console.log(`- Sample tray label: ${sample.label}`);
                console.log(`- Sample tray artNr: ${sample.artNr}`);
            }
        }
    } catch (e) {
        console.log(`- Parse error: ${e.message}`);
        console.log(`- Preview: ${valueStr.substring(0, 300)}`);
    }
}
