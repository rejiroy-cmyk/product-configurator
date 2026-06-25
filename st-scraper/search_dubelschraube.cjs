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
        await page.goto('https://profishop.sanitastroesch.ch/business/search?q=D%C3%BCbelschraube', { waitUntil: 'networkidle2', timeout: 30000 });
        await new Promise(r => setTimeout(r, 4000));
        
        const pdpData = await page.evaluate(() => {
            const rows = Array.from(document.querySelectorAll('.product-list-item, .card, article')); 
            return rows.map(r => r.innerText.replace(/\n/g, ' ')).filter(t => t.includes('Dübelschraube'));
        });

        console.log("Found Dübelschrauben:", JSON.stringify(pdpData, null, 2));
    } catch (err) {
        console.error(err);
    } finally {
        await browser.close();
    }
})();
