#!/usr/bin/env node
/**
 * inject-ch7-rest.cjs — close the Ch7 gap left by the Waschtrog pilot.
 *
 * The pilot (commit f5a4954) scraped only PDF pp. 1843-1856. This injects the 49
 * catalogue articles from pp. 1843-1862 that never made it into custom-data.json:
 * basins, Ausgussbecken, Roste/Halter/Konsolen, the Geberit + 8111 drain family and
 * the Bosch Kleinboiler.
 *
 * The laundry-appliance block (pp. 1811-1842 — Waschautomat, Wäschetrockner,
 * Verbindungsbausatz, Chipcard/Coin …, 272 bases) is deliberately EXCLUDED per the
 * user: those are white goods, not bathroom fittings.
 *
 * Routing follows commit 607aa3f7 — washbasin-style basins (Schulwandbrunnen, KWC
 * Quadro) live in `waschtisch`, not in the utility wash-station.
 *
 * Usage:
 *   node st-scraper/inject-ch7-rest.cjs            # dry run — prints the plan, writes nothing
 *   node st-scraper/inject-ch7-rest.cjs --write    # back up, then write custom-data.json + prices.json
 */
'use strict';
const fs = require('fs');
const path = require('path');
// custom-data.json is stored INTERNED (repeated mountingMaterials options and
// services live once in a shared table) — readData/writeData hide that. Reading it
// with fs directly yields the STRING "o412" where an option object is expected.
const { readData, writeData } = require('./_dataFile.cjs');

const DIR = __dirname;
const ROOT = path.resolve(DIR, '..');
const INSP = path.join(DIR, 'catalogue-inspection');
const DATA = path.join(ROOT, 'custom-data.json');
const PRICES = path.join(ROOT, 'prices.json');
const WRITE = process.argv.includes('--write');

const work = JSON.parse(fs.readFileSync(path.join(INSP, 'ch7-missing-worklist.json'), 'utf8'));
const api = JSON.parse(fs.readFileSync(path.join(INSP, 'ch7-api.json'), 'utf8'));
const refetchFile = path.join(INSP, 'ch7-api-refetch.json');
const refetch = fs.existsSync(refetchFile) ? JSON.parse(fs.readFileSync(refetchFile, 'utf8')) : {};

// Anonymous public-page scrape (scrape-armaturen-variants.js + scrape-ch7-images.cjs).
// Covers the bases article.ws never resolved: it reads the finish suffix straight off the
// page instead of guessing it, and surfaces colour variants the PDF parse never listed
// (7311 101 also ships .106 Grau marmoriert). No tech attributes — that is the one thing
// only the authenticated API returns, so those records go in without a `tech` map.
const gapFile = path.join(DIR, 'chapter-7-gap-scraped.json');
const gap = fs.existsSync(gapFile) ? JSON.parse(fs.readFileSync(gapFile, 'utf8')) : {};
const gapImgFile = path.join(DIR, 'ch7-gap-images.json');
const gapImg = fs.existsSync(gapImgFile) ? JSON.parse(fs.readFileSync(gapImgFile, 'utf8')) : {};

const b7 = s => String(s || '').replace(/[^0-9]/g, '').slice(0, 7);
const fmtArt = m => { const d = String(m).replace(/[^0-9]/g, ''); return `${d.slice(0, 4)} ${d.slice(4, 7)}.${d.slice(7, 10)}.${d.slice(10, 13)}`; };

// The API wraps `description` at ~28 chars with literal <br> tags. Display text must be
// PLAIN — the SAP clipboard export scrapes the first <strong> in a BOM row for the
// quantity, so any markup that reaches a label corrupts the export (CLAUDE.md,
// _productDisplay.js). The existing pool has zero <br>; keep it that way.
const clean = s => String(s || '')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .replace(/\s+([,;.])/g, '$1')
    .trim();

// tech arrives as ["Marke: KWC Professional", …] from the API; the pool stores it as a flat map.
const techMap = arr => {
    const m = {};
    for (const t of arr || []) {
        const i = String(t).indexOf(':');
        if (i < 0) continue;
        const k = t.slice(0, i).trim(), v = t.slice(i + 1).trim();
        // Dropped at ingest as non-criteria (see CLAUDE.md, Data layer).
        if (['Volumen', 'Gewicht', 'Geräuschgruppe', 'Energieeffizienzklasse', 'Umweltdeklaration EPD'].includes(k)) continue;
        if (v) m[k] = v;
    }
    return m;
};

