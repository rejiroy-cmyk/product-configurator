const fs = require('fs');

const accessories = JSON.parse(fs.readFileSync('./st-scraper/mischer-accessories.json', 'utf8'));
const pool = JSON.parse(fs.readFileSync('./custom-data.json', 'utf8'));

// 1. Gather all unique accessories scraped
const scrapedItems = new Map();

for (const mainArtNr in accessories) {
    const categories = accessories[mainArtNr];
    for (const catName in categories) {
        if (Array.isArray(categories[catName])) {
            categories[catName].forEach(item => {
                if (item.artNr && !scrapedItems.has(item.artNr)) {
                    scrapedItems.set(item.artNr, {
                        artNr: item.artNr,
                        label: item.label,
                        type: item.type
                    });
                }
            });
        }
    }
}

// 2. Gather all accessories used in the pool
const usedArts = new Set();
['duschenmischer', 'bademischer'].forEach(cat => {
    if (pool[cat] && pool[cat].trays) {
        pool[cat].trays.forEach(t => {
            usedArts.add(t.artNr); // Main product is in the pool
            if (t.mountingMaterials) {
                t.mountingMaterials.forEach(mat => {
                    if (mat.options) {
                        mat.options.forEach(opt => {
                            if (opt.artNr && !opt.artNr.startsWith('ohne_') && opt.artNr !== 'none') {
                                usedArts.add(opt.artNr);
                            }
                        });
                    }
                });
            }
        });
    }
});

// 3. Find the difference
const unused = [];
for (const [artNr, item] of scrapedItems.entries()) {
    if (!usedArts.has(artNr)) {
        unused.push(item);
    }
}

// Group by type for readable output
const grouped = {};
unused.forEach(item => {
    if (!grouped[item.type]) grouped[item.type] = [];
    grouped[item.type].push(item);
});

let mdOutput = "# Unused Scraped Accessories\n\n";
mdOutput += "These accessories were scraped from the website but are currently not injected as options in the configurator pool (`custom-data.json`).\n\n";

for (const type in grouped) {
    mdOutput += `### ${type} (${grouped[type].length})\n`;
    grouped[type].forEach(item => {
        mdOutput += `- **${item.artNr}**: ${item.label}\n`;
    });
    mdOutput += "\n";
}

fs.writeFileSync('./scratch/unused_accessories.md', mdOutput);
console.log(`Found ${unused.length} unused accessories. Written to scratch/unused_accessories.md`);
