// Revert auto-generated Wannenträger fills by provenance rule.
//   node scripts/revert-carrier-fills.js carrier:schmidlin
//
// Removes ONLY rule-generated groups: a mat_carrier group with `_auto:true` and
// the given `_rule`. Manual / pre-existing carrier links (no `_auto`) are never
// touched. Clears any dangling `selections.mat_carrier` on affected trays.
// Format-preserving. Git is the backup.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const file = path.join(__dirname, '..', 'custom-data.json');

const rule = (process.argv[2] || '').trim();
if (!rule) { console.error('usage: node scripts/revert-carrier-fills.js <_rule e.g. carrier:schmidlin>'); process.exit(1); }

const raw = fs.readFileSync(file, 'utf8');
const minified = !/\n\s+"/.test(raw.slice(0, 2000));
const data = JSON.parse(raw);
const trays = (data.duschenwanne && data.duschenwanne.trays) || [];

let removed = 0, selectionsCleared = 0;
const examples = [];

for (const t of trays) {
  const mm = t.mountingMaterials;
  if (!Array.isArray(mm)) continue;
  const before = mm.length;
  t.mountingMaterials = mm.filter(
    (g) => !(g.id === 'mat_carrier' && g._auto === true && g._rule === rule)
  );
  if (t.mountingMaterials.length < before) {
    removed += before - t.mountingMaterials.length;
    if (examples.length < 8) examples.push((t.label || '').slice(0, 56));
    if (t.selections && Object.prototype.hasOwnProperty.call(t.selections, 'mat_carrier')) {
      delete t.selections.mat_carrier;
      selectionsCleared++;
    }
  }
}

fs.writeFileSync(file, minified ? JSON.stringify(data) : JSON.stringify(data, null, 2));

console.log(`── Reverted auto fills with _rule="${rule}" ──`);
console.log(`  mat_carrier groups removed : ${removed}`);
console.log(`  selections cleared         : ${selectionsCleared}`);
examples.forEach((e) => console.log(`     - ${e}`));
console.log(`  written as: ${minified ? 'minified' : 'pretty'}`);
