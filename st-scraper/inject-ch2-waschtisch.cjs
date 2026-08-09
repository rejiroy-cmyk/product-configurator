/**
 * inject-ch2-waschtisch.cjs
 * Injects the Chapter 2 (Keramik) WASHBASINS that the configurator never had into
 * `custom-data.json → waschtisch.trays`, with their colour variants, prices, images and
 * the mounting materials the catalogue pairs with each basin.
 *
 * Background: the 494 basins the app shipped with all came from the `Vorlage Waschtisch/*.csv`
 * imports (ids `csv_*`). Chapter 2 of the 2026.6 catalogue carries far more — whole brands
 * (Duravit, Villeroy & Boch) and whole product classes (Auflegewaschtische for Laufen Val /
 * Lua / Kartell / Ino, Waschtischkombinationen) were missing. This closes that gap; the same
 * trays feed Mix & Match, which reads `productApps.waschtisch.trays` for its basin pool.
 *
 * Sources (a full art-Nr is NEVER fabricated — every injected SKU comes from one of these):
 *   catalogue-inspection/ch2-products.json  — catalogue entry: series, spec line, PDF page
 *   chapter-2-variants-scraped.json         — mainArt + colour variants + prices (per base)
 *   catalogue-inspection/ch2-api.json       — matnr, maktx, image, price, tech, Zubehör links
 *   prices.json                             — last-resort full art-Nr resolution + price merge
 *
 * Usage:  node st-scraper/inject-ch2-waschtisch.cjs          # DRY RUN
 *         node st-scraper/inject-ch2-waschtisch.cjs --apply  # writes
 */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(path.dirname(fs.realpathSync(__filename)), '..');
const DATA = path.join(ROOT, 'custom-data.json');
const PRICES = path.join(ROOT, 'prices.json');
const PRODUCTS = path.join(ROOT, 'st-scraper/catalogue-inspection/ch2-products.json');
const API = path.join(ROOT, 'st-scraper/catalogue-inspection/ch2-api.json');
const VARS = path.join(ROOT, 'st-scraper/chapter-2-variants-scraped.json');
const COLORS = path.join(ROOT, 'modules/factories/_colorCodes.js');
const REPORT = path.join(ROOT, 'st-scraper/catalogue-inspection/ch2-waschtisch-injection-report.json');
const APPLY = process.argv.includes('--apply');

const products = JSON.parse(fs.readFileSync(PRODUCTS, 'utf8'));
const api = JSON.parse(fs.readFileSync(API, 'utf8'));
const vars = JSON.parse(fs.readFileSync(VARS, 'utf8'));
const data = JSON.parse(fs.readFileSync(DATA, 'utf8'));
const pricesFile = JSON.parse(fs.readFileSync(PRICES, 'utf8'));
const prices = pricesFile.prices || pricesFile;

