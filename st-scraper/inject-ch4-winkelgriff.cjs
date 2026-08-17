// Inject the Ch4 Winkelgriff family into zubehoer_pool, routed to the Klosett apps.
//
// WHY THIS EXISTS SEPARATELY from inject-ch4-accessories.js:
//   Winkelgriff sits in that script's HOLD bucket, alongside the rest of the
//   accessibility range (Haltegriff, Eckhaltegriff, Stützklappgriff, Duschhandlauf …),
//   so it was scraped but never injected — which is why the Wandklosett and
//   Standklosett Accessoires toggles had Klappgriff but no Winkelgriff.
//   It is NOT simply moved out of HOLD there, because that script routes per BASE and
//   this family needs a per-SKU rule:
//
//     A Winkelgriff carrying a Duschgleitstange is a shower rail on a grab bar, not
//     WC kit. Those bases stay held. 22 of the 94 scraped bases are excluded that way.
//
//   The rest of the HOLD bucket stays held — this script deliberately does ONE family.
//
// The read/write path is _dataFile.cjs, not bare fs: custom-data.json is stored
// INTERNED, and writeData re-interns, backs up and holds indent 2. (The older Ch4
// injector predates that helper and writes minified — do not copy it.)
//
// Usage:
//   node inject-ch4-winkelgriff.cjs            # DRY RUN — counts + samples, writes nothing
//   node inject-ch4-winkelgriff.cjs --apply    # write custom-data.json + prices.json
'use strict';
const fs = require('fs');
const path = require('path');
const { readData, writeData } = require('./_dataFile.cjs');

const APPLY = process.argv.includes('--apply');
const SCRAPE = path.resolve(__dirname, 'chapter-4-variants-scraped.json');
const PRICES = path.resolve(__dirname, '../prices.json');

const PRODUCT_TYPE = 'Winkelgriff';
const TARGET_SUBCATS = ['wandklosett', 'standklosett'];

// Real image URLs, scraped from the shop's DOM (anonymous, no cookie):
//   BASES=… OUT=ch4-winkelgriff-images.json node scrape-ch7-images.cjs
// A SYNTHESIZED PG1 url is just a recorded 404 — 71 of the 201 guessed here were,
// because these bases publish one image for a whole colour RANGE
// (04711120_100-339_000.png) or a bare per-base shot (04722520.png), neither of
// which the artNr triplet pattern can produce. When the file is present its URL wins
// for every SKU under that base; without it the script still runs and just leaves
// the guessed URL for the localiser to prove or blank.
const IMAGES = path.resolve(__dirname, 'ch4-winkelgriff-images.json');
const scrapedImg = fs.existsSync(IMAGES) ? JSON.parse(fs.readFileSync(IMAGES, 'utf8')) : {};
const imgFor = (artNr, fallback) => {
    const base = artNr.split('.')[0].replace(/\s/g, '');
    const hit = scrapedImg[base];
    return (hit && hit.url) ? hit.url : fallback;
};

// identity prefix — the leading noun states what the article IS (label-prefix by design)
const RX_FAMILY = /^winkelgriff\b/i;
// FULL-TEXT: the rail is named in the variant description as often as in the label.
const RX_RAIL = /duschgleitstange/i;

// ---- enrichment helpers (same shape the Ch4/Ch5 injections write) ----
const getSanitasImgUrl = (artNr) => {
    if (!artNr) return '';
    const clean = String(artNr).replace(/[^0-9.]/g, '');
    if (!clean) return '';
    const parts = clean.split('.');
    let p1 = parts[0];
    if (p1.length === 7) p1 = '0' + p1;
    return parts.length >= 3
        ? `https://profishop.sanitastroesch.ch/multimedia/Web/PG1/${p1}_${parts[1]}_${parts[2]}.png`
        : `https://profishop.sanitastroesch.ch/multimedia/Web/PG1/${p1}.png`;
};
const BRANDS = ['Keuco', 'Hewi', 'Nosag', 'KWC', 'Bodenschatz', 'Normbau', 'Bobrick', 'Proox',
    'Emco', 'Inda', 'Frost', 'Hansgrohe', 'Geberit', 'Laufen', 'Alterna', 'Diaqua'];
const brandOf = (t) => BRANDS.find(b => t.includes(b)) || 'Andere';
const SIZE_RE = [/Ø ?\d+([.,]\d+)? ?cm/, /\d+ ?x ?\d+(?: ?x ?\d+)? ?(?:cm|mm)/,
    /Breite ?\d+([.,]\d+)? ?(?:cm|mm)/, /\d+([.,]\d+)? ?cm/, /\d+ ?mm/];
const sizeOf = (t) => { for (const re of SIZE_RE) { const m = t.match(re); if (m) return m[0].trim(); } return 'Standard'; };

// ---- build ----
const scrape = JSON.parse(fs.readFileSync(SCRAPE, 'utf8'));
const data = readData();
const pricesFile = JSON.parse(fs.readFileSync(PRICES, 'utf8'));
const prices = pricesFile.prices;

