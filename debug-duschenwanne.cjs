const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: "new" });
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('BROWSER CONSOLE:', msg.type(), msg.text()));
  page.on('pageerror', error => console.log('BROWSER ERROR:', error.message));

  console.log('Navigating...');
  await page.goto('http://localhost:5176', { waitUntil: 'networkidle0' });
  
  console.log('Clicking Duschenwanne...');
  await page.evaluate(() => {
    const btns = document.querySelectorAll('.app-card');
    for (const btn of btns) {
      if (btn.textContent.includes('Duschenwanne')) {
        btn.click();
        break;
      }
    }
  });

  await new Promise(r => setTimeout(r, 1500));
  
  const appData = await page.evaluate(() => {
    if (!window.currentActiveApp) return 'No active app';
    return {
      title: window.currentActiveApp.title,
      traysCount: window.currentActiveApp.trays ? window.currentActiveApp.trays.length : 0,
      visibleCount: document.querySelectorAll('.result-item-btn').length
    };
  });
  console.log('App Data:', appData);
  
  await browser.close();
})();
