const fs = require('fs');
const data = JSON.parse(fs.readFileSync('custom-data.json', 'utf8'));

// Search in ALL pool categories (trays, parts, finishes) to find accessories
const fullPool = [
    ...(data['zubehoer_pool'].trays || []),
    ...(data['zubehoer_pool'].parts || []),
    ...(data['zubehoer_pool'].finishes || [])
];

function autoLinkShowerAccessories(tray) {
    tray.mountingMaterials = []; // Wipe completely to let engine rebuild

    const manufacturer = (tray.manufacturer || '').toLowerCase().trim();
    const labelLower = (tray.label || '').toLowerCase().trim();
    const size = (tray.size || '').replace(/\s/g, '').toLowerCase();

    // Robust size parsing: handles "120x80", "120 x 80", "110.5 x 75", and mm conversion
    const normalizeSize = (s) => {
        if (!s) return null;
        const matches = s.match(/(\d+(?:[.,]\d+)?)\s*[xX\/\*\-]\s*(\d+(?:[.,]\d+)?)/);
        if (!matches) return null;
        let w = parseFloat(matches[1].replace(',', '.'));
        let h = parseFloat(matches[2].replace(',', '.'));
        // Auto-convert mm to cm if values are large (e.g. 1200 -> 120)
        if (w > 300) w /= 10;
        if (h > 300) h /= 10;
        return [w, h];
    };
    const sizeParts = normalizeSize(tray.size);
    const isLargeTray = sizeParts ? (Math.max(sizeParts[0], sizeParts[1]) > 90) : false;

    const SHOWER_RULES = {
        "alterna": {
            "ecoplan": { deckel: "1422 118.501.000", siphon: "1422 117.000.000" },
            "loa": { deckel: "1311 698.501.000", siphon: "1311 701.000.000" }
        },
        "schmidlin": {
            "duschwanne": { deckel: "1422 118.501.000", siphon: "1422 117.000.000" },
            "viva": { deckel: "1311 698.100.000", siphon: "1311 701.000.000" },
            "floor": { deckel: "1311 698.100.000", siphon: "1311 701.000.000" }
        },
        "kaldewei": {
            "superplan zero": { siphon: "1313 271.501.000" },
            "cayonoplan": { siphon: "1313 271.501.000" },
            "calima": { deckel: "1313 284.100.185", siphon: "1313 277.501.000" },
            "superplan": { siphon: "1313 271.501.000" },
            "duschplan": { deckel: "1422 118.501.000", siphon: "1422 117.000.000" },
            "sanidusch": { siphon: "1421 111.501.000" },
            "superplan classic": { siphon: "1313 271.501.000" },
            "conoflat": { deckel: "1313 282.100.000", siphon: "1313 274.000.000" }
        },
        "laufen": {
            "pro s superflach": { siphon: "1425 561.000.000" },
            "pro superflach": { siphon: "1171 405.000.000" }
        }
    };

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
        { name: 'Zargen-Wannendichtband', keywords: ['zargen', 'dichtband'] },

        // Group 1: Wannenträger System
        { name: 'Wannenträger', keywords: ['wannenträger'], group: 'wannenträger' },
        { name: 'Montageschaum', keywords: ['montageschaum', 'schaum'], group: 'wannenträger' },
        { name: 'Schallschutzset (Träger)', keywords: [], artNr: '1445 782.000.000', group: 'wannenträger' },

        // Group 2: Montagerahmen System
        { name: 'Montagerahmen', keywords: ['montagerahmen', 'einbaurahmen', 'omnia', 'ineo', 'fr 5300'], group: 'montagerahmen' },
        { name: 'Wannenfüsse', keywords: [], artNr: '1435 191.000.000', group: 'montagerahmen', condition: labelLower.includes('omnia') || labelLower.includes('loa') },
        { name: 'Mittenabstützsystem (Standard)', keywords: [], artNr: '1435 435.000.000', group: 'montagerahmen', condition: (manufacturer === 'kaldewei' && isLargeTray && !labelLower.includes('conoflat')) },
        { name: 'Mittenabstützsystem (Conoflat)', keywords: [], artNr: '1435 433.000.000', group: 'montagerahmen', condition: (manufacturer === 'kaldewei' && isLargeTray && labelLower.includes('conoflat')) },

        // Group 3: Calima Stelzfüsse System
        { name: 'Stelzfüsse-Pack (4 Stk)', keywords: ['stelzfüsse', 'stelzfuss'], group: 'stelzfüsse', condition: labelLower.includes('calima') }
    ];

    categories.forEach(cat => {
        if (tray.mountingMaterials.some(m => m.name === cat.name)) return;

        // Technical Conditions check
        if (cat.condition === false) return;
        if (cat.name === 'Ablaufdeckel' && modelRule && !modelRule.deckel) return;

        // Calima Logic: If tray is Calima, skip Groups 1 and 2
        if (labelLower.includes('calima') && (cat.group === 'wannenträger' || cat.group === 'montagerahmen')) return;

        // --- DEPENDENCY CHECK ---
        // Foam and Noise Set (1445 782) ONLY if Wannenträger is present
        if (cat.name === 'Montageschaum' || (cat.artNr === '1445 782.000.000' && cat.group === 'wannenträger')) {
            const hasCarrier = tray.mountingMaterials.some(m => m.name === 'Wannenträger');
            if (!hasCarrier) return;
        }

        let matches = fullPool.filter(item => {
            const lbl = item.label.toLowerCase();
            // Deep clean ArtNr for comparison (Remove all non-alphanumeric)
            const artNrClean = (item.artNr || '').replace(/[^a-zA-Z0-9]/g, '');
            
            // 1. Direct Article Number Match (Highest Priority)
            if (cat.artNr) {
                const targetArtNrClean = cat.artNr.replace(/[^a-zA-Z0-9]/g, '');
                return artNrClean === targetArtNrClean;
            }

            // 1b. HARD PAIRING OVERRIDES (User Request)
            if (cat.name === 'Wannenträger') {
                const tArt = (tray.artNr || '').replace(/[^0-9]/g, '');
                const iArt = (item.artNr || '').replace(/[^0-9]/g, '');
                // Pair 1: 1313 311 -> 1445 727
                if (tArt === '1313311100000' && iArt === '1445727000000') return true;
                // Pair 2: 1313 307 -> 1445 726
                if (tArt === '1313307100000' && iArt === '1445726000000') return true;
                // FORCE MATCH for 547 and 545 to OMNIA Frames (Article numbers for frames search)
                if ((tArt === '1111547100000' || tArt === '1111545100000') && iArt.startsWith('1435')) {
                    if (lbl.includes('omnia') || lbl.includes('montagerahmen')) return true;
                }
            }

            if (cat.name === 'Montagerahmen' || cat.group === 'montagerahmen') {
                // Brand Lockdown (Hard Isolation)
                const isOmnia = lbl.includes('omnia');
                const isLoa = labelLower.includes('loa');
                const isIneo = lbl.includes('ineo');
                const isFR = lbl.includes('fr 5300');
                const isUniversal = isOmnia || isIneo || isFR;

                if (manufacturer === 'kaldewei' && !lbl.includes('kaldewei')) return false;
                if (manufacturer === 'schmidlin' && !isOmnia) return false;
                if (manufacturer === 'laufen' && !lbl.includes('laufen')) return false;
                
                // Specific Exception: Loa can use Omnia
                if (isLoa && isOmnia) {
                    // EXPLICIT HANDSHAKE: Loa and Omnia are always compatible
                    return true; 
                } else if (manufacturer === 'alterna' && isOmnia) {
                    // General Alterna/Omnia handshake
                    return true;
                } else if (manufacturer === 'alterna' && !lbl.includes('alterna')) {
                    return false; 
                }
                
                if (manufacturer === 'laufen' && !isIneo && !lbl.includes('pro s')) return false;

                // Size Fitting logic
                if (sizeParts) {
                    const tw = sizeParts[0];
                    const th = sizeParts[1];
                    const trayLong = Math.max(tw, th);
                    const trayShort = Math.min(tw, th);

                    if (isIneo || lbl.includes('laufen pro s')) {
                        const m1 = lbl.match(/(\d+)\s*[xX]\s*(\d+)\s*-\s*(\d+)\s*mm/);
                        const m2 = lbl.match(/breite\s*(\d+)\s*mm\s*länge\s*\(ausziehbar\)\s*(\d+)\s*-\s*(\d+)\s*mm/);
                        const ineoMatch = m1 || m2;
                        if (ineoMatch) {
                            const b = parseInt(ineoMatch[1]) / 10;
                            const minL = parseInt(ineoMatch[2]) / 10;
                            const maxL = parseInt(ineoMatch[3]) / 10;
                            if ((Math.abs(tw - b) < 1 && th >= minL - 1 && th <= maxL + 1) || 
                                (Math.abs(th - b) < 1 && tw >= minL - 1 && tw <= maxL + 1)) return true;
                            return false;
                        }
                    }

                    const frameSizeMatch = lbl.match(/bis\s*(\d+(?:[.,]\d+)?)\s*[xX\/\*\-]\s*(\d+(?:[.,]\d+)?)/);
                    const exactSizeMatch = !lbl.includes('bis') ? lbl.match(/(\d+(?:[.,]\d+)?)\s*[xX\/\*\-]\s*(\d+(?:[.,]\d+)?)/) : null;

                    if (frameSizeMatch) {
                        const fw = parseFloat(frameSizeMatch[1].replace(',', '.'));
                        const fh = parseFloat(frameSizeMatch[2].replace(',', '.'));
                        if (trayLong > Math.max(fw, fh) + 0.5 || trayShort > Math.min(fw, fh) + 0.5) return false;
                    } else if (exactSizeMatch) {
                        let ew = parseFloat(exactSizeMatch[1].replace(',', '.'));
                        let eh = parseFloat(exactSizeMatch[2].replace(',', '.'));
                        if (lbl.includes('mm') || ew > 300) { ew /= 10; eh /= 10; }
                        
                        const matchNormal = Math.abs(tw - ew) <= 2.0 && Math.abs(th - eh) <= 2.0;
                        const matchRotated = Math.abs(tw - eh) <= 2.0 && Math.abs(th - ew) <= 2.0;
                        if (!matchNormal && !matchRotated) return false;
                    }
                }
            }

            // 2. Specific Siphon / Deckel rules (Highest Priority Fallback)
            if (cat.name === 'Ablaufdeckel' && modelRule && modelRule.deckel) {
                return artNrClean === modelRule.deckel.replace(/[^a-zA-Z0-9]/g, '');
            }
            if (cat.name === 'Ablaufgarnitur' && modelRule && modelRule.siphon) {
                return artNrClean === modelRule.siphon.replace(/[^a-zA-Z0-9]/g, '');
            }

            // 3. General Keyword Fallback
            return cat.keywords && cat.keywords.some(kw => lbl.includes(kw));
        });

        // ==========================================
        //  DYNAMIC WANNENBAND (L vs U Variante)
        // ==========================================
        if (cat.name === 'Zargen-Wannendichtband') {
            const hasL = matches.find(m => (m.label || '').includes('2,5'));
            const hasU = matches.find(m => (m.label || '').includes('3,4'));
            
            const specificOptions = [];
            if (sizeParts) {
                const tw = sizeParts[0];
                const th = sizeParts[1];
                const perimeterU = (tw * 2) + th; // Example
                const perimeterL = tw + th;
                
                if (hasL && perimeterL <= 250) {
                    specificOptions.push({
                        ...hasL,
                        dropdownLabel: '2-seitige Montage (L-Variante)',
                        type: 'Zubehör'
                    });
                }
                if (hasU && perimeterU <= 340) {
                    specificOptions.push({
                        ...hasU,
                        dropdownLabel: '3-seitige Montage (U-Variante)',
                        type: specificOptions.length === 0 ? 'Zubehör' : 'Option'
                    });
                }
            }
            if (specificOptions.length > 0) {
                tray.mountingMaterials.push({
                    id: 'mat_' + Math.random().toString(36).substr(2, 5),
                    name: cat.name,
                    options: specificOptions.map(opt => ({
                        artNr: opt.artNr,
                        label: opt.label,
                        dropdownLabel: opt.dropdownLabel,
                        menge: 1,
                        type: opt.type,
                        imgUrl: opt.imgUrl || `https://profishop.sanitastroesch.ch/multimedia/Web/PG1/0${opt.artNr.replace(/\\s+/g, '').replace(/\\./g, '_')}.png`
                    }))
                });
                return;
            }
        }

        if (matches.length > 0) {
            tray.mountingMaterials.push({
                id: 'mat_' + Math.random().toString(36).substr(2, 5),
                name: cat.name,
                options: matches.map((item, idx) => ({
                    artNr: item.artNr,
                    label: item.label,
                    type: idx === 0 ? cat.group || 'Zubehör' : 'Option',
                    menge: 1,
                    imgUrl: item.imgUrl || `https://profishop.sanitastroesch.ch/multimedia/Web/PG1/0${item.artNr.replace(/\\s+/g, '').replace(/\\./g, '_')}.png`
                }))
            });
        }
    });
}

data.duschenwanne.trays.forEach(t => autoLinkShowerAccessories(t));

const tray = data.duschenwanne.trays.find(t => t.artNr.includes('1317 154.100.000'));
console.log('1317 154.100.000 materials:', tray.mountingMaterials.map(m => m.name));

fs.writeFileSync('custom-data-patched.json', JSON.stringify(data, null, 4));
console.log('Saved to custom-data-patched.json');
