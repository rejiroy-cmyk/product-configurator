#!/usr/bin/env node
/**
 * localize-bidet-keramik.cjs — pull the Bidet-Keramik thumbnails into public/img.
 *
 * localize-images.cjs is a whole-catalogue pass: it expects vendor URLs and would
 * re-mangle the 23k already-local paths if run again. This does the same job for the
 * one new pool, using the SAME filename convention (localName) and the SAME fetcher
 * (localize_fetch.py), so the result is indistinguishable from the main pipeline.
 *
 * The URLs are DERIVED from the art-Nr, so every one is HEAD-verified before it is
 * fetched — fabricated-URL traffic is what got the account shadow-banned once.
 * A slot whose image does not exist is left empty rather than pointed at a 404.
 *
 * Usage:
 *   node st-scraper/localize-bidet-keramik.cjs            # HEAD-check + emit jobs
 *   python3 st-scraper/localize_fetch.py --jobs st-scraper/bidet-keramik-jobs.json
 *   node st-scraper/localize-bidet-keramik.cjs --rewrite  # point custom-data.json local
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const crypto = require('crypto');

const DIR = __dirname;
const ROOT = path.resolve(DIR, '..');
const DATA = path.join(ROOT, 'custom-data.json');
const OUT_DIR = path.join(ROOT, 'public', 'img');
// Own job file — the main pipeline's localize-jobs.json is tracked and 4.8 MB; don't clobber it.
const JOBS = path.join(DIR, 'bidet-keramik-jobs.json');
const MAP = path.join(DIR, 'bidet-keramik-images.json');
const WIDTH = 200;                 // largest bidet tile is 90 px; 200 covers 2x retina
const CONC = 4;

const REWRITE = process.argv.includes('--rewrite');

const unwrap = (u) => String(u || '').replace(/^https?:\/\//, '');

/** Identical to localize-images.cjs#localName — same files, same names. */
function localName(srcUrl) {
    const bare = unwrap(srcUrl);
    const m = /\/Web\/(PG1|PS1)\/(.+?)\.(png|jpg|jpeg)$/i.exec(bare);
    const bank = m ? m[1] : 'X';
    const base = (m ? m[2] : bare).replace(/[^A-Za-z0-9_.-]/g, '_').slice(0, 60);
    const hash = crypto.createHash('sha1').update(bare).digest('hex').slice(0, 8);
    return `${bank}_${base}_${hash}.webp`;
}

const data = JSON.parse(fs.readFileSync(DATA, 'utf8'));
const trays = (data.bidet_keramik && data.bidet_keramik.trays) || [];
if (!trays.length) { console.error('No bidet_keramik trays — run inject-bidet-keramik.cjs --apply first.'); process.exit(1); }

const HOSTS = ['https://profishop.sanitastroesch.ch/multimedia/Web/PS1/', 'https://profishop.sanitastroesch.ch/multimedia/Web/PG1/'];

/**
 * The shop does not use one filename shape. Most SKUs are <art8>_<finish>_<suffix>.png,
 * but some articles (Duravit Happy D.2) are published as <art8>_<finish>.png and a few
 * as <art8>.png — and either image bank can hold it. Probe the observed shapes in
 * descending specificity and take the first that really exists.
 */
function candidates(artNr) {
    const d = String(artNr || '').replace(/\D/g, '');
    if (d.length < 10) return [];
    const a8 = d.slice(0, -6).padStart(8, '0');
    const fin = d.slice(-6, -3);
    const suf = d.slice(-3);
    const names = [`${a8}_${fin}_${suf}.png`, `${a8}_${fin}.png`, `${a8}.png`];
    return HOSTS.flatMap(h => names.map(n => h + n));
}

// One slot per image position — keyed by art-Nr, so the candidate probe drives the URL
// rather than the (possibly wrong) URL the injector guessed.
const slots = [];
for (const t of trays) {
    slots.push({ artNr: t.artNr, set: (v) => { t.imgUrl = v; } });
    for (const v of (t.variants || [])) slots.push({ artNr: v.artNr, set: (x) => { v.imgUrl = x; } });
}
const arts = [...new Set(slots.map(s => s.artNr))];

// ------------------------------------------------------------------ rewrite pass
if (REWRITE) {
    if (!fs.existsSync(MAP)) { console.error('No map yet — run without --rewrite, then localize_fetch.py.'); process.exit(1); }
    const map = JSON.parse(fs.readFileSync(MAP, 'utf8'));
    let done = 0, blank = 0;
    for (const s of slots) {
        const file = map[s.artNr];
        if (file && fs.existsSync(path.join(OUT_DIR, file))) { s.set('img/' + file); done++; }
        else { s.set(''); blank++; }   // no image is better than a 404 request
    }
    fs.writeFileSync(DATA, JSON.stringify(data, null, 2));
    console.log(`rewritten: ${done} slots -> img/…   left empty: ${blank}`);
    process.exit(0);
}

// ------------------------------------------------------------------ HEAD-check pass
function head(url) {
    return new Promise((resolve) => {
        const req = https.request(url, { method: 'HEAD', timeout: 15000 }, (res) => {
            res.resume();
            const len = parseInt(res.headers['content-length'] || '0', 10);
            resolve(res.statusCode === 200 && len > 100);
        });
        req.on('error', () => resolve(false));
        req.on('timeout', () => { req.destroy(); resolve(false); });
        req.end();
    });
}

(async () => {
    const live = {};       // artNr -> local filename
    const srcOf = {};      // local filename -> the vendor URL it came from
    let i = 0, ok = 0, miss = 0, probes = 0;
    async function worker() {
        while (i < arts.length) {
            const art = arts[i++];
            for (const url of candidates(art)) {
                probes++;
                if (await head(url)) {
                    const file = localName(url);
                    live[art] = file; srcOf[file] = url; ok++;
                    break;
                }
                await new Promise(r => setTimeout(r, 120));   // vendor politeness
            }
            if (!live[art]) miss++;
        }
    }
    await Promise.all(Array.from({ length: CONC }, worker));

    fs.writeFileSync(MAP, JSON.stringify(live, null, 1));
    fs.mkdirSync(OUT_DIR, { recursive: true });
    const jobs = Object.entries(srcOf)
        .filter(([file]) => !fs.existsSync(path.join(OUT_DIR, file)))
        .map(([file, url]) => ({ url, width: WIDTH, file }));
    fs.writeFileSync(JOBS, JSON.stringify(jobs, null, 1));

    console.log(`probed ${probes} URLs for ${arts.length} art-Nrs: ${ok} resolved, ${miss} with no image`);
    console.log(`wrote ${jobs.length} jobs -> st-scraper/bidet-keramik-jobs.json`);
    console.log('next: python3 st-scraper/localize_fetch.py --jobs st-scraper/bidet-keramik-jobs.json');
    console.log('then: node st-scraper/localize-bidet-keramik.cjs --rewrite');
})();
