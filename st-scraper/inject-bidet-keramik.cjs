#!/usr/bin/env node
/**
 * inject-bidet-keramik.cjs — build the Bidet-Keramik pool for the Bidet configurator.
 *
 * The Bidet subcategory used to be mixer-only. To turn it into a Mix&Match-style
 * builder it needs a second column: the ceramic itself. The 2026.6 catalogue has
 * exactly 13 bidet ceramics, and prints each one's Zubehör (Rohrbogensiphon,
 * Regulierventil, Klemmverschraubung, Dübelschraube) right under it — that printed
 * list IS the relational rule the BOM needs, so it is injected with the tray.
 *
 * Sources (in order of authority):
 *   1. catalogue-inspection/ch2-products.json  — the exhaustive font-aware PDF parse.
 *      Authoritative for the SERIES NAME and the Zubehör art-Nrs. Scrape labels are
 *      truncated and lose the brand ("Wand-Bidet Pro" is really "Wand-Bidet Laufen Pro").
 *   2. chapter-2-variants-scraped.json         — every colour SKU + its price.
 *   3. catalogue-inspection/ch2-api.json       — image + tech, where the API resolved.
 *
 * Writes a new `bidet_keramik` key into custom-data.json and the SKU prices into
 * prices.json. Images are emitted as vendor URLs; run
 *   node st-scraper/localize-images.cjs && node st-scraper/localize-images.cjs --rewrite
 * afterwards to pull them into public/img like every other image in the app.
 *
 * Usage:  node st-scraper/inject-bidet-keramik.cjs [--apply]     (dry-run by default)
 */

const fs = require('fs');
const path = require('path');
// custom-data.json is stored INTERNED (repeated mountingMaterials options and
// services live once in a shared table) — readData/writeData hide that. Reading it
// with fs directly yields the STRING "o412" where an option object is expected.
const { readData, writeData } = require('./_dataFile.cjs');

const DIR = __dirname;
const ROOT = path.resolve(DIR, '..');
const DATA = path.join(ROOT, 'custom-data.json');
const PRICES = path.join(ROOT, 'prices.json');
const SCRAPE = path.join(DIR, 'chapter-2-variants-scraped.json');
const CH2_PRODUCTS = path.join(DIR, 'catalogue-inspection', 'ch2-products.json');
const CH2_API = path.join(DIR, 'catalogue-inspection', 'ch2-api.json');

const APPLY = process.argv.includes('--apply');
const IMG_HOST = 'https://profishop.sanitastroesch.ch/multimedia/Web/PS1/';

// The 13 bidet ceramic bases the catalogue prints (Ch2). Order = catalogue order.
const BASES = [
    '2116861', '2116915', '2116916', '2111892', '2112492', '2112757',
    '2111335', '2111336', '2142653', '2231394', '2231395', '2231377', '2311689',
];

// Zubehör art-Nrs the catalogue prints under the bidets, resolved to full labels.
// 6511 225 is absent from the API — label taken from the catalogue series line.
const ZUBEHOER = {
    '3531110': { label: 'Rohrbogensiphon Geberit für Wand-Bidet, 1¼" x 40 mm, Weiss', role: 'siphon', sku: '3531 110.100.000' },
    '3531115': { label: 'Rohrbogensiphon für Bidet, 1¼" x 32 mm, Steckdichtung, Verchromt', role: 'siphon', sku: '3531 115.501.000' },
    '6511201': { label: 'Regulierventil Laufen ½", 45 mm, ohne Klemmverschraubung, Verchromt', role: 'regulierventil', sku: '6511 201.501.000' },
    '6511202': { label: 'Regulierventil Laufen ½", 75 mm, ohne Klemmverschraubung, Verchromt', role: 'regulierventil', sku: '6511 202.501.000' },
    '6511222': { label: 'Regulierventil Laufen ½", 45 mm, ohne Klemmverschraubung, Absperrung vertikal', role: 'regulierventil', sku: '6511 222.501.000' },
    '6511225': { label: 'Regulierventil Laufen Simifix ½", 70 mm, ohne Klemmverschraubung, ohne Rosette', role: 'regulierventil', sku: '6511 225.501.000' },
    '6561112': { label: 'Klemmverschraubung Neoperl, ⅜" x 10 mm Ø, Nylonklemmring, Verchromt', role: 'klemmverschraubung', sku: '6561 112.501.000' },
    '8211114': { label: 'Dübelschraube 165 mm, Länge 165 mm, Kunststoffdübel, M 12', role: 'befestigung', sku: '8211 114.000.000' },
};

