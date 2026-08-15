//
// Collect a remote image URL per Gessi/Emporio variant SKU.
//
// ⚠️  This writes gessi-images.json ONLY. Whatever applies that map to
// custom-data.json must never overwrite a PG1 URL with a PS1 one: PG1 is the
// real product photo, PS1 the low-res thumbnail. An earlier pass did exactly
// that to 2,048 articles — same article, a 4.4 KB detailed render replaced by
// a 788-byte blurry one — and it had to be reverted wholesale.
//
// The cause was here: the URL was taken as `result.image` with no preference
// between the two, so whichever the API happened to return won. The primary is
// now upgraded to its PG1 twin whenever the response carries one.
//
'use strict';
const fs = require('fs');
const https = require('https');

const HOST = 'profishop.sanitastroesch.ch';
const CONCURRENT = 8;
const gessiData = JSON.parse(fs.readFileSync('st-scraper/gessi-anschlussbogen-variants.json', 'utf8'));

let todo = [];
Object.values(gessiData).forEach(entry => {
  Object.keys(entry.variants || {}).forEach(artNr => {
    todo.push(artNr);
  });
});

console.log(`Need to fetch images for ${todo.length} Gessi variants.`);

// Blocklist and picking rule live in _imagePick.cjs — see the header there for
// why '_nV', '_100_000' and '_000_000' are NOT placeholder markers.
const { isDistinctive, bestImage } = require('./_imagePick.cjs');
const digits = a => String(a).replace(/[^0-9]/g, '');

const results = {};
let done = 0;

const cookie = fs.readFileSync('st-scraper/cookie.txt', 'utf8').replace(/[^\x20-\x7E]/g, '').trim();

function getJson(matnr) {
  return new Promise(res => {
    const d = digits(matnr);
    const path = `/business(bD1kZSZjPTAwMQ==)/webservices/article.ws?event=GET_DETAILS&matnr=${d}&menge=1`;
    const req = https.get({ host: HOST, path: path, timeout: 15000, headers: {
      'Accept': 'application/json',
      'User-Agent': 'Mozilla/5.0',
      'Cookie': cookie
    }}, (r) => {
      let b = '';
      r.on('data', c => b += c);
      r.on('end', () => {
        try { res(JSON.parse(b)); } catch(e) { res(null); }
      });
    });
    req.on('error', () => res(null));
    req.on('timeout', () => { req.destroy(); res(null); });
  });
}

async function worker() {
  while (todo.length) {
    const artNr = todo.shift();
    const data = await getJson(artNr);
    if (data && data.result) {
      const url = bestImage(data.result);
      if (url) {
        results[artNr] = 'https://' + HOST + url;
      }
    }
    done++;
    if (done % 50 === 0) console.log(`Fetched ${done} / 2238 ...`);
  }
}

(async () => {
  await Promise.all(Array.from({length: CONCURRENT}, () => worker()));
  fs.writeFileSync('st-scraper/gessi-images.json', JSON.stringify(results, null, 2), 'utf8');
  console.log(`\nFinished fetching! Found ${Object.keys(results).length} distinctive remote images out of 2238 SKUs.`);
})();
