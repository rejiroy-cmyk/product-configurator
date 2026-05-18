const fs = require('fs');
const path = require('path');

/**
 * SHOWER TRAY CONFIGURATOR v3 - MASTER PATCH SCRIPT
 *
 * Rules:
 * 1. BOM Order: Tray -> Deckel -> Siphon -> Tape -> Sealing -> Carrier/Frame -> Foam only ifWannenträger used -> Sound only ifWannenträger used
 * 2. Kaldewei: FR 5300 Frame + MAS if side > 90cm.
 * 3. Schmidlin: Omnia Frame + Fussset.
 * 4. Alterna loa: Schmidlin Omnia Frame.
 * 5. Laufen Pro/Pro S: Ineo Frame + Series Schallschutz.
 * 6. Calima: Stelzfüsse and Wannenträger.
 * 7. Swiss Line: Skip Frames/Feet (All-in-one).
 */

const DATA_PATH = path.join(__dirname, '../custom-data.json');
const SCRAPER_DATA_PATH = path.join(__dirname, '../st-scraper/duschenwanne-accessories.json');

// --- 1. Load Data ---
let data = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
let scraperResults = {};
if (fs.existsSync(SCRAPER_DATA_PATH)) {
    scraperResults = JSON.parse(fs.readFileSync(SCRAPER_DATA_PATH, 'utf8'));
}

const pool = data.zubehoer_pool;
const FULL_POOL = [
    ...(pool.trays || []),
    ...(pool.parts || []),
    ...(pool.finishes || []),
];

// --- 2. Master Part Library ---
// --- 2. Master Part Library ---
const MASTER_PARTS = {
    SCHAUM: "1441 791.000.000",
    SCHALLSCHUTZ: "1445 782.000.000",
    NIVODUEBEL: "1451 116.000.000",
    WANNENANKER: "1451 131.000.000",
    FR5300_SMALL: "1435 424.000.000", // bis 120x120
    FR5300_LARGE: "1435 428.000.000", // bis 150x180
    MAS_5305: "1435 435.000.000",
    OMNIA_FUSSSET: "1435 191.000.000",
    TAPE_200: "1461 001.000.000",
    TAPE_250: "1461 002.000.000",
    TAPE_340: "1461 004.000.000"
};

// --- 3. Helper Functions ---

function getTechnicalItem(artNr, label) {
    return {
        artNr: artNr,
        label: label,
        type: "Zubehör",
        imgUrl: `https://profishop.sanitastroesch.ch/multimedia/Web/PS1/0${artNr.replace(/\s/g, '').replace(/\./g, '')}.png`,
        menge: 1
    };
}

function byArtNr(artNr) {
    if (!artNr) return [];
    const found = findPoolItem(artNr);

    // If not found in pool, return a hard-coded technical item for known master parts
    if (!found) {
        if (artNr === MASTER_PARTS.SCHAUM) return [getTechnicalItem(artNr, "Montageschaum Alterna, Kartusche 400 ml")];
        if (artNr === MASTER_PARTS.SCHALLSCHUTZ) return [getTechnicalItem(artNr, "Schallschutzset Alterna - Stahl")];
        if (artNr === MASTER_PARTS.TAPE_200) return [getTechnicalItem(artNr, "Zargen- Wannendichtband Alterna, Länge 2 m")];
        if (artNr === MASTER_PARTS.TAPE_250) return [getTechnicalItem(artNr, "Zargen- Wannendichtband Alterna, Länge 2,5 m")];
        if (artNr === MASTER_PARTS.TAPE_340) return [getTechnicalItem(artNr, "Zargen- Wannendichtband Alterna, Länge 3,4 m")];
        return [];
    }

    return [{
        artNr: found.artNr,
        label: found.label,
        type: "Zubehör",
        imgUrl: found.imgUrl,
        menge: 1
    }];
}

function cleanArtNr(artNr) {
    return (artNr || '').replace(/[^0-9]/g, '');
}

function findPoolItem(artNr) {
    const cleanSearch = cleanArtNr(artNr);
    return FULL_POOL.find(p => cleanArtNr(p.artNr) === cleanSearch);
}

