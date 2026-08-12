/**
 * classify-ch7.cjs — routing table for Chapter 7 (Waschen, Trocknen — Waschtröge,
 * Ausgussbecken, Wassererwärmer, PDF pages 1811-1862). SINGLE SOURCE OF TRUTH for
 * where a Ch7 article goes; `inject-ch7.cjs` must not carry routing rules of its own.
 *
 * Destinations (as specified by the user, 2026-08-12):
 *   Waschautomat / Wäschetrockner / Waschtrockner   -> SKIPPED, not injected.
 *       205 V-ZUG and Electrolux appliances. They are standalone white goods with
 *       nothing to configure — the same call made on Hebeanlagen in Ch3.
 *   Trough parts (Unterbau, Rückwand, Tablar, Rost …) -> waschtrog.parts
 *       `accType` MUST match the slot keys in createRelationalApp#buildWashStationSlots
 *       verbatim, or the part is injected but never offered.
 *   everything else                                  -> zubehoer_pool
 *
 * FULL-TEXT RULE: every decision reads label + description + tech together via
 * productText().
 *
 * The two traps from Ch8 apply here too and are respected throughout:
 *   `\b` is ASCII-only, so it never matches before an umlaut (Überlauf, Rückwand);
 *   German compounds hide the head noun (WaschtrogUNTERBAU, HaubenABLAUFVENTIL).
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
// 1. White goods — excluded wholesale per the user's decision.
// Identity nouns: what the article IS, so these are the head of the string.
// Coin-System and Waschturm-Zwischenbausatz only exist to serve those machines.
// ---------------------------------------------------------------------------
const WHITE_GOODS = /waschautomat|w[äa]schetrockner|waschtrockner|wascht[üu]rm|w[äa]schepflege|coin-?system|geschirrsp[üu]ler/i;

// …and their accessories. A Verbindungsbausatz stacks a dryer on a washer; a Chipcard
// unlocks one; a Mikroplastikfilter bolts onto one. All of them are useless without the
// machine, so excluding the machine and keeping the accessory would leave orderable
// parts that fit nothing in the app — the same reasoning that took SFA's accessories
// out with the Hebeanlagen in Ch3.
const WHITE_GOODS_ACCESSORY = new RegExp([
    'verbindungsbausatz', 'zwischenbausatz', 'wasch-?\\s*/?\\s*trocken(turm|s[äa]ule)',
    'sockelschublade', 'komfortschublade', 'auszugstablar', 'auszugstisch',
    'chipcard', 'benutzerkarte', 'ladekarte', 'card-?system',
    'w[äa]schebeutel', 'mikroplastikfilter', 'fixier-?rondellen', 'kombiablaufset',
    'bodenplatte.*waschturm', 'f[üu]r trockner', 'zu\\s+card-?system',
].join('|'), 'i');

function isWhiteGood(entry) {
    const t = productText(entry);
    return WHITE_GOODS.test(t) || WHITE_GOODS_ACCESSORY.test(t);
}

// ---------------------------------------------------------------------------
// 2. accType — the wash-station slot the part fills. Ordered, first match wins.
// Every key here MUST exist in buildWashStationSlots or the part is dead weight.
// ---------------------------------------------------------------------------
const ACC_RULES = [
    [/waschtrogunterbau|unterbau(m[öo]bel)?\b/i, 'Waschtrogunterbau'],
    [/wandbatterie.*drucklos|drucklos.*wandbatterie/i, 'WandbatterieDrucklos'],
    [/kleinboiler|wassererw[äa]rmer|boiler\b/i, 'Kleinboiler'],
    [/auflagerost|abtropfrost|\brost\b/i, 'Auflagerost'],
    [/rosthalter/i, 'Rosthalter'],
    [/handtuchstange/i, 'Handtuchstange'],
    [/handtuchhalter/i, 'Handtuchhalter'],
    [/r[üu]ckwand/i, 'Rückwand'],
    // 'Auszugstablar' is a washer-dryer stacking shelf, not a wash-station Tablar —
    // the white-goods guard above catches it first, but keep this anchored anyway.
    [/(^|[^a-zà-ÿ])tablar/i, 'Tablar'],
    [/konsole|strebenkonsole/i, 'Konsole'],
    [/anlageteile|ger[äa]teanschluss|einbausiphon/i, 'Anlageteile'],
    [/anschlussstutzen/i, 'Anschlussstutzen'],
    [/abstellverschraubung/i, 'Abstellverschraubung'],
    [/haubenablaufventil|ablaufventil/i, 'ablaufventil'],
    [/siebventil/i, 'Siebventil'],
    [/standrohr/i, 'Standrohr'],
    [/si(f|ph)on/i, 'Siphon'],
    [/bohrung/i, 'Bohrung'],
];

function accTypeOf(entry) {
    const t = productText(entry);
    for (const [re, at] of ACC_RULES) if (re.test(t)) return at;
    return '';
}

// ---------------------------------------------------------------------------
// 3. parentBases — the catalogue states which troughs an accessory fits as
// "zu 7311 106" / "zu 7311 106 und 7311 130". When that list exists it is
// EXHAUSTIVE (see the linked() comment in createRelationalApp): a brand fallback
// after it would offer a Sirius console under every KWC basin in the pool.
// ---------------------------------------------------------------------------
function parentBasesOf(entry) {
    const t = productText(entry);
    const out = new Set();
    // "zu 7311 106", "zu 7311 106.104.000", "zu 7311 106 und 7311 130"
    const seg = t.match(/\bzu\s+([0-9][0-9\s.,/und]*)/gi) || [];
    for (const s of seg) {
        for (const m of s.matchAll(/(\d{4})\s?(\d{3})/g)) out.add(m[1] + m[2]);
    }
    return [...out];
}

/** A part with no "zu" list and no brand tie fits any trough. */
function isUniversal(entry) {
    const t = productText(entry);
    return /universal|f[üu]r alle|passend zu allen/i.test(t);
}

// ---------------------------------------------------------------------------
function classify(entry) {
    if (!entry) return 'skip';
    if (isWhiteGood(entry)) return 'skip';
    return accTypeOf(entry) ? 'waschtrog_parts' : 'zubehoer_pool';
}

module.exports = {
    classify, productText, accTypeOf, parentBasesOf, isUniversal, isWhiteGood,
    ACC_RULES, WHITE_GOODS, WHITE_GOODS_ACCESSORY,
};
