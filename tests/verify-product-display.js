// ============================================================================
// PRODUCT DISPLAY TEXT  (user directive 2026-08-08)
//
// The BOM must show the COMPLETE product text, not the truncated ERP label, and
// look-alike tiles must carry chips that actually tell them apart.
//
// Both live in modules/factories/_productDisplay.js, which is deliberately
// side-effect free so it can be imported here without a DOM.
//
//  1. fullLabel()  — stitches label + description back together. The catalogue
//     data comes in four shapes; each has its own fixture below, all taken from
//     real records in custom-data.json. The cardinal rule: NEVER print the same
//     sentence twice, and NEVER return less than the label already said.
//  2. differentiatingChips() — products sharing a tile title must not share a
//     chip set.
// ============================================================================
import { fullLabel, differentiatingChips, productAttrs } from '../modules/factories/_productDisplay.js';

let passed = 0, failed = 0;
const check = (name, cond, got) => {
    if (cond) { console.log(`✅ [PASS] ${name}`); passed++; }
    else { console.log(`❌ [FAIL] ${name}${got !== undefined ? `\n           got: ${JSON.stringify(got)}` : ''}`); failed++; }
};

// ---------------------------------------------------------------- fullLabel --

// Shape 1: description restates the label's TAIL and continues (6152 847.501.000)
check('fullLabel: stitches at the overlap, no repeated clause',
    fullLabel({
        label: 'Einlochmischer Laufen Citypro, Ablaufventil, Auslauf fest, A 140 mm,',
        description: 'Auslauf fest, A 140 mm, Kaltwasser-Position des Hebels in der Mitte, Schlauchanschlüsse ⅜"'
    }) === 'Einlochmischer Laufen Citypro, Ablaufventil, Auslauf fest, A 140 mm, Kaltwasser-Position des Hebels in der Mitte, Schlauchanschlüsse ⅜"',
    fullLabel({
        label: 'Einlochmischer Laufen Citypro, Ablaufventil, Auslauf fest, A 140 mm,',
        description: 'Auslauf fest, A 140 mm, Kaltwasser-Position des Hebels in der Mitte, Schlauchanschlüsse ⅜"'
    }));

// The label is cut MID-WORD — the healed text must not keep the fragment (6111 256.501.000)
check('fullLabel: heals a mid-word truncation ("Positi" -> "Position")',
    fullLabel({
        label: 'Einlochmischer KWC Domo 6.0, ohne Ablaufventil, Auslauf fest, A 150 mm, Kaltwasser- Positi',
        description: 'Auslauf fest, A 150 mm, Kaltwasser‐Position des Hebels in der Mitte, Geräuschgruppe I'
    }) === 'Einlochmischer KWC Domo 6.0, ohne Ablaufventil, Auslauf fest, A 150 mm, Kaltwasser‐Position des Hebels in der Mitte, Geräuschgruppe I',
    fullLabel({
        label: 'Einlochmischer KWC Domo 6.0, ohne Ablaufventil, Auslauf fest, A 150 mm, Kaltwasser- Positi',
        description: 'Auslauf fest, A 150 mm, Kaltwasser‐Position des Hebels in der Mitte, Geräuschgruppe I'
    }));

// Shape 2: description IS the untruncated label (6110 131.501.000)
check('fullLabel: description that contains the whole label wins',
    fullLabel({
        label: 'Spültischmischer KWC Wamas 2.0, Schwenkauslauf, A 220 mm, Höhe',
        description: 'Spültischmischer KWC Wamas 2.0, Schwenkauslauf, A 220 mm, Höhe Mischdüse 146 mm, Gesamthöhe 208 mm'
    }) === 'Spültischmischer KWC Wamas 2.0, Schwenkauslauf, A 220 mm, Höhe Mischdüse 146 mm, Gesamthöhe 208 mm');

// Shape 3: description only echoes part of the label (2113 219.100.000)
check('fullLabel: description that adds nothing keeps the label',
    fullLabel({
        label: 'Waschtisch Laufen Meda, mit 3 Armaturenlöcher, 80 x 46 cm, mit Überlauf Umweltdeklaration EPD Weiss',
        description: '80 x 46 cm, mit Überlauf'
    }) === 'Waschtisch Laufen Meda, mit 3 Armaturenlöcher, 80 x 46 cm, mit Überlauf Umweltdeklaration EPD Weiss');

