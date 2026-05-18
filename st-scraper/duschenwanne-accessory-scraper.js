const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());
const fs = require('fs');
const path = require('path');

/**
 * DUSCHENWANNE ACCESSORY SCRAPER
 * 
 * Scans Sanitas Troesch PDPs for shower tray accessories.
 * Independent of Badewanne logic.
 */

const dataPath = path.resolve(__dirname, '../custom-data.json');
const outputPath = path.resolve(__dirname, 'duschenwanne-accessories.json');
const csvPath = path.resolve(__dirname, 'missing-shower-accessories.csv');

(async () => {
    let data;
    try {
        data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
    } catch (e) {
        console.log("Could not find custom-data.json");
        return;
    }

    const LIMIT = null; // Set to null for full run
    let targetTrays = data.duschenwanne.trays.slice(0, LIMIT || data.duschenwanne.trays.length);
    console.log(`🚀 Starting Shower Tray Scraper on ${targetTrays.length} items...`);

    const browser = await puppeteer.launch({ 
        headless: false,
        args: ['--window-size=1920,1080'] 
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });

    const results = {};
    const missing = [];

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
            
            /* 
            if (results[tray.artNr]) {
                console.log(`[${i+1}/${targetTrays.length}] Skipping ${tray.artNr} (Already Scraped)`);
                continue;
            }
            */

            const cleanArtNr = tray.artNr.replace(/\s/g, '');
            // Match first 7-8 digits for broad search if full ArtNr fails
            const match = cleanArtNr.match(/^\d{7,8}/);
            const searchQuery = match ? match[0] : tray.artNr.trim();

            console.log(`\n[${i+1}/${targetTrays.length}] Searching Tray: ${tray.artNr} - ${tray.label}`);
            
            try {
                let targetUrl = `https://profishop.sanitastroesch.ch/business/search?q=${encodeURIComponent(searchQuery)}`;
                await page.goto(targetUrl, { waitUntil: 'networkidle2', timeout: 30000 });
                await new Promise(r => setTimeout(r, 1500));
                
                let currentUrl = await page.url();
                let isSearchPage = currentUrl.includes('/search');

                // If no results, try full ArtNr
                const noResults = await page.evaluate(() => document.body.innerText.includes('Keine Ergebnisse'));
                if (noResults) {
                     await page.goto(`https://profishop.sanitastroesch.ch/business/search?q=${cleanArtNr}`, { waitUntil: 'networkidle2' });
                     await new Promise(r => setTimeout(r, 1500));
                     currentUrl = await page.url();
                     isSearchPage = currentUrl.includes('/search');
                }

                if (isSearchPage) {
                    const productHref = await page.evaluate((sq) => {
                        const links = Array.from(document.querySelectorAll('a'));
                        for (let a of links) {
                            const href = a.href || '';
                            if (href.includes('/business/article-') && !href.includes('/search')) return href;
                            if (href.includes(sq) && !href.includes('/search') && !href.includes('=') && href.includes('sanitastroesch')) return href;
                        }
                        return null;
                    }, searchQuery);

                    if (productHref) {
                        await page.goto(productHref, { waitUntil: 'networkidle0', timeout: 30000 });
                        await new Promise(r => setTimeout(r, 2000));
                    }
                }

                const finalUrl = await page.url();
                if (finalUrl.includes('/search')) {
                    console.log(`   -> ⚠️ PDP not found. Skipping.`);
                    missing.push(`${tray.artNr},${tray.label},PDP Not Found`);
                    continue;
                }

                // Scroll to load related articles
                await page.evaluate(async () => {
                    await new Promise((resolve) => {
                        let totalHeight = 0;
                        const distance = 400;
                        const timer = setInterval(() => {
                            const scrollHeight = document.body.scrollHeight;
                            window.scrollBy(0, distance);
                            totalHeight += distance;
                            if (totalHeight >= scrollHeight - window.innerHeight || totalHeight > 8000) {
                                clearInterval(timer);
                                resolve();
                            }
                        }, 150);
                    });
                });
                
                await new Promise(r => setTimeout(r, 1500));

                const extractedData = await page.evaluate(() => {
                    // 1. Try to isolate the "Zubehör" section
                    const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, .headline, .title, .caption, strong'));
                    const zubehoerHeading = headings.find(h => {
                        const t = h.innerText.toLowerCase();
                        return t.includes('zubehör') && !t.includes('alternative') && !t.includes('ausführung');
                    });
                    
                    let candidateItems = [];
                    if (zubehoerHeading) {
                        // Find the container for this section
                        let container = zubehoerHeading.parentElement;
                        // Go up to find a container that likely holds the related products grid/list
                        for (let i = 0; i < 4; i++) {
                            if (!container) break;
                            const products = container.querySelectorAll('.product-list-item, tr, article, .card');
                            if (products.length > 0) {
                                candidateItems = Array.from(products);
                                break;
                            }
                            container = container.parentElement;
                        }
                    }

                    // 2. Identify "Alternative" sections to explicitly exclude them if we haven't isolated Zubehör
                    const alternativeHeadings = headings.filter(h => {
                        const t = h.innerText.toLowerCase();
                        return t.includes('alternative') || t.includes('ausführung') || t.includes('farben') || t.includes('varianten');
                    });

                    const items = candidateItems.length > 0 ? candidateItems : Array.from(document.querySelectorAll('.product-list-item, tr, .row, article, .card'));
                    
                    const extracted = {
                        ablaufdeckel: [],
                        ablaufgarnitur: [],
                        wannentraeger: [],
                        montagerahmen: [],
                        stelzfüsse: [],
                        montageset: [],
                        dichtband: [],
                        montageschaum: [],
                        schallschutz: [],
                        others: []
                    };

                    for (let item of items) {
                        // Skip if this item is inside an "Alternative" section
                        if (candidateItems.length === 0 && alternativeHeadings.some(h => h.parentElement.contains(item))) {
                            continue;
                        }

                        const text = (item.innerText || '').toLowerCase();
                        const artMatch = text.match(/(\d{4}\s?\d{3}\.\d{3}\.\d{3}|\d{7,8})/);
                        if (!artMatch) continue;
                        
                        const artNr = artMatch[0].replace(/\n/g, '').trim();

                        let label = "";
                        const titleEl = item.querySelector('.product-list-item-title, .product-name, .article-description, h3, .name, a[href*="article-"]');
                        if (titleEl) {
                            label = titleEl.innerText.replace(/\n/g, ' ').trim();
                        } else {
                            const anyLink = item.querySelector('a');
                            if (anyLink && anyLink.innerText.trim().length > 2) {
                                label = anyLink.innerText.replace(/\n/g, ' ').trim();
                            }
                        }
                        
                        if (!label) {
                            const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 3 && !l.includes(artNr));
                            label = lines.length > 0 ? lines[0] : "Unbekanntes Zubehör";
                        }

                        let imgUrl = "";
                        const img = item.querySelector('img');
                        if (img && img.src) imgUrl = img.src;

                        // STRENGHTENED FILTER: Skip if it's likely a tray variant
                        // Trays usually have long titles with dimensions and material info
                        const isTray = text.includes('duschwanne') || text.includes('duschenwanne');
                        const hasAccessoryKeyword = text.includes('zubehör') || 
                                                  text.includes('träger') || 
                                                  text.includes('rahmen') ||
                                                  text.match(/\bsets?\b/) ||
                                                  text.includes('profil') ||
                                                  text.includes('siphon') ||
                                                  text.includes('deckel') ||
                                                  text.includes('ablauf') ||
                                                  text.includes('füsse') ||
                                                  text.includes('band') ||
                                                  text.includes('schaum') ||
                                                  text.includes('schall');

                        // If it's a tray and doesn't have an accessory keyword, OR if it mentions color/surface without accessory context
                        if (isTray && !hasAccessoryKeyword) continue;
                        if (text.includes('oberfläche') && !hasAccessoryKeyword) continue;
                        if (text.includes('weiss matt') || text.includes('anthrazit') || text.includes('sand')) {
                             if (!hasAccessoryKeyword) continue;
                        }

                        const accessoryData = { artNr, label, imgUrl };

                        // Categorization
                        const hasSiphon = text.includes('siphon') || text.includes('ablaufgarnitur') || text.includes('garnitur') || text.includes('geruchsverschluss');
                        const hasDeckel = text.includes('deckel') || text.includes('abdeckplatte') || text.includes('ablaufdeckel') || text.includes('rost');
                        const hasCarrier = text.includes('wannenträger') || text.includes('styropor') || text.includes('träger');
                        const hasFrame = text.includes('montagerahmen') || text.includes('einbaurahmen') || text.includes('füsse') || text.includes('fussset') || text.includes('gestell');
                        const hasFeet = text.includes('stelzfüss') || text.includes('stelzfuss');
                        const hasSet = text.includes('montageset') || text.includes('duschen-montageset') || text.includes('einbauset');
                        const hasTape = text.includes('dichtband') || text.includes('zargenband') || text.includes('dichtset') || text.includes('fugenband') || text.includes('dichtvlies');
                        const hasFoam = text.includes('montageschaum') || text.includes('schaum') || text.includes('pu-schaum');
                        const hasSound = text.includes('schallschutz') || text.includes('dämmung') || text.includes('entkopplung');

                        if (hasDeckel) {
                            if (!extracted.ablaufdeckel.find(s => s.artNr === artNr)) extracted.ablaufdeckel.push(accessoryData);
                        } else if (hasSiphon) {
                            if (!extracted.ablaufgarnitur.find(s => s.artNr === artNr)) extracted.ablaufgarnitur.push(accessoryData);
                        } else if (hasCarrier) {
                            if (!extracted.wannentraeger.find(s => s.artNr === artNr)) extracted.wannentraeger.push(accessoryData);
                        } else if (hasFeet) {
                            if (!extracted.stelzfüsse.find(s => s.artNr === artNr)) extracted.stelzfüsse.push(accessoryData);
                        } else if (hasFrame) {
                            if (!extracted.montagerahmen.find(s => s.artNr === artNr)) extracted.montagerahmen.push(accessoryData);
                        } else if (hasSet) {
                            if (!extracted.montageset.find(s => s.artNr === artNr)) extracted.montageset.push(accessoryData);
                        } else if (hasTape) {
                            if (!extracted.dichtband.find(s => s.artNr === artNr)) extracted.dichtband.push(accessoryData);
                        } else if (hasFoam) {
                            if (!extracted.montageschaum.find(s => s.artNr === artNr)) extracted.montageschaum.push(accessoryData);
                        } else if (hasSound) {
                            if (!extracted.schallschutz.find(s => s.artNr === artNr)) extracted.schallschutz.push(accessoryData);
                        } else {
                            if (!extracted.others.find(s => s.artNr === artNr)) extracted.others.push(accessoryData);
                        }
                    }
                    return extracted;
                });

                const totalFound = Object.values(extractedData).reduce((acc, curr) => acc + curr.length, 0);
                if (totalFound > 0) {
                    console.log(`   -> 🔥 SUCCESS: Found ${totalFound} accessories.`);
                } else {
                    console.log(`   -> ⚠️ No accessories found on PDP.`);
                    missing.push(`${tray.artNr},${tray.label},No Accessories Found`);
                }

                results[tray.artNr] = extractedData;
                fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));

                // Periodically save missing list
                fs.writeFileSync(csvPath, "ArtNr,Label,Reason\n" + missing.join("\n"));

            } catch (err) {
                console.log(`   -> ❌ Error:`, err.message);
            }
        }
    } finally {
        console.log(`\n✅ Scraping finished. Results: ${outputPath}`);
        console.log(`📁 Audit file: ${csvPath}`);
        await browser.close();
    }
})();
