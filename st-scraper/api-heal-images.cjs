/**
 * api-heal-images.cjs
 * Fast image-URL resolver via the SAP article.ws JSON webservice (no browser).
 *   GET /business(...)/webservices/article.ws?event=GET_DETAILS&matnr=<digits>&menge=1
 *   -> result.image (exact variant) + result.images[] (gallery incl. family photo)
 * Picks the first NON-placeholder URL (exact preferred, else family/gallery),
 * falling back to the puppeteer cache when the API only has placeholders.
 *
 * Usage:
 *   COOKIE_FILE=../cookie.txt node api-heal-images.cjs [MAX]   # MAX caps art-Nrs this run
 * Output cache: st-scraper/image-api-scraped.json  { "<artNr>": "<url>"|null }
 * Resume: art-Nrs already in the cache are skipped.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const https = require('https');

const SCRIPT_DIR = path.dirname(fs.realpathSync(__filename));
const DATA_PATH = path.resolve(SCRIPT_DIR, '../custom-data.json');
const CACHE_PATH = path.resolve(SCRIPT_DIR, 'image-api-scraped.json');
const PUPPET_CACHE = path.resolve(SCRIPT_DIR, 'image-urls-scraped.json');

const HOST = 'profishop.sanitastroesch.ch';
const ORIGIN = 'https://' + HOST;
const CONC = 4;
const MAX = parseInt(process.argv[2] || '9999999', 10);

// Blocklist and picking rule live in _imagePick.cjs. This file used to carry
// its own copy listing '_nV', '_100_000' and '_000_000' as placeholders — see
// that header for why all three mean the opposite. With them on the list the
// walk below judged 23,321 articles that hold a real, on-disk image as needing
// a re-heal, and re-healing overwrites them.
const { isDistinctive, needsImage, bestImage } = require('./_imagePick.cjs');
const digits = a => String(a).replace(/[^0-9]/g, '');
const sleep = ms => new Promise(r => setTimeout(r, ms));

// ── cookie ──────────────────────────────────────────────────────────────────
let cookie = process.env.COOKIE || '';
if (process.env.COOKIE_FILE) {
  cookie = fs.readFileSync(path.resolve(SCRIPT_DIR, process.env.COOKIE_FILE), 'utf8').trim();
}
cookie = cookie.replace(/\s*\n\s*/g, ' ').trim();

function getJson(pathname) {
  return new Promise(res => {
    const req = https.get({ host: HOST, path: pathname, timeout: 20000, headers: {
      'Accept': 'application/json',
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
      ...(cookie ? { Cookie: cookie } : {}) } },
      r => { let d = ''; r.on('data', c => d += c); r.on('end', () => {
        let j = null; try { j = JSON.parse(d); } catch (_) {}
        res({ status: r.statusCode, json: j });
      }); });
    req.on('error', () => res({ status: 0, json: null }));
    req.on('timeout', () => { req.destroy(); res({ status: 0, json: null }); });
  });
}

/** Best image URL from an article.ws result, or null */
const pickImage = bestImage;

// ── collect unique numeric art-Nrs needing an image ───────────────────────────
const data = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
const cache = fs.existsSync(CACHE_PATH) ? JSON.parse(fs.readFileSync(CACHE_PATH, 'utf8')) : {};
const puppet = fs.existsSync(PUPPET_CACHE) ? JSON.parse(fs.readFileSync(PUPPET_CACHE, 'utf8')) : {};

const wanted = new Map(); // artNr -> digits
(function walk(node) {
  if (Array.isArray(node)) { node.forEach(walk); return; }
  if (!node || typeof node !== 'object') return;
  if (node.artNr && 'imgUrl' in node && needsImage(node.imgUrl)) {
    const d = digits(node.artNr);
    if (d.length >= 7 && !(node.artNr in cache)) wanted.set(node.artNr, d);
  }
  for (const k of Object.keys(node)) walk(node[k]);
})(data);

const todo = [...wanted.entries()].slice(0, MAX);
console.log(`🍪 cookie length: ${cookie.length}`);
console.log(`🎯 art-Nrs needing image: ${wanted.size} | this run: ${todo.length} | concurrency: ${CONC}`);
if (!todo.length) { console.log('Nothing to do.'); process.exit(0); }

let done = 0, apiHit = 0, puppetHit = 0, miss = 0, aborted = false;
function save() { fs.writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2)); }

async function worker() {
  while (todo.length && !aborted) {
    const [artNr, d] = todo.pop();
    await sleep(80 + Math.random() * 160);
    const { json } = await getJson(`/business(bD1kZSZjPTAwMQ==)/webservices/article.ws?event=GET_DETAILS&matnr=${d}&menge=1`);
    if (json && json.status === 'NOSESSION') {
      aborted = true;
      console.error('\n🚨 Cookie rejected (NOSESSION). Refresh cookie.txt from a logged-in browser and re-run.');
      break;
    }
    let url = null, via = '';
    if (json && json.result) { url = pickImage(json.result); if (url) via = 'api'; }
    if (url && !/^https?:\/\//.test(url)) url = ORIGIN + url;        // API paths are relative
    if (!url && isDistinctive(puppet[artNr])) { url = puppet[artNr]; via = 'puppet'; }
    cache[artNr] = url || null;
    done++;
    if (via === 'api') apiHit++; else if (via === 'puppet') puppetHit++; else miss++;
    if (done % 50 === 0) { console.log(`   ${done}/${todo.length + done} done | api:${apiHit} puppet:${puppetHit} miss:${miss}`); save(); }
  }
}

(async () => {
  await Promise.all(Array.from({ length: CONC }, worker));
  save();
  console.log(`\n════ api-heal complete ════`);
  console.log(`  resolved via API      : ${apiHit}`);
  console.log(`  resolved via puppet   : ${puppetHit}`);
  console.log(`  no image (miss)       : ${miss}`);
  console.log(`  cache: ${CACHE_PATH}`);
})();
