// Swiss Line → single size-matched Duschen-Montageset (the set contains everything:
// Omnia frame, Fussset, Dichtband, Viega siphon + Tempoplex cover). Removes the now-
// redundant raw siphon / tape / deckel so the Montageset is the sole accessory.
//   node scripts/fix-swissline-montageset.js [--dry-run]
//
// Scope: Schmidlin Swiss Line trays with NO mounting path (carrier/frame/stelz).
// Size match is mandatory — a tray with no exact-size Montageset is flagged, not guessed.
// Format-preserving. Git is the backup.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const file = path.join(__dirname, '..', 'custom-data.json');
const dryRun = process.argv.includes('--dry-run');

const raw = fs.readFileSync(file, 'utf8');
const minified = !/\n\s+"/.test(raw.slice(0, 2000));
const data = JSON.parse(raw);
const trays = (data.duschenwanne && data.duschenwanne.trays) || [];
const pool = (data.zubehoer_pool && data.zubehoer_pool.trays) || [];

const dim = (s) => {
  const m = (s || '').match(/(\d{2,4})\s*x\s*(\d{2,4})/);
  if (!m) return null;
  let a = +m[1], b = +m[2];
  if (a >= 400 || b >= 400) { a /= 10; b /= 10; }
  return [Math.max(a, b), Math.min(a, b)];
};
// Duschen-Montageset Swiss Line index by exact size
const setBySize = {};
for (const z of pool) {
  if (!/duschen-?\s*montageset\s+schmidlin\s+swiss\s*line/i.test(z.label || '')) continue;
  const d = dim(z.label);
  if (d) setBySize[d.join('x')] = z;
}
const SUPERSEDED = ['mat_siphon', 'mat_tape', 'mat_deckel']; // all contained in the set

let added = 0, removedGroups = 0;
const log = [], flags = [];
for (const t of trays) {
  const isSwiss = /swiss\s*line/i.test(t.label || '');
  const hasMount = (t.mountingMaterials || []).some((m) => ['mat_carrier', 'mat_frame', 'mat_stelz'].includes(m.id));
  if (!isSwiss || hasMount) continue;
  const td = dim(t.label);
  const set = td && setBySize[td.join('x')];
  if (!set) { flags.push(`🚩 ${(t.label || '').slice(0, 50)} size=${td ? td.join('x') : '?'} — no exact-size Montageset, skipped`); continue; }

  const mm = t.mountingMaterials || (t.mountingMaterials = []);
  const before = mm.length;
  t.mountingMaterials = mm.filter((m) => !SUPERSEDED.includes(m.id));
  removedGroups += before - t.mountingMaterials.length;
  for (const sk of SUPERSEDED) if (t.selections) delete t.selections[sk];

  t.mountingMaterials.push({
    id: 'mat_montageset',
    name: 'Duschen-Montageset',
    options: [{ artNr: set.artNr, label: set.label, imgUrl: set.imgUrl || '', type: set.type || 'Zubehör', menge: 1 }],
  });
  added++;
  if (log.length < 10) log.push(`${(t.label || '').slice(0, 46).padEnd(46)} ${td.join('x')} → ${set.artNr}`);
}

if (!dryRun) fs.writeFileSync(file, minified ? JSON.stringify(data) : JSON.stringify(data, null, 2));

console.log(`── Swiss Line → Montageset ${dryRun ? '(DRY RUN) ' : ''}──`);
console.log(`  trays given a size-matched Montageset : ${added}`);
console.log(`  redundant groups removed (siphon/tape/deckel): ${removedGroups}  (≈${added ? (removedGroups / added).toFixed(1) : 0}/tray)`);
console.log(`  flagged (no exact size match)         : ${flags.length}`);
log.forEach((l) => console.log(`   ${l}`));
flags.forEach((l) => console.log(`   ${l}`));
console.log(`  ${dryRun ? 'NO FILE WRITTEN (dry run)' : 'written as: ' + (minified ? 'minified' : 'pretty')}`);
