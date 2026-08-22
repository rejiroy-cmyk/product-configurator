// Inject the Klappgriff / Klappsitz mounting material into zubehoer_pool.
//
// WHY
//   A Klappgriff is delivered WITHOUT its anchors — "Klappgriff Hewi 801, A 60 cm,
//   ohne Befestigungsmaterial, Zubehör: Befestigungsmaterial" — and the anchor that
//   fits depends on the WALL (Beton · Leichtbeton · Lochziegel · Leichtbauwand ·
//   Vorwandmontage). None of those 41 SKUs existed in custom-data.json and none had a
//   price, so a Klappgriff could be ordered that cannot be mounted.
//
// ⚠ EVERY MANUFACTURER SHIPS ITS OWN — Reji's rule, and the reason this is a per-ARTICLE
//   table rather than a Befestigungsmaterial family filtered by brand. A Hewi Klappgriff
//   takes 4711 179/180/187/189/190; a Nosag one takes 4721 187/188. There is no overlap,
//   and a brand filter would eventually put a Hewi anchor under a Nosag bar. The mapping
//   is SAP's own `additionalMaterials`, so it is right by construction — never infer it.
//
// SCOPE — Klappgriff, Stützklappgriff and Klappsitz ONLY.
//   Haltegriff, Winkelgriff and Eckhaltegriff ship WITH their mounting material (Reji),
//   and SAP agrees: a Haltegriff Hewi 801 returns no additionalMaterials at all. An
//   Einhängesitz hangs on a Winkelgriff and needs none — those are excluded by the same
//   `einhäng` test the accessory panel uses.
//
// WHAT SAP RETURNS IS NOT ALL FIXINGS. Of the 52 distinct articles it named across these
//   110 bases, 28 are anchors, 13 are Montageplatte/Grundplatte/Abdeckung (a DIFFERENT
//   part — the plate itself then needs anchors too, so its row comes FIRST) and 11 are
//   unrelated accessories: Papierhalter, Rückenstütze, Armlehne, Abdeckplatte. Offering a
//   Papierhalter as a screw option would be nonsense, so the split is an identity PREFIX
//   on the leading noun — the GLOBAL RULE's permitted exception — and it is baked into
//   klapp-fixings.json rather than re-derived here.
//
// Source: st-scraper/klapp-fixings.json (base -> fixings/plates) and
//         st-scraper/klapp-fixing-details.json (label, description, price, image).
//   Both scraped from article.ws through a guest browser session — no login. A plain
//   https.get returns NOSESSION; the cookie an ordinary page visit sets is enough.
//
// Usage:
//   node inject-klapp-fixings.cjs            # DRY RUN
//   node inject-klapp-fixings.cjs --apply    # write custom-data.json + prices.json
'use strict';
const fs = require('fs');
const path = require('path');
const { readData, writeData } = require('./_dataFile.cjs');

const APPLY = process.argv.includes('--apply');
const MAP = path.resolve(__dirname, 'klapp-fixings.json');
const DET = path.resolve(__dirname, 'klapp-fixing-details.json');
const PRICES = path.resolve(__dirname, '../prices.json');

const HOST = 'https://profishop.sanitastroesch.ch';
// Rückenstütze joins the scope: 7 of its 24 bases say "ohne Befestigungsmaterial" and
// SAP names anchors for them, including six SKUs that existed nowhere in our data —
// 4711 178/185/186 (1-teilig, for the back-rests that mount on a Klappgriff) and
// 4711 290/291/292 (2-teilig, and 290 says "zu Rückenstütze" outright).
// ⚠ Their Zubehör group also lists 30 KLAPPGRIFF entries — the bars the back-rest fits.
// That is the partner-reference trap; the identity-prefix filter in klapp-fixings.json
// drops them, because offering a Klappgriff as a screw option would be nonsense.
const FAMS = ['Klappgriff', 'Stützklappgriff', 'Duschklappsitz', 'Rückenstütze', 'Duschhandlauf',
    'Winkelgriff', 'Haltegriff'];
// Haltegriff, like Winkelgriff, is here for the OPTIONAL arm only. All 120 bases were
// queried across 9 brands and not one says "ohne Befestigungsmaterial". Four bases ARE
// silent while SAP offers them a screws-and-plugs set (Alterna nonda / direta, Hansgrohe
// AddStoris) — silence is treated as complete (Reji), so they get no row: nothing says
// "ohne", and forcing would risk double-ordering for grips that ship complete.
// Winkelgriff is here for the OPTIONAL arm only — never the forced one. All 94 bases were
// queried across Keuco/Hewi/Nosag/KWC and not one says "ohne Befestigungsmaterial", which
// confirms the rule on the whole family rather than on the Hewi 805 sample alone. Six
// Keuco Collection Axess bases say "mit Befestigungsmaterial, Set Nr. 1" and offer the
// same two alternatives as the Duschhandlauf.
// Duschhandlauf needs NOTHING — not one of its 37 bases says "ohne Befestigungsmaterial".
// The Keuco Collection Axess rails say "mit Befestigungsmaterial, Set Nr. 1": it is in the
// box. 4171 442 / 444 are ALTERNATIVE sets for substrates where Set Nr. 1 will not hold —
// an upgrade, not a missing part. They render as an OPTIONAL row that defaults to the
// supplied set and adds no SAP line until switched; a forced pick here would order a
// second fixing set for every rail.
// An Einhängesitz / einhängbarer Klappsitz hooks onto a grab bar — no anchors at all.
const RX_HOOKS = /einhäng|zum einhängen|einzuhängen/i;
const RX_OHNE = /ohne\s+befestigungsmaterial/i;
const plain = (s) => String(s || '').replace(/<[^>]*>/g, ' ');
const full = (t) => plain(`${t.label || ''} ${t.description || ''}`);

