// ============================================================================
// NO KITCHEN MIXERS IN THE WASHBASIN-MIXER POOL  (regression guard, 2026-08-08)
//
// 120 trays / 246 SKUs labelled "Spültischmischer …" (118) and
// "Standventil … für Spültisch" (2) had been scraped into
// `custom-data.json` → `waschtischmischer.trays`. They polluted TWO surfaces:
//
//   1. the Waschtischmischer configurator, and
//   2. Mix & Match — its Armatur column is fed from
//      `productApps.waschtischmischer.trays` (app.js#openConfigurator),
//      so anything that lands in this pool shows up there too.
//
// They now live under the top-level `spueltischmischer` key, surfaced by its own
// "Spültischmischer" subcategory under Waschplatz (modules/data.js) and served by
// its own createWaschtischMischerApp instance (modules/apps.js).
//
// This test re-runs the classification that found them. A re-scrape, a merge,
// or a hand edit that puts a kitchen tap back into `waschtischmischer.trays`
// fails `npm test` — and therefore `npm run build`.
//
// GLOBAL RULE (CLAUDE.md): classification reads the FULL product text —
// label AND description AND specs values — never the label alone. Half of the
// 246 SKUs are variants whose kitchen wording sits outside the tray label.
//
// COST: custom-data.json is ~45 MB. Read it once, parse it once, never
// stringify it back out.
// ============================================================================
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_PATH = path.join(__dirname, '..', 'custom-data.json');

const KITCHEN_RX = /spültisch|spueltisch|küchen|kuechen|geschirrspül/i;

// Escape hatch for the partner-reference trap (CLAUDE.md): a genuine washbasin
// mixer whose description merely *mentions* a Spültisch. Add the artNr here
// with a one-line reason — never loosen KITCHEN_RX, or the guard stops
// catching the 246 SKUs it exists for. Empty today.
const ALLOWED_ARTNRS = new Set([]);

let passed = 0, failed = 0;
function check(name, cond, detail) {
    if (cond) { console.log(`✅ [PASS] ${name}`); passed++; }
    else { console.log(`❌ [FAIL] ${name}${detail ? `\n${detail}` : ''}`); failed++; }
}

// --- full product text: label + description + specs values ------------------
function specsText(specs) {
    if (!specs) return '';
    const vals = Array.isArray(specs) ? specs : Object.values(specs);
    return vals.map(v => (v && typeof v === 'object') ? specsText(v) : String(v ?? '')).join(' ');
}
function productText(p) {
    return [p.label, p.description, specsText(p.specs)].filter(Boolean).join(' ');
}

function formatOffenders(offenders) {
    const shown = offenders.slice(0, 25)
        .map(o => `             ${o.kind.padEnd(7)} ${o.artNr || '(no artNr)'}  ${o.label || '(no label)'}`);
    if (offenders.length > shown.length) shown.push(`             … and ${offenders.length - shown.length} more`);
    return [
        `           ${offenders.length} kitchen SKU(s) found in waschtischmischer.trays:`,
        ...shown,
        `           → Move them to the top-level \`spueltischmischer\` pool in custom-data.json`,
        `             (that is where the original 120 trays / 246 SKUs went). Leaving them`,
        `             here also pollutes Mix & Match, whose Armatur column reads this pool.`
    ].join('\n');
}

console.log('--------------------------------------------------');
console.log('⚡ Running Kitchen-Mixer Leak Tests (waschtischmischer)...');
console.log('--------------------------------------------------\n');

const data = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));

// --- 0. the pools themselves still exist ------------------------------------
// Without this, a renamed/emptied key would make every assertion below pass
// vacuously.
const wtmTrays = data.waschtischmischer?.trays;
check('waschtischmischer.trays exists and is populated',
    Array.isArray(wtmTrays) && wtmTrays.length > 0,
    '           custom-data.json has no waschtischmischer.trays — the guard below would pass vacuously.');

const spueltischTrays = data.spueltischmischer?.trays;
check('spueltischmischer pool still exists (the Spültischmischer subcategory reads it)',
    Array.isArray(spueltischTrays) && spueltischTrays.length > 0,
    '           The top-level `spueltischmischer` key is gone or empty. It is deliberate\n' +
    '           dead data — the kitchen taps live there until the Küche category gets a\n' +
    '           faucet app. Do not delete it, and do not merge it back.');

// --- 1. the guard ------------------------------------------------------------
const offenders = [];
for (const tray of wtmTrays || []) {
    if (!ALLOWED_ARTNRS.has(tray.artNr) && KITCHEN_RX.test(productText(tray))) {
        offenders.push({ kind: 'tray', artNr: tray.artNr, label: tray.label });
    }
    for (const variant of tray.variants || []) {
        if (!ALLOWED_ARTNRS.has(variant.artNr) && KITCHEN_RX.test(productText(variant))) {
            offenders.push({ kind: 'variant', artNr: variant.artNr, label: variant.label });
        }
    }
}

const trayCount = (wtmTrays || []).length;
const skuCount = trayCount + (wtmTrays || []).reduce((n, t) => n + (t.variants || []).length, 0);
check(`no kitchen mixer in waschtischmischer (${trayCount} trays / ${skuCount} SKUs scanned)`,
    offenders.length === 0,
    offenders.length ? formatOffenders(offenders) : undefined);

// --- 2. canary: the pattern still recognises the SKUs it was written for -----
const undetected = (spueltischTrays || []).flatMap(tray => {
    const rows = [{ kind: 'tray', ...tray }, ...(tray.variants || []).map(v => ({ kind: 'variant', ...v }))];
    return rows.filter(r => !KITCHEN_RX.test(productText(r)))
        .map(r => `             ${r.kind.padEnd(7)} ${r.artNr}  ${r.label}`);
});
check('every parked spueltischmischer SKU is still detected as a kitchen tap',
    undetected.length === 0,
    ['           KITCHEN_RX no longer matches SKUs that ARE kitchen taps — either the',
     '           pattern was weakened (the guard above is now blind), or non-kitchen',
     '           products were dumped into the parked pool:',
     ...undetected.slice(0, 10)].join('\n'));

console.log('\n--------------------------------------------------');
console.log(`Summary: ${passed} passed, ${failed} failed.`);
console.log('--------------------------------------------------');
if (failed > 0) process.exit(1);
