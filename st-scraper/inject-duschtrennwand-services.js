const fs = require('fs');
const path = require('path');

const dataPath = path.resolve(__dirname, '../custom-data.json');
const scraperDataPath = path.resolve(__dirname, 'duschtrennwand-services.json');

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

['duschtrennwand', 'badeabtrennung'].forEach(category => {
    if (!data[category] || !data[category].trays) return;
    
    data[category].trays.forEach(t => {
        if (scrapedData[t.artNr] && scrapedData[t.artNr].length > 0) {
            if (!t.services) t.services = [];
            
            // Only inject if not already present
            scrapedData[t.artNr].forEach(service => {
                if (!t.services.find(s => s.artNr === service.artNr)) {
                    t.services.push(service);
                    injectedCount++;
                }
            });
        }
    });
});

fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
console.log(`Successfully injected ${injectedCount} service costs into custom-data.json!`);
