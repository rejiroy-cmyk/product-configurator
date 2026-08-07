#!/usr/bin/env node
/**
 * revalidate-colourcode-images.cjs
 *
 * Narrow companion to revalidate-images.cjs.
 *
 * `_100_000` / `_000_000` are NOT placeholders — they are the colour-code half of
 * the art-Nr (`.100.000` -> `_100_000`). An old assumption that they were 404s put
 * them in PLACEHOLDER_IMG in modules/factories/_shared.js, so isRealImg() discarded
 * them and ~7.5k HEAD-verified product photos never reached an <img> tag.
 *
 * Before that guard entry can be removed, every colour-code URL in custom-data.json
 * must be proven live — shipping a 404 back into the app is what got the account
 * shadow-banned. This script HEAD-checks them all (reusing image-head-cache.json,
 * so only genuinely unknown URLs hit the network) and blanks the dead ones to ''.
 *
 * Usage:  node st-scraper/revalidate-colourcode-images.cjs [--dry]
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const DIR = __dirname;
const DATA = path.resolve(DIR, '..', 'custom-data.json');
const HEAD_CACHE = path.resolve(DIR, 'image-head-cache.json');
const HOST = 'profishop.sanitastroesch.ch';
const ORIGIN = 'https://' + HOST;

const CONC = 6;
const MIN_BYTES = 2000;          // same threshold as revalidate-images.cjs
const DRY = process.argv.includes('--dry');

// The two patterns being cleared from PLACEHOLDER_IMG.
const COLOUR_CODE = ['_100_000', '_000_000'];
const isColourCode = u => COLOUR_CODE.some(s => u.includes(s));

// custom-data.json stores wsrv-proxied URLs; the head cache is keyed by the raw
// vendor URL. Unwrap for lookup and for the HEAD request itself.
const unwrap = (u) => {
    const m = /^https:\/\/wsrv\.nl\/\?url=(.*)$/.exec(u);
    const raw = m ? m[1] : u;
    return /^https?:\/\//.test(raw) ? raw : 'https://' + raw;
};

const headCache = fs.existsSync(HEAD_CACHE) ? JSON.parse(fs.readFileSync(HEAD_CACHE, 'utf8')) : {};

function head(rawUrl) {
    const p = encodeURI(rawUrl.replace(ORIGIN, ''));
    return new Promise(res => {
        https.request({
            host: HOST, path: p, method: 'HEAD', timeout: 12000,
            headers: { 'User-Agent': 'Mozilla/5.0' }
        }, r => { res({ code: r.statusCode, len: +(r.headers['content-length'] || 0) }); r.resume(); })
            .on('error', () => res({ code: 0, len: 0 }))
            .on('timeout', function () { this.destroy(); res({ code: 0, len: 0 }); })
            .end();
    });
}

const isLive = r => !!r && r.code === 200 && r.len >= MIN_BYTES;

// ── 1. collect every distinct colour-code URL in the data ─────────────────────
const data = JSON.parse(fs.readFileSync(DATA, 'utf8'));
const urls = new Set();
const IMG_KEYS = ['imgUrl', 'mainImgUrl'];

function walk(node, fn) {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) { node.forEach(n => walk(n, fn)); return; }
    fn(node);
    Object.values(node).forEach(v => walk(v, fn));
}

walk(data, n => {
    for (const k of IMG_KEYS) {
        const u = n[k];
        if (typeof u === 'string' && u.trim() && isColourCode(u)) urls.add(u);
    }
});

const all = [...urls];
const uncached = all.filter(u => !headCache[unwrap(u)]);
console.log(`distinct colour-code URLs : ${all.length}`);
console.log(`already HEAD-cached       : ${all.length - uncached.length}`);
console.log(`need a network check      : ${uncached.length}`);

// ── 2. HEAD-check whatever the cache does not know ────────────────────────────
(async () => {
    let done = 0;
    const queue = [...uncached];
    await Promise.all(Array.from({ length: Math.min(CONC, queue.length) }, async () => {
        while (queue.length) {
            const u = queue.shift();
            const raw = unwrap(u);
            headCache[raw] = await head(raw);
            if (++done % 10 === 0 || done === uncached.length) {
                process.stdout.write(`\r  checked ${done}/${uncached.length}`);
            }
        }
    }));
    if (uncached.length) process.stdout.write('\n');
    if (!DRY) fs.writeFileSync(HEAD_CACHE, JSON.stringify(headCache));

    // ── 3. split live vs dead ─────────────────────────────────────────────────
    const dead = new Set();
    let live = 0;
    for (const u of all) {
        if (isLive(headCache[unwrap(u)])) live++;
        else dead.add(u);
    }
    console.log(`\nlive photos : ${live}`);
    console.log(`dead / 404  : ${dead.size}`);
    for (const u of dead) console.log(`  dead  ${u.replace(/^.*\//, '')}  ${JSON.stringify(headCache[unwrap(u)])}`);

    // ── 4. blank only the dead ones ───────────────────────────────────────────
    let blanked = 0;
    walk(data, n => {
        for (const k of IMG_KEYS) {
            const u = n[k];
            if (typeof u === 'string' && dead.has(u)) { n[k] = ''; blanked++; }
        }
    });
    console.log(`\nfields blanked : ${blanked}`);
    console.log(`fields restored: ${countFields(data)} colour-code image fields now render`);

    if (DRY) { console.log('\n--dry: custom-data.json not written'); return; }
    fs.writeFileSync(DATA, JSON.stringify(data, null, 2));
    console.log('custom-data.json written');
})();

function countFields(d) {
    let n = 0;
    walk(d, o => { for (const k of IMG_KEYS) { const u = o[k]; if (typeof u === 'string' && u.trim() && isColourCode(u)) n++; } });
    return n;
}
