const fs = require('fs');
const data = JSON.parse(fs.readFileSync('./custom-data.json', 'utf8'));

const pool = [
    ...(data.zubehoer_pool?.trays || []),
    ...(data.zubehoer_pool?.parts || []),
    ...(data.zubehoer_pool?.finishes || [])
];
const allHb = pool.filter(p => p.label && p.label.toLowerCase().includes('handbrause'));

// Map: brand keyword → pool hand showers
const ALTERNA_ARTNR = '6541 326.501.000';
const BRAND_KEYS = ['hansgrohe', 'kwc', 'laufen', 'axor', 'grohe', 'similor', 'arwa', 'keuco', 'geberit'];

function getBrandHandbrausen(manufacturer) {
    if (!manufacturer) return null;
    const m = manufacturer.toLowerCase();
    // Try strict brand match
    let matched = allHb.filter(p => p.label.toLowerCase().includes(m));
    if (matched.length > 0) return matched;
    return null;
}

function buildHandbrauseOptions(brandHandbrausen) {
    // First entry = standard (Zubehör), rest = Option
    const opts = brandHandbrausen.map((hb, i) => ({
        artNr: hb.artNr,
        label: hb.label,
        type: i === 0 ? 'Zubehör' : 'Option',
        imgUrl: hb.imgUrl || `https://profishop.sanitastroesch.ch/multimedia/Web/PG1/0${hb.artNr.replace(/\s+/g,'').replace(/\./g,'_')}.png`,
        menge: 1
    }));
    // Add Alterna as last option (alternative, not default)
    opts.push({
        artNr: ALTERNA_ARTNR,
        label: 'Handbrause Alterna easyline, Ø 101 mm, 1-jet, SoftRain',
        type: 'Option',
        imgUrl: 'https://profishop.sanitastroesch.ch/multimedia/Web/PG1/06541326_501_000.png',
        menge: 1
    });
    return opts;
}

let promoted = 0;
let alreadyCorrect = 0;
let noMatch = 0;

['duschenmischer', 'bademischer'].forEach(appId => {
    const trays = data[appId]?.trays || [];
    trays.forEach(tray => {
        const mats = tray.mountingMaterials;
        if (!mats || mats.length === 0) return;
        
        const hbSlot = mats.find(m =>
            m.name && m.name.toLowerCase().includes('handbrause')
        );
        if (!hbSlot) return;
        
        // Check if Alterna is currently first
        const firstOpt = hbSlot.options?.[0];
        if (!firstOpt || firstOpt.artNr !== ALTERNA_ARTNR) {
            alreadyCorrect++;
            return;
        }
        
        // Get brand-specific handbrausen
        const manufacturer = tray.manufacturer || '';
        const brandHb = getBrandHandbrausen(manufacturer);
        
        if (!brandHb) {
            noMatch++;
            return;
        }
        
        hbSlot.options = buildHandbrauseOptions(brandHb);
        promoted++;
    });
});

fs.writeFileSync('./custom-data.json', JSON.stringify(data, null, 2));
console.log(`✅ Promoted brand-specific Handbrause to default: ${promoted} mixers`);
console.log(`ℹ️  Already had brand-specific default: ${alreadyCorrect}`);
console.log(`⚠️  No brand match found (Alterna kept): ${noMatch}`);
