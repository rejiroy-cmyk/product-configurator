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

    console.log(`Starting ROBUST Product Detail Page (PDP) Scraper... Scanning ${targetTrays.length} Washbasins`);

    const browser = await puppeteer.launch({ 
        headless: 'new',
        args: ['--no-sandbox', '--window-size=1920,1080'] 
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });

    let updatedCount = 0;

    try {
        for (let i = 0; i < targetTrays.length; i++) {
            const tray = targetTrays[i];
            
            // Extract the core 7-8 digit article number for maximum search success
            const cleanFull = tray.artNr.replace(/\s/g, '');
            const match = cleanFull.match(/^\d{7,8}/);
            const searchQuery = match ? match[0] : tray.artNr.trim();

            console.log(`\n[${i+1}/${targetTrays.length}] Searching ArtNr: ${tray.artNr} (Querying Server with: ${searchQuery})`);
            
            try {
                // 1. Go to search results
                let targetUrl = `https://profishop.sanitastroesch.ch/de/search?q=${encodeURIComponent(searchQuery)}`;
                await page.goto(targetUrl, { waitUntil: 'networkidle2', timeout: 30000 });
                await new Promise(r => setTimeout(r, 2000));
                
                let currentUrl = await page.url();
                let isSearchPage = currentUrl.includes('/search');

                // If "Keine Ergebnisse" we can rewrite the URL to try searching without the dot
                const pageInfo = await page.evaluate(() => document.body.innerText.substring(0, 300));
                if (pageInfo.includes('Keine Ergebnisse')) {
                     console.log(`   -> Query failed on server (0 results). Trying strictly full clean ArtNr: ${cleanFull}`);
                     await page.goto(`https://profishop.sanitastroesch.ch/de/search?q=${cleanFull}`, { waitUntil: 'networkidle2' });
                     await new Promise(r => setTimeout(r, 2000));
                     currentUrl = await page.url();
                     isSearchPage = currentUrl.includes('/search');
                }

                // 2. Discover product link if on search page
                if (isSearchPage) {
                    const productHref = await page.evaluate((sq) => {
                        // Gather ALL links on the page
                        const links = Array.from(document.querySelectorAll('a'));
                        
                        for (let a of links) {
                            const href = a.href || '';
                            // Excellent match: A product link with the search query in it.
                            if (href.includes(sq) && !href.includes('/search') && !href.includes('=') && href.includes('sanitastroesch')) {
                                return href;
                            }
                            // Fallback match: A standard Sanitas Troesch commerce link structure (/p/, /product/, etc)
                            if ((href.includes('/p/') || href.includes('/product/')) && !href.includes('/search')) {
                                // Double check it has an article number
                                if (/\d{7}/.test(href)) return href;
                            }
                        }
                        return null;
                    }, searchQuery);

                    if (productHref) {
                        console.log(`   -> Entering Product Detail Page: ${productHref}`);
                        await page.goto(productHref, { waitUntil: 'networkidle0', timeout: 30000 });
                        await new Promise(r => setTimeout(r, 4000)); // wait for characteristic tables to strictly load
                    } else {
                        console.log(`   -> Search failed to render a clickable product. Preview: ${pageInfo.replace(/\n| {2}/g, ' ')}...`);
                        continue; // skip to next
                    }
                } else {
                    console.log(`   -> Server auto-redirected straight to Product Page!`);
                    await new Promise(r => setTimeout(r, 4000));
                }

                // 3. We are inside the Product Description Page! Run extreme depth crawl
                const pdpData = await page.evaluate(() => {
                    const nodes = Array.from(document.querySelectorAll('td, th, span, div, p, li'));
                    for (let n of nodes) {
                        const txt = n.innerText.toLowerCase().replace(/\n/g, ' ').trim();
                        if (txt.includes('ablage') || txt.includes('abstell') || txt.includes('ausführung')) {
                            if (txt.includes('abstellfläche links') || txt.includes('ablage links') || txt.includes('ablage: links')) return 'Abstellfläche links';
                            if (txt.includes('abstellfläche rechts') || txt.includes('ablage rechts') || txt.includes('ablage: rechts')) return 'Abstellfläche rechts';
                            if (txt.includes('abstellfläche beidseitig') || txt.includes('ablage beidseitig')) return 'Abstellfläche beidseitig';
                        }
                    }
                    return null;
                });

                if (pdpData) {
                    console.log(`   -> 🔥 SUCCESS! Found hidden property: "${pdpData}"`);
                    tray.label = `${tray.label}, ${pdpData}`;
                    updatedCount++;
                    if (updatedCount % 2 === 0) fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
                } else {
                    console.log(`   -> Investigated full product page DOM. No Abstellfläche parameters discovered.`);
                }

            } catch (err) {
                console.log(`   -> Navigation Error: ${err.message}`);
            }
        }

        if (updatedCount > 0) {
            fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
            console.log(`\nDONE! ROBUST PDP Scraper successfully healed ${updatedCount} products!`);
        } else {
            console.log(`\nDONE! Investigated all products. None specify Abstellfläche.`);
        }

    } finally {
        await browser.close();
    }
})();
