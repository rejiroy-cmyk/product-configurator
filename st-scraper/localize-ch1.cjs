#!/usr/bin/env node
/**
 * localize-ch1.cjs — pull the Ch1/Ch8 thumbnails into public/img.
 *
 * Same job, filename convention and fetcher (localize_fetch.py) as localize-ch3.cjs,
 * but scoped by URL rather than by id prefix: every slot in the app whose imgUrl is
 * still REMOTE. That covers inject-ch1a/ch1b/ch8 in one pass and cannot miss a record
 * because its id happened not to match a prefix.
 *
 * It also probes slots that have NO url at all but belong to the new injections — the
 * 51 products recovered from the scrape arrived imageless because the scrape carries
 * no image URL, and the art-Nr probe is exactly how those get one.
 *
 * Every URL is HEAD-verified before it is fetched. Fabricated-URL traffic is what got
 * the account shadow-banned once, so a slot whose image does not exist is left EMPTY
 * rather than pointed at a 404.
 *
 * Usage:
 *   node st-scraper/localize-ch1.cjs             # HEAD-check + emit jobs
 *   python3 st-scraper/localize_fetch.py --jobs st-scraper/ch1-img-jobs.json
 *   node st-scraper/localize-ch1.cjs --rewrite   # point custom-data.json local
 */
'use strict';
const fs = require('fs');
const path = require('path');
const https = require('https');
const crypto = require('crypto');

const DIR = __dirname;
const ROOT = path.resolve(DIR, '..');
const DATA = path.join(ROOT, 'custom-data.json');
const OUT_DIR = path.join(ROOT, 'public', 'img');
const JOBS = path.join(DIR, 'ch1-img-jobs.json');
const MAP = path.join(DIR, 'ch1-images.json');
const WIDTH = 200;                 // gallery thumbnail is 70x90; 200 covers 2x retina
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
const isRemote = (u) => /^https?:/i.test(String(u || ''));
const NEW_ID = /^(ch1_|ch1b_|ch8_|ch7_)/;

// One slot per image position. Two reasons a slot qualifies:
//   remote  — an injected vendor URL that must come local
//   blank   — a record from one of the new injections with no image at all
const slots = [];
const consider = (obj, owner) => {
    if (!obj) return;
    if (isRemote(obj.imgUrl) || (!obj.imgUrl && NEW_ID.test(String(owner || '')))) {
        slots.push({ artNr: obj.artNr, url: isRemote(obj.imgUrl) ? obj.imgUrl : '', set: (v) => { obj.imgUrl = v; } });
    }
};
for (const key of Object.keys(data)) {
    const pool = data[key]; if (!pool) continue;
    for (const lk of ['trays', 'parts']) for (const t of (pool[lk] || [])) {
        const owner = t.id || '';
        consider(t, owner);
        for (const v of (t.variants || [])) consider(v, owner);
        for (const m of (t.mountingMaterials || [])) for (const o of (m.options || [])) consider(o, m.id || owner);
    }
}
if (!slots.length) { console.error('Nothing to localize — no remote or blank new-injection slots.'); process.exit(1); }

const HOSTS = ['https://profishop.sanitastroesch.ch/multimedia/Web/PS1/', 'https://profishop.sanitastroesch.ch/multimedia/Web/PG1/'];

/**
 * The shop does not use one filename shape: most SKUs are <art8>_<finish>_<suffix>.png,
 * some <art8>_<finish>.png and a few <art8>.png, in either bank. Probe in descending
 * specificity, starting with the URL the API itself returned for this article.
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

const byArt = new Map();
for (const s of slots) if (!byArt.has(s.artNr) || (s.url && !byArt.get(s.artNr))) byArt.set(s.artNr, s.url);
const arts = [...byArt.keys()].filter(Boolean);

// ------------------------------------------------------------------ rewrite pass
if (REWRITE) {
    if (!fs.existsSync(MAP)) { console.error('No map yet — run without --rewrite, then localize_fetch.py.'); process.exit(1); }
    const map = JSON.parse(fs.readFileSync(MAP, 'utf8'));
    let done = 0, blank = 0;
    for (const s of slots) {
        const file = map[s.artNr];
        if (file && fs.existsSync(path.join(OUT_DIR, file))) { s.set('img/' + file); done++; }
        else { s.set(''); blank++; }   // no image beats a request that 404s
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
    console.log(`slots needing an image: ${slots.length}  (distinct art-Nrs: ${arts.length})`);
    const live = {}, srcOf = {};
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
            if ((ok + miss) % 200 === 0) console.log(`  … ${ok + miss}/${arts.length} probed (${ok} resolved)`);
        }
    }
    await Promise.all(Array.from({ length: CONC }, worker));

    fs.writeFileSync(MAP, JSON.stringify(live, null, 1));
    fs.mkdirSync(OUT_DIR, { recursive: true });
    const jobs = Object.entries(srcOf)
        .filter(([file]) => !fs.existsSync(path.join(OUT_DIR, file)))
        .map(([file, url]) => ({ url, width: WIDTH, file }));
    fs.writeFileSync(JOBS, JSON.stringify(jobs, null, 1));

    console.log(`\nprobed ${probes} URLs for ${arts.length} art-Nrs: ${ok} resolved, ${miss} with no image`);
    console.log(`${jobs.length} new files to fetch (${Object.keys(srcOf).length - jobs.length} already in public/img)`);
    console.log('next: python3 st-scraper/localize_fetch.py --jobs st-scraper/ch1-img-jobs.json');
    console.log('then: node st-scraper/localize-ch1.cjs --rewrite');
})();
