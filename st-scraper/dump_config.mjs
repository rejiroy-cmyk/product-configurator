import puppeteer from 'puppeteer';
import fs from 'fs';

(async () => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    
    await page.goto('http://localhost:5175');
    await new Promise(r => setTimeout(r, 2000));
    
    await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('.subcat-btn'));
        const mmBtn = btns.find(b => b.textContent.includes('Mix & Match'));
        if (mmBtn) mmBtn.click();
    });
    
    await new Promise(r => setTimeout(r, 2000));
    const content = await page.evaluate(() => document.getElementById('configView').innerHTML);
    fs.writeFileSync('config_dump.html', content);
    await browser.close();
})();
