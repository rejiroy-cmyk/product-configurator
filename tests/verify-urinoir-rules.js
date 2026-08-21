// Urinoir Installationselement linker + the §3.4 wall-mount exclusion.
// Rules: URINOIR_ELEMENT_RULES.md · evidence: st-scraper/urinoir-sabag/
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { expandData } from '../modules/dataHydrate.js';
import {
    buildUrinoirPool, linkUrinoirElement, urinoirElement, deriveElement, flushClass,
    carriesOwnSystem, isAnlage, wallOnlyPatch, EVIDENCE, URINOIR_ELEMENTS,
    RUECKWAND, ANSCHLUSSBOGEN, ROHBAUSET, STEUERUNGEN, OHNE_STEUERUNG, OHNE_ELEMENT,
    urinoirBomBucket, miscOhneFirst, URINOIR_MISC, URINOIR_CERAMIC,
} from '../modules/rules/linkUrinoirElement.js';
import { reconcileInstallation, URINOIR_OWNED_GROUPS, isOwned } from '../modules/rules/reconcileInstallation.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
let pass = 0, fail = 0;
const check = (name, ok, detail = '') => {
    if (ok) { pass++; console.log(`✅ [PASS] ${name}`); }
    else { fail++; console.log(`❌ [FAIL] ${name}${detail ? ' — ' + detail : ''}`); }
};

const data = expandData(JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'custom-data.json'), 'utf8')));
const pool = buildUrinoirPool(data);
const trays = (data.urinoir && data.urinoir.trays) || [];
const base = (t) => String(t.artNr || '').slice(0, 8);
const byBase = new Map(trays.map((t) => [base(t), t]));
const groupsOf = (b) => linkUrinoirElement(byBase.get(b), pool);
const named = (gs, n) => gs.find((g) => g.name === n);

// ---- flush class --------------------------------------------------------
check('wasserlos wins over every other marker',
    flushClass({ label: 'Urinal Schmidlin Ecopur 100, wasserlos, Hybridventil' }) === 'wasserlos');
check('"für Steuerung Hytronic" means the control is NOT in the box',
    flushClass({ label: 'Urinoiranlage Tamaro Geberit, Weiss', description: 'Urinoiranlage Tamaro Geberit- Kombifix für Steuerung Hytronic/HyTouch' }) === 'ohne-steuerung');
check('"ohne Annäherungssteuerung" is ohne-steuerung, not integriert',
    flushClass({ label: 'Urinoir Tamaro-S 60, ohne Annäherungssteuerung' }) === 'ohne-steuerung');
check('Netzanschluss (not Netzbetrieb) still reads as integriert',
    flushClass({ label: 'Urinoir Preda', description: 'Spülrandlos, Netzanschluss 230 V' }) === 'integriert');
check('flush class is FULL-TEXT: the marker only in the description',
    flushClass({ label: 'Urinoir Lema rimless', description: 'Ablauf verdeckt, für wasserlosen Betrieb' }) === 'wasserlos');

// ---- the element already in the box -------------------------------------
check('an Anlage naming Duofix carries its own element',
    carriesOwnSystem({ label: 'Urinoiranlage Tamaro Geberit-, Weiss', description: 'Urinoiranlage Tamaro Geberit- Duofix für Steuerung Hytronic/HyTouch' }));
check('… and one naming Kombifix does too',
    carriesOwnSystem({ label: 'Urinoiranlage Tamaro Geberit, Weiss', description: 'Urinoiranlage Tamaro Geberit- Kombifix für Steuerung' }));
check('an Anlage naming no system does not',
    !carriesOwnSystem({ label: 'Urinoiranlage Tamaro Geberit, Weiss', description: 'Urinoiranlage Tamaro Geberit für Steuerung Hytronic/Hytouch' }));
check('a system-carrying Anlage gets NO element',
    deriveElement({ label: 'Urinoiranlage Tamaro Geberit-, Weiss', description: 'Geberit- Duofix für Steuerung Hytronic/HyTouch' }) === null);
check('3411 516 gets no element chain — the Duofix is inside the Anlage',
    ['Installationselement', 'Rückwandbefestigungssatz', 'Anschlussbogen']
        .every((n) => !named(groupsOf('3411 516'), n)));
check('… but it still gets a Steuerung: its own text says "für Steuerung Hytronic/HyTouch"',
    !!named(groupsOf('3411 516'), 'Urinoirsteuerung'));

