const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: "new" });
  const page = await browser.newPage();
  
  await page.goto('http://localhost:5176', { waitUntil: 'networkidle0' });
  await page.screenshot({ path: 'screenshot-home.png' });
  
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
  await page.screenshot({ path: 'screenshot-duschenwanne.png' });

  await browser.close();
})();
