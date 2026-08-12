/**
 * classify-ch1.cjs — routing table for Chapter 1 (Baden, Duschen, Wellness,
 * PDF pages 26-447). SINGLE SOURCE OF TRUTH for where a Ch1 article goes.
 *
 * Ch1 is the last uninjected chapter and the only one whose new articles are mostly
 * NOT standalone products: of 873 new bases, roughly 690 are Träger, Rahmen, Zargen,
 * Roste and Garnituren that belong ON a tray that already exists. Injecting those
 * mutates working configurators, so the chapter is split into two passes:
 *
 *   PASS A — standalone products. Appends to a pool; cannot damage anything.
 *            Badewanne -> badewanne, Duschwanne/Duschfläche -> duschenwanne,
 *            Duschrinne -> duschenrinne, Dampfdusche -> dampfdusche (NEW pool +
 *            subcategory, per the user), Vorhangstangen -> zubehoer_pool.
 *   PASS B — mounting materials. Attaches to existing trays. Reviewed separately.
 *
 * THE CENTRAL TRAP, and the reason every Pass A rule below ends in \s:
 * German compounds make a prefix match over-capture. `^Badewanne` also matches
 * "Badewannenträger", "Badewannenhaltegriff", "Badewannenfuss" and "Badewannenunterbau"
 * — 42 mounting materials that would have been injected as bathtubs. Requiring
 * whitespace after the head noun ("Badewanne Kaldewei …") separates the product from
 * every compound built on its name.
 *
 * FULL-TEXT RULE: attribute decisions (size, form, montage) read label + description
 * + tech via productText(). The head-noun rules are product-IDENTITY prefix checks —
 * a label literally starting with "Duschrinne " states what the article IS.
 * // label-prefix by design
 */
'use strict';

function productText(e) {
    if (!e) return '';
    const tech = Array.isArray(e.tech) ? e.tech.join(' ') : '';
    return [e.maktx, e.description, tech].filter(Boolean).join(' ')
        .replace(/<br\s*\/?>/gi, ' ').replace(/\s+/g, ' ').trim();
}

// --- PASS A: standalone products. Trailing \s is load-bearing. --------------
// label-prefix by design (product identity)
const PASS_A_RULES = [
    [/^Badewanne\s/i, 'badewanne'],
    [/^(Eckduschwanne|Duschwanne|Duschfl[äa]che)\s/i, 'duschenwanne'],
    [/^Duschrinne\s/i, 'duschenrinne'],
    [/^Dampfdusche\s/i, 'dampfdusche'],
    [/^(Duschvorhangstange|Duschenvorhangschiene|Deckenst[üu]tze|Duschvorhang)\s/i, 'zubehoer_pool'],
];

// --- PASS B: mounting material. Listed so Pass A can prove it excluded them. -
const PASS_B_NOUNS = /^(Duschwannentr[äa]ger|Badewannentr[äa]ger|Einbau-System-Rahmen|Installationsrahmen|Montagerahmen|Aufsatzrahmen|Fliesen-Abschlussrahmen|Wannengarnitur|Duschwannengarnitur|Muldenrost|Design-Rost|Flexzarge|Duschwannenablauf|Bodenablauf|Verkleidungssystem|Schallschutz|Schall-|Keilschiene|Rohbauset|Montageset|Aufsatz|Ab-|Badewannen|Duschwannen|Badewannenfuss|Duschwannenfuss|Badewannenunterbau|Badewannenhaltegriff|Whirlsystem)/i;

function passOf(entry) {
    const label = (entry && entry.maktx) || '';
    if (PASS_A_RULES.some(([re]) => re.test(label))) return 'A';
    if (PASS_B_NOUNS.test(label)) return 'B';
    return 'B';                       // unclassified defaults to the reviewed pass, never to A
}

function destinationA(entry) {
    const label = (entry && entry.maktx) || '';
    for (const [re, dest] of PASS_A_RULES) if (re.test(label)) return dest;
    return '';
}