const BRANDS = ['Alterna', 'Laufen', 'Duravit', 'Catalano', 'Villeroy & Boch', 'Geberit', 'Keramag'];

const digits = (s) => String(s || '').replace(/\D/g, '');
const norm = (s) => String(s || '')
    .replace(/‐|‑|‒|–/g, '-')   // the PDF parse uses U+2010 hyphens
    .replace(/­/g, '')                          // soft hyphens from the justified columns
    .replace(/<br\s*\/?>/gi, ' ')                    // API descriptions wrap mid-sentence
    .replace(/\s+/g, ' ')
    // The catalogue is set in narrow columns, so words break across lines and the parse
    // keeps the hyphen: "verdeckte Be- festigung". Re-join those, but NOT the genuine
    // German suspended hyphen ("Ab- und Überlaufsystem"), which is followed by a conjunction.
    .replace(/(\p{Ll})-\s+(?!und\b|oder\b|bzw\b)(\p{Ll})/gu, '$1$2')
    .trim();

/** The catalogue description trails into the price/colour matrix — cut it off. */
const cleanDesc = (s) => norm(s)
    .split(/\s*Farbe:/)[0]
    .replace(/\s*Zubehör\s*$/i, '')
    .replace(/[,\s]+$/, '')
    .trim();

/** Vendor image URL for one SKU: 8-padded article _ finish _ suffix. */
function imgFromArt(art) {
    const d = digits(art);
    if (d.length < 10) return '';
    const base = d.slice(0, -6).padStart(8, '0');
    return `${IMG_HOST}${base}_${d.slice(-6, -3)}_${d.slice(-3)}.png`;
}

// ---------------------------------------------------------------- load sources
const scrape = JSON.parse(fs.readFileSync(SCRAPE, 'utf8'));
const api = JSON.parse(fs.readFileSync(CH2_API, 'utf8'));
const products = JSON.parse(fs.readFileSync(CH2_PRODUCTS, 'utf8'));
const rows = Array.isArray(products) ? products : Object.values(products);

/** The catalogue row whose FIRST art-Nr is this base (the product, not a cross-ref). */
function catalogueRow(base) {
    return rows.find(r => {
        const v = (r.variants || []).map(x => digits(x.artNr));
        return v.length && v[0] === base;
    }) || null;
}

/**
 * Zubehör = every art-Nr on the row that is NOT a Ch2 keramik number. The catalogue
 * prints the product first, then its "Zubehör" cross-references, which all live in
 * other chapters (3xxx Sifon, 65xx Armaturen-Zubehör, 82xx Befestigung).
 */
function zubehoerOf(row) {
    if (!row) return [];
    return (row.variants || [])
        .map(v => digits(v.artNr))
        .filter(a => a && !a.startsWith('2'))
        .map(a => ZUBEHOER[a] ? { artNr: ZUBEHOER[a].sku, label: ZUBEHOER[a].label, role: ZUBEHOER[a].role } : null)
        .filter(Boolean);
}

// FULL-TEXT RULE: every classification below reads the catalogue series line AND the
// scraped description AND the API description — never one of them alone.
function fullText(base, row, fam) {
    const apiE = api[base] || {};
    return norm([
        row && row.series,
        row && row.description,
        fam && fam.mainDesc,
        apiE.maktx,
        apiE.description,
        ...(apiE.tech || []),
    ].filter(Boolean).join(' '));
}

