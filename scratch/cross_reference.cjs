const fs = require('fs');
const path = require('path');

const dataPath = path.resolve(__dirname, '../custom-data.json');
const scrapedPath = path.resolve(__dirname, '../st-scraper/duschenwanne-accessories.json');
const poolCsvPath = path.resolve(__dirname, '../import_accessories_pool.csv');
const outputPath = path.resolve(__dirname, '../duschenwanne_accessories_cross_reference.csv');

function cleanArtNr(nr) {
    if (!nr) return '';
    return nr.replace(/\s/g, '').trim();
}

async function main() {
    console.log("Loading data...");
    const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
    const scraped = JSON.parse(fs.readFileSync(scrapedPath, 'utf8'));
    
    // Create a map of Tray ArtNr to Label
    const trayMap = {};
    if (data.duschenwanne && data.duschenwanne.trays) {
        data.duschenwanne.trays.forEach(t => {
            trayMap[cleanArtNr(t.artNr)] = t.label;
        });
    }

    // Create a set of Pool ArtNrs for cross-referencing
    const poolArtNrs = new Set();
    if (data.zubehoer_pool && data.zubehoer_pool.trays) {
        data.zubehoer_pool.trays.forEach(a => {
            poolArtNrs.add(cleanArtNr(a.artNr));
        });
    }

    // Process scraped data
    const fullReportRows = [
        "Tray ArtNr,Tray Label,Accessory ArtNr,Accessory Label,Category,In Pool"
    ];

    const missingAccessories = new Map(); // Unique map for missing items

    Object.keys(scraped).forEach(trayArtNr => {
        const trayData = scraped[trayArtNr];
        const cleanedTrayArtNr = cleanArtNr(trayArtNr);
        const trayLabel = trayMap[cleanedTrayArtNr] || "Unknown Tray";

        Object.keys(trayData).forEach(category => {
            const accessories = trayData[category];
            if (Array.isArray(accessories)) {
                accessories.forEach(acc => {
                    const cleanedAccArtNr = cleanArtNr(acc.artNr);
                    const inPool = poolArtNrs.has(cleanedAccArtNr);
                    
                    // Escape CSV values
                    const escape = (val) => `"${(val || '').toString().replace(/"/g, '""')}"`;
                    
                    // Full report row
                    fullReportRows.push([
                        escape(trayArtNr),
                        escape(trayLabel),
                        escape(acc.artNr),
                        escape(acc.label),
                        escape(category),
                        inPool ? "YES" : "NO"
                    ].join(','));

                    // Track unique missing accessories
                    if (!inPool) {
                        const isAccTray = acc.label.toLowerCase().includes('duschwanne') || 
                                          acc.label.toLowerCase().includes('duschenwanne') ||
                                          acc.label.toLowerCase().includes('duschfläche');
                        
                        const hasAccKeyword = acc.label.toLowerCase().includes('zubehör') || 
                                              acc.label.toLowerCase().includes('träger') || 
                                              acc.label.toLowerCase().includes('siphon') || 
                                              acc.label.toLowerCase().match(/\bsets?\b/) ||
                                              acc.label.toLowerCase().includes('profil') ||
                                              acc.label.toLowerCase().includes('rahmen') ||
                                              acc.label.toLowerCase().includes('füsse') ||
                                              acc.label.toLowerCase().includes('band') ||
                                              acc.label.toLowerCase().includes('schaum') ||
                                              acc.label.toLowerCase().includes('deckel');

                        const isActuallyTray = isAccTray && !hasAccKeyword;

                        if (!isActuallyTray && !missingAccessories.has(cleanedAccArtNr)) {
                            missingAccessories.set(cleanedAccArtNr, {
                                artNr: acc.artNr,
                                label: acc.label,
                                category: category,
                                sampleTray: trayArtNr
                            });
                        }
                    }
                });
            }
        });
    });

    console.log(`Writing full report (${fullReportRows.length - 1} rows) to ${outputPath}...`);
    fs.writeFileSync(outputPath, fullReportRows.join('\n'));

    // Generate missing accessories CSV
    const missingPath = path.resolve(__dirname, '../duschenwanne_missing_accessories.csv');
    const missingRows = [
        "Article Number,Label,Category,Found on Tray"
    ];

    missingAccessories.forEach(acc => {
        const escape = (val) => `"${(val || '').toString().replace(/"/g, '""')}"`;
        missingRows.push([
            escape(acc.artNr),
            escape(acc.label),
            escape(acc.category),
            escape(acc.sampleTray)
        ].join(','));
    });

    console.log(`Writing missing accessories (${missingRows.length - 1} unique items) to ${missingPath}...`);
    fs.writeFileSync(missingPath, missingRows.join('\n'));
    console.log("Done.");
}

main().catch(console.error);
