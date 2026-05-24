const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
  const browser = await puppeteer.launch({ headless: "new" });
  const page = await browser.newPage();
  
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

  const html = await page.evaluate(() => {
    const sidebar = document.getElementById('configSidebar') ? document.getElementById('configSidebar').innerHTML : 'No Sidebar';
    const grid = document.getElementById('configGrid') ? document.getElementById('configGrid').innerHTML : 'No Grid';
    return { sidebar, grid };
  });

  fs.writeFileSync('debug-duschenwanne-ui.html', `
    <h1>Sidebar</h1>
    ${html.sidebar}
    <hr>
    <h1>Grid</h1>
    ${html.grid}
  `);

  console.log('Saved debug HTML');

  await browser.close();
})();
