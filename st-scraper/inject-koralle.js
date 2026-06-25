const fs = require('fs');

const dataFile = 'custom-data.json';
const data = JSON.parse(fs.readFileSync(dataFile, 'utf8'));

const cache = JSON.parse(fs.readFileSync('st-scraper/koralle-cache.json', 'utf8'));
const allProducts = Object.values(cache).flat();
allProducts.sort((a, b) => (a.artNr || '').localeCompare(b.artNr || ''));

// ID Maps
const colors = {
    '501': 'verchromt', '100': 'weiss', '105': 'weiss Cleaneffect',
    '536': 'weiss matt', '535': 'schwarz matt', '149': 'Finox',
    '490': 'Edelstahloptik', '524': 'Edelstahl glanz', '523': 'Edelstahl matt',
    '599': 'silberfarbig', '592': 'Silver polish'
};
const variations = {
    '000': 'Standard', '810': 'Standard', '118': 'Echtglas klar',
    '119': 'Echtglas klar CareTecPro', '134': 'Echtglas klar Duschguard',
    '130': 'Echtglas klar Glasplus', '181': 'Gleitschutz Angliss Pro',
    '186': 'Gleitschutz Aquagrip', '185': 'Gleitschutz Invisible Grip',
    '184': 'Gleitschutz Secure Plus'
};

const getImgUrl = (artNr) => {
    let clean = artNr.replace(/\s+/g, '').replace(/\./g, '_');
    return `https://profishop.sanitastroesch.ch/multimedia/Web/PG1/0${clean}.png`;
};

// Remove any existing Koralle items to prevent duplicates if this is run multiple times
data.duschtrennwand.trays = data.duschtrennwand.trays.filter(t => t.manufacturer !== 'Koralle');
if (!data.badewanne) data.badewanne = { trays: [] };
data.badewanne.trays = data.badewanne.trays.filter(t => t.manufacturer !== 'Koralle');

let grouped = {};

for (const p of allProducts) {
    if (!p || !p.artNr || p.artNr === '1529 930.000.000' || p.artNr === '1529 911.000.000') continue;
    
    let artNr = p.artNr;
    let title = p.label || p.title || '';
    
    // Service costs
    if (artNr === '1521 457.000.000' || artNr === '1529 990.000.000' || artNr === '1529 991.000.000') continue;
    
    let einbau = 'Standard';
    const tLower = title.toLowerCase();
    
    if (tLower.includes('eckeinstieg')) einbau = 'Eckeinstieg';
    else if (tLower.includes('nische')) einbau = 'Nische';
    else if (tLower.includes('badewanne') || tLower.includes('wannen')) einbau = 'Wannenmontage';
    else if (tLower.includes('u-kabine') || tLower.includes('u kabine')) einbau = 'U-Kabine';
    else if (tLower.includes('freistehend')) einbau = 'Freistehend';
    else if (tLower.includes('seitenwand')) einbau = 'Seitenwand';
    
    let farbe = 'Standard';
    let glasart = 'Standard';
    
    const match = artNr.match(/\.(\d{3})\.(\d{3})$/);
    if (match) {
        if (colors[match[1]]) farbe = colors[match[1]];
        if (variations[match[2]]) glasart = variations[match[2]];
    }
    
    const baseMatch = artNr.match(/^(\d{4} \d{3})/);
    const parentId = baseMatch ? baseMatch[1] : artNr.split('.')[0];
    
    if (!grouped[parentId]) {
        grouped[parentId] = {
            main: null,
            variants: [],
            isBadewanne: (einbau === 'Wannenmontage')
        };
    }
    
    // Add variant
    grouped[parentId].variants.push({
        artNr: artNr,
        label: title,
        farbe: farbe,
        glasart: glasart,
        imgUrl: getImgUrl(artNr)
    });
}

// Convert groups into products
let injectedCount = 0;
let badewanneCount = 0;

for (const [parentId, group] of Object.entries(grouped)) {
    if (group.variants.length === 0) continue;
    
    // The first item is the main item
    const mainItem = group.variants[0];
    const variants = group.variants.slice(1);
    
    let size = "Standard";
    const sizeMatch = mainItem.label.match(/(?:Breite|Höhe|x)\s*(\d{2,4}(?:\s*-\s*\d{2,4})?\s*cm|mm)/i);
    if (sizeMatch) size = sizeMatch[0];
    
    let einbau = 'Standard';
    if (mainItem.label.toLowerCase().includes('nische')) einbau = 'Nische';
    else if (mainItem.label.toLowerCase().includes('eckeinstieg')) einbau = 'Eckeinstieg';
    else if (mainItem.label.toLowerCase().includes('seitenwand')) einbau = 'Seitenwand';
    
    const product = {
        id: `koralle_${parentId.replace(/\s+/g, '')}`,
        manufacturer: "Koralle",
        form: einbau,
        size: size,
        artNr: mainItem.artNr,
        label: mainItem.label,
        menge: 1,
        imgUrl: mainItem.imgUrl,
        farbe: mainItem.farbe,
        glasart: mainItem.glasart,
        variants: variants,
        mountingMaterials: [] // Empty for now, can be populated later
    };
    
    if (group.isBadewanne) {
        data.badewanne.trays.push(product);
        badewanneCount++;
    } else {
        data.duschtrennwand.trays.push(product);
        injectedCount++;
    }
}

fs.writeFileSync(dataFile, JSON.stringify(data, null, 2), 'utf8');
console.log(`✅ Injection complete!`);
console.log(`Duschtrennwände injected: ${injectedCount}`);
console.log(`Badewannen injected: ${badewanneCount}`);
console.log(`Total Variants injected: ${allProducts.length}`);

