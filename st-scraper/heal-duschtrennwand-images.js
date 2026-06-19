/**
 * heal-duschtrennwand-images.js
 * Verifies and heals imgUrl for all liva/costa/primo Duschtrennwand products.
 * For each product, checks if the generated URL returns a 200. If not,
 * scrapes the profishop product page to find the correct image URL.
 */

const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());
const fs   = require('fs');
const path = require('path');
const https = require('https');

const DATA_PATH = path.resolve(__dirname, '../custom-data.json');

function buildImgUrl(artNr) {
    return `https://profishop.sanitastroesch.ch/multimedia/Web/PG1/0${artNr.replace(/\s/g,'').replace(/\./g,'_')}.png`;
}

function checkUrl(url) {
    return new Promise(resolve => {
        const req = https.get(url, { timeout: 8000 }, res => {
            resolve(res.statusCode === 200);
            res.resume();
        });
        req.on('error', () => resolve(false));
        req.on('timeout', () => { req.destroy(); resolve(false); });
    });
}

(async () => {
    let data = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
    const trays = data.duschtrennwand.trays;

    // Target: liva, costa, primo, and lin.3
    const targets = trays.filter(t => ['liva','costa','primo','lin.3'].includes(t.serie));
    console.log(`\n🔍 Checking images for ${targets.length} Duschtrennwand products...\n`);

    // Step 1: Quick HTTP check for all URLs
    let broken = [];
    for (let i = 0; i < targets.length; i++) {
        const t = targets[i];
        const url = t.imgUrl || buildImgUrl(t.artNr);
        const ok = await checkUrl(url);
        if (!ok) {
            broken.push(t);
            process.stdout.write(`❌ [${i+1}/${targets.length}] ${t.artNr}\r`);
        } else {
            process.stdout.write(`✅ [${i+1}/${targets.length}] ${t.artNr}\r`);
        }
    }

    console.log(`\n\n📊 Results: ${targets.length - broken.length} OK, ${broken.length} broken\n`);

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
                    if (productImg && productImg.src && productImg.src.includes('profishop')) return productImg.src;
                    // Try any image from profishop CDN
                    const allImgs = Array.from(document.querySelectorAll('img'));
                    const cdnImg = allImgs.find(img => img.src && (img.src.includes('multimedia/Web/PG') || img.src.includes('web-content')));
                    return cdnImg ? cdnImg.src : null;
                });

                if (imgUrl) {
                    // Update in both target and trays array
                    t.imgUrl = imgUrl;
                    const trayRef = trays.find(x => x.artNr === t.artNr);
                    if (trayRef) trayRef.imgUrl = imgUrl;
                    healed++;
                    console.log(`   ✅ Found: ${imgUrl.substring(0, 70)}`);
                } else {
                    failed++;
                    console.log(`   ⚠️  No image found on page`);
                }

                // Save every 10 heals
                if (healed % 10 === 0 && healed > 0) {
                    fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 4));
                }

            } catch (err) {
                failed++;
                console.log(`   ❌ Error: ${err.message}`);
            }
        }
    } finally {
        await browser.close();
    }

    fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 4));
    console.log(`\n════════════════════════════════════
✅ Image healing complete!
   Healed: ${healed}
   Failed: ${failed}
   Total checked: ${targets.length}
════════════════════════════════════\n`);
})();
