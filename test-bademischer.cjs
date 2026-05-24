const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: "new" });
  const page = await browser.newPage();
  
  await page.goto('http://localhost:5176', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 1000));
  
  // Try to click Bademischer
  await page.evaluate(() => {
    const btns = document.querySelectorAll('.app-card');
    for (const btn of btns) {
      if (btn.textContent.includes('Bademischer')) {
        btn.click();
        break;
      }
    }
  });

  await new Promise(r => setTimeout(r, 1000));

  const result = await page.evaluate(() => {
    // Check if Gleitstange is in the UI
    const labels = Array.from(document.querySelectorAll('.dropdown-group label')).map(el => el.textContent);
    return labels;
  });

  console.log('UI Labels:', result);

  await browser.close();
})();
