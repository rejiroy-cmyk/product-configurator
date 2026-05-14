import puppeteer from 'puppeteer';

(async () => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    
    page.on('console', msg => {
        if (msg.type() === 'error') console.log('PAGE ERROR LOG:', msg.text());
    });
    page.on('pageerror', error => console.log('PAGE ERROR THROWN:', error.message));
    
    await page.goto('http://localhost:5175');
    await new Promise(r => setTimeout(r, 2000));
    
    console.log("Clicking Mix & Match...");
    await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('.subcat-btn'));
        const mmBtn = btns.find(b => b.textContent.includes('Mix & Match'));
        if (mmBtn) mmBtn.click();
        else console.log("Button not found!");
    });
    
    await new Promise(r => setTimeout(r, 1000));
    const content = await page.evaluate(() => document.getElementById('configView').innerHTML);
    if (!content || content.length < 100) {
       console.log("Config view is empty!");
    } else {
       console.log("Config view populated.");
    }
    await browser.close();
})();
