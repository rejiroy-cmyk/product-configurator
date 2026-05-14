const fs = require('fs');

let adminCode = fs.readFileSync('modules/admin.js', 'utf8');

// 1. Remove Calima Wannenträger block
adminCode = adminCode.replace(
    "if (labelLower.includes('calima') && (cat.group === 'wannenträger' || cat.group === 'montagerahmen')) return;",
    "if (labelLower.includes('calima') && cat.group === 'montagerahmen') return;"
);

// 2. Fix Wannenträger cross-brand matching
const oldCarrierBlock = `                const pMfr = (item.manufacturer || '').toLowerCase();
                if (manufacturer === 'alterna' && pMfr === 'kaldewei') return false;
                if (pMfr && manufacturer && pMfr !== manufacturer) return false;
                if (!lbl.includes(manufacturer) && (!pMfr || pMfr === 'andere')) return false;`;

const newCarrierBlock = `                const pMfr = (item.manufacturer || '').toLowerCase();
                if (pMfr && manufacturer && pMfr !== manufacturer) {
                    const seriesRaw = tray.label.toLowerCase().replace(manufacturer, '').replace('duschwanne', '').replace('duschenwanne', '').replace('duschfläche', '').split(',')[0].trim();
                    const series = seriesRaw.replace(/[^a-z]/g, '').trim();
                    const mentionsBrand = lbl.includes(manufacturer);
                    const mentionsSeries = series.length >= 3 && lbl.includes(series);
                    if (!mentionsBrand && !mentionsSeries) return false;
                } else if (!lbl.includes(manufacturer) && (!pMfr || pMfr === 'andere')) {
                    return false;
                }`;
adminCode = adminCode.replace(oldCarrierBlock, newCarrierBlock);

// 3. Add Zargen-Wannendichtband Logic
// Since I need to inject it before the Deduplicate step, let's find the Deduplicate comment
const oldDedupe = `        // Deduplicate
        const uniqueArtNrs = new Set();
        matches = matches.filter(m => {
            if (!m.artNr || uniqueArtNrs.has(m.artNr)) return false;`;

const zargenLogic = `        // Zargen Logic (L/U logic + 20cm margin)
        if (cat.name === 'Zargen-Wannendichtband') {
            const sizeMatch = (tray.size || '').match(/(\\d+)\\s*x\\s*(\\d+)/);
            if (sizeMatch) {
                const s1 = parseInt(sizeMatch[1]);
                const s2 = parseInt(sizeMatch[2]);
                const longSide = Math.max(s1, s2);
                const shortSide = Math.min(s1, s2);
                const reqL = (longSide + shortSide + 20) / 100;
                const reqU = (longSide + (2 * shortSide) + 20) / 100;
                
                let lTape = null, uTape = null;
                let minLDiff = Infinity, minUDiff = Infinity;
                matches.forEach(m => {
                    const mMatch = m.label.match(/Länge\\s*(\\d+(?:[.,]\\d+)?)\\s*m/i);
                    if (mMatch) {
                        const len = parseFloat(mMatch[1].replace(',', '.'));
                        if (len >= reqL && len - reqL < minLDiff) { minLDiff = len - reqL; lTape = m; }
                        if (len >= reqU && len - reqU < minUDiff) { minUDiff = len - reqU; uTape = m; }
                    }
                });
                
                if (lTape || uTape) {
                    const options = [];
                    if (lTape) options.push({ artNr: lTape.artNr, label: lTape.label, dropdownLabel: '2-seitige Montage (L-Variante)', menge: 1, type: 'Zubehör', imgUrl: lTape.imgUrl || '' });
                    if (uTape && uTape.artNr !== (lTape ? lTape.artNr : '')) {
                        options.push({ artNr: uTape.artNr, label: uTape.label, dropdownLabel: '3-seitige Montage (U-Variante)', menge: 1, type: 'Option', imgUrl: uTape.imgUrl || '' });
                    }
                    if (options.length > 0) {
                        tray.mountingMaterials.push({ id: 'mat_' + Math.random().toString(36).substr(2, 5), name: cat.name, options });
                        return; // Skip standard injection
                    }
                }
            }
        }

        // Deduplicate
        const uniqueArtNrs = new Set();
        matches = matches.filter(m => {
            if (!m.artNr || uniqueArtNrs.has(m.artNr)) return false;`;

adminCode = adminCode.replace(oldDedupe, zargenLogic);

fs.writeFileSync('modules/admin.js', adminCode);
console.log('admin.js updated successfully!');
