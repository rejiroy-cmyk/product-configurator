// ============================================================================
// ACCESSORY QUANTITY — one store, one helper, eight apps (Phase 1)
//
// A picked accessory carries its own quantity: a Glashalter is often needed twice
// and a hook four times. Before this the same number had FOUR spellings across the
// eight configurators, and two of them were hardcoded 1.
//
// Phase 1 is the plumbing only — no UI sets a quantity above 1 yet — so these tests
// are what proves the pipe carries a number end to end.
//
// Layers:
//  1. BEHAVIOR — the store and its helper.
//  2. CONTRACT — data-menge is emitted, read, and degrades to the old text path.
//  3. STATIC   — every app emits accessory quantity through the helper, and BOTH
//                readers consult the contract. A factory that goes back to a
//                hardcoded 1 silently under-orders, so it must fail the build.
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

const { accQty, setAccQty, clearAccQty, bomQtyCell, bomQtyInline, rowMenge, ACC_QTY_MAX } =
    await import('../modules/factories/_shared.js');

let passed = 0, failed = 0;
const check = (name, cond, reason = '') => {
    if (cond) { console.log(`✅ [PASS] ${name}`); passed++; }
    else { console.log(`❌ [FAIL] ${name}`); if (reason) console.log(`          Reason: ${reason}`); failed++; }
};
const eq = (name, actual, expected) =>
    check(name, actual === expected, `expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);

// ============================== 1. THE STORE ================================
const ART = '4331 217.100.000';
const item = { artNr: ART, label: 'Glashalter Frost Nova 2', menge: 1 };

let app = {};
eq('an untouched accessory is quantity 1', accQty(app, item), 1);
eq('…and so is one on an app with no store at all', accQty({}, item), 1);

setAccQty(app, ART, 3);
eq('a stored quantity is returned', accQty(app, item), 3);
eq('…and is found by bare art-Nr too (the string-shape apps)', accQty(app, ART), 3);

eq('setAccQty floors at 1 — 0 is not a quantity', setAccQty(app, ART, 0), 1);
eq('setAccQty floors at 1 — negatives too', setAccQty(app, ART, -5), 1);
eq('setAccQty rejects junk', setAccQty(app, ART, 'zwei'), 1);
eq(`setAccQty caps at ${ACC_QTY_MAX}`, setAccQty(app, ART, 5000), ACC_QTY_MAX);
eq('the cap is 99', ACC_QTY_MAX, 99);

setAccQty(app, ART, 4);
clearAccQty(app, ART);
eq('clearing one drops it back to 1 — re-ticking must not restore the old 4',
    accQty(app, item), 1);

setAccQty(app, ART, 2); setAccQty(app, '9999 999.000.000', 7);
clearAccQty(app);
eq('clearing all resets every article', accQty(app, ART), 1);
eq('…all of them', accQty(app, '9999 999.000.000'), 1);

// the article's OWN menge is the floor when the user has not intervened
eq("an article carrying its own menge keeps it", accQty({}, { artNr: 'X', menge: 2 }), 2);
eq('a user quantity overrides the article menge',
    (() => { const a = {}; setAccQty(a, 'X', 5); return accQty(a, { artNr: 'X', menge: 2 }); })(), 5);
eq('a nonsense article menge still yields 1', accQty({}, { artNr: 'X', menge: 'zwei' }), 1);

// ============================== 2. THE CONTRACT =============================
const cell = bomQtyCell(3);
check('bomQtyCell states the quantity in data-menge', /data-menge="3"/.test(cell), cell);
check('…and still prints it in a <strong>, which the SAP export falls back to',
    /<strong>3<\/strong>/.test(cell), cell);

// minimal <tr> stand-ins (same hand-rolled style as the other suites)
const fakeRow = (attrs, childAttr) => ({
    hasAttribute: (n) => Object.prototype.hasOwnProperty.call(attrs, n),
    getAttribute: (n) => attrs[n],
    querySelector: () => childAttr === undefined ? null : {
        getAttribute: (n) => (n === 'data-menge' ? childAttr : null),
    },
});
eq('rowMenge reads data-menge off the row', rowMenge(fakeRow({ 'data-menge': '4' })), 4);
eq('rowMenge reads it off a cell inside the row', rowMenge(fakeRow({}, '6')), 6);
eq('rowMenge is null when absent — the old text path still runs', rowMenge(fakeRow({})), null);
eq('rowMenge rejects a non-numeric value rather than guessing', rowMenge(fakeRow({ 'data-menge': 'zwei' })), null);
eq('rowMenge rejects 0 — a BOM position is never zero', rowMenge(fakeRow({ 'data-menge': '0' })), null);

// ============================== 3. STATIC GUARDS ============================
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

const APPS = [
    'createBademischerApp', 'createDuschenmischerApp', 'createWashbasinApp',
    'createWaschtischMischerApp', 'createBidetApp', 'createWCApp',
    'createRelationalApp', 'createMixAndMatchApp',
];
for (const a of APPS) {
    const src = read(`modules/factories/${a}.js`);
    check(`${a} emits accessory quantity through accQty()`,
        /accQty\(this,/.test(src),
        'a hardcoded 1 here silently under-orders every accessory in this app');
}

const shared = read('modules/factories/_shared.js');
// isolate each reader so one function's call cannot satisfy the other's assertion
const bodyOf = (name) => {
    const i = shared.indexOf(name);
    return i === -1 ? '' : shared.slice(i, i + 2600);
};
check('copyBOMToClipboard consults the data-menge contract',
    /rowMenge\(/.test(bodyOf('window.copyBOMToClipboard')),
    'the SAP export is back to parsing quantity out of row text');
check('priceBOM consults the data-menge contract',
    /rowMenge\(/.test(bodyOf('const priceBOM')),
    'the price total is back to parsing quantity out of row text');

// ============================== THE STEPPER (Phase 2) =======================
const plain = bomQtyCell(2);
const step = bomQtyCell(2, ART);
check('without an art-Nr the cell stays read-only', !/bom-qty-btn/.test(plain), plain);
check('with an art-Nr it becomes a stepper', /bom-qty-btn/.test(step));
check('the stepper still states data-menge', /data-menge="2"/.test(step));
check('…and keeps the digits ALONE in the <strong> — the SAP fallback reads that',
    /<strong>2<\/strong>/.test(step) && !/<strong>[^<]*[-+][^<]*<\/strong>/.test(step),
    'buttons inside the <strong> would make the export read "-2+"');
check('the stepper carries the art-Nr it edits', step.includes(`data-qty-art="${ART}"`));
check('it offers both directions',
    /data-qty-d="-1"/.test(step) && /data-qty-d="1"/.test(step));

check('at 1 the minus is disabled — a BOM position is never zero',
    /data-qty-d="-1"[^>]*disabled/.test(bomQtyCell(1, ART)));
check('below the cap the plus is live', !/data-qty-d="1"[^>]*disabled/.test(bomQtyCell(1, ART)));
check(`at ${ACC_QTY_MAX} the plus is disabled`,
    /data-qty-d="1"[^>]*disabled/.test(bomQtyCell(ACC_QTY_MAX, ART)));
check('the buttons are type=button — inside a form they must not submit',
    (step.match(/type="button"/g) || []).length === 2);
check('each button is labelled for screen readers',
    (step.match(/aria-label="/g) || []).length === 2);

// scope: the stepper must reach accessory rows and NOTHING else
const OPTIN = [
    ['createBademischerApp', 'bomQtyCell(q, acc.artNr)'],
    ['createDuschenmischerApp', 'bomQtyCell(q, acc.artNr)'],
    ['createWashbasinApp', 'bomQtyCell(accQty(this, acc), acc.artNr)'],
    ['createWaschtischMischerApp', 'bomQtyCell(accMenge, acc.artNr)'],
    ['createWCApp', "item.typ === 'Accessoire' ? item.artNr : null"],
    ['createRelationalApp', "item.typ === 'Accessoire' ? item.artNr : null"],
    ['createMixAndMatchApp', 'item.isAccessory ? item.artNr : null'],
    ['createBidetApp', 'item.isAccessory ? item.artNr : null'],
];
for (const [app, needle] of OPTIN) {
    check(`${app}: accessory rows opt into the stepper`,
        read(`modules/factories/${app}.js`).includes(needle),
        'either no stepper at all, or one on rows that must stay read-only');
}
// the four generic renderers must gate it — an ungated bomQtyCell(item.x, item.artNr)
// there would put a stepper on Möbel, Spiegelschrank and every mounting-material row
for (const app of ['createWCApp', 'createRelationalApp', 'createMixAndMatchApp', 'createBidetApp']) {
    const src = read(`modules/factories/${app}.js`);
    check(`${app}: its generic row renderer gates the stepper`,
        !/bomQtyCell\((?:item\.menge|item\.qty),\s*item\.artNr\)/.test(src),
        'furniture, Schränke, Spiegelschrank and mounting rows would all become editable');
}

const shared0 = read('modules/factories/_shared.js');
check('one delegated listener serves every stepper',
    /installAccQtyDelegate/.test(shared0) && /addEventListener\('click'/.test(shared0),
    'a listener bound per button cannot survive updateBOM rebuilding the tbody');
// Vite serves this module under several URLs (the ?v= cache-busting chain plus its own
// ?t= HMR stamps) and each URL is a separate module instance with its own scope. A
// module-level `let installed = false` guarded nothing: every instance added a listener
// and one click on + stepped the quantity two or three times, silently.
check('the delegate guard lives on window, not in module scope',
    /window\.__accQtyDelegateInstalled/.test(shared0),
    'a module-level flag is per-instance — the listener gets installed once per URL');
check('the copy dialog adopts an existing node rather than appending a second',
    /getElementById\('copyQtyModal'\) \|\| buildCopyQtyDialog\(\)/.test(shared0),
    'same multi-instance hazard: two #copyQtyModal in the DOM');
check('the handler clamps to the same bounds as the store',
    /next < 1 \|\| next > ACC_QTY_MAX/.test(shared0));
check('the handler restores focus after the row is rebuilt',
    /document\.activeElement === btn/.test(shared0),
    'a held Enter/Space would walk off the page');

// Mix & Match and Bidet hide the BOM table entirely (.mixmatch-active .bom-section
// { display:none }) and render the Stückliste the user reads into #col_preview as a
// GRID. A <td> stepper is invisible there, which is exactly how it shipped at first.
for (const app of ['createMixAndMatchApp', 'createBidetApp']) {
    const src = read(`modules/factories/${app}.js`);
    check(`${app}: its PREVIEW grid carries the stepper, not just the hidden table`,
        /bomQtyInline\(item\.qty, item\.isAccessory \? item\.artNr : null\)/.test(src),
        'the BOM table is display:none in this layout — a <td> stepper never reaches the user');
    check(`${app}: the quantity column has room for it`,
        !/grid-template-columns: 24px/.test(src),
        'a 24px column clips the stepper');
}
check('the delegate refreshes the preview as well as the table',
    /app\.updatePreview\(\)/.test(shared0),
    'in MM and Bidet the number the user is looking at would not move');

const plainInline = bomQtyInline(2, null);
const stepInline = bomQtyInline(2, ART);
check('bomQtyInline stays plain text without an art-Nr', plainInline === '2x', plainInline);
check('bomQtyInline becomes a stepper with one', /bom-qty-btn/.test(stepInline));
check('bomQtyInline is not a <td> — it goes in a grid cell',
    !/^<td/.test(stepInline) && /^<span/.test(stepInline), stepInline);
check('bomQtyInline honours a caller fallback (— for text positions)',
    bomQtyInline(1, null, '—') === '—');

const css = read('index.css');
check('the stepper is styled', /\.bom-qty-btn\s*\{/.test(css));
check('…including a visible focus state', /\.bom-qty-btn:focus-visible/.test(css));
check('…and a disabled state', /\.bom-qty-btn:disabled/.test(css));

// EVERY reader of a row's quantity, not just the two obvious ones. There are four,
// and they were found the hard way: createWCApp's DOM-scraping copy branch parsed the
// <strong> with no validation at all, so a "-" row shipped `code⇥-` to SAP.
const READERS = [
    ['modules/factories/_shared.js', 'copyBOMToClipboard — the SAP export'],
    ['modules/factories/createWCApp.js', 'Wandklosett/Standklosett copy'],
    ['modules/factories/createGlassApp.js', 'Duschtrennwand copy'],
    ['app.js', 'BOM → Eigene Selektion'],
];
for (const [file, what] of READERS) {
    const src = read(file);
    const idx = src.search(/querySelector\((['"])strong\1\)/);
    check(`${what}: reads the quantity through the contract`,
        idx !== -1 && /rowMenge\(/.test(src.slice(idx, idx + 1400)),
        idx === -1 ? 'no <strong> reader found — did it move?'
                   : 'this reader parses quantity out of row text; it will ship 1 once the cell holds a control');
}

// An app whose copy builds its own lines must ALSO copy the accessories it renders.
// Waschtisch and Waschtischmischer built theirs from the tray and its mounting groups
// only, so every picked accessory was shown, priced — and silently never sent to SAP.
for (const [file, what] of [
    ['modules/factories/createWashbasinApp.js', 'Waschtisch'],
    ['modules/factories/createWaschtischMischerApp.js', 'Waschtischmischer'],
]) {
    const src = read(file);
    const i = src.indexOf('copyToClipboard: function');
    check(`${what}: its own copy includes the picked accessories`,
        i !== -1 && /selectedAddonAccessoires/.test(src.slice(i, i + 4000)),
        'accessories are rendered and priced but never reach the clipboard');
}

check('Ablaufventil is withheld from the accessory panel',
    /const DROPDOWN_TYPES = \[[^\]]*'Ablaufventil'/.test(shared),
    'the basin dropdown and the accessory panel would both offer 3161 107/108');
check('…and Duschgleitstange still is',
    /const DROPDOWN_TYPES = \[[^\]]*'Duschgleitstange'/.test(shared));

// the quantity must not outlive the pick
check('every app resets accQty where it resets the selection',
    APPS.every(a => {
        const src = read(`modules/factories/${a}.js`);
        const resets = (src.match(/this\.(selectedAddonAccessoires|selectedAccessoires) = \[\]/g) || []).length;
        const cleared = (src.match(/this\.accQty = \{\}/g) || []).length;
        return resets === 0 || cleared >= resets;
    }),
    'a cleared selection that keeps its quantities resurrects them on re-tick');

console.log('\n--------------------------------------------------');
console.log(`Summary: ${passed} passed, ${failed} failed.`);
console.log('--------------------------------------------------');
if (failed > 0) process.exit(1);
