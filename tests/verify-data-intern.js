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
//   · an untouched option keeps the key it had on disk    — see below
//
// That last one is why internData takes a seed. expandData strips the tables off the
// data (deliberately — it is what keeps the two expanders in step), so on the
// readData -> mutate -> writeData path there was nothing left to carry keys over from
// and every write reassigned them in first-encounter order. Deleting one option that
// sat low in the table renumbered every key above it: a four-tray edit came back as a
// ~24,000-line diff, 752 of 1,893 keys quietly changing meaning. writeData now seeds
// from the file it is replacing; these tests pin the four rules that follow from that.
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

// ---------------------------------------------------------------------------
// Key stability — the diff-hygiene half.
// ---------------------------------------------------------------------------

/** What writeData does: expand a stored file, mutate, intern again seeded from disk. */
const reintern = (onDisk, mutate) => {
    const seed = { _options: clone(onDisk._options || {}), _services: clone(onDisk._services || {}) };
    const data = expandData(clone(onDisk));
    mutate(data);
    return internData(data, { seed });
};

// The stability tests need a KNOWN encounter order and something to delete at the FRONT
// of it — that is the case that shifts every key behind it. Here: BOGEN o0 (tray A only),
// HOSE o1, HAND o2.
const BOGEN = { artNr: '6542 001.501.000', label: 'Anschlussbogen Alterna, ½"', menge: 2, type: 'Zubehör' };
const ordered = () => internData({
    bademischer: {
        trays: [
            { artNr: 'A', label: 'A', mountingMaterials: [{ name: 'g', options: [clone(BOGEN), clone(HOSE), clone(HAND)] }] },
            { artNr: 'B', label: 'B', mountingMaterials: [{ name: 'g', options: [clone(HOSE), clone(HAND)] }] },
        ],
    },
});
const dropBogen = (d) => {
    const g = d.bademischer.trays[0].mountingMaterials[0];
    g.options = g.options.filter((o) => o.artNr !== BOGEN.artNr);
};

test('an untouched option keeps its key when the one BEFORE it is deleted', () => {
    const onDisk = ordered();
    assert.deepStrictEqual(Object.keys(onDisk._options), ['o0', 'o1', 'o2'], 'fixture assumption');
    const after = reintern(onDisk, dropBogen);
    assert.strictEqual(after._options.o1.artNr, HOSE.artNr, 'o1 changed meaning');
    assert.strictEqual(after._options.o2.artNr, HAND.artNr, 'o2 changed meaning');
    assert.deepStrictEqual(after.bademischer.trays[0].mountingMaterials[0].options, ['o1', 'o2']);
});

test('an option nobody references any more drops out of the table', () => {
    const after = reintern(ordered(), dropBogen);
    assert.deepStrictEqual(Object.keys(after._options), ['o1', 'o2'], 'the orphan is still on the file');
});

test('a new option takes a fresh key above the highest seeded one', () => {
    const onDisk = ordered();
    const NEW = { artNr: '6541 999.501.000', label: 'Handbrause neu', menge: 1, type: 'Zubehör' };
    // Unshifted, so first-encounter numbering would hand it o0 and shift all three.
    const after = reintern(onDisk, (d) => {
        d.bademischer.trays[0].mountingMaterials[0].options.unshift(clone(NEW));
    });
    assert.strictEqual(after._options.o3 && after._options.o3.artNr, NEW.artNr, 'the new option is not o3');
    for (const [k, v] of Object.entries(onDisk._options)) assert.deepStrictEqual(after._options[k], v, `${k} moved`);
});

test('the table is emitted in key order, whatever order the pools reference it in', () => {
    // Reversing the pools reverses first-encounter order; the table must not move.
    const onDisk = ordered();
    const after = reintern(onDisk, (d) => {
        d.bademischer.trays.reverse();
        for (const t of d.bademischer.trays) t.mountingMaterials[0].options.reverse();
    });
    assert.deepStrictEqual(Object.keys(after._options), Object.keys(onDisk._options));
    assert.deepStrictEqual(after._options, onDisk._options);
});

test('a no-op read/write cycle is byte-identical', () => {
    const onDisk = ordered();
    assert.strictEqual(JSON.stringify(reintern(onDisk, () => {})), JSON.stringify(onDisk));
});

test('a half-interned file keeps its string references resolvable', () => {
    // A tray that was never expanded sits beside one holding a fresh object.
    const half = internData(fixture());
    half.duschenmischer.trays[0].mountingMaterials[0].options = [clone(HOSE)];   // object again
    const again = internData(half);
    const refs = again.bademischer.trays[1].mountingMaterials[0].options;
    assert.strictEqual(typeof refs[0], 'string');
    assert.ok(refs[0] in again._options, `dangling reference ${refs[0]}`);
    assert.deepStrictEqual(expandData(clone(again)), expandData(clone(internData(fixture()))));
});

console.log('\n' + '-'.repeat(50));
console.log(`Summary: ${passed} passed, ${failed} failed.`);
console.log('-'.repeat(50));
if (failed) process.exit(1);
