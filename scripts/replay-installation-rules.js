// Replay harness: run the Installationselement rules against the REAL catalog and
// report what WOULD be attached. Informational — it never writes.
//
//   node scripts/replay-installation-rules.js
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { expandData } from '../modules/dataHydrate.js';
import { COLOR_NAMES } from '../modules/factories/_colorCodes.js';
import { buildElementPool, linkInstallationElement, elementSituation, cisternOf } from '../modules/rules/linkInstallationElement.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// MUST expand — the file is stored interned (see modules/dataHydrate.js).
const data = expandData(JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'custom-data.json'), 'utf8')));
const pool = buildElementPool(data);

console.log('pool: elements indexed', pool.byBase.size, '| plate families', [...pool.platesByFamily.keys()].sort().join(', '));

for (const category of ['wandklosett', 'standklosett']) {
    const trays = (data[category] && data[category].trays) || [];
    const situations = {};
    let attached = 0, plateOpts = 0, alreadyHas = 0;
    for (const t of trays) {
        const groups = linkInstallationElement(t, pool, { colorNames: COLOR_NAMES, category });
        if (!groups.length) continue;
        attached++;
        const s = category === 'standklosett' ? 'standard' : elementSituation(t);
        situations[s] = (situations[s] || 0) + 1;
        const pg = groups.find((g) => g.name === 'Betätigungsplatte');
        if (pg) plateOpts = Math.max(plateOpts, pg.options.length);
        if ((t.mountingMaterials || []).some((g) => /Installationselement|Duofix Element/i.test(g.name || ''))) alreadyHas++;
    }
    console.log(`\n=== ${category} — ${trays.length} trays ===`);
    console.log('  would attach to      :', attached);
    console.log('  already has an element:', alreadyHas);
    console.log('  by situation         :', JSON.stringify(situations));
    console.log('  plate options offered :', plateOpts);
}

// One worked example, in full.
const sample = (data.wandklosett.trays || []).find((t) => elementSituation(t) === 'barrierefrei')
            || (data.wandklosett.trays || [])[0];
const gs = linkInstallationElement(sample, pool, { colorNames: COLOR_NAMES, category: 'wandklosett' });
console.log(`\n=== worked example: ${sample.artNr} — ${String(sample.label).slice(0, 60)} ===`);
console.log('  situation:', elementSituation(sample));
for (const g of gs) {
    console.log(`  · ${g.name}  [${g._rule}]${g.dependsOn ? ' dependsOn=' + g.dependsOn : ''} — ${g.options.length} options`);
    for (const o of g.options.slice(0, 3)) console.log(`      ${String(o.artNr).padEnd(18)} ${String(o.description || o.label).slice(0, 72)}`);
    if (g.options.length > 3) console.log(`      … +${g.options.length - 3} more`);
}
const el = gs[0].options.find((o) => o.artNr === 'bau115');
console.log('\n  opt-out line:', JSON.stringify(el));
console.log('  cistern of chosen element:', cisternOf(gs[0].options[0]));
