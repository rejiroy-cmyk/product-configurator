// DRAFTING THE FIXES

// 1. ZARGEN LOGIC
if (cat.name === 'Zargen-Wannendichtband') {
    const sizeMatch = (tray.size || '').match(/(\d+)\s*x\s*(\d+)/);
    if (sizeMatch) {
        const s1 = parseInt(sizeMatch[1]);
        const s2 = parseInt(sizeMatch[2]);
        const longSide = Math.max(s1, s2);
        const shortSide = Math.min(s1, s2);

        // New logic: add 20cm safety margin
        const reqL = (longSide + shortSide + 20) / 100;
        const reqU = (longSide + (2 * shortSide) + 20) / 100;
        
        let lTape = null, uTape = null;
        let minLDiff = Infinity, minUDiff = Infinity;

        matches.forEach(m => {
            const mMatch = m.label.match(/Länge\s*(\d+(?:[.,]\d+)?)\s*m/i);
            if (mMatch) {
                const len = parseFloat(mMatch[1].replace(',', '.'));
                if (len >= reqL && len - reqL < minLDiff) { minLDiff = len - reqL; lTape = m; }
                if (len >= reqU && len - reqU < minUDiff) { minUDiff = len - reqU; uTape = m; }
            }
        });

        if (lTape || uTape) {
            const options = [];
            if (lTape) options.push({ artNr: lTape.artNr, label: lTape.label, dropdownLabel: '2-seitige Montage (L-Variante)', menge: 1, type: 'Zubehör', imgUrl: lTape.imgUrl });
            if (uTape && uTape.artNr !== (lTape ? lTape.artNr : '')) {
                options.push({ artNr: uTape.artNr, label: uTape.label, dropdownLabel: '3-seitige Montage (U-Variante)', menge: 1, type: 'Option', imgUrl: uTape.imgUrl });
            }
            if (options.length > 0) {
                tray.mountingMaterials.push({ id: 'mat_' + Math.random().toString(36).substr(2, 5), name: cat.name, options });
                return; // SKIP the standard injection at the bottom
            }
        }
    }
}

// 2. CALIMA CARRIERS
// Removed: if (labelLower.includes('calima') && cat.group === 'wannenträger') return;
// Kept: if (labelLower.includes('calima') && cat.group === 'montagerahmen') return;

// 3. WANNENTRÄGER LOGIC
if (cat.name === 'Wannenträger') {
    if (lbl.includes('montageschaum') || lbl.includes('schallschutzset') || lbl.includes('nicht in zusammenhang mit wannenträger') || lbl.includes('badewannenträger')) return false;

    // Brand Block Fix:
    // If the carrier specifies a manufacturer, and it's not the tray's manufacturer,
    // we MUST check if the carrier's label explicitly mentions the tray's manufacturer OR the tray's specific series.
    const pMfr = (item.manufacturer || '').toLowerCase();
    if (pMfr && manufacturer && pMfr !== manufacturer) {
        // e.g. Tray: Kaldewei Superplan. Carrier: Alterna ecoplan... zu Kaldewei Superplan
        const seriesRaw = tray.label.toLowerCase()
            .replace(manufacturer, '').replace('duschwanne', '').replace('duschenwanne', '').replace('duschfläche', '').split(',')[0].trim();
        const series = seriesRaw.replace(/[^a-z]/g, '').trim();
        
        const mentionsTrayBrand = lbl.includes(manufacturer);
        const mentionsTraySeries = series.length >= 3 && lbl.includes(series);
        
        if (!mentionsTrayBrand && !mentionsTraySeries) {
            return false;
        }
    }
}
