// ============================================================================
// Accessory colour matching (Duschenmischer / Bademischer)
//
// A coloured mixer pulls its Anschlussbogen / Brauseschlauch / Handbrause /
// Regenbrause out of the Zubehör pool in the SAME finish — but the user keeps the
// choice: the BOM row is a dropdown of every part of that family in that colour,
// not a frozen auto-match. These tests pin the rules that make that safe:
//   · own brand first, then any brand in the right colour, then own brand in
//     another colour (and only then)
//   · an explicit pick always outranks the auto-match
//   · a pool pick survives a finish change — the MODEL is remembered, the colour
//     follows the Armatur
//   · the curated/ERP options stay reachable, so "Ohne …" is never lost
// Synthetic pool → a green run means the RULE is right, whatever the data holds.
// ============================================================================
global.alert = () => {};
global.window = {
    copyTextToClipboard: () => Promise.resolve(),
    copyBOMToClipboard: () => {},
    getComputedStyle: () => ({ display: 'block' }),
};
global.document = {
    createElement: () => ({ style: {} }),
    body: { appendChild: () => {}, removeChild: () => {} },
    getElementById: () => ({ style: {}, querySelectorAll: () => [], querySelector: () => null }),
    querySelector: () => null,
};

const { accFamilyOf, accCandidates, accSkuInColour, accGroupChoice, artFinishCode,
        isGarniturSet, brausegarniturPlan, ACC_BUNDLED_BY_GARNITUR, findArticleByBase, requiredBodyFor } =
    await import('../modules/factories/_shared.js');

