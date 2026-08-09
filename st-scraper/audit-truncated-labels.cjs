/**
 * audit-truncated-labels.cjs
 * ---------------------------------------------------------------------------
 * Sizes the ERP label-truncation damage in custom-data.json and emits the
 * work-list for a re-scrape.
 *
 * The ERP cuts `label` at fixed character widths, mid-word. Usually the rest of
 * the sentence survives in `description`, and fullLabel() stitches it back
 * (see modules/factories/_productDisplay.js). Where it does NOT, the text is
 * gone from our data entirely and only the vendor API can return it.
 *
 * Buckets:
 *   RECOVERED    description restores the cut text  -> nothing to do
 *   NO_DESC      truncated, no description at all   -> re-scrape
 *   DESC_ECHO    truncated, description is a copy of the same truncated string
 *                                                    -> re-scrape
 *   TWIN         two different art-Nrs whose full text is byte-identical
 *                                                    -> re-scrape (both)
 *
 * Usage:  node st-scraper/audit-truncated-labels.cjs [--shards N]
 * Writes: st-scraper/truncated-worklist.json   { generated, counts, artNrs[] }
 *         st-scraper/truncated-shard-<i>.json  when --shards is given
 */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(path.dirname(fs.realpathSync(__filename)), '..');
const data = JSON.parse(fs.readFileSync(path.join(ROOT, 'custom-data.json'), 'utf8'));

const shardArg = process.argv.indexOf('--shards');
const SHARDS = shardArg > -1 ? parseInt(process.argv[shardArg + 1], 10) : 0;

const clean = (s) => String(s == null ? '' : s)
    .replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
const compact = (s) => s.toLowerCase().replace(/[^a-z0-9äöüàéèçñ]/g, '');

// A label the ERP cut off.
//
// Two heuristics were tried and rejected before this one. (a) "short lowercase last
// word" flagged legitimate endings — "…Abgang 56 mm, grau", "…Geräuschgruppe II".
// (b) A fixed cutoff width does not exist: the length histogram over 89,475 records
// has no spike, just the natural 68-79 char spread of German product labels.
//
// So only signals that CANNOT end a finished label count. Everything here is
// provable damage, not a guess — the re-scrape list must not be padded with
// records that are actually fine.
const isTruncated = (l) => {
    if (!l) return false;
    if (/[,;/–-]$/.test(l)) return true;                        // ends on a separator
    const last = (l.split(/\s+/).pop() || '').replace(/["»)]$/, '');
    if (/^\d+([.,]\d+)?$/.test(last)) return true;              // ends on a bare number
    // ends on a dangling function word — no German label ends "… für" / "… mit"
    return /^(für|mit|ohne|und|zur|zum|zu|bis|von|vom|aus|im|am|an|auf|in|per|inkl|nach|über)$/i.test(last);
};

// Only real articles. `none`, `ohne_schlauch`, `ohne_halter` … are UI sentinels for
// "without this part" and share text by design — they are not catalogue gaps.
const isRealArtNr = (a) => /^\d/.test(String(a).trim());

// walk every article record
const rows = [];
(function walk(o) {
    if (Array.isArray(o)) { o.forEach(walk); return; }
    if (o && typeof o === 'object') {
        if (o.artNr && (o.label || o.name)) rows.push(o);
        for (const k of Object.keys(o)) walk(o[k]);
    }
})(data);

const counts = { total: rows.length, truncated: 0, RECOVERED: 0, NO_DESC: 0, DESC_ECHO: 0, TWIN: 0, TWIN_COLOUR_VARIANT: 0 };
const need = new Map();           // artNr -> reason
const byText = new Map();         // full text -> Set(artNr)  (twin detection)
const samples = { NO_DESC: [], DESC_ECHO: [], TWIN: [] };

for (const p of rows) {
    const L = clean(p.label || p.name);
    const D = clean(p.description);
    const art = String(p.artNr).trim();
    if (!isRealArtNr(art)) continue;

    const full = D && !compact(L).includes(compact(D)) ? `${L} ${D}` : L;
    if (!byText.has(compact(full))) byText.set(compact(full), new Set());
    byText.get(compact(full)).add(art);

    if (!isTruncated(L)) continue;
    counts.truncated++;

    let reason = null;
    if (!D) reason = 'NO_DESC';
    else if (compact(D) === compact(L) || compact(L).includes(compact(D))) reason = 'DESC_ECHO';
    else reason = 'RECOVERED';

    counts[reason]++;
    if (reason !== 'RECOVERED' && !need.has(art)) {
        need.set(art, reason);
        if (samples[reason].length < 4) samples[reason].push({ artNr: art, label: L.slice(0, 110) });
    }
}

// Twins: identical full text under two or more art-Nrs.
//
// COLOUR RULE: an art-Nr is BASE.COLOUR.VARIANT and the finish is carried by the
// colour triplet, never by the label text — so "6211 614.535.000" and
// "6211 614.149.000" SHOULD read alike. They are one article in two finishes, the
// Farbe chip already separates them, and re-scraping them would return the same
// text again. Only twins with DIFFERENT bases are a real catalogue gap.
const baseOf = (a) => String(a).trim().split('.')[0];
for (const [, set] of byText) {
    if (set.size < 2) continue;
    const bases = new Set([...set].map(baseOf));
    if (bases.size < 2) { counts.TWIN_COLOUR_VARIANT += set.size; continue; }
    for (const art of set) {
        if (!need.has(art)) {
            need.set(art, 'TWIN');
            counts.TWIN++;
            if (samples.TWIN.length < 4) samples.TWIN.push({ artNr: art, with: [...set].filter(a => a !== art).slice(0, 2) });
        }
    }
}

const artNrs = [...need.keys()].sort();
const out = {
    generated: null,          // stamped by the caller; scripts here stay deterministic
    counts,
    reasons: Object.fromEntries(need),
    artNrs,
};
fs.writeFileSync(path.join(ROOT, 'st-scraper/truncated-worklist.json'), JSON.stringify(out, null, 1));

console.log("article records scanned :", counts.total, "(numeric art-Nr only)");
console.log('labels the ERP truncated:', counts.truncated);
console.log('  RECOVERED by description:', counts.RECOVERED);
console.log('  NO_DESC   (re-scrape)   :', counts.NO_DESC);
console.log('  DESC_ECHO (re-scrape)   :', counts.DESC_ECHO);
console.log('text twins, different base :', counts.TWIN, '  (colour variants excluded:', counts.TWIN_COLOUR_VARIANT + ')');
console.log('\nUNIQUE art-Nrs to re-scrape:', artNrs.length);
for (const k of ['NO_DESC', 'DESC_ECHO', 'TWIN']) {
    console.log(`\n-- ${k} samples --`);
    samples[k].forEach(s => console.log('  ', JSON.stringify(s)));
}

if (SHARDS > 0) {
    const per = Math.ceil(artNrs.length / SHARDS);
    for (let i = 0; i < SHARDS; i++) {
        const slice = artNrs.slice(i * per, (i + 1) * per);
        fs.writeFileSync(path.join(ROOT, `st-scraper/truncated-shard-${i}.json`), JSON.stringify(slice));
    }
    console.log(`\nwrote ${SHARDS} shards of <=${per} art-Nrs each`);
}
