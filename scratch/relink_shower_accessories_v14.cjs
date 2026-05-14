const fs = require('fs');

const dataPath = '/Users/jenistonsellathamby/Desktop/product-configurator/custom-data.json';
const libPath = '/Users/jenistonsellathamby/Desktop/product-configurator/scratch/shower_accessory_library.json';

function relink() {
    console.log('--- STARTING UNIVERSAL RULES & LOGIC RELINK (v13.1 - 3D Fix) ---');
    if (!fs.existsSync(dataPath) || !fs.existsSync(libPath)) {
        console.error('Data or Library not found!');
        return;
    }

    const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

    // Improved 3D Dimension Parser
    const parse3D = (label) => {
        if (!label) return { w: null, h: null, d: null };
        const m = label.match(/(\d{2,4})\s*[xX]\s*(\d{2,4})\s*(?:[xX]\s*((?:\d+(?:,\d+)?)|(?:\d+(?:\.\d+)?)))?/);
        if (!m) return { w: null, h: null, d: null };

        const rawW = parseFloat(m[1].replace(',', '.'));
        const rawH = parseFloat(m[2].replace(',', '.'));
        const rawD = m[3] ? parseFloat(m[3].replace(',', '.')) : null;

        const normXY = (v) => (v < 400 ? v * 10 : v);
        const normZ = (v) => (v < 20 ? v * 10 : v);

        return { w: normXY(rawW), h: normXY(rawH), d: normZ(rawD) };
    };

    console.log(' -> Auto-rebuilding library from custom-data.json...');
    const library = [];
    const seen = new Set();
    const processItem = (item) => {
        if (!item || !item.artNr || seen.has(item.artNr)) return;
        if (item.artNr === '0000 001.000.000' || item.artNr === '0000 002.000.000') return;
        seen.add(item.artNr);
        const dims = parse3D(item.label);
        library.push({
            artNr: item.artNr,
            label: item.label,
            manufacturer: item.manufacturer || 'Andere',
            w: dims.w,
            h: dims.h,
            depth: dims.d,
            imgUrl: item.imgUrl
        });
    };

    Object.values(data).forEach(app => {
        if (app.trays && Array.isArray(app.trays)) {
            app.trays.forEach(tray => {
                processItem(tray);
                if (tray.mountingMaterials && Array.isArray(tray.mountingMaterials)) {
                    tray.mountingMaterials.forEach(mat => {
                        if (mat.options && Array.isArray(mat.options)) mat.options.forEach(opt => processItem(opt));
                    });
                }
            });
        }
        if (app.pool && Array.isArray(app.pool)) {
            app.pool.forEach(item => processItem(item));
        }
    });
    fs.writeFileSync(libPath, JSON.stringify(library, null, 2));
    console.log(` -> Library successfully rebuilt with ${library.length} items.\n`);

    const isMatch3D = (a, b, ignoreDepth = false) => {
        if (!a || !b || !a.w || !b.w) return false;
        const sizeMatch = (a.w === b.w && a.h === b.h) || (a.w === b.h && a.h === b.w);
        if (!sizeMatch) return false;
        if (!ignoreDepth && a.d && b.d) return Math.abs(a.d - b.d) < 1; // Tolerance 1mm
        return true; 
    };

    const parseRange = (label) => {
        const mRange = label.match(/(\d{3,4})-\s*(\d{3,4})\s*[xX]\s*(\d{3,4})-\s*(\d{3,4})/);
        if (mRange) return { type: 'range', wMin: parseInt(mRange[1]), wMax: parseInt(mRange[2]), hMin: parseInt(mRange[3]), hMax: parseInt(mRange[4]) };
        const mFixed = label.match(/Breite\s+(\d{3,4})\s*mm.*?(\d{3,4})\s*-\s*(\d{3,4})\s*mm/);
        if (mFixed) return { type: 'fixed', fixed: parseInt(mFixed[1]), min: parseInt(mFixed[2]), max: parseInt(mFixed[3]) };
        return null;
    };

    let stats = { relinked: 0, skipped: 0 };

    if (data.duschenwanne && data.duschenwanne.trays) {
        data.duschenwanne.trays.forEach(tray => {
            const labelLower = (tray.label || '').toLowerCase();
            const manufacturer = (tray.manufacturer || '').toLowerCase();

            const trayDims = parse3D(tray.label);
            if (!trayDims.w) return;

            const isKaldewei = labelLower.includes('kaldewei') || manufacturer.includes('kaldewei');
            const isCalima = labelLower.includes('calima');
            const isConoflat = labelLower.includes('conoflat');
            const isCayonoplan = labelLower.includes('cayonoplan');
            const isSuperplanZero = labelLower.includes('superplan zero');
            const isProS = labelLower.includes('pro s ') || labelLower.includes('pro s,');
            const isProSuperflach = labelLower.includes('superflach');
            const isLaufen = labelLower.includes('laufen') || manufacturer.includes('laufen');
            const isSchmidlin = labelLower.includes('schmidlin') || manufacturer.includes('schmidlin');
            const isAlternaLoa = labelLower.includes('alterna loa');
            const isEcoplan = labelLower.includes('ecoplan');

            const materials = [];

            // 1. SIPHON & COVER
            if (isCalima) {
                const s = library.find(a => a.artNr === "1313 277.501.000");
                let c = library.find(a => a.artNr === "1313 284.100.185") || { artNr: "1313 284.100.185", label: "Ablaufdeckel Kaldewei zu Calima Verchromt", imgUrl: "https://profishop.sanitastroesch.ch/multimedia/Web/PG1/01313284_100_185.png" };
                materials.push({ id: 'mat_deckel', name: 'Ablaufdeckel', options: [{ ...c, type: 'Zubehör', menge: 1 }] });
                if (s) materials.push({ id: 'mat_siphon', name: 'Ablaufgarnitur', options: [{ ...s, type: 'Zubehör', menge: 1 }] });
            } else if (isConoflat) {
                const s = library.find(a => a.artNr === "1313 274.000.000");
                let c = library.find(a => a.artNr === "1313 282.100.000") || { artNr: "1313 282.100.000", label: "Ablaufdeckel Kaldewei zu Conoflat Verchromt", imgUrl: "https://profishop.sanitastroesch.ch/multimedia/Web/PG1/01313282_100_000.png" };
                materials.push({ id: 'mat_deckel', name: 'Ablaufdeckel', options: [{ ...c, type: 'Zubehör', menge: 1 }] });
                if (s) materials.push({ id: 'mat_siphon', name: 'Ablaufgarnitur', options: [{ ...s, type: 'Zubehör', menge: 1 }] });
            } else if (isKaldewei) {
                const combined = library.find(a => a.artNr === "1313 271.501.000");
                if (combined) materials.push({ id: 'mat_siphon', name: 'Ablaufgarnitur & Deckel', options: [{ ...combined, type: 'Zubehör', menge: 1 }] });
            } else if (isLaufen && isProS) {
                const s = library.find(a => a.artNr === "1425 561.000.000");
                if (s) materials.push({ id: 'mat_siphon', name: 'Ablaufgarnitur', options: [{ ...s, type: 'Zubehör', menge: 1 }] });
            } else if (isLaufen && isProSuperflach) {
                const s = library.find(a => a.artNr === "1171 405.000.000");
                if (s) materials.push({ id: 'mat_siphon', name: 'Ablaufgarnitur (int. Deckel)', options: [{ ...s, type: 'Zubehör', menge: 1 }] });
            } else if (isAlternaLoa) {
                const c = library.find(a => a.artNr === "1311 698.501.000");
                const s = library.find(a => a.artNr === "1311 701.000.000");
                if (c) materials.push({ id: 'mat_deckel', name: 'Ablaufdeckel', options: [{ ...c, type: 'Zubehör', menge: 1 }] });
                if (s) materials.push({ id: 'mat_siphon', name: 'Ablaufgarnitur', options: [{ ...s, type: 'Zubehör', menge: 1 }] });
            } else {
                const c = library.find(a => a.artNr === "1422 118.501.000");
                const s = library.find(a => a.artNr === "1422 117.000.000");
                if (c) materials.push({ id: 'mat_deckel', name: 'Ablaufdeckel', options: [{ ...c, type: 'Zubehör', menge: 1 }] });
                if (s) materials.push({ id: 'mat_siphon', name: 'Ablaufgarnitur', options: [{ ...s, type: 'Zubehör', menge: 1 }] });
            }

            // 2. TAPE DROPWDOWN
            const perimeterL = (trayDims.w + trayDims.h + 200) / 1000;
            const perimeterU = (trayDims.w + trayDims.h + Math.min(trayDims.w, trayDims.h) + 200) / 1000;
            const allTapes = library.filter(a => (a.label || '').toLowerCase().includes('zargen') && (a.label || '').toLowerCase().includes('dichtband'))
                .map(a => {
                    const m = a.label.match(/Länge\s+([\d,.]+)\s*m/);
                    const len = m ? parseFloat(m[1].replace(',', '.')) : 0;
                    return { ...a, length: len };
                });
            const tapeL = allTapes.filter(a => a.length >= (perimeterL - 0.2)).sort((a,b) => a.length - b.length)[0];
            const tapeU = allTapes.filter(a => a.length >= (perimeterU - 0.2)).sort((a,b) => a.length - b.length)[0];
            const tapeOpts = [];
            if (tapeL) tapeOpts.push({ ...tapeL, dropdownLabel: '2-seitige Montage (L-Variante)', type: 'Zubehör', menge: 1 });
            if (tapeU && tapeU.artNr !== tapeL?.artNr) tapeOpts.push({ ...tapeU, dropdownLabel: '3-seitige Montage (U-Variante)', type: 'Option', menge: 1 });
            if (tapeOpts.length > 0) materials.push({ id: 'mat_tape', name: 'Zargen-Wannendichtband', options: tapeOpts });

            // 3. MOUNTING
            let hasCarrier = false;
            if (isCalima) {
                const stelz = library.find(a => a.artNr === "1313 285.000.000");
                if (stelz) {
                    const maxS = Math.max(trayDims.w, trayDims.h);
                    let q = 2; if (maxS > 1200) q = 3; if (maxS > 1500) q = 4;
                    materials.push({ id: 'mat_mounting', name: 'Stelzfüsse (Kaldewei)', options: [{ ...stelz, type: 'montagerahmen', menge: q }] });
                }
            } else if (isLaufen) {
                const useProSFrame = isProS;
                const frameKeyword = useProSFrame ? 'Laufen Pro S' : 'Ineo';
                
                let frame = library.filter(a => (a.label || '').includes('Duschwanneninstallationsrahmen') && (a.label || '').includes(frameKeyword)).find(f => {
                    const r = parseRange(f.label); if (!r) return false;
                    const [tw, th] = [trayDims.w, trayDims.h];
                    if (r.type === 'fixed') return (tw === r.fixed && th >= r.min && th <= r.max) || (th === r.fixed && tw >= r.min && tw <= r.max);
                    else return (tw >= r.wMin && tw <= r.wMax && th >= r.hMin && th <= r.hMax) || (th >= r.wMin && th <= r.wMax && tw >= r.hMin && tw <= r.hMax);
                });
                
                if (!frame && useProSFrame) {
                    frame = library.filter(a => (a.label || '').includes('Duschwanneninstallationsrahmen') && (a.label || '').includes('Ineo')).find(f => {
                        const r = parseRange(f.label); if (!r) return false;
                        const [tw, th] = [trayDims.w, trayDims.h];
                        if (r.type === 'fixed') return (tw === r.fixed && th >= r.min && th <= r.max) || (th === r.fixed && tw >= r.min && tw <= r.max);
                        else return (tw >= r.wMin && tw <= r.wMax && th >= r.hMin && th <= r.hMax) || (th >= r.wMin && th <= r.wMax && tw >= r.hMin && tw <= r.hMax);
                    });
                }
                
                if (frame) {
                    const displayKeyword = (frame.label || '').includes('Ineo') ? 'Ineo' : 'Laufen Pro S';
                    materials.push({ id: 'mat_mounting', name: `Installationsrahmen ${displayKeyword}`, options: [{ ...frame, type: 'montagerahmen', menge: 1 }] });
                }
                
                const schallArt = useProSFrame ? "1311 200.000.000" : "1311 201.000.000";
                const schall = library.find(a => a.artNr === schallArt);
                if (schall) materials.push({ id: 'mat_schall', name: `Schallschutzset (${frameKeyword})`, options: [{ ...schall, type: 'montagerahmen', menge: 1 }] });
            } else if (isEcoplan) {
                const carrier = library.find(a => {
                    const isEcoplanLbl = (a.label || '').toLowerCase().includes('ecoplan');
                    const isCarrier = (a.label || '').toLowerCase().includes('träge');
                    const match = isMatch3D(parse3D(a.label), trayDims, false);
                    if (isEcoplanLbl && isCarrier) {
                        console.log(`Checking carrier: ${a.label}`);
                        console.log(`Carrier dims:`, parse3D(a.label), `Tray dims:`, trayDims, `Match:`, match);
                    }
                    return isEcoplanLbl && isCarrier && match;
                });
                if (carrier) {
                    materials.push({ id: 'mat_carrier', name: 'Wannenträger ecoplan', options: [{ ...carrier, type: 'wannenträger', menge: 1 }] });
                    hasCarrier = true;
                }
            } else if (isAlternaLoa) {
                const omnia = library.find(a => (a.label || '').includes('Omnia') && isMatch3D(parse3D(a.label), trayDims, true));
                if (omnia) {
                    materials.push({ id: 'mat_omnia', name: 'Montagerahmen Omnia', options: [{ ...omnia, type: 'montagerahmen', menge: 1 }] });
                    const fussset = library.find(a => (a.label || '').toLowerCase().includes('schmidlin, omnia 8 fussstützen'));
                    if (fussset) {
                        materials.push({ id: 'mat_omnia_fuss', name: 'Schmidlin Fussset', options: [{ ...fussset, type: 'montagerahmen', menge: 1 }] });
                    }
                }
                const carrier = library.find(a => (a.label || '').toLowerCase().includes('loa') && (a.label || '').toLowerCase().includes('träge') && isMatch3D(parse3D(a.label), trayDims, true));
                if (carrier) {
                    materials.push({ id: 'mat_carrier', name: 'Wannenträger Alterna loa', options: [{ ...carrier, type: 'wannenträger', menge: 1 }] });
                    hasCarrier = true;
                }
            } else if (isKaldewei) {
                if (isCayonoplan || isSuperplanZero) {
                    const seriesKey = isCayonoplan ? 'Cayonoplan' : 'Superplan Zero';
                    const carrier = library.find(a => (a.label || '').includes(seriesKey) && (a.label || '').toLowerCase().includes('träge') && isMatch3D(parse3D(a.label), trayDims, isCayonoplan));
                    if (carrier) {
                        materials.push({ id: 'mat_carrier', name: `Wannenträger ${seriesKey}`, options: [{ ...carrier, type: 'wannenträger', menge: 1 }] });
                        hasCarrier = true;
                    }
                }
                const frVariants = [{ artNr: "1435 421.000.000", maxW: 900, maxH: 900 }, { artNr: "1435 424.000.000", maxW: 1200, maxH: 1200 }, { artNr: "1435 428.000.000", maxW: 1500, maxH: 1800 }];
                const matchFR = frVariants.find(v => (trayDims.w <= v.maxW && trayDims.h <= v.maxH) || (trayDims.h <= v.maxW && trayDims.w <= v.maxH));
                if (matchFR) {
                    const frame = library.find(a => a.artNr === matchFR.artNr);
                    if (frame) materials.push({ id: 'mat_fr5300', name: 'Montagerahmen FR 5300', options: [{ ...frame, type: 'montagerahmen', menge: 1 }] });
                }
                if (Math.max(trayDims.w, trayDims.h) >= 900) {
                    const masArt = isConoflat ? "1435 433.000.000" : "1435 435.000.000";
                    const mas = library.find(a => a.artNr === masArt);
                    if (mas) materials.push({ id: 'mat_mas', name: 'Mittenabstützsystem', options: [{ ...mas, type: 'montagerahmen', menge: 1 }] });
                }
            } else if (isSchmidlin) {
                const carrier = library.find(a => (a.label || '').includes('Schmidlin') && (a.label || '').toLowerCase().includes('träge') && isMatch3D(parse3D(a.label), trayDims));
                if (carrier) {
                    materials.push({ id: 'mat_mounting', name: 'Wannenträger Schmidlin', options: [{ ...carrier, type: 'wannenträger', menge: 1 }] });
                    hasCarrier = true;
                }
                const omnia = library.find(a => (a.label || '').includes('Omnia') && isMatch3D(parse3D(a.label), trayDims, true));
                if (omnia) {
                    materials.push({ id: 'mat_omnia', name: 'Montagerahmen Omnia', options: [{ ...omnia, type: 'montagerahmen', menge: 1 }] });
                    const fussset = library.find(a => (a.label || '').toLowerCase().includes('schmidlin, omnia 8 fussstützen'));
                    if (fussset) {
                        materials.push({ id: 'mat_omnia_fuss', name: 'Schmidlin Fussset', options: [{ ...fussset, type: 'montagerahmen', menge: 1 }] });
                    }
                }
            }

            if (hasCarrier) {
                const schaum = library.find(a => a.artNr === "1441 791.000.000");
                const schall = library.find(a => a.artNr === "1445 782.000.000");
                if (schaum) materials.push({ id: 'mat_schaum', name: 'Montageschaum', options: [{ ...schaum, type: 'wannenträger', menge: 1 }] });
                if (schall) materials.push({ id: 'mat_schallset', name: 'Schallschutzset', options: [{ ...schall, type: 'wannenträger', menge: 1 }] });
            }

            tray.mountingMaterials = materials;
            stats.relinked++;
        });
    }

    fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
    console.log(`\nUNIVERSAL LOGIC COMPLETE (v13.1):`);
    console.log(` - Trays Updated: ${stats.relinked}`);
}

relink();
