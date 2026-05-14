/**
 * ─────────────────────────────────────────────────────────────────────────────
 * Cayonoplan Accessories Scraper
 * 
 * Trial-run scraper for Kaldewei Cayonoplan shower trays ONLY.
 * 
 * Strategy:
 *  1. Load all Cayonoplan trays from custom-data.json
 *  2. For each tray, visit its PDP on profishop.sanitastroesch.ch
 *  3. Click the "Zubehör" tab and collect all listed article numbers + quantities
 *  4. For each found accessory, check if it exists in the zubehoer_pool
 *  5. If found in pool → update the tray's mountingMaterials with correct item
 *     replacing any previously linked accessories of the same category
 *  6. Write back to custom-data.json
 * 
 * DOES NOT change BOM order — only updates the options within existing
 * mountingMaterials groups already established by admin.js syncProduct().
 * ─────────────────────────────────────────────────────────────────────────────
 */

const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());
const fs = require('fs');
const path = require('path');

const dataPath = path.resolve(__dirname, '../custom-data.json');

// ── Helper: normalise artNr for comparison ────────────────────────────────────
function normalizeArtNr(artNr) {
    return (artNr || '').replace(/[\s.\-]/g, '').replace(/^0+/, '').toLowerCase();
}

// ── Helper: classify an accessory into a category name matching admin.js ──────
function classifyPoolItem(label) {
    const lbl = label.toLowerCase();
    if (lbl.includes('wannenträger') || lbl.includes('wannentraeger')) return 'Wannenträger';
    if (lbl.includes('montagerahmen') || lbl.includes('fr 5300') || lbl.includes('omnia') || lbl.includes('ineo')) return 'Montagerahmen';
    if (lbl.includes('montageschaum')) return 'Montageschaum';
    if (lbl.includes('schallschutzset') || lbl.includes('schallschutz')) return 'Schallschutzset (Träger)';
    if (lbl.includes('ablaufdeckel') || lbl.includes('ablaufhaube')) return 'Ablaufdeckel';
    if (lbl.includes('ablaufgarnitur') || lbl.includes('siphon') || lbl.includes('ablauf')) return 'Ablaufgarnitur';
    if (lbl.includes('dichtband') || lbl.includes('zargen')) return 'Zargen-Wannendichtband';
    if (lbl.includes('stelzfüsse') || lbl.includes('stelzfuss')) return 'Stelzfüsse-Pack (4 Stk)';
    if (lbl.includes('fussset') || lbl.includes('füsse') || lbl.includes('wannenfüsse')) return 'Wannenfüsse';
    if (lbl.includes('mittenabstütz') || lbl.includes('mittenabstuetz')) return 'Mittenabstützsystem (Standard)';
    return null; // Unknown category – skip
}

