const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());
const fs = require('fs');
const path = require('path');

const dataPath = '/Users/jenistonsellathamby/Desktop/product-configurator/custom-data.json';
const outputPath = '/Users/jenistonsellathamby/Desktop/product-configurator/st-scraper/duschtrennwand-services.json';

const CONCURRENCY = 4; // Use 4 browser pages in parallel

(async () => {
    let data;
    try {
        data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
    } catch (e) {
        console.log("Could not find custom-data.json");
        return;
    }

    // Identify target items in both categories
    function getTargets(cat) {
        return (data[cat]?.trays || []).filter(t => {
            if (t.services && t.services.length > 0) return false;
            const l = (t.label || '').toLowerCase();
            const isService = l.includes('massaufnahme') || l.includes('montagepauschale') || l.includes('anfahrtspauschale') || l.includes('demontage') || l.includes('dienstleistung');
            const isAccessory = l.includes('klebeset') || l.includes('wandprofil') || l.includes('oberflächenschutz') || l.includes('stabilisation') || l.includes('handtuchhalter') || l.includes('traverse') || l.includes('verlängerung') || l.includes('glas-comfort') || l.includes('reiniger') || l.includes('dichtung');
            return !isService && !isAccessory;
        });
    }

    const dtTargets = getTargets('duschtrennwand');
    const baTargets = getTargets('badeabtrennung');
    const targetTrays = [...dtTargets, ...baTargets];

    console.log(`🚀 Starting CONCURRENT Glass Service Scraper (concurrency: ${CONCURRENCY}) on ${targetTrays.length} items (${dtTargets.length} Duschtrennwand, ${baTargets.length} Badeabtrennung)...`);

    const results = {};
    if (fs.existsSync(outputPath)) {
        try {
            Object.assign(results, JSON.parse(fs.readFileSync(outputPath, 'utf8')));
            console.log(`Loaded ${Object.keys(results).length} existing results.`);
        } catch(e) {}
    }

    const browser = await puppeteer.launch({ 
        headless: 'new',
        args: ['--no-sandbox', '--window-size=1920,1080'] 
    });

    let targetIndex = 0;
    
    // Mutex write helper to avoid race conditions when saving file
    function saveResults() {
        fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
    }

    async function worker(workerId) {
        let page = await browser.newPage();
        await page.setViewport({ width: 1920, height: 1080 });

        while (true) {
            let currentIndex;
            // Get next task
            currentIndex = targetIndex++;
            if (currentIndex >= targetTrays.length) {
                break;
            }

            const tray = targetTrays[currentIndex];
            
            // Check if already has scraped results in the file
            if (results[tray.artNr] && results[tray.artNr].length > 0) {
                console.log(`[Worker ${workerId}] [${currentIndex+1}/${targetTrays.length}] Skipping ${tray.artNr} (Already Scraped and has items)`);
                continue;
            }

            const cleanArtNr = tray.artNr.replace(/\s/g, '');
            const match = cleanArtNr.match(/^\d{7,8}/);
            const searchQuery = tray.artNr;

            console.log(`[Worker ${workerId}] [${currentIndex+1}/${targetTrays.length}] Searching: ${tray.artNr} - ${tray.label.substring(0, 60)}...`);
            
            try {
                let targetUrl = `https://profishop.sanitastroesch.ch/business/search?q=${encodeURIComponent(searchQuery)}`;
                await page.goto(targetUrl, { waitUntil: 'networkidle2', timeout: 30000 });
                await new Promise(r => setTimeout(r, 1500));
                
                let currentUrl = await page.url();
                let isSearchPage = currentUrl.includes('/search');

                if (isSearchPage) {
                    const productHref = await page.evaluate((m) => {
                        const links = Array.from(document.querySelectorAll('a'));
                        for (let a of links) {
                            const href = a.href || '';
                            if (href.includes('/business/article-') && !href.includes('/search') && m && href.includes(m)) return href;
                        }
                        return null;
                    }, match ? match[0] : cleanArtNr);

                    if (productHref) {
                        await page.goto(productHref, { waitUntil: 'networkidle2', timeout: 30000 });
                        await new Promise(r => setTimeout(r, 1500));
                    }
                }

                const finalUrl = await page.url();
                if (finalUrl.includes('/search')) {
                    console.log(`[Worker ${workerId}]    -> ⚠️ PDP not found. Skipping.`);
                    results[tray.artNr] = [];
                    saveResults();
                    continue;
                }

                // Scroll to load related articles (Zubehör)
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

                // Auto-click accordion tabs
                await page.evaluate(() => {
                    const tabs = Array.from(document.querySelectorAll('button, a, .tab, li, [role="tab"], h4'));
                    const verw = tabs.find(el => el.innerText.toLowerCase().trim().includes('verwandte'));
                    if (verw && typeof verw.click === 'function') verw.click();
                    
                    const mTab = tabs.find(el => {
                        const t = el.innerText.toLowerCase().trim();
                        return t === 'm' || t === 'montage' || t.includes('zubehör');
                    });
                    if (mTab && typeof mTab.click === 'function') mTab.click();
                });

                await new Promise(r => setTimeout(r, 1500));

                const scrapedAccessories = await page.evaluate(() => {
                    const items = Array.from(document.querySelectorAll('.product-list-item, tr, .row, article, .card'));
                    const validItems = [];
                    const seen = new Set();
                    for (let item of items) {
                        const text = (item.innerText || '').toLowerCase();
                        const artMatch = text.match(/(\d{4}\s?\d{3}\.\d{3}\.\d{3}|\d{7,8})/);
                        if (!artMatch) continue;
                        
                        const artNr = artMatch[0].replace(/\n/g, '').trim();
                        if (seen.has(artNr)) continue;
                        
                        let label = "";
                        const titleEl = item.querySelector('.st-product-card__title, .title, h3, h4, td.description, .product-name');
                        if (titleEl) label = titleEl.innerText.replace(/\n/g, ' ').trim();
                        else label = item.innerText.split('\n')[0].trim();
                        
                        const labelLower = label.toLowerCase();
                        if (labelLower.includes('massaufnahme') || labelLower.includes('anfahrtspauschale') || labelLower.includes('montagepauschale')) {
                            seen.add(artNr);
                            validItems.push({ artNr, label, qty: 1 });
                        }
                    }
                    return validItems;
                });

                console.log(`[Worker ${workerId}]    -> ✅ Found ${scrapedAccessories.length} service costs.`);
                results[tray.artNr] = scrapedAccessories;
                saveResults();

            } catch (err) {
                console.log(`[Worker ${workerId}]    -> ❌ Error: ${err.message}`);
                try { await page.close(); } catch(e) {}
                try {
                    page = await browser.newPage();
                    await page.setViewport({ width: 1920, height: 1080 });
                } catch(e) {}
            }
        }
        
        try { await page.close(); } catch(e) {}
    }

    // Launch workers
    const workers = [];
    for (let i = 0; i < CONCURRENCY; i++) {
        workers.push(worker(i + 1));
    }

    try {
        await Promise.all(workers);
    } finally {
        await browser.close();
        console.log("Scraping finished.");
    }
})();
