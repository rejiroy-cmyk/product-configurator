/**
 * inject-wtm-wall-einbaukoerper.cjs
 *
 * 22 Unterputz WALL mixers in the `waschtischmischer` pool carry an EMPTY mountingMaterials
 * array, so Mix & Match (createMixAndMatchApp#getBOMPreviewItems, the `endmontageset` branch)
 * has nothing to emit and the Stückliste silently ships an Endmontageset with no body behind
 * the wall. The 121 wall mixers that DO carry the mat prove the code path — this is the data
 * gap under it. Sister script to inject-ch6-einbaukoerper.cjs, which did the same for the
 * duschenmischer/bademischer pools.
 *
 * The body is resolved from THREE sources, in descending authority, and every hit is printed
 * with its provenance so the run can be audited:
 *   API  — ch6-api.json `additionalMaterials` → the Zubehör group's Einbaukörper lines.
 *          This is the vendor's own pairing and is preferred wherever it exists.
 *   CAT  — ch6-products.json: the catalogue prints the Einbaukörper as an extra art-Nr inside
 *          the Endmontageset entry's `variants`. Covers the 6 articles the Ch6 API dump never
 *          held, and is the ONLY source for 6437 573 (see below).
 *   DESC — the article's own "ohne Einbaukörper <base>" sentence. Used as a cross-check on
 *          API/CAT rather than as a primary: it is free text and can be malformed —
 *          6437 573.501.781 reads "ohne Einbaukörper 6438.9975369", which is not an art-Nr at
 *          all. The catalogue puts that article in the same bundle as its two siblings
 *          (6437 570 / 571, p6.352) with 6438 811 + 6438 815, so CAT wins there and DESC is
 *          reported as a mismatch instead of being trusted.
 *
 * A resolved body must EXIST — either already in custom-data.json (8 of the 9 do, with their
 * localized thumbnail, description and tech) or in the Ch6 API dump (6252 848, which nothing
 * in the catalogue had ever pulled in). Anything unresolvable is left alone and listed; a
 * fabricated finish triplet would put a wrong art-Nr into a real order.
 *
 * Touches data.waschtischmischer and nothing else.
 *
 * Usage:  node st-scraper/inject-wtm-wall-einbaukoerper.cjs          # DRY RUN
 *         node st-scraper/inject-wtm-wall-einbaukoerper.cjs --apply  # writes
 */
'use strict';
const fs = require('path') && require('fs');
const path = require('path');

const ROOT = path.resolve(path.dirname(fs.realpathSync(__filename)), '..');
const DATA = path.join(ROOT, 'custom-data.json');
const API = path.join(ROOT, 'st-scraper/catalogue-inspection/ch6-api.json');
const PRODUCTS = path.join(ROOT, 'st-scraper/catalogue-inspection/ch6-products.json');
const APPLY = process.argv.includes('--apply');
// custom-data.json is stored INTERNED — readData/writeData hide that. A raw read
// yields the STRING "o412" where this script expects an option object.
const { readData, writeData } = require('./_dataFile.cjs');

const data = readData();
const api = JSON.parse(fs.readFileSync(API, 'utf8'));
const prodRaw = JSON.parse(fs.readFileSync(PRODUCTS, 'utf8'));
const products = Array.isArray(prodRaw) ? prodRaw : (prodRaw.products || Object.values(prodRaw));

const digits = (a) => String(a || '').replace(/[^0-9]/g, '');
const key7 = (a) => digits(a).slice(0, 7);
const BODY_RE = /^\s*(einbaukörper|grundkörper)/i;
// SAP labels the four below on nearly every article and none is a buying criterion — the same
// set inject/apply-refetched-text drops at ingest (see CLAUDE.md, Data layer).
const TECH_DROP = new Set(['Volumen', 'Gewicht', 'Geräuschgruppe', 'Energieeffizienzklasse']);

// ── the gap set: the caller's own predicate, so the selection is reproducible ────────────────
const txt = (o) => ((o.label || '') + ' ' + (o.description || '')).toLowerCase();
const hasBody = (t) => (t.mountingMaterials || []).some(
    (m) => BODY_RE.test(m.name || '') && (m.options || []).length);
const gap = (data.waschtischmischer.trays || []).filter((t) => {
    const s = txt(t);
    if (s.includes('einloch') || !s.includes('wand')) return false;
    if (!/endmontageset|fertigmontageset|fertigset|unterputz|\bup\b/.test(s)) return false;
    return !hasBody(t);
});

