const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');
const path = require('path');

puppeteer.use(StealthPlugin());

const dataPath = '/Users/jenistonsellathamby/Desktop/product-configurator/custom-data.json';
const cachePath = '/Users/jenistonsellathamby/Desktop/product-configurator/st-scraper/service-descriptions-scraped.json';

(async () => {
    console.log("Loading custom-data.json...");
    let data;
    try {
        data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
    } catch (e) {
        console.error("Could not load custom-data.json:", e.message);
        process.exit(1);
    }

    const dtTrays = data.duschtrennwand?.trays || [];
    const baTrays = data.badeabtrennung?.trays || [];
    const allTrays = [...dtTrays, ...baTrays];
    console.log(`Loaded ${allTrays.length} parent products (trays).`);

    // Compile list of all unique services in the database
    const uniqueServicesInDb = new Set();
    allTrays.forEach(tray => {
        if (tray.services && Array.isArray(tray.services)) {
            tray.services.forEach(s => {
                if (s.artNr) {
                    uniqueServicesInDb.add(s.artNr.trim());
                }
            });
        }
    });
    console.log(`Total unique service article numbers in database: ${uniqueServicesInDb.size}`);

    // Load scraped cache
    let cache = {};
    if (fs.existsSync(cachePath)) {
        try {
            cache = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
            console.log(`Loaded ${Object.keys(cache).length} cached service descriptions.`);
        } catch (e) {
            console.warn("Could not parse cache file, starting fresh:", e.message);
        }
    }

    // Helper to normalize article numbers (e.g. "1549 154.000.000" -> "1549154000000")
    function normalizeArtNr(artNr) {
        return artNr.replace(/\s|\./g, '').trim();
    }

    // Launch browser (headless: false as requested)
    console.log("Launching Puppeteer browser (headless: false)...");
    const browser = await puppeteer.launch({
        headless: false,
        args: [
            '--no-sandbox',
            '--window-size=1280,800',
            '--disable-web-security',
            '--disable-features=IsolateOrigins,site-per-process'
        ]
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });

    // Helper to dismiss cookie banner
    async function dismissCookieBanner() {
        try {
            await page.evaluate(() => {
                const btn = document.querySelector('#onetrust-accept-btn-handler');
                if (btn && typeof btn.click === 'function') {
                    btn.click();
                    console.log("Cookie banner dismissed.");
                }
            });
        } catch (e) {}
    }

    // Helper to scroll and click Montage tabs on PDP
    async function expandMontageTabs() {
        await page.evaluate(async () => {
            // Scroll down first
            await new Promise((resolve) => {
                let totalHeight = 0;
                const distance = 300;
                const timer = setInterval(() => {
                    window.scrollBy(0, distance);
                    totalHeight += distance;
                    if (totalHeight >= 3000) {
                        clearInterval(timer);
                        resolve();
                    }
                }, 100);
            });
        });

        // Click Verwandte Artikel and Montage tabs
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
        await new Promise(r => setTimeout(r, 2000));
    }

    try {
        // Step 1: Search and click services listed on parent product PDPs
        for (let i = 0; i < allTrays.length; i++) {
            const tray = allTrays[i];
            if (!tray.services || tray.services.length === 0) continue;

            // Check if there is any service on this tray that is NOT yet cached
            const pendingServices = tray.services.filter(s => !cache[s.artNr]);
            if (pendingServices.length === 0) {
                // All services for this tray are already cached! Skip.
                continue;
            }

            console.log(`\n[${i+1}/${allTrays.length}] Parent Product: ${tray.artNr} - ${tray.label}`);
            console.log(`Pending services on this product: ${pendingServices.map(s => s.artNr).join(', ')}`);

            const cleanArtNr = tray.artNr.replace(/\s/g, '');
            const searchUrl = `https://profishop.sanitastroesch.ch/business/search?q=${cleanArtNr}`;

            console.log(`Navigating to search page: ${searchUrl}`);
            await page.goto(searchUrl, { waitUntil: 'networkidle2' });
            await new Promise(r => setTimeout(r, 3000));
            await dismissCookieBanner();

            let currentUrl = await page.url();
            if (currentUrl.includes('/search')) {
                console.log('Clicking product link on search page...');
                const clicked = await page.evaluate((sq) => {
                    const links = Array.from(document.querySelectorAll('a'));
                    for (let a of links) {
                        const href = a.href || '';
                        if (href.includes('/business/article-') && !href.includes('/search')) {
                            a.click();
                            return true;
                        }
                    }
                    return false;
                }, cleanArtNr);

                if (clicked) {
                    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 }).catch(() => {});
                    await new Promise(r => setTimeout(r, 3000));
                } else {
                    console.log('Could not find product link to click on search page.');
                    continue;
                }
            }

            // Expand Montage tab
            await expandMontageTabs();

            // We will loop and click each pending service row
            let attempts = 0;
            const maxAttempts = pendingServices.length * 2; // avoid infinite loop if click fails

            while (attempts < maxAttempts) {
                // Check cache again, as we might have cached it in a previous iteration
                const activePending = tray.services.filter(s => !cache[s.artNr]);
                if (activePending.length === 0) break;

                const targetService = activePending[0];
                console.log(`Attempting to scrape service: ${targetService.artNr} - ${targetService.label}`);

                // Find the service row and click the link
                const clicked = await page.evaluate((targetArtNrNormalized) => {
                    const rows = Array.from(document.querySelectorAll('.product-list-item, tr, .row, article, .card'));
                    for (let row of rows) {
                        const text = (row.innerText || '').toLowerCase().replace(/\s|\./g, '');
                        if (text.includes(targetArtNrNormalized)) {
                            // Find the product details link
                            const link = row.querySelector('a.text-dark.text-break') || row.querySelector('a[href*="article-"]');
                            if (link && typeof link.click === 'function') {
                                link.click();
                                return true;
                            }
                        }
                    }
                    return false;
                }, normalizeArtNr(targetService.artNr));

                if (!clicked) {
                    console.log(`Could not find clickable link for service ${targetService.artNr} on PDP. Skipping.`);
                    // To prevent infinite loop, temporarily mark as empty in cache
                    cache[targetService.artNr] = "Not found on PDP";
                    fs.writeFileSync(cachePath, JSON.stringify(cache, null, 2));
                    attempts++;
                    continue;
                }

                // Wait for navigation to service page
                await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 }).catch(() => {});
                await new Promise(r => setTimeout(r, 3000));

                // Extract description
                const desc = await page.evaluate(() => {
                    const el = document.querySelector('#article-description');
                    if (el) {
                        const section = el.closest('section');
                        if (section) {
                            const p = section.querySelector('p');
                            return p ? p.innerText.trim() : null;
                        }
                    }
                    return null;
                });

                if (desc) {
                    console.log(`✅ Scraped description for ${targetService.artNr}: "${desc.substring(0, 80)}..."`);
                    cache[targetService.artNr] = desc;
                } else {
                    console.log(`⚠️ Description element not found for ${targetService.artNr}`);
                    cache[targetService.artNr] = "No description available";
                }

                // Write cache
                fs.writeFileSync(cachePath, JSON.stringify(cache, null, 2));

                // Navigate back to parent product page
                console.log("Navigating back to parent page...");
                await page.goBack({ waitUntil: 'networkidle2' }).catch(() => {});
                await new Promise(r => setTimeout(r, 3000));

                // Re-expand tabs
                await expandMontageTabs();
                attempts++;
            }
        }

        // Step 2: Search directly for any remaining service article numbers that we did not find on parent PDPs
        const remainingServices = Array.from(uniqueServicesInDb).filter(artNr => !cache[artNr] || cache[artNr] === "Not found on PDP");
        if (remainingServices.length > 0) {
            console.log(`\n--- Direct Search Fallback for ${remainingServices.length} Remaining Services ---`);
            for (let i = 0; i < remainingServices.length; i++) {
                const artNr = remainingServices[i];
                console.log(`[${i+1}/${remainingServices.length}] Direct Search for Service: ${artNr}`);

                const cleanQuery = artNr.replace(/\s/g, '');
                const searchUrl = `https://profishop.sanitastroesch.ch/business/search?q=${encodeURIComponent(artNr)}`;

                await page.goto(searchUrl, { waitUntil: 'networkidle2' });
                await new Promise(r => setTimeout(r, 3000));
                await dismissCookieBanner();

                let currentUrl = await page.url();
                if (currentUrl.includes('/search')) {
                    const clicked = await page.evaluate(() => {
                        const links = Array.from(document.querySelectorAll('a'));
                        for (let a of links) {
                            const href = a.href || '';
                            if (href.includes('/business/article-') && !href.includes('/search')) {
                                a.click();
                                return true;
                            }
                        }
                        return false;
                    });

                    if (clicked) {
                        await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 }).catch(() => {});
                        await new Promise(r => setTimeout(r, 3000));
                    } else {
                        console.log(`   -> No search results or links found for ${artNr}`);
                        cache[artNr] = "Direct search failed";
                        fs.writeFileSync(cachePath, JSON.stringify(cache, null, 2));
                        continue;
                    }
                }

                // Extract description from PDP
                const desc = await page.evaluate(() => {
                    const el = document.querySelector('#article-description');
                    if (el) {
                        const section = el.closest('section');
                        if (section) {
                            const p = section.querySelector('p');
                            return p ? p.innerText.trim() : null;
                        }
                    }
                    return null;
                });

                if (desc) {
                    console.log(`   -> ✅ Scraped description: "${desc.substring(0, 80)}..."`);
                    cache[artNr] = desc;
                } else {
                    console.log(`   -> ⚠️ No description found.`);
                    cache[artNr] = "No description available";
                }

                fs.writeFileSync(cachePath, JSON.stringify(cache, null, 2));
            }
        }

        console.log(`\nScraping complete. Cached ${Object.keys(cache).length} service descriptions.`);

    } catch (err) {
        console.error("Scraper encountered an error:", err.message);
    } finally {
        await browser.close();
        console.log("Browser closed.");
    }
})();
