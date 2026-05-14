const fs = require('fs');

const dataPath = './custom-data.json';
const accPath = './st-scraper/bademischer-accessories.json';

const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
let scrapedAcc = {};
try {
    scrapedAcc = JSON.parse(fs.readFileSync(accPath, 'utf8'));
} catch (e) {
    console.log("No bademischer-accessories.json found.");
}

const randomId = (prefix) => prefix + '_' + Math.random().toString(36).substr(2, 5);

// Standard Fallbacks
const stdSchlauch1250 = { artNr: "6542 316.501.000", label: "Brauseschlauch Alterna flexline, 1250 mm", type: "Brauseschlauch", menge: 1, imgUrl: "https://profishop.sanitastroesch.ch/multimedia/Web/PG1/06542316_501_000.png" };
const stdSchlauch1600 = { artNr: "6542 317.501.000", label: "Brauseschlauch Alterna flexline, 1600 mm", type: "Brauseschlauch", menge: 1, imgUrl: "https://profishop.sanitastroesch.ch/multimedia/Web/PG1/06542317_501_000.png" };
const stdSchlauch1800 = { artNr: "6542 318.501.000", label: "Brauseschlauch Alterna flexline, 1800 mm", type: "Brauseschlauch", menge: 1, imgUrl: "https://profishop.sanitastroesch.ch/multimedia/Web/PG1/06542318_501_000.png" };

const stdHandbrause = { artNr: "6541 326.501.000", label: "Handbrause Alterna easyline, Ø 101 mm, 1-jet", type: "Handbrause", menge: 1, imgUrl: "https://profishop.sanitastroesch.ch/multimedia/Web/PG1/06541326_501_000.png" };

const stdBrausehalter = { artNr: "6534 207.501.000", label: "Brausehalter Alterna, verstellbar", type: "Brausehalter", menge: 1, imgUrl: "https://profishop.sanitastroesch.ch/multimedia/Web/PG1/06534207_501_000.png" };

const stdGleitstange610 = { artNr: "6531 403.501.000", label: "Duschgleitstange Alterna fit, 610 mm", type: "Gleitstange", menge: 1, imgUrl: "https://profishop.sanitastroesch.ch/multimedia/Web/PG1/06531403_501_000.png" };
const stdGleitstange1100 = { artNr: "6531 404.501.000", label: "Duschgleitstange Alterna fit, 1100 mm", type: "Gleitstange", menge: 1, imgUrl: "https://profishop.sanitastroesch.ch/multimedia/Web/PG1/06531404_501_000.png" };

const stdAnschluss = { artNr: "6544 164.501.000", label: "Anschlussbogen Laufen City", type: "Anschlussbogen", menge: 1, imgUrl: "https://profishop.sanitastroesch.ch/multimedia/Web/PG1/06544164_501_000.png" };
const stdAnschlussMitHalter = { artNr: "6544 166.501.000", label: "Anschlussbogen Laufen City 1/2\" mit integriertem Brausehalter", type: "Anschlussbogen", menge: 1, imgUrl: "https://profishop.sanitastroesch.ch/multimedia/Web/PG1/06544166_501_000.png" };

const stdVerschraubung = { artNr: "6521 109.501.000", label: "Abstellverschraubung ½\" x ¾\"", type: "Abstellverschraubung", menge: 2, imgUrl: "https://profishop.sanitastroesch.ch/multimedia/Web/PG1/06521109_501_000.png" };


let count = 0;
let standCount = 0;
let apCount = 0;
let upCount = 0;

if (!data.bademischer || !data.bademischer.trays) return;

