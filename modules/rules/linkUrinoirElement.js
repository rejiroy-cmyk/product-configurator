/**
 * linkUrinoirElement.js — attaches the Geberit Duofix Urinoirelement, its Pflichtteile
 * and (where the ceramic has no control of its own) the Urinoirsteuerung to a urinal.
 *
 * Sister of linkInstallationElement.js. Rules live in URINOIR_ELEMENT_RULES.md; this
 * module only PRODUCES `mountingMaterials` groups — it never mutates a tray.
 *
 * Pure: `(tray, pool) => group[]`.
 *
 * WHY A URINAL NEEDS ITS OWN LINKER. For a Klosett one element fits nearly every
 * ceramic. A urinal's element is model-specific, and picking the wrong one is not a
 * cosmetic error: 3612 406 carries NO water connection, 3612 403 carries a Rohbauset
 * for the control, 3612 402 is 144 cm tall. Order the wrong one and the wall is opened
 * twice.
 *
 * EVIDENCE BEATS DERIVATION — the whole design of this file.
 * `EVIDENCE` below is the pairing 38 of our urinals were actually configured with,
 * lifted from SABAG's public catalogue (113 pre-configured urinal pages), every GTIN
 * re-resolved on our own Profishop so only our art-Nrs survive. Full method and audit:
 * st-scraper/urinoir-sabag/README.md.
 *
 * Where evidence exists it is used verbatim. `deriveElement` is only for the 11 urinals
 * the competitor never configured, and it is a FALLBACK, not the rule — measured against
 * the 38 known pairings it reproduces 36 (95%). Two facts drove its shape:
 *
 *   • URINOIR_ELEMENT_RULES §2's water+control table scores only 64% against the same
 *     evidence. It over-corrected: §2 concluded the series lists in the element
 *     descriptions were "EXAMPLES, not an exclusive compatibility list", and that is
 *     true — but they are not noise either. 3612 405 says "für Urinoirs Tamaro" and
 *     every Tamaro-S in the evidence takes it.
 *   • The split that carries the series lists is Anlage vs. bare ceramic. An
 *     `Urinoiranlage` brings its own control and valve, so it takes the element WITHOUT
 *     a Rohbauset (3612 406, or 3612 405 for a Tamaro-S). A bare `Urinoir` of the same
 *     series needs the element to bring water and rough-in — Lema `3411 125` (Anlage)
 *     takes 3612 406 while Lema `3411 126` (ceramic) takes 3612 403.
 *
 * A derived element is tagged `_rule: 'element:derived'` and every other Duofix urinal
 * element stays in the dropdown beside it, so a wrong guess is one click to fix.
 *
 * FULL-TEXT RULE: `flushClass`, `carriesOwnSystem` and `deriveElement` all read
 * label + description + specs. Registered in the GUARDED list of
 * tests/verify-fulltext-rule.js.
 */

import { OHNE_ELEMENT } from './linkInstallationElement.js';

export { OHNE_ELEMENT };

