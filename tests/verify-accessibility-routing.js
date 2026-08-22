// ============================================================================
// CH4 ACCESSIBILITY RANGE — ROUTING GUARD  (2026-08-22)
//
// Ch4's HOLD bucket (392 bases / 1168 SKUs of Barrierefreiheit — Haltegriff,
// Eckhaltegriff, Stützklappgriff, Rückenstütze, Duschsitz, Duschhocker …) was
// scraped and never injected, so no configurator could order a grab bar.
// st-scraper/inject-ch4-accessibility.cjs injects it and routes each family to
// the rooms that order it.
//
// THE INVARIANT THIS EXISTS FOR — routing a family to a Klosett is NOT enough.
// createWCApp's Accessoires panel ignores `targetSubcats` entirely and matches
// its own WC_ACC_FAMILIES prefix list; the family list IS the routing there.
// A family routed to `wandklosett` whose leading noun is missing from that list
// is invisible at the WC, silently, with nothing in the data to show for it.
// That is exactly how only 50 of 154 Klappgriff once appeared. So: every family
// the injector sends to a Klosett must be named in WC_ACC_FAMILIES, and this
// test pins the two files to each other.
//
// A grab bar carrying a shower rail is a shower rail on a grab bar, not WC kit
// (Reji's rule). The injector routes those to the shower instead of holding them
// back, and isWCAccessory drops them from the Klosett panel — both sides read the
// FULL text, since half of them name the rail only in the description.
//
// COST: custom-data.json is ~36 MB interned. Read and expand it ONCE.
// ============================================================================
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const require = createRequire(import.meta.url);
const { readData } = require('../st-scraper/_dataFile.cjs');

let passed = 0, failed = 0;
const check = (name, cond, detail) => {
    if (cond) { console.log(`✅ [PASS] ${name}`); passed++; }
    else { console.log(`❌ [FAIL] ${name}${detail ? `\n     ${detail}` : ''}`); failed++; }
};
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
// A German comment says "Ch4's HOLD bucket", and that apostrophe pairs with the next
// one in the source — every quoted entry after it parses as garbage. Strip comments
// before reading string literals out of a list.
const stripComments = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^[ \t]*\/\/.*$/gm, '');

// ============================== 1. THE CROSS-FILE INVARIANT =================
console.log('\n--- 1. every Klosett-routed family is named in WC_ACC_FAMILIES ---\n');

const injector = read('st-scraper/inject-ch4-accessibility.cjs');
const wcApp = read('modules/factories/createWCApp.js');

// FAMILIES rows: ['<prefix>', '<productType>', <route>] — the route may be an
// identifier, an array, a merge(...) call or an arrow function of `rail`.
const famRows = [...injector.matchAll(/^\s*\['([^']+)',\s*'([^']+)',\s*(.+?)\],\s*$/gm)]
    .map(m => ({ prefix: m[1], type: m[2], route: m[3] }));
check('the injector FAMILIES table parses', famRows.length >= 20,
    `parsed ${famRows.length} rows — the table's shape changed, update this test`);

// A route reaches a Klosett if it names WC, or names a Klosett key literally.
const reachesWC = (route) => /\bWC\b/.test(route) || /wandklosett|standklosett/.test(route);

const wcFamList = (stripComments(wcApp).match(/const WC_ACC_FAMILIES = \[([\s\S]*?)\]\s*\.sort/) || [])[1] || '';
const wcFamilies = [...wcFamList.matchAll(/'([^']+)'/g)].map(m => m[1]);
check('WC_ACC_FAMILIES parses', wcFamilies.length >= 20,
    `parsed ${wcFamilies.length} entries — the list's shape changed, update this test`);

for (const f of famRows.filter(r => reachesWC(r.route))) {
    check(`"${f.prefix}" is routed to a Klosett and named in WC_ACC_FAMILIES`,
        wcFamilies.includes(f.prefix),
        `routed to a Klosett but not in WC_ACC_FAMILIES — invisible in that panel`);
}

// The reverse never has to hold: WC_ACC_FAMILIES carries families this injector
// does not write (Papierhalter, Hygienekombination …).

// ============================== 2. THE RAIL RULE ============================
console.log('\n--- 2. the rail rule is one rule, spelled the same on both sides ---\n');

