const fs = require('fs');

const file = 'modules/factories.js';
let content = fs.readFileSync(file, 'utf8');

const startStr = 'export function createMischerApp(title, desc, mainImgUrl, config = {}) {';
const startIndex = content.indexOf(startStr);

if (startIndex === -1) {
    console.log("createMischerApp not found!");
    process.exit(1);
}

// Find the end of the function by counting braces
let braces = 0;
let endIndex = -1;
let started = false;

for (let i = startIndex; i < content.length; i++) {
    if (content[i] === '{') {
        braces++;
        started = true;
    } else if (content[i] === '}') {
        braces--;
    }
    
    if (started && braces === 0) {
        endIndex = i;
        break;
    }
}

if (endIndex === -1) {
    console.log("Could not find end of function!");
    process.exit(1);
}

const originalFunc = content.substring(startIndex, endIndex + 1);

const duschenmischerFunc = originalFunc.replace('export function createMischerApp', 'export function createDuschenmischerApp');
const bademischerFunc = originalFunc.replace('export function createMischerApp', 'export function createBademischerApp');

const newContent = content.substring(0, startIndex) + duschenmischerFunc + '\n\n' + bademischerFunc + content.substring(endIndex + 1);

fs.writeFileSync(file, newContent);
console.log("Successfully split createMischerApp into createDuschenmischerApp and createBademischerApp");
