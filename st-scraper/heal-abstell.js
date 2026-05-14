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
        return !lbl.includes('abstellfläche') && !lbl.includes('ablage');
    });

    console.log(`Found ${targetTrays.length} Waschtisch-items that lack Abstellfläche metadata. Deploying DEEP SCRAPE...`);
    if (targetTrays.length === 0) return;

    let updatedCount = 0;

    const browser = await puppeteer.launch({ 
        headless: 'new',
        args: ['--no-sandbox', '--window-size=1920,1080'] 
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });

    try {
        for (let i = 0; i < targetTrays.length; i++) {
            const tray = targetTrays[i];
            
            // Clean article number strictly. "2233 116.105.000" -> "2233116.105.000" or similar
            // Profishop search API is most forgiving with just the base number
            const parts = tray.artNr.replace(/\s/g, '').split('.');
            let searchQuery = parts[0]; 
            if (parts.length > 1) {
                // E.g. 2233116.105.000 -> 2233 116.105.000 is often how it is displayed.
                searchQuery = tray.artNr.trim();
            }

            console.log(`[${i+1}/${targetTrays.length}] Deep search for: ${tray.artNr} - ${tray.label}`);
            
            try {
                const searchUrl = `https://profishop.sanitastroesch.ch/de/search?q=${encodeURIComponent(searchQuery)}`;
                await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 30000 });
                
                // Wait extensively for JS apps to render components
                await new Promise(r => setTimeout(r, 4000));

                const deepData = await page.evaluate(() => {
                    const nodes = Array.from(document.querySelectorAll('td, th, span, div, p, li, h1, h2, h3'));
                    let hit = null;
                    
                    for (let n of nodes) {
                        const txt = n.innerText.toLowerCase().replace(/\n/g, ' ').trim();
                        // Sometimes it's written as "Ablage: links", "Ablage links", "Ausführung: Abstellfläche links", "Ablagefläche rechts"
                        if (txt.includes('ablage') || txt.includes('abstell')) {
                            if (txt.includes('links')) hit = 'Abstellfläche links';
                            if (txt.includes('rechts')) hit = 'Abstellfläche rechts';
                            if (txt.includes('beidseitig')) hit = 'Abstellfläche beidseitig';
                            if (hit) break;
                        }
                    }
                    return hit;
                });

                if (deepData) {
                    console.log(`   -> FOUND DEEP: ${deepData}`);
                    tray.label = `${tray.label}, ${deepData}`;
                    updatedCount++;
                    
                    if (updatedCount % 2 === 0) {
                        fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
                    }
                } else {
                    console.log(`   -> No Abstellfläche metadata found in DOM.`);
                }

            } catch (err) {
                console.log(`   -> Error scraping: ${err.message}`);
            }
        }

        if (updatedCount > 0) {
            fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
            console.log(`\nDONE! Deep Scrape successfully healed ${updatedCount} Waschtische!`);
        } else {
            console.log(`\nDONE! Deep Scrape investigated all products. No hidden Abstellfläche data was discovered.`);
        }

    } finally {
        await browser.close();
    }
})();
