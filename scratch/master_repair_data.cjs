const fs = require('fs');
const content = fs.readFileSync('/Users/jenistonsellathamby/Desktop/product-configurator/old_dist/dist/index.html', 'utf8');

// Find the beginning of the big data block. It starts with a key like "dusche"
const startTag = '{"dusche":';
const startIdx = content.indexOf(startTag);

if (startIdx === -1) {
    console.log("Could not find start tag");
    process.exit(1);
}

// Find the end by balancing braces starting from startIdx
let braceCount = 0;
let endIdx = -1;
let foundStart = false;

for (let i = startIdx; i < content.length; i++) {
    if (content[i] === '{') {
        braceCount++;
        foundStart = true;
    } else if (content[i] === '}') {
        braceCount--;
    }

    if (foundStart && braceCount === 0) {
        endIdx = i;
        break;
    }
}

if (endIdx !== -1) {
    const jsonStr = content.substring(startIdx, endIdx + 1);
    try {
        // Attempt to clean it if it's an object literal (unquoted keys)
        // But if it's already JSON (likely from a build), it will parse.
        const data = eval('(' + jsonStr + ')');
        fs.writeFileSync('custom-data.json', JSON.stringify(data, null, 2));
        console.log('REPAIR SUCCESS: Restored custom-data.json from old_dist! Length:', jsonStr.length);
    } catch (e) {
        console.log('Eval failed, trying to save raw string to investigate:', e.message);
        fs.writeFileSync('scratch/failed_eval.txt', jsonStr);
    }
} else {
    console.log("Could not find matching end brace");
}
