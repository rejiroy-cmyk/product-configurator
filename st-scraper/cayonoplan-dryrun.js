/**
 * DRY RUN v2: Uses correct Sanitas URL format
 * /business/article-{slug}-{artNr}
 * 
 * Example: https://profishop.sanitastroesch.ch/business/article-duschwanne-kaldewei-cayonoplan-80-x-110-x-1-8-cm-stahl-schallisolierung-weiss-standard-1313474100810
 */
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());
const fs = require('fs');
const path = require('path');

const dataPath = path.resolve(__dirname, '../custom-data.json');

// Build the URL slug from a product label
function slugify(label) {
    return label
        .toLowerCase()
        .replace(/[äÄ]/g, 'ae').replace(/[öÖ]/g, 'oe').replace(/[üÜ]/g, 'ue').replace(/ß/g, 'ss')
        .replace(/[,]/g, '')
        .replace(/\./g, '')
        .replace(/[^\w\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-');
}

function buildUrl(tray) {
    const artNr = tray.artNr.replace(/[\s.]/g, '');
    const slug = slugify(tray.label);
    return `https://profishop.sanitastroesch.ch/business/article-${slug}-${artNr}`;
}

(async () => {
    const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
    const cayonoplanTrays = data.duschenwanne.trays.filter(t =>
        (t.label || '').toLowerCase().includes('cayonoplan')
    );

    // Test with the exact tray from the user's example: 1313 474.100.810 (110 x 80)
    const tray = cayonoplanTrays.find(t => t.artNr === '1313 474.100.810') || cayonoplanTrays[0];
    const pdpUrl = buildUrl(tray);

    console.log(`🧪 DRY RUN v2`);
    console.log(`   Tray: ${tray.artNr} (${tray.size})`);
    console.log(`   Label: ${tray.label}`);
    console.log(`   URL: ${pdpUrl}\n`);
    
    // Also show the known-good URL for comparison:
    console.log(`   Expected: https://profishop.sanitastroesch.ch/business/article-duschwanne-kaldewei-cayonoplan-80-x-110-x-1-8-cm-stahl-schallisolierung-weiss-standard-1313474100810`);
    console.log('');

    const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36');

    try {
        const response = await page.goto(pdpUrl, { waitUntil: 'networkidle2', timeout: 30000 });
        console.log(`   HTTP Status: ${response.status()}`);
        console.log(`   Final URL: ${page.url()}\n`);

        await new Promise(r => setTimeout(r, 2000));

        // List all visible tabs/sections
        const tabs = await page.evaluate(() => {
            return Array.from(document.querySelectorAll('button, [role="tab"], nav a, .tab'))
                .map(el => el.textContent?.trim())
                .filter(t => t && t.length > 1 && t.length < 50)
                .filter((v, i, a) => a.indexOf(v) === i)
                .slice(0, 20);
        });
        console.log(`   📋 Tabs/buttons: ${tabs.join(' | ')}`);

        // Click Zubehör tab if present
        const tabClicked = await page.evaluate(() => {
            const els = Array.from(document.querySelectorAll('button, a, li, [role="tab"], .nav-link'));
            for (const el of els) {
                const txt = (el.textContent || '').toLowerCase().trim();
                if (txt === 'zubehör' || txt === 'zubehoer' || txt.startsWith('zubehör')) {
                    el.click();
                    return el.textContent.trim();
                }
            }
            return null;
        });
        console.log(`   🖱️  Zubehör tab clicked: ${tabClicked || '(not found)'}`);

        if (tabClicked) await new Promise(r => setTimeout(r, 3000));

        // Extract artNrs
        const artNrPattern = /\b(\d{4}[\s]?\d{3}[\s.]?\d{3}[\s.]?\d{3})\b/g;
        const fullText = await page.evaluate(() => document.body.innerText);
        const found = [];
        const seen = new Set();
        let match;
        while ((match = artNrPattern.exec(fullText)) !== null) {
            const clean = match[1].replace(/\s/g, '');
            if (!seen.has(clean) && clean.startsWith('1') && clean.length >= 10) {
                seen.add(clean);
                found.push(clean);
            }
        }

        console.log(`\n   📦 Article numbers on page (${found.length}):`);
        found.forEach(a => console.log(`      ${a}`));

        // Match against pool
        const pool = data.zubehoer_pool.trays;
        const matched = [];
        for (const a of found) {
            const poolItem = pool.find(p =>
                p.artNr.replace(/[\s.]/g, '') === a || p.artNr.replace(/[\s.\-]/g, '') === a
            );
            if (poolItem) matched.push({ scrapped: a, poolItem });
        }

        console.log(`\n   ✅ Pool matches (${matched.length}):`);
        matched.forEach(m => console.log(`      ${m.poolItem.artNr} → ${m.poolItem.label.substring(0, 75)}`));

        // Show page text preview
        console.log(`\n   📄 Page text preview (first 800 chars):`);
        console.log(fullText.substring(0, 800).replace(/\n{2,}/g, '\n'));

    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        await browser.close();
    }
})();
