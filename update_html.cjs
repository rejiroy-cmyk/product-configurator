const fs = require('fs');
let code = fs.readFileSync('modules/factories.js', 'utf8');

const mixMatchIndex = code.indexOf('export function createMixAndMatchApp');

const cardHTML1 = `
                        <div class="card-img-wrapper">
                            \${_.imgUrl ? \`<img src="\${_.imgUrl}">\` : '<i class="ri-image-line placeholder-icon"></i>'}
                        </div>
                        <div class="result-info">
                            <strong>\${_.label}</strong>
                            <div class="result-meta">
                                <span>\${_.manufacturer}</span> \${s?"":\`| <span>\${_.size}</span>\`}
                            </div>
                            <span class="finish-artnr">\${_.artNr}</span>
                        </div>
`;

const cardHTML2 = `
                        <div class="card-img-wrapper">
                            \${t.imgUrl ? \`<img src="\${t.imgUrl}">\` : '<i class="ri-image-line placeholder-icon"></i>'}
                        </div>
                        <div class="result-info">
                            <strong>\${t.label}</strong>
                            <div class="result-meta">
                                <span>\${t.manufacturer}</span> \${hideSizeForm ? '' : \`| <span>\${t.size}</span>\`}
                            </div>
                            <span class="finish-artnr">\${t.artNr}</span>
                        </div>
`;

const cardHTML3 = `
                <div class="result-item-card \${this.selectedTray?.id === t.id ? 'active' : ''}" onclick="window.currentActiveApp.selectItem('\${t.id}')">
                    <div class="card-img-wrapper">
                        \${t.imgUrl ? \`<img src="\${t.imgUrl}">\` : '<i class="ri-image-line placeholder-icon"></i>'}
                    </div>
                    <div class="result-info">
                        <strong>\${t.label}</strong>
                        <div class="result-meta"><span>\${t.manufacturer || ''}</span> | <span>\${t.size || ''}</span></div>
                        <span class="finish-artnr">\${t.artNr}</span>
                    </div>
                </div>
`;

const cardHTML4 = `
                <div class="result-item-card \${((o=this.selectedTray)==null?void 0:o.id)===l.id?"active":""}" onclick="window.currentActiveApp.selectItem('\${l.id}')">
                    <div class="card-img-wrapper">
                        \${l.imgUrl ? \`<img src="\${l.imgUrl}">\` : '<i class="ri-image-line placeholder-icon"></i>'}
                    </div>
                    <div class="result-info">
                        <strong>\${l.label}</strong>
                        <div class="result-meta"><span>\${l.manufacturer||""}</span> | <span>\${l.size||""}</span></div>
                        <span class="finish-artnr">\${l.artNr}</span>
                    </div>
                </div>
`;

// Helper to replace only before MixAndMatchApp, then after MixAndMatchApp
// wait, mixAndMatchApp might not use result-item-btn? Let's check.

// 1. replace `result-item-btn` with `result-item-card` everywhere EXCEPT in createMixAndMatchApp
// To do this, we can split the file by createMixAndMatchApp

const parts = code.split('export function createMixAndMatchApp');

// For part 0 and part 1 (if mixAndMatch doesn't span to the end, wait, it might)
// Just to be safe, only replace instances of the exact innerHTMLs

function applyReplacements(text) {
    // pattern for _.label
    text = text.replace(/<div class="result-info">\s*<strong>\$\{\_\.label\}<\/strong>\s*<div class="result-meta">\s*<span>\$\{\_\.manufacturer\}<\/span> \$\{s\?"":\`\| <span>\$\{\_\.size\}<\/span>\`\}\s*<\/div>\s*<\/div>\s*<span class="finish-artnr">\$\{\_\.artNr\}<\/span>/g, cardHTML1.trim());

    // pattern for t.label
    text = text.replace(/<div class="result-info">\s*<strong>\$\{t\.label\}<\/strong>\s*<div class="result-meta">\s*<span>\$\{t\.manufacturer\}<\/span> \$\{hideSizeForm \? '' : \`\| <span>\$\{t\.size\}<\/span>\`\}\s*<\/div>\s*<\/div>\s*<span class="finish-artnr">\$\{t\.artNr\}<\/span>/g, cardHTML2.trim());

    // replace .result-item-btn class names
    text = text.replace(/result-item-btn/g, 'result-item-card');
    
    // pattern for full div t.label
    text = text.replace(/<div class="result-item-card \$\{this\.selectedTray\?\.id === t\.id \? 'active' : ''\}" onclick="window\.currentActiveApp\.selectItem\('\$\{t\.id\}'\)">\s*<div class="result-info">\s*<strong>\$\{t\.label\}<\/strong>\s*<div class="result-meta"><span>\$\{t\.manufacturer \|\| ''\}<\/span> \| <span>\$\{t\.size \|\| ''\}<\/span><\/div>\s*<\/div>\s*<span class="finish-artnr">\$\{t\.artNr\}<\/span>\s*<\/div>/g, cardHTML3.trim());

    // pattern for full div l.label
    text = text.replace(/<div class="result-item-card \$\{\(\(o=this\.selectedTray\)==null\?void 0:o\.id\)===l\.id\?"active":""\}" onclick="window\.currentActiveApp\.selectItem\('\$\{l\.id\}'\)">\s*<div class="result-info">\s*<strong>\$\{l\.label\}<\/strong>\s*<div class="result-meta"><span>\$\{l\.manufacturer\|\|""\}<\/span> \| <span>\$\{l\.size\|\|""\}<\/span><\/div>\s*<\/div>\s*<span class="finish-artnr">\$\{l\.artNr\}<\/span>\s*<\/div>/g, cardHTML4.trim());

    return text;
}

// apply to everything except the body of createMixAndMatchApp
// The easiest way is to apply to part 0, and then apply to part 1 AFTER the end of MixAndMatchApp.
// Wait, we can just apply it to part 0, and part 1. Does createMixAndMatchApp use `result-item-btn`?
// Let's just apply to part 0 and part 1, BUT for MixAndMatchApp we know it might use `.result-item-btn` or it might not.
// Let's just apply to part 0 and part 1. MixAndMatchApp does not use `hideSizeForm` or `t.manufacturer`.

let newCode = applyReplacements(parts[0]) + 'export function createMixAndMatchApp' + (parts.length > 1 ? applyReplacements(parts[1]) : '');

fs.writeFileSync('modules/factories.js', newCode);
console.log('Done replacing templates.');
