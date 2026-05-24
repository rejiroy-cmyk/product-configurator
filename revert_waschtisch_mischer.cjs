const fs = require('fs');
let code = fs.readFileSync('modules/factories.js', 'utf8');

const startStr = 'export function createWaschtischMischerApp';
const endStr = 'export function createMixAndMatchApp';

const startIndex = code.indexOf(startStr);
const endIndex = code.indexOf(endStr);

if (startIndex === -1 || endIndex === -1) {
    console.error('Could not find bounds');
    process.exit(1);
}

let before = code.substring(0, startIndex);
let target = code.substring(startIndex, endIndex);
let after = code.substring(endIndex);

// In target, find:
// <div class="result-item-card ${((o=this.selectedTray)==null?void 0:o.id)===l.id?"active":""}" onclick="window.currentActiveApp.selectItem('${l.id}')">
//     <div class="card-img-wrapper">
//         ${l.imgUrl ? `<img src="${l.imgUrl}">` : '<i class="ri-image-line placeholder-icon"></i>'}
//     </div>
//     <div class="result-info">
//         <strong>${l.label}</strong>
//         <div class="result-meta"><span>${l.manufacturer||""}</span> | <span>${l.size||""}</span></div>
//         <span class="finish-artnr">${l.artNr}</span>
//     </div>
// </div>

const btnHTML = `
                <div class="result-item-btn \${((o=this.selectedTray)==null?void 0:o.id)===l.id?"active":""}" onclick="window.currentActiveApp.selectItem('\${l.id}')">
                    <div class="result-info">
                        <strong>\${l.label}</strong>
                        <div class="result-meta"><span>\${l.manufacturer||""}</span> | <span>\${l.size||""}</span></div>
                    </div>
                    <span class="finish-artnr">\${l.artNr}</span>
                </div>
`.trim();

// Try replacing using regex
// Because there might be slight whitespace variations, let's use a general regex
target = target.replace(/<div class="result-item-card \$\{\(\(o=this\.selectedTray\)==null\?void 0:o\.id\)===l\.id\?"active":""\}" onclick="window\.currentActiveApp\.selectItem\('\$\{l\.id\}'\)">[\s\S]*?<div class="card-img-wrapper">[\s\S]*?<\/div>\s*<div class="result-info">\s*<strong>\$\{l\.label\}<\/strong>\s*<div class="result-meta"><span>\$\{l\.manufacturer\|\|""\}<\/span> \| <span>\$\{l\.size\|\|""\}<\/span><\/div>\s*<span class="finish-artnr">\$\{l\.artNr\}<\/span>\s*<\/div>\s*<\/div>/g, btnHTML);

// Let's also check for other variations like _.label or t.label just in case WaschtischMischerApp uses them
const btnHTML_t = `
                <div class="result-item-btn \${this.selectedTray?.id === t.id ? 'active' : ''}" onclick="window.currentActiveApp.selectItem('\${t.id}')">
                    <div class="result-info">
                        <strong>\${t.label}</strong>
                        <div class="result-meta"><span>\${t.manufacturer || ''}</span> | <span>\${t.size || ''}</span></div>
                    </div>
                    <span class="finish-artnr">\${t.artNr}</span>
                </div>
`.trim();

target = target.replace(/<div class="result-item-card \$\{this\.selectedTray\?\.id === t\.id \? 'active' : ''\}" onclick="window\.currentActiveApp\.selectItem\('\$\{t\.id\}'\)">[\s\S]*?<div class="card-img-wrapper">[\s\S]*?<\/div>\s*<div class="result-info">\s*<strong>\$\{t\.label\}<\/strong>\s*<div class="result-meta"><span>\$\{t\.manufacturer \|\| ''\}<\/span> \| <span>\$\{t\.size \|\| ''\}<\/span><\/div>\s*<span class="finish-artnr">\$\{t\.artNr\}<\/span>\s*<\/div>\s*<\/div>/g, btnHTML_t);

code = before + target + after;
fs.writeFileSync('modules/factories.js', code);
console.log('Reverted WaschtischMischerApp');
