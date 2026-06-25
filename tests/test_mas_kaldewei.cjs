const d = require('../custom-data.json');
global.window = {};
global.document = {
    createElement: () => ({ classList: { add:()=>{} }, appendChild:()=>{}, setAttribute:()=>{} }),
    getElementById: (id) => ({ style: {}, classList: { add:()=>{} }, innerHTML: '', appendChild:()=>{} })
};
const fs = require('fs');
let code = fs.readFileSync('modules/factories.js', 'utf8');
code = code.replace(/export function/g, 'function');
code = code.replace(/document.getElementById\('configSidebar'\)/g, '{}');
eval(code);

const app = createDuschenwanneApp('Duschenwanne', '', '');
app.trays = d.duschenwanne.trays;

const kaldeweiTrays = app.trays.filter(t => t.manufacturer === 'Kaldewei' && t.mountingMaterials && t.mountingMaterials.some(m => m.name === 'Montagerahmen System' && m.options.some(o => o.artNr === '1435 435.000.000' || o.artNr === '1435435.000.000')));

const largeTrays = kaldeweiTrays.filter(t => {
    if (!t.size || !t.size.includes('x')) return false;
    const maxSide = Math.max(...t.size.toLowerCase().split('x').map(p => parseFloat(p)).filter(n => !isNaN(n)));
    return maxSide > 90;
});
const smallTrays = kaldeweiTrays.filter(t => {
    if (!t.size || !t.size.includes('x')) return false;
    const maxSide = Math.max(...t.size.toLowerCase().split('x').map(p => parseFloat(p)).filter(n => !isNaN(n)));
    return maxSide <= 90;
});

function testTray(tray, name) {
    if (!tray) {
        console.log(`No ${name} tray found.`);
        return;
    }
    app.selectedTray = tray;
    app.selectedTray.selections = {};
    const frame = tray.mountingMaterials.find(m => m.name === 'Montagerahmen System');
    app.currentMontageart = 'montagerahmen';
    const masOption = frame.options.find(o => o.artNr === '1435 435.000.000' || o.artNr === '1435435.000.000');
    app.selectedTray.selections[frame.id] = masOption.artNr;
    app.updateBOM();
    const bom = app.selectedTray.selections.bom || [];
    const hasMas = bom.some(b => b.artNr === '1435 435.000.000' || b.artNr === '1435435.000.000');
    console.log(`Kaldewei ${name} (${tray.size}): MAS included? ${hasMas}`);
}

testTray(largeTrays[0], '> 90cm');
testTray(smallTrays[0], '<= 90cm');

