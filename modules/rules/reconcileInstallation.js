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

const norm = (s) => String(s || '').trim().toLowerCase();
export const isOwned = (group) => OWNED_GROUPS.has(norm(group && group.name));

/** Stable structural comparison — used only to decide "did anything actually change?". */
const sameShape = (a, b) => JSON.stringify(a) === JSON.stringify(b);

/**
 * @returns {{groups, replaced, added, removed, changed}}
 *   groups   — the new mountingMaterials array (never mutates the input)
 *   replaced — owned groups that existed before and were regenerated
 *   removed  — owned groups the rules no longer produce (e.g. no plate family survives)
 *   changed  — false when the result is structurally identical to what was there
 */
export function reconcileInstallation(tray, ruleGroups) {
    const existing = Array.isArray(tray && tray.mountingMaterials) ? tray.mountingMaterials : [];
    const ownedBefore = existing.filter(isOwned);
    const keep = existing.filter((g) => !isOwned(g));

    // Splice the rule groups back in where the first owned group sat, so an unrelated
    // group never silently changes neighbours. No owned group before -> append.
    let at = existing.findIndex(isOwned);
    if (at === -1) at = existing.length;
    else at = existing.slice(0, at).filter((g) => !isOwned(g)).length;

    const groups = [...keep.slice(0, at), ...ruleGroups, ...keep.slice(at)];

    const producedNames = new Set(ruleGroups.map((g) => norm(g.name)));
    const replaced = ownedBefore.filter((g) => producedNames.has(norm(g.name))).map((g) => g.name);
    const removed = ownedBefore.filter((g) => !producedNames.has(norm(g.name))).map((g) => g.name);
    const added = ruleGroups
        .filter((g) => !ownedBefore.some((o) => norm(o.name) === norm(g.name)))
        .map((g) => g.name);

    return { groups, replaced, removed, added, changed: !sameShape(existing, groups) };
}
