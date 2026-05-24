const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());
const fs = require('fs');
const path = require('path');

/**
 * DUSCHENRINNE ACCESSORY SCRAPER
 * 
 * Crawls Sanitas Troesch profishop PDPs for shower channels (Duschenrinnen),
 * extracts the exact manufacturer/brand, and scrapes related accessories under "Verwandte Artikel".
 * Accessories are categorized into:
 *  - ablaufgehaeuse_siphon
 *  - schallschutz
 *  - misc
 */

const dataPath = path.resolve(__dirname, '../custom-data.json');
const outputPath = path.resolve(__dirname, 'duschenrinne-accessories.json');
const logPath = path.resolve(__dirname, 'scraper_output.log');

function formatArtNr(raw) {
    const clean = raw.replace(/\D/g, '');
    if (clean.length === 13) {
        return `${clean.slice(0, 4)} ${clean.slice(4, 7)}.${clean.slice(7, 10)}.${clean.slice(10, 13)}`;
    }
    return raw.trim();
}

const ersatzKeywords = [
    'fixierring', 'manschette', 'kammeinsatz', 'saugnapf', 'geruchsverschluss', 
    'haarsieb', 'stellschraube', 'klammer', 'schlüssel', 'schluessel', 
    'bürste', 'buerste', 'reinigungs', 'sauger', 'sieb', 'ersatz', 'ersatzteil'
];

function isErsatzteil(label, text) {
    const combined = `${label} ${text}`.toLowerCase();
    return ersatzKeywords.some(kw => combined.includes(kw));
}

function classifyAccessory(label, text) {
    const combined = `${label} ${text}`.toLowerCase();
    
    // Ablaufgehäuse / Siphon
    const siphonKeywords = [
        'siphon', 'ablauf', 'gehäuse', 'gehaeuse', 'geruchsverschluss', 
        'ubox', 'grundkörper', 'grundkoerper', 'ablaufgehäuse', 'entwässerung', 
        'entwaesserung', 'rohbauset', 'einbauset', 'installationsset', 'bauset'
    ];
    if (siphonKeywords.some(kw => combined.includes(kw))) {
        return 'ablaufgehaeuse_siphon';
    }
    
    // Schallschutz
    const schallKeywords = [
        'schallschutz', 'entkopplungs', 'schall', 'dämmung', 'dammung', 'entkoppel'
    ];
    if (schallKeywords.some(kw => combined.includes(kw))) {
        return 'schallschutz';
    }
    
    return 'misc';
}

