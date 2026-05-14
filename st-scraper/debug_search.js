const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());
const path = require('path');

(async () => {
    const browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    const baseUrl = 'https://profishop.sanitastroesch.ch/de/';
    const artNr = '1541 756.591.118';
    
    console.log(`Navigating to: ${baseUrl}`);
    await page.goto(baseUrl, { waitUntil: 'networkidle2' });
    
    // Type into search bar
    const searchSelector = 'input[name="q"], input[type="search"], .search-input';
    await page.waitForSelector(searchSelector);
    await page.type(searchSelector, artNr);
    await page.keyboard.press('Enter');
    
    console.log(`Waiting for search results...`);
    await page.waitForNavigation({ waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 5000));
    
    const screenshotPath = path.resolve(__dirname, 'search_debug.png');
    await page.screenshot({ path: screenshotPath });
    console.log(`Screenshot saved to: ${screenshotPath}`);
    
    const html = await page.content();
    require('fs').writeFileSync(path.resolve(__dirname, 'search_debug.html'), html);
    
    await browser.close();
})();