// In the printed catalogue (p.7.36) but no longer listed on the shop — the anonymous
// product-page lookup returns "notfound", so there is no verified finish suffix for it.
// A guessed art-Nr in an orderable BOM is worse than a missing row, so it stays out.
const SKIP = { '7351112': 'Auflagerost Romay Classic / Trend — not on the shop (discontinued?); no verified art-Nr suffix' };

// ── one merged record per base ────────────────────────────────────────────────
// Fold a public-page scrape record into the same shape the API path produces.
const fromGap = base => {
    const g = gap[base];
    if (!g || g.status !== 'done' || !g.mainArt) return null;
    const entries = Object.entries(g.variants || {});
    const main = entries.find(([, v]) => v.main) || entries.find(([a]) => a === g.mainArt) || entries[0];
    if (!main) return null;
    const img = gapImg[base];
    return {
        matnr: g.mainArt,
        maktx: clean(main[1].desc || g.mainDesc || ''),
        description: clean(g.mainDesc || main[1].desc || ''),
        image: img && img.url ? img.url : '',
        net: main[1].price != null ? main[1].price : null,
        tech: [],
        additionalMaterials: [],
        // Sibling finishes. Colour is left empty on purpose — the COLOUR RULE derives it
        // from the art-Nr finish triplet at render time, never from label text.
        siblings: entries.filter(([a]) => a !== main[0])
            .map(([a, v]) => ({ artNr: a, label: clean(v.desc || main[1].desc || ''), farbe: '', imgUrl: '' })),
    };
};

const recs = [];
const skipped = [];
for (const w of work) {
    if (SKIP[w.base]) { skipped.push({ base: w.base, why: SKIP[w.base] }); continue; }
    const a = refetch[w.base] || fromGap(w.base) || api[w.base] || null;
    const tech = techMap(a && a.tech);
    const label = clean((a && a.maktx) || w.catSeries || '');
    const description = clean((a && a.description) || w.catDesc || label);
    recs.push({
        base: w.base, pdf: w.pdf, page: w.page,
        artNr: a && a.matnr ? fmtArt(a.matnr) : `${w.base.slice(0, 4)} ${w.base.slice(4)}.000.000`,
        label, description, tech,
        image: (a && a.image) || '',
        net: a && a.net != null ? (typeof a.net === 'object' ? a.net.price : a.net) : (w.catNet != null ? w.catNet : null),
        mounting: (a && a.additionalMaterials) || [],
        variants: (a && a.siblings) || [],
        resolved: !!a,
        catSeries: w.catSeries,
    });
}

// ── classification ────────────────────────────────────────────────────────────
// FULL-TEXT RULE (CLAUDE.md): every attribute below is read from label AND
// description AND the structured tech map — never the label alone.
const full = r => `${r.label} ${r.description} ${Object.values(r.tech).join(' ')}`;

// Product IDENTITY only: the leading noun of the merged short text states what the
// article IS ("Auflagerost …, zu Waschtrog" is a rost, not a trough — a keyword
// search anywhere in the text would fall straight into the partner-reference trap).
// label-prefix by design
const leadNoun = r => (r.label || r.catSeries || '').trim().split(/[\s,]/)[0].replace(/[^A-Za-zÄÖÜäöüß]/g, '');

