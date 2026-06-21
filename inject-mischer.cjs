const fs = require('fs');

let code = fs.readFileSync('modules/factories.js', 'utf8');

let start1 = code.indexOf('export function createDuschenmischerApp(');
let end1 = code.indexOf('export function createBademischerApp(');
let start2 = end1;
let end2 = code.indexOf('export function createStandardApp(');

let duschenmischer = fs.readFileSync('duschenmischer.js', 'utf8');
let bademischer = fs.readFileSync('bademischer.js', 'utf8');

let newCode = code.substring(0, start1) + duschenmischer + bademischer + code.substring(end2);

fs.writeFileSync('modules/factories.js', newCode);
console.log('Injection complete.');
