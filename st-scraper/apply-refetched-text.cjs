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

// ── load every shard result ──────────────────────────────────────────────────
const fetched = new Map();
let shardFiles = 0;
for (const f of fs.readdirSync(SCRIPT_DIR)) {
    if (!/^text-refetch-shard-\d+\.json$/.test(f)) continue;
    shardFiles++;
    const j = JSON.parse(fs.readFileSync(path.join(SCRIPT_DIR, f), 'utf8'));
    for (const [art, v] of Object.entries(j)) if (v) fetched.set(key(art), v);
}
if (!fetched.size) {
    console.error(`no fetched text found (${shardFiles} shard files). Run refetch-truncated-text.cjs first.`);
    process.exit(1);
}

const data = JSON.parse(fs.readFileSync(DATA, 'utf8'));

const stats = { records: 0, matched: 0, labelHealed: 0, descImproved: 0, descKept: 0, techAdded: 0, charsGained: 0 };
const samples = [];

(function walk(o) {
    if (Array.isArray(o)) { o.forEach(walk); return; }
    if (!o || typeof o !== 'object') return;

    if (o.artNr && (o.label || o.name)) {
        stats.records++;
        const api = fetched.get(key(o.artNr));
        if (api) {
            stats.matched++;

            // THE ACTUAL FIX. SAP stores the short text in two ~40-char fields and
            // the original scrape kept only the first — that is where every truncated
            // label came from. maktx + maktx2 is the untruncated label. Guarded by a
            // prefix check so we only ever EXTEND our own label, never replace it
            // with a different article's text.
            const ourLabel = clean(o.label || o.name || '');
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

            if (Array.isArray(api.tech) && api.tech.length) {
                stats.techAdded++;
                if (WRITE) o.tech = api.tech;
            }
        }
    }
    for (const k of Object.keys(o)) walk(o[k]);
})(data);

console.log(`shard files read        : ${shardFiles}`);
console.log(`art-Nrs with fetched text: ${fetched.size}`);
console.log(`records scanned         : ${stats.records}`);
console.log(`records matched         : ${stats.matched}`);
console.log(`  labels healed (maktx2): ${stats.labelHealed}  (+${stats.charsGained.toLocaleString()} chars)`);
console.log(`  description improved  : ${stats.descImproved}`);
console.log(`  description unchanged : ${stats.descKept}  (API text added nothing)`);
console.log(`  tech[] attached       : ${stats.techAdded}`);

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
fs.writeFileSync(DATA, JSON.stringify(data, null, 1));
console.log(`\nbackup : ${path.basename(backup)}`);
console.log(`written: custom-data.json`);
console.log('NOW RUN `npm test` — description feeds the full-text classification rules.');