// ── source 1: the API's own Zubehör pairing ─────────────────────────────────────────────────
const apiBody = {};                                  // base7 of the mixer -> [body art-Nr]
for (const [b, e] of Object.entries(api)) {
    if (!e) continue;
    const bodies = [];
    for (const g of (e.additionalMaterials || [])) {
        for (const a of (g.articles || [])) {
            const lbl = [a.maktx, a.maktx2, a.label].filter(Boolean).join(' ');
            if (BODY_RE.test(lbl)) bodies.push(a.matnrDisplay || a.matnr || a.artNr);
        }
    }
    if (bodies.length) apiBody[key7(b)] = bodies;
}

// ── source 2: the catalogue bundle ──────────────────────────────────────────────────────────
// An Endmontageset entry lists its Einbaukörper as a sibling art-Nr in `variants`; the body is
// identified by its API label, exactly as inject-ch6-einbaukoerper.cjs does it.
const apiLabel = (a) => { const e = api[key7(a)]; return e ? [e.maktx, e.maktx2].filter(Boolean).join(' ') : ''; };
const catBody = {};
for (const p of products) {
    const vs = [...new Set((p.variants || []).map((v) => v.artNr).filter(Boolean))];
    const bodies = vs.filter((a) => BODY_RE.test(apiLabel(a)));
    if (!bodies.length) continue;
    for (const m of vs) {
        if (bodies.includes(m)) continue;
        const k = key7(m);
        // one mixer can appear in several colour-split entries of the same bundle — union, in order
        catBody[k] = [...new Set([...(catBody[k] || []), ...bodies])];
    }
}

// ── source 3: the article's own sentence ─────────────────────────────────────────────────────
// "ohne Einbaukörper 6438 811 / 815" -> ['6438811','6438815']. Anything that is not a clean
// 4+3 art-Nr base (6437 573's "6438.9975369") yields nothing rather than a guess.
function descBody(t) {
    const s = String(t.description || t.label || '').replace(/<br\s*\/?>/gi, ' ');
    const m = /ohne\s+(?:einbaukörper|grundkörper)\s+([0-9 ./]+)/i.exec(s);
    if (!m) return [];
    const tail = m[1];
    const out = [];
    const first = /(\d{4})[\s.]?(\d{3})(?![\d])/.exec(tail);
    if (!first) return [];
    out.push(first[1] + first[2]);
    // trailing "/ 815" shorthand: same 4-digit prefix, only the 3-digit tail is restated
    for (const mm of tail.slice(first.index + first[0].length).matchAll(/\/\s*(\d{3})(?![\d])/g)) {
        out.push(first[1] + mm[1]);
    }
    return out;
}

// ── resolving a body base to a real, complete option record ─────────────────────────────────
// Preferred: clone what custom-data.json already holds (localized thumbnail + description +
// tech). Fallback: mint it from the API dump — only 6252 848 needs this.
const inData = {};
(function scan(o) {
    if (!o || typeof o !== 'object') return;
    if (Array.isArray(o)) return o.forEach(scan);
    if (o.artNr && BODY_RE.test(o.label || '')) {
        const k = key7(o.artNr);
        const score = (o.description ? 2 : 0) + (o.tech ? 2 : 0) + (o.imgUrl ? 1 : 0);
        if (!inData[k] || score > inData[k]._score) inData[k] = { _score: score, rec: o };
    }
    for (const k in o) scan(o[k]);
})(data);

// The one body no pool has ever carried. Localized from the PG1 bank by the standard
// sha1(bare-url) name — PS1 holds only the 2.3 KB placeholder for this art-Nr.
const MINTED_IMG = { '6252848': 'img/PG1_06252848_000_000_14eb5cad.webp' };

const fullSku = (base) => {
    const d = digits(base);
    if (d.length >= 12) return `${d.slice(0, 4)} ${d.slice(4, 7)}.${d.slice(7, 10)}.${d.slice(10, 13)}`;
    return `${d.slice(0, 4)} ${d.slice(4, 7)}.000.000`;
};
const flatTech = (arr) => {
    const out = {};
    for (const line of (arr || [])) {
        const i = String(line).indexOf(':');
        if (i < 0) continue;
        const k = line.slice(0, i).trim(), v = line.slice(i + 1).trim();
        if (!k || !v || TECH_DROP.has(k)) continue;
        out[k] = v;
    }
    return out;
};