// ---- Anlage vs. bare ceramic (the derivation's spine) --------------------
check('isAnlage is an identity PREFIX', isAnlage({ label: 'Urinoiranlage Laufen Lema rimless' }));
check('isAnlage does not fire on a partner reference in the description',
    !isAnlage({ label: 'Urinoir Laufen Val rimless', description: 'Ausführung für Urinoiranlage' }));
check('an integrated Anlage takes the element WITHOUT water (3612 406)',
    deriveElement({ label: 'Urinoiranlage Laufen Lema rimless', description: 'Batteriebetrieb 9V, HF- Steuerung' }) === '3612 406');
check('a Tamaro-S Anlage takes 3612 405',
    deriveElement({ label: 'Urinoiranlage Tamaro- S 90, Netzbetrieb 230 V' }) === '3612 405');
check('the SAME series as a bare ceramic needs water + Rohbauset (3612 403)',
    deriveElement({ label: 'Urinoir Laufen Lema rimless', description: 'Ein- und Ablauf verdeckt, ohne Steuerung' }) === '3612 403');

// ---- evidence beats derivation ------------------------------------------
check('evidence is used verbatim where it exists',
    urinoirElement({ artNr: '3421 103.100.000' }).source === 'evidence'
    && urinoirElement({ artNr: '3421 103.100.000' }).el === EVIDENCE['3421 103'].el);
check('a urinal with no evidence row is marked derived',
    urinoirElement({ artNr: '3419 215.000.000', label: 'Urinoir KWC Campus wasserlos' }).source === 'derived');
check('"no element" in the evidence is honoured, not re-derived',
    urinoirElement({ artNr: '3421 125.100.000', label: 'Urinoir Taro-Uni' }).el === null);
check('every evidenced element is one we actually sell',
    Object.values(EVIDENCE).every((e) => e.el === null || URINOIR_ELEMENTS.includes(e.el)));
check('the derivation reproduces at least 35 of the 38 evidenced pairings',
    (() => {
        let hit = 0, tot = 0;
        for (const [b, e] of Object.entries(EVIDENCE)) {
            const t = byBase.get(b);
            if (!t) continue;
            tot++;
            if (deriveElement(t) === e.el) hit++;
        }
        return tot === 38 && hit >= 35;
    })());

// ---- the Pflichtteile ---------------------------------------------------
const withEl = trays.filter((t) => urinoirElement(t).el);
check('every urinal that gets an element gets 3612 500 AND 3612 272',
    withEl.every((t) => {
        const gs = linkUrinoirElement(t, pool);
        const r = named(gs, 'Rückwandbefestigungssatz'), a = named(gs, 'Anschlussbogen');
        return r && a && r.options[0].artNr.startsWith(RUECKWAND) && a.options[0].artNr.startsWith(ANSCHLUSSBOGEN);
    }));
check('a urinal with no element gets neither Pflichtteil',
    trays.filter((t) => !urinoirElement(t).el).every((t) => {
        const gs = linkUrinoirElement(t, pool);
        return !named(gs, 'Rückwandbefestigungssatz') && !named(gs, 'Anschlussbogen') && !named(gs, 'Installationselement');
    }));
check('… though its Schallschutz stays: that part belongs to the ceramic (Lema 3411 128)',
    !!named(groupsOf('3411 128'), 'Schallschutz') && !urinoirElement(byBase.get('3411 128')).el);
check('both Pflichtteile vanish when the element is opted out (bau115)',
    (() => {
        const gs = groupsOf('2121 197');
        const el = named(gs, 'Installationselement');
        return ['Rückwandbefestigungssatz', 'Anschlussbogen'].every((n) => {
            const g = named(gs, n);
            const rule = g.optionRules.find((r) => r.whenArtNr === OHNE_ELEMENT.artNr);
            return g.dependsOn === el.id && rule && rule.optionArtNrs.length === 0;
        });
    })());
check('the opt-out is the SAME text position the Klosett rules use',
    named(groupsOf('2121 197'), 'Installationselement').options.slice(-1)[0].artNr === 'bau115');
check('exactly ONE element is offered, plus the opt-out — never a menu of frames',
    trays.filter((t) => urinoirElement(t).el).every((t) => {
        const o = named(linkUrinoirElement(t, pool), 'Installationselement').options;
        return o.length === 2 && o[1].artNr === OHNE_ELEMENT.artNr
            && URINOIR_ELEMENTS.includes(String(o[0].artNr).slice(0, 8));
    }));