function brandOf(text) {
    const t = text.toLowerCase();
    for (const b of BRANDS) if (t.includes(b.toLowerCase())) return b;
    return 'Andere';
}

/** Series = the catalogue title minus the product noun and the brand. */
function serieOf(text, brand) {
    const head = norm(text).split(',')[0];
    let s = head.replace(/^(Wand|Stand)\s*-?\s*Bidet\s*/i, '').trim();
    if (brand !== 'Andere') s = s.replace(new RegExp(brand.replace(/&/g, '&'), 'i'), '').trim();
    s = s.replace(/^[-\s]+/, '').replace(/\s+\d{2}$/, '').trim();
    return s || 'Andere';
}

function montageOf(text) {
    if (/\bStand\s*-?\s*Bidet\b/i.test(text)) return 'Stand';
    if (/\bWand\s*-?\s*Bidet\b/i.test(text)) return 'Wand';
    if (/Montage:\s*Boden/i.test(text)) return 'Stand';
    return 'Wand';
}

// The catalogue writes this both ways round — "verdeckte Befestigung" and
// "Befestigung verdeckt" — so match either order.
function befestigungOf(text) {
    if (/verdeckte?r?s?\s+Befestigung|Befestigung\s+verdeckt/i.test(text)) return 'Verdeckt';
    if (/sichtbare?r?s?\s+Befestigung|Befestigung\s+sichtbar/i.test(text)) return 'Sichtbar';
    return 'Unbekannt';
}

function ueberlaufOf(text) {
    if (/ohne\s+Überlauf/i.test(text)) return 'ohne';
    if (/mit\s+Überlauf|Überlaufsystem/i.test(text)) return 'mit';
    return 'unbekannt';
}

/** Length in cm — the catalogue prints it as a bare number right after the title. */
function groesseOf(text) {
    const m = norm(text).match(/^(?:Wand|Stand)\s*-?\s*Bidet[^,]*,\s*(\d{2})(?:\s*,|\s|$)/i);
    if (m) return m[1];
    const m2 = norm(text).match(/\b(\d{2})\s*x\s*\d{2}\s*cm/i);
    return m2 ? m2[1] : '';
}

// ---------------------------------------------------------------- build trays
const trays = [];
const priceAdds = {};
const warnings = [];

for (const base of BASES) {
    const fam = scrape[base];
    const row = catalogueRow(base);
    if (!fam || fam.status !== 'done') { warnings.push(`${base}: no completed scrape — skipped`); continue; }
    if (!row) warnings.push(`${base}: no catalogue row — brand/Zubehör may be incomplete`);

    const text = fullText(base, row, fam);
    const brand = brandOf(text);
    const serie = serieOf((row && norm(row.series)) || fam.mainDesc, brand);
    const montage = montageOf(text);
    const groesse = groesseOf((row && `${norm(row.series)}, ${cleanDesc(row.description)}`) || fam.mainDesc);
    // The scrape's label drops the brand ("Wand-Bidet Pro"); the catalogue title keeps it.
    const title = row ? `${norm(row.series)}, ${cleanDesc(row.description)}`.replace(/,\s*$/, '') : norm(fam.mainDesc);
    const zubehoer = zubehoerOf(row);
    if (!zubehoer.length) warnings.push(`${base}: catalogue prints no Zubehör`);

    const skus = Object.entries(fam.variants || {});
    const mainEntry = skus.find(([, v]) => v.main) || skus[0];
    if (!mainEntry) { warnings.push(`${base}: no SKUs — skipped`); continue; }

    const variants = skus.map(([artNr, v]) => {
        if (typeof v.price === 'number') priceAdds[artNr] = v.price;
        return { artNr, label: norm(v.desc) || norm(fam.mainDesc), imgUrl: imgFromArt(artNr) };
    });

    trays.push({
        id: `bdk_${base}`,
        manufacturer: brand,
        serie,
        form: `${montage}-Bidet`,
        montageart: montage,
        befestigung: befestigungOf(text),
        ueberlauf: ueberlaufOf(text),
        size: groesse ? `${groesse} cm` : 'Standard',
        artNr: mainEntry[0],
        label: title,
        description: norm(fam.mainDesc),
        menge: 1,
        imgUrl: imgFromArt(mainEntry[0]),
        variants,
        zubehoer,
    });
}

