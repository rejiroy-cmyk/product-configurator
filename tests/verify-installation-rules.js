// Installationselement linker + reconciler.
// Rules: INSTRUCTIONS.md §2 "Installationselement" / INSTALLATION_ELEMENT_RULES.md
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { expandData } from '../modules/dataHydrate.js';
import { COLOR_NAMES } from '../modules/factories/_colorCodes.js';
import {
    buildElementPool, linkInstallationElement, elementSituation, cisternOf,
    plateFamilyOf, ELEMENTS, OHNE_ELEMENT,
} from '../modules/rules/linkInstallationElement.js';
import { reconcileInstallation, isOwned } from '../modules/rules/reconcileInstallation.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
let pass = 0, fail = 0;
const check = (name, ok, detail = '') => {
    if (ok) { pass++; console.log(`✅ [PASS] ${name}`); }
    else { fail++; console.log(`❌ [FAIL] ${name}${detail ? ' — ' + detail : ''}`); }
};

const data = expandData(JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'custom-data.json'), 'utf8')));
const pool = buildElementPool(data);
const wk = (data.wandklosett && data.wandklosett.trays) || [];

// ---- situation ----------------------------------------------------------
check('SIA 500 comes from tray.size, not from the label text',
    elementSituation({ size: 'SIA 500', label: 'Wand- Klosett X' }) === 'barrierefrei');
check('a Standard tray is not barrier-free',
    elementSituation({ size: 'Standard', label: 'Wand- Klosett X' }) === 'standard');
check('full-text fallback: barrierefrei only in the description',
    elementSituation({ size: 'Standard', label: 'Wand- Klosett X', description: 'rollstuhlgängig, barrierenfrei' }) === 'barrierefrei');
check('Dusch-WC takes the STANDARD element (3612 348 carries the Leerrohr)',
    elementSituation({ size: 'Standard', label: 'Dusch-WC AquaClean Mera' }) === 'standard');
check('every SIA 500 Wandklosett tray resolves to the barrier-free element',
    wk.filter(t => /^\s*SIA\s*500\s*$/i.test(String(t.size || '')))
      .every(t => linkInstallationElement(t, pool, { colorNames: COLOR_NAMES })[0]
                    .options[0].artNr.startsWith(ELEMENTS.barrierefrei)));

// ---- cistern & plates ---------------------------------------------------
check('cistern reads the ELEMENT: Omega element -> Omega',
    cisternOf({ label: 'Wandklosettelement Geberit Duofix Omega, Höhe 82 cm' }) === 'Omega');
check('cistern defaults to Sigma',
    cisternOf({ label: 'Wandklosettelement Geberit Duofix Sigma' }) === 'Sigma');
check('plate family read full-text', plateFamilyOf({ label: 'Betätigungsplatte Geberit Sigma20 square' }) === 'Sigma20');
check('Sigma60 is never a listed family', !pool.platesByFamily.has('Sigma60'));
check('Kappa/Highline plates are never listed',
    ![...pool.platesByFamily.keys()].some(f => /^(Kappa|Highline)/i.test(f)));

const groups = linkInstallationElement(wk[0], pool, { colorNames: COLOR_NAMES });
const famGroup = groups.find(g => g.name === 'Betätigungsplatte — Familie');
const plateGroup = groups.find(g => g.name === 'Betätigungsplatte');
check('the plate-FAMILY group is UI-only — fam_* is not an article number',
    famGroup.uiOnly === true && famGroup.options.every(o => /^fam_/.test(o.artNr)));
check('plate selection is two-stage and cascades', !!famGroup && plateGroup.dependsOn === famGroup.id);
check('every family maps to plates via optionRules',
    plateGroup.optionRules.length === famGroup.options.length &&
    plateGroup.optionRules.every(r => r.optionArtNrs.length > 0));
// The cistern lives INSIDE the element, so the family list must follow the element the
// user actually picks — not the default one. Freezing it at link time left an Omega
// element stuck offering Sigma plates that do not fit it.
check('the family selector cascades FROM the element', famGroup.dependsOn === groups[0].id);
check('a Sigma element offers only Sigma families', (() => {
    const r = famGroup.optionRules.find(x => x.whenArtNr.startsWith(ELEMENTS.standard));
    return !!r && r.optionArtNrs.length > 0 && r.optionArtNrs.every(a => /^fam_sigma/.test(a));
})());
check('the Omega element (3612 301) offers ONLY Omega families', (() => {
    const r = famGroup.optionRules.find(x => x.whenArtNr.startsWith(ELEMENTS.omega82));
    return !!r && r.optionArtNrs.length > 0 && r.optionArtNrs.every(a => /^fam_omega/.test(a));
})());
check('with no element (bau115) every family stays on offer', (() => {
    const r = famGroup.optionRules.find(x => x.whenArtNr === 'bau115');
    return !!r && r.optionArtNrs.length === famGroup.options.length;
})());
// The family list must stay COMPLETE. Narrowing it to the element's own cistern makes an
// Omega plate unreachable while a Sigma element is selected, which kills the reverse rule
// (pick the plate, the engine adjusts the element) — INSTRUCTIONS §2.
check('the family group VALIDATES rather than narrows', famGroup.cascadeMode === 'validate');
check('the plate group still narrows normally', plateGroup.cascadeMode === undefined);
check('every family stays on offer whatever the element',
    famGroup.options.length === [...pool.platesByFamily.keys()].length);
check('the plate group carries rules for EVERY family, Omega included',
    plateGroup.optionRules.length === famGroup.options.length &&
    plateGroup.optionRules.some(r => /omega/.test(r.whenArtNr)));
check('every plate option names its colour in the description',
    plateGroup.options.every(o => / — .+$/.test(String(o.description || ''))));

