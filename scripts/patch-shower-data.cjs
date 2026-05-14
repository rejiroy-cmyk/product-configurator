const fs = require('fs');

const DATA_PATH = './custom-data.json';
const data = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));

const pool = data.zubehoer_pool;
const fullPool = [
    ...(pool.trays || []),
    ...(pool.parts || []),
    ...(pool.finishes || [])
];

const SHOWER_RULES = {
    "alterna": {
        "ecoplan": { deckel: "1422 118.501.000", siphon: "1422 117.000.000" },
        "loa": { deckel: "1311 698.501.000", siphon: "1311 701.000.000" }
    },
    "schmidlin": {
        "duschwanne": { deckel: "1422 118.501.000", siphon: "1422 117.000.000" },
        "viva": { deckel: "1311 698.501.000", siphon: "1311 701.000.000" },
        "floor": { deckel: "1311 698.501.000", siphon: "1311 701.000.000" }
    },
    "kaldewei": {
        "superplan zero": { siphon: "1313 271.501.000" },
        "cayonoplan": { siphon: "1313 271.501.000" },
        "calima": { deckel: "1313 284.100.185", siphon: "1313 277.501.000" },
        "superplan": { siphon: "1313 271.501.000" },
        "duschplan": { deckel: "1422 118.501.000", siphon: "1422 117.000.000" },
        "sanidusch": { siphon: "1422 117.000.000" },
        "superplan classic": { siphon: "1313 271.501.000" },
        "conoflat": { deckel: "1313 282.100.000", siphon: "1313 274.000.000" }
    },
    "laufen": {
        "pro s superflach": { siphon: "1425 561.000.000" },
        "pro superflach": { siphon: "1171 405.000.000" }
    }
};

const CALIMA_FEET_MAP = {
    "800x800": 16, "900x700": 12, "900x750": 16, "900x800": 16, "900x900": 16,
    "1000x700": 12, "1000x750": 16, "1000x800": 16, "1000x900": 16, "1000x1000": 16,
    "1100x700": 15, "1100x750": 20, "1100x800": 20, "1100x900": 20,
    "1200x700": 15, "1200x750": 20, "1200x800": 20, "1200x900": 20, "1200x1000": 20,
    "1300x700": 15, "1300x750": 20, "1300x800": 20, "1300x900": 20,
    "1400x700": 18, "1400x750": 24, "1400x800": 24, "1400x900": 24, "1400x1000": 24,
    "1500x700": 18, "1500x750": 24, "1500x800": 24, "1500x900": 24,
    "1600x700": 18, "1600x750": 24, "1600x800": 24, "1600x900": 24,
    "1700x700": 21, "1700x750": 28, "1700x800": 28, "1700x900": 28,
    "1800x700": 21, "1800x750": 28, "1800x800": 28, "1800x900": 28
};

function normalizeSize(s) {
    if (!s) return null;
    const matches = s.match(/(\d+(?:[.,]\d+)?)\s*[xX\/\*\-]\s*(\d+(?:[.,]\d+)?)/);
    if (!matches) return null;
    let w = parseFloat(matches[1].replace(',', '.'));
    let h = parseFloat(matches[2].replace(',', '.'));
    if (w > 300) w /= 10;
    if (h > 300) h /= 10;
    return [w, h];
}

console.log("Patching Duschenwanne with Advanced Admin Logic...");

