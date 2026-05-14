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
    console.log('--- STARTING UNIVERSAL ACCESSORY RELINK (v6) ---');
    if (!fs.existsSync(dataPath) || !fs.existsSync(libPath)) {
        console.error('Data or Library not found!');
        return;
    }

    const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
    const library = JSON.parse(fs.readFileSync(libPath, 'utf8'));

    // Reusable matches
    const siphonArtNr = "1422 117.000.000";
    const coverArtNr = "1422 118.501.000";
    const omniaFusssetArtNr = "1435 191.000.000";

    const drainItem = library.find(a => a.artNr === siphonArtNr);
    const coverItem = library.find(a => a.artNr === coverArtNr);
    const omniaFusssetItem = library.find(a => a.artNr === omniaFusssetArtNr);

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
            const manufacturer = (tray.manufacturer || '').toLowerCase();
            
            // Protected series from FULL WIPES, but we process them for universal components
            const isProtected = labelLower.includes('calima') || labelLower.includes('laufen pro');

            const trayDims = extract3D(tray.label);
            if (!trayDims.w) return; // Skip items that aren't trays

            let logicalDepth = trayDims.d;
            if (!logicalDepth) {
                for (const [key, val] of Object.entries(SERIES_DEPTH_MAP)) {
                    if (labelLower.includes(key)) {
                        logicalDepth = val;
                        break;
                    }
                }
            }
            if (!logicalDepth) logicalDepth = 250;

            const isEcoplan = labelLower.includes('ecoplan');
            const isLoa = labelLower.includes('loa');
            const isKaldewei = labelLower.includes('kaldewei') || manufacturer.includes('kaldewei');

            const materials = [];

            // 1. DRAIN & COVER (Universal)
            if (drainItem) {
                 materials.push({
                    id: 'mat_' + Math.random().toString(36).substr(2, 5),
                    name: 'Ablaufgarnitur',
                    options: [{ artNr: drainItem.artNr, label: drainItem.label, type: 'Zubehör', imgUrl: drainItem.imgUrl, menge: 1 }]
                });
            }
            if (coverItem) {
                 materials.push({
                    id: 'mat_' + Math.random().toString(36).substr(2, 5),
                    name: 'Ablaufdeckel',
                    options: [{ artNr: coverItem.artNr, label: coverItem.label, type: 'Zubehör', imgUrl: coverItem.imgUrl, menge: 1 }]
                });
            }

            // 2. SEALING TAPE (Universal)
            // L-Variante: W + H + 20cm
            // U-Variante: W + H + min(W,H) + 20cm
            const lPerimeterM = (trayDims.w + trayDims.h + 200) / 1000;
            const uPerimeterM = (trayDims.w + trayDims.h + Math.min(trayDims.w, trayDims.h) + 200) / 1000;

            const tapes = library.filter(a => a.label.toLowerCase().includes('zargen- wannendichtband'))
                .map(a => {
                    const lenMatch = a.label.match(/Länge\s+([\d,.]+)\s*m/);
                    const len = lenMatch ? parseFloat(lenMatch[1].replace(',', '.')) : 0;
                    return { ...a, length: len };
                })
                .filter(a => a.length > 0)
                .sort((a, b) => a.length - b.length);
            
            const bestLTape = tapes.find(t => t.length >= lPerimeterM);
            const bestUTape = tapes.find(t => t.length >= uPerimeterM);

            const tapeOptions = [];
            if (bestLTape) {
                tapeOptions.push({
                    artNr: bestLTape.artNr, label: bestLTape.label, type: 'Zubehör', imgUrl: bestLTape.imgUrl, menge: 1,
                    dropdownLabel: `2-seitige Montage (L-Variante, min ${lPerimeterM}m)`
                });
            }
            if (bestUTape) {
                tapeOptions.push({
                    artNr: bestUTape.artNr, label: bestUTape.label, type: 'Option', imgUrl: bestUTape.imgUrl, menge: 1,
                    dropdownLabel: `3-seitige Montage (U-Variante, min ${uPerimeterM}m)`
                });
            }

            if (tapeOptions.length > 0) {
                materials.push({
                    id: 'mat_' + Math.random().toString(36).substr(2, 5),
                    name: 'Zargen-Wannendichtband',
                    options: tapeOptions
                });
            }

            // 3. CARRIER matching (Brand Isolated)
            // Skip carriers for already "Protected" trays unless they are Ecoplan/Loa
            if (!isProtected || isEcoplan || isLoa) {
                const carriers = library.filter(a => {
                    const accLabelLower = a.label.toLowerCase();
                    const isCarrier = accLabelLower.includes('träger') || accLabelLower.includes('wannenträger');
                    if (!isCarrier) return false;
                    if (a.w !== trayDims.w || a.h !== trayDims.h || a.depth !== logicalDepth) return false;
                    
                    const accIsKaldewei = accLabelLower.includes('kaldewei');
                    if (accIsKaldewei && !isKaldewei) return false;
                    
                    if (isEcoplan && !accLabelLower.includes('ecoplan')) return false;
                    if (isLoa && !accLabelLower.includes('loa')) return false;
                    if (accLabelLower.includes('loa') && !isLoa) return false;

                    return true;
                });

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
            }

            // 4. FRAME matching (Brand Isolated + Omnia Bundle + Ecoplan Block)
            const canHaveFrame = !isEcoplan && (!isProtected || isLoa); 

            if (canHaveFrame) {
                const frames = library.filter(a => {
                    const accLabelLower = a.label.toLowerCase();
                    const isFrame = accLabelLower.includes('rahmen') || accLabelLower.includes('füsse') || accLabelLower.includes('fussset');
                    const isCarrier = accLabelLower.includes('träger');
                    if (!isFrame || isCarrier) return false;
                    if (a.w !== trayDims.w || a.h !== trayDims.h) return false;

                    const accIsKaldewei = accLabelLower.includes('kaldewei') || accLabelLower.includes('fr 5300');
                    if (accIsKaldewei && !isKaldewei) return false;
                    
                    if (isLoa) return accLabelLower.includes('omnia');
                    
                    if (accLabelLower.includes('omnia') && !labelLower.includes('alterna') && !labelLower.includes('schmidlin')) return false;

                    return true;
                });

                if (frames.length > 0) {
                    const frame = frames[0];
                    const frameOptions = [{ artNr: frame.artNr, label: frame.label, type: 'montagerahmen', imgUrl: frame.imgUrl, menge: 1 }];
                    
                    // OMNA Fussset Bundle
                    if (frame.label.toLowerCase().includes('omnia') && omniaFusssetItem) {
                        frameOptions.push({
                            artNr: omniaFusssetItem.artNr, 
                            label: omniaFusssetItem.label, 
                            type: 'montagerahmen', 
                            imgUrl: omniaFusssetItem.imgUrl, 
                            menge: 1 
                        });
                    }

                    materials.push({
                        id: 'mat_' + Math.random().toString(36).substr(2, 5),
                        name: 'Montagerahmen',
                        options: frameOptions
                    });
                }
            }

            tray.mountingMaterials = materials;
            stats.relinked++;
        });
    }

    fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
    console.log(`\nUNIVERSAL RELINK COMPLETE (v6):`);
    console.log(` - Trays Updated: ${stats.relinked}`);
    console.log(` - Correct Carriers Found: ${stats.carrierFound}`);
}

relink();
