/**
 * remove-mischer-sets.cjs — drop the "…-Set" bundle trays from the Bademischer and
 * Duschenmischer pools.
 *
 * WHY. A "Duschmischer-Set KWC Wamas 2.0" (6110 151.501.000) is one art-Nr over a
 * fixed Stückliste: the mixer, its Abstellverschraubung, a Handbrause and a
 * Brauseschlauch, welded together. In a CONFIGURATOR that is the one thing a tray
 * must not be — the whole point of the app is that the user picks the hose length,
 * the hand-shower design and the finish. The set tray offers a "Stücklisten Artikel"
 * group with no choice in it (or, for the ten Chromeline/Edelstahl-matt ones, no
 * group at all), so it renders as a product you cannot configure.
 *
 * Every set's own mixer is in the catalogue as its own tray and IS configurable, so
 * nothing becomes unorderable — the parts are simply chosen instead of bundled.
 * The script asserts that before it removes anything.
 *
 * Identified by an identity PREFIX on the label ("Bademischer-Set …",
 * "Duschmischer-Set …") — a label literally starting with what the product IS, the
 * GLOBAL RULE's permitted exception.  // label-prefix by design
 *
 * Dry-run by default; `--write` backs up custom-data.json and applies.
 *
 * NOT touched: the 24 "Wandmischer-Set" trays in `waschtischmischer` (same kind of
 * bundle, a pool this script was not asked for) and the Zubehör pool's genuine parts
 * sets (Wasseranschluss-Set, WC-Set, Regulierventil-Set …), which are single
 * articles, not pre-bundled configurations.
 */
'use strict';
const { readData, writeData } = require('./_dataFile.cjs');

const POOLS = ['bademischer', 'duschenmischer'];
const RX_SET = /^\s*(?:Bade|Dusch(?:en)?)mischer-Set\b/i;   // label-prefix by design
const WRITE = process.argv.includes('--write');

const data = readData();

// Every art-Nr that any surviving record mentions — a set may only go if nothing
// else in the file points at it (an option, a variant, a template Stückliste).
const setArts = new Set();
for (const pool of POOLS) for (const t of data[pool].trays) if (RX_SET.test(t.label || '')) setArts.add(t.artNr);

const referencedElsewhere = new Map();
(function scan(node, path) {
    if (Array.isArray(node)) return node.forEach(v => scan(v, path));
    if (node && typeof node === 'object') { for (const [k, v] of Object.entries(node)) scan(v, `${path}.${k}`); return; }
    if (typeof node === 'string' && setArts.has(node) && !/^\.(?:bademischer|duschenmischer)\.trays\.artNr$/.test(path)) {
        referencedElsewhere.set(node, path);
    }
})(data, '');

// The parts a set bundles must stay reachable on their own.
const trayArts = new Set();
for (const pool of POOLS) for (const t of data[pool].trays) trayArts.add(t.artNr);

let removed = 0, kept = 0;
for (const pool of POOLS) {
    const before = data[pool].trays.length;
    const sets = data[pool].trays.filter(t => RX_SET.test(t.label || ''));
    console.log(`\n=== ${pool} — ${sets.length} Set-Trays von ${before}`);

    const drop = new Set();
    for (const t of sets) {
        const ref = referencedElsewhere.get(t.artNr);
        if (ref) { console.log(`  HALT ${t.artNr} — noch referenziert unter ${ref}`); kept++; continue; }
        // The bundled mixer, where the set states one: it must survive as its own tray.
        const comps = (t.mountingMaterials || []).flatMap(g => g.options || []);
        const orphan = comps.filter(o => /mischer|batterie/i.test(o.label || '') && !trayArts.has(o.artNr));
        const note = comps.length ? `${comps.length} Positionen` : 'ohne Stückliste';
        if (orphan.length) { console.log(`  HALT ${t.artNr} — Einzelmischer fehlt: ${orphan.map(o => o.artNr).join(', ')}`); kept++; continue; }
        drop.add(t.artNr);
        console.log(`  weg  ${t.artNr} | ${note} | ${(t.label || '').trim()}`);
    }
    data[pool].trays = data[pool].trays.filter(t => !drop.has(t.artNr));
    removed += drop.size;
    console.log(`  ${before} -> ${data[pool].trays.length} Trays`);
}

console.log(`\nEntfernt: ${removed}${kept ? `, zurückgestellt: ${kept}` : ''}`);
if (!WRITE) { console.log('Dry-run — mit --write schreiben.'); process.exit(0); }
const bak = writeData(data);
console.log(`custom-data.json geschrieben (Backup: ${bak})`);
