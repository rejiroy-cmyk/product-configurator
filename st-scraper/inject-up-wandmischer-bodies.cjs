#!/usr/bin/env node
/**
 * Inject the Grundkörper/Einbaukörper pairing for the UP wall mixers that no
 * amount of text parsing can recover.
 *
 * Background: `createMixAndMatchApp` (and every other configurator) now pairs a
 * concealed wall mixer with its body either from a curated `mountingMaterials`
 * group or from the art-Nr its own ERP text names ("ohne Einbaukörper 6418 132").
 * A handful of records satisfy neither:
 *
 *   - 6241 292 / 6241 566 (Gessi)  — `description` is EMPTY. Their SAP short text
 *     was truncated at the maktx/maktx2 boundary and the tail that carried the
 *     reference never landed. Their catalogue entry says only "ohne Einbaukörper",
 *     with the partner listed as a separate priced Zubehör row.
 *   - 6241 560/562/564/565 (Gessi 316) — text names 6252 848, but no article record
 *     for that stem exists, so the pairing renders with a synthesized label.
 *   - 6437 573 (Dornbracht Mem) — its description carries a CORRUPT art-Nr,
 *     "ohne Einbaukörper 6438.9975369". The parser rejects it by design rather
 *     than emit an unorderable row. Its two catalogue siblings (6437 570/571)
 *     both pair with 6438 811.
 *
 * Every number and label below is sourced from the catalogue scrape at
 * st-scraper/catalogue-inspection/ch6-products.json (Ch. 6, pages 6.153-6.186)
 * — nothing here is invented.
 *
 * Usage:  node st-scraper/inject-up-wandmischer-bodies.cjs [--write]
 *         (dry-run by default; --write backs up custom-data.json first)
 */
const fs = require('fs');
const path = require('path');

const DATA = path.join(__dirname, '..', 'custom-data.json');

// Body articles, as named by the catalogue.
const BODIES = {
    // exists in custom-data.json -> duschenmischer.trays
    '6252 801.000.000': 'Einbaukörper Gessi ½", für Dusch- und Waschtischmischer, Einbautiefe 64 - 94 mm',
    // ch6-products.json #985, page 6.186 — no article record in custom-data.json yet
    '6252 848.000.000': 'Einbaukörper Gessi ½", zu Wandmischer mit Auslauf, Einbautiefe 69 - 99 mm',
    // exists in custom-data.json -> waschtischmischer.trays
    '6438 811.000.000': 'Einbaukörper Dornbracht ½", für Auslauf mittig, für Wandbatterie',
};

// mixer art-Nr -> body art-Nr
const PAIRINGS = {
    '6241 566.495.111': '6252 801.000.000',   // Gessi 316,   ch6 #870/871, page 6.155
    '6241 292.501.116': '6252 848.000.000',   // Gessi Habito, ch6 #946/947, page 6.178
    '6241 560.495.111': '6252 848.000.000',   // Gessi 316,   ch6 #866/867, page 6.153
    '6241 562.495.115': '6252 848.000.000',   // Gessi 316,   ch6 #866/867, page 6.153
    '6241 564.495.111': '6252 848.000.000',   // Gessi 316,   ch6 #868/869, page 6.154
    '6241 565.495.111': '6252 848.000.000',   // Gessi 316,   ch6 #868/869, page 6.154
    '6437 573.501.781': '6438 811.000.000',   // Dornbracht Mem, ch6 #1666 (corrupt ref in ERP text)
};

const write = process.argv.includes('--write');
const data = JSON.parse(fs.readFileSync(DATA, 'utf8'));
const trays = (data.waschtischmischer && data.waschtischmischer.trays) || [];

const isBodyGroup = (g) => /einbauk[öo]rper|grundk[öo]rper/i.test(g.name || '');
let changed = 0;
const report = [];

for (const [mixerArt, bodyArt] of Object.entries(PAIRINGS)) {
    const tray = trays.find(t => t.artNr === mixerArt);
    if (!tray) { report.push(`MISS  ${mixerArt} — not in waschtischmischer.trays`); continue; }
    if (!Array.isArray(tray.mountingMaterials)) tray.mountingMaterials = [];
    if (tray.mountingMaterials.some(isBodyGroup)) {
        report.push(`SKIP  ${mixerArt} — already carries an Einbaukörper group`);
        continue;
    }
    tray.mountingMaterials.unshift({
        id: 'mat_einbaukoerper',
        name: 'Einbaukörper',
        options: [
            { artNr: bodyArt, label: BODIES[bodyArt], type: 'Zubehör', menge: 1 },
            { artNr: 'ohne_einbaukr', label: 'Ohne Einbaukörper', type: 'Option' },
        ],
    });
    changed++;
    report.push(`ADD   ${mixerArt} -> ${bodyArt}`);
}

report.forEach(l => console.log(l));
console.log(`\n${changed} record(s) would change.`);

if (!write) { console.log('Dry run — pass --write to apply.'); process.exit(0); }
if (changed === 0) { console.log('Nothing to write.'); process.exit(0); }

const backup = DATA + '.bak-' + new Date().toISOString().replace(/[:.]/g, '-');
fs.copyFileSync(DATA, backup);
console.log('Backup: ' + backup);
// Two-space JSON — anything else reformats all 94k records and buries the diff.
fs.writeFileSync(DATA, JSON.stringify(data, null, 2));
console.log('Written: ' + DATA);
