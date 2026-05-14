const fs = require('fs');

const dataPath = './custom-data.json';
const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

global.window = { productApps: data };
const productApps = data;

function getBrandSpecificHandbrausen(mixerManufacturer) {
    const currentApps = window.productApps || productApps;
    if (!currentApps['zubehoer_pool']) return [];
    const pool = [
        ...(currentApps['zubehoer_pool'].trays || []),
        ...(currentApps['zubehoer_pool'].parts || []),
        ...(currentApps['zubehoer_pool'].finishes || [])
    ];
    
    const allHb = pool.filter(p => p.label && p.label.toLowerCase().includes('handbrause'));
    let results = [];
    
    if (mixerManufacturer) {
        const m = mixerManufacturer.toLowerCase();
        let brandMatch = allHb.filter(p => p.label.toLowerCase().includes(m));
        if (brandMatch.length > 0) {
            results = brandMatch;
        }
    }
    
    if (results.length === 0) {
        results = allHb.filter(p => p.label.toLowerCase().includes('alterna') || p.label.toLowerCase().includes('easyline') || p.label.toLowerCase().includes('simijet'));
    }
    
    if (results.length === 0) {
        results = [{
            artNr: "6541 326.501.000",
            label: "Handbrause Alterna easyline, Ø 101 mm, 1-jet",
            imgUrl: "https://profishop.sanitastroesch.ch/multimedia/Web/PG1/06541326_501_000.png"
        }];
    }
    
    return results.map((hb, i) => ({
        artNr: hb.artNr,
        label: hb.label,
        type: i === 0 ? "Zubehör" : "Option",
        imgUrl: hb.imgUrl || `https://profishop.sanitastroesch.ch/multimedia/Web/PG1/0${hb.artNr.replace(/\s+/g, '').replace(/\./g, '_')}.png`,
        menge: 1
    }));
}