const unresolved = [];
function optionFor(base, type) {
    const k = key7(base);
    const hit = inData[k];
    if (hit) {
        const r = hit.rec;
        const o = { artNr: r.artNr, label: r.label, menge: 1, type, imgUrl: r.imgUrl || '' };
        if (r.description) o.description = r.description;
        if (r.tech) o.tech = JSON.parse(JSON.stringify(r.tech));
        return o;
    }
    const e = api[k];
    if (!e || !e.maktx) { unresolved.push(base); return null; }
    const o = {
        artNr: fullSku(e.matnr || base), label: [e.maktx, e.maktx2].filter(Boolean).join(' ').trim(),
        menge: 1, type, imgUrl: MINTED_IMG[k] || '',
    };
    const desc = String(e.description || '').replace(/<br\s*\/?>/gi, ' ').replace(/\s+/g, ' ').trim();
    if (desc) o.description = desc;
    const tech = flatTech(e.tech);
    if (Object.keys(tech).length) o.tech = tech;
    return o;
}

// ── build ───────────────────────────────────────────────────────────────────────────────────
const rows = [];
let added = 0;
for (const t of gap) {
    const k = key7(t.artNr);
    const fromApi = apiBody[k] || [];
    const fromCat = catBody[k] || [];
    const fromDesc = descBody(t);

    // API and CAT are the authorities; DESC only corroborates.
    const bases = fromApi.length ? fromApi : fromCat;
    const src = fromApi.length ? 'API' : (fromCat.length ? 'CAT' : '—');
    if (!bases.length) {
        rows.push({ artNr: t.artNr, src: 'NONE', bodies: [], note: 'no body in API, catalogue or text' });
        continue;
    }
    const dset = new Set(bases.map(key7));
    const note = fromDesc.length
        ? (fromDesc.every((d) => dset.has(key7(d))) ? 'desc agrees' : `desc says ${fromDesc.join(' + ')} — IGNORED`)
        : 'desc silent';

    const options = [];
    let bad = false;
    bases.forEach((b, i) => {
        const o = optionFor(b, i === 0 ? 'Zubehör' : 'Option');
        if (!o) { bad = true; return; }
        options.push(o);
    });
    if (bad || !options.length) {
        rows.push({ artNr: t.artNr, src, bodies: bases, note: 'body art-Nr not found in data or API — SKIPPED' });
        continue;
    }
    // The opt-out the UI needs; it must never be options[0] — the BOM emits that one blind.
    options.push({ artNr: 'ohne_einbaukr', label: 'Ohne Einbaukörper', menge: 0, type: 'Option', imgUrl: '' });

    if (!Array.isArray(t.mountingMaterials)) t.mountingMaterials = [];
    t.mountingMaterials.unshift({
        id: 'mat_einbaukr_' + digits(options[0].artNr).slice(0, 8),
        name: 'Einbaukörper',
        options,
    });
    added++;
    rows.push({ artNr: t.artNr, src, bodies: options.filter((o) => o.type !== 'Option' || !/^ohne_/.test(o.artNr)).filter((o) => !/^ohne_/.test(o.artNr)).map((o) => o.artNr), note });
}

// ── report ──────────────────────────────────────────────────────────────────────────────────
console.log(`=== inject-wtm-wall-einbaukoerper ${APPLY ? '(APPLY)' : '(DRY RUN)'} ===`);
console.log(`  gap wall mixers in waschtischmischer : ${gap.length}`);
console.log(`  Einbaukörper groups added            : ${added}`);
console.log('');
for (const r of rows) {
    console.log(`  [${r.src.padEnd(4)}] ${r.artNr}  ->  ${r.bodies.join(' + ') || '(none)'}   (${r.note})`);
}
if (unresolved.length) console.log(`\n  UNRESOLVED body art-Nrs: ${[...new Set(unresolved)].join(', ')}`);

if (APPLY) {
    // no trailing newline — that is how this file is currently stored; adding one would
    // put a whole-file diff on top of the real change
    writeData(data);   // interns, backs up, indent 2
    console.log('\nWROTE custom-data.json (backup .bak-wtmeinbau)');
} else {
    console.log('\nDRY RUN — nothing written.');
}