// ---------------------------------------------------------------------------
// helpers (same conventions as inject-ch6-shower-accessories.cjs)
// ---------------------------------------------------------------------------
const digits = a => String(a || '').replace(/[^0-9]/g, '');
const base7 = a => digits(a).slice(0, 7);
const proxy = u => (u && /^https?:\/\//.test(u) && !/_nV|_000_000|no-image/.test(u))
    ? ('https://wsrv.nl/?url=' + u.replace(/^https?:\/\//, '')) : '';
const imgFromArt = (art) => {
    const dg = digits(art);
    if (dg.length < 12) return '';
    const a = dg.slice(0, dg.length - 6).padStart(8, '0');
    const f = dg.slice(dg.length - 6, dg.length - 3);
    const s = dg.slice(dg.length - 3);
    return 'https://wsrv.nl/?url=profishop.sanitastroesch.ch/multimedia/Web/PG1/' + a + '_' + f + '_' + s + '.png';
};

// colour name from the art-Nr finish triplet — per _colorCodes.js the colour NEVER comes
// from the label text. Parsed out of the ES module so this CJS script can use the same map.
const COLOR_NAMES = (() => {
    const src = fs.readFileSync(COLORS, 'utf8');
    const map = {};
    for (const m of src.matchAll(/'(\d{3})'\s*:\s*"([^"]*)"/g)) map[m[1]] = m[2];
    return map;
})();
const finishOf = art => { const dg = digits(art); return dg.length >= 12 ? dg.slice(dg.length - 6, dg.length - 3) : ''; };
const colourOf = art => COLOR_NAMES[finishOf(art)] || '';

// Catalogue PDF text carries soft-hyphen line breaks ("Be‐ festigungsmaterial"), <br> from the
// API, the price columns of the printed table ("3491.— 3773.75") and colour-code lists.
// Repair before anything reads it — the spec line is what the full-text extractors classify on.
const DEC = '';   // placeholder that shields decimal commas ("57,5") from list spacing
const clean = (s) => String(s || '')
    .replace(/(\d),(\d)/g, '$1' + DEC + '$2')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/[‐‑]\s+/g, '')            // hyphenated line break -> rejoin the word
    .replace(/[‐‑]/g, '-')
    // printed price columns: "3491.— 3773.75" (netto .— brutto), repeated once per colour group
    .replace(/\d[\d'’]*\.[—–]\s*\d[\d'’]*(?:\.\d+)?/g, ' ')
    .replace(/\d[\d'’]*\.[—–]/g, ' ')
    // "Farbe: 646, 713" lists the Befestigungsmaterial/finish CODES. Per _colorCodes.js the
    // colour is read from the art-Nr triplet, never from the text — drop it.
    .replace(/\bFarbe:\s*\d{3}(?:\s*,\s*\d{3})*/gi, ' ')
    .replace(/\s*\bZubehör\b\s*$/i, '')
    .replace(/\s+/g, ' ')
    .replace(/\s*,\s*/g, ', ')          // one space after a list comma, never two
    .replace(/[,\s]+$/, '')
    .replace(new RegExp(DEC, 'g'), ',')  // restore the decimal commas
    .trim();

// ---------------------------------------------------------------------------
// product identity
// ---------------------------------------------------------------------------
// Longest-first so "Waschtischkombination" wins over "Waschtisch"; the lookahead stops
// "Waschtisch" from swallowing "Waschtischmöbel" (furniture, a different product class).
const BASIN_NOUNS = [
    'Doppelauflegewaschtisch', 'Waschtischkombination', 'Auflegewaschtisch', 'Auflegewaschbecken',
    'Auflegewandbecken', 'Doppelwaschtisch', 'Reihenwaschtisch', 'Handwaschbecken', 'Einbauwaschtisch',
    'Möbelwaschbecken', 'Möbelwaschtisch', 'Auflegebecken', 'Eckwandbecken', 'Wandbecken',
    'Waschbecken', 'Waschtisch',
];
const BASIN_RE = new RegExp('^\\s*(' + BASIN_NOUNS.join('|') + ')(?=[\\s,.]|$)', 'i');
// label-prefix by design: a label literally STARTING with "Waschtisch"/"Wandbecken"/… states
// what the product IS. Used only on identity (never to read an attribute) — every attribute
// below (size, Überlauf, Armaturenloch, Serie) is read from the FULL text.
const isBasinIdentity = (text) => BASIN_RE.test(String(text || '').trim());

// The catalogue entry names the series in full ("Auflegewandbecken Laufen Moderna R"), so the
// series is carried EXPLICITLY on the tray instead of being re-inferred from the label. Both
// createWashbasinApp#extractSerie and createMixAndMatchApp#extractSerie return `t.serie`
// verbatim when present, and their inference prefix lists do not cover every Ch2 type noun
// ("Auflegewandbecken", "Doppelauflegewaschtisch", "Waschtischkombination") — without this the
// Serie pill would list "Auflegewandbecken Laufen Moderna R" instead of "Moderna R".
const capitalise = s => s.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
const serieOf = (series, brand) => {
    let s = String(series || '').trim();
    s = s.replace(BASIN_RE, '').trim();                                   // drop the type noun
    if (brand && brand !== 'Andere') s = s.replace(new RegExp('^' + brand.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'), '').trim();
    s = s.replace(/^[-–,:/]\s*/, '').trim();
    return s ? capitalise(s) : '';
};

const BRANDS = ['Villeroy & Boch', 'Ideal Standard', 'Duravit', 'Catalano', 'Alterna', 'Laufen',
    'Keramag', 'Geberit', 'Kaldewei', 'Schmidlin', 'Romay', 'KWC', 'Diaqua'];
const brandOf = (text) => {
    for (const b of BRANDS) if (new RegExp('\\b' + b.replace(/&/g, '&') + '\\b', 'i').test(text || '')) return b;
    return 'Andere';
};

const techOf = (a, key) => {
    for (const t of (a && a.tech) || []) {
        const m = String(t).match(new RegExp('^' + key + ':\\s*(.+)$', 'i'));
        if (m) return m[1].trim();
    }
    return null;
};

// Size in the "B x T" shape the CSV trays use — it feeds the Grösse pill and Mix & Match's
// Breite facet. FULL-TEXT: read the label AND the spec line AND the API tech values, because
// the dimensions are regularly truncated out of the ERP label.
const num = s => String(s).replace(',', '.').replace(/\.0$/, '');
const sizeOf = (text, a) => {
    const t = String(text || '');
    let m = t.match(/(\d+(?:[.,]\d+)?)\s*[x×]\s*(\d+(?:[.,]\d+)?)\s*cm/i);
    if (m) return num(m[1]) + ' x ' + num(m[2]);
    m = t.match(/Breite\s*(\d+(?:[.,]\d+)?)\s*cm[\s\S]{0,60}?Tiefe\s*(\d+(?:[.,]\d+)?)\s*cm/i);
    if (m) return num(m[1]) + ' x ' + num(m[2]);
    m = t.match(/Tiefe\s*(\d+(?:[.,]\d+)?)\s*cm[\s\S]{0,60}?Breite\s*(\d+(?:[.,]\d+)?)\s*cm/i);
    if (m) return num(m[2]) + ' x ' + num(m[1]);
    m = t.match(/Ø\s*(\d+(?:[.,]\d+)?)\s*cm/i);
    if (m) return 'Ø ' + num(m[1]);                       // round bowls have no depth to state
    const b = techOf(a, 'Breite'), d = techOf(a, 'Tiefe');
    if (b && d) return num(Math.round(parseFloat(b) / 10)) + ' x ' + num(Math.round(parseFloat(d) / 10));
    if (b) return num(Math.round(parseFloat(b) / 10)) + ' x ?';
    m = t.match(/(\d+(?:[.,]\d+)?)\s*[x×]\s*(\d+(?:[.,]\d+)?)/);
    return m ? num(m[1]) + ' x ' + num(m[2]) : '';
};
const widthOf = (size) => { const m = String(size).match(/(\d+(?:\.\d+)?)/); return m ? parseFloat(m[1]) : null; };

// ---------------------------------------------------------------------------
// mounting materials — taken from the basin's OWN catalogue Zubehör block, never guessed.
//   Schallschutz Iso-Set: the set is width-rated in its own label
//     3171 110 "bis Breite 80 cm" · 3171 120 "von 81 bis 110 cm" · 3171 150 (4-piece, 3,6 m)
//   Befestigung (Dübelschraube): 2 per bowl — 4 for a Doppelwaschtisch.
// ---------------------------------------------------------------------------
const SCHALLSCHUTZ_BY_WIDTH = (w) => (w == null || w <= 80) ? '3171110' : (w <= 110 ? '3171120' : '3171150');
const fullLabelOf = (art, fallback) => {
    const e = api[base7(art)];
    const own = e && clean(e.maktx);
    return (own && own.length > String(fallback || '').length) ? own : clean(fallback);
};
const mountingFor = (a, size, isDouble) => {
    const groups = [];
    const articles = [];
    for (const g of (a && a.additionalMaterials) || []) for (const art of g.articles || []) articles.push(art);

    const schall = articles.filter(x => base7(x.artNr).startsWith('3171'));
    if (schall.length) {
        const want = SCHALLSCHUTZ_BY_WIDTH(widthOf(size));
        const pick = schall.find(x => base7(x.artNr) === want) || schall[0];
        groups.push({
            id: 'mat_schallschutz',
            name: 'Schallschutz Iso-Set',
            options: [{
                artNr: pick.artNr,
                label: fullLabelOf(pick.artNr, pick.label),
                type: 'Zubehör',
                menge: 1,
                imgUrl: proxy((api[base7(pick.artNr)] || {}).image) || imgFromArt(pick.artNr),
            }],
        });
    }

    const duebel = articles.filter(x => base7(x.artNr).startsWith('8211'));
    if (duebel.length) {
        const pick = duebel.find(x => base7(x.artNr) === '8211113') || duebel[0];
        groups.push({
            id: 'mat_duebelschraube',
            name: 'Befestigung',
            options: [{
                artNr: pick.artNr,
                label: fullLabelOf(pick.artNr, pick.label),
                type: 'Zubehör',
                menge: isDouble ? 4 : 2,
                imgUrl: proxy((api[base7(pick.artNr)] || {}).image) || imgFromArt(pick.artNr),
            }],
        });
    }
    return groups;
};

// NB: moebel-skus.json / schraenke-skus.json are deliberately NOT used as a negative guard.
// They are scrape dumps, not identity lists: every SKU met while scraping a Waschtischmöbel is
// tagged productType "Waschtischmöbel" there, including the basins that pair with it
// ("Wandbecken Pro / Pro S") and its fittings ("Möbelsiphon Viega"). Using them to reject
// would drop ~34 real basins. A genuine Waschtischmöbel is already excluded by its own label,
// which starts with "Waschtischmöbel" and so never matches BASIN_NOUNS.

// ---------------------------------------------------------------------------
// resolve a full 12-digit art-Nr for a base — API matnr, then the scrape's mainArt, then
// prices.json (preferring the white ceramic finishes the basin range actually ships in).
// ---------------------------------------------------------------------------
const pricesByBase = {};
for (const k of Object.keys(prices)) {
    const b = base7(k);
    if (b) (pricesByBase[b] = pricesByBase[b] || []).push(k);
}
const WHITE = ['100', '105', '104', '101'];
const resolveArt = (b) => {
    const a = api[b], v = vars[b];
    if (a && a.matnr && digits(a.matnr).length >= 12) return a.matnr;
    if (v && v.mainArt && digits(v.mainArt).length >= 12) return v.mainArt;
    const cands = pricesByBase[b] || [];
    if (!cands.length) return null;
    for (const w of WHITE) { const hit = cands.find(x => finishOf(x) === w); if (hit) return hit; }
    return cands.slice().sort()[0];
};

const setPrice = (art, p) => {
    if (p == null || !art) return;
    const k = String(art);
    if (!(k in prices)) { prices[k] = p; report.pricesAdded++; }
};

// ---------------------------------------------------------------------------
// walk the catalogue
// ---------------------------------------------------------------------------
if (!data.waschtisch) data.waschtisch = { trays: [] };
const trays = data.waschtisch.trays;
const present = new Set(trays.map(t => base7(t.artNr)));

const report = {
    generated: new Date().toISOString(),
    source: 'Sanitas Troesch 2026.6 — Chapter 2 (Keramik, PDF pages 453-695)',
    added: [], skippedNotBasin: [], skippedUnresolved: [], pricesAdded: 0,
};
const seen = new Set();
let entries = 0;

for (const p of products) {
    if (!isBasinIdentity(p.series)) continue;
    entries++;
    // The catalogue parse sweeps each entry's Zubehör art-Nrs into the same `variants` array
    // (partner-reference trap), so the entry's own SKUs are the ones sharing its dominant prefix.
    const pfxCount = {};
    for (const v of p.variants || []) { const x = base7(v.artNr).slice(0, 4); if (x) pfxCount[x] = (pfxCount[x] || 0) + 1; }
    const domPfx = Object.entries(pfxCount).sort((a, b) => b[1] - a[1])[0];

    for (const v of p.variants || []) {
        const b = base7(v.artNr);
        if (!b || seen.has(b)) continue;
        seen.add(b);
        if (present.has(b)) continue;               // already in the configurator — idempotent re-runs

        const a = api[b] || null;
        const sc = vars[b] || null;
        const ownLabel = clean((a && a.maktx) || (sc && sc.mainDesc) || '');
        const catText = clean(p.series + ', ' + (p.description || ''));

        // IDENTITY — what is this art-Nr itself? Prefer the article's own text; when neither the
        // API nor the scrape reached it, fall back to the catalogue entry, but only for a SKU in
        // the entry's own number range (that is what separates the basin from its Zubehör).
        const isBasin = ownLabel
            ? isBasinIdentity(ownLabel)
            : (domPfx && b.startsWith(domPfx[0]));
        if (!isBasin) {
            report.skippedNotBasin.push({ base: b, series: p.series, ownLabel: ownLabel || null });
            continue;
        }

        const artNr = resolveArt(b);
        if (!artNr) {
            // No confirmed SKU in any source. Fabricating the finish triplet would put a
            // wrong art-Nr into an order — leave it out and report it instead.
            report.skippedUnresolved.push({ base: b, series: p.series, description: clean(p.description), pdfPage: p.pdfPage });
            continue;
        }

        // FULL-TEXT: everything downstream (Überlauf, Armaturenloch, Serie, Grösse) is read from
        // label + description + tech together, never from the truncated ERP label alone.
        const apiDesc = clean(a && a.description);
        const description = [catText, apiDesc].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
        const fullText = [ownLabel, description, ((a && a.tech) || []).join(' ')].filter(Boolean).join(' ');

        const size = sizeOf(fullText, a);
        const isDouble = /doppel|reihenwaschtisch/i.test(fullText);
        const colour = colourOf(artNr);
        const label = (ownLabel && ownLabel.length >= 20)
            ? ownLabel
            : clean(p.series + ', ' + (p.description || '') + (colour ? ', ' + colour : ''));

        const variantList = (sc && sc.variants)
            ? Object.entries(sc.variants)
                .filter(([x]) => digits(x) !== digits(artNr))
                .map(([x, vd]) => ({ artNr: x, label: clean(vd.desc) || label, farbe: colourOf(x), imgUrl: imgFromArt(x) }))
            : [];

        setPrice(artNr, (a && a.net && a.net.price != null) ? a.net.price
            : (sc && sc.variants && sc.variants[artNr] && sc.variants[artNr].price != null) ? sc.variants[artNr].price
                : (v.net != null ? v.net : null));
        if (sc && sc.variants) for (const [x, vd] of Object.entries(sc.variants)) setPrice(x, vd.price);

        const manufacturer = techOf(a, 'Marke') || brandOf(p.series) || 'Andere';
        const tray = {
            id: 'ch2_' + b,
            manufacturer,
            form: 'Standard',
            size,
            artNr,
            label,
            description,
            serie: serieOf(p.series, manufacturer),
            menge: 1,
            imgUrl: proxy(a && a.image) || imgFromArt(artNr),
            variants: variantList,
            mountingMaterials: mountingFor(a, size, isDouble),
        };
        if (!tray.serie) delete tray.serie;          // fall back to the app's own inference
        trays.push(tray);
        present.add(b);
        report.added.push({
            base: b, artNr, manufacturer, size, label, serie: tray.serie || null,
            variants: variantList.length, mounting: tray.mountingMaterials.map(m => m.id), pdfPage: p.pdfPage,
        });
    }
}

// ---------------------------------------------------------------------------
// report
// ---------------------------------------------------------------------------
const bySeriesKey = r => String(r.label).split(',')[0];
const grouped = {};
for (const r of report.added) { const k = bySeriesKey(r); (grouped[k] = grouped[k] || []).push(r); }
const byBrand = {};
for (const r of report.added) byBrand[r.manufacturer] = (byBrand[r.manufacturer] || 0) + 1;

console.log(`=== inject-ch2-waschtisch ${APPLY ? '(APPLY)' : '(DRY RUN)'} ===`);
console.log(`  catalogue basin entries scanned : ${entries}`);
console.log(`  basins ADDED                    : ${report.added.length}`);
console.log(`  colour variant SKUs attached    : ${report.added.reduce((s, r) => s + r.variants, 0)}`);
console.log(`  mounting groups attached        : ${report.added.reduce((s, r) => s + r.mounting.length, 0)}`);
console.log(`  new prices merged               : ${report.pricesAdded}`);
console.log(`  skipped — not a basin (Zubehör)  : ${report.skippedNotBasin.length}`);
console.log(`  skipped — no confirmed art-Nr    : ${report.skippedUnresolved.length}`);
console.log(`  waschtisch.trays total now      : ${trays.length}`);
console.log('  --- added by brand ---');
for (const [b, n] of Object.entries(byBrand).sort((a, b) => b[1] - a[1])) console.log(`    ${String(n).padStart(4)}  ${b}`);
console.log('  --- added by product type ---');
for (const [k, rs] of Object.entries(grouped).sort((a, b) => b[1].length - a[1].length).slice(0, 25)) {
    console.log(`    ${String(rs.length).padStart(4)}  ${k}`);
}
if (report.skippedNotBasin.length) {
    console.log('  --- skipped: the art-Nr is not itself a basin ---');
    const g = {};
    for (const r of report.skippedNotBasin) {
        const k = r.ownLabel ? r.ownLabel.split(',')[0] : 'no own text, foreign number range';
        (g[k] = g[k] || []).push(r.base);
    }
    for (const [k, bs] of Object.entries(g).sort((a, b) => b[1].length - a[1].length)) {
        console.log(`    ${String(bs.length).padStart(4)}  ${k}  [${bs.slice(0, 6).join(', ')}${bs.length > 6 ? ', …' : ''}]`);
    }
}
if (report.skippedUnresolved.length) {
    console.log('  --- no confirmed art-Nr (needs an API refetch with a session cookie) ---');
    const g = {};
    for (const r of report.skippedUnresolved) (g[r.series] = g[r.series] || []).push(r.base);
    for (const [s, bs] of Object.entries(g)) console.log(`    ${String(bs.length).padStart(4)}  ${s}  [${bs.join(', ')}]`);
}

if (APPLY) {
    fs.copyFileSync(DATA, DATA + '.bak-ch2wt');
    fs.writeFileSync(DATA, JSON.stringify(data, null, 2) + '\n');
    if (pricesFile.prices) {
        pricesFile.prices = prices;
        pricesFile.meta = { ...pricesFile.meta, entries: Object.keys(prices).length };
    } else Object.assign(pricesFile, prices);
    fs.writeFileSync(PRICES, JSON.stringify(pricesFile, null, 2));
    fs.writeFileSync(REPORT, JSON.stringify(report, null, 2));
    console.log('\nWROTE custom-data.json (backup .bak-ch2wt) + prices.json + ' + path.basename(REPORT));
} else {
    console.log('\nDRY RUN — nothing written. Re-run with --apply to commit.');
}
