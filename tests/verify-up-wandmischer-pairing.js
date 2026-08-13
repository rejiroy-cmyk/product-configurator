// ============================================================================
// UP WALL MIXERS MUST PAIR WITH THEIR GRUNDKÖRPER  (bug report 2026-08-13)
//
// A concealed (Unterputz) wall mixer is sold as the visible half only. The
// Grundkörper — the body that gets walled in, a.k.a. Einbaukörper — is a
// SEPARATE article. If it misses the Stückliste the order cannot be built.
//
// Mix & Match used to gate the pairing on the literal word "Endmontageset" in
// the product text, which is one brand family's naming convention rather than a
// product property. 33 UP wall mixers reached the BOM with no body: 13 whose
// records carried a fully populated Einbaukörper group the gate never read
// (Axor Starck UP, Axor Citterio, Hansgrohe Metris …), and 20 that depended on
// hardcoded per-brand art-Nr allow-lists they weren't on (Dornbracht, Gessi,
// Axor Citterio C, KWC Ava E, Dornbracht Mem).
//
// Three layers here:
//  1. UNIT       — isUnterputzMischer / einbaukoerperRef on fixtures taken from
//                  the real records that broke.
//  2. CATALOGUE  — every UP wall mixer in custom-data.json must resolve a body.
//                  This is the assertion that actually failed before the fix.
//  3. AP GUARD   — an Aufputz mixer must NOT acquire one.
// ============================================================================
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ---- Mock browser environment (same pattern as verify-fulltext-rule.js) ----
global.alert = () => {};
global.window = {
    copyTextToClipboard: () => Promise.resolve(),
    copyBOMToClipboard: () => {},
    getComputedStyle: () => ({ display: "block" })
};
global.document = {
    createElement: () => ({ style: {} }),
    body: { appendChild: () => {}, removeChild: () => {} },
    getElementById: () => ({ style: {}, querySelectorAll: () => [], querySelector: () => null }),
    querySelector: () => null
};

const { isUnterputzMischer, einbaukoerperRef, einbaukoerperFor, findCatalogueArticle } =
    await import('../modules/factories/_shared.js');

let passed = 0, failed = 0;
function check(name, cond, why) {
    if (cond) { console.log(`✅ [PASS] ${name}`); passed++; }
    else { console.log(`❌ [FAIL] ${name}\n          Reason: ${why || 'condition false'}`); failed++; }
}

console.log('--------------------------------------------------');
console.log('⚡ Running UP Wandmischer Pairing Tests...');
console.log('--------------------------------------------------\n');

// ================================ 1. UNIT ====================================

// The exact records the "Endmontageset" gate dropped.
check('UP: "Wandmischer Axor Starck UP" (no Endmontageset in text)',
    isUnterputzMischer({
        label: 'Wandmischer Axor Starck UP, A 165 mm, Auslauf fest, Abdeckplatte eckig,',
        description: 'Durchflussleistung 5 l/min., ohne Einbaukörper 6418 132'
    }));

check('UP: Hansgrohe Metris — recognised via its mountingMaterials group alone',
    isUnterputzMischer({
        label: 'Wandmischer Hansgrohe Metris, A 165 mm, Auslauf fest',
        description: '',
        mountingMaterials: [{ name: 'Einbaukörper', options: [{ artNr: '6418 132.000.000', label: 'Einbaukörper Hansgrohe ½"' }] }]
    }));

check('UP: "Wandmischer- Endmontageset KWC Ava 2.0" still classifies as UP',
    isUnterputzMischer({ label: 'Wandmischer- Endmontageset KWC Ava 2.0, A 175 mm', description: '' }));

// FULL-TEXT: the only UP evidence sits in the description.
check('UP: signal present ONLY in the description',
    isUnterputzMischer({ label: 'Wandbatterie Axor Montreux', description: 'Unterputz, Rosetten rund' }));

// AP: an Anschlussdistanz is stated -> exposed inlets -> no concealed body.
check('AP: "AD 153 mm" is not UP',
    isUnterputzMischer({ label: 'Wandmischer KWC Vita 2.0, AD 153 mm, Schwenkauslauf 90°', description: '' }) === false);
check('AP: "AD 120 mm" is not UP either (the old check only knew 153)',
    isUnterputzMischer({ label: 'Wandmischer KWC Domo 6.0, A 175 cm, AD 120 mm', description: '' }) === false);

