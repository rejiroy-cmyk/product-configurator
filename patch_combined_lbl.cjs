const fs = require('fs');
const file = 'modules/factories.js';
let content = fs.readFileSync(file, 'utf8');

// The line is: const combinedLbl = (enrichedLabel + ' ' + (selectedOption.type || mat.name || '')).toLowerCase();
// Let's replace it.

const regex = /const combinedLbl = \(enrichedLabel \+ ' ' \+ \(selectedOption\.type \|\| mat\.name \|\| ''\)\)\.toLowerCase\(\);/g;
const replacement = "const combinedLbl = (enrichedLabel + ' ' + (selectedOption.type || '') + ' ' + (mat.name || '')).toLowerCase();";

const replaced = content.replace(regex, replacement);
fs.writeFileSync(file, replaced, 'utf8');

console.log("Patched combinedLbl");
