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

    // If not found in pool, return a hard-coded technical item for known master parts or user-specified missing options
    if (!found) {
        if (artNr === MASTER_PARTS.SCHAUM) return [getTechnicalItem(artNr, "Montageschaum Alterna, Kartusche 400 ml")];
        if (artNr === MASTER_PARTS.SCHALLSCHUTZ) return [getTechnicalItem(artNr, "Schallschutzset Alterna - Stahl")];
        if (artNr === MASTER_PARTS.TAPE_200) return [getTechnicalItem(artNr, "Zargen- Wannendichtband Alterna, Länge 2 m")];
        if (artNr === MASTER_PARTS.TAPE_250) return [getTechnicalItem(artNr, "Zargen- Wannendichtband Alterna, Länge 2,5 m")];
        if (artNr === MASTER_PARTS.TAPE_340) return [getTechnicalItem(artNr, "Zargen- Wannendichtband Alterna, Länge 3,4 m")];
        
        const clean = cleanArtNr(artNr);
        if (clean === cleanArtNr('1313 281.100.184')) return [getTechnicalItem(artNr, "Ablaufdeckel KA 90, für 1313 271 / 272 / 273 Weiss Gleitschutz Secure Plus")];
        if (clean === cleanArtNr('1313 281.100.185')) return [getTechnicalItem(artNr, "Ablaufdeckel KA 90, für 1313 271 / 272 / 273 Weiss Gleitschutz Invisible Grip")];
        if (clean === cleanArtNr('1422 223.000.000')) return [getTechnicalItem(artNr, "Duschwannengarnitur Viega Tempoplex Plus, Ablauf Ø 90 mm, waagrecht, ohne Ablaufhaube")];
        if (clean === cleanArtNr('1422 221.000.000')) return [getTechnicalItem(artNr, "Duschwannengarnitur Viega Tempoplex, Ablauf Ø 90 mm, waagrecht, ohne Ablaufhaube")];
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

function getByKeyword(item, keywords) {
    return keywords.some(k => (item.label || '').toLowerCase().includes(k));
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

// --- 4. Modular Template Resolvers ---

function makeBidirectionalSiphonCover(siphons, deckels, hasIntegratedCover) {
    const deckelRules = buildDrainCoverRules(siphons, deckels);

    const optionalDeckels = [];
    if (deckels.length > 0) {
        if (hasIntegratedCover) {
            optionalDeckels.push({ artNr: 'none', label: 'Ohne (Standardabdeckung der Ablaufgarnitur nutzen)', type: 'Zubehör', menge: 0 });
        }
        optionalDeckels.push(...deckels);
    }

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

    const result = [];
    if (siphons.length > 0) {
        const hasDeckel = optionalDeckels.length > 0;
        result.push({
            id: 'mat_siphon',
            name: 'Ablaufgarnitur',
            options: siphons,
            dependsOn: hasDeckel ? 'mat_deckel' : undefined,
            optionRules: hasDeckel ? siphonRules : [],
            blockedMessage: 'Bitte zuerst Ablaufdeckel wählen.',
            noOptionsMessage: 'Keine kompatible Ablaufgarnitur gefunden.'
        });
    }

    if (optionalDeckels.length > 0) {
        const hasSiphon = siphons.length > 0;
        result.push({
            id: 'mat_deckel',
            name: 'Ablaufdeckel',
            options: optionalDeckels,
            dependsOn: hasSiphon ? 'mat_siphon' : undefined,
            optionRules: hasSiphon ? deckelRules : [],
            blockedMessage: 'Bitte zuerst Ablaufgarnitur wählen.',
            noOptionsMessage: 'Kein kompatibler Ablaufdeckel benötigt/verfügbar.'
        });
    }
    return result;
}

function ensureSealingTape(tray, mountingMaterials, scraped) {
    const [l, w] = getTrayDimensions(tray);
    const lbl = (tray.label || '').toLowerCase();
    const isSwissLine = lbl.includes('swiss line');
    
    if (isSwissLine) return mountingMaterials;

    let tapes = [];
    const lenL = l + w;
    const lenU = l + 2 * w;

    const getTapeArt = (len) => {
        if (len <= 200) return '1461 001.000.000';
        if (len <= 250) return '1461 002.000.000';
        if (len <= 280) return '1461 018.000.000';
        if (len <= 300) return '1461 003.000.000';
        if (len <= 340) return '1461 004.000.000';
        if (len <= 360) return '1461 005.000.000';
        if (len <= 380) return '1461 016.000.000';
        if (len <= 480) return '1461 006.000.000';
        return '1461 007.000.000';
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
    
    const sets = scraped.allScraped.filter(s => getByKeyword(s, ['montageset', 'einbauset', 'dichtset'])).filter(s => !isDichtband(s));
    if (sets.length > 0) {
        tapes.push(...sets);
    }
    
    if (tapes.length > 0) {
        mountingMaterials.push({ id: 'mat_tape', name: 'Zargen-Wannendichtband', options: tapes });
    }
    return mountingMaterials;
}

function resolveMiscAccessories(tray, mountingMaterials, scraped) {
    const assigned = new Set(mountingMaterials.flatMap(m => [...m.options.map(o => o.artNr), ...(m.bundle || []).map(b => b.artNr)]));
    const isTape = (item) => {
        const lbl = (item.label || '').toLowerCase();
        return lbl.includes('dichtband') || lbl.includes('wannenband') || lbl.includes('zargen');
    };
    const misc = scraped.allScraped.filter(item => !assigned.has(item.artNr) && !isPuKleber(item) && !isDrainCover(item) && !isDrainAssembly(item) && item.artNr !== '1461 015.000.000' && !isTape(item));
    if (misc.length > 0) {
        mountingMaterials.push({ id: 'mat_misc', name: 'Weiteres Zubehör', options: misc });
    }
    return mountingMaterials;
}

function resolveSchmidlinTemplate(tray, scraped) {
    const [l, w] = getTrayDimensions(tray);
    const mfr = (tray.manufacturer || '').toLowerCase();
    const lbl = (tray.label || '').toLowerCase();
    const mountingMaterials = [];
    
    const isSwissLine = lbl.includes('swiss line');
    const isSehrTief15 = lbl.includes('15 cm');
    const isViva = lbl.includes('viva');
    const isFloor = lbl.includes('floor');
    const isContura = lbl.includes('contura');
    
    if (isSehrTief15) {
        const siphons = byArtNr('1421 111.501.000');
        mountingMaterials.push({
            id: 'mat_siphon',
            name: 'Ablaufgarnitur (int. Siphon)',
            options: siphons
        });
    } else if (isSwissLine) {
        const siphons = byArtNr('1422 117.000.000');
        const deckels = ['1422 118.100.000', '1422 118.501.000'].flatMap(byArtNr);
        mountingMaterials.push(...makeBidirectionalSiphonCover(siphons, deckels, false));
    } else if (isFloor) {
        const siphons = byArtNr('1311 701.000.000');
        const deckels = [
            '1311 699.100.000', '1311 699.536.000', '1311 698.100.000', 
            '1311 698.501.000', '1311 699.100.186', '1311 699.100.181', 
            '1311 699.105.000', '1311 699.536.181', '1311 699.536.202'
        ].flatMap(byArtNr);
        deckels.sort((a, b) => (a.label || '').toLowerCase().includes(mfr) ? -1 : 1);
        mountingMaterials.push(...makeBidirectionalSiphonCover(siphons, deckels, false));
    } else if (isContura) {
        const siphons = byArtNr('1422 223.000.000');
        const deckels = [
            '1311 698.100.000', '1311 698.501.000', '1311 699.536.000',
            '1422 225.501.000'
        ].flatMap(byArtNr);
        deckels.sort((a, b) => {
            const cleanA = cleanArtNr(a.artNr);
            const cleanB = cleanArtNr(b.artNr);
            const target = cleanArtNr('1311 698.100.000');
            if (cleanA === target && cleanB !== target) return -1;
            if (cleanA !== target && cleanB === target) return 1;
            return 0;
        });
        mountingMaterials.push(...makeBidirectionalSiphonCover(siphons, deckels, false));
    } else if (isViva) {
        const siphons = byArtNr('1311 701.000.000');
        const deckels = [
            '1311 699.100.000', '1311 699.536.000', '1311 698.100.000', 
            '1311 698.501.000', '1311 699.100.186', '1311 699.100.181', 
            '1311 699.105.000', '1311 699.536.181', '1311 699.536.202'
        ].flatMap(byArtNr);
        deckels.sort((a, b) => (a.label || '').toLowerCase().includes(mfr) ? -1 : 1);
        mountingMaterials.push(...makeBidirectionalSiphonCover(siphons, deckels, false));
    } else {
        const siphons = [...byArtNr('1422 117.000.000'), ...byArtNr('1311 701.000.000')];
        const deckels = [
            '1422 118.100.000', '1422 118.501.000',
            '1311 699.100.000', '1311 699.536.000', '1311 698.100.000', 
            '1311 698.501.000', '1311 699.100.186', '1311 699.100.181', 
            '1311 699.105.000', '1311 699.536.181', '1311 699.536.202'
        ].flatMap(byArtNr);
        
        deckels.sort((a, b) => (a.label || '').toLowerCase().includes(mfr) ? -1 : 1);
        mountingMaterials.push(...makeBidirectionalSiphonCover(siphons, deckels, false));
    }
    
    if (!isSwissLine) {
        let frames = scraped.allScraped.filter(f => getByKeyword(f, ['rahmen', 'montagerahmen']))
            .filter(f => !isPuKleber(f) && !isMontageFoam(f) && !isSchallschutz(f));
            
        const sizedOmnia = findOmniaFrameForSchmidlin(l, w);
        if (sizedOmnia.length > 0) {
            frames = sizedOmnia;
        } else if (frames.length === 0) {
            const omnia = scraped.allScraped.filter(o => getByKeyword(o, ['omnia']) && (o.label || '').toLowerCase().includes('rahmen'));
            frames = omnia.length > 0 ? omnia : byArtNr('1435 105.000.000');
        }
        
        if (frames.length > 0) {
            const omniaFrameArtNrs = frames.filter(f => (f.label || '').toLowerCase().includes('omnia')).map(f => f.artNr);
            const bundleRules = [];
            if (omniaFrameArtNrs.length > 0) {
                const fussset = byArtNr(MASTER_PARTS.OMNIA_FUSSSET);
                if (fussset.length > 0) {
                    bundleRules.push({ optionArtNrs: omniaFrameArtNrs, bundle: fussset });
                }
            }
            mountingMaterials.push({ id: 'mat_frame', name: 'Montagerahmen System', options: frames, bundle: [], bundleRules });
        }
    }
    
    return mountingMaterials;
}

function resolveKaldeweiTemplate(tray, scraped) {
    const [l, w] = getTrayDimensions(tray);
    const maxSide = Math.max(l, w);
    const mfr = (tray.manufacturer || '').toLowerCase();
    const lbl = (tray.label || '').toLowerCase();
    const mountingMaterials = [];
    
    const isConoflat = lbl.includes('conoflat');
    const isCalima = lbl.includes('calima');
    const isSanidusch = lbl.includes('sanidusch');
    
    if (isSanidusch) {
        const siphons = byArtNr('1421 111.501.000');
        mountingMaterials.push({
            id: 'mat_siphon',
            name: 'Ablaufgarnitur (int. Siphon)',
            options: siphons
        });
    } else if (isConoflat) {
        const siphons = [...byArtNr('1313 274.000.000'), ...byArtNr('1313 276.000.000')];
        const deckels = [
            '1313 282.100.000', '1313 282.536.000', '1313 282.536.184'
        ].flatMap(byArtNr);
        mountingMaterials.push(...makeBidirectionalSiphonCover(siphons, deckels, false));
    } else if (isCalima) {
        const siphons = byArtNr('1313 277.501.000');
        const deckels = [
            '1313 284.100.185', '1313 284.535.185', '1313 284.536.185',
            '1313 284.146.185', '1313 284.157.185'
        ].flatMap(byArtNr);
        mountingMaterials.push(...makeBidirectionalSiphonCover(siphons, deckels, false));
    } else {
        const siphons = [...byArtNr('1313 271.501.000'), ...byArtNr('1313 273.501.000')];
        const deckels = [
            '1313 281.100.000', '1313 281.536.000', '1313 281.536.184',
            '1313 281.100.184', '1313 281.100.185'
        ].flatMap(byArtNr);
        mountingMaterials.push(...makeBidirectionalSiphonCover(siphons, deckels, true));
    }
    
    const foamMenge = (l >= 120 && w >= 120) ? 2 : 1;
    const foam = scraped.allScraped.filter(isMontageFoam).map(f => ({ ...f, menge: foamMenge }));
    if (foam.length === 0) {
        foam.push(...byArtNr(MASTER_PARTS.SCHAUM).map(f => ({ ...f, menge: foamMenge })));
    }
    const sound = scraped.allScraped.filter(isSchallschutz);
    if (sound.length === 0) {
        sound.push(...byArtNr(MASTER_PARTS.SCHALLSCHUTZ));
    }
    
    if (!isConoflat) {
        let carriers = scraped.allScraped.filter(c => getByKeyword(c, ['träger', 'wannenträger']))
            .filter(c => !isPuKleber(c) && !isMontageFoam(c) && !isSchallschutz(c));
        if (carriers.length === 0) {
            carriers = findCarriersForTray(tray);
        }
        if (carriers.length > 0) {
            mountingMaterials.push({
                id: 'mat_carrier',
                name: 'Wannenträger System',
                options: carriers,
                bundle: [...foam, ...sound]
            });
        }
    }
    
    let frames = [];
    if (!isCalima) {
        const frameArtNr = (l <= 120 && w <= 120) ? MASTER_PARTS.FR5300_SMALL : MASTER_PARTS.FR5300_LARGE;
        frames = byArtNr(frameArtNr);
    }
    
    if (frames.length > 0) {
        const frameBundle = [];
        if (maxSide > 90) {
            if (isConoflat) {
                frameBundle.push(...byArtNr(MASTER_PARTS.MAS_5315));
            } else {
                frameBundle.push(...byArtNr(MASTER_PARTS.MAS_5305));
            }
        }
        mountingMaterials.push({ id: 'mat_frame', name: 'Montagerahmen System', options: frames, bundle: frameBundle });
    }
    
    if (isCalima) {
        let stelz = scraped.allScraped.filter(s => getByKeyword(s, ['stelz', 'füsse', 'fuß']));
        const stelzOpts = stelz.length > 0 ? stelz : byArtNr('1314 366.000.000');
        mountingMaterials.push({ id: 'mat_stelz', name: 'Stelzfüsse System', options: stelzOpts });
    }
    
    const nivoduebel = scraped.allScraped.filter(i => i.artNr === MASTER_PARTS.NIVODUEBEL || getByKeyword(i, ['nivo', 'nivodübel', 'nivoduebel']));
    if (nivoduebel.length > 0) {
        mountingMaterials.push({ id: 'mat_nivoduebel', name: 'Nivodübel System', options: nivoduebel.map(n => ({ ...n, overrideMontageart: 'nivodübel' })) });
    }
    const wannenanker = scraped.allScraped.filter(i => i.artNr === MASTER_PARTS.WANNENANKER || getByKeyword(i, ['wannenanker']));
    if (wannenanker.length > 0) {
        mountingMaterials.push({ id: 'mat_wannenanker', name: 'Wannenanker System', options: wannenanker.map(w => ({ ...w, overrideMontageart: 'wannenanker' })) });
    }
    
    return mountingMaterials;
}

function resolveLaufenTemplate(tray, scraped) {
    const [l, w] = getTrayDimensions(tray);
    const lbl = (tray.label || '').toLowerCase();
    const isProS = lbl.includes('pro s');
    const mountingMaterials = [];
    
    if (isProS) {
        const siphons = byArtNr('1425 561.000.000');
        mountingMaterials.push({
            id: 'mat_siphon',
            name: 'Ablaufgarnitur (int. Deckel)',
            options: siphons
        });
    } else {
        const siphons = byArtNr('1171 405.000.000');
        mountingMaterials.push({
            id: 'mat_siphon',
            name: 'Ablaufgarnitur (int. Deckel)',
            options: siphons
        });
    }
    
    const frames = findIneoFramesForTray(l, w);
    if (frames.length > 0) {
        const sound = byArtNr(lbl.includes('pro s') ? '1311 200.000.000' : '1311 201.000.000');
        mountingMaterials.push({ id: 'mat_frame', name: 'Montagerahmen System', options: frames, bundle: sound });
    }
    
    return mountingMaterials;
}

function resolveDefaultTemplate(tray, scraped) {
    const [l, w] = getTrayDimensions(tray);
    const mfr = (tray.manufacturer || '').toLowerCase();
    const lbl = (tray.label || '').toLowerCase();
    
    const isEcoplan = lbl.includes('ecoplan');
    const isLoa = lbl.includes('loa');
    
    const mountingMaterials = [];
    
    const siphons = [];
    const deckels = [];
    
    siphons.push(...byArtNr('1422 117.000.000'));
    deckels.push(...['1422 118.100.000', '1422 118.501.000'].flatMap(byArtNr));
    
    if (isLoa) {
        siphons.push(...byArtNr('1311 701.000.000'));
        deckels.push(...[
            '1311 699.100.000', '1311 699.536.000', '1311 698.100.000', 
            '1311 698.501.000', '1311 699.100.186', '1311 699.100.181', 
            '1311 699.105.000', '1311 699.536.181', '1311 699.536.202'
        ].flatMap(byArtNr));
    }
    
    siphons.sort((a, b) => {
        const aMfr = (a.label || '').toLowerCase().includes(mfr);
        const bMfr = (b.label || '').toLowerCase().includes(mfr);
        if (aMfr && !bMfr) return -1;
        if (!aMfr && bMfr) return 1;
        return 0;
    });
    deckels.sort((a, b) => (a.label || '').toLowerCase().includes(mfr) ? -1 : 1);
    
    mountingMaterials.push(...makeBidirectionalSiphonCover(siphons, deckels, false));
    
    let carriers = [];
    if (isEcoplan || mfr.includes('alterna')) {
        carriers = scraped.allScraped.filter(c => getByKeyword(c, ['träger', 'wannenträger']))
            .filter(c => !isPuKleber(c) && !isMontageFoam(c) && !isSchallschutz(c));
        if (carriers.length === 0) {
            carriers = findCarriersForTray(tray);
        }
    }
    
    if (carriers.length > 0) {
        const foamMenge = (l >= 120 && w >= 120) ? 2 : 1;
        const foam = scraped.allScraped.filter(isMontageFoam).map(f => ({ ...f, menge: foamMenge }));
        if (foam.length === 0) {
            foam.push(...byArtNr(MASTER_PARTS.SCHAUM).map(f => ({ ...f, menge: foamMenge })));
        }
        const sound = scraped.allScraped.filter(isSchallschutz);
        if (sound.length === 0) {
            sound.push(...byArtNr(MASTER_PARTS.SCHALLSCHUTZ));
        }
        
        mountingMaterials.push({
            id: 'mat_carrier',
            name: 'Wannenträger System',
            options: carriers,
            bundle: [...foam, ...sound]
        });
    }
    
    return mountingMaterials;
}

function resolveTrayAccessories(tray) {
    const mfr = (tray.manufacturer || '').toLowerCase();
    const lbl = (tray.label || '').toLowerCase();
    const trayArtNrClean = cleanArtNr(tray.artNr);
    
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

    const allScrapedRaw = [
        ...scraped.ablaufdeckel, ...scraped.ablaufgarnitur, ...scraped.wannentraeger,
        ...scraped.montagerahmen, ...scraped.stelzfüsse, ...scraped.montageset,
        ...scraped.dichtband, ...scraped.montageschaum, ...scraped.schallschutz,
        ...scraped.others
    ];
    const uniqueScrapedMap = new Map();
    const trayPrefix = trayArtNrClean.substring(0, 8);

    allScrapedRaw.forEach(item => {
        const enrichedItem = enrichScrapedItem(item);
        const art = cleanArtNr(enrichedItem.artNr);
        const itemLbl = (enrichedItem.label || '').toLowerCase();

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
    
    const resolvedScraped = {
        ablaufdeckel: scraped.ablaufdeckel,
        ablaufgarnitur: scraped.ablaufgarnitur,
        allScraped: Array.from(uniqueScrapedMap.values())
    };

    let mountingMaterials = [];
    if (lbl.includes('swiss line')) {
        mountingMaterials = resolveSchmidlinTemplate(tray, resolvedScraped);
    } else if (mfr.includes('schmidlin') || lbl.includes('alterna loa')) {
        mountingMaterials = resolveSchmidlinTemplate(tray, resolvedScraped);
    } else if (mfr.includes('kaldewei')) {
        mountingMaterials = resolveKaldeweiTemplate(tray, resolvedScraped);
    } else if (mfr.includes('laufen')) {
        mountingMaterials = resolveLaufenTemplate(tray, resolvedScraped);
    } else {
        mountingMaterials = resolveDefaultTemplate(tray, resolvedScraped);
    }

    mountingMaterials = ensureSealingTape(tray, mountingMaterials, resolvedScraped);
    mountingMaterials = resolveMiscAccessories(tray, mountingMaterials, resolvedScraped);

    return mountingMaterials;
}

// --- 5. Main Execution ---

console.log('Injecting rules for Duschenwanne using Template Resolver...');

data.duschenwanne.trays.forEach(tray => {
    tray.mountingMaterials = resolveTrayAccessories(tray);
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
                    const mfr = (curTray.manufacturer || '').toLowerCase();
                    const lbl = (curTray.label || '').toLowerCase();
                    const isSchmidlinFloorOrContura = mfr.includes('schmidlin') && (lbl.includes('floor') || lbl.includes('contura'));
                    
                    if (isSchmidlinFloorOrContura) {
                        return;
                    }
                    
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