// --------------------------------------------------------- einbaukoerperRef --
check('ref: parses "ohne Einbaukörper 6418 132"',
    einbaukoerperRef({ label: 'Wandmischer Axor Citterio', description: 'ohne Einbaukörper 6418 132 Geräuschgruppe I' }) === '6418 132');

check('ref: reads the description when the label is truncated before it',
    einbaukoerperRef({ label: 'Wandmischer-Endmontageset Dornbracht', description: 'Dornbracht Imo, A 140 mm, ohne Einbaukörper 6438 807 Geräuschgruppe I' }) === '6438 807');

// 6437 573.501.781 ships a corrupt reference. Emitting "6438 997" from it would
// put an unorderable art-Nr on a Stückliste — rejecting is the safe outcome.
check('ref: rejects the corrupt run "6438.9975369" rather than emit a bogus stem',
    einbaukoerperRef({ label: 'Wandbatterie-Endmontageset MEM', description: 'mit Rosetten ohne Einbaukörper 6438.9975369 Geräuschgruppe I/II' }) === null);

check('ref: null when no reference is stated',
    einbaukoerperRef({ label: 'Wandmischer KWC Vita 2.0, AD 153 mm', description: '' }) === null);

// A curated group wins over the text reference (it carries the real label).
check('einbaukoerperFor: prefers the curated mountingMaterials group',
    (einbaukoerperFor({
        label: 'Wandmischer Hansgrohe Metris',
        description: 'ohne Einbaukörper 6418 132',
        mountingMaterials: [{ name: 'Einbaukörper', options: [{ artNr: '6418 132.000.000', label: 'Einbaukörper Hansgrohe ½", Griff links oder rechts montierbar' }] }]
    }) || {}).label === 'Einbaukörper Hansgrohe ½", Griff links oder rechts montierbar');

check('einbaukoerperFor: falls back to the art-Nr named in the text',
    (einbaukoerperFor({ label: 'Wandmischer Axor Citterio', description: 'ohne Einbaukörper 6418 132' }) || {}).artNr === '6418 132.000.000');

// ------------------------------------------------- findCatalogueArticle -----
// The bodies live in OTHER pools than the mixer that needs them, which is why a
// faucetTrays-only lookup used to fall back to hand-written placeholder labels.
check('findCatalogueArticle: null without a catalogue',
    findCatalogueArticle('6418 132') === null);

global.window.productApps = {
    waschtischmischer: { trays: [{ artNr: '6418 132.000.000', label: 'Einbaukörper Hansgrohe ½"' }] },
    bademischer: { trays: [{ artNr: '6412 963.000.000', label: 'Einbaukörper Axor ½"' }] },
    zubehoer_pool: { trays: [{ artNr: '6118 140.000.000', label: 'Einbaukörper KWC ½" zu Wandmischer KWC Ava E' }] },
    duschenmischer: {
        trays: [{
            artNr: '9999 999.000.000', label: 'Irrelevant',
            mountingMaterials: [{ name: 'Einbaukörper', options: [{ artNr: '6252 801.000.000', label: 'Einbaukörper Gessi ½"' }] }]
        }]
    },
};

check('findCatalogueArticle: resolves across pools (bademischer)',
    (findCatalogueArticle('6412 963') || {}).label === 'Einbaukörper Axor ½"');
check('findCatalogueArticle: resolves across pools (zubehoer_pool)',
    (findCatalogueArticle('6118 140') || {}).artNr === '6118 140.000.000');
check('findCatalogueArticle: reaches inside mountingMaterials options',
    (findCatalogueArticle('6252 801') || {}).label === 'Einbaukörper Gessi ½"');
check('findCatalogueArticle: matches on the 7-digit stem, ignoring the finish triplet',
    (findCatalogueArticle('6418 132') || {}).artNr === '6418 132.000.000');
check('findCatalogueArticle: unknown stem -> null',
    findCatalogueArticle('1234 567') === null);

// Same body, two pools, two triplets (the real 6118 132 case). An exact art-Nr
// must return THAT record — a stem match would order the wrong finish.
global.window.productApps.waschtischmischer.trays.push({ artNr: '6118 132.501.000', label: 'Einbaukörper KWC ½", Verchromt' });
global.window.productApps.zubehoer_pool.trays.push({ artNr: '6118 132.000.000', label: 'Einbaukörper KWC ½", neutral' });
check('findCatalogueArticle: an exact art-Nr beats a sibling finish under the same stem',
    (findCatalogueArticle('6118 132.000.000') || {}).label === 'Einbaukörper KWC ½", neutral');
