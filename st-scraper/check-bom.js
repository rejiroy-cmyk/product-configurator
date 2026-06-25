const fs = require('fs');
const code = fs.readFileSync('modules/factories.js', 'utf8');

const mBom = code.match(/updateBOM:\s*function\s*\(\)\s*\{([\s\S]*?)filterResults:/);
if (mBom) console.log(mBom[1]);
