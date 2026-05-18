const fs = require('fs');
const oldDistPath = '/Users/jenistonsellathamby/Desktop/product-configurator/old_dist/dist/index.html';
const content = fs.readFileSync(oldDistPath, 'utf8');

const queries = [
    'createBademischerApp',
    'createDuschenmischerApp',
    'createDuschenwanneApp',
    'createBadewanneApp',
    'createGlassApp',
    'createWashbasinApp',
    'createWCApp',
    'createRelationalApp',
    'createFinishesApp'
];

queries.forEach(q => {
    const index = content.indexOf(q);
    console.log(`Query: ${q} -> Index: ${index}`);
    if (index !== -1) {
        console.log(`Snippet around index ${index}:`);
        console.log(content.substring(Math.max(0, index - 50), Math.min(content.length, index + 250)));
        console.log('--------------------------------------------------');
    }
});
