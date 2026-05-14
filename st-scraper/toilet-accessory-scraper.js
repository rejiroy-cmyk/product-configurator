const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());
const fs = require('fs');
const path = require('path');

const dataPath = path.resolve(__dirname, '../custom-data.json');
const outputPath = path.resolve(__dirname, 'toilet-accessories.json');

(async () => {
    let data;
    try {
        data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
    } catch (e) {
        console.log("Could not find custom-data.json");
        return;
    }

    const wandklosetts = (data.wandklosett && data.wandklosett.trays) ? data.wandklosett.trays : [];
    const standklosetts = (data.standklosett && data.standklosett.trays) ? data.standklosett.trays : [];
    
    const targetTrays = [...wandklosetts, ...standklosetts];

    if (targetTrays.length === 0) {
        console.log("No Wandklosetts or Standklosetts found in custom-data.json");
        return;
    }

    console.log(`Starting scraper for ${targetTrays.length} toilets...`);

    const browser = await puppeteer.launch({ 
        headless: false,
        args: ['--window-size=1920,1080'] 
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });

    const results = {};

    // Load existing results to allow resuming
    if (fs.existsSync(outputPath)) {
        try {
            Object.assign(results, JSON.parse(fs.readFileSync(outputPath, 'utf8')));
            console.log(`Loaded ${Object.keys(results).length} existing results.`);
        } catch(e) {
            console.log("Starting fresh JSON output.");
        }
    }

    try {
        for (let i = 0; i < targetTrays.length; i++) {
            const tray = targetTrays[i];
            
            // Skip if already processed
            if (results[tray.artNr]) {
                console.log(`[${i+1}/${targetTrays.length}] Skipping ${tray.artNr} (Already Scraped)`);
                continue;
            }

            const cleanFull = tray.artNr.replace(/\s/g, '');
            const match = cleanFull.match(/^\d{7,8}/);
            const searchQuery = match ? match[0] : tray.artNr.trim();

            console.log(`\n[${i+1}/${targetTrays.length}] Searching Toilet: ${tray.artNr}`);
            
            try {
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
                            if (href.includes('/business/article-') && !href.includes('/search')) {
                                return href;
                            }
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
                        // Mimic direct URL
                        let baseName = tray.label.toLowerCase()
                            .replace(/ü/g, 'ue')
                            .replace(/ä/g, 'ae')
                            .replace(/ö/g, 'oe')
                            .replace(/[^a-z0-9]+/g, '-');
                        
                        if (baseName.endsWith('-')) baseName = baseName.substring(0, baseName.length - 1);
                        
                        const mimicUrl = `https://profishop.sanitastroesch.ch/business/article-${baseName}-${cleanFull}`;
                        console.log(`   -> Search failed. Mimicking direct URL: ${mimicUrl}`);
                        
                        await page.goto(mimicUrl, { waitUntil: 'networkidle0', timeout: 30000 });
                        await new Promise(r => setTimeout(r, 4000));
                        
                        if ((await page.url()).includes('404') || (await page.url()).includes('not-found')) {
                             console.log(`   -> Mimic URL failed (404).`);
                             continue;
                        }
                    }
                } else {
                    await new Promise(r => setTimeout(r, 4000));
                }

                // Scroll down to load accessories
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
                await new Promise(r => setTimeout(r, 2000));

                const pdpData = await page.evaluate(() => {
                    const accessoryRows = Array.from(document.querySelectorAll('.product-list-item, tr, .row, article, .card'));
                    
                    const extracted = {
                        seats: [],
                        isolation: [],
                        sleeves: []
                    };

                    for (let row of accessoryRows) {
                        const rowText = (row.innerText || '').toLowerCase();
                        
                        // Look for an Article Number in this row
                        const artNrMatch = rowText.match(/(\d{4}\s?\d{3}\.\d{3}\.\d{3}|\d{7,8})/);
                        if (!artNrMatch) continue;
                        
                        const artNr = artNrMatch[0].replace(/\n/g, '').trim();

                        // Try to get a proper label if possible
                        let label = "";
                        const links = row.querySelectorAll('a');
                        if (links && links.length > 0) {
                            label = links[0].innerText.replace(/\n/g, ' ').trim();
                        } else {
                            // Take first line as fallback
                            label = rowText.split('\n')[0].trim(); 
                        }

                        // Determine the type based on keywords
                        if (rowText.includes('sitz') || rowText.includes('deckel')) {
                            // Avoid duplicates
                            if (!extracted.seats.find(s => s.artNr === artNr)) {
                                extracted.seats.push({ artNr, label, type: 'WC-Sitz' });
                            }
                        } else if (rowText.includes('schallschutz') || rowText.includes('isolation')) {
                            if (!extracted.isolation.find(s => s.artNr === artNr)) {
                                extracted.isolation.push({ artNr, label, type: 'Schallschutz' });
                            }
                        } else if (rowText.includes('manschette') || rowText.includes('garnitur') || rowText.includes('3241 116') || rowText.includes('3241 101')) {
                            if (!extracted.sleeves.find(s => s.artNr === artNr)) {
                                extracted.sleeves.push({ artNr, label, type: 'Technik' });
                            }
                        }
                    }
                    return extracted;
                });

                if (pdpData && (pdpData.seats.length > 0 || pdpData.isolation.length > 0 || pdpData.sleeves.length > 0)) {
                    console.log(`   -> 🔥 FOUND: ${pdpData.seats.length} Seats, ${pdpData.isolation.length} Isolations, ${pdpData.sleeves.length} Sleeves`);
                    results[tray.artNr] = pdpData;
                    // Save incrementally
                    fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
                } else {
                    console.log(`   -> No relevant accessories found.`);
                    results[tray.artNr] = { seats: [], isolation: [], sleeves: [] };
                    fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
                }

            } catch (err) {
                console.log(`   -> Error: ${err.message}`);
            }
        }
    } finally {
        await browser.close();
        console.log("Scraping finished. Results saved to st-scraper/toilet-accessories.json");
    }
})();
