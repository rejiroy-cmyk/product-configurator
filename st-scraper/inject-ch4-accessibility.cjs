// Inject the rest of Ch4's accessibility range into zubehoer_pool.
//
// WHAT THIS FINISHES
//   inject-ch4-accessories.js parks the whole Barrierefreiheit range in a HOLD
//   bucket — 392 bases / 1168 SKUs that were scraped and then never injected, so
//   no configurator can order a single grab bar, back rest or shower stool.
//   inject-ch4-winkelgriff.cjs took the first family out (197 SKUs). This takes the
//   remaining 901, and the 70 rail-carrying Winkelgriffe that script held back.
//
// ⚠ DO NOT RUN inject-ch4-accessories.js TO DO THIS.
//   It writes with bare `fs` + `JSON.stringify(data)` — minified AND un-interned.
//   One run of it un-does ~20 MB of interning and turns any change into a whole-file
//   diff. It predates _dataFile.cjs; this script uses readData/writeData, which
//   expands on read, re-interns on write, seeds the keys from disk and holds indent 2.
//
// ROUTING — a grab bar belongs to a ROOM, and the rail says which room
//   Reji's rule from the Winkelgriff round was that a grab bar carrying a
//   Duschgleitstange is a shower rail on a grab bar, not WC kit. That script read it
//   as "hold it back"; the honest reading is "it is a SHOWER accessory", so the rail
//   now picks the route instead of dropping the article. The test is widened from
//   `Duschgleitstange` alone to `Brausestange` as well — "Winkelgriff Keuco Elegance,
//   Brausestange rechts" is the same article in different words, and two of them had
//   walked into the Klosett panel because the narrow test missed them.
//   FULL-TEXT: half of these state the rail only in the description.
//
//   The plain bars (Haltegriff, rail-free Eckhaltegriff) go to WC + Dusche + Bad —
//   nothing in their text picks a room and all three order them.
//
// THE WC PANEL DOES NOT READ targetSubcats
//   createWCApp matches its own WC_ACC_FAMILIES prefix list and ignores routing
//   entirely, so every family routed to a Klosett here needs its leading noun added
//   there or it stays invisible. That edit ships with this script.
//
// IMAGES — never synthesized
//   A guessed PG1 url is a recorded 404 for this range: 71 of the 201 guessed in the
//   Winkelgriff round were, because these bases publish one image for a whole colour
//   RANGE (04711120_100-339_000.png) or a bare per-base shot (04722520.png).
//     BASES=… OUT=ch4-accessibility-images.json node scrape-ch7-images.cjs
//   Its `all[]` carries a URL per art-Nr read out of the FILENAME, so unlike the
//   Winkelgriff round each finish gets its own picture rather than the base's first.
//   A LOCAL img/ path on an existing tray is never re-judged — it exists only because
//   the localiser already fetched and size-checked it.
//
// Usage:
//   node inject-ch4-accessibility.cjs            # DRY RUN — counts + samples, writes nothing
//   node inject-ch4-accessibility.cjs --apply    # write custom-data.json + prices.json
'use strict';
const fs = require('fs');
const path = require('path');
const { readData, writeData } = require('./_dataFile.cjs');

const APPLY = process.argv.includes('--apply');
const SCRAPE = path.resolve(__dirname, 'chapter-4-variants-scraped.json');
const PRICES = path.resolve(__dirname, '../prices.json');
const IMAGES = path.resolve(__dirname, 'ch4-accessibility-images.json');

// ---- rooms ----------------------------------------------------------------
// The registry keys renderAccessoiresPanel matches against (`targetSubcats`).
const WC = ['wandklosett', 'standklosett'];
const SHOWER = ['duschenmischer', 'duschenwanne'];
const BATH = ['bademischer', 'badewanne'];
const merge = (...rs) => [...new Set(rs.flat())];

// FULL-TEXT: an integrated shower bar makes a grab bar a shower article.
const RX_RAIL = /dusche?n?gleitstange|brausestange/i;

