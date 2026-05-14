const fs = require('fs');

const file = '/Users/jenistonsellathamby/Desktop/product-configurator/modules/factories.js';
let content = fs.readFileSync(file, 'utf8');

const newCopyFn = `            copyToClipboard: function () {
                if (!this.selectedTray) {
                    alert('Bitte wählen Sie zuerst ein Produkt aus.');
                    return;
                }

                let textLines = [];
                const bomTableBody = document.getElementById('bomTableBody');
                if (bomTableBody) {
                    const rows = bomTableBody.querySelectorAll('tr');
                    rows.forEach(row => {
                        const codeSpan = row.querySelector('.bom-code');
                        const qtyStrong = row.querySelector('strong');
                        if (codeSpan && qtyStrong) {
                            const code = codeSpan.textContent.replace(/\\t/g, '').trim();
                            const menge = qtyStrong.textContent.replace(/\\t/g, '').trim();
                            textLines.push(\`\${code}\\t\${menge}\`);
                        }
                    });
                } else {
                    alert("Tabelle konnte nicht gefunden werden.");
                    return;
                }

                const text = textLines.join('\\n');
                navigator.clipboard.writeText(text).then(() => {
                    alert("Artikel und Menge kopiert für SAP:\\n\\n" + text.replace(/\\t/g, "    "));
                }).catch(e => alert("Kopieren fehlgeschlagen."));
            }`;

// Replace the copyToClipboard block in the entire file, but there are multiple factory functions.
// We only want to replace it for createRelationalApp and createWCApp.

function replaceCopy(funcName) {
    const startStr = `export function ${funcName}(`;
    const startIndex = content.indexOf(startStr);
    if (startIndex === -1) return;

    let copyStart = content.indexOf('copyToClipboard: function () {', startIndex);
    if (copyStart === -1) return;
    
    // find end of copyToClipboard which is `}` at indent level of `copyToClipboard`
    // but easier to regex or find the `};` or `}`.
    // In our file, it ends at `    };` for the return object
    let i = copyStart;
    let braces = 0;
    let foundEnd = false;
    while(i < content.length) {
        if (content[i] === '{') braces++;
        if (content[i] === '}') {
            braces--;
            if (braces === 0) {
                foundEnd = true;
                break;
            }
        }
        i++;
    }
    
    if (foundEnd) {
        content = content.substring(0, copyStart) + newCopyFn + content.substring(i + 1);
    }
}

replaceCopy('createRelationalApp');
replaceCopy('createWCApp');

fs.writeFileSync(file, content);
console.log("Updated copy logic");
