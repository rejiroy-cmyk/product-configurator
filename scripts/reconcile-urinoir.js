/**
 * Applies the Urinoir Installationselement rules to the catalogue.
 *
 *   node scripts/reconcile-urinoir.js            # dry run — reports, writes nothing
 *   node scripts/reconcile-urinoir.js --write    # backs up, then writes
 *
 * Idempotent: a second run reports 0 changed.
 *
 * Two things happen per tray, and only the first is a "produced group":
 *   1. the element chain (linkUrinoirElement) replaces whatever the ruleset owns;
 *   2. an EXISTING Dübelschraube group is PATCHED with the wall-mount dependency —
 *      its options are SAP's own and are left exactly as they are (§3.4).
 */
import { createRequire } from 'module';
import { buildUrinoirPool, linkUrinoirElement, urinoirElement, flushClass, wallOnlyPatch } from '../modules/rules/linkUrinoirElement.js';
import { reconcileInstallation, URINOIR_OWNED_GROUPS } from '../modules/rules/reconcileInstallation.js';

const require = createRequire(import.meta.url);
const { readData, writeData } = require('../st-scraper/_dataFile.cjs');   // expands + re-interns
const WRITE = process.argv.includes('--write');
const VERBOSE = process.argv.includes('--verbose');

const data = readData();
const pool = buildUrinoirPool(data);
const trays = (data.urinoir && data.urinoir.trays) || [];

const r = {
    trays: trays.length, changed: 0, noElement: [], derived: [], patched: 0,
    added: {}, replaced: {}, removed: {}, elements: {},
};

for (const tray of trays) {
    const ruleGroups = linkUrinoirElement(tray, pool);
    const { el, source } = urinoirElement(tray);
    const base = String(tray.artNr || '').slice(0, 8);

    if (!el) r.noElement.push(`${base} (${source}, ${flushClass(tray)})`);
    else {
        r.elements[el] = (r.elements[el] || 0) + 1;
        if (source === 'derived') r.derived.push(`${base} → ${el}  [${flushClass(tray)}] ${String(tray.label || '').slice(0, 44)}`);
    }

    const res = reconcileInstallation(tray, ruleGroups, URINOIR_OWNED_GROUPS);
    for (const n of res.replaced) r.replaced[n] = (r.replaced[n] || 0) + 1;
    for (const n of res.added) r.added[n] = (r.added[n] || 0) + 1;
    for (const n of res.removed) r.removed[n] = (r.removed[n] || 0) + 1;
    if (res.changed) r.changed++;

    // The wall-mount patch needs the element group's option list to key its rules off.
    const elementGroup = ruleGroups.find((g) => g.name === 'Installationselement');
    const groups = res.groups;
    if (elementGroup) {
        for (const g of groups) {
            const patch = wallOnlyPatch(g, elementGroup.id, elementGroup.options);
            if (!patch) continue;
            if (WRITE) Object.assign(g, patch);
            r.patched++;
            if (VERBOSE) console.log(`  patch ${base} "${g.name}" → suppressed unless bau115`);
        }
    }
    if (WRITE) tray.mountingMaterials = groups;
}

const tally = (o) => Object.entries(o).sort().map(([k, v]) => `${k} ×${v}`).join(' · ') || '—';
console.log(`\n${WRITE ? 'APPLYING' : 'DRY RUN — nothing written'}\n`);
console.log(`=== urinoir — ${r.trays} trays ===`);
console.log('  changed        :', r.changed);
console.log('  elements       :', tally(r.elements));
console.log('  no element     :', r.noElement.length, r.noElement.length ? '→ ' + r.noElement.join(' · ') : '');
console.log('  wall-mount rows patched (Dübelschraube):', r.patched);
console.log('  added          :', tally(r.added));
console.log('  replaced       :', tally(r.replaced));
console.log('  removed        :', tally(r.removed));
console.log(`\n  DERIVED (no competitor evidence — review these ${r.derived.length}):`);
for (const d of r.derived) console.log('    ', d);
console.log('');
if (!WRITE) { console.log('Re-run with --write to apply.\n'); process.exit(0); }
const bak = writeData(data);
console.log(`Written. Backup: ${bak}\n`);
