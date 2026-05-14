const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());
const fs = require('fs');
const path = require('path');

const dataFile = path.resolve(__dirname, '../custom-data.json');
const data = JSON.parse(fs.readFileSync(dataFile, 'utf8'));

(async () => {
    const browser = await puppeteer.launch({ 
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox'] 
    });
    const page = await browser.newPage();
    
    let totalFound = 0;

    async function fetchImageFor(obj) {
        if (!obj || !obj.artNr) return;
        if (obj.imgUrl && obj.imgUrl.includes('http')) {
            return; // Skip if already populated by the app.js magic URL getter
        }

        const searchQ = encodeURIComponent(obj.artNr.replace(/\s/g, ''));
        const url = `https://profishop.sanitastroesch.ch/de/search?q=${searchQ}`;
        
        console.log(`Searching for: ${obj.artNr} at ${searchQ}`);
        
        try {
            await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
            await new Promise(r => setTimeout(r, 1500));
            
            const srcs = await page.evaluate(() => {
                return Array.from(document.querySelectorAll('img'))
                    .map(i => i.src)
                    .filter(src => src.includes('/multimedia/') || (src.includes('sanitastroesch.ch') && src.includes('image')))
                    .filter(src => !src.includes('logo'));
            });
            
            if (srcs.length > 0) {
                obj.imgUrl = srcs[0]; 
                console.log(`-> Found: ${obj.imgUrl}`);
                totalFound++;
                return srcs[0];
            } else {
                console.log(`-> No image found.`);
            }
        } catch (e) {
            console.error("-> Timeout or Error:", e.message);
        }
    }

    for (let appId of Object.keys(data)) {
        let app = data[appId];
        
        if (app.trays) {
            for (let tray of app.trays) {
                const mainImg = await fetchImageFor(tray);
                if (mainImg && !app.mainImgUrl) app.mainImgUrl = mainImg;

                if (tray.variants) {
                    for (let variant of tray.variants) {
                        await fetchImageFor(variant);
                    }
                }
                
                if (tray.mountingMaterials) {
                    for (let mat of tray.mountingMaterials) {
                        if (mat.options) {
                            for (let opt of mat.options) {
                                await fetchImageFor(opt);
                            }
                        }
                    }
                }
            }
        }
    }
    
    fs.writeFileSync(dataFile, JSON.stringify(data, null, 2));
    await browser.close();
    console.log(`Finished! Successfully pulled ${totalFound} new images.`);
})();
