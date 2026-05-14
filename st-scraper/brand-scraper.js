const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());
const fs = require('fs');
const path = require('path');

const dataPath = path.resolve(__dirname, '../custom-data.json');
let data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

// Find all products that have manufacturer missing or set to "Andere"
const productsToScrape = [];
["wandklosett", "standklosett"].forEach(cat => {
    if (data[cat] && data[cat].trays) {
        data[cat].trays.forEach(t => {
            if (!t.manufacturer || t.manufacturer === "Andere") {
                productsToScrape.push({ category: cat, artNr: t.artNr, label: t.label });
            }
        });
    }
});

console.log(`Found ${productsToScrape.length} products to scrape for brand.`);

(async () => {
    const browser = await puppeteer.launch({ 
        headless: false,
        args: ['--window-size=1920,1080'] 
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });

    let updated = 0;

    try {
        for (let i = 0; i < productsToScrape.length; i++) {
            const item = productsToScrape[i];
            const cleanFull = item.artNr.replace(/\s/g, '');
            const match = cleanFull.match(/^\d{7,8}/);
            const searchQuery = match ? match[0] : item.artNr.trim();

            console.log(`\n[${i+1}/${productsToScrape.length}] Searching: ${item.artNr}`);

            try {
                // Use the same profishop URL as the working accessory scraper
                const searchUrl = `https://profishop.sanitastroesch.ch/business/search?q=${encodeURIComponent(searchQuery)}`;
                await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 30000 });
                await new Promise(r => setTimeout(r, 2000));

                let currentUrl = page.url();
                let isSearchPage = currentUrl.includes('/search');

                // Navigate to product page if still on search results
                if (isSearchPage) {
                    const productHref = await page.evaluate((sq) => {
                        const links = Array.from(document.querySelectorAll('a'));
                        for (let a of links) {
                            const href = a.href || '';
                            if (href.includes('/business/article-') && !href.includes('/search')) {
                                return href;
                            }
                        }
                        return null;
                    }, searchQuery);

                    if (productHref) {
                        await page.goto(productHref, { waitUntil: 'networkidle0', timeout: 30000 });
                        await new Promise(r => setTimeout(r, 3000));
                    } else {
                        console.log(`  -> No product link found for ${item.artNr}`);
                        continue;
                    }
                } else {
                    await new Promise(r => setTimeout(r, 3000));
                }

                // Extract the "Marke" row from Technische Details table
                const brand = await page.evaluate(() => {
                    const rows = Array.from(document.querySelectorAll('table tr, .product-detail-attributes tr, dl dt, .attributes tr'));
                    for (const row of rows) {
                        const cells = row.querySelectorAll('td, th, dd');
                        const texts = Array.from(cells).map(c => c.textContent.trim());
                        const rowText = row.textContent.trim();
                        if (rowText.toLowerCase().includes('marke') && texts.length >= 2) {
                            // Return the second cell (the value)
                            return texts[texts.length - 1];
                        }
                    }
                    // Fallback: search all text for "Marke" label
                    const allText = document.body.innerText;
                    const markeMatch = allText.match(/Marke\s*\n?\s*([^\n]+)/);
                    return markeMatch ? markeMatch[1].trim() : null;
                });

                if (brand && brand.length > 0 && brand !== 'Marke') {
                    console.log(`  -> 🔥 FOUND BRAND: ${brand}`);
                    const tray = data[item.category].trays.find(t => t.artNr === item.artNr);
                    if (tray) {
                        tray.manufacturer = brand;
                        updated++;
                    }
                } else {
                    console.log(`  -> Brand not found for ${item.artNr}`);
                }

            } catch (e) {
                console.log(`  -> Error: ${e.message}`);
            }
        }
    } finally {
        await browser.close();
    }

    if (updated > 0) {
        fs.writeFileSync(dataPath, JSON.stringify(data, null, 4));
        console.log(`\n✅ Updated brand for ${updated} products in custom-data.json`);
    } else {
        console.log('\nNo products were updated.');
    }
})();
