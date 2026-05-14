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
    console.log('--- STARTING UNIVERSAL RULES & LOGIC RELINK (v10) ---');
    if (!fs.existsSync(dataPath) || !fs.existsSync(libPath)) {
        console.error('Data or Library not found!');
        return;
    }

    const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
    const library = JSON.parse(fs.readFileSync(libPath, 'utf8'));

    const norm = (v) => (!v ? null : (v < 400 ? v * 10 : v));
    const extract3D = (label) => {
        if (!label) return {w:null, h:null, d:null};
        const m = label.match(/(\d{2,4})\s*[xX]\s*(\d{2,4})\s*[xX]\s*(\d{2,4})/);
        if (m) return {w: norm(parseInt(m[1])), h: norm(parseInt(m[2])), d: norm(parseInt(m[3]))};
        const m2 = label.match(/(\d{2,4})\s*[xX]\s*(\d{2,4})/);
        if (m2) return {w: norm(parseInt(m2[1])), h: norm(parseInt(m2[2])), d: null};
        return {w:null, h:null, d:null};
    };

    const parseRange = (label) => {
        // Handle "900- 1200 x 900- 1100 mm"
        const mRange = label.match(/(\d{3,4})-\s*(\d{3,4})\s*[xX]\s*(\d{3,4})-\s*(\d{3,4})/);
        if (mRange) {
            return {
                type: 'range',
                wMin: parseInt(mRange[1]), wMax: parseInt(mRange[2]),
                hMin: parseInt(mRange[3]), hMax: parseInt(mRange[4])
            };
        }
        // Handle "Breite 800 mm Länge (ausziehbar) 1400 - 1800 mm"
        const mFixed = label.match(/Breite\s+(\d{3,4})\s*mm.*Länge.*(\d{3,4})\s*-\s*(\d{3,4})\s*mm/);
        if (mFixed) {
            const fixed = parseInt(mFixed[1]);
            const min = parseInt(mFixed[2]);
            const max = parseInt(mFixed[3]);
            return { type: 'fixed', fixed, min, max };
        }
        return null;
    };

    let stats = { relinked: 0, skipped: 0 };

    if (data.duschenwanne && data.duschenwanne.trays) {
        data.duschenwanne.trays.forEach(tray => {
            const labelLower = (tray.label || '').toLowerCase();
            const manufacturer = (tray.manufacturer || '').toLowerCase();
            
            // SKIP ALTERNA LOCK (Rule: Alterna ecoplan and loa are COMPLETE)
            if (labelLower.includes('alterna ecoplan') || labelLower.includes('alterna loa')) {
                stats.skipped++;
                return;
            }

            const trayDims = extract3D(tray.label);
            if (!trayDims.w) return;

            const isKaldewei = labelLower.includes('kaldewei') || manufacturer.includes('kaldewei');
            const isCalima = labelLower.includes('calima');
            const isConoflat = labelLower.includes('conoflat');
            const isSuperplanZero = labelLower.includes('superplan zero');
            const isProS = labelLower.includes('pro s');
            const isProSuperflach = labelLower.includes('pro superflach');
            const isLaufen = labelLower.includes('laufen') || manufacturer.includes('laufen');
            const isSchmidlin = labelLower.includes('schmidlin') || manufacturer.includes('schmidlin');

            const materials = [];

            // 1. SIPHON & COVER LOGIC
            // Rule 1, 3, 5, 8, 9
            if (isCalima) {
                const s = library.find(a => a.artNr === "1313 277.501.000");
                // Cover 1313 284 might be missing from library, so we define it manually if needed
                let c = library.find(a => a.artNr === "1313 284.100.185");
                if (!c) c = { artNr: "1313 284.100.185", label: "Ablaufdeckel Kaldewei zu Calima Weiss", imgUrl: "https://profishop.sanitastroesch.ch/multimedia/Web/PG1/01313284_100_185.png" };
                else c = { ...c, label: c.label.replace('Verchromt', 'Weiss') };
                
                materials.push({ id: 'mat_deckel', name: 'Ablaufdeckel', options: [{ ...c, type: 'Zubehör', menge: 1 }] });
                if (s) materials.push({ id: 'mat_siphon', name: 'Ablaufgarnitur', options: [{ ...s, type: 'Zubehör', menge: 1 }] });
            } else if (isConoflat) {
                const s = library.find(a => a.artNr === "1313 274.000.000");
                let c = library.find(a => a.artNr === "1313 282.100.000");
                if (!c) c = { artNr: "1313 282.100.000", label: "Ablaufdeckel Kaldewei zu Conoflat Verchromt", imgUrl: "https://profishop.sanitastroesch.ch/multimedia/Web/PG1/01313282_100_000.png" };
                
                materials.push({ id: 'mat_deckel', name: 'Ablaufdeckel', options: [{ ...c, type: 'Zubehör', menge: 1 }] });
                if (s) materials.push({ id: 'mat_siphon', name: 'Ablaufgarnitur', options: [{ ...s, type: 'Zubehör', menge: 1 }] });
            } else if (isKaldewei) {
                // Rule 3: Combined 1313 271 for others
                const combined = library.find(a => a.artNr === "1313 271.501.000");
                if (combined) {
                    materials.push({ id: 'mat_siphon', name: 'Ablaufgarnitur & Deckel', options: [{ ...combined, type: 'Zubehör', menge: 1 }] });
                }
            } else if (isLaufen && isProS) {
                const s = library.find(a => a.artNr === "1425 561.000.000");
                if (s) materials.push({ id: 'mat_siphon', name: 'Ablaufgarnitur', options: [{ ...s, type: 'Zubehör', menge: 1 }] });
            } else if (isLaufen && isProSuperflach) {
                const s = library.find(a => a.artNr === "1171 405.000.000");
                if (s) materials.push({ id: 'mat_siphon', name: 'Ablaufgarnitur (int. Deckel)', options: [{ ...s, type: 'Zubehör', menge: 1 }] });
            } else {
                // Fallback (Geberit)
                const s = library.find(a => a.artNr === "1422 117.000.000");
                const c = library.find(a => a.artNr === "1422 118.501.000");
                if (c) materials.push({ id: 'mat_deckel', name: 'Ablaufdeckel', options: [{ ...c, type: 'Zubehör', menge: 1 }] });
                if (s) materials.push({ id: 'mat_siphon', name: 'Ablaufgarnitur', options: [{ ...s, type: 'Zubehör', menge: 1 }] });
            }

            // 2. SEALING TAPE (L and U Variante)
            const lPerimeterM = (trayDims.w + trayDims.h + 200) / 1000;
            const uPerimeterM = (trayDims.w + trayDims.h + Math.min(trayDims.w, trayDims.h) + 200) / 1000;
            const tapes = library.filter(a => a.label.toLowerCase().includes('wannendichtband'))
                .map(a => {
                    const m = a.label.match(/Länge\s+([\d,.]+)\s*m/);
                    const len = m ? parseFloat(m[1].replace(',', '.')) : 0;
                    return { ...a, length: len };
                })
                .filter(a => a.length > 0).sort((a,b) => a.length - b.length);
            
            const bestLTape = tapes.find(t => t.length >= lPerimeterM);
            const bestUTape = tapes.find(t => t.length >= uPerimeterM);
            const tapeOptions = [];
            
            if (bestLTape) tapeOptions.push({ artNr: bestLTape.artNr, label: bestLTape.label, type: 'Zubehör', imgUrl: bestLTape.imgUrl, menge: 1, dropdownLabel: `2-seitige Montage (L-Variante, min ${lPerimeterM}m)` });
            if (bestUTape) tapeOptions.push({ artNr: bestUTape.artNr, label: bestUTape.label, type: 'Option', imgUrl: bestUTape.imgUrl, menge: 1, dropdownLabel: `3-seitige Montage (U-Variante, min ${uPerimeterM}m)` });
            
            if (tapeOptions.length > 0) materials.push({ id: 'mat_tape', name: 'Zargen-Wannendichtband', options: tapeOptions });

            // 3. MOUNTING logic
            if (isCalima) {
                // Rule 2: Stelzfüsse only
                const stelz = library.find(a => a.artNr === "1313 285.000.000");
                if (stelz) {
                    const maxSide = Math.max(trayDims.w, trayDims.h);
                    const minSide = Math.min(trayDims.w, trayDims.h);
                    
                    const cols = (maxSide <= 1000) ? 4 : (maxSide <= 1300) ? 5 : (maxSide <= 1600) ? 6 : 7;
                    const rows = (minSide === 700) ? 3 : 4;
                    const totalFeet = cols * rows;
                    const qty = Math.ceil(totalFeet / 4);

                    materials.push({ id: 'mat_mounting', name: 'Stelzfüsse (Kaldewei)', options: [{ ...stelz, type: 'montagerahmen', menge: qty, dropdownLabel: `Set à 4 Stück (${qty} Sets = ${totalFeet} Füsse)` }] });
                }
            } else if (isLaufen && (isProS || isProSuperflach)) {
                // Rule 8/9: Ineo frames only
                const ineo = library.filter(a => a.label.includes('Ineo') && a.label.includes('Laufen')).find(f => {
                    const r = parseRange(f.label);
                    if (!r) return false;
                    const [tw, th] = [trayDims.w, trayDims.h];
                    if (r.type === 'fixed') {
                        return (tw === r.fixed && th >= r.min && th <= r.max) || (th === r.fixed && tw >= r.min && tw <= r.max);
                    } else {
                        return (tw >= r.wMin && tw <= r.wMax && th >= r.hMin && th <= r.hMax) || (th >= r.wMin && th <= r.wMax && tw >= r.hMin && tw <= r.hMax);
                    }
                });
                if (ineo) materials.push({ id: 'mat_mounting', name: 'Installationsrahmen Ineo', options: [{ ...ineo, type: 'montagerahmen', menge: 1 }] });
            } else if (isKaldewei) {
                const [tw, th] = [trayDims.w, trayDims.h];
                let foundCarrier = false;

                // Wannenträger for Kaldewei (Cayonoplan and Superplan Zero)
                const isCayonoplan = labelLower.includes('cayonoplan');
                const isSuperplanZero = labelLower.includes('superplan zero');
                
                if (isCayonoplan || isSuperplanZero) {
                    const seriesName = isCayonoplan ? 'cayonoplan' : 'superplan zero';
                    const carrier = library.find(a => {
                        const l = (a.label || '').toLowerCase();
                        if (!l.includes('träger') || !l.includes(seriesName)) return false;
                        return (a.w === tw && a.h === th) || (a.w === th && a.h === tw);
                    });
                    
                    if (carrier) {
                        foundCarrier = true;
                        materials.push({ id: 'mat_carrier', name: 'Wannenträger ' + (isCayonoplan ? 'Cayonoplan' : 'Superplan Zero'), options: [{ ...carrier, type: 'wannenträger', menge: 1 }] });
                    }
                }

                // Rule 4: FR 5300
                const frVariants = [
                    { artNr: "1435 421.000.000", maxW: 900,  maxH: 900 },
                    { artNr: "1435 424.000.000", maxW: 1200, maxH: 1200 },
                    { artNr: "1435 428.000.000", maxW: 1500, maxH: 1800 }
                ];
                const matchFR = frVariants.find(v => (tw <= v.maxW && th <= v.maxH) || (th <= v.maxW && tw <= v.maxH));
                if (matchFR) {
                    const frame = library.find(a => a.artNr === matchFR.artNr);
                    if (frame) materials.push({ id: 'mat_fr5300', name: 'Montagerahmen FR 5300', options: [{ ...frame, type: 'montagerahmen', menge: 1 }] });
                }
                
                // Rule 6: Mittenabstützsystem
                if (Math.max(tw, th) >= 900) {
                    const masArt = isConoflat ? "1435 433.000.000" : "1435 435.000.000";
                    const mas = library.find(a => a.artNr === masArt);
                    if (mas) materials.push({ id: 'mat_mas', name: 'Mittenabstützsystem', options: [{ ...mas, type: 'montagerahmen', menge: 1 }] });
                }

                // Bundle Foam and Acoustic Set
                if (foundCarrier) {
                    const foam = library.find(a => a.artNr === "1441 791.000.000");
                    if (foam) materials.push({ id: 'mat_schaum', name: 'Montageschaum', options: [{ ...foam, type: 'wannenträger', menge: 1 }] });
                    const acoustic = library.find(a => a.artNr === "1445 782.000.000");
                    if (acoustic) materials.push({ id: 'mat_schallset', name: 'Schallschutzset', options: [{ ...acoustic, type: 'wannenträger', menge: 1 }] });
                }

            } else if (isSchmidlin) {
                const [tw, th] = [trayDims.w, trayDims.h];
                
                // Rule: Schmidlin carriers
                const carrier = library.find(a => {
                    const l = (a.label || '').toLowerCase();
                    return l.includes('schmidlin') && l.includes('träger') && 
                           ((a.w === tw && a.h === th) || (a.w === th && a.h === tw));
                });
                
                if (carrier) {
                    materials.push({ id: 'mat_carrier', name: 'Wannenträger Schmidlin', options: [{ ...carrier, type: 'wannenträger', menge: 1 }] });
                    
                    // Bundle Foam and Acoustic Set
                    const foam = library.find(a => a.artNr === "1441 791.000.000");
                    if (foam) materials.push({ id: 'mat_schaum', name: 'Montageschaum', options: [{ ...foam, type: 'wannenträger', menge: 1 }] });
                    const acoustic = library.find(a => a.artNr === "1445 782.000.000");
                    if (acoustic) materials.push({ id: 'mat_schallset', name: 'Schallschutzset', options: [{ ...acoustic, type: 'wannenträger', menge: 1 }] });
                }

                // Schmidlin Omnia Mounting Frame
                const omniaFrame = library.find(a => {
                    const l = (a.label || '').toLowerCase();
                    return l.includes('schmidlin omnia') && l.includes('montagerahmen') &&
                           ((a.w === tw && a.h === th) || (a.w === th && a.h === tw));
                });
                
                if (omniaFrame) {
                    materials.push({ id: 'mat_omnia_frame', name: 'Montagerahmen Schmidlin Omnia', options: [{ ...omniaFrame, type: 'montagerahmen', menge: 1 }] });
                }

                const omniaFuss = library.find(a => a.artNr === "1435 191.000.000");
                if (omniaFuss) {
                    materials.push({ id: 'mat_omnia_fuss', name: 'Schmidlin Fussset', options: [{ ...omniaFuss, type: 'montagerahmen', menge: 1 }] });
                }
            }

            tray.mountingMaterials = materials;
            stats.relinked++;
        });
    }

    fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
    console.log(`\nUNIVERSAL LOGIC COMPLETE (v10):`);
    console.log(` - Trays Updated: ${stats.relinked}`);
    console.log(` - Trays Skipped (Locked): ${stats.skipped}`);
}

relink();
