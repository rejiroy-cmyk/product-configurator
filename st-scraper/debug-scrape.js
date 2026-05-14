const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

(async () => {
    const browser = await puppeteer.launch({ 
        headless: 'new',
        args: ['--no-sandbox', '--window-size=1920,1080'] 
    });
    const page = await browser.newPage();
    try {
        const query = encodeURIComponent("2233 116");
        console.log(`Searching for: ${query}`);
        await page.goto(`https://profishop.sanitastroesch.ch/de/search?q=${query}`, { waitUntil: 'networkidle2' });
        
        await new Promise(r => setTimeout(r, 2000));
        
        const currentUrl = await page.url();
        console.log(`Landed on URL: ${currentUrl}`);
        
        const mainText = await page.evaluate(() => {
            return document.body.innerText.substring(0, 500); 
        });
        console.log("\n--- Preview ---\n", mainText);
        
        const details = await page.evaluate(() => {
            // Find tables or specific blocks
            const blocks = Array.from(document.querySelectorAll('td, th, span, div, li'));
            return blocks.filter(b => b.innerText.toLowerCase().includes('abstell') || b.innerText.toLowerCase().includes('ablage')).map(b => b.innerText).join(' | ');
        });
        
        console.log("\n--- Details ---\n", details);
        
    } finally {
        await browser.close();
    }
})();
