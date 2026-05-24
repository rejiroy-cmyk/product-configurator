const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: "new" });
  const page = await browser.newPage();
  
  // Expose a function to capture stats
  await page.exposeFunction('logStats', (stats) => {
    console.log('--- STATS ---');
    console.log(JSON.stringify(stats, null, 2));
  });

  page.on('console', async msg => {
    const text = msg.text();
    console.log('LOG:', text);
    if (text === '[object Object]') {
      // It's the table arg. Try to get the arg.
      const args = msg.args();
      if (args.length > 0) {
        try {
          const val = await args[0].jsonValue();
          console.log('OBJECT:', JSON.stringify(val, null, 2));
        } catch(e) {}
      }
    }
  });

  await page.goto('http://localhost:5176', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 1000));
  await browser.close();
})();
