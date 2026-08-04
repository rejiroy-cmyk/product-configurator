/**
 * inject-ch6-einbaukoerper.cjs
 * UP (Unterputz) Bade-/Duschmischer Endmontagesets need a Grundkörper/Einbaukörper, which the
 * vendor API does NOT bundle. But the CATALOGUE lists it as a Zubehör line under each mixer —
 * in ch6-products.json it appears as an extra art-Nr inside the Endmontageset entry's `variants`
 * (e.g. Gessi 316 "6241 525/526/528" + "6252 886" = Einbaukörper Gessi ½"). This script builds
 * the mixer-base -> Einbaukörper map (identifying the Einbaukörper by its API label) and adds an
 * "Einbaukörper" mounting group to every UP mixer that lacks one. Prices + images filled.
 *
 * Usage:  node st-scraper/inject-ch6-einbaukoerper.cjs          # DRY RUN
 *         node st-scraper/inject-ch6-einbaukoerper.cjs --apply  # writes
 */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(path.dirname(fs.realpathSync(__filename)), '..');
const DATA = path.join(ROOT, 'custom-data.json');
const PRICES = path.join(ROOT, 'prices.json');
const PRODUCTS = path.join(ROOT, 'st-scraper/catalogue-inspection/ch6-products.json');
const API = path.join(ROOT, 'st-scraper/catalogue-inspection/ch6-api.json');
const APPLY = process.argv.includes('--apply');

const prodRaw = JSON.parse(fs.readFileSync(PRODUCTS, 'utf8'));
const products = Array.isArray(prodRaw) ? prodRaw : (prodRaw.products || Object.values(prodRaw));
const api = JSON.parse(fs.readFileSync(API, 'utf8'));
const data = JSON.parse(fs.readFileSync(DATA, 'utf8'));
const pricesFile = JSON.parse(fs.readFileSync(PRICES, 'utf8'));
const prices = pricesFile.prices || pricesFile;

const digits = a => String(a || '').replace(/[^0-9]/g, '');
const key = b => digits(b).slice(0, 7);
const imgFromArt = (art) => { const dg = digits(art); if (dg.length < 12) return ''; const a = dg.slice(0, dg.length - 6).padStart(8, '0'), f = dg.slice(dg.length - 6, dg.length - 3), s = dg.slice(dg.length - 3); return 'https://wsrv.nl/?url=profishop.sanitastroesch.ch/multimedia/Web/PG1/' + a + '_' + f + '_' + s + '.png'; };

// API lookup by base7 → {maktx, net, image}
const apiByKey = {};
for (const [b, e] of Object.entries(api)) { if (e && e.maktx) apiByKey[key(b)] = e; }
const labelOf = art => (apiByKey[key(art)] || {}).maktx || '';

// Build mixer-base7 -> Einbaukörper art-Nr from the catalogue bundles.
const einbauMap = {};
for (const p of products) {
    const vs = (p.variants || []).map(v => v.artNr);
    const einbau = vs.filter(a => /^(einbaukörper|grundkörper|einbauk|grundk)/i.test(labelOf(a)));
    if (!einbau.length) continue;
    const others = vs.filter(a => !einbau.includes(a));
    for (const m of others) einbauMap[key(m)] = einbau[0];
}

// A full Einbaukörper SKU: the catalogue base has no finish → default .000.000.
const fullSku = (base) => { const d = digits(base); if (d.length >= 10) return base; return `${d.slice(0, 4)} ${d.slice(4, 7)}.000.000`; };
const setPrice = (art, p) => { if (p != null && art) { const kk = String(art); if (!(kk in prices)) pricesAdded++; prices[kk] = p; } };

const txt = t => ((t.label || '') + ' ' + (t.description || '')).toLowerCase();
const isUP = t => /unterputz|endmontage|einbaukörper|grundkörper/i.test(txt(t));
const sys = t => /duschsystem|showerpipe|shower pipe|duschpaneel|showerstation|brauseset|duschgarnitur/i.test(txt(t));
const hasEinbau = t => (t.mountingMaterials || []).some(m => /grundk|einbauk|ibox|homebox/i.test(m.name || ''));

let pricesAdded = 0;
const report = {};
for (const appId of ['duschenmischer', 'bademischer']) {
    const trays = (data[appId] || {}).trays || [];
    let added = 0, mapped = 0, unmapped = 0;
    for (const t of trays) {
        if (!isUP(t) || sys(t) || hasEinbau(t)) continue;
        const eBase = einbauMap[key(t.artNr)];
        if (!eBase) { unmapped++; continue; }
        mapped++;
        const eArt = fullSku(eBase);
        const e = apiByKey[key(eBase)] || {};
        const label = e.maktx || 'Einbaukörper';
        setPrice(eArt, e.net && e.net.price != null ? e.net.price : null);
        if (!t.mountingMaterials) t.mountingMaterials = [];
        // single-option mandatory group; the transform's UP sort puts it first (Grundkörper rank 0)
        t.mountingMaterials.unshift({
            name: 'Einbaukörper',
            options: [{ artNr: eArt, label, menge: 1, type: 'Zubehör', imgUrl: imgFromArt(eArt) }]
        });
        added++;
    }
    report[appId] = { added, mapped, unmapped };
}

console.log(`=== inject-ch6-einbaukoerper ${APPLY ? '(APPLY)' : '(DRY RUN)'} ===`);
console.log(`  catalogue mixer→Einbaukörper pairs : ${Object.keys(einbauMap).length}`);
for (const [appId, r] of Object.entries(report)) console.log(`  ${appId}: added ${r.added} Einbaukörper groups (unmapped left: ${r.unmapped})`);
console.log(`  new prices: ${pricesAdded}`);

if (APPLY) {
    fs.copyFileSync(DATA, DATA + '.bak-ch6einbau');
    fs.writeFileSync(DATA, JSON.stringify(data, null, 2) + '\n');
    if (pricesFile.prices) pricesFile.prices = prices; else Object.assign(pricesFile, prices);
    fs.writeFileSync(PRICES, JSON.stringify(pricesFile, null, 2));
    console.log('\nWROTE custom-data.json (backup .bak-ch6einbau) + prices.json');
} else {
    console.log('\nDRY RUN — nothing written.');
}