// ---- families ---------------------------------------------------------------
// Identity PREFIX on the leading noun (`// label-prefix by design` — the GLOBAL
// RULE's identity exception): this asks what the article IS. Longest first, so
// "Eckhaltegriff" cannot be eaten by "Haltegriff" nor "Mobiler Klappsitz" — a shower
// seat — by a bare "Mobiler".
// `route` may be a function of (isRail) where the rail decides the room.
const FAMILIES = [
    ['dusch- und wannenhandlauf', 'Duschhandlauf', merge(SHOWER, BATH)],
    ['duschhandlauf', 'Duschhandlauf', SHOWER],
    ['eckhaltegriff', 'Eckhaltegriff', (rail) => (rail ? SHOWER : merge(WC, SHOWER, BATH))],
    ['winkelgriff', 'Winkelgriff', (rail) => (rail ? SHOWER : WC)],
    ['badewannenhaltegriff', 'Wannengriff', BATH],
    ['haltegriff', 'Haltegriff', (rail) => (rail ? SHOWER : merge(WC, SHOWER, BATH))],
    ['seitenwandgriff', 'Seitenwandgriff', WC],
    ['mobiler stützklappgriff', 'Stützklappgriff', WC],
    // The 154 Klappgriffe already in the pool route to the bidet as well; a second
    // route for one productType would read as an oversight, so this follows them.
    ['mobiler klappgriff', 'Klappgriff', merge(WC, ['bidet'])],
    ['mobiler klappsitz', 'Duschklappsitz', merge(SHOWER, BATH)],
    ['stützklappgriff', 'Stützklappgriff', WC],
    ['rückenstütze', 'Rückenstütze', WC],
    ['armlehne', 'Armlehne', WC],
    ['einhänge-duschsitz', 'Duschsitz', merge(SHOWER, BATH)],
    ['einhängesitz', 'Duschsitz', merge(SHOWER, BATH)],
    ['duschhocker', 'Duschhocker', SHOWER],
    ['bad-hocker', 'Duschhocker', merge(SHOWER, BATH)],
    ['badstuhl', 'Duschhocker', merge(SHOWER, BATH)],
    ['badewannensitz', 'Badewannensitz', BATH],
    ['wanneneinsteighilfe', 'Wanneneinsteighilfe', BATH],
    ['wannengriff', 'Wannengriff', BATH],
    ['fussstütze', 'Fussstütze', SHOWER],
    // Not accessibility at all — a floor-standing WC set (Papierhalter + Bürste) that
    // the HOLD list's bare 'Stand' prefix swept up. One article, and WC kit.
    ['stand wc-garnitur', 'WC-Zubehör', WC],
].sort((a, b) => b[0].length - a[0].length);

const famOf = (text) => {
    const lbl = text.trim().toLowerCase();   // label-prefix by design
    return FAMILIES.find(([p]) => lbl.startsWith(p)) || null;
};

// ---- images -----------------------------------------------------------------
const scrapedImg = fs.existsSync(IMAGES) ? JSON.parse(fs.readFileSync(IMAGES, 'utf8')) : {};
// Per-SKU first (the filename carries the full 13-digit art-Nr), then the base's own
// pick. PG1 is the real product shot, PS1 the drawing — prefer PG1 when the page
// showed both for the same art-Nr.
const bySku = new Map();
for (const rec of Object.values(scrapedImg)) {
    for (const a of (rec && rec.all) || []) {
        const prev = bySku.get(a.art);
        if (!prev || (prev.kind !== 'PG1' && a.kind === 'PG1')) bySku.set(a.art, a);
    }
}
const imgFor = (artNr, base, fallback) => {
    const hit = bySku.get(artNr);
    if (hit) return hit.url;
    const rec = scrapedImg[base];
    return (rec && rec.url) ? rec.url : fallback;
};

// ---- enrichment (same shape every Ch4/Ch5 injection writes) -------------------
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
const BRANDS = ['Keuco', 'Hewi', 'Nosag', 'Normbau', 'KWC', 'Bodenschatz', 'Bobrick', 'Proox',
    'Emco', 'Inda', 'Frost', 'Hansgrohe', 'Geberit', 'Laufen', 'Alterna', 'Diaqua', 'Dornbracht',
    'Neoperl', 'Smedbo', 'Zack', 'Cosmic', 'Giese'];
const brandOf = (t) => BRANDS.find(b => t.includes(b)) || 'Andere';
// The Ch4/Ch5 SIZE_RE, corrected for what a grab bar's text actually says. Two ways
// it read the wrong number here, both invisible until you list the values:
//   • decimals are written with a COMMA ("54,5 x 22 x 21 cm"), and a pattern that
//     cannot see it starts matching mid-number — "5 x 22 x 21 cm".
//   • "Ø 33 mm" is the TUBE GAUGE, not the article's size, and it was winning the
//     whole Eckhaltegriff family (26 of 138 pilled as "32 mm").
// A Ø in centimetres IS a size (a bowl); a Ø in millimetres is the gauge, so only the
// latter is stripped.
const NUM = '\\d+(?:[.,]\\d+)?';
const SIZE_RE = [
    new RegExp(`${NUM} ?x ?${NUM}(?: ?x ?${NUM})? ?(?:cm|mm)`),
    new RegExp(`Breite ?${NUM} ?(?:cm|mm)`),
    new RegExp(`Ø ?${NUM} ?cm`),
    new RegExp(`${NUM} ?cm`),
    new RegExp(`${NUM} ?mm`),
];
const sizeOf = (t) => {
    const s = t.replace(/Ø ?\d+(?:[.,]\d+)? ?mm/g, ' ');
    for (const re of SIZE_RE) { const m = s.match(re); if (m) return m[0].trim(); }
    return 'Standard';
};
const plain = (s) => String(s || '').replace(/<[^>]*>/g, ' ');

// ---- build ------------------------------------------------------------------
const scrape = JSON.parse(fs.readFileSync(SCRAPE, 'utf8'));
const data = readData();
const pricesFile = JSON.parse(fs.readFileSync(PRICES, 'utf8'));
const prices = pricesFile.prices;

