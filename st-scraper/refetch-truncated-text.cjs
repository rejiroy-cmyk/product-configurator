/**
 * refetch-truncated-text.cjs
 * ---------------------------------------------------------------------------
 * Re-fetches the FULL product text for art-Nrs whose label the ERP truncated
 * beyond recovery (work-list from audit-truncated-labels.cjs).
 *
 * Captures three things per article:
 *   maktx        the short text (often truncated at source too)
 *   description  the long text
 *   tech[]       STRUCTURED attributes — "Marke: Kaldewei", "Farbe: Weiss",
 *                "Ausprägung: für Kaldewei Conoduo / Incava". 978 of 979 sampled
 *                articles have these, and `Ausprägung` is a purpose-built variant
 *                discriminator. This is the most valuable field of the three:
 *                it needs no German prose parsing to feed differentiatingChips().
 *
 * Usage:
 *   COOKIE_FILE=cookie.txt node refetch-truncated-text.cjs --shard 0 [--limit N]
 *
 * Reads:   st-scraper/truncated-shard-<i>.json
 * Writes:  st-scraper/text-refetch-shard-<i>.json   { "<artNr>": {...}|null }
 * Resume:  art-Nrs already in the output file are skipped, so a killed run
 *          continues where it stopped.
 *
 * EXIT CODES
 *   0  shard complete
 *   2  the SAP session is dead (NOSESSION). Aborts on the FIRST occurrence
 *      rather than burning the whole shard against an expired cookie — this is
 *      what a stale cookie looked like on 2026-08-08:
 *        {"status":"NOSESSION","message":"Ungültige Sitzung (GET_DETAILS)"}
 *      Fix: log in to profishop in a browser, copy the session cookie into
 *      st-scraper/cookie.txt, re-run. Every shard is resumable.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const https = require('https');

const SCRIPT_DIR = path.dirname(fs.realpathSync(__filename));
const HOST = 'profishop.sanitastroesch.ch';
const API = (d) => `/business(bD1kZSZjPTAwMQ==)/webservices/article.ws?event=GET_DETAILS&matnr=${d}&menge=1`;

const arg = (name, dflt) => {
    const i = process.argv.indexOf(name);
    return i > -1 ? process.argv[i + 1] : dflt;
};
const SHARD = arg('--shard', null);
const LIMIT = parseInt(arg('--limit', '9999999'), 10);
const CONC = parseInt(arg('--conc', '3'), 10);   // modest on purpose: this is a vendor system
if (SHARD === null) { console.error('need --shard <i>'); process.exit(1); }

const IN = path.join(SCRIPT_DIR, `truncated-shard-${SHARD}.json`);
const OUT = path.join(SCRIPT_DIR, `text-refetch-shard-${SHARD}.json`);

// cookie.txt carries a `#` comment header explaining how to refresh it. Feeding
// that straight into a header throws ERR_INVALID_CHAR on the em-dash, so keep only
// the actual cookie lines.
let cookie = process.env.COOKIE || '';
if (process.env.COOKIE_FILE) cookie = fs.readFileSync(path.resolve(SCRIPT_DIR, process.env.COOKIE_FILE), 'utf8');
cookie = cookie.split('\n')
    .map(l => l.trim())
    .filter(l => l && !l.startsWith('#'))
    .join('; ')
    .replace(/;\s*;/g, ';')
    .trim();
if (!cookie) { console.error('no cookie: set COOKIE_FILE=cookie.txt'); process.exit(1); }
if (/[^\x20-\x7E]/.test(cookie)) {
    console.error('cookie contains non-ASCII characters — re-copy it from the browser');
    process.exit(1);
}

// The SAP session token is HttpOnly, so `document.cookie` in the DevTools console
// silently omits it. You then get a file full of _ga/Optanon/incap analytics that
// looks complete, and every request comes back NOSESSION. Catch that here rather
// than after a round-trip to the server.
const cookieNames = cookie.split(';').map(s => s.trim().split('=')[0]).filter(Boolean);
// WARNING, not a hard stop: the live request is the only real authority on whether
// a session is valid, and refusing to send one would hard-block a cookie whose auth
// works differently than assumed.
if (!cookieNames.some(n => /^(SAP_SESSIONID|MYSAPSSO2|JSESSIONID|sap-contextid)/i.test(n))) {
    console.warn('⚠ cookie.txt has no SAP session token (SAP_SESSIONID_* / MYSAPSSO2 / JSESSIONID).');
    console.warn(`  It holds: ${cookieNames.join(', ').slice(0, 200)}`);
    console.warn('  Those tokens are HttpOnly — `document.cookie` cannot see them. Copy the FULL');
    console.warn('  `Cookie:` value from DevTools → Network → any profishop request → Request Headers.');
    console.warn('  Trying the request anyway…\n');
}

const digits = (a) => String(a).replace(/[^0-9]/g, '');
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

function getJson(pathname) {
    return new Promise(res => {
        const req = https.get({
            host: HOST, path: pathname, timeout: 20000, headers: {
                'Accept': 'application/json',
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
                Cookie: cookie,
            },
        }, r => {
            let d = '';
            r.on('data', c => d += c);
            r.on('end', () => { let j = null; try { j = JSON.parse(d); } catch (_) { } res({ status: r.statusCode, json: j }); });
        });
        req.on('error', () => res({ status: 0, json: null }));
        req.on('timeout', () => { req.destroy(); res({ status: 0, json: null }); });
    });
}

(async () => {
    const list = JSON.parse(fs.readFileSync(IN, 'utf8'));
    const out = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, 'utf8')) : {};
    const todo = list.filter(a => !(a in out)).slice(0, LIMIT);
    console.log(`shard ${SHARD}: ${list.length} art-Nrs, ${Object.keys(out).length} already done, fetching ${todo.length}`);

    let done = 0, ok = 0, dead = false;
    const save = () => fs.writeFileSync(OUT, JSON.stringify(out, null, 1));

    const worker = async (queue) => {
        while (queue.length && !dead) {
            const art = queue.shift();
            const { json } = await getJson(API(digits(art)));

            if (json && (json.status === 'NOSESSION' || json.code === 'NOSESSION')) {
                dead = true;
                console.error(`\n✖ SESSION EXPIRED at ${art}: ${json.message || 'NOSESSION'}`);
                break;
            }
            const r = json && (json.result || json.results || json);
            if (r && (r.maktx || r.description)) {
                out[art] = {
                    // THE ROOT CAUSE OF THE TRUNCATION: SAP splits the short text
                    // across two ~40-char fields and the original scrape only took
                    // the first. maktx="Wandbecken Alterna calea, 45 x 36 cm," +
                    // maktx2="Armaturenloch, mit Überlauf, Weiss" is the whole label.
                    maktx: r.maktx || null,
                    maktx2: r.maktx2 || null,
                    description: r.description || null,
                    // Structured {label, value, unit} attributes — Marke, Serie,
                    // Breite, Farbe, Modell, Montage. NOT called `tech`: that name
                    // only exists in the older post-processed catalogue-inspection
                    // dumps, and looking for it here silently yields nothing.
                    tech: Array.isArray(r.technicalInformations) ? r.technicalInformations : [],
                };
                ok++;
            } else {
                out[art] = null;                       // recorded so resume skips it
            }
            if (++done % 25 === 0) { save(); console.log(`  ${done}/${todo.length} (${ok} with text)`); }
            await sleep(120);                          // be a good citizen
        }
    };

    const queue = todo.slice();
    await Promise.all(Array.from({ length: Math.min(CONC, queue.length) }, () => worker(queue)));
    save();

    if (dead) {
        console.error(`shard ${SHARD} ABORTED — refresh st-scraper/cookie.txt and re-run; progress is saved.`);
        process.exit(2);
    }
    console.log(`shard ${SHARD} complete: ${ok}/${todo.length} returned text -> ${path.basename(OUT)}`);
})();
