//
// Merge the scraped Gessi/Emporio variants into custom-data.json.
//
// The scrape walks whole product pages, so most of what it returns are MIXERS,
// not accessories. An earlier version of this script created a zubehoer_pool
// entry for every scraped base whose text matched none of the seven shower
// families, tagged "Andere" — which put 129 main products into the accessory
// pool, 120 of them exact duplicates of articles already in bademischer /
// duschenmischer / waschtischmischer / bidet.
//
// Two gates now stand in front of pool creation (scripts/_poolClassify.cjs):
// what the text says the article IS, and whether a product pool already owns
// it. Rejected bases are listed, never silently dropped — the variants they
// carry belong to the mixer pools, and a re-scrape that starts returning new
// finishes for them should be noticed rather than absorbed here.
//
// Dry-run by default; pass --write. (House pattern — see
// st-scraper/apply-refetched-text.cjs.)
//
const fs = require('fs');
const path = require('path');
const { isMainProduct, buildOwnedIndex, classifyAccessoryType } = require('./_poolClassify.cjs');

const WRITE = process.argv.includes('--write');

console.log('⚡ Merging scraped Gessi & Emporio variants into custom-data.json...');

const customDataPath = path.resolve('custom-data.json');
const scrapedPath = path.resolve('st-scraper/gessi-anschlussbogen-variants.json');
const pricesPath = path.resolve('prices.json');

const colorCodesContent = fs.readFileSync(path.resolve('modules/factories/_colorCodes.js'), 'utf8');
const jsonStr = colorCodesContent.replace('export const COLOR_NAMES = ', '').replace(/;\s*$/, '');
const COLOR_NAMES = eval('(' + jsonStr + ')');

const customData = JSON.parse(fs.readFileSync(customDataPath, 'utf8'));
const scrapedData = JSON.parse(fs.readFileSync(scrapedPath, 'utf8'));
const pricesJson = JSON.parse(fs.readFileSync(pricesPath, 'utf8')).prices;

const pool = customData.zubehoer_pool?.trays || [];
console.log(`Initial items in zubehoer_pool.trays: ${pool.length}`);

// Pre-index pool items by base art-Nr
const poolBaseMap = new Map();
pool.forEach(item => {
    const art = item.artNr || item.art_nr;
    if (art && art.includes('.')) {
        const base = art.split('.')[0].replace(/\s+/g, '');
        if (!poolBaseMap.has(base)) poolBaseMap.set(base, item);
    }
});

// Every art-Nr a mixer pool already owns, as a base tray or a variant SKU.
const owned = buildOwnedIndex(customData);

let totalHydratedInPool = 0;
let newBaseItemsCreated = 0;
const rejectedMain = [], rejectedOwned = [], unclassified = [];

Object.entries(scrapedData).forEach(([baseDigits, entry]) => {
    const variants = entry.variants || {};
    const varKeys = Object.keys(variants);
    if (!varKeys.length) return;

    let poolItem = poolBaseMap.get(baseDigits);

    // If base item is not yet in pool, create it from mainArt/first variant
    if (!poolItem) {
        const mainArt = entry.mainArt || varKeys[0];
        const mainV = variants[mainArt] || variants[varKeys[0]];
        const mainDesc = entry.mainDesc || mainV.desc || '';
        const candidate = { artNr: mainArt, label: mainDesc, description: mainDesc };

        // GATE 1 — identity. The label says this is a mixer/system, not a part.
        if (isMainProduct(candidate)) {
            rejectedMain.push(`${mainArt} (${varKeys.length} variants) — ${mainDesc.slice(0, 58)}`);
            return;
        }
        // GATE 2 — presence. A product pool already carries this article.
        const home = owned.get(mainArt);
        if (home) {
            rejectedOwned.push(`${mainArt} (${varKeys.length} variants) — already in ${home.pool}`);
            return;
        }

        const { type: productType, certain } = classifyAccessoryType(candidate);
        if (!certain) unclassified.push(`${mainArt} — ${mainDesc.slice(0, 58)}`);

        const isGessi = mainArt.startsWith('6241');
        const manufacturer = isGessi ? 'Gessi' : 'Emporio';

        poolItem = {
            artNr: mainArt,
            label: mainDesc || mainArt,
            description: mainDesc,
            productType,
            manufacturer,
            brand: manufacturer,
            imgUrl: '',
            variants: []
        };
        pool.push(poolItem);
        poolBaseMap.set(baseDigits, poolItem);
        newBaseItemsCreated++;
    }

    if (!Array.isArray(poolItem.variants)) poolItem.variants = [];

    const existingSKUMap = new Map();
    poolItem.variants.forEach(v => v.artNr && existingSKUMap.set(v.artNr, v));
    if (poolItem.artNr) existingSKUMap.set(poolItem.artNr, poolItem);

    varKeys.forEach(vArtNr => {
        if (existingSKUMap.has(vArtNr)) return; // already present

        const vInfo = variants[vArtNr];
        const fc = vArtNr.split('.')[1] || '501';
        const colorName = COLOR_NAMES[fc] || fc;

        let vLabel = poolItem.label || vInfo.desc || vArtNr;
        if (vLabel.includes('Verchromt')) {
            vLabel = vLabel.replace('Verchromt', colorName);
        } else if (vLabel.includes('Chromeline')) {
            vLabel = vLabel.replace('Chromeline', colorName);
        } else if (!vLabel.toLowerCase().includes(colorName.toLowerCase())) {
            vLabel = vLabel + ' ' + colorName;
        }

        const priceItem = pricesJson[vArtNr];
        const price = vInfo.price != null ? vInfo.price : (priceItem ? (priceItem.p || priceItem.price) : 0);

        const vObj = {
            artNr: vArtNr,
            label: vLabel,
            description: vInfo.desc || poolItem.description || '',
            productType: poolItem.productType,
            manufacturer: poolItem.manufacturer,
            brand: poolItem.brand,
            imgUrl: poolItem.imgUrl || '',
            price
        };

        poolItem.variants.push(vObj);
        existingSKUMap.set(vArtNr, vObj);
        totalHydratedInPool++;
    });
});

const show = (title, rows, cap = 6) => {
    if (!rows.length) return;
    console.log(`\n${title} (${rows.length}):`);
    rows.slice(0, cap).forEach(r => console.log('  ' + r));
    if (rows.length > cap) console.log(`  … and ${rows.length - cap} more`);
};

console.log(`\n✅ Ingestion Complete!`);
console.log(`New base items created in pool: ${newBaseItemsCreated}`);
console.log(`Total scraped variants merged into pool: ${totalHydratedInPool}`);
console.log(`Total items in zubehoer_pool.trays now: ${pool.length}`);

show('Not injected — main products, they belong to a mixer pool', rejectedMain);
show('Not injected — a product pool already owns the article', rejectedOwned);
// "Andere" is the label 129 misrouted articles hid behind. Never let it pass quietly.
show('⚠️  Injected as "Andere" — no rule matched, please check', unclassified, 20);

if (!WRITE) {
    console.log('\nDry run — nothing written. Re-run with --write to apply.');
} else {
    console.log('\n💾 Writing updated custom-data.json...');
    // JSON.stringify(…, null, 2): anything else reformats all 94k records.
    fs.writeFileSync(customDataPath, JSON.stringify(customData, null, 2), 'utf8');
    console.log('✨ Saved successfully!');
}
