const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());
const fs = require('fs');

(async () => {
    const browser = await puppeteer.launch({ 
        headless: 'new',
        args: ['--no-sandbox', '--window-size=1920,1080'] 
    });
    
    // Step 1: Collect all product URLs
    const productUrls = new Set();
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    
    console.log("Fetching Koralle search results...");
    for (let p = 1; p <= 5; p++) {
        console.log(`Loading page ${p}...`);
        await page.goto(`https://profishop.sanitastroesch.ch/business/search?q=koralle&rows=200&page=${p}`, { waitUntil: 'networkidle2', timeout: 30000 });
        await new Promise(r => setTimeout(r, 4000));
        
        const urls = await page.evaluate(() => {
            return Array.from(document.querySelectorAll('a'))
                .map(a => a.href)
                .filter(h => h && h.includes('article-') && h.includes('koralle'));
        });
        urls.forEach(u => productUrls.add(u));
        console.log(`Found ${urls.length} urls on page ${p}. Total unique: ${productUrls.size}`);
    }
    
    const urlsArray = Array.from(productUrls);
    console.log(`Found ${urlsArray.length} total product URLs to scrape.`);
    fs.writeFileSync('st-scraper/koralle-urls.json', JSON.stringify(urlsArray, null, 2));
    
    // Step 2: Scrape each URL
    const allItems = [];
    const cachePath = 'st-scraper/koralle-cache.json';
    let cache = {};
    if (fs.existsSync(cachePath)) {
        cache = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
    }
    
    console.log('Visiting home page to solve Incapsula WAF challenge...');
    await page.goto('https://profishop.sanitastroesch.ch/', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 2000));
    
    for (let i = 0; i < urlsArray.length; i++) {
        const url = urlsArray[i];
        if (cache[url]) {
            cache[url].forEach(item => allItems.push(item));
            continue;
        }
        
        console.log(`[${i+1}/${urlsArray.length}] Scraping ${url}`);
        try {
            await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
            await new Promise(r => setTimeout(r, 2000));
            
            // Try to expand variants if they exist
            await page.evaluate(() => {
                const btns = Array.from(document.querySelectorAll('button, a'));
                const expand = btns.find(b => (b.innerText || '').toLowerCase().includes('weitere varianten'));
                if (expand) expand.click();
            });
            await new Promise(r => setTimeout(r, 1000));
            
            // Extract items
            const extracted = await page.evaluate(() => {
                const results = [];
                
                // Extract main product
                let mainArtNr = '';
                const bodyText = document.body.innerText;
                const mainMatch = bodyText.match(/Art-Nr\.?\s*(\d{4}\s?\d{3}\.\d{3}\.\d{3}|\d{7,8})/);
                if (mainMatch) mainArtNr = mainMatch[1].trim();
                
                const h1 = document.querySelector('h1');
                const mainLabel = h1 ? h1.innerText.replace(/\n/g, ' ').trim() : '';
                
                if (mainArtNr && mainLabel && mainLabel.toLowerCase().includes('koralle')) {
                    results.push({ artNr: mainArtNr, label: mainLabel });
                }
                
                // Extract variants
                const items = Array.from(document.querySelectorAll('.product-list-item, tr, article.st-product-card, .card, .list-group-item'));
                for (let item of items) {
                    const text = (item.innerText || '');
                    const artMatch = text.match(/(\d{4}\s?\d{3}\.\d{3}\.\d{3}|\d{7,8})/);
                    if (!artMatch) continue;
                    
                    const artNr = artMatch[0].replace(/\n/g, '').trim();
                    let label = '';
                    const titleEl = item.querySelector('.st-product-card__title, .title, h3, h4, td.description, .product-name');
                    if (titleEl) label = titleEl.innerText.replace(/\n/g, ' ').trim();
                    else label = text.split('\n')[0].trim();
                    
                    if (label.toLowerCase().includes('koralle') && artNr !== mainArtNr) { // Avoid duplicate
                        results.push({ artNr, label });
                    }
                }
                return results;
            });
            
            // Deduplicate
            const unique = [];
            const seen = new Set();
            for (let item of extracted) {
                if (!seen.has(item.artNr)) {
                    seen.add(item.artNr);
                    unique.push(item);
                }
            }
            
            cache[url] = unique;
            fs.writeFileSync(cachePath, JSON.stringify(cache, null, 2));
            unique.forEach(item => allItems.push(item));
            console.log(`   -> Found ${unique.length} Koralle items.`);
        } catch (e) {
            console.log(`   -> Error scraping ${url}: ${e.message}`);
        }
    }
    
    // Step 3: Categorize and write CSV
    // Categorize by Series, Einbausituation, Türvariante, Farbe and Band
    const csvLines = ["Art-Nr;Label;Series;Einbausituation;Türvariante;Farbe;Band"];
    const globalSeen = new Set();
    
    for (let item of allItems) {
        if (globalSeen.has(item.artNr)) continue;
        globalSeen.add(item.artNr);
        
        const l = item.label;
        let series = "";
        let einbau = "";
        let tuer = "";
        let farbe = "";
        let band = "";
        
        // Extract Series (e.g. S808, S606 Plus, etc)
        const seriesMatch = l.match(/Koralle\s+([A-Za-z0-9\s]+?)(?:,|\s+für|\s+Breite|\s+Höhe)/i);
        if (seriesMatch) series = seriesMatch[1].trim();
        
        // Extract Einbausituation
        if (l.toLowerCase().includes('eckeinstieg')) einbau = 'Eckeinstieg';
        else if (l.toLowerCase().includes('nische')) einbau = 'Nische';
        else if (l.toLowerCase().includes('badewanne') || l.toLowerCase().includes('wannen')) einbau = 'Wannenmontage';
        else einbau = 'Standard';
        
        // Extract Türvariante
        if (l.toLowerCase().includes('gleittür')) tuer = 'Gleittür';
        else if (l.toLowerCase().includes('pendeltür')) tuer = 'Pendeltür';
        else if (l.toLowerCase().includes('flügeltür')) tuer = 'Flügeltür';
        else if (l.toLowerCase().includes('falttür')) tuer = 'Falttür';
        else if (l.toLowerCase().includes('seitenwand')) tuer = 'Seitenwand';
        
        // Extract Band
        if (l.toLowerCase().includes('band rechts') || l.toLowerCase().includes('anschlag rechts') || l.toLowerCase().includes('festteil rechts')) band = 'Rechts';
        else if (l.toLowerCase().includes('band links') || l.toLowerCase().includes('anschlag links') || l.toLowerCase().includes('festteil links')) band = 'Links';
        
        // Extract Farbe (usually the second to last part before Echtglas)
        const parts = l.split(',');
        for (let i = 0; i < parts.length; i++) {
            if (parts[i].toLowerCase().includes('silber') || parts[i].toLowerCase().includes('schwarz') || parts[i].toLowerCase().includes('chrom') || parts[i].toLowerCase().includes('weiss')) {
                farbe = parts[i].trim();
            }
        }
        
        csvLines.push(`${item.artNr};"${l.replace(/"/g, '""')}";"${series}";"${einbau}";"${tuer}";"${farbe}";"${band}"`);
    }
    
    fs.writeFileSync('koralle_export.csv', csvLines.join('\n'));
    console.log(`\n✅ Finished! Exported ${globalSeen.size} unique Koralle items to koralle_export.csv`);
    
    await browser.close();
})();