function enrichScrapedItem(item) {
    const poolItem = findPoolItem(item.artNr);
    return {
        ...item,
        label: item.label || poolItem?.label || '',
        imgUrl: item.imgUrl || poolItem?.imgUrl,
        type: 'Zubehör',
        menge: 1
    };
}

function cleanBaseArtNr(artNr) {
    return cleanArtNr(artNr).slice(0, 7);
}

function dedupeItems(items) {
    const seen = new Set();
    return items.filter(item => {
        const key = cleanArtNr(item.artNr);
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
    });
}

function startsWithAny(label, prefixes) {
    return prefixes.some(prefix => label.startsWith(prefix));
}

function isDrainAssembly(item) {
    const label = (item.label || '').toLowerCase();
    return startsWithAny(label, [
        'ablaufgarnitur',
        'duschwannengarnitur',
        'duschwannenablauf',
        'duschwannen-ablauf'
    ]) || label.includes('siphon') || label.includes('sifon') || label.includes('geruchverschluss');
}

function isDrainCover(item) {
    const label = (item.label || '').toLowerCase();
    if (startsWithAny(label, ['duschwannengarnitur', 'ablaufgarnitur', 'duschwannenablauf', 'duschwannen-ablauf'])) return false;
    return label.includes('ablaufdeckel') || label.includes('ablaufhaube') || label.includes('ablaufabdeckung');
}

function drainNeedsCover(item) {
    const label = (item.label || '').toLowerCase();
    return label.includes('ohne ablaufdeckel') || label.includes('ohne ablaufhaube') || label.includes('ohne ablaufabdeckung');
}

function drainIncludesCover(item) {
    const label = (item.label || '').toLowerCase();
    if (drainNeedsCover(item)) return false;
    return label.includes('mit ablaufdeckel')
        || label.includes('ablaufdeckel')
        || label.includes('mit ablaufhaube')
        || label.includes('ablaufhaube')
        || label.includes('mit ablaufabdeckung')
        || label.includes('ablaufabdeckung');
}

function isPuKleber(item) {
    const label = (item.label || '').toLowerCase();
    return cleanArtNr(item.artNr) === cleanArtNr('1441 792.000.000') || (label.includes('pu') && label.includes('kleber'));
}

function isMontageFoam(item) {
    const label = (item.label || '').toLowerCase();
    return label.includes('montageschaum') || (label.includes('schaum') && !isPuKleber(item));
}

function isDichtband(item) {
    const label = (item.label || '').toLowerCase();
    return label.includes('dichtband') || label.includes('wannenband') || label.includes('zargen');
}

function isSchallschutz(item) {
    const label = (item.label || '').toLowerCase();
    return !isDichtband(item) && (label.includes('schallschutz') || label.includes('schallschutzset') || label.includes('schall-set'));
}

function drainCoverMatches(drain, cover) {
    const drainLabel = (drain.label || '').toLowerCase();
    const coverLabel = (cover.label || '').toLowerCase();
    const coverDigits = cleanArtNr(cover.label || '');
    const drainBase = cleanBaseArtNr(drain.artNr);
    const coverBase = cleanBaseArtNr(cover.artNr);

    if (drainBase && coverDigits.includes(drainBase)) return true;
    if (drainBase === '1422117' && coverBase === '1422118') return true;
    if (drainBase === '1422221' && coverBase === '1422225') return true;
    if (drainBase === '1311701' && (coverBase === '1311698' || coverBase === '1311699')) return true;
    if (['1313271', '1313272', '1313273'].includes(drainBase) && coverBase === '1313281') return true;
    if (['1313277', '1313278'].includes(drainBase) && coverBase === '1313284') return true;
    if (drainBase === '1313274' && coverBase === '1313282') return true;
    if (drainBase === '1171405' && (coverBase === '1171403' || coverBase === '1171404')) return true;

    if (drainLabel.includes('tempoplex') && coverLabel.includes('tempoplex')) return true;
    if (drainLabel.includes('flow') && (coverLabel.includes('flow') || coverLabel.includes('schmidlin'))) return true;
    if (drainLabel.includes('ka 90') && coverLabel.includes('ka 90')) return true;
    if (drainLabel.includes('ka 120') && (coverLabel.includes('ka120') || coverLabel.includes('ka 120'))) return true;
    if (drainLabel.includes('laufen pro') && coverLabel.includes('ablaufabdeckung laufen pro')) return true;

    return false;
}

