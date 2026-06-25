const fs = require('fs');
const puppeteer = require('puppeteer');

(async () => {
    const data = JSON.parse(fs.readFileSync('../custom-data.json', 'utf8'));
    
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
        const artStr = String(t.artNr).replace(/[\s\.]/g, '');
        
        try {
            // Using q= instead of text=
            await page.goto(`https://profishop.sanitastroesch.ch/business/search?q=${artStr}`, { waitUntil: 'networkidle0' });
            
            const imgUrl = await page.evaluate(() => {
                // The images on the search results page or product page
                const img = document.querySelector('.article-image-wrapper img, .picture-img img, .product-item-image img, .carousel-item.active img');
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
            } else {
                 console.log(`[${i+1}/${uniqueItems.length}] No image found for ${t.artNr}`);
            }
        } catch (e) {
            console.log(`[${i+1}/${uniqueItems.length}] Error on ${t.artNr}: ${e.message}`);
        }
    }
    
    await browser.close();
    fs.writeFileSync('../custom-data.json', JSON.stringify(data, null, 2), 'utf8');
    console.log('Successfully updated custom-data.json!');
})();