check('the rule-chosen element is options[0]',
    named(groupsOf('2121 197'), 'Installationselement').options[0].artNr.startsWith(EVIDENCE['2121 197'].el));

// ---- Schallschutz belongs to the CERAMIC --------------------------------
check('Schallschutz does NOT hang off the element',
    !named(groupsOf('2121 197'), 'Schallschutz').dependsOn);
check('a Geberit-own Preda gets no Schallschutz (it ships complete)',
    !named(groupsOf('3421 202'), 'Schallschutz'));

// ---- Steuerung ----------------------------------------------------------
const steuGroups = trays.map((t) => named(linkUrinoirElement(t, pool), 'Urinoirsteuerung')).filter(Boolean);
check('the Steuerung group opens on "Ohne" — CHF 346 to 1225 is not our call',
    steuGroups.length >= 20 && steuGroups.every((g) => g.options[0].artNr === OHNE_STEUERUNG.artNr));
check('the opt-out art-Nr starts with "ohne", so every SAP export skips it',
    /^ohne/i.test(OHNE_STEUERUNG.artNr));
check('all nine controls are offered',
    steuGroups.every((g) => STEUERUNGEN.every((b) => g.options.some((o) => String(o.artNr).startsWith(b)))));
check('a ceramic with its own control gets no Steuerung group',
    !named(groupsOf('3421 202'), 'Urinoirsteuerung'));
check('a bare ceramic does', !!named(groupsOf('2121 197'), 'Urinoirsteuerung'));

// ---- Rohbau-Set (§3.4) --------------------------------------------------
check('the Rohbau-Set rides only where the element does NOT bundle one (3612 407)',
    trays.filter((t) => named(linkUrinoirElement(t, pool), 'Rohbau-Set'))
         .every((t) => urinoirElement(t).el === '3612 407'));
check('… on exactly the three urinals the evidence keeps it on',
    trays.filter((t) => named(linkUrinoirElement(t, pool), 'Rohbau-Set')).length === 3);
check('it disappears with "Ohne Urinoirsteuerung"',
    (() => {
        const g = named(groupsOf('3421 201'), 'Rohbau-Set');
        const r = g.optionRules.find((x) => x.whenArtNr === OHNE_STEUERUNG.artNr);
        return g.dependsOn === named(groupsOf('3421 201'), 'Urinoirsteuerung').id && r && r.optionArtNrs.length === 0;
    })());
check('an element that bundles the Rohbauset never gets the row',
    !named(groupsOf('3421 103'), 'Rohbau-Set') && urinoirElement(byBase.get('3421 103')).el === '3612 402');

// ---- the wall-mount exclusion (§3.4 / §3.5) -----------------------------
const elOpts = named(groupsOf('3411 126'), 'Installationselement').options;
check('a Dübelschraube group is suppressed once an element is set',
    (() => {
        const p = wallOnlyPatch({ name: 'Dübelschraube', options: [{ artNr: '8211 112.000.000' }] }, 'el_1', elOpts);
        const withEl = p.optionRules.find((r) => r.whenArtNr === elOpts[0].artNr);
        const noEl = p.optionRules.find((r) => r.whenArtNr === OHNE_ELEMENT.artNr);
        return withEl.optionArtNrs.length === 0 && noEl.optionArtNrs.length === 1;
    })());
check('a group that merely LISTS the screws is left alone (partner-reference trap)',
    wallOnlyPatch({ name: 'Stücklisten Artikel', options: [{ artNr: '3421 103.100.000' }, { artNr: '8211 112.000.000' }] }, 'el_1', elOpts) === null);
check('an unrelated group is never patched',
    wallOnlyPatch({ name: 'Absaugesiphon', options: [{ artNr: '3441 150.000.000' }] }, 'el_1', elOpts) === null);
check('the Spülrohr 3432 115 is in the same wall-only class',
    wallOnlyPatch({ name: 'Spülrohr', options: [{ artNr: '3432 115.000.000' }] }, 'el_1', elOpts) !== null);

// ---- reconciler ---------------------------------------------------------
check('the Urinoir ruleset does not own the Klosett Ablaufbogen',
    !URINOIR_OWNED_GROUPS.has('ablaufbogen') && !isOwned({ name: 'Ablaufbogen' }, URINOIR_OWNED_GROUPS));
