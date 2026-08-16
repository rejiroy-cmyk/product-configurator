#!/usr/bin/env node
/**
 * localize-ch3.cjs — pull the Chapter 3 thumbnails into public/img.
 *
 * Same job, same filename convention and same fetcher (localize_fetch.py) as the
 * whole-catalogue localize-images.cjs, but scoped to the trays inject-ch3.cjs added
 * (id `ch3_*`) so the 23k already-local paths are never re-mangled.
 *
 * Every URL is HEAD-verified before it is fetched — fabricated-URL traffic is what
 * got the account shadow-banned once. A slot whose image does not exist is left
 * empty rather than pointed at a 404.
 *
 * Usage:
 *   node st-scraper/localize-ch3.cjs             # HEAD-check + emit jobs
 *   python3 st-scraper/localize_fetch.py --jobs st-scraper/ch3-jobs.json
 *   node st-scraper/localize-ch3.cjs --rewrite   # point custom-data.json local
 */
'use strict';
const fs = require('fs');
const path = require('path');
const https = require('https');
const crypto = require('crypto');
// custom-data.json is stored INTERNED (repeated mountingMaterials options and
// services live once in a shared table) — readData/writeData hide that. Reading it
// with fs directly yields the STRING "o412" where an option object is expected.
const { readData, writeData } = require('./_dataFile.cjs');

const DIR = __dirname;
const ROOT = path.resolve(DIR, '..');
const DATA = path.join(ROOT, 'custom-data.json');
const OUT_DIR = path.join(ROOT, 'public', 'img');
const JOBS = path.join(DIR, 'ch3-jobs.json');
const MAP = path.join(DIR, 'ch3-images.json');
const WIDTH = 200;                 // the gallery thumbnail is 70x90; 200 covers 2x retina
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

const data = readData();
const POOLS = ['waschtisch', 'wandklosett', 'standklosett', 'urinoir', 'zubehoer_pool'];

// One slot per image position, keyed by art-Nr. The tray carries the API's own URL;
// variants carry none, so the art-Nr probe supplies theirs.
const slots = [];
for (const key of POOLS) {
    for (const t of ((data[key] && data[key].trays) || [])) {
        if (!String(t.id || '').startsWith('ch3_')) continue;
        slots.push({ artNr: t.artNr, url: /^https?:/.test(t.imgUrl || '') ? t.imgUrl : '', set: (v) => { t.imgUrl = v; } });
        for (const v of (t.variants || [])) slots.push({ artNr: v.artNr, url: '', set: (x) => { v.imgUrl = x; } });
    }
}
if (!slots.length) { console.error('No ch3_* trays — run inject-ch3.cjs --apply first.'); process.exit(1); }

const HOSTS = ['https://profishop.sanitastroesch.ch/multimedia/Web/PS1/', 'https://profishop.sanitastroesch.ch/multimedia/Web/PG1/'];

/**
 * The shop does not use one filename shape: most SKUs are <art8>_<finish>_<suffix>.png,
 * some are <art8>_<finish>.png and a few <art8>.png — in either image bank. Probe in
 * descending specificity, starting with the URL the API itself returned for this article.
 */
function candidates(artNr, apiUrl) {
    const d = String(artNr || '').replace(/\D/g, '');
    const list = apiUrl ? [apiUrl] : [];
    if (d.length < 10) return list;
    const a8 = d.slice(0, -6).padStart(8, '0');
    const names = [`${a8}_${d.slice(-6, -3)}_${d.slice(-3)}.png`, `${a8}_${d.slice(-6, -3)}.png`, `${a8}.png`];
    for (const h of HOSTS) for (const n of names) { const u = h + n; if (!list.includes(u)) list.push(u); }
    return list;
}

// one probe per art-Nr, not per slot (the same SKU can appear in several pools)
const byArt = new Map();
for (const s of slots) if (!byArt.has(s.artNr) || (s.url && !byArt.get(s.artNr))) byArt.set(s.artNr, s.url);
const arts = [...byArt.keys()];

// ------------------------------------------------------------------ rewrite pass
if (REWRITE) {
    if (!fs.existsSync(MAP)) { console.error('No map yet — run without --rewrite, then localize_fetch.py.'); process.exit(1); }
    const map = JSON.parse(fs.readFileSync(MAP, 'utf8'));
    let done = 0, blank = 0;
    for (const s of slots) {
        const file = map[s.artNr];
        if (file && fs.existsSync(path.join(OUT_DIR, file))) { s.set('img/' + file); done++; }
        else { s.set(''); blank++; }   // no image is better than a request that 404s
    }
    writeData(data, { backup: false });
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
            for (const url of candidates(art, byArt.get(art))) {
                probes++;
                if (await head(url)) { const file = localName(url); live[art] = file; srcOf[file] = url; ok++; break; }
                await new Promise(r => setTimeout(r, 120));   // vendor politeness
            }
            if (!live[art]) miss++;
            if ((ok + miss) % 100 === 0) console.log(`  … ${ok + miss}/${arts.length} probed (${ok} resolved)`);
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
    console.log(`wrote ${jobs.length} jobs -> st-scraper/ch3-jobs.json`);
    console.log('next: python3 st-scraper/localize_fetch.py --jobs st-scraper/ch3-jobs.json');
    console.log('then: node st-scraper/localize-ch3.cjs --rewrite');
})();
