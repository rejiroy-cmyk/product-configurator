const fs = require('fs');
const path = require('path');

const dataPath = path.resolve(__dirname, '../custom-data.json');
const varsPath = path.resolve(__dirname, 'schmidlin_variations.json');

const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
const vars = JSON.parse(fs.readFileSync(varsPath, 'utf8'));

const knownCodes = {
    ".100.000": "weiss",
    ".105.000": "weiss Cleaneffect",
    ".151.000": "Bahamabeige Cleaneffekt",
    ".152.000": "Manhattan Cleaneffekt",
    ".153.000": "Pergamon Cleaneffekt",
    ".536.000": "weiss matt",
    ".100.181": "weiss, Gleitschutz Antigliss Pro",
    ".105.181": "weiss Cleaneffect, Gleitschutz Antigliss Pro",
    ".151.181": "Bahamabeige Cleaneffekt, Gleitschutz Antigliss Pro",
    ".152.181": "Manhattan Cleaneffekt, Gleitschutz Antigliss Pro",
    ".153.181": "Pergamon Cleaneffekt, Gleitschutz Antigliss Pro",
    ".536.181": "weiss matt, Gleitschutz Antigliss Pro",
    ".100.186": "weiss, Gleitschutz 186"
};

let injectedCount = 0;
const trays = data.duschenwanne.trays || [];

for (const tray of trays) {
    if (!tray.manufacturer || !tray.manufacturer.toLowerCase().includes("schmidlin")) {
        continue;
    }

    const baseArtNr = tray.artNr;
    const variantData = vars[baseArtNr];
    
    if (variantData && variantData.rawArticleNumbers) {
        // Initialize variants array
        tray.variants = [];
        
        for (const artNr of variantData.rawArticleNumbers) {
            if (artNr.length >= 8) {
                const suffix = artNr.slice(-8);
                if (knownCodes[suffix]) {
                    // Extract base label by stripping out any known colors from the base label just in case
                    let baseLabel = tray.label.replace(/weiss|Cleaneffect|Cleaneffekt|matt|Gleitschutz|Antigliss Pro|186/gi, '').trim();
                    // Remove trailing commas
                    baseLabel = baseLabel.replace(/,\s*$/, '');
                    
                    const newLabel = `${baseLabel}, ${knownCodes[suffix]}`;
                    const imgCode = artNr.replace(/[\s\.]/g, '_');
                    const imgUrl = `https://profishop.sanitastroesch.ch/multimedia/Web/PG1/0${imgCode}.png`;
                    
                    tray.variants.push({
                        artNr: artNr,
                        label: newLabel,
                        imgUrl: imgUrl
                    });
                    injectedCount++;
                }
            }
        }
        
        // Sort variants so base .100.000 is first
        tray.variants.sort((a, b) => {
            if (a.artNr.endsWith('.100.000')) return -1;
            if (b.artNr.endsWith('.100.000')) return 1;
            return a.artNr.localeCompare(b.artNr);
        });
    }
}

fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
console.log(`Successfully injected ${injectedCount} known variations into custom-data.json`);
