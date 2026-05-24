const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: "new" });
  const page = await browser.newPage();
  
  await page.goto('http://localhost:5176', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 1000));
  
  const error = await page.evaluate(() => {
    try {
      window.productApps["duschenwanne"].init();
      return "SUCCESS";
    } catch(e) {
      return e.stack;
    }
  });

  console.log('INIT ERROR:', error);

  await browser.close();
})();
