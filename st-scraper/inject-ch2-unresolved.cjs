#!/usr/bin/env node
/**
 * inject-ch2-unresolved.cjs — the rest of Ch2's `skippedUnresolved` work-list.
 *
 * `inject-ch2-waschtisch.cjs` parked 29 bases because neither
 * `chapter-2-variants-scraped.json` nor `ch2-api.json` could resolve a full art-Nr.
 * Six were Alterna progetto (done by `inject-ch2-progetto.cjs`); these are the
 * other 23:
 *
 *     5 × Waschtischkombination Laufen Pro S   (2112 267/268/269/273/274)
 *     5 × Auflegewaschtisch Catalano Zero      (2231 800/810/830/839/840)
 *     8 × Auflegewaschtisch Catalano Sfera     (2231 638–644, 650)
 *     3 × Auflegewaschtisch Catalano Green     (2231 707/708/709)
 *     2 × Auflegewaschtisch Villeroy & Boch Antao (2311 107/108)
 *
 * Every one has API value **null** and no variant page; the catalogue's "Farbe:"
 * tail is the only source, exactly as for progetto. What makes these harder is the
 * PDF's TWO-COLUMN layout, and two traps come out of it. Both are guarded, and the
 * guards are the reason this is safe rather than a guess:
 *
 *  1. **A price can look like a colour code.** With the "202: Cleaneffekt" marker
 *     lifted out, "… 227, 228,  322.— 348.10" leaves the net price sitting exactly
 *     where the next code would be, and a greedy comma-run swallows it — that is how
 *     a phantom `2231 640.322.000` appeared on the first pass. A 3-digit token
 *     immediately followed by ".—" or a decimal is a PRICE and never a code.
 *
 *  2. **THE CATALOGUE CANNOT BE TRUSTED FOR THE ART-NR — only the shop can.**
 *     Read this before trusting a "Farbe:" list again. The first pass concluded that
 *     "202: Cleaneffekt" was a stray legend token: 202 is absent from the 339-code
 *     Farbschlüssel and from every article and price key in the dataset, which reads
 *     like proof. It is in fact the **THIRD art-Nr group** — the coating — and the
 *     shop serves `PG1/02231638_536_202.png`, i.e. the real SKU is
 *     `2231 638.536.202`, not the `…536.000` that went in. 78 wrong art-Nrs were
 *     injected before `scrape-ch7-images.cjs` caught it.
 *     The reconstructed colour LISTS were wrong too — the column wrap is worse than
 *     it looks. Catalogue said {228,423,535,536} for 2231 638; the shop shows
 *     {172,226,423,535,536}. Not a subset, not a superset: different.
 *
 * SO: when `ch2-gap-images.json` carries a base, its art-Nrs are read out of the
 * shop's own image FILENAMES and are AUTHORITATIVE — the catalogue is used only for
 * the specs and the two price tiers. Without a scrape, only the tier-1 finish is
 * emitted (the one code the catalogue states unambiguously, ahead of its own price);
 * the coloured SKUs are left out, because their third group is unknowable from the
 * page. Re-run the scraper to add them rather than reasoning about the layout.
 *
 * PRICE MAPPING is deliberately independent of the broken colour lists: a Catalano
 * entry has exactly two tiers, "Farbe: <one code> <p1>" and "Farbe: <list> <p2>".
 * A SKU whose colour is the tier-1 code gets p1; every other SKU gets p2.
 *
 * THE VAT GATE: every printed net/gross pair must satisfy gross ≈ net × 1.081, and
 * every colour must resolve in COLOR_NAMES, or the base is REPORTED AND SKIPPED.
 * 39/39 pairs pass. Note what this gate can and cannot do: it proved the numbers are
 * prices, and it could never have caught the third-group error above.
 *
 * Labels: 2112 273 vs 274 are both 120 cm and 2231 641 vs 642 are both Ø 42 cm, so
 * the discriminators (Armaturenlöcher, Höhe, Doppelwaschtisch, Schubladen) are
 * lifted out of the description INTO the label. Three BOM lines that read alike are
 * three chances to order the wrong one.
 *
 * PURGES stale SKUs: any previously-injected art-Nr under a handled base that the
 * authoritative source does not list is removed from the trays AND from prices.json.
 * That is how the 78 wrong ones go away on a re-run.
 *
 * Images: the scraped PG1 URL per SKU is baked in. Run the localisation pipeline
 * (`localize-images.cjs --emit-jobs` → `localize_fetch.py` → `--rewrite`) to pull
 * them local; a remote URL in the data is a live vendor request on every render.
 *
 * IDEMPOTENT: matched by art-Nr; a re-run refreshes text and price, never dupes,
 * and never clobbers a localised image.
 *
 *   node st-scraper/inject-ch2-unresolved.cjs            # dry run
 *   node st-scraper/inject-ch2-unresolved.cjs --write    # apply (backs up first)
 */
