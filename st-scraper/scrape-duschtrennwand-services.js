const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());
const fs = require('fs');
const path = require('path');

const dataPath = path.resolve(__dirname, '../custom-data.json');
const outputPath = path.resolve(__dirname, 'duschtrennwand-services.json');

(async () => {
    let data;
    try {
        data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
    } catch (e) {
        console.log("Could not find custom-data.json");
        return;
    }

    // Find all Duschtrennwand items that are missing services
    let targetTrays = data.duschtrennwand.trays.filter(t => !t.services || t.services.length === 0);
    // Ignore service items themselves
    targetTrays = targetTrays.filter(t => {
        const l = (t.label || '').toLowerCase();
        return !l.includes('massaufnahme') && !l.includes('montagepauschale') && !l.includes('anfahrtspauschale') && !l.includes('demontage');
    });

    console.log(`🚀 Starting Shower Glass Service Scraper on ${targetTrays.length} items...`);

    const browser = await puppeteer.launch({ 
        headless: 'new',
        args: ['--no-sandbox', '--window-size=1920,1080'] 
    });

    let page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });

    const results = {};
    if (fs.existsSync(outputPath)) {
        try {
            Object.assign(results, JSON.parse(fs.readFileSync(outputPath, 'utf8')));
            console.log(`Loaded ${Object.keys(results).length} existing results.`);
        } catch(e) {}
    }

    try {
        for (let i = 0; i < targetTrays.length; i++) {
            const tray = targetTrays[i];
            
            if (results[tray.artNr] && results[tray.artNr].length > 0) {
                console.log(`[${i+1}/${targetTrays.length}] Skipping ${tray.artNr} (Already Scraped and found items)`);
                continue;
            }

            const cleanArtNr = tray.artNr.replace(/\s/g, '');
            const match = cleanArtNr.match(/^\d{7,8}/);
            const searchQuery = tray.artNr; // USE SPACES FOR ACCURATE SEARCH RESULTS

            console.log(`\n[${i+1}/${targetTrays.length}] Searching: ${tray.artNr} - ${tray.label}`);
            
            try {
                let targetUrl = `https://profishop.sanitastroesch.ch/business/search?q=${encodeURIComponent(searchQuery)}`;
                await page.goto(targetUrl, { waitUntil: 'networkidle0', timeout: 30000 });
                await new Promise(r => setTimeout(r, 2000));
                
                let currentUrl = await page.url();
                let isSearchPage = currentUrl.includes('/search');

                if (isSearchPage) {
                    const productHref = await page.evaluate((m) => {
                        const links = Array.from(document.querySelectorAll('a'));
                        for (let a of links) {
                            const href = a.href || '';
                            // MUST match article number prefix to avoid clicking unrelated items like Ablaufdeckel
                            if (href.includes('/business/article-') && !href.includes('/search') && m && href.includes(m)) return href;
                        }
                        return null;
                    }, match ? match[0] : cleanArtNr);

                    if (productHref) {
                        await page.goto(productHref, { waitUntil: 'networkidle0', timeout: 30000 });
                        await new Promise(r => setTimeout(r, 2000));
                    }
                }

                const finalUrl = await page.url();
                if (finalUrl.includes('/search')) {
                    console.log(`   -> ⚠️ PDP not found. Skipping.`);
                    results[tray.artNr] = [];
                    fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
                    continue;
                }

                // Scroll to load related articles (Zubehör)
                await page.evaluate(async () => {
                    await new Promise((resolve) => {
                        let totalHeight = 0;
                        const distance = 400;
                        const timer = setInterval(() => {
                            const scrollHeight = document.body.scrollHeight;
                            window.scrollBy(0, distance);
                            totalHeight += distance;
                            if (totalHeight >= scrollHeight - window.innerHeight || totalHeight > 8000) {
                                clearInterval(timer);
                                resolve();
                            }
                        }, 150);
                    });
                });

                // Auto-click the Verwandte Artikel and M/Montage tabs, specifically avoiding Z/Zubehör so it doesn't hide the contents
                await page.evaluate(() => {
                    const tabs = Array.from(document.querySelectorAll('button, a, .tab, li, [role="tab"], h4'));
                    // First click Verwandte Artikel to expand the accordion if needed
                    const verw = tabs.find(el => el.innerText.toLowerCase().trim().includes('verwandte'));
                    if (verw && typeof verw.click === 'function') verw.click();
                    
                    // Then explicitly click the M or Montage tab
                    const mTab = tabs.find(el => {
                        const t = el.innerText.toLowerCase().trim();
                        return t === 'm' || t === 'montage' || t.includes('zubehör');
                    });
                    if (mTab && typeof mTab.click === 'function') mTab.click();
                });

                await new Promise(r => setTimeout(r, 1500));

                const scrapedAccessories = await page.evaluate(() => {
                    // Grab all product rows/cards on the entire page
                    const items = Array.from(document.querySelectorAll('.product-list-item, tr, .row, article, .card'));
                    
                    const validItems = [];
                    const seen = new Set();
                    for (let item of items) {
                        const text = (item.innerText || '').toLowerCase();
                        const artMatch = text.match(/(\d{4}\s?\d{3}\.\d{3}\.\d{3}|\d{7,8})/);
                        if (!artMatch) continue;
                        
                        const artNr = artMatch[0].replace(/\n/g, '').trim();
                        if (seen.has(artNr)) continue;
                        
                        let label = "";
                        const titleEl = item.querySelector('.st-product-card__title, .title, h3, h4, td.description, .product-name');
                        if (titleEl) label = titleEl.innerText.replace(/\n/g, ' ').trim();
                        else label = item.innerText.split('\n')[0].trim();
                        
                        const labelLower = label.toLowerCase();
                        if (labelLower.includes('massaufnahme') || labelLower.includes('anfahrtspauschale') || labelLower.includes('montagepauschale')) {
                            seen.add(artNr);
                            validItems.push({ artNr, label, qty: 1 });
                        }
                    }
                    return validItems;
                });

                console.log(`   -> ✅ Found ${scrapedAccessories.length} service costs.`);
                results[tray.artNr] = scrapedAccessories;
                fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));

            } catch (err) {
                console.log(`   -> ❌ Error: ${err.message}`);
                // Don't mark as empty on crash, try again next time
                try {
                    await page.close();
                } catch(e) {}
                try {
                    page = await browser.newPage();
                    await page.setViewport({ width: 1920, height: 1080 });
                } catch(e) {}
            }
        }
    } finally {
        await browser.close();
        console.log("Scraping finished. Run the injector script to apply these services to custom-data.json.");
    }
})();