function buildDrainCoverRules(drains, covers) {
    if (drains.length === 0 || covers.length === 0) return [];

    return drains.map(drain => {
        let matched = covers.filter(cover => drainCoverMatches(drain, cover));
        if (matched.length === 0 && drainNeedsCover(drain)) matched = covers;
        if (drainIncludesCover(drain)) matched = [];

        return {
            whenArtNr: drain.artNr,
            optionArtNrs: matched.map(cover => cover.artNr)
        };
    });
}

function getTrayDimensions(tray) {
    if (!tray.size) return [0, 0];
    const parts = tray.size.split('x').map(p => parseFloat(p.trim()));
    return [parts[0] || 0, parts[1] || 0];
}

/**
 * Logic 1: Deep scan carrier descriptions
 */
function findCarriersForTray(tray) {
    const results = [];
    const [l, w] = getTrayDimensions(tray);
    const mfr = (tray.manufacturer || '').toLowerCase();

    // Check scraper results first
    if (scraperResults[tray.artNr] && scraperResults[tray.artNr].wannentraeger) {
        scraperResults[tray.artNr].wannentraeger.forEach(c => {
            if ((c.label || '').toLowerCase().includes('badewannenträger')) return;
            results.push({
                artNr: c.artNr,
                label: c.label || "Wannenträger",
                imgUrl: c.imgUrl,
                type: "wannenträger",
                menge: 1
            });
        });
    }

    // fallback: scan pool for name/size matches
    if (results.length === 0) {
        FULL_POOL.forEach(p => {
            const lbl = (p.label || '').toLowerCase();
            if (!lbl.includes('träger') || lbl.includes('badewannenträger')) return;

            // Check if it mentions the tray dimensions (e.g. 1600 x 1000)
            const mmL = l < 250 ? l * 10 : l;
            const mmW = w < 250 ? w * 10 : w;

            const hasSize = lbl.includes(mmL.toString()) && lbl.includes(mmW.toString());
            const hasMfr = lbl.includes(mfr);

            // Add strict matching for model family
            const trayLbl = (tray.label || '').toLowerCase();
            let hasModel = true;
            if (trayLbl.includes('calima') && !lbl.includes('calima')) hasModel = false;
            else if (trayLbl.includes('superplan') && !lbl.includes('superplan')) hasModel = false;
            else if (trayLbl.includes('cayonoplan') && !lbl.includes('cayonoplan')) hasModel = false;
            else if (trayLbl.includes('duschplan') && !lbl.includes('duschplan')) hasModel = false;

            if (hasSize && hasMfr && hasModel) {
                results.push({
                    artNr: p.artNr,
                    label: p.label,
                    imgUrl: p.imgUrl,
                    type: "wannenträger",
                    menge: 1
                });
            }
        });
    }

    return results;
}

function findIneoFramesForTray(l, w) {
    const l_mm = l < 250 ? l * 10 : l;
    const w_mm = w < 250 ? w * 10 : w;
    const max_mm = Math.max(l_mm, w_mm);
    const min_mm = Math.min(l_mm, w_mm);

    const matches = [];
    FULL_POOL.forEach(p => {
        const lbl = (p.label || '').toLowerCase();
        if (!lbl.includes('ineo') || !lbl.includes('rahmen')) return;

        let lMin=0, lMax=0, wMin=0, wMax=0;
        const match1 = lbl.match(/(\d+)\s*-\s*(\d+)\s*x\s*(\d+)\s*-\s*(\d+)/);
        if (match1) {
            lMin = parseInt(match1[1]); lMax = parseInt(match1[2]);
            wMin = parseInt(match1[3]); wMax = parseInt(match1[4]);
            const realLMin = Math.max(lMin, wMin); const realLMax = Math.max(lMax, wMax);
            const realWMin = Math.min(lMin, wMin); const realWMax = Math.min(lMax, wMax);
            if (max_mm >= realLMin && max_mm <= realLMax && min_mm >= realWMin && min_mm <= realWMax) {
                matches.push(p);
            }
        } else {
            const wMatch = lbl.match(/breite (\d+) mm/);
            if (wMatch) { wMin = wMax = parseInt(wMatch[1]); }
            const lMatch = lbl.match(/länge.*?(\d+)\s*-\s*(\d+)\s*mm/);
            if (lMatch) { lMin = parseInt(lMatch[1]); lMax = parseInt(lMatch[2]); }
            if (max_mm >= lMin && max_mm <= lMax && min_mm >= wMin && min_mm <= wMax) {
                matches.push(p);
            }
        }
    });

    return matches.map(m => ({ ...m, type: "Zubehör", menge: 1 }));
}

