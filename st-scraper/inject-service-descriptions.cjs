const fs = require('fs');
const path = require('path');

const dataPath = '/Users/jenistonsellathamby/Desktop/product-configurator/custom-data.json';
const cachePath = '/Users/jenistonsellathamby/Desktop/product-configurator/st-scraper/service-descriptions-scraped.json';

(async () => {
    console.log("Loading custom-data.json...");
    let data;
    try {
        data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
    } catch (e) {
        console.error("Could not load custom-data.json:", e.message);
        process.exit(1);
    }

    console.log("Loading scraped descriptions...");
    let cache = {};
    if (fs.existsSync(cachePath)) {
        try {
            cache = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
            console.log(`Loaded ${Object.keys(cache).length} descriptions from cache.`);
        } catch (e) {
            console.error("Could not load cache:", e.message);
            process.exit(1);
        }
    } else {
        console.error("Cache file does not exist.");
        process.exit(1);
    }

    // Helper to check if a description is valid
    function isValidDescription(desc) {
        if (!desc) return false;
        const lower = desc.toLowerCase();
        if (lower.includes('not found') || lower.includes('no description') || lower.includes('failed') || lower.includes('available')) {
            // Check if it's actually just a short error placeholder
            if (desc.length < 50) return false;
        }
        return true;
    }

    let updatedServicesCount = 0;
    let productsUpdatedCount = 0;

    const categories = ['duschtrennwand', 'badeabtrennung'];
    categories.forEach(cat => {
        const trays = data[cat]?.trays || [];
        trays.forEach(tray => {
            let trayUpdated = false;
            if (tray.services && Array.isArray(tray.services)) {
                tray.services.forEach(service => {
                    if (service.artNr) {
                        const description = cache[service.artNr];
                        if (isValidDescription(description)) {
                            service.description = description;
                            updatedServicesCount++;
                            trayUpdated = true;
                        } else {
                            // If we don't have a valid description, default it to null
                            service.description = null;
                        }
                    }
                });
            }
            if (trayUpdated) {
                productsUpdatedCount++;
            }
        });
    });

    console.log(`Updated ${updatedServicesCount} service instances across ${productsUpdatedCount} products.`);

    // Save database back
    fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
    console.log("Database successfully updated and saved to custom-data.json.");
})();
