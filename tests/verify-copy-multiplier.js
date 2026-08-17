// ============================================================================
// MENGEN-MULTIPLIKATOR — the quantity dialog on every copy path
//
// Copying a Stückliste asks once how many times the configuration is needed and
// multiplies the Menge column on the way to the clipboard.
//
// Three layers, because two of the ways this breaks are invisible at runtime:
//  1. STATIC  — exactly ONE definition of window.copyTextToClipboard exists.
//               There used to be two (app.js + _shared.js), byte-identical; ES
//               imports evaluate before the importing module's body, so app.js
//               silently won. A wrapper installed on the loser is dead code that
//               throws nothing and logs nothing.
//  2. STATIC  — every call site handles the cancel result (null). A caller that
//               does not would alert "Kopiert:" + null on a cancelled dialog.
//  3. BEHAVIOR— the multiplication rules themselves.
// ============================================================================
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.join(__dirname, '..');

// Mock browser environment (same pattern as verify-fulltext-rule.js). `navigator` is
// a getter on globalThis in Node 24 and is only touched at copy time, so it is not mocked.
global.alert = () => {};
global.window = { getComputedStyle: () => ({ display: 'block' }) };
global.document = {
    createElement: () => ({ style: {} }),
    body: { appendChild: () => {}, removeChild: () => {}, contains: () => false },
    getElementById: () => ({ style: {}, querySelectorAll: () => [], querySelector: () => null }),
    querySelector: () => null,
};

const { hasSapQty, multiplySapQty, COPY_FACTOR_MAX } = await import('../modules/factories/_shared.js');

let passed = 0, failed = 0;
const check = (name, cond, reason = '') => {
    if (cond) { console.log(`✅ [PASS] ${name}`); passed++; }
    else { console.log(`❌ [FAIL] ${name}`); if (reason) console.log(`          Reason: ${reason}`); failed++; }
};
const eq = (name, actual, expected) =>
    check(name, actual === expected, `expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);

// ---- source scan -----------------------------------------------------------
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

// ============================== 1. ONE DEFINITION ============================
const defs = [];
for (const f of SRC) {
    const src = fs.readFileSync(f, 'utf8');
    // a real assignment, not the comment that explains why there is only one
    const re = /^[^\/\n]*window\.copyTextToClipboard\s*=/gm;
    for (const m of src.match(re) || []) defs.push(path.relative(ROOT, f));
}
check('window.copyTextToClipboard is defined exactly once',
    defs.length === 1,
    `found ${defs.length} definition(s): ${defs.join(', ') || 'none'} — two of them means a wrapper can land on the loser and silently do nothing`);
check('…and it lives in modules/factories/_shared.js',
    defs[0] === path.join('modules', 'factories', '_shared.js'),
    `found in ${defs[0]}`);

// ============================== 2. CANCEL HANDLED ===========================
// Every `.then(...)` on a copy must bail on null before touching the result.
let sites = 0, unguarded = [];
for (const f of SRC) {
    const src = fs.readFileSync(f, 'utf8');
    const re = /window\.copyTextToClipboard\([^\n]*?\)\.then\(([\s\S]{0,400}?)\}\)\.catch/g;
    let m;
    while ((m = re.exec(src)) !== null) {
        sites++;
        if (!/===\s*null/.test(m[1])) unguarded.push(`${path.relative(ROOT, f)} @${src.slice(0, m.index).split('\n').length}`);
    }
}
check('every copy call site exists to be checked', sites >= 13, `only found ${sites}`);
check('every copy call site bails on a cancelled dialog (null)',
    unguarded.length === 0,
    `unguarded: ${unguarded.join(' · ')} — these would alert "Kopiert:" with a null payload`);

// ============================== 3. BEHAVIOR =================================
const BOM = [
    '2211 450.100.000\t1',
    '3313 110.100.000\t1',
    '3342 219.100.000\t1',
    '4711 171.100.000\t2',
    'TXK103',                       // text position — carries NO Menge by design
].join('\n');

// -- factor 1 is a true no-op ------------------------------------------------
eq('factor 1 returns the payload byte for byte', multiplySapQty(BOM, 1), BOM);
eq('factor 0 changes nothing (guarded upstream, never trusted here)', multiplySapQty(BOM, 0), BOM);
eq('a non-numeric factor changes nothing', multiplySapQty(BOM, 'zwei'), BOM);

// -- the multiplication itself ----------------------------------------------
const x3 = multiplySapQty(BOM, 3).split('\n');
eq('a Menge of 1 becomes 3', x3[0], '2211 450.100.000\t3');
eq('a Menge of 2 becomes 6 — the position quantity is the base, not 1', x3[3], '4711 171.100.000\t6');
eq('TXK103 is untouched — a text position must never gain a Menge', x3[4], 'TXK103');
eq('the number of LINES never changes', x3.length, BOM.split('\n').length);

// -- what opens the dialog at all -------------------------------------------
check('a SAP payload is recognised', hasSapQty(BOM) === true);
check('a bare art-Nr with no Menge column is not', hasSapQty('2211 450.100.000') === false);
check('free text is not', hasSapQty('Bitte NACH dem G1-Set einfügen!') === false);
check('a payload of only text positions is not', hasSapQty('TXK103\nTXK104') === false);
check('a single-article copy IS (it carries \\t1)', hasSapQty('2211 450.100.000\t1') === true);

// -- the shapes the BOM actually emits --------------------------------------
eq('an art-Nr containing spaces survives the split',
    multiplySapQty('6431 725.501.000\t4', 5), '6431 725.501.000\t20');
eq('a trailing empty line is left alone',
    multiplySapQty('2211 450.100.000\t1\n', 2), '2211 450.100.000\t2\n');
eq('a line whose Menge is not a plain integer is left alone',
    multiplySapQty('2211 450.100.000\t1,5', 2), '2211 450.100.000\t1,5');
eq('a warning row carrying no code is left alone',
    multiplySapQty('Einbaukörper fehlt\n2211 450.100.000\t1', 2),
    'Einbaukörper fehlt\n2211 450.100.000\t2');

// -- the cap -----------------------------------------------------------------
check('the cap is 99 — a typo of 300 for 3 must not reach SAP unbraked', COPY_FACTOR_MAX === 99);

console.log('\n--------------------------------------------------');
console.log(`Summary: ${passed} passed, ${failed} failed.`);
console.log('--------------------------------------------------');
if (failed > 0) process.exit(1);
