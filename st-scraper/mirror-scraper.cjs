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
                // If it doesn't already have a -xxx in the imgUrl or we want to force update all
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
    
    // We will do this sequentially to not overwhelm the server
    for (let i = 0; i < uniqueItems.length; i++) {
        const t = uniqueItems[i];
        const artStr = String(t.artNr).replace(/[\s\.]/g, ''); // e.g. 5151118100104
        
        try {
            await page.goto(`https://profishop.sanitastroesch.ch/business/search?text=${artStr}`, { waitUntil: 'domcontentloaded', timeout: 15000 });
            
            // Wait for image container or fallback
            await page.waitForSelector('.product-item-image img, .picture-img img', { timeout: 3000 }).catch(() => {});
            
            const imgUrl = await page.evaluate(() => {
                const img = document.querySelector('.product-item-image img, .picture-img img');
                return img ? img.src : null;
            });
            
            if (imgUrl && imgUrl.includes('multimedia')) {
                // Extract just the path part to keep it clean, or full URL
                // Let's use the full URL if it works
                const cleanUrl = new URL(imgUrl, 'https://profishop.sanitastroesch.ch').href;
                console.log(`[${i+1}/${uniqueItems.length}] Found for ${t.artNr}: ${cleanUrl}`);
                
                // Update all instances of this artNr in the DB
                itemsToUpdate.forEach(item => {
                    if (item.artNr === t.artNr) {
                        item.imgUrl = cleanUrl;
                    }
                });
            } else {
                console.log(`[${i+1}/${uniqueItems.length}] No image found for ${t.artNr}`);
            }
        } catch (e) {
            console.log(`[${i+1}/${uniqueItems.length}] Error on ${t.artNr}: ${e.message}`);
        }
    }
    
    await browser.close();
    
    fs.writeFileSync('../custom-data.json', JSON.stringify(data, null, 2), 'utf8');
    console.log('Successfully updated custom-data.json with correct mirror cabinet image URLs!');
})();