const injRail = (injector.match(/const RX_RAIL = (\/.+?\/i);/) || [])[1];
const wcRail = (wcApp.match(/const RX_GRIFF_RAIL = (\/.+?\/i);/) || [])[1];
check('both files define a rail regex', Boolean(injRail && wcRail),
    `injector ${injRail} · createWCApp ${wcRail}`);
check('the two rail regexes are identical', injRail === wcRail,
    `injector ${injRail} · createWCApp ${wcRail} — one side would route a bar the other still shows`);
check('the rail test covers Brausestange, not just Duschgleitstange',
    /brausestange/i.test(wcRail || ''),
    'Keuco spells the same article "Brausestange"; two of them walked into the Klosett panel on the narrow test');

// Every bar family must be subject to the rail test, or a rail-carrying bar in
// that family shows at the WC.
const griffSet = (stripComments(wcApp).match(/const GRIFF_FAMILIES = new Set\(\[([\s\S]*?)\]\)/) || [])[1] || '';
const griffFamilies = [...griffSet.matchAll(/'([^']+)'/g)].map(m => m[1]);
for (const f of wcFamilies.filter(f => /griff/.test(f))) {
    check(`bar family "${f}" is subject to the rail test`,
        griffFamilies.includes(f),
        'a *griff family outside GRIFF_FAMILIES shows its rail-carrying SKUs at the WC');
}
check('isWCAccessory applies the rail test by family set, not by one hardcoded name',
    /GRIFF_FAMILIES\.has\(fam\)/.test(wcApp),
    'back to `fam === \'winkelgriff\'` — every other bar family loses the rule');

// WC_ACC_FAMILIES must be longest-first: `find` returns the FIRST match, and the
// family it returns is what decides whether the rail test runs.
check('WC_ACC_FAMILIES is sorted longest-first',
    /\]\s*\.sort\(\(a, b\) => b\.length - a\.length\)/.test(wcApp),
    'without the sort, prefix order decides which family (and which rule) a label gets');

// ============================== 3. THE RELATIONAL ARM =======================
console.log('\n--- 3. Duschenwanne / Badewanne read targetSubcats ---\n');

const rel = read('modules/factories/createRelationalApp.js');
const popIdx = rel.indexOf('populateAccessoires: function');
const popBody = popIdx === -1 ? '' : rel.slice(popIdx, popIdx + 4200);
check('createRelationalApp.populateAccessoires reads targetSubcats',
    /targetSubcats/.test(popBody),
    'back to the keyword-only scan — everything routed to badewanne/duschenwanne goes invisible again');