(async () => {
    // ── 1. Load data ──────────────────────────────────────────────────────────
    let data;
    try {
        data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
    } catch (e) {
        console.error('❌ Could not load custom-data.json:', e.message);
        process.exit(1);
    }

    if (!data.duschenwanne || !data.duschenwanne.trays) {
        console.error('❌ No duschenwanne data found');
        process.exit(1);
    }

    // Only process Cayonoplan trays
    const cayonoplanTrays = data.duschenwanne.trays.filter(t =>
        (t.label || '').toLowerCase().includes('cayonoplan')
    );
    console.log(`\n🚿 Cayonoplan Accessory Scraper`);
    console.log(`   Found ${cayonoplanTrays.length} Cayonoplan trays to process\n`);

    // Build a lookup map of the pool by normalised artNr for O(1) matching
    const poolByArtNr = {};
    (data.zubehoer_pool?.trays || []).forEach(item => {
        const key = normalizeArtNr(item.artNr);
        poolByArtNr[key] = item;
    });
    console.log(`   Pool size: ${Object.keys(poolByArtNr).length} items\n`);

    // ── 2. Launch browser ─────────────────────────────────────────────────────
    const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1920,1080']
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    await page.setUserAgent(
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
    );

    let updatedTrays = 0;
    let totalLinked = 0;
    const results = [];

    // ── 3. Process each tray ──────────────────────────────────────────────────
    for (let i = 0; i < cayonoplanTrays.length; i++) {
        const tray = cayonoplanTrays[i];
        const cleanArtNr = tray.artNr.replace(/[\s.]/g, '');
        const pdpUrl = `https://profishop.sanitastroesch.ch/de/p/${cleanArtNr}`;

        console.log(`[${i + 1}/${cayonoplanTrays.length}] 🔍 ${tray.artNr} (${tray.size})`);
        console.log(`   URL: ${pdpUrl}`);

        let scrapedAccessories = [];

        try {
            // Navigate to PDP
            const response = await page.goto(pdpUrl, { waitUntil: 'networkidle2', timeout: 30000 });

            if (!response || response.status() === 404) {
                // Retry with alternative URL format (some products use different path)
                const altUrl = `https://profishop.sanitastroesch.ch/de/search?q=${encodeURIComponent(tray.artNr.trim())}`;
                console.log(`   ⚠️  404 – trying search fallback: ${altUrl}`);
                await page.goto(altUrl, { waitUntil: 'networkidle2', timeout: 25000 });
                await new Promise(r => setTimeout(r, 2000));

                // Try to click through to PDP from search results
                const productLink = await page.evaluate(() => {
                    const links = Array.from(document.querySelectorAll('a'));
                    for (const a of links) {
                        const href = a.href || '';
                        if (href.includes('/p/') && /\d{7}/.test(href)) return href;
                    }
                    return null;
                });

                if (productLink) {
                    await page.goto(productLink, { waitUntil: 'networkidle2', timeout: 30000 });
                } else {
                    console.log(`   ❌ Could not find product page. Skipping.\n`);
                    results.push({ artNr: tray.artNr, size: tray.size, found: 0, linked: 0 });
                    continue;
                }
            }

            await new Promise(r => setTimeout(r, 2000));

            // ── Click the "Zubehör" tab ───────────────────────────────────────
            const tabClicked = await page.evaluate(() => {
                const tabs = Array.from(document.querySelectorAll('button, a, li, [role="tab"]'));
                for (const tab of tabs) {
                    const txt = (tab.textContent || '').toLowerCase().trim();
                    if (txt === 'zubehör' || txt.startsWith('zubehör')) {
                        tab.click();
                        return true;
                    }
                }
                return false;
            });

            if (tabClicked) {
                console.log(`   ✅ Clicked "Zubehör" tab`);
                await new Promise(r => setTimeout(r, 2500)); // wait for tab content to load
            } else {
                console.log(`   ℹ️  No "Zubehör" tab found – checking page for inline accessories`);
            }

            // ── Scrape all article numbers + quantities from the page ─────────
            scrapedAccessories = await page.evaluate(() => {
                const accessories = [];
                const seen = new Set();

                // Pattern: Sanitas uses various structures – scan all text nodes
                // for article numbers matching the format: XXXXXXX.XXX.XXX or 13XXXXX
                const allElements = Array.from(document.querySelectorAll(
                    'tr, .product-item, .accessory-item, [class*="product"], [class*="item"], li'
                ));

                const artNrPattern = /\b(\d{4}[\s]?\d{3}[\s.]?\d{3}[\s.]?\d{3})\b/g;
                const mengePattern = /\b(\d+)\s*(?:Stk|Stück|St\b|x\b)/i;

                // Also scan the raw text of the entire page for article numbers
                const fullText = document.body.innerText;
                let match;
                while ((match = artNrPattern.exec(fullText)) !== null) {
                    const raw = match[1];
                    const clean = raw.replace(/\s/g, '');
                    if (!seen.has(clean) && clean.startsWith('1') && clean.length >= 10) {
                        seen.add(clean);
                        // Try to find quantity near this article number
                        const surroundStart = Math.max(0, match.index - 150);
                        const surroundEnd = Math.min(fullText.length, match.index + 200);
                        const surrounding = fullText.substring(surroundStart, surroundEnd);
                        const mengeMatch = mengePattern.exec(surrounding);
                        const menge = mengeMatch ? parseInt(mengeMatch[1]) : 1;
                        accessories.push({ artNr: clean, menge });
                    }
                }

                return accessories;
            });

            console.log(`   📦 Found ${scrapedAccessories.length} article numbers on page`);

        } catch (err) {
            console.log(`   ❌ Navigation error: ${err.message}\n`);
            results.push({ artNr: tray.artNr, size: tray.size, found: 0, linked: 0 });
            continue;
        }

        // ── 4. Match scraped artNrs against the pool ──────────────────────────
        let linkedCount = 0;
        const linkedCategories = {};

        for (const scraped of scrapedAccessories) {
            const normScraped = normalizeArtNr(scraped.artNr);
            const poolItem = poolByArtNr[normScraped];

            if (!poolItem) continue; // Not in our pool – skip

            const category = classifyPoolItem(poolItem.label);
            if (!category) continue; // Unknown category – skip

            // Skip the main tray itself
            if (normScraped === normalizeArtNr(tray.artNr)) continue;

            // Find or create the mountingMaterial group for this category
            let matGroup = tray.mountingMaterials.find(m => m.name === category);

            if (matGroup) {
                // Check if this specific artNr option is already in the group
                const alreadyLinked = matGroup.options.some(o =>
                    normalizeArtNr(o.artNr) === normScraped
                );

                if (!alreadyLinked) {
                    // Replace options with this exact scraper-verified item
                    // (for single-option groups like Wannenträger)
                    if (category === 'Wannenträger') {
                        // REPLACE – scraper gives us the ground truth carrier for THIS tray
                        matGroup.options = [{
                            artNr: poolItem.artNr,
                            label: poolItem.label,
                            menge: scraped.menge || 1,
                            type: 'wannenträger',
                            imgUrl: poolItem.imgUrl
                        }];
                        console.log(`   🔗 [REPLACE] Wannenträger → ${poolItem.artNr}`);
                    } else {
                        // ADD as additional option
                        matGroup.options.push({
                            artNr: poolItem.artNr,
                            label: poolItem.label,
                            menge: scraped.menge || 1,
                            type: matGroup.options[0]?.type || 'Zubehör',
                            imgUrl: poolItem.imgUrl
                        });
                        console.log(`   ➕ [ADD] ${category} → ${poolItem.artNr}`);
                    }
                    linkedCount++;
                    linkedCategories[category] = true;
                }
            } else {
                // The category group doesn't exist yet — this shouldn't happen for
                // established categories but we handle it gracefully as read-only
                console.log(`   ℹ️  Category "${category}" not present in tray mats – skipping (run Admin sync first)`);
            }
        }

        if (linkedCount > 0) {
            updatedTrays++;
            totalLinked += linkedCount;
            console.log(`   ✅ Linked ${linkedCount} accessories: ${Object.keys(linkedCategories).join(', ')}`);
        } else {
            console.log(`   ℹ️  No new pool matches found for this tray`);
        }

        results.push({ artNr: tray.artNr, size: tray.size, found: scrapedAccessories.length, linked: linkedCount });

        // Save every 5 trays to prevent data loss on interruption
        if ((i + 1) % 5 === 0) {
            fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
            console.log(`   💾 Progress saved (${i + 1}/${cayonoplanTrays.length})\n`);
        } else {
            console.log('');
        }
    }

    // ── 5. Final save ─────────────────────────────────────────────────────────
    fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
    await browser.close();

    // ── 6. Summary report ─────────────────────────────────────────────────────
    console.log('\n' + '═'.repeat(60));
    console.log('✅ CAYONOPLAN SCRAPER COMPLETE');
    console.log('═'.repeat(60));
    console.log(`   Trays processed : ${cayonoplanTrays.length}`);
    console.log(`   Trays updated   : ${updatedTrays}`);
    console.log(`   Total links made: ${totalLinked}`);
    console.log('\nPer-tray results:');
    results.forEach(r => {
        const status = r.linked > 0 ? '✅' : (r.found > 0 ? '⚠️ ' : '❌');
        console.log(`  ${status} ${r.artNr} (${r.size || '?'}) – ${r.found} found, ${r.linked} linked`);
    });
    console.log('\n⚠️  Remember to Hard Refresh (Cmd+Shift+R) the configurator app!\n');
})();
