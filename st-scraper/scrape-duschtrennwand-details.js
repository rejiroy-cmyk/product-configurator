const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());
const fs = require('fs');
const path = require('path');

const DATA_PATH = path.resolve(__dirname, '../custom-data.json');
const OUT_PATH = path.resolve(__dirname, 'duschtrennwand-details.json');

(async () => {
    let data = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
    const trays = data.duschtrennwand.trays;
    
    let scrapedData = {};
    if (fs.existsSync(OUT_PATH)) {
        try {
            scrapedData = JSON.parse(fs.readFileSync(OUT_PATH, 'utf8'));
            console.log(`Loaded ${Object.keys(scrapedData).length} previously scraped items.`);
        } catch(e) {}
    }
    
    // Filter out items already scraped
    const targets = trays.filter(t => !scrapedData[t.artNr]);
    
    console.log(`Need to scrape ${targets.length} items out of ${trays.length} total.`);
    
    if (targets.length === 0) {
        console.log("All done!");
        return;
    }

    const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--window-size=1920,1080']
    });
    let page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    
    let count = 0;
    
    try {
        for (const t of targets) {
            count++;
            const artNr = t.artNr.trim();
            const searchUrl = `https://profishop.sanitastroesch.ch/business/search?q=${encodeURIComponent(artNr)}`;
            
            console.log(`[${count}/${targets.length}] Scraping ${artNr}...`);
            
            try {
                await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 30000 });
                await new Promise(r => setTimeout(r, 1500));
                
                // Find link to product detail page
                const linkHref = await page.evaluate(() => {
                    const a = Array.from(document.querySelectorAll('a')).find(el => el.href && el.href.includes('/business/article-'));
                    return a ? a.href : null;
                });
                
                if (linkHref) {
                    await page.goto(linkHref, { waitUntil: 'networkidle0', timeout: 30000 });
                    await new Promise(r => setTimeout(r, 1500));
                } else {
                    throw new Error("Could not find article link on search page");
                }
                
                const result = await page.evaluate(() => {
                    let desc = "";
                    const headers = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, .section-title, .title, strong'));
                    const descHeader = headers.find(h => h.innerText.includes('Produktbeschreibung'));
                    
                    if (descHeader && descHeader.nextElementSibling) {
                        desc = descHeader.nextElementSibling.innerText.trim();
                    } else {
                        const descEl = document.querySelector('.product-detail-description, .product-description, [data-id="product-description-content"]');
                        if (descEl) desc = descEl.innerText.trim();
                    }
                    
                    let specs = {};
                    const techHeader = headers.find(h => h.innerText.includes('Technische Details'));
                    if (techHeader) {
                        let parent = techHeader.parentElement;
                        let table = parent.querySelector('table');
                        if (!table && parent.nextElementSibling) {
                            table = parent.nextElementSibling.querySelector('table') || parent.nextElementSibling;
                        }
                        if (table && table.tagName === 'TABLE') {
                            const rows = table.querySelectorAll('tr');
                            rows.forEach(tr => {
                                const th = tr.querySelector('th, strong, td:first-child');
                                const td = tr.querySelector('td:last-child');
                                if (th && td && th !== td) {
                                    specs[th.innerText.replace(/:/g, '').trim()] = td.innerText.replace(th.innerText, '').trim();
                                }
                            });
                        }
                    }
                    
                    if (Object.keys(specs).length === 0) {
                        const firstTable = document.querySelector('table');
                        if (firstTable) {
                            const rows = firstTable.querySelectorAll('tr');
                            rows.forEach(tr => {
                                const th = tr.querySelector('th, strong, td:first-child');
                                const td = tr.querySelector('td:last-child');
                                if (th && td && th !== td) {
                                    specs[th.innerText.replace(/:/g, '').trim()] = td.innerText.replace(th.innerText, '').trim();
                                }
                            });
                        }
                    }
                    
                    return { description: desc, specs: specs };
                });
                
                scrapedData[artNr] = result;
                console.log(`   ✅ Extracted! Desc length: ${result.description.length}, Specs: ${Object.keys(result.specs).length}`);
                
            } catch (err) {
                console.log(`   ❌ Failed: ${err.message}`);
                try {
                    await page.close();
                    page = await browser.newPage();
                    await page.setViewport({ width: 1920, height: 1080 });
                } catch(e) {}
            }
            
            if (count % 10 === 0) {
                fs.writeFileSync(OUT_PATH, JSON.stringify(scrapedData, null, 2));
            }
        }
    } finally {
        fs.writeFileSync(OUT_PATH, JSON.stringify(scrapedData, null, 2));
        await browser.close();
        console.log("Finished scraping run.");
    }
})();