check('...and still keeps the keyword arm beside it',
    /keywords\.some\(/.test(popBody),
    'the routed arm must ADD to the keyword scan, never replace it');
check('...and excludes the configurator-owned dropdown families',
    /Duschgleitstange/.test(popBody) && /Ablaufventil/.test(popBody),
    'a dropdown family reachable twice puts one art-Nr on two BOM lines');

// ============================== 4. THE DATA =================================
console.log('\n--- 4. the injected range, in custom-data.json ---\n');

const data = readData();
const pool = (data.zubehoer_pool && data.zubehoer_pool.trays) || [];
const RX_RAIL = new RegExp(injRail.slice(1, -2), 'i');
const KLOSETT = ['wandklosett', 'standklosett'];
const SHOWER_OR_BATH = ['duschenmischer', 'duschenwanne', 'bademischer', 'badewanne'];
const plain = (s) => String(s || '').replace(/<[^>]*>/g, ' ');
const full = (t) => plain(`${t.label || ''} ${t.description || ''}`);

// The bar families, as the pool tags them.
const BAR_TYPES = ['Haltegriff', 'Eckhaltegriff', 'Winkelgriff', 'Klappgriff',
    'Stützklappgriff', 'Seitenwandgriff'];
const bars = pool.filter(t => t && BAR_TYPES.includes(t.productType));
check(`the pool carries the bar families (${bars.length} SKUs)`, bars.length >= 800,
    `only ${bars.length} — the injection is missing or was reverted`);

const railBars = bars.filter(t => RX_RAIL.test(full(t)));
check(`rail-carrying bars are present, not dropped (${railBars.length})`, railBars.length >= 150,
    `only ${railBars.length} — they are being held back again instead of routed to the shower`);

const railAtWC = railBars.filter(t => (t.targetSubcats || []).some(s => KLOSETT.includes(s)));
check('no rail-carrying bar is routed to a Klosett', railAtWC.length === 0,
    railAtWC.slice(0, 5).map(t => `${t.artNr}  ${full(t).slice(0, 80)}`).join('\n     '));

const railHomeless = railBars.filter(t => !(t.targetSubcats || []).some(s => SHOWER_OR_BATH.includes(s)));
check('every rail-carrying bar reaches a shower or bath configurator', railHomeless.length === 0,
    railHomeless.slice(0, 5).map(t => `${t.artNr}  ${JSON.stringify(t.targetSubcats)}`).join('\n     '));

const acc = pool.filter(t => t && typeof t.id === 'string' && t.id.startsWith('ch4acc_'));
check(`the injector's own trays are in the pool (${acc.length})`, acc.length >= 900,
    `only ${acc.length} — expected ~971 from inject-ch4-accessibility.cjs`);
check('every injected tray carries a productType', acc.every(t => t.productType),
    acc.filter(t => !t.productType).slice(0, 5).map(t => t.artNr).join(', '));
check('every injected tray carries a non-empty route',
    acc.every(t => Array.isArray(t.targetSubcats) && t.targetSubcats.length > 0),
    acc.filter(t => !(t.targetSubcats || []).length).slice(0, 5).map(t => t.artNr).join(', '));

// A synthesized PG1 url is a recorded 404 for this range — 71 of 201 were in the
// Winkelgriff round. The scrape reads the url out of the page; the localiser then
// turns it into a local img/ path.
const remoteGuess = acc.filter(t => /multimedia\/Web\/PG1\//.test(t.imgUrl || ''));
check(`injected images are localised or scraped, not synthesized (${remoteGuess.length} remote)`,
    remoteGuess.length === 0,
    `${remoteGuess.length} still point at a constructed profishop URL — run localize-images.cjs`);


// ============================== 5. THE SERIE PILL ===========================
// The facet bar is how 971 new articles become findable, and its Serie dimension
// is accessorySerie(). Importing _shared.js needs the same DOM mocks every other
// suite installs.
console.log('\n--- 5. the Serie pill for the accessibility range ---\n');

global.alert = () => {};
global.window = {
    copyTextToClipboard: () => Promise.resolve(),
    copyBOMToClipboard: () => {},
    getComputedStyle: () => ({ display: 'block' }),
};
global.document = {
    createElement: () => ({ style: {} }),
    body: { appendChild: () => {}, removeChild: () => {} },
    getElementById: () => ({ style: {}, querySelectorAll: () => [], querySelector: () => null }),
    querySelector: () => null,
};
const { accessorySerie } = await import('../modules/factories/_shared.js');

const serie = (manufacturer, label) => accessorySerie({ manufacturer, label });

// Hewi's lines ARE bare numbers. The token rule cannot read them — it demands a
// leading letter — so all 1'469 Hewi articles pilled as one "Hewi".
check('Hewi 801 reads as its own line', serie('Hewi', 'Rückenstütze Hewi 801, zu Klappgriff links, Wandmontage') === 'Hewi 801');
check('Hewi 900 reads as its own line', serie('Hewi', 'Mobiler Klappgriff Hewi 900 Duo, 60 cm, Ø 33,7 mm') === 'Hewi 900');
check('Hewi 805 reads as its own line', serie('Hewi', 'Seitenwandgriff Hewi 805, rechts, Ø 33 mm, 32,5 x 29,5 cm') === 'Hewi 805');
check('Hewi System 100/800 is one pill, not "System"',
    serie('Hewi', 'Duschklappsitz Hewi System 100 / 800, Breite 35 cm') === 'System 100/800');
check('a letter-led Hewi line still wins over the number rule',
    serie('Hewi', 'Einhängesitz Hewi LifeSystem Premium, ohne Hygieneausschnitt') === 'LifeSystem');

// The number rule is BRAND-SCOPED on purpose: after any other brand a number is
// usually a dimension, and reading it would invent lines that do not exist.
check('a size range after another brand is NOT read as a line',
    serie('Bodenschatz', 'Handtuchhalter ausziehbar Bodenschatz, 33 - 51 cm, Führung seitlich') === 'Bodenschatz',
    'the bare-number rule leaked past Hewi — "Bodenschatz 33" is half a size range');
check('a diameter after another brand is NOT read as a line',
    serie('Geberit', 'Duschwannenablauf Geberit 90 Ø Abgang Ø 56 mm direkt verschweissbar') === 'Geberit',
    'the bare-number rule leaked past Hewi — "Geberit 90" is a drain diameter');

check('Keuco Collection Axess keeps both words', serie('Keuco', 'Rückenstütze Keuco Collection Axess, 348 x 250 x 51 mm') === 'Collection Axess');
check('Keuco Collection Moll is its own pill', serie('Keuco', 'Papierhalter Keuco Collection Moll, Breite 156 mm') === 'Collection Moll',
    'Axess, Moll (41) and Reva (30) all merged into a bare "Collection"');
check('Keuco Collection Reva is its own pill', serie('Keuco', 'Handtuchhalter Keuco Collection Reva, Breite 450 mm') === 'Collection Reva');
check('Keuco Elegance is untouched', serie('Keuco', 'Duschhandlauf Keuco Elegance, 114,2 x 62,8 cm') === 'Elegance');
check('"Nosag Normbau Cavere" folds into the Cavere pill', serie('Nosag', 'Armlehne Nosag Normbau Cavere, 59 x 50,9 x 10 cm') === 'Cavere');
check('"Nosag Cavere" reaches the same pill', serie('Nosag', 'Duschhocker Nosag Cavere, Beine pulverbeschichtet') === 'Cavere');
check('piana-gewinkelt is the piana line', serie('Alterna', 'Haltegriff Alterna piana-gewinkelt, 37 x 17 cm') === 'Piana');
check('piana is unchanged', serie('Alterna', 'Haltegriff Alterna piana - gerade, 30 cm') === 'Piana');
check('rondo-gerade is the rondo line', serie('Alterna', 'Haltegriff Alterna rondo-gerade, Seifenschale klar') === 'Rondo');
check('nonda-gewinkelt joins the plain nonda pill', serie('Alterna', 'Haltegriff Alterna nonda-gewinkelt, Verchromt') === 'Nonda'
    && serie('Alterna', 'Papierhalter Alterna nonda ohne Deckel, Montage kleben') === 'Nonda',
    'the shape suffix split one Alterna line across a pill per shape');
check('an Alterna line with no shape suffix is untouched',
    serie('Alterna', 'Haltegriff Alterna direta, 30 cm, Verchromt') === 'Direta');
check('a shape word alone is not a line name',
    serie('Bodenschatz', 'Haltegriff Bodenschatz sechskantig, max. Belastbarkeit 150 kg') === 'Bodenschatz');
check('a frame spec is not a line name', serie('Hewi', 'Duschhocker Hewi, Gestell hochwertig verchromt') === 'Hewi',
    '"Gestell" states construction, not a product line');
check('CWS Stainless Steel still wins over the noise list',
    serie('CWS', 'Papierhandtuchspender CWS Stainless Steel, Füllmenge 600 Blatt') === 'Stainless Steel');


// ============================== 6. KLAPPGRIFF MOUNTING MATERIAL =============
// A Klappgriff is delivered WITHOUT its anchors, and which anchor fits depends on the
// WALL. Every manufacturer ships its own (Reji), so the options are stored PER ARTICLE
// from SAP's additionalMaterials — never derived from a Befestigungsmaterial family
// filtered by brand, which is what would eventually put a Hewi anchor under a Nosag bar.
console.log('\n--- 6. Klappgriff / Klappsitz mounting material ---\n');

const fixTrays = pool.filter(t => t && typeof t.id === 'string' && t.id.startsWith('klappfix_'));
check(`the fixing and plate SKUs are in the pool (${fixTrays.length})`, fixTrays.length === 49,
    `expected 49 from inject-klapp-fixings.cjs, found ${fixTrays.length}`);

const anchors = fixTrays.filter(t => t.productType === 'Befestigungsmaterial');
const platesT = fixTrays.filter(t => t.productType === 'Montageplatte');
check(`36 anchors and 13 plates`, anchors.length === 36 && platesT.length === 13,
    `${anchors.length} anchors / ${platesT.length} plates`);

// NEVER a vendor URL: the app makes no requests to profishop at render time.
const fixRemote = fixTrays.filter(t => /^https?:/i.test(t.imgUrl || ''));
check('no fixing tray loads its image from the vendor', fixRemote.length === 0,
    fixRemote.slice(0, 4).map(t => `${t.artNr}  ${t.imgUrl}`).join('\n     '));

// The wall is what the dropdown asks, so every anchor has to name one.
const noWall = anchors.filter(t => !t.size || t.size === 'Standard');
check('every anchor names the wall it is for', noWall.length === 0,
    noWall.slice(0, 4).map(t => `${t.artNr}  ${t.label.slice(0, 60)}`).join('\n     '));

// The per-article mapping, and the brand rule it exists for.
const KLAPP = ['Klappgriff', 'Stützklappgriff', 'Duschklappsitz', 'Rückenstütze', 'Duschhandlauf'];
const klapp = pool.filter(t => t && KLAPP.includes(t.productType));
const withFix = klapp.filter(t => Array.isArray(t.fixingOptions) && t.fixingOptions.length);
check(`Klapp* articles carry their own fixing list (${withFix.length})`, withFix.length >= 300,
    `only ${withFix.length} — inject-klapp-fixings.cjs has not run, or was reverted`);

const brandOfArt = a => String(a).slice(0, 4);
const crossBrand = withFix.filter(t => {
    const own = brandOfArt(t.artNr);
    // Hewi bars are 4711/4211, Nosag 4721/4722, Keuco 4171 — an anchor from a different
    // 4-digit family than every sibling option is the failure this rule guards against.
    const fams = new Set(t.fixingOptions.map(brandOfArt));
    return fams.size > 1 && !fams.has(own);
});
check('no article offers anchors from an unrelated brand family', crossBrand.length === 0,
    crossBrand.slice(0, 4).map(t => `${t.artNr} -> ${t.fixingOptions.join(', ')}`).join('\n     '));

// Every referenced option must resolve, or the dropdown offers an art-Nr that is not orderable.
const poolArts = new Set(pool.map(t => t && t.artNr).filter(Boolean));
const dangling = [];
klapp.forEach(t => [...(t.fixingOptions || []), ...(t.plateOptions || [])]
    .forEach(a => { if (!poolArts.has(a)) dangling.push(`${t.artNr} -> ${a}`); }));
check('every offered fixing resolves to a real pool article', dangling.length === 0,
    dangling.slice(0, 5).join('\n     '));

// Scope: the families that ship WITH their material must carry no list at all.
// Duschhocker joins the list on evidence, not assumption: all 21 bases were queried and
// SAP names ZERO fixings across the family, none says "ohne Befestigungsmaterial", and 19
// describe a Gestell / Beine / höhenverstellbar. A stool stands on the floor. The only
// partner reference in the whole family is a Sitzkissen.
// Seitenwandgriff joins on the same evidence: all 5 bases queried, SAP names zero
// fixings, and only the KWC one mentions material at all — "Befestigungsmaterial für
// Beton", i.e. included. The sharpest proof is inside ONE Hewi series: of the 805
// articles that say "ohne Befestigungsmaterial", all 13 are Klappgriff — its Haltegriff,
// Winkelgriff, Eckhaltegriff, Rückenstütze and Seitenwandgriff say nothing of the kind.
// No anchor anywhere in the data names a Seitenwandgriff.
// Armlehne is the clearest of the lot: one base, 5 finishes, SAP names zero fixings and
// the text reads "nachrüstbar zu Duschklappsitz Cavere, einhängbar". It hooks into a seat
// that itself hangs on a bar — it never touches a wall. Note it also appears as an
// additionalMaterial OF that Klappsitz, where the identity-prefix filter already refuses
// to offer it as a fixing; the guard holds from both directions.
// Wannengriff is the one case where "it screws to a wall" is NOT enough to earn a row.
// The Nosag 4771 315 is a Klemme — it clamps to the tub rim. The Dornbracht Imo 4311 702
// is a Wandmodell and its tech.Montage literally reads "schrauben", yet SAP names no
// fixing, and the brand pattern settles it: of 766 Dornbracht articles in the pool NOT
// ONE says "ohne Befestigungsmaterial", and the catalogue holds zero Dornbracht
// Befestigungsmaterial. Dornbracht ships complete. The only anchors we could offer are
// Hewi or Nosag — the exact cross-brand error the whole design guards against.
// The last three, all queried, all naming zero fixings:
//   Fussstütze (2)          — 4532 220 is a chrome corner footrest; 3342 120 IS mounting
//                             hardware itself ("Fussstützen Geberit Kombifix,
//                             Befestigungsmaterial") and carries targetSubcats [], i.e. it
//                             is a Kombifix component, reachable in no Accessoires panel.
//   Wanneneinsteighilfe (1) — "Befestigung am Wannenrand": it clamps to the tub.
//   Badewannensitz (1)      — Neoperl Animo, verstellbar: it sits in the tub.
const OUT_OF_SCOPE = ['Haltegriff', 'Winkelgriff', 'Eckhaltegriff', 'Duschsitz', 'Duschhocker',
    'Seitenwandgriff', 'Armlehne', 'Wannengriff',
    'Fussstütze', 'Wanneneinsteighilfe', 'Badewannensitz',
    // Not accessibility at all — the one article the HOLD list's bare 'Stand' prefix
    // swept up (Stand WC-Garnitur Neoperl Florida, injected as WC-Zubehör). Listed here
    // so the closure check below can see it has been ruled on; it also pins the whole
    // 1'277-article WC-Zubehör type against ever gaining a fixing list.
    'WC-Zubehör'];
const wrongScope = pool.filter(t => t && OUT_OF_SCOPE.includes(t.productType)
    && ((t.fixingOptions || []).length || (t.plateOptions || []).length));
check('the six families that need no fixing carry no fixing list',
    wrongScope.length === 0,
    'they ship with their own mounting material, hang on a bar, or stand on the floor — a dropdown there orders a part that does not exist for them');

// A PLATE IS WHAT GETS SCREWED TO THE WALL. When the bar names no anchors but names a
// plate, the anchors are the plate's — read off the plate's own additionalMaterials,
// not parsed out of its "siehe 4721 795 - 798" text. Six Nosag Verso Care bases (12
// SKUs) reach a real dropdown this way instead of a warning row.
const sharedSrc = read('modules/factories/_shared.js');
const versoCare = pool.filter(t => t && /^Klappgriff Nosag Verso Care/i.test(t.label || ''));
check(`the Verso Care Klappgriff family is present (${versoCare.length})`, versoCare.length === 12,
    `expected 12 SKUs, found ${versoCare.length}`);
check('Verso Care inherits its anchors from its Montageplatte',
    versoCare.length > 0 && versoCare.every(t =>
        (t.plateOptions || []).includes('4722 241.100.000')
        && ['4721 795.000.000', '4721 796.000.000', '4721 798.000.000']
            .every(a => (t.fixingOptions || []).includes(a))),
    'these bars name no anchors of their own — the plate 4722 241 does, and all three are Nosag');

// The need follows the MODEL, not the finish: only the .100 variants carry the phrase
// "ohne Befestigungsmaterial", and a per-SKU test warned on half a family.
const byBaseFix = {};
klapp.forEach(t => {
    const b = String(t.artNr).replace(/[^0-9]/g, '').slice(0, 7);
    (byBaseFix[b] = byBaseFix[b] || []).push(JSON.stringify(t.fixingOptions || []));
});
const splitBase = Object.entries(byBaseFix).filter(([, v]) => new Set(v).size > 1);
check('every finish of one model offers the same anchors', splitBase.length === 0,
    splitBase.slice(0, 4).map(([b]) => b).join(', ') + ' — a per-SKU test split a family in half');

// The warning row must still EXIST as a path even though no article needs it today.
check('the warning row is still reachable for a future gap',
    /klappFixingWarnRowHTML/.test(sharedSrc) && /else if \(plan\.missing\)/.test(sharedSrc),
    'removing it means a future article with no anchors silently shows nothing');

// EVERY tray in this range must carry a description. The old inject-ch4-accessories.js
// wrote none for 170 of them, leaving the GLOBAL RULE to read a label SAP hard-truncates
// around 80 chars — 61 were severed mid-phrase, the worst reading "… anthrazit, zum ,
// Silberfarbig" with the word "Einhängen" simply gone. Fifteen Nosag Klappsitze that HANG
// on a grab bar were therefore excluded from the anchor rule by accident rather than by
// it. Healed from SAP's own description field by st-scraper/heal-ch4-descriptions.cjs.
const RANGE = ['Klappgriff', 'Stützklappgriff', 'Duschklappsitz', 'Haltegriff', 'Winkelgriff',
    'Eckhaltegriff', 'Duschsitz', 'Rückenstütze', 'Duschhocker', 'Seitenwandgriff',
    'Armlehne', 'Wannengriff', 'Duschhandlauf'];
const undescribed = pool.filter(t => t && RANGE.includes(t.productType) && !t.description);
check('every accessibility tray carries a description', undescribed.length === 0,
    `${undescribed.length} have only a truncated label — the full-text rule has nothing to read`);

// Every Duschklappsitz must be explained by exactly one of three reasons. An article in
// none of them is one nobody decided about.
const RX_HOOK = /einhäng|zum einhängen|einzuhängen/i;
const RX_INCL = /befestigungsmaterial/i;
const dks = pool.filter(t => t && t.productType === 'Duschklappsitz');
const unexplained = dks.filter(t => {
    if ((t.fixingOptions || []).length) return false;                       // has a dropdown
    const txt = `${t.label || ''} ${t.description || ''}`.replace(/<[^>]*>/g, ' ');
    if (RX_HOOK.test(txt)) return false;                                    // hangs on a bar
    if (RX_INCL.test(txt) && !/ohne\s+befestigungsmaterial/i.test(txt)) return false;  // included
    return true;
});
check(`every Duschklappsitz is explained (${dks.length} total)`, unexplained.length === 0,
    unexplained.slice(0, 5).map(t => `${t.artNr}  ${(t.label || '').slice(0, 62)}`).join('\n     '));


// A Rückenstütze mounts either on a Klappgriff or straight to the wall, and 7 of its 24
// bases say "ohne Befestigungsmaterial". SAP names six anchors that existed nowhere in
// our data — 4711 178/185/186 (1-teilig) and 4711 290/291/292 (2-teilig, and 290 says
// "zu Rückenstütze" outright).
const backRests = pool.filter(t => t && t.productType === 'Rückenstütze');
const brWithFix = backRests.filter(t => (t.fixingOptions || []).length);
check(`13 of the ${backRests.length} Rückenstütze need anchors`, brWithFix.length === 13,
    `${brWithFix.length} have a fixing list — expected 13 (the rest ship it included or state nothing)`);

// ⚠ THE PARTNER-REFERENCE TRAP. A Rückenstütze's SAP Zubehör group lists 30 KLAPPGRIFF
// entries — the bars it fits, not its screws. Offering one as a fixing option would be
// nonsense, and it is the single most likely way this table gets corrupted later.
const klappAsFixing = [];
backRests.forEach(t => (t.fixingOptions || []).forEach(a => {
    const art = pool.find(x => x && x.artNr === a);
    if (art && art.productType !== 'Befestigungsmaterial') klappAsFixing.push(`${t.artNr} -> ${a} (${art.productType})`);
}));
check('no Rückenstütze offers a Klappgriff as its fixing', klappAsFixing.length === 0,
    klappAsFixing.slice(0, 5).join('\n     ') + ' — the partner-reference trap');


// DUSCHHANDLAUF NEEDS NOTHING. Not one of its 37 bases says "ohne Befestigungsmaterial";
// the Keuco rails say "mit Befestigungsmaterial, Set Nr. 1", i.e. it is in the box. The
// two sets SAP names (4171 442 Nr. 4, 4171 444 Nr. 7) are ALTERNATIVES for a substrate
// Set Nr. 1 will not hold in — an upgrade, not a missing part.
const rails = pool.filter(t => t && t.productType === 'Duschhandlauf');
const railForced = rails.filter(t => (t.fixingOptions || []).length);
check(`no Duschhandlauf is FORCED to pick a fixing (${rails.length} SKUs)`, railForced.length === 0,
    `${railForced.length} carry a forced list — the material is already included, so every pick double-charges`);

const railOptional = rails.filter(t => (t.fixingOptional || []).length);
check(`the Keuco rails offer their alternatives (${railOptional.length})`, railOptional.length === 54,
    `expected 54 SKUs with an optional row, found ${railOptional.length}`);
check('every optional row names the set the article already ships',
    railOptional.every(t => typeof t.fixingSupplied === 'string' && t.fixingSupplied.length > 3),
    'without the supplied note the default reads as "nothing selected" and invites a duplicate order');

// The optional default must contribute NOTHING, or the row silently double-charges.
check('an optional row at its default adds no SAP line',
    /const optionalRow = kind === 'opt'/.test(sharedSrc)
    && /KLAPP_KINDS = \['plate', 'fix', 'opt'\]/.test(sharedSrc),
    'the optional kind must flow through the same picked-only export path as the forced ones');
// ⚠ THE CLASS COLLISION. Three factories bind their own `change` handler to every
// `.inline-bom-select` in the BOM and read it as a mounting-material pick. Giving the
// fixing select that class made their handler fire on it too and wipe
// selectedAddonAccessoires — the accessory AND its fixing row vanished on the first
// choice, and the price silently dropped back. The styling is inline; the class bought
// nothing.
check('the fixing select does NOT carry the inline-bom-select class',
    !/inline-bom-select klapp-fix-select|klapp-fix-select inline-bom-select/.test(sharedSrc),
    'each factory\'s own inline-bom-select handler will fire on it and reset the accessory');

check('an optional row is not flagged as incomplete',
    /\(picked \|\| optionalRow\) \? '' : ' style="background: rgba\(255,166,0/.test(sharedSrc),
    'flagging it orange tells the user something is missing when nothing is');


// The catalogue holds anchors for FOUR brands only. A family whose brand is not among
// them can never be given a fixing row without crossing brands.
const anchorBrands = new Set(pool.filter(t => t && t.productType === 'Befestigungsmaterial')
    .map(t => t.manufacturer));
check('no Befestigungsmaterial exists for Dornbracht', !anchorBrands.has('Dornbracht'),
    'if one is ever injected, re-decide Wannengriff — until then a fixing row there must cross brands');


// THE RANGE IS CLOSED. Every productType in the accessibility range is either in FAMS
// (decided per article from SAP) or in OUT_OF_SCOPE (decided and pinned). A new one
// appearing means a family nobody has ruled on — which is how a grab bar ends up
// orderable without its anchors, or a stool ends up with a screw dropdown.
const IN_SCOPE_TYPES = ['Klappgriff', 'Stützklappgriff', 'Duschklappsitz', 'Rückenstütze', 'Duschhandlauf'];
const RANGE_TYPES = new Set([...IN_SCOPE_TYPES, ...OUT_OF_SCOPE]);
const strays = [...new Set(pool.filter(t => t && t.id && /^ch4acc_|^ch4wg_/.test(String(t.id)))
    .map(t => t.productType))].filter(pt => pt && !RANGE_TYPES.has(pt));
check('every family in the accessibility range has been ruled on', strays.length === 0,
    `undecided: ${strays.join(', ')} — add to FAMS (needs anchors) or OUT_OF_SCOPE (does not)`);

// The forced pick has to reach the export as "nothing" until it is made.
check('an unpicked fixing row contributes no SAP line',
    /function klappFixingSapLines[\s\S]{0,400}if \(picked\) out\.push/.test(sharedSrc),
    'klappFixingSapLines must skip an unpicked row, or the export ships a bar with no anchors');
check('the fixing dropdown is wired through ONE delegated listener',
    /window\.__klappFixDelegateInstalled/.test(sharedSrc),
    'a module-level guard is per-instance under Vite ?v=/?t= URLs and installs several listeners');
check('the Montageplatte row is rendered before the anchors row',
    /if \(plan\.plates\.length\)[\s\S]{0,120}if \(plan\.fixings\.length\)/.test(sharedSrc),
    'the plate itself needs anchors, so it comes first');
check('a pick is cleared when the accessory is de-selected',
    /const clearKlappPick/.test(sharedSrc),
    're-ticking a Klappgriff must ask again, not restore an hour-old wall type');

// ============================================================================
console.log('\n' + '='.repeat(60));
console.log(`Ergebnis: ${passed} bestanden, ${failed} fehlgeschlagen`);
console.log('='.repeat(60));
process.exit(failed ? 1 : 0);
