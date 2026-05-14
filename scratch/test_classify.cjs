const fs = require('fs');
const data = JSON.parse(fs.readFileSync('custom-data.json', 'utf8'));
const tray = data.duschenwanne.trays.find(t => t.artNr === '1313 474.100.810');

const isMixer = false;
function classifyAccessory(obj) {
    if (!obj) return 'common';
    if (obj.overrideMontageart && obj.overrideMontageart !== 'auto') return obj.overrideMontageart;
    const label = (obj.label || obj.name || '').toLowerCase();
    const artNr = (obj.artNr || '').replace(/\s/g, '');

    if (artNr === '1445782.000.000' || artNr === '1441782.000.000') return 'wannenträger';
    if (artNr === '1431191.000.000' || artNr === '1431190.000.000' || artNr === '1435435.000.000') return 'montagerahmen';
    if (label.includes('schallschutzset') || label.includes('schallschutz')) return isMixer ? 'unterputz' : 'montagerahmen';

    if (isMixer) {
        // ...
    } else {
        if (label.includes('träger') || label.includes('wannenträger') || label.includes('montageschaum')) return 'wannenträger';
        if (label.includes('rahmen') || label.includes('füsse') || label.includes('fussset')) return 'montagerahmen';
        if (label.includes('schallschutzset') || label.includes('schallschutz')) return 'montagerahmen';
        if (label.includes('stelzfüss') || label.includes('stelzfuss')) return 'stelzfüsse';
    }
    return 'common';
}

tray.mountingMaterials.forEach(m => {
   if(m.id === 'mat_carrier') {
       const opt = m.options[0];
       console.log('mat_carrier classify:', classifyAccessory(opt));
   }
});
