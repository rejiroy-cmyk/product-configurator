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

    if (!data.waschtisch || !data.waschtisch.trays) return;

    let targetTrays = data.waschtisch.trays.filter(t => {
        const lbl = (t.label || '').toLowerCase();
        return !lbl.includes('abstell') && !lbl.includes('ablage');
    });

    console.log(`Starting Armor-Piercing Scraper on ${targetTrays.length} Washbasins...`);

    const browser = await puppeteer.launch({ 
        headless: 'new',
        args: ['--no-sandbox', '--window-size=1920,1080'] 
    });

    const page = await browser.newPage();
    let updatedCount = 0;

    try {
        for (let i = 0; i < targetTrays.length; i++) {
            const tray = targetTrays[i];
            
            const cleanFull = tray.artNr.replace(/\s/g, '');
            const match = cleanFull.match(/^\d{7,8}/);
            const searchQuery = match ? match[0] : tray.artNr.trim();

            console.log(`\n[${i+1}/${targetTrays.length}] Scanning for: ${tray.artNr}`);
            
            try {
                let targetUrl = `https://profishop.sanitastroesch.ch/de/search?q=${encodeURIComponent(searchQuery)}`;
                await page.goto(targetUrl, { waitUntil: 'networkidle2', timeout: 30000 });
                await new Promise(r => setTimeout(r, 2000));
                
                let currentUrl = await page.url();
                
                // Jump directly into the product page if we are still on the search page
                if (currentUrl.includes('/search')) {
                    try {
                        const cardSelector = 'a[href*="/p/"], a[href*="/product"], [class*="product-card"], [class*="ProductCard"], [class*="product-item"], [class*="list-group-item"]';
                        await page.waitForSelector(cardSelector, { timeout: 5000 });
                        
                        console.log(`   -> Found Product Card. Simulating Mouse Click...`);
                        await Promise.all([
                            page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 30000 }),
                            page.evaluate((sel) => document.querySelector(sel).click(), cardSelector)
                        ]);
                        await new Promise(r => setTimeout(r, 2000));
                    } catch (err) {
                        console.log(`   -> Server returned '0 results' for this query.`);
                        continue;
                    }
                } else {
                    console.log(`   -> Redirected cleanly directly to PDP.`);
                    await new Promise(r => setTimeout(r, 2000));
                }

                // Read the absolute entire page string as one giant blob, including the Title!
                const massiveString = await page.evaluate(() => {
                    return document.title + " " + document.body.innerText.replace(/\n|<br>/g, ' ');
                });

                // Utilize a Loose Regex to catch newlines, spaces, and colons in between!
                const regex = /(abstellfl[äa]che|ablage)[\s\:\-]+(links|rechts|beidseitig)/i;
                const foundMatch = massiveString.match(regex);

                if (foundMatch) {
                    const extractedValue = `Abstellfläche ${foundMatch[2].toLowerCase()}`; // yields "Abstellfläche rechts"
                    console.log(`   -> 🔥 BINGO! Appending: "${extractedValue}"`);
                    tray.label = `${tray.label}, ${extractedValue}`;
                    updatedCount++;
                    if (updatedCount % 2 === 0) fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
                } else {
                    console.log(`   -> Investigated full page HTML. Data missing or hidden in iFrame.`);
                }

            } catch (err) {
                console.log(`   -> Error: ${err.message}`);
            }
        }

        if (updatedCount > 0) {
            fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
            console.log(`\nDONE! Final Scraper successfully healed ${updatedCount} products!`);
        } else {
            console.log(`\nDONE! Investigated all products.`);
        }

    } finally {
        await browser.close();
    }
})();
