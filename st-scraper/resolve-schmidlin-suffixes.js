const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());
const fs = require('fs');
const path = require('path');

const data = JSON.parse(fs.readFileSync(path.resolve(__dirname, 'schmidlin_variations.json'), 'utf8'));

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

const unknownSuffixes = new Map();

for (const key of Object.keys(data)) {
    const rawList = data[key].rawArticleNumbers || [];
    for (const artNr of rawList) {
        if (artNr.length >= 8) {
            const suffix = artNr.slice(-8);
            if (!knownCodes[suffix] && !unknownSuffixes.has(suffix)) {
                unknownSuffixes.set(suffix, artNr);
            }
        }
    }
}

const unknownArr = Array.from(unknownSuffixes.entries());
console.log(`Found ${unknownArr.length} unknown suffixes to resolve.`);

(async () => {
    const browser = await puppeteer.launch({ 
        headless: 'new',
        args: ['--no-sandbox', '--window-size=1920,1080'] 
    });
    
    const page = await browser.newPage();
    const resolvedCodes = { ...knownCodes };

    for (let i = 0; i < unknownArr.length; i++) {
        const [suffix, artNr] = unknownArr[i];
        const searchUrl = `https://profishop.sanitastroesch.ch/business/search?q=${encodeURIComponent(artNr)}`;
        console.log(`[${i+1}/${unknownArr.length}] Searching for ${artNr} (Suffix: ${suffix})`);
        
        try {
            await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 30000 });
            await new Promise(r => setTimeout(r, 2000));
            
            const label = await page.evaluate((targetArtNr) => {
                const products = Array.from(document.querySelectorAll('.product-list-item, article.st-product-card, .card'));
                for (const el of products) {
                    const artMatch = (el.innerText || '').match(/(\d{4}\s?\d{3}\.\d{3}\.\d{3}|\d{7,8})/);
                    const foundArtNr = artMatch ? artMatch[0].replace(/\n/g, '').trim() : null;
                    if (foundArtNr === targetArtNr) {
                        const titleEl = el.querySelector('.st-product-card__title, .title, h3, h4, .product-name');
                        return titleEl ? titleEl.innerText.replace(/\n/g, ' ').trim() : el.innerText.split('\n')[0];
                    }
                }
                return null;
            }, artNr);
            
            if (label) {
                // Determine what the suffix actually adds to the base name
                // e.g. label is "Duschenwanne Schmidlin ..., weiss matt, Gleitschutz..."
                resolvedCodes[suffix] = { label, exampleArtNr: artNr };
                console.log(`  -> Found label: ${label}`);
            } else {
                console.log(`  -> No product found for ${artNr}`);
            }
        } catch (e) {
            console.error(`  -> Error resolving ${artNr}:`, e.message);
        }
    }
    
    fs.writeFileSync(path.resolve(__dirname, 'resolved_suffixes.json'), JSON.stringify(resolvedCodes, null, 2));
    console.log("Saved resolved_suffixes.json");
    
    await browser.close();
})();
