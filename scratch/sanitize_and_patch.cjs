const fs = require('fs');
const path = require('path');

const factoriesPath = path.join(__dirname, '../modules/factories.js');

const filesToPatch = {
    ut: 'old_ut.js',
    gt: 'old_gt.js',
    pt: 'old_pt.js',
    dt: 'old_dt.js',
    bt: 'old_bt.js'
};

// Nested parser to sanitize unescaped newlines inside strings and template expressions
function sanitizeJS(code) {
    let result = '';
    let mode = 'NORMAL'; // NORMAL, SINGLE_QUOTE, DOUBLE_QUOTE, TEMPLATE_LITERAL
    const stack = [];
    let escape = false;

    for (let i = 0; i < code.length; i++) {
        const char = code[i];
        const nextChar = code[i + 1];

        if (escape) {
            result += char;
            escape = false;
            continue;
        }

        if (char === '\\') {
            result += char;
            escape = true;
            continue;
        }

        switch (mode) {
            case 'NORMAL':
                if (char === "'") {
                    mode = 'SINGLE_QUOTE';
                    result += char;
                } else if (char === '"') {
                    mode = 'DOUBLE_QUOTE';
                    result += char;
                } else if (char === '`') {
                    mode = 'TEMPLATE_LITERAL';
                    result += char;
                } else if (char === '}' && stack.length > 0) {
                    mode = stack.pop();
                    result += char;
                } else {
                    result += char;
                }
                break;

            case 'SINGLE_QUOTE':
                if (char === "'") {
                    mode = 'NORMAL';
                    result += char;
                } else if (char === '\n' || char === '\r') {
                    result += ' '; // Convert literal newline in string to space
                } else {
                    result += char;
                }
                break;

            case 'DOUBLE_QUOTE':
                if (char === '"') {
                    mode = 'NORMAL';
                    result += char;
                } else if (char === '\n' || char === '\r') {
                    result += ' '; // Convert literal newline in string to space
                } else {
                    result += char;
                }
                break;

            case 'TEMPLATE_LITERAL':
                if (char === '`') {
                    mode = 'NORMAL';
                    result += char;
                } else if (char === '$' && nextChar === '{') {
                    stack.push('TEMPLATE_LITERAL');
                    mode = 'NORMAL';
                    result += '${';
                    i++; // Skip the '{'
                } else {
                    result += char;
                }
                break;
        }
    }
    return result;
}

// Load and sanitize files
let oldUt = sanitizeJS(fs.readFileSync(path.join(__dirname, filesToPatch.ut), 'utf8').trim());
let oldGt = sanitizeJS(fs.readFileSync(path.join(__dirname, filesToPatch.gt), 'utf8').trim());
let oldPt = sanitizeJS(fs.readFileSync(path.join(__dirname, filesToPatch.pt), 'utf8').trim());
let oldDt = sanitizeJS(fs.readFileSync(path.join(__dirname, filesToPatch.dt), 'utf8').trim());
let oldBt = sanitizeJS(fs.readFileSync(path.join(__dirname, filesToPatch.bt), 'utf8').trim());

// Fix ASI hazards specifically in old_pt.js
oldPt = oldPt.replace(/extractSizeScore\(this\.selectedTray\)/g, 'extractSizeScore(this.selectedTray);');

let content = fs.readFileSync(factoriesPath, 'utf8');

// 1. Replace createDuschenmischerApp
const dmStartIdx = content.indexOf('export function createDuschenmischerApp(');
const bmStartIdx = content.indexOf('export function createBademischerApp(');
if (dmStartIdx === -1 || bmStartIdx === -1) {
    throw new Error('Could not find createDuschenmischerApp or createBademischerApp');
}
const dmReplacement = `export function createDuschenmischerApp(title, desc, mainImgUrl, config = {}) {
    ${oldUt}
    return ut(title, desc, mainImgUrl, config);
}

`;
content = content.substring(0, dmStartIdx) + dmReplacement + content.substring(bmStartIdx);

// 2. Replace createBademischerApp
const bmNewStartIdx = content.indexOf('export function createBademischerApp(');
const stdStartIdx = content.indexOf('export function createStandardApp(');
if (bmNewStartIdx === -1 || stdStartIdx === -1) {
    throw new Error('Could not find createBademischerApp or createStandardApp');
}
const bmReplacement = `export function createBademischerApp(title, desc, mainImgUrl, config = {}) {
    ${oldGt}
    return gt(title, desc, mainImgUrl, config);
}

`;
content = content.substring(0, bmNewStartIdx) + bmReplacement + content.substring(stdStartIdx);

// 3. Replace createGlassApp
const glStartIdx = content.indexOf('export function createGlassApp(');
const wcStartIdx = content.indexOf('export function createWCApp(');
if (glStartIdx === -1 || wcStartIdx === -1) {
    throw new Error('Could not find createGlassApp or createWCApp');
}
const glReplacement = `export function createGlassApp(title, desc, mainImgUrl) {
    ${oldPt}
    return pt(title, desc, mainImgUrl);
}

`;
content = content.substring(0, glStartIdx) + glReplacement + content.substring(wcStartIdx);

// 4. Replace createDuschenwanneApp
const dwStartIdx = content.indexOf('export function createDuschenwanneApp(');
const bwStartIdx = content.indexOf('export function createBadewanneApp(');
if (dwStartIdx === -1 || bwStartIdx === -1) {
    throw new Error('Could not find createDuschenwanneApp or createBadewanneApp');
}
const dwReplacement = `export function createDuschenwanneApp(title, desc, mainImgUrl, config = {}) {
    ${oldDt}
    return dt(title, desc, mainImgUrl, config);
}

`;
content = content.substring(0, dwStartIdx) + dwReplacement + content.substring(bwStartIdx);

// 5. Replace createBadewanneApp
const bwNewStartIdx = content.indexOf('export function createBadewanneApp(');
if (bwNewStartIdx === -1) {
    throw new Error('Could not find createBadewanneApp');
}
const bwReplacement = `export function createBadewanneApp(title, desc, mainImgUrl, config = {}) {
    ${oldBt}
    return bt(title, desc, mainImgUrl, config);
}
`;
content = content.substring(0, bwNewStartIdx) + bwReplacement;

fs.writeFileSync(factoriesPath, content, 'utf8');
console.log('Successfully sanitized and patched all factories with nested AST parser and ASI fixes!');
