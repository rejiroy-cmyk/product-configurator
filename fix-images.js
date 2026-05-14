const fs = require('fs');
const https = require('https');
const path = require('path');

const dataPath = path.resolve(__dirname, 'custom-data.json');
let data;
try {
    data = require(dataPath);
} catch (e) {
    console.log("No custom-data.json found. Exiting.");
    process.exit(0);
}

// Keep agent responsive with limited concurrent connections
const httpsAgent = new https.Agent({ maxSockets: 10 });

function checkUrlExists(url) {
    return new Promise(resolve => {
        const req = https.request(url, { method: 'HEAD', agent: httpsAgent }, (res) => {
            resolve(res.statusCode === 200);
        });
        req.on('error', () => resolve(false));
        req.end();
    });
}

function getVariants(artNr) {
    if (!artNr) return [];
    const parts = String(artNr).replace(/\s/g, '').split('.');
    
    // Always fallback to just matching numbers
    const justNumbers = String(artNr).replace(/[^0-9]/g, '');
    let prefix = justNumbers.substring(0, 8);
    if(parts.length >= 1) {
        prefix = parts[0].padStart(8, '0');
    }

    const variants = [];
    if (parts.length >= 3) {
        variants.push(`https://profishop.sanitastroesch.ch/multimedia/Web/PG1/${prefix}_${parts[1]}_${parts[2]}.png`);
    }
    
    variants.push(
        `https://profishop.sanitastroesch.ch/multimedia/Web/PG1/${prefix}_nV_000.png`,
        `https://profishop.sanitastroesch.ch/multimedia/Web/PG1/${prefix}_nV.png`,
        `https://profishop.sanitastroesch.ch/multimedia/Web/PG1/${prefix}.png`,
        `https://profishop.sanitastroesch.ch/multimedia/Web/PG1/${prefix}_100_000.png`,
        `https://profishop.sanitastroesch.ch/multimedia/Web/PG1/${prefix}_000_000.png`,
        `https://profishop.sanitastroesch.ch/multimedia/Web/PG1/${prefix}_501_000.png`
    );

    // Filter duplicates
    return [...new Set(variants)];
}

async function findWorkingImg(artNr, currentImg) {
    // If the curreentImg already works perfectly, keep it fast!
    if (currentImg && currentImg.includes('profishop')) {
        const works = await checkUrlExists(currentImg);
        if (works) return currentImg;
    }

    const variants = getVariants(artNr);
    
    // Test sequentially (it's fast with HEAD)
    for (const url of variants) {
        if (await checkUrlExists(url)) {
            return url;
        }
    }
    
    return currentImg; // keep whatever we had if everything fails
}

async function processLevel(itemsObject, counter) {
    if (!itemsObject) return;
    for (let i = 0; i < itemsObject.length; i++) {
        const item = itemsObject[i];
        if (item && item.artNr) {
            const workingUrl = await findWorkingImg(item.artNr, item.imgUrl);
            if (workingUrl !== item.imgUrl) {
                // Modified!
                console.log(`[FIXED] ${item.artNr} -> ${workingUrl}`);
                item.imgUrl = workingUrl;
                counter.fixed++;
            }
        }
        
        // Traverse subtypes
        if (item.variants) await processLevel(item.variants, counter);
        if (item.options) await processLevel(item.options, counter);
        if (item.mountingMaterials) await processLevel(item.mountingMaterials, counter);
    }
}

(async () => {
    console.log("Staring Image Fixer...");
    const counter = { fixed: 0 };
    
    for (const categoryKey in data) {
        console.log("Scanning category:", categoryKey);
        const appData = data[categoryKey];
        if (appData) {
            await processLevel(appData.trays, counter);
            await processLevel(appData.parts, counter);
            await processLevel(appData.finishes, counter);
        }
    }

    if (counter.fixed > 0) {
        fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
        console.log(`\nSuccessfully fixed and updated ${counter.fixed} images!`);
    } else {
        console.log("\nAll images appear correct or no working alternative was found.");
    }
    
})();
