const fs = require('fs');
const path = require('path');

const dataPath = path.resolve(__dirname, '../custom-data.json');
const scraperDataPath = path.resolve(__dirname, 'duschtrennwand-details.json');

let data;
let scrapedData;
try {
    data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
    scrapedData = JSON.parse(fs.readFileSync(scraperDataPath, 'utf8'));
} catch (e) {
    console.log("Could not find required JSON files.");
    process.exit(1);
}

let injectedCount = 0;
data.duschtrennwand.trays.forEach(t => {
    const artNr = t.artNr.trim();
    if (scrapedData[artNr]) {
        // Only inject if it has data
        if (scrapedData[artNr].description || Object.keys(scrapedData[artNr].specs).length > 0) {
            t.description = scrapedData[artNr].description;
            t.specs = scrapedData[artNr].specs;
            injectedCount++;
        }
    }
});

fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
console.log(`✅ Successfully injected descriptions and technical details into ${injectedCount} products!`);
