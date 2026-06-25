const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

(async () => {
    const browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    const artNr = '2112427100000';
    await page.goto(`https://profishop.sanitastroesch.ch/business/search?q=${artNr}`, { waitUntil: 'networkidle0' });
    
    await new Promise(r => setTimeout(r, 4000));
    
    // Evaluate if we have links to products and click the first one if we are on a search page
    const currentUrl = await page.url();
    if (currentUrl.includes('/search')) {
        const productHref = await page.evaluate((sq) => {
            const links = Array.from(document.querySelectorAll('a'));
            for (let a of links) {
                if (a.href && a.href.includes('/business/article-') && !a.href.includes('/search')) {
                    return a.href;
                }
            }
            return null;
        });
        if (productHref) {
            await page.goto(productHref, { waitUntil: 'networkidle0' });
            await new Promise(r => setTimeout(r, 4000));
        }
    }

    // scroll
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
    await page.screenshot({ path: 'test_screenshot.png', fullPage: true });

    const ventils = await page.evaluate(() => {
        const rows = Array.from(document.querySelectorAll('.product-list-item, tr, .row, article, .card')); 
        let results = [];
        for (let row of rows) {
            const txt = row.innerText || '';
            const txtLower = txt.toLowerCase();
            if (txtLower.includes('art-nr.') || txtLower.includes('chf')) {
                const match = txt.match(/\d{4}\s\d{3}\.\d{3}\.\d{3}/);
                const isVentil = txtLower.includes('ablaufventil') || txtLower.includes('schaftventil') || txtLower.includes('ventil');
                if (match && isVentil) {
                    results.push({ artNr: match[0], label: txt.replace(/\n/g, ' ').replace(/"/g, '""').substring(0, 150) });
                }
            }
        }
        return results;
    });

    console.log("Ventils found:", JSON.stringify(ventils, null, 2));

    await browser.close();
})();
