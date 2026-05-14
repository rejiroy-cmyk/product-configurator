const fs = require('fs');

const dataPath = './custom-data.json';
const accPath = './st-scraper/badewanne-accessories.json';

const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
let scrapedAcc = {};
try {
    scrapedAcc = JSON.parse(fs.readFileSync(accPath, 'utf8'));
} catch (e) {
    console.log("No badewanne-accessories.json found.");
}

const randomId = (prefix) => prefix + '_' + Math.random().toString(36).substr(2, 5);

// Standard Alterna Fallbacks
const stdAbUeberlauf = { artNr: "6544 111.000.000", label: "Ab- und Überlaufset Alterna", type: "Ab- und Überlaufset", menge: 1, imgUrl: "" };
const stdAblaufgarnitur = { artNr: "6544 222.000.000", label: "Ablaufgarnitur Alterna Standard", type: "Ablaufgarnitur", menge: 1, imgUrl: "" };
const stdZargenband38 = { artNr: "1461 006.000.000", label: "Zargen-Wannendichtband Alterna, Länge 3,8 m", type: "Wannenzargenband", menge: 1, imgUrl: "" };
const stdZargenband48 = { artNr: "1461 008.000.000", label: "Zargen-Wannendichtband Alterna, Länge 4,8 m", type: "Wannenzargenband", menge: 1, imgUrl: "" };
const stdSchaum = { artNr: "1441 791.000.000", label: "Montageschaum Alterna, Kartusche 400 ml", type: "Montageschaum", menge: 2, imgUrl: "https://profishop.sanitastroesch.ch/multimedia/Web/PS1/01441791_000_000.png" };
const stdSchallschutz = { artNr: "1441 782.000.000", label: "Schallschutzset Alterna - Stahl", type: "Schallschutz", menge: 1, imgUrl: "https://profishop.sanitastroesch.ch/multimedia/Web/PS1/01441782_000_000.png" };
const stdAnker = { artNr: "1465 250.000.000", label: "Wannenanker Alterna", type: "Wannenanker", menge: 1, imgUrl: "" };
const stdFuesse = { artNr: "1431 190.000.000", label: "Badewannen-Montageset Kaldewei BWS", type: "Wannenfüsse", menge: 1, imgUrl: "" };
const ssFuesseSet = { artNr: "1465 138.000.000", label: "Schallschutzset Alterna für Badewannen aus Stahl", type: "Schallschutz", menge: 1, imgUrl: "https://profishop.sanitastroesch.ch/multimedia/Web/PS1/01465138_000_000.png" };


let count = 0;

if (!data.badewanne || !data.badewanne.trays) return;

// Filter out mounting materials that accidentally got into the trays list
data.badewanne.trays = data.badewanne.trays.filter(t => {
    const lbl = (t.label || '').toLowerCase();
    const art = (t.artNr || '');
    if (art === '1431 190.000.000' || lbl.includes('montageset') || lbl.includes('träger') || lbl.includes('füsse')) return false;
    return true;
});