// 461 = Brushed bronze, 535 = Mattschwarz, 501 = Verchromt.
const POOL = [
    // Anschlussbogen — Axor has the colour, Gessi does not (the real gap that left
    // a Gessi mixer sitting on the Alterna chrome standard).
    { artNr: '6544 100.501.000', label: 'Anschlussbogen Alterna ½", Rosette rund, für Handbrause', productType: 'Anschlussbogen', manufacturer: 'Alterna' },
    { artNr: '6544 196.501.000', label: 'Anschlussbogen Axor Fine ½", Rosette rund, für Handbrause', productType: 'Anschlussbogen', manufacturer: 'Axor',
      variants: [{ artNr: '6544 196.461.000', label: 'Anschlussbogen Axor Fine ½", Rosette rund, für Handbrause, Brushed bronze' }] },
    { artNr: '6544 197.501.000', label: 'Anschlussbogen Axor Fine ½", mit integriertem Brausehalter', productType: 'Anschlussbogen', manufacturer: 'Axor',
      variants: [{ artNr: '6544 197.461.000', label: 'Anschlussbogen Axor Fine ½", mit integriertem Brausehalter, Brushed bronze' }] },
    { artNr: '6241 731.501.000', label: 'Anschlussbogen Gessi ½", Rosette rund, für Handbrause', productType: 'Anschlussbogen', manufacturer: 'Gessi' },
    // Handbrause — one Axor in bronze, one Hansgrohe in bronze (cross-brand tier).
    { artNr: '6412 991.501.000', label: 'Handbrause Axor Starck, Quickclean', productType: 'Handbrause', manufacturer: 'Axor',
      variants: [{ artNr: '6412 991.461.000', label: 'Handbrause Axor Starck, Quickclean, Brushed bronze' }] },
    { artNr: '6412 992.501.000', label: 'Handbrause Axor Uno Zero, Quickclean', productType: 'Handbrause', manufacturer: 'Axor',
      variants: [{ artNr: '6412 992.461.000', label: 'Handbrause Axor Uno Zero, Quickclean, Brushed bronze' }] },
    { artNr: '6541 800.501.000', label: 'Handbrause Hansgrohe Croma Select', productType: 'Handbrause', manufacturer: 'Hansgrohe',
      variants: [{ artNr: '6541 800.461.000', label: 'Handbrause Hansgrohe Croma Select, Brushed bronze' }] },
    // Brausegarnitur — no productType of its own; a SET is a Handbrause-tagged item
    // whose text carries a rail. In 461 a set exists, a bare rail does NOT: the
    // real Axor .475 gap (14 Handbrausen, 5 Schläuche, 0 Gleitstangen) in miniature.
    { artNr: '6412 985.501.000', label: 'Handbrausegarnitur Axor Starck, Gleitstange 900 mm, Handbrause, Brauseschlauch 1600 mm', productType: 'Handbrause', manufacturer: 'Axor',
      variants: [{ artNr: '6412 985.461.000', label: 'Handbrausegarnitur Axor Starck, Gleitstange 900 mm, Handbrause, Brauseschlauch 1600 mm, Brushed bronze' }] },
    // Rails are tagged BOTH ways in the real pool — reading only `Gleitstange` missed 96 of 129.
    { artNr: '6531 404.501.000', label: 'Duschengleitstange Alterna fit, 1100 mm', productType: 'Gleitstange', manufacturer: 'Alterna' },
    { artNr: '6241 730.501.000', label: 'Duschgleitstange Gessi Anello, 900 mm', productType: 'Duschgleitstange', manufacturer: 'Gessi',
      variants: [{ artNr: '6241 730.535.000', label: 'Duschgleitstange Gessi Anello, 900 mm, Mattschwarz' }] },
    // Brauseschlauch in 461, so the only colour gap in 461 is the rail.
    { artNr: '6542 317.501.000', label: 'Brauseschlauch Alterna flexline, 1600 mm', productType: 'Brauseschlauch', manufacturer: 'Alterna',
      variants: [{ artNr: '6542 317.461.000', label: 'Brauseschlauch Alterna flexline, 1600 mm, Brushed bronze' }] },
    // A concealed rain head that names the body it is sold without, plus that body.
    { artNr: '6545 919.501.000', productType: 'Regenbrause', manufacturer: 'Hansgrohe',
      label: 'Regenbrause Hansgrohe Rainfinity, A 381 mm, Brausekopf Ø 360 mm, mit',
      description: 'Regenbrause Hansgrohe Rainfinity, A 381 mm, Brausekopf Ø 360 mm, mit Wandanschluss, 3- jet, ohne Einbaukörper 6418 101 Geräuschgruppe NT',
      variants: [{ artNr: '6545 919.461.000', label: 'Regenbrause Hansgrohe Rainfinity, Brushed bronze', description: 'Regenbrause Hansgrohe Rainfinity, ohne Einbaukörper 6418 101' }] },
    { artNr: '6418 101.000.000', productType: 'Einbaukörper', manufacturer: 'Hansgrohe',
      label: 'Einbaukörper Hansgrohe iBox Universal ¾", ohne Vorabsperrung, für alle Bade-',
      description: 'Einbaukörper Hansgrohe iBox Universal ¾", ohne Vorabsperrung, für alle Bade- und Duschenmischer' },
];
window.productApps = { zubehoer_pool: { trays: POOL } };

const GARNITUR_GROUP = { name: 'Brausegarnitur', options: [{ artNr: 'ohne_garnitur', label: 'Ohne Brausegarnitur', menge: 0 }] };
const MATS = () => [
    { name: 'Brauseschlauch', options: [{ artNr: '6542 317.501.000', label: 'Brauseschlauch Alterna flexline, 1600 mm', menge: 1 }] },
    { name: 'Handbrause', options: [{ artNr: '6541 336.501.000', label: 'Handbrause Alterna saveline 3', menge: 1 }] },
    { ...GARNITUR_GROUP },
];

const ALTERNA_BOGEN = { artNr: '6544 100.501.000', label: 'Anschlussbogen Alterna ½", Rosette rund, für Handbrause', menge: 1 };
const OHNE_REGEN = { artNr: 'ohne_regenbrause', label: 'Ohne Regenbrause', menge: 0 };
const STD_REGEN = { artNr: '6545 102.501.000', label: 'Regenbrause Alterna rainshower ½", Ø 300 mm', menge: 1 };

