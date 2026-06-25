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
            const rowsText = [];
            for (let row of accessoryRows) {
                const rowText = row.innerText || '';
                if (rowText.toLowerCase().includes('schraub') || rowText.toLowerCase().includes('befestigung') || rowText.toLowerCase().includes('dübel') || /\b8211\s*\d{3}/.test(rowText) || /\d{4}\s\d{3}\.\d{3}\.\d{3}/.test(rowText)) {
                    rowsText.push(rowText.replace(/\n/g, ' '));
                }
            }
            return rowsText;
        });

        console.log("Found rows:", pdpData);
    } catch (err) {
        console.error(err);
    } finally {
        await browser.close();
    }
})();
