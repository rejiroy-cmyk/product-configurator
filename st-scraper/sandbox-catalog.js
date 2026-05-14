const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());
const fs = require('fs');
const path = require('path');

const CATEGORY_URL = process.argv[2] || "https://profishop.sanitastroesch.ch/business/catalogue?fq=Keramikserien%2C%20Waschtische%2C%20Klosetts%2C%20Bidets%2C%20Urinoirs%2C%20Waschtischm%C3%B6bel%20AND%20Alterna&rows=12&sort=Relevancy%20desc&page=1&filters=%5B%22CategoryPath%3AKeramikserien%2C%20Waschtische%2C%20Klosetts%2C%20Bidets%2C%20Urinoirs%2C%20Waschtischm%C3%B6bel%2FAlterna%22%5D";

(async () => {
    console.log(`Booting Sandbox Scraper...`);
    
    const browser = await puppeteer.launch({ 
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1920,1080'] 
    });
    
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });

    try {
        console.log(`Starting Sandbox Scraper for: ${CATEGORY_URL}`);
        
        let currentPage = 1;
        let hasMore = true;
        let totalScrapedData = [];
        
        while (hasMore) {
            // Replace the 'page=1' part of the URL with the current page number
            const targetUrl = CATEGORY_URL.replace(/page=\d+/, `page=${currentPage}`);
            
            console.log(`\nNavigating to page ${currentPage}: ${targetUrl}`);
            await page.goto(targetUrl, { waitUntil: 'networkidle2', timeout: 60000 });
            
            console.log(`Waiting 5 seconds for products to load fully on page ${currentPage}...`);
            await new Promise(resolve => setTimeout(resolve, 5000));

            console.log(`Extracting product data from page ${currentPage}...`);
            
            const pageData = await page.evaluate(() => {
                const results = [];
                const cards = document.querySelectorAll('.product-card, [class*="ProductCard"], [class*="product-item"], .list-group-item');
                
                cards.forEach(card => {
                    let title = 'Unknown Title';
                    let artNr = '';
                    let imgUrl = '';
                    
                    const titleEl = card.querySelector('h2, h3, [class*="title"], [class*="name"], a.text-dark');
                    if (titleEl) title = titleEl.innerText.trim();
                    
                    const imgEl = card.querySelector('img');
                    if (imgEl && imgEl.src && !imgEl.src.includes('logo')) imgUrl = imgEl.src;
                    
                    const textContent = card.innerText.trim();
                    const dotFormatMatch = textContent.match(/(\d{4})\s+(\d{3})\.(\d{3})\.(\d{3})/);
                    
                    if (dotFormatMatch) {
                        artNr = dotFormatMatch[0];
                    } else {
                        const baseMatch = textContent.match(/\b(\d{7,8})\b/);
                        if (baseMatch) {
                            artNr = baseMatch[1];
                        }
                    }

                    if (!artNr && imgUrl) {
                        const urlMatch = imgUrl.match(/\/0?(\d{7,8})_/);
                        if (urlMatch) {
                            artNr = urlMatch[1];
                        }
                    }
                    
                    if (artNr && title !== 'Unknown Title') {
                        results.push({
                            title,
                            artNr,
                            imgUrl,
                        });
                    }
                });
                
                return results;
            });
            
            if (pageData.length === 0) {
                console.log(`No products found on page ${currentPage}. Scraping complete!`);
                hasMore = false;
            } else {
                console.log(`Successfully scraped ${pageData.length} products on page ${currentPage}!`);
                totalScrapedData = totalScrapedData.concat(pageData);
                currentPage++;
            }
        }
        
        console.log(`\nTotal products scraped across all pages: ${totalScrapedData.length}`);
        
        // Output to JSON for reference and image URLs
        const outFilePath = path.resolve(__dirname, 'sandbox-output.json');
        fs.writeFileSync(outFilePath, JSON.stringify(totalScrapedData, null, 2));

        // Format to CSV exactly matching 'Vorlage_Import_Konfigurator.csv'
        // Format: Typ;Artikelnummer;Menge;Bezeichnung
        const csvHeader = "Typ;Artikelnummer;Menge;Bezeichnung\n";
        
        const mainProducts = [];
        const accessories = [];
        
        // Priority 1: Main Product Keywords (overrides everything else)
        const mainKeywords = ["mischer", "wanne", "thermostat", "wandbatterie", "eckventil", "waschtisch", "klosett", "wc", "bidet", "urinoir", "möbel", "lavabo", "becken", "spiegelschrank"];
        // Priority 2: Accessory Keywords
        const accKeywords = ["verschraubung", "schlauch", "brause", "rosette", "einbaukörper", "anschluss", "halter", "stange", "montage", "set", "ventil"];
        
        totalScrapedData.forEach(p => {
            const cleanTitle = p.title.replace(/;/g, ',');
            const lowerTitle = cleanTitle.toLowerCase();
            
            // Check if it strictly defines itself as a main product first
            const isMainProduct = mainKeywords.some(kw => lowerTitle.includes(kw));
            const isAccessory = accKeywords.some(kw => lowerTitle.includes(kw));
            
            // If it has 'mischer' in the name, always treat it as a main product
            // even if its description says "Schlauchanschlüsse" later.
            if (isMainProduct) {
                mainProducts.push(`;${p.artNr};1;${cleanTitle}\n;`);
            } else if (isAccessory) {
                accessories.push(`ALT;${p.artNr};1;${cleanTitle} (Zubehör)`);
            } else {
                // If it matches neither, default to main product just in case
                mainProducts.push(`;${p.artNr};1;${cleanTitle}\n;`);
            }
        });
        
        const mainCsvText = mainProducts.length > 0 ? "--- HAUPTPRODUKTE ---\n" + mainProducts.join("\n") + "\n" : "";
        const accCsvText = accessories.length > 0 ? "\n--- SCHNIPSEL FÜR ZUBEHÖR (Kopieren & Einfügen) ---\n" + accessories.join("\n") + "\n;" : "";
        
        const csvContent = csvHeader + mainCsvText + accCsvText;
        
        const outCsvPath = path.resolve(__dirname, 'auto-import.csv');
        fs.writeFileSync(outCsvPath, csvContent, 'utf8');
        
        console.log('----------------------------------------------------');
        console.log(`Saved JSON backup to: ${outFilePath}`);
        console.log(`Saved READY-TO-IMPORT CSV to: ${outCsvPath}`);
        console.log('Sample of first main product row:');
        console.log(mainProducts.length > 0 ? mainProducts[0].trim() : 'No main products found.');
        console.log('----------------------------------------------------');

    } catch (e) {
        console.error("Failed to scrape:", e);
    } finally {
        await browser.close();
    }
})();