(async () => {
    let data;
    try {
        data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
    } catch (e) {
        console.error("❌ Could not find custom-data.json at:", dataPath);
        return;
    }

    if (!data.duschenrinne || !data.duschenrinne.trays) {
        console.error("❌ No duschenrinne trays found in custom-data.json");
        return;
    }

    const LIMIT = process.env.LIMIT ? parseInt(process.env.LIMIT) : null;
    const trays = data.duschenrinne.trays;
    const targetTrays = LIMIT ? trays.slice(0, LIMIT) : trays;

    console.log(`🚀 Starting Duschenrinne Accessory Scraper on ${targetTrays.length} items (Total: ${trays.length})...`);
    
    const browser = await puppeteer.launch({ 
        headless: 'new',
        args: ['--no-sandbox', '--window-size=1920,1080'] 
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    await page.setUserAgent(
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
    );

    const results = {};
    if (fs.existsSync(outputPath)) {
        try {
            Object.assign(results, JSON.parse(fs.readFileSync(outputPath, 'utf8')));
            console.log(`Loaded ${Object.keys(results).length} existing results from ${outputPath}`);
        } catch(e) {
            console.log("Starting fresh accessories JSON output.");
        }
    }

    let updatedBrandsCount = 0;

    try {
        for (let i = 0; i < targetTrays.length; i++) {
            const tray = targetTrays[i];
            const originalArtNr = tray.artNr;
            
            if (results[originalArtNr]) {
                console.log(`[${i+1}/${targetTrays.length}] Skipping ${originalArtNr} (Already Scraped)`);
                continue;
            }
            
            console.log(`\n[${i+1}/${targetTrays.length}] Processing Tray: ${originalArtNr} - ${tray.label.substring(0, 50)}...`);
            
            // Clean article number for search
            const cleanFull = originalArtNr.replace(/\s/g, '');
            const match = cleanFull.match(/^\d{7,8}/);
            const searchQuery = match ? match[0] : originalArtNr.trim();

            try {
                // Navigate to search
                const searchUrl = `https://profishop.sanitastroesch.ch/business/search?q=${encodeURIComponent(searchQuery)}`;
                await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 30000 });
                await new Promise(r => setTimeout(r, 1500));

                let currentUrl = await page.url();
                let isSearchPage = currentUrl.includes('/search') || currentUrl.includes('/business/search');

                // Fallback check if search returned "Keine Ergebnisse"
                const noResults = await page.evaluate(() => document.body.innerText.includes('Keine Ergebnisse'));
                if (noResults) {
                    console.log(`   -> Query failed on broad match. Trying full clean ArtNr: ${cleanFull}`);
                    await page.goto(`https://profishop.sanitastroesch.ch/business/search?q=${cleanFull}`, { waitUntil: 'networkidle2' });
                    await new Promise(r => setTimeout(r, 1500));
                    currentUrl = await page.url();
                    isSearchPage = currentUrl.includes('/search') || currentUrl.includes('/business/search');
                }

                if (isSearchPage) {
                    // Find product PDP link
                    const productHref = await page.evaluate((sq) => {
                        const links = Array.from(document.querySelectorAll('a'));
                        for (let a of links) {
                            const href = a.href || '';
                            if (href.includes('/p/') || href.includes('/product/') || href.includes('/article-') || href.includes('/business/article-')) {
                                return href;
                            }
                        }
                        return null;
                    }, searchQuery);

                    if (productHref) {
                        console.log(`   -> Navigating to PDP: ${productHref}`);
                        await page.goto(productHref, { waitUntil: 'networkidle2', timeout: 30000 });
                        await new Promise(r => setTimeout(r, 2000));
                    } else {
                        console.log(`   -> ⚠️ No PDP link found on search page. Skipping.`);
                        continue;
                    }
                }

                // Verify we are not stuck on search
                const finalUrl = await page.url();
                if (finalUrl.includes('/search') || finalUrl.includes('/business/search')) {
                    console.log(`   -> ⚠️ Failed to reach PDP. Skipping.`);
                    continue;
                }

                // 1. Get Brand exactly (Marke / Hersteller)
                const brand = await page.evaluate(() => {
                    const rows = Array.from(document.querySelectorAll('tr'));
                    for (let r of rows) {
                        const cells = Array.from(r.querySelectorAll('td, th'));
                        if (cells.length >= 2) {
                            const label = cells[0].innerText.trim().toLowerCase();
                            if (label === 'marke' || label.includes('marke') || label === 'hersteller' || label.includes('hersteller')) {
                                return cells[1].innerText.trim();
                            }
                        }
                    }
                    // Fallback to searching all text nodes for Marke\t
                    const allElements = Array.from(document.querySelectorAll('td, th, span, div, p, li'));
                    for (let c of allElements) {
                        const txt = c.innerText || '';
                        if (txt.includes('Marke\t')) {
                            return txt.split('\t')[1].trim();
                        }
                    }
                    return null;
                });

                if (brand) {
                    console.log(`   -> Hersteller: "${brand}" (Original: "${tray.manufacturer}")`);
                    if (tray.manufacturer !== brand) {
                        tray.manufacturer = brand;
                        updatedBrandsCount++;
                    }
                } else {
                    console.log(`   -> ⚠️ Brand not found on page.`);
                }

                // 2. Scroll to load related articles (Verwandte Artikel / Zubehör)
                console.log(`   -> Scrolling down to trigger lazy loading...`);
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
                await new Promise(r => setTimeout(r, 2500));

                // 3. Extract accessories from "Verwandte Artikel"
                const extractedAccessories = await page.evaluate(() => {
                    const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, .headline, .title, strong, .tab, button'));
                    const heading = headings.find(h => {
                        const t = h.innerText.trim().toLowerCase();
                        return t.includes('verwandte artikel') || t.includes('zubehör');
                    });
                    
                    if (!heading) return [];

                    // Traverse up to find container for related products list
                    let container = heading.parentElement;
                    let items = [];
                    for (let d = 0; d < 8; d++) {
                        if (!container) break;
                        const found = container.querySelectorAll('.list-group-item, .product-list-item, tr, article, .card');
                        if (found.length > 0) {
                            items = Array.from(found);
                            break;
                        }
                        container = container.parentElement;
                    }

                    const list = [];
                    const seenArtNrs = new Set();

                    for (let item of items) {
                        const text = item.innerText || '';
                        
                        // Look for article number (like Art-Nr. 1424 930.000.000 or clean numbers in links)
                        const artMatch = text.match(/(\d{4}[\s.]?\d{3}[\s.]?\d{3}[\s.]?\d{3})/);
                        let artNrRaw = artMatch ? artMatch[1] : null;

                        // Try finding it from the product link
                        const linkEl = item.querySelector('a');
                        const href = linkEl ? linkEl.href : '';
                        if (!artNrRaw && href) {
                            const hrefMatch = href.match(/(\d{13}|\d{10})/);
                            if (hrefMatch) artNrRaw = hrefMatch[1];
                        }

                        if (!artNrRaw) continue;

                        // Get product label
                        let label = "";
                        // Preferred selectors for list items or links
                        const labelEl = item.querySelector('.article-description, .product-list-item-title, .product-name, h3, h4, .name');
                        if (labelEl) {
                            label = labelEl.innerText.trim();
                        } else if (linkEl && linkEl.innerText.trim().length > 2) {
                            label = linkEl.innerText.trim();
                        } else {
                            // Split text by lines
                            const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 2);
                            label = lines[0] || "Unbekanntes Zubehör";
                        }

                        // Remove Art-Nr suffix or prefix if in label
                        label = label.replace(/Art-Nr\..*$/i, '').replace(/Art\.-Nr\..*$/i, '').trim();

                        // Get image
                        let imgUrl = "";
                        const img = item.querySelector('img');
                        if (img && img.src) imgUrl = img.src;

                        // Add to list if not seen before
                        if (artNrRaw && !seenArtNrs.has(artNrRaw)) {
                            seenArtNrs.add(artNrRaw);
                            list.push({
                                artNrRaw,
                                label,
                                imgUrl,
                                itemText: text
                            });
                        }
                    }

                    return list;
                });

                // Categorize extracted accessories
                const ablaufgehaeuse_siphon = [];
                const schallschutz = [];
                const misc = [];

                for (let acc of extractedAccessories) {
                    if (isErsatzteil(acc.label, acc.itemText)) {
                        continue; // Skip spare parts/tools/maintenance items
                    }
                    const formatted = formatArtNr(acc.artNrRaw);
                    const category = classifyAccessory(acc.label, acc.itemText);
                    const accData = {
                        artNr: formatted,
                        label: acc.label,
                        imgUrl: acc.imgUrl
                    };

                    if (category === 'ablaufgehaeuse_siphon') {
                        ablaufgehaeuse_siphon.push(accData);
                    } else if (category === 'schallschutz') {
                        schallschutz.push(accData);
                    } else {
                        misc.push(accData);
                    }
                }

                console.log(`   -> Found Accessories: Ablaufgehäuse: ${ablaufgehaeuse_siphon.length}, Schallschutz: ${schallschutz.length}, Misc: ${misc.length}`);

                results[originalArtNr] = {
                    brand: brand || tray.manufacturer || "Unbekannt",
                    ablaufgehaeuse_siphon,
                    schallschutz,
                    misc
                };

                // Save results progress
                fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));

                // Save custom-data update progress periodically
                if (updatedBrandsCount > 0 && i % 5 === 0) {
                    fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
                    console.log(`   💾 Saved updated brand information to custom-data.json`);
                }

            } catch (err) {
                console.error(`   ❌ Error processing ${originalArtNr}:`, err.message);
            }
        }

        // Final save of all data
        fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
        fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
        console.log(`\n✅ Scraping session complete.`);
        console.log(`📁 Accessories output: ${outputPath}`);
        console.log(`💾 Brand corrections saved: ${updatedBrandsCount} items updated in custom-data.json`);

    } finally {
        await browser.close();
    }
})();
