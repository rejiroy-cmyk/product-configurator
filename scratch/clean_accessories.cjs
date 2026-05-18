const fs = require('fs');
const path = require('path');

const dataPath = path.resolve(__dirname, '../st-scraper/duschenwanne-accessories.json');
let scraped = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

let removedCount = 0;

Object.keys(scraped).forEach(trayArtNr => {
    Object.keys(scraped[trayArtNr]).forEach(category => {
        const originalLength = scraped[trayArtNr][category].length;
        scraped[trayArtNr][category] = scraped[trayArtNr][category].filter(acc => {
            const lbl = (acc.label || '').toLowerCase();
            const isAccTray = lbl.includes('duschwanne') || lbl.includes('duschenwanne') || lbl.includes('duschfläche');
            
            const hasAccKeyword = lbl.includes('zubehör') || 
                                  lbl.includes('träger') || 
                                  lbl.includes('siphon') || 
                                  lbl.match(/\bsets?\b/) ||
                                  lbl.includes('profil') ||
                                  lbl.includes('rahmen') ||
                                  lbl.includes('füsse') ||
                                  lbl.includes('band') ||
                                  lbl.includes('schaum') ||
                                  lbl.includes('deckel') ||
                                  lbl.includes('ablauf') ||
                                  lbl.includes('schall');

            const isActuallyTray = isAccTray && !hasAccKeyword;
            return !isActuallyTray;
        });
        removedCount += originalLength - scraped[trayArtNr][category].length;
    });
});

console.log(`Cleaned up ${removedCount} misclassified tray accessories.`);
fs.writeFileSync(dataPath, JSON.stringify(scraped, null, 2));