// Shape 4: description restates the label with a GAP (6111 814.501.000) — this
// one printed the sentence twice before the gap branch existed.
check('fullLabel: restatement with a gap does NOT duplicate the sentence',
    fullLabel({
        label: 'Bademischer- Endmontageset KWC Bevo, mit Sicherheitseinrichtung, Umstellautomatik, ohne Einbaukörper 6118 116 / 117 Energieeffizienzklasse C Verchromt',
        description: 'Umstellautomatik, ohne Einbaukörper Energieeffizienzklasse C'
    }) === 'Bademischer- Endmontageset KWC Bevo, mit Sicherheitseinrichtung, Umstellautomatik, ohne Einbaukörper 6118 116 / 117 Energieeffizienzklasse C Verchromt');

// Same sentence from the start, diverging only at the end (6152 854.501.000)
check('fullLabel: common-prefix restatement appends only the new tail',
    fullLabel({
        label: 'Wandmischer-Set Laufen Citypro 125 mm, AD 153 mm, ½" x ½", Verchromt',
        description: 'Wandmischer- Set Laufen<br>Citypro 125 mm, AD 153 mm, ½"<br>x ½"<br>Umweltdeklaration EPD'
    }) === 'Wandmischer-Set Laufen Citypro 125 mm, AD 153 mm, ½" x ½", Verchromt, Umweltdeklaration EPD',
    fullLabel({
        label: 'Wandmischer-Set Laufen Citypro 125 mm, AD 153 mm, ½" x ½", Verchromt',
        description: 'Wandmischer- Set Laufen<br>Citypro 125 mm, AD 153 mm, ½"<br>x ½"<br>Umweltdeklaration EPD'
    }));

// Genuinely unrelated description → appended
check('fullLabel: unrelated description is appended',
    fullLabel({
        label: 'Regulierventil Laufen ½" 45 mm',
        description: 'ohne Klemmverschraubung Geräuschgruppe II Verchromt'
    }) === 'Regulierventil Laufen ½" 45 mm, ohne Klemmverschraubung Geräuschgruppe II Verchromt');

check('fullLabel: strips <br> markup', !/<br/i.test(fullLabel({ label: 'A', description: 'x<br>y<br />z' })));
check('fullLabel: no description -> label unchanged', fullLabel({ label: 'Sifon Geberit 40mm Chrom' }) === 'Sifon Geberit 40mm Chrom');
check('fullLabel: never returns less than the label', (() => {
    const p = { label: 'Waschtisch Pro S, 60 x 46,5 cm, Armaturenloch, mit Überlauf, Weiss', description: '60 x 46,5 cm' };
    return fullLabel(p).length >= p.label.length;
})());
check('fullLabel: tolerates null / string input', fullLabel(null) === '' && fullLabel('Freitext') === 'Freitext');

// The SAP export scrapes the first <strong> in a BOM row for the quantity —
// display text must never smuggle markup into that cell.
check('fullLabel: emits no HTML tags', !/<[a-z/]/i.test(fullLabel({
    label: 'Test <b>bold</b> Artikel', description: 'mit <i>Kursiv</i> Beschrieb'
})));

// ----------------------------------------------------- differentiatingChips --

// The three Citypros from the 2026-08-08 report: identical labels, differing
// only in the description tail.
const citypro = [
    { artNr: '6152 845.501.000', label: 'Einlochmischer Laufen Citypro, Ablaufventil, Auslauf fest, A 140 mm,', description: 'Auslauf fest, A 140 mm, Schlauchanschlüsse ⅜" Energieeffizienzklasse B Geräuschgruppe I' },
    { artNr: '6152 847.501.000', label: 'Einlochmischer Laufen Citypro, Ablaufventil, Auslauf fest, A 140 mm,', description: 'Auslauf fest, A 140 mm, Kaltwasser‐Position des Hebels in der Mitte, Schlauchanschlüsse ⅜" Energieeffizienzklasse A Geräuschgruppe I' },
    { artNr: '6152 849.501.000', label: 'Einlochmischer Laufen Citypro, Auslauf fest, A 140 mm, mit Ablaufventilhebel,' },
];
const sets = citypro.map(p => differentiatingChips(p, citypro, { always: ['Ausladung', 'Ablaufventil'] }).join('|'));
check('chips: three look-alike Citypros get three DIFFERENT chip sets',
    new Set(sets).size === 3, sets);