const tests = [
    {
        name: 'accFamilyOf: numbered ERP names, Garnituren and Deckenanschluss land in the right family',
        fn: () => {
            const cases = [
                ['3. Anschlussbogen', 'Anschlussbogen'],
                ['Anschlussbogen mit integriertem Brausehalter', 'Anschlussbogen'],
                ['4. Brauseschlauch', 'Brauseschlauch'],
                ['Brausenschlauch', 'Brauseschlauch'],
                ['Handbrausegarnitur', 'Handbrause'],
                ['Stabhandbrause', 'Handbrause'],
                ['6. Brausehalter', 'Brausehalter'],
                ['Duschgleitstange (Optional)', 'Gleitstange'],
                ['Deckenanschluss', 'Brausearm'],
                ['Kopfbrause', 'Regenbrause'],
                ['Einbaukörper', null],
                ['Montageschiene', null],
            ];
            for (const [name, want] of cases) {
                const got = accFamilyOf(name);
                if (got !== want) throw new Error(`${name} → ${got}, expected ${want}`);
            }
        },
    },
    {
        name: 'artFinishCode reads the art-Nr triplet (COLOUR RULE), not label text',
        fn: () => {
            if (artFinishCode('6544 196.461.000') !== '461') throw new Error('461 expected');
            if (artFinishCode('ohne_regenbrause') !== null) throw new Error('null expected for a sentinel');
        },
    },
    {
        name: 'Candidates: own brand in the colour ranks above other brands in the colour',
        fn: () => {
            const c = accCandidates('Handbrause', 'Axor', '461');
            if (!c.length) throw new Error('no candidates');
            if (c[0].tier !== 1 || c[0].brand !== 'Axor') throw new Error('own brand must lead: ' + JSON.stringify(c[0]));
            if (!c.some(x => x.tier === 2 && x.brand === 'Hansgrohe')) throw new Error('cross-brand colour match missing');
            if (c.some(x => artFinishCode(x.artNr) !== '461')) throw new Error('a wrong-colour SKU leaked into the list');
        },
    },
    {
        name: 'Candidates: Emporio sub-brand is recognized as Gessi own brand (tier 1)',
        fn: () => {
            const testItem = {
                artNr: '6252 349.461.000', label: 'Anschlussbogen Emporio Via Tortona', productType: 'Anschlussbogen', manufacturer: 'Emporio'
            };
            window.productApps.zubehoer_pool.trays.push(testItem);
            try {
                const c = accCandidates('Anschlussbogen', 'Gessi', '461');
                if (!c.length || c[0].tier !== 1 || c[0].brand !== 'Emporio') {
                    throw new Error('Emporio sub-brand must rank as Gessi tier 1 own brand');
                }
            } finally {
                const idx = window.productApps.zubehoer_pool.trays.indexOf(testItem);
                if (idx !== -1) window.productApps.zubehoer_pool.trays.splice(idx, 1);
            }
        },
    },
    {
        name: 'Series token breaks the tie inside a tier (an Uno Zero set must not open on a Starck hose)',
        fn: () => {
            const c = accCandidates('Handbrause', 'Axor', '461', { serie: 'uno zero' });
            if (!/uno zero/i.test(c[0].label)) throw new Error('expected the Uno Zero hand shower first, got ' + c[0].label);
        },
    },
    {
        name: 'Tier 3 (own brand, other colour) fires ONLY when the colour exists nowhere in the family',
        fn: () => {
            const gessi = accCandidates('Anschlussbogen', 'Gessi', '535');   // nothing in 535 at all
            if (!gessi.length) throw new Error('expected the Gessi fallback');
            if (gessi.some(x => x.brand !== 'Gessi')) throw new Error('tier 3 must stay inside the own brand');
            if (gessi[0].tier !== 3) throw new Error('expected tier 3');
            const axor = accCandidates('Anschlussbogen', 'Axor', '461');     // 461 exists
            if (axor.some(x => x.tier === 3)) throw new Error('tier 3 must not appear next to real colour matches');
        },
    },
    {
        name: 'Auto-match: a coloured mixer swaps the chrome standard for the colour-matched part',
        fn: () => {
            const g = { name: 'Anschlussbogen', options: [ALTERNA_BOGEN] };
            const r = accGroupChoice(g, { brand: 'Axor', code: '461', stdIdx: 0 });
            if (r.item.artNr !== '6544 196.461.000') throw new Error('got ' + r.item.artNr);
            if (r.tier !== 1) throw new Error('expected tier 1');
        },
    },
    {
        name: 'Auto-match keeps the Anschlussbogen SHAPE (integrated holder is not interchangeable)',
        fn: () => {
            const withHolder = { artNr: '6544 102.501.000', label: 'Anschlussbogen Alterna ½", mit integriertem Brausehalter', menge: 1 };
            const a = accGroupChoice({ name: 'Anschlussbogen', options: [ALTERNA_BOGEN] }, { brand: 'Axor', code: '461', stdIdx: 0 });
            if (/integriertem brausehalter/i.test(a.item.label)) throw new Error('"für Handbrause" must not become an integrated-holder bogen');
            const b = accGroupChoice({ name: 'Anschlussbogen', options: [withHolder] }, { brand: 'Axor', code: '461', stdIdx: 0 });
            if (!/integriertem brausehalter/i.test(b.item.label)) throw new Error('integrated-holder bogen must stay one');
        },
    },
    {
        name: 'Chrome (501) keeps the curated house standard — those parts already ARE chrome',
        fn: () => {
            const g = { name: 'Anschlussbogen', options: [ALTERNA_BOGEN] };
            const r = accGroupChoice(g, { brand: 'Axor', code: '501', stdIdx: 0 });
            if (r.item.artNr !== ALTERNA_BOGEN.artNr) throw new Error('got ' + r.item.artNr);
            if (r.tier !== 0) throw new Error('no colour swap expected on chrome');
        },
    },
    {
        name: 'An "Ohne …" default stays off — an optional group is never auto-filled',
        fn: () => {
            const g = { name: 'Regenbrause', options: [OHNE_REGEN, STD_REGEN] };
            const r = accGroupChoice(g, { brand: 'Axor', code: '461', stdIdx: 0 });
            if (!r.isOhne) throw new Error('expected the opt-out to survive');
            if (r.item.artNr !== 'ohne_regenbrause') throw new Error('got ' + r.item.artNr);
        },
    },
    {
        name: 'An explicit standard pick outranks the auto-match',
        fn: () => {
            const g = { name: 'Anschlussbogen', options: [ALTERNA_BOGEN] };
            const r = accGroupChoice(g, { brand: 'Axor', code: '461', stdIdx: 0, pick: { k: 'std', i: 0 } });
            if (r.item.artNr !== ALTERNA_BOGEN.artNr) throw new Error('user choice was overwritten by the colour match');
            if (r.tier !== 0) throw new Error('a standard pick carries no colour badge');
        },
    },
    {
        name: 'A pool pick survives a finish change: same MODEL, new colour',
        fn: () => {
            const g = { name: 'Handbrause', options: [{ artNr: '6541 336.501.000', label: 'Handbrause Alterna saveline 3', menge: 1 }] };
            const pick = { k: 'pool', art: '6412 992.461.000' };            // Uno Zero in bronze
            const bronze = accGroupChoice(g, { brand: 'Axor', code: '461', stdIdx: 0, pick });
            if (bronze.item.artNr !== '6412 992.461.000') throw new Error('got ' + bronze.item.artNr);
            const chrome = accGroupChoice(g, { brand: 'Axor', code: '501', stdIdx: 0, pick });
            if (chrome.item.artNr !== '6412 992.501.000') throw new Error('model not carried into the new finish: ' + chrome.item.artNr);
            if (!/uno zero/i.test(chrome.item.label)) throw new Error('a different model came back');
        },
    },
    {
        name: 'accSkuInColour reports tier 3 when the picked model has no such finish',
        fn: () => {
            const r = accSkuInColour('Anschlussbogen', '6241 731.501.000', '461');   // Gessi has no 461
            if (!r || r.artNr !== '6241 731.501.000') throw new Error('expected the picked SKU back');
            if (r.tier !== 3) throw new Error('a colour miss must not claim to match');
        },
    },
    {
        name: 'Two groups of the same family never auto-match onto the identical SKU',
        fn: () => {
            const used = new Set();
            const g1 = accGroupChoice({ name: 'Handbrausegarnitur', options: [{ artNr: 'x', label: 'Set', menge: 1 }] },
                { brand: 'Axor', code: '461', stdIdx: 0, used });
            used.add(g1.item.artNr);
            const g2 = accGroupChoice({ name: 'Handbrause', options: [{ artNr: 'y', label: 'Handbrause', menge: 1 }] },
                { brand: 'Axor', code: '461', stdIdx: 0, used });
            if (g1.item.artNr === g2.item.artNr) throw new Error('duplicate SKU across two groups: ' + g1.item.artNr);
        },
    },
    {
        name: 'The curated options stay reachable in the dropdown (nothing becomes unorderable)',
        fn: () => {
            const g = { name: 'Regenbrause', options: [OHNE_REGEN, STD_REGEN] };
            const r = accGroupChoice(g, { brand: 'Axor', code: '461', stdIdx: 0 });
            if (!r.optionsHTML.includes('value="o0"') || !r.optionsHTML.includes('value="o1"'))
                throw new Error('a standard option lost its <option>');
            if (!r.hasChoices) throw new Error('group must offer a dropdown');
        },
    },
    {
        name: 'The selected art-Nr always has a matching <option> (a pick can never render as blank)',
        fn: () => {
            const g = { name: 'Anschlussbogen', options: [ALTERNA_BOGEN] };
            const r = accGroupChoice(g, { brand: 'Gessi', code: '535', stdIdx: 0 });   // tier-3 fallback
            if (!r.optionsHTML.includes(`value="c${r.item.artNr}"`)) throw new Error('selected SKU missing from the markup');
            if (!/selected/.test(r.optionsHTML)) throw new Error('nothing marked selected');
        },
    },
    {
        name: 'A group with no pool family behaves exactly as before (plain option list)',
        fn: () => {
            const g = { name: 'Einbaukörper', options: [{ artNr: '6418 101.000.000', label: 'Einbaukörper Hansgrohe iBox', menge: 1 }] };
            const r = accGroupChoice(g, { brand: 'Axor', code: '461', stdIdx: 0 });
            if (r.family !== null) throw new Error('Einbaukörper must not map to a family');
            if (r.tier !== 0 || r.item.artNr !== '6418 101.000.000') throw new Error('untouched group was modified');
            if (r.optionsHTML.includes('<optgroup')) throw new Error('no optgroups without candidates');
            if (r.hasChoices) throw new Error('single-option group needs no dropdown');
        },
    },
    // ---- INSTRUCTIONS §2: Brausegarnitur bundling -------------------------------
    {
        name: 'Gleitstange family covers BOTH pool tags (Gleitstange + Duschgleitstange)',
        fn: () => {
            const c = accCandidates('Gleitstange', 'Gessi', '535');
            if (!c.some(x => x.artNr === '6241 730.535.000'))
                throw new Error('a Duschgleitstange-tagged rail was invisible to the Gleitstange family');
        },
    },
    {
        name: 'A set with a rail is a Brausegarnitur, and leaves the plain Handbrause family',
        fn: () => {
            if (!isGarniturSet({ label: 'Handbrausegarnitur Axor Starck, Gleitstange 900 mm' })) throw new Error('set with a rail must qualify');
            if (isGarniturSet({ label: 'Handbrausegarnitur Fantini Fit, mit integriertem Brausenanschluss' })) throw new Error('a set without a rail is an ordinary hand shower');
            const g = accCandidates('Brausegarnitur', 'Axor', '461');
            if (!g.some(x => x.artNr === '6412 985.461.000')) throw new Error('the Axor set is not offered as a Garnitur');
            const h = accCandidates('Handbrause', 'Axor', '461');
            if (h.some(x => x.artNr === '6412 985.461.000')) throw new Error('a full set leaked into the Handbrause row');
        },
    },
    {
        name: 'Rule 1: choosing a Brausegarnitur switches Schlauch / Handbrause / Gleitstange to Ohne',
        fn: () => {
            const mats = MATS();
            const plan = brausegarniturPlan(mats, { brand: 'Axor', code: '461', picks: { 2: { k: 'pool', art: '6412 985.461.000' } } });
            if (!plan.forceOhne) throw new Error('the bundled parts were left in the BOM alongside the set');
            for (const f of ['Brauseschlauch', 'Handbrause', 'Gleitstange'])
                if (ACC_BUNDLED_BY_GARNITUR.indexOf(f) < 0) throw new Error(f + ' is not switched off by the bundle');
            // and the forced group actually renders as the opt-out
            const r = accGroupChoice({ name: 'Brauseschlauch', options: [{ artNr: 'x', label: 'Brauseschlauch 1600 mm' }, { artNr: 'ohne_schlauch', label: 'Ohne Brauseschlauch' }] },
                { brand: 'Axor', code: '461', stdIdx: 0, forceOhne: true });
            if (!r.isOhne) throw new Error('forceOhne did not reach the row');
        },
    },
    {
        name: 'Rule 1: picking "Ohne Brausegarnitur" leaves the three individual rows alone',
        fn: () => {
            const plan = brausegarniturPlan(MATS(), { brand: 'Axor', code: '461', picks: { 2: { k: 'std', i: 0 } } });
            if (plan.forceOhne) throw new Error('the opt-out must not bundle anything away');
        },
    },
    {
        name: 'Rule 2: the Garnitur is NOT the default while every bundled part exists in the colour',
        fn: () => {
            // 535: Gessi rail exists, and no Garnitur does — nothing to fall back on.
            const plan = brausegarniturPlan(MATS(), { brand: 'Gessi', code: '535', picks: {} });
            if (plan.forceAuto || plan.forceOhne) throw new Error('a Garnitur was pushed in without a colour gap');
        },
    },
    {
        name: 'Rule 2: a colour gap in the rail makes the Garnitur the default and the parts Ohne',
        fn: () => {
            // 461: Handbrause + Schlauch exist, NO rail, and an Axor set does — the real .475 case.
            const plan = brausegarniturPlan(MATS(), { brand: 'Axor', code: '461', picks: {} });
            if (!plan.forceAuto) throw new Error('the Garnitur must become the standard when the rail is missing');
            if (!plan.forceOhne) throw new Error('the individual parts must go to Ohne');
            // an "Ohne" default only auto-fills when the plan says so
            const off = accGroupChoice(GARNITUR_GROUP, { brand: 'Axor', code: '461', stdIdx: 0 });
            if (!off.isOhne) throw new Error('without the fallback the Garnitur must stay off');
            const on = accGroupChoice(GARNITUR_GROUP, { brand: 'Axor', code: '461', stdIdx: 0, allowOhneAutoMatch: true });
            if (on.isOhne || on.item.artNr !== '6412 985.461.000') throw new Error('the fallback did not select a colour-matched set');
        },
    },
    {
        name: 'Rule 2: no colour-matched Garnitur to fall back on → the parts are never switched off',
        fn: () => {
            // 999 exists nowhere: every family has a gap, but forcing the bundle here
            // would empty three rows and put nothing in their place.
            const plan = brausegarniturPlan(MATS(), { brand: 'Axor', code: '999', picks: {} });
            if (plan.forceOhne || plan.forceAuto) throw new Error('the BOM was emptied with no replacement available');
        },
    },
    {
        name: 'Rule 2: chrome (501) never triggers the fallback',
        fn: () => {
            const plan = brausegarniturPlan(MATS(), { brand: 'Axor', code: '501', picks: {} });
            if (plan.forceAuto || plan.forceOhne) throw new Error('chrome must keep the curated standards');
        },
    },
    // ---- INSTRUCTIONS §2: Regenbrause → Einbaukörper -----------------------------
    {
        name: 'Rule 4: a Regenbrause "ohne Einbaukörper NNNN NNN" resolves the body it names',
        fn: () => {
            const head = POOL.find(p => p.artNr === '6545 919.501.000');
            const body = requiredBodyFor(head);
            if (!body) throw new Error('no body resolved');
            if (body.artNr !== '6418 101.000.000') throw new Error('wrong body: ' + JSON.stringify(body));
        },
    },
    {
        name: 'Rule 4: the art-Nr is read from the DESCRIPTION (the label is truncated before it)',
        fn: () => {
            const v = { artNr: '6545 919.461.000', label: 'Regenbrause Hansgrohe Rainfinity, Brushed bronze', description: 'Regenbrause Hansgrohe Rainfinity, ohne Einbaukörper 6418 101' };
            if (!/ohne Einbaukörper/.test(v.description)) throw new Error('fixture broken');
            const body = requiredBodyFor(v);
            if (!body || body.artNr !== '6418 101.000.000') throw new Error('label-only read would have missed this');
        },
    },
    {
        name: 'Rule 4: an art-Nr split by an ERP <br> is still read (real Dornbracht data)',
        fn: () => {
            const r = requiredBodyFor({ artNr: 'x', label: 'Seitenbrause Dornbracht Water Fan UP',
                description: 'Durchflussleistung 10<br>l/min., ohne Einbaukörper 6438<br>844<br>Geräuschgruppe II' });
            if (!r) throw new Error('the line break swallowed the art-Nr');
            if (r.missingBase !== '6438 844') throw new Error('wrong base: ' + JSON.stringify(r));
        },
    },
    {
        name: 'Rule 4: a head that needs nothing gets nothing injected',
        fn: () => {
            if (requiredBodyFor({ artNr: 'x', label: 'Regenbrause Alterna rainshower, Ø 300 mm', description: 'mit Kugelgelenk' }))
                throw new Error('a body was invented for a complete head');
            if (requiredBodyFor({ artNr: 'ohne_regenbrause', label: 'Ohne Regenbrause' }))
                throw new Error('the opt-out must stay empty');
        },
    },
    {
        name: 'Rule 4: a body the catalogue does not carry is REPORTED, never invented',
        fn: () => {
            const r = requiredBodyFor({ artNr: 'x', label: 'Regenbrause Fantini', description: 'Regenbrause Fantini, ohne Einbaukörper 6171 692' });
            if (!r) throw new Error('the gap must surface, not vanish');
            if (r.artNr) throw new Error('an art-Nr was fabricated for a body that does not exist: ' + r.artNr);
            if (r.missingBase !== '6171 692') throw new Error('wrong base reported: ' + r.missingBase);
        },
    },
    {
        name: 'findArticleByBase looks across every loaded pool, not just the accessory pool',
        fn: () => {
            if (!findArticleByBase('6418101')) throw new Error('body not found');
            if (findArticleByBase('9999999')) throw new Error('a phantom article was returned');
        },
    },
    {
        name: 'Labels carrying quotes/ampersands are escaped into the markup',
        fn: () => {
            const g = { name: 'Anschlussbogen', options: [{ artNr: 'z', label: 'Bogen ½" & <b>rund</b>', menge: 1 }] };
            const r = accGroupChoice(g, { brand: 'Axor', code: '461', stdIdx: 0 });
            if (r.optionsHTML.includes('<b>')) throw new Error('raw markup leaked into an option');
            if (!r.optionsHTML.includes('&amp;')) throw new Error('ampersand not escaped');
        },
    },
];

console.log('\n--------------------------------------------------');
console.log('⚡ Running Accessory Colour-Match Tests...');
console.log('--------------------------------------------------\n');
let passed = 0, failed = 0;
for (const t of tests) {
    try {
        t.fn();
        console.log(`✅ [PASS] ${t.name}`);
        passed++;
    } catch (e) {
        console.error(`❌ [FAIL] ${t.name}\n     ${e.message}`);
        failed++;
    }
}
console.log('\n--------------------------------------------------');
console.log(`Summary: ${passed} passed, ${failed} failed.`);
console.log('--------------------------------------------------');
process.exit(failed > 0 ? 1 : 0);
