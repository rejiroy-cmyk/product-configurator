const fs = require('fs');
const file = 'modules/factories.js';
let content = fs.readFileSync(file, 'utf8');

const regex = /const exactMatch = \(words\) => words\.some[\s\S]*?priority = 9; \/\/ Any generic unclassified accessories\n                    \}/;

const newLogic = `
                    const exactMatch = (words) => words.some(w => new RegExp(\`(^|\\\\s|-|\\\\/)\${w}(\\\\s|-|\\\\/|$)\`, 'i').test(combinedLbl));
                    const mName = (mat.name || '').toLowerCase();

                    // Prioritize exactly based on the standardized mat.name set by the patch script
                    if (mName === 'ablaufdeckel') {
                        priority = 2;
                    } else if (mName === 'ablaufgarnitur') {
                        priority = 3;
                    } else if (mName === 'zargen-wannendichtband' || mName === 'dichtband') {
                        priority = 4;
                    } else if (mName === 'montageset' || mName === 'dichtset') {
                        priority = 5;
                    } else if (mName === 'wannenträger system' || mName === 'wannenträger' || mName === 'montagerahmen') {
                        priority = 6;
                    } else if (mName === 'montageschaum' || mName === 'fussset' || mName === 'wannenfüsse' || mName === 'stelzfüsse' || mName.includes('abstütz') || mName.includes('anker')) {
                        priority = 7;
                    } else if (mName === 'schallschutzset' || mName === 'schallschutz') {
                        priority = 8;
                    } else {
                        // Fallback logic for generic Zubehör or unpatched trays
                        if (exactMatch(['deckel', 'ablaufabdeckung', 'ablaufdeckel']) && !combinedLbl.includes('ohne ablaufdeckel')) {
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
                            priority = 9;
                        }
                    }
`;

content = content.replace(regex, newLogic.trim());
fs.writeFileSync(file, content, 'utf8');
console.log('Priority logic patched');
