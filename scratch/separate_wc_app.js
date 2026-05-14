const fs = require('fs');

const file = '/Users/jenistonsellathamby/Desktop/product-configurator/modules/factories.js';
let content = fs.readFileSync(file, 'utf8');

const startStr = "export function createRelationalApp(title, desc, mainImgUrl, config = {}) {";
const startIndex = content.indexOf(startStr);

if (startIndex === -1) {
    console.error("Could not find createRelationalApp");
    process.exit(1);
}

// Find the end of createRelationalApp
let openBraces = 0;
let endIndex = -1;
let i = startIndex + "export function createRelationalApp".length;

while (i < content.length) {
    if (content[i] === '{') openBraces++;
    if (content[i] === '}') {
        openBraces--;
        if (openBraces === 0) {
            endIndex = i;
            break;
        }
    }
    i++;
}

if (endIndex === -1) {
    console.error("Could not find end of createRelationalApp");
    process.exit(1);
}

const relationalAppCode = content.substring(startIndex, endIndex + 1);

let wcAppCode = relationalAppCode.replace("export function createRelationalApp", "export function createWCApp");

// Append to file
content += '\n\n' + wcAppCode + '\n';
fs.writeFileSync(file, content);
console.log("Successfully appended createWCApp");
