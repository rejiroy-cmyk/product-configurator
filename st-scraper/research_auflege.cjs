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
        // Let's use the first item: 3131 744.100.000 from the head command
        const searchQuery = '3131744100000';
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
        
        // Scroll to load accessories
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
                if (txt.toLowerCase().includes('ventil') || txt.toLowerCase().includes('ablauf')) {
                    accessories.push(txt.replace(/\n/g, ' '));
                }
            }
            
            const specs = Array.from(document.querySelectorAll('td, th, span, div, p, li'));
            const specsFound = [];
            for (let n of specs) {
                const txt = n.innerText.toLowerCase().trim();
                if (txt.includes('hahn') || txt.includes('armatur')) {
                    specsFound.push(txt);
                }
            }

            return { accessories, specsFound };
        });

        console.log("Found:", JSON.stringify(pdpData, null, 2));
    } catch (err) {
        console.error(err);
    } finally {
        await browser.close();
    }
})();