data.duschenwanne.trays.forEach(tray => {
    tray.mountingMaterials = []; // Wipe and restart cleanly
    
    const manufacturer = (tray.manufacturer || '').toLowerCase().trim();
    const labelLower = (tray.label || '').toLowerCase().trim();
    const size = (tray.size || '').replace(/\s/g, '').toLowerCase();
    const sizeParts = normalizeSize(tray.size);
    const isLargeTray = sizeParts ? (Math.max(sizeParts[0], sizeParts[1]) > 90) : false;

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
        { name: 'Wannenträger', keywords: ['wannenträger'], group: 'wannenträger', condition: manufacturer !== 'laufen' },
        { name: 'Montageschaum', keywords: ['montageschaum', 'schaum'], group: 'wannenträger' },
        { name: 'Schallschutzset (Träger)', keywords: [], artNr: '1445 782.000.000', group: 'wannenträger' },

        // Group 2: Montagerahmen System
        { name: 'Montagerahmen', keywords: ['montagerahmen', 'einbaurahmen', 'omnia', 'ineo', 'fr 5300'], group: 'montagerahmen' },
        { name: 'Wannenfüsse', keywords: [], artNr: '1435 191.000.000', group: 'montagerahmen', condition: labelLower.includes('omnia') || labelLower.includes('loa') || manufacturer === 'schmidlin' },
        { name: 'Mittenabstützsystem (Standard)', keywords: [], artNr: '1435 435.000.000', group: 'montagerahmen', condition: (manufacturer === 'kaldewei' && isLargeTray && !labelLower.includes('conoflat')) },
        { name: 'Mittenabstützsystem (Conoflat)', keywords: [], artNr: '1435 433.000.000', group: 'montagerahmen', condition: (manufacturer === 'kaldewei' && isLargeTray && labelLower.includes('conoflat')) },

        // Group 3: Calima Stelzfüsse System
        { name: 'Stelzfüsse-Pack (4 Stk)', keywords: ['stelzfüsse', 'stelzfuss'], group: 'stelzfüsse', condition: labelLower.includes('calima') },

        // Group 4: Swiss Line Sets
        { name: 'Montageset', keywords: ['montageset', 'swiss line'], group: 'montageset', condition: labelLower.includes('swiss line') }
    ];

    categories.forEach(cat => {
        if (tray.mountingMaterials.some(m => m.name === cat.name)) return;
        if (cat.condition === false) return;
        if (cat.name === 'Ablaufdeckel' && modelRule && !modelRule.deckel) return;
        
        if (labelLower.includes('calima') && (cat.group === 'wannenträger' || cat.group === 'montagerahmen')) return;
        if (labelLower.includes('swiss line') && cat.name !== 'Montageset') return;

        if (cat.name === 'Montageschaum' || (cat.artNr === '1445 782.000.000' && cat.group === 'wannenträger')) {
            const hasCarrier = tray.mountingMaterials.some(m => m.name === 'Wannenträger');
            if (!hasCarrier) return;
        }

        let matches = fullPool.filter(item => {
            const lbl = item.label.toLowerCase();
            const artNrClean = (item.artNr || '').replace(/[^a-zA-Z0-9]/g, '');

            if (cat.artNr) {
                const targetArtNrClean = cat.artNr.replace(/[^a-zA-Z0-9]/g, '');
                if (artNrClean === targetArtNrClean) return true;
                // If it's a specific artNr search, and it didn't match, we should return false, EXCEPT for Wannenträger overrides.
                // Actually, let's just let the Wannenträger overrides handle it later, or wait...
            }
            
            // STRICT KEYWORD GATING
            if (cat.keywords && cat.keywords.length > 0) {
                const hasKeyword = cat.keywords.some(k => lbl.includes(k));
                if (!hasKeyword) return false;
            }

            if (cat.name === 'Wannenträger') {
                const tArt = (tray.artNr || '').replace(/[^0-9]/g, '');
                const iArt = (item.artNr || '').replace(/[^0-9]/g, '');
                if (tArt === '1313311100000' && iArt === '1445727000000') return true;
                if (tArt === '1313307100000' && iArt === '1445726000000') return true;
                if ((tArt === '1111547100000' || tArt === '1111545100000') && iArt.startsWith('1435')) {
                    if (lbl.includes('omnia') || lbl.includes('montagerahmen')) return true;
                }
            }

            const isOmnia = lbl.includes('omnia');
            const isLoa = labelLower.includes('loa');

            if (cat.name === 'Montagerahmen' || cat.group === 'montagerahmen') {
                if (cat.name === 'Montagerahmen' && (lbl.includes('klosett') || lbl.includes('sitz') || lbl.includes('wannenfüsse') || artNrClean === '1435191000000')) return false;
                
                const isIneo = lbl.includes('ineo');
                const isFR = lbl.includes('fr 5300');
                const isUniversal = isOmnia || isIneo || isFR;

                if (manufacturer === 'kaldewei' && !lbl.includes('kaldewei')) return false;
                if (manufacturer === 'schmidlin' && !isOmnia) return false;
                if (manufacturer === 'laufen' && !lbl.includes('laufen')) return false;

                if (isLoa && isOmnia) { return true; }
                else if (manufacturer === 'alterna' && isOmnia) { return true; }
                else if (manufacturer === 'alterna' && !lbl.includes('alterna')) { return false; }
                if (manufacturer === 'laufen' && !isIneo && !lbl.includes('pro s')) return false;

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
                        const matchRotated = Math.abs(th - ew) <= 2.0 && Math.abs(tw - eh) <= 2.0;
                        if (!matchNormal && !matchRotated) return false;
                    }
                }
                return true;
            }

            if (cat.group === 'montagerahmen' && labelLower.includes('calima')) return false;

            if (modelRule) {
                if (cat.name === 'Ablaufdeckel' && modelRule.deckel && artNrClean.includes(modelRule.deckel.replace(/[^a-zA-Z0-9]/g, ''))) return true;
                if (cat.name === 'Ablaufgarnitur' && modelRule.siphon && artNrClean.includes(modelRule.siphon.replace(/[^a-zA-Z0-9]/g, ''))) return true;
                if ((modelRule.deckel || modelRule.siphon) && (cat.name === 'Ablaufdeckel' || cat.name === 'Ablaufgarnitur')) return false;
            }

            if (cat.name === 'Zargen-Wannendichtband') {
                if (lbl.includes('montageset')) return false;
            }

            if (cat.name === 'Wannenträger') {
                if (lbl.includes('montageschaum') || lbl.includes('schallschutzset') || lbl.includes('nicht in zusammenhang mit wannenträger') || lbl.includes('badewannenträger')) return false;
                
                const pMfr = (item.manufacturer || '').toLowerCase();
                if (manufacturer === 'alterna' && pMfr === 'kaldewei') return false;
                if (pMfr && manufacturer && pMfr !== manufacturer) return false;
                if (!lbl.includes(manufacturer) && (!pMfr || pMfr === 'andere')) return false;

                const trayLabel = tray.label.toLowerCase();
                const variants = ['classic', 'zero', 'duschplan', 'superplan zero', 'superplan classic'];
                for (const v of variants) {
                    const trayHasVariant = trayLabel.includes(v);
                    const itemHasVariant = lbl.includes(v);
                    if (trayHasVariant !== itemHasVariant) {
                        if (trayLabel.includes('superplan') && lbl.includes('superplan')) return false;
                        if (trayLabel.includes('duschplan') && lbl.includes('duschplan')) return false;
                    }
                }

                if (manufacturer === 'alterna' && (lbl.includes('laufen') || lbl.includes('ineo'))) return false;
                if (manufacturer === 'laufen' && lbl.includes('alterna')) return false;

                const seriesRaw = tray.label.toLowerCase().replace(manufacturer, '').replace('duschwanne', '').replace('duschenwanne', '').replace('duschfläche', '').split(',')[0].trim();
                const series = seriesRaw.replace(/[^a-z]/g, '').trim();
                const seriesWords = series.split(' ').filter(w => w.length >= 3);
                const seriesMatch = seriesWords.length > 0 && seriesWords.some(w => lbl.includes(w));
                const isFuzzySeriesMatch = seriesMatch || (series.length >= 3 && lbl.includes(series));
                const isUniversalFrame = lbl.includes('omnia') || lbl.includes('ineo') || lbl.includes('fr 5300');
                
                if (series.length >= 3 && !isFuzzySeriesMatch && !isUniversalFrame) return false;

                if (sizeParts) {
                    const tw = sizeParts[0];
                    const th = sizeParts[1];
                    const smMatch = lbl.match(/(\d+)\s*[xX]\s*(\d+)/);
                    if (smMatch) {
                        let ew = parseInt(smMatch[1]), eh = parseInt(smMatch[2]);
                        if (lbl.includes('mm') || ew > 300) { ew /= 10; eh /= 10; }
                        const matchNormal = Math.abs(tw - ew) <= 2.0 && Math.abs(th - eh) <= 2.0;
                        const matchRotated = Math.abs(th - ew) <= 2.0 && Math.abs(tw - eh) <= 2.0;
                        if (!matchNormal && !matchRotated) return false;
                    } else {
                        return false;
                    }
                }
            }

            return true;
        });

        if (cat.name === 'Stelzfüsse-Pack (4 Stk)' && labelLower.includes('calima') && size) {
            const reqFeet = CALIMA_FEET_MAP[size];
            if (reqFeet && matches.length > 0) {
                matches[0].menge = Math.ceil(reqFeet / 4);
                matches = [matches[0]];
            }
        } else {
            matches.forEach(m => m.menge = 1);
        }

        // Deduplicate
        const uniqueArtNrs = new Set();
        matches = matches.filter(m => {
            if (!m.artNr || uniqueArtNrs.has(m.artNr)) return false;
            uniqueArtNrs.add(m.artNr);
            return true;
        });

        if (matches.length > 0) {
            tray.mountingMaterials.push({
                id: 'mat_' + Math.random().toString(36).substr(2, 5),
                name: cat.name,
                options: matches.map(m => ({ artNr: m.artNr, label: m.label, type: 'Option', imgUrl: m.imgUrl || '', menge: m.menge }))
            });
        }
    });

    if (manufacturer === 'laufen' && labelLower.includes('superflach')) {
        const isProS = labelLower.includes('pro s');
        const targetArtNr = isProS ? "1311 200.000.000" : "1311 201.000.000";
        const setName = isProS ? "Schallschutzset (Rahmen Pro S)" : "Schallschutzset (Rahmen Pro)";

        if (!tray.mountingMaterials.some(m => m.name.includes('Schallschutzset (Rahmen)'))) {
            tray.mountingMaterials.push({
                id: 'mat_' + Math.random().toString(36).substr(2, 5),
                name: setName,
                options: [{
                    artNr: targetArtNr,
                    label: `Schallschutz- Set Laufen, Art. ${targetArtNr}`,
                    menge: 1,
                    type: 'montagerahmen',
                    imgUrl: `https://profishop.sanitastroesch.ch/multimedia/Web/PG1/0${targetArtNr.replace(/[^0-9]/g, '')}.png`
                }]
            });
        }
    }
});

fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2));
console.log(`Successfully patched ${data.duschenwanne.trays.length} shower trays.`);
