const fs = require('fs');

const dataPath = '/Users/jenistonsellathamby/Desktop/product-configurator/custom-data.json';
const libPath = '/Users/jenistonsellathamby/Desktop/product-configurator/scratch/shower_accessory_library.json';

function relink() {
    console.log('--- STARTING UNIVERSAL RULES & LOGIC RELINK (v11.1) ---');
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
        const mRange = label.match(/(\d{3,4})-\s*(\d{3,4})\s*[xX]\s*(\d{3,4})-\s*(\d{3,4})/);
        if (mRange) return { type: 'range', wMin: parseInt(mRange[1]), wMax: parseInt(mRange[2]), hMin: parseInt(mRange[3]), hMax: parseInt(mRange[4]) };
        const mFixed = label.match(/Breite\s+(\d{3,4})\s*mm.*Länge.*(\d{3,4})\s*-\s*(\d{3,4})\s*mm/);
        if (mFixed) return { type: 'fixed', fixed: parseInt(mFixed[1]), min: parseInt(mFixed[2]), max: parseInt(mFixed[3]) };
        return null;
    };

    const isSizeMatch = (a, b) => {
        if (!a || !b || !a.w || !b.w) return false;
        return (a.w === b.w && a.h === b.h) || (a.w === b.h && a.h === b.w);
    };

    let stats = { relinked: 0, skipped: 0 };

    if (data.duschenwanne && data.duschenwanne.trays) {
        data.duschenwanne.trays.forEach(tray => {
            const labelLower = (tray.label || '').toLowerCase();
            const manufacturer = (tray.manufacturer || '').toLowerCase();
            if (labelLower.includes('alterna ecoplan') || labelLower.includes('alterna loa')) { stats.skipped++; return; }

            const trayDims = extract3D(tray.label);
            if (!trayDims.w) return;

            const isKaldewei = labelLower.includes('kaldewei') || manufacturer.includes('kaldewei');
            const isCalima = labelLower.includes('calima');
            const isConoflat = labelLower.includes('conoflat');
            const isCayonoplan = labelLower.includes('cayonoplan');
            const isSuperplanZero = labelLower.includes('superplan zero');
            const isProS = labelLower.includes('pro s');
            const isProSuperflach = labelLower.includes('pro superflach');
            const isLaufen = labelLower.includes('laufen') || manufacturer.includes('laufen');
            const isSchmidlin = labelLower.includes('schmidlin') || manufacturer.includes('schmidlin');

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
            } else {
                const c = library.find(a => a.artNr === "1422 118.501.000");
                const s = library.find(a => a.artNr === "1422 117.000.000");
                if (c) materials.push({ id: 'mat_deckel', name: 'Ablaufdeckel', options: [{ ...c, type: 'Zubehör', menge: 1 }] });
                if (s) materials.push({ id: 'mat_siphon', name: 'Ablaufgarnitur', options: [{ ...s, type: 'Zubehör', menge: 1 }] });
            }

            // 2. TAPE DROPWDOWN (Rule 1)
            const perimeterL = (trayDims.w + trayDims.h + 200) / 1000;
            const perimeterU = (trayDims.w + trayDims.h + Math.min(trayDims.w, trayDims.h) + 200) / 1000;
            const allTapes = library.filter(a => a.label.toLowerCase().includes('zargen') && a.label.toLowerCase().includes('dichtband'))
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
            if (isCalima) {
                const stelz = library.find(a => a.artNr === "1313 285.000.000");
                if (stelz) {
                    const maxS = Math.max(trayDims.w, trayDims.h);
                    let q = 2; if (maxS > 1200) q = 3; if (maxS > 1500) q = 4;
                    materials.push({ id: 'mat_mounting', name: 'Stelzfüsse (Kaldewei)', options: [{ ...stelz, type: 'montagerahmen', menge: q }] });
                }
            } else if (isLaufen && (isProS || isProSuperflach)) {
                const ineo = library.filter(a => a.label.includes('Ineo') && a.label.includes('Laufen')).find(f => {
                    const r = parseRange(f.label); if (!r) return false;
                    const [tw, th] = [trayDims.w, trayDims.h];
                    if (r.type === 'fixed') return (tw === r.fixed && th >= r.min && th <= r.max) || (th === r.fixed && tw >= r.min && tw <= r.max);
                    else return (tw >= r.wMin && tw <= r.wMax && th >= r.hMin && th <= r.hMax) || (th >= r.wMin && th <= r.wMax && tw >= r.hMin && tw <= r.hMax);
                });
                if (ineo) materials.push({ id: 'mat_mounting', name: 'Installationsrahmen Ineo', options: [{ ...ineo, type: 'montagerahmen', menge: 1 }] });
                const schallArt = isProS ? "1311 200.000.000" : "1311 201.000.000";
                const schall = library.find(a => a.artNr === schallArt);
                if (schall) materials.push({ id: 'mat_schall', name: 'Schallschutzset (Ineo)', options: [{ ...schall, type: 'montagerahmen', menge: 1 }] });
            } else if (isKaldewei) {
                // Cayonoplan / Superplan Zero Carriers
                if (isCayonoplan || isSuperplanZero) {
                    const seriesKey = isCayonoplan ? 'Cayonoplan' : 'Superplan Zero';
                    const carrier = library.find(a => a.label.includes(seriesKey) && a.label.toLowerCase().includes('träge') && isSizeMatch(a, trayDims));
                    if (carrier) materials.push({ id: 'mat_carrier', name: `Wannenträger ${seriesKey}`, options: [{ ...carrier, type: 'wannenträger', menge: 1 }] });
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
                const carrier = library.find(a => a.label.includes('Schmidlin') && a.label.toLowerCase().includes('träge') && isSizeMatch(a, trayDims));
                if (carrier) materials.push({ id: 'mat_mounting', name: 'Wannenträger Schmidlin', options: [{ ...carrier, type: 'wannenträger', menge: 1 }] });
            }

            tray.mountingMaterials = materials;
            stats.relinked++;
        });
    }

    fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
    console.log(`\nUNIVERSAL LOGIC COMPLETE (v11.1):`);
    console.log(` - Trays Updated: ${stats.relinked}`);
}

relink();
