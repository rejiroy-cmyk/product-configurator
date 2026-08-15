#!/usr/bin/env node
//
// Repair the Gessi/Emporio injection in zubehoer_pool.
//
// inject-scraped-gessi-variants.cjs classifies a scraped base by matching its
// text against the seven shower accessory families, and falls back to
// productType "Andere" when none hit. The Gessi scrape covered whole product
// pages, so most of what it brought back are MIXERS — and mixers have no
// accessory family, so 129 bases landed in the accessory pool as "Andere".
//
// Two different problems hide behind that one label:
//
//   120 are main products that already exist, art-Nr for art-Nr, in
//       bademischer / duschenmischer / waschtischmischer / bidet, with equal or
//       better variant coverage. A Bademischer is not an accessory; the copies
//       are removed. (Verified before deleting: no copy carried a variant its
//       home pool lacked.)
//     9 are genuine accessories the pool should keep — 6 "Auslauf … für
//       Wandmischer" spouts and 3 "Einbaukörper Gessi", the latter being
//       exactly what the Regenbrause → Einbaukörper rule looks up.
//
// FULL-TEXT RULE: the type is read from label + description, never the label
// alone; ERP labels truncate mid-sentence.
//
// Idempotent — a second run is a no-op. Dry-run by default; pass --write.
//
const fs = require('fs');
const path = require('path');
const { buildOwnedIndex, classifyAccessoryType } = require('./_poolClassify.cjs');

const WRITE = process.argv.includes('--write');
const DATA = path.resolve(__dirname, '..', 'custom-data.json');

function main() {
    const data = JSON.parse(fs.readFileSync(DATA, 'utf8'));
    const pool = data.zubehoer_pool && data.zubehoer_pool.trays;
    if (!Array.isArray(pool)) throw new Error('zubehoer_pool.trays missing');

    // Every art-Nr a mixer pool owns, as a base tray or as a variant SKU.
    const owned = buildOwnedIndex(data);

    const removed = [], retyped = [], kept = [];
    const next = [];
    for (const item of pool) {
        if (item.productType !== 'Andere') { next.push(item); continue; }

        const home = owned.get(item.artNr);
        if (home) {
            // Never drop a copy that holds variants its home pool lacks.
            const mine = (item.variants || []).length;
            const theirs = (home.tray.variants || []).length;
            if (mine > theirs) {
                kept.push(`${item.artNr} — ${mine} variants vs ${theirs} in ${home.pool}, kept for review`);
                next.push(item);
                continue;
            }
            removed.push(`${item.artNr} → already in ${home.pool}`);
            continue;
        }

        const { type, certain } = classifyAccessoryType(item);
        if (certain) {
            item.productType = type;
            for (const v of item.variants || []) v.productType = type;
            retyped.push(`${item.artNr} → ${type}`);
        } else {
            kept.push(`${item.artNr} — no rule matched: ${(item.label || '').slice(0, 60)}`);
        }
        next.push(item);
    }

    console.log(`zubehoer_pool: ${pool.length} → ${next.length} trays`);
    console.log(`\nremoved ${removed.length} duplicate main products:`);
    removed.slice(0, 8).forEach(r => console.log('  ' + r));
    if (removed.length > 8) console.log(`  … and ${removed.length - 8} more`);
    console.log(`\nretyped ${retyped.length} genuine accessories:`);
    retyped.forEach(r => console.log('  ' + r));
    if (kept.length) {
        console.log(`\nleft as "Andere" (${kept.length}):`);
        kept.forEach(r => console.log('  ' + r));
    }

    if (!WRITE) { console.log('\nDry run. Re-run with --write to apply.'); return; }
    data.zubehoer_pool.trays = next;
    // JSON.stringify(…, null, 2): anything else reformats all 94k records.
    fs.writeFileSync(DATA, JSON.stringify(data, null, 2), 'utf8');
    console.log('\nWritten.');
}

main();
