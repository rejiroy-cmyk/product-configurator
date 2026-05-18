const fs = require('fs');

const html = fs.readFileSync('/Users/jenistonsellathamby/Desktop/product-configurator/old_dist/dist/index.html', 'utf8');

// The mapping we want to overwrite:
const targetVars = {
    Ke: 'bademischer',
    Oe: 'duschenmischer',
    qe: 'duschtrennwand',
    je: 'badewanne',
    Je: 'duschenwanne',
    Ye: 'zubehoer_pool',
    et: 'vorlagen'
};

for (const [varName, catName] of Object.entries(targetVars)) {
    console.log(`Searching for variable ${varName} (${catName})...`);
    
    // Look for "const varName=" or "varName="
    const regex = new RegExp(`(?:const\\s+|,|\\b)(${varName})\\s*=\\s*\\{`, 'g');
    let match;
    let found = false;
    
    while ((match = regex.exec(html)) !== null) {
        found = true;
        const startIdx = match.index + match[0].length - 1; // '{'
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
        console.log(`- Found ${varName} at index ${match.index}, text length: ${valueStr.length}`);
        
        try {
            // Let's test if it evaluates successfully
            const obj = eval(`(${valueStr})`);
            console.log(`  - Keys:`, Object.keys(obj));
            if (obj.trays) console.log(`  - trays count: ${obj.trays.length}`);
            if (obj.parts) console.log(`  - parts count: ${obj.parts.length}`);
            if (obj.finishes) console.log(`  - finishes count: ${obj.finishes.length}`);
        } catch (e) {
            console.log(`  - Eval failed: ${e.message}`);
        }
    }
    if (!found) {
        console.log(`- NOT found: ${varName}`);
    }
}
