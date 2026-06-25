const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

(async () => {
    const browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();
    const artNr = '2112427100000';
    const url = `https://profishop.sanitastroesch.ch/de/Bad/Waschtische/Waschtische-ohne-Moebel/Auflegewaschtisch-Pro-ohne-Ueberlauf-52-x-39-cm-Hoehe-15-cm-oval-Befestigungsmaterial/p/${artNr}`;

    await page.goto(url, { waitUntil: 'domcontentloaded' });
    
    // Extract related items
    const related = await page.$$eval('.accessory-product-item', items => {
        return items.map(el => {
            const lbl = el.querySelector('.name')?.innerText || '';
            const art = el.querySelector('.code')?.innerText || '';
            return { art, lbl };
        });
    });

    console.log(JSON.stringify(related, null, 2));

    await browser.close();
})();
