const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());
const fs = require('fs');
const path = require('path');

const dataPath = path.resolve(__dirname, '../custom-data.json');
const outputPath = path.resolve(__dirname, 'schmidlin_variations.json');

(async () => {
    console.log(`Starting All-Showertray Variations Scraper...`);

    let data;
    try {
        data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
    } catch (e) {
        console.error("Could not find custom-data.json at:", dataPath);
        return;
    }

    if (!data.duschenwanne || !data.duschenwanne.trays) {
        console.error("No showertrays found in custom-data.json under duschenwanne.trays");
        return;
    }

    const trays = data.duschenwanne.trays;
    console.log(`Loaded ${trays.length} showertrays from custom-data.json`);

    const results = {};
    if (fs.existsSync(outputPath)) {
        try {
            Object.assign(results, JSON.parse(fs.readFileSync(outputPath, 'utf8')));
            console.log(`Loaded ${Object.keys(results).length} existing results from ${outputPath}`);
        } catch (e) {
            console.log("Could not parse existing schmidlin_variations.json, starting fresh.");
        }
    }

    const browser = await puppeteer.launch({ 
        headless: false, // Non-headless so user can see it and bypass captchas
        args: ['--no-sandbox', '--window-size=1920,1080'] 
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });

    try {
        console.log(`Navigating to homepage once to establish session...`);
        await page.goto('https://profishop.sanitastroesch.ch/', { waitUntil: 'networkidle2', timeout: 60000 });
        await new Promise(r => setTimeout(r, 4000));

        for (let i = 0; i < trays.length; i++) {
            const tray = trays[i];
            const artNr = tray.artNr;
            
            if (results[artNr] && !results[artNr].error) {
                console.log(`[${i + 1}/${trays.length}] Skipping ${artNr} (Already Scraped)`);
                continue;
            }

            console.log(`\n[${i + 1}/${trays.length}] Scraping variations for ArtNr: ${artNr}`);
            const cleanArt = artNr.replace(/[\s\.]/g, '');
            const baseArtNr = cleanArt.substring(0, 7);
            const searchQuery = artNr; 

            try {
                // Navigate to homepage
                console.log(`  Navigating to homepage...`);
                await page.goto('https://profishop.sanitastroesch.ch/', { waitUntil: 'domcontentloaded', timeout: 30000 });
                await new Promise(r => setTimeout(r, 2000));

                // Enter search query in the search field
                console.log(`  Entering search query in search field: ${searchQuery}`);
                const searchInputSelector = 'input[type="text"], input[type="search"], input[placeholder*="Such"], input[placeholder*="search"]';
                await page.waitForSelector(searchInputSelector, { timeout: 15000 });
                await page.focus(searchInputSelector);
                await page.evaluate((sel) => document.querySelector(sel).value = '', searchInputSelector);
                await page.type(searchInputSelector, searchQuery, { delay: 100 });
                await page.keyboard.press('Enter');

                console.log(`  Waiting for search results...`);
                await new Promise(r => setTimeout(r, 5000));

                console.log(`  Clicking on the product...`);
                const productClicked = await page.evaluate((sq, base) => {
                    const links = Array.from(document.querySelectorAll('a'));
                    
                    // Clean up query for matching
                    const cleanSq = sq.replace(/[\s\.]/g, '');
                    
                    for (let a of links) {
                        const href = (a.href || '').toLowerCase();
                        const cleanHref = href.replace(/[\s\.]/g, '');
                        
                        // If the link contains the full article number or base article number, click it
                        if ((cleanHref.includes(cleanSq) || cleanHref.includes(base)) && !href.includes('/search')) {
                            a.click();
                            return true;
                        }
                    }
                    return false;
                }, searchQuery, baseArtNr);

                if (!productClicked) {
                    console.log("  Could not find specific product link, trying fallback to first product image/link...");
                    const clickedFallback = await page.evaluate(() => {
                        const firstResult = document.querySelector('.product-item a, article a, .search-result a');
                        if (firstResult) {
                            firstResult.click();
                            return true;
                        }
                        return false;
                    });
                    if (!clickedFallback) {
                        console.log("  No links found on search page, skipping.");
                        results[artNr] = { error: "No search results found" };
                        fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
                        continue;
                    }
                }

                console.log(`  Waiting for product page to fully load...`);
                await new Promise(r => setTimeout(r, 5000));

                console.log(`  Scrolling down to 'weitere Varianten' section...`);
                // Scroll down smoothly to trigger lazy loading of the variations section
                for (let j = 0; j < 6; j++) {
                    await page.evaluate(() => window.scrollBy(0, 800));
                    await new Promise(r => setTimeout(r, 800));
                }

                console.log(`  Scraping variations...`);
                const extractedData = await page.evaluate((base) => {
                    let results = [];
                    
                    // Look for tables or lists near "weitere Varianten"
                    const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, div, span, p'));
                    const variantHeading = headings.find(h => 
                        h.innerText.toLowerCase().includes('weitere varianten') || 
                        h.innerText.toLowerCase().includes('varianten')
                    );
                    
                    if (variantHeading) {
                        // Scan the parent or siblings for tables / lists
                        let current = variantHeading.nextElementSibling;
                        for (let k = 0; k < 5; k++) {
                            if (current) {
                                const items = current.querySelectorAll('tr, li, .variant-row, .item');
                                items.forEach(item => {
                                    if (item.innerText.trim()) results.push(item.innerText.replace(/\n|\t/g, ' ').trim());
                                });
                                current = current.nextElementSibling;
                            }
                        }
                        
                        // If we found a table inside the parent
                        if (results.length === 0) {
                            const parent = variantHeading.parentElement;
                            if (parent) {
                                const items = parent.querySelectorAll('tr');
                                items.forEach(row => results.push(row.innerText.replace(/\n|\t/g, ' ').trim()));
                            }
                        }
                    }

                    // Fallback: If we didn't find the specific heading, look for any table rows containing the base article number
                    if (results.length === 0) {
                        const rows = document.querySelectorAll('tr, .row');
                        rows.forEach(row => {
                            if (row.innerText.replace(/\s/g, '').includes(base)) {
                                results.push(row.innerText.replace(/\n|\t/g, ' ').trim());
                            }
                        });
                    }

                    // Fallback 2: Regex the whole DOM text for article numbers matching the pattern
                    let rawArticleNumbers = [];
                    const bodyText = document.body.innerText;
                    // Matches formats like 1311 407.100.000 or 1311407.100.000
                    const regex = new RegExp(base.substring(0, 4) + '\\s?' + base.substring(4) + '\\.\\d{3}\\.\\d{3}', 'g');
                    const matches = bodyText.match(regex);
                    if (matches) {
                        rawArticleNumbers = [...new Set(matches)];
                    }

                    return {
                        textRowsFound: results.length,
                        textRows: results,
                        rawArticleNumbersFound: rawArticleNumbers.length,
                        rawArticleNumbers: rawArticleNumbers
                    };
                }, baseArtNr);

                console.log(`  Found ${extractedData.textRowsFound} variant rows in tables/lists.`);
                console.log(`  Found ${extractedData.rawArticleNumbersFound} specific article numbers via Regex.`);
                
                results[artNr] = extractedData;
                fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
                console.log(`  Successfully saved variations to ${outputPath}`);

            } catch (err) {
                console.error(`  Error during scraping for ${artNr}:`, err.message);
                results[artNr] = { error: err.message };
                fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
            }

            // Pause between requests to be gentle on the server
            await new Promise(r => setTimeout(r, 3000));
        }

    } catch (err) {
        console.error("General error during scraping loop:", err);
    } finally {
        console.log("\nDone! Closing browser in 5 seconds...");
        await new Promise(r => setTimeout(r, 5000));
        await browser.close();
    }
})();

