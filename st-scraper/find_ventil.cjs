const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

(async () => {
    const browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();
    const artNr = '2112427100000';
    await page.goto(`https://profishop.sanitastroesch.ch/business/search?q=${artNr}`, { waitUntil: 'networkidle2' });
    
    // Wait for redirect to PDP
    await new Promise(r => setTimeout(r, 4000));
    
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
    await new Promise(r => setTimeout(r, 4000));

    const ventils = await page.evaluate(() => {
        const rows = Array.from(document.querySelectorAll('.product-list-item, tr, .row, article, .card')); 
        let results = [];
        for (let row of rows) {
            const txt = row.innerText || '';
            const txtLower = txt.toLowerCase();
            if (txtLower.includes('art-nr.') || txtLower.includes('chf')) {
                const match = txt.match(/\d{4}\s\d{3}\.\d{3}\.\d{3}/);
                const isVentil = txtLower.includes('ablaufventil') || txtLower.includes('schaftventil') || txtLower.includes('ventil');
                const isSiphon = txtLower.includes('siphon');
                if (match && isVentil && !isSiphon) {
                    results.push({ artNr: match[0], label: txt.replace(/\n/g, ' ').replace(/"/g, '""').substring(0, 150) });
                }
            }
        }
        return results;
    });

    console.log(JSON.stringify(ventils, null, 2));
    await browser.close();
})();
