const fs = require('fs');
const path = require('path');

const dataPath = '/Users/jenistonsellathamby/Desktop/product-configurator/custom-data.json';
const libPath = '/Users/jenistonsellathamby/Desktop/product-configurator/scratch/shower_accessory_library.json';

function relink() {
    console.log('--- STARTING INTELLIGENT SHOWER ACCESSORY RE-LINKING (v2) ---');
    if (!fs.existsSync(dataPath) || !fs.existsSync(libPath)) {
        console.error('Data or Library not found!');
        return;
    }

    const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
    const library = JSON.parse(fs.readFileSync(libPath, 'utf8'));

    const norm = (v) => {
        if (!v) return null;
        return v < 400 ? v * 10 : v;
    };

    const extract3D = (label) => {
        if (!label) return {w:null, h:null, d:null};
        // Match format like 900 x 900 x 65
        const m = label.match(/(\d{2,4})\s*[xX]\s*(\d{2,4})\s*[xX]\s*(\d{2,4})/);
        if (m) return {w: norm(parseInt(m[1])), h: norm(parseInt(m[2])), d: norm(parseInt(m[3]))};
        
        // Match format like 90 x 90 or 900 x 900
        const m2 = label.match(/(\d{2,4})\s*[xX]\s*(\d{2,4})/);
        if (m2) return {w: norm(parseInt(m2[1])), h: norm(parseInt(m2[2])), d: null};
        
        return {w:null, h:null, d:null};
    };

    let stats = { relinked: 0, skipped: 0, carrierFound: 0 };

    if (data.duschenwanne && data.duschenwanne.trays) {
        data.duschenwanne.trays.forEach(tray => {
            const lbl = tray.label.toLowerCase();
            if (lbl.includes('calima') || lbl.includes('laufen pro')) {
                stats.skipped++;
                return;
            }

            const trayDims = extract3D(tray.label);
            const isEcoplan = lbl.includes('ecoplan');
            const isLoa = lbl.includes('loa');

            const materials = [];

            // 1. ABLAUF + DECKEL
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

            // 2. ZARGEN DICHTBAND
            const perimeter = (2 * trayDims.w + 2 * trayDims.h) / 1000;
            const tapes = library.filter(a => a.label.toLowerCase().includes('zargen- wannendichtband'))
                .map(a => {
                    const lenMatch = a.label.match(/Länge\s+([\d,.]+)\s*m/);
                    const len = lenMatch ? parseFloat(lenMatch[1].replace(',', '.')) : 0;
                    return { ...a, length: len };
                })
                .filter(a => a.length >= (perimeter - 0.1))
                .sort((a, b) => a.length - b.length);
            
            if (tapes.length > 0) {
                 materials.push({
                    id: 'mat_' + Math.random().toString(36).substr(2, 5),
                    name: 'Zargen-Wannendichtband',
                    options: tapes.slice(0, 2).map(a => ({ 
                        artNr: a.artNr, label: a.label, type: 'Zubehör', imgUrl: a.imgUrl, menge: 1,
                        dropdownLabel: a.length < perimeter ? '2-seitige Montage (L-Variante)' : '3-seitige Montage (U-Variante)'
                    }))
                });
            }

            // 3. WANNENTRÄGER (Strict 3D Matching)
            const carriers = library.filter(a => 
                (a.label.toLowerCase().includes('träger') || a.label.toLowerCase().includes('wannenträger')) &&
                a.w === trayDims.w && a.h === trayDims.h && 
                (trayDims.d ? a.depth === trayDims.d : true) &&
                (isEcoplan ? a.label.toLowerCase().includes('ecoplan') : true) &&
                (isLoa ? a.label.toLowerCase().includes('loa') : true)
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

            // 4. MONTAGERAHMEN
            const frames = library.filter(a => 
                (a.label.toLowerCase().includes('rahmen') || a.label.toLowerCase().includes('füsse')) &&
                a.w === trayDims.w && a.h === trayDims.h &&
                (isLoa ? a.label.toLowerCase().includes('omnia') : true)
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
    console.log(`\nRE-LINK COMPLETE (v2):`);
    console.log(` - Trays Relinked: ${stats.relinked}`);
    console.log(` - Carriers Successfully Found: ${stats.carrierFound}`);
    console.log(` - Trays Skipped: ${stats.skipped}`);
}

relink();
