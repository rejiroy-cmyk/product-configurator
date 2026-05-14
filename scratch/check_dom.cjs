const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto('http://localhost:5175');
  await page.waitForSelector('.category-card');
  // click Waschtisch
  await page.evaluate(() => {
    const cards = document.querySelectorAll('.category-card h2');
    for (let c of cards) {
      if (c.textContent.includes('Waschplatz')) {
        c.closest('.category-card').click();
      }
    }
  });
  await page.waitForTimeout(500);
  // click Mix & Match
  await page.evaluate(() => {
    const btns = document.querySelectorAll('.subcat-btn');
    for (let b of btns) {
      if (b.textContent.includes('Mix & Match')) {
        b.click();
      }
    }
  });
  await page.waitForTimeout(1000);
  const html = await page.evaluate(() => {
    const el = document.getElementById('col_valve');
    return el ? el.innerHTML : 'col_valve not found';
  });
  console.log(html.substring(0, 500));
  await browser.close();
})();
