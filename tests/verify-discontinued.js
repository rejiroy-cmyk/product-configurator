// ============================================================================
// NICHT MEHR LIEFERBAR — the discontinued layer  (2026-08-22)
//
// The catalogue moves weekly and nothing in this repo noticed: every injector is
// a one-shot chapter import, so a dropped article stayed orderable forever. The
// first census found 143 of them. st-scraper/flag-discontinued.cjs writes the
// verdict to ONE top-level map, `custom-data.json._discontinued`, keyed by art-Nr.
//
// THE INVARIANTS THIS EXISTS FOR
//
//   1. KEYED, NOT PER-RECORD. The same art-Nr is a tray here, a variant there, an
//      interned mountingMaterials option in a third place. 143 articles are ~400
//      records; marking them individually means missing one, and a missed one is
//      invisible until an order bounces.
//   2. NOTHING IS DELETED. A dropped article stays configurable — a Stückliste
//      written last month must still open. The app warns; it does not amputate.
//   3. THE COPY IS GUARDED. The Stückliste reaching SAP is the whole point. There
//      is exactly one window.copyTextToClipboard and the guard lives in it, so a
//      new configurator inherits it — the same reason the Mengen dialog sits there.
//   4. ONE OBSERVER, KEYED ON `window`. _shared.js is evaluated more than once
//      under Vite's ?v=/?t= URLs; a module-level flag is per instance and two
//      observers append every warning twice.
//   5. THE FLAG IS EARNED. Absence from the census alone is not a verdict — the
//      shop's own search has to agree. Testing article.ws's `image` instead once
//      cleared 45 articles as alive whose bases the shop answers with 0 hits.
//
// COST: custom-data.json is ~36 MB interned. Read and expand it ONCE.
// ============================================================================
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const require = createRequire(import.meta.url);
const { readData } = require('../st-scraper/_dataFile.cjs');
const { ourArticles } = require('../st-scraper/_ourArticles.cjs');

let passed = 0, failed = 0;
const check = (name, cond, detail) => {
    if (cond) { console.log(`✅ [PASS] ${name}`); passed++; }
    else { console.log(`❌ [FAIL] ${name}${detail ? `\n     ${detail}` : ''}`); failed++; }
};
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

const sharedSrc = read('modules/factories/_shared.js');
const appSrc = read('app.js');
const flagSrc = read('st-scraper/flag-discontinued.cjs');
const cssSrc = read('index.css');
const data = readData();
const disc = data._discontinued || {};
const arts = Object.keys(disc);

// ---------------------------------------------------------------- the data
console.log('\n── die Liste ──');
check('_discontinued is a top-level map on custom-data.json',
    disc && typeof disc === 'object' && !Array.isArray(disc),
    'per-record flags would be ~400 edits with one silently missed');
check(`it holds articles (${arts.length})`, arts.length > 0);

const ART = /^\d{4} \d{3}\.\d{3}\.\d{3}$/;
check('every key is a real art-Nr', arts.every(a => ART.test(a)),
    arts.filter(a => !ART.test(a)).slice(0, 4).join(', '));

const WHY = new Set(['purged', 'base-gone', 'variant-gone']);
check('every entry states WHY, from the closed set',
    arts.every(a => WHY.has(disc[a].why)),
    'purged | base-gone | variant-gone — anything else means the verifier guessed');
check('every entry carries a date it was first seen gone',
    arts.every(a => /^\d{4}-\d{2}-\d{2}$/.test(disc[a].since || '')),
    'since must survive a re-run, or the age of a problem is unknowable');
check('every entry names the pools it can still be ordered from',
    arts.every(a => Array.isArray(disc[a].pools) && disc[a].pools.length));

// The list must describe THIS data, not a stale export.
const ours = ourArticles(data);
const orphan = arts.filter(a => !ours.has(a));
check('every flagged art-Nr is actually reachable in the app',
    orphan.length === 0,
    `${orphan.length} flagged but unreachable — the list is describing data that is gone: ${orphan.slice(0, 3).join(', ')}`);

// NOTHING IS DELETED — invariant 2.
check('flagged articles are still present in the catalogue data',
    arts.every(a => ours.has(a)),
    'a dropped article stays configurable; an old Stückliste has to open');

const withSiblings = arts.filter(a => Array.isArray(disc[a].siblings) && disc[a].siblings.length);
check(`a replaced finish carries its surviving siblings (${withSiblings.length})`,
    arts.filter(a => disc[a].why === 'variant-gone').every(a => Array.isArray(disc[a].siblings)),
    'variant-gone means the base lives on — the survivors are the successor candidates');
check('no article lists ITSELF as its own successor',
    withSiblings.every(a => !(disc[a].siblings || []).includes(a)));

