const fs = require('fs');
const path = require('path');

const dataPath = path.resolve(__dirname, '../custom-data.json');
const scrapedPath = path.resolve(__dirname, 'standklosett-accessories.json');

let data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
let scraped = JSON.parse(fs.readFileSync(scrapedPath, 'utf8'));

// Standard Betätigungsplatten for Unterputz (same as Wandklosett)
const PLATTEN = [
    { artNr: '3342 219.100.000', label: 'Betätigungsplatte Geberit Sigma01 round', type: 'Betätigungsplatte', menge: 1 },
    { artNr: '3342 234.100.000', label: 'Betätigungsplatte Geberit Sigma20 square', type: 'Betätigungsplatte', menge: 1 },
    { artNr: '3342 235.100.000', label: 'Betätigungsplatte Geberit Sigma20 round', type: 'Betätigungsplatte', menge: 1 }
];

// Standard Geberit Duofix items for Unterputz (positions 7-9)
const DUOFIX = [
    { id: 'duofix_element', name: 'Duofix Element', artNr: '3612 348.000.000', label: 'Geberit Duofix Spülkasten', type: 'Technik', menge: 1 },
    { id: 'duofix_rueckwand', name: 'Rückwandbefestigungssatz', artNr: '3612 500.000.000', label: 'Rückwandbefestigung Geberit Duofix', type: 'Technik', menge: 1 },
    { id: 'duofix_ablauf', name: 'Ablaufbogen', artNr: '3612 374.000.000', label: 'Ablaufbogen Geberit Silent', type: 'Technik', menge: 1 }
];

// Standard screws for toilets that don't include them
const STANDARD_SCREWS = { artNr: '8212 254.501.000', label: 'Befestigungsschrauben', type: 'Technik', menge: 2 };

// Standard AP128 for Aufputz fallback
const AP128 = { artNr: '3351 131.100.000', label: 'Spülkasten Geberit AP128', type: 'Reservoir', menge: 1 };

let updated = 0;

if (data.standklosett && data.standklosett.trays) {
    data.standklosett.trays.forEach(tray => {
        const acc = scraped[tray.artNr] || { reservoir: [], sleeves: [], screws: [] };
        const lbl = (tray.label || '').toLowerCase();

        // ─── CLASSIFICATION ───────────────────────────────────────────────
        const isUnterputz = lbl.includes('einbauspülkasten') || lbl.includes('einbauspulkasten');
        const hasBefestigungsmaterial = lbl.includes('befestigungsmaterial');

        // Preserve ONLY the scraped WC-Sitz and Schallschutz — clear everything else
        const preserved = (tray.mountingMaterials || []).filter(m =>
            m.name === 'WC-Sitz' || m.name === 'Schallschutz'
        );
        tray.mountingMaterials = preserved;

        if (isUnterputz) {
            // ═══ UNTERPUTZ BOM ═══════════════════════════════════════════
            // 3. Betätigungsplatte
            tray.mountingMaterials.push({
                id: 'betaetigungsplatte_' + tray.artNr.replace(/\s/g, ''),
                name: 'Betätigungsplatte',
                options: PLATTEN
            });

            // 5. Screws — only if NOT included and no Befestigungsmaterial in description
            const cleanScrews = (acc.screws || []).filter(s => s.artNr !== tray.artNr);
            if (!hasBefestigungsmaterial) {
                if (cleanScrews.length === 0) {
                    tray.mountingMaterials.push({
                        id: 'schrauben_' + tray.artNr.replace(/\s/g, ''),
                        name: 'Befestigungsschrauben',
                        options: [{ ...STANDARD_SCREWS }]
                    });
                } else {
                    tray.mountingMaterials.push({
                        id: 'schrauben_' + tray.artNr.replace(/\s/g, ''),
                        name: 'Befestigungsschrauben',
                        options: cleanScrews.map(s => ({ artNr: s.artNr, label: s.label || 'Befestigungsschrauben', type: 'Technik', menge: 2 }))
                    });
                }
            }

            // 6. Ablaufmanschette (from scraper)
            const cleanSleeves = (acc.sleeves || []).filter(s => s.artNr !== tray.artNr);
            if (cleanSleeves.length > 0) {
                tray.mountingMaterials.push({
                    id: 'ablauf_' + tray.artNr.replace(/\s/g, ''),
                    name: 'Ablaufmanschette',
                    options: cleanSleeves.map(s => ({ artNr: s.artNr, label: s.label || 'Ablaufmanschette', type: 'Technik', menge: 1 }))
                });
            }

            // 7-9. Duofix
            DUOFIX.forEach(item => {
                tray.mountingMaterials.push({
                    id: item.id + '_' + tray.artNr.replace(/\s/g, ''),
                    name: item.name,
                    options: [{ artNr: item.artNr, label: item.label, type: item.type, menge: item.menge }]
                });
            });

            console.log(`✅ [UP] ${tray.artNr} → Platte + Screws(${cleanScrews.length > 0 ? 'scraped' : 'standard'}) + Sleeves(${cleanSleeves.length}) + Duofix`);

        } else {
            // ═══ AUFPUTZ BOM ═════════════════════════════════════════════
            // 1. Spülkasten — use scraped one if it's specifically AP128, otherwise standard
            const cleanReservoirs = (acc.reservoir || []).filter(r =>
                r.artNr !== tray.artNr && r.artNr === '3351 131.100.000'
            );
            // Always use AP128 as the Aufputz reservoir
            tray.mountingMaterials.push({
                id: 'reservoir_' + tray.artNr.replace(/\s/g, ''),
                name: 'Spülkasten',
                options: [{ ...AP128 }]
            });

            // 5. Screws — only if NOT included and no Befestigungsmaterial in description
            const cleanScrews = (acc.screws || []).filter(s => s.artNr !== tray.artNr);
            if (!hasBefestigungsmaterial) {
                if (cleanScrews.length === 0) {
                    tray.mountingMaterials.push({
                        id: 'schrauben_' + tray.artNr.replace(/\s/g, ''),
                        name: 'Befestigungsschrauben',
                        options: [{ ...STANDARD_SCREWS }]
                    });
                } else {
                    tray.mountingMaterials.push({
                        id: 'schrauben_' + tray.artNr.replace(/\s/g, ''),
                        name: 'Befestigungsschrauben',
                        options: cleanScrews.map(s => ({ artNr: s.artNr, label: s.label || 'Befestigungsschrauben', type: 'Technik', menge: 2 }))
                    });
                }
            }

            // 6. Ablaufanschluss (from scraper)
            const cleanSleeves = (acc.sleeves || []).filter(s => s.artNr !== tray.artNr);
            if (cleanSleeves.length > 0) {
                tray.mountingMaterials.push({
                    id: 'ablauf_' + tray.artNr.replace(/\s/g, ''),
                    name: 'Ablaufanschluss',
                    options: cleanSleeves.map(s => ({ artNr: s.artNr, label: s.label || 'Ablaufanschluss', type: 'Technik', menge: 1 }))
                });
            }

            console.log(`✅ [AP] ${tray.artNr} → AP128 + Screws(${cleanScrews.length > 0 ? 'scraped' : 'standard'}) + Sleeves(${cleanSleeves.length})`);
        }

        updated++;
    });
}

fs.writeFileSync(dataPath, JSON.stringify(data, null, 4));
console.log(`\nDone! Updated ${updated} Standklosetts.`);
