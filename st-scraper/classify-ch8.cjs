/**
 * classify-ch8.cjs — routing table for Chapter 8 (Ablaufanschlüsse, Dichtung,
 * Reinigungsmaterial, PDF pages 1863-1874). SINGLE SOURCE OF TRUTH for where a Ch8
 * article goes; `inject-ch8.cjs` must not carry routing rules of its own.
 *
 * Ch8 is the smallest chapter and the simplest routing: it is entirely small parts —
 * drain connectors, seals, fixings, cleaning agents. Nothing here is a configurable
 * product, so EVERYTHING lands in `zubehoer_pool`. The real decisions are the two
 * fields that make a pool entry useful:
 *
 *   productType   — the Produktkategorie pill in the shared Accessoires facet bar
 *   targetSubcats — which configurators offer the part at all
 *                   (renderAccessoiresPanel filters by targetSubcats.includes(subcatKey))
 *
 * FULL-TEXT RULE: every decision reads label + description + tech together via
 * productText(). There are no label-prefix exceptions in this file.
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
// productType — ordered, first match wins; most specific first, because
// "Spültischsiphongarnitur" also contains "Siphon" and "Garnitur".
//
// TWO TRAPS, both of which silently mis-bucketed articles on the first run:
//  1. `\b` is ASCII-only in JS, so `\bÜberwurfmutter` NEVER matches — the umlaut is
//     not a word character, so there is no boundary before it. Umlaut-initial nouns
//     are therefore written without a leading `\b`.
//  2. German compounds hide the noun in the middle: "AnschlussSTUTZEN",
//     "DoppelSCHLAUCHTÜLLE". A leading `\b` on the head noun misses every compound,
//     so these are matched as bare substrings.
// ---------------------------------------------------------------------------
const TYPE_RULES = [
    [/si(f|ph)ongarnitur|r[öo]hrensi(f|ph)on|\bsi(f|ph)on\b/i, 'Siphon'],
    [/wanneneinlage|antirutsch|rutschhemmend/i, 'Wanneneinlage'],

    // Chemicals and consumables, before the hardware rules: "Rohrreiniger" must not
    // be read as a Rohr, nor "Fugendichtungsmasse" as a Dichtung.
    [/reiniger|reinigungsmittel|reinigungsset|desinfektion|entkalker|pflegemittel|politur|sanistar|glasreiniger/i, 'Reinigungsmittel'],
    [/dichtungsmasse|dichtungsband|dichtungspaste|montagekleber|ausgleichmasse|hanfspule|silikonspray|fugendichtung/i, 'Dichtungs- / Montagemasse'],
    [/reparaturset|reparaturstift|emailspray/i, 'Reparaturmaterial'],
    [/wischer|glasabzieher|trocknungstuch|kittpistole|montageschl[üu]ssel|recyclingsack/i, 'Reinigungsgerät / Werkzeug'],

    // Drain-side plumbing. `stutzen`/`t[üu]lle`/`bogen` are bare so compounds match.
    [/anschlussbogen|reduktionsbogen|ablaufbogen|stutzen|schlauucht[üu]lle|schlaucht[üu]lle|trichter|verteilst[üu]ck|t-st[üu]ck|winkel\s*90|adapter|ablaufventil|verschraubung\s+komplett/i, 'Ablaufanschluss'],

    // Seals and the small metal that holds them. Umlaut-initial nouns carry no `\b`.
    [/gummidichtung|steckdichtung|dichtung|schleifring|l[öo]th[üu]lse|[üu]berwurfmutter|verschlusskappe|verschlussrosette|abdeckkappe|klemmscheibe|rosette/i, 'Dichtung'],

    [/kupferrohr|rohrbride|\brohr\b|\bbride\b/i, 'Rohr / Bride'],
    [/schraube|d[üu]bel|befestigung|wandhalterung|konsole|\bhalter\b/i, 'Befestigungsmaterial'],
];

function productTypeOf(entry) {
    const t = productText(entry);
    for (const [re, type] of TYPE_RULES) if (re.test(t)) return type;
    return 'Installationsmaterial';       // honest catch-all, not a guess at something specific
}

// ---------------------------------------------------------------------------
// targetSubcats — which configurators may offer the part.
//
// Deliberately CONSERVATIVE. A part offered everywhere is noise in every
// Accessoires panel, and an over-broad rule here is invisible until someone orders
// the wrong thing. Where the text does not say what the part is for, it gets no
// targets and stays a search-only pool entry rather than being guessed onto a list.
// ---------------------------------------------------------------------------
const DRAIN_CONSUMERS = ['waschtisch', 'waschtrog', 'spueltischmischer'];
const BATH_CONSUMERS = ['badewanne', 'duschenwanne'];

function targetsFor(entry) {
    const t = productText(entry);
    const type = productTypeOf(entry);

    // A bath mat is for the bath/shower floor, nothing else.
    if (type === 'Wanneneinlage') return [...BATH_CONSUMERS];

    // Sink-drain plumbing. "Spültisch" narrows it to the kitchen/utility side.
    if (type === 'Siphon') {
        return /sp[üu]ltisch/i.test(t) ? ['spueltischmischer', 'waschtrog'] : [...DRAIN_CONSUMERS];
    }
    if (type === 'Ablaufanschluss' || type === 'Dichtung') return [...DRAIN_CONSUMERS];

    // Care products name the surface they are for, which is the only honest signal
    // for where to offer them. Anything unnamed stays search-only.
    if (type === 'Reinigungsmittel' || type === 'Reinigungsgerät / Werkzeug' || type === 'Reparaturmaterial') {
        const out = new Set();
        if (/duschentrennw|duschtrennw|glas|spiegel/i.test(t)) { out.add('duschtrennwand'); out.add('badeabtrennung'); }
        if (/whirl|badewanne|email/i.test(t)) out.add('badewanne');
        if (/duschwanne|duschentasse|bade\s*-?\s*und\s*duschwannen/i.test(t)) out.add('duschenwanne');
        if (/armatur/i.test(t)) { out.add('waschtischmischer'); out.add('bademischer'); }
        if (/wc-sitz|aquaclean|klosett/i.test(t)) { out.add('wandklosett'); out.add('standklosett'); }
        return [...out];
    }

    // Loose screws, copper pipe, sealant: real articles, but they belong to no single
    // configurator. Reachable via search; not pushed into anybody's panel.
    return [];
}

/** Ch8 has no exclusions — every article is a legitimate pool part. */
function classify(entry) {
    return entry ? 'zubehoer_pool' : 'skip';
}

module.exports = { classify, productText, targetsFor, productTypeOf, TYPE_RULES };
