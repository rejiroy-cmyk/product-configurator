/**
 * Applies the Installationselement rules to the catalogue.
 *
 *   node scripts/reconcile-installation.js            # dry run — reports, writes nothing
 *   node scripts/reconcile-installation.js --write    # backs up, then writes
 *
 * Idempotent: a second run reports 0 changed.
 */
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { COLOR_NAMES } from '../modules/factories/_colorCodes.js';
import { buildElementPool, linkInstallationElement, elementSituation } from '../modules/rules/linkInstallationElement.js';
import { reconcileInstallation } from '../modules/rules/reconcileInstallation.js';

const require = createRequire(import.meta.url);
const { readData, writeData } = require('../st-scraper/_dataFile.cjs');   // expands + re-interns
const WRITE = process.argv.includes('--write');
const CATEGORIES = ['wandklosett', 'standklosett'];

const data = readData();
const pool = buildElementPool(data);
const report = {};

for (const category of CATEGORIES) {
    const trays = (data[category] && data[category].trays) || [];
    const r = { trays: trays.length, changed: 0, replaced: {}, added: {}, removed: {}, situations: {} };
    for (const tray of trays) {
        const ruleGroups = linkInstallationElement(tray, pool, { colorNames: COLOR_NAMES, category });
        if (!ruleGroups.length) continue;
        const res = reconcileInstallation(tray, ruleGroups);
        const s = category === 'standklosett' ? 'standard' : elementSituation(tray);
        r.situations[s] = (r.situations[s] || 0) + 1;
        for (const n of res.replaced) r.replaced[n] = (r.replaced[n] || 0) + 1;
        for (const n of res.added) r.added[n] = (r.added[n] || 0) + 1;
        for (const n of res.removed) r.removed[n] = (r.removed[n] || 0) + 1;
        if (res.changed) r.changed++;
        if (WRITE) tray.mountingMaterials = res.groups;
    }
    report[category] = r;
}

const tally = (o) => Object.entries(o).map(([k, v]) => `${k} ×${v}`).join(' · ') || '—';
console.log(`\n${WRITE ? 'APPLYING' : 'DRY RUN — nothing written'}\n`);
for (const [cat, r] of Object.entries(report)) {
    console.log(`=== ${cat} — ${r.trays} trays ===`);
    console.log('  changed   :', r.changed);
    console.log('  situations:', tally(r.situations));
    console.log('  added     :', tally(r.added));
    console.log('  replaced  :', tally(r.replaced));
    console.log('  removed   :', tally(r.removed));
    console.log('');
}
if (!WRITE) { console.log('Re-run with --write to apply.\n'); process.exit(0); }
const bak = writeData(data);
console.log(`Written. Backup: ${bak}\n`);
