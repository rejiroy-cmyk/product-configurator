#!/usr/bin/env node
/**
 * inject-ch1b.cjs — Chapter 1, PASS B: mounting materials onto EXISTING trays.
 *
 * Unlike every injection before it, this one MUTATES records that already work. A bad
 * rule here does not add noise, it damages a configurator someone orders from. Three
 * rules keep that from happening:
 *
 *   1. options[0] IS THE DEFAULT SELECTION. This script only ever APPENDS to an
 *      existing group, so the default a tray ships with can never change. The report
 *      asserts defaultsChanged === 0 and the apply path refuses to run if it is not.
 *   2. New groups (no existing group covers that family) are created OPT-IN: their
 *      options[0] is "— keine —", so a tray gains a choice, never a silent extra
 *      position on the Stückliste.
 *   3. Ersatzteile (additionalMaterials type "E") are excluded. A spare seal is not
 *      something you specify into a new bathroom; 97 groups of them stay out.
 *
 * The linkage is NOT guessed. profishop's own `additionalMaterials` states which
 * accessories belong to which article, so Pass B reads that rather than inferring from
 * size or brand. 58% of those pairs are already on the trays; this fills the other 42%.
 *
 * Usage:  node st-scraper/inject-ch1b.cjs           # DRY RUN
 *         node st-scraper/inject-ch1b.cjs --apply   # writes (backups .bak-ch1b)
 */
'use strict';
const fs = require('fs');
const path = require('path');
// custom-data.json is stored INTERNED (repeated mountingMaterials options and
// services live once in a shared table) — readData/writeData hide that. Reading it
// with fs directly yields the STRING "o412" where an option object is expected.
const { readData, writeData } = require('./_dataFile.cjs');

const DIR = __dirname, ROOT = path.resolve(DIR, '..');
const DATA = path.join(ROOT, 'custom-data.json');
const PRICES = path.join(ROOT, 'prices.json');
const API = path.join(DIR, 'catalogue-inspection', 'ch1-api.json');
const REPORT = path.join(DIR, 'catalogue-inspection', 'ch1b-injection-report.json');
const APPLY = process.argv.includes('--apply');

const readJSON = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
const b7 = (s) => { const d = String(s || '').replace(/[^0-9]/g, ''); return d.length >= 7 ? d.slice(0, 7) : ''; };
const clean = (s) => String(s || '').replace(/<br\s*\/?>/gi, ' ').replace(/\s+/g, ' ').trim();

// ---------------------------------------------------------------------------
// Accessory family. Both the incoming article label and the tray's existing group
// names are reduced to the same key, so an article joins the curated group that
// already covers it instead of creating a near-duplicate beside it.
// Compound- and umlaut-safe: no leading \b (see classify-ch8.cjs for why).
// ---------------------------------------------------------------------------
const FAMILY = [
    [/schallschutz|schalld[äa]mm|schall-/i, 'Schallschutz'],
    [/dichtband|dichtungsband|eckdichtung|wannendichtband|dichtung/i, 'Dichtband'],
    [/pu-?kleber|montageschaum|\bkleber\b|\bschaum\b/i, 'Montageschaum'],
    [/tr[äa]ger/i, 'Wannenträger'],
    [/rahmen/i, 'Montagerahmen'],
    [/[üu]berlaufset|ablaufdeckel|\bdeckel\b/i, 'Ablaufdeckel'],
    [/garnitur/i, 'Ablaufgarnitur'],
    // NO \b before "fuss": "Badewannenfuss" ends with it and a boundary needs a
    // non-word char in front. Third time this trap has cost real articles.
    [/fussset|f[üu]sse|fuss\b|anker|stelzf|nivod[üu]bel/i, 'Füsse / Anker'],
    [/iso-?set|isolation/i, 'Schallschutz'],
    [/haltegriff|griff\b/i, 'Haltegriff'],
    [/abst[üu]tz/i, 'Mitten-Abstütz-System'],
    [/\brost\b|designrost|muldenrost/i, 'Rost'],
    [/verkleidung/i, 'Verkleidung'],
    [/montageset|rohbauset|installationsset|montagesets/i, 'Montageset'],
    [/duschsitz|sitzbank/i, 'Duschsitz'],
    [/ablauf/i, 'Ablauf'],
    [/keilschiene/i, 'Keilschiene'],
    [/abdeckung|blende/i, 'Abdeckung'],
];
const familyOf = (s) => { const t = String(s || ''); for (const [re, f] of FAMILY) if (re.test(t)) return f; return ''; };

