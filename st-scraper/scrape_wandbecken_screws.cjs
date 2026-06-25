const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());
const fs = require('fs');
const path = require('path');

const dataPath = path.resolve(__dirname, '../custom-data.json');

(async () => {
    let data;
    try {
        data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
    } catch (e) {
        console.log("Could not find custom-data.json");
        return;
    }

    if (!data.waschtisch || !data.waschtisch.trays) return;

    let targetTrays = data.waschtisch.trays.filter(t => {
        const l = (t.label || '').toLowerCase();
        
        // Exclude washbasins that explicitly include screws in the package
        if (l.includes('inkl. befestigung') || 
            l.includes('mit befestigung') || 
            l.includes('befestigungsmaterial') ||
            l.includes('inkl. schraub') ||
            l.includes('mit schraub')) {
            return false;
        }

        return l.includes('wandbecken') || l.includes('handwaschbecken');
    });

    console.log(`Testing scraper on ${targetTrays.length} items...`);

    const browser = await puppeteer.launch({ 
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1920,1080'] 
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });

    let updated = 0;
    const screwResults = {};

    try {
        for (let i = 0; i < targetTrays.length; i++) {
            const tray = targetTrays[i];
            const cleanFull = tray.artNr.replace(/\s/g, '');
            const match = cleanFull.match(/^\d{7,8}/);
            const searchQuery = match ? match[0] : tray.artNr.trim();

            console.log(`\n[${i+1}/${targetTrays.length}] Searching ArtNr: ${tray.artNr}`);
            
            try {
                let targetUrl = `https://profishop.sanitastroesch.ch/business/search?q=${encodeURIComponent(searchQuery)}`;
                await page.goto(targetUrl, { waitUntil: 'networkidle2', timeout: 30000 });
                await new Promise(r => setTimeout(r, 2000));
                
                let currentUrl = await page.url();
                let isSearchPage = currentUrl.includes('/search');

                const pageInfo = await page.evaluate(() => document.body.innerText.substring(0, 300));
                if (pageInfo.includes('Keine Ergebnisse')) {
                     await page.goto(`https://profishop.sanitastroesch.ch/business/search?q=${cleanFull}`, { waitUntil: 'networkidle2' });
                     await new Promise(r => setTimeout(r, 2000));
                     currentUrl = await page.url();
                     isSearchPage = currentUrl.includes('/search');
                }

                if (isSearchPage) {
                    const productHref = await page.evaluate((sq) => {
                        const links = Array.from(document.querySelectorAll('a'));
                        for (let a of links) {
                            const href = a.href || '';
                            if (href.includes('/business/article-') && !href.includes('/search')) {
                                return href;
                            }
                            if (href.includes(sq) && !href.includes('/search') && !href.includes('=') && href.includes('sanitastroesch')) {
                                return href;
                            }
                        }
                        return null;
                    }, searchQuery);

                    if (productHref) {
                        await page.goto(productHref, { waitUntil: 'networkidle0', timeout: 30000 });
                        await new Promise(r => setTimeout(r, 4000));
                    } else {
                        let baseName = tray.label.toLowerCase()
                            .replace(/ü/g, 'ue')
                            .replace(/ä/g, 'ae')
                            .replace(/ö/g, 'oe')
                            .replace(/[^a-z0-9]+/g, '-');
                        if (baseName.endsWith('-')) baseName = baseName.substring(0, baseName.length - 1);
                        const mimicUrl = `https://profishop.sanitastroesch.ch/business/article-${baseName}-${cleanFull}`;
                        console.log(`   -> Search failed. Mimicking direct URL: ${mimicUrl}`);
                        const response = await page.goto(mimicUrl, { waitUntil: 'networkidle0', timeout: 30000 });
                        await new Promise(r => setTimeout(r, 4000));
                        if ((await page.url()).includes('404') || (await page.url()).includes('not-found') || (response && response.status() === 404)) {
                             console.log(`   -> Mimic URL failed (404).`);
                             continue;
                        }
                    }
                } else {
                    await new Promise(r => setTimeout(r, 4000));
                }

                await page.evaluate(async () => {
                    await new Promise((resolve) => {
                        let totalHeight = 0;
                        const distance = 500;
                        const timer = setInterval(() => {
                            const scrollHeight = document.body.scrollHeight;
                            window.scrollBy(0, distance);
                            totalHeight += distance;
                            if (totalHeight >= scrollHeight - window.innerHeight || totalHeight > 10000) {
                                clearInterval(timer);
                                resolve();
                            }
                        }, 200);
                    });
                });
                await new Promise(r => setTimeout(r, 2000));

                const pdpData = await page.evaluate(() => {
                    const accessoryRows = Array.from(document.querySelectorAll('.product-list-item, tr, .row, article, .card')); 
                    for (let row of accessoryRows) {
                        const rowText = row.innerText || '';
                        
                        // Check for 120mm or 145mm screws
                        if (rowText.includes('8211 113') || rowText.includes('8211113') || rowText.includes('8211 112') || rowText.includes('8211112')) {
                            row.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            
                            const inputField = row.querySelector('.quantity-input input[type="text"], .quantity-input input[type="number"], input.form-control[placeholder="Menge"]');
                            let qty = null;
                            if (inputField) {
                                qty = inputField.value;
                            }
                            
                            let screwSize = '145mm';
                            if (rowText.includes('8211 112') || rowText.includes('8211112')) {
                                screwSize = '120mm';
                            }

                            return {
                                size: screwSize,
                                quantity: qty ? parseInt(qty.toString().trim()) : null
                            };
                        }
                    }
                    return null;
                });

                if (pdpData && pdpData.size && pdpData.quantity) {
                    console.log(`   -> 🔥 FOUND SCREWS: ${pdpData.size} | QTY: ${pdpData.quantity}`);
                    
                    const targetTray = data.waschtisch.trays.find(t => t.id === tray.id);
                    if (targetTray) {
                        if (!targetTray.mountingMaterials) targetTray.mountingMaterials = [];
                        let befestigung = targetTray.mountingMaterials.find(m => m.name === 'Befestigung');
                        
                        let screwArtNr = pdpData.size === '120mm' ? '8211 112.000.000' : '8211 113.000.000';
                        let screwLabel = pdpData.size === '120mm' ? 'Dübelschraube 120 mm, Länge 120 mm, Kunststoffdübel, M 10' : 'Dübelschraube 145 mm, Länge 145 mm, Kunststoffdübel, M 12';
                        let screwImg = pdpData.size === '120mm' ? 'https://profishop.sanitastroesch.ch/multimedia/Web/PG1/08211112_000_000.png' : 'https://profishop.sanitastroesch.ch/multimedia/Web/PG1/08211113_000_000.png';

                        if (!befestigung) {
                            befestigung = {
                                id: "mat_duebelschraube",
                                name: "Befestigung",
                                options: [{
                                    artNr: screwArtNr,
                                    label: screwLabel,
                                    type: "Zubehör",
                                    menge: pdpData.quantity,
                                    imgUrl: screwImg
                                }]
                            };
                            targetTray.mountingMaterials.push(befestigung);
                            console.log(`      Injected new Befestigung: ${screwSize} x${pdpData.quantity}`);
                            updated++;
                        } else if (befestigung.options && befestigung.options[0]) {
                            const opt = befestigung.options[0];
                            if (opt.artNr !== screwArtNr || opt.menge !== pdpData.quantity) {
                                console.log(`      Updated Befestigung: ${opt.artNr} -> ${screwArtNr} | ${opt.menge} -> ${pdpData.quantity}`);
                                opt.artNr = screwArtNr;
                                opt.label = screwLabel;
                                opt.imgUrl = screwImg;
                                opt.menge = pdpData.quantity;
                                updated++;
                            }
                        }
                    }
                    fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
                    
                } else {
                    console.log(`   -> No Dübelschraube accessory found or quantity missing.`);
                }

            } catch (err) {
                console.log(`   -> Error: ${err.message}`);
            }
        }
    } finally {
        await browser.close();
        console.log(`Scraping finished. Updated ${updated} wash basins.`);
    }
})();
