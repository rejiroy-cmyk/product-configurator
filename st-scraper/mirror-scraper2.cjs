const fs = require('fs');
const puppeteer = require('puppeteer');

(async () => {
    const data = JSON.parse(fs.readFileSync('../custom-data.json', 'utf8'));
    
    // Collect all unique Spiegelschrank items (by ArtNr) to avoid redundant requests
    const itemsToUpdate = [];
    Object.values(data).forEach(app => {
        const items = app.trays || app.basinTrays || app.faucets || [];
        items.forEach(t => {
            const lbl = (t.label || t.name || '').toLowerCase();
            if (lbl.includes('spiegelschrank') && lbl.includes('alterna')) {
                itemsToUpdate.push(t);
            }
        });
    });
    
    const uniqueItems = [];
    const seen = new Set();
    for (const t of itemsToUpdate) {
        if (!seen.has(t.artNr)) {
            seen.add(t.artNr);
            uniqueItems.push(t);
        }
    }
    
    console.log(`Found ${uniqueItems.length} unique Alterna Spiegelschrank items to scrape.`);

    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    
    for (let i = 0; i < uniqueItems.length; i++) {
        const t = uniqueItems[i];
        const artStr = String(t.artNr).replace(/[\s\.]/g, ''); // e.g. 5151118100104
        
        try {
            // First try directly loading the product page URL structure
            // Example: https://profishop.sanitastroesch.ch/business/article-xxx-5151118100104
            // Since we don't know the exact name slug, we can try searching for just the artNr and grabbing the first result link
            await page.goto(`https://profishop.sanitastroesch.ch/business/search?text=${artStr}`, { waitUntil: 'networkidle0' });
            
            // Check if it redirected to the product page directly
            if (page.url().includes('article-')) {
                const imgUrl = await page.evaluate(() => {
                    const img = document.querySelector('.picture-img img, .product-item-image img, .carousel-item.active img');
                    return img ? img.src : null;
                });
                
                if (imgUrl && imgUrl.includes('multimedia')) {
                    const cleanUrl = new URL(imgUrl, 'https://profishop.sanitastroesch.ch').href;
                    console.log(`[${i+1}/${uniqueItems.length}] Found for ${t.artNr}: ${cleanUrl}`);
                    
                    itemsToUpdate.forEach(item => {
                        if (item.artNr === t.artNr) {
                            item.imgUrl = cleanUrl;
                        }
                    });
                }
            } else {
                 console.log(`[${i+1}/${uniqueItems.length}] Search did not redirect to product page for ${t.artNr}. URL: ${page.url()}`);
            }
        } catch (e) {
            console.log(`[${i+1}/${uniqueItems.length}] Error on ${t.artNr}: ${e.message}`);
        }
    }
    
    await browser.close();
    fs.writeFileSync('../custom-data.json', JSON.stringify(data, null, 2), 'utf8');
})();
