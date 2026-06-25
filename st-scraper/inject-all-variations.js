const fs = require('fs');
const path = require('path');

const dataPath = path.resolve(__dirname, '../custom-data.json');
const varsPath = path.resolve(__dirname, 'schmidlin_variations.json');

const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
const vars = JSON.parse(fs.readFileSync(varsPath, 'utf8'));

const colors = {
    "100": "weiss",
    "105": "weiss Cleaneffect",
    "011": "Bahamabeige",
    "031": "Bermudablau",
    "033": "Manhattan",
    "034": "Sunset",
    "038": "Rose-Perle",
    "040": "Whisperblau",
    "043": "Pergamon",
    "151": "Bahamabeige Cleaneffekt",
    "152": "Manhattan Cleaneffekt",
    "153": "Pergamon Cleaneffekt",
    "536": "weiss matt",
    "535": "schwarz matt",
    "136": "Betongrau matt",
    "841": "Anthrazit matt",
    "149": "Finox",
    "490": "Edelstahloptik",
    "524": "Edelstahl glanz",
    "523": "Edelstahl matt",
    "171": "Coffe matt"
};

const variations = {
    "000": "Standard",
    "810": "Standard",
    "181": "Gleitschutz Antigliss Pro",
    "186": "Gleitschutz Aquagrip",
    "185": "Gleitschutz Invisible Grip",
    "184": "Gleitschutz Secure Plus"
};

let injectedCount = 0;
const trays = data.duschenwanne.trays || [];

for (const tray of trays) {
    const baseArtNr = tray.artNr;
    const variantData = vars[baseArtNr];
    
    if (variantData && variantData.rawArticleNumbers && variantData.rawArticleNumbers.length > 0) {
        tray.variants = [];
        
        for (const artNr of variantData.rawArticleNumbers) {
            if (artNr.length >= 8) {
                const suffix = artNr.slice(-8);
                const colorCode = suffix.slice(1, 4);
                const varCode = suffix.slice(5, 8);
                
                if (colors[colorCode] && variations[varCode]) {
                    // Extract base label by removing existing color and variation phrases
                    let baseLabel = tray.label;
                    
                    // Build a regex of all color and variation names to strip out of the base label
                    const allKeys = [...Object.values(colors), ...Object.values(variations), "Cleaneffekt", "Cleaneffect", "Gleitschutz", "Invisible Grip", "Secure Plus", "Aquagrip", "Antigliss Pro", "Standard"];
                    // Sort by length descending to match longer strings first
                    allKeys.sort((a, b) => b.length - a.length);
                    
                    for (const kw of allKeys) {
                        const regex = new RegExp(`\\b${kw}\\b`, 'gi');
                        baseLabel = baseLabel.replace(regex, '');
                    }
                    // Remove double spaces and trailing commas
                    baseLabel = baseLabel.replace(/\s+/g, ' ').replace(/,\s*$/, '').replace(/\s*,\s*,/g, ',').trim();
                    if (baseLabel.endsWith(',')) baseLabel = baseLabel.slice(0, -1);
                    
                    const colorStr = colors[colorCode];
                    const varStr = variations[varCode];
                    
                    // If variation is "Standard", only append it if it's not Schmidlin (Schmidlin usually omits Standard)
                    // Or actually Kaldewei uses Standard. 
                    let suffixStr = "";
                    if (tray.manufacturer && tray.manufacturer.toLowerCase().includes("schmidlin")) {
                        suffixStr = varStr === "Standard" ? colorStr : `${colorStr}, ${varStr}`;
                    } else {
                        suffixStr = varStr === "Standard" ? `${colorStr} Standard` : `${colorStr} ${varStr}`;
                    }
                    
                    const newLabel = `${baseLabel}, ${suffixStr}`.replace(/,\s*,/g, ',');
                    const imgCode = artNr.replace(/[\s\.]/g, '_');
                    const imgUrl = `https://profishop.sanitastroesch.ch/multimedia/Web/PG1/0${imgCode}.png`;
                    
                    // Avoid duplicates
                    if (!tray.variants.find(v => v.artNr === artNr)) {
                        tray.variants.push({
                            artNr: artNr,
                            label: newLabel,
                            imgUrl: imgUrl
                        });
                        injectedCount++;
                    }
                }
            }
        }
        
        // Sort variants so base is first
        tray.variants.sort((a, b) => {
            if (a.artNr === baseArtNr) return -1;
            if (b.artNr === baseArtNr) return 1;
            return a.artNr.localeCompare(b.artNr);
        });
    }
}

fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
console.log(`Successfully injected ${injectedCount} known variations into custom-data.json`);
