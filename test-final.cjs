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
      let targetIndex = -1;
      for (let i = 0; i < trays.length; i++) {
        if (trays[i].mountingMaterials) {
          if (trays[i].mountingMaterials.some(m => (m.name || '').toLowerCase().includes('gleitstange'))) {
            targetIndex = i;
            break;
          }
        }
      }
      
      if (targetIndex === -1) return { error: "No tray found with Gleitstange" };
      
      const trayId = trays[targetIndex].id;
      document.querySelector(`[data-tid="${trayId}"]`).click();
      await new Promise(r => setTimeout(r, 500));

      // Select Gleitstange (case-insensitive check)
      const selects = Array.from(document.querySelectorAll('.mischer-acc-select'));
      let gleitstangeSelect = null;
      selects.forEach(sel => {
        if (sel.options[1] && sel.options[1].textContent.toLowerCase().includes('gleitstange')) {
          gleitstangeSelect = sel;
        }
      });
      
      let bomBefore = Array.from(document.querySelectorAll('.bom-desc')).map(el => el.textContent);

      if (gleitstangeSelect) {
        gleitstangeSelect.selectedIndex = 1; // select the gleitstange
        gleitstangeSelect.dispatchEvent(new Event('change'));
      }
      
      await new Promise(r => setTimeout(r, 500));
      
      let bomAfter = Array.from(document.querySelectorAll('.bom-desc')).map(el => el.textContent);
      
      return { 
        bomBefore: bomBefore.find(b => b.includes('Brausehalter')) ? 'Has Brausehalter' : 'No Brausehalter',
        bomAfterBrausehalter: bomAfter.find(b => b.includes('Brausehalter')) ? 'Has Brausehalter' : 'No Brausehalter',
        bomAfterSchlauch: bomAfter.find(b => b.includes('1800') || b.includes('180 cm')) ? 'Has 1800 Schlauch' : 'No 1800 Schlauch'
      };
    } catch(e) {
      return { error: e.message };
    }
  });

  console.log('FINAL TEST:', result);
  await browser.close();
})();
