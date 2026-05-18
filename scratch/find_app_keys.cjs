const fs = require('fs');
const oldDistPath = '/Users/jenistonsellathamby/Desktop/product-configurator/old_dist/dist/index.html';
const content = fs.readFileSync(oldDistPath, 'utf8');

const keys = [
    'bademischer',
    'duschenmischer',
    'duschtrennwand',
    'badewanne',
    'duschenwanne',
    'zubehoer_pool'
];

keys.forEach(k => {
    let index = 0;
    console.log(`Searching for key: "${k}"`);
    while (true) {
        index = content.indexOf(`"${k}"`, index);
        if (index === -1) {
            index = content.indexOf(`'${k}'`);
        }
        if (index === -1) break;
        console.log(`Found "${k}" at index ${index}:`);
        console.log(content.substring(Math.max(0, index - 100), Math.min(content.length, index + 300)));
        console.log('--------------------------------------------------');
        index += k.length + 2;
    }
});
