const fs = require('fs');
const fd = fs.openSync('/Users/jenistonsellathamby/Desktop/product-configurator/old_dist/dist/index.html', 'r');

// We know from grep that 'dusche' is around 4339257.
// The object usually starts a few characters before that with '{'
const startSearch = 4339200;
const buffer = Buffer.alloc(1000000); // Read 1MB around there
fs.readSync(fd, buffer, 0, 1000000, startSearch);

const content = buffer.toString('utf8');
const startTag = '{"dusche":';
const startIdxInBuf = content.indexOf(startTag);

if (startIdxInBuf === -1) {
    console.log("Could not find start tag in 1MB chunk at 4.3MB");
    process.exit(1);
}

const absoluteStart = startSearch + startIdxInBuf;
console.log("Absolute Start found at:", absoluteStart);

// Now find the end by reading from absoluteStart onwards
let braceCount = 0;
let absoluteEnd = -1;
let foundStart = false;

// Read the rest of the file in chunks to balance braces
const chunk = Buffer.alloc(65536);
let pos = absoluteStart;
while (true) {
    const bytesRead = fs.readSync(fd, chunk, 0, 65536, pos);
    if (bytesRead === 0) break;

    const str = chunk.toString('utf8', 0, bytesRead);
    for (let i = 0; i < str.length; i++) {
        if (str[i] === '{') {
            braceCount++;
            foundStart = true;
        } else if (str[i] === '}') {
            braceCount--;
        }

        if (foundStart && braceCount === 0) {
            absoluteEnd = pos + i;
            break;
        }
    }
    if (absoluteEnd !== -1) break;
    pos += bytesRead;
}

if (absoluteEnd !== -1) {
    const totalSize = absoluteEnd - absoluteStart + 1;
    const finalBuffer = Buffer.alloc(totalSize);
    fs.readSync(fd, finalBuffer, 0, totalSize, absoluteStart);
    
    const jsonStr = finalBuffer.toString('utf8');
    try {
        // Build files use standard JSON mostly, but let's be safe
        const data = JSON.parse(jsonStr);
        fs.writeFileSync('custom-data.json', JSON.stringify(data, null, 2));
        console.log('REPAIR SUCCESS: Restored custom-data.json! Size:', totalSize);
    } catch (e) {
        console.log('JSON Parse failed, trying eval...');
        try {
            const data = eval('(' + jsonStr + ')');
            fs.writeFileSync('custom-data.json', JSON.stringify(data, null, 2));
            console.log('REPAIR SUCCESS (via eval): Restored custom-data.json!');
        } catch (e2) {
            console.log('Eval also failed:', e2.message);
            fs.writeFileSync('scratch/failed_final_data.txt', jsonStr);
        }
    }
} else {
    console.log("End brace not found");
}
