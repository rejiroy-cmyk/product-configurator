// ============================================================================
// "Ohne …" IS AN OPT-OUT — it must never reach SAP
//
// A group parked on "Ohne Schallschutz" says the position is NOT wanted. It
// still RENDERS a BOM row (under gallery UX the dropdown IS the row, so hiding
// it would make the choice unreachable), which means every export path has to
// recognise and drop it.
//
// The list of things that mean "no article here" was spelled out by hand at
// each copy site, and the copies drifted. Three of them read
//     code !== "-" && code !== "none" && code !== "" &&
//     !code.toLowerCase().startsWith("ohne") && code !== "Ausstehend"
// while app.js's BOM → Eigene Selektion transfer had that same line MINUS the
// `"-"` arm. A Duschenrinne parked on "Ohne Schallschutz" renders its code cell
// as "-", so that ONE reader let it into the Selektion as {artNr:"-", menge:1}
// and the Selektion's own copy button shipped a literal `-⇥1` line to SAP.
// (37 of 135 Duschenrinne trays are on that option BY DEFAULT.)
//
// Three layers:
//  1. BEHAVIOUR — the predicates themselves, incl. the cases that must SURVIVE.
//  2. STATIC    — no copy path re-hand-rolls the list.
//  3. STATIC    — every reader of a BOM code cell / option actually calls one.
// ============================================================================
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.join(__dirname, '..');

global.alert = () => {};
global.window = { getComputedStyle: () => ({ display: 'block' }) };
global.document = {
    createElement: () => ({ style: {} }),
    body: { appendChild: () => {}, removeChild: () => {}, contains: () => false },
    getElementById: () => ({ style: {}, querySelectorAll: () => [], querySelector: () => null }),
    querySelector: () => null,
};

const { isOhneCode, isOhneOption } = await import('../modules/factories/_shared.js');

let passed = 0, failed = 0;
const check = (name, cond, reason = '') => {
    if (cond) { console.log(`✅ [PASS] ${name}`); passed++; }
    else { console.log(`❌ [FAIL] ${name}`); if (reason) console.log(`          Reason: ${reason}`); failed++; }
};

const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

// ========================= 1. THE PREDICATES ================================
console.log('\n--- 1. isOhneCode / isOhneOption ---\n');

// Everything a BOM code cell renders for a row that is not an article.
for (const [code, why] of [
    ['-',           'createRelationalApp + createWaschtischMischerApp render a plain dash'],
    ['–',           'en dash'],
    ['—',           'createWCApp renders an em dash for a text position / selector'],
    ['none',        'the raw sentinel art-Nr'],
    ['',            'an empty cell'],
    ['   ',         'whitespace only'],
    ['Ausstehend',  'createRelationalApp placeholder — nothing chosen yet'],
    ['ohne_siphon', 'createWashbasinApp prints the sentinel unguarded'],
    ['ohne_ablaufve', 'createWaschtischMischerApp likewise'],
    ['OHNE',        'a bademischer Duschgleitstange option carries this literal art-Nr'],
    ['Ohne Schallschutz', 'the label leaking into the code cell'],
]) check(`isOhneCode(${JSON.stringify(code)}) — ${why}`, isOhneCode(code) === true);

check('isOhneCode(null)', isOhneCode(null) === true);
check('isOhneCode(undefined)', isOhneCode(undefined) === true);

// …and everything that MUST still be copied. Dropping a real line from an order
// is far worse than showing a spurious one, so these matter more than the above.
for (const [code, why] of [
    ['1424 343.617.000', 'an ordinary art-Nr'],
    ['6000 011.000.000', 'Einbaukosten — a service, still an order line'],
    ['G1',               'the set header'],
    ['G4',               'the Waschtischkombination set header'],
    ['TXK103',           'a text position'],
    ['bau115',           'the "Ohne Installationselement (bauseits)" TEXT POSITION — it '
                       + 'carries a real code and SAP is meant to receive it as a bare line'],
    ['3411 102.100.000', 'a urinal'],
]) check(`isOhneCode(${JSON.stringify(code)}) === false — ${why}`, isOhneCode(code) === false);

// The model-side twin reads the label too, because the sentinel art-Nrs are not
// uniform ("none", "ohne_x", "OHNE", "bau115").
check('isOhneOption reads the label when the art-Nr looks real',
    isOhneOption({ artNr: 'bau115', label: 'Ohne Installationselement (bauseits)' }) === true);
check('isOhneOption({artNr:"none", label:"Ohne Handtuchhalter"})',
    isOhneOption({ artNr: 'none', label: 'Ohne Handtuchhalter' }) === true);
check('isOhneOption({artNr:"ohne_schlauch", label:"Ohne Brauseschlauch"})',
    isOhneOption({ artNr: 'ohne_schlauch', label: 'Ohne Brauseschlauch' }) === true);
