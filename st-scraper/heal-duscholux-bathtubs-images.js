const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());
const fs = require('fs');
const path = require('path');

const DATA_PATH = path.resolve(__dirname, '../custom-data.json');

(async () => {
    let data = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
    const trays = data.badeabtrennung.trays;

    // Target all items that have the wrong placeholder image
    const broken = trays.filter(t => t.imgUrl && t.imgUrl.includes('01311872_100_181.png'));
    console.log(`\n🔍 Found ${broken.length} Badeabtrennung products with the wrong placeholder image.\n`);

    if (broken.length === 0) {
        console.log('✅ All images are healthy!');
        return;
    }

    console.log(`🔧 Healing ${broken.length} broken images via Puppeteer...\n`);

    const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--window-size=1920,1080']
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });

    let healed = 0, failed = 0;

    try {
        for (let i = 0; i < broken.length; i++) {
            const t = broken[i];
            const artNrClean = t.artNr.trim();
            const searchUrl = `https://profishop.sanitastroesch.ch/business/search?q=${encodeURIComponent(artNrClean)}`;

            console.log(`[${i+1}/${broken.length}] Healing: ${t.artNr}`);

            try {
                await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 30000 });
                await new Promise(r => setTimeout(r, 2000));

                const imgUrl = await page.evaluate(() => {
                    // Try product card image first
                    const productImg = document.querySelector('.product-image img, .product-tile img, .search-result img, [class*="product"] img, .product-list-item img, .article-image img');
                    if (productImg && productImg.src && productImg.src.includes('profishop')) {
                        // Check if it's not the placeholder
                        if (!productImg.src.includes('01311872_100_181.png') && !productImg.src.includes('no-image')) {
                            return productImg.src;
                        }
                    }
                    // Try any image from profishop CDN
                    const allImgs = Array.from(document.querySelectorAll('img'));
                    const cdnImg = allImgs.find(img => img.src && (img.src.includes('multimedia/Web/PG') || img.src.includes('web-content')) && !img.src.includes('01311872_100_181.png'));
                    return cdnImg ? cdnImg.src : null;
                });

                if (imgUrl) {
                    // Update in target
                    t.imgUrl = imgUrl;
                    healed++;
                    console.log(`   ✅ Found: ${imgUrl.substring(0, 70)}`);
                } else {
                    failed++;
                    console.log(`   ⚠️  No image found on page`);
                    
                    // Fallback to building standard ST url from artNr
                    const cleanNr = t.artNr.replace(/\s/g,'').replace(/\./g,'_');
                    t.imgUrl = `https://profishop.sanitastroesch.ch/multimedia/Web/PG1/0${cleanNr}.png`;
                    console.log(`   ✅ Fallback applied: ${t.imgUrl}`);
                }

                // Save every 10 heals
                if (healed % 10 === 0 && healed > 0) {
                    fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 4));
                }

            } catch (err) {
                failed++;
                console.log(`   ❌ Error: ${err.message}`);
                try {
                    await page.close();
                    const newPage = await browser.newPage();
                    await newPage.setViewport({ width: 1920, height: 1080 });
                } catch(e) {}
            }
        }
    } finally {
        await browser.close();
    }

    fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 4));
    console.log(`\n════════════════════════════════════
✅ Image healing complete!
   Healed: ${healed}
   Failed (Fallback used): ${failed}
   Total checked: ${broken.length}
════════════════════════════════════\n`);
})();
