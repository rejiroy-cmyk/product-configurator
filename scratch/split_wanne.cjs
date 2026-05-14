const fs = require('fs');

let code = fs.readFileSync('modules/factories.js', 'utf8');

// Find the start and end of createRelationalApp
const startStr = "export function createRelationalApp(title, desc, mainImgUrl, config = {}) {";
const startIndex = code.indexOf(startStr);

if (startIndex === -1) {
    console.error("createRelationalApp not found!");
    process.exit(1);
}

// We need to find the matching closing brace.
let braceCount = 0;
let endIndex = -1;
let i = startIndex + startStr.length;

// Start counting from the first '{' inside the function which is actually at the end of startStr
braceCount = 1;

for (; i < code.length; i++) {
    if (code[i] === '{') braceCount++;
    if (code[i] === '}') {
        braceCount--;
        if (braceCount === 0) {
            endIndex = i + 1;
            break;
        }
    }
}

if (endIndex === -1) {
    console.error("Could not find end of createRelationalApp!");
    process.exit(1);
}

const relationalAppCode = code.substring(startIndex, endIndex);

// Duplicate it as createBadewanneApp
let badewanneCode = relationalAppCode.replace("export function createRelationalApp", "export function createBadewanneApp");

// Let's also create createDuschenwanneApp from relationalApp
let duschenwanneCode = relationalAppCode.replace("export function createRelationalApp", "export function createDuschenwanneApp");

// Now we need to append them to the file and update the exports.
// Wait, we can just replace createRelationalApp with all three if we want to keep it.
// Or just keep createRelationalApp, and append Duschenwanne and Badewanne to the end of the file.

code += "\n\n" + duschenwanneCode + "\n\n" + badewanneCode + "\n";

fs.writeFileSync('modules/factories.js', code);
console.log("Duplicated factories successfully.");