data.bademischer.trays.forEach(t => {
    const labelLower = (t.label || '').toLowerCase();
    const scraped = scrapedAcc[t.artNr] || { abstellverschraubung: [], montageschiene: [], grundkoerper: [], brauseschlauch: [], handbrause: [], brausehalter: [], gleitstange: [], anschlussbogen: [] };

    let montage = 'Aufputz';
    if (labelLower.includes('standmodell')) {
        montage = 'Standmodell';
    } else if (labelLower.includes('unterputz') || labelLower.includes(' up ') || labelLower.includes('einbau') || labelLower.includes('endmontageset') || labelLower.includes('grundkörper') || labelLower.includes('grundkoerper')) {
        montage = 'Unterputz';
    } else {
        montage = 'Aufputz';
    }

    const newMats = [];

    // Filter out self references in scraped data
    const cleanScraped = (arr) => arr.filter(a => a.artNr !== t.artNr);

    // ==========================================
    // 1. STANDMODELL
    // ==========================================
    if (montage === 'Standmodell') {
        standCount++;
        // Order : 1. Mischer, 2. Einbaukörper 
        const gks = cleanScraped(scraped.grundkoerper);
        const gkOptions = gks.map(g => ({ ...g, menge: 1 }));
        
        if (gkOptions.length === 0) {
            gkOptions.push({ artNr: "ohne_gk", label: "Ohne Grundkörper", type: "Grundkörper", menge: 0, imgUrl: "" });
        }
        
        newMats.push({
            id: randomId('gk'),
            name: "Grundkörper",
            options: gkOptions
        });
        
        t.mountingMaterials = newMats;
        return;
    }

    // ==========================================
    // 2. UNTERPUTZ
    // ==========================================
    if (montage === 'Unterputz') {
        upCount++;
        // 1. Mischer (implied)
        
        // 2. Grundkörper
        const gks = cleanScraped(scraped.grundkoerper);
        const gkOptions = gks.map(g => ({ ...g, menge: 1 }));
        if (gkOptions.length === 0) gkOptions.push({ artNr: "ohne_gk", label: "Ohne Grundkörper", type: "Grundkörper", menge: 0, imgUrl: "" });
        newMats.push({ id: randomId('gk'), name: "Grundkörper", options: gkOptions });

        // 3. Montageschiene
        const schienen = cleanScraped(scraped.montageschiene);
        const msOptions = schienen.map(m => ({ ...m, menge: 1 }));
        if (msOptions.length === 0) msOptions.push({ artNr: "ohne_ms", label: "Ohne Montageschiene", type: "Montageschiene", menge: 0, imgUrl: "" });
        newMats.push({ id: randomId('ms'), name: "Montageschiene", options: msOptions });

        // 4. Wanneneinlauf
        newMats.push({
            id: randomId('wanne'),
            name: "Wanneneinlauf",
            options: [
                { artNr: "ohne_wanneneinlauf", label: "Ohne Wanneneinlauf", type: "Wanneneinlauf", menge: 0, imgUrl: "" },
                // Standard or scraped. Scraper doesn't have Wanneneinlauf right now. We leave it dynamic for manual addition later.
            ]
        });

        // 5. Anschlussbogen
        const bogen = cleanScraped(scraped.anschlussbogen);
        const abOptions = [];
        abOptions.push({ artNr: "bitte_waehlen", label: "Bitte zuerst Anschlussbogen wählen", type: "Anschlussbogen", menge: 0, imgUrl: "" });
        
        if (bogen.length > 0) {
            abOptions.push(...bogen.map(b => ({ ...b, menge: 1 })));
            abOptions.push(stdAnschluss, stdAnschlussMitHalter);
        } else {
            abOptions.push(stdAnschluss, stdAnschlussMitHalter);
        }
        abOptions.push({ artNr: "ohne_anschluss", label: "Ohne Anschlussbogen", type: "Anschlussbogen", menge: 0, imgUrl: "" });
        
        newMats.push({ id: randomId('ab'), name: "Anschlussbogen", options: abOptions });

        // 6. Brauseschlauch
        const schlauche = cleanScraped(scraped.brauseschlauch);
        const schOptions = [];
        if (schlauche.length > 0) {
            // Push scraped hoses first
            schlauche.forEach(s => schOptions.push({ ...s, menge: 1 }));
        }
        // Always push standard hoses so they are available in dropdown
        schOptions.push(stdSchlauch1250, stdSchlauch1600, stdSchlauch1800);
        schOptions.push({ artNr: "ohne_schlauch", label: "Ohne Brauseschlauch", type: "Brauseschlauch", menge: 0, imgUrl: "" });
        
        // Remove duplicates based on artNr
        const uniqueSchOptions = [];
        const seenSch = new Set();
        schOptions.forEach(s => {
            if (!seenSch.has(s.artNr)) {
                seenSch.add(s.artNr);
                uniqueSchOptions.push(s);
            }
        });
        
        newMats.push({ id: randomId('sch'), name: "Brauseschlauch", options: uniqueSchOptions });

        // 7. Handbrause
        const handbrausen = cleanScraped(scraped.handbrause).filter(h => !h.label.toLowerCase().includes('anschlussbogen'));
        const hbOptions = [];
        if (handbrausen.length > 0) {
            hbOptions.push(...handbrausen.map(h => ({ ...h, menge: 1 })));
        } else {
            hbOptions.push(stdHandbrause);
        }
        hbOptions.push({ artNr: "ohne_handbrause", label: "Ohne Handbrause", type: "Handbrause", menge: 0, imgUrl: "" });
        newMats.push({ id: randomId('hb'), name: "Handbrause", options: hbOptions });

        // 8. Brausehalter
        const halter = cleanScraped(scraped.brausehalter).filter(h => !h.label.toLowerCase().includes('anschlussbogen'));
        const halterOptions = [];
        if (halter.length > 0) {
            halterOptions.push(...halter.map(h => ({ ...h, menge: 1 })));
        } else {
            halterOptions.push(stdBrausehalter);
        }
        halterOptions.push({ artNr: "ohne_halter", label: "Ohne Brausehalter", type: "Brausehalter", menge: 0, imgUrl: "" });
        newMats.push({ id: randomId('hl'), name: "Brausehalter", options: halterOptions });

        // 9. Duschgleitstange
        const stangen = cleanScraped(scraped.gleitstange);
        const stOptions = [];
        stOptions.push({ artNr: "ohne_gleitstange", label: "Ohne Duschgleitstange", type: "Gleitstange", menge: 0, imgUrl: "" });
        if (stangen.length > 0) {
            stOptions.push(...stangen.map(s => ({ ...s, menge: 1 })));
        } else {
            stOptions.push(stdGleitstange610, stdGleitstange1100);
        }
        newMats.push({ id: randomId('gs'), name: "Duschgleitstange", options: stOptions });

        t.mountingMaterials = newMats;
        return;
    }

    // ==========================================
    // 3. AUFPUTZ
    // ==========================================
    if (montage === 'Aufputz') {
        apCount++;
        // 2. Abstellverschraubungen (if label has "ohne abstellverschraubung")
        if (labelLower.includes('ohne abstellverschraubung') || labelLower.includes('ohne verschraubung') || labelLower.includes('ohne s-anschlüsse') || labelLower.includes('ohne s-anschluesse')) {
            const verschr = cleanScraped(scraped.abstellverschraubung);
            const vOptions = [];
            if (verschr.length > 0) {
                // If the scraped item is just 1 piece, we might need 2 pieces. Hard to say from scraped, but standard is 2.
                vOptions.push(...verschr.map(v => ({ ...v, menge: 2 })));
            } else {
                vOptions.push(stdVerschraubung);
            }
            vOptions.push({ artNr: "ohne_verschraubung", label: "Ohne Abstellverschraubung", type: "Abstellverschraubung", menge: 0, imgUrl: "" });
            newMats.push({ id: randomId('vs'), name: "Abstellverschraubung", options: vOptions });
        } else {
            // Already included, no explicit BOM needed per rules.
        }

        // 3. Brauseschlauch
        const schlauche = cleanScraped(scraped.brauseschlauch);
        const schOptions = [];
        if (schlauche.length > 0) {
            schlauche.forEach(s => schOptions.push({ ...s, menge: 1 }));
        }
        // Always push standard hoses
        schOptions.push(stdSchlauch1250, stdSchlauch1600, stdSchlauch1800);
        schOptions.push({ artNr: "ohne_schlauch", label: "Ohne Brauseschlauch", type: "Brauseschlauch", menge: 0, imgUrl: "" });
        
        const uniqueSchOptions = [];
        const seenSch = new Set();
        schOptions.forEach(s => {
            if (!seenSch.has(s.artNr)) {
                seenSch.add(s.artNr);
                uniqueSchOptions.push(s);
            }
        });
        
        newMats.push({ id: randomId('sch'), name: "Brauseschlauch", options: uniqueSchOptions });

        // 4. Handbrause
        const handbrausen = cleanScraped(scraped.handbrause).filter(h => !h.label.toLowerCase().includes('anschlussbogen'));
        const hbOptions = [];
        if (handbrausen.length > 0) {
            hbOptions.push(...handbrausen.map(h => ({ ...h, menge: 1 })));
        } else {
            hbOptions.push(stdHandbrause);
        }
        hbOptions.push({ artNr: "ohne_handbrause", label: "Ohne Handbrause", type: "Handbrause", menge: 0, imgUrl: "" });
        newMats.push({ id: randomId('hb'), name: "Handbrause", options: hbOptions });

        // 5. Brausehalter
        const halter = cleanScraped(scraped.brausehalter).filter(h => !h.label.toLowerCase().includes('anschlussbogen'));
        const halterOptions = [];
        if (halter.length > 0) {
            halterOptions.push(...halter.map(h => ({ ...h, menge: 1 })));
        } else {
            halterOptions.push(stdBrausehalter);
        }
        halterOptions.push({ artNr: "ohne_halter", label: "Ohne Brausehalter", type: "Brausehalter", menge: 0, imgUrl: "" });
        newMats.push({ id: randomId('hl'), name: "Brausehalter", options: halterOptions });

        // 6. Duschgleitstange
        const stangen = cleanScraped(scraped.gleitstange);
        const stOptions = [];
        stOptions.push({ artNr: "ohne_gleitstange", label: "Ohne Duschgleitstange", type: "Gleitstange", menge: 0, imgUrl: "" });
        if (stangen.length > 0) {
            stOptions.push(...stangen.map(s => ({ ...s, menge: 1 })));
        } else {
            stOptions.push(stdGleitstange610, stdGleitstange1100);
        }
        newMats.push({ id: randomId('gs'), name: "Duschgleitstange", options: stOptions });

        t.mountingMaterials = newMats;
        return;
    }

});

fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
console.log(`Successfully applied Bademischer BOM structures:`);
console.log(`Standmodell: ${standCount}`);
console.log(`Unterputz:   ${upCount}`);
console.log(`Aufputz:     ${apCount}`);

// Increment version
const dataJsPath = './modules/data.js';
let dataJs = fs.readFileSync(dataJsPath, 'utf8');
dataJs = dataJs.replace(/export const DATA_VERSION = '(.*?)';/, (match, p1) => {
    let parts = p1.split('.');
    parts[2] = parseInt(parts[2]) + 1;
    return `export const DATA_VERSION = '${parts.join('.')}';`;
});
fs.writeFileSync(dataJsPath, dataJs);
