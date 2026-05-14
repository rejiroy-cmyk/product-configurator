const fs = require('fs');
const path = require('path');

const DATA_PATH = './custom-data.json';
const data = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));

const pool = data.zubehoer_pool.trays;

const SHOWER_RULES = {
    "alterna": {
        "ecoplan": { deckel: "1422 118.501.000", siphon: "1422 117.000.000" },
        "loa": { deckel: "1311 698.501.000", siphon: "1311 701.000.000" }
    },
    "schmidlin": {
        "duschwanne": { deckel: "1422 118.501.000", siphon: "1422 117.000.000" },
        "viva": { deckel: "1311 698.501.000", siphon: "1311 701.000.000" },
        "floor": { deckel: "1311 698.501.000", siphon: "1311 701.000.000" }
    },
    "kaldewei": {
        "superplan zero": { siphon: "1313 271.501.000" },
        "cayonoplan": { siphon: "1313 271.501.000" },
        "calima": { deckel: "1313 284.100.185", siphon: "1313 277.501.000" },
        "superplan": { siphon: "1313 271.501.000" },
        "duschplan": { deckel: "1422 118.501.000", siphon: "1422 117.000.000" },
        "sanidusch": { siphon: "1422 117.000.000" },
        "superplan classic": { siphon: "1313 271.501.000" },
        "conoflat": { deckel: "1313 282.100.000", siphon: "1313 274.000.000" }
    },
    "laufen": {
        "pro s superflach": { siphon: "1425 561.000.000" },
        "pro superflach": { siphon: "1171 405.000.000" }
    }
};

function normalizeSize(s) {
    if (!s) return null;
    const matches = s.match(/(\d+(?:[.,]\d+)?)\s*[xX\/\*\-]\s*(\d+(?:[.,]\d+)?)/);
    if (!matches) return null;
    let w = parseFloat(matches[1].replace(',', '.'));
    let h = parseFloat(matches[2].replace(',', '.'));
    if (w > 300) w /= 10;
    if (h > 300) h /= 10;
    return [w, h];
}

function findMatches(cat, trayMfr, trayLabel, sizeParts) {
    const lblLower = trayLabel.toLowerCase();
    
    return pool.filter(item => {
        const lbl = item.label.toLowerCase();
        const artNrClean = (item.artNr || '').replace(/[^a-zA-Z0-9]/g, '');

        if (cat.artNr) {
            const targetArtNrClean = cat.artNr.replace(/[^a-zA-Z0-9]/g, '');
            return artNrClean === targetArtNrClean;
        }

        const hasKeyword = (cat.keywords || []).some(k => lbl.includes(k));
        if (!hasKeyword) return (lbl.includes('omnia 120 x 100') ? console.log('Failed at line:', new Error().stack.split('\n')[1]) || false : false);

        if (cat.name === 'Zargen-Wannendichtband') {
            if (lbl.includes('montageset')) return (lbl.includes('omnia 120 x 100') ? console.log('Failed at line:', new Error().stack.split('\n')[1]) || false : false);
        }

        if (cat.name === 'Montagerahmen') {
            if (lbl.includes('klosett') || lbl.includes('sitz') || lbl.includes('wannenfüsse') || item.artNr === '1435 191.000.000') return (lbl.includes('omnia 120 x 100') ? console.log('Failed at line:', new Error().stack.split('\n')[1]) || false : false);
            const isOmnia = lbl.includes('omnia');
            if (trayMfr === 'schmidlin' && !isOmnia) return (lbl.includes('omnia 120 x 100') ? console.log('Failed at line:', new Error().stack.split('\n')[1]) || false : false);
            if (trayMfr === 'kaldewei' && !lbl.includes('kaldewei')) return (lbl.includes('omnia 120 x 100') ? console.log('Failed at line:', new Error().stack.split('\n')[1]) || false : false);
            if (trayMfr === 'laufen' && !lbl.includes('ineo')) return (lbl.includes('omnia 120 x 100') ? console.log('Failed at line:', new Error().stack.split('\n')[1]) || false : false);
        }

        if (cat.name === 'Wannenträger') {
            const pMfr = (item.manufacturer || '').toLowerCase();
            if (pMfr && trayMfr && pMfr !== trayMfr) return (lbl.includes('omnia 120 x 100') ? console.log('Failed at line:', new Error().stack.split('\n')[1]) || false : false);
            if (!lbl.includes(trayMfr) && (!pMfr || pMfr === 'andere')) return (lbl.includes('omnia 120 x 100') ? console.log('Failed at line:', new Error().stack.split('\n')[1]) || false : false);
            if (lbl.includes('montageschaum') || lbl.includes('schallschutzset')) return (lbl.includes('omnia 120 x 100') ? console.log('Failed at line:', new Error().stack.split('\n')[1]) || false : false);
            if (lbl.includes('nicht in zusammenhang mit wannenträger')) return (lbl.includes('omnia 120 x 100') ? console.log('Failed at line:', new Error().stack.split('\n')[1]) || false : false);
            if (lbl.includes('badewannenträger')) return (lbl.includes('omnia 120 x 100') ? console.log('Failed at line:', new Error().stack.split('\n')[1]) || false : false);
        }

        // Size Match for Frames/Carriers/Sets
        if ((cat.name === 'Montagerahmen' || cat.name === 'Wannenträger' || cat.name === 'Montageset') && sizeParts) {
            const smMatch = lbl.match(/(\d+)\s*[xX]\s*(\d+)/);
            if (smMatch) {
                let ew = parseInt(smMatch[1]), eh = parseInt(smMatch[2]);
                if (lbl.includes('mm') || ew > 300) { ew /= 10; eh /= 10; }
                const tw = sizeParts[0], th = sizeParts[1];
                const match = (Math.abs(tw-ew)<=2 && Math.abs(th-eh)<=2) || (Math.abs(th-ew)<=2 && Math.abs(tw-eh)<=2);
                if (!match) return (lbl.includes('omnia 120 x 100') ? console.log('Failed at line:', new Error().stack.split('\n')[1]) || false : false);
            }
        }

        return true;
    });
}