const TRAY_UTILITY = { Waschtrog: 1, Doppelwaschtrog: 1, Einbauwaschtrog: 1, Mehrzweckbecken: 1, Ausgussbecken: 1, Wandausguss: 1, Waschrinne: 1, Waschtröge: 1 };
const TRAY_WASHBASIN = { Schulwandbrunnen: 1, Waschtisch: 1, Doppelwaschtisch: 1, Reihenwaschtisch: 1 };
const ACC_TYPE = {
    Auflagerost: 'Auflagerost', Klapprost: 'Auflagerost', Rosthalter: 'Rosthalter',
    Handtuchhalter: 'Handtuchhalter', Handtuchstange: 'Handtuchstange',
    Rückwand: 'Rückwand', Tablar: 'Tablar', Waschtrogunterbau: 'Waschtrogunterbau',
    Strebenkonsole: 'Konsole', Waschrinnenkonsole: 'Konsole', Konsole: 'Konsole',
    Anschlussstutzen: 'Anschlussstutzen', Siphon: 'Siphon', Sifon: 'Siphon',
    // The 7281 family is the washer/dishwasher wall connection, NOT the trough's own waste
    // — it must not land in the "5 · Siphon" slot. SAP spells it both Sifon and Siphon.
    Einbausifon: 'Anlageteile', Einbausiphon: 'Anlageteile', Anlageteile: 'Anlageteile',
    Kleinboiler: 'Kleinboiler', Adapter: 'Kleinboiler',
    Wandbatterie: 'WandbatterieDrucklos', Einlochbatterie: 'WandbatterieDrucklos',
};

// `manufacturer` is a UI filter bucket, so it must reuse the spellings already in the
// pool. SAP's Marke is the authority; component suppliers that the existing records
// file under "Andere" (Rössler, Geberit, Neoperl, Kemper) keep doing so.
const MARKE_MAP = { 'KWC Professional': 'KWC', 'Rössler': 'Andere', 'Geberit': 'Andere', 'Neoperl': 'Andere', 'Kemper': 'Andere' };
const KNOWN_BRANDS = ['KWC', 'Romay', 'Alterna', 'Laufen', 'Bosch', 'Armatron', 'Duravit', 'Catalano'];
const manufacturerOf = r => {
    const marke = (r.tech.Marke || '').trim();
    if (marke) return MARKE_MAP[marke] || (KNOWN_BRANDS.includes(marke) ? marke : 'Andere');
    const t = full(r);
    for (const b of KNOWN_BRANDS) if (new RegExp(`\\b${b}\\b`, 'i').test(t)) return b;
    return 'Andere';
};

// SAP's Serie feeds the Serie filter, so a typo or a stray lower-case spelling forks an
// existing bucket in two ("Srius" next to "Sirius", "forte" next to "Forte").
const SERIE_FIX = { 'Srius': 'Sirius', 'forte': 'Forte' };
const serieOf = r => {
    const raw = (r.tech.Serie || '').replace(/^KWC\s+/i, '').trim();
    if (raw) return SERIE_FIX[raw] || (/^[a-zäöü]/.test(raw) ? raw[0].toUpperCase() + raw.slice(1) : raw);
    const t = full(r);
    const m = t.match(/\b(Sirius|Planox|Romex|Roclassico|Classic|Trend|Forte|Modern|Quadro|Bernina|Collège|Universal)\b/);
    if (m) return m[1];
    // Records scraped anonymously carry no tech.Serie. Leaving serie empty is not neutral —
    // the app's extractSerie then parses the label and mints a one-item bucket per article
    // ("Waschtrog Mb5040"). KWC's utility troughs are the MB line; take the model prefix.
    const mb = t.match(/\b([A-Z]{2,4})\d{3,4}\b/);
    if (mb) return mb[1];
    return '';
};

// "Breite 65 cm" / tech Breite "650 mm"
const sizeOf = r => {
    const m = full(r).match(/Breite\s*([\d]+(?:[.,]\d+)?)\s*cm/i);
    if (m) return `${m[1].replace(',', '.')} cm`;
    const t = (r.tech.Breite || '').match(/^(\d+)\s*mm$/);
    if (t) return `${Math.round(parseInt(t[1], 10) / 10)} cm`;
    return '';
};

