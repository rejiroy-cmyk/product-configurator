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
        return !lbl.includes('befestigung');
    });

    console.log(`Testing scraper on ${targetTrays.length} items...`);

    const browser = await puppeteer.launch({ 
        headless: false,
        args: ['--window-size=1920,1080'] 
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });

    let updated = 0;
    const screwResults = {};

    try {
        for (let i = 0; i < targetTrays.length; i++) {
            const tray = targetTrays[i];
            const cleanFull = tray.artNr.replace(/\s/g, '');
            const match = cleanFull.match(/^\d{7,8}/);
            const searchQuery = match ? match[0] : tray.artNr.trim();

            console.log(`\n[${i+1}/${targetTrays.length}] Searching ArtNr: ${tray.artNr}`);
            
            try {
                // Use the new /business/ routing
                let targetUrl = `https://profishop.sanitastroesch.ch/business/search?q=${encodeURIComponent(searchQuery)}`;
                await page.goto(targetUrl, { waitUntil: 'networkidle2', timeout: 30000 });
                await new Promise(r => setTimeout(r, 2000));
                
                let currentUrl = await page.url();
                let isSearchPage = currentUrl.includes('/search');

                const pageInfo = await page.evaluate(() => document.body.innerText.substring(0, 300));
                if (pageInfo.includes('Keine Ergebnisse')) {
                     await page.goto(`https://profishop.sanitastroesch.ch/business/search?q=${cleanFull}`, { waitUntil: 'networkidle2' });
                     await new Promise(r => setTimeout(r, 2000));
                     currentUrl = await page.url();
                     isSearchPage = currentUrl.includes('/search');
                }

                if (isSearchPage) {
                    const productHref = await page.evaluate((sq) => {
                        const links = Array.from(document.querySelectorAll('a'));
                        for (let a of links) {
                            const href = a.href || '';
                            // Match the new /business/article- format
                            if (href.includes('/business/article-') && !href.includes('/search')) {
                                return href;
                            }
                            // Fallback generic matches
                            if (href.includes(sq) && !href.includes('/search') && !href.includes('=') && href.includes('sanitastroesch')) {
                                return href;
                            }
                        }
                        return null;
                    }, searchQuery);

                    if (productHref) {
                        await page.goto(productHref, { waitUntil: 'networkidle0', timeout: 30000 });
                        await new Promise(r => setTimeout(r, 4000));
                    } else {
                        // Mimic exact URL generation
                        let baseName = tray.label.toLowerCase()
                            .replace(/ü/g, 'ue')
                            .replace(/ä/g, 'ae')
                            .replace(/ö/g, 'oe')
                            .replace(/[^a-z0-9]+/g, '-');
                        
                        // Clean up trailing dashes
                        if (baseName.endsWith('-')) baseName = baseName.substring(0, baseName.length - 1);
                        
                        const mimicUrl = `https://profishop.sanitastroesch.ch/business/article-${baseName}-${cleanFull}`;
                        console.log(`   -> Search failed. Mimicking direct URL: ${mimicUrl}`);
                        
                        await page.goto(mimicUrl, { waitUntil: 'networkidle0', timeout: 30000 });
                        await new Promise(r => setTimeout(r, 4000));
                        
                        // Check if 404 or redirected
                        if ((await page.url()).includes('404') || (await page.url()).includes('not-found')) {
                             console.log(`   -> Mimic URL failed (404).`);
                             continue;
                        }
                    }
                } else {
                    await new Promise(r => setTimeout(r, 4000));
                }

                // Scroll down the page to trigger lazy-loading
                await page.evaluate(async () => {
                    await new Promise((resolve) => {
                        let totalHeight = 0;
                        const distance = 500;
                        const timer = setInterval(() => {
                            const scrollHeight = document.body.scrollHeight;
                            window.scrollBy(0, distance);
                            totalHeight += distance;

                            if (totalHeight >= scrollHeight - window.innerHeight || totalHeight > 10000) {
                                clearInterval(timer);
                                resolve();
                            }
                        }, 200);
                    });
                });
                
                // Extra wait to let network requests finish after scrolling
                await new Promise(r => setTimeout(r, 2000));

                const pdpData = await page.evaluate(() => {
                    // Try to find the "Verwandte Artikel" or "Zubehör" section
                    const accessoryRows = Array.from(document.querySelectorAll('.product-list-item, tr, .row, article, .card')); // Added more generic wrappers
                    
                    for (let row of accessoryRows) {
                        const rowText = row.innerText || '';
                        if (rowText.includes('8211 113') || rowText.includes('8211113') || rowText.includes('Dübelschraube')) {
                            // Scroll element into view just to be perfectly sure
                            row.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            
                            // Target the actual text input inside the quantity div
                            const inputField = row.querySelector('.quantity-input input[type="text"], .quantity-input input[type="number"], input.form-control[placeholder="Menge"]');
                            let qty = null;
                            if (inputField) {
                                qty = inputField.value;
                            }
                            
                            return {
                                artNr: '8211 113.000.000',
                                name: 'Dübelschraube 145 mm',
                                quantity: qty ? parseInt(qty.toString().trim()) : null
                            };
                        }
                    }
                    return null;
                });

                if (pdpData && pdpData.quantity) {
                    console.log(`   -> 🔥 FOUND SCREWS:`, pdpData.quantity);
                    screwResults[tray.artNr] = pdpData.quantity;
                    // Save incrementally just in case it crashes midway
                    fs.writeFileSync('screw-data.json', JSON.stringify(screwResults, null, 2));
                } else {
                    console.log(`   -> No Dübelschraube accessory found or quantity missing.`);
                }

            } catch (err) {
                console.log(`   -> Error: ${err.message}`);
            }
        }
    } finally {
        await browser.close();
        console.log("Scraping finished. Results saved to screw-data.json");
    }
})();
