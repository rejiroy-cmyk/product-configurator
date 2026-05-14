const fs = require('fs');

let content = fs.readFileSync('modules/factories.js', 'utf8');

// 1. Fix the syntax error
const syntaxErrorStr = 'export function createDuschenmischerApp(title, desc, mainImgUrl, config = {}\n\nexport function createBademischerApp(title, desc, mainImgUrl, config = {}) {';
content = content.replace(syntaxErrorStr, 'export function createBademischerApp(title, desc, mainImgUrl, config = {}) {');

if (content.includes('export function createDuschenmischerApp')) {
    console.log('Already has DuschenmischerApp');
} else {
    // 2. Duplicate createBademischerApp correctly
    const startStr = 'export function createBademischerApp(title, desc, mainImgUrl, config = {}) {';
    const startIndex = content.indexOf(startStr);
    
    if (startIndex !== -1) {
        let braces = 0;
        let endIndex = -1;
        
        for (let i = startIndex; i < content.length; i++) {
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
            console.log('Fixed and duplicated!');
        } else {
            console.log('End index not found');
        }
    } else {
        console.log('Start index not found');
    }
}