// ---- the opt-out --------------------------------------------------------
const ohne = groups[0].options.find(o => o.artNr === 'bau115');
check('bau115 is offered as the opt-out', !!ohne);
check('bau115 is a TEXT POSITION and carries NO Menge',
    !!ohne && ohne.isTextPosition === true && ohne.menge === undefined);
check('the default is a real element, never the opt-out',
    groups[0].options[0].artNr !== OHNE_ELEMENT.artNr);

// ---- reconciler ---------------------------------------------------------
const tray = { mountingMaterials: [
    { name: 'WC-Sitz', options: [] },
    { name: 'Duofix Element', options: [{ artNr: '3612 348.000.000' }] },
    { name: 'Schallschutz', options: [] },
] };
const rules = [{ name: 'Installationselement', _auto: true, options: [{ artNr: '3612 348.000.000' }] }];
const r1 = reconcileInstallation(tray, rules);
const r2 = reconcileInstallation({ mountingMaterials: r1.groups }, rules);
check('reconcile is idempotent', JSON.stringify(r1.groups) === JSON.stringify(r2.groups));
check('a second pass reports no change', r2.changed === false);
check('the old "Duofix Element" group is retired', r1.removed.includes('Duofix Element'));
check('unrelated groups survive untouched',
    r1.groups.some(g => g.name === 'WC-Sitz') && r1.groups.some(g => g.name === 'Schallschutz'));
check('unrelated groups keep their relative order',
    r1.groups.filter(g => !isOwned(g)).map(g => g.name).join() === 'WC-Sitz,Schallschutz');
check('reconcile never mutates the input tray',
    tray.mountingMaterials.some(g => g.name === 'Duofix Element'));
check('Schallschutz is NOT owned — the element rule must not manage it',
    !isOwned({ name: 'Schallschutz' }));
check('Ablaufbogen IS owned — the element always needs its drain bend',
    isOwned({ name: 'Ablaufbogen' }));
check('Ablaufanschluss is NOT owned — different part, 6 Standklosett trays',
    !isOwned({ name: 'Ablaufanschluss' }));
check('the linker produces the Ablaufbogen 3612 374 with the element', (() => {
    const g = groups.find(x => x.name === 'Ablaufbogen');
    return !!g && g.options.length === 1 && g.options[0].artNr.startsWith('3612 374');
})());
check('the Ablaufbogen depends on the element group', (() => {
    const g = groups.find(x => x.name === 'Ablaufbogen');
    const el = groups.find(x => x.name === 'Installationselement');
    return !!g && g.dependsOn === el.id;
})());
check('opting out (bau115) suppresses the Ablaufbogen entirely', (() => {
    const g = groups.find(x => x.name === 'Ablaufbogen');
    const r = g.optionRules.find(x => x.whenArtNr === 'bau115');
    return !!r && r.optionArtNrs.length === 0;
})());
// Both element-serving parts leave with the element. Asserted as a SET so a part added
// later without the dependency is caught rather than silently shipping unconditional.
check('every element-serving part depends on the element and dies with bau115', (() => {
    const el = groups.find(x => x.name === 'Installationselement');
    const dependents = ['Ablaufbogen', 'Rückwandbefestigungssatz'];
    return dependents.every((name) => {
        const g = groups.find(x => x.name === name);
        if (!g || g.dependsOn !== el.id || !Array.isArray(g.optionRules)) return false;
        const off = g.optionRules.find(r => r.whenArtNr === 'bau115');
        const on = g.optionRules.filter(r => r.whenArtNr !== 'bau115');
        return !!off && off.optionArtNrs.length === 0
            && on.length > 0 && on.every(r => r.optionArtNrs.length === 1);
    });
})());
check('every REAL element keeps the Ablaufbogen', (() => {
    const g = groups.find(x => x.name === 'Ablaufbogen');
    return g.optionRules.filter(r => r.whenArtNr !== 'bau115')
            .every(r => r.optionArtNrs.length === 1 && r.optionArtNrs[0].startsWith('3612 374'));
})());

// ---- Mix & Match bundle rule (static guard) -----------------------------
// MM renders its Stückliste as a GRID, not the BOM table, so this rule cannot be
// exercised without a DOM. Guard the source instead — the same approach
// verify-copy-multiplier.js takes over its call sites.
const mm = fs.readFileSync(path.join(__dirname, '..', 'modules/factories/createMixAndMatchApp.js'), 'utf8');
check('MM imports the element art-Nrs rather than retyping them',
    /import \{[^}]*WT_ELEMENTS[^}]*\}\s*from\s*'\.\.\/rules\/linkInstallationElement\.js'/.test(mm));
check('MM derives the Einbausifon case from the shared 3612 288 base',
    /wtEinbausifon\s*=[\s\S]{0,160}?startsWith\('3612 288'\)/.test(mm));
check('the Endmontageset REPLACES the siphon (it is the first branch of the siphon slot)',
    /if \(wtEinbausifon\) \{\s*\n\s*pushEndmontageset\(\);\s*\n\s*\} else if \(hasCabinet\)/.test(mm));
check('the Regulierventil is its own slot, not nested in a siphon branch',
    /REGULIERVENTIL SLOT/.test(mm));
check('the Anschlussbogen 3612 272 is dropped for the Einbausifon element',
    /if \(!wtEinbausifon\) \{[\s\S]{0,200}?WT_ANSCHLUSSBOGEN/.test(mm));
check('the Rückwandbefestigungssatz is NOT gated on the element variant',
    /startsWith\(RUECKWAND\)/.test(mm) && !/wtEinbausifon[^\n]*RUECKWAND/.test(mm));

console.log('\n' + '-'.repeat(50));
console.log(`Summary: ${pass} passed, ${fail} failed.`);
console.log('-'.repeat(50));
if (fail) process.exit(1);
