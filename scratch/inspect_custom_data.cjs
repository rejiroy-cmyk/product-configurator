const fs = require('fs');

const data = JSON.parse(fs.readFileSync('/Users/jenistonsellathamby/Desktop/product-configurator/custom-data.json', 'utf8'));
console.log("Keys in custom-data.json:", Object.keys(data));
for (const key of Object.keys(data)) {
    if (Array.isArray(data[key])) {
        console.log(`- ${key}: Array of length ${data[key].length}`);
        if (data[key].length > 0) {
            console.log(`  Sample item:`, JSON.stringify(data[key][0]).substring(0, 150));
        }
    } else {
        console.log(`- ${key}:`, typeof data[key]);
    }
}
