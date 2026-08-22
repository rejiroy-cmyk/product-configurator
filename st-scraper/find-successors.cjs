/**
 * find-successors.cjs — propose a replacement for every discontinued article.
 * ---------------------------------------------------------------------------
 * `_discontinued` says an article is gone. It does not say what to order instead,
 * and that is the question the person quoting actually has. This ranks candidates
 * out of the census and REPORTS them — it proposes, it never substitutes. A wrong
 * successor is worse than a missing one: it reaches SAP looking correct.
 *
 * Three cases, in descending confidence:
 *
 *   variant-gone  the base still exists and the census lists its surviving
 *                 finishes. The successor is a colour swap and the colour is the
 *                 art-Nr triplet (COLOUR RULE), never a word — so the sibling in
 *                 the SAME triplet is exact, and any sibling is at least the right
 *                 product. Highest confidence, and it needs no matching at all.
 *   base-gone     the whole product is out. A replacement has to be FOUND: same
 *                 brand, same Warengruppe, same series, same dimensions.
 *   purged        as base-gone; the article is not even in SAP any more.
 *
 * FULL-TEXT RULE: matching reads label AND description (both sides), never the
 * label alone. ERP labels truncate mid-sentence, and the discriminator — "ohne
 * Überlauf", "Armaturenloch", a dimension — regularly survives only in the
 * description. `matchSuccessors` is in tests/verify-fulltext-rule.js's GUARDED list.
 *
 * FOUR GATES, not bonuses. Token overlap is blind to the words that carry the
 * meaning, and every one of these was a wrong proposal the first run made:
 *
 *   size     180 x 80 is not replaced by 170 x 75 at any score.
 *   thread   ½" does not screw onto ¾". The repo already refuses to RANK a thread
 *            mismatch anywhere in a dropdown (see accCandidates/threadOf); a
 *            successor is the same decision with more at stake.
 *   mit/ohne "ohne Vorabsperrung" scored 96% against "mit Vorabsperrung" — the
 *            shared words ARE the article, and the one that differs is the whole
 *            product. Polarity is compared per NOUN, so an unrelated "mit Sieb"
 *            does not veto a match.
 *   ab/bis   "Montagepauschale ab Breite 120 cm" matched "bis Breite 120 cm" at
 *            100%: the exact complement of the position, at a different price.
 *
 * A gate only fires when BOTH sides state the thing. An article that says nothing
 * about a thread contradicts nothing.
 *
 * Usage: node st-scraper/find-successors.cjs [--csv successors.csv]
 */
'use strict';
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const { readData } = require('./_dataFile.cjs');

const DIR = path.join(__dirname, 'census');
const arg = (n, d) => { const i = process.argv.indexOf(n); return i > -1 ? process.argv[i + 1] : d; };

const censusPath = (() => {
    const f = fs.readdirSync(DIR).filter(x => /^\d{4}-\d{2}-\d{2}\.json(\.gz)?$/.test(x)).sort();
    if (!f.length) { console.error('no census — run: npm run catalog:census'); process.exit(1); }
    return path.join(DIR, f[f.length - 1]);
})();
const census = JSON.parse(censusPath.endsWith('.gz') ? zlib.gunzipSync(fs.readFileSync(censusPath)) : fs.readFileSync(censusPath, 'utf8'));