// --- 4. Main Execution ---

console.log('Injecting rules for Duschenwanne...');

data.duschenwanne.trays.forEach(tray => {
    const [l, w] = getTrayDimensions(tray);
    const maxSide = Math.max(l, w);
    const mfr = (tray.manufacturer || '').toLowerCase();
    const lbl = (tray.label || '').toLowerCase();
    const trayArtNrClean = cleanArtNr(tray.artNr);
    const isSwissLine = lbl.includes('swiss line');
    const isCalima = lbl.includes('calima');
    const isAlternaLoa = lbl.includes('alterna loa');

    const rawScraped = scraperResults[tray.artNr] || {};
    const scraped = {
        ablaufdeckel: rawScraped.ablaufdeckel || [],
        ablaufgarnitur: rawScraped.ablaufgarnitur || [],
        wannentraeger: rawScraped.wannentraeger || [],
        montagerahmen: rawScraped.montagerahmen || [],
        stelzfüsse: rawScraped.stelzfüsse || [],
        montageset: rawScraped.montageset || [],
        dichtband: rawScraped.dichtband || [],
        montageschaum: rawScraped.montageschaum || [],
        schallschutz: rawScraped.schallschutz || [],
        others: rawScraped.others || []
    };

    // Gather and deduplicate all scraped items (excluding the tray and its variants)
    const allScrapedRaw = [
        ...scraped.ablaufdeckel, ...scraped.ablaufgarnitur, ...scraped.wannentraeger,
        ...scraped.montagerahmen, ...scraped.stelzfüsse, ...scraped.montageset,
        ...scraped.dichtband, ...scraped.montageschaum, ...scraped.schallschutz,
        ...scraped.others
    ];
    const uniqueScrapedMap = new Map();
    const trayPrefix = trayArtNrClean.substring(0, 8); // e.g., "1313 453" -> "1313 453"

    allScrapedRaw.forEach(item => {
        const enrichedItem = enrichScrapedItem(item);
        const art = cleanArtNr(enrichedItem.artNr);
        const itemLbl = (enrichedItem.label || '').toLowerCase();

        // CRITICAL FILTER: Exclude the tray itself, any variants (same prefix), and anything labeled as a "Duschwanne" unless it is a "Träger" or "Rahmen"
        const isActuallyATray = itemLbl.startsWith('duschwanne')
            && !itemLbl.includes('träger')
            && !itemLbl.includes('rahmen')
            && !itemLbl.includes('siphon')
            && !itemLbl.includes('ablauf')
            && !itemLbl.includes('garnitur');
        const isVariant = art.startsWith(trayPrefix);

        if (art && art !== trayArtNrClean && !isVariant && !isActuallyATray && !uniqueScrapedMap.has(art)) {
            uniqueScrapedMap.set(art, enrichedItem);
        }
    });
    const allScraped = Array.from(uniqueScrapedMap.values());

    const getByKeyword = (keywords) => allScraped.filter(i => keywords.some(k => (i.label || '').toLowerCase().includes(k)));

    tray.mountingMaterials = [];

    // --- 1. SIPHON ---
    const siphons = dedupeItems([
        ...scraped.ablaufgarnitur.filter(isDrainAssembly),
        ...allScraped.filter(isDrainAssembly)
    ]).map(s => ({ ...s, type: 'Zubehör', menge: 1 }));

    // Sort to make Geberit the default option
    siphons.sort((a, b) => {
        const aGeberit = (a.label || '').toLowerCase().includes('geberit');
        const bGeberit = (b.label || '').toLowerCase().includes('geberit');
        if (aGeberit && !bGeberit) return -1;
        if (!aGeberit && bGeberit) return 1;
        return 0;
    });

    // Fallback for Alterna/ecoplan siphons if not in scraper
    if (siphons.length === 0 && (mfr.includes('alterna') || lbl.includes('ecoplan'))) {
        siphons.push(...byArtNr('1422 117.000.000')); // Geberit d90 Standard for Alterna
    }

    // Fallback for Kaldewei Calima siphons
    if (siphons.length === 0 && mfr.includes('kaldewei') && lbl.includes('calima')) {
        siphons.push(...byArtNr('1313 277.501.000')); // KA 300
    }

    if (siphons.length > 0) {
        tray.mountingMaterials.push({
            id: 'mat_siphon',
            name: 'Ablaufgarnitur',
            options: siphons
        });
    }

    // --- 2. DECKEL ---
    const deckels = dedupeItems([
        ...scraped.ablaufdeckel.filter(isDrainCover),
        ...allScraped.filter(isDrainCover)
    ]).map(d => ({ ...d, type: 'Zubehör', menge: 1 }));
    const drainCoverRules = buildDrainCoverRules(siphons, deckels);
    const filteredDeckels = drainCoverRules.length > 0
        ? deckels.filter(deckel => drainCoverRules.some(rule => rule.optionArtNrs.includes(deckel.artNr)))
        : deckels;

    filteredDeckels.sort((a, b) => {
        const aGeberit = (a.label || '').toLowerCase().includes('geberit');
        const bGeberit = (b.label || '').toLowerCase().includes('geberit');
        if (aGeberit && !bGeberit) return -1;
        if (!aGeberit && bGeberit) return 1;
        return 0;
    });

    // If the tray description says the Ablaufabdeckung is included, don't inject another one
    if (lbl.includes('ablaufabdeckung') || lbl.includes('inkl. ablaufdeckel') || lbl.includes('ablaufdeckel edelstahl lackiert in wannenfarbe')) {
        filteredDeckels.length = 0;
    }

    if (filteredDeckels.length > 0) {
        tray.mountingMaterials.push({
            id: 'mat_deckel',
            name: 'Ablaufdeckel',
            options: filteredDeckels,
            dependsOn: siphons.length > 0 ? 'mat_siphon' : undefined,
            optionRules: drainCoverRules,
            blockedMessage: 'Bitte zuerst Ablaufgarnitur wählen.',
            noOptionsMessage: 'Für die gewählte Ablaufgarnitur ist kein separater Ablaufdeckel nötig.'
        });
    }

    // --- 3. TAPE ---
    // Ignore scraped tapes to enforce L-Variante and U-Variante length calculation
    let tapes = [];
    if (!isSwissLine) {
        // Calculate L-Variante (2 sided) and U-Variante (3 sided) lengths
        const lenL = l + w;
        const lenU = l + 2 * w; // assuming w is the short side

        const getTapeArt = (len) => {
            if (len <= 200) return '1461 001.000.000'; // 2m
            if (len <= 250) return '1461 002.000.000'; // 2.5m
            if (len <= 280) return '1461 018.000.000'; // 2.8m
            if (len <= 300) return '1461 003.000.000'; // 3m
            if (len <= 340) return '1461 004.000.000'; // 3.4m
            if (len <= 360) return '1461 005.000.000'; // 3.6m
            if (len <= 380) return '1461 016.000.000'; // 3.8m
            if (len <= 480) return '1461 006.000.000'; // 4.8m
            return '1461 007.000.000'; // 6m
        };

        const tapeLArt = getTapeArt(lenL);
        const tapeUArt = getTapeArt(lenU);

        if (tapeLArt === tapeUArt) {
            tapes.push(...byArtNr(tapeLArt).map(t => ({ 
                ...t, 
                label: t.label + " (für L- und U-Variante geeignet)", 
                type: 'Zubehör', menge: 1 
            })));
        } else {
            tapes.push(...byArtNr(tapeLArt).map(t => ({ 
                ...t, 
                label: t.label + " (L-Variante / 2-seitig)", 
                type: 'Zubehör', menge: 1 
            })));
            tapes.push(...byArtNr(tapeUArt).map(t => ({ 
                ...t, 
                label: t.label + " (U-Variante / 3-seitig)", 
                type: 'Zubehör', menge: 1 
            })));
        }
    }
    if (tapes.length > 0) {
        tray.mountingMaterials.push({ id: 'mat_tape', name: 'Zargen-Wannendichtband', options: tapes });
    }

    // --- 4. SEALING / MONTAGESET ---
    const sets = getByKeyword(['montageset', 'einbauset', 'dichtset']).filter(s => !tapes.some(t => t.artNr === s.artNr));
    if (sets.length > 0) {
        // If we found sets, add them to the tape category or similar, but the user wants to remove Step 5.
        // I will add them to the Tape category options to avoid a separate step.
        tapes.push(...sets);
    }

    // --- 5. TECHNICAL BUNDLE (Foam, Sound) ---
    const nivoduebel = allScraped.filter(i => {
        const itemLabel = (i.label || '').toLowerCase();
        return i.artNr === MASTER_PARTS.NIVODUEBEL || itemLabel.includes('nivo') || itemLabel.includes('nivodübel') || itemLabel.includes('nivoduebel');
    });
    const wannenanker = allScraped.filter(i => {
        const itemLabel = (i.label || '').toLowerCase();
        return i.artNr === MASTER_PARTS.WANNENANKER || itemLabel.includes('wannenanker');
    });
    const separateMountArtNrs = new Set([...nivoduebel, ...wannenanker].map(i => i.artNr));
    
    // Foam quantity rule: 2 if both sides >= 120 (meaning minSide >= 120) or maxSide >= 120? 
    // Usually if l >= 120 or w >= 120 it takes 2. I'll use l >= 120 || w >= 120 ? 2 : 1.
    // The user said "dimensions of both side are 120 cm or larger" -> l >= 120 && w >= 120.
    const foamMenge = (l >= 120 && w >= 120) ? 2 : 1;
    
    const foam = allScraped.filter(isMontageFoam).map(f => ({ ...f, menge: foamMenge }));
    const sound = allScraped.filter(isSchallschutz)
        .filter(s => !separateMountArtNrs.has(s.artNr));

    // Fallback for mandatory Foam/Sound if not in scraper
    if (foam.length === 0 && !isSwissLine) {
        foam.push(...byArtNr(MASTER_PARTS.SCHAUM).map(f => ({ ...f, menge: foamMenge })));
    }
    const isMineralCast = lbl.includes('mineralguss') || lbl.includes('marbond') || lbl.includes('pro s') || lbl.includes('pro n') || (mfr.includes('laufen') && lbl.includes('pro'));

    if (sound.length === 0 && !isSwissLine) {
        if (mfr.includes('laufen') && lbl.includes('pro')) {
            sound.push(...byArtNr(lbl.includes('pro s') ? '1311 200.000.000' : '1311 201.000.000'));
        } else if (!isMineralCast) {
            sound.push(...byArtNr(MASTER_PARTS.SCHALLSCHUTZ));
        }
    }

    // --- 6. CARRIER SYSTEM (Only for Ecoplan/Alterna or if Scraped) ---
    let carriers = getByKeyword(['träger', 'wannenträger'])
        .filter(c => !isPuKleber(c) && !foam.some(f => f.artNr === c.artNr) && !sound.some(s => s.artNr === c.artNr) && !(c.label || '').toLowerCase().includes('badewannenträger'));
        
    if (carriers.length === 0) {
        carriers = findCarriersForTray(tray);
    }

    // Explicitly CLEAR carriers for Laufen Pro / Pro S and Schmidlin Contura, as they only use specific frames
    if (lbl.includes('laufen pro') || lbl.includes('contura')) {
        carriers = [];
    }
    
    if (carriers.length > 0) {
        tray.mountingMaterials.push({
            id: 'mat_carrier',
            name: 'Wannenträger System',
            options: carriers,
            bundle: [...foam, ...sound]
        });
    }

    // --- 7. FRAME SYSTEM (Manufacturer Specific) ---
    let frames = getByKeyword(['rahmen', 'montagerahmen'])
        .filter(f => !isPuKleber(f) && !foam.some(fo => fo.artNr === f.artNr) && !sound.some(s => s.artNr === f.artNr) && !carriers.some(c => c.artNr === f.artNr));
    // Montagerahmen always have acoustic isolation integrated in their feet, so no need for Schallschutzset
    const frameBundle = [];

    // Explicitly CLEAR frames for Ecoplan since it only supports Wannenträger
    if (lbl.includes('ecoplan')) {
        frames = [];
    }

    // Laufen Pro / Pro S only use Ineo frames
    if (lbl.includes('laufen pro')) {
        frames = frames.filter(f => (f.label || '').toLowerCase().includes('ineo'));
    }

    // Schmidlin Contura only uses Omnia frames
    if (lbl.includes('contura') && mfr.includes('schmidlin')) {
        frames = frames.filter(f => (f.label || '').toLowerCase().includes('omnia'));
        // We'll let it use the existing scraped frames if any, otherwise it falls back to whatever was matched
    }

    // RESTRICT Frame fallbacks to specific manufacturers
    if (frames.length === 0 && !isSwissLine && !lbl.includes('ecoplan') && !mfr.includes('alterna')) {
        if (mfr.includes('kaldewei')) {
            if (!lbl.includes('calima') && !lbl.includes('cona')) {
                const frameArtNr = (l <= 120 && w <= 120) ? MASTER_PARTS.FR5300_SMALL : MASTER_PARTS.FR5300_LARGE;
                frames = byArtNr(frameArtNr);
                if (maxSide > 90) frameBundle.push(...byArtNr(MASTER_PARTS.MAS_5305));
            }
        } else if (mfr.includes('schmidlin') || isAlternaLoa) {
            const omnia = getByKeyword(['omnia']).filter(o => o.label.toLowerCase().includes('rahmen'));
            frames = omnia.length > 0 ? omnia : byArtNr('1435 105.000.000');
        } else if (mfr.includes('laufen') && (lbl.includes('pro') || lbl.includes('pro s'))) {
            frames = findIneoFramesForTray(l, w);
        }
    }

    if (frames.length > 0) {
        const omniaFrameArtNrs = frames
            .filter(frame => (frame.label || '').toLowerCase().includes('omnia'))
            .map(frame => frame.artNr);
        const bundleRules = [];
        if (omniaFrameArtNrs.length > 0) {
            const fussset = byArtNr(MASTER_PARTS.OMNIA_FUSSSET);
            if (fussset.length > 0) {
                bundleRules.push({ optionArtNrs: omniaFrameArtNrs, bundle: fussset });
            }
        }
        tray.mountingMaterials.push({ id: 'mat_frame', name: 'Montagerahmen System', options: frames, bundle: frameBundle, bundleRules });
    }

    // --- 8. STELZFÜSSE (Special for Calima) ---
    const stelz = getByKeyword(['stelz', 'füsse', 'fuß']);
    if (stelz.length > 0 || isCalima) {
        const stelzOpts = stelz.length > 0 ? stelz : byArtNr('1314 366.000.000');
        tray.mountingMaterials.push({ id: 'mat_stelz', name: 'Stelzfüsse System', options: stelzOpts });
    }

    // --- 9. SEPARATE MOUNTING METHODS ---
    if (nivoduebel.length > 0) {
        tray.mountingMaterials.push({
            id: 'mat_nivoduebel',
            name: 'Nivodübel System',
            options: nivoduebel.map(n => ({ ...n, overrideMontageart: 'nivodübel' }))
        });
    }

    if (wannenanker.length > 0) {
        tray.mountingMaterials.push({
            id: 'mat_wannenanker',
            name: 'Wannenanker System',
            options: wannenanker.map(w => ({ ...w, overrideMontageart: 'wannenanker' }))
        });
    }

    // --- 10. MISC ---
    const assigned = new Set(tray.mountingMaterials.flatMap(m => [...m.options.map(o => o.artNr), ...(m.bundle || []).map(b => b.artNr)]));
    const isTape = (item) => {
        const lbl = (item.label || '').toLowerCase();
        return lbl.includes('dichtband') || lbl.includes('wannenband') || lbl.includes('zargen');
    };
    const misc = allScraped.filter(item => !assigned.has(item.artNr) && !isPuKleber(item) && !isDrainCover(item) && !isDrainAssembly(item) && item.artNr !== '1461 015.000.000' && !isTape(item));
    if (misc.length > 0) {
        tray.mountingMaterials.push({ id: 'mat_misc', name: 'Weiteres Zubehör', options: misc });
    }
});

// --- 5. Save ---
fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2));
console.log(`Success! Scraper-accurate mapping applied to ${data.duschenwanne.trays.length} shower trays.`);
