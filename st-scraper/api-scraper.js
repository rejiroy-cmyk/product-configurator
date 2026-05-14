const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());
const fs = require('fs');
const path = require('path');

const dataPath = path.resolve(__dirname, '../custom-data.json');

(async () => {
    let data;
    try {
        data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
    } catch (e) {
        console.log("Could not find custom-data.json");
        return;
    }

    if (!data.waschtisch || !data.waschtisch.trays) {
        console.log("No Waschtische in custom-data.json!");
        return;
    }

    let targetTrays = data.waschtisch.trays.filter(t => {
        const lbl = (t.label || '').toLowerCase();
        return !lbl.includes('abstell') && !lbl.includes('ablage');
    });

    console.log(`Starting API Network Interceptor... Scanning ${targetTrays.length} Washbasins`);

    const browser = await puppeteer.launch({ 
        headless: 'new',
        args: ['--no-sandbox', '--window-size=1920,1080'] 
    });

    const page = await browser.newPage();
    
    // We will store found data globally as the page loads
    let currentAbstell = null;

    page.on('response', async (response) => {
        const url = response.url();
        // Look for JSON API responses from Sanitas Troesch servers
        if ((url.includes('/api/') || url.includes('graphql') || url.includes('profishop')) && response.request().resourceType() === 'fetch' || response.request().resourceType() === 'xhr') {
            try {
                const textData = await response.text();
                // Lowercase the entire raw JSON payload to search broadly
                const rawLower = textData.toLowerCase();
                
                if (rawLower.includes('ablage') || rawLower.includes('abstell')) {
                    // Extract exactly what it says nearby.
                    if (rawLower.includes('abstellfläche links') || rawLower.includes('ablage links')) currentAbstell = 'Abstellfläche links';
                    else if (rawLower.includes('abstellfläche rechts') || rawLower.includes('ablage rechts')) currentAbstell = 'Abstellfläche rechts';
                    else if (rawLower.includes('abstellfläche beidseitig') || rawLower.includes('ablage beidseitig')) currentAbstell = 'Abstellfläche beidseitig';
                }
            } catch (err) {
                // Ignore parsing errors for opaque responses/images
            }
        }
    });

    try {
        let updatedCount = 0;

        for (let i = 0; i < targetTrays.length; i++) {
            const tray = targetTrays[i];
            
            // Clean article number for the URL
            const parts = tray.artNr.replace(/\s/g, '').split('.');
            let searchQuery = parts[0]; 
            if (parts.length > 1) searchQuery = tray.artNr.trim();

            console.log(`[${i+1}/${targetTrays.length}] Sniffing API for: ${tray.artNr} - ${tray.label.substring(0, 30)}...`);
            
            currentAbstell = null; // Reset for this product

            try {
                const searchUrl = `https://profishop.sanitastroesch.ch/de/search?q=${encodeURIComponent(searchQuery)}`;
                await page.goto(searchUrl, { waitUntil: 'networkidle0', timeout: 30000 });
                
                if (currentAbstell) {
                    console.log(`   -> 🔥 INTERCEPTED FROM API: ${currentAbstell}`);
                    tray.label = `${tray.label}, ${currentAbstell}`;
                    updatedCount++;
                    
                    if (updatedCount % 2 === 0) {
                        fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
                    }
                } else {
                    console.log(`   -> Nothing found in API payloads.`);
                }

            } catch (err) {
                console.log(`   -> Error or Timeout: ${err.message}`);
            }
        }

        if (updatedCount > 0) {
            fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
            console.log(`\nDONE! Network API Interceptor successfully healed ${updatedCount} products!`);
        } else {
            console.log(`\nDONE! Scanned all products deep in the network layer. No metadata existed.`);
        }

    } finally {
        await browser.close();
    }
})();