check('chips: the "always" families still show on every tile',
    citypro.every((p, i) => sets[i].includes('A 140 mm')), sets);

// A group whose difference no curated rule covers must still be separated by the
// generic auto-diff backstop.
const exotic = [
    { artNr: '1', label: 'Spezialarmatur Foo, Ausführung Alpha' },
    { artNr: '2', label: 'Spezialarmatur Foo, Ausführung Beta' },
];
const exoticSets = exotic.map(p => differentiatingChips(p, exotic).join('|'));
check('chips: auto-diff backstop separates products no rule covers',
    exoticSets[0] !== exoticSets[1] && exoticSets.every(Boolean), exoticSets);

// The energy label is not a buying criterion (user directive 2026-08-08). It must
// stay off the tiles via BOTH paths — dropping only the curated rule would let the
// auto-diff backstop put it straight back as raw ERP text.
check('chips: Energieeffizienzklasse is never chipped (curated path)',
    !differentiatingChips(citypro[0], citypro, { always: ['Ausladung'] }).some(c => /energie/i.test(c)));
const energyTwins = [
    { artNr: '1', label: 'Einlochmischer Foo bar, A 100 mm, Energieeffizienzklasse A' },
    { artNr: '1', label: 'Einlochmischer Foo bar, A 100 mm' },
];
check('chips: Energieeffizienzklasse is never chipped (auto-diff path)',
    !energyTwins.flatMap(p => differentiatingChips(p, energyTwins)).some(c => /energie/i.test(c)),
    energyTwins.map(p => differentiatingChips(p, energyTwins)));

const epdTwins = [
    { artNr: '1', label: 'Einlochmischer Foo bar, A 100 mm, Umweltdeklaration EPD' },
    { artNr: '2', label: 'Einlochmischer Foo bar, A 100 mm' },
];
check('chips: Umweltdeklaration EPD is never chipped (both paths)',
    !epdTwins.flatMap(p => differentiatingChips(p, epdTwins)).some(c => /EPD|Umweltdekl/i.test(c)),
    epdTwins.map(p => differentiatingChips(p, epdTwins)));

const noiseTwins = [
    { artNr: '1', label: 'Einlochmischer Foo bar, A 100 mm, Geräuschgruppe I' },
    { artNr: '1', label: 'Einlochmischer Foo bar, A 100 mm' },
];
check('chips: Geräuschgruppe is never chipped (both paths)',
    !noiseTwins.flatMap(p => differentiatingChips(p, noiseTwins)).some(c => /geräusch/i.test(c))
    && !differentiatingChips(citypro[0], citypro, { always: ['Ausladung'] }).some(c => /geräusch/i.test(c)),
    noiseTwins.map(p => differentiatingChips(p, noiseTwins)));

// STRUCTURAL RULE: a chip slot goes to a family that CONTRASTS with a neighbour,
// never to one that merely fills a gap in a neighbour's catalogue data. Before this,
// p1 got 'Anschluss ⅜"' purely because p3 had no Schlauchanschlüsse text at all.
const passenger = [
    { artNr: '1', label: 'Einlochmischer Foo, A 100 mm, Ablaufventil, Schlauchanschlüsse ⅜"' },
    { artNr: '2', label: 'Einlochmischer Foo, A 100 mm, ohne Ablaufventil, Schlauchanschlüsse ⅜"' },
    { artNr: '3', label: 'Einlochmischer Foo, A 100 mm, Ablaufventilhebel' },
];
check('chips: a presence-only family never takes a slot while tiles differ anyway',
    !differentiatingChips(passenger[0], passenger).some(c => /Anschluss/.test(c)),
    differentiatingChips(passenger[0], passenger));
check('chips: a CONTRASTING family in the same position is still shown',
    differentiatingChips(
        { artNr: '1', label: 'Einlochmischer Foo, A 100 mm, Schlauchanschlüsse ⅜"' },
        [{ artNr: '1', label: 'Einlochmischer Foo, A 100 mm, Schlauchanschlüsse ⅜"' },
         { artNr: '2', label: 'Einlochmischer Foo, A 100 mm, Schlauchanschlüsse ½"' }]
    ).some(c => /Anschluss/.test(c)));
