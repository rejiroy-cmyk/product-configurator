const fs = require('fs');
const path = require('path');

const filePath = '/Users/jenistonsellathamby/Desktop/product-configurator/old_dist/dist/index.html';
const html = fs.readFileSync(filePath, 'utf8');

// Find all script tags or large blocks
console.log("HTML length:", html.length);

// Let's find some variable names or let's search for keys
const matches = html.match(/const\s+(\w+)\s*=\s*\{/g);
console.log("Matches:", matches);

// Let's search for "const Ke=" but maybe the variable name is different or has a space
const matchKe = html.match(/const\s+Ke\s*=\s*\{/);
if (matchKe) {
    console.log("Found Ke!");
    const idx = matchKe.index;
    console.log(html.substring(idx, idx + 1000));
} else {
    // Let's search for other definitions like "trays:"
    const trayIdx = html.indexOf("trays:[");
    if (trayIdx !== -1) {
        console.log("Found trays:[ at", trayIdx);
        console.log(html.substring(trayIdx - 100, trayIdx + 500));
    }
}
