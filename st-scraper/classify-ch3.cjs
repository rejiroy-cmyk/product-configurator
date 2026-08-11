/**
 * classify-ch3.cjs — routing table for Chapter 3 (Einzelsanitärapparate und
 * Installationssysteme, PDF pages 699-828). SINGLE SOURCE OF TRUTH for where a
 * Ch3 article goes; `inject-ch3.cjs` must not carry routing rules of its own.
 *
 * Destinations (as specified by the user, 2026-08-11):
 *   Betätigungsplatte, Sanitärmodul, Waschtischelement, Ablaufventil,
 *   Wandklosettelement, Urinoirsteuerung, Urinoirelement  -> zubehoer_pool
 *   Auflegewaschtisch (and the other basin nouns)         -> waschtisch (feeds Mix & Match)
 *   Dusch-WC                                              -> wandklosett | standklosett
 *   Urinoir                                               -> urinoir (new subcategory under Bidet)
 *   everything else                                       -> zubehoer_pool
 *   Hebeanlage                                            -> SKIPPED, not injected
 *
 * FULL-TEXT RULE: every attribute decision below (what a part is FOR, i.e. its
 * targetSubcats) reads label + description + tech together. Only the identity
 * nouns are prefix checks, and they are marked as such.
 */
'use strict';

