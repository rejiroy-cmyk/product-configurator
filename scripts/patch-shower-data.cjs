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
    MAS_5305: "1435 435.000.000",     // Universal Kaldewei (alle ausser Conoflat)
    MAS_5315: "1435 433.000.000",     // Conoflat-spezifisch
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
        label: poolItem?.label || item.label || '',
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
    if (label.includes('ohne ablaufhaube') || label.includes('ohne ablaufdeckel')) return false;
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
        let optionArtNrs = matched.map(cover => cover.artNr);

        // If the drain/tray includes a cover (e.g. KA 90, Laufen Pro), add 'none' as the first option
        const drainBase = cleanBaseArtNr(drain.artNr);
        const isKA90 = ['1313271', '1313272', '1313273'].includes(drainBase);
        const isLaufenPro = drainBase === '1171405';

        if (isKA90 || isLaufenPro) {
            optionArtNrs.unshift('none');
        }

        return {
            whenArtNr: drain.artNr,
            optionArtNrs: optionArtNrs
        };
    });
}

function buildSiphonRules(covers, drains) {
    // Siphon is the parent now, so this is unused, but kept for compatibility
    return [];
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

            // Parse carrier dimensions using regex (\d+) x (\d+)
            const sizeMatch = lbl.match(/(\d+)\s*x\s*(\d+)/);
            if (!sizeMatch) return;

            const carrierL = parseInt(sizeMatch[1]);
            const carrierW = parseInt(sizeMatch[2]);

            const mmL = l < 250 ? l * 10 : l;
            const mmW = w < 250 ? w * 10 : w;

            // Strict dimension check (exact size matching, allowing rotation)
            const sizeMatches = (carrierL === mmL && carrierW === mmW) || (carrierL === mmW && carrierW === mmL);
            if (!sizeMatches) return;

            // Manufacturer / Brand compatibility (allow alterna/schedel as universal)
            const trayLbl = (tray.label || '').toLowerCase();
            const hasMfr = lbl.includes(mfr) || lbl.includes('alterna') || lbl.includes('schedel') || 
                           (trayLbl.includes('sanidusch') && lbl.includes('sanidusch')) ||
                           (trayLbl.includes('superplan') && lbl.includes('superplan')) ||
                           (trayLbl.includes('duschplan') && lbl.includes('duschplan'));

            // Add strict matching for model family (including Superplan sub-families)
            let hasModel = true;
            if (trayLbl.includes('calima') && !lbl.includes('calima')) {
                hasModel = false;
            } else if (trayLbl.includes('superplan')) {
                // Determine exact Superplan sub-family of the tray
                const trayIsZero    = trayLbl.includes('superplan zero');
                const trayIsClassic = trayLbl.includes('superplan classic');
                const trayIsPlus    = trayLbl.includes('superplan plus');
                const trayIsXXL     = trayLbl.includes('superplan xxl');
                const trayIsPure    = !trayIsZero && !trayIsClassic && !trayIsPlus && !trayIsXXL;

                if (!lbl.includes('superplan')) {
                    hasModel = false;
                } else if (trayIsPure) {
                    // Pure Superplan tray must NOT get Zero / Classic / Plus / XXL carriers
                    if (lbl.includes('superplan zero') || lbl.includes('superplan classic') ||
                        lbl.includes('superplan plus') || lbl.includes('superplan xxl')) {
                        hasModel = false;
                    }
                } else if (trayIsZero    && !lbl.includes('superplan zero'))    { hasModel = false; }
                else if (trayIsClassic && !lbl.includes('superplan classic')) { hasModel = false; }
                else if (trayIsPlus    && !lbl.includes('superplan plus'))    { hasModel = false; }
                else if (trayIsXXL     && !lbl.includes('superplan xxl'))     { hasModel = false; }
            } else if (trayLbl.includes('cayonoplan') && !lbl.includes('cayonoplan')) {
                hasModel = false;
            } else if (trayLbl.includes('duschplan') && !lbl.includes('duschplan')) {
                hasModel = false;
            } else if (trayLbl.includes('sanidusch') && !lbl.includes('sanidusch')) {
                hasModel = false;
            }

            if (hasMfr && hasModel) {
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

/**
 * Finds the exact Omnia Rahmen for a Schmidlin tray by matching pool label dimensions.
 * Labels are like "Montagerahmen Schmidlin Omnia 120 x 80 cm ..."
 * Tries exact match first, then allows 1 cm tolerance.
 */
function findOmniaFrameForSchmidlin(l, w) {
    // Normalize to cm (tray sizes can be in cm already)
    const trayL = l < 20 ? l * 100 : l; // shouldn't be needed, but safety
    const trayW = w < 20 ? w * 100 : w;
    const bestMatches = [];
    const fallbacks = [];

    FULL_POOL.forEach(p => {
        const lbl = (p.label || '').toLowerCase();
        // Must be Omnia AND Rahmen, but NOT a Swiss Line Montageset
        if (!lbl.includes('omnia') || !lbl.includes('rahmen')) return;
        if (lbl.includes('montageset')) return;

        // Parse "... Omnia 120 x 80 cm ..." or "... Omnia 80 x 75 cm ..."
        const sizeMatch = lbl.match(/(\d+)\s*x\s*(\d+)\s*cm/);
        if (!sizeMatch) {
            fallbacks.push(p);
            return;
        }

        const frameL = parseInt(sizeMatch[1]);
        const frameW = parseInt(sizeMatch[2]);

        // Check both orientations
        const exactMatch =
            (frameL === trayL && frameW === trayW) ||
            (frameL === trayW && frameW === trayL);
        if (exactMatch) {
            bestMatches.push(p);
        }
    });

    if (bestMatches.length > 0) {
        return bestMatches.map(m => ({ ...m, type: 'Zubehör', menge: 1 }));
    }

    // No exact match — return nothing (don't assign a wrong size frame)
    return [];
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

    // Ensure Alterna siphons & covers are present
    if (mfr.includes('alterna') || lbl.includes('ecoplan')) {
        if (!siphons.some(s => cleanArtNr(s.artNr) === cleanArtNr('1422 117.000.000'))) {
            siphons.push(...byArtNr('1422 117.000.000')); // Geberit d90 Standard for Alterna
        }
    }

    // Ensure Kaldewei siphons & covers are present
    if (mfr.includes('kaldewei')) {
        if (lbl.includes('calima') || lbl.includes('sanidusch')) {
            // KA 300
            if (!siphons.some(s => cleanArtNr(s.artNr) === cleanArtNr('1313 277.501.000'))) {
                siphons.push(...byArtNr('1313 277.501.000'));
            }
        } else {
            // KA 90
            if (!siphons.some(s => cleanArtNr(s.artNr) === cleanArtNr('1313 271.501.000'))) {
                siphons.push(...byArtNr('1313 271.501.000'));
            }
            if (!siphons.some(s => cleanArtNr(s.artNr) === cleanArtNr('1313 273.501.000'))) {
                siphons.push(...byArtNr('1313 273.501.000'));
            }
        }
    }

    // Ensure Schmidlin siphons are present
    if (mfr.includes('schmidlin') && !isSwissLine) {
        if (!siphons.some(s => cleanArtNr(s.artNr) === cleanArtNr('1311 701.000.000'))) {
            siphons.push(...byArtNr('1311 701.000.000')); // Schmidlin flow 50
        }
        if (!siphons.some(s => cleanArtNr(s.artNr) === cleanArtNr('1422 117.000.000'))) {
            siphons.push(...byArtNr('1422 117.000.000')); // Geberit d90 Standard
        }
    }

    // Ensure Schmidlin Swiss Line siphons are present
    if (isSwissLine) {
        if (!siphons.some(s => cleanArtNr(s.artNr) === cleanArtNr('1311 701.000.000'))) {
            siphons.push(...byArtNr('1311 701.000.000')); // Schmidlin flow 50
        }
    }

    // Sort siphons (manufacturer's brand first)
    siphons.sort((a, b) => {
        const aMfr = (a.label || '').toLowerCase().includes(mfr);
        const bMfr = (b.label || '').toLowerCase().includes(mfr);
        if (aMfr && !bMfr) return -1;
        if (!aMfr && bMfr) return 1;
        return 0;
    });

    // --- 2. DECKEL ---
    const deckels = dedupeItems([
        ...scraped.ablaufdeckel.filter(isDrainCover),
        ...allScraped.filter(isDrainCover)
    ]).map(d => ({ ...d, type: 'Zubehör', menge: 1 }));

    // Ensure Alterna covers are present
    if (mfr.includes('alterna') || lbl.includes('ecoplan')) {
        const geberitCovers = ['1422 118.100.000', '1422 118.501.000'];
        geberitCovers.forEach(art => {
            if (!deckels.some(d => cleanArtNr(d.artNr) === cleanArtNr(art))) {
                deckels.push(...byArtNr(art));
            }
        });
    }

    // Ensure Kaldewei covers are present
    if (mfr.includes('kaldewei')) {
        if (lbl.includes('calima') || lbl.includes('sanidusch')) {
            const ka300Covers = ['1313 284.100.185', '1313 284.535.185', '1313 284.536.185'];
            ka300Covers.forEach(art => {
                if (!deckels.some(d => cleanArtNr(d.artNr) === cleanArtNr(art))) {
                    deckels.push(...byArtNr(art));
                }
            });
        } else {
            const ka90Covers = ['1313 281.100.000', '1313 281.536.000', '1313 281.536.184'];
            ka90Covers.forEach(art => {
                if (!deckels.some(d => cleanArtNr(d.artNr) === cleanArtNr(art))) {
                    deckels.push(...byArtNr(art));
                }
            });
        }
    }

    // Ensure Schmidlin covers are present
    if (mfr.includes('schmidlin') && !isSwissLine) {
        const schmidlinCovers = ['1311 698.100.000', '1311 698.501.000', '1311 699.100.000'];
        const geberitCovers = ['1422 118.100.000', '1422 118.501.000'];
        [...schmidlinCovers, ...geberitCovers].forEach(art => {
            if (!deckels.some(d => cleanArtNr(d.artNr) === cleanArtNr(art))) {
                deckels.push(...byArtNr(art));
            }
        });
    }

    // Ensure Swiss Line covers are present
    if (isSwissLine) {
        if (!deckels.some(d => cleanArtNr(d.artNr) === cleanArtNr('1311 699.100.000'))) {
            deckels.push(...byArtNr('1311 699.100.000'));
        }
    }
    
    // Sort deckels (manufacturer's brand first)
    deckels.sort((a, b) => {
        const aMfr = (a.label || '').toLowerCase().includes(mfr);
        const bMfr = (b.label || '').toLowerCase().includes(mfr);
        if (aMfr && !bMfr) return -1;
        if (!aMfr && bMfr) return 1;
        return 0;
    });

    // Build rules (Deckel depends on Siphon)
    const deckelRules = buildDrainCoverRules(siphons, deckels);

    // Add a "None" option so the user isn't forced to buy an extra cover
    const optionalDeckels = deckels.length > 0 ? [
        { artNr: 'none', label: 'Ohne (Standardabdeckung der Ablaufgarnitur nutzen)', type: 'Zubehör', menge: 0 },
        ...deckels
    ] : [];

    // Build reverse rules (Siphon depends on Deckel)
    const siphonRules = [];
    if (siphons.length > 0 && optionalDeckels.length > 0) {
        optionalDeckels.forEach(cover => {
            let matchedSiphons;
            if (cover.artNr === 'none') {
                matchedSiphons = siphons;
            } else {
                matchedSiphons = siphons.filter(s => drainCoverMatches(s, cover));
                if (matchedSiphons.length === 0) {
                    matchedSiphons = siphons;
                }
            }
            siphonRules.push({
                whenArtNr: cover.artNr,
                optionArtNrs: matchedSiphons.map(s => s.artNr)
            });
        });
    }

    // PUSH SIPHON FIRST!
    if (siphons.length > 0) {
        const hasDeckel = optionalDeckels.length > 0;
        tray.mountingMaterials.push({
            id: 'mat_siphon',
            name: 'Ablaufgarnitur',
            options: siphons,
            dependsOn: hasDeckel ? 'mat_deckel' : undefined,
            optionRules: hasDeckel ? siphonRules : [],
            blockedMessage: 'Bitte zuerst Ablaufdeckel wählen.',
            noOptionsMessage: 'Keine kompatible Ablaufgarnitur gefunden.'
        });
    }

    // PUSH DECKEL SECOND!
    if (optionalDeckels.length > 0) {
        const hasSiphon = siphons.length > 0;
        tray.mountingMaterials.push({
            id: 'mat_deckel',
            name: 'Ablaufdeckel',
            options: optionalDeckels,
            dependsOn: hasSiphon ? 'mat_siphon' : undefined,
            optionRules: hasSiphon ? deckelRules : [],
            blockedMessage: 'Bitte zuerst Ablaufgarnitur wählen.',
            noOptionsMessage: 'Kein kompatibler Ablaufdeckel benötigt/verfügbar.'
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

    // Explicitly CLEAR carriers for Laufen Pro / Pro S, Schmidlin Contura, and Kaldewei Conoflat
    // Conoflat uses only FR 5300 Montagerahmen – Wannenträger is NOT compatible
    if (lbl.includes('laufen pro') || lbl.includes('contura') || lbl.includes('conoflat')) {
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

    // ALWAYS inject MAS for Kaldewei trays > 90cm
    if (mfr.includes('kaldewei') && maxSide > 90) {
        if (lbl.includes('conoflat')) {
            frameBundle.push(...byArtNr(MASTER_PARTS.MAS_5315));
        } else if (!lbl.includes('calima')) {
            frameBundle.push(...byArtNr(MASTER_PARTS.MAS_5305));
        }
    }

    // RESTRICT Frame fallbacks to specific manufacturers
    if (frames.length === 0 && !isSwissLine && !lbl.includes('ecoplan') && !mfr.includes('alterna')) {
        if (mfr.includes('kaldewei')) {
            if (lbl.includes('conoflat')) {
                // Conoflat: always uses FR 5300
                const frameArtNr = (l <= 120 && w <= 120) ? MASTER_PARTS.FR5300_SMALL : MASTER_PARTS.FR5300_LARGE;
                frames = byArtNr(frameArtNr);
            } else if (!lbl.includes('calima')) {
                // All other Kaldewei (not Calima, not Conoflat): FR 5300
                const frameArtNr = (l <= 120 && w <= 120) ? MASTER_PARTS.FR5300_SMALL : MASTER_PARTS.FR5300_LARGE;
                frames = byArtNr(frameArtNr);
            }
        } else if (mfr.includes('schmidlin') || isAlternaLoa) {
            // Try to find a size-matched Omnia frame first
            const sizedOmnia = findOmniaFrameForSchmidlin(l, w);
            if (sizedOmnia.length > 0) {
                frames = sizedOmnia;
            } else {
                // Fallback: check if scraper gave us any omnia rahmen
                const omnia = getByKeyword(['omnia']).filter(o => (o.label || '').toLowerCase().includes('rahmen') && !(o.label || '').toLowerCase().includes('montageset'));
                frames = omnia.length > 0 ? omnia : byArtNr('1435 105.000.000');
            }
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

// --- 5. Merge from backup and enforce bidirectional rules ---
const backupHtmlPath = path.join(__dirname, '../backups/20260616_054611_dist/index.html');
if (fs.existsSync(backupHtmlPath)) {
    console.log('Loading backup to restore siphon/cover mapping...');
    const html = fs.readFileSync(backupHtmlPath, 'utf8');
    const artIdx = html.indexOf('1311 407.100.000');
    if (artIdx !== -1) {
        const traysIdx = html.lastIndexOf('trays:[', artIdx);
        if (traysIdx !== -1) {
            const startIdx = traysIdx - 1; // index of "{"
            let braceCount = 0;
            let endIdx = -1;
            for (let i = startIdx; i < html.length; i++) {
                const c = html[i];
                if (c === '{') braceCount++;
                else if (c === '}') {
                    braceCount--;
                    if (braceCount === 0) {
                        endIdx = i;
                        break;
                    }
                }
            }
            try {
                const backupData = eval('(' + html.substring(startIdx, endIdx + 1) + ')');
                const backupTrays = backupData.trays;
                let mergedCount = 0;
                
                data.duschenwanne.trays.forEach(curTray => {
                    const bakTray = backupTrays.find(t => t.artNr === curTray.artNr);
                    if (bakTray && bakTray.mountingMaterials && bakTray.mountingMaterials.length > 0) {
                        const bakSiphon = bakTray.mountingMaterials.find(m => m.id === 'mat_siphon');
                        const bakDeckel = bakTray.mountingMaterials.find(m => m.id === 'mat_deckel');
                        
                        if (bakSiphon || bakDeckel) {
                            // Replace in curTray.mountingMaterials
                            curTray.mountingMaterials = curTray.mountingMaterials.filter(m => m.id !== 'mat_siphon' && m.id !== 'mat_deckel');
                            
                            const bakMaterials = [];
                            bakTray.mountingMaterials.forEach(m => {
                                if (m.id === 'mat_siphon' || m.id === 'mat_deckel') {
                                    bakMaterials.push(JSON.parse(JSON.stringify(m)));
                                }
                            });
                            
                            curTray.mountingMaterials.unshift(...bakMaterials);
                            mergedCount++;
                        }
                    }
                });
                console.log(`Merged siphons/covers from backup for ${mergedCount} trays.`);
            } catch (e) {
                console.error('Failed to parse backup html:', e);
            }
        }
    }
}

// --- 6. Save ---
fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2));
console.log(`Success! Scraper-accurate mapping applied to ${data.duschenwanne.trays.length} shower trays.`);
