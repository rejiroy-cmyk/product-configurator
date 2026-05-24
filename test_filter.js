const fs = require('fs');
const code = fs.readFileSync('modules/factories.js', 'utf8');

const t = JSON.parse(fs.readFileSync('custom-data.json')).duschenwanne.trays.find(t => t.artNr === '1313 166.100.185');

const classifyAccessory = function (obj) {
    if (!obj) return 'common';

    if (obj.overrideMontageart && obj.overrideMontageart !== 'auto') {
        return obj.overrideMontageart.toLowerCase();
    }

    const catName = (obj.name || '').toLowerCase();
    const catId = (obj.id || '').toLowerCase();
    
    if (catName.includes('träger') || catName.includes('wannenträger') || catId.includes('carrier') || catId.includes('träger')) return 'wannenträger';
    if (catName.includes('rahmen') || catName.includes('montagerahmen') || catId.includes('rahmen') || catId.includes('frame')) return 'montagerahmen';
    if (catName.includes('stelz')) return 'stelzfüsse';

    const label = (obj.label || obj.name || '').toLowerCase();
    const artNr = (obj.artNr || '').replace(/\s/g, '');

    if (artNr === '1445782.000.000' || artNr === '1441782.000.000') {
        return 'wannenträger';
    }

    if (label.includes('stelzfüss') || label.includes('stelzfuss')) {
        return 'stelzfüsse';
    }

    if (label.includes('träger') || label.includes('wannenträger') || label.includes('montageschaum')) {
        return 'wannenträger';
    }

    if (label.includes('rahmen') || label.includes('füsse') || label.includes('fussset') || label.includes('schallschutz')) {
        return 'montagerahmen';
    }
    
    return 'common';
};

let currentMontageart = 'wannenträger';
let hasMatchingAccessory = false;
if (t.mountingMaterials) {
    t.mountingMaterials.forEach(mat => {
        if (mat.options && mat.options.length > 0) {
            console.log('Classifying:', mat.options[0].label.substring(0, 50));
            let cls = classifyAccessory(mat.options[0]);
            console.log('Result:', cls);
            if (cls === currentMontageart) {
                hasMatchingAccessory = true;
            }
        }
    });
}
console.log('Has Matching Accessory:', hasMatchingAccessory);
