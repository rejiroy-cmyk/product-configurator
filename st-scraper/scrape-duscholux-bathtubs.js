const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());
const fs = require('fs');
const path = require('path');

const targetUrl = 'https://profishop.sanitastroesch.ch/business/catalogue?fq=Baden%2C%20Duschen%2C%20Wellness%20AND%20Duschtrennw%C3%A4nde%20und%20Duschkabinen%20AND%20F%C3%BCr%20Badewanne&rows=100&sort=Relevancy%20desc&page=1&filters=%5B%22Brand%3ADuscholux%22%2C%22CategoryPath%3ABaden%2C%20Duschen%2C%20Wellness%2FDuschtrennw%C3%A4nde%20und%20Duschkabinen%2FF%C3%BCr%20Badewanne%22%5D';
const outputPath = path.resolve(__dirname, 'duscholux-bathtubs.json');

(async () => {
    const browser = await puppeteer.launch({ 
        headless: 'new',
        args: ['--no-sandbox', '--window-size=1920,1080'] 
    });
    
    // Step 1: Collect all product URLs
    const productUrls = new Set();
    let page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    
    console.log("Fetching Duscholux search results...");
    await page.goto(targetUrl, { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise(r => setTimeout(r, 4000));
    
    // Scroll down multiple times to ensure lazy loaded images and links are present
    await page.evaluate(async () => {
        await new Promise((resolve) => {
            let totalHeight = 0;
            const distance = 400;
            const timer = setInterval(() => {
                window.scrollBy(0, distance);
                totalHeight += distance;
                if (totalHeight >= document.body.scrollHeight - window.innerHeight || totalHeight > 8000) {
                    clearInterval(timer);
                    resolve();
                }
            }, 100);
        });
    });
    await new Promise(r => setTimeout(r, 1000));

    const urls = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('a'))
            .map(a => a.href)
            .filter(h => h && h.includes('article-') && !h.includes('/search'));
    });
    
    urls.forEach(u => productUrls.add(u));
    const urlsArray = Array.from(productUrls);
    console.log(`Found ${urlsArray.length} total product URLs to scrape (Expected: ~68).`);
    
    const results = [];
    
    // Step 2: Scrape each URL
    for (let i = 0; i < urlsArray.length; i++) {
        const url = urlsArray[i];
        console.log(`\n[${i+1}/${urlsArray.length}] Scraping ${url}`);
        
        try {
            await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
            await new Promise(r => setTimeout(r, 2000));
            
            // Try to expand variants if they exist
            await page.evaluate(() => {
                const btns = Array.from(document.querySelectorAll('button, a'));
                const expand = btns.find(b => (b.innerText || '').toLowerCase().includes('weitere varianten'));
                if (expand && typeof expand.click === 'function') expand.click();
            });
            await new Promise(r => setTimeout(r, 1000));
            
            // Scroll to bottom slowly to trigger lazy loading of "Verwandte Artikel"
            await page.evaluate(async () => {
                await new Promise((resolve) => {
                    let totalHeight = 0;
                    const distance = 400;
                    const timer = setInterval(() => {
                        window.scrollBy(0, distance);
                        totalHeight += distance;
                        if (totalHeight >= document.body.scrollHeight - window.innerHeight || totalHeight > 6000) {
                            clearInterval(timer);
                            resolve();
                        }
                    }, 150);
                });
            });

            // Click the Montage / M tab to load services
            await page.evaluate(() => {
                const tabs = Array.from(document.querySelectorAll('button, a, .tab, li, [role="tab"], h4'));
                const verw = tabs.find(el => el.innerText.toLowerCase().trim().includes('verwandte'));
                if (verw && typeof verw.click === 'function') verw.click();
                
                const mTab = tabs.find(el => {
                    const t = el.innerText.toLowerCase().trim();
                    return t === 'm' || t === 'montage';
                });
                if (mTab && typeof mTab.click === 'function') mTab.click();
            });
            await new Promise(r => setTimeout(r, 1500));

            // Extract main product, variations, and service costs
            const extracted = await page.evaluate(() => {
                const itemData = {
                    main: null,
                    variants: [],
                    services: []
                };
                
                // 1. Extract main product
                let mainArtNr = '';
                const bodyText = document.body.innerText;
                const mainMatch = bodyText.match(/Art-Nr\.?\s*(\d{4}\s?\d{3}\.\d{3}\.\d{3}|\d{7,8})/);
                if (mainMatch) mainArtNr = mainMatch[1].replace(/\n/g, '').trim();
                
                const h1 = document.querySelector('h1');
                const mainLabel = h1 ? h1.innerText.replace(/\n/g, ' ').trim() : '';
                
                const imgEl = document.querySelector('.st-product-gallery img');
                const mainImg = imgEl ? imgEl.src : '';

                if (mainArtNr && mainLabel) {
                    itemData.main = { artNr: mainArtNr, label: mainLabel, imgUrl: mainImg };
                }
                
                // 2. Extract variants & services from rows
                const items = Array.from(document.querySelectorAll('.product-list-item, tr, .row, article, .card'));
                const seen = new Set();
                
                for (let item of items) {
                    const text = (item.innerText || '').toLowerCase();
                    const artMatch = text.match(/(\d{4}\s?\d{3}\.\d{3}\.\d{3}|\d{7,8})/);
                    if (!artMatch) continue;
                    
                    const artNr = artMatch[0].replace(/\n/g, '').trim();
                    if (seen.has(artNr)) continue;
                    seen.add(artNr);
                    
                    let label = "";
                    const titleEl = item.querySelector('.st-product-card__title, .title, h3, h4, td.description, .product-name');
                    if (titleEl) label = titleEl.innerText.replace(/\n/g, ' ').trim();
                    else label = item.innerText.split('\n')[0].trim();
                    
                    if (label.toLowerCase().includes('massaufnahme') || label.toLowerCase().includes('montagepauschale') || label.toLowerCase().includes('anfahrt')) {
                        itemData.services.push({ artNr, label, qty: 1, type: "Montage" });
                    } else if (artNr !== mainArtNr) {
                        itemData.variants.push({ artNr, label });
                    }
                }
                return itemData;
            });
            
            if (extracted.main) {
                console.log(`   -> Main: ${extracted.main.artNr} - ${extracted.main.label.substring(0, 40)}...`);
                console.log(`   -> Found ${extracted.variants.length} variants, ${extracted.services.length} services`);
                results.push(extracted);
                // Save incrementally in case it crashes
                fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
            } else {
                console.log(`   -> ⚠️ Could not extract main product. Skipping.`);
            }

        } catch (e) {
            console.log(`   -> ❌ Error scraping ${url}: ${e.message}`);
            // Safely close and reopen page
            try {
                await page.close();
            } catch(ex) {}
            try {
                page = await browser.newPage();
                await page.setViewport({ width: 1920, height: 1080 });
            } catch(ex) {}
        }
    }
    
    console.log(`\n✅ Finished! Exported ${results.length} products to duscholux-bathtubs.json`);
    await browser.close();
})();
