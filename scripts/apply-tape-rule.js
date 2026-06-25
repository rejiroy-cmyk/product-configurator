// Apply linkTape to custom-data.json (Duschenwanne). The reconciler WRITE step.
//   node scripts/apply-tape-rule.js
//
// Safe by design:
//  • additive — replaces only the mat_tape group; leaves every other accessory alone
//  • provenance — tags the group `_auto`/`_rule`; a group marked `_auto:false`
//    (a future manual lock) is PRESERVED, never overwritten
//  • merge — keeps any extra fields on an existing tape group (dependsOn, etc.)
//  • format-preserving — writes minified to match the source (tiny diff)
// Run scripts/replay-shower-rules.js afterwards to confirm everything is MATCH.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { buildTapePool, linkTape } from '../modules/rules/linkTape.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const file = path.join(__dirname, '..', 'custom-data.json');

const raw = fs.readFileSync(file, 'utf8');
const minified = !/\n\s+"/.test(raw.slice(0, 2000));
const data = JSON.parse(raw);
const pool = buildTapePool(data);
const trays = (data.duschenwanne && data.duschenwanne.trays) || [];

let replaced = 0, added = 0, preserved = 0, flagged = 0;
const flags = [];

for (const t of trays) {
  const res = linkTape(t, pool);
  if (res.flag) {
    flagged++;
    flags.push(`${(t.label || '').slice(0, 44)} :: ${res.flag}`);
    continue;
  }
  const mm = t.mountingMaterials || (t.mountingMaterials = []);
  const idx = mm.findIndex((m) => m.id === 'mat_tape' || /dichtband/i.test(m.name || ''));
  if (idx >= 0) {
    if (mm[idx]._auto === false) { preserved++; continue; } // manual lock → keep
    mm[idx] = { ...mm[idx], ...res.group }; // merge: keep extras, swap options + add tags
    replaced++;
  } else {
    mm.push(res.group);
    added++;
  }
}

fs.writeFileSync(file, minified ? JSON.stringify(data) : JSON.stringify(data, null, 2));

console.log('── Tape rule applied to Duschenwanne ──');
console.log(`  replaced existing tape group : ${replaced}`);
console.log(`  added new tape group         : ${added}   (e.g. Swiss Line had none)`);
console.log(`  preserved (manual lock)      : ${preserved}`);
console.log(`  flagged (left unchanged)     : ${flagged}`);
flags.slice(0, 10).forEach((f) => console.log(`     🚩 ${f}`));
console.log(`  written as: ${minified ? 'minified' : 'pretty'}`);
