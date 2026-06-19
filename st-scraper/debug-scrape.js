const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

(async () => {
    const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
    const page = await browser.newPage();
    const artNr = '1545 315.501.119';
    await page.goto(`https://profishop.sanitastroesch.ch/business/search?q=${encodeURIComponent(artNr)}`, { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 2000));
    
    // Find link
    const linkHref = await page.evaluate(() => {
        const a = Array.from(document.querySelectorAll('a')).find(el => el.href && el.href.includes('/business/article-'));
        return a ? a.href : null;
    });
    
    console.log("Found link: " + linkHref);
    
    if (linkHref) {
        await page.goto(linkHref, { waitUntil: 'networkidle0', timeout: 30000 });
        await new Promise(r => setTimeout(r, 2000));
        
        const pageHtml = await page.evaluate(() => {
            let out = "HEADERS:\n";
            document.querySelectorAll('h1, h2, h3, h4, h5, .title, .section-title, strong').forEach(h => {
                if (h.innerText.trim()) out += `- ${h.tagName}: ${h.innerText.trim()} (class: ${h.className})\n`;
            });
            out += "\nTEXT WITH 'Echtglas':\n";
            document.querySelectorAll('*').forEach(el => {
                if (el.children.length === 0 && el.textContent.includes('Echtglas')) {
                    out += `- <${el.tagName}>: ${el.textContent}\n`;
                }
            });
            return out;
        });
        
        console.log(pageHtml);
    }
    
    await browser.close();
})();
