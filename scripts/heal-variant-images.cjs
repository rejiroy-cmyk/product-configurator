/**
 * heal-variant-images.cjs
 * Fills empty imgUrl on injected Ch6 mixer trays + their finish variants.
 *
 * Each SKU's art-Nr encodes its own finish code, so the canonical CDN image path
 * (<article padded to 8>_<finish>_<suffix>.png) is deterministic per SKU — NOT a
 * cross-finish guess (that guesser is retired). URLs are wsrv.nl-proxied, so the
 * browser never touches the vendor CDN and a rare 404 is hidden by the <img onerror>.
 *
 * Targets apps: duschenmischer, bademischer, waschtischmischer, bidet.
 * (Mix & Match auto-heals — its faucets are the waschtischmischer trays.)
 *
 * Usage:  node scripts/heal-variant-images.cjs            # DRY RUN (report only)
 *         VERIFY=1 node scripts/heal-variant-images.cjs   # + HEAD-sample the hit rate
 *         node scripts/heal-variant-images.cjs --apply    # write custom-data.json
 */
'use strict';
const fs = require('fs');
const path = require('path');
const https = require('https');

const ROOT = path.resolve(__dirname, '..');
const DATA = path.join(ROOT, 'custom-data.json');
const APPLY = process.argv.includes('--apply');
const VERIFY = !!process.env.VERIFY;
const APPS = ['duschenmischer', 'bademischer', 'waschtischmischer', 'bidet'];

const digits = a => String(a || '').replace(/[^0-9]/g, '');
// Art-Nr = <article><finish3><suffix3>; filename = <article padded to 8>_<finish>_<suffix>.png
const imgFromArt = (art) => {
    const d = digits(art);
    if (d.length < 12) return '';
    const article = d.slice(0, d.length - 6).padStart(8, '0');
    const finish = d.slice(d.length - 6, d.length - 3);
    const suffix = d.slice(d.length - 3);
    return 'https://wsrv.nl/?url=profishop.sanitastroesch.ch/multimedia/Web/PG1/' + article + '_' + finish + '_' + suffix + '.png';
};
const empty = u => !u || !String(u).trim();

const data = JSON.parse(fs.readFileSync(DATA, 'utf8'));

let trayFilled = 0, variantFilled = 0, trayTotal = 0, variantTotal = 0, noArt = 0;
const sampleUrls = [];
for (const appId of APPS) {
    const app = data[appId];
    if (!app || !Array.isArray(app.trays)) continue;
    for (const tray of app.trays) {
        trayTotal++;
        if (empty(tray.imgUrl)) {
            const u = imgFromArt(tray.artNr);
            if (u) { tray.imgUrl = u; trayFilled++; if (sampleUrls.length < 80) sampleUrls.push(u); }
            else noArt++;
        }
        for (const v of (tray.variants || [])) {
            variantTotal++;
            if (empty(v.imgUrl)) {
                const u = imgFromArt(v.artNr);
                if (u) { v.imgUrl = u; variantFilled++; if (sampleUrls.length < 80) sampleUrls.push(u); }
                else noArt++;
            }
        }
    }
}

console.log(`=== heal-variant-images ${APPLY ? '(APPLY)' : '(DRY RUN)'} ===`);
console.log(`  apps: ${APPS.join(', ')}`);
console.log(`  trays: ${trayTotal} (filled empty imgUrl: ${trayFilled})`);
console.log(`  variants: ${variantTotal} (filled empty imgUrl: ${variantFilled})`);
console.log(`  skipped (art-Nr too short to derive): ${noArt}`);

function head(url) {
    // strip the wsrv proxy → HEAD the real CDN url (polite, WAF-friendly pacing by caller)
    const real = 'https://' + url.replace(/^https:\/\/wsrv\.nl\/\?url=/, '');
    return new Promise(r => {
        const req = https.request(real, { method: 'HEAD', timeout: 8000, headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' } }, res => { r(res.statusCode); res.resume(); });
        req.on('error', () => r(0)); req.on('timeout', () => { req.destroy(); r(0); }); req.end();
    });
}
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function main() {
    if (VERIFY && sampleUrls.length) {
        // sample up to 40 evenly across the filled set
        const step = Math.max(1, Math.floor(sampleUrls.length / 40));
        const sample = sampleUrls.filter((_, i) => i % step === 0).slice(0, 40);
        let ok = 0;
        for (const u of sample) { await sleep(150 + Math.random() * 150); const c = await head(u); if (c === 200) ok++; }
        console.log(`\n  VERIFY: ${ok}/${sample.length} sampled derived URLs returned HTTP 200 (${Math.round(100 * ok / sample.length)}% hit rate).`);
        console.log('  (misses are hidden client-side by <img onerror> — no broken thumbnails render.)');
    }
    if (APPLY) {
        fs.copyFileSync(DATA, DATA + '.bak-healimg');
        fs.writeFileSync(DATA, JSON.stringify(data, null, 2) + '\n');
        console.log('\nWROTE custom-data.json (backup .bak-healimg).');
    } else {
        console.log('\nDRY RUN — nothing written. Re-run with --apply to commit (add VERIFY=1 to sample the hit rate first).');
    }
}
main();
