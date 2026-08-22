// Heal the Ch4 accessibility trays that carry NO `description` at all.
//
// WHY
//   170 trays written by the old inject-ch4-accessories.js hold only a `label` — SAP's
//   short text, which is maktx + maktx2 and is hard-truncated around 80 chars. With no
//   `description` beside it the GLOBAL RULE has nothing to read past the cut, and 61 of
//   the labels are visibly severed mid-phrase. The worst reads:
//
//     "Klappsitz Nosag Normbau Cavere, … Rückenlehne anthrazit, zum , Silberfarbig"
//
//   The missing word is "Einhängen". Those 15 seats HANG on a grab bar and need no
//   anchors at all — and they were being excluded from the Befestigungsmaterial rule by
//   accident, because the `einhäng` test had nothing to match. SAP's own `description`
//   field carries the whole sentence.
//
//   The newer injectors (ch4wg_, ch4acc_) already write a description; this only fills
//   the gap the old one left. It never overwrites a description that exists.
//
// SESSION, NOT LOGIN
//   article.ws answers a GUEST session — a plain https.get returns NOSESSION, but the
//   `sap-usercontext` / `sap-appcontext` cookies an ordinary page visit sets are enough.
//   Pass them in the environment; NEVER commit them, and never use a personal login:
//
//     COOKIE="sap-usercontext=…; sap-appcontext=…" node heal-ch4-descriptions.cjs --write
//
//   A session lasts ~20-30 min. Re-open the shop in a browser and re-read document.cookie
//   if the run starts returning NOSESSION.
//
// Usage:
//   COOKIE=… node heal-ch4-descriptions.cjs            # DRY RUN — counts + samples
//   COOKIE=… node heal-ch4-descriptions.cjs --write    # write custom-data.json
'use strict';
const fs = require('fs');
const path = require('path');
const https = require('https');
const { readData, writeData } = require('./_dataFile.cjs');

const WRITE = process.argv.includes('--write');
const HOST = 'profishop.sanitastroesch.ch';
const COOKIE = (process.env.COOKIE || '').trim();
if (!COOKIE) { console.error('set COOKIE=… (see the header — a GUEST session, never a login)'); process.exit(1); }

const FAMS = ['Klappgriff', 'Stützklappgriff', 'Duschklappsitz', 'Haltegriff', 'Winkelgriff',
    'Eckhaltegriff', 'Duschsitz', 'Rückenstütze', 'Duschhocker', 'Seitenwandgriff',
    'Armlehne', 'Wannengriff', 'Duschhandlauf'];

const sleep = ms => new Promise(r => setTimeout(r, ms));
const api = (digits) => `/business(bD1kZSZjPTAwMQ==)/webservices/article.ws?event=GET_DETAILS&matnr=${digits}&menge=1`;

function getJson(pathname) {
    return new Promise(res => {
        const req = https.get({
            host: HOST, path: pathname, timeout: 25000, headers: {
                'Accept': 'application/json',
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
                'Cookie': COOKIE,
            }
        }, r => {
            let d = ''; r.on('data', c => d += c);
            r.on('end', () => { let j = null; try { j = JSON.parse(d); } catch (_) { } res(j); });
        });
        req.on('error', () => res(null));
        req.on('timeout', () => { req.destroy(); res(null); });
    });
}

(async () => {
    const data = readData();
    const pool = data.zubehoer_pool;
    const targets = pool.trays.filter(t => t && FAMS.includes(t.productType) && !t.description);
    console.log(`=== heal Ch4 descriptions ${WRITE ? '(WRITE)' : '(DRY RUN)'} ===`);
    console.log(`trays with no description : ${targets.length}`);

    let ok = 0, empty = 0, failed = 0, noSession = 0;
    const samples = [];
    for (const t of targets) {
        const j = await getJson(api(String(t.artNr).replace(/[^0-9]/g, '')));
        if (!j) { failed++; continue; }
        if (j.status === 'NOSESSION') { noSession++; break; }
        const desc = String((j.result && j.result.description) || '')
            .replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
        if (!desc) { empty++; continue; }
        if (samples.length < 6 && desc.length > (t.label || '').length) {
            samples.push(`${t.artNr}\n      label: ${t.label}\n      desc : ${desc.slice(0, 150)}`);
        }
        t.description = desc;
        ok++;
        await sleep(700);
    }

    if (noSession) {
        console.error('\n⚠ NOSESSION — the guest session expired. Re-open the shop and re-read document.cookie.');
        process.exit(1);
    }

    console.log(`healed                    : ${ok}`);
    console.log(`SAP had no description    : ${empty}`);
    console.log(`request failed            : ${failed}`);

    // What the healed text changes: these are the decisions that were reading a cut label.
    const RX_HOOKS = /einhäng|zum einhängen|einzuhängen/i;
    const RX_OHNE = /ohne\s+befestigungsmaterial/i;
    const hooks = targets.filter(t => RX_HOOKS.test(`${t.label || ''} ${t.description || ''}`));
    const ohne = targets.filter(t => RX_OHNE.test(`${t.label || ''} ${t.description || ''}`));
    console.log(`\nnow readable as "zum Einhängen"     : ${hooks.length}  (hang on a grab bar — no anchors)`);
    console.log(`now readable as "ohne Befestigung…" : ${ohne.length}`);
    console.log('\nsamples:');
    samples.forEach(s => console.log('  ' + s));

    if (WRITE) {
        const backup = writeData(data);
        console.log(`\nWROTE custom-data.json (backup ${backup})`);
    } else {
        console.log('\nDRY RUN — nothing written. Re-run with --write.');
    }
})();