// ---- text helpers -----------------------------------------------------------
const norm = (s) => String(s || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').toLowerCase().trim();
/** label + description + specs, the FULL text — never the label alone. */
const fullText = (o) => {
    if (!o) return '';
    const specs = o.specs && typeof o.specs === 'object' ? Object.values(o.specs).join(' ') : '';
    const tech = o.tech && typeof o.tech === 'object' ? Object.values(o.tech).join(' ') : '';
    return norm([o.label, o.description, o.short, o.long, o.title, specs, tech].filter(Boolean).join(' '));
};
const finishOf = (art) => (String(art).match(/\.(\d{3})\.\d{3}$/) || [])[1] || '';
const leadNoun = (t) => (norm(t).match(/^[a-zäöüß-]+/) || [''])[0];
const DIM = /\b(\d{2,3})[\s,]*[x×][\s,]*(\d{2,3})(?:[\s,]*[x×][\s,]*(\d{1,3}))?\s*(?:cm|mm)?\b/;
const dimsOf = (t) => { const m = norm(t).match(DIM); return m ? `${m[1]}x${m[2]}` : ''; };
const STOP = new Set(['und', 'mit', 'ohne', 'für', 'zu', 'zur', 'zum', 'der', 'die', 'das', 'cm', 'mm', 'inkl', 'aus', 'von', 'im', 'in']);
const tokens = (t) => new Set(norm(t).split(/[^a-z0-9äöüß.]+/).filter(w => w.length > 2 && !STOP.has(w)));

/**
 * Rank census articles as replacements for one discontinued article.
 * Reads the FULL text of both sides (label + description + specs) — see the
 * header. Returns [{art, score, why}], best first.
 */
const FRACTIONS = /(?:1\s*[¼½¾]|[¼½¾⅜⅝⅞]|\b\d\s*\/\s*\d\b)\s*"?/g;
const threadsOf = (t) => new Set((norm(t).match(FRACTIONS) || []).map(x => x.replace(/[\s"]/g, '')));
/** every "mit X" / "ohne X" claim, as noun -> true|false. */
const polarityOf = (t) => {
    const m = new Map();
    for (const [, w, noun] of norm(t).matchAll(/\b(mit|ohne)\s+([a-zäöüß]{4,})/g)) {
        if (!m.has(noun)) m.set(noun, w === 'mit');
    }
    return m;
};
/** "ab Breite 120" vs "bis Breite 120" — the complement position, not the successor. */
const rangeOf = (t) => {
    const m = norm(t).match(/\b(ab|bis)\s+(?:breite|höhe|länge|tiefe)?\s*(\d{2,4})/);
    return m ? { dir: m[1], n: m[2] } : null;
};
const contradicts = (a, b) => {
    for (const [noun, val] of a) if (b.has(noun) && b.get(noun) !== val) return noun;
    return null;
};

/**
 * Rank census articles as replacements for one discontinued article.
 * Reads the FULL text of both sides (label + description + specs) — see the
 * header. Returns [{art, score, why}], best first.
 */
function matchSuccessors(dead, pool) {
    const dText = fullText(dead);                       // label + description + specs
    const dTok = tokens(dText);
    const dDim = dimsOf(dText);
    const dThread = threadsOf(dText);
    const dPol = polarityOf(dText);
    const dRange = rangeOf(dText);
    const dNoun = leadNoun(dead.label || dead.description || '');
    const dFin = finishOf(dead.artNr);
    const dBrand = norm(dead.brand || '');

    const out = [];
    for (const c of pool) {
        const cText = fullText(c);                      // Description_short + _long
        const cNoun = leadNoun(c.short || c.title || '');
        if (dNoun && cNoun && dNoun !== cNoun) continue;            // a different product entirely

        // ---- the four gates. Each fires only when BOTH sides state the thing.
        const cDim = dimsOf(cText);
        if (dDim && cDim && dDim !== cDim) continue;
        const cThread = threadsOf(cText);
        if (dThread.size && cThread.size && ![...dThread].some(x => cThread.has(x))) continue;
        const clash = contradicts(dPol, polarityOf(cText));
        if (clash) continue;
        const cRange = rangeOf(cText);
        if (dRange && cRange && dRange.dir !== cRange.dir) continue;

        let s = 0; const why = [];
        if (dBrand && norm(c.brand) === dBrand) { s += 4; why.push('Marke'); }
        if (dDim && cDim === dDim) { s += 5; why.push(dDim + ' cm'); }
        if (dFin && finishOf(c.art) === dFin) { s += 3; why.push('gleiche Farbe'); }
        if (dThread.size && cThread.size) { s += 2; why.push('gleiches Gewinde'); }
        const cTok = tokens(cText);
        let shared = 0; for (const w of dTok) if (cTok.has(w)) shared++;
        const overlap = dTok.size ? shared / dTok.size : 0;
        s += overlap * 10;
        if (overlap > 0.5) why.push(`${Math.round(overlap * 100)}% Textübereinstimmung`);
        if (s < 5) continue;
        out.push({ art: c.art, score: +s.toFixed(1), why: why.join(' · '), label: (c.short || c.title || '').slice(0, 80), price: c.price });
    }
    return out.sort((a, b) => b.score - a.score).slice(0, 3);
}

// ---- run --------------------------------------------------------------------
const data = readData();
const disc = data._discontinued || {};
const arts = Object.keys(disc);
if (!arts.length) { console.log('nothing flagged — run: node st-scraper/flag-discontinued.cjs --write'); process.exit(0); }

// find our own record for each dead art-Nr, so we match on ITS full text, not the
// truncated label the flag file carries.
const record = new Map();
for (const [pool, v] of Object.entries(data)) {
    const trays = (v && v.trays) || null;
    if (!Array.isArray(trays)) continue;
    (function walk(o) {
        if (Array.isArray(o)) return o.forEach(walk);
        if (!o || typeof o !== 'object') return;
        if (typeof o.artNr === 'string' && disc[o.artNr] && !record.has(o.artNr)) record.set(o.artNr, o);
        for (const k of Object.keys(o)) walk(o[k]);
    })(trays);
}

const shop = Object.values(census.articles);
const byNoun = new Map();
for (const c of shop) { const n = leadNoun(c.short || c.title || ''); if (!n) continue; if (!byNoun.has(n)) byNoun.set(n, []); byNoun.get(n).push(c); }

const rows = [];
let exact = 0, found = 0, none = 0;
for (const art of arts) {
    const info = disc[art];
    const mine = record.get(art) || { artNr: art, label: info.label };
    mine.artNr = art;
    // brand: the census knows it for the siblings; otherwise take the 2nd word of the label
    const sib = (info.siblings || []).filter(s => s !== art);
    if (info.why === 'variant-gone' && sib.length) {
        const same = sib.find(s => finishOf(s) === finishOf(art));
        const pick = same || sib[0];
        rows.push({ art, label: info.label, why: info.why, conf: same ? 'exakt' : 'hoch',
                    sug: pick, sugLabel: (census.articles[pick] || {}).short || '',
                    note: same ? 'gleiche Farbe, gleiche Basis' : `andere Farbe (${sib.length} verfügbar)` });
        exact++; continue;
    }
    const noun = leadNoun(mine.label || info.label);
    const pool = byNoun.get(noun) || shop;
    mine.brand = (String(mine.label || info.label).split(/\s+/)[1] || '').replace(/[^A-Za-zÄÖÜäöü&-]/g, '');
    const hits = matchSuccessors(mine, pool);
    if (!hits.length) { rows.push({ art, label: info.label, why: info.why, conf: 'keiner', sug: '', sugLabel: '', note: 'kein Kandidat im Sortiment' }); none++; continue; }
    const top = hits[0];
    rows.push({ art, label: info.label, why: info.why, conf: top.score >= 12 ? 'hoch' : (top.score >= 8 ? 'mittel' : 'tief'),
                sug: top.art, sugLabel: top.label, note: top.why,
                alt: hits.slice(1).map(h => h.art).join(' / ') });
    found++;
}

const byConf = c => rows.filter(r => r.conf === c).length;
console.log(`census ${path.basename(censusPath)} · ${arts.length} discontinued articles\n`);
console.log(`  exakt   ${String(byConf('exakt')).padStart(3)}   same base, same colour — a straight swap`);
console.log(`  hoch    ${String(byConf('hoch')).padStart(3)}`);
console.log(`  mittel  ${String(byConf('mittel')).padStart(3)}`);
console.log(`  tief    ${String(byConf('tief')).padStart(3)}`);
console.log(`  keiner  ${String(byConf('keiner')).padStart(3)}   nothing in the catalogue matches — decide by hand\n`);

for (const c of ['exakt', 'hoch', 'mittel', 'tief', 'keiner']) {
    const list = rows.filter(r => r.conf === c);
    if (!list.length) continue;
    console.log(`── ${c.toUpperCase()} (${list.length})`);
    list.slice(0, 8).forEach(r => console.log(`   ${r.art} → ${r.sug || '—'}   ${r.note}\n      alt: ${(r.label || '').slice(0, 74)}\n      neu: ${(r.sugLabel || '').slice(0, 74)}`));
    if (list.length > 8) console.log(`   … ${list.length - 8} weitere`);
    console.log('');
}

const csv = arg('--csv', null);
if (csv) {
    const esc = s => '"' + String(s == null ? '' : s).replace(/"/g, '""') + '"';
    let t = 'Art-Nr alt;Bezeichnung alt;Status;Vertrauen;Vorschlag;Bezeichnung neu;Begründung;Alternativen\n';
    rows.forEach(r => { t += [r.art, r.label, r.why, r.conf, r.sug, r.sugLabel, r.note, r.alt || ''].map(esc).join(';') + '\n'; });
    fs.writeFileSync(path.resolve(csv), '﻿' + t);
    console.log(`→ ${csv}`);
}
