const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());
const fs = require('fs');
const path = require('path');

const dataPath = path.resolve(__dirname, '../custom-data.json');
const outputPath = path.resolve(__dirname, 'badewanne-accessories.json');

(async () => {
    let data;
    try {
        data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
    } catch (e) {
        console.log("Could not find custom-data.json");
        return;
    }

    // Notice we use 'badewanne' here
    if (!data.badewanne || !data.badewanne.trays) {
        console.log("No Badewanne found in custom-data.json");
        return;
    }

    let targetTrays = data.badewanne.trays;
    console.log(`Testing scraper on ${targetTrays.length} Badewanne items...`);

    const browser = await puppeteer.launch({ 
        headless: false,
        args: ['--window-size=1920,1080'] 
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });

    const results = {};

    // Load existing results to allow resuming
    if (fs.existsSync(outputPath)) {
        try {
            Object.assign(results, JSON.parse(fs.readFileSync(outputPath, 'utf8')));
            console.log(`Loaded ${Object.keys(results).length} existing results.`);
        } catch(e) {
            console.log("Starting fresh JSON output.");
        }
    }

    try {
        for (let i = 0; i < targetTrays.length; i++) {
            const tray = targetTrays[i];
            
            if (results[tray.artNr]) {
                console.log(`[${i+1}/${targetTrays.length}] Skipping ${tray.artNr} (Already Scraped)`);
                continue;
            }

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
                            .replace(/ /g, '-')
                            .replace(/[^\w-]/g, '');
                        const nameUrl = `https://profishop.sanitastroesch.ch/business/search?q=${baseName}`;
                        await page.goto(nameUrl, { waitUntil: 'networkidle2' });
                        await new Promise(r => setTimeout(r, 3000));
                        
                        const altHref = await page.evaluate(() => {
                            const a = document.querySelector('.product-list-item-title a, article a');
                            return a ? a.href : null;
                        });
                        if (altHref) {
                            await page.goto(altHref, { waitUntil: 'networkidle0' });
                            await new Promise(r => setTimeout(r, 4000));
                        }
                    }
                }

                const finalUrl = await page.url();
                if (finalUrl.includes('/search')) {
                    console.log(`   -> ⚠️ No exact product page found for ${tray.artNr}. Saving empty data.`);
                    results[tray.artNr] = { ab_und_ueberlaufset: [], ablaufgarnitur: [], wannentraeger: [], wannenfüsse: [], wannenanker: [], wannenzargenband: [], montageschaum: [], schallschutz: [] };
                    fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
                    continue;
                }

                // Scroll to trigger lazy-loading of Verwandte Artikel (same approach as bademischer scraper)
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
                    
                    const extracted = {
                        ab_und_ueberlaufset: [],
                        ablaufgarnitur: [],
                        wannentraeger: [],
                        wannenfüsse: [],
                        wannenanker: [],
                        wannenzargenband: [],
                        montageschaum: [],
                        schallschutz: []
                    };

                    for (let row of accessoryRows) {
                        const rowText = (row.innerText || '').toLowerCase();
                        const artNrMatch = rowText.match(/(\d{4}\s?\d{3}\.\d{3}\.\d{3}|\d{7,8})/);
                        if (!artNrMatch) continue;
                        
                        const artNr = artNrMatch[0].replace(/\n/g, '').trim();

                        let label = "";
                        const titleLink = Array.from(row.querySelectorAll('a')).find(a => a.innerText.trim().length > 3);
                        if (titleLink) {
                            label = titleLink.innerText.replace(/\n/g, ' ').trim();
                        } else {
                            const descDiv = row.querySelector('.description, .product-name, .article-description, .product-list-item-title, h3, .name');
                            if (descDiv) {
                                label = descDiv.innerText.replace(/\n/g, ' ').trim();
                            } else {
                                const lines = rowText.split('\n').map(l => l.trim()).filter(l => l.length > 5 && l !== artNr);
                                label = lines.length > 0 ? lines[0] : "";
                            }
                        }

                        let imgUrl = "";
                        const imgTag = row.querySelector('img');
                        if (imgTag && imgTag.src) {
                            imgUrl = imgTag.src;
                        }

                        // Skip main product
                        const isMainProduct = label.toLowerCase().includes('badewanne') && !label.toLowerCase().includes('zubehör');
                        if (isMainProduct && label.toLowerCase().length < 50) continue; // Roughly

                        // Special artNr overrides before general keyword matching
                        if (artNr === '1465 138.000.000') {
                            if (!extracted.wannenfüsse.find(s => s.artNr === artNr)) extracted.wannenfüsse.push({ artNr, label, type: 'Wannenfüsse', imgUrl });
                            continue;
                        }

                        // Badewanne Categories
                        const isFertigset = rowText.includes('fertigset') || rowText.includes('farbset') || rowText.includes('ablaufdeckel') || rowText.includes('fertigbauset') || rowText.includes('multiplex-ausstattung') || rowText.includes('ausstattung') || rowText.includes('ab- und überlaufset');
                        const isSiphon = rowText.includes('ablaufgarnitur') || rowText.includes('siphon') || rowText.includes('multiplex') || rowText.includes('wannenablauf') || rowText.includes('ab- und überlauf') || rowText.includes('rohbauset') || rowText.includes('wannengarnitur') || rowText.includes('wanneneinlaufgarnitur');

                        if (isFertigset) {
                            if (!extracted.ab_und_ueberlaufset.find(s => s.artNr === artNr)) extracted.ab_und_ueberlaufset.push({ artNr, label, type: 'Ab- und Überlaufset (Fertigset)', imgUrl });
                        } else if (isSiphon) {
                            if (!extracted.ablaufgarnitur.find(s => s.artNr === artNr)) extracted.ablaufgarnitur.push({ artNr, label, type: 'Ablaufgarnitur (Rohbauset)', imgUrl });
                        } else if ((rowText.includes('wannenträger') || rowText.includes('styroporträger')) && !rowText.includes('schaum') && !rowText.includes('kleber')) {
                            if (!extracted.wannentraeger.find(s => s.artNr === artNr)) extracted.wannentraeger.push({ artNr, label, type: 'Wannenträger', imgUrl });
                        } else if (rowText.includes('wannenfüsse') || rowText.includes('füsse') || rowText.includes('fussgestell') || rowText.includes('fuss') || rowText.includes('schmidlin infinity') || rowText.includes('badewannen-montageset')) {
                            if (!extracted.wannenfüsse.find(s => s.artNr === artNr)) extracted.wannenfüsse.push({ artNr, label, type: 'Wannenfüsse', imgUrl });
                        } else if (rowText.includes('wannenanker') || rowText.includes('wannenprofil') || rowText.includes('wannenleiste') || rowText.includes('schallschutzanker') || rowText.includes('bws plus')) {
                            if (!extracted.wannenanker.find(s => s.artNr === artNr)) extracted.wannenanker.push({ artNr, label, type: 'Wannenanker', imgUrl });
                        } else if (rowText.includes('zargenband') || rowText.includes('dichtset') || rowText.includes('wannenrandband') || rowText.includes('fugenband')) {
                            if (!extracted.wannenzargenband.find(s => s.artNr === artNr)) extracted.wannenzargenband.push({ artNr, label, type: 'Wannenzargenband', imgUrl });
                        } else if (rowText.includes('montageschaum') || rowText.includes('pu-schaum') || rowText.includes('wannenträgerschaum')) {
                            if (!extracted.montageschaum.find(s => s.artNr === artNr)) extracted.montageschaum.push({ artNr, label, type: 'Montageschaum', imgUrl });
                        } else if (rowText.includes('schallschutz') || rowText.includes('schalldämm') || rowText.includes('schallentkopplung')) {
                            if (!extracted.schallschutz.find(s => s.artNr === artNr)) extracted.schallschutz.push({ artNr, label, type: 'Schallschutz', imgUrl });
                        }
                    }
                    return extracted;
                });

                if (pdpData && (pdpData.ablaufgarnitur.length > 0 || pdpData.wannentraeger.length > 0 || pdpData.wannenfüsse.length > 0)) {
                    console.log(`   -> 🔥 FOUND: ${pdpData.ablaufgarnitur.length} Abläufe, ${pdpData.wannentraeger.length} Träger, ${pdpData.wannenfüsse.length} Füsse`);
                } else {
                    console.log(`   -> No relevant Badewanne accessories found.`);
                }

                results[tray.artNr] = pdpData || { ab_und_ueberlaufset: [], ablaufgarnitur: [], wannentraeger: [], wannenfüsse: [], wannenanker: [], wannenzargenband: [], montageschaum: [], schallschutz: [] };
                fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));

            } catch (err) {
                console.log(`   -> ❌ Error searching ${tray.artNr}:`, err.message);
            }
        }
    } finally {
        console.log(`Scraping finished. Results saved to st-scraper/badewanne-accessories.json`);
        await browser.close();
    }
})();
