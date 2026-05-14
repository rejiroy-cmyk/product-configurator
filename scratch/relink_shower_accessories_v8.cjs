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
    console.log('--- STARTING COMPREHENSIVE CARRIER ENGINE (v8) ---');
    if (!fs.existsSync(dataPath) || !fs.existsSync(libPath)) {
        console.error('Data or Library not found!');
        return;
    }

    const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
    const library = JSON.parse(fs.readFileSync(libPath, 'utf8'));

    const loaSiphonArtNr = "1311 701.000.000";
    const loaCoverArtNr = "1311 698.501.000";
    const geberitSiphonArtNr = "1422 117.000.000";
    const geberitCoverArtNr = "1422 118.501.000";
    const omniaFusssetArtNr = "1435 191.000.000";

    const norm = (v) => (!v ? null : (v < 400 ? v * 10 : v));
    const extract3D = (label) => {
        if (!label) return {w:null, h:null, d:null};
        const m = label.match(/(\d{2,4})\s*[xX]\s*(\d{2,4})\s*[xX]\s*(\d{2,4})/);
        if (m) return {w: norm(parseInt(m[1])), h: norm(parseInt(m[2])), d: norm(parseInt(m[3]))};
        const m2 = label.match(/(\d{2,4})\s*[xX]\s*(\d{2,4})/);
        if (m2) return {w: norm(parseInt(m2[1])), h: norm(parseInt(m2[2])), d: null};
        return {w:null, h:null, d:null};
    };

    let stats = { relinked: 0, carrierFound: 0 };

    if (data.duschenwanne && data.duschenwanne.trays) {
        data.duschenwanne.trays.forEach(tray => {
            const labelLower = tray.label.toLowerCase();
            const manufacturer = (tray.manufacturer || '').toLowerCase();
            const isProtected = labelLower.includes('calima') || labelLower.includes('laufen pro');

            const trayDims = extract3D(tray.label);
            if (!trayDims.w) return;

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

            const isLoa = labelLower.includes('loa');
            const isEcoplan = labelLower.includes('ecoplan');
            const isKaldewei = labelLower.includes('kaldewei') || manufacturer.includes('kaldewei');
            
            // Keywords for broad matching
            const seriesKeywords = ['ecoplan', 'loa', 'superplan', 'cayonoplan', 'floor', 'viva', 'omnia', 'meda', 'pro s', 'pro superflach', 'conoflat'];
            const activeSeries = seriesKeywords.find(seq => labelLower.includes(seq)) || '';

            const materials = [];

            // 1. DRAIN & COVER
            let currentSiphon, currentCover;
            if (isLoa) {
                currentSiphon = library.find(a => a.artNr === loaSiphonArtNr);
                currentCover = library.find(a => a.artNr === loaCoverArtNr);
            } else {
                currentSiphon = library.find(a => a.artNr === geberitSiphonArtNr);
                currentCover = library.find(a => a.artNr === geberitCoverArtNr);
            }

            if (currentCover) {
                materials.push({
                    id: 'mat_' + Math.random().toString(36).substr(2, 5),
                    name: 'Ablaufdeckel',
                    options: [{ artNr: currentCover.artNr, label: currentCover.label, type: 'Zubehör', imgUrl: currentCover.imgUrl, menge: 1 }]
                });
            }
            if (currentSiphon) {
                materials.push({
                    id: 'mat_' + Math.random().toString(36).substr(2, 5),
                    name: 'Ablaufgarnitur',
                    options: [{ artNr: currentSiphon.artNr, label: currentSiphon.label, type: 'Zubehör', imgUrl: currentSiphon.imgUrl, menge: 1 }]
                });
            }

            // 2. SEALING TAPE
            const lPerimeterM = (trayDims.w + trayDims.h + 200) / 1000;
            const uPerimeterM = (trayDims.w + trayDims.h + Math.min(trayDims.w, trayDims.h) + 200) / 1000;
            const tapes = library.filter(a => a.label.toLowerCase().includes('zargen- wannendichtband'))
                .map(a => {
                    const lenMatch = a.label.match(/Länge\s+([\d,.]+)\s*m/);
                    const len = lenMatch ? parseFloat(lenMatch[1].replace(',', '.')) : 0;
                    return { ...a, length: len };
                })
                .filter(a => a.length > 0).sort((a, b) => a.length - b.length);
            const bestLTape = tapes.find(t => t.length >= lPerimeterM);
            const bestUTape = tapes.find(t => t.length >= uPerimeterM);
            const tapeOptions = [];
            if (bestLTape) tapeOptions.push({ artNr: bestLTape.artNr, label: bestLTape.label, type: 'Zubehör', imgUrl: bestLTape.imgUrl, menge: 1, dropdownLabel: `2-seitige Montage (L-Variante, min ${lPerimeterM}m)` });
            if (bestUTape) tapeOptions.push({ artNr: bestUTape.artNr, label: bestUTape.label, type: 'Option', imgUrl: bestUTape.imgUrl, menge: 1, dropdownLabel: `3-seitige Montage (U-Variante, min ${uPerimeterM}m)` });
            if (tapeOptions.length > 0) materials.push({ id: 'mat_' + Math.random().toString(36).substr(2, 5), name: 'Zargen-Wannendichtband', options: tapeOptions });

            // 3. CARRIER Engine (Broad-Description Matching)
            if (!isProtected || isEcoplan || isLoa) {
                const candidates = library.filter(a => {
                    const accLabelLower = a.label.toLowerCase();
                    const isCarrier = accLabelLower.includes('träger') || accLabelLower.includes('wannenträger');
                    if (!isCarrier) return false;
                    if (a.w !== trayDims.w || a.h !== trayDims.h || a.depth !== logicalDepth) return false;
                    
                    // Brand Isolation: Kaldewei manufacturer products ONLY for Kaldewei.
                    if (a.manufacturer.toLowerCase().includes('kaldewei') && !isKaldewei) return false;

                    // Match logic: Does the carrier label mention the tray manufacturer OR its series?
                    const mentionsManufacturer = accLabelLower.includes(manufacturer);
                    const mentionsSeries = activeSeries && accLabelLower.includes(activeSeries);
                    
                    // Specific logic for Ecoplan/Loa
                    if (isEcoplan && !accLabelLower.includes('ecoplan')) return false;
                    if (isLoa && !accLabelLower.includes('loa')) return false;

                    return (mentionsManufacturer || mentionsSeries || isEcoplan || isLoa);
                });

                if (candidates.length > 0) {
                    stats.carrierFound++;
                    materials.push({
                        id: 'mat_' + Math.random().toString(36).substr(2, 5),
                        name: 'Wannenträger',
                        options: [candidates[0]].map(a => ({ artNr: a.artNr, label: a.label, type: 'wannenträger', imgUrl: a.imgUrl, menge: 1 }))
                    });
                    
                    const foam = library.find(a => a.label.toLowerCase().includes('montageschaum'));
                    if (foam) materials.push({ id: 'mat_' + Math.random().toString(36).substr(2, 5), name: 'Montageschaum', options: [{ artNr: foam.artNr, label: foam.label, type: 'wannenträger', imgUrl: foam.imgUrl, menge: 1 }] });
                    const acoustic = library.find(a => a.label.toLowerCase().includes('schallschutzset') && a.label.includes('bis 2000'));
                    if (acoustic) materials.push({ id: 'mat_' + Math.random().toString(36).substr(2, 5), name: 'Schallschutzset (Träger)', options: [{ artNr: acoustic.artNr, label: acoustic.label, type: 'wannenträger', imgUrl: acoustic.imgUrl, menge: 1 }] });
                }
            }

            // 4. FRAME
            const canHaveFrame = !isEcoplan && (!isProtected || isLoa); 
            if (canHaveFrame) {
                const frames = library.filter(a => {
                    const accLabelLower = a.label.toLowerCase();
                    const isFrame = accLabelLower.includes('rahmen') || accLabelLower.includes('füsse') || accLabelLower.includes('fussset');
                    const isCarrier = accLabelLower.includes('träger');
                    if (!isFrame || isCarrier) return false;
                    if (a.w !== trayDims.w || a.h !== trayDims.h) return false;
                    if (a.manufacturer.toLowerCase().includes('kaldewei') && !isKaldewei) return false;
                    if (isLoa && !accLabelLower.includes('omnia')) return false;
                    return true;
                });

                if (frames.length > 0) {
                    materials.push({
                        id: 'mat_' + Math.random().toString(36).substr(2, 5),
                        name: 'Montagerahmen',
                        options: [{ artNr: frames[0].artNr, label: frames[0].label, type: 'montagerahmen', imgUrl: frames[0].imgUrl, menge: 1 }]
                    });
                    const omniaFusssetItem = library.find(a => a.artNr === omniaFusssetArtNr);
                    if (frames[0].label.toLowerCase().includes('omnia') && omniaFusssetItem) {
                        materials.push({
                            id: 'mat_' + Math.random().toString(36).substr(2, 5),
                            name: 'Schmidlin Fussset',
                            options: [{ artNr: omniaFusssetItem.artNr, label: omniaFusssetItem.label, type: 'montagerahmen', imgUrl: omniaFusssetItem.imgUrl, menge: 1 }]
                        });
                    }
                }
            }

            tray.mountingMaterials = materials;
            stats.relinked++;
        });
    }

    fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
    console.log(`\nCARRIER ENGINE COMPLETE (v8):`);
    console.log(` - Trays Updated: ${stats.relinked}`);
}

relink();
