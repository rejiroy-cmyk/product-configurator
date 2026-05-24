const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: "new" });
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('BROWSER CONSOLE:', msg.text()));
  page.on('pageerror', error => console.log('BROWSER ERROR:', error.message));

  console.log('Navigating to http://localhost:5176 ...');
  await page.goto('http://localhost:5176', { waitUntil: 'networkidle0' });
  
  console.log('Clicking Duschenwanne ...');
  // Click on the Dusche category first, then Duschenwanne
  try {
    const wanneBtns = await page.$$('.app-card');
    for (const btn of wanneBtns) {
      const text = await page.evaluate(el => el.textContent, btn);
      if (text.includes('Duschenwanne')) {
        await btn.click();
        break;
      }
    }
  } catch(e) {
    console.log('Could not click Duschenwanne card', e);
  }

  await new Promise(r => setTimeout(r, 2000));
  await browser.close();
})();
