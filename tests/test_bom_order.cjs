const fs = require('fs');
const path = require('path');

const factoriesPath = path.join(__dirname, '../modules/factories.js');
const code = fs.readFileSync(factoriesPath, 'utf8');

// The exact priority rules for Duschenwanne
const expectedPriorityBlock = `if (exactMatch(['deckel', 'ablaufabdeckung', 'ablaufdeckel', 'haube', 'ablaufhaube']) && !exactMatch(['ohne'])) {
                        priority = 2;
                    } else if (exactMatch(['ablauf', 'siphon', 'garnitur', 'sifon', 'ablaufgarnitur'])) {
                        priority = 3;
                    } else if (exactMatch(['dichtband', 'wannenband', 'zargen', 'zargen-wannendichtband', 'zargenband'])) {
                        priority = 4;
                    } else if (exactMatch(['träger', 'rahmen', 'wannenträger', 'montagerahmen'])) {
                        priority = 5;
                    } else if (exactMatch(['schaum', 'montageschaum', 'fuss', 'füsse', 'fussset', 'wannenfüsse', 'stelzfüsse', 'mittenabstütz', 'wannenanker', 'mittenabstützsystem', 'stütz', 'mas'])) {
                        priority = 6;
                    } else if (exactMatch(['schallschutz', 'schallschutzset', 'isolation', 'schallband'])) {
                        priority = 7;
                    } else {
                        priority = 9; // Any generic unclassified accessories
                    }`;

// Normalize whitespace to make the test resilient to minor indentation changes
const normalize = str => str.replace(/\s+/g, ' ').trim();

if (!normalize(code).includes(normalize(expectedPriorityBlock))) {
    console.error("❌ BOM ORDER TEST FAILED: The established priority order for Duschenwanne in factories.js has been modified or broken!");
    console.error("Please refer to INSTRUCTIONS.md. Revert your changes unless explicitly authorized by the user.");
    process.exit(1);
} else {
    console.log("✅ BOM ORDER TEST PASSED: Duschenwanne priority order matches the established rules.");
    process.exit(0);
}
