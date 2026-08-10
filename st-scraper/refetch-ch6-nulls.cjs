/**
 * refetch-ch6-nulls.cjs
 * Re-resolves the 360 Ch6 bases that came back null from the first API pass (their
 * finish-code suffix wasn't among the 5 originally tried). For each null base it tries,
 * in order: (1) the real variant SKUs from chapter-6-variants-scraped.json, then
 * (2) base + each of the most common Ch6 finish codes. First article.ws OK wins.
 *
 * Usage: COOKIE_FILE=../cookie.txt node refetch-ch6-nulls.cjs
 * Output: st-scraper/catalogue-inspection/ch6-api-refetch.json  { "<base>": {matnr,maktx,description,image,net,tech,additionalMaterials} | null }
 * Resumable: bases already in the output are skipped.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const https = require('https');

const DIR = path.dirname(fs.realpathSync(__filename));
const INSP = path.join(DIR, 'catalogue-inspection');
const API = path.join(INSP, 'ch6-api.json');
const VARS = path.join(DIR, 'chapter-6-variants-scraped.json');
const OUT = path.join(INSP, 'ch6-api-refetch.json');

let cookie = process.env.COOKIE || '';
if (process.env.COOKIE_FILE) cookie = fs.readFileSync(path.resolve(DIR, process.env.COOKIE_FILE), 'utf8').replace(/\s*\n\s*/g, ' ').trim();

const api = JSON.parse(fs.readFileSync(API, 'utf8'));
const vars = fs.existsSync(VARS) ? JSON.parse(fs.readFileSync(VARS, 'utf8')) : {};
const out = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, 'utf8')) : {};

// Most common Ch6 finish codes (data-driven from the non-null matnrs), tried after the real SKUs.
const codeCount = {};
for (const e of Object.values(api)) {
  if (!e || !e.matnr) continue;
  const m = String(e.matnr).replace(/[^0-9]/g, '');
  if (m.length >= 13) codeCount[m.slice(7, 10)] = (codeCount[m.slice(7, 10)] || 0) + 1;
}
const TOP_CODES = Object.entries(codeCount).sort((a, b) => b[1] - a[1]).slice(0, 14).map(([c]) => c);
const SUFFIXES = [...new Set([...TOP_CODES, '501', '000', '100'])].map(c => c + '000');

const nullBases = Object.keys(api).filter(k => !api[k] && !(k in out));
console.log(`🍪 cookie:${cookie.length} | null bases:${Object.keys(api).filter(k=>!api[k]).length} | to do:${nullBases.length} | suffix set:${SUFFIXES.length}`);

function getJson(dig) {
  return new Promise(res => {
    https.get({ host: 'profishop.sanitastroesch.ch', path: `/business(bD1kZSZjPTAwMQ==)/webservices/article.ws?event=GET_DETAILS&matnr=${dig}&menge=1`, timeout: 15000,
      headers: { Accept: 'application/json', 'User-Agent': 'Mozilla/5.0', Cookie: cookie } },
      r => { let s = ''; r.on('data', c => s += c); r.on('end', () => { try { res(JSON.parse(s)); } catch (_) { res(null); } }); })
      .on('error', () => res(null)).on('timeout', function () { this.destroy(); res(null); });
  });
}
const sleep = ms => new Promise(r => setTimeout(r, ms));

function candidatesFor(base) {
  const key = String(base).replace(/[^0-9]/g, '');
  const cands = [];
  const v = vars[key];
  if (v && v.variants) for (const a of Object.keys(v.variants)) cands.push(a.replace(/[^0-9]/g, ''));
  for (const suf of SUFFIXES) cands.push(key + suf);
  return [...new Set(cands)];
}

let done = 0, resolved = 0, aborted = false;
function save() { fs.writeFileSync(OUT, JSON.stringify(out, null, 2)); }

async function worker(queue) {
  while (queue.i < nullBases.length && !aborted) {
    const base = nullBases[queue.i++];
    let hit = null;
    for (const dig of candidatesFor(base)) {
      const j = await getJson(dig);
      await sleep(60 + Math.random() * 100);
      if (j && j.status === 'NOSESSION') { aborted = true; console.error('\n🚨 NOSESSION — refresh cookie.txt'); break; }
      if (j && j.status === 'OK' && j.result) {
        const r = j.result;
        hit = { matnr: r.matnr, maktx: [r.maktx, r.maktx2].filter(Boolean).join(" ").trim(), description: r.description, image: r.image, net: r.retailPrice, tech: r.technicalInformations || [], additionalMaterials: r.additionalMaterials || [] };
        break;
      }
    }
    out[base] = hit;
    done++; if (hit) resolved++;
    if (done % 20 === 0) { console.log(`  ${done}/${nullBases.length} | resolved:${resolved}`); save(); }
  }
}

(async () => {
  const queue = { i: 0 };
  await Promise.all(Array.from({ length: 3 }, () => worker(queue)));
  save();
  console.log(`\n════ ch6 refetch done ════\n  processed:${done} | resolved:${resolved} | still null:${done - resolved}\n  out: ${OUT}`);
})();
