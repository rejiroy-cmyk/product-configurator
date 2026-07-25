/**
 * revalidate-images.cjs
 * Authoritative image pass: bake only CDN-verified real product photos.
 *
 * For every numeric-artNr product it gathers candidate photo URLs from:
 *   1. current custom-data.json imgUrl
 *   2. original pre-merge imgUrl (restores the color-code photos wrongly blanked)
 *   3. (fallback) article.ws images[]  — only fetched when 1 & 2 have no live candidate
 * Candidates must be /multimedia/Web/(PG1|PS1)/, not _nV, not SAP drawing, not
 * Energieetiketten label. Each candidate is HEAD-checked; the first that returns
 * 200 with a real size wins (PG1 600px preferred over PS1 thumbnail). No live
 * candidate -> '' (local icon). Never bakes a 404 (that was the ban fuel).
 *
 * Usage: COOKIE_FILE=../cookie.txt node revalidate-images.cjs [MAX_API_FALLBACK]
 * Caches: image-head-cache.json (url->{code,len}), image-validated.json (artNr->url|null)
 */
'use strict';
const fs = require('fs');
const path = require('path');
const https = require('https');

const DIR = path.dirname(fs.realpathSync(__filename));
const DATA = path.resolve(DIR, '../custom-data.json');
const PREMERGE = '/private/tmp/claude-501/-Users-jenistonsellathamby-Desktop-product-configurator/b1c031dd-dd70-407d-b9ec-bd267bc00393/scratchpad/custom-data.pre-merge.json';
const HEAD_CACHE = path.resolve(DIR, 'image-head-cache.json');
const VALID_CACHE = path.resolve(DIR, 'image-validated.json');

const HOST = 'profishop.sanitastroesch.ch';
const ORIGIN = 'https://' + HOST;
const CONC_HEAD = 12;
const CONC_API = 4;
const MIN_BYTES = 2000;               // real photo; excludes error stubs
const MAX_API = parseInt(process.argv[2] || '999999', 10);

let cookie = '';
if (process.env.COOKIE_FILE) cookie = fs.readFileSync(path.resolve(DIR, process.env.COOKIE_FILE), 'utf8').replace(/\s*\n\s*/g, ' ').trim();
else cookie = (process.env.COOKIE || '').trim();