const BRANDS = ['Hewi', 'Nosag', 'Normbau', 'Keuco', 'KWC', 'Inda', 'Neoperl', 'Bodenschatz'];
const brandOf = (t) => BRANDS.find(b => t.includes(b)) || 'Andere';

// The wall a fixing is FOR — this is what the dropdown is really asking, so it becomes
// the tray's `size`, the field the facet bar and the option label read.
const WALLS = [
    [/hohlblock/i, 'Hohlblockstein'],
    [/leichtbauw(ä|ae)nde[n]?\s+mit\s+integrierten/i, 'Leichtbauwand mit Stahlplatte'],
    [/leichtbauw/i, 'Leichtbauwand'],
    [/vorwand/i, 'Vorwandmontage'],
    [/lochziegel/i, 'Leichtbeton / Lochziegel'],
    [/leichtbeton/i, 'Leichtbeton / Lochziegel'],
    [/beton|vollstein/i, 'Beton / Vollstein'],
    [/ohne\s+d(ü|ue)bel/i, 'ohne Dübel'],
    // Keuco's Set Nr. 2 names no wall at all — it ships a universal plug, which IS
    // the answer to "which wall", so it must not fall through to "Standard".
    [/universald(ü|ue)bel/i, 'Universaldübel'],
];
const wallOf = (text) => { for (const [re, name] of WALLS) if (re.test(text)) return name; return 'Standard'; };

// ---- load ------------------------------------------------------------------
const M = JSON.parse(fs.readFileSync(MAP, 'utf8'));
const D = JSON.parse(fs.readFileSync(DET, 'utf8')).articles;
const data = readData();
const pricesFile = JSON.parse(fs.readFileSync(PRICES, 'utf8'));
const prices = pricesFile.prices;

const pool = data.zubehoer_pool;
if (!pool || !Array.isArray(pool.trays)) throw new Error('zubehoer_pool.trays missing — wrong data file?');
const poolByArt = new Map();
pool.trays.forEach(t => { if (t && t.artNr) poolByArt.set(t.artNr, t); });

const byBase = {};
M.groups.forEach(g => g.bases.forEach(b => { byBase[b] = g; }));

// ---- 1. the fixing / plate articles themselves ------------------------------
const FIXING_TYPE = 'Befestigungsmaterial';
const PLATE_TYPE = 'Montageplatte';
const isPlate = (a) => Boolean(M.plates[a]);

const newTrays = [];
let skusNew = 0, skusRetagged = 0, skusDup = 0, pricesAdded = 0, noImage = 0;

// Route them to every subcat a Klapp* article can appear in, so the companion row can
// resolve the article wherever the grab bar was picked.
const ROUTE = ['wandklosett', 'standklosett', 'bidet', 'duschenmischer', 'duschenwanne',
    'bademischer', 'badewanne'];

for (const [artNr, det] of Object.entries(D)) {
    const productType = isPlate(artNr) ? PLATE_TYPE : FIXING_TYPE;
    const text = `${det.label} ${det.description}`;
    const existing = poolByArt.get(artNr);
    if (existing) {
        let touched = false;
        if (existing.productType !== productType) { existing.productType = productType; touched = true; }
        if (touched) skusRetagged++; else skusDup++;
        continue;
    }
    // The image path comes from the API and is never constructed. Two Hewi LifeSystem
    // plates carry SPACES in the filename, so it has to be encoded to be fetchable.
    const img = det.image ? HOST + det.image.split('/').map(encodeURIComponent).join('/') : '';
    if (!det.image) noImage++;
    const tray = {
        id: 'klappfix_' + artNr.replace(/[^0-9]/g, ''),
        manufacturer: brandOf(text),
        form: 'Standard',
        size: wallOf(text),
        artNr,
        label: det.label,
        description: det.description || det.label,
        menge: 1,
        imgUrl: img,
        productType,
        targetSubcats: ROUTE.slice(),
    };
    newTrays.push(tray);
    poolByArt.set(artNr, tray);
    skusNew++;
    if (det.price != null && prices[artNr] == null) { prices[artNr] = det.price; pricesAdded++; }
}

