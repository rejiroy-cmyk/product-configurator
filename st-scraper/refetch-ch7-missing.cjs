/**
 * refetch-ch7-missing.cjs
 * Re-resolves the Ch7 bases (PDF pp. 1843-1862, the Waschtrog/Ausguss/Boiler block) that
 * are NOT yet in custom-data.json. The first inspection pass (fetch_catalogue_api.js) tried
 * only 5 finish suffixes — 000/501/100/535/149 — so every Romay article, whose finish code
 * is 104 (Weiss marmoriert), came back null. This widens the sweep.
 *
 * The laundry-appliance block (pp. 1811-1842, Waschautomat / Wäschetrockner / Verbindungs-
 * bausatz …) is deliberately EXCLUDED — out of scope for this configurator.
 *
 * Usage: COOKIE_FILE=../cookie.txt node refetch-ch7-missing.cjs
 *        (cookie.txt may carry its `#` comment header; it is stripped here)
 * Output: st-scraper/catalogue-inspection/ch7-api-refetch.json
 *         { "<base>": {matnr,maktx,description,image,net,tech,additionalMaterials} | null }
 * Resumable: bases already resolved in the output are skipped.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const https = require('https');

const DIR = path.dirname(fs.realpathSync(__filename));
const INSP = path.join(DIR, 'catalogue-inspection');
const OUT = path.join(INSP, 'ch7-api-refetch.json');
const WORKLIST = path.join(INSP, 'ch7-missing-worklist.json');

let cookie = process.env.COOKIE || '';
if (process.env.COOKIE_FILE) {
    cookie = fs.readFileSync(path.resolve(DIR, process.env.COOKIE_FILE), 'utf8')
        .split('\n').filter(l => l.trim() && !l.trim().startsWith('#')).join(' ')
        .replace(/\s+/g, ' ').trim();
}
if (!cookie) { console.error('no cookie — set COOKIE_FILE or COOKIE'); process.exit(1); }

// Pre-flight. `sap-appcontext` is base64 and carries the session identity; an
// unauthenticated tab yields "SID:ANON:…". article.ws answers NOSESSION for that, exactly
// as it does for an expired session — so without this check a not-logged-in copy/paste is
// indistinguishable from a stale one, and you re-copy the same dead cookie forever.
// Note `copy(document.cookie)` cannot see HttpOnly cookies; what makes the session work
// here is sap-appcontext + sap-usercontext, both readable.
(function preflightSession() {
    const m = cookie.match(/sap-appcontext=([^;]+)/);
    if (!m) { console.error('✖ cookie has no sap-appcontext — article.ws will answer NOSESSION.'); process.exit(2); }
    let decoded = '';
    try { decoded = decodeURIComponent(Buffer.from(decodeURIComponent(m[1]), 'base64').toString('utf8')); } catch (_) { /* leave empty */ }
    if (/SID:ANON:/i.test(decoded)) {
        console.error('✖ the SAP session is ANONYMOUS (sap-sessionid=SID:ANON:…) — that browser tab was not logged in.');
        console.error('  Sign in at profishop.sanitastroesch.ch, confirm your name/account shows in the header,');
        console.error('  then re-run copy(document.cookie) from THAT tab.');
        process.exit(2);
    }
    if (!/sap-usercontext=/.test(cookie)) { console.error('✖ cookie has no sap-usercontext — article.ws will answer NOSESSION.'); process.exit(2); }
    console.log(`✓ pre-flight: session looks authenticated (${(decoded.match(/SID:([^:]+):/) || [, '?'])[1]})`);
})();

const work = JSON.parse(fs.readFileSync(WORKLIST, 'utf8'));
const out = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, 'utf8')) : {};

// Suffix sweep. Order matters: the codes that actually occur in Ch7 and in the existing
// waschtrog pool first (000 = kein Farbcode, 100 Weiss, 104 Weiss marmoriert = Romay,
// 501 Verchromt, 502 Chromeline), then the long tail.
const SUFFIXES = ['000', '100', '104', '501', '502', '105', '106', '101', '535', '149',
                  '107', '102', '111', '116', '103', '110'].map(c => c + '000');

const todo = work.filter(w => !out[w.base]);
console.log(`🍪 cookie:${cookie.length} chars | worklist:${work.length} | already resolved:${work.length - todo.length} | this run:${todo.length} | suffixes:${SUFFIXES.length}`);

function getJson(dig) {
    return new Promise(res => {
        https.get({
            host: 'profishop.sanitastroesch.ch',
            path: `/business(bD1kZSZjPTAwMQ==)/webservices/article.ws?event=GET_DETAILS&matnr=${dig}&menge=1`,
            timeout: 15000,
            headers: { Accept: 'application/json', 'User-Agent': 'Mozilla/5.0', Cookie: cookie },
        }, r => { let s = ''; r.on('data', c => s += c); r.on('end', () => { try { res(JSON.parse(s)); } catch (_) { res(null); } }); })
            .on('error', () => res(null)).on('timeout', function () { this.destroy(); res(null); });
    });
}
const sleep = ms => new Promise(r => setTimeout(r, ms));

let i = 0, done = 0, resolved = 0, aborted = false;
const save = () => fs.writeFileSync(OUT, JSON.stringify(out, null, 2));

async function worker() {
    while (i < todo.length && !aborted) {
        const w = todo[i++];
        let hit = null, shortText = '';
        for (const suf of SUFFIXES) {
            const j = await getJson(w.base + suf);
            await sleep(60 + Math.random() * 90);
            if (j && j.status === 'NOSESSION') { aborted = true; console.error('\n🚨 NOSESSION — cookie.txt is stale, refresh and re-run (resumable)'); break; }
            if (j && j.status === 'OK' && j.result) {
                const r = j.result;
                // SAP short text is TWO fields — maktx AND maktx2, ~40 chars each.
                // Reading maktx alone is what produced the truncated labels. See
                // tests/verify-scraper-maktx2.js.
                shortText = [r.maktx, r.maktx2].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
                hit = {
                    matnr: r.matnrDisplay || r.matnr,
                    maktx: shortText,
                    description: (r.description || '').slice(0, 600),
                    image: r.image ? 'https://profishop.sanitastroesch.ch' + r.image : null,
                    net: r.retailPrice != null ? r.retailPrice : null,
                    tech: (r.technicalInformations || []).map(t => `${t.label}: ${t.value}`),
                    additionalMaterials: (r.additionalMaterials || []).map(g => ({
                        type: g.type, label: g.label,
                        articles: (g.articles || []).map(a => ({
                            artNr: a.matnrDisplay || a.matnr,
                            label: [a.maktx, a.maktx2].filter(Boolean).join(' ').trim(),
                        })),
                    })).filter(g => g.articles.length),
                };
                break;
            }
        }
        out[w.base] = hit;
        done++; if (hit) resolved++;
        console.log(`[${done}/${todo.length}] ${w.base} ${hit ? '✅ ' + hit.matnr + ' — ' + shortText.slice(0, 70) : '❌ unresolved'}`);
        if (done % 10 === 0) save();
    }
}

(async () => {
    const CONC = parseInt(process.env.CONC || '4', 10);
    await Promise.all(Array.from({ length: CONC }, worker));
    save();
    const stillNull = work.filter(w => !out[w.base]).length;
    console.log(`\nDONE: ${done} processed | resolved ${resolved} | unresolved ${done - resolved} | remaining in worklist ${stillNull}`);
    console.log(`→ ${OUT}`);
})();
