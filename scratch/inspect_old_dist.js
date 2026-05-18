const fs = require('fs');
const path = require('path');

const filePath = '/Users/jenistonsellathamby/Desktop/product-configurator/old_dist/dist/index.html';
const html = fs.readFileSync(filePath, 'utf8');

// Find the script tag containing the data definition
// The script seems to define global variables/constants
// Let's search for "const Ke=" or "Ke=" or similar definitions using regex
const regex = /const\s+(\w+)\s*=\s*\{/g;
let match;
while ((match = regex.exec(html)) !== null) {
    console.log(`Found variable: ${match[1]} at index ${match.index}`);
    // Print the next 200 characters of the match
    console.log(html.substring(match.index, match.index + 300));
    console.log('--------------------------------------------------');
}