/** label + description + every specs value — the GLOBAL RULE's source string. */
export function productText(t) {
    if (!t) return '';
    const parts = [t.label, t.description];
    const s = t.specs;
    if (s && typeof s === 'object') {
        for (const v of Object.values(s)) if (v != null) parts.push(String(v));
    }
    return parts.filter(Boolean).join(' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
}

/** Every Duofix urinal element we sell. Ineo and Tece stay hidden (WC rules §1.2). */
export const URINOIR_ELEMENTS = [
    '3612 402',   // Typ 144, Rohbauset + Absperrventil ½"   — "für Urinoirs Tamaro"
    '3612 403',   // Typ 112/130, Rohbauset + Absperrventil ½"
    '3612 404',   // Wasseranschluss ½"  — "für integrierte Steuerung, Preda / Selva"
    '3612 405',   // Wasseranschluss ½", Höhe 112             — "für Urinoirs Tamaro"
    '3612 406',   // NO water connection — "Lema, Tamaro-VS New, Caprino Plus"
    '3612 407',   // Wasseranschluss ½"  — "für Urinoirsteuerungen, Preda / Selva"
    '3612 412',   // Typ 144, second article of the same build as 3612 402
];

/**
 * PFLICHTTEILE — Reji, 2026-08-20: "If a urinal can get an element then 3612 500 and
 * 3612 272 are must haves." Keyed off "has an element", nothing else. SABAG listed the
 * Rückwandbefestigungssatz on every configured urinal and the Anschlussbogen on none.
 */
export const RUECKWAND = '3612 500';
export const ANSCHLUSSBOGEN = '3612 272';

export const SCHALLSCHUTZ = '3461 110';       // Iso-Set Hafner *Urinoir*, not the WC one
export const QUERTRAVERSE = '3612 420';       // Zulauf ½" mit Anschlussbogen
export const ZUBEHOERSET = '3612 419';        // Lema 1 Liter, UP-Verteildose
export const ROHBAUSET = '3451 173';          // only under 3612 407 — see below

/**
 * The Steuerung ladder, cheapest first. HyTouch is pneumatic at CHF 346–350, HyTronic
 * is IR at CHF 1225 — a real commercial choice, so the group opens on OHNE_STEUERUNG
 * and the user picks (Reji, 2026-08-20). SABAG offers all nine with no default either.
 */
export const STEUERUNGEN = [
    '3451 114',   // HyTouch  Typ01 square, Betätigungsplatte
    '3451 168',   // HyTouch  Typ01 round
    '3451 174',   // HyTouch  Typ01 round, easy-to-clean
    '3451 106',   // HyTronic IR Typ01 square, Netz
    '3451 109',   // HyTronic IR Typ01 square, Batterie
    '3451 148',   // HyTronic IR Typ01 round, Netz
    '3451 158',   // HyTronic IR Typ01 round, Batterie
    '3451 100',   // HyTronic IR Typ01 round, easy-to-clean, Netz
    '3451 103',   // HyTronic IR Typ01 round, easy-to-clean, Batterie
];

/** The Steuerung opt-out. An art-Nr starting with "ohne" is skipped by every SAP export. */
export const OHNE_STEUERUNG = {
    artNr: 'ohne_steuerung',
    label: 'Ohne Urinoirsteuerung',
    type: 'Auswahl',
};

/**
 * What each urinal was ACTUALLY configured with — see the header. `el: null` is a
 * finding, not a gap: SABAG offers Lema `3411 128` and Taro-Uni `3421 125` with no
 * element at all, which is what makes the §3.4 exclusions self-confirming (they are the
 * only urinals that keep their Dübelschraube).
 */
export const EVIDENCE = {
    "2112 886": { el: "3612 406", schall: true, quer: true },   // Val
    "2112 887": { el: "3612 403", schall: true, steu: true },   // Val
    "2112 888": { el: "3612 403", schall: true, steu: true },   // Val
    "2121 197": { el: "3612 403", schall: true, steu: true },   // Alessi One
    "2141 867": { el: "3612 403", schall: true, quer: true, steu: true },   // Me by Starck
    "2147 192": { el: "3612 403", schall: true, steu: true },   // Starck 1
    "2147 193": { el: "3612 403", schall: true, steu: true },   // Starck 1
    "2317 385": { el: "3612 403", schall: true, steu: true },   // Subway
    "3411 102": { el: "3612 405", schall: true },   // Tamaro-S90
    "3411 104": { el: "3612 405", schall: true },   // Tamaro-S90
    "3411 105": { el: "3612 406", schall: true, zub: true },   // Tamaro-VS New
    "3411 106": { el: "3612 406", schall: true, zub: true },   // Tamaro-VS New
    "3411 125": { el: "3612 406", schall: true, zub: true },   // Lema
    "3411 126": { el: "3612 403", schall: true, steu: true },   // Lema
    "3411 127": { el: "3612 406", schall: true },   // Lema
    "3411 128": { el: null, schall: true },   // Lema
    "3411 131": { el: "3612 406", schall: true, quer: true },   // Caprino Plus
    "3411 133": { el: "3612 406", schall: true, quer: true },   // Caprino Plus
    "3411 134": { el: "3612 403", schall: true, steu: true },   // Caprino Plus
    "3421 103": { el: "3612 402", schall: true, steu: true },   // Tamaro
    "3421 120": { el: "3612 402", schall: true, steu: true },   // Taro-Nova
    "3421 125": { el: null },   // Taro-Uni
    "3421 142": { el: "3612 403", schall: true, quer: true, steu: true },   // Vila 2.0
    "3421 143": { el: "3612 403", schall: true, quer: true, steu: true },   // Vila 2.0
    "3421 144": { el: "3612 404", schall: true },   // Vila 2.0
    "3421 146": { el: "3612 404", schall: true },   // Vila 2.0
    "3421 147": { el: "3612 404", schall: true },   // Vila 2.0
    "3421 148": { el: "3612 404", schall: true },   // Vila 2.0
    "3421 160": { el: "3612 403", schall: true, steu: true },   // Fizz
    "3421 201": { el: "3612 407", rohbau: true, steu: true },   // Preda
    "3421 202": { el: "3612 404" },   // Preda
    "3421 203": { el: "3612 404" },   // Preda
    "3421 211": { el: "3612 407", rohbau: true, steu: true },   // Selva
    "3421 212": { el: "3612 404" },   // Selva
    "3421 213": { el: "3612 404" },   // Selva
    "3421 221": { el: "3612 407", rohbau: true, steu: true },   // Tamina
    "3421 222": { el: "3612 404" },   // Tamina
    "3421 223": { el: "3612 404" },   // Tamina
};

/** FULL-TEXT. Drives only the Steuerung group and the derivation fallback. */
export function flushClass(tray) {
    const x = productText(tray);
    if (/wasserlos|wasserlose[nr]?\s+Betrieb/i.test(x)) return 'wasserlos';
    if (/Hybridventil|programmierbare\s+Benutzersp/i.test(x)) return 'hybrid';
    // The partner-reference trap, and the reason three Tamaro "Urinoiranlagen" were
    // misfiled: the label prefix says system, but "für Steuerung Hytronic/HyTouch" and
    // "ohne Annäherungssteuerung" both mean the control is NOT in the box.
    if (/\b(f[üu]r|ohne)\s+[A-Za-zäöü-]*steuerung/i.test(x)) return 'ohne-steuerung';
    if (/Netzbetrieb|Netzanschluss|Batteriebetrieb|Annäherungssteuerung|HF-?\s?Steuerung|elektronische[rn]?\s+Steuerung|integrierte[rn]?\s+Steuerung|Spülauslösung durch Sensor/i.test(x)) return 'integriert';
    return 'ohne-steuerung';
}

/**
 * An Anlage that names its own installation system already CONTAINS the element —
 * `3411 516` reads "Urinoiranlage Tamaro Geberit-Duofix", `3411 513` "…-Kombifix".
 * Attaching another frame would order a second CHF 634 element into the same wall.
 * FULL-TEXT: neither label states the system; both say it only in the description.
 */
export function carriesOwnSystem(tray) {
    return /\b(duofix|kombifix|combifix)\b/i.test(productText(tray));
}

/**
 * "Urinoiranlage" = ceramic + control + valve as one art-Nr; "Urinoir" = bare ceramic.
 * An identity check on the leading noun — `// label-prefix by design`, the GLOBAL RULE's
 * permitted exception. Deliberately NOT full-text: a bare ceramic's description names
 * the Anlage it belongs to ("Ausführung für Urinoiranlage"), which is the partner
 * reference, not what the article is.
 */
export function isAnlage(tray) {
    return /^\s*urinoiranlage/i.test(String((tray && tray.label) || ''));
}

/**
 * The fallback for a urinal nobody configured for us. FULL-TEXT. See the header for why
 * it is shaped around Anlage-vs-ceramic rather than URINOIR_ELEMENT_RULES §2's table.
 * Returns null when the urinal must not get one.
 */
export function deriveElement(tray) {
    const x = productText(tray);
    if (carriesOwnSystem(tray)) return null;
    const cls = flushClass(tray);
    // No water in, no water fitting needed — and 3612 406 is the only Duofix without one.
    if (cls === 'wasserlos') return '3612 406';
    if (isAnlage(tray) && cls === 'integriert') {
        return /Tamaro-?\s?S\b/i.test(x) ? '3612 405' : '3612 406';
    }
    if (/\bTamaro\b|Taro-?\s?Nova/i.test(x)) return '3612 402';
    if (/Preda|Selva|Tamina/i.test(x)) return cls === 'integriert' ? '3612 404' : '3612 407';
    if (cls === 'integriert') return '3612 404';
    return '3612 403';
}

/** @returns {{el: string|null, source: 'evidence'|'derived'}} */
export function urinoirElement(tray) {
    const base = String((tray && tray.artNr) || '').slice(0, 8);
    const ev = EVIDENCE[base];
    if (ev) return { el: ev.el, source: 'evidence' };
    return { el: deriveElement(tray), source: 'derived' };
}

/** Index every article this ruleset can attach, by 7-digit base. */
export function buildUrinoirPool(data) {
    const trays = (data && data.zubehoer_pool && data.zubehoer_pool.trays) || [];
    const byBase = new Map();
    for (const t of trays) byBase.set(String(t.artNr || '').slice(0, 8), t);
    return { byBase };
}

const opt = (p, extra = {}) => p && ({
    artNr: p.artNr,
    label: p.label,
    type: 'Technik',
    menge: 1,
    imgUrl: p.imgUrl,
    description: p.description,
    tech: p.tech,
    ...extra,
});

/**
 * The groups for one urinal tray.
 *
 * Scope of this pass is the INSTALLATION-ELEMENT CHAIN only. The urinal's own siphons,
 * inlet sleeves, lids and partitions already come from SAP's own accessory data and are
 * not touched here.
 */
export function linkUrinoirElement(tray, pool) {
    if (!tray || !pool) return [];
    const suffix = String(tray.artNr || '').replace(/\s+/g, '');
    const base = String(tray.artNr || '').slice(0, 8);
    const ev = EVIDENCE[base] || {};
    const { el, source } = urinoirElement(tray);
    const groups = [];

    const elementGroupId = `installationselement_${suffix}`;
    let elementOptions = null;

    if (el) {
        const chosen = pool.byBase.get(el);
        if (!chosen) return [];
        // Every other Duofix urinal element stays on offer. That is what makes a DERIVED
        // default safe, and it is the only route to the Typ 144 variants — nothing in the
        // ceramic's own text says a job is 144 cm tall (URINOIR_ELEMENT_RULES §2.1).
        const others = URINOIR_ELEMENTS
            .filter((b) => b !== el)
            .map((b) => pool.byBase.get(b))
            .filter(Boolean);
        elementOptions = [opt(chosen), ...others.map((o) => opt(o)), OHNE_ELEMENT];
        groups.push({
            id: elementGroupId,
            name: 'Installationselement',
            _auto: true, _rule: `element:${source}`,
            options: elementOptions,
        });
    }

    /** A part that only serves the element leaves with it — empty rule = row suppressed. */
    const onlyWithElement = (artNr) => elementOptions.map((o) => ({
        whenArtNr: o.artNr,
        optionArtNrs: o.artNr === OHNE_ELEMENT.artNr ? [] : [artNr],
    }));

    const attach = (artNr, name, rule) => {
        const p = pool.byBase.get(artNr);
        if (!p || !elementOptions) return;
        groups.push({
            id: `${rule}_${suffix}`,
            name,
            dependsOn: elementGroupId,
            optionRules: onlyWithElement(p.artNr),
            _auto: true, _rule: rule,
            options: [opt(p)],
        });
    };

    // The two Pflichtteile. Unconditional WITH an element, gone without one.
    attach(RUECKWAND, 'Rückwandbefestigungssatz', 'rueckwand');
    attach(ANSCHLUSSBOGEN, 'Anschlussbogen', 'anschlussbogen');
    // Model-specific element accessories — evidence only, never derived. 3612 419 is the
    // pairing Reji confirmed for the Lema Absauge-Urinoir (§3.3).
    if (ev.quer) attach(QUERTRAVERSE, 'Quertraverse', 'quertraverse');
    if (ev.zub) attach(ZUBEHOERSET, 'Zubehörset', 'zubehoerset');

    // Schallschutz is for the CERAMIC, the same reading the WC rules give it — so it does
    // NOT hang off the element: Lema `3411 128` carries it while taking no element at all.
    // Evidence only. The Geberit-own Preda / Selva / Tamina never carry one: they ship
    // complete, which is also why their SAP Zubehör list is empty (§3.4b).
    if (ev.schall) {
        const p = pool.byBase.get(SCHALLSCHUTZ);
        if (p) groups.push({
            id: `schallschutz_${suffix}`,
            name: 'Schallschutz',
            _auto: true, _rule: 'schallschutz',
            options: [opt(p)],
        });
    }

    // The Steuerung, for a ceramic that has none of its own.
    const cls = flushClass(tray);
    const needsControl = ev.steu || (!EVIDENCE[base] && (cls === 'ohne-steuerung'));
    let steuerungGroupId = null;
    if (needsControl) {
        const ctrls = STEUERUNGEN.map((b) => pool.byBase.get(b)).filter(Boolean);
        if (ctrls.length) {
            steuerungGroupId = `urinoirsteuerung_${suffix}`;
            groups.push({
                id: steuerungGroupId,
                name: 'Urinoirsteuerung',
                _auto: true, _rule: 'steuerung',
                // OHNE first: it is the default, by decision. CHF 346 to CHF 1225 is not a
                // difference to make on the user's behalf.
                options: [OHNE_STEUERUNG, ...ctrls.map((c) => opt(c))],
            });
        }
    }

    // Rohbau-Set — §3.4: DROPPED when the element already bundles it. The test is the
    // element's own text: 3612 402/403/412 read "Rohbauset für Steuerung Hytronic und
    // HyTouch", so the box is inside them. Only 3612 407 states none, which is exactly
    // the three urinals the evidence keeps it on. It rides with the CONTROL, so it hangs
    // off the Steuerung group and disappears with "Ohne Urinoirsteuerung".
    if (ev.rohbau && steuerungGroupId) {
        const p = pool.byBase.get(ROHBAUSET);
        if (p) groups.push({
            id: `rohbauset_${suffix}`,
            name: 'Rohbau-Set',
            dependsOn: steuerungGroupId,
            optionRules: [OHNE_STEUERUNG, ...STEUERUNGEN.map((b) => ({ artNr: b }))].map((o) => ({
                whenArtNr: o.artNr === OHNE_STEUERUNG.artNr ? o.artNr : (pool.byBase.get(o.artNr) || {}).artNr,
                optionArtNrs: o.artNr === OHNE_STEUERUNG.artNr ? [] : [p.artNr],
            })).filter((r) => r.whenArtNr),
            _auto: true, _rule: 'rohbauset',
            options: [opt(p)],
        });
    }

    return groups;
}

/**
 * §3.4, the other half: the Dübelschraube fixes a urinal STRAIGHT TO THE WALL. With an
 * element it hangs on the element's threaded bolts instead, so the screws must disappear
 * the moment one is set — and come back if the user opts out via bau115.
 *
 * This one is applied to a group that ALREADY EXISTS on the tray, so it is expressed as
 * a patch rather than a produced group: the options are SAP's and stay untouched.
 * Same class as the Spülrohr `3432 115` (§3.5) — parts that belong to the wall-mounted
 * case, which is a real installation mode with its own parts list, not merely the
 * absence of an element.
 */
export const WALL_ONLY_PARTS = ['8211 112', '3432 115'];
/**
 * The group must BE the part, not merely list it. `3411 524` carries a "Stücklisten
 * Artikel" group holding SAP's whole bill of materials for that Anlage — ceramic, inlet,
 * siphon, rough-in set AND the screws. Matching on the art-Nr alone suppressed that
 * entire listing the moment an element was chosen: the partner-reference trap, in group
 * form. The name is an identity check — `// label-prefix by design`.
 */
const WALL_ONLY_GROUP = /^\s*(d[üu]belschraube|sp[üu]lrohr)/i;

export function wallOnlyPatch(group, elementGroupId, elementOptions) {
    if (!group || !elementGroupId || !Array.isArray(elementOptions)) return null;
    if (!WALL_ONLY_GROUP.test(String(group.name || ''))) return null;
    const hits = (group.options || []).some((o) => WALL_ONLY_PARTS.some((w) => String(o.artNr || '').startsWith(w)));
    if (!hits) return null;
    const keep = (group.options || []).map((o) => o.artNr);
    return {
        dependsOn: elementGroupId,
        optionRules: elementOptions.map((o) => ({
            whenArtNr: o.artNr,
            optionArtNrs: o.artNr === OHNE_ELEMENT.artNr ? keep : [],
        })),
    };
}
