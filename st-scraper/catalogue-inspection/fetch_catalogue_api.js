// Enrich catalogue bases via profishop article.ws GET_DETAILS (image + specs + price + mounting).
// For each base tries a few common finish suffixes, keeps the first that resolves OK.
// Usage: COOKIE_FILE=/tmp/pf_cookie.txt node fetch_catalogue_api.js <chapter> [conc]
const https = require('https'), fs = require('fs'), path = require('path');
const HERE = __dirname;
const ch = process.argv[2];
const CONC = parseInt(process.argv[3] || '16', 10);
const cookie = fs.readFileSync(process.env.COOKIE_FILE, 'utf8').trim();
const SUFFIX = ['000000', '501000', '100000', '535000', '149000'];   // none, verchromt, weiss, schwarz matt, finox

function get(mat) {
    return new Promise(res => {
        const req = https.get({ host: 'profishop.sanitastroesch.ch',
            path: `/business(bD1kZSZjPTAwMQ==)/webservices/article.ws?event=GET_DETAILS&matnr=${mat}&menge=1`,
            headers: { Accept: 'application/json', 'User-Agent': 'Mozilla/5.0', Cookie: cookie }, timeout: 12000 },
            r => { let d = ''; r.on('data', c => d += c); r.on('end', () => { let j = {}; try { j = JSON.parse(d); } catch (e) {} res(j); }); });
        req.on('error', () => res({})); req.on('timeout', () => { req.destroy(); res({}); });
    });
}

(async () => {
    const bases = Object.keys(JSON.parse(fs.readFileSync(`${HERE}/ch${ch}-allbases.json`, 'utf8')));
    const OUT = `${HERE}/ch${ch}-api.json`;
    const results = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, 'utf8')) : {};
    const todo = bases.filter(b => !(b in results));
    console.log(`ch${ch}: ${bases.length} bases | done ${bases.length - todo.length} | this run ${todo.length} | conc ${CONC}`);
    let i = 0, done = 0, ok = 0, mats = 0, dead = 0;
    const save = () => fs.writeFileSync(OUT, JSON.stringify(results));
    async function worker() {
        while (i < todo.length) {
            const b = todo[i++];
            let hit = null;
            for (const suf of SUFFIX) {
                const j = await get(b + suf);
                if (j && j.status === 'OK' && j.result) { hit = j.result; break; }
                if (j && j.status === 'NOSESSION') { dead++; break; }   // session died
            }
            if (hit) {
                ok++;
                const am = (hit.additionalMaterials || []).map(g => ({ type: g.type, label: g.label,
                    articles: (g.articles || []).map(a => ({ artNr: a.matnrDisplay || a.matnr, label: [a.maktx, a.maktx2].filter(Boolean).join(" ").trim() })) }))
                    .filter(g => g.articles.length);
                mats += am.reduce((s, g) => s + g.articles.length, 0);
                results[b] = {
                    matnr: hit.matnrDisplay, maktx: (hit.maktx || '') + ' ' + (hit.maktx2 || ''),
                    description: (hit.description || '').slice(0, 400),
                    image: hit.image ? 'https://profishop.sanitastroesch.ch' + hit.image : null,
                    net: hit.retailPrice != null ? hit.retailPrice : null,
                    tech: (hit.technicalInformations || []).map(t => `${t.label}: ${t.value}`).slice(0, 20),
                    additionalMaterials: am,
                };
            } else { results[b] = null; }
            done++;
            if (done % 200 === 0) { save(); console.log(`  ch${ch} [${done}/${todo.length}] ok:${ok} matLinks:${mats} noSession:${dead}`); }
            if (dead > 30) { console.log('SESSION DEAD — stopping'); break; }
        }
    }
    await Promise.all(Array.from({ length: CONC }, worker));
    save();
    console.log(`ch${ch} DONE: ${done} bases | resolved ${ok} | mounting/related links ${mats} | deadSession ${dead}`);
})();