// ---- 2. attach the per-article mapping to every Klapp* tray -----------------
// Stored ON the tray so the runtime needs no second table and no lookup by brand:
//   fixingOptions — art-Nrs for the Befestigungsmaterial dropdown
//   plateOptions  — art-Nrs for the Montageplatte dropdown (rendered FIRST)
//   fixingMissing — true when the article says "ohne Befestigungsmaterial" and SAP
//                   names none: a visible warning row, never a guessed art-Nr.
const items = pool.trays.filter(t => t && FAMS.includes(t.productType) && !RX_HOOKS.test(full(t)));

// "ohne Befestigungsmaterial" is a property of the MODEL, not of one finish. Only the
// .100 variants of the Nosag Verso Care family carry the phrase; the .337 ones are the
// same bar with the text truncated elsewhere, and a per-SKU test warned on half a family
// and stayed silent on the other half. Decide it once per base.
const ohneBase = new Set();
items.forEach(t => { if (RX_OHNE.test(full(t))) ohneBase.add(t.artNr.replace(/[^0-9]/g, '').slice(0, 7)); });

let attached = 0, warned = 0, noneNeeded = 0, unchanged = 0, viaPlate = 0, optional = 0;
for (const t of items) {
    const base = t.artNr.replace(/[^0-9]/g, '').slice(0, 7);
    const g = byBase[base];
    let fx = (g && g.fixings) || [];
    const pl = (g && g.plates) || [];
    // A PLATE IS WHAT GETS SCREWED TO THE WALL, so when the bar itself names no anchors
    // the anchors are the plate's. SAP says so per article — `plateFixings` is read off
    // each plate's own additionalMaterials, never parsed out of its "siehe 4721 795 -
    // 798" text. This is what takes the six Nosag Verso Care Klappgriffe off the warning
    // row: 4722 241 names 4721 795/796/798, all Nosag, all already injected.
    if (!fx.length && pl.length) {
        const inherited = [];
        pl.forEach(p => ((M.plateFixings || {})[p] || []).forEach(a => {
            if (!inherited.includes(a)) inherited.push(a);
        }));
        if (inherited.length) { fx = inherited; viaPlate++; }
    }
    const before = JSON.stringify([t.fixingOptions, t.plateOptions, t.fixingMissing]);
    if (fx.length) { t.fixingOptions = fx.slice(); attached++; }
    else { delete t.fixingOptions; }
    if (pl.length) t.plateOptions = pl.slice(); else delete t.plateOptions;
    // The optional arm: alternatives to a set the article already ships.
    const opt = (M.optionalFixings || []).find(g => g.bases.includes(base));
    if (opt) { t.fixingOptional = opt.options.slice(); t.fixingSupplied = opt.suppliedNote; optional++; }
    else { delete t.fixingOptional; delete t.fixingSupplied; }

    if (!fx.length && ohneBase.has(base)) { t.fixingMissing = true; warned++; }
    else { delete t.fixingMissing; if (!fx.length) noneNeeded++; }
    if (JSON.stringify([t.fixingOptions, t.plateOptions, t.fixingMissing]) === before) unchanged++;
}

// ---- report ----------------------------------------------------------------
console.log('=== Klappgriff/Klappsitz mounting material ' + (APPLY ? '(APPLY)' : '(DRY RUN)') + ' ===');
console.log(`fixing + plate SKUs      : ${Object.keys(D).length}  (${Object.keys(M.fixings).length} anchors · ${Object.keys(M.plates).length} plates)`);
console.log(`  new pool trays         : ${skusNew}   (no image: ${noImage})`);
console.log(`  re-tagged / unchanged  : ${skusRetagged} / ${skusDup}`);
console.log(`  prices to add          : ${pricesAdded}`);
console.log('');
console.log(`Klapp* SKUs in scope     : ${items.length}`);
console.log(`  get a fixings dropdown : ${attached}   (of which via the plate: ${viaPlate})`);
console.log(`  Montageplatte dropdown : ${items.filter(t => t.plateOptions).length}`);
console.log(`  OPTIONAL row (ships its own, alternatives offered) : ${optional}`);
console.log(`  WARNING row (says ohne, SAP names none) : ${warned}`);
console.log(`  no row (material included)              : ${noneNeeded}`);
console.log(`pool.trays               : ${pool.trays.length} -> ${pool.trays.length + newTrays.length}`);

const walls = {};
newTrays.filter(t => t.productType === FIXING_TYPE).forEach(t => { walls[t.size] = (walls[t.size] || 0) + 1; });
console.log('\nanchors by wall type:', JSON.stringify(walls, null, 0));

console.log('\nsample fixing tray:');
console.log('  ' + JSON.stringify(newTrays[0]));
console.log('\nsample Klappgriff after attach:');
const s = items.find(t => t.fixingOptions && t.plateOptions);
if (s) console.log('  ' + JSON.stringify({ artNr: s.artNr, label: s.label.slice(0, 60), plateOptions: s.plateOptions, fixingOptions: s.fixingOptions }));

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
