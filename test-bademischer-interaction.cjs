const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: "new" });
  const page = await browser.newPage();
  
  await page.goto('http://localhost:5176', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 1000));
  
  const result = await page.evaluate(async () => {
    try {
      window.openConfigurator("bademischer", "Test");
      await new Promise(r => setTimeout(r, 500));
      
      const trays = window.productApps["bademischer"].trays;
      const firstTray = trays[0];
      
      // Select the first tray
      document.querySelector('.result-item-btn').click();
      await new Promise(r => setTimeout(r, 500));

      const labels = Array.from(document.querySelectorAll('.dropdown-group label')).map(el => el.textContent);
      
      // Select Gleitstange
      const selects = Array.from(document.querySelectorAll('.dropdown-group select'));
      let gleitstangeSelect = null;
      selects.forEach(sel => {
        if (sel.options[1] && sel.options[1].textContent.includes('Gleitstange')) {
          gleitstangeSelect = sel;
        }
      });
      
      if (gleitstangeSelect) {
        gleitstangeSelect.selectedIndex = 1; // select the gleitstange
        gleitstangeSelect.dispatchEvent(new Event('change'));
      }
      
      await new Promise(r => setTimeout(r, 500));
      
      const bomItems = Array.from(document.querySelectorAll('.bom-desc')).map(el => el.textContent);
      return { labels, bomItems };
    } catch(e) {
      return { error: e.message };
    }
  });

  console.log('BADEMISCHER TEST:', result);

  await browser.close();
})();
