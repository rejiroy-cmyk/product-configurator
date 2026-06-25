// Frame data corrections (Duschenwanne). Run with --dry-run to preview.
//   node scripts/fix-frames.js [--dry-run]
//
// Phase 1 — Vario → auf-Mass Omnia frame (INSTRUCTIONS §3, Schmidlin/Vario):
//   The 12 Schmidlin Vario trays were mis-linked to the fixed 80x80 Omnia frame
//   (1435 105). Re-link by max dimension of the size range:
//     max < 130 cm  → 1435 199 (Omnia auf Mass, bis 129 x 125)
//     max >= 130 cm → 1435 200 (Omnia auf Mass, ab 130 x 76)
//   The Fussset bundleRules (1435 191) is retargeted to the new frame art-nr.
//
// Phase 2 — remove the Kaldewei ESR frame family from the pool:
//   FR 5300 is the universal Kaldewei frame; ESR is unused (0 tray references).
//   Drops the 49 "Einbau- System- Rahmen Kaldewei ESR" parts from zubehoer_pool.
//
// Laufen Ineo is intentionally NOT touched (existing data + its two Schallschutz
// sets are already correctly paired). Format-preserving. Git is the backup.
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

const VARIO_SMALL = '1435 199.000.000';
const VARIO_LARGE = '1435 200.000.000';
const OLD_VARIO_FRAME = '1435 105.000.000';
const poolPart = (artNr) => pool.find((z) => z.artNr === artNr);

// ── Phase 1: Vario → auf-Mass frame ──────────────────────────────────────────
const frameOption = (artNr) => {
  const z = poolPart(artNr);
  return { artNr, label: (z && z.label) || '', imgUrl: (z && z.imgUrl) || '', type: 'Zubehör', menge: 1 };
};
const maxDim = (label) => {
  // size ranges look like "97 - 105 x 67 - 110 x 2,5 cm" → max of the upper bounds
  const m = (label || '').match(/(\d{2,4})\s*-\s*(\d{2,4})\s*x\s*(\d{2,4})\s*-\s*(\d{2,4})/);
  if (!m) return null;
  return Math.max(parseInt(m[2], 10), parseInt(m[4], 10));
};

let varioFixed = 0;
const varioLog = [];
for (const t of trays) {
  if (!/vario/i.test(t.label || '')) continue;
  const g = (t.mountingMaterials || []).find((m) => m.id === 'mat_frame');
  if (!g) continue;
  const md = maxDim(t.label);
  if (md == null) { varioLog.push(`⚠️  ${(t.label || '').slice(0, 50)} — no parsable range, skipped`); continue; }
  const newArt = md < 130 ? VARIO_SMALL : VARIO_LARGE;
  const currentArt = g.options && g.options[0] && g.options[0].artNr;
  g.options = [frameOption(newArt)];
  // retarget the Fussset bundleRules to the new frame option
  for (const br of g.bundleRules || []) {
    if (Array.isArray(br.optionArtNrs)) {
      br.optionArtNrs = br.optionArtNrs.map((a) => (a === currentArt || a === OLD_VARIO_FRAME ? newArt : a));
    }
  }
  varioFixed++;
  varioLog.push(`${(t.label || '').slice(0, 46).padEnd(46)} max=${md}cm → ${newArt}`);
}

// ── Phase 2: remove ESR frame family from the pool ───────────────────────────
const isESRframe = (l) => /einbau-?\s*system-?\s*rahmen\s+kaldewei\s+esr/i.test(l || '');
const esrCount = pool.filter((z) => isESRframe(z.label)).length;
data.zubehoer_pool.trays = pool.filter((z) => !isESRframe(z.label));

if (!dryRun) fs.writeFileSync(file, minified ? JSON.stringify(data) : JSON.stringify(data, null, 2));

console.log(`── Frame fixes ${dryRun ? '(DRY RUN) ' : ''}──`);
console.log(`\nPhase 1 — Vario re-linked to auf-Mass frame: ${varioFixed}`);
varioLog.forEach((l) => console.log(`   ${l}`));
console.log(`\nPhase 2 — ESR frame parts removed from pool: ${esrCount}`);
console.log(`\n  ${dryRun ? 'NO FILE WRITTEN (dry run)' : 'written as: ' + (minified ? 'minified' : 'pretty')}`);