check('nor the urinal\'s own siphon',
    !isOwned({ name: 'Absaugesiphon' }, URINOIR_OWNED_GROUPS));
check('reconciling is idempotent',
    (() => {
        const t = byBase.get('2121 197');
        const gs = linkUrinoirElement(t, pool);
        const once = reconcileInstallation(t, gs, URINOIR_OWNED_GROUPS);
        const twice = reconcileInstallation({ ...t, mountingMaterials: once.groups }, gs, URINOIR_OWNED_GROUPS);
        return !twice.changed;
    })());
check('an unowned group survives reconciliation',
    (() => {
        const t = { artNr: '2121 197.100.000', mountingMaterials: [{ name: 'Absaugesiphon', options: [{ artNr: '3441 150.000.000' }] }] };
        const res = reconcileInstallation(t, groupsOf('2121 197'), URINOIR_OWNED_GROUPS);
        return res.groups.some((g) => g.name === 'Absaugesiphon');
    })());

// ---- BOM order (Reji, 2026-08-21) ---------------------------------------
const order = [
    ['Urinoirsteuerung', 10], ['Rohbau-Set', 15], ['Dübelschraube', 30], ['Gewindebolzen', 30],
    ['Schallschutz', 40], ['Absaugesiphon', 50], ['Ablaufbogen', 50], ['Einlaufmanschette', 60],
    ['Einlaufgarnitur', 60], ['Installationselement', 70], ['Rückwandbefestigungssatz', 80],
    ['Anschlussbogen', 90], ['Quertraverse', 95], ['Steckdichtung', URINOIR_MISC],
];
for (const [name, want] of order) {
    check(`BOM order: ${name} -> ${want}`, urinoirBomBucket(name) === want, String(urinoirBomBucket(name)));
}
check('the ceramic sits between the Steuerung and the screws', URINOIR_CERAMIC === 20);
check('a Steuerung parked on "Ohne" drops to misc, not to the top',
    urinoirBomBucket('Urinoirsteuerung', { chosen: false }) === URINOIR_MISC);
check('"Anschlussbogen" is the supply side and never files with the drain',
    urinoirBomBucket('Anschlussbogen') === 90 && urinoirBomBucket('Ablaufbogen') === 50);

// ---- misc opens on "Ohne" ------------------------------------------------
check('a misc group offering an opt-out is reordered to open on it',
    (() => {
        const r = miscOhneFirst({ name: 'Steckdichtung', options: [{ artNr: '8111 412.000.000' }, { artNr: 'ohne_sd' }] });
        return r && r[0].artNr === 'ohne_sd' && r.length === 2;
    })());
check('… and one already opening on it is left alone',
    miscOhneFirst({ name: 'Steckdichtung', options: [{ artNr: 'ohne_sd' }, { artNr: '8111 412.000.000' }] }) === null);
check('the ELEMENT is never reordered — its "Ohne" must stay last',
    miscOhneFirst(named(groupsOf('2121 197'), 'Installationselement')) === null);
check('nor a Siphon: it is ordered unless the ceramic already includes it',
    miscOhneFirst({ name: 'Absaugesiphon', options: [{ artNr: '3441 150.000.000' }, { artNr: 'ohne_as' }] }) === null);

// ---- the SAP export must never ship a dash --------------------------------
// The Urinoirsteuerung's DEFAULT is an "Ohne" row, and an "Ohne" row renders its code
// cell as `-` (isNoneArtNr) — so the "ohne" arm of every export guard never sees the
// art-Nr and a literal `-` line reached SAP. It was already wrong for any Wandklosett
// row parked on "Ohne"; two of the three readers happened to guard it, createWCApp did
// not. Static, because the three readers are DOM scrapers with no unit-testable seam.
for (const [file] of [
    ['modules/factories/createWCApp.js'],
    ['modules/factories/createGlassApp.js'],
    ['modules/factories/_shared.js'],
]) {
    const src = fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
    check(`${file}: the BOM export skips a "-" code`, /code\s*!==\s*"-"/.test(src),
        'a row parked on "Ohne …" renders as "-" and would ship as an article line');
}

console.log('-'.repeat(50));
console.log(`Summary: ${pass} passed, ${fail} failed.`);
console.log('-'.repeat(50));
process.exit(fail ? 1 : 0);
