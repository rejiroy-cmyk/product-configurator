const fs = require('fs');
const path = require('path');
const puppeteer = require('/Users/jenistonsellathamby/Desktop/product-configurator/node_modules/puppeteer');
const SP = __dirname;

let html = fs.readFileSync(path.join(SP, 'urinal-katalog.html'), 'utf8');

// drop everything from the masthead through the Regelwerk — the PDF opens on Alessi One
const a = html.indexOf('<header class="masthead">');
const b = html.indexOf('<section class="series">');
if (a === -1 || b === -1) { console.error('markers not found'); process.exit(1); }
html = html.slice(0, a) + html.slice(b);

const PRINT = `
@page { size: A4; margin: 11mm 10mm 12mm; }
html,body{background:#fff!important}
.wrap{max-width:none;padding:0}
.series{margin:0 0 10px;break-inside:auto}
.series-head{position:static;break-after:avoid;break-inside:avoid;margin-bottom:8px;padding-bottom:5px}
.series-head h2{font-size:16px}
.sheet{break-inside:avoid;margin-bottom:7px;box-shadow:none}
.parts{padding:11px 13px;gap:9px}
.ident{padding:12px}
.chips li{font-size:10.5px;padding:2px 6px 2px 2px}
.chip{width:19px;height:22px}
.shot{width:64px;height:76px}
.grp-label{font-size:9px;margin-bottom:4px}
.edesc{font-size:10.5px}
.dropped{font-size:10px}
footer{break-before:page;margin:0;border-top:0;font-size:11px;max-width:none}
footer p{margin:0 0 8px}
a[href]:after{content:none}
`;
html = html.replace('</style>', PRINT + '</style>');
fs.writeFileSync(path.join(SP, 'urinal-katalog-print.html'), html);

(async () => {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  // the PDF is printed on white whatever the machine's theme happens to be
  await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'light' }]);
  await page.setContent(html, { waitUntil: 'networkidle0', timeout: 120000 });
  await page.evaluateHandle('document.fonts.ready');
  await page.pdf({
    path: path.join(SP, 'Urinoir-Montagekatalog.pdf'),
    format: 'A4', printBackground: true, preferCSSPageSize: true,
    displayHeaderFooter: true,
    headerTemplate: '<div></div>',
    footerTemplate: `<div style="width:100%;font:9px 'Helvetica',sans-serif;color:#8A959E;padding:0 10mm;display:flex;justify-content:space-between;">
      <span>Urinoir Montagekatalog · Sanitas Troesch</span>
      <span class="pageNumber"></span></div>`,
  });
  await browser.close();
  const kb = (fs.statSync(path.join(SP,'Urinoir-Montagekatalog.pdf')).size/1024).toFixed(0);
  console.log('PDF written —', kb, 'KB');
})();
