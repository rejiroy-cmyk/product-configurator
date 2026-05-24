const fs = require('fs');
const file = 'modules/factories.js';
let content = fs.readFileSync(file, 'utf8');

const newLogic = `
                    // Reordered evaluation to prevent partial word conflicts (e.g., "Schallschutz für Wannenanker" should be Schallschutz, not Wannenanker).
                    if ((combinedLbl.includes('deckel') || combinedLbl.includes('ablaufabdeckung')) && !combinedLbl.includes('ohne ablaufdeckel') && !combinedLbl.includes('ohne deckel') && !combinedLbl.includes('ohne ablaufabdeckung')) {
                        priority = 2;
                    } else if (combinedLbl.includes('schall') || combinedLbl.includes('isolation')) {
                        priority = 8;
                    } else if (combinedLbl.includes('schaum') || combinedLbl.includes('fuss') || combinedLbl.includes('füsse') || combinedLbl.includes('mittenabstütz') || combinedLbl.includes('wannenanker') || combinedLbl.includes('stütz')) {
                        priority = 7;
                    } else if (combinedLbl.includes('träger') || combinedLbl.includes('rahmen') || combinedLbl.includes('wannenträger') || combinedLbl.includes('montagerahmen')) {
                        priority = 6;
                    } else if (combinedLbl.includes("montageset") || combinedLbl.includes("dichtset") || combinedLbl.includes("einbauset")) {
                        priority = 5;
                    } else if (combinedLbl.includes('dichtband') || combinedLbl.includes('wannenband') || combinedLbl.includes('zargen')) {
                        priority = 4;
                    } else if (combinedLbl.includes('ablauf') || combinedLbl.includes('siphon') || combinedLbl.includes('garnitur') || combinedLbl.includes('sifon')) {
                        priority = 3;
                    } else {
                        priority = 9; // Any generic unclassified accessories
                    }
`;

const unminifiedRegex1 = /if\s*\(\(combinedLbl\.includes\('deckel'\)[\s\S]*?else priority = 9;\s*\/\/ Any generic unclassified accessories/g;
content = content.replace(unminifiedRegex1, newLogic.trim());

const minifiedRegex = /\(G\.includes\("deckel"\)&&!G\.includes\("ohne ablaufdeckel"\)\)\?C=2:G\.includes\("ablauf"\)\|\|G\.includes\("siphon"\)\|\|G\.includes\("garnitur"\)\|\|G\.includes\("sifon"\)\?C=3:G\.includes\("dichtband"\)\|\|G\.includes\("wannenband"\)\|\|G\.includes\("zargen"\)\|\|G\.includes\("dichtset"\)\?C=4:G\.includes\("träger"\)\|\|G\.includes\("rahmen"\)\|\|G\.includes\("wannenträger"\)\|\|G\.includes\("montagerahmen"\)\?C=5:G\.includes\("schaum"\)\|\|G\.includes\("fuss"\)\|\|G\.includes\("füsse"\)\|\|G\.includes\("mittenabstütz"\)\|\|G\.includes\("wannenanker"\)\|\|G\.includes\("stütz"\)\?C=6:G\.includes\("schall"\)\|\|G\.includes\("isolation"\)\?C=7:C=8/g;

const newMinifiedLogic = `
(G.includes("deckel")&&!G.includes("ohne ablaufdeckel"))?C=2:
G.includes("schall")||G.includes("isolation")?C=7:
G.includes("schaum")||G.includes("fuss")||G.includes("füsse")||G.includes("mittenabstütz")||G.includes("wannenanker")||G.includes("stütz")?C=6:
G.includes("träger")||G.includes("rahmen")||G.includes("wannenträger")||G.includes("montagerahmen")?C=5:
G.includes("montageset")||G.includes("dichtset")||G.includes("einbauset")?C=4:
G.includes("dichtband")||G.includes("wannenband")||G.includes("zargen")?C=4:
G.includes("ablauf")||G.includes("siphon")||G.includes("garnitur")||G.includes("sifon")?C=3:
8`.replace(/\s+/g, '');

content = content.replace(minifiedRegex, newMinifiedLogic);

fs.writeFileSync(file, content, 'utf8');
console.log("Patched successfully");
