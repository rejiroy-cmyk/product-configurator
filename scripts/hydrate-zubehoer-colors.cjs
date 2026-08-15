//
// Hydrate the finish variants of zubehoer_pool items from prices.json, so the
// accessory colour match can offer a part in the Armatur's finish.
//
// NARROWED to the types whose variants are actually read at runtime
// (COLOUR_MATCHED_TYPES). An earlier version hydrated the whole pool: 620k
// variants, 83% of them on Spiegelschrank, which nothing can reach —
// renderAccessoiresPanel filters base trays and never looks at .variants. That
// run took custom-data.json from 59 MB to 447 MB and put it over GitHub's
// 100 MB limit for no functional gain.
//
// Dry-run by default; pass --write.
//
const fs = require('fs');
const path = require('path');
const { COLOUR_MATCHED_TYPES } = require('./_poolClassify.cjs');

const WRITE = process.argv.includes('--write');
const HYDRATE = new Set(COLOUR_MATCHED_TYPES);

console.log('⚡ Starting optimized hydration of colored Zubehör variants into custom-data.json...');

const customDataPath = path.resolve('custom-data.json');
const pricesPath = path.resolve('prices.json');

const customData = JSON.parse(fs.readFileSync(customDataPath, 'utf8'));
const pricesJson = JSON.parse(fs.readFileSync(pricesPath, 'utf8')).prices;

// Load color codes
const colorCodesContent = fs.readFileSync(path.resolve('modules/factories/_colorCodes.js'), 'utf8');
const jsonStr = colorCodesContent.replace('export const COLOR_NAMES = ', '').replace(/;\s*$/, '');
const COLOR_NAMES = eval('(' + jsonStr + ')');

// 1. Pre-index pricesJson by base article number (O(N) setup)
console.log('Indexing prices.json by base article number...');
const pricesByBase = new Map();
Object.entries(pricesJson).forEach(([pArtNr, pItem]) => {
    if (pArtNr.includes('.')) {
        const parts = pArtNr.split('.');
        const base = parts[0];
        const pFc = parts[1];
        if (!pricesByBase.has(base)) pricesByBase.set(base, []);
        pricesByBase.get(base).push({
            artNr: pArtNr,
            colourCode: pFc,
            colorName: COLOR_NAMES[pFc] || pFc,
            price: pItem.p || pItem.price || 0,
            text: pItem.m || pItem.l || pItem.text || ''
        });
    }
});
console.log(`Pre-indexed ${pricesByBase.size} base model families from prices.json.`);

// 2. Iterate pool and hydrate variants (O(M) fast lookup)
const pool = customData.zubehoer_pool?.trays || [];
console.log(`Scanning ${pool.length} items in zubehoer_pool.trays...`);

let totalBaseItemsUpdated = 0;
let totalVariantsHydrated = 0;
const brandBreakdown = {};
const familyBreakdown = {};

let skippedUnreachable = 0;

pool.forEach(item => {
    const artNr = item.artNr || item.art_nr;
    if (!artNr || !artNr.includes('.')) return;

    // Nothing reads .variants for this type — hydrating it is pure weight.
    if (!HYDRATE.has(item.productType)) { skippedUnreachable++; return; }

    const parts = artNr.split('.');
    const base = parts[0]; // e.g. "6544 196" or "6241 731"

    const matchingSKUsInPrices = pricesByBase.get(base);
    if (!matchingSKUsInPrices || matchingSKUsInPrices.length <= 1) return;

    totalBaseItemsUpdated++;

    if (!Array.isArray(item.variants)) {
        item.variants = [];
    }

    const existingVariantMap = new Map();
    item.variants.forEach(v => v.artNr && existingVariantMap.set(v.artNr, v));
    if (item.artNr) existingVariantMap.set(item.artNr, item);

    let addedCount = 0;

    matchingSKUsInPrices.forEach(pSKU => {
        if (pSKU.artNr === item.artNr) return; // base item itself

        const fc = pSKU.colourCode;
        const colorName = COLOR_NAMES[fc] || fc;

        // Heal label finish text
        let variantLabel = item.label || '';
        if (variantLabel.includes('Verchromt')) {
            variantLabel = variantLabel.replace('Verchromt', colorName);
        } else if (variantLabel.includes('Chromeline')) {
            variantLabel = variantLabel.replace('Chromeline', colorName);
        } else if (!variantLabel.toLowerCase().includes(colorName.toLowerCase())) {
            variantLabel = variantLabel + ' ' + colorName;
        }

        const variantObj = existingVariantMap.get(pSKU.artNr) || {
            artNr: pSKU.artNr,
            label: variantLabel,
            description: item.description || '',
            productType: item.productType,
            manufacturer: item.manufacturer,
            brand: item.brand,
            imgUrl: item.imgUrl || '',
            price: pSKU.price
        };

        if (!existingVariantMap.has(pSKU.artNr)) {
            item.variants.push(variantObj);
            existingVariantMap.set(pSKU.artNr, variantObj);
            addedCount++;
            totalVariantsHydrated++;
        }
    });

    const brand = item.manufacturer || item.brand || 'Unbekannt';
    brandBreakdown[brand] = (brandBreakdown[brand] || 0) + addedCount;

    const fam = item.productType || 'Andere';
    familyBreakdown[fam] = (familyBreakdown[fam] || 0) + addedCount;
});

console.log(`\n✅ Hydration Complete!`);
console.log(`Base items updated: ${totalBaseItemsUpdated}`);
console.log(`Total new colored variants hydrated into pool: ${totalVariantsHydrated}`);
console.log(`Skipped (type has no runtime variant consumer): ${skippedUnreachable}`);

console.log('\nBreakdown by Product Family:', JSON.stringify(familyBreakdown, null, 2));
console.log('Breakdown by Brand:', JSON.stringify(brandBreakdown, null, 2));

if (!WRITE) {
    console.log('\nDry run — nothing written. Re-run with --write to apply.');
} else {
    console.log('\n💾 Writing updated custom-data.json...');
    // JSON.stringify(…, null, 2): anything else reformats all 94k records.
    fs.writeFileSync(customDataPath, JSON.stringify(customData, null, 2), 'utf8');
    console.log('✨ Saved successfully!');
}
