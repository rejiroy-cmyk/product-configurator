const fs = require('fs');
const file = 'modules/factories.js';
let content = fs.readFileSync(file, 'utf8');

const regex = /export function createDuschenwanneApp\([\s\S]*?\}\s*return dt\(title,\s*desc,\s*mainImgUrl,\s*config\);\s*\}/;
content = content.replace(regex, `export function createDuschenwanneApp(title, desc, mainImgUrl, config = {}) {\n    return createRelationalApp(title, desc, mainImgUrl, config);\n}`);

fs.writeFileSync(file, content, 'utf8');
console.log('Deminified createDuschenwanneApp');
