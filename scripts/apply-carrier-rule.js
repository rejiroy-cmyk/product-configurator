// Apply linkCarrier to custom-data.json (Duschenwanne). The reconciler WRITE step
// for the Wannenträger path. Run scripts/replay-carrier-rule.js first/after.
//
// Safe by design:
//  • gap-only  — adds a mat_carrier group ONLY to trays that have none. An
//    existing Wannenträger group (manual / previously-mined) is SACRED and is
//    never overwritten, even when the rule would pick a different part.
//  • additive  — leaves siphon / frame / tape / feet groups untouched.
//  • provenance — generated groups carry `_auto:true` + `_rule`; a future re-run
//    skips them (they already exist) and skips manual groups (no _auto).
//  • format-preserving — writes minified to match the source (tiny diff).
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { buildCarrierPool, linkCarrier } from '../modules/rules/linkCarrier.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const file = path.join(__dirname, '..', 'custom-data.json');
const dryRun = process.argv.includes('--dry-run');

const raw = fs.readFileSync(file, 'utf8');
const minified = !/\n\s+"/.test(raw.slice(0, 2000));
const data = JSON.parse(raw);
const pool = buildCarrierPool(data);
const trays = (data.duschenwanne && data.duschenwanne.trays) || [];

const carrierGroupOf = (mm) =>
  mm.find((m) => m.id === 'mat_carrier' || m.id === 'mat_nziu6' || /wannenträger/i.test(m.name || ''));
const cleanArt = (a) => (a || '').replace(/\s/g, '');

let added = 0, preserved = 0, completed = 0, flagged = 0;
const examples = [];

for (const t of trays) {
  const res = linkCarrier(t, pool);
  if (res.flag) { flagged++; continue; }
  const mm = t.mountingMaterials || (t.mountingMaterials = []);
  const existing = carrierGroupOf(mm);
  if (existing) {
    // Existing link is sacred — but complete a malformed group (non-standard id or
    // missing its Montageschaum/Schallschutz bundle) IFF the rule resolves to the
    // SAME carrier part. Safe: the part is unchanged, we only add the missing bundle
    // and normalise the id (this is the incomplete-mined Sanidusch group, design §exempt).
    const sameArt = cleanArt(existing.options && existing.options[0] && existing.options[0].artNr) === cleanArt(res.group.options[0].artNr);
    const malformed = existing.id !== 'mat_carrier' || !(existing.bundle && existing.bundle.length);
    if (sameArt && malformed) {
      existing.id = 'mat_carrier';
      existing.bundle = res.group.bundle;
      existing._auto = true;
      existing._rule = res.group._rule;
      completed++;
      if (examples.length < 8) examples.push(`${(t.label || '').slice(0, 42).padEnd(42)} ↻ completed bundle (${res.group.options[0].artNr})`);
    } else {
      preserved++;
    }
    continue;
  }
  mm.push(res.group);
  added++;
  if (examples.length < 8) examples.push(`${(t.label || '').slice(0, 42).padEnd(42)} + ${res.group.options[0].artNr}`);
}

if (!dryRun) fs.writeFileSync(file, minified ? JSON.stringify(data) : JSON.stringify(data, null, 2));

console.log(`── Carrier rule ${dryRun ? '(DRY RUN) ' : ''}applied to Duschenwanne ──`);
console.log(`  added Wannenträger group   : ${added}   (trays that had none)`);
console.log(`  completed malformed group  : ${completed}   (same part, bundle backfilled)`);
console.log(`  preserved (existing kept)  : ${preserved}`);
console.log(`  flagged (left unchanged)   : ${flagged}`);
examples.forEach((e) => console.log(`     + ${e}`));
console.log(`  ${dryRun ? 'NO FILE WRITTEN (dry run)' : 'written as: ' + (minified ? 'minified' : 'pretty')}`);
