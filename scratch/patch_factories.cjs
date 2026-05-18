const fs = require('fs');
const path = require('path');

const factoriesPath = path.join(__dirname, '../modules/factories.js');
const oldUtPath = path.join(__dirname, 'old_ut.js');
const oldGtPath = path.join(__dirname, 'old_gt.js');
const oldPtPath = path.join(__dirname, 'old_pt.js');
const oldDtPath = path.join(__dirname, 'old_dt.js');
const oldBtPath = path.join(__dirname, 'old_bt.js');

let content = fs.readFileSync(factoriesPath, 'utf8');

// Load old functions
const oldUt = fs.readFileSync(oldUtPath, 'utf8').trim();
const oldGt = fs.readFileSync(oldGtPath, 'utf8').trim();
const oldPt = fs.readFileSync(oldPtPath, 'utf8').trim();
const oldDt = fs.readFileSync(oldDtPath, 'utf8').trim();
const oldBt = fs.readFileSync(oldBtPath, 'utf8').trim();

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

// 2. Replace createBademischerApp (note: standard app is next)
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

// 3. Replace createGlassApp (note: wc app is next)
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

// 4. Replace createDuschenwanneApp (note: badewanne app is next)
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

// 5. Replace createBadewanneApp (ends at the end of the file)
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
console.log('Successfully patched modules/factories.js!');