data.badewanne.trays.forEach(t => {
    count++;
    const scraped = scrapedAcc[t.artNr] || { ab_und_ueberlaufset: [], ablaufgarnitur: [], wannentraeger: [], wannenfüsse: [], wannenanker: [], wannenzargenband: [], montageschaum: [], schallschutz: [] };

    const newMats = [];

    const cleanScraped = (arr) => arr.filter(a => a.artNr !== t.artNr);
    const deduplicate = (arr) => {
        const seen = new Set();
        return arr.filter(item => {
            if (seen.has(item.artNr)) return false;
            seen.add(item.artNr);
            return true;
        });
    };

    const lblLower = (t.label || '').toLowerCase();
    
    let realManufacturer = '';
    if (lblLower.includes('schmidlin') || lblLower.includes('wai') || lblLower.includes('steel zero') || lblLower.includes('steel duo')) {
        realManufacturer = 'schmidlin';
    } else if (lblLower.includes('kaldewei') || lblLower.includes('ecoform') || lblLower.includes('steel set') || lblLower.includes('steel uno') || lblLower.includes('saniform') || lblLower.includes('conoduo')) {
        realManufacturer = 'kaldewei';
    } else if (lblLower.includes('hoesch')) {
        realManufacturer = 'hoesch';
    } else if (lblLower.includes('duscholux')) {
        realManufacturer = 'duscholux';
    } else if (lblLower.includes('duravit')) {
        realManufacturer = 'duravit';
    } else if (lblLower.includes('villeroy') || lblLower.includes('boch')) {
        realManufacturer = 'villeroy';
    }
    
    let displayManufacturer = '';
    if (realManufacturer) {
        displayManufacturer = realManufacturer.charAt(0).toUpperCase() + realManufacturer.slice(1);
        if (displayManufacturer === 'Villeroy') displayManufacturer = 'Villeroy & Boch';
    }

    // Alterna products (sold as Alterna, but can be made by Schmidlin/Kaldewei)
    if (lblLower.includes('alterna') || lblLower.includes('wai') || lblLower.includes('steel zero') || lblLower.includes('steel duo') || 
        lblLower.includes('ecoform') || lblLower.includes('steel set') || lblLower.includes('steel uno')) {
        displayManufacturer = 'Alterna';
    }
    
    if (displayManufacturer) {
        t.manufacturer = displayManufacturer;
    }

    const isKaldewei = realManufacturer === 'kaldewei';
    const isSchmidlin = realManufacturer === 'schmidlin';
    const isConoduo = lblLower.includes('conoduo');
    const isInfinity = isSchmidlin && lblLower.includes('infinity');
    const isSwisslineDuo = lblLower.includes('swiss') && lblLower.includes('duo');
    const canUseInfinity = isSchmidlin && !lblLower.includes('shape') && !lblLower.includes('contura comfort') && !lblLower.includes('contura duo') && !lblLower.includes('kinderwanne');

    // Helper: is this item a Fertigset (trim/deckel) vs a Rohbauset (siphon body)?
    const isFertigset = (item) => {
        const lbl = (item.label || '').toLowerCase();
        const art = (item.artNr || '');
        return lbl.includes('visign') || lbl.includes('rosette') || art.includes('.501.') ||
               (lbl.includes('ab- und überlauf') && !lbl.includes('garnitur') && !lbl.includes('multiplex'));
    };
    const isRohbauset = (item) => {
        const lbl = (item.label || '').toLowerCase();
        return lbl.includes('wannengarnitur') || lbl.includes('multiplex') || lbl.includes('siphon') || lbl.includes('rohbauset');
    };

    // 2. Ab- und Überlaufset (Fertigset = Deckel, Griff, Rosette)
    // Pull from ab_und_ueberlaufset bucket PLUS any misclassified Fertigsets in ablaufgarnitur
    const allAblaeufe = deduplicate(cleanScraped([...scraped.ab_und_ueberlaufset, ...scraped.ablaufgarnitur]));
    const ueberlaeufe = allAblaeufe.filter(isFertigset).filter(u => u.artNr !== '1411 322.100.000' && u.artNr !== '1411 342.100.000');
    const uOptions = [];
    if (isConoduo) {
        uOptions.push({ artNr: "builtin", label: "Bereits in Wanne integriert", type: "Ab- und Überlaufset", menge: 0, overrideMontageart: 'common' });
    } else {
        const brandUeberlaeufe = (realManufacturer && ueberlaeufe.length > 0) ? ueberlaeufe.filter(u => u.label.toLowerCase().includes(realManufacturer)) : [];
        if (brandUeberlaeufe.length > 0) {
            uOptions.push(...brandUeberlaeufe.map(u => ({ ...u, menge: 1, overrideMontageart: 'common' })));
        } else if (ueberlaeufe.length > 0) {
            uOptions.push(...ueberlaeufe.map(u => ({ ...u, menge: 1, overrideMontageart: 'common' })));
        } else {
            uOptions.push({ ...stdAbUeberlauf, overrideMontageart: 'common' });
        }
    }
    newMats.push({ id: randomId('au'), name: "Ab- und Überlaufset (Deckel / Griff)", options: uOptions, overrideMontageart: 'common' });

    // 3. Ablaufgarnitur (Rohbauset = Siphon / Wannengarnitur body)
    // Keep only true siphons/garnituren from the ablaufgarnitur bucket
    const allScrapedGarnitur = deduplicate(cleanScraped([...scraped.ab_und_ueberlaufset, ...scraped.ablaufgarnitur]));
    const ablaeufe = allScrapedGarnitur.filter(item => !isFertigset(item) && isRohbauset(item));
    const abOptions = [];
    if (isSwisslineDuo) {
        abOptions.push({ artNr: "builtin", label: "Bereits im Montageset integriert", type: "Ablaufgarnitur", menge: 0, overrideMontageart: 'common' });
    } else {
        const brandAblaeufe = (realManufacturer && ablaeufe.length > 0) ? ablaeufe.filter(a => a.label.toLowerCase().includes(realManufacturer)) : [];
        if (brandAblaeufe.length > 0) {
            abOptions.push(...brandAblaeufe.map(a => ({ ...a, menge: 1, overrideMontageart: 'common' })));
        } else if (ablaeufe.length > 0) {
            abOptions.push(...ablaeufe.map(a => ({ ...a, menge: 1, overrideMontageart: 'common' })));
        } else {
            abOptions.push({ ...stdAblaufgarnitur, overrideMontageart: 'common' });
        }
    }
    newMats.push({ id: randomId('ag'), name: "Ablaufgarnitur (Rohbauset / Siphon)", options: abOptions, overrideMontageart: 'common' });

    // 4. Wannenzargenband — calculated from tray dimensions (same formula as Duschenwanne)
    // Known tape lengths and their artNrs (Alterna)
    const allTapeLengths = [
        { artNr: '1461 004.000.000', label: 'Zargen-Wannendichtband Alterna, Länge 3,4 m', length: 3.4, imgUrl: '' },
        { artNr: '1461 005.000.000', label: 'Zargen-Wannendichtband Alterna, Länge 3,6 m', length: 3.6, imgUrl: '' },
        { artNr: '1461 006.000.000', label: 'Zargen-Wannendichtband Alterna, Länge 3,8 m', length: 3.8, imgUrl: '' },
        { artNr: '1461 008.000.000', label: 'Zargen-Wannendichtband Alterna, Länge 4,8 m', length: 4.8, imgUrl: '' },
        { artNr: '1461 010.000.000', label: 'Zargen-Wannendichtband Alterna, Länge 6 m',   length: 6.0, imgUrl: '' },
    ];
    
    const zOptions = [];
    
    // Parse size string "180 x 80" (cm) → mm
    const sizeMatch = (t.size || '').match(/(\d+)\s*x\s*(\d+)/i);
    if (sizeMatch) {
        const w = parseInt(sizeMatch[1]) * 10; // cm → mm
        const h = parseInt(sizeMatch[2]) * 10;
        
        const perimeterL = (w + h + 200) / 1000;  // L-Variante: 2 sides + buffer
        const perimeterU = (w + h + Math.min(w, h) + 200) / 1000; // U-Variante: 3 sides + buffer
        
        const tapeL = allTapeLengths.filter(t => t.length >= perimeterL - 0.1).sort((a, b) => a.length - b.length)[0];
        const tapeU = allTapeLengths.filter(t => t.length >= perimeterU - 0.1).sort((a, b) => a.length - b.length)[0];
        
        if (tapeU) {
            zOptions.push({ ...tapeU, dropdownLabel: `Länge ${tapeU.length.toFixed(1).replace('.',',')} m (U-Variante)`, type: 'Wannenzargenband', menge: 1, overrideMontageart: 'common' });
        }
        if (tapeL && (!tapeU || tapeL.artNr !== tapeU.artNr)) {
            zOptions.push({ ...tapeL, dropdownLabel: `Länge ${tapeL.length.toFixed(1).replace('.',',')} m (L-Variante)`, type: 'Wannenzargenband', menge: 1, overrideMontageart: 'common' });
        }
    }
    
    // Fallback if no dimensions found
    if (zOptions.length === 0) {
        zOptions.push({ ...stdZargenband38, overrideMontageart: 'common' });
        zOptions.push({ ...stdZargenband48, overrideMontageart: 'common' });
    }
    
    newMats.push({ id: randomId('zb'), name: 'Wannenzargenband', options: zOptions, overrideMontageart: 'common' });


    // --- WANNENTRÄGER PATH (Montageart 1) ---
    // 5a. Wannenträger
    let traeger = deduplicate(cleanScraped(scraped.wannentraeger)).filter(x => !x.label.toLowerCase().includes('schaum') && !x.label.toLowerCase().includes('kleber') && !x.label.toLowerCase().includes('schallschutz') && !x.label.toLowerCase().includes('pu-kleber') && !x.label.toLowerCase().includes('infinity'));
    

    const tOptions = [];
    if (traeger.length > 0) tOptions.push(...traeger.map(tr => ({ ...tr, menge: 1, overrideMontageart: 'Mit Wannenträger' })));
    else tOptions.push({ artNr: "std_wannentraeger", label: "Wannenträger EPS Universal", type: "Wannenträger", menge: 1, imgUrl: "", overrideMontageart: 'Mit Wannenträger' });
    newMats.push({ id: randomId('wt'), name: "Wannenträger", options: tOptions, overrideMontageart: 'Mit Wannenträger' });

    // 6. Montageschaum (Wannenträger only)
    const schaum = deduplicate(cleanScraped(scraped.montageschaum));
    const msOptions = [];
    if (schaum.length > 0) msOptions.push(...schaum.map(s => ({ ...s, menge: 2, overrideMontageart: 'Mit Wannenträger' })));
    else msOptions.push({ ...stdSchaum, overrideMontageart: 'Mit Wannenträger' });
    newMats.push({ id: randomId('ms'), name: "Montageschaum", options: msOptions, overrideMontageart: 'Mit Wannenträger' });

    // 7a. Schallschutz (Wannenträger only)
    const ssOptions = [
        { ...stdSchallschutz, overrideMontageart: 'Mit Wannenträger' }
    ];
    newMats.push({ id: randomId('ss'), name: 'Schallschutz', options: ssOptions, overrideMontageart: 'Mit Wannenträger' });



    // --- WANNENFÜSSE PATH (Montageart 2) ---
    // 5b. Wannenfüsse / Wannenanker
    let fuesse = deduplicate(cleanScraped(scraped.wannenfüsse)).filter(f => f.artNr !== '1465 138.000.000' && f.artNr !== '1465 200.000.000');
    let anker = deduplicate(cleanScraped(scraped.wannenanker));
    const faOptions = [];
    
    if (realManufacturer === 'kaldewei') {
        // Kaldewei gets its own feet as standard, and the BWS Plus as an option
        fuesse = fuesse.filter(f => f.label.toLowerCase().includes('kaldewei'));
        if (fuesse.length === 0) fuesse.push({ artNr: '1431 160.000.000', label: 'Badewannenfüsse Kaldewei Allround 5030, verstellbar, schallhemmend', type: 'Wannenfüsse', menge: 1, imgUrl: '' });
        
        faOptions.push(...fuesse.map(f => ({ ...f, menge: 1, overrideMontageart: 'Mit Wannenfüssen' })));
        faOptions.push({ artNr: '1465 250.000.000', label: 'Schallschutzset Kaldewei BWS Plus, für Stahlbadewannen, 2 Wannenanker', type: 'Wannenfüsse', menge: 1, imgUrl: '', overrideMontageart: 'Mit Wannenfüssen' });
    } else if (realManufacturer === 'schmidlin') {
        // Schmidlin logic
        fuesse = fuesse.filter(f => f.label.toLowerCase().includes('schmidlin') || f.artNr === '1431 190.000.000');
        anker = anker.filter(a => a.label.toLowerCase().includes('schmidlin'));

        // Infinity feet logic
        if (isInfinity) {
            fuesse.unshift({ artNr: "1111 905.000.000", label: "Wannenfüsse Schmidlin Infinity Board", type: "Wannenfüsse", menge: 1, imgUrl: "" });
        } else if (canUseInfinity) {
            // Add as a secondary option for supported Schmidlin tubs
            fuesse.push({ artNr: "1111 905.000.000", label: "Wannenfüsse Schmidlin Infinity Board", type: "Wannenfüsse", menge: 1, imgUrl: "" });
        }

        if (fuesse.length > 0) {
            // Rule: Don't force 1431 190.000.000 as standard if the website found a better one (like 1431 195)
            faOptions.push(...fuesse.map(f => ({ ...f, menge: 1, overrideMontageart: 'Mit Wannenfüssen' })));
        } else {
            faOptions.push({ artNr: "1431 190.000.000", label: "Badewannen-Montageset Schmidlin", type: "Wannenfüsse", menge: 1, imgUrl: "", overrideMontageart: 'Mit Wannenfüssen' });
        }
        
        // Add Schallschutzset 1465 138.000.000 as an alternative option in the feet dropdown
        faOptions.push({ ...ssFuesseSet, type: "Wannenfüsse", label: ssFuesseSet.label, overrideMontageart: 'Mit Wannenfüssen' });

        if (anker.length > 0) faOptions.push(...anker.map(a => ({ ...a, menge: 1, overrideMontageart: 'Mit Wannenfüssen' })));
    } else {
        // Duravit, Villeroy & Boch, Hoesch, Duscholux, and generic others
        
        // Brand isolation: if the scraper found brand-specific items, only use those
        let brandFuesse = fuesse.filter(f => f.label.toLowerCase().includes(realManufacturer));
        let brandAnker = anker.filter(a => a.label.toLowerCase().includes(realManufacturer));

        if (brandFuesse.length > 0) {
            faOptions.push(...brandFuesse.map(f => ({ ...f, menge: 1, overrideMontageart: 'Mit Wannenfüssen' })));
        } else if (fuesse.length > 0) {
            // If no brand specific found, but generic feet exist, use them but avoid Schmidlin branding if possible
            faOptions.push(...fuesse.map(f => ({ ...f, menge: 1, overrideMontageart: 'Mit Wannenfüssen' })));
        } else {
            // Neutral universal fallback (Mepa or similar) instead of Schmidlin for other brands
            faOptions.push({ artNr: "1432 210.000.000", label: "Badewannenfuss Mepa WA, universal für Kunststoffwannen", type: "Wannenfüsse", menge: 1, imgUrl: "", overrideMontageart: 'Mit Wannenfüssen' });
        }
        
        faOptions.push({ ...ssFuesseSet, type: "Wannenfüsse", label: ssFuesseSet.label, overrideMontageart: 'Mit Wannenfüssen' });

        if (brandAnker.length > 0) {
            faOptions.push(...brandAnker.map(a => ({ ...a, menge: 1, overrideMontageart: 'Mit Wannenfüssen' })));
        } else if (anker.length > 0) {
            faOptions.push(...anker.map(a => ({ ...a, menge: 1, overrideMontageart: 'Mit Wannenfüssen' })));
        }
    }
    
    if (isSwisslineDuo) {
        faOptions.length = 0; // Clear any generic feet/anchors
        faOptions.push({ artNr: "1431 165.000.000", label: "Badewannen-Montageset Schmidlin Swiss Line Duo, inkl. Wannengarnitur", type: "Wannenfüsse", menge: 1, imgUrl: "", overrideMontageart: 'Mit Wannenfüssen' });
    }
    
    // According to user: "It's either Wannenfüsse or Wannenanker, making Wannenfüsse standard and Wannenanker secondary in drop down"
    newMats.push({ id: randomId('wf'), name: "Füsse / Anker", options: faOptions, overrideMontageart: 'Mit Wannenfüssen' });

    // Separate Infinity Board add-on Dropdown
    if (canUseInfinity) {
        const boardOptions = [
            { artNr: "1111 907.000.000", label: "Schmidlin Infinity Board Standard", type: "Infinity Board", menge: 1, imgUrl: "", overrideMontageart: 'Mit Wannenfüssen' },
            { artNr: "1111 908.000.000", label: "Schmidlin Infinity Board Variante A", type: "Infinity Board", menge: 1, imgUrl: "", overrideMontageart: 'Mit Wannenfüssen' },
            { artNr: "1111 909.000.000", label: "Schmidlin Infinity Board Variante B", type: "Infinity Board", menge: 1, imgUrl: "", overrideMontageart: 'Mit Wannenfüssen' }
        ];
        newMats.push({ id: randomId('ib'), name: "Schmidlin Infinity Board (Add-on)", options: boardOptions, overrideMontageart: 'Mit Wannenfüssen' });
    }

    if (isSwisslineDuo) {
        // Wipe EVERYTHING. The tub ONLY needs 1431 165.000.000 and it covers all components (trim, siphon, feet, carrier, sound insulation, zargenband).
        newMats.length = 0;
        newMats.push({
            id: randomId('wf'),
            name: "Komplett-Montageset",
            options: [
                { artNr: "1431 165.000.000", label: "Badewannen-Montageset Schmidlin Swiss Line Duo (Komplettset)", type: "Montageset", menge: 1, imgUrl: "", overrideMontageart: 'common' }
            ],
            overrideMontageart: 'common'
        });
    } else if (t.artNr === '1122 210.100.000') {
        // Hoesch Happy D. (Freestanding / Formed front)
        // Only needs specific Geberit Siphon and Trim.
        newMats.length = 0;
        newMats.push({
            id: randomId('au'),
            name: "Ab- und Überlaufset (Deckel / Griff)",
            options: [
                { artNr: "1411 122.501.000", label: "Ab- und Überlaufset Geberit, Fertigbauset Ø 52 mm, Verchromt", type: "Ab- und Überlaufset", menge: 1, overrideMontageart: 'common' }
            ],
            overrideMontageart: 'common'
        });
        newMats.push({
            id: randomId('ag'),
            name: "Ablaufgarnitur (Rohbauset / Siphon)",
            options: [
                { artNr: "1411 107.000.000", label: "Wannengarnitur Geberit, Ablaufventil 48 x 1/8\", Sifon", type: "Ablaufgarnitur", menge: 1, overrideMontageart: 'common' }
            ],
            overrideMontageart: 'common'
        });
    } else if (t.artNr === '1122 310.100.000') {
        // Hoesch Santee - needs specific Hoesch Fussgestell 1122 335.000.000
        const wfMat = newMats.find(m => m.name === "Füsse / Anker");
        if (wfMat) {
            wfMat.options.unshift({ 
                artNr: "1122 335.000.000", 
                label: "Fussgestell Hoesch, zu Badewanne Santee 1122 310", 
                type: "Wannenfüsse", 
                menge: 1, 
                imgUrl: "", 
                overrideMontageart: 'Mit Wannenfüssen' 
            });
        }
    }

    t.mountingMaterials = newMats;
});

fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
console.log(`Successfully applied Badewanne BOM structures to ${count} items.`);

// Increment version
const dataJsPath = './modules/data.js';
let dataJs = fs.readFileSync(dataJsPath, 'utf8');
dataJs = dataJs.replace(/export const DATA_VERSION = '(.*?)';/, (match, p1) => {
    let parts = p1.split('.');
    parts[2] = parseInt(parts[2]) + 1;
    return `export const DATA_VERSION = '${parts.join('.')}';`;
});
fs.writeFileSync(dataJsPath, dataJs);
