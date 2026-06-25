// Fix Schmidlin trays mis-linked to the 80x80 Omnia frame (1435 105) when their
// real size is larger. Re-link to the exact-size Schmidlin frame from the pool and
// retarget the Fussset bundleRule. Run with --dry-run to preview.
//   node scripts/fix-frame-sizes.js [--dry-run]
//
// Scope guard: only touches trays whose mat_frame option is 1435 105 AND whose
// own size is NOT 80x80 — a legitimately 80x80 tray on 1435 105 is left alone.
// Exact-size match: a pool "Montagerahmen Schmidlin … L x W cm" of the same L×W.
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

const WRONG_FRAME = '1435 105.000.000';
const dim = (s) => {
  const m = (s || '').match(/(\d{2,4})\s*x\s*(\d{2,4})/);
  if (!m) return null;
  let a = +m[1], b = +m[2];
  if (a >= 400 || b >= 400) { a /= 10; b /= 10; }
  return [Math.max(a, b), Math.min(a, b)];
};
// pool index of Schmidlin rectangular frames by exact L×W
const frameBySize = {};
for (const z of pool) {
  if (!/montagerahmen\s+schmidlin/i.test(z.label || '')) continue;
  const d = dim(z.label);
  if (d) (frameBySize[d.join('x')] = frameBySize[d.join('x')] || []).push(z);
}

let fixed = 0;
const log = [];
for (const t of trays) {
  const g = (t.mountingMaterials || []).find((m) => m.id === 'mat_frame');
  if (!g || !g.options || !g.options[0] || g.options[0].artNr !== WRONG_FRAME) continue;
  const td = dim(t.label);
  if (!td) { log.push(`⚠️  ${(t.label || '').slice(0, 46)} — no size, skipped`); continue; }
  if (td[0] === 80 && td[1] === 80) continue; // legitimately 80x80 → leave alone
  const cands = frameBySize[td.join('x')] || [];
  if (cands.length !== 1) { log.push(`🚩 ${(t.label || '').slice(0, 46)} size ${td.join('x')} — ${cands.length} frame matches, skipped (flag, don't guess)`); continue; }
  const f = cands[0];
  const oldArt = g.options[0].artNr;
  g.options = [{ artNr: f.artNr, label: f.label, imgUrl: f.imgUrl || '', type: 'Zubehör', menge: 1 }];
  for (const br of g.bundleRules || []) {
    if (Array.isArray(br.optionArtNrs)) br.optionArtNrs = br.optionArtNrs.map((a) => (a === oldArt ? f.artNr : a));
  }
  fixed++;
  log.push(`${(t.label || '').slice(0, 44).padEnd(44)} ${td.join('x')}  ${oldArt} → ${f.artNr}`);
}

if (!dryRun) fs.writeFileSync(file, minified ? JSON.stringify(data) : JSON.stringify(data, null, 2));

console.log(`── Frame-size fix ${dryRun ? '(DRY RUN) ' : ''}──`);
console.log(`  trays re-linked to exact-size frame: ${fixed}`);
log.forEach((l) => console.log(`   ${l}`));
console.log(`  ${dryRun ? 'NO FILE WRITTEN (dry run)' : 'written as: ' + (minified ? 'minified' : 'pretty')}`);
