// Real-DOM render check for the shared priceBOM() pass (jsdom).
import { JSDOM } from 'jsdom';

const dom = new JSDOM(`<!DOCTYPE html><html><body>
  <table class="bom-table"><thead><tr>
    <th>Vorschau</th><th>Art. Nr.</th><th>Beschreibung</th><th>Menge</th><th>Preis</th>
  </tr></thead><tbody id="bomTableBody"></tbody></table>
  <span id="bomCount"></span><div id="configSidebar"></div>
</body></html>`);
global.window = dom.window;
global.document = dom.window.document;
Object.defineProperty(global, 'navigator', { value: dom.window.navigator, configurable: true });
window.productApps = {};
window.copyTextToClipboard = () => Promise.resolve();
window.copyBOMToClipboard = () => {};
window.__PRICES__ = { '6417 222.501.000': 226, '6521 108.501.000': 25, '6542 317.501.000': 40 };

const { createDuschenmischerApp } = await import('../modules/factories.js');
const app = createDuschenmischerApp('Duschenmischer', '', '', {});
app.selectedTray = {
    id: 't1', artNr: '6417 222.501.000', label: 'Duschenmischer Hansgrohe Vivenis', imgUrl: '',
    mountingMaterials: [
        { name: 'Abstellverschraubung', options: [{ artNr: '6521 108.501.000', label: 'Abstellverschraubung ½"', menge: 2 }] },
        { name: 'Brauseschlauch', options: [{ artNr: '6542 317.501.000', label: 'Brauseschlauch 1600 mm', menge: 1 }] },
        { name: 'Handbrause', options: [{ artNr: '6541 999.501.000', label: 'Handbrause (not yet scraped)', menge: 1 }] },
    ],
};
app.mischerOptionsState = { 0: 0, 1: 0, 2: 0 };
app.updateBOM();

const html = document.getElementById('bomTableBody').innerHTML;
const checks = [
    ['mixer 226.00', html.includes('226.00')],
    ['Abstellverschr. 25.00', html.includes('25.00')],
    ['Brauseschlauch 40.00', html.includes('40.00')],
    ['unpriced → Preis auf Anfrage', html.includes('Preis auf Anfrage')],
    ['grand total row', html.includes('Gesamtbetrag exkl. MwSt')],
    ['total = CHF 316.00 (226 + 25×2 + 40)', html.includes('CHF 316.00')],
    ['NA footnote', html.includes('zzgl. Positionen')],
];
let ok = 0;
for (const [n, p] of checks) { console.log((p ? '✅' : '❌') + ' ' + n); if (p) ok++; }
console.log(`\n${ok}/${checks.length} passed`);
process.exit(ok === checks.length ? 0 : 1);
