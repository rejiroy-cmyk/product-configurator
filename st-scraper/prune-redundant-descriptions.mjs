#!/usr/bin/env node
/**
 * prune-redundant-descriptions.mjs — drop every `description` the `label` already carries.
 *
 * SAP splits the short text across maktx + maktx2 and the rest lands in `description`,
 * so `description` normally holds text the label does NOT have — that is the whole point
 * of fullLabel(), which stitches the two and heals the cut-off word. But 25,483 records
 * carry a description that is byte-identical to the label, or a substring of it. Those
 * bytes say nothing and cost ~4 MB of a file already past GitHub's 50 MB warning.
 *
 * WHY THIS IS SAFE, and it is CHECKED rather than argued:
 *   · display — fullLabel() opens with `if (!D) return L`, so a record with no
 *     description renders its label. This script computes fullLabel() before and after
 *     for EVERY field it touches and refuses to drop one whose rendered text would
 *     change by a single byte.
 *   · classification — productText() is `label + ' ' + description + specs`, lowercased
 *     and whitespace-collapsed. Removing a substring of the label cannot remove a token,
 *     so every regex that matched before still matches. Verified per record too: the
 *     DISTINCT-token set of productText() must be unchanged. Note the multiset does
 *     change — duplicate tokens are exactly what this removes — and the one thing that
 *     can genuinely disappear is a match spanning the label→description join, which only
 *     ever matched an artefact of the concatenation, never real product text.
 *
 * NOT touched: `services[].description` (its text carries newlines the label lacks, so
 * it is never a substring) and anything whose description adds even one character.
 *
 *   node st-scraper/prune-redundant-descriptions.mjs           # dry run
 *   node st-scraper/prune-redundant-descriptions.mjs --write   # apply (backs up first)
 */
import { createRequire } from 'node:module';
// _productDisplay.js is side-effect free on purpose (no window.*, no DOM), so it
// imports cleanly in plain node — do NOT reach for _shared.js here.
import { fullLabel } from '../modules/factories/_productDisplay.js';
// custom-data.json is stored INTERNED — read it any other way and every mounting
// option is the STRING "o412" instead of the object this script has to inspect.
const { readData, writeData } = createRequire(import.meta.url)('./_dataFile.cjs');

const WRITE = process.argv.includes('--write');

const MB = (n) => (n / 1048576).toFixed(2) + ' MB';
// productText(), reduced to what classification depends on: the DISTINCT tokens.
// Deliberately a set, not a multiset — dropping duplicated text is the entire point,
// so the count of "bademischer" changes while the vocabulary must not.
const words = (a) => [...new Set([a.label || '', a.description || '',
    ...(a.specs && typeof a.specs === 'object' ? Object.values(a.specs).filter(v => typeof v === 'string') : [])]
    .join(' ').toLowerCase().replace(/[‐-―]/g, '-').split(/\s+/).filter(Boolean))].sort().join(' ');

const data = readData();
const before = Buffer.byteLength(JSON.stringify(data, null, 2));

let equal = 0, substring = 0, refusedLabel = 0, refusedWords = 0, bytes = 0;
const refusals = [];

const prune = (a, where) => {
    if (!a || typeof a !== 'object' || !a.description) return;
    const D = String(a.description), L = String(a.label || '');
    if (!L) return;
    const isEqual = D === L;
    if (!isEqual && !L.includes(D)) return;

    const labelBefore = fullLabel(a);
    const wordsBefore = words(a);
    const { description, ...without } = a;
    // A record whose rendered text or searchable tokens would shift is left alone —
    // the saving is never worth changing what a BOM row says.
    if (fullLabel(without) !== labelBefore) {
        refusedLabel++;
        if (refusals.length < 5) refusals.push({ where, artNr: a.artNr, why: 'fullLabel would change' });
        return;
    }
    if (words(without) !== wordsBefore) {
        refusedWords++;
        if (refusals.length < 5) refusals.push({ where, artNr: a.artNr, why: 'productText tokens would change' });
        return;
    }
    delete a.description;
    bytes += Buffer.byteLength(D);
    if (isEqual) equal++; else substring++;
};

for (const pool of Object.keys(data)) {
    for (const t of (data[pool] && data[pool].trays) || []) {
        prune(t, pool);
        for (const v of t.variants || []) prune(v, pool + '/variant');
        for (const g of t.mountingMaterials || []) for (const o of g.options || []) prune(o, pool + '/mounting');
    }
}

// Sizes are quoted EXPANDED, so they compare like for like; the file on disk is
// interned and therefore smaller than both numbers.
const after = Buffer.byteLength(JSON.stringify(data, null, 2));
console.log(`dropped: ${equal + substring}  (${equal} identical to the label, ${substring} substrings of it)`);
console.log(`refused: ${refusedLabel + refusedWords}  (${refusedLabel} would change fullLabel, ${refusedWords} would change productText)`);
for (const r of refusals) console.log(`   ${r.artNr}  ${r.where}  — ${r.why}`);
console.log(`\ndescription text removed : ${MB(bytes)}`);
console.log(`custom-data.json         : ${MB(before)}  →  ${MB(after)}   (${MB(before - after)} smaller)`);

if (!WRITE) { console.log('\nDRY RUN — nothing written. Re-run with --write to apply.'); process.exit(0); }
// writeData re-interns, backs up and holds the indent at 2.
const bak = writeData(data);
console.log(`\nbackup : ${bak.replace(/^.*\//, '')}`);
console.log('written: custom-data.json');
