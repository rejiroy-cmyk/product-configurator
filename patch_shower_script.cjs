const fs = require('fs');
const file = 'scripts/patch-shower-data.cjs';
let content = fs.readFileSync(file, 'utf8');

// 1. Add buildSiphonRules function right after buildDrainCoverRules
const addBuildSiphonRules = `
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

function buildSiphonRules(covers, drains) {
    if (drains.length === 0 || covers.length === 0) return [];

    return covers.map(cover => {
        let matched = drains.filter(drain => drainCoverMatches(drain, cover));
        if (matched.length === 0) {
            matched = drains.filter(drain => !drainIncludesCover(drain));
            if (matched.length === 0) matched = drains;
        }

        return {
            whenArtNr: cover.artNr,
            optionArtNrs: matched.map(drain => drain.artNr)
        };
    });
}
`;

content = content.replace(/function buildDrainCoverRules[\s\S]*?\}\n/, addBuildSiphonRules);

// 2. Rewrite the SIPHON and DECKEL injection logic
// We need to swap the order of pushing to tray.mountingMaterials.
// Deckel first, then Siphon.
// Wait, the logic is:
//     // --- 1. SIPHON --- (does siphons gathering)
//     ... (does NOT push yet)
//     // --- 2. DECKEL --- (does deckels gathering)
//     ... (push Deckel)
//     ... (push Siphon)

const oldInjectionLogic = `
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
`;

const newInjectionLogic = `
    // --- 2. DECKEL ---
    const deckels = dedupeItems([
        ...scraped.ablaufdeckel.filter(isDrainCover),
        ...allScraped.filter(isDrainCover)
    ]).map(d => ({ ...d, type: 'Zubehör', menge: 1 }));
    
    // Sort deckels
    deckels.sort((a, b) => {
        const aGeberit = (a.label || '').toLowerCase().includes('geberit');
        const bGeberit = (b.label || '').toLowerCase().includes('geberit');
        if (aGeberit && !bGeberit) return -1;
        if (!aGeberit && bGeberit) return 1;
        return 0;
    });

    // Build reverse rules (Siphon depends on Deckel)
    const siphonRules = buildSiphonRules(deckels, siphons);
    
    let finalDeckels = deckels;
    
    // If the tray description says the Ablaufabdeckung is included, don't inject another one
    if (lbl.includes('ablaufabdeckung') || lbl.includes('inkl. ablaufdeckel') || lbl.includes('ablaufdeckel edelstahl lackiert in wannenfarbe')) {
        finalDeckels = [];
    }

    // PUSH DECKEL FIRST!
    if (finalDeckels.length > 0) {
        tray.mountingMaterials.push({
            id: 'mat_deckel',
            name: 'Ablaufdeckel',
            options: finalDeckels
        });
    }

    // PUSH SIPHON SECOND!
    if (siphons.length > 0) {
        const hasDeckel = finalDeckels.length > 0;
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
`;

// Try replacing
if (content.includes("id: 'mat_siphon',") && content.includes("id: 'mat_deckel',")) {
    const safeRegex = /if\s*\(siphons\.length\s*>\s*0\)\s*\{\s*tray\.mountingMaterials\.push\(\{[\s\S]*?noOptionsMessage:\s*'Für die gewählte Ablaufgarnitur ist kein separater Ablaufdeckel nötig\.'\s*\}\);\s*\}/;
    content = content.replace(safeRegex, newInjectionLogic.trim());
}

fs.writeFileSync(file, content, 'utf8');
console.log('Script patched successfully');
