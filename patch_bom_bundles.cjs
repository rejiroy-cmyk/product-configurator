const fs = require('fs');
const file = 'modules/factories.js';
let content = fs.readFileSync(file, 'utf8');

const regex = /\/\/ ─── BUNDLE INJECTION \(Logic 3\) ──────────────────────────────[\s\S]*?\}\n\s*\}\);\n/g;

const replacement = `// ─── BUNDLE INJECTION (Logic 3) ──────────────────────────────
                    let bundlesToInject = [];
                    if (mat.bundle && mat.bundle.length > 0) {
                        bundlesToInject = [...mat.bundle];
                    }
                    if (mat.bundleRules && mat.bundleRules.length > 0) {
                        const r = mat.bundleRules.find(br => br.optionArtNrs.includes(selectedOption.artNr));
                        if (r && r.bundle) {
                            bundlesToInject.push(...r.bundle);
                        }
                    }

                    if (bundlesToInject.length > 0) {
                        bundlesToInject.forEach(b => {
                            const bArtClean = (b.artNr || '').replace(/\\s/g, '');
                            const foundZubB = zubPool.find(z => (z.artNr || '').replace(/\\s/g, '') === bArtClean);
                            const labelB = foundZubB ? foundZubB.label : b.label;
                            const imgB = foundZubB ? foundZubB.imgUrl : b.imgUrl;
                            const combinedLblB = (labelB + ' ' + (b.type || '')).toLowerCase();
                            let priB = 99;
                            if (combinedLblB.includes('schaum') || combinedLblB.includes('kleber') || combinedLblB.includes('mittenabstütz')) priB = 7;
                            else if (combinedLblB.includes('schall') || combinedLblB.includes('isolation')) priB = 8;
                            else priB = priority + 0.1; // Stay close to parent item

                            finalBOM.push({
                                artNr: b.artNr,
                                label: labelB,
                                typ: b.type || 'Bündelartikel',
                                menge: b.menge || 1,
                                img: imgB,
                                note: \`Inkl. zu \${mat.name}\`,
                                priority: priB
                            });
                        });
                    }
                });
`;

let matches = 0;
content = content.replace(regex, () => { matches++; return replacement; });
fs.writeFileSync(file, content, 'utf8');
console.log('BOM patched, matches:', matches);
