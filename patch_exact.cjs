const fs = require('fs');
const file = 'modules/factories.js';
let content = fs.readFileSync(file, 'utf8');

// We will replace the newly inserted logic with a RegEx-based exact word matching logic.
const newLogic = `
                    // Use RegEx for exact word boundaries to ensure whole words are matched
                    const matchWord = (words) => {
                        return words.some(w => {
                            // Support German compound words by allowing hyphens or spaces, but match full token
                            // Actually, let's use a dynamic RegEx to match the exact word or substantial compound part
                            // Since combinedLbl is lowercased, we match it.
                            return new RegExp(\`\\\\b\${w}\\\\b\`, 'i').test(combinedLbl) || 
                                   new RegExp(\`\${w}\`, 'i').test(combinedLbl); // Fallback to includes but prioritize exact match?
                        });
                    };
                    
                    // A better approach: explicitly check the exact accessory type if possible, or use strict word boundary.
                    // But wait, the user said "whole description is getting read".
                    // Let's create a robust parser that checks for exact words using regex.
                    const exactMatch = (words) => words.some(w => new RegExp(\`(^|\\\\s|-|\\\\/)\${w}(\\\\s|-|\\\\/|$)\`, 'i').test(combinedLbl));

                    if (exactMatch(['deckel', 'ablaufabdeckung', 'ablaufdeckel']) && !exactMatch(['ohne'])) {
                        priority = 2;
                    } else if (exactMatch(['schallschutz', 'schallschutzset', 'isolation', 'schallband'])) {
                        priority = 8;
                    } else if (exactMatch(['schaum', 'montageschaum', 'fuss', 'füsse', 'fussset', 'wannenfüsse', 'stelzfüsse', 'mittenabstütz', 'wannenanker', 'mittenabstützsystem', 'stütz'])) {
                        priority = 7;
                    } else if (exactMatch(['träger', 'rahmen', 'wannenträger', 'montagerahmen'])) {
                        priority = 6;
                    } else if (exactMatch(['montageset', 'dichtset', 'einbauset'])) {
                        priority = 5;
                    } else if (exactMatch(['dichtband', 'wannenband', 'zargen', 'zargen-wannendichtband', 'zargenband'])) {
                        priority = 4;
                    } else if (exactMatch(['ablauf', 'siphon', 'garnitur', 'sifon', 'ablaufgarnitur'])) {
                        priority = 3;
                    } else {
                        priority = 9; // Any generic unclassified accessories
                    }
`;

const unminifiedRegex2 = /\/\/ Reordered evaluation to prevent partial word conflicts[\s\S]*?priority = 9;\s*\/\/ Any generic unclassified accessories\s*\}/g;
content = content.replace(unminifiedRegex2, newLogic.trim());

// For minified:
const newMinifiedLogic = `
const xm=(words)=>words.some(w=>new RegExp(\`(^|\\\\s|-|\\\\/)\${w}(\\\\s|-|\\\\/|$)\`,'i').test(G));
xm(['deckel','ablaufabdeckung','ablaufdeckel'])&&!xm(['ohne'])?C=2:
xm(['schallschutz','schallschutzset','isolation','schallband'])?C=7:
xm(['schaum','montageschaum','fuss','füsse','fussset','wannenfüsse','stelzfüsse','mittenabstütz','wannenanker','mittenabstützsystem','stütz'])?C=6:
xm(['träger','rahmen','wannenträger','montagerahmen'])?C=5:
xm(['montageset','dichtset','einbauset'])?C=4:
xm(['dichtband','wannenband','zargen','zargen-wannendichtband','zargenband'])?C=4:
xm(['ablauf','siphon','garnitur','sifon','ablaufgarnitur'])?C=3:
8`.replace(/\s+/g, ''); // Be careful with spacing in regex when replacing spaces

const minifiedSafe = `const xm=(W)=>W.some(w=>new RegExp('(^|\\\\s|-|\\\\/)'+w+'(\\\\s|-|\\\\/|$)','i').test(G));xm(['deckel','ablaufabdeckung','ablaufdeckel'])&&!xm(['ohne'])?C=2:xm(['schallschutz','schallschutzset','isolation','schallband'])?C=7:xm(['schaum','montageschaum','fuss','füsse','fussset','wannenfüsse','stelzfüsse','mittenabstütz','wannenanker','mittenabstützsystem','stütz'])?C=6:xm(['träger','rahmen','wannenträger','montagerahmen'])?C=5:xm(['montageset','dichtset','einbauset'])?C=4:xm(['dichtband','wannenband','zargen','zargen-wannendichtband','zargenband'])?C=4:xm(['ablauf','siphon','garnitur','sifon','ablaufgarnitur'])?C=3:C=8`;

const minifiedRegex2 = /\(G\.includes\("deckel"\)&&!G\.includes\("ohne ablaufdeckel"\)\)\?C=2:G\.includes\("schall"\)\|\|G\.includes\("isolation"\)\?C=7:G\.includes\("schaum"\)\|\|G\.includes\("fuss"\)\|\|G\.includes\("füsse"\)\|\|G\.includes\("mittenabstütz"\)\|\|G\.includes\("wannenanker"\)\|\|G\.includes\("stütz"\)\?C=6:G\.includes\("träger"\)\|\|G\.includes\("rahmen"\)\|\|G\.includes\("wannenträger"\)\|\|G\.includes\("montagerahmen"\)\?C=5:G\.includes\("montageset"\)\|\|G\.includes\("dichtset"\)\|\|G\.includes\("einbauset"\)\?C=4:G\.includes\("dichtband"\)\|\|G\.includes\("wannenband"\)\|\|G\.includes\("zargen"\)\?C=4:G\.includes\("ablauf"\)\|\|G\.includes\("siphon"\)\|\|G\.includes\("garnitur"\)\|\|G\.includes\("sifon"\)\?C=3:8/g;

content = content.replace(minifiedRegex2, minifiedSafe);

fs.writeFileSync(file, content, 'utf8');
console.log("Patched exact match successfully");
