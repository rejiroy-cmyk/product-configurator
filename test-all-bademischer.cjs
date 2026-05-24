const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  await page.goto('http://localhost:5176', { waitUntil: 'networkidle0' });
  
  const result = await page.evaluate(async () => {
    window.openConfigurator('bademischer', 'Test');
    await new Promise(r => setTimeout(r, 1000));
    
    const trays = window.productApps['bademischer'].trays;
    let failingTrays = [];
    
    for (let t of trays) {
      const hasGleit = t.mountingMaterials && t.mountingMaterials.some(m => (m.name||'').toLowerCase().includes('gleitstange'));
      const hasHalter = t.mountingMaterials && t.mountingMaterials.some(m => (m.name||'').toLowerCase().includes('brausehalter'));
      
      if (hasGleit && hasHalter) {
        document.querySelector('[data-tid=\"' + t.id + '\"]').click();
        await new Promise(r => setTimeout(r, 100));
        
        const selects = Array.from(document.querySelectorAll('.mischer-acc-select'));
        let gleitSelect = null;
        selects.forEach(s => {
          if(s.options[1] && s.options[1].textContent.toLowerCase().includes('gleitstange')) {
            gleitSelect = s;
          }
        });
        
        if(gleitSelect) {
          gleitSelect.selectedIndex = 1;
          gleitSelect.dispatchEvent(new Event('change'));
          
          let bom = Array.from(document.querySelectorAll('.bom-desc')).map(e => e.textContent);
          if (bom.some(b => b.toLowerCase().includes('brausehalter'))) {
            failingTrays.push(t.label);
          }
        }
      }
    }
    
    return {
      failed: failingTrays.length,
      failingTrays: failingTrays
    };
  });
  
  console.log('FAILED TRAYS:', result);
  await browser.close();
})();
