import puppeteer from 'puppeteer';
import fs from 'fs';
(async () => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    page.on('pageerror', error => console.log('PAGE ERROR:', error.message));
    await page.goto('http://localhost:5175');
    await page.waitForTimeout(2000);
    const html = await page.content();
    fs.writeFileSync('dom_dump.html', html);
    console.log("Written dom_dump.html");
    await browser.close();
})();
