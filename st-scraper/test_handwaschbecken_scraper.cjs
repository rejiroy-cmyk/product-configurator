const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

(async () => {
    const browser = await puppeteer.launch({ 
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1920,1080'] 
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });

    try {
        await page.goto('https://profishop.sanitastroesch.ch/business/article-handwaschbecken-laufen-lua-mit-ueberlauf-36-x-25-cm-armaturenloch-rechts-umweltdeklaration-epd-weiss-2111103100000', { waitUntil: 'networkidle2', timeout: 30000 });
        await new Promise(r => setTimeout(r, 4000));
        
        await page.evaluate(async () => {
            await new Promise((resolve) => {
                let totalHeight = 0;
                const distance = 500;
                const timer = setInterval(() => {
                    const scrollHeight = document.body.scrollHeight;
                    window.scrollBy(0, distance);
                    totalHeight += distance;
                    if (totalHeight >= scrollHeight - window.innerHeight || totalHeight > 10000) {
                        clearInterval(timer);
                        resolve();
                    }
                }, 200);
            });
        });
        await new Promise(r => setTimeout(r, 2000));

        const pdpData = await page.evaluate(() => {
            const accessoryRows = Array.from(document.querySelectorAll('.product-list-item, tr, .row, article, .card')); 
            
            for (let row of accessoryRows) {
                const rowText = row.innerText || '';
                if (rowText.includes('Dübelschraube')) {
                    // Extract article number (e.g. 8211 112.000.000)
                    const artMatch = rowText.match(/\d{4}\s\d{3}\.\d{3}\.\d{3}/);
                    
                    const inputField = row.querySelector('.quantity-input input[type="text"], .quantity-input input[type="number"], input.form-control[placeholder="Menge"]');
                    let qty = null;
                    if (inputField) {
                        qty = inputField.value;
                    }
                    
                    return {
                        text: rowText.replace(/\n/g, ' '),
                        artNr: artMatch ? artMatch[0] : null,
                        quantity: qty ? parseInt(qty.toString().trim()) : null
                    };
                }
            }
            return null;
        });

        console.log("Scraped data:", pdpData);
    } catch (err) {
        console.error(err);
    } finally {
        await browser.close();
    }
})();
