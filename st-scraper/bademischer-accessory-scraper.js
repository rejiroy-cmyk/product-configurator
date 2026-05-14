const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());
const fs = require('fs');
const path = require('path');

const dataPath = path.resolve(__dirname, '../custom-data.json');
const outputPath = path.resolve(__dirname, 'bademischer-accessories.json');

(async () => {
    let data;
    try {
        data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
    } catch (e) {
        console.log("Could not find custom-data.json");
        return;
    }

    if (!data.bademischer || !data.bademischer.trays) {
        console.log("No Bademischer found in custom-data.json");
        return;
    }

    let targetTrays = data.bademischer.trays;
    console.log(`Testing scraper on ${targetTrays.length} Bademischer items...`);

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
            
            if (results[tray.artNr]) {
                console.log(`[${i+1}/${targetTrays.length}] Skipping ${tray.artNr} (Already Scraped)`);
                continue;
            }

            const cleanFull = tray.artNr.replace(/\s/g, '');
            const match = cleanFull.match(/^\d{7,8}/);
            const searchQuery = match ? match[0] : tray.artNr.trim();

            console.log(`\n[${i+1}/${targetTrays.length}] Searching ArtNr: ${tray.artNr}`);
            
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
                        abstellverschraubung: [],
                        montageschiene: [],
                        grundkoerper: [],
                        brauseschlauch: [],
                        handbrause: [],
                        brausehalter: [],
                        gleitstange: [],
                        anschlussbogen: []
                    };

                    for (let row of accessoryRows) {
                        const rowText = (row.innerText || '').toLowerCase();
                        const artNrMatch = rowText.match(/(\d{4}\s?\d{3}\.\d{3}\.\d{3}|\d{7,8})/);
                        if (!artNrMatch) continue;
                        
                        const artNr = artNrMatch[0].replace(/\n/g, '').trim();

                        let label = "";
                        const titleLink = Array.from(row.querySelectorAll('a')).find(a => a.innerText.trim().length > 3);
                        if (titleLink) {
                            label = titleLink.innerText.replace(/\n/g, ' ').trim();
                        } else {
                            const descDiv = row.querySelector('.description, .product-name, .article-description, .product-list-item-title, h3, .name');
                            if (descDiv) {
                                label = descDiv.innerText.replace(/\n/g, ' ').trim();
                            } else {
                                // fallback: take the longest line in rowText that isn't just the artNr
                                const lines = rowText.split('\n').map(l => l.trim()).filter(l => l.length > 5 && l !== artNr);
                                label = lines.length > 0 ? lines[0] : "";
                            }
                        }

                        let imgUrl = "";
                        const imgTag = row.querySelector('img');
                        if (imgTag && imgTag.src) {
                            imgUrl = imgTag.src;
                        }

                        // Protect against matching the main product's title which often says "ohne abstellverschraubungen"
                        if (rowText.includes('ohne abstellverschraubung') || rowText.includes('ohne verschraubung') || rowText.includes('ohne brauseschlauch') || rowText.includes('ohne handbrause')) {
                            // If this row is the main product, skip it entirely
                            const isMainProduct = label.toLowerCase().includes('bademischer') || label.toLowerCase().includes('duschmischer');
                            if (isMainProduct) continue;
                        }

                        // Mischer Categories
                        if (rowText.includes('abstellverschraubung') || rowText.includes('verschraubung')) {
                            if (!extracted.abstellverschraubung.find(s => s.artNr === artNr)) extracted.abstellverschraubung.push({ artNr, label, type: 'Abstellverschraubung', imgUrl });
                        } else if (rowText.includes('montageschiene') || rowText.includes('montageset') || rowText.includes('installationsset')) {
                            if (!extracted.montageschiene.find(s => s.artNr === artNr)) extracted.montageschiene.push({ artNr, label, type: 'Montageschiene', imgUrl });
                        } else if (rowText.includes('einbaukörper') || rowText.includes('grundkörper') || rowText.includes('ibox') || rowText.includes('up-gehäuse')) {
                            if (!extracted.grundkoerper.find(s => s.artNr === artNr)) extracted.grundkoerper.push({ artNr, label, type: 'Grundkörper', imgUrl });
                        } else if (rowText.includes('schlauch') && !rowText.includes('brausehalter')) {
                            if (!extracted.brauseschlauch.find(s => s.artNr === artNr)) extracted.brauseschlauch.push({ artNr, label, type: 'Brauseschlauch', imgUrl });
                        } else if (rowText.includes('handbrause') || rowText.includes('brausekopf')) {
                            if (!extracted.handbrause.find(s => s.artNr === artNr)) extracted.handbrause.push({ artNr, label, type: 'Handbrause', imgUrl });
                        } else if (rowText.includes('brausehalter') || rowText.includes('wandhalter')) {
                            if (!extracted.brausehalter.find(s => s.artNr === artNr)) extracted.brausehalter.push({ artNr, label, type: 'Brausehalter', imgUrl });
                        } else if (rowText.includes('gleitstange') || rowText.includes('brausestange')) {
                            if (!extracted.gleitstange.find(s => s.artNr === artNr)) extracted.gleitstange.push({ artNr, label, type: 'Gleitstange', imgUrl });
                        } else if (rowText.includes('anschlussbogen') || rowText.includes('wandanschluss')) {
                            if (!extracted.anschlussbogen.find(s => s.artNr === artNr)) extracted.anschlussbogen.push({ artNr, label, type: 'Anschlussbogen', imgUrl });
                        }
                    }
                    return extracted;
                });

                if (pdpData && (pdpData.abstellverschraubung.length > 0 || pdpData.montageschiene.length > 0 || pdpData.grundkoerper.length > 0 || pdpData.brauseschlauch.length > 0 || pdpData.handbrause.length > 0 || pdpData.brausehalter.length > 0 || pdpData.gleitstange.length > 0 || pdpData.anschlussbogen.length > 0)) {
                    console.log(`   -> 🔥 FOUND: ${pdpData.abstellverschraubung.length} Verschraubungen, ${pdpData.montageschiene.length} Schienen, ${pdpData.grundkoerper.length} Grundkörper, ${pdpData.brauseschlauch.length} Schläuche, ${pdpData.handbrause.length} Handbrausen, ${pdpData.brausehalter.length} Halter, ${pdpData.gleitstange.length} Stangen, ${pdpData.anschlussbogen.length} Bogen`);
                    results[tray.artNr] = pdpData;
                    fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
                } else {
                    console.log(`   -> No relevant Bademischer accessories found.`);
                    results[tray.artNr] = { abstellverschraubung: [], montageschiene: [], grundkoerper: [], brauseschlauch: [], handbrause: [], brausehalter: [], gleitstange: [], anschlussbogen: [] };
                    fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
                }

            } catch (err) {
                console.log(`   -> Error: ${err.message}`);
            }
        }
    } finally {
        await browser.close();
        console.log("Scraping finished. Results saved to st-scraper/bademischer-accessories.json");
    }
})();