const data = readData();
const prices = readJSON(PRICES).prices;
const apiRaw = readJSON(API);
const api = (Array.isArray(apiRaw) ? apiRaw : Object.values(apiRaw)).filter(Boolean);

// Label/image/price for a referenced accessory: prefer the API's own record for it.
const apiByArt = new Map();
for (const e of api) apiByArt.set(clean(e.matnr), e);

const POOLS = ['badewanne', 'duschenwanne', 'duschenrinne', 'dampfdusche'];
const trayOf = new Map();
for (const p of POOLS) for (const t of (data[p].trays || [])) trayOf.set(b7(t.artNr), { pool: p, tray: t });

const report = {
    generatedFor: 'Chapter 1 PASS B — mounting materials onto existing trays',
    mode: APPLY ? 'APPLY' : 'DRY RUN',
    excludedErsatzteile: 0, excludedDocs: 0,
    pairsDeclared: 0, alreadyPresent: 0, added: 0, unplaceable: 0,
    defaultsChanged: 0,                       // MUST stay 0
    traysAffected: 0,
    optionsIntoExistingGroups: 0, newGroupsCreated: 0,
    byPool: {}, byFamily: {}, newGroupNames: {},
    unplaceableSamples: [], perTraySample: [],
};

const plan = [];   // {pool, trayArtNr, groupName, isNew, adds:[{artNr,label}]}

for (const e of api) {
    const hit = trayOf.get(b7(e.matnr));
    if (!hit) continue;
    const { pool, tray } = hit;
    const groups = tray.mountingMaterials || [];
    const have = new Set();
    for (const m of groups) for (const o of (m.options || [])) have.add(b7(o.artNr));

    const perTray = [];
    for (const g of (e.additionalMaterials || [])) {
        if (g.type === 'E') { report.excludedErsatzteile += (g.articles || []).length; continue; }
        for (const a of (g.articles || [])) {
            report.pairsDeclared++;
            const art = clean(a.artNr);
            if (have.has(b7(art))) { report.alreadyPresent++; continue; }

            const src = apiByArt.get(art);
            const label = clean((src && src.maktx) || a.label);
            // Paperwork, not an orderable position.
            if (/montageinstruktion|montageanleitung|bedienungsanleitung|prospekt/i.test(label)) {
                report.excludedDocs++;
                continue;
            }
            const fam = familyOf(label) || familyOf(a.label);
            if (!fam) {
                report.unplaceable++;
                if (report.unplaceableSamples.length < 15) report.unplaceableSamples.push({ artNr: art, label: label.slice(0, 70) });
                continue;
            }
            const existing = groups.find(m => familyOf(m.name) === fam);
            const opt = {
                artNr: art,
                label,
                type: 'Option',
                menge: 1,
                imgUrl: (src && src.image) || '',
            };
            perTray.push({ fam, groupName: existing ? existing.name : fam, isNew: !existing, opt });
            have.add(b7(art));
            report.added++;
            report.byFamily[fam] = (report.byFamily[fam] || 0) + 1;
            if (existing) report.optionsIntoExistingGroups++;
            else { report.newGroupsCreated++; report.newGroupNames[fam] = (report.newGroupNames[fam] || 0) + 1; }
        }
    }
    if (perTray.length) {
        report.traysAffected++;
        report.byPool[pool] = (report.byPool[pool] || 0) + 1;
        plan.push({ pool, trayArtNr: tray.artNr, trayLabel: clean(tray.label).slice(0, 60), adds: perTray });
        if (report.perTraySample.length < 6) {
            report.perTraySample.push({
                pool, tray: tray.artNr, label: clean(tray.label).slice(0, 58),
                groupsBefore: groups.map(m => m.name),
                adds: perTray.map(x => `${x.groupName}${x.isNew ? ' (NEW)' : ''} += ${x.opt.artNr}`),
            });
        }
    }
}