'use strict';
const fs = require('fs');
const path = require('path');

const WRITE = process.argv.includes('--write');
const ROOT = path.join(__dirname, '..');
const DATA = path.join(ROOT, 'custom-data.json');
const PRICES = path.join(ROOT, 'prices.json');
const PRODUCTS = path.join(__dirname, 'catalogue-inspection', 'ch2-products.json');
const API = path.join(__dirname, 'catalogue-inspection', 'ch2-api.json');
const REPORT = path.join(__dirname, 'catalogue-inspection', 'ch2-waschtisch-injection-report.json');
const COLORS = path.join(ROOT, 'modules', 'factories', '_colorCodes.js');
// Shop ground truth: art-Nrs read out of image filenames by scrape-ch7-images.cjs
//   BASES=… OUT=ch2-gap-images.json node st-scraper/scrape-ch7-images.cjs
const SHOP_IMAGES = path.join(__dirname, 'ch2-gap-images.json');

const VAT = 1.081;                 // Swiss MWSt on the 2026.6 catalogue
const VAT_TOLERANCE = 0.15;        // rounding in the printed gross
const SKIP_SERIES = /progetto/i;   // owned by inject-ch2-progetto.cjs

const BRAND_OF = [
    [/Laufen/i, 'Laufen'], [/Catalano/i, 'Catalano'],
    [/Villeroy\s*&?\s*Boch/i, 'Villeroy & Boch'], [/Alterna/i, 'Alterna'], [/Duravit/i, 'Duravit'],
];

// ── Colour table: the one source, never a literal here ───────────────────────
const COLOR_NAMES = {};
for (const m of fs.readFileSync(COLORS, 'utf8').matchAll(/'(\d{3})'\s*:\s*"([^"]+)"/g)) COLOR_NAMES[m[1]] = m[2];