const pool = data.zubehoer_pool;
if (!pool || !Array.isArray(pool.trays)) throw new Error('zubehoer_pool.trays missing — wrong data file?');
const poolByArt = new Map();
pool.trays.forEach(t => { if (t && t.artNr) poolByArt.set(t.artNr, t); });

const newTrays = [];
const stat = {};                              // productType -> {new, retag, dup, rail}
const bump = (type, k) => { (stat[type] = stat[type] || { new: 0, retag: 0, dup: 0, rail: 0 })[k]++; };
let skusNew = 0, skusRetagged = 0, skusDup = 0, pricesAdded = 0, imgReal = 0, imgGuessed = 0;
const unmapped = {};

for (const [base, rec] of Object.entries(scrape)) {
    if (rec.status !== 'done') continue;
    const mainDesc = (rec.mainDesc || '').trim();
    if (!mainDesc) continue;
    const fam = famOf(mainDesc);
    if (!fam) continue;
    const [, productType, route] = fam;

    for (const [artNr, v] of Object.entries(rec.variants || {})) {
        const label = v.desc || mainDesc;
        // FULL-TEXT — the rail is in the description as often as in the label.
        const isRail = RX_RAIL.test(plain(`${mainDesc} ${v.desc || ''}`));
        const targetSubcats = (typeof route === 'function' ? route(isRail) : route).slice();
        if (isRail) bump(productType, 'rail');

        const existing = poolByArt.get(artNr);
        if (existing) {
            // Idempotent: refresh routing on a tray an earlier run wrote, never
            // duplicate it. A LOCAL img/ path is real and is never re-judged.
            let touched = false;
            if (existing.productType !== productType) { existing.productType = productType; touched = true; }
            if (String(existing.targetSubcats || '') !== String(targetSubcats)) {
                existing.targetSubcats = targetSubcats; touched = true;
            }
            const better = bySku.has(artNr) ? bySku.get(artNr).url : null;
            if (better && !/^img\//.test(existing.imgUrl || '') && existing.imgUrl !== better) {
                existing.imgUrl = better; touched = true;
            }
            if (touched) { skusRetagged++; bump(productType, 'retag'); }
            else { skusDup++; bump(productType, 'dup'); }
            continue;
        }

        const real = bySku.has(artNr) || (scrapedImg[base] && scrapedImg[base].url);
        if (real) imgReal++; else imgGuessed++;

        const tray = {
            id: 'ch4acc_' + artNr.replace(/[^0-9]/g, ''),
            manufacturer: brandOf(label),
            form: 'Standard',
            size: sizeOf(label),
            artNr,
            label,
            description: label,
            menge: 1,
            imgUrl: imgFor(artNr, base, getSanitasImgUrl(artNr)),
            productType,
            targetSubcats,
        };
        newTrays.push(tray);
        poolByArt.set(artNr, tray);
        skusNew++; bump(productType, 'new');
        if (v.price != null && prices[artNr] == null) { prices[artNr] = v.price; pricesAdded++; }
    }
}

// ---- report -----------------------------------------------------------------
console.log('=== Ch4 accessibility injection ' + (APPLY ? '(APPLY)' : '(DRY RUN)') + ' ===');
console.log(`images scraped                 : ${Object.keys(scrapedImg).length} bases / ${bySku.size} per-SKU urls`);
console.log(`new pool trays                 : ${skusNew}   (real image ${imgReal} · synthesized ${imgGuessed})`);
console.log(`re-tagged existing             : ${skusRetagged}`);
console.log(`already correct (skipped)      : ${skusDup}`);
console.log(`prices to add                  : ${pricesAdded}`);
console.log(`pool.trays                     : ${pool.trays.length} -> ${pool.trays.length + newTrays.length}`);

console.log('\nby productType (new / re-tagged / unchanged, of which rail-routed):');
for (const [t, s] of Object.entries(stat).sort((a, b) => (b[1].new + b[1].retag + b[1].dup) - (a[1].new + a[1].retag + a[1].dup))) {
    console.log(`  ${t.padEnd(20)} ${String(s.new).padStart(4)} / ${String(s.retag).padStart(3)} / ${String(s.dup).padStart(3)}   rail ${s.rail}`);
}

const routeCount = {};
newTrays.forEach(t => { const k = t.targetSubcats.join('+'); routeCount[k] = (routeCount[k] || 0) + 1; });
console.log('\nby route:');
Object.entries(routeCount).sort((a, b) => b[1] - a[1]).forEach(([k, v]) => console.log(`  ${String(v).padStart(4)}  ${k}`));

console.log('\nsample new trays:');
newTrays.slice(0, 4).forEach(t => console.log('  ' + JSON.stringify(t)));

if (imgGuessed) {
    console.log(`\n⚠ ${imgGuessed} SKUs fell back to a SYNTHESIZED PG1 url — a recorded 404 for this range.`);
    console.log('  Finish the scrape first:  BASES=… OUT=ch4-accessibility-images.json node scrape-ch7-images.cjs');
}

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
