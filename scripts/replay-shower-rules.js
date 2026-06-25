// Replay harness: run the shower-tray rules against the REAL catalog and triage
// where rule output agrees / disagrees with the stored data. This is informational
// (it never writes) — it both validates the rule (it should reproduce correctly-linked
// trays) and surfaces the trays the data got wrong.
//
//   node scripts/replay-shower-rules.js
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { buildTapePool, linkTape } from '../modules/rules/linkTape.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const data = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'custom-data.json'), 'utf8'));
const trays = (data.duschenwanne && data.duschenwanne.trays) || [];
const pool = buildTapePool(data);

// NOTE: the Swiss Line / Sanidusch exemption is about incomplete *mined* carrier
// data — it does NOT apply to the algorithmic tape rule, which only needs dimensions.
// So tape is computed for every tray (Swiss Line currently has NO tape at all).
const series = (t) => {
  const l = `${t.serie || ''} ${t.label || ''}`.toLowerCase();
  for (const s of ['vario', 'swiss line', 'contura', 'superflach', 'sehr tief', 'tief 6', 'floor', 'viva', 'sanidusch', 'omnia', 'norm'])
    if (l.includes(s)) return s;
  return '(other)';
};
const dataTapeArtNrs = (t) => {
  const g = (t.mountingMaterials || []).find((m) => m.id === 'mat_tape' || /dichtband/i.test(m.name || ''));
  return g ? (g.options || []).map((o) => o.artNr) : [];
};
const key = (a) => [...a].map((x) => (x || '').replace(/\s/g, '')).sort().join(',');

const buckets = { MATCH: [], DATA_INCOMPLETE: [], DIFFERENT: [], DATA_EXTRA: [], FLAG: [] };

for (const t of trays) {
  const res = linkTape(t, pool);
  if (res.flag) { buckets.FLAG.push({ t, flag: res.flag }); continue; }
  const ruleSet = new Set(res.group.options.map((o) => (o.artNr || '').replace(/\s/g, '')));
  const dataArr = dataTapeArtNrs(t);
  const dataSet = new Set(dataArr.map((x) => (x || '').replace(/\s/g, '')));

  if (key(res.group.options.map((o) => o.artNr)) === key(dataArr)) {
    buckets.MATCH.push(t);
  } else if (dataArr.length === 0 || [...dataSet].every((x) => ruleSet.has(x)) && dataSet.size < ruleSet.size) {
    buckets.DATA_INCOMPLETE.push({ t, data: dataArr, rule: res.group.options.map((o) => o.artNr) });
  } else if ([...ruleSet].every((x) => dataSet.has(x)) && ruleSet.size < dataSet.size) {
    buckets.DATA_EXTRA.push({ t, data: dataArr, rule: res.group.options.map((o) => o.artNr) });
  } else {
    buckets.DIFFERENT.push({ t, data: dataArr, rule: res.group.options.map((o) => o.artNr) });
  }
}

const pct = (n) => `${((n / trays.length) * 100).toFixed(0)}%`;
console.log('\n══════════ linkTape replay vs. custom-data.json ══════════');
console.log(`Tape pool: ${pool.length} lengths | Duschenwanne trays: ${trays.length}\n`);
console.log(`  ✅ MATCH            rule reproduces data        ${String(buckets.MATCH.length).padStart(3)}  (${pct(buckets.MATCH.length)})`);
console.log(`  🔧 DATA INCOMPLETE  data ⊊ rule (THE BUG)        ${String(buckets.DATA_INCOMPLETE.length).padStart(3)}  (${pct(buckets.DATA_INCOMPLETE.length)})`);
console.log(`  ⚠️  DIFFERENT        same-ish but mismatched      ${String(buckets.DIFFERENT.length).padStart(3)}  (${pct(buckets.DIFFERENT.length)})`);
console.log(`  ➕ DATA EXTRA       data has more than rule      ${String(buckets.DATA_EXTRA.length).padStart(3)}`);
console.log(`  🚩 FLAG             rule can't resolve           ${String(buckets.FLAG.length).padStart(3)}`);

const bySeries = {};
for (const x of buckets.DATA_INCOMPLETE) { const s = series(x.t); (bySeries[s] = bySeries[s] || []).push(x); }
console.log('\n── DATA INCOMPLETE, by series (these trays would be fixed) ──');
for (const [s, arr] of Object.entries(bySeries).sort((a, b) => b[1].length - a[1].length))
  console.log(`  ${s.padEnd(12)} ${String(arr.length).padStart(3)} trays  (data has ${arr[0].data.length || 0}, rule yields ${arr[0].rule.length})`);

console.log('\n── Sample fixes (label → data | rule) ──');
for (const x of buckets.DATA_INCOMPLETE.slice(0, 8))
  console.log(`  ${(x.t.label || '').slice(0, 46).padEnd(46)}  [${x.data.join(', ') || '∅'}]  →  [${x.rule.join(', ')}]`);

if (buckets.DIFFERENT.length) {
  console.log('\n── DIFFERENT (worth a look — size/rounding mismatches) ──');
  for (const x of buckets.DIFFERENT.slice(0, 6))
    console.log(`  ${(x.t.label || '').slice(0, 46).padEnd(46)}  [${x.data.join(', ')}]  →  [${x.rule.join(', ')}]`);
}
console.log('');