function patchTray(tray) {
    const manufacturer = (tray.manufacturer || '').toLowerCase().trim();
    const labelLower = (tray.label || '').toLowerCase().trim();
    const sizeParts = normalizeSize(tray.size);
    const isSwissLine = labelLower.includes('swiss line');
    
    tray.mountingMaterials = [];

    // --- STEP 1: Always Inject Zargen-Wannendichtband ---
    const dichtbandMatches = findMatches({ name: 'Zargen-Wannendichtband', keywords: ['zargen', 'dichtband'] }, manufacturer, tray.label, sizeParts);
    if (dichtbandMatches.length > 0) {
        tray.mountingMaterials.push({
            id: 'mat_db',
            name: 'Zargen-Wannendichtband',
            options: dichtbandMatches.map(m => ({ artNr: m.artNr, label: m.label, type: 'Zubehör', imgUrl: m.imgUrl || '', menge: 1 }))
        });
    }

    // --- STEP 2: Handle Swiss Line Sets ---
    let hasSwissSet = false;
    if (isSwissLine) {
        const setMatches = findMatches({ name: 'Montageset', keywords: ['montageset', 'swiss line'] }, manufacturer, tray.label, sizeParts);
        if (setMatches.length > 0) {
            tray.mountingMaterials.push({
                id: 'mat_swiss_set',
                name: 'Montageset (Swiss Line)',
                options: setMatches.map(m => ({ artNr: m.artNr, label: m.label, type: 'Zubehör', imgUrl: m.imgUrl || '', menge: 1 }))
            });
            hasSwissSet = true;
            // According to user, the set includes everything.
            // We skip Siphons, Frames, etc.
        }
    }

    if (!hasSwissSet) {
        // --- STEP 3: Regular Accessory Injection ---
        let modelRule = null;
        if (SHOWER_RULES[manufacturer]) {
            for (const series in SHOWER_RULES[manufacturer]) {
                if (labelLower.includes(series)) {
                    modelRule = SHOWER_RULES[manufacturer][series];
                    break;
                }
            }
        }

        const categories = [
            { name: 'Ablaufdeckel', keywords: ['ablaufdeckel', 'deckel'] },
            { name: 'Ablaufgarnitur', keywords: ['ablaufgarnitur', 'siphon', 'garnitur'] },
            { name: 'Wannenträger', keywords: ['wannenträger'], group: 'carrier', condition: manufacturer !== 'laufen' },
            { name: 'Montagerahmen', keywords: ['montagerahmen', 'einbaurahmen', 'omnia', 'ineo', 'fr 5300'], group: 'frame' }
        ];

        categories.forEach(cat => {
            if (cat.condition === false) return;
            let matches = [];
            if (cat.name === 'Ablaufdeckel' && modelRule?.deckel) {
                matches = pool.filter(p => (p.artNr || '').replace(/[^0-9]/g, '').includes(modelRule.deckel.replace(/[^0-9]/g, '')));
            } else if (cat.name === 'Ablaufgarnitur' && modelRule?.siphon) {
                matches = pool.filter(p => (p.artNr || '').replace(/[^0-9]/g, '').includes(modelRule.siphon.replace(/[^0-9]/g, '')));
            } else {
                matches = findMatches(cat, manufacturer, tray.label, sizeParts);
            }

            if (matches.length > 0) {
                tray.mountingMaterials.push({
                    id: 'mat_' + Math.random().toString(36).substr(2, 5),
                    name: cat.name,
                    options: matches.map(m => ({ artNr: m.artNr, label: m.label, type: 'Option', imgUrl: m.imgUrl || '', menge: 1 }))
                });
                tray.mountingMaterials[tray.mountingMaterials.length - 1].options[0].type = 'Zubehör';

                // Dependencies
                if (cat.name === 'Montagerahmen') {
                    const feet = pool.find(p => p.artNr === '1435 191.000.000');
                    if (feet) tray.mountingMaterials.push({ id: 'mat_feet', name: 'Wannenfüsse', options: [{ artNr: feet.artNr, label: feet.label, type: 'Zubehör', imgUrl: feet.imgUrl || '', menge: 1 }] });
                }
                if (cat.name === 'Wannenträger') {
                    const foam = pool.find(p => p.label.toLowerCase().includes('montageschaum'));
                    if (foam) tray.mountingMaterials.push({ id: 'mat_foam', name: 'Montageschaum', options: [{ artNr: foam.artNr, label: foam.label, type: 'Zubehör', imgUrl: foam.imgUrl || '', menge: 1 }] });
                    const noise = pool.find(p => p.artNr === '1445 782.000.000');
                    if (noise) tray.mountingMaterials.push({ id: 'mat_noise', name: 'Schallschutzset (Träger)', options: [{ artNr: noise.artNr, label: noise.label, type: 'Zubehör', imgUrl: noise.imgUrl || '', menge: 1 }] });
                }
            }
        });
    }
}

console.log('Patching Duschenwanne...');
data.duschenwanne.trays.forEach(patchTray);

fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2));
console.log('Successfully patched ' + data.duschenwanne.trays.length + ' shower trays.');
