// Remove an article number entirely from custom-data.json.
//   node scripts/remove-article.js "1435 491.000.000"
//
// Removes the artNr from every group's options[] and bundle[]; drops any group
// left with zero options; clears any `selections` entry that referenced it.
// Format-preserving (writes minified if the source is minified). Git is the backup.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const file = path.join(__dirname, '..', 'custom-data.json');

const target = (process.argv[2] || '').trim();
if (!target) { console.error('usage: node scripts/remove-article.js "<art nr>"'); process.exit(1); }
const tnorm = target.replace(/\s/g, '');
const isTarget = (a) => (a || '').replace(/\s/g, '') === tnorm;

const raw = fs.readFileSync(file, 'utf8');
const minified = !/\n\s+"/.test(raw.slice(0, 2000));
const data = JSON.parse(raw);

let optsRemoved = 0, bundleRemoved = 0, groupsDropped = 0, selectionsCleared = 0;

for (const key of Object.keys(data)) {
  const cat = data[key];
  const trays = cat && cat.trays;
  if (!Array.isArray(trays)) continue;
  for (const t of trays) {
    if (Array.isArray(t.mountingMaterials)) {
      for (const g of t.mountingMaterials) {
        if (Array.isArray(g.options)) {
          const before = g.options.length;
          g.options = g.options.filter((o) => !isTarget(o.artNr));
          optsRemoved += before - g.options.length;
        }
        if (Array.isArray(g.bundle)) {
          const before = g.bundle.length;
          g.bundle = g.bundle.filter((o) => !isTarget(o.artNr));
          bundleRemoved += before - g.bundle.length;
        }
      }
      const before = t.mountingMaterials.length;
      // drop groups that have no options left (an option group with nothing to pick)
      t.mountingMaterials = t.mountingMaterials.filter(
        (g) => !(Array.isArray(g.options) && g.options.length === 0)
      );
      groupsDropped += before - t.mountingMaterials.length;
    }
    if (t.selections && typeof t.selections === 'object') {
      for (const sk of Object.keys(t.selections)) {
        if (isTarget(t.selections[sk])) { delete t.selections[sk]; selectionsCleared++; }
      }
    }
  }
}

fs.writeFileSync(file, minified ? JSON.stringify(data) : JSON.stringify(data, null, 2));

console.log(`── Removed ${target} from custom-data.json ──`);
console.log(`  option entries removed   : ${optsRemoved}`);
console.log(`  bundle entries removed   : ${bundleRemoved}`);
console.log(`  empty groups dropped     : ${groupsDropped}`);
console.log(`  selections cleared       : ${selectionsCleared}`);
console.log(`  written as: ${minified ? 'minified' : 'pretty'}`);
