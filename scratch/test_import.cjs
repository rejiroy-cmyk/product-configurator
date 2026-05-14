const puppeteer = require('puppeteer');

(async () => {
    const browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();
    
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    page.on('pageerror', err => console.error('PAGE ERROR:', err.toString()));

    try {
        await page.goto('http://localhost:5175');
        
        // Wait for and click Admin Mode
        await page.waitForSelector('#openAdminBtn');
        await page.click('#openAdminBtn');
        
        // Wait for and click Badewanne app selector
        await page.waitForSelector('.finish-row-btn');
        const apps = await page.$$('.finish-row-btn');
        for (let btn of apps) {
            const text = await page.evaluate(el => el.textContent, btn);
            if (text.includes('Badewanne')) {
                await btn.click();
                break;
            }
        }
        
        // Wait a bit for UI to settle
        await new Promise(r => setTimeout(r, 1000));
        
        // Find the upload input
        const [fileChooser] = await Promise.all([
            page.waitForFileChooser(),
            page.evaluate(() => document.getElementById('uploadCsvBtn').click())
        ]);
        
        await fileChooser.accept(['/Users/jenistonsellathamby/Desktop/product-configurator/bw mit loch.csv']);
        
        // Wait for the alert or some logs
        page.on('dialog', async dialog => {
            console.log('DIALOG MESSAGE:', dialog.message());
            await dialog.accept();
        });
        
        await new Promise(r => setTimeout(r, 3000));
    } catch(e) {
        console.error('SCRIPT ERR:', e);
    } finally {
        await browser.close();
    }
})();