// --- attributes -------------------------------------------------------------
/** "163 x 77 x 41,9 cm" → "163 x 77 x 41.9"; "70 cm" → "70". Comma decimals normalised. */
function sizeOf(entry, dest) {
    const t = productText(entry);
    const tech = {};
    for (const line of (Array.isArray(entry.tech) ? entry.tech : [])) {
        const i = String(line).indexOf(':');
        if (i > 0) tech[String(line).slice(0, i).trim()] = String(line).slice(i + 1).trim();
    }
    const num = (v) => { const n = parseFloat(String(v).replace(',', '.')); return isFinite(n) ? n : null; };

    // A Rinne is filtered by a single length, not a WxD pair. "Gesamtlänge 83,7 cm"
    // is the only length some Joulia rinnen state, so it counts.
    if (dest === 'duschenrinne') {
        const g = t.match(/(?:gesamtl[äa]nge|l[äa]nge)\s*(\d{2,3}(?:[.,]\d)?)\s*cm/i);
        if (g) return String(Math.round(num(g[1])));
        const m = t.match(/(\d{2,3})\s*cm\b/) || t.match(/(\d{3,4})\s*mm\b/);
        if (m) return String(+m[1] > 300 ? Math.round(+m[1] / 10) : +m[1]);
        const b = num(tech['Breite']) || num(tech['Länge']);
        return b ? String(b > 300 ? Math.round(b / 10) : b) : '';
    }

    // A square corner tray states one side: "Schenkellänge 80 cm" is 80 x 80.
    const sch = t.match(/schenkell[äa]nge\s*(\d{2,3}(?:[.,]\d)?)\s*cm/i);
    if (sch) { const n = num(sch[1]); return `${n} x ${n}`; }

    // How many dimensions the pool's Grösse pills already use. Every badewanne size in
    // the app is a pair ("180 x 80"); duschenwanne carries the tray depth as a third
    // ("80 x 80 x 3.5"). Emitting three parts into badewanne would put each Kaldewei
    // bath on its own pill instead of merging with the pair that is already there.
    const dims = dest === 'duschenwanne' ? 3 : 2;

    const cm = t.match(/(\d{2,3}(?:[.,]\d)?)\s*x\s*(\d{2,3}(?:[.,]\d)?)(?:\s*x\s*(\d{1,3}(?:[.,]\d)?))?\s*cm/i);
    if (cm) return [cm[1], cm[2], cm[3]].filter(Boolean).slice(0, dims).map(x => String(num(x))).join(' x ');

    // Kaldewei prints its Meisterstück baths in millimetres: "1550 x 660 mm".
    const mm = t.match(/(\d{3,4})\s*x\s*(\d{3,4})(?:\s*x\s*(\d{2,4}))?\s*mm/i);
    if (mm) return [mm[1], mm[2], mm[3]].filter(Boolean).slice(0, dims).map(x => String(Math.round(+x / 10))).join(' x ');

    const B = num(tech['Breite']), T = num(tech['Tiefe']);
    if (B && T) return `${B > 300 ? Math.round(B / 10) : B} x ${T > 300 ? Math.round(T / 10) : T}`;
    return '';
}

/** The Form pill each app already offers — never invent a new value. */
function formOf(entry, dest) {
    if (dest === 'duschenrinne') return 'Rinne';
    const t = productText(entry);
    if (/viertelkreis/i.test(t)) return 'Viertelkreis';
    if (/\boval\b/i.test(t)) return 'Oval';
    if (dest === 'duschenwanne') {
        const s = sizeOf(entry, dest).split(' x ');
        if (s.length >= 2 && s[0] === s[1]) return 'Quadratisch';
        return /rechteck/i.test(t) || s.length >= 2 ? 'Rechteckig' : 'Standard';
    }
    if (/rechteck/i.test(t)) return 'Rechteckig';
    return 'Standard';
}

/** FULL-TEXT RULE: handing/corner for the Dampfdusche cabins. */
function handingOf(entry) {
    const t = productText(entry);
    if (/ecke\s*links|links\b/i.test(t)) return 'Links';
    if (/ecke\s*rechts|rechts\b/i.test(t)) return 'Rechts';
    return 'Standard';
}

module.exports = {
    productText, passOf, destinationA, sizeOf, formOf, handingOf,
    PASS_A_RULES, PASS_B_NOUNS,
};
