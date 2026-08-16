// ============================================================================
// custom-data.json is stored interned — repeated mountingMaterials options and
// services live once in a shared table and trays reference them by key.
//
// Two implementations of the expansion exist and they must never drift:
//   modules/dataHydrate.js   (ESM)  — the browser, via app.js#applyDataToApps
//   st-scraper/_dataFile.cjs (CJS)  — every injector, via readData()
// The injectors cannot import ESM synchronously, which is why there are two; these
// tests are what keeps them honest.
//
// The properties that matter:
//   · expand(intern(x)) deep-equals x                     — nothing is lost
//   · both expanders agree, byte for byte                 — no drift
//   · expanding twice changes nothing                     — tolerant of mixed files
//   · an already-expanded (un-interned) file still loads  — old backups keep working
//   · each reference expands into its OWN object          — no shared-mutation leak
// ============================================================================
import { createRequire } from 'node:module';
import assert from 'node:assert';
import { expandData } from '../modules/dataHydrate.js';

const require = createRequire(import.meta.url);
const { internData, expandData: expandCjs } = require('../st-scraper/_dataFile.cjs');

const clone = (o) => JSON.parse(JSON.stringify(o));
let passed = 0, failed = 0;
const test = (name, fn) => {
    try { fn(); console.log(`✅ [PASS] ${name}`); passed++; }
    catch (e) { console.log(`❌ [FAIL] ${name}\n         ${e.message}`); failed++; }
};

// A fixture with the duplication the real file has: the same hose option under three
// trays in two pools, plus a service shared by two.
const HOSE = { artNr: '6542 317.501.000', label: 'Brauseschlauch Alterna flexline, 1600 mm', menge: 1, type: 'Zubehör' };
const HAND = { artNr: '6541 336.501.000', label: 'Handbrause Alterna saveline 3', menge: 1, type: 'Zubehör' };
const SVC = { artNr: '1549 143.000.000', label: 'Montagepauschale Alterna', qty: 1 };
const fixture = () => ({
    bademischer: {
        trays: [
            { artNr: 'A', label: 'A', services: [clone(SVC)], mountingMaterials: [{ name: 'Brauseschlauch', options: [clone(HOSE), clone(HAND)] }] },
            { artNr: 'B', label: 'B', mountingMaterials: [{ name: 'Brauseschlauch', options: [clone(HOSE)] }] },
        ],
    },
    duschenmischer: {
        trays: [{ artNr: 'C', label: 'C', services: [clone(SVC)], mountingMaterials: [{ name: 'Brauseschlauch', options: [clone(HOSE)] }] }],
    },
});

test('expand(intern(x)) returns exactly x', () => {
    const original = fixture();
    const roundTripped = expandData(internData(fixture()));
    assert.deepStrictEqual(roundTripped, original);
});

test('interning actually collapses the copies', () => {
    const interned = internData(fixture());
    assert.strictEqual(Object.keys(interned._options).length, 2, 'expected 2 distinct options');
    assert.strictEqual(Object.keys(interned._services).length, 1, 'expected 1 distinct service');
    const opts = interned.bademischer.trays[1].mountingMaterials[0].options;
    assert.strictEqual(typeof opts[0], 'string', 'the option was not replaced by a reference');
});

test('the ESM and CJS expanders agree byte for byte', () => {
    const a = expandData(internData(fixture()));
    const b = expandCjs(internData(fixture()));
    assert.strictEqual(JSON.stringify(a), JSON.stringify(b));
});

test('expanding twice is a no-op', () => {
    const once = expandData(internData(fixture()));
    const twice = expandData(clone(once));
    assert.deepStrictEqual(twice, once);
});

test('an un-interned file still loads unchanged', () => {
    const plain = fixture();
    assert.deepStrictEqual(expandData(clone(plain)), plain);
});

test('interning twice is idempotent — no churned diff on a re-run', () => {
    const once = internData(fixture());
    const twice = internData(clone(once));
    assert.strictEqual(JSON.stringify(twice), JSON.stringify(once));
});

test('each reference expands into its OWN object — no shared-mutation leak', () => {
    const d = expandData(internData(fixture()));
    const first = d.bademischer.trays[0].mountingMaterials[0].options[0];
    const second = d.bademischer.trays[1].mountingMaterials[0].options[0];
    assert.deepStrictEqual(first, second, 'the two trays should hold equal options');
    assert.notStrictEqual(first, second, 'they must not be the SAME object');
    first.label = 'edited';
    assert.notStrictEqual(second.label, 'edited', 'editing one tray leaked into another');
});

test('an unknown reference is left alone, never invented', () => {
    const d = { bademischer: { trays: [{ artNr: 'A', mountingMaterials: [{ name: 'x', options: ['o999'] }] }] }, _options: { o0: clone(HOSE) } };
    assert.strictEqual(expandData(d).bademischer.trays[0].mountingMaterials[0].options[0], 'o999');
});

console.log('\n' + '-'.repeat(50));
console.log(`Summary: ${passed} passed, ${failed} failed.`);
console.log('-'.repeat(50));
if (failed) process.exit(1);
