const fs = require('fs');
const oldDistPath = '/Users/jenistonsellathamby/Desktop/product-configurator/old_dist/dist/index.html';
const html = fs.readFileSync(oldDistPath, 'utf8');

// Find all script tags
const scriptRegex = /<script\b[^>]*>([\s\S]*?)<\/script>/gi;
let match;
let count = 0;

while ((match = scriptRegex.exec(html)) !== null) {
    const scriptContent = match[1];
    console.log(`Script tag ${count + 1} length: ${scriptContent.length}`);
    if (scriptContent.length > 1000) {
        fs.writeFileSync(`/Users/jenistonsellathamby/Desktop/product-configurator/scratch/old_script_${count + 1}.js`, scriptContent);
        console.log(`Saved to scratch/old_script_${count + 1}.js`);
    }
    count++;
}
