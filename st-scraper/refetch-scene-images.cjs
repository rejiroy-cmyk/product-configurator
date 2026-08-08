#!/usr/bin/env node
/**
 * refetch-scene-images.cjs — find real product photos for articles whose thumbnail is
 * a Milieubild (installed-in-a-bathroom scene).
 *
 * WHY: 1,673 Duschtrennwand slots share 12 scene photos — 735 articles show one
 * identical bathroom. Users scan thumbnails before they read labels, so a thumbnail
 * that is the same for 735 products carries no information at all.
 *
 * The candidate list is the whole problem. article.ws returns `image` plus an
 * `images[]` array; the original pipeline picked one by "PG1 before PS1, first HTTP
 * 200 wins" — no notion of whether the photo shows THAT article — and discarded the
 * rest. So we cannot re-rank offline; the alternatives were never stored.
 *
 * This script fixes that permanently: it stores the FULL response per article in
 * scene-candidates.json. Re-ranking later costs nothing and needs no cookie.
 *
 * It only PROPOSES swaps. Nothing is applied and nothing is downloaded here — the
 * proposals go through classify_images.py first, because swapping one scene photo for
 * a different scene photo is not an improvement.
 *
 * AUTH: needs a live SAP session cookie (see profishop-webservice-api notes —
 * without it every call returns status "NOSESSION"). Put it in st-scraper/cookie.txt
 * (gitignored) — do not paste it into a shell command, it lands in shell history.
 *
 * Usage:
 *   node st-scraper/refetch-scene-images.cjs --check       # verify the cookie works
 *   node st-scraper/refetch-scene-images.cjs               # fetch + propose
 *   node st-scraper/refetch-scene-images.cjs --cat duschtrennwand,badeabtrennung
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const DIR = __dirname;
const ROOT = path.resolve(DIR, '..');
const DATA = path.join(ROOT, 'custom-data.json');
const VERDICTS = path.join(DIR, 'image-verdicts.json');
const COOKIE_FILE = path.join(DIR, 'cookie.txt');
const OUT_RAW = path.join(DIR, 'scene-candidates.json');
const OUT_PROPOSAL = path.join(DIR, 'scene-proposals.json');

const HOST = 'profishop.sanitastroesch.ch';
const BASE = '/business(bD1kZSZjPTAwMQ==)/webservices/article.ws';
const CONC = 6;
const CHECK = process.argv.includes('--check');
const catArg = (process.argv.find(a => a.startsWith('--cat=')) || '').split('=')[1];
const CATS = catArg ? catArg.split(',') : ['duschtrennwand', 'badeabtrennung', 'duschenwanne', 'badewanne', 'zubehoer_pool'];

if (!fs.existsSync(COOKIE_FILE)) {
    console.error(`No cookie at ${path.relative(ROOT, COOKIE_FILE)}.`);
    console.error('Open a logged-in profishop tab, run  copy(document.cookie)  in the console,');
    console.error('and save it into that file. It is gitignored.');
    process.exit(1);
}
// Strip # comment lines so the file can carry its own instructions, then join what is
// left — a pasted document.cookie is one long line, but editors love to wrap it.
const cookie = fs.readFileSync(COOKIE_FILE, 'utf8')
    .split('\n').filter(l => !l.trim().startsWith('#')).join(' ')
    .replace(/\s+/g, ' ').trim();

if (!cookie) {
    console.error(`${path.relative(ROOT, COOKIE_FILE)} exists but has no cookie in it yet.`);
    console.error('Paste the value of document.cookie from a logged-in profishop tab, below the comments.');
    process.exit(1);
}

const getJson = (pathname) => new Promise(res => {
    https.get({
        host: HOST, path: pathname, timeout: 25000,
        headers: { Accept: 'application/json', 'User-Agent': 'Mozilla/5.0', Cookie: cookie }
    }, r => {
        let s = '';
        r.on('data', c => s += c);
        r.on('end', () => { try { res(JSON.parse(s)); } catch (_) { res(null); } });
    }).on('error', () => res(null)).on('timeout', function () { this.destroy(); res(null); }).end?.();
});

const detailsUrl = (art) => `${BASE}?event=GET_DETAILS&matnr=${String(art).replace(/[^0-9]/g, '')}&menge=1`;

// ── ranking ───────────────────────────────────────────────────────────────────
const fname = (u) => String(u || '').replace(/^.*\//, '').replace(/\.(png|jpg|jpeg).*$/i, '');
const artTokens = (u) => fname(u).split(/[_-]/).filter(t => /^0?\d{7}$/.test(t));
const isGrouped = (u) => artTokens(u).length >= 2;
const isWebPhoto = (u) => /\/multimedia\/Web\/(PG1|PS1)\//.test(u);
const isNonPhoto = (u) => /\/multimedia\/SAP\/|\/Energieetiketten\//.test(u) || /_nV/.test(u);
const digits = (a) => String(a).replace(/[^0-9]/g, '');

/**
 * Score a candidate for "does this show THIS article, on its own".
 * Higher is better. The old picker had none of this — it ranked PG1 over PS1 and took
 * the first 200, which is how a family scene outranked a per-article photo.
 */
