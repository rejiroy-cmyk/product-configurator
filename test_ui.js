import puppeteer from 'puppeteer';

(async () => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    await page.goto('http://localhost:5175/');
    
    await new Promise(r => setTimeout(r, 1000));
    
    // Switch to Duschenwanne tab just in case
    await page.click('[data-app="Duschenwanne"]');
    
    await new Promise(r => setTimeout(r, 2000));
    
    const count = await page.$eval('#resultCount_duschenwanne', el => el.textContent);
    console.log('Result count text:', count);
    
    await browser.close();
})();