check('findCatalogueArticle: the other exact art-Nr resolves to its own record',
    (findCatalogueArticle('6118 132.501.000') || {}).label === 'Einbaukörper KWC ½", Verchromt');

check('einbaukoerperFor: text reference resolves to the REAL catalogue label',
    (einbaukoerperFor({ label: 'Wandmischer- Endmontageset KWC Ava E', description: 'ohne Einbaukörper 6118 140' }) || {}).label
        === 'Einbaukörper KWC ½" zu Wandmischer KWC Ava E');

// The index must notice a catalogue that changed shape under it (admin save).
global.window.productApps.bademischer.trays.push({ artNr: '7777 777.000.000', label: 'Späte Ergänzung' });
check('findCatalogueArticle: re-indexes when the catalogue changes',
    (findCatalogueArticle('7777 777') || {}).label === 'Späte Ergänzung');

delete global.window.productApps;

// ============================= 2. CATALOGUE ==================================
// The regression that started this: walk the real pool and demand a body for
// every UP wall mixer. Skips cleanly if custom-data.json is unavailable.
const DATA = path.join(__dirname, '..', 'custom-data.json');
if (!fs.existsSync(DATA)) {
    console.log('\n⏭️  custom-data.json not present — catalogue layer skipped.\n');
} else {
    const data = JSON.parse(fs.readFileSync(DATA, 'utf8'));
    const trays = (data.waschtischmischer && data.waschtischmischer.trays) || [];
    // Mix & Match reaches the Wandmischer branch on this identity test.
    const wall = trays.filter(t => /wandmischer|wandbatterie/i.test(t.label || ''));   // label-prefix by design
    const up = wall.filter(isUnterputzMischer);

    check('catalogue: the wall-mixer pool is populated', wall.length > 100, `only ${wall.length} found`);
    check('catalogue: UP mixers are a meaningful share of it', up.length > 50, `only ${up.length} UP`);

    const orphans = up.filter(t => !einbaukoerperFor(t));
    check(`catalogue: every UP wall mixer resolves a Grundkörper (${up.length} checked)`,
        orphans.length === 0,
        orphans.length + ' without a body: ' + orphans.slice(0, 8).map(t => t.artNr).join(', '));

    // The bodies must be orderable: a 4+3 digit stem plus a finish triplet.
    const malformed = up.map(t => einbaukoerperFor(t)).filter(Boolean)
        .filter(b => !/^\d{4}\s\d{3}\.\d{3}\.\d{3}$/.test(b.artNr));
    check('catalogue: every emitted body art-Nr is SAP-shaped',
        malformed.length === 0,
        malformed.slice(0, 5).map(b => b.artNr).join(', '));

    // The specific records from the bug report.
    const REGRESSION = [
        ['6412 861.501.000', 'Axor Starck UP'],
        ['6415 371.501.000', 'Axor Citterio'],
        ['6416 561.501.000', 'Hansgrohe Metris'],
        ['6431 752.501.781', 'Dornbracht Imo'],
        ['6241 560.495.111', 'Gessi 316'],
        ['6241 292.501.116', 'Gessi Habito (empty description)'],
        ['6241 566.495.111', 'Gessi 316 (empty description)'],
        ['6113 462.523.000', 'KWC Ava E'],
        ['6410 938.501.811', 'Axor Citterio C'],
        ['6437 573.501.781', 'Dornbracht Mem (corrupt ERP reference)'],
    ];
    for (const [artNr, name] of REGRESSION) {
        const tray = trays.find(t => t.artNr === artNr);
        if (!tray) { check(`regression ${artNr} (${name}) present in pool`, false, 'record not found'); continue; }
        const body = einbaukoerperFor(tray);
        check(`regression ${artNr} (${name}) pairs with a Grundkörper`, !!body,
            'no body resolved');
    }

    // ============================== 3. AP GUARD ==============================
    const apWithBody = wall.filter(t => !isUnterputzMischer(t)).filter(t => {
        // An AP mixer may still carry an Abstellverschraubung group — only a
        // BODY on an AP mixer is wrong.
        return (t.mountingMaterials || []).some(g => /einbauk[öo]rper|grundk[öo]rper/i.test(g.name || '') && (g.options || []).length);
    });
    check('AP guard: no Aufputz wall mixer is classified away from its own body data',
        apWithBody.length === 0,
        apWithBody.slice(0, 5).map(t => t.artNr).join(', '));
}

console.log('\n--------------------------------------------------');
console.log(`Summary: ${passed} passed, ${failed} failed.`);
console.log('--------------------------------------------------');
if (failed > 0) process.exit(1);