// ── Text helpers ─────────────────────────────────────────────────────────────
// The PDF breaks words with U+2010 + newline ("Armaturen‐ löcher"). Rejoin before
// anything reads them: productText() normalises that hyphen to ASCII and would
// otherwise keep the split word forever.
const heal = (s) => String(s || '').replace(/[‐‑]\s+/g, '').replace(/\s+/g, ' ').trim();
const MARKER = /\b202:\s*Cleaneffekt\b/g;
const PRICE_TOK = String.raw`[\d'’]+(?:[.,]\d{2})?\s*\.—|[\d'’]+[.,]\d{2}`;
const toNum = (s) => parseFloat(String(s).replace(/['’]/g, '').replace(/\s*\.—$/, '').replace(',', '.'));
// The "Farbe: … Zubehör" tail is catalogue price formatting, not product text.
const specOnly = (s) => heal(s).replace(MARKER, ' ').replace(/\s*Farbe:.*$/i, '')
    .replace(/\s*Zubehör\s*$/i, '').replace(/[,\s]+$/, '').replace(/\s+/g, ' ');

// Every printed net/gross pair must agree with VAT, or the number read as a net is
// not a price and the tokens around it are not what they look like.
function vatCheck(text) {
    const pairs = [];
    for (const m of text.matchAll(new RegExp(`(${PRICE_TOK})\\s+(${PRICE_TOK})`, 'g'))) {
        const net = toNum(m[1]), gross = toNum(m[2]);
        if (!Number.isFinite(net) || !Number.isFinite(gross)) continue;
        pairs.push({ net, gross, ok: Math.abs(net * VAT - gross) <= VAT_TOLERANCE });
    }
    return pairs;
}

// "Farbe: 105 231.— 249.70 Farbe: 172, 225, …, ⟨price⟩ 423, 535, 536"
function parseFinishes(rawDesc) {
    const text = heal(rawDesc).replace(/\s*Zubehör\s*$/i, '').replace(MARKER, ' ').replace(/\s+/g, ' ');
    const problems = [];
    if (!/Farbe:/.test(text)) return { groups: [], problems, text };
    const groups = [];
    for (const seg of text.split(/Farbe:/).slice(1).map(s => s.trim())) {
        // A 3-digit token followed by ".—" or a decimal is the PRICE, not a code.
        const runM = /^((?:\d{3})(?!\s*(?:\.—|[.,]\d))(?:\s*,\s*\d{3}(?!\s*(?:\.—|[.,]\d)))*)\s*(,?)/.exec(seg);
        if (!runM) { problems.push(`segment without a code run: "${seg.slice(0, 48)}…"`); continue; }
        const codes = runM[1].match(/\d{3}/g) || [];
        const dangling = runM[2] === ',';                       // the column wrap cut the list
        const rest = seg.slice(runM[0].length);
        const priceM = new RegExp(`^\\s*(${PRICE_TOK})`).exec(rest);
        if (!priceM) { problems.push(`no net price after codes ${codes.join(',')}`); continue; }
        const net = toNum(priceM[1]);
        let tail = [];
        const tailM = /((?:\d{3})(?:\s*,\s*\d{3})*)\s*$/.exec(rest);
        if (dangling) {
            if (tailM) tail = tailM[1].match(/\d{3}/g) || [];
            else problems.push(`code run ends with a comma but no wrapped tail was found — list is CUT`);
        }
        const all = [...codes, ...tail];
        const bad = all.filter(c => !COLOR_NAMES[c]);
        if (bad.length) problems.push(`codes not in COLOR_NAMES: ${bad.join(',')}`);
        if (!Number.isFinite(net)) problems.push(`unreadable net price for ${all.join(',')}`);
        groups.push({ codes: all, net });
    }
    return { groups, problems, text };
}

// ── Label building ───────────────────────────────────────────────────────────
const num = (s) => parseFloat(String(s).replace(',', '.'));
const fmt = (n) => (n == null ? null : String(n).replace('.', ','));
const dimOf = (t, word) => { const m = new RegExp(word + '\\s+([\\d,.]+)\\s*cm', 'i').exec(t); return m ? num(m[1]) : null; };

function geometry(spec) {
    // "Ø 32 cm" | "60 x 35 cm" | "Breite 60 cm, Tiefe 50 cm"
    const round = /Ø\s*([\d,.]+)\s*cm/i.exec(spec);
    const rect = /(?:^|,\s*)([\d,.]+)\s*x\s*([\d,.]+)\s*cm/i.exec(spec);
    const breite = dimOf(spec, 'Breite'), tiefe = dimOf(spec, 'Tiefe'), hoehe = dimOf(spec, 'Höhe');
    if (round) return { parts: [`Ø ${fmt(num(round[1]))} cm`], size: `Ø ${num(round[1])}`, hoehe };
    if (rect) return { parts: [`${fmt(num(rect[1]))} x ${fmt(num(rect[2]))} cm`], size: `${num(rect[1])} x ${num(rect[2])}`, hoehe };
    if (breite != null) {
        return {
            parts: [`Breite ${fmt(breite)} cm`, tiefe != null ? `Tiefe ${fmt(tiefe)} cm` : null].filter(Boolean),
            size: tiefe != null ? `${breite} x ${tiefe}` : String(breite), hoehe,
        };
    }
    return null;
}

function discriminators(spec) {
    const out = [];
    if (/doppelwaschtisch/i.test(spec)) out.push('Doppelwaschtisch');
    const loch = (spec.match(/(\d+)\s*Armaturenlöcher/i) || [])[1] || (/\barmaturenloch\b/i.test(spec) ? '1' : null);
    if (loch) out.push(`${loch} ${loch === '1' ? 'Armaturenloch' : 'Armaturenlöcher'}`);
    else if (/ohne\s+armaturenbank/i.test(spec)) out.push('ohne Armaturenbank');
    const schub = (spec.match(/(\d+)\s*Schubladen/i) || [])[1];
    if (schub) out.push(`${schub} Schubladen`);
    return out;
}

// Series name for the `serie` field: the catalogue's series line minus the product
// type and the brand, which is what every other Ch2 tray carries.
function serieOf(series, brand) {
    return heal(series)
        .replace(/^(Waschtischkombination|Auflegewaschtisch|Doppelwaschtisch|Waschtisch|Wandbecken|Handwaschbecken|Einbauwaschtisch|Auflegebecken)\s+/i, '')
        .replace(new RegExp('^' + brand.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s+', 'i'), '')
        .trim();
}

// ── Gather ───────────────────────────────────────────────────────────────────
const report = JSON.parse(fs.readFileSync(REPORT, 'utf8'));
const products = JSON.parse(fs.readFileSync(PRODUCTS, 'utf8'));
const catalogue = Array.isArray(products) ? products : Object.values(products);
const api = JSON.parse(fs.readFileSync(API, 'utf8'));
const SHOP = fs.existsSync(SHOP_IMAGES) ? JSON.parse(fs.readFileSync(SHOP_IMAGES, 'utf8')) : {};
const data = JSON.parse(fs.readFileSync(DATA, 'utf8'));
const trays = (data.waschtisch && data.waschtisch.trays) || [];
if (!trays.length) { console.error('waschtisch.trays is empty — wrong data file?'); process.exit(1); }

const targets = (report.skippedUnresolved || []).filter(x => !SKIP_SERIES.test(x.series || ''));
console.log(`skippedUnresolved: ${(report.skippedUnresolved || []).length} → ${targets.length} after progetto\n`);

const built = [];
const skipped = [];

for (const t of targets) {
    const spaced = `${t.base.slice(0, 4)} ${t.base.slice(4)}`;
    const entry = catalogue.find(e => (e.variants || []).some(v => String(v.artNr || '').trim() === spaced));
    if (!entry) { skipped.push(`${spaced}: no catalogue entry`); continue; }
    if (api[t.base]) { skipped.push(`${spaced}: the API dump has a record now — re-run inject-ch2-waschtisch.cjs instead`); continue; }

    const raw = entry.description || '';
    const bad = vatCheck(heal(raw).replace(MARKER, ' ')).filter(p => !p.ok);
    if (bad.length) { skipped.push(`${spaced}: ${bad.length} net/gross pair(s) fail the VAT check — the numbers are not prices`); continue; }

    const spec = specOnly(raw);
    const { groups, problems } = parseFinishes(raw);

    // A variant that already carries its own colourCode + price needs no parsing.
    const own = (entry.variants || []).find(v => String(v.artNr || '').trim() === spaced);
    const useGroups = groups.length ? groups
        : (own && own.colourCode ? [{ codes: [own.colourCode], net: own.net }] : []);
    if (!useGroups.length) { skipped.push(`${spaced}: no finishes stated by the catalogue`); continue; }
    if (problems.length) { skipped.push(`${spaced}: ${problems.join('; ')}`); continue; }

    const geo = geometry(spec);
    if (!geo) { skipped.push(`${spaced}: no readable geometry in "${spec.slice(0, 50)}…"`); continue; }

    const brand = (BRAND_OF.find(([rx]) => rx.test(entry.series || ''))|| [])[1] || 'Andere';
    const serie = serieOf(entry.series, brand);
    const type = heal(entry.series).split(/\s+/)[0];                    // Waschtischkombination | Auflegewaschtisch
    const material = /kunstharz/i.test(spec) ? 'Kunstharz' : (/folie beschichtet/i.test(spec) ? 'Folie beschichtet' : null);
    const head = `${type} ${brand} ${serie}`.replace(/\s+/g, ' ').trim();

    // ── The SKU list ─────────────────────────────────────────────────────────
    // Shop first: art-Nrs read out of the image filenames, third group and all.
    // The catalogue is used only for the specs and the two price tiers, because it
    // never prints the third group and its colour lists are mangled by the wrap.
    const tier1 = useGroups[0];
    const tier2 = useGroups[useGroups.length - 1];
    const priceFor = (code) => (tier1.codes.includes(code) ? tier1.net : tier2.net);
    const mk = (artNr, code, net) => {
        const farbe = COLOR_NAMES[code];
        return {
            artNr, farbe, net,
            label: [head, material, ...geo.parts, geo.hoehe != null ? `Höhe ${fmt(geo.hoehe)} cm` : null,
                ...discriminators(spec), farbe].filter(Boolean).join(', '),
            description: `${head}, ${spec}, ${farbe}`,   // opens with the label so fullLabel() dedupes
            imgUrl: '',
        };
    };

    const shop = SHOP[t.base];
    let skus, source;
    if (shop && (shop.all || []).length) {
        source = 'shop';
        const bad = [];
        skus = shop.all.map(a => {
            const code = (/\.(\d{3})\./.exec(a.art) || [])[1];
            if (!COLOR_NAMES[code]) { bad.push(a.art); return null; }
            return Object.assign(mk(a.art, code, priceFor(code)), { imgUrl: a.url, imgKind: a.kind });
        }).filter(Boolean);
        if (bad.length) { skipped.push(`${spaced}: shop art-Nr with an unknown colour: ${bad.join(',')}`); continue; }
    } else {
        // No scrape. Only the tier-1 finish is safe — it is the one code the catalogue
        // states unambiguously, ahead of its own price. The coloured SKUs need a third
        // group the page does not print (Catalano's is 202, not 000), so they wait.
        source = 'catalogue (tier 1 only)';
        skus = tier1.codes.map(code => mk(`${spaced}.${code}.000`, code, tier1.net));
        const held = useGroups.slice(1).reduce((n, g) => n + g.codes.length, 0);
        if (held) skipped.push(`${spaced}: ${held} coloured SKU(s) held back — no scrape, third art-Nr group unknown`);
    }
    if (!skus.length) { skipped.push(`${spaced}: no SKUs`); continue; }

    // The tray's own art-Nr must be stable across runs, so it is NOT "whatever the
    // shop listed first" — DOM order varies, and a main that moves creates a second
    // tray for the same base on the next run. Take the first colour the catalogue
    // names (tier 1), which is the finish it prices first.
    const mainCode = tier1.codes[0];
    const mainIdx = Math.max(0, skus.findIndex(s => (/\.(\d{3})\./.exec(s.artNr) || [])[1] === mainCode));
    skus = [skus[mainIdx], ...skus.filter((_, i) => i !== mainIdx)];

    built.push({ base: spaced, page: entry.page, series: entry.series, brand, serie, size: geo.size, skus, source });
}

// ── Report ───────────────────────────────────────────────────────────────────
for (const b of built) {
    console.log(`p.${b.page}  ${b.base}  ${b.series}   [${b.source}]`);
    b.skus.forEach(s => console.log(`     ${s.artNr}  ${String(s.net).padStart(6)}  ${s.imgKind || '—  '}  ${s.label}`));
}
if (skipped.length) {
    console.log(`\n⚠  ${skipped.length} note(s) — held back rather than guessed:`);
    skipped.forEach(s => console.log(`     ${s}`));
}
console.log(`\n${built.length} base(s) → ${built.reduce((n, b) => n + b.skus.length, 0)} SKU(s)`);

// ── Upsert ───────────────────────────────────────────────────────────────────
const byArt = new Map(trays.map(t => [t.artNr, t]));
const priceDoc = JSON.parse(fs.readFileSync(PRICES, 'utf8'));
let added = 0, refreshed = 0;

// Everything this run vouches for, so anything else under a handled base can go.
const authoritative = new Set(built.flatMap(b => b.skus.map(s => s.artNr)));
const handledBases = new Set(built.map(b => b.base));
const baseOf = (a) => { const d = String(a || '').replace(/[^0-9]/g, ''); return d.length >= 7 ? `${d.slice(0, 4)} ${d.slice(4, 7)}` : null; };

// PURGE: a previously-injected SKU under a handled base that the shop does not list
// is a wrong art-Nr — the 78 `…202`-suffix mistakes go out here, from the trays and
// from prices.json both. Only ever touches bases this run rebuilt.
//
// It also drops any EXTRA top-level tray under a handled base. A base owns exactly
// one tray plus its variants; a second one appears the moment the main art-Nr moves
// (the shop lists Laufen's .713 first while the catalogue prices .232 first), and it
// would show the same product twice in the gallery.
const mainOfBase = new Map(built.map(b => [b.base, b.skus[0].artNr]));
const purged = [];
for (let i = trays.length - 1; i >= 0; i--) {
    const t = trays[i];
    const b = baseOf(t.artNr);
    if (!b || !handledBases.has(b)) continue;
    const art = String(t.artNr).trim();
    if (!authoritative.has(art) || art !== mainOfBase.get(b)) {
        // Not a wrong art-Nr if it is merely no longer the main — it comes back as a
        // variant below, so only report the ones that are genuinely gone.
        if (!authoritative.has(art)) purged.push(art);
        trays.splice(i, 1);
        continue;
    }
    if (Array.isArray(t.variants)) {
        for (let j = t.variants.length - 1; j >= 0; j--) {
            const a = String(t.variants[j].artNr || '').trim();
            if (a && !authoritative.has(a)) { purged.push(a); t.variants.splice(j, 1); }
        }
    }
}
let pPurged = 0;
for (const a of purged) if (priceDoc.prices[a] != null) { delete priceDoc.prices[a]; pPurged++; }

const byArtAfterPurge = new Map(trays.map(t => [t.artNr, t]));
for (const b of built) {
    const [main, ...rest] = b.skus;
    const rec = {
        id: `ch2_${b.base.replace(/\s/g, '')}`,
        manufacturer: b.brand,
        form: 'Standard',
        size: b.size,
        artNr: main.artNr,
        label: main.label,
        description: main.description,
        serie: b.serie,
        menge: 1,
        imgUrl: main.imgUrl || '',
        variants: rest.map(v => ({ artNr: v.artNr, label: v.label, farbe: v.farbe, imgUrl: v.imgUrl || '' })),
        mountingMaterials: [],
    };
    const existing = byArtAfterPurge.get(rec.artNr);
    if (existing) {
        // A LOCAL img/ path is the localisation pipeline's output — never overwrite it
        // with a remote URL (that is a live vendor request on every render).
        const keepLocal = String(existing.imgUrl || '').startsWith('img/');
        Object.assign(existing, rec, keepLocal ? { imgUrl: existing.imgUrl } : {});
        refreshed++;
    } else { trays.push(rec); added++; }
}

let pAdded = 0, pFixed = 0;
for (const b of built) for (const s of b.skus) {
    const cur = priceDoc.prices[s.artNr];
    if (cur == null) { priceDoc.prices[s.artNr] = s.net; pAdded++; }
    else if (Math.abs(cur - s.net) > 0.01) { priceDoc.prices[s.artNr] = s.net; pFixed++; }
}

console.log(`Trays : +${added} added, ${refreshed} refreshed, ${purged.length} PURGED (art-Nr the shop does not list)`);
console.log(`Prices: +${pAdded} added, ${pFixed} corrected, ${pPurged} removed`);
if (purged.length) { console.log('   purged:'); purged.slice(0, 12).forEach(a => console.log(`     ${a}`)); if (purged.length > 12) console.log(`     … and ${purged.length - 12} more`); }

if (!WRITE) { console.log('\n(dry run — pass --write to apply)'); process.exit(0); }

for (const f of [DATA, PRICES]) fs.copyFileSync(f, `${f}.bak-ch2unresolved`);
fs.writeFileSync(DATA, JSON.stringify(data, null, 2));
fs.writeFileSync(PRICES, JSON.stringify(priceDoc, null, 2));
console.log('\n✅ written (backups: *.bak-ch2unresolved)');