// Copy the autoLinkMixerAccessories logic from admin.js just to patch them offline
function autoLinkMixerAccessories(tray) {
    if (!tray || !tray.label) return;
    const l = tray.label.toLowerCase();
    const manufacturer = (tray.manufacturer || '').toLowerCase();

    // 1. AUFPUTZ
    if (l.includes('ad 153 mm') && !l.includes('endmontageset') && !l.includes('grundkörper')) {
        const accessories = [
            {
                id: "mat_howjw",
                name: "Abstellverschraubung,",
                options: [{ artNr: "6521 108.501.000", label: "Abstellverschraubung, ½\" x ½\"", menge: 2, type: "Zubehör", imgUrl: "https://profishop.sanitastroesch.ch/multimedia/Web/PG1/06521108_501_000.png" }]
            },
            {
                id: "mat_dweg4",
                name: "Brauseschlauch",
                options: [{ artNr: "6542 317.501.000", label: "Brauseschlauch Alterna flexline, 1600 mm", menge: 1, type: "Zubehör", imgUrl: "https://profishop.sanitastroesch.ch/multimedia/Web/PG1/06542317_501_000.png" }]
            },
            {
                id: "mat_5utlf",
                name: "Handbrause",
                options: getBrandSpecificHandbrausen(manufacturer)
            },
            {
                id: "mat_37d4w",
                name: "Brausehalter",
                options: [{ artNr: "6543 131.501.000", label: "Brausehalter Alterna eco", menge: 1, type: "Zubehör", imgUrl: "https://profishop.sanitastroesch.ch/multimedia/Web/PG1/06543131_501_000.png" }]
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
    // 2. UNTERPUTZ
    else if ((manufacturer === 'laufen' || manufacturer === 'alterna') && (l.includes('endmontageset') || l.includes('unterputz'))) {
        const gkMatches = l.match(/einbauk[öo]rper\s*([0-9\s.\/]+)/);
        let gkOptions = [];
        if (gkMatches && gkMatches[1]) {
            const parts = gkMatches[1].match(/\b\d{4}\s*\d{3}\b/g) || [];
            parts.forEach(p => {
                const cleanP = p.replace(/\s+/g, ' ');
                gkOptions.push({ artNr: cleanP + ".000.000", label: `Einbaukörper Simibox ${cleanP}`, type: "Zubehör", imgUrl: `https://profishop.sanitastroesch.ch/multimedia/Web/PG1/0${cleanP.replace(/\s+/g, '')}_000_000.png`, menge: 1 });
            });
        }
        if (gkOptions.length === 0) gkOptions.push({ artNr: "6158 110.000.000", label: "Einbaukörper Laufen Simibox Light ½\"", type: "Zubehör", imgUrl: "https://profishop.sanitastroesch.ch/multimedia/Web/PG1/06158110_000_000.png", menge: 1 });

        tray.mountingMaterials = [
            { id: "mat_grundkoerper", name: "1. Grundkörper", options: gkOptions },
            { id: "mat_schiene", name: "2. Montageschiene", options: [{ artNr: "6158 120.000.000", label: "Montageset Laufen Simibox 2", type: "Zubehör", imgUrl: "https://profishop.sanitastroesch.ch/multimedia/Web/PG1/06158120_000_000.png", menge: 1 }] },
            { id: "mat_bogen", name: "3. Anschlussbogen", options: [{ artNr: "6544 164.501.000", label: "Anschlussbogen Laufen City", type: "Zubehör", imgUrl: "https://profishop.sanitastroesch.ch/multimedia/Web/PG1/06544164_501_000.png", menge: 1 }, { artNr: "6544 166.501.000", label: "Anschlussbogen Laufen City ½\" mit integriertem Brausehalter", type: "Option", imgUrl: "https://profishop.sanitastroesch.ch/multimedia/Web/PG1/06544166_501_000.png", menge: 1 }] },
            { id: "mat_schlauch", name: "4. Brauseschlauch", options: [{ artNr: "6542 317.501.000", label: "Brauseschlauch Alterna flexline, 1600 mm", type: "Zubehör", imgUrl: "https://profishop.sanitastroesch.ch/multimedia/Web/PG1/06542317_501_000.png", menge: 1 }, { artNr: "6542 316.501.000", label: "Brauseschlauch Alterna flexline, 1250 mm", type: "Option", imgUrl: "https://profishop.sanitastroesch.ch/multimedia/Web/PG1/06542316_501_000.png", menge: 1 }] },
            { id: "mat_handbrause", name: "5. Handbrause", options: getBrandSpecificHandbrausen(manufacturer) },
            { id: "mat_halter", name: "6. Brausehalter", options: [{ artNr: "6543 131.501.000", label: "Brausehalter Alterna eco", type: "Zubehör", imgUrl: "https://profishop.sanitastroesch.ch/multimedia/Web/PG1/06543131_501_000.png", menge: 1 }, { artNr: "OHNE", label: "Ohne Brausehalter", type: "Option", imgUrl: "https://profishop.sanitastroesch.ch/multimedia/Web/PG1/00000000.png", menge: 0 }] },
            { id: "mat_stange", name: "7. Duschengleitstange", options: [{ artNr: "OHNE", label: "Ohne Duschengleitstange", type: "Option", imgUrl: "https://profishop.sanitastroesch.ch/multimedia/Web/PG1/00000000.png", menge: 0 }, { artNr: "6531 404.501.000", label: "Duschengleitstange Alterna fit", type: "Option", imgUrl: "https://profishop.sanitastroesch.ch/multimedia/Web/PG1/06531404_501_000.png", menge: 1 }] }
        ];
    }
    // 3. KWC
    else if (manufacturer === 'kwc' && (l.includes('endmontageset') || l.includes('unterputz') || l.includes('homebox') || l.includes('bluebox'))) {
        const gkMatch = l.match(/einbauk[öo]rper\s*([0-9\s.]+)/);
        let gkArtNr = gkMatch ? gkMatch[1].trim() : (l.includes('homebox') ? "6118 135.000.000" : "Z.538.705.000");
        if (gkArtNr.replace(/\s+/g, '').length === 7) gkArtNr = gkArtNr.replace(/(\d{4})\s*(\d{3})/, "$1 $2");
        const isHomebox = l.includes('homebox');

        tray.mountingMaterials = [
            { id: "mat_kwc_gk", name: "1. Grundkörper (KWC)", options: [{ artNr: gkArtNr, label: isHomebox ? "Einbaukörper KWC HOMEBOX" : "Einbaukörper KWC BLUEBOX", type: "Zubehör", imgUrl: `https://profishop.sanitastroesch.ch/multimedia/Web/PG1/0${gkArtNr.replace(/\s+/g, '')}.png`, menge: 1 }] },
            { id: "mat_kwc_bogen", name: "2. Anschlussbogen", options: [{ artNr: "6544 164.501.000", label: "Anschlussbogen Alterna/Laufen City", type: "Zubehör", imgUrl: "https://profishop.sanitastroesch.ch/multimedia/Web/PG1/06544164_501_000.png", menge: 1 }] },
            { id: "mat_kwc_schlauch", name: "3. Brauseschlauch", options: [{ artNr: "6542 317.501.000", label: "Brauseschlauch Alterna flexline, 1600 mm", type: "Zubehör", imgUrl: "https://profishop.sanitastroesch.ch/multimedia/Web/PG1/06542317_501_000.png", menge: 1 }] },
            { id: "mat_kwc_handbrause", name: "4. Handbrause", options: getBrandSpecificHandbrausen(manufacturer) },
            { id: "mat_kwc_halter", name: "5. Brausehalter", options: [{ artNr: "6543 131.501.000", label: "Brausehalter Alterna eco", type: "Zubehör", imgUrl: "https://profishop.sanitastroesch.ch/multimedia/Web/PG1/06543131_501_000.png", menge: 1 }] }
        ];
    }
}

let c = 0;
['duschenmischer', 'bademischer'].forEach(appId => {
    if (data[appId] && data[appId].trays) {
        data[appId].trays.forEach(tray => {
            tray.mountingMaterials = [];
            autoLinkMixerAccessories(tray);
            if (tray.mountingMaterials.length > 0) c++;
        });
    }
});

fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
console.log(`Successfully synced ${c} mixers with new brand-specific Handbrausen.`);
