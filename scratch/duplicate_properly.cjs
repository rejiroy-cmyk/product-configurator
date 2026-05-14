const fs = require('fs');
let content = fs.readFileSync('modules/factories.js', 'utf8');

const startStr = 'export function createBademischerApp(title, desc, mainImgUrl, config = {}) {';
const startIndex = content.indexOf(startStr);

if (startIndex === -1) {
    console.log("Not found");
    process.exit(1);
}

// Find the index of the first `{` that actually starts the function body.
// It is the one right after `config = {}) `
const bodyStartIndex = startIndex + startStr.length - 1; 

let braces = 0;
let endIndex = -1;

for (let i = bodyStartIndex; i < content.length; i++) {
    if (content[i] === '{') braces++;
    else if (content[i] === '}') {
        braces--;
        if (braces === 0) {
            endIndex = i;
            break;
        }
    }
}

if (endIndex !== -1) {
    const bademischerFunc = content.substring(startIndex, endIndex + 1);
    const duschenmischerFunc = bademischerFunc.replace('createBademischerApp', 'createDuschenmischerApp');
    
    content = content.substring(0, startIndex) + duschenmischerFunc + '\n\n' + bademischerFunc + content.substring(endIndex + 1);
    fs.writeFileSync('modules/factories.js', content);
    console.log('Duplicated perfectly!');
} else {
    console.log('End index not found');
}