// ---------------------------------------------------------------- report
console.log(`Bidet-Keramik: ${trays.length} trays, ${trays.reduce((n, t) => n + t.variants.length, 0)} SKUs, ${Object.keys(priceAdds).length} prices`);
for (const t of trays) {
    console.log(`  ${t.artNr}  ${t.manufacturer.padEnd(16)} ${t.serie.padEnd(18)} ${t.montageart.padEnd(6)} ${String(t.size).padEnd(9)} ${t.befestigung.padEnd(9)} ${t.variants.length} SKU  Zubehör: ${t.zubehoer.map(z => z.artNr).join(' ') || '—'}`);
}
if (warnings.length) { console.log('\nWarnings:'); warnings.forEach(w => console.log('  ! ' + w)); }

if (!APPLY) { console.log('\nDry run — pass --apply to write custom-data.json + prices.json.'); process.exit(0); }

// ---------------------------------------------------------------- write
const data = readData();
fs.writeFileSync(DATA + '.bak-bidetkeramik', JSON.stringify(data));

// Keep any image already localized into public/img: this script emits vendor URLs, and
// localize-bidet-keramik.cjs replaces them with local paths. Re-running the injection
// must not undo that (and must not re-point the app at the vendor CDN).
const localByArt = {};
for (const t of ((data.bidet_keramik && data.bidet_keramik.trays) || [])) {
    if (t.imgUrl && t.imgUrl.startsWith('img/')) localByArt[t.artNr] = t.imgUrl;
    for (const v of (t.variants || [])) if (v.imgUrl && v.imgUrl.startsWith('img/')) localByArt[v.artNr] = v.imgUrl;
}
let kept = 0;
for (const t of trays) {
    if (localByArt[t.artNr]) { t.imgUrl = localByArt[t.artNr]; kept++; }
    for (const v of t.variants) if (localByArt[v.artNr]) { v.imgUrl = localByArt[v.artNr]; kept++; }
}

data.bidet_keramik = { trays };

// The Accessoires toggle reads zubehoer_pool by targetSubcats, and nothing was tagged
// for 'bidet' yet. Tag the product types the catalogue itself prints on the bidet pages
// (Handtuchreling -> Handtuchhalter, Tablar -> Ablage) plus the two that belong to the
// same zone (soap, and the grab bar the WC subcats already offer). NOT WC-Zubehör:
// a brush and paper holder belong to the Klosett, not the bidet.
const BIDET_ACC_TYPES = ['Handtuchhalter', 'Ablage', 'Seifenspender', 'Klappgriff'];
let tagged = 0;
for (const t of ((data.zubehoer_pool && data.zubehoer_pool.trays) || [])) {
    if (!BIDET_ACC_TYPES.includes(t.productType)) continue;
    if (!Array.isArray(t.targetSubcats)) t.targetSubcats = [];
    if (!t.targetSubcats.includes('bidet')) { t.targetSubcats.push('bidet'); tagged++; }
}

writeData(data, { backup: false });

const prices = JSON.parse(fs.readFileSync(PRICES, 'utf8'));
let added = 0;
for (const [art, p] of Object.entries(priceAdds)) if (prices.prices[art] === undefined) { prices.prices[art] = p; added++; }
prices.meta.entries = Object.keys(prices.prices).length;
fs.writeFileSync(PRICES, JSON.stringify(prices));

console.log(`\nApplied. custom-data.json: bidet_keramik = ${trays.length} trays (backup .bak-bidetkeramik), ${kept} local images kept.`);
console.log(`zubehoer_pool: +${tagged} entries tagged targetSubcats 'bidet' (${BIDET_ACC_TYPES.join(', ')}).`);
console.log(`prices.json: +${added} new.`);
