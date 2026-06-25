const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());
const fs = require('fs');
const path = require('path');

const csvPath = path.resolve(__dirname, '../new_auflege.csv');
const outPath = path.resolve(__dirname, '../enriched_auflege.csv');

(async () => {
    let csvFile;
    try {
        csvFile = fs.readFileSync(csvPath, 'utf8');
    } catch (e) {
        console.log("Could not find new_auflege.csv");
        return;
    }

    const lines = csvFile.split('\n').filter(l => l.trim().length > 0);
    const header = lines[0];
    const items = lines.slice(1);
    
    const newHeader = header + ',Scraped_Ablaufventil_ArtNr,Scraped_Ablaufventil_Label,Scraped_Hahnloch';
    fs.writeFileSync(outPath, newHeader + '\n');

    console.log(`Starting scrape for ${items.length} items...`);

    const browser = await puppeteer.launch({ 
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1920,1080'] 
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });

    try {
        for (let i = 0; i < items.length; i++) {
            const line = items[i].trim();
            if (!line) continue;
            
            // Extract ArtNr
            let inQuotes = false;
            let artNr = '';
            for (let j = 0; j < line.length; j++) {
                const char = line[j];
                if (char === '"') inQuotes = !inQuotes;
                else if (char === ',' && !inQuotes) break;
                else artNr += char;
            }
            artNr = artNr.replace(/"/g, '').trim();
            const cleanArtNr = artNr.replace(/\s/g, '');
            const match = cleanArtNr.match(/^\d{7,8}/);
            const searchQuery = match ? match[0] : cleanArtNr;

            console.log(`\n[${i+1}/${items.length}] Searching ArtNr: ${artNr}`);
            
            let ventilArtNr = '';
            let ventilLabel = '';
            let hahnlochText = '';

            try {
                await page.goto(`https://profishop.sanitastroesch.ch/business/search?q=${encodeURIComponent(searchQuery)}`, { waitUntil: 'networkidle2', timeout: 30000 });
                await new Promise(r => setTimeout(r, 2000));
                
                let currentUrl = await page.url();
                let isSearchPage = currentUrl.includes('/search');

                if (isSearchPage) {
                    const productHref = await page.evaluate((sq) => {
                        const links = Array.from(document.querySelectorAll('a'));
                        for (let a of links) {
                            if (a.href && a.href.includes('/business/article-') && !a.href.includes('/search')) {
                                return a.href;
                            }
                        }
                        return null;
                    }, searchQuery);

                    if (productHref) {
                        await page.goto(productHref, { waitUntil: 'networkidle0', timeout: 30000 });
                        await new Promise(r => setTimeout(r, 4000));
                    } else {
                        console.log(`   -> Search failed to find PDP link.`);
                        fs.appendFileSync(outPath, `${line},,,\n`);
                        continue;
                    }
                } else {
                    await new Promise(r => setTimeout(r, 4000));
                }

                // Scroll to load accessories
                await page.evaluate(async () => {
                    await new Promise((resolve) => {
                        let totalHeight = 0;
                        const distance = 500;
                        const timer = setInterval(() => {
                            window.scrollBy(0, distance);
                            totalHeight += distance;
                            if (totalHeight >= document.body.scrollHeight - window.innerHeight || totalHeight > 10000) {
                                clearInterval(timer);
                                resolve();
                            }
                        }, 200);
                    });
                });
                await new Promise(r => setTimeout(r, 2000));

                const pdpData = await page.evaluate(() => {
                    const rows = Array.from(document.querySelectorAll('.product-list-item, tr, .row, article, .card')); 
                    let foundVentil = null;

                    for (let row of rows) {
                        const txt = row.innerText || '';
                        const txtLower = txt.toLowerCase();
                        
                        if (txtLower.includes('art-nr.') || txtLower.includes('chf')) {
                            const match = txt.match(/\d{4}\s\d{3}\.\d{3}\.\d{3}/);
                            
                            const isVentil = txtLower.includes('ablaufventil') || txtLower.includes('schaftventil') || txtLower.includes('ventil');
                            const isVariant = txtLower.includes('auflegewaschtisch') || txtLower.includes('handwaschbecken');
                            const isSpare = txtLower.includes('abdeckung') || txtLower.includes('ersatzteil') || txtLower.includes('dichtung') || txtLower.includes('haube');
                            const isSiphon = txtLower.includes('siphon') || txtLower.includes('geruchverschluss');

                            if (match && isVentil && !isVariant && !isSpare && !isSiphon) {
                                foundVentil = {
                                    artNr: match[0],
                                    label: txt.replace(/\n/g, ' ').replace(/"/g, '""').substring(0, 150)
                                };
                                break;
                            }
                        }
                    }

                    const pageText = document.body.innerText.replace(/\n/g, ' ');
                    const pageLower = pageText.toLowerCase();
                    
                    let hahnloch = '';
                    if (pageLower.includes('ohne hahnloch')) hahnloch = 'ohne Hahnloch';
                    else if (pageLower.includes('mit hahnloch')) hahnloch = 'mit Hahnloch';
                    else if (pageLower.includes('hahnloch')) hahnloch = 'erwähnt Hahnloch';

                    return { foundVentil, hahnloch };
                });

                if (pdpData.foundVentil) {
                    ventilArtNr = pdpData.foundVentil.artNr;
                    ventilLabel = `"${pdpData.foundVentil.label}"`;
                    console.log(`   -> Ventil found: ${ventilArtNr}`);
                } else {
                    console.log(`   -> No Ventil found.`);
                }

                if (pdpData.hahnloch) {
                    hahnlochText = pdpData.hahnloch;
                    console.log(`   -> Hahnloch: ${hahnlochText}`);
                } else {
                    console.log(`   -> No Hahnloch info.`);
                }

            } catch (err) {
                console.log(`   -> Error: ${err.message}`);
            }

            fs.appendFileSync(outPath, `${line},${ventilArtNr},${ventilLabel},${hahnlochText}\n`);
        }
    } finally {
        await browser.close();
        console.log(`Scraping finished. File saved to enriched_auflege.csv.`);
    }
})();
