import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto('http://localhost:5175');
  await page.waitForSelector('.category-card');
  
  await page.evaluate(() => {
    const cards = document.querySelectorAll('.category-card h2');
    for (let c of cards) {
      if (c.textContent.includes('Waschplatz')) {
        c.closest('.category-card').click();
      }
    }
  });
  await new Promise(r => setTimeout(r, 500));
  
  await page.evaluate(() => {
    const btns = document.querySelectorAll('.subcat-btn');
    for (let b of btns) {
      if (b.textContent.includes('Mix & Match')) {
        b.click();
      }
    }
  });
  await new Promise(r => setTimeout(r, 1000));
  
  const html = await page.evaluate(() => {
    const el = document.getElementById('col_valve');
    return el ? el.innerHTML : 'col_valve not found';
  });
  console.log("HTML OF COL_VALVE:\n" + html);
  
  await browser.close();
})();