const isNv = u => /_nV/.test(u);
const isNonPhoto = u => /\/multimedia\/SAP\//.test(u) || /\/Energieetiketten\//.test(u);
const isWebPhoto = u => /\/multimedia\/Web\/(PG1|PS1)\//.test(u);
const abs = u => (!u ? u : (/^https?:\/\//.test(u) ? u : ORIGIN + u));
// A URL worth HEAD-checking as a product photo
const isCandidate = u => typeof u === 'string' && u.trim() && isWebPhoto(u) && !isNv(u) && !isNonPhoto(u);
const digits = a => String(a).replace(/[^0-9]/g, '');
const isPG1 = u => /\/PG1\//.test(u);

const headCache = fs.existsSync(HEAD_CACHE) ? JSON.parse(fs.readFileSync(HEAD_CACHE, 'utf8')) : {};
const valid = fs.existsSync(VALID_CACHE) ? JSON.parse(fs.readFileSync(VALID_CACHE, 'utf8')) : {};

function saveCaches() {
  fs.writeFileSync(HEAD_CACHE, JSON.stringify(headCache));
  fs.writeFileSync(VALID_CACHE, JSON.stringify(valid, null, 2));
}

function head(u) {
  const p = encodeURI(u.replace(ORIGIN, ''));
  return new Promise(res => {
    https.request({ host: HOST, path: p, method: 'HEAD', timeout: 12000,
      headers: { 'User-Agent': 'Mozilla/5.0', ...(cookie ? { Cookie: cookie } : {}) } },
      r => { res({ code: r.statusCode, len: +(r.headers['content-length'] || 0) }); r.resume(); })
      .on('error', () => res({ code: 0, len: 0 }))
      .on('timeout', function () { this.destroy(); res({ code: 0, len: 0 }); })
      .end();
  });
}
async function headCached(u) {
  if (headCache[u]) return headCache[u];
  const r = await head(u);
  headCache[u] = r;
  return r;
}
const isLive = r => r && r.code === 200 && r.len >= MIN_BYTES;

function getJson(pathname) {
  return new Promise(res => {
    https.get({ host: HOST, path: pathname, timeout: 20000,
      headers: { Accept: 'application/json', 'User-Agent': 'Mozilla/5.0', ...(cookie ? { Cookie: cookie } : {}) } },
      r => { let s = ''; r.on('data', c => s += c); r.on('end', () => { let j = null; try { j = JSON.parse(s); } catch (_) {} res(j); }); })
      .on('error', () => res(null)).on('timeout', function () { this.destroy(); res(null); }).end?.();
  });
}

// ── gather candidate URLs per artNr from current + pre-merge ───────────────────
const data = JSON.parse(fs.readFileSync(DATA, 'utf8'));
const premerge = JSON.parse(fs.readFileSync(PREMERGE, 'utf8'));
const cands = new Map();   // artNr -> Set(candidate abs urls)
function collect(tree) {
  (function w(n) {
    if (Array.isArray(n)) { n.forEach(w); return; }
    if (!n || typeof n !== 'object') return;
    if (n.artNr && 'imgUrl' in n && digits(n.artNr).length >= 7) {
      const u = abs(n.imgUrl);
      if (isCandidate(u)) { if (!cands.has(n.artNr)) cands.set(n.artNr, new Set()); cands.get(n.artNr).add(u); }
      else if (!cands.has(n.artNr)) cands.set(n.artNr, new Set());  // known product, maybe no cached candidate
    }
    for (const k of Object.keys(n)) w(n[k]);
  })(tree);
}
collect(data); collect(premerge);

let artNrs = [...cands.keys()];
if (process.env.SAMPLE) {                       // deterministic spread sample for a dry run
  const n = parseInt(process.env.SAMPLE, 10);
  artNrs = Array.from({ length: Math.min(n, artNrs.length) }, (_, i) => artNrs[Math.floor(i * artNrs.length / n)]);
}
console.log(`🍪 cookie:${cookie.length} | products:${artNrs.length} | head-cached:${Object.keys(headCache).length} | validated:${Object.keys(valid).length}`);

// order candidates: PG1 (600px) before PS1
const ordered = set => [...set].sort((a, b) => (isPG1(b) - isPG1(a)));

async function resolveFromCandidates(artNr) {
  for (const u of ordered(cands.get(artNr))) {
    const r = await headCached(u);
    if (isLive(r)) return u;
  }
  return null;
}

// ── PHASE 1: validate cached candidates ───────────────────────────────────────
let idx = 0, done1 = 0, live1 = 0;
const needApi = [];
async function worker1() {
  while (idx < artNrs.length) {
    const artNr = artNrs[idx++];
    if (artNr in valid) { done1++; continue; }
    const u = await resolveFromCandidates(artNr);
    if (u) { valid[artNr] = u; live1++; }
    else needApi.push(artNr);   // no live cached candidate -> API fallback
    done1++;
    if (done1 % 500 === 0) { console.log(`  [P1] ${done1}/${artNrs.length} | live:${live1} | needApi:${needApi.length}`); saveCaches(); }
  }
}

// ── PHASE 2: article.ws fallback for the unresolved ───────────────────────────
let apiIdx = 0, done2 = 0, live2 = 0;
async function worker2(list) {
  while (apiIdx < list.length) {
    const artNr = list[apiIdx++];
    const j = await getJson(`/business(bD1kZSZjPTAwMQ==)/webservices/article.ws?event=GET_DETAILS&matnr=${digits(artNr)}&menge=1`);
    let picked = null;
    if (j && j.result) {
      const extra = [j.result.image, ...(j.result.images || [])].map(abs).filter(isCandidate);
      for (const u of extra.sort((a, b) => (isPG1(b) - isPG1(a)))) {
        const r = await headCached(u);
        if (isLive(r)) { picked = u; break; }
      }
    }
    valid[artNr] = picked || null;
    if (picked) live2++;
    done2++;
    if (done2 % 200 === 0) { console.log(`  [P2] ${done2}/${list.length} | recovered:${live2}`); saveCaches(); }
  }
}

(async () => {
  console.log('── PHASE 1: HEAD-validate cached candidates ──');
  await Promise.all(Array.from({ length: CONC_HEAD }, worker1));
  saveCaches();
  console.log(`P1 done: live:${live1} | needApi:${needApi.length}`);

  const apiList = needApi.slice(0, MAX_API);
  console.log(`── PHASE 2: article.ws fallback for ${apiList.length}${needApi.length > apiList.length ? ' (capped from ' + needApi.length + ')' : ''} ──`);
  await Promise.all(Array.from({ length: CONC_API }, () => worker2(apiList)));
  // any needApi beyond the cap -> record null so they blank
  for (const a of needApi.slice(MAX_API)) if (!(a in valid)) valid[a] = null;
  saveCaches();

  const total = Object.keys(valid).length;
  const withUrl = Object.values(valid).filter(Boolean).length;
  console.log(`\n════ revalidate complete ════`);
  console.log(`  products resolved : ${total}`);
  console.log(`  live photo URL    : ${withUrl}`);
  console.log(`  no photo (blank)  : ${total - withUrl}`);
  console.log(`  head-cache size   : ${Object.keys(headCache).length}`);
})();