// ---------------------------------------------------------------- the runtime
console.log('\n── die Anzeige ──');
check('the map is published on window from applyDataToApps',
    /window\.__discontinued\s*=\s*data\._discontinued/.test(appSrc),
    'that one line covers all three load paths — /api/data, the gz blob, IndexedDB');
check('the lookup reads window, not an import',
    /const discMap = \(\) =>[\s\S]{0,120}window\.__discontinued/.test(sharedSrc),
    'app.js does not import _shared.js — window is the bus');
check('isDiscontinued / discontinuedNote / markDiscontinued are exported',
    /isDiscontinued, discontinuedInfo, discontinuedIn, discontinuedNote, markDiscontinued/.test(sharedSrc));

// INVARIANT 4 — the singleton must be keyed on window.
check('the observer guard is keyed on window, not a module-level let',
    /window\.__discWatchInstalled/.test(sharedSrc) && !/^\s*let\s+discWatchInstalled/m.test(sharedSrc),
    '_shared.js is evaluated once per ?v=/?t= URL; a module flag installs N observers');
check('the decorator is idempotent',
    /if \(el\.classList\.contains\('is-discontinued'\)\) return/.test(sharedSrc),
    'it runs on every mutation — re-marking would append the warning again and again');
check('a render error can never break the app',
    /catch \(e\) \{ \/\* never break a render \*\/ \}/.test(sharedSrc));

check('the BOM art-Nr cell is decorated',
    /\.bom-code, \.finish-artnr/.test(sharedSrc));
check('dropdown options are decorated too',
    /querySelectorAll\('select option'\)/.test(sharedSrc),
    'a dead article must be visible BEFORE it is picked, not only after');
check('the mark is styled in index.css',
    /\.bom-code\.is-discontinued/.test(cssSrc) && /bom-row-discontinued/.test(cssSrc));
check('the row is struck through, not hidden',
    /text-decoration: line-through/.test(cssSrc) && !/\.bom-row-discontinued\s*\{[^}]*display:\s*none/.test(cssSrc),
    'hiding the row makes an old Stückliste unreadable instead of fixable');

// ---------------------------------------------------------------- the export
console.log('\n── der SAP-Export ──');
const copyFn = sharedSrc.slice(sharedSrc.indexOf('window.copyTextToClipboard = function'));
check('the guard sits inside window.copyTextToClipboard',
    /discontinuedIn\(text\)/.test(copyFn.slice(0, 1400)),
    'one definition, one guard — every one of the fourteen copy paths funnels through it');
check('a cancelled warning resolves null, not an empty string',
    /return Promise\.resolve\(null\)/.test(copyFn.slice(0, 1400)),
    'null is the existing "stay silent" contract; "" would print an empty Kopiert-Alert');
check('the copy is warned, never blocked',
    /Trotzdem kopieren\?/.test(copyFn.slice(0, 1400)),
    'only the person quoting can decide the replacement');
check('the guard runs BEFORE the Mengen dialog',
    copyFn.indexOf('discontinuedIn(text)') < copyFn.indexOf('askCopyFactor'),
    'asking for a quantity first and then refusing the article wastes the answer');

// ---------------------------------------------------------------- the verifier
console.log('\n── die Prüfung ──');
check('the census alone is not the verdict — the shop search corroborates',
    /baseListed/.test(flagSrc) && /Suchergebnisse/.test(flagSrc));
check('the image test is documented as WRONG, so nobody re-adds it',
    /DO NOT go back to testing `article\.ws result\.image`/.test(flagSrc),
    'it cleared 45 articles as alive whose bases the shop answers with 0 hits');
check('the list is rebuilt whole, so a re-listed article loses its flag',
    /Idempotent and self-healing/.test(flagSrc) && /delete data\._discontinued/.test(flagSrc));
check('`since` survives a re-run',
    /\(prev\[art\] && prev\[art\]\.since\) \|\| STAMP/.test(flagSrc));
check('the search is cached per BASE, not per art-Nr',
    /searchCache/.test(flagSrc),
    'a dropped finish range is a dozen art-Nrs behind one product page');
check('the writer goes through writeData (interning + backup + indent 2)',
    /writeData\(data\)/.test(flagSrc) && !/fs\.writeFileSync\([^)]*custom-data/.test(flagSrc));
check('it is a dry run unless --write is given',
    /const WRITE = process\.argv\.includes\('--write'\)/.test(flagSrc));
check('the walk is shared with catalog-diff, not copied',
    /require\('\.\/_ourArticles\.cjs'\)/.test(flagSrc)
    && /require\('\.\/_ourArticles\.cjs'\)/.test(read('st-scraper/catalog-diff.cjs')),
    'every filter in this toolkit that was copied instead of imported has drifted');

console.log('\n' + '='.repeat(60));
console.log(`Ergebnis: ${passed} bestanden, ${failed} fehlgeschlagen`);
console.log('='.repeat(60));
process.exit(failed ? 1 : 0);