check('isOhneOption("— Ohne Ablaufventil —") — createWaschtischMischerApp writes the dashed form',
    isOhneOption({ artNr: 'none', label: '— Ohne Ablaufventil —' }) === true);
check('isOhneOption(null)', isOhneOption(null) === true);
check('isOhneOption({}) — no art-Nr is nothing to order', isOhneOption({}) === true);

// THE PARTNER-REFERENCE TRAP, in its quantity form: a REAL article whose text
// merely mentions being sold without something. "ohne" must be anchored at the
// START of the label, never searched for.
check('a real mixer sold "ohne Ablaufventil" is still copied',
    isOhneOption({ artNr: '6111 252.501.000',
        label: 'Einlochmischer KWC Domo 6.0, ohne Ablaufventil, Schwarz matt' }) === false);
check('a real head sold "ohne Einbaukörper" is still copied',
    isOhneOption({ artNr: '6438 844.501.000',
        label: 'Regenbrause Hansgrohe Raindance, ohne Einbaukörper 6438 844' }) === false);
check('a real Panel article naming "ohne Panel" is still copied',
    isOhneOption({ artNr: '4611 183.000.000',
        label: 'Papierhandtuchspender CWS Paradise, ohne Panel' }) === false);

// ===================== 2. NOBODY RE-HAND-ROLLS THE LIST =====================
console.log('\n--- 2. no copy path spells the list out again ---\n');

const SRC = [];
(function walk(dir) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        if (e.name === 'node_modules' || e.name === 'dist' || e.name === 'backups'
            || e.name === '_archive' || e.name === 'scratch' || e.name === 'st-scraper'
            || e.name === 'tests' || e.name.startsWith('.')) continue;
        const p = path.join(dir, e.name);
        if (e.isDirectory()) walk(p);
        else if (e.name.endsWith('.js')) SRC.push(p);
    }
})(ROOT);

// The shape that drifted: a chain testing the code cell against "-"/"none"/"ohne"
// inline. _shared.js is where the one definition lives, so it is exempt.
const HANDROLLED = /code\s*!==\s*["']-["']|artNr\s*!==\s*["']Ausstehend["']/;
const offenders = SRC.filter(p => {
    if (p.endsWith(path.join('modules', 'factories', '_shared.js'))) return false;
    return HANDROLLED.test(fs.readFileSync(p, 'utf8'));
}).map(p => path.relative(ROOT, p));
check('no file re-derives the opt-out code list inline',
    offenders.length === 0,
    `hand-rolled in: ${offenders.join(', ')} — call isOhneCode() instead`);

// ======================= 3. EVERY EXPORT PATH USES IT =======================
console.log('\n--- 3. every export path routes through the predicate ---\n');

// Paths that scrape the rendered BOM: they read a code cell, so they need isOhneCode.
for (const rel of [
    'modules/factories/_shared.js',        // copyBOMToClipboard — 5 apps delegate here
    'modules/factories/createWCApp.js',    // Wandklosett / Standklosett / Urinoir
    'modules/factories/createGlassApp.js', // Duschtrennwand / Badeabtrennung
]) check(`${rel} guards its code cells with isOhneCode`, /isOhneCode\s*\(/.test(read(rel)));

// Paths that build lines from the model: they read an option, so they need isOhneOption.
for (const rel of [
    'modules/factories/createWashbasinApp.js',        // Waschtisch
    'modules/factories/createWaschtischMischerApp.js', // Waschtischmischer + Spültischmischer
    'modules/factories/createWCApp.js',
]) check(`${rel} guards its options with isOhneOption`, /isOhneOption\s*\(/.test(read(rel)));

// app.js has NO import of _shared.js — it reads both off the window bus. Both of
// its paths matter: the transfer INTO the Selektion, and the Selektion's own copy
// (the Selektion persists in localStorage, so an entry saved before the transfer
// guard existed is still on disk and would keep shipping).
const APP = read('app.js');
const wishlistAdd = APP.slice(APP.indexOf('addAllToWishlistBtn.addEventListener'));
check('app.js: the BOM → Eigene Selektion transfer calls window.isOhneCode',
    /window\.isOhneCode/.test(wishlistAdd.slice(0, 3000)),
    'a "-" row would enter the Selektion as an article');
check('app.js: the Eigene Selektion copy button filters too',
    /copyWishlistBtn[\s\S]{0,900}?window\.isOhneCode/.test(APP),
    'legacy localStorage entries would still ship');

check('_shared.js publishes both on the window bus for app.js',
    /window\.isOhneCode\s*=/.test(read('modules/factories/_shared.js'))
    && /window\.isOhneOption\s*=/.test(read('modules/factories/_shared.js')));

// ============================================================================
console.log(`\n${'='.repeat(60)}`);
console.log(`Ergebnis: ${passed} bestanden, ${failed} fehlgeschlagen`);
console.log('='.repeat(60));
process.exit(failed > 0 ? 1 : 0);
