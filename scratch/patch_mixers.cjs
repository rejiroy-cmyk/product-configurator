const fs = require('fs');

const dataFile = './custom-data.json';
const dbData = JSON.parse(fs.readFileSync(dataFile, 'utf8'));

// Load zubehoer_pool if exists
let zubehoer_pool = null;
if (dbData['zubehoer_pool']) {
    zubehoer_pool = {
        trays: dbData['zubehoer_pool'].trays || [],
        parts: dbData['zubehoer_pool'].parts || [],
        finishes: dbData['zubehoer_pool'].finishes || []
    };
} else {
    // try to load it from shower_accessory_library.json or something?
}

const fullPool = zubehoer_pool ? [...zubehoer_pool.trays, ...zubehoer_pool.parts, ...zubehoer_pool.finishes] : [];

let patched = 0;

function autoLinkMixerAccessories(tray) {
    if (!tray || !tray.label) return;
    const l = tray.label.toLowerCase();
    const manufacturer = (tray.manufacturer || '').toLowerCase();
    
    // Clear old ones
    tray.mountingMaterials = [];

    // --- 1. AUFPUTZ LOGIC (AD 153 mm) ---
    if (l.includes('ad 153 mm') && !l.includes('endmontageset') && !l.includes('grundkörper')) {
        const accessories = [
            {
                id: "mat_howjw",
                name: "Abstellverschraubung,",
                options: [
                    {
                        artNr: "6521 108.501.000",
                        label: "Abstellverschraubung, ½\" x ½\", mit flacher Rosette, Verchromt",
                        menge: 2,
                        type: "Zubehör",
                        imgUrl: "https://profishop.sanitastroesch.ch/multimedia/Web/PG1/06521108_501_000.png"
                    }
                ]
            },
            {
                id: "mat_dweg4",
                name: "Brauseschlauch",
                options: [
                    {
                        artNr: "6542 317.501.000",
                        label: "Brauseschlauch Alterna flexline, 1600 mm, ½\"x½\", Kunststoff mit Metalleffekt,",
                        menge: 1,
                        type: "Zubehör",
                        imgUrl: "https://profishop.sanitastroesch.ch/multimedia/Web/PG1/06542317_501_000.png"
                    }
                ]
            },
            {
                id: "mat_5utlf",
                name: "Handbrause",
                options: [
                    {
                        artNr: "6541 326.501.000",
                        label: "Handbrause Alterna easyline, Ø 101 mm, 1-jet, SoftRain, Einlage des",
                        menge: 1,
                        type: "Zubehör",
                        imgUrl: "https://profishop.sanitastroesch.ch/multimedia/Web/PG1/06541326_501_000.png"
                    }
                ]
            },
            {
                id: "mat_37d4w",
                name: "Brausehalter",
                options: [
                    {
                        artNr: "6543 131.501.000",
                        label: "Brausehalter Alterna eco, Verchromt",
                        menge: 1,
                        type: "Zubehör",
                        imgUrl: "https://profishop.sanitastroesch.ch/multimedia/Web/PG1/06543131_501_000.png"
                    }
                ]
            }
        ];

        tray.mountingMaterials = accessories.filter(mat => {
            const name = mat.name.toLowerCase();
            if (name.includes('abstell') && l.includes('abstellverschraubung')) return l.includes('ohne abstellverschraubung');
            if (name.includes('schlauch') && l.includes('brauseschlauch')) return l.includes('ohne brauseschlauch');
            if (name.includes('handbrause') && l.includes('handbrause')) return l.includes('ohne handbrause');
            return true; 
        });
    }

    // --- 2. UNTERPUTZ LOGIC (Laufen / Alterna 8-Step Hierarchy) ---
    else if ((manufacturer === 'laufen' || manufacturer === 'alterna') && (l.includes('endmontageset') || l.includes('unterputz'))) {
        const gkMatches = l.match(/einbauk[öo]rper\s*([0-9\s.\/]+)/);
        let gkOptions = [];
        
        if (gkMatches && gkMatches[1]) {
            const parts = gkMatches[1].match(/\b\d{4}\s*\d{3}\b/g) || [];
            parts.forEach(p => {
                const cleanP = p.replace(/\s+/g, ' ');
                gkOptions.push({
                    artNr: cleanP + ".000.000",
                    label: `Einbaukörper Simibox ${cleanP}`,
                    type: "Zubehör",
                    imgUrl: `https://profishop.sanitastroesch.ch/multimedia/Web/PG1/0${cleanP.replace(/\s+/g, '')}_000_000.png`,
                    menge: 1
                });
            });
        }

        if (gkOptions.length === 0) {
            gkOptions.push({
                artNr: "6158 110.000.000",
                label: "Einbaukörper Laufen Simibox Light ½\", mit Vorabstellung",
                type: "Zubehör",
                imgUrl: "https://profishop.sanitastroesch.ch/multimedia/Web/PG1/06158110_000_000.png",
                menge: 1
            });
        }

        tray.mountingMaterials = [
            {
                id: "mat_grundkoerper",
                name: "1. Grundkörper",
                options: gkOptions
            },
            {
                id: "mat_schiene",
                name: "2. Montageschiene",
                options: [
                    {
                        artNr: "6158 120.000.000",
                        label: "Montageset Laufen Simibox 2 Montageschienen 560 mm Befestigungsmaterial",
                        type: "Zubehör",
                        imgUrl: "https://profishop.sanitastroesch.ch/multimedia/Web/PG1/06158120_000_000.png",
                        menge: 1
                    }
                ]
            },
            {
                id: "mat_bogen",
                name: "3. Anschlussbogen",
                options: [
                    {
                        artNr: "6544 164.501.000",
                        label: "Anschlussbogen Laufen City, mit Rückflussverhinderer, Rosette rund, für Handbrause Geräuschgruppe NT Verchromt",
                        type: "Zubehör",
                        imgUrl: "https://profishop.sanitastroesch.ch/multimedia/Web/PG1/06544164_501_000.png",
                        menge: 1
                    },
                    {
                        artNr: "6544 166.501.000",
                        label: "Anschlussbogen Laufen City ½\" mit integriertem Brausehalter Rückflussverhinderer Rosette eckig Geräuschgruppe NT Verchromt",
                        type: "Option",
                        imgUrl: "https://profishop.sanitastroesch.ch/multimedia/Web/PG1/06544166_501_000.png",
                        menge: 1
                    }
                ]
            },
            {
                id: "mat_schlauch",
                name: "4. Brauseschlauch",
                options: [
                    {
                        artNr: "6542 317.501.000",
                        label: "Brauseschlauch Alterna flexline, 1600 mm, ½\"x½\", Kunststoff mit Metalleffekt",
                        type: "Zubehör",
                        imgUrl: "https://profishop.sanitastroesch.ch/multimedia/Web/PG1/06542317_501_000.png",
                        menge: 1
                    },
                    {
                        artNr: "6542 316.501.000",
                        label: "Brauseschlauch Alterna flexline, 1250 mm, ½\"x½\", Kunststoff mit Metalleffekt",
                        type: "Option",
                        imgUrl: "https://profishop.sanitastroesch.ch/multimedia/Web/PG1/06542316_501_000.png",
                        menge: 1
                    }
                ]
            },
            {
                id: "mat_handbrause",
                name: "5. Handbrause",
                options: [
                    {
                        artNr: "6541 326.501.000",
                        label: "Handbrause Alterna easyline, Ø 101 mm, 1-jet, SoftRain",
                        type: "Zubehör",
                        imgUrl: "https://profishop.sanitastroesch.ch/multimedia/Web/PG1/06541326_501_000.png",
                        menge: 1
                    }
                ]
            },
            {
                id: "mat_halter",
                name: "6. Brausehalter",
                options: [
                    {
                        artNr: "6543 131.501.000",
                        label: "Brausehalter Alterna eco, Verchromt",
                        type: "Zubehör",
                        imgUrl: "https://profishop.sanitastroesch.ch/multimedia/Web/PG1/06543131_501_000.png",
                        menge: 1
                    },
                    {
                        artNr: "OHNE",
                        label: "Ohne Brausehalter (Stange verwenden oder Bogen mit Halter)",
                        type: "Option",
                        imgUrl: "https://profishop.sanitastroesch.ch/multimedia/Web/PG1/00000000.png",
                        menge: 0
                    }
                ]
            },
            {
                id: "mat_stange",
                name: "7. Duschengleitstange",
                options: [
                    {
                        artNr: "OHNE",
                        label: "Ohne Duschengleitstange (nur Halter)",
                        type: "Option",
                        imgUrl: "https://profishop.sanitastroesch.ch/multimedia/Web/PG1/00000000.png",
                        menge: 0
                    },
                    {
                        artNr: "6531 404.501.000",
                        label: "Duschengleitstange Alterna fit Gelenkhalter Arretierungshebel, 1100 mm",
                        type: "Option",
                        imgUrl: "https://profishop.sanitastroesch.ch/multimedia/Web/PG1/06531404_501_000.png",
                        menge: 1
                    }
                ]
            }
        ];
    }

    // --- 3. KWC UNTERPUTZ LOGIC (Homebox / Bluebox / Bevo UP) ---
    else if (manufacturer === 'kwc' && (l.includes('endmontageset') || l.includes('unterputz') || l.includes('homebox') || l.includes('bluebox'))) {
        const gkMatch = l.match(/einbauk[öo]rper\s*([0-9\s.]+)/);
        let gkArtNr = gkMatch ? gkMatch[1].trim() : (l.includes('homebox') ? "6118 135.000.000" : "Z.538.705.000");
        
        if (gkArtNr.replace(/\s+/g, '').length === 7) {
            gkArtNr = gkArtNr.replace(/(\d{4})\s*(\d{3})/, "$1 $2");
        }
        
        const isHomebox = l.includes('homebox');

        tray.mountingMaterials = [
            {
                id: "mat_kwc_gk",
                name: "1. Grundkörper (KWC)",
                options: [
                    {
                        artNr: gkArtNr,
                        label: isHomebox ? "Einbaukörper KWC HOMEBOX 1/2\"" : "Einbaukörper KWC BLUEBOX 1/2\"",
                        type: "Zubehör",
                        imgUrl: `https://profishop.sanitastroesch.ch/multimedia/Web/PG1/0${gkArtNr.replace(/\s+/g, '')}.png`,
                        menge: 1
                    }
                ]
            },
            {
                id: "mat_kwc_bogen",
                name: "2. Anschlussbogen",
                options: [
                    {
                        artNr: "6544 164.501.000",
                        label: "Anschlussbogen Alterna/Laufen City, ½\", Verchromt",
                        type: "Zubehör",
                        imgUrl: "https://profishop.sanitastroesch.ch/multimedia/Web/PG1/06544164_501_000.png",
                        menge: 1
                    }
                ]
            },
            {
                id: "mat_kwc_schlauch",
                name: "3. Brauseschlauch",
                options: [
                    {
                        artNr: "6542 317.501.000",
                        label: "Brauseschlauch Alterna flexline, 1600 mm, ½\"x½\"",
                        type: "Zubehör",
                        imgUrl: "https://profishop.sanitastroesch.ch/multimedia/Web/PG1/06542317_501_000.png",
                        menge: 1
                    }
                ]
            },
            {
                id: "mat_kwc_handbrause",
                name: "4. Handbrause",
                options: [
                    {
                        artNr: "6541 326.501.000",
                        label: "Handbrause Alterna easyline, Ø 101 mm, 1-jet",
                        type: "Zubehör",
                        imgUrl: "https://profishop.sanitastroesch.ch/multimedia/Web/PG1/06541326_501_000.png",
                        menge: 1
                    }
                ]
            },
            {
                id: "mat_kwc_halter",
                name: "5. Brausehalter",
                options: [
                    {
                        artNr: "6543 131.501.000",
                        label: "Brausehalter Alterna eco, Verchromt",
                        type: "Zubehör",
                        imgUrl: "https://profishop.sanitastroesch.ch/multimedia/Web/PG1/06543131_501_000.png",
                        menge: 1
                    }
                ]
            }
        ];
    }

    // --- 4. DYNAMIC POOL SCANNER (Fallback / Auto-Injector) ---
    if (fullPool.length > 0 && tray.mountingMaterials.length === 0) {
        const artNrMatches = l.match(/\b\d{4}\s*\d{3}\b/g) || [];
        
        artNrMatches.forEach((match, idx) => {
            const searchArtNr = match.replace(/\s+/g, ''); // "6158110"
            const foundItems = fullPool.filter(p => p.artNr && p.artNr.replace(/\s+/g, '').startsWith(searchArtNr));
            
            if (foundItems.length > 0) {
                tray.mountingMaterials.push({
                    id: "mat_auto_" + searchArtNr + "_" + idx,
                    name: "Zubehör (Automatisch Erkannt)",
                    options: foundItems.map(item => ({
                        artNr: item.artNr,
                        label: item.label,
                        type: "Zubehör",
                        imgUrl: item.imgUrl || `https://profishop.sanitastroesch.ch/multimedia/Web/PG1/0${item.artNr.replace(/\s+/g, '').replace(/\./g, '_')}.png`,
                        menge: 1
                    }))
                });
            }
        });
    }
}

['bademischer', 'duschenmischer'].forEach(appId => {
    if (dbData[appId] && dbData[appId].trays) {
        dbData[appId].trays.forEach(tray => {
            autoLinkMixerAccessories(tray);
            patched++;
        });
    }
});

fs.writeFileSync(dataFile, JSON.stringify(dbData, null, 0), 'utf8');
console.log(`Patched ${patched} items in custom-data.json`);