/** label + description + tech values, mojibake-safe, one line. */
function productText(e) {
    if (!e) return '';
    const tech = Array.isArray(e.tech) ? e.tech.join(' ') : '';
    return [e.maktx, e.description, tech].filter(Boolean).join(' ')
        .replace(/<br\s*\/?>/gi, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

// ---------------------------------------------------------------------------
// 1. Hebeanlage — excluded wholesale.
// The user asked for no Hebeanlage. Its accessories are useless without it, so the
// whole section goes: the pumps themselves plus everything the catalogue prints
// under them, which is identifiable by the SFA brand names (Sanibroy, Sanispeed,
// Sanicom, Sanifos, Sanigrease, Sanipump, Sanialarm) carried in the full text.
// ---------------------------------------------------------------------------
const HEBEANLAGE_NOUN = /^\s*(Hebeanlage|Kleinhebeanlage|Tauchpumpe|Fettabscheider)\b/i;
const SFA_BRAND = /\bSani(broy|speed|com|fos|grease|pump|alarm|access|douche|cubic|slim|vite|best|shower|floor|wall)\b/i;

// ---------------------------------------------------------------------------
// 2. Main-product identity nouns — label-prefix by design: a label literally
//    STARTING with "Urinoir"/"Auflegewaschtisch"/"Dusch-WC" states what the
//    product IS. Longest-first so "Waschtischelement" never matches "Waschtisch"
//    and "Urinoirsteuerung" never matches "Urinoir".
// ---------------------------------------------------------------------------
// "Dusch-WC Aufsatz" is a seat you mount on a WC you already own — an accessory, not a
// klosett. Nine of them (Laufen Cleanet Sit, Toto Washlet, Geberit AquaClean 4000/Tuma).
const NOT_MAIN = /^\s*(Waschtischelement|Waschtischmöbel|Waschtischplatte|Waschtischkonsole|Waschtischablauf|Urinoirsteuerung|Urinoirelement|Urinoirdeckel|Urinoiranlagenteile|Urinoirtrennwand|Urinoirsiphon|Urinoirablauf|Dusch-?\s?WC\s+Aufsatz|Dusch-?\s?Klosett\s+Aufsatz)\b/i;

const BASIN_NOUN = /^\s*(Doppelauflegewaschtisch|Auflegewaschtische|Auflegewaschtisch|Auflegewaschbecken|Auflegewandbecken|Doppelwaschtisch|Reihenwaschtisch|Einbauwaschtisch|Handwaschbecken|Möbelwaschtisch|Schalenbecken|Eckwandbecken|Wandbecken|Waschbecken|Waschtisch)\b/i;
const URINOIR_NOUN = /^\s*(Urinoiranlage|Urinoir|Urinal)\b/i;
const DUSCHWC_NOUN = /^\s*(Dusch-?\s?WC|Dusch-?\s?Klosett|Washlet)\b/i;
const KLOSETT_NOUN = /^\s*(Wand-?Klosettanlage|Wand-?Klosett|Stand-?Klosettanlage|Stand-?Klosett)\b/i;

// Wall vs floor is an ATTRIBUTE, so it is read from the full text, not the prefix.
const isStand = (text) => /\bStand-?(klosett|wc|modell)\b|bodenstehend|Standmodell/i.test(text);
const isWand = (text) => /\bWand-?(klosett|wc|modell)\b|wandhängend|wandhaengend|Wandmodell/i.test(text);

// ---------------------------------------------------------------------------
// 3. What a pool part is FOR -> targetSubcats. Full-text, and deliberately
//    additive: a Sanitärmodul printed "für Wandklosett und Waschtisch" earns both.
// ---------------------------------------------------------------------------
const BASIN_TARGETS = ['waschtisch', 'mixandmatch', 'waschtischmischer'];
function targetsFor(text) {
    const t = String(text || '');
    const out = new Set();
    if (/urino(i)?r|urinal/i.test(t)) out.add('urinoir');
    if (/\bbidet\b/i.test(t)) out.add('bidet');
    if (isWand(t)) { out.add('wandklosett'); }
    if (isStand(t)) { out.add('standklosett'); }
    // A klosett part that names neither wall nor floor fits both.
    if (!out.has('wandklosett') && !out.has('standklosett')
        && /\bklosett|\bwc\b|spülkasten|spuelkasten|betätigungsplatte|betaetigungsplatte|drückerplatte|spülrohr|spuelrohr|spülbogen/i.test(t)) {
        out.add('wandklosett'); out.add('standklosett');
    }
    if (/waschtisch|waschbecken|wandbecken|handwaschbecken|lavabo/i.test(t)) for (const k of BASIN_TARGETS) out.add(k);
    if (/badewanne|duschwanne|duschenwanne/i.test(t)) out.add(/badewanne/i.test(t) ? 'badewanne' : 'duschenwanne');
    return [...out];
}

// Where a family lives when its own text names no fixture. "Siphon Neoperl, 1¼",
// Abgangsrohr 340 mm" says nothing about a Waschtisch, but Ch3 prints the whole
// Ablaufventil/Siphon section under the basins — so the family, not the sentence,
// carries the answer. Only consulted when targetsFor() came back empty.
const DEFAULT_TARGETS = {
    'Dusch-WC Aufsatz': ['wandklosett', 'standklosett'],
    'Betätigungsplatte': ['wandklosett', 'standklosett'],
    'Sanitärmodul': ['wandklosett', 'standklosett'],
    'Installationselement': ['wandklosett', 'standklosett'],
    'WC-Zubehör': ['wandklosett', 'standklosett'],
    'WC-Sitz': ['wandklosett', 'standklosett'],
    'Ablaufventil': BASIN_TARGETS,
    'Siphon': BASIN_TARGETS,
    'Waschtischelement': BASIN_TARGETS,
    'Möbelgriff': ['waschtisch'],
    'Handtuchhalter': ['bidet', 'mixandmatch', 'waschtisch', 'waschtischmischer'],
    'Urinoirsteuerung': ['urinoir'],
    'Urinoirelement': ['urinoir'],
    // Ch3 prints partitions only in the Urinoir section (art-Nr range 348x, right
    // after the 341x/342x/345x urinals) — they are urinal dividers, not shower walls.
    'Trennwand': ['urinoir'],
};

// ---------------------------------------------------------------------------
// 4. productType — the pool's own grouping label (drives the accessory facet bar
//    and the Produktkategorie filter). Curated for the families the user named,
//    leading-noun fallback for the long tail.
// ---------------------------------------------------------------------------
const PRODUCT_TYPES = [
    [/^\s*Dusch-?\s?(WC|Klosett)\s+Aufsatz/i, 'Dusch-WC Aufsatz'],
    [/^\s*Betätigungsplatte|^\s*Betätigungseinheit|^\s*Abdeckplatte|^\s*Abdeckrahmen|^\s*Handdrücker|^\s*WC-Steuerung/i, 'Betätigungsplatte'],
    [/^\s*Sanitärmodul/i, 'Sanitärmodul'],
    [/^\s*Waschtischelement/i, 'Waschtischelement'],
    [/^\s*Wandklosettelement|^\s*Einbauspülkasten|^\s*Installationselement|^\s*Installationsrahmen|^\s*Wandbidetelement|^\s*Wandablaufelement/i, 'Installationselement'],
    [/^\s*Urinoirelement/i, 'Urinoirelement'],
    [/^\s*Urinoirsteuerung|^\s*Steuereinheit|^\s*Ventileinheit/i, 'Urinoirsteuerung'],
    [/^\s*(Ablaufventil|Schaftventil|Siebventil|Kettenventil|Zugventil|Wippventil|Kugelventil)/i, 'Ablaufventil'],
    [/^\s*(Sifon|Siphon|Rohrbogensifon|Rohrbogensiphon|Flaschensiphon|Einbausiphon|Absaugesiphon|Siphonverlängerung|Siphonadapter|Siphonverbindungsmuffe)/i, 'Siphon'],
    [/^\s*(Spülkasten|Spülrohr|Spülbogen|Spülkastendeckel|Spülrohrverbinder|Magnetheber|Staueinsatz|Renovierungsset|Umbauset)/i, 'WC-Zubehör'],
    [/^\s*Klosettsitz/i, 'WC-Sitz'],
    [/^\s*(Schallschutz|Schallschutzset|Schockmontage)/i, 'Schallschutz'],
    [/^\s*Möbelgriff/i, 'Möbelgriff'],
    [/^\s*(Haltegriff|Handtuchhalter|Drahtseifenhalter)/i, 'Handtuchhalter'],
    [/^\s*Trennwand/i, 'Trennwand'],
];
function productTypeOf(maktx) {
    for (const [re, name] of PRODUCT_TYPES) if (re.test(maktx || '')) return name;
    // leading noun, de-hyphenated — same fallback the Ch6 pool injection used
    const w = String(maktx || '').trim().split(/[\s,./]+/)[0].replace(/[^\wÄÖÜäöüß-]/g, '');
    return w || 'Sanitärzubehör';
}

/**
 * @returns {{dest:string, productType:string|null, targetSubcats:string[], reason:string}}
 *          dest: 'skip' | 'waschtisch' | 'wandklosett' | 'standklosett' | 'urinoir' | 'zubehoer_pool'
 */
function classify(entry) {
    const maktx = String((entry && entry.maktx) || '').trim();
    const text = productText(entry);

    if (HEBEANLAGE_NOUN.test(maktx) || SFA_BRAND.test(text)) {
        return { dest: 'skip', productType: null, targetSubcats: [], reason: 'Hebeanlage (excluded)' };
    }
    if (!maktx) {
        return { dest: 'skip', productType: null, targetSubcats: [], reason: 'no text' };
    }

    if (!NOT_MAIN.test(maktx)) {
        if (URINOIR_NOUN.test(maktx)) {
            return { dest: 'urinoir', productType: null, targetSubcats: [], reason: 'Urinoir' };
        }
        if (DUSCHWC_NOUN.test(maktx)) {
            const dest = isStand(text) && !isWand(text) ? 'standklosett' : 'wandklosett';
            return { dest, productType: null, targetSubcats: [], reason: 'Dusch-WC' };
        }
        if (KLOSETT_NOUN.test(maktx)) {
            const dest = isStand(maktx) ? 'standklosett' : 'wandklosett';
            return { dest, productType: null, targetSubcats: [], reason: 'Klosett' };
        }
        if (BASIN_NOUN.test(maktx)) {
            return { dest: 'waschtisch', productType: null, targetSubcats: [], reason: 'Waschtisch' };
        }
    }

    const productType = productTypeOf(maktx);
    const targets = targetsFor(text);
    return {
        dest: 'zubehoer_pool',
        productType,
        targetSubcats: targets.length ? targets : (DEFAULT_TARGETS[productType] || []),
        reason: 'Zubehör',
    };
}

module.exports = { classify, productText, targetsFor, productTypeOf };
