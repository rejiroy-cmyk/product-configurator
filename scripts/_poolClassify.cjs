//
// What may enter zubehoer_pool, and as what.
//
// Shared by inject-scraped-gessi-variants.cjs (the ingest gate) and
// fix-gessi-pool-types.cjs (the repair for data injected before that gate
// existed). One copy on purpose: the injector's private classifier is what put
// 129 mixers into the accessory pool as "Andere", and a second private copy in
// the repair script would drift the same way.
//
// FULL-TEXT RULE: every check below reads label + description (+ specs when
// present), never the label alone — ERP labels truncate mid-sentence.
//
'use strict';

// Pools that own an article as a MAIN product. Anything already listed in one
// of these is not an accessory, whatever its text says.
const MIXER_POOLS = ['bademischer', 'duschenmischer', 'waschtischmischer',
                     'spueltischmischer', 'bidet', 'mixandmatch'];

const productText = (t) => [
    t.label || '',
    t.description || '',
    t.specs ? Object.values(t.specs).join(' ') : '',
].join(' ');

// ---------------------------------------------------------------------------
// Guard 1 — identity. A label that literally STARTS with "Bademischer" states
// what the product IS; the same word appearing later usually states what it
// PAIRS WITH ("Einbaukörper Gessi ½", für Bade- und Duschenmischer"), which is
// the partner-reference trap. So this is a prefix test, never a substring one.
// label-prefix by design.
// ---------------------------------------------------------------------------
const MAIN_PRODUCT_PREFIX = new RegExp('^\\s*(?:' + [
    'bade[-\\s]',                       // "Bade- und Duschmischer …"
    'bademischer', 'duschmischer', 'duschenmischer',
    'einlochmischer', 'bidetmischer', 'wandmischer',
    'waschtischmischer', 'sp[üu]ltischmischer', 'standventil',
    'showerstation', 'showerpipe', 'duschsystem', 'duschs[äa]ule', 'duschpaneel',
    'wanneneinlauf', 'wannen-schwalleinlauf', 'wannenf[üu]ll',
].join('|') + ')', 'i');

function isMainProduct(item) {
    return MAIN_PRODUCT_PREFIX.test(item.label || item.description || '');
}

// ---------------------------------------------------------------------------
// Guard 2 — presence. Even when the text does not announce it, an article that
// already exists in a mixer pool is a duplicate, not a new accessory.
// Indexes base trays AND their variant SKUs: 7 of the 120 duplicates were
// variants of a base tray, not bases themselves.
// ---------------------------------------------------------------------------
function buildOwnedIndex(data) {
    const owned = new Map();
    for (const pool of MIXER_POOLS) {
        for (const tray of (data[pool] && data[pool].trays) || []) {
            for (const sku of [tray, ...(tray.variants || [])]) {
                if (sku.artNr && !owned.has(sku.artNr)) owned.set(sku.artNr, { pool, tray });
            }
        }
    }
    return owned;
}

// ---------------------------------------------------------------------------
// Typing. The accessory families the colour-match reads (accPoolOf in
// _shared.js) come first, then the pool's leading-noun taxonomy (Ablaufventil,
// Regulierventil, Einlaufgarnitur …). Order matters inside each list.
// ---------------------------------------------------------------------------
// Handbrause deliberately precedes Gleitstange: a "Handbrausegarnitur …,
// Gleitstange 800 mm" is a complete SET, and the pool tags those `Handbrause`
// (isGarniturSet in _shared.js then lifts them into the Brausegarnitur family
// by text). Typing a set `Duschgleitstange` would offer it as a bare rail.
const ACCESSORY_FAMILY_RULES = [
    [/anschlussbogen|brauseanschluss|wandanschluss/i, 'Anschlussbogen'],
    [/brauseschlauch/i, 'Brauseschlauch'],
    [/regenbrause|kopfbrause/i, 'Regenbrause'],
    [/brausearm|deckenanschluss|wandarm/i, 'Brausearm'],
    [/handbrause/i, 'Handbrause'],
    [/gleitstange/i, 'Duschgleitstange'],
    [/brausehalter/i, 'Brausehalter'],
];

// Leading-noun types for accessories no family covers. An allowlist rather than
// "first word of the label", so a surprise never invents a new type silently.
const LEADING_NOUN_RULES = [
    [/^\s*einbauk[öo]rper/i, 'Einbaukörper'],
    [/^\s*grundk[öo]rper/i, 'Grundkörper'],
    [/^\s*auslauf/i, 'Auslauf'],
    [/^\s*regulierventil/i, 'Regulierventil'],
    [/^\s*befestigungsset/i, 'Befestigungsset'],
    [/^\s*rosette/i, 'Rosette'],
    [/^\s*verl[äa]ngerung/i, 'Verlängerung'],
    [/^\s*montageset/i, 'Montageset'],
];

// Returns { type, certain }. `certain: false` means nothing matched and the
// caller should surface it rather than quietly accept "Andere" — that fallback
// is what hid 129 misrouted articles last time.
function classifyAccessoryType(item) {
    const text = productText(item);
    for (const [rx, type] of ACCESSORY_FAMILY_RULES) if (rx.test(text)) return { type, certain: true };
    const label = item.label || item.description || '';
    for (const [rx, type] of LEADING_NOUN_RULES) if (rx.test(label)) return { type, certain: true };
    return { type: 'Andere', certain: false };
}

module.exports = {
    MIXER_POOLS, productText, isMainProduct, buildOwnedIndex,
    classifyAccessoryType, MAIN_PRODUCT_PREFIX,
};
