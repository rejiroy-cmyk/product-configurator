const fs = require('fs');

const dataPath = '/Users/jenistonsellathamby/Desktop/product-configurator/custom-data.json';
const libPath = '/Users/jenistonsellathamby/Desktop/product-configurator/scratch/shower_accessory_library.json';

const SERIES_DEPTH_MAP = {
    'superplan': 250,
    'superplan zero': 200,
    'cayonoplan': 320,
    'sanidusch': 1400,
    'ecoplan': 650, 
    'conoflat': 320,
    'loa': 250,
    'omnia': 250,
    'meda': 300,
    'pro s': 280,
    'pro superflach': 330
};

function relink() {
    console.log('--- STARTING PRECISION SHOWER ACCESSORY RE-LINKING (v3) ---');
    if (!fs.existsSync(dataPath) || !fs.existsSync(libPath)) {
        console.error('Data or Library not found!');
        return;
    }

    const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
    const library = JSON.parse(fs.readFileSync(libPath, 'utf8'));

    // Helper to normalize dimensions to mm (like 90 -> 900)
    const norm = (v) => (!v ? null : (v < 400 ? v * 10 : v));

    const extract3D = (label) => {
        if (!label) return {w:null, h:null, d:null};
        const m = label.match(/(\d{2,4})\s*[xX]\s*(\d{2,4})\s*[xX]\s*(\d{2,4})/);
        if (m) return {w: norm(parseInt(m[1])), h: norm(parseInt(m[2])), d: norm(parseInt(m[3]))};
        const m2 = label.match(/(\d{2,4})\s*[xX]\s*(\d{2,4})/);
        if (m2) return {w: norm(parseInt(m2[1])), h: norm(parseInt(m2[2])), d: null};
        return {w:null, h:null, d:null};
    };

    let stats = { relinked: 0, skipped: 0, carrierFound: 0 };

    if (data.duschenwanne && data.duschenwanne.trays) {
        data.duschenwanne.trays.forEach(tray => {
            const labelLower = tray.label.toLowerCase();
            
            // Skip protected series
            if (labelLower.includes('calima') || labelLower.includes('laufen pro')) {
                stats.skipped++;
                return;
            }

            const trayDims = extract3D(tray.label);
            
            // Determine logical depth based on series name if not in label
            let logicalDepth = trayDims.d;
            if (!logicalDepth) {
                for (const [key, val] of Object.entries(SERIES_DEPTH_MAP)) {
                    if (labelLower.includes(key)) {
                        logicalDepth = val;
                        break;
                    }
                }
            }
            if (!logicalDepth) logicalDepth = 250; // Ultimate fallback

            const isEcoplan = labelLower.includes('ecoplan');
            const isLoa = labelLower.includes('loa');

            const materials = [];

            // 1. DRAIN & COVER (Geberit 90mm Standard)
            const drain = library.find(a => a.label.toLowerCase().includes('ablaufgarnitur') && a.label.includes('90') && a.label.includes('Geberit'));
            if (drain) {
                 materials.push({
                    id: 'mat_' + Math.random().toString(36).substr(2, 5),
                    name: 'Ablaufgarnitur',
                    options: [{ artNr: drain.artNr, label: drain.label, type: 'Zubehör', imgUrl: drain.imgUrl, menge: 1 }]
                });
            }
            const cover = library.find(a => a.label.toLowerCase().includes('ablaufdeckel') && a.label.includes('90') && a.label.includes('Geberit'));
            if (cover) {
                 materials.push({
                    id: 'mat_' + Math.random().toString(36).substr(2, 5),
                    name: 'Ablaufdeckel',
                    options: [{ artNr: cover.artNr, label: cover.label, type: 'Zubehör', imgUrl: cover.imgUrl, menge: 1 }]
                });
            }

            // 2. SEALING TAPE (Perimeter Logic)
            // Perimeter for 3-side montage is W + 2H (or long + 2*short). 
            // We use 2W + 2H as a safe upper bound or the user's specific shortest-tape request.
            const perimeterM = (2 * trayDims.w + 2 * trayDims.h + 200) / 1000; // +20cm safety margin
            const tapes = library.filter(a => a.label.toLowerCase().includes('zargen- wannendichtband'))
                .map(a => {
                    const lenMatch = a.label.match(/Länge\s+([\d,.]+)\s*m/);
                    const len = lenMatch ? parseFloat(lenMatch[1].replace(',', '.')) : 0;
                    return { ...a, length: len };
                })
                .filter(a => a.length > 0)
                .sort((a, b) => a.length - b.length);
            
            const bestTapes = tapes.filter(t => t.length >= (perimeterM - 0.5)); // Allow slightly shorter if it fits 3 sides
            if (bestTapes.length > 0) {
                 materials.push({
                    id: 'mat_' + Math.random().toString(36).substr(2, 5),
                    name: 'Zargen-Wannendichtband',
                    options: bestTapes.slice(0, 2).map((a, idx) => ({ 
                        artNr: a.artNr, label: a.label, type: (idx === 0 ? 'Zubehör' : 'Option'), imgUrl: a.imgUrl, menge: 1,
                        dropdownLabel: idx === 0 ? '2-seitige Montage (L-Variante)' : '3-seitige Montage (U-Variante)'
                    }))
                });
            }

            // 3. CARRIER matching (Strict 3D)
            const carriers = library.filter(a => 
                (a.label.toLowerCase().includes('träger') || a.label.toLowerCase().includes('wannenträger')) &&
                a.w === trayDims.w && a.h === trayDims.h && 
                a.depth === logicalDepth && // STRICT DEPTH
                (isEcoplan ? a.label.toLowerCase().includes('ecoplan') : true) &&
                (!a.label.toLowerCase().includes('loa') || isLoa) // Don't give Loa carriers to non-Loa trays
            );

            if (carriers.length > 0) {
                stats.carrierFound++;
                materials.push({
                    id: 'mat_' + Math.random().toString(36).substr(2, 5),
                    name: 'Wannenträger',
                    options: carriers.slice(0, 1).map(a => ({ artNr: a.artNr, label: a.label, type: 'wannenträger', imgUrl: a.imgUrl, menge: 1 }))
                });
                
                const foam = library.find(a => a.label.toLowerCase().includes('montageschaum'));
                if (foam) {
                    materials.push({
                        id: 'mat_' + Math.random().toString(36).substr(2, 5),
                        name: 'Montageschaum',
                        options: [{ artNr: foam.artNr, label: foam.label, type: 'wannenträger', imgUrl: foam.imgUrl, menge: 1 }]
                    });
                }
                const acoustic = library.find(a => a.label.toLowerCase().includes('schallschutzset') && a.label.includes('bis 2000'));
                if (acoustic) {
                    materials.push({
                        id: 'mat_' + Math.random().toString(36).substr(2, 5),
                        name: 'Schallschutzset (Träger)',
                        options: [{ artNr: acoustic.artNr, label: acoustic.label, type: 'wannenträger', imgUrl: acoustic.imgUrl, menge: 1 }]
                    });
                }
            }

            // 4. FRAME matching (Strict Classification)
            const frames = library.filter(a => 
                (a.label.toLowerCase().includes('rahmen') || a.label.toLowerCase().includes('füsse') || a.label.toLowerCase().includes('fussset')) &&
                !a.label.toLowerCase().includes('träger') && // EXPLICITLY EXCLUDE CARRIERS
                a.w === trayDims.w && a.h === trayDims.h &&
                (isLoa ? a.label.toLowerCase().includes('omnia') : !a.label.toLowerCase().includes('omnia')) // Omnia only for Loa
            );
            if (frames.length > 0) {
                 materials.push({
                    id: 'mat_' + Math.random().toString(36).substr(2, 5),
                    name: 'Montagerahmen',
                    options: frames.slice(0, 1).map(a => ({ artNr: a.artNr, label: a.label, type: 'montagerahmen', imgUrl: a.imgUrl, menge: 1 }))
                });
            }

            tray.mountingMaterials = materials;
            stats.relinked++;
        });
    }

    fs.writeFileSync(dataPath, JSON.stringify(data));
    console.log(`\nPRECISION RESET COMPLETE (v3):`);
    console.log(` - Trays Updated: ${stats.relinked}`);
    console.log(` - Correct Carriers Found: ${stats.carrierFound}`);
    console.log(` - Protected Trays Skipped: ${stats.skipped}`);
}

relink();