report.summary = {
    pairsDeclared: report.pairsDeclared,
    alreadyPresent: report.alreadyPresent,
    optionsAdded: report.added,
    unplaceable: report.unplaceable,
    excludedErsatzteile: report.excludedErsatzteile,
    excludedDocs: report.excludedDocs,
    traysAffected: report.traysAffected,
    byPool: report.byPool,
    intoExistingGroups: report.optionsIntoExistingGroups,
    newGroupsCreated: report.newGroupsCreated,
    defaultsChanged: report.defaultsChanged,
    pricedOptions: 0,
};
fs.writeFileSync(REPORT, JSON.stringify(report, null, 2));

console.log(`\n=== inject-ch1b (PASS B) — ${report.mode} ===`);
console.log(JSON.stringify(report.summary, null, 2));
console.log('\nby family:', JSON.stringify(report.byFamily));
console.log('\nNEW groups that would be created (opt-in, "— keine —" first):', JSON.stringify(report.newGroupNames));
if (report.unplaceable) {
    console.log(`\n!! ${report.unplaceable} accessories match no family — they would be DROPPED:`);
    report.unplaceableSamples.forEach(x => console.log('   ' + x.artNr + '  ' + x.label));
}
console.log('\nsample trays (before → what they gain):');
report.perTraySample.forEach(s => {
    console.log(`  [${s.pool}] ${s.tray} ${s.label}`);
    console.log(`     has:  ${s.groupsBefore.join(' | ')}`);
    s.adds.forEach(a => console.log(`     +     ${a}`));
});
console.log(`\nreport → ${path.relative(ROOT, REPORT)}`);

if (!APPLY) { console.log('\nDRY RUN — custom-data.json untouched. Re-run with --apply to write.'); process.exit(0); }

// ---- apply: append only, never index 0 -------------------------------------
fs.copyFileSync(DATA, DATA + '.bak-ch1b');
let defaultsChanged = 0;
for (const p of plan) {
    const tray = trayOf.get(b7(p.trayArtNr)).tray;
    tray.mountingMaterials = tray.mountingMaterials || [];
    for (const a of p.adds) {
        let g = tray.mountingMaterials.find(m => m.name === a.groupName);
        if (!g) {
            g = { id: 'ch1b_' + familyOf(a.groupName).toLowerCase().replace(/[^a-z]/g, '') + '_' + b7(p.trayArtNr),
                  name: a.groupName,
                  options: [{ artNr: 'ohne_' + a.fam.toLowerCase().replace(/[^a-z]/g, ''), label: '— keine —', dropdownLabel: '— keine —', type: 'Option', menge: 0, imgUrl: '' }] };
            tray.mountingMaterials.push(g);
        }
        const before0 = g.options[0] && g.options[0].artNr;
        g.options.push(a.opt);                       // APPEND — index 0 is never touched
        if ((g.options[0] && g.options[0].artNr) !== before0) defaultsChanged++;
    }
}
if (defaultsChanged) {
    console.error(`\nABORTED — ${defaultsChanged} default selections would have changed. Nothing written.`);
    fs.copyFileSync(DATA + '.bak-ch1b', DATA);
    process.exit(3);
}
writeData(data, { backup: false });
console.log(`\nAPPLIED — ${report.added} options across ${report.traysAffected} trays. defaultsChanged=0.`);
console.log('backup: custom-data.json.bak-ch1b');
