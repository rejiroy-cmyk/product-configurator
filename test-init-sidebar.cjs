const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: "new" });
  const page = await browser.newPage();
  
  await page.goto('http://localhost:5176', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 1000));
  
  const result = await page.evaluate(() => {
    try {
      const app = window.productApps["duschenwanne"];
      app.init();
      return {
        sidebarHtml: document.getElementById('configSidebar').innerHTML
      };
    } catch(e) {
      return { error: e.stack };
    }
  });

  console.log('INIT RESULT:', result);

  await browser.close();
})();
