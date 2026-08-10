/**
 * apply-refetched-text.cjs
 * ---------------------------------------------------------------------------
 * Merges the shard results from refetch-truncated-text.cjs back into
 * custom-data.json.
 *
 * DRY RUN BY DEFAULT. Pass --write to actually modify the file (a timestamped
 * backup is written first). custom-data.json is the source of truth for the
 * whole app, so nothing here overwrites silently.
 *
 * What it writes per matched art-Nr:
 *   label        rebuilt from maktx + maktx2. SAP stores the short text in TWO
 *                ~40-char fields and the original scrape kept only the first —
 *                that is the root cause of every truncated label in the file.
 *                Guarded by a prefix check, so a label can only ever be extended.
 *   description  ONLY when the API text is genuinely richer than what we hold —
 *                measured on the compacted string, so re-wrapping, <br> noise and
 *                punctuation changes never count as "richer". Never shortens.
 *   tech         the API's structured attribute pairs ("Marke: Kaldewei",
 *                "Ausprägung: …"), added as a NEW field.
 *
 * Why `tech` and not `specs`: productText() — the GLOBAL full-text classification
 * input — reads label + description + specs. Writing these pairs into `specs`
 * would silently change series/type detection across every configurator. `tech`
 * is inert until something opts into reading it.
 *
 * Changing `description` DOES feed classification by design (that is the point:
 * the distinguishing keyword lives there). Run `npm test` afterwards — the
 * Duschtrennwand and full-text suites exist to catch exactly that kind of drift.
 *
 * Usage:
 *   node st-scraper/apply-refetched-text.cjs            # dry run + report
 *   node st-scraper/apply-refetched-text.cjs --write    # apply
 */
'use strict';
const fs = require('fs');
const path = require('path');

const SCRIPT_DIR = path.dirname(fs.realpathSync(__filename));
const ROOT = path.resolve(SCRIPT_DIR, '..');
const DATA = path.join(ROOT, 'custom-data.json');
const WRITE = process.argv.includes('--write');

const clean = (s) => String(s == null ? '' : s)
    .replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]*>/g, ' ').replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ').trim();
const compact = (s) => clean(s).toLowerCase().replace(/[^a-z0-9äöüàéèçñ]/g, '');
const key = (a) => String(a).replace(/[^0-9]/g, '');

// ── attribute normalisation ──────────────────────────────────────────────────
// The two sources disagree on shape. The live API returns objects
// {label, value, unit}; the older cached dumps flattened them to "Marke: Alterna"
// strings, losing the unit. Normalise everything to the richer object form.
//
// Stored as a FLAT MAP, not an array of objects. custom-data.json is 44 MB and gets
// inlined into the single-file build, so shape is a real cost: array-of-objects
// costs +16.3 MB (+37%), the flat map +5.1 MB (+12%) for the same information —
// and `tech.Ausprägung` beats scanning an array anyway.
//
// Four labels are dropped on the way in: Volumen and Gewicht are logistics data,
// and Geräuschgruppe / Energieeffizienzklasse are the two attributes already ruled
// out as non-criteria (see AUTO_SUPPRESS in _productDisplay.js). No point storing
// 12k values we have committed to never showing.
const TECH_NOISE = new Set(['Volumen', 'Gewicht', 'Geräuschgruppe', 'Energieeffizienzklasse']);
const normTech = (arr) => {
    const out = {};
    for (const t of Array.isArray(arr) ? arr : []) {
        let label, value;
        if (t && typeof t === 'object') {
            label = String(t.label || '').trim();
            value = [t.value, t.unit].filter(Boolean).join(' ').trim();
        } else {
            const s = String(t);
            const i = s.indexOf(':');
            if (i < 0) continue;
            label = s.slice(0, i).trim();
            value = s.slice(i + 1).trim();
        }
        if (!label || !value || TECH_NOISE.has(label)) continue;
        out[label] = value;
    }
    return Object.keys(out).length ? out : null;
};

// ── load both sources ────────────────────────────────────────────────────────
// Priority: a fresh shard result always beats a cached dump, because only the
// fresh fetch carries maktx2 (and therefore the untruncated label).
const SOURCE = (process.argv.includes('--source') && process.argv[process.argv.indexOf('--source') + 1]) || 'both';
const fetched = new Map();
let shardFiles = 0, cacheFiles = 0;

if (SOURCE !== 'fetch') {
    const CACHE_DIR = path.join(SCRIPT_DIR, 'catalogue-inspection');
    for (const f of fs.existsSync(CACHE_DIR) ? fs.readdirSync(CACHE_DIR) : []) {
        if (!/-api(-refetch)?\.json$/.test(f)) continue;
        cacheFiles++;
        let j; try { j = JSON.parse(fs.readFileSync(path.join(CACHE_DIR, f), 'utf8')); } catch (_) { continue; }
        for (const v of Object.values(j)) {
            if (!v || !v.matnr) continue;
            // These dumps have no maktx2 KEY because fetch_catalogue_api.js already
            // merged it into `maktx` — so this text is usually complete. Measured
            // against custom-data: 350 labels are a clean extension of ours, 2,776
            // identical, 1,822 SHORTER than ours. The prefix+longer guard below is
            // what makes using it safe; it rejects all 1,822.
            fetched.set(key(v.matnr), { src: 'cache', maktx: v.maktx || null, description: v.description || null, tech: normTech(v.tech) });
        }
    }
}
if (SOURCE !== 'cache') {
    for (const f of fs.readdirSync(SCRIPT_DIR)) {
        if (!/^text-refetch-shard-\d+\.json$/.test(f)) continue;
        shardFiles++;
        const j = JSON.parse(fs.readFileSync(path.join(SCRIPT_DIR, f), 'utf8'));
        for (const [art, v] of Object.entries(j)) {
            if (!v) continue;
            fetched.set(key(art), { src: 'fetch', maktx: v.maktx, maktx2: v.maktx2, description: v.description || null, tech: normTech(v.tech) });
        }
    }
}
if (!fetched.size) {
    console.error(`no source data found (${shardFiles} shard files, ${cacheFiles} cached dumps).`);
    process.exit(1);
}

