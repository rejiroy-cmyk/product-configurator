const fs = require('fs');
const path = require('path');

const htmlPath = '/Users/jenistonsellathamby/Desktop/product-configurator/old_dist/dist/index.html';
const html = fs.readFileSync(htmlPath, 'utf8');

// The data is usually in a block like const q={...} or productApps={...}
// In the head/tail exploration, it looks like it's assigned to a variable.
// I'll search for the characteristic structure of the product data.
const match = html.match(/productApps\s*=\s*(\{.*?\});/s) || html.match(/const\s+q\s*=\s*(\{.*?\});/s);

if (match && match[1]) {
    try {
        const data = JSON.parse(match[1]);
        fs.writeFileSync('scratch/extracted_old_data.json', JSON.stringify(data, null, 2));
        console.log('Successfully extracted data to scratch/extracted_old_data.json');
    } catch (e) {
        console.error('Failed to parse extracted data:', e.message);
        // Fallback: just save the raw match to investigate
        fs.writeFileSync('scratch/raw_data_match.txt', match[1]);
    }
} else {
    console.log('Could not find data block using regex.');
}
