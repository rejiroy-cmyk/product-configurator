/**
 * reconcileInstallation.js — merges the Installationselement rule output into a tray's
 * existing `mountingMaterials` without duplicating or clobbering unrelated groups.
 *
 * Per RULES_ENGINE_DESIGN.md: additive, idempotent, provenance-tagged, scoped.
 *
 * ONE DELIBERATE DEPARTURE from that doc. It says a group with no `_auto` is a manual
 * edit and must never be touched. This ruleset overrules that for the groups it OWNS —
 * Reji, 2026-08-18: "The rules I have made in this session overrule all other auto
 * injections up and till now. This also applies to Wandklosett." The 15 Standklosett
 * trays carrying a hand-made `Duofix Element` group are exactly that case. Everything
 * outside OWNED_GROUPS is still untouchable.
 */

/** The group names this ruleset owns — old spellings included, so a re-run converges. */
export const OWNED_GROUPS = new Set([
    'installationselement',
    'duofix element',                 // the pre-existing Standklosett spelling
    'betätigungsplatte',
    'betätigungsplatte — familie',
    'rückwandbefestigungssatz',
    'ablaufbogen',
    // NOT 'ablaufanschluss' — 6 Standklosett trays carry that under a different name with
    // different articles (3241 130 / 3241 120 / 3242 110). It is not ours to touch.
]);

/**
 * The Urinoir chain owns a DIFFERENT set of names — passed in per call rather than
 * merged into the one above, or a Klosett re-run would start claiming a urinal's
 * `Schallschutz`. Note what is deliberately absent: `Ablaufbogen`, which on the two
 * Schmidlin Ecopur trays is the urinal's own drain part and none of our business.
 */
export const URINOIR_OWNED_GROUPS = new Set([
    'installationselement',
    'rückwandbefestigungssatz',
    'anschlussbogen',
    'quertraverse',
    'zubehörset',
    'schallschutz',
    'urinoirsteuerung',
    'rohbau-set',
]);

const norm = (s) => String(s || '').trim().toLowerCase();
export const isOwned = (group, owned = OWNED_GROUPS) => owned.has(norm(group && group.name));

/** Stable structural comparison — used only to decide "did anything actually change?". */
const sameShape = (a, b) => JSON.stringify(a) === JSON.stringify(b);

/**
 * @returns {{groups, replaced, added, removed, changed}}
 *   groups   — the new mountingMaterials array (never mutates the input)
 *   replaced — owned groups that existed before and were regenerated
 *   removed  — owned groups the rules no longer produce (e.g. no plate family survives)
 *   changed  — false when the result is structurally identical to what was there
 */
export function reconcileInstallation(tray, ruleGroups, owned = OWNED_GROUPS) {
    const mine = (g) => isOwned(g, owned);
    const existing = Array.isArray(tray && tray.mountingMaterials) ? tray.mountingMaterials : [];
    const ownedBefore = existing.filter(mine);
    const keep = existing.filter((g) => !mine(g));

    // Splice the rule groups back in where the first owned group sat, so an unrelated
    // group never silently changes neighbours. No owned group before -> append.
    let at = existing.findIndex(mine);
    if (at === -1) at = existing.length;
    else at = existing.slice(0, at).filter((g) => !mine(g)).length;

    const groups = [...keep.slice(0, at), ...ruleGroups, ...keep.slice(at)];

    const producedNames = new Set(ruleGroups.map((g) => norm(g.name)));
    const replaced = ownedBefore.filter((g) => producedNames.has(norm(g.name))).map((g) => g.name);
    const removed = ownedBefore.filter((g) => !producedNames.has(norm(g.name))).map((g) => g.name);
    const added = ruleGroups
        .filter((g) => !ownedBefore.some((o) => norm(o.name) === norm(g.name)))
        .map((g) => g.name);

    return { groups, replaced, removed, added, changed: !sameShape(existing, groups) };
}