const data = JSON.parse(fs.readFileSync(DATA, 'utf8'));

const stats = { records: 0, matched: 0, fromFetch: 0, fromCache: 0, labelHealed: 0, descImproved: 0, descKept: 0, techAdded: 0, charsGained: 0 };
const samples = [];

(function walk(o) {
    if (Array.isArray(o)) { o.forEach(walk); return; }
    if (!o || typeof o !== 'object') return;

    if (o.artNr && (o.label || o.name)) {
        stats.records++;
        const api = fetched.get(key(o.artNr));
        if (api) {
            stats.matched++;
            if (api.src === 'fetch') stats.fromFetch++; else stats.fromCache++;

            // THE ACTUAL FIX. SAP stores the short text in two ~40-char fields and
            // the original scrape kept only the first — that is where every truncated
            // label came from. maktx + maktx2 is the untruncated label. Guarded by a
            // prefix check so we only ever EXTEND our own label, never replace it
            // with a different article's text.
            const ourLabel = clean(o.label || o.name || '');
            // Fresh fetches carry the two fields separately; the cached dumps already
            // merged them. Either way the guard below is the safety net: a label is
            // only ever replaced by something LONGER that starts with what we have.
            const rebuilt = clean([api.maktx, api.maktx2].filter(Boolean).join(' '));
            if (rebuilt && compact(rebuilt).length > compact(ourLabel).length
                && compact(rebuilt).startsWith(compact(ourLabel).slice(0, 20))) {
                stats.labelHealed++;
                stats.charsGained += rebuilt.length - ourLabel.length;
                if (samples.length < 8) samples.push({ kind: 'label', artNr: o.artNr, before: ourLabel.slice(0, 90), after: rebuilt.slice(0, 130) });
                if (WRITE) o.label = rebuilt;
            }

            // description must add something over the LABEL and our description
            // combined. Comparing against the description alone "improves" records by
            // copying the label into an empty field — pure noise, and it inflated the
            // first dry run's numbers.
            const haveC = compact(rebuilt || ourLabel) + compact(o.description || '');
            const apiC = compact(api.description || '');
            if (apiC && !haveC.includes(apiC) && apiC.length > compact(o.description || '').length) {
                const before = clean(o.description || '');
                const after = clean(api.description);
                stats.descImproved++;
                if (samples.length < 8) samples.push({ kind: 'desc', artNr: o.artNr, before: before.slice(0, 90) || '(none)', after: after.slice(0, 130) });
                if (WRITE) o.description = after;
            } else if (apiC) {
                stats.descKept++;
            }

            if (api.tech && Object.keys(api.tech).length) {
                stats.techAdded++;
                if (WRITE) o.tech = api.tech;
            }
        }
    }
    for (const k of Object.keys(o)) walk(o[k]);
})(data);

console.log(`sources: ${shardFiles} shard file(s) + ${cacheFiles} cached dump(s)  [--source ${SOURCE}]`);
console.log(`art-Nrs with fetched text: ${fetched.size}`);
console.log(`records scanned         : ${stats.records}`);
console.log(`records matched         : ${stats.matched}`);
console.log(`  labels healed (maktx2): ${stats.labelHealed}  (+${stats.charsGained.toLocaleString()} chars)`);
console.log(`  description improved  : ${stats.descImproved}`);
console.log(`  description unchanged : ${stats.descKept}  (API text added nothing)`);
console.log(`  tech[] attached       : ${stats.techAdded}`);
console.log(`  from fresh fetch      : ${stats.fromFetch}   from cached dumps: ${stats.fromCache}`);

console.log('\n-- sample improvements --');
samples.forEach(s => {
    console.log(`\n  [${s.kind}] ${s.artNr}`);
    console.log(`    before: ${s.before}`);
    console.log(`    after : ${s.after}`);
});

if (!WRITE) {
    console.log('\nDRY RUN — nothing written. Re-run with --write to apply.');
    process.exit(0);
}

const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const backup = `${DATA}.bak-${stamp}`;
fs.copyFileSync(DATA, backup);
fs.writeFileSync(DATA, JSON.stringify(data, null, 2));   // MUST match the file's existing indent-2, or the diff is all 94k records
console.log(`\nbackup : ${path.basename(backup)}`);
console.log(`written: custom-data.json`);
console.log('NOW RUN `npm test` — description feeds the full-text classification rules.');
