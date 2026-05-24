const fs = require('fs');
let code = fs.readFileSync('modules/factories.js', 'utf8');

// Find DuschenmischerApp
const dStart = code.indexOf('export function createDuschenmischerApp');
const bStart = code.indexOf('export function createBademischerApp');
const nStart = code.indexOf('export function createStandardApp');

function fixApp(appCode) {
    // We want to replace the `r.innerHTML = n.map(a => ...)` part for search results
    // The current template is:
    // r.innerHTML=n.map(a=>{const l=this.selectedTray&&this.selectedTray.id===a.id,o=a.imgUrl?`<img src="${a.imgUrl}" style="max-width:100%; max-height:100%; object-fit:contain;">`:'<div style="font-size:10px; color:#bbb;">No Image</div>'
    // return`
    // <div class="result-item-card ${l?"active":""}" data-tid="${a.id}" style="...">
    //    <div style="..."> ${o} </div>
    //    <div class="result-info" ...>
    //        <strong ...>${this.extractSerie(a)}</strong>
    //        <div class="result-meta" ...>
    //            ${a.artNr} | ${this.extractMontage(a)}
    //        </div>
    //    </div>
    // </div>`}).join("")

    const searchRegex = /r\.innerHTML=n\.map\(a=>\{const l=this\.selectedTray&&this\.selectedTray\.id===a\.id,o=a\.imgUrl\?\`<img src="\$\{a\.imgUrl\}" style="max-width:100%; max-height:100%; object-fit:contain;">\`:'<div style="font-size:10px; color:#bbb;">No Image<\/div>'\s*return\`\s*<div class="result-item-card \$\{l\?"active":""\}" data-tid="\$\{a\.id\}"[^>]*>[\s\S]*?<div[^>]*>[\s\S]*?\$\{o\}[\s\S]*?<\/div>\s*<div class="result-info"[^>]*>\s*<strong[^>]*>\$\{this\.extractSerie\(a\)\}<\/strong>\s*<div class="result-meta"[^>]*>[\s\S]*?\$\{a\.artNr\} \| \$\{this\.extractMontage\(a\)\}[\s\S]*?<\/div>\s*<\/div>\s*<\/div>\`\}\)\.join\(""\)/;

    const optionATemplate = `r.innerHTML=n.map(a=>{
        const l=this.selectedTray&&this.selectedTray.id===a.id;
        return \`
            <div class="result-item-card \${l ? 'active' : ''}" onclick="window.currentActiveApp.selectItem('\${a.id}')" data-tid="\${a.id}">
                <div class="card-img-wrapper">
                    \${a.imgUrl ? \\\`<img src="\${a.imgUrl}">\\\` : '<i class="ri-image-line placeholder-icon"></i>'}
                </div>
                <div class="result-info">
                    <strong>\${this.extractSerie(a)}</strong>
                    <div class="result-meta">
                        <span>\${a.manufacturer || 'Andere'}</span> | <span>\${this.extractMontage(a)}</span>
                    </div>
                    <span class="finish-artnr">\${a.artNr}</span>
                </div>
            </div>
        \`;
    }).join("")`;

    return appCode.replace(searchRegex, optionATemplate);
}

let duschenCode = code.substring(dStart, bStart);
let badeCode = code.substring(bStart, nStart);

let newDuschenCode = fixApp(duschenCode);
let newBadeCode = fixApp(badeCode);

if (duschenCode === newDuschenCode) {
    console.error("Duschenmischer NOT matched!");
} else {
    console.log("Duschenmischer matched!");
}

if (badeCode === newBadeCode) {
    console.error("Bademischer NOT matched!");
} else {
    console.log("Bademischer matched!");
}

code = code.substring(0, dStart) + newDuschenCode + newBadeCode + code.substring(nStart);
fs.writeFileSync('modules/factories.js', code);
