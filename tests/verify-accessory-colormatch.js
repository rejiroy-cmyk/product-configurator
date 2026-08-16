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

const { accFamilyOf, accCandidates, accSkuInColour, accGroupChoice, accTierNote, artFinishCode,
        isGarniturSet, garniturCovers, garniturHasRail, isSystemPart, threadOf, packUnits, brausegarniturPlan,
        ACC_BUNDLED_BY_GARNITUR, findArticleByBase, requiredBodyFor, requiredArmFor,
        bodyRefsFor, bodyPresentFor, ensureShowerGroups } =
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
    // The house line, listed LAST on purpose: it must still lead tier 2 (no brand match).
    { artNr: '6541 336.501.000', label: 'Handbrause Alterna saveline 3, Ø 120 mm, 3-jet', productType: 'Handbrause', manufacturer: 'Alterna',
      variants: [{ artNr: '6541 336.461.000', label: 'Handbrause Alterna saveline 3, Brushed bronze' }] },
    // Brausearm: the family a rain head sold "ohne Anschlussbogen" needs. Ceiling first
    // in pool order, so the wall/ceiling preference has something to overrule.
    { artNr: '6545 833.501.000', label: 'Deckenanschluss Hansgrohe Vernis Blend ½", Rosette rund, für Regenbrause Hansgrohe', productType: 'Brausearm', manufacturer: 'Hansgrohe',
      variants: [{ artNr: '6545 833.461.000', label: 'Deckenanschluss Hansgrohe Vernis Blend ½", Rosette rund, Brushed bronze' }] },
    { artNr: '6545 840.501.000', label: 'Brausenwandarm Hansgrohe ½", A 389 mm, für Regenbrause', productType: 'Brausearm', manufacturer: 'Hansgrohe',
      variants: [{ artNr: '6545 840.461.000', label: 'Brausenwandarm Hansgrohe ½", A 389 mm, Brushed bronze' }] },
    // Abstellverschraubung in a colour — the position asks for TWO of them.
    { artNr: '6521 117.535.000', label: 'Abstellverschraubung KWC, ½" x ½", ohne Rosette, Schwarz matt', productType: 'Abstellverschraubung', manufacturer: 'KWC' },
    // …the same valve in the OTHER thread. It fits nothing on a ½" x ½" inlet.
    { artNr: '6521 118.535.000', label: 'Abstellverschraubung KWC, ½" x ¾", ohne Rosette, Schwarz matt', productType: 'Abstellverschraubung', manufacturer: 'KWC' },
    // …and the house line, sold as a PAIR: two pieces on one order line.
    { artNr: '6211 682.535.000', label: 'Abstellverschraubung Alterna niù, ½" x ½" mit flacher Rosette, Set à 2 Stück, Schwarz matt', productType: 'Abstellverschraubung', manufacturer: 'Alterna' },
    // Brausegarnitur — no productType of its own; a SET is a Handbrause-tagged item
    // whose text carries a rail. In 461 a set exists, a bare rail does NOT: the
    // real Axor .475 gap (14 Handbrausen, 5 Schläuche, 0 Gleitstangen) in miniature.
    { artNr: '6412 985.501.000', label: 'Handbrausegarnitur Axor Starck, Gleitstange 900 mm, Handbrause, Brauseschlauch 1600 mm', productType: 'Handbrause', manufacturer: 'Axor',
      variants: [{ artNr: '6412 985.461.000', label: 'Handbrausegarnitur Axor Starck, Gleitstange 900 mm, Handbrause, Brauseschlauch 1600 mm, Brushed bronze' }] },
    // …and a HOSE set: no rail, but hand shower + holder + hose in one art-Nr. 29 of
    // these sat in the Handbrause dropdown, because only the description says so.
    { artNr: '6417 747.501.000', label: 'Handbrausegarnitur Axor One ½", Höhe 929 mm, Wandanschluss, Handbrause Axor', productType: 'Handbrause', manufacturer: 'Axor',
      description: 'Handbrausegarnitur Axor One<br>½", Wandanschluss, Handbrause Axor<br>One, Brausehalter,<br>Brauseschlauch 1600 mm',
      variants: [{ artNr: '6417 747.461.000', label: 'Handbrausegarnitur Axor One ½", Wandanschluss, Brushed bronze',
                   description: 'Handbrausegarnitur Axor One, Brausehalter, Brauseschlauch 1600 mm' }] },
    // Rails are tagged BOTH ways in the real pool — reading only `Gleitstange` missed 96 of 129.
    { artNr: '6531 404.501.000', label: 'Duschengleitstange Alterna fit, 1100 mm', productType: 'Gleitstange', manufacturer: 'Alterna' },
    { artNr: '6241 730.501.000', label: 'Duschgleitstange Gessi Anello, 900 mm', productType: 'Duschgleitstange', manufacturer: 'Gessi',
      variants: [{ artNr: '6241 730.535.000', label: 'Duschgleitstange Gessi Anello, 900 mm, Mattschwarz' }] },
    // A rail that is a COMPONENT of a Duschsystem, not a standalone accessory (CHF 479).
    { artNr: '6545 115.501.000', label: 'Duschgleitstange KWC, A 400 mm, für Duschsystem, wasserführende', productType: 'Gleitstange', manufacturer: 'KWC',
      description: 'Duschengleitstange KWC für Duschsystem wasserführende Gleitstange 1100 mm, Gelenkhalter',
      tech: { Marke: 'KWC', 'Ausprägung': 'für Duschsystem' } },
    // Abstellverschraubungen carry NO productType in the real pool — the family has to
    // match the identity prefix as well, or the row never gets a dropdown.
    { artNr: '6521 103.501.000', label: 'Abstellverschraubung Laufen, ½" x ½" Verchromt', manufacturer: 'Laufen' },
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
                // A Garnitur group is the BUNDLE row, never the tray's Handbrause —
                // even though its name contains the word.
                ['Handbrausegarnitur', 'Brausegarnitur'],
                ['Handbrausengarnitur', 'Brausegarnitur'],
                ['Brausegarnitur', 'Brausegarnitur'],
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
            // It may not CLAIM a match (the part is chrome, the mixer bronze) — it says
            // the colour deviates, because a silent row reads as "matched".
            if (r.tier === 1 || r.tier === 2 || r.tier === 3) throw new Error('a standard pick claimed a colour/brand match: tier ' + r.tier);
            if (accTierNote(r.tier) !== 'Farbe abweichend') throw new Error('a chrome part in a bronze BOM must say so, got: ' + JSON.stringify(accTierNote(r.tier)));
            // A colourless article (000 — every Einbaukörper) is not a mismatch.
            const body = accGroupChoice({ name: 'Einbaukörper', options: [{ artNr: '6418 101.000.000', label: 'Einbaukörper Hansgrohe iBox' }] },
                { brand: 'Axor', code: '461', stdIdx: 0 });
            if (body.tier !== 0) throw new Error('a colourless Einbaukörper was badged as off-colour');
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
            const g1 = accGroupChoice({ name: 'Handbrause', options: [{ artNr: 'x', label: 'Handbrause', menge: 1 }] },
                { brand: 'Axor', code: '461', stdIdx: 0, used });
            used.add(g1.item.artNr);
            const g2 = accGroupChoice({ name: 'Stabhandbrause', options: [{ artNr: 'y', label: 'Stabhandbrause', menge: 1 }] },
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
            // A hose makes it a set too — and only the DESCRIPTION says so. Reading the
            // label alone left 29 of these sitting in the Handbrause dropdown.
            if (!isGarniturSet({ label: 'Handbrausegarnitur Fantini Fit ½", mit integiertem Brausenanschluss, Rosette',
                description: 'Handbrausengarnitur Fantini<br>Fit ½", mit integiertem<br>Brausenanschluss, Rosette<br>rund, Brauseschlauch 1500 mm,<br>Handbrause Fantini Fit' }))
                throw new Error('a hand shower + hose set is still a set — the label alone hid the hose');
            if (isGarniturSet({ label: 'Handbrause Axor Starck, Quickclean', description: 'Handbrause Axor Starck, 1-jet' }))
                throw new Error('a bare hand shower must stay in the Handbrause family');
            // The word alone is not enough: a drain set is not a shower set.
            if (isGarniturSet({ label: 'Duschwannengarnitur Kaldewei KA 90, Ablaufdeckel', description: 'mit Haarfangsieb, Brauseschlauch nicht enthalten' }))
                throw new Error('a Duschwannengarnitur (drain) was read as a Brausegarnitur');
            const g = accCandidates('Brausegarnitur', 'Axor', '461');
            if (!g.some(x => x.artNr === '6412 985.461.000')) throw new Error('the Axor set is not offered as a Garnitur');
            const h = accCandidates('Handbrause', 'Axor', '461');
            if (h.some(x => x.artNr === '6412 985.461.000')) throw new Error('a full set leaked into the Handbrause row');
            if (h.some(x => x.artNr === '6417 747.461.000')) throw new Error('a hose set leaked into the Handbrause row');
            const gg = accCandidates('Brausegarnitur', 'Axor', '461');
            if (!gg.some(x => x.artNr === '6417 747.461.000')) throw new Error('the hose set is not offered in the bundle row either');
        },
    },
    {
        name: 'A curated Brausegarnitur is withheld from a part dropdown (and keeps the other indices)',
        fn: () => {
            const g = { name: 'Handbrause', options: [
                { artNr: 'a', label: 'Handbrause Alterna saveline 3', menge: 1 },
                { artNr: 'b', label: 'Handbrausegarnitur Axor Starck, Gleitstange 900 mm, Brauseschlauch 1600 mm', menge: 1 },
                { artNr: 'c', label: 'Ohne Handbrause', menge: 0 },
            ] };
            const r = accGroupChoice(g, { brand: 'Alterna', code: '501', stdIdx: 0 });
            if (r.optionsHTML.includes('value="o1"')) throw new Error('a full set is still selectable in the Handbrause row');
            if (!r.optionsHTML.includes('value="o0"') || !r.optionsHTML.includes('value="o2"'))
                throw new Error('hiding the set renumbered the surviving options');
            // A stored pick aimed at the hidden set must not order it either.
            const p = accGroupChoice(g, { brand: 'Alterna', code: '501', stdIdx: 1, pick: { k: 'std', i: 1 } });
            if (p.item.artNr === 'b') throw new Error('the withheld set was selected anyway');
            // …and the Garnitur row is where it stays available.
            const bundle = accGroupChoice({ name: 'Brausegarnitur', options: g.options }, { brand: 'Alterna', code: '501', stdIdx: 0 });
            if (!bundle.optionsHTML.includes('value="o1"')) throw new Error('the set vanished from the bundle row too');
        },
    },
    {
        name: 'An ERP "Handbrausegarnitur" group is the bundle row — the tray still gets its own Handbrause',
        fn: () => {
            const tray = { artNr: '6171 306.501.000', label: 'Duschenmischer Fantini Aufputz',
                description: 'Duschenmischer Fantini Aufputz, mit Brauseanschluss' };
            const mats = ensureShowerGroups([{ name: 'Handbrausegarnitur', options: [
                { artNr: '6171 362.501.000', label: 'Handbrausegarnitur Fantini, Duschgleitstange 900 mm, Brauseschlauch', menge: 1 },
                { artNr: '6171 360.501.000', label: 'Handbrausegarnitur Fantini Fit ½", mit integiertem Brausenanschluss, Rosette', menge: 1 },
                { artNr: 'ohne_handbrau', label: 'Ohne Handbrausegarnitur', menge: 0 },
            ] }], tray, { isBath: false, isUP: false });
            const fams = mats.map(m => accFamilyOf(m.name));
            if (fams.filter(f => f === 'Brausegarnitur').length !== 1)
                throw new Error('expected exactly one bundle row, got: ' + JSON.stringify(mats.map(m => m.name)));
            for (const f of ['Handbrause', 'Brauseschlauch'])
                if (fams.indexOf(f) < 0) throw new Error(`the ${f} row was swallowed by the Garnitur group`);
            // The bundle is never pre-selected: the opt-out leads its list.
            const gi = fams.indexOf('Brausegarnitur');
            if (!/^ohne/i.test(mats[gi].options[0].label)) throw new Error('the set is selected on open — the hose gets billed twice');
            if (!accGroupChoice(mats[gi], { brand: 'Fantini', code: '501', stdIdx: 0 }).isOhne)
                throw new Error('the Garnitur row did not open on "Ohne"');
        },
    },
    {
        name: 'Bademischer Standmodell: the article IS the set — no shower groups are added',
        fn: () => {
            // A free-standing bath mixer ships its hose and hand shower inside the
            // art-Nr ("Brauseschlauch 1250 mm, Stabhandbrause TwinStick"), so adding
            // house-standard ones bills them twice. Its Stückliste is the mixer plus
            // its Bodeneinbaukörper — nothing else.
            const tray = {
                artNr: '6171 106.501.000',
                label: 'Bademischer Laufen Kartell-Standmodell, A 203 mm',
                description: 'Bademischer Laufen Kartell-Standmodell, Höhe 949-981 mm, Brauseschlauch 1250 mm, '
                    + 'Stabhandbrause TwinStick, ohne Einbaukörper 6158 106',
            };
            const mats = ensureShowerGroups([
                { name: 'Einbaukörper', options: [{ artNr: '6158 106.000.000', label: 'Einbaukörper Laufen ½", für Bodeneinbau, zu Bademischer', menge: 1 }] },
            ], tray, { isBath: true, isUP: true });
            if (mats.length !== 1 || mats[0].name !== 'Einbaukörper')
                throw new Error('Standmodell gained groups it ships with: ' + JSON.stringify(mats.map(m => m.name)));
        },
    },
    {
        name: 'Standmodell: the "einbau" in its FLOOR body must not read as Unterputz',
        fn: () => {
            // The trap this rule was written for: `_isUPbath` matches /einbau/, and a
            // Standmodell's own text says "Einbaukörper … für Bodeneinbau" — which
            // pinned a wall Anschlussbogen (no "Ohne" option, CHF 83.50) onto 34 of 36.
            const tray = {
                artNr: '6211 304.501.000',
                label: 'Bademischer Alterna più-Standmodell, A 248 mm',
                description: 'Bademischer Alterna più-Standmodell, für Bodeneinbau, ohne Einbaukörper 6252 811',
            };
            const mats = ensureShowerGroups([], tray, { isBath: true, isUP: true });
            if (mats.some(m => accFamilyOf(m.name) === 'Anschlussbogen'))
                throw new Error('a wall Anschlussbogen was added to a floor-standing mixer');
            if (mats.length) throw new Error('unexpected groups: ' + JSON.stringify(mats.map(m => m.name)));
            // …while an ordinary UP Bademischer still gets the full set.
            const up = ensureShowerGroups([], {
                artNr: '6110 146.501.000', label: 'Bademischer-Endmontageset KWC Wamas 2.0',
                description: 'Bademischer-Endmontageset KWC Wamas 2.0, Unterputz, ohne Einbaukörper 6118 105',
            }, { isBath: true, isUP: true });
            for (const f of ['Anschlussbogen', 'Brauseschlauch', 'Handbrause'])
                if (!up.some(m => accFamilyOf(m.name) === f))
                    throw new Error(`the UP Bademischer lost its ${f} row`);
        },
    },
    {
        name: 'A set switches off only the rows it actually contains',
        fn: () => {
            const mats = [
                { name: 'Brauseschlauch', options: [{ artNr: '6542 317.501.000', label: 'Brauseschlauch Alterna flexline, 1600 mm', menge: 1 }] },
                { name: 'Handbrausegarnitur', options: [
                    { artNr: 'ohne_handbrau', label: 'Ohne Handbrausegarnitur', menge: 0 },
                    { artNr: '6436 718.501.000', label: 'Handbrausegarnitur Dornbracht, mit Halter, Brausenschlauch 1250 mm, ½" x',
                      description: 'mit Halter, Brausenschlauch<br>1250 mm, Stabhandbrause' },
                    { artNr: '6412 985.501.000', label: 'Handbrausegarnitur Axor Starck, Gleitstange 900 mm, Handbrause, Brauseschlauch 1600 mm' },
                    { artNr: '6431 725.501.000', label: 'Handbrausengarnitur Dornbracht, 853 mm, Gelenkhalter, Arretierungshebel,',
                      description: 'Gelenkhalter,<br>Arretierungshebel,<br>Brausenschlauch 1750 mm, ohne<br>Handbrause' },
                    { artNr: '6171 360.501.000', label: 'Handbrause Fantini Fit ½", mit integiertem Brausenanschluss, Rosette' },
                ] },
            ];
            const plan = (i) => brausegarniturPlan(mats, { brand: 'Dornbracht', code: '501', picks: { 1: { k: 'std', i } } });
            const hose = plan(1);
            if (!hose.forceOhne) throw new Error('a hose set did not bundle');
            if (hose.bundled.indexOf('Gleitstange') >= 0) throw new Error('a hose set emptied the Gleitstange row it never contained');
            if (hose.bundled.indexOf('Brauseschlauch') < 0) throw new Error('the hose the set contains is still billed separately');
            const rail = plan(2);
            for (const f of ['Brauseschlauch', 'Handbrause', 'Gleitstange'])
                if (rail.bundled.indexOf(f) < 0) throw new Error('a rail set must cover ' + f);
            // The ERP text is read, not assumed: this one says "ohne Handbrause", so the
            // hand-shower row stays. It names no rail either, and with no SAP length to
            // go on nothing is inferred from "853 mm, Gelenkhalter" alone — a guessed
            // rail would EMPTY the Gleitstange row and leave the order without one.
            const noHead = plan(3);
            if (noHead.bundled.indexOf('Handbrause') >= 0) throw new Error('"ohne Handbrause" was ignored — the BOM loses its hand shower');
            if (noHead.bundled.indexOf('Gleitstange') >= 0) throw new Error('a rail was invented from a length in the label');
            // A single article that merely carries the word bundles nothing.
            if (plan(4).forceOhne) throw new Error('a plain hand shower switched other rows off');
        },
    },
    {
        name: 'The bar is read from SAP when the text never names one (Unica\'C, Dornbracht)',
        fn: () => {
            // "Unica'C, 900 mm" IS the bar — the word Gleitstange never appears, and the
            // set was leaving a CHF 479 rail row standing beside itself.
            const unica = { artNr: '6531 875.501.000', label: "Handbrausegarnitur Hansgrohe Unica'C, 900 mm, Handbrause Croma 100 Vario,",
                description: "Brausehalter verstellbar, Seifenschale, Brauseschlauch 1600 mm",
                tech: { Marke: 'Hansgrohe', Serie: "Unica'C", 'Ausprägung': '900 mm', 'Höhe': '958' } };
            if (!garniturHasRail(unica)) throw new Error('SAP states a 900 mm bar and it was ignored');
            if (garniturCovers(unica).indexOf('Gleitstange') < 0) throw new Error('the bar row is billed twice');
            // A hose set's Ausprägung carries the thread spec — that length is the HOSE.
            const hose = { artNr: '6431 729.501.000', label: 'Handbrausegarnitur Dornbracht, mit Halter, Brausenschlauch 1250 mm',
                tech: { 'Ausprägung': '½" x ⅜", 1250 mm' } };
            if (garniturHasRail(hose)) throw new Error('a 1250 mm hose was read as a bar');
            // Below 600 mm nothing is a shower bar (hand-shower dimensions).
            if (garniturHasRail({ artNr: 'x', label: 'Handbrausegarnitur, Brauseschlauch', tech: { 'Ausprägung': '120 mm' } }))
                throw new Error('a hand-shower dimension was read as a bar');
        },
    },
    {
        name: 'A component of another product is not a free-standing accessory',
        fn: () => {
            // KWC 6545 114/115: "Duschgleitstange … für Duschsystem, wasserführende" —
            // CHF 479, and it was auto-filling the rail row of every KWC mixer.
            const sys = { artNr: '6545 115.501.000', label: 'Duschgleitstange KWC, A 400 mm, für Duschsystem, wasserführende',
                description: 'Duschengleitstange KWC für Duschsystem wasserführende Gleitstange 1100 mm', tech: { 'Ausprägung': 'für Duschsystem' } };
            if (!isSystemPart(sys)) throw new Error('a system component was offered as a standalone rail');
            const rail = { artNr: '6531 404.501.000', label: 'Duschengleitstange Alterna fit, 1100 mm', description: 'Gelenkhalter' };
            if (isSystemPart(rail)) throw new Error('an ordinary rail was dropped as a system part');
            // The pool must not offer it in any finish.
            if (accCandidates('Gleitstange', 'KWC', '501').some(c => c.artNr === '6545 115.501.000'))
                throw new Error('the system bar is still a candidate');
        },
    },
    {
        name: 'Abstellverschraubung is a family, even though the pool leaves it untagged',
        fn: () => {
            if (accFamilyOf('Abstellverschraubung,') !== 'Abstellverschraubung') throw new Error('the ERP group name maps to no family');
            const c = accCandidates('Abstellverschraubung', 'KWC', '501');
            if (!c.some(x => x.artNr === '6521 103.501.000')) throw new Error('an untagged Abstellverschraubung stayed invisible');
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
            // The gap is the RAIL, so the fallback must name a set that HAS one — the
            // hose set in the same finish would leave the shower without a rail.
            if (plan.autoArt !== '6412 985.461.000') throw new Error('the fallback picked a set that does not close the gap: ' + plan.autoArt);
            // an "Ohne" default only auto-fills when the plan says so
            const off = accGroupChoice(GARNITUR_GROUP, { brand: 'Axor', code: '461', stdIdx: 0 });
            if (!off.isOhne) throw new Error('without the fallback the Garnitur must stay off');
            const on = accGroupChoice(GARNITUR_GROUP, { brand: 'Axor', code: '461', stdIdx: 0, allowOhneAutoMatch: true, autoArt: plan.autoArt });
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
        name: 'Rule 5: a head sold "ohne Anschlussbogen" gets an arm — of the HEAD\'s brand',
        fn: () => {
            // The mixer is Gessi/Emporio, the head Hansgrohe: the arm follows the head.
            const head = { artNr: '6545 914.461.000', brand: 'Hansgrohe',
                label: 'Regenbrause Hansgrohe Raindance S 240 ½", Ø 240 mm, 1-jet, Powder Rain, ohne Anschlussbogen' };
            const arm = requiredArmFor(head, { brand: 'Hansgrohe', code: '461' });
            if (!arm) throw new Error('the head has no way onto the wall and nothing was added');
            if (arm.artNr !== '6545 833.461.000') throw new Error('wrong arm: ' + JSON.stringify(arm));
            // A head that brings its own arm asks for nothing.
            if (requiredArmFor({ artNr: 'x', label: 'Regenbrause Emporio ½", mit Deckenanschluss, Länge 263 mm' }, { code: '461' }))
                throw new Error('an arm was added to a head that already has one');
            // No arm in the finish, but one in another colour: offer it and SAY the colour
            // deviates — an unmountable head is worse than a badged one.
            const offColour = requiredArmFor(head, { brand: 'Hansgrohe', code: '999' });
            if (!offColour || !offColour.artNr) throw new Error('the head was left unmountable although an arm exists');
            if (offColour.tier !== 3) throw new Error('an off-colour arm must not claim a colour match');
            // Nothing at all → REPORTED, never guessed.
            const none = requiredArmFor({ ...head, brand: 'Gessi' }, { brand: 'Gessi', code: '999' });
            if (!none || none.artNr) throw new Error('an arm was invented where the catalogue has none');
        },
    },
    {
        name: 'Rule 5: wall or ceiling follows what the head states',
        fn: () => {
            const wallHead = { artNr: '6545 914.461.000', brand: 'Hansgrohe',
                label: 'Regenbrause Hansgrohe, für Wandmontage, ohne Anschlussbogen' };
            const arm = requiredArmFor(wallHead, { brand: 'Hansgrohe', code: '461' });
            if (!arm || !/wandarm|wandanschluss/i.test(arm.label || ''))
                throw new Error('a wall-mounted head was given a ceiling connector: ' + JSON.stringify(arm && arm.label));
        },
    },
    {
        name: 'Rule 6: a part sold "zu Einbaukörper NNNN NNN" leaves when that body does',
        fn: () => {
            const set = { artNr: '6252 896.000.000', label: 'Befestigungsset Gessi, zu Einbaukörper 6252 861' };
            if (!bodyPresentFor(set, new Set(['6252 861.000.000']))) throw new Error('the set left while its body is in the BOM');
            if (bodyPresentFor(set, new Set(['6418 101.000.000']))) throw new Error('the set stayed although its body is gone');
            if (!bodyPresentFor({ artNr: 'x', label: 'Brauseschlauch Alterna' }, new Set())) throw new Error('a part that names no body must never be hidden');
            // A shared-prefix list names three bodies: "6252 820 / 826 / 850".
            const multi = { artNr: '6252 901.000.000', label: 'Befestigungsset Gessi, zu Einbaukörper 6252 820 / 826 / 850' };
            if (bodyRefsFor(multi).join() !== '6252820,6252826,6252850') throw new Error('shared-prefix list misread: ' + bodyRefsFor(multi));
            if (!bodyPresentFor(multi, new Set(['6252 850.000.000']))) throw new Error('the third body in the list was not recognised');
        },
    },
    {
        name: 'Colour-matching a position keeps its quantity (two Abstellverschraubungen stay two)',
        fn: () => {
            const g = { name: 'Abstellverschraubung,', options: [{ artNr: '6521 108.501.000', label: 'Abstellverschraubung, ½" x ½", mit flacher Rosette', menge: 2 }] };
            const r = accGroupChoice(g, { brand: 'KWC', code: '535', stdIdx: 0 });
            if (r.item.artNr === '6521 108.501.000') throw new Error('no colour match was attempted');
            if (r.item.menge !== 2) throw new Error('the second stop valve was dropped by the swap: menge ' + r.item.menge);
        },
    },
    {
        name: 'A "Set à 2 Stück" is ONE order line for a position that needs two',
        fn: () => {
            if (packUnits({ label: 'Abstellverschraubung Alterna niù, ½" x ½", Set à 2 Stück' }) !== 2) throw new Error('pack size not read');
            if (packUnits({ label: 'Abstellverschraubung KWC, ½" x ½", ohne Rosette' }) !== 1) throw new Error('a single piece must count as one');
            const g = { name: 'Abstellverschraubung,', options: [{ artNr: '6521 108.501.000', label: 'Abstellverschraubung, ½" x ½", mit flacher Rosette', menge: 2 }] };
            const r = accGroupChoice(g, { brand: 'Alterna', code: '535', stdIdx: 0, pick: { k: 'pool', art: '6211 682.535.000' } });
            if (r.item.artNr !== '6211 682.535.000') throw new Error('the set was not selected');
            if (r.item.menge !== 1) throw new Error('two sets = four valves: menge ' + r.item.menge);
        },
    },
    {
        name: 'A thread that does not fit is never offered (½" x ¾" beside a ½" x ½" inlet)',
        fn: () => {
            if (threadOf({ label: 'Abstellverschraubung KWC, ½" x ¾", ohne Rosette' }) !== '½"x¾"') throw new Error('thread not read');
            const g = { name: 'Abstellverschraubung,', options: [{ artNr: '6521 108.501.000', label: 'Abstellverschraubung, ½" x ½", mit flacher Rosette', menge: 2 }] };
            const r = accGroupChoice(g, { brand: 'KWC', code: '535', stdIdx: 0 });
            if (r.optionsHTML.includes('6521 118.535.000')) throw new Error('a ½" x ¾" valve was offered for a ½" x ½" inlet');
            if (!r.optionsHTML.includes('6521 117.535.000')) throw new Error('the matching thread went missing too');
            // Other families are untouched by the thread rule.
            const h = accGroupChoice({ name: 'Handbrause', options: [{ artNr: 'x', label: 'Handbrause Alterna saveline 3' }] }, { brand: 'Axor', code: '461', stdIdx: 0 });
            if (!h.optionsHTML.includes('optgroup')) throw new Error('the filter leaked into another family');
        },
    },
    {
        name: 'No brand match: the HOUSE line (Alterna) is the standard, not an arbitrary brand',
        fn: () => {
            // Gessi builds no Handbrause in 461; Axor and Alterna both do.
            const c = accCandidates('Handbrause', 'Gessi', '461');
            if (!c.length) throw new Error('no candidates at all');
            if (!/^alterna/i.test(c[0].brand || '')) throw new Error('the house line did not lead: ' + c[0].brand + ' ' + c[0].artNr);
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
