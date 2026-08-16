// Verifies the Alterna primo Dienstleistungspaket dropdown (createGlassApp):
// primo freistehende Seitenwände render a package dropdown (1549 180 default, 1549 181 option)
// and carry NO individual Massaufnahme/Anfahrt/Montage rows.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));

let capturedHTML = '';
global.alert = () => {};
global.window = { copyTextToClipboard:()=>Promise.resolve(), copyBOMToClipboard:()=>{}, getComputedStyle:()=>({display:'block'}), __PRICES__:{} };
const bom = { style:{}, querySelectorAll:()=>[], querySelector:()=>null,
  set innerHTML(v){ capturedHTML=v; }, get innerHTML(){ return capturedHTML; } };
const cnt = { style:{}, textContent:'' };
global.document = {
  createElement:()=>({style:{}}), body:{appendChild(){},removeChild(){}},
  getElementById:(id)=> id==='bomTableBody'?bom : (id==='bomCountCounter'||id==='bomCount')?cnt : (id==='backToCatalogBtn'?{style:{}}:null),
  querySelector:()=>null
};
Object.defineProperty(global,'navigator',{value:{clipboard:{}},writable:true,configurable:true});

const { createGlassApp } = await import('../modules/factories.js');
// INTERNED on disk — expand, or every tray's `services` is a bare key string and the
// Servicepaket rules below test nothing (see modules/dataHydrate.js).
const { expandData } = await import('../modules/dataHydrate.js');
const data = expandData(JSON.parse(fs.readFileSync(path.join(__dirname,'..','custom-data.json'),'utf8')));
const app = createGlassApp('DUSCHTRENNWAND','t','x.png');
app.trays = data.duschtrennwand.trays;

let pass = true;
const check = (n,p)=>{ console.log((p?'✅ [PASS]':'❌ [FAIL]')+' '+n); if(!p) pass=false; };

const primo = data.duschtrennwand.trays.find(t=>t.artNr==='1541 604.597.140');
check('primo package product 1541 604.597.140 exists', !!primo);
if (!primo) { console.log('\nFAIL'); process.exit(1); }
primo.selections = {};
app.selectedTray = primo;

app.updateBOM();
const h = capturedHTML;
check('package dropdown rendered', h.includes('config-select-servicepaket'));
check('default option = 1549 180 shown in BOM code', /bom-code">1549 180\.000\.000/.test(h));
check('1549 181 offered as dropdown option', h.includes('1549 181.000.000'));
check('no individual Massaufnahme row', !h.toLowerCase().includes('massaufnahme'));
check('no individual Anfahrtspauschale row', !h.toLowerCase().includes('anfahrtspauschale'));

// switch selection to 181 -> BOM code updates
primo.selections.__servicepaket__ = '1549 181.000.000';
app.updateBOM();
check('selecting 5+ tier -> 1549 181 in BOM code', /bom-code">1549 181\.000\.000/.test(capturedHTML));

console.log('\n'+(pass?'PASS':'FAIL'));
process.exit(pass?0:1);
