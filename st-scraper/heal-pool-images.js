// Image-heal + mounting-materials scraper for zubehoer_pool — via the profishop JSON webservice
// (no browser). For each pool art-Nr, GET_DETAILS returns the REAL primary image + additionalMaterials
// (Verwandte Artikel / Ersatzteile / Zubehör — where mounting materials live).
// Endpoint: /business(bD1kZSZjPTAwMQ==)/webservices/article.ws?event=GET_DETAILS&matnr=<13digits>&menge=1
//   (the token decodes to l=de&c=001 — a static locale, not a session).
// Resumable: writes every 200. Rerun to continue.
// Usage:  node heal-pool-images.js [maxThisRun]   env: CONC=24
const https = require('https');
const fs = require('fs');
const path = require('path');

const DATA = path.resolve(__dirname, '../custom-data.json');
const OUT = path.resolve(__dirname, 'heal-pool-images-results.json');
const HOST = 'profishop.sanitastroesch.ch';
const ORIGIN = 'https://' + HOST;
const CONC = parseInt(process.env.CONC || '24', 10);
const MAX = parseInt(process.argv[2] || '9999999', 10);
const digits = (a) => String(a).replace(/[^0-9]/g, '');

function getJson(pathname, cookie) {
    return new Promise(res => {
        const req = https.get({ host: HOST, path: pathname, timeout: 15000,
            headers: { 'Accept': 'application/json', 'User-Agent': 'Mozilla/5.0', ...(cookie ? { Cookie: cookie } : {}) } },
            r => { let d = ''; r.on('data', c => d += c); r.on('end', () => { let j = null; try { j = JSON.parse(d); } catch (e) {} res({ status: r.statusCode, json: j }); }); });
        req.on('error', () => res({ status: 0, json: null }));
        req.on('timeout', () => { req.destroy(); res({ status: 0, json: null }); });
    });
}
function primeCookie() {
    return new Promise(res => {
        https.get({ host: HOST, path: '/business/', headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 15000 },
            r => { const sc = r.headers['set-cookie']; r.resume(); res(sc ? sc.map(c => c.split(';')[0]).join('; ') : ''); })
            .on('error', () => res('')).on('timeout', function () { this.destroy(); res(''); });
    });
}

(async () => {
    const data = JSON.parse(fs.readFileSync(DATA, 'utf8'));
    const trays = data.zubehoer_pool.trays.filter(t => t && t.artNr);
    const seen = new Set(); const uniq = [];
    for (const t of trays) { const d = digits(t.artNr); if (d.length < 12 || seen.has(d)) continue; seen.add(d); uniq.push(t.artNr); }
    const results = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, 'utf8')) : {};
    // GET_DETAILS needs a valid SAP session (sap-appcontext). Provide the browser's cookie via
    // COOKIE_FILE (preferred) or COOKIE env; primeCookie() alone yields only WAF cookies → NOSESSION.
    const cookie = process.env.COOKIE_FILE ? fs.readFileSync(process.env.COOKIE_FILE, 'utf8').trim()
        : (process.env.COOKIE || await primeCookie());

    const todo = uniq.filter(a => !results[a]).slice(0, MAX);
    console.log(`pool unique art-Nrs: ${uniq.length} | already done ${uniq.length - todo.length} | this run ${todo.length} | conc ${CONC} | cookie:${cookie ? 'yes' : 'no'}`);
    if (!todo.length) { console.log('Nothing to do.'); return; }

    let i = 0, done = 0, imgOk = 0, matLinks = 0, apiFail = 0; const t0 = Date.now();
    const save = () => fs.writeFileSync(OUT, JSON.stringify(results));
    async function worker() {
        while (i < todo.length) {
            const artNr = todo[i++];
            const { json } = await getJson(`/business(bD1kZSZjPTAwMQ==)/webservices/article.ws?event=GET_DETAILS&matnr=${digits(artNr)}&menge=1`, cookie);
            const r = json && json.result;
            if (!r) apiFail++;
            const image = r && r.image ? (ORIGIN + r.image) : null;
            const additionalMaterials = (r && r.additionalMaterials || []).map(g => ({
                type: g.type, label: g.label,
                articles: (g.articles || []).map(a => ({ artNr: a.matnrDisplay || a.matnr, label: (a.maktx || a.label || '').trim() }))
            })).filter(g => g.articles.length);
            results[artNr] = { image, additionalMaterials };
            done++; if (image) imgOk++; matLinks += additionalMaterials.reduce((s, g) => s + g.articles.length, 0);
            if (done % 200 === 0) {
                save();
                const rate = (Date.now() - t0) / 1000 / done, eta = ((todo.length - done) * rate / 60).toFixed(1);
                console.log(`[${done}/${todo.length}] img:${imgOk} matLinks:${matLinks} apiFail:${apiFail} | ${(rate * 1000).toFixed(0)}ms ea | ETA ~${eta}m`);
            }
        }
    }
    await Promise.all(Array.from({ length: CONC }, worker));
    save();
    console.log(`\nDONE: ${done} products | images ${imgOk} | mounting/related links ${matLinks} | apiFail ${apiFail} -> ${OUT}`);
})();
