// ============================================================================
// GLOBAL FULL-TEXT RULE ENFORCEMENT (user directive 2026-07-03, INSTRUCTIONS.md §1)
//
// Classification/matching/filtering logic must read the FULL product text —
// label AND description AND specs — never the label alone. ERP labels are
// truncated; the distinguishing keyword regularly lives only in the description.
//
// This test has two layers:
//  1. STATIC GUARD  — the named decision functions must reference `description`
//                     in their source. Removing it fails `npm test` (and thus
//                     `npm run build`).
//  2. BEHAVIORAL    — fixtures where the distinguishing attribute lives ONLY in
//                     the description (all taken from real bugs) must classify
//                     correctly.
// ============================================================================
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ---- Mock browser environment (same pattern as verify-duschtrennwand.js) ----
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

const { createGlassApp } = await import('../modules/factories.js');
const { productText } = await import('../modules/factories/_shared.js');

let passed = 0, failed = 0;
function check(name, cond, why) {
    if (cond) { console.log(`✅ [PASS] ${name}`); passed++; }
    else { console.log(`❌ [FAIL] ${name}\n          Reason: ${why || 'condition false'}`); failed++; }
}

console.log('--------------------------------------------------');
console.log('⚡ Running Global Full-Text Rule Enforcement Tests...');
console.log('--------------------------------------------------\n');

// ============================== 1. STATIC GUARD ==============================
// Every function listed here CLASSIFIES/MATCHES/FILTERS products and must keep
// reading `description` in its body. Add functions here as factories migrate.
const GUARDED = {
    'modules/factories/createGlassApp.js': [
        'extractType', 'extractSituation', 'extractBand', 'extractSeries',
        'extractHeight', 'extractWidthCm', 'extractSizeScore',
        'statesCeilingHeight', 'checkSideWallSupport', 'checkIsMustSideWall',
        'isAlternaOrDuscholuxSideWallIncluded', 'getMatchingSideWalls', 'updateBOM',
    ],
    'modules/factories/createBademischerApp.js': ['extractSerie', 'extractMontage'],
    'modules/factories/createDuschenmischerApp.js': ['extractSerie', 'extractMontage'],
    'modules/factories/createWCApp.js': ['extractSerie', 'classifyAccessory'],
    'modules/factories/createWaschtischMischerApp.js': [
        'extractSerie', 'extractAusfuehrung', 'extractAblauf', 'extractAuslauf', 'isAblaufItem',
    ],
    'modules/factories/createWashbasinApp.js': [
        'extractSerie', 'extractUeberlauf', 'extractAusfuehrung', 'extractHahnloch', 'extractAbstellflaeche',
    ],
    'modules/factories/createMixAndMatchApp.js': [
        'extractSerie', 'extractFaucetSerie', 'extractUeberlauf', 'extractAblauf',
        'extractAbstellflaeche', 'extractAusladung', 'extractAuslauf', 'extractBasinTyp',
        'extractBreite', 'extractHahnloch', 'extractFaucetAusfuehrung', 'isAblaufItem',
    ],
    'modules/factories/createRelationalApp.js': [
        'extractSerie', 'extractMontage', 'extractTrayMontage', 'classifyAccessory',
    ],
};