function score(url, art) {
    if (!isWebPhoto(url) || isNonPhoto(url)) return -1;
    const d = digits(art);
    const full = d;                       // 13 digits: article + finish
    const base = d.slice(0, 7);           // model only
    const f = fname(url).replace(/[^0-9]/g, '');
    let s = 0;
    if (f === full || f.startsWith(full)) s += 100;        // exact article AND finish
    else if (fname(url).replace(/^0+/, '').startsWith(base.replace(/^0+/, ''))) s += 60;  // right model
    if (!isGrouped(url)) s += 40;                          // shows one article, not a family
    if (/\/PG1\//.test(url)) s += 5;                       // 600px preferred, but only as a tiebreak
    return s;
}

// ── collect the articles whose current image is a scene ───────────────────────
const data = JSON.parse(fs.readFileSync(DATA, 'utf8'));
const verdicts = fs.existsSync(VERDICTS) ? JSON.parse(fs.readFileSync(VERDICTS, 'utf8')) : {};
const localName = (u) => String(u || '').replace(/^img\//, '');

const targets = new Map();   // artNr -> current img
for (const cat of CATS) {
    if (!data[cat]) continue;
    (function walk(n) {
        if (!n || typeof n !== 'object') return;
        if (Array.isArray(n)) return n.forEach(walk);
        const u = n.imgUrl;
        if (typeof u === 'string' && u.trim() && n.artNr && verdicts[localName(u)] === 'lifestyle') {
            targets.set(n.artNr, u);
        }
        Object.values(n).forEach(walk);
    })(data[cat]);
}

(async () => {
    if (CHECK) {
        const first = [...targets.keys()][0];
        const j = await getJson(detailsUrl(first));
        const status = j && j.status;
        console.log(`cookie check on ${first}: status=${status}`);
        if (status === 'NOSESSION' || !j) {
            console.log('-> cookie is not a valid SAP session. Re-copy it from a logged-in tab.');
            process.exit(1);
        }
        const r = j.result || {};
        console.log(`-> OK. image=${r.image || '(none)'}  images[]=${(r.images || []).length}`);
        process.exit(0);
    }

    console.log(`articles with a scene thumbnail: ${targets.size}`);
    console.log(`categories: ${CATS.join(', ')}\n`);

    const raw = fs.existsSync(OUT_RAW) ? JSON.parse(fs.readFileSync(OUT_RAW, 'utf8')) : {};
    const list = [...targets.keys()].filter(a => !raw[a]);
    console.log(`already cached: ${targets.size - list.length}   to fetch: ${list.length}`);

    let done = 0, nosession = 0;
    const queue = [...list];
    await Promise.all(Array.from({ length: Math.min(CONC, queue.length) }, async () => {
        while (queue.length) {
            if (nosession > 5) return;                 // cookie died — stop, don't hammer
            const art = queue.shift();
            const j = await getJson(detailsUrl(art));
            if (j && j.status === 'NOSESSION') { nosession++; continue; }
            const r = (j && j.result) || {};
            // store EVERYTHING so re-ranking never needs the vendor again
            raw[art] = { image: r.image || null, images: r.images || [] };
            if (++done % 100 === 0) {
                console.log(`  ${done}/${list.length}`);
                fs.writeFileSync(OUT_RAW, JSON.stringify(raw, null, 1));
            }
        }
    }));
    fs.writeFileSync(OUT_RAW, JSON.stringify(raw, null, 1));

    if (nosession > 5) {
        console.error('\nABORTED: session expired (NOSESSION). Refresh cookie.txt and re-run — progress is cached.');
        process.exit(1);
    }

    // ── propose ───────────────────────────────────────────────────────────────
    const proposals = {};
    let better = 0, same = 0, noneAt = 0;
    for (const [art, current] of targets) {
        const rec = raw[art];
        if (!rec) { noneAt++; continue; }
        const cands = [rec.image, ...(rec.images || [])].filter(Boolean)
            .map(u => (/^https?:/.test(u) ? u : 'https://' + HOST + u));
        const ranked = cands.map(u => ({ u, s: score(u, art) })).filter(x => x.s > 0)
            .sort((a, b) => b.s - a.s);
        if (!ranked.length) { noneAt++; continue; }
        const best = ranked[0];
        // only propose something that actually shows this article alone
        if (best.s >= 100 || (best.s >= 60 && !isGrouped(best.u))) { proposals[art] = best.u; better++; }
        else same++;
    }
    fs.writeFileSync(OUT_PROPOSAL, JSON.stringify(proposals, null, 1));

    console.log(`\nper-article candidate found : ${better}`);
    console.log(`only family/scene available : ${same}`);
    console.log(`no usable candidate         : ${noneAt}`);
    console.log(`\nraw responses -> ${path.relative(ROOT, OUT_RAW)}`);
    console.log(`proposals     -> ${path.relative(ROOT, OUT_PROPOSAL)}`);
    console.log('\nNothing applied. Next: download the proposals, run classify_images.py on them,');
    console.log('and only keep the ones that classify as "product".');
})();
