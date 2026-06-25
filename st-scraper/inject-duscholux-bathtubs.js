const fs = require('fs');
const path = require('path');

const dataPath = path.resolve(__dirname, '../custom-data.json');
const scraperPath = path.resolve(__dirname, 'duscholux-bathtubs.json');

(async () => {
    if (!fs.existsSync(scraperPath)) {
        console.error("Scraper output not found at " + scraperPath);
        return;
    }
    
    let db = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
    let scrapedData = JSON.parse(fs.readFileSync(scraperPath, 'utf8'));
    
    if (!db['badeabtrennung']) {
        db['badeabtrennung'] = { trays: [] };
    }
    
    let count = 0;
    
    for (let item of scrapedData) {
        if (!item.main || !item.main.artNr) continue;
        
        let tray = {
            id: 'bade_duscholux_' + item.main.artNr.replace(/\D/g, ''),
            manufacturer: 'Duscholux',
            form: 'Wannenmontage',
            artNr: item.main.artNr,
            label: item.main.label,
            imgUrl: item.main.imgUrl || "https://profishop.sanitastroesch.ch/multimedia/Web/PG1/01311872_100_181.png",
            mountingMaterials: []
        };
        
        // Add variations (as we do for Koralle/Duscholux)
        if (item.variants && item.variants.length > 0) {
            tray.variants = item.variants.map(v => ({
                artNr: v.artNr,
                label: v.label,
                type: 'Variante'
            }));
        }
        
        // Add services
        if (item.services && item.services.length > 0) {
            // Group services under a default accessory group
            tray.mountingMaterials.push({
                type: "Service",
                label: "Duscholux Services & Montage",
                options: item.services.map(s => ({
                    artNr: s.artNr,
                    label: s.label,
                    type: s.type || 'Zubehör'
                }))
            });
        }
        
        // Check if it already exists to avoid duplicates
        const existingIdx = db['badeabtrennung'].trays.findIndex(t => t.artNr === tray.artNr);
        if (existingIdx >= 0) {
            db['badeabtrennung'].trays[existingIdx] = tray;
        } else {
            db['badeabtrennung'].trays.push(tray);
        }
        
        count++;
    }
    
    fs.writeFileSync(dataPath, JSON.stringify(db, null, 4));
    console.log(`✅ Successfully injected ${count} Duscholux Bathtub screens into Badeabtrennung.`);
    console.log(`Total Badeabtrennung products: ${db['badeabtrennung'].trays.length}`);
})();
