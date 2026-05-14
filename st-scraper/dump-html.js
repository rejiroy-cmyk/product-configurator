const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());
const fs = require('fs');
const path = require('path');

const url = "https://profishop.sanitastroesch.ch/business/catalogue?fq=Armaturen%2C%20Duschsysteme%2C%20Armaturen-Steuerungen%20AND%20Armaturenserien%20AND%20Alterna&rows=12&sort=Relevancy%20desc&page=1&filters=%5B%22CategoryPath%3AArmaturen%2C%20Duschsysteme%2C%20Armaturen-Steuerungen%2FArmaturenserien%2FAlterna%22%5D";

(async () => {
    console.log('Launching browser...');
    const browser = await puppeteer.launch({ 
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox'] 
    });
    const page = await browser.newPage();
    
    console.log('Navigating to category page...');
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    
    console.log('Waiting for products to load...');
    await new Promise(r => setTimeout(r, 5000)); // Wait for SPA to render
    
    console.log('Extracting HTML...');
    const html = await page.evaluate(() => document.body.innerHTML);
    
    const outFile = path.resolve(__dirname, 'dump.html');
    fs.writeFileSync(outFile, html);
    
    await browser.close();
    console.log('Done mapping the DOM! Dumped to dump.html');
})();
