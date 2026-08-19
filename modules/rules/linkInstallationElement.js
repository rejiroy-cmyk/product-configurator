/**
 * linkInstallationElement.js — attaches the Geberit Duofix Vorwandelement, its
 * Betätigungsplatte and its companions to a Klosett tray.
 *
 * Rules live in INSTRUCTIONS.md §2 "Installationselement" and, in full, in
 * INSTALLATION_ELEMENT_RULES.md. This module only PRODUCES `mountingMaterials`
 * groups — it never mutates a tray and never touches the runtime.
 *
 * Pure: `(tray, pool) => group[]`. Same contract as linkTape/linkCarrier.
 *
 * FULL-TEXT RULE: situation detection reads label + description + specs via
 * `elementSituation`, never the label alone. Registered in the GUARDED list of
 * tests/verify-fulltext-rule.js.
 */

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

/** The element art-Nr bases, per INSTALLATION_ELEMENT_RULES §2.1. */
export const ELEMENTS = {
    standard:      '3612 348',   // also Dusch-WC/AquaClean — carries the Leerrohr already
    barrierefrei:  '3612 329',
    kinder:        '3612 344',
    hygiene:       '3612 304',
    omega82:       '3612 301',   // half-height wall — ON REQUEST ONLY, never auto-selected
};
export const RUECKWAND = '3612 500';

/**
 * Waschtisch elements (INSTALLATION_ELEMENT_RULES §2.2). Exported so Mix & Match can
 * reuse the exact same table — MM renders its Stückliste as a GRID, not the BOM table,
 * so it cannot use the linker itself, but the ARTICLE RULES must not be duplicated.
 */
export const WT_ELEMENTS = [
    { artNr: '3612 287.000.000', situation: 'standard',     label: 'Standard, Höhe 112 cm' },
    { artNr: '3612 289.000.000', situation: 'wandarmatur',  label: 'für Wandarmatur' },
    { artNr: '3612 288.000.000', situation: 'einbausifon',  label: 'mit Einbausifon' },
    { artNr: '3612 104.000.000', situation: 'schmal',       label: 'schmale Ausführung, Breite 44 cm' },
];
export const WT_DEFAULT = '3612 287.000.000';
/** Only the Einbausifon element needs the Endmontageset — it finishes that concealed siphon. */
export const WT_ENDMONTAGESET = '3612 235';
export const WT_ANSCHLUSSBOGEN = '3612 272.000.000';
/** The element always needs its drain bend — Reji, 2026-08-18. */
export const ABLAUFBOGEN = '3612 374';

/** The opt-out. A TEXT POSITION, not an article: no Menge, no tab in the SAP line. */
export const OHNE_ELEMENT = {
    artNr: 'bau115',
    label: 'Ohne Installationselement (bauseits)',
    type: 'Textposition',
    isTextPosition: true,
};

/**
 * Which element a tray wants. FULL-TEXT.
 * Dusch-WC / AquaClean deliberately returns `standard` — 3612 348 already carries the
 * Leerrohr für Wasseranschluss Dusch-Klosett, so it needs no separate element.
 */
export function elementSituation(tray) {
    // BARRIER-FREE = SIA 500. That verdict is already computed: the catalogue parser
    // (modules/admin.js) reads the Ausladung out of the label — >= 70 cm — and bakes it
    // into `tray.size`, which is what the AUSLADUNG filter pill shows. A structured field
    // beats a regex over the same fact, the same precedence tech.* has elsewhere.
    if (/^\s*SIA\s*500\s*$/i.test(String((tray && tray.size) || ''))) return 'barrierefrei';
    const x = productText(tray).toLowerCase();
    // Fallback only: a tray whose Ausladung never parsed but whose text says so outright.
    if (/barrierenfrei|barrierefrei|rollstuhl/.test(x)) return 'barrierefrei';
    if (/\bkinder/.test(x)) return 'kinder';
    if (/hygienesp[üu]lung|\bhs30\b|\bhs50\b/.test(x)) return 'hygiene';
    return 'standard';
}

/** Sigma or Omega, read off the ELEMENT (not the ceramic). */
export function cisternOf(element) {
    const x = productText(element);
    if (/\bOmega\b/i.test(x)) return 'Omega';
    return 'Sigma';                       // Sigma is the default cistern
}