// ...but a presence-only family IS spent when it is the only thing left to separate
// two otherwise identical tiles.
const lastResort = [
    { artNr: '1', label: 'Einlochmischer Bar, A 100 mm, Niederdruckspeicher' },
    { artNr: '2', label: 'Einlochmischer Bar, A 100 mm' },
];
check('chips: a presence-only family IS used when nothing else separates the tiles',
    differentiatingChips(lastResort[0], lastResort).some(c => /Niederdruck/.test(c)),
    differentiatingChips(lastResort[0], lastResort));

// Abnehmbar / Montage were retired as curated families (they never won a slot in
// 1464 products). Unlike the energy label they are NOT suppressed, so the auto-diff
// backstop may still surface the raw phrase when it is genuinely the only
// difference — but they must no longer claim a slot of their own.
const retired = { artNr: '1', label: 'Spültischmischer Foo, A 100 mm, Armatur abnehmbar, Standmodell' };
check('chips: retired families no longer exist as curated attributes',
    !['Abnehmbar', 'Montage'].some(f => productAttrs(retired).has(f)),
    [...productAttrs(retired).keys()]);
check('chips: a retired family takes no slot when the tiles differ anyway',
    !differentiatingChips(retired, [retired, { artNr: '2', label: 'Spültischmischer Foo, A 100 mm, ohne Ablaufventil' }])
        .some(c => /abnehmbar|Standmodell/i.test(c)));

// Hansgrohe Tecturis S 548/549/551: 549 carries BOTH EcoSmart+ and CoolStart, 548
// only the first, 551 only the second. No single phrase separates 549 from both, so
// the backstop has to cover the look-alike set, not pick one "best" phrase.
const tecturis = [
    { artNr: '6417 548.501.000', label: 'Einlochmischer Hansgrohe Tecturis S, ohne Ablaufventil, EcoSmart+, Auslauf fest, A 116 mm' },
    { artNr: '6417 549.501.000', label: 'Einlochmischer Hansgrohe Tecturis S, ohne Ablaufventil, EcoSmart+, CoolStart, Auslauf fest, A 116 mm' },
    { artNr: '6417 551.501.000', label: 'Einlochmischer Hansgrohe Tecturis S, ohne Ablaufventil, CoolStart, Auslauf fest, A 116 mm' },
];
const tSets = tecturis.map(p => differentiatingChips(p, tecturis, { always: ['Ausladung', 'Ablaufventil'] }).join('|'));
check('chips: set-cover backstop separates a 3-way overlap', new Set(tSets).size === 3, tSets);
check('chips: the covering chip names BOTH features of the product that has both',
    /EcoSmart/.test(tSets[1]) && /CoolStart/.test(tSets[1]), tSets[1]);

// A bare number is a fragment of a measurement whose unit the look-alikes share.
const numeric = [
    { artNr: '1', label: 'Waschtisch Foo, Höhe 11,5 cm, mit Überlauf' },
    { artNr: '2', label: 'Waschtisch Foo, Höhe 14 cm, mit Überlauf' },
];
check('chips: a bare number never becomes a chip',
    !differentiatingChips(numeric[0], numeric).some(c => /^[\d\s.,]+$/.test(c)),
    differentiatingChips(numeric[0], numeric));

check('chips: a lone product still reports its "always" families',
    differentiatingChips(citypro[0], [citypro[0]], { always: ['Ausladung'] }).includes('A 140 mm'));
check('chips: excluded families are never emitted',
    !differentiatingChips(
        { artNr: '9', label: 'Waschtisch X, 80 x 46 cm, mit Überlauf' },
        [{ artNr: '9', label: 'Waschtisch X, 80 x 46 cm, mit Überlauf' }, { artNr: '8', label: 'Waschtisch X, 60 x 46 cm, ohne Überlauf' }],
        { exclude: ['Masse'] }
    ).some(c => c.includes('x 46 cm')));

// COLOUR RULE: the finish comes from the art-Nr triplet, never from label text.
check('chips: Farbe derives from the art-Nr finish code',
    differentiatingChips(
        { artNr: '6152 845.501.000', label: 'Einlochmischer Laufen Citypro' },
        [{ artNr: '6152 845.501.000', label: 'Einlochmischer Laufen Citypro' },
         { artNr: '6152 845.020.000', label: 'Einlochmischer Laufen Citypro' }]
    ).some(c => /verchromt/i.test(c)));

console.log('\n--------------------------------------------------');
console.log(`Summary: ${passed} passed, ${failed} failed.`);
console.log('--------------------------------------------------');
if (failed > 0) process.exit(1);
