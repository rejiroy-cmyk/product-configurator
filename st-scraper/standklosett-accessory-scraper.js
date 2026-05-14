const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());
const fs = require('fs');
const path = require('path');

const dataPath = path.resolve(__dirname, '../custom-data.json');
const outputPath = path.resolve(__dirname, 'standklosett-accessories.json');

let data;
try {
    data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
} catch (e) {
    console.log("Could not find custom-data.json"); process.exit(1);
}

const standklosetts = (data.standklosett && data.standklosett.trays) ? data.standklosett.trays : [];
console.log(`Starting scraper for ${standklosetts.length} Standklosetts...`);

const results = {};
if (fs.existsSync(outputPath)) {
    try {
        Object.assign(results, JSON.parse(fs.readFileSync(outputPath, 'utf8')));
        console.log(`Loaded ${Object.keys(results).length} existing results.`);
    } catch(e) { console.log("Starting fresh."); }
}

(async () => {
    const browser = await puppeteer.launch({ headless: false, args: ['--window-size=1920,1080'] });
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });

    try {
        for (let i = 0; i < standklosetts.length; i++) {
            const tray = standklosetts[i];

            if (results[tray.artNr]) {
                console.log(`[${i+1}/${standklosetts.length}] Skipping ${tray.artNr} (Already Scraped)`);
                continue;
            }

            const cleanFull = tray.artNr.replace(/\s/g, '');
            const match = cleanFull.match(/^\d{7,8}/);
            const searchQuery = match ? match[0] : tray.artNr.trim();

            console.log(`\n[${i+1}/${standklosetts.length}] Searching: ${tray.artNr}`);

            try {
                const searchUrl = `https://profishop.sanitastroesch.ch/business/search?q=${encodeURIComponent(searchQuery)}`;
                await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 30000 });
                await new Promise(r => setTimeout(r, 2000));

                let currentUrl = page.url();
                let isSearchPage = currentUrl.includes('/search');

                // Try to navigate to product page
                if (isSearchPage) {
                    const productHref = await page.evaluate(() => {
                        const links = Array.from(document.querySelectorAll('a'));
                        for (let a of links) {
                            const href = a.href || '';
                            if (href.includes('/business/article-') && !href.includes('/search')) return href;
                        }
                        return null;
                    });

                    if (productHref) {
                        await page.goto(productHref, { waitUntil: 'networkidle0', timeout: 30000 });
                        await new Promise(r => setTimeout(r, 4000));
                    } else {
                        console.log(`   -> No product page found.`);
                        results[tray.artNr] = { reservoir: [], sleeves: [], screws: [] };
                        fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
                        continue;
                    }
                } else {
                    await new Promise(r => setTimeout(r, 4000));
                }

                // Scroll to load all accessories
                await page.evaluate(async () => {
                    await new Promise((resolve) => {
                        let totalHeight = 0;
                        const timer = setInterval(() => {
                            window.scrollBy(0, 500);
                            totalHeight += 500;
                            if (totalHeight >= document.body.scrollHeight - window.innerHeight || totalHeight > 10000) {
                                clearInterval(timer); resolve();
                            }
                        }, 200);
                    });
                });
                await new Promise(r => setTimeout(r, 2000));

                const pdpData = await page.evaluate(() => {
                    const accessoryRows = Array.from(document.querySelectorAll('.product-list-item, tr, .row, article, .card'));
                    
                    const extracted = { reservoir: [], sleeves: [], screws: [] };

                    for (let row of accessoryRows) {
                        const rowText = (row.innerText || '').toLowerCase();
                        const artNrMatch = rowText.match(/(\d{4}\s?\d{3}\.\d{3}\.\d{3}|\d{7,8})/);
                        if (!artNrMatch) continue;
                        const artNr = artNrMatch[0].replace(/\n/g, '').trim();

                        let label = "";
                        const links = row.querySelectorAll('a');
                        if (links && links.length > 0) {
                            label = links[0].innerText.replace(/\n/g, ' ').trim();
                        }

                        // Reservoir / Spülkasten (External or In-wall)
                        if (rowText.includes('spülkasten') || rowText.includes('reservoir') || rowText.includes('ap128') || rowText.includes('ap116') || rowText.includes('3351')) {
                            if (!extracted.reservoir.find(s => s.artNr === artNr)) {
                                extracted.reservoir.push({ artNr, label, type: 'Reservoir' });
                            }
                        }
                        // Connector sleeves - Ablaufmanschette / Ablaufanschluss
                        else if (rowText.includes('manschette') || rowText.includes('ablaufanschluss') || rowText.includes('garnitur') || artNr.includes('3241')) {
                            if (!extracted.sleeves.find(s => s.artNr === artNr)) {
                                extracted.sleeves.push({ artNr, label, type: 'Ablaufanschluss' });
                            }
                        }
                        // Screws / Fixings
                        else if (rowText.includes('schraube') || rowText.includes('befestigungs') || rowText.includes('montageset') || rowText.includes('fixier') || artNr.includes('8211')) {
                            if (!extracted.screws.find(s => s.artNr === artNr)) {
                                extracted.screws.push({ artNr, label, type: 'Befestigung' });
                            }
                        }
                    }
                    return extracted;
                });

                const totalFound = pdpData.reservoir.length + pdpData.sleeves.length + pdpData.screws.length;
                if (totalFound > 0) {
                    console.log(`   -> 🔥 FOUND: ${pdpData.reservoir.length} Reservoir, ${pdpData.sleeves.length} Sleeves, ${pdpData.screws.length} Screws`);
                } else {
                    console.log(`   -> Nothing specific found.`);
                }

                results[tray.artNr] = pdpData;
                fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));

            } catch (err) {
                console.log(`   -> Error: ${err.message}`);
                results[tray.artNr] = { reservoir: [], sleeves: [], screws: [] };
                fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
            }
        }
    } finally {
        await browser.close();
        console.log("\nScraping finished. Results saved to st-scraper/standklosett-accessories.json");
    }
})();