// Strip line and block comments so a comment mentioning "description" can't satisfy the
// guard — only an actual code read counts.
const stripComments = (s) => s.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\/\/[^\n]*/g, ' ');
// Evidence of a genuine full-text read: a `.description` property access, or delegation to
// the shared `productText()` helper (which reads label+description+specs internally).
const readsFullText = (body) => /\.description\b/.test(body) || /\bproductText\s*\(/.test(body);

for (const [file, fns] of Object.entries(GUARDED)) {
    const src = fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
    // A method body runs from its own header to the NEXT method header at ANY indent
    // (indent varies across factory files, so match on any leading whitespace).
    const headerRe = /\n\s+[A-Za-z_$][\w$]*: function/g;
    const headers = [...src.matchAll(headerRe)].map(m => m.index);
    for (const fn of fns) {
        const start = src.indexOf(`${fn}: function`);
        if (start === -1) { check(`static-guard ${file}#${fn}`, false, 'function not found — update GUARDED list'); continue; }
        const next = headers.find(i => i > start);
        const body = stripComments(src.slice(start, next === undefined ? src.length : next));
        check(`static-guard ${file}#${fn} reads description`, readsFullText(body),
            `${fn} no longer reads .description (or productText) — full-text rule violated`);
    }
}

// ============================== 2. BEHAVIORAL ================================
const app = createGlassApp('Duschtrennwand', 'test', 'img.png');
app.trays = [];

// productText exists and merges label + description + specs, normalized
const pt = productText({ label: 'Seitenwand X', description: 'Freistehende\nSeitenwand', specs: { Höhe: '2000 mm' } });
check('productText merges label+description+specs (lowercased)',
    pt.includes('seitenwand x') && pt.includes('freistehende seitenwand') && pt.includes('2000 mm'), pt);

// Real bug 1173 968: "Freistehende" ONLY in the description
check('extractType: "Freistehende" only in description -> Freistehende Seitenwand',
    app.extractType({
        label: 'Seitenwand Koralle S808, Breite 1201 - 1400 mm, Band links, mit Pendelelement, Höhe 2000 mm',
        description: 'Freistehende Seitenwand\nKoralle S808, Breite 1201 -\n1400 mm, Band links, mit\nPendelelement'
    }) === 'Freistehende Seitenwand');

// Truncated door label: door-type keyword only in description
check('extractType: door keyword only in description -> Pendeltür',
    app.extractType({
        label: 'Türe Koralle S808, Breite 400 - 700 mm, Band links',
        description: 'Pendeltüre Koralle S808,\nBreite 400 - 700 mm, Band links, inkl. Schwallprofil'
    }) === 'Pendeltür');

// Partner-reference trap: accessory description mentions the PARTNER door — must NOT
// classify as a door (memory: "greedy substring" rule)
check('extractType: partner door reference in description does NOT make it a door',
    app.extractType({
        label: 'Nischenfüllstück Alterna',
        description: 'zur Kombination mit Gleittüre 2-teilig, Höhe 200 cm'
    }) === null);

// Real parser miss: series lives in the description after the brand
check('extractSeries: series only in description -> Bella Vita',
    app.extractSeries({
        label: 'Seitenwand Duscholux, Breite 80 cm, Band rechts',
        description: 'Seitenwand Duscholux Bella Vita 3, zu Pendeltüren, Höhe 200 cm'
    }) === 'Bella Vita');

// Alterna capture must validate against known sub-series (no garbage from specs)
check('extractSeries: Alterna capture validated against known sub-series',
    app.extractSeries({
        label: 'Pendeltüre Alterna, Band links',
        description: 'Pendeltüre Alterna lin.3 in Nische, Band links',
        specs: { Marke: 'Alterna', Serie: '120 x 120' }
    }) === 'Lin.3');

// Height only in description
check('extractHeight: height only in description -> 2000 mm',
    app.extractHeight({
        label: 'Seitenwand Koralle S505 Plus, Band links, rahmenlos',
        description: 'Seitenwand Koralle S505 Plus, Breite bis 1000 mm, Höhe 200 cm'
    }) === '2000 mm');

// Width only in description
check('extractWidthCm: width only in description -> 100',
    app.extractWidthCm({
        label: 'Gleittüre Koralle S505 Plus, Band links',
        description: 'Gleittüre Koralle S505 Plus, Breite 100 cm, 2-teilig'
    }) === 100);

// Size score falls back to description when label has no usable number
check('extractSizeScore: falls back to description',
    app.extractSizeScore({
        label: 'Pendeltüre Alterna lin.3',
        description: 'Breite bis 125 cm'
    }) === 125);

// Ceiling-height rule reads full text ("Höhe bis" only in description)
const ceilingDoor = { label: 'Gleittüre Alterna liva 2-teilig, Band rechts', description: 'zur Kombination mit Seitenwand, Höhe bis 210 cm' };
check('statesCeilingHeight: "bis" only in description -> true', app.statesCeilingHeight(ceilingDoor) === true);
check('heightsCompatible: 200cm wall fits under bis-210 door', app.heightsCompatible(ceilingDoor, '2100 mm', '2000 mm') === true);
check('heightsCompatible: exact-height door stays strict',
    app.heightsCompatible({ label: 'Pendeltüre Koralle S808, Höhe 2000 mm', description: '' }, '2000 mm', '2100 mm') === false);

console.log('\n--------------------------------------------------');
console.log(`Summary: ${passed} passed, ${failed} failed.`);
console.log('--------------------------------------------------');
if (failed > 0) process.exit(1);