// A BASIN's waste thread. Defaulting to 1½" is right here: it is the utility-trough norm,
// and the slot needs some size to match on.
const drainThreadOf = r => {
    const m = full(r).match(/(1[¼½])\s*["“]/);
    if (m) return `${m[1]}"`;
    if (/1\s*1\/2/.test(full(r))) return '1½"';
    if (/1\s*1\/4/.test(full(r))) return '1¼"';
    return '1½"';
};

// An ANSCHLUSSSTUTZEN's own thread. Must NOT share the basin default: a stutzen whose text
// states no thread (or states 2") would inherit 1½" and be offered as a fitting match for a
// 1½" trough. 8111 217 is a 2" part — mis-sizing it is a wrong article in an ordered BOM.
// Returns '' when unstated, which makes the slot's label-based fallback do the deciding.
const connThreadOf = r => {
    const t = full(r);
    const m = t.match(/Innen(?:rund)?gewinde\s*(2|1[¼½])\s*["“]/i) || t.match(/(1[¼½])\s*["“]/);
    if (m) return `${m[1]}"`;
    if (/\b2\s*["“]/.test(t)) return '2"';
    return '';
};

// Which basins an accessory belongs to. The catalogue writes the list in four shapes:
//   "zu Waschtrog 7211 801"                     single
//   "zu 7311 140 / 141 / 142"                   continuation — the 4-digit prefix carries over
//   "zu Waschtröge 7321 171 / 7321 172"         repeated in full
//   "zu 7521 120 - 129 und 7521 130 - 139"      ranges
// Anchored on the reference phrase on purpose: the text also carries the article's OWN
// number and raw dimensions, and an unanchored digit sweep turns those into parents.
// Reads label + description only — tech holds no cross-references, just measurements
// that would read as art-Nrs once the labels are stripped.
const parentBasesOf = r => {
    const txt = `${r.label} ${r.description}`;
    const out = new Set();
    const add = b => { if (/^7\d{6}$/.test(b) && b !== r.base) out.add(b); };
    for (const seg of txt.matchAll(/\b(?:zu|für|passend\s+zu)\b([^.;]{0,160})/gi)) {
        let prefix = null, last = null;
        const tok = /\b(7\d{3})\s?(\d{3})\b|([/,]|und|oder|bis|-)\s*(\d{3})\b/gi;
        for (let t; (t = tok.exec(seg[1]));) {
            if (t[1]) { prefix = t[1]; last = t[2]; add(prefix + last); continue; }
            if (!prefix) continue;
            const sep = t[3].toLowerCase(), n = t[4];
            if ((sep === '-' || sep === 'bis') && last != null) {
                const a = parseInt(last, 10), b = parseInt(n, 10);
                if (b > a && b - a <= 20) { for (let i = a; i <= b; i++) add(prefix + String(i).padStart(3, '0')); }
                else add(prefix + n);
            } else add(prefix + n);
            last = n;
        }
    }
    return [...out];
};

const UNIVERSAL_ACC = new Set(['Kleinboiler', 'WandbatterieDrucklos', 'Anlageteile']);

// The pilot's extractor took only the FIRST art-Nr of a "zu 7521 120 - 129 und 7521 130 -
// 139" range, so most existing parentBases lists name one basin where the catalogue names
// twenty. That was harmless while the slot fell back to a brand match, but the tightened
// `linked()` treats the list as exhaustive — so heal the lists before relying on them.
// UNION only: never drop an entry the parser fails to see.
const healParents = parts => {
    let touched = 0, added = 0;
    for (const p of parts) {
        if (!p.parentBases) continue;
        const found = parentBasesOf({ base: b7(p.artNr), label: p.label || '', description: p.description || '' });
        const merged = [...new Set([...p.parentBases, ...found])];
        if (merged.length > p.parentBases.length) { added += merged.length - p.parentBases.length; touched++; p.parentBases = merged; }
    }
    return { touched, added };
};

const plan = { waschtrogTrays: [], waschtrogParts: [], waschtischTrays: [], unclassified: [] };

for (const r of recs) {
    const noun = leadNoun(r);
    const man = manufacturerOf(r);
    const serie = serieOf(r);
    const commonTech = Object.keys(r.tech).length ? { tech: r.tech } : {};

    if (TRAY_WASHBASIN[noun]) {
        plan.waschtischTrays.push({
            id: 'wt_' + r.base, manufacturer: man, form: 'Standard', size: sizeOf(r), montageart: 'alle',
            artNr: r.artNr, label: r.label, menge: 1, imgUrl: r.image, variants: r.variants, mountingMaterials: [],
            description: r.description, serie: noun === 'Schulwandbrunnen' ? 'Schulwandbrunnen' : serie,
            ...commonTech, _src: r,
        });
    } else if (TRAY_UTILITY[noun]) {
        plan.waschtrogTrays.push({
            id: 'wt_' + r.base, manufacturer: man, form: 'Standard', size: sizeOf(r), montageart: 'alle',
            artNr: r.artNr, label: r.label, menge: 1, imgUrl: r.image, variants: r.variants, mountingMaterials: [],
            description: r.description, productType: noun === 'Waschtröge' ? 'Waschtrog' : noun,
            serie, role: 'main', drainThread: drainThreadOf(r), drainStyle: 'utility',
            ...commonTech, _src: r,
        });
    } else if (ACC_TYPE[noun]) {
        const accType = ACC_TYPE[noun];
        plan.waschtrogParts.push({
            id: 'wt_' + r.base, manufacturer: man, form: 'Zubehör', size: '', montageart: 'alle',
            artNr: r.artNr, label: r.label, menge: 1, imgUrl: r.image, variants: r.variants, mountingMaterials: [],
            description: r.description, productType: noun, serie, role: 'accessory', accType,
            ...(accType === 'Anschlussstutzen' ? { connThread: connThreadOf(r) } : {}),
            // A water heater (and its drucklos battery) fits any trough regardless of brand,
            // so it must not be gated behind the brand/parentBases match.
            ...(UNIVERSAL_ACC.has(accType) ? { universal: true } : {}),
            parentBases: parentBasesOf(r), compulsory: false,
            ...commonTech, _src: r,
        });
    } else {
        plan.unclassified.push(r);
    }
}

// ── report ────────────────────────────────────────────────────────────────────
const show = (title, arr) => {
    console.log(`\n=== ${title} (${arr.length})`);
    for (const x of arr) {
        const r = x._src || x;
        console.log(`  ${r.pdf} ${x.artNr || r.artNr}  [${x.productType || x.accType || 'Waschtisch'}${x.serie ? ' · ' + x.serie : ''}${x.manufacturer ? ' · ' + x.manufacturer : ''}]`
            + `${x.drainThread ? ' · drain ' + x.drainThread : ''}${x.size ? ' · ' + x.size : ''}`
            + `${x.parentBases && x.parentBases.length ? ' · zu ' + x.parentBases.join('/') : ''}`
            + `${r.resolved ? '' : '  ⚠️ UNRESOLVED (no API hit)'}${r.image ? '' : '  ⚠️ no image'}`);
        console.log(`      ${(x.label || '').slice(0, 110)}`);
    }
};
show('waschtrog.trays  (utility basins)', plan.waschtrogTrays);
show('waschtrog.parts  (accessories / drains / boiler)', plan.waschtrogParts);
show('waschtisch.trays (washbasin-style — per commit 607aa3f7)', plan.waschtischTrays);
if (plan.unclassified.length) {
    console.log(`\n=== ⚠️ UNCLASSIFIED (${plan.unclassified.length}) — no routing rule matched the leading noun`);
    for (const r of plan.unclassified) console.log(`  ${r.pdf} ${r.artNr}  "${r.label || '(no text)'}"  catSeries="${r.catSeries}"`);
}

// Loaded here (not only on --write) so the dry run can report the parentBases heal too.
const data = readData();
const heal = healParents(data.waschtrog.parts);
console.log(`\n=== parentBases heal (existing waschtrog.parts): ${heal.touched} records gain ${heal.added} basin references`);
for (const p of data.waschtrog.parts) {
    if (p.parentBases && p.parentBases.length > 3) console.log(`  ${p.artNr} ${p.accType} → ${p.parentBases.length} parents (${p.parentBases.slice(0, 4).join(',')}…)`);
}

if (skipped.length) {
    console.log(`\n=== SKIPPED (${skipped.length}) — deliberately not injected`);
    for (const s of skipped) console.log(`  ${s.base}  ${s.why}`);
}

const unresolved = recs.filter(r => !r.resolved);
console.log(`\nTOTAL ${recs.length} bases → waschtrog.trays ${plan.waschtrogTrays.length} · waschtrog.parts ${plan.waschtrogParts.length} · waschtisch.trays ${plan.waschtischTrays.length} · unclassified ${plan.unclassified.length}`);
console.log(`unresolved (no API record): ${unresolved.length}${unresolved.length ? ' → ' + unresolved.map(r => r.base).join(', ') : ''}`);
console.log(`with price: ${recs.filter(r => r.net != null).length}/${recs.length} · with image: ${recs.filter(r => r.image).length}/${recs.length}`);

if (!WRITE) { console.log('\nDRY RUN — nothing written. Re-run with --write to apply.'); process.exit(plan.unclassified.length ? 1 : 0); }
if (plan.unclassified.length) { console.error('\nrefusing to write with unclassified records — fix the routing rules first'); process.exit(1); }
if (unresolved.length) { console.error(`\nrefusing to write with ${unresolved.length} unresolved bases — run refetch-ch7-missing.cjs first`); process.exit(1); }

// ── write ─────────────────────────────────────────────────────────────────────
const strip = a => a.map(({ _src, ...rest }) => rest);
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
fs.copyFileSync(DATA, path.join(ROOT, 'backups', `custom-data.pre-ch7-rest.${stamp}.json`));
fs.copyFileSync(PRICES, path.join(ROOT, 'backups', `prices.pre-ch7-rest.${stamp}.json`));

const seen = new Set();
(function walk(n) {
    if (!n || typeof n !== 'object') return;
    if (Array.isArray(n)) return n.forEach(walk);
    if (typeof n.artNr === 'string') seen.add(b7(n.artNr));
    Object.values(n).forEach(walk);
})(data);
const fresh = arr => strip(arr).filter(x => !seen.has(b7(x.artNr)));

const addedT = fresh(plan.waschtrogTrays), addedP = fresh(plan.waschtrogParts), addedW = fresh(plan.waschtischTrays);
data.waschtrog.trays.push(...addedT);
data.waschtrog.parts.push(...addedP);
data.waschtisch.trays.push(...addedW);

// The two Kleinboiler the pilot injected have been unreachable ever since: their accType
// was in no slot list, and Bosch matches no basin brand. Now that Kleinboiler is a slot,
// tag them universal too, or the pool would show the new boilers and hide the old ones.
let backfilled = 0;
for (const p of data.waschtrog.parts) {
    if (UNIVERSAL_ACC.has(p.accType) && p.universal !== true) { p.universal = true; backfilled++; }
}

// Same idea for an empty serie: repair on re-run instead of leaving a per-article bucket
// in the Serie filter. Only ever FILLS a blank — never overwrites a curated value.
let reseried = 0;
for (const t of data.waschtrog.trays) {
    if (t.serie) continue;
    const s = serieOf({ label: t.label || '', description: t.description || '', tech: t.tech || {} });
    if (s) { t.serie = s; reseried++; }
}

// Recompute every stutzen's own thread with the strict parser, so a re-run repairs records
// an earlier pass mis-sized rather than leaving them wrong.
let rethreaded = 0;
for (const p of data.waschtrog.parts) {
    if (p.accType !== 'Anschlussstutzen') continue;
    const t = connThreadOf({ label: p.label || '', description: p.description || '', tech: p.tech || {} });
    if (t !== p.connThread) { p.connThread = t; rethreaded++; }
}

// JSON.stringify(data, null, 2) — anything else reformats all 94k records (CLAUDE.md).
writeData(data, { backup: false });

const pj = JSON.parse(fs.readFileSync(PRICES, 'utf8'));
let priced = 0;
for (const r of recs) {
    if (r.net == null) continue;
    if (pj.prices[r.artNr] == null) { pj.prices[r.artNr] = r.net; priced++; }
}
pj.meta.entries = Object.keys(pj.prices).length;
fs.writeFileSync(PRICES, JSON.stringify(pj, null, 2));

console.log(`\n✅ WROTE  waschtrog.trays +${addedT.length} (now ${data.waschtrog.trays.length}) · waschtrog.parts +${addedP.length} (now ${data.waschtrog.parts.length}) · waschtisch.trays +${addedW.length} (now ${data.waschtisch.trays.length})`);
console.log(`✅ universal-tagged ${backfilled} accessory records (incl. the 2 pre-existing Kleinboiler)`);
console.log(`✅ connThread recomputed on ${rethreaded} Anschlussstutzen · serie filled on ${reseried} trays`);
console.log(`✅ prices.json +${priced} (now ${pj.meta.entries})`);
console.log(`   backups: backups/custom-data.pre-ch7-rest.${stamp}.json`);
console.log(`\nNEXT: node st-scraper/localize-images.cjs && node st-scraper/localize-images.cjs --rewrite && npm test && npm run build`);
