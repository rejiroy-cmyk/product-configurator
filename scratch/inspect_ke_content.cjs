const fs = require('fs');

const extractedContent = fs.readFileSync('/Users/jenistonsellathamby/Desktop/product-configurator/scratch/extracted_ke.js', 'utf8');
// Convert `export const Ke = { ... }` to a module we can require or evaluate
const jsCode = extractedContent.replace('export const Ke =', 'module.exports =');
fs.writeFileSync('/Users/jenistonsellathamby/Desktop/product-configurator/scratch/extracted_ke.cjs', jsCode);

const Ke = require('/Users/jenistonsellathamby/Desktop/product-configurator/scratch/extracted_ke.cjs');
console.log("Keys in Ke:", Object.keys(Ke));
for (const key of Object.keys(Ke)) {
    if (Array.isArray(Ke[key])) {
        console.log(`- ${key}: Array of length ${Ke[key].length}`);
        if (Ke[key].length > 0) {
            console.log(`  Sample item:`, JSON.stringify(Ke[key][0]).substring(0, 200));
        }
    } else {
        console.log(`- ${key}:`, typeof Ke[key]);
    }
}
