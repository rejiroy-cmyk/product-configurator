// Replay harness: run linkCarrier against the REAL catalog and triage where the
// rule agrees / disagrees with the stored carrier links. Informational — it never
// writes. It both validates the rule (it should reproduce correctly-linked carriers)
// and surfaces the trays whose Wannenträger is missing (the gaps the rule fills).
//
//   node scripts/replay-carrier-rule.js
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { buildCarrierPool, linkCarrier } from '../modules/rules/linkCarrier.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const data = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'custom-data.json'), 'utf8'));
const trays = (data.duschenwanne && data.duschenwanne.trays) || [];
const pool = buildCarrierPool(data);

const existingCarrier = (t) => {
  const g = (t.mountingMaterials || []).find(
    (m) => m.id === 'mat_carrier' || m.id === 'mat_nziu6' || /wannenträger/i.test(m.name || '')
  );
  return g && g.options && g.options[0] ? (g.options[0].artNr || '').replace(/\s/g, '') : null;
};
const series = (t) => {
  const l = (t.label || '').toLowerCase();
  for (const s of ['superplan zero', 'superplan classic', 'superplan', 'cayonoplan', 'cayono', 'conoflat', 'duschplan', 'calima', 'sanidusch', 'ecoplan', 'loa', 'schmidlin'])
    if (l.includes(s)) return s;
  return '(other)';
};

const b = { AGREE: [], DIFFERS: [], FLAG_HAS: [], FILLS: [], FLAG_GAP: [] };
for (const t of trays) {
  const have = existingCarrier(t);
  const res = linkCarrier(t, pool);
  if (res.flag) (have ? b.FLAG_HAS : b.FLAG_GAP).push({ t, flag: res.flag });
  else {
    const ruleArt = (res.group.options[0].artNr || '').replace(/\s/g, '');
    if (!have) b.FILLS.push({ t, rule: ruleArt });
    else if (ruleArt === have) b.AGREE.push({ t });
    else b.DIFFERS.push({ t, have, rule: ruleArt });
  }
}

const withCarrier = trays.filter(existingCarrier).length;
const pct = (n, d) => `${((n / d) * 100).toFixed(0)}%`;
console.log('\n══════════ linkCarrier replay vs. custom-data.json ══════════');
console.log(`Carrier pool: ${pool.carriers.length} parts | Duschenwanne trays: ${trays.length} (${withCarrier} already linked)\n`);
console.log('  Trays that ALREADY have a Wannenträger (validation oracle):');
console.log(`    ✅ AGREE     rule reproduces the link    ${String(b.AGREE.length).padStart(3)}  (${pct(b.AGREE.length, withCarrier)})`);
console.log(`    ⚠️  DIFFERS   rule picks a different part  ${String(b.DIFFERS.length).padStart(3)}   (existing is PRESERVED — never overwritten)`);
console.log(`    🚩 FLAG      rule won't resolve           ${String(b.FLAG_HAS.length).padStart(3)}   (existing is PRESERVED)`);
console.log('\n  Trays MISSING a Wannenträger (the gap — incl. Sanidusch):');
console.log(`    🔧 FILLS     rule supplies a carrier       ${String(b.FILLS.length).padStart(3)}`);
console.log(`    🚩 FLAG      rule can't (frame-only/Vario)  ${String(b.FLAG_GAP.length).padStart(3)}`);

console.log('\n── DIFFERS (existing kept; rule disagrees — data-quality signal) ──');
for (const x of b.DIFFERS)
  console.log(`  ${(x.t.label || '').slice(0, 46).padEnd(46)}  data=${x.have}  rule=${x.rule}`);

const byGap = {};
for (const x of b.FILLS) { const s = series(x.t); (byGap[s] = byGap[s] || []).push(x); }
console.log('\n── FILLS by series (newly-linked carriers) ──');
for (const [s, arr] of Object.entries(byGap).sort((a, c) => c[1].length - a[1].length))
  console.log(`  ${s.padEnd(16)} ${String(arr.length).padStart(3)}`);

console.log('\n── Sanidusch (the reported bug) ──');
for (const t of trays.filter((x) => /sanidusch/i.test(x.label || ''))) {
  const res = linkCarrier(t, pool);
  console.log(`  ${(t.label || '').slice(0, 44).padEnd(44)}  →  ${res.group ? res.group.options[0].artNr + '  (foam x' + res.group.bundle[0].menge + ' + Schallschutz)' : '🚩 ' + res.flag}`);
}

const flagKinds = {};
for (const x of b.FLAG_GAP) flagKinds[x.flag] = (flagKinds[x.flag] || 0) + 1;
console.log('\n── gap FLAG reasons ──');
for (const [k, v] of Object.entries(flagKinds).sort((a, c) => c[1] - a[1])) console.log(`  ${String(v).padStart(3)}  ${k}`);
console.log('');
