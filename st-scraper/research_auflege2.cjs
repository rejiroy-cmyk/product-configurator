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
        const searchQuery = '2112427100000';
        await page.goto(`https://profishop.sanitastroesch.ch/business/search?q=${searchQuery}`, { waitUntil: 'networkidle2', timeout: 30000 });
        await new Promise(r => setTimeout(r, 4000));
        
        let currentUrl = await page.url();
        if (currentUrl.includes('/search')) {
            const productHref = await page.evaluate((sq) => {
                const links = Array.from(document.querySelectorAll('a'));
                for (let a of links) {
                    if (a.href.includes('/business/article-') && !a.href.includes('/search')) return a.href;
                }
                return null;
            }, searchQuery);
            if (productHref) {
                await page.goto(productHref, { waitUntil: 'networkidle0', timeout: 30000 });
                await new Promise(r => setTimeout(r, 4000));
            }
        }
        
        await page.evaluate(async () => {
            await new Promise((resolve) => {
                let totalHeight = 0;
                const distance = 500;
                const timer = setInterval(() => {
                    window.scrollBy(0, distance);
                    totalHeight += distance;
                    if (totalHeight >= document.body.scrollHeight - window.innerHeight || totalHeight > 10000) {
                        clearInterval(timer);
                        resolve();
                    }
                }, 200);
            });
        });
        await new Promise(r => setTimeout(r, 2000));

        const pdpData = await page.evaluate(() => {
            const rows = Array.from(document.querySelectorAll('.product-list-item, tr, .row, article, .card')); 
            const accessories = [];
            for (let row of rows) {
                const txt = row.innerText || '';
                // Try to find ANY accessory row
                if (txt.includes('Art-Nr.') || txt.includes('CHF')) {
                    const match = txt.match(/\d{4}\s\d{3}\.\d{3}\.\d{3}/);
                    if (match && !txt.includes('Auflegewaschtisch Pro')) {
                         accessories.push({
                             artNr: match[0],
                             text: txt.replace(/\n/g, ' ').substring(0, 150)
                         });
                    }
                }
            }

            const pageText = document.body.innerText.replace(/\n/g, ' ');
            const hahnlochIndex = pageText.toLowerCase().indexOf('hahnloch');
            let hahnlochContext = '';
            if (hahnlochIndex > -1) {
                 hahnlochContext = pageText.substring(Math.max(0, hahnlochIndex - 50), hahnlochIndex + 50);
            }

            return { accessories, hahnlochContext };
        });

        console.log(JSON.stringify(pdpData, null, 2));
    } catch (err) {
        console.error(err);
    } finally {
        await browser.close();
    }
})();
