// ============================================================================
// SCRAPER GUARD — SAP short text is TWO fields (discovered 2026-08-09)
//
// article.ws returns the short text split across `maktx` and `maktx2`, each
// ~40 chars:
//     maktx : "Wandbecken Alterna calea, 45 x 36 cm,"
//     maktx2: "Armaturenloch, mit Überlauf, Weiss"
// Reading only `maktx` yields a label truncated mid-sentence. That is where the
// truncated labels in custom-data.json came from, and it is an easy mistake to
// re-introduce because `maktx` alone looks like a complete field.
//
// This is a STATIC SOURCE GUARD in the style of verify-fulltext-rule.js: any
// scraper line that reads `.maktx` must also mention `maktx2` (directly, or by
// consuming a dump whose producer already merged the two).
// ============================================================================
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DIRS = ['st-scraper', 'st-scraper/catalogue-inspection'];

let passed = 0, failed = 0;
const check = (name, cond, detail) => {
    if (cond) { console.log(`✅ [PASS] ${name}`); passed++; }
    else { console.log(`❌ [FAIL] ${name}${detail ? `\n           ${detail}` : ''}`); failed++; }
};

// Scripts that read the API response directly. Consumers of the already-merged
// cached dumps (inject-*, classify-*) legitimately read a plain `maktx` field.
const API_READERS = [
    'st-scraper/refetch-truncated-text.cjs',
    'st-scraper/refetch-ch6-nulls.cjs',
    'st-scraper/catalogue-inspection/fetch_catalogue_api.js',
    'st-scraper/heal-pool-images.js',
];

for (const rel of API_READERS) {
    const file = path.join(ROOT, rel);
    if (!fs.existsSync(file)) { check(`${rel} exists`, false, 'file missing — update API_READERS'); continue; }
    const src = fs.readFileSync(file, 'utf8');

    // A ±3 line window, not the line itself: a reader may legitimately keep the two
    // fields on adjacent lines (`maktx: r.maktx,` / `maktx2: r.maktx2,`) or guard on
    // one before joining both.
    const lines = src.split('\n');
    const offenders = lines.map((line, i) => ({ line, n: i + 1, i }))
        .filter(({ line }) => /\.maktx\b/.test(line))
        .filter(({ line }) => !/^\s*(\/\/|\*|\/\*)/.test(line))        // comments are fine
        // A bare presence check ("if (r.maktx || r.description)") cannot truncate
        // anything — only a line that PRODUCES a value can.
        .filter(({ line }) => !/^\s*if\s*\(/.test(line))
        .filter(({ line }) => /[:=]|return/.test(line))
        .filter(({ i }) => !lines.slice(Math.max(0, i - 6), i + 7).some(l => /maktx2/.test(l)));

    check(`${rel}: every .maktx read also takes maktx2`,
        offenders.length === 0,
        offenders.map(o => `line ${o.n}: ${o.line.trim().slice(0, 100)}`).join('\n           '));
}

// And the merge itself must survive: joining the two fields is what heals the label.
const merged = fs.readFileSync(path.join(ROOT, 'st-scraper/refetch-truncated-text.cjs'), 'utf8');
check('refetch-truncated-text.cjs still captures maktx2', /maktx2:\s*r\.maktx2/.test(merged));
check('refetch-truncated-text.cjs captures technicalInformations (not the non-existent `tech`)',
    /r\.technicalInformations/.test(merged),
    'the live API field is `technicalInformations`; `tech` exists only in post-processed dumps and silently yields nothing');

console.log('\n--------------------------------------------------');
console.log(`Summary: ${passed} passed, ${failed} failed.`);
console.log('--------------------------------------------------');
if (failed > 0) process.exit(1);
