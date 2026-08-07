#!/usr/bin/env node
/**
 * localize-images.cjs — make the configurator independent of the vendor CDN.
 *
 * Today every thumbnail is fetched at runtime from
 *   wsrv.nl  ->  (cache miss)  ->  profishop.sanitastroesch.ch
 * so the app depends on two services nobody here controls, and some tiles pull
 * multi-megabyte print assets to fill a 70x90 px box (the worst is 78 MB).
 *
 * This downloads every distinct image ONCE, resized to display resolution as WebP,
 * into public/ (Vite copies that verbatim into dist/), and rewrites custom-data.json
 * to point at the local copies. After this runs, the app makes no vendor requests.
 *
 * Sizing: the largest standard tile is 90 px, so 200 px covers every one at 2x
 * retina. Only the WC cards render bigger (height:160px, width:100%), so
 * wandklosett/standklosett images are fetched at 600 px instead.
 *
 * Usage:
 *   node st-scraper/localize-images.cjs            # download (resumable; safe to re-run)
 *   node st-scraper/localize-images.cjs --rewrite  # then point custom-data.json at them
 *   node st-scraper/localize-images.cjs --plan     # show what it would do, fetch nothing
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const crypto = require('crypto');

const DIR = __dirname;
const ROOT = path.resolve(DIR, '..');
const DATA = path.join(ROOT, 'custom-data.json');
const OUT_DIR = path.join(ROOT, 'public', 'img');
const MANIFEST = path.join(DIR, 'localized-images.json');

const CONC = 8;
const RETRIES = 3;
const MIN_BYTES = 100;                 // a valid webp thumbnail is never smaller
const BIG_TIER = new Set(['wandklosett', 'standklosett']);   // rendered at 160px+
const WIDTH_DEFAULT = 200;
const WIDTH_BIG = 600;

const REWRITE = process.argv.includes('--rewrite');
const PLAN = process.argv.includes('--plan');

const IMG_KEYS = ['imgUrl', 'mainImgUrl'];

// ── collect every distinct source url, and the widest tier it needs ────────────
const data = JSON.parse(fs.readFileSync(DATA, 'utf8'));

function walk(node, fn) {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) { node.forEach(n => walk(n, fn)); return; }
    fn(node);
    Object.values(node).forEach(v => walk(v, fn));
}

const want = new Map();   // sourceUrl -> width
for (const [category, val] of Object.entries(data)) {
    const width = BIG_TIER.has(category) ? WIDTH_BIG : WIDTH_DEFAULT;
    walk(val, n => {
        for (const k of IMG_KEYS) {
            const u = n[k];
            if (typeof u !== 'string' || !u.trim()) continue;
            want.set(u, Math.max(want.get(u) || 0, width));   // widest wins if shared
        }
    });
}

// custom-data.json is not the only place images live: ~62 vendor URLs are hardcoded
// in the source (accessory fallbacks in _shared.js, the Alterna shower sets, the
// category tiles in apps.js). Some bypass wsrv and hit profishop directly. Collect
// them too, or the app keeps calling the vendor no matter what the data says.
const SOURCE_GLOBS = [
    'modules/data.js', 'modules/apps.js', 'modules/admin.js',
    'modules/rules/linkTape.js', 'modules/rules/linkCarrier.js',
    'modules/factories/_shared.js',
    'modules/factories/createBademischerApp.js',
    'modules/factories/createDuschenmischerApp.js',
];
const VENDOR_RE = /https:\/\/(?:wsrv\.nl\/\?url=)?(?:https?:\/\/)?profishop\.sanitastroesch\.ch\/[^"'`\s)]+/g;
const sourceFiles = SOURCE_GLOBS.filter(f => fs.existsSync(path.join(ROOT, f)));
const sourceUrls = new Set();
for (const rel of sourceFiles) {
    const txt = fs.readFileSync(path.join(ROOT, rel), 'utf8');
    for (const m of txt.match(VENDOR_RE) || []) {
        // skip the derive-helper's template fragment (it ends mid-expression)
        if (/\+$/.test(m) || !/\.(png|jpg|jpeg)$/i.test(m)) continue;
        sourceUrls.add(m);
        want.set(m, Math.max(want.get(m) || 0, WIDTH_DEFAULT));
    }
}

// strip the wsrv wrapper back to the bare vendor path
const unwrap = (u) => {
    const m = /^https:\/\/wsrv\.nl\/\?url=(.*)$/.exec(u);
    const raw = m ? decodeURIComponent(m[1]) : u;
    return raw.replace(/^https?:\/\//, '');
};

// Local filename: readable prefix + hash of the source path.
// The hash is not decoration — 116 basenames exist in BOTH PG1 and PS1, and some
// contain commas/spaces, so sanitising alone would silently merge distinct images.
function localName(srcUrl) {
    const bare = unwrap(srcUrl);
    const m = /\/Web\/(PG1|PS1)\/(.+?)\.(png|jpg|jpeg)$/i.exec(bare);
    const bank = m ? m[1] : 'X';
    const base = (m ? m[2] : bare).replace(/[^A-Za-z0-9_.-]/g, '_').slice(0, 60);
    const hash = crypto.createHash('sha1').update(bare).digest('hex').slice(0, 8);
    return `${bank}_${base}_${hash}.webp`;
}

// Speculative tier. createDuschenmischerApp's _imgDerive fabricates a CDN URL from
// the art-Nr at RENDER time and lets <img onerror> swallow the 404s — live vendor
// traffic, and the exact pattern that got the account shadow-banned. It can't just be
// deleted: tiles that currently show an image would go blank. So resolve every URL it
// could ever emit HERE, once, offline. Whatever resolves becomes a real local file
// baked into the data; whatever 404s stays imageless and shows the local icon. Either
// way no fabricated URL ever leaves a user's browser again.
const deriveBare = (art) => {
    const dg = String(art || '').replace(/[^0-9]/g, '');
    if (dg.length < 12) return '';
    const a = dg.slice(0, dg.length - 6).padStart(8, '0');
    const f = dg.slice(dg.length - 6, dg.length - 3);
    const s = dg.slice(dg.length - 3);
    return `https://profishop.sanitastroesch.ch/multimedia/Web/PG1/${a}_${f}_${s}.png`;
};
//
// IMPORTANT: only guesses ALREADY PROVEN LIVE by a previous HEAD pass are fetched.
// Of the 9,646 URLs the guesser can emit, just 91 are known-200; probing the other
// 9,252 would mean thousands of 404s at the vendor — the precise traffic pattern that
// caused the shadow ban. Those items keep the local icon instead. Never probe here.
const headCache = fs.existsSync(path.join(DIR, 'image-head-cache.json'))
    ? JSON.parse(fs.readFileSync(path.join(DIR, 'image-head-cache.json'), 'utf8'))
    : {};
const knownLive = (u) => headCache[u] && headCache[u].code === 200 && headCache[u].len >= 2000;

const derivedFor = new Map();   // artNr -> speculative url (known-live only)
let skippedUnproven = 0;
walk(data, n => {
    if (!n.artNr || (n.imgUrl && String(n.imgUrl).trim())) return;
    const u = deriveBare(n.artNr);
    if (!u) return;
    if (!knownLive(u)) { skippedUnproven++; return; }
    derivedFor.set(n.artNr, u);
    // set unconditionally: when this image is already referenced under another URL
    // spelling they share one local file, and BOTH spellings must reach the manifest
    // or --rewrite cannot fill the item the guesser was covering.
    want.set(u, Math.max(want.get(u) || 0, WIDTH_DEFAULT));
});
const speculative = new Set(derivedFor.values());

// The same image can be referenced by several URL spellings — wsrv-wrapped in
// custom-data.json, bare-vendor in the source. They unwrap to one bare path, so they
// share one local file. Key the download by target FILE (deduped), and keep a
// separate url -> file map so every spelling gets rewritten.
const urlToFile = new Map();
const jobsByFile = new Map();
for (const [src, width] of want) {
    const file = localName(src);
    urlToFile.set(src, file);
    const prev = jobsByFile.get(file);
    if (!prev) jobsByFile.set(file, { src, width, file });
    else prev.width = Math.max(prev.width, width);
}
const jobs = [...jobsByFile.values()];

// a genuine sha1 collision would silently drop an image — assert against it
const bareSeen = new Map();
for (const j of jobs) {
    const bare = unwrap(j.src);
    if (bareSeen.has(j.file) && bareSeen.get(j.file) !== bare) {
        console.error(`FATAL: hash collision on ${j.file}: ${bareSeen.get(j.file)} vs ${bare}`);
        process.exit(1);
    }
    bareSeen.set(j.file, bare);
}

console.log(`url references         : ${want.size}  (${sourceUrls.size} from source files)`);
console.log(`distinct images        : ${jobs.length}`);
console.log(`  of which speculative : ${jobs.filter(j => speculative.has(j.src)).length}  (guesser URLs proven live; ${skippedUnproven} unproven ones deliberately NOT probed)`);
console.log(`  at ${WIDTH_DEFAULT}px            : ${jobs.filter(j => j.width === WIDTH_DEFAULT).length}`);
console.log(`  at ${WIDTH_BIG}px (WC cards) : ${jobs.filter(j => j.width === WIDTH_BIG).length}`);
console.log(`output dir             : ${path.relative(ROOT, OUT_DIR)}`);

if (PLAN) {
    console.log('\n--plan: nothing fetched. Sample names:');
    jobs.slice(0, 5).forEach(j => console.log(`  ${j.src.replace(/^.*\//, '')}  ->  ${j.file}  (w=${j.width})`));
    process.exit(0);
}

// Hand the work to localize_fetch.py, which downloads from the vendor and resizes
// locally with Pillow. wsrv is no longer in the path (it blocked this IP mid-run),
// so nothing depends on a third-party proxy any more.
if (process.argv.includes('--emit-jobs')) {
    fs.mkdirSync(OUT_DIR, { recursive: true });
    const out = jobs.map(j => ({ url: 'https://' + unwrap(j.src), width: j.width, file: j.file }));
    const p = path.join(DIR, 'localize-jobs.json');
    fs.writeFileSync(p, JSON.stringify(out, null, 1));
    const todo = out.filter(j => !fs.existsSync(path.join(OUT_DIR, j.file)));
    console.log(`\nwrote ${out.length} jobs -> ${path.relative(ROOT, p)}`);
    console.log(`already on disk : ${out.length - todo.length}`);
    console.log(`still to fetch  : ${todo.length}`);
    process.exit(0);
}

fs.mkdirSync(OUT_DIR, { recursive: true });

// ── fetch one image through wsrv, resized ─────────────────────────────────────
function fetchOne(job) {
    const inner = unwrap(job.src);
    const url = `https://wsrv.nl/?url=${encodeURIComponent(inner)}&w=${job.width}&output=webp&q=82&we`;
    return new Promise(resolve => {
        https.get(url, { timeout: 60000, headers: { 'User-Agent': 'Mozilla/5.0' } }, res => {
            if (res.statusCode !== 200) { res.resume(); return resolve({ ok: false, why: 'HTTP ' + res.statusCode }); }
            const chunks = [];
            res.on('data', c => chunks.push(c));
            res.on('end', () => {
                const buf = Buffer.concat(chunks);
                if (buf.length < MIN_BYTES) return resolve({ ok: false, why: 'short ' + buf.length + 'b' });
                resolve({ ok: true, buf });
            });
        }).on('error', e => resolve({ ok: false, why: e.code || 'ERR' }))
            .on('timeout', function () { this.destroy(); resolve({ ok: false, why: 'timeout' }); });
    });
}

(async () => {
    // Build the url -> local-file map from what is actually on disk. Fetching moved to
    // localize_fetch.py (wsrv blocked us mid-run), so the manifest can no longer be a
    // by-product of downloading here — and deriving it from disk is more honest anyway:
    // a URL is only rewritten if its image really exists.
    const manifest = {};
    for (const [url, file] of urlToFile) {
        if (fs.existsSync(path.join(OUT_DIR, file))) manifest[url] = 'img/' + file;
    }
    fs.writeFileSync(MANIFEST, JSON.stringify(manifest, null, 1));
    const failures = [];
    let done = 0, fetched = 0, skipped = 0, bytes = 0;
    const started = process.hrtime.bigint();

    if (!REWRITE) {
        const queue = [...jobs];
        await Promise.all(Array.from({ length: CONC }, async () => {
            while (queue.length) {
                const job = queue.shift();
                const dest = path.join(OUT_DIR, job.file);

                // resumable: an already-downloaded file is never re-fetched
                if (fs.existsSync(dest) && fs.statSync(dest).size >= MIN_BYTES) {
                    bytes += fs.statSync(dest).size;
                    skipped++; done++;
                    continue;
                }

                let res = null;
                for (let attempt = 1; attempt <= RETRIES; attempt++) {
                    res = await fetchOne(job);
                    if (res.ok) break;
                    await new Promise(r => setTimeout(r, 400 * attempt));
                }

                if (res.ok) {
                    fs.writeFileSync(dest, res.buf);
                    bytes += res.buf.length;
                    fetched++;
                } else {
                    failures.push({ src: job.src, why: res.why, speculative: speculative.has(job.src) });
                }
                done++;

                if (done % 250 === 0) {
                    const secs = Number(process.hrtime.bigint() - started) / 1e9;
                    const rate = done / secs;
                    const eta = Math.round((jobs.length - done) / rate / 60);
                    console.log(`  ${done}/${jobs.length}  (${fetched} new, ${skipped} cached, ${failures.length} failed)  ${(bytes / 1048576).toFixed(0)} MB  ~${eta} min left`);
                }
            }
        }));

        // manifest maps EVERY url spelling to its local file, but only where the
        // file actually landed on disk — a failed download must stay remote.
        for (const [url, file] of urlToFile) {
            if (fs.existsSync(path.join(OUT_DIR, file))) manifest[url] = 'img/' + file;
        }
        fs.writeFileSync(MANIFEST, JSON.stringify(manifest, null, 1));
        const realFail = failures.filter(f => !f.speculative);
        const specFail = failures.filter(f => f.speculative);
        console.log(`\ndownloaded : ${fetched}`);
        console.log(`from cache : ${skipped}`);
        console.log(`total size : ${(bytes / 1048576).toFixed(1)} MB`);
        console.log(`failed     : ${realFail.length} real${specFail.length ? `  (+${specFail.length} speculative, expected — those items keep the local icon)` : ''}`);
        if (failures.length) {
            fs.writeFileSync(path.join(DIR, 'localize-failures.json'), JSON.stringify(failures, null, 2));
            console.log(`  (detail in st-scraper/localize-failures.json)`);
            realFail.slice(0, 8).forEach(f => console.log(`   ${f.why}  ${f.src.replace(/^.*\//, '')}`));
        }
        console.log('\nNow run with --rewrite to point custom-data.json at these files.');
        return;
    }

    // ── --rewrite: repoint the data AND the source at the local copies ────────
    let repointed = 0, left = 0, filled = 0, stillBlank = 0;
    walk(data, n => {
        for (const k of IMG_KEYS) {
            const u = n[k];
            if (typeof u !== 'string' || !u.trim()) continue;
            if (manifest[u]) { n[k] = manifest[u]; repointed++; }
            else if (/^https?:/.test(u)) left++;
        }
        // bake the resolved guesses in, so the runtime guesser can be deleted
        if (n.artNr && !(n.imgUrl && String(n.imgUrl).trim())) {
            const spec = derivedFor.get(n.artNr);
            if (spec && manifest[spec]) { n.imgUrl = manifest[spec]; filled++; }
            else if (spec) stillBlank++;
        }
    });
    fs.writeFileSync(DATA, JSON.stringify(data, null, 2));
    console.log(`custom-data.json  : ${repointed} repointed, ${left} still remote`);
    console.log(`guesser replaced  : ${filled} items gained a real local image, ${stillBlank} keep the local icon`);

    let srcRepointed = 0, srcLeft = 0;
    for (const rel of sourceFiles) {
        const abs = path.join(ROOT, rel);
        const before = fs.readFileSync(abs, 'utf8');
        const after = before.replace(VENDOR_RE, (m) => {
            if (/\+$/.test(m) || !/\.(png|jpg|jpeg)$/i.test(m)) return m;
            if (manifest[m]) { srcRepointed++; return manifest[m]; }
            srcLeft++; return m;
        });
        if (after !== before) fs.writeFileSync(abs, after);
    }
    console.log(`source files      : ${srcRepointed} repointed, ${srcLeft} still remote`);
})();
