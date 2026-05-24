const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: "new" });
  const page = await browser.newPage();
  
  page.on('pageerror', err => {
    console.log('PAGE ERROR:', err.message);
  });
  
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('CONSOLE ERROR:', msg.text());
    }
  });

  await page.goto('http://localhost:5176', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 1000));
  
  await page.evaluate(() => {
    const btns = document.querySelectorAll('.app-card');
    for (const btn of btns) {
      if (btn.textContent.includes('Duschenwanne')) {
        btn.click();
        break;
      }
    }
  });

  await new Promise(r => setTimeout(r, 1000));
  await browser.close();
})();
