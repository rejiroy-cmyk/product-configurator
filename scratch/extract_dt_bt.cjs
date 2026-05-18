const fs = require('fs');

const prettyCode = fs.readFileSync('/Users/jenistonsellathamby/Desktop/product-configurator/scratch/old_code_pretty.txt', 'utf8');

// Find function dt(B,F,R,N={})
const dtStart = prettyCode.indexOf('function dt(');
const btStart = prettyCode.indexOf('function bt(');
const nextStart = prettyCode.indexOf('const Ne=');

console.log(`dtStart: ${dtStart}, btStart: ${btStart}, nextStart: ${nextStart}`);

const dtCode = prettyCode.substring(dtStart, btStart);
const btCode = prettyCode.substring(btStart, nextStart);

fs.writeFileSync('/Users/jenistonsellathamby/Desktop/product-configurator/scratch/extracted_dt.js', dtCode);
fs.writeFileSync('/Users/jenistonsellathamby/Desktop/product-configurator/scratch/extracted_bt.js', btCode);

console.log("Extracted dt and bt code.");
