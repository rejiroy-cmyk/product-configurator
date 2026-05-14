const fs = require('fs');
const data = JSON.parse(fs.readFileSync('custom-data.json', 'utf8'));
const trays = data.duschenwanne.trays;

const mFilter = 'Kaldewei';
const serieFilter = 'Calima';
const fFilter = 'alle';
const sFilter = '170 x 70';
const lFilter = '';
const wFilter = '';

function extractSerie(t) {
    if (!t.manufacturer || t.manufacturer === 'Andere') return 'Andere';
    let s = t.label.toLowerCase().replace(t.manufacturer.toLowerCase(), '').trim();
    if (s.startsWith('ecoplan')) return 'ecoplan';
    if (s.startsWith('superplan')) return 'Superplan';
    if (s.startsWith('cayono')) return 'Cayono';
    if (s.startsWith('calima')) return 'Calima';
    // Add missing Calima extract!
    return 'Andere';
}

const filtered = trays.filter(t => {
    if (mFilter !== 'all' && mFilter !== 'alle' && t.manufacturer !== mFilter) return false;
    
    if (serieFilter !== 'all' && serieFilter !== 'alle') {
        let s = t.label.toLowerCase().replace(t.manufacturer.toLowerCase(), '').trim();
        // Wait, what DOES extractSerie actually do in factories.js?
        // Let's use includes to be safe since we don't have exact extractSerie.
        if (!t.label.toLowerCase().includes(serieFilter.toLowerCase())) return false;
    }
    
    if (fFilter !== 'all' && fFilter !== 'alle') {
        // skip
    }
    
    if (sFilter !== 'all' && sFilter !== 'alle') {
        if (t.size !== sFilter) return false;
    }
    
    return true;
});

console.log('Filtered count:', filtered.length);
if (filtered.length > 0) {
    console.log('Tray:', filtered[0].label);
}
