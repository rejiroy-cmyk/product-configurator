// Spec-based unit tests for the shower-tray rule modules (INSTRUCTIONS.md §3).
// These validate the RULE in isolation against known inputs/outputs — so a green
// run means "the rule is correct," independent of whatever the data currently holds.
import { linkTape, parseTrayDims } from '../modules/rules/linkTape.js';

// Synthetic tape pool (cm) — deterministic, mirrors the real 1461… lengths.
const POOL = [
  { artNr: '1461 001.000.000', label: 'Zargen-Wannendichtband Alterna, Länge 2 m', imgUrl: 'x', lengthCm: 200 },
  { artNr: '1461 002.000.000', label: 'Zargen-Wannendichtband Alterna, Länge 2,5 m', imgUrl: 'x', lengthCm: 250 },
  { artNr: '1461 142.000.000', label: 'Zargen-Wannendichtband Alterna, Länge 2,8 m', imgUrl: 'x', lengthCm: 280 },
  { artNr: '1461 003.000.000', label: 'Zargen-Wannendichtband Alterna, Länge 3 m', imgUrl: 'x', lengthCm: 300 },
  { artNr: '1461 004.000.000', label: 'Zargen-Wannendichtband Alterna, Länge 3,4 m', imgUrl: 'x', lengthCm: 340 },
  { artNr: '1461 005.000.000', label: 'Zargen-Wannendichtband Alterna, Länge 3,6 m', imgUrl: 'x', lengthCm: 360 },
  { artNr: '1461 006.000.000', label: 'Zargen-Wannendichtband Alterna, Länge 3,8 m', imgUrl: 'x', lengthCm: 380 },
  { artNr: '1461 008.000.000', label: 'Zargen-Wannendichtband Alterna, Länge 4,8 m', imgUrl: 'x', lengthCm: 480 },
  { artNr: '1461 009.000.000', label: 'Zargen-Wannendichtband Alterna, Länge 6 m', imgUrl: 'x', lengthCm: 600 },
];

const artNrs = (res) => res.group.options.map((o) => o.artNr);

const tests = [
  {
    name: 'Fixed tray 140×90 → L-var 2,5m + U-var 3,4m (two distinct variants)',
    fn: () => {
      const r = linkTape({ label: 'Duschenwanne Schmidlin Viva 140 x 90 x 2' }, POOL);
      // L: 140+90+20=250 → 1461 002 ; U: 140+180+20=340 → 1461 004
      const got = artNrs(r);
      if (got.join() !== '1461 002.000.000,1461 004.000.000')
        throw new Error('got ' + JSON.stringify(got));
      if (!/2-seitige/.test(r.group.options[0].dropdownLabel) || !/3-seitige/.test(r.group.options[1].dropdownLabel))
        throw new Error('variant dropdown labels missing');
    },
  },
  {
    name: 'Fixed tray 110×80 → L-var 2,5m + U-var 3m',
    fn: () => {
      const r = linkTape({ label: 'Schmidlin 110 x 80 x 2,5' }, POOL);
      // L: 110+80+20=210 → 250(002) ; U: 110+160+20=290 → 300(003)
      if (artNrs(r).join() !== '1461 002.000.000,1461 003.000.000') throw new Error(JSON.stringify(artNrs(r)));
    },
  },
  {
    name: 'Small tray 70×40 where both variants land on the same length → still TWO options',
    fn: () => {
      const r = linkTape({ label: 'Wanne 70 x 40 x 2,5' }, POOL);
      // L: 70+40+20=130 → 200(001) ; U: 70+80+20=170 → 200(001)
      if (r.group.options.length !== 2) throw new Error('expected 2 options');
      if (artNrs(r).join() !== '1461 001.000.000,1461 001.000.000') throw new Error(JSON.stringify(artNrs(r)));
      if (r.group.options[0].dropdownLabel === r.group.options[1].dropdownLabel) throw new Error('variant labels must differ');
    },
  },
  {
    name: 'Vario (ranged) tray → ALL lengths (auf-Mass dropdown)',
    fn: () => {
      const r = linkTape({ label: 'Duschenwanne Schmidlin Vario 97 - 105 x 67 - 110 x 2,5' }, POOL);
      if (r.group._rule !== 'tape:aufmass') throw new Error('expected aufmass rule');
      if (r.group.options.length !== POOL.length) throw new Error('expected all ' + POOL.length + ' lengths, got ' + r.group.options.length);
    },
  },
  {
    name: 'Any tray whose series is "Vario" is treated as auf-Mass even without a range',
    fn: () => {
      const r = linkTape({ label: 'Duschenwanne Schmidlin Vario 120 x 90' }, POOL);
      if (r.group._rule !== 'tape:aufmass') throw new Error('Vario must be auf-Mass');
    },
  },
  {
    name: 'mm-specced tray (Kaldewei Calima 1200×800 mm) is normalised to cm',
    fn: () => {
      const r = linkTape({ label: 'Duschwanne Kaldewei Calima, 1200 x 800 x 32 mm' }, POOL);
      // 1200×800 mm → 120×80 cm. L: 120+80+20=220 → 250(002) ; U: 120+160+20=300 → 300(003)
      if (artNrs(r).join() !== '1461 002.000.000,1461 003.000.000') throw new Error(JSON.stringify(artNrs(r)));
    },
  },
  {
    name: 'Produced group is InlineBOM-shaped (mat_tape, options[], provenance tags)',
    fn: () => {
      const r = linkTape({ label: '120 x 90 x 3' }, POOL);
      const g = r.group;
      if (g.id !== 'mat_tape' || g.name !== 'Zargen-Wannendichtband') throw new Error('wrong id/name');
      if (g._auto !== true || !g._rule) throw new Error('missing provenance tags');
      for (const o of g.options)
        if (!o.artNr || !o.label || !o.dropdownLabel || o.menge == null) throw new Error('option missing required InlineBOM fields');
    },
  },
  {
    name: 'No dimensions in label → flag (no guessing)',
    fn: () => {
      const r = linkTape({ label: 'Duschenwanne Spezial ohne Mass' }, POOL);
      if (r.group || r.flag !== 'no-dimensions') throw new Error('expected no-dimensions flag, got ' + JSON.stringify(r));
    },
  },
  {
    name: 'Empty tape pool → flag (no fabrication)',
    fn: () => {
      const r = linkTape({ label: '120 x 90' }, []);
      if (r.flag !== 'no-tape-pool') throw new Error('expected no-tape-pool flag');
    },
  },
  {
    name: 'parseTrayDims reads L≥W and detects auf-Mass',
    fn: () => {
      const a = parseTrayDims({ label: '90 x 140 x 2' });
      if (a.L !== 140 || a.W !== 90) throw new Error('L/W not normalised: ' + JSON.stringify(a));
      const b = parseTrayDims({ label: 'Vario 100 x 80' });
      if (!b.isAufMass) throw new Error('Vario not detected as auf-Mass');
    },
  },
];

console.log('\n--------------------------------------------------');
console.log('⚡ Running Shower-Tray Rule Unit Tests (linkTape)...');
console.log('--------------------------------------------------\n');
let passed = 0, failed = 0;
for (const t of tests) {
  try {
    t.fn();
    console.log(`✅ [PASS] ${t.name}`);
    passed++;
  } catch (e) {
    console.error(`❌ [FAIL] ${t.name}\n     ${e.message}`);
    failed++;
  }
}
console.log('\n--------------------------------------------------');
console.log(`Summary: ${passed} passed, ${failed} failed.`);
console.log('--------------------------------------------------');
process.exit(failed > 0 ? 1 : 0);