const pool = data.zubehoer_pool;
if (!pool || !Array.isArray(pool.trays)) throw new Error('zubehoer_pool.trays missing — wrong data file?');
const poolByArt = new Map();
pool.trays.forEach(t => { if (t && t.artNr) poolByArt.set(t.artNr, t); });

const newTrays = [];
let basesSeen = 0, basesHeldRail = 0, skusHeldRail = 0, skusNew = 0, skusRetagged = 0, skusDup = 0, pricesAdded = 0, imgFixed = 0;
const heldSamples = [];

for (const [base, rec] of Object.entries(scrape)) {
    if (rec.status !== 'done') continue;
    const mainDesc = (rec.mainDesc || '').trim();
    if (!RX_FAMILY.test(mainDesc)) continue;
    basesSeen++;

    const variants = Object.entries(rec.variants || {});
    // Per-SKU rail test, even though today every base is uniform — a future re-scrape
    // that splits a base must not smuggle a rail variant into the Klosett panel.
    const railHits = variants.filter(([, v]) => RX_RAIL.test(`${mainDesc} ${v.desc || ''}`));
    if (railHits.length === variants.length && variants.length) {
        basesHeldRail++; skusHeldRail += variants.length;
        if (heldSamples.length < 5) heldSamples.push(`${base}  ${mainDesc.slice(0, 78)}`);
        continue;
    }

    for (const [artNr, v] of variants) {
        const label = v.desc || mainDesc;
        if (RX_RAIL.test(`${mainDesc} ${label}`)) { skusHeldRail++; continue; }

        const existing = poolByArt.get(artNr);
        if (existing) {
            // idempotent: refresh the routing on a tray an earlier run already wrote,
            // never duplicate it. A LOCAL img/ path is real and is never touched — it
            // exists only because the localiser already fetched and size-checked it.
            let touched = false;
            if (existing.productType !== PRODUCT_TYPE) {
                existing.productType = PRODUCT_TYPE;
                existing.targetSubcats = TARGET_SUBCATS.slice();
                touched = true;
            }
            const better = imgFor(artNr, null);
            if (better && !/^img\//.test(existing.imgUrl || '') && existing.imgUrl !== better) {
                existing.imgUrl = better;
                touched = true;
                imgFixed++;
            }
            if (touched) skusRetagged++; else skusDup++;
            continue;
        }

        const tray = {
            id: 'ch4wg_' + artNr.replace(/[^0-9]/g, ''),
            manufacturer: brandOf(label),
            form: 'Standard',
            size: sizeOf(label),
            artNr,
            label,
            description: label,
            menge: 1,
            imgUrl: imgFor(artNr, getSanitasImgUrl(artNr)),
            productType: PRODUCT_TYPE,
            targetSubcats: TARGET_SUBCATS.slice(),
        };
        newTrays.push(tray);
        poolByArt.set(artNr, tray);
        skusNew++;
        if (v.price != null && prices[artNr] == null) { prices[artNr] = v.price; pricesAdded++; }
    }
}

// ---- report ----
console.log('=== Ch4 Winkelgriff injection ' + (APPLY ? '(APPLY)' : '(DRY RUN)') + ' ===');
console.log(`scraped Winkelgriff bases      : ${basesSeen}`);
console.log(`  held back (Duschgleitstange) : ${basesHeldRail} bases / ${skusHeldRail} SKUs`);
console.log(`new pool trays                 : ${skusNew}`);
console.log(`re-tagged existing             : ${skusRetagged}`);
console.log(`already correct (skipped)      : ${skusDup}`);
console.log(`prices to add                  : ${pricesAdded}`);
console.log(`imgUrl repointed to scrape     : ${imgFixed}`);
console.log(`pool.trays                     : ${pool.trays.length} -> ${pool.trays.length + newTrays.length}`);
if (heldSamples.length) { console.log('\nheld-back samples:'); heldSamples.forEach(s => console.log('  ' + s)); }
console.log('\nsample new trays:');
newTrays.slice(0, 5).forEach(t => console.log('  ' + JSON.stringify(t)));

const brands = {};
newTrays.forEach(t => { brands[t.manufacturer] = (brands[t.manufacturer] || 0) + 1; });
console.log('\nby manufacturer:', JSON.stringify(brands));

if (APPLY) {
    pool.trays.push(...newTrays);
    pricesFile.meta.entries = Object.keys(prices).length;
    const backup = writeData(data);
    fs.writeFileSync(PRICES, JSON.stringify(pricesFile, null, 2));
    console.log(`\nWROTE custom-data.json (${pool.trays.length} trays; backup ${backup})`);
    console.log(`WROTE prices.json (${Object.keys(prices).length} prices).`);
} else {
    console.log('\nDRY RUN — nothing written. Re-run with --apply to commit.');
}
