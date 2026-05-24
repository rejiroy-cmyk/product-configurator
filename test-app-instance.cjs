const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: "new" });
  const page = await browser.newPage();
  
  await page.goto('http://localhost:5176', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 1000));
  
  const result = await page.evaluate(() => {
    try {
      const app = window.productApps["duschenwanne"];
      return {
        hasApp: !!app,
        hasInit: typeof app.init === 'function',
        traysLength: app.trays ? app.trays.length : -1,
        sidebarHtml: document.getElementById('configSidebar') ? document.getElementById('configSidebar').innerHTML : null
      };
    } catch(e) {
      return { error: e.message };
    }
  });

  console.log('RESULT:', result);

  await browser.close();
})();
