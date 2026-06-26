// Targeted accessory fill for the STALE Duschenmischer products only — those that
// have scraped accessories (st-scraper/mischer-accessories.json) but empty
// mountingMaterials in custom-data.json (mostly current-gen Hansgrohe Aufputz).
// Does NOT touch any already-populated mixer. Run with --dry-run to preview.
//   node scripts/fill-mischer-accessories-targeted.js [--dry-run]
//
// Mirrors st-scraper/inject-mischer-accessories.js group shape/order/menge, PLUS:
//  • Abstellverschraubung rule: SKIP it when the mixer already includes the screw
//    connections — description says "mit S-Anschlüssen" / "S-Anschlüsse" (and not
//    "ohne …"), or "mit Verschraubungen". Otherwise ADD it.
//  • Garbage scrub: drop scraped options that are the product's own art-nr or a
//    "Produktbeschreibung" placeholder.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataPath = path.join(__dirname, '..', 'custom-data.json');
const accPath = path.join(__dirname, '..', 'st-scraper', 'mischer-accessories.json');
const dryRun = process.argv.includes('--dry-run');

const raw = fs.readFileSync(dataPath, 'utf8');
const minified = !/\n\s+"/.test(raw.slice(0, 2000));
const data = JSON.parse(raw);
const acc = JSON.parse(fs.readFileSync(accPath, 'utf8'));
const trays = (data.duschenmischer && data.duschenmischer.trays) || [];

const cleanArt = (a) => (a || '').replace(/\s/g, '');
const hasScraped = (a) => a && Object.keys(a).some((k) => Array.isArray(a[k]) && a[k].length > 0);
const hasAcc = (t) => (t.mountingMaterials || []).some((g) => (g.options || []).length > 0);

// scrub scraper artifacts: the product's own art-nr row and "Produktbeschreibung" rows
const cleanOpts = (arr, trayArt) =>
  (arr || []).filter(
    (o) =>
      o && o.artNr && o.label &&
      cleanArt(o.artNr) !== cleanArt(trayArt) &&
      o.label.trim().toLowerCase() !== 'produktbeschreibung'
  );

const addGroup = (mm, name, type, optionsArray, trayArt, menge = 1) => {
  const opts = cleanOpts(optionsArray, trayArt);
  if (opts.length === 0) return 0;
  mm.push({
    id: `${type.toLowerCase()}_${cleanArt(trayArt)}`,
    name,
    options: [
      ...opts.map((o) => ({ artNr: o.artNr, label: o.label, type, menge })),
      { artNr: 'none', label: 'Ohne ' + name, type, menge: 0 },
    ],
  });
  return opts.length;
};

// Does the mixer already INCLUDE its screw connections? Then skip Abstellverschraubung.
const includesVerschraubung = (label) => {
  const l = (label || '').toLowerCase();
  if (/ohne\s+abstellverschraub/.test(l)) return false;
  if (/s-?\s*anschl/.test(l) && !/ohne\s+s-?\s*anschl/.test(l)) return true; // "mit S-Anschlüssen"
  if (/mit\s+verschraubung/.test(l)) return true; // "mit Verschraubungen"
  return false;
};

const stale = trays.filter((t) => hasScraped(acc[t.artNr]) && !hasAcc(t));
const log = [];
let filled = 0;

for (const t of stale) {
  const a = acc[t.artNr];
  const art = t.artNr;
  const skipAbstell = includesVerschraubung(t.label);
  const mm = [];
  if (!skipAbstell) addGroup(mm, 'Abstellverschraubung', 'Abstellverschraubung', a.abstellverschraubung, art, 2);
  addGroup(mm, 'Grundkörper', 'Grundkörper', a.grundkoerper, art);
  addGroup(mm, 'Montageschiene / Montageset', 'Montageschiene', a.montageschiene, art);
  addGroup(mm, 'Anschlussbogen', 'Anschlussbogen', a.anschlussbogen, art);
  addGroup(mm, 'Brauseschlauch', 'Brauseschlauch', a.brauseschlauch, art);
  addGroup(mm, 'Handbrause', 'Handbrause', a.handbrause, art);
  addGroup(mm, 'Brausehalter', 'Brausehalter', a.brausehalter, art);
  addGroup(mm, 'Duschengleitstange', 'Gleitstange', a.gleitstange, art);

  t.mountingMaterials = mm;
  filled++;
  log.push(
    `${art}  ${(t.label || '').slice(0, 40).padEnd(40)} ` +
      `groups:${mm.length}  Abstellv.:${skipAbstell ? 'SKIP (incl. Verschr.)' : 'add'}`
  );
}

if (!dryRun) fs.writeFileSync(dataPath, minified ? JSON.stringify(data) : JSON.stringify(data, null, 4));

console.log(`── Targeted Duschenmischer accessory fill ${dryRun ? '(DRY RUN) ' : ''}──`);
console.log(`  stale products filled: ${filled}  (others untouched)`);
log.forEach((l) => console.log(`   ${l}`));
console.log(`  ${dryRun ? 'NO FILE WRITTEN (dry run)' : 'written as: ' + (minified ? 'minified' : 'pretty')}`);
