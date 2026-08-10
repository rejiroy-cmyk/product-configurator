/**
 * apply-divergent-labels.cjs
 * ---------------------------------------------------------------------------
 * Applies the labels in `label-divergent-review.json` — the cases where SAP's
 * text is RICHER but is not an extension of what we hold, so the prefix guard in
 * apply-refetched-text.cjs (correctly) refused them:
 *
 *     now: "Sifon Gessi (Farbe 149)"          <- script-generated placeholder
 *     sap: "Siphon Gessi, 1¼" x 32 mm, …"     <- the real article name
 *
 * These need a human decision, which is why they are a separate, explicit step
 * rather than part of the automatic merge.
 *
 * Checked before writing (2026-08-10):
 *   · none of the 57 art-Nrs are hard-coded in app code — `sLabelMap` in
 *     createMixAndMatchApp is keyed by art-Nr and none of them appear there;
 *   · createRelationalApp:1409 sorts on `mat.name`, not the product label;
 *   · createRelationalApp:262 matches `label.includes('siphon')` — with "ph".
 *     The placeholders spell it "Sifon", so they currently MISS that rule and
 *     will start matching it. For a siphon, classifying as 'common' is the
 *     correct outcome; this fixes a latent miss rather than causing one.
 *
 * DRY RUN BY DEFAULT. `--write` applies, backing up first.
 */
'use strict';
const fs = require('fs');
const path = require('path');

const SCRIPT_DIR = path.dirname(fs.realpathSync(__filename));
const ROOT = path.resolve(SCRIPT_DIR, '..');
const DATA = path.join(ROOT, 'custom-data.json');
const REVIEW = path.join(SCRIPT_DIR, 'label-divergent-review.json');
const WRITE = process.argv.includes('--write');

if (!fs.existsSync(REVIEW)) {
    console.error('no label-divergent-review.json — regenerate it from the shard results first.');
    process.exit(1);
}
const rows = JSON.parse(fs.readFileSync(REVIEW, 'utf8'));
const want = new Map(rows.map(r => [String(r.artNr).replace(/[^0-9]/g, ''), r]));

const clean = (s) => String(s == null ? '' : s).replace(/\s+/g, ' ').trim();
const data = JSON.parse(fs.readFileSync(DATA, 'utf8'));

let records = 0, changed = 0, skipped = 0;
const samples = [];

(function walk(o) {
    if (Array.isArray(o)) { o.forEach(walk); return; }
    if (!o || typeof o !== 'object') return;
    if (o.artNr && (o.label || o.name)) {
        records++;
        const r = want.get(String(o.artNr).replace(/[^0-9]/g, ''));
        if (r) {
            const cur = clean(o.label || o.name);
            // Only replace the exact placeholder the review captured. If this record
            // carries some other label, a different pass already improved it and we
            // must not clobber that.
            if (cur === clean(r.current)) {
                changed++;
                if (samples.length < 5) samples.push({ artNr: o.artNr, before: cur, after: r.sap });
                if (WRITE) o.label = r.sap;
            } else {
                skipped++;
            }
        }
    }
    for (const k of Object.keys(o)) walk(o[k]);
})(data);

console.log(`review entries      : ${rows.length}`);
console.log(`records scanned     : ${records}`);
console.log(`records to relabel  : ${changed}`);
console.log(`skipped (label moved on since the review): ${skipped}`);
samples.forEach(s => console.log(`\n  ${s.artNr}\n    before: ${s.before}\n    after : ${s.after}`));

if (!WRITE) { console.log('\nDRY RUN — nothing written. Re-run with --write to apply.'); process.exit(0); }

const stamp = new Date().toISOString().replace(/[:.]/g, '-');
fs.copyFileSync(DATA, `${DATA}.bak-${stamp}`);
fs.writeFileSync(DATA, JSON.stringify(data, null, 2));   // indent 2 — must match the file
console.log(`\nbackup : custom-data.json.bak-${stamp}`);
console.log('written: custom-data.json — now run `npm test`.');