const PLATE_FAMILY = /\b(Sigma\s?\d+|Omega\s?\d+|Kappa\s?\d+|Highline)\b/i;
/** Families we never list: their cisterns are not sold. Sigma60 has no article at all. */
const FAMILY_BLOCKLIST = /^(Kappa\d+|Highline|Sigma60)$/i;

export function plateFamilyOf(product) {
    // FULL-TEXT RULE. Verified identical to a label-only read on all 104 plates today,
    // but a truncated label can drop the family token and the description still carries it.
    const m = productText(product).match(PLATE_FAMILY);
    return m ? m[1].replace(/\s+/g, '') : null;
}

/**
 * Index the pool once: elements by base, plates by family, companions by base.
 * `data` is EXPANDED custom-data.json.
 */
export function buildElementPool(data) {
    const pool = (data && data.zubehoer_pool && data.zubehoer_pool.trays) || [];
    const byBase = new Map();
    const platesByFamily = new Map();
    for (const t of pool) {
        const art = String(t.artNr || '');
        byBase.set(art.slice(0, 8), t);
        if (!/^(Betätigungsplatte|Abdeckplatte)\b/i.test(String(t.label || ''))) continue;
        const fam = plateFamilyOf(t);
        if (!fam || FAMILY_BLOCKLIST.test(fam)) continue;
        if (!platesByFamily.has(fam)) platesByFamily.set(fam, []);
        // every finish of a plate is its own orderable SKU
        for (const sku of [t, ...(t.variants || [])]) platesByFamily.get(fam).push({ base: t, sku });
    }
    return { byBase, platesByFamily };
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
 * The groups for one Klosett tray.
 * `colorNames` maps a finish triplet -> German colour name (COLOR_NAMES). The plate
 * option's description MUST name its colour, and the colour comes from the art-Nr
 * triplet alone — COLOUR RULE, never from label text.
 */
export function linkInstallationElement(tray, pool, { colorNames = {}, category = 'wandklosett' } = {}) {
    if (!tray || !pool) return [];
    const suffix = String(tray.artNr || '').replace(/\s+/g, '');
    const groups = [];

    // Standklosett always takes the Wandklosett standard element — deliberate, see the rules doc.
    const situation = category === 'standklosett' ? 'standard' : elementSituation(tray);
    const chosen = pool.byBase.get(ELEMENTS[situation]) || pool.byBase.get(ELEMENTS.standard);
    if (!chosen) return [];

    // Alternatives: every other element we name, Omega included (offered, never auto-picked).
    const others = Object.values(ELEMENTS)
        .filter((b) => b !== String(chosen.artNr).slice(0, 8))
        .map((b) => pool.byBase.get(b))
        .filter(Boolean);

    const elementGroupId = `installationselement_${suffix}`;
    const elementOptions = [opt(chosen), ...others.map((o) => opt(o)), OHNE_ELEMENT];
    groups.push({
        id: elementGroupId,
        name: 'Installationselement',
        _auto: true, _rule: `element:${situation}`,
        options: elementOptions,
    });

    /**
     * A part that only serves the element leaves with it. When the user opts out via
     * `bau115`, its rule yields an EMPTY optionArtNrs — the same suppression the
     * Abstellverschraubung uses in createRelationalApp when a faucet bundles it.
     */
    const onlyWithElement = (artNr) => elementOptions.map((o) => ({
        whenArtNr: o.artNr,
        optionArtNrs: o.artNr === OHNE_ELEMENT.artNr ? [] : [artNr],
    }));

    // --- Betätigungsplatte: TWO-STAGE, and BOTH stages hang off the element.
    // The cistern lives INSIDE the element, so switching Sigma -> Omega must re-offer the
    // families. Computing the family list from the default element alone froze it as Sigma:
    // picking an Omega element left the selector stuck on Sigma plates that do not fit it.
    const allFamilies = [...pool.platesByFamily.keys()].sort();
    const famArt = (f) => `fam_${f.toLowerCase()}`;
    const famOptions = allFamilies.map((f) => ({ artNr: famArt(f), label: f, type: 'Auswahl' }));
    // Every element option paired with its own product, so each can state its own cistern.
    const elementProducts = [[chosen.artNr, chosen], ...others.map((o) => [o.artNr, o])];
    const familiesForCistern = (c) => allFamilies.filter((f) => f.toLowerCase().startsWith(c.toLowerCase()));

    if (allFamilies.length) {
        groups.push({
            id: `plattenfamilie_${suffix}`,
            name: 'Betätigungsplatte — Familie',
            // A SELECTOR, not an orderable position: it narrows the plate dropdown below it
            // and must never reach the Stückliste. `fam_sigma01` is not an article number.
            uiOnly: true,
            dependsOn: elementGroupId,
            // VALIDATE, don't narrow. If the element filtered this list down to its own
            // cistern, an Omega plate would be unreachable while a Sigma element is chosen —
            // and the reverse rule (pick the plate, the engine adjusts the element) could
            // never fire. All nine families stay on offer; choosing one that does not fit
            // switches the ELEMENT instead. The plate group below still narrows normally.
            cascadeMode: 'validate',
            optionRules: elementOptions.map((o) => {
                // No element (bau115, builder-supplied) states no cistern, so nothing can be
                // ruled out — offer every family rather than guessing one.
                if (o.artNr === OHNE_ELEMENT.artNr) return { whenArtNr: o.artNr, optionArtNrs: famOptions.map((f) => f.artNr) };
                const prod = (elementProducts.find(([a]) => a === o.artNr) || [])[1];
                return { whenArtNr: o.artNr, optionArtNrs: familiesForCistern(cisternOf(prod)).map(famArt) };
            }),
            _auto: true, _rule: 'plate-family',
            options: famOptions,
        });
        groups.push({
            id: `betaetigungsplatte_${suffix}`,
            name: 'Betätigungsplatte',
            dependsOn: `plattenfamilie_${suffix}`,
            _auto: true, _rule: 'plate',
            optionRules: allFamilies.map((f) => ({
                whenArtNr: famArt(f),
                optionArtNrs: pool.platesByFamily.get(f).map(({ sku }) => sku.artNr),
            })),
            options: allFamilies.flatMap((f) => pool.platesByFamily.get(f).map(({ base, sku }) => {
                const code = String(sku.artNr).split('.')[1] || '';
                const text = base.description || base.label || '';
                // COLOUR RULE: the finish comes from the art-Nr triplet alone. `000` is the
                // colourless code — say so rather than leaving the row silently unlabelled,
                // and flag an unknown code instead of inventing a name for it. Never read a
                // colour word out of the label: several of these say "Edelstahl" in the text
                // while stating no finish at all.
                const colour = code === '000' ? 'ohne Farbangabe'
                             : (colorNames[code] || `Farbcode ${code}`);
                return opt({ ...base, artNr: sku.artNr, imgUrl: sku.imgUrl || base.imgUrl },
                    { description: `${text} — ${colour}` });
            })),
        });
    }

    // Ablaufbogen Geberit-Silent D. 90 mm. Mandatory WITH the element and ONLY with it —
    // opt out of the element and the drain bend goes too, it has nothing left to connect.
    // This is the `Ablaufbogen` group only; the `Ablaufanschluss` groups on 6 Standklosett
    // trays are a different part and stay put.
    const bogen = pool.byBase.get(ABLAUFBOGEN);
    if (bogen) groups.push({
        id: `ablaufbogen_${suffix}`,
        name: 'Ablaufbogen',
        dependsOn: elementGroupId,
        optionRules: onlyWithElement(bogen.artNr),
        _auto: true, _rule: 'ablaufbogen',
        options: [opt(bogen)],
    });

    // Rückwandbefestigungssatz — its own label says "für alle Elemente": it fastens the
    // element to the wall, so with no element there is nothing to fasten. Same dependency
    // as the Ablaufbogen.
    const rueck = pool.byBase.get(RUECKWAND);
    if (rueck) groups.push({
        id: `rueckwandbefestigung_${suffix}`,
        name: 'Rückwandbefestigungssatz',
        dependsOn: elementGroupId,
        optionRules: onlyWithElement(rueck.artNr),
        _auto: true, _rule: 'rueckwand',
        options: [opt(rueck)],
    });

    return groups;
}
