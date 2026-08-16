// ============================================================================
// Mix & Match — the four order rules that decide what SAP receives
//
//   1. SET CODE      a Waschtischkombination is basin AND furniture in one art-Nr,
//                    and SAP books it under G4 instead of G1.
//   2. CWS PANEL     a dispenser that says "ohne Panel <name> <art-Nr>" gets that
//                    panel, in WHITE (finish code 100), directly under itself.
//   3. ACCESSOIRES   Handtuchspender / Papierkorb / Abfallbehälter belong in the
//                    washbasin accessory list; Hygieneabfallbehälter does not.
//   4. TXK103        furniture in the order adds the SAP text position — once,
//                    with no quantity, and never inside the G4 set.
//
// Synthetic data throughout: a green run means the RULE is right, whatever the
// catalogue currently holds.
// ============================================================================
global.alert = () => {};
const stubEl = () => ({ style: {}, innerHTML: '', textContent: '', querySelectorAll: () => [], querySelector: () => null, addEventListener: () => {}, appendChild: () => {} });
global.window = {
    copyTextToClipboard: () => Promise.resolve(),
    copyBOMToClipboard: () => {},
    getComputedStyle: () => ({ display: 'block' }),
};
global.document = {
    createElement: () => stubEl(),
    body: { appendChild: () => {}, removeChild: () => {} },
    getElementById: () => stubEl(),
    querySelector: () => null,
};

const { createMixAndMatchApp } = await import('../modules/factories/createMixAndMatchApp.js');
const { createWashbasinApp } = await import('../modules/factories/createWashbasinApp.js');
const { requiredPanelFor, findPanelSku, PANEL_COLOUR, requiredWallMountFor,
        withoutPartnerRefs, isWaschtischKombination, KOMBI_LABEL } = await import('../modules/factories/_shared.js');

let passed = 0, failed = 0;
const check = (name, cond, extra = '') => {
    if (cond) { console.log(`✅ [PASS] ${name}`); passed++; }
    else { console.log(`❌ [FAIL] ${name}${extra ? ' — ' + extra : ''}`); failed++; }
};

// ── Fixtures ────────────────────────────────────────────────────────────────
const KOMBI = {
    artNr: '2112 261.713.000', manufacturer: 'Laufen',
    label: 'Waschtischkombination Pro S, ohne Innenschublade, Breite 60 cm, Tiefe 50',
    description: 'Waschtischkombination Pro S, ohne Innenschublade, Breite 60 cm, Tiefe 50 cm, Weiss hochglanz',
};
const PLAIN_BASIN = {
    artNr: '2112 736.100.000', manufacturer: 'Laufen',
    label: 'Waschtisch Laufen Pro S, 60 x 46,5 cm, 1 Armaturenloch,',
    description: 'Waschtisch Laufen Pro S, 60 x 46,5 cm, 1 Armaturenloch, mit Überlauf, Weiss',
};
// A basin that merely MENTIONS a Kombination further along is not one — the
// identity rule reads the head of the text, not any occurrence of the word.
const PARTNER_REF = {
    artNr: '2142 900.100.000', manufacturer: 'Duravit',
    label: 'Möbelwaschtisch Duravit Happy D.2, 60 cm,',
    description: 'Möbelwaschtisch Duravit Happy D.2, 60 cm, passend zur Waschtischkombination Happy D.2 Plus',
};
const FAUCET = {
    artNr: '6410 221.501.000', manufacturer: 'Laufen', label: 'Waschtischmischer Laufen Pure, Ausladung 110 mm',
    description: 'Waschtischmischer Laufen Pure, Ausladung 110 mm, mit Ablaufventil',
};
const MOEBEL = {
    artNr: '5211 401.713.000', manufacturer: 'Alterna', label: 'Waschtischunterschrank Alterna Pro S, 60 cm,',
    description: 'Waschtischunterschrank Alterna Pro S, 60 cm, zu 2112 736, Weiss hochglanz',
};
const HOCHSCHRANK = {
    artNr: '5211 900.713.000', manufacturer: 'Alterna', label: 'Hochschrank Alterna Pro S, 40 cm,',
    description: 'Hochschrank Alterna Pro S, 40 cm, Weiss hochglanz', productType: 'Hochschrank',
};
// CWS: dispenser + its white panel + a coloured sibling that must NOT be chosen.
const DISPENSER = {
    artNr: '4611 103.000.000', manufacturer: 'CWS', productType: 'Seifenspender',
    label: 'Seifenspender CWS Paradise Foam, Kunststoff, Slim, 500 ml, Schloss,',
    description: 'Seifenspender CWS Paradise Foam, Kunststoff, Slim, 500 ml, Schloss, Schaumgenerator für Seifenkonzentrate, ohne Panel CF Slim 4611 230',
};
const PANEL_WEISS = {
    artNr: '4611 230.100.000', manufacturer: 'CWS', productType: 'Panel',
    label: 'Panel CWS CF Slim, zu Seifenspender CWS Paradise Cream / Foam 500 ml,',
    description: 'Panel CWS CF Slim, zu Seifenspender CWS Paradise Cream / Foam 500 ml, Kunststoff, Weiss',
};
const PANEL_SCHWARZ = {
    artNr: '4611 230.350.000', manufacturer: 'CWS', productType: 'Panel',
    label: 'Panel CWS CF Slim, zu Seifenspender CWS Paradise Cream / Foam 500 ml, Kunststoff, Schwarz',
};
// Says "ohne Panel" and names nothing; the catalogue pairing is injected as panelBase.
const DISPENSER_NO_REF = {
    artNr: '4611 183.000.000', manufacturer: 'CWS', productType: 'Seifenspender', panelBase: '4611 184',
    label: 'Handlotionspender CWS Paradise Slim, Kunststoff, 500 ml, Schloss, ohne Panel',
    description: 'Handlotionspender CWS Paradise Slim, Kunststoff, 500 ml, Schloss, ohne Panel',
};
const PANEL_184 = {
    artNr: '4611 184.100.000', manufacturer: 'CWS', productType: 'Panel',
    label: 'Panel CWS Paradise, zu Handlotionspender CWS Paradise Slim,',
    description: 'Panel CWS Paradise, zu Handlotionspender CWS Paradise Slim, Kunststoff, Weiss',
};
// Names a panel the catalogue does not carry — must be reported, never guessed.
const DISPENSER_ORPHAN = {
    artNr: '4611 999.000.000', manufacturer: 'CWS', productType: 'Seifenspender',
    label: 'Seifenspender CWS Testline, Kunststoff,',
    description: 'Seifenspender CWS Testline, Kunststoff, ohne Panel Testline 4611 998',
};
// Ships complete — no panel row may appear.
const DISPENSER_COMPLETE = {
    artNr: '4611 171.000.000', manufacturer: 'CWS', productType: 'Seifenspender',
    label: 'Seifenspender CWS Universal, 500 ml, Gehäuse Aluminium silbereloxiert,',
    description: 'Seifenspender CWS Universal, 500 ml, Gehäuse Aluminium silbereloxiert, Schloss',
};

// Bins: the CWS Papierkorb the catalogue pairs with a bracket, its bracket, and a
// Paperbin the catalogue pairs with none (its Zubehör are Deckel and Rahmen).
const PAPIERKORB = {
    artNr: '4611 611.100.000', manufacturer: 'CWS', productType: 'Papierhandtuchspender',
    label: 'Papierkorb CWS, 31 x 21 cm, Höhe 43 cm, Eisengitter plastifiziert,',
    description: 'Papierkorb CWS, 31 x 21 cm, Höhe 43 cm, Eisengitter plastifiziert, zusammenlegbar, freistehend, ohne Befestigungsmaterial, Weiss',
};
const WANDHALTERUNG = {
    artNr: '4611 863.000.000', manufacturer: 'CWS', productType: 'Wandhalterung',
    label: 'Wandhalterung CWS weiss, Weiss', description: 'Wandhalterung CWS weiss, Weiss',
};
const PAPERBIN = {
    artNr: '4611 875.000.000', manufacturer: 'CWS', productType: 'Papierhandtuchspender',
    label: 'Abfallbehälter CWS Stainless Steel Paperbin, Edelstahl, ohne Deckel,',
    description: 'Abfallbehälter CWS Stainless Steel Paperbin, Edelstahl, ohne Deckel, freistehend oder Wandmontage, Inhalt 25 Liter',
};

const ACC_POOL = [DISPENSER, PANEL_WEISS, PANEL_SCHWARZ, DISPENSER_NO_REF, PANEL_184, DISPENSER_ORPHAN, DISPENSER_COMPLETE,
    PAPIERKORB, WANDHALTERUNG, PAPERBIN,
    { artNr: '4611 508.000.000', manufacturer: 'CWS', productType: 'Papierhandtuchspender', label: 'Papierhandtuchspender CWS Paradise Paper Slim S, mit Schloss, Kunststoff,', description: 'Papierhandtuchspender CWS Paradise Paper Slim S, mit Schloss' },
    { artNr: '4611 754.100.000', manufacturer: 'CWS', productType: 'WC-Zubehör', label: 'Hygieneabfallbehälter CWS Paradise Lady Care Box, Kunststoff, Breite 34,5 cm,', description: 'Hygieneabfallbehälter CWS Paradise Lady Care Box' },
    { artNr: '4511 200.501.000', manufacturer: 'Keuco', productType: 'Handtuchhalter', label: 'Handtuchhalter Keuco Edition 11, Breite 450 mm,', description: 'Handtuchhalter Keuco Edition 11, Verchromt' },
    // Its label carries no keyword at all — reachable only through the description.
    { artNr: '4621 451.000.000', manufacturer: 'KWC', productType: 'Seifenspender', label: 'Spenderkombination KWC Rodan RODX 617, Edelstahl seidenmatt, Schloss,', description: 'Spenderkombination KWC Rodan RODX 617 Edelstahl seidenmatt Seifenspender Inhalt 0,8 Liter Papierhandtuchspender Abfallbehälter Inhalt 23 Liter' },
];

const mkApp = () => {
    const app = createMixAndMatchApp('Mix & Match', 'test', 'img.png');
    app.basinTrays = [KOMBI, PLAIN_BASIN, PARTNER_REF];
    app.faucetTrays = [FAUCET];
    global.window.productApps = {
        zubehoer_pool: { trays: ACC_POOL },
        mixandmatch: app,
        waschtisch: { trays: [MOEBEL, HOCHSCHRANK] },
    };
    app.selectedBasin = PLAIN_BASIN;
    app.selectedFaucet = FAUCET;
    return app;
};
const artNrs = (items) => items.filter(i => !i.isSpacer).map(i => i.artNr);

// ── 1. SET CODE ─────────────────────────────────────────────────────────────
const a1 = mkApp();
check('Rule 1: a plain Waschtisch opens the set with G1', a1.setCodeFor(PLAIN_BASIN) === 'G1', a1.setCodeFor(PLAIN_BASIN));
check('Rule 1: a Waschtischkombination opens the set with G4', a1.setCodeFor(KOMBI) === 'G4', a1.setCodeFor(KOMBI));
check('Rule 1: "Möbelkombination" is the same rule',
    a1.setCodeFor({ label: 'Möbelkombination Duravit XSquare, 80 cm' }) === 'G4');
check('Rule 1: partner-reference trap — "passend zur Waschtischkombination" is NOT one',
    a1.setCodeFor(PARTNER_REF) === 'G1', a1.setCodeFor(PARTNER_REF));
check('Rule 1: a truncated label falls back to the description opening',
    a1.setCodeFor({ label: 'Waschtischkombi', description: 'Waschtischkombination Pro S, Breite 80 cm' }) === 'G4');

a1.selectedBasin = KOMBI;
const bomG4 = a1.getBOMPreviewItems();
check('Rule 1: the G4 header is the first line of the set', bomG4[0].artNr === 'G4', JSON.stringify(bomG4[0]));
a1.selectedBasin = PLAIN_BASIN;
check('Rule 1: the G1 header is the first line for a plain basin', a1.getBOMPreviewItems()[0].artNr === 'G1');

// Everything else about the set is unchanged: same lines, only the header differs.
const g1Lines = a1.getBOMPreviewItems().map(i => i.artNr);
a1.selectedBasin = KOMBI;
const g4Lines = a1.getBOMPreviewItems().map(i => i.artNr).filter(a => a !== 'TXK103');
check('Rule 1: nothing but the header changes between G1 and G4',
    g4Lines.length === g1Lines.length && g4Lines.slice(1).join('|') === g1Lines.slice(1).join('|').replace(PLAIN_BASIN.artNr, KOMBI.artNr),
    `${g1Lines.join(',')}  vs  ${g4Lines.join(',')}`);

// ── 2. CWS PANEL ────────────────────────────────────────────────────────────
mkApp();   // seeds window.productApps for the pool index
check('Rule 2: white is finish code 100', PANEL_COLOUR === '100');
check('Rule 2: findPanelSku resolves the base to the WHITE SKU, not a coloured sibling',
    (findPanelSku('4611230') || {}).artNr === '4611 230.100.000');

const p = requiredPanelFor(DISPENSER);
check('Rule 2: the panel art-Nr is read out of the description', p && p.artNr === '4611 230.100.000', JSON.stringify(p));
check('Rule 2: a dispenser that ships complete needs nothing', requiredPanelFor(DISPENSER_COMPLETE) === null);
const pNoRef = requiredPanelFor(DISPENSER_NO_REF);
check('Rule 2: "ohne Panel" with no art-Nr falls back to the catalogue pairing (panelBase)',
    pNoRef && pNoRef.artNr === '4611 184.100.000', JSON.stringify(pNoRef));
const pOrphan = requiredPanelFor(DISPENSER_ORPHAN);
check('Rule 2: a panel the catalogue does not carry is REPORTED, never invented',
    pOrphan && pOrphan.missingPanel === true && !pOrphan.artNr && pOrphan.missingBase === '4611 998', JSON.stringify(pOrphan));
check('Rule 2: an ERP <br> inside the number is still read',
    (requiredPanelFor({ artNr: 'x', label: 'Seifenspender CWS', description: 'Seifenspender CWS Paradise, ohne Panel CF Slim 4611<br>230' }) || {}).artNr === '4611 230.100.000');

const a2 = mkApp();
a2.showAccessoires = true;
a2.selectedAccessoires = [DISPENSER.artNr];
const bomPanel = a2.getBOMPreviewItems();
const iDisp = bomPanel.findIndex(i => i.artNr === DISPENSER.artNr);
check('Rule 2: the panel row sits DIRECTLY under its dispenser',
    iDisp > -1 && bomPanel[iDisp + 1] && bomPanel[iDisp + 1].artNr === '4611 230.100.000',
    artNrs(bomPanel).join(','));
check('Rule 2: the panel is quantity 1', bomPanel[iDisp + 1].qty === 1);

a2.selectedAccessoires = [DISPENSER_ORPHAN.artNr];
const bomOrphan = a2.getBOMPreviewItems();
const warn = bomOrphan.find(i => i.isWarning);
check('Rule 2: an unresolvable panel becomes a visible warning row, not a guessed art-Nr',
    !!warn && /Panel/.test(warn.label) && !bomOrphan.some(i => /^4611 998/.test(i.artNr || '') && !i.isWarning),
    JSON.stringify(warn));

a2.selectedAccessoires = [DISPENSER_COMPLETE.artNr];
check('Rule 2: a complete dispenser adds no panel row',
    a2.getBOMPreviewItems().filter(i => /^4611 (230|184)/.test(i.artNr || '')).length === 0);

// ── 3. ACCESSOIRES CANDIDATES ───────────────────────────────────────────────
// Mirrors the candidate scan in populateAddonPanel: label keyword OR (full text
// with partner references defused), then the identity exclusions.
const a3 = mkApp();
const accKeywords = ['accessoire', 'seifenhalter', 'seifenspender', 'glashalter', 'doppelglashalter',
    'handtuchhalter', 'handtuchring', 'handtuchhaken', 'hakenleiste', 'handtuchspender', 'papierkorb',
    'abfallbehälter', 'abfallbehaelter'];
const reachable = (t) => {
    const lbl = (t.label || '').toLowerCase();
    const full = withoutPartnerRefs((lbl + ' ' + (t.description || '')).toLowerCase());
    if (!accKeywords.some(k => lbl.includes(k)) && !accKeywords.some(k => full.includes(k))) return false;
    if (lbl.includes('spiegelschrank') || lbl.includes('spiegelkabinett')) return false;
    if (/^hygiene/i.test((t.label || '').trim())) return false;
    if (/^panel\b/i.test((t.label || '').trim())) return false;
    return true;
};
const src = a3.populateAddonPanel.toString();
check('Rule 3: the keyword map carries handtuchspender / papierkorb / abfallbehälter',
    ["'handtuchspender'", "'papierkorb'", "'abfallbehälter'"].every(k => src.includes(k)));
check('Rule 3: Hygieneabfallbehälter is excluded in the accessoires branch', /\^hygiene/i.test(src));
check('Rule 3: Papierhandtuchspender is reachable (one keyword covers all spellings)',
    reachable({ label: 'Papierhandtuchspender CWS Paradise Paper Slim S, mit Schloss' }));
check('Rule 3: Stoffhandtuchspender is reachable',
    reachable({ label: 'Stoffhandtuchspender CWS Paradise Dry Slim, Kunststoff' }));
check('Rule 3: Papierkorb is reachable', reachable({ label: 'Papierkorb CWS, 31 x 21 cm' }));
check('Rule 3: Abfallbehälter is reachable', reachable({ label: 'Abfallbehälter CWS Stainless Steel Paperbin' }));
check('Rule 3: Papierabfallbehälter is reachable', reachable({ label: 'Papierabfallbehälter Keuco Plan, 11 l' }));
check('Rule 3: Hygieneabfallbehälter is NOT — it belongs to the WC app',
    !reachable({ label: 'Hygieneabfallbehälter CWS Paradise Lady Care Box, Kunststoff' }));
// Partner-reference trap: a Panel's label names the dispenser it serves.
check('Rule 3: a CWS Panel is NOT a standalone choice, however its label reads',
    !reachable({ label: 'Panel CWS Paper Slim, zu Papierhandtuchspender CWS Paradise Paper' })
    && !reachable({ label: 'Panel CWS CF Slim, zu Seifenspender CWS Paradise Cream / Foam 500 ml,' }));
check('Rule 3: a genuine Spenderkombination is still reachable',
    reachable({ label: 'Spenderkombination Proox One Pure, Papierhandtuch- und Seifenspender,' }));

// ── 3b. FULL-TEXT MATCHING (the label-only gap) ─────────────────────────────
check('Rule 3b: the candidate scan reads the description, not the label alone',
    /productText\(/.test(src) && /withoutPartnerRefs\(/.test(src));
check('Rule 3b: an article whose keyword lives ONLY in the description is reachable',
    reachable({ label: 'Spenderkombination KWC Rodan RODX 617, Edelstahl seidenmatt, Schloss,',
                description: 'Spenderkombination KWC Rodan RODX 617, Seifenspender, Papierhandtuchspender, Abfallbehälter Inhalt 23 Liter' }));
check('Rule 3b: a Handtuchwärmer with 2 integrated Handtuchhalter is reachable',
    reachable({ label: 'Handtuchwärmer Alterna puro, Breite 44 cm, Höhe 118 cm, infrarot, Glas mit',
                description: 'Handtuchwärmer Alterna puro, elektrischer Betrieb, 360 W, 2 Handtuchhalter, Ein- / Ausschalter' }));
// The trap the guard exists for: "zu <product>" says what it PAIRS WITH.
check('Rule 3b: partner reference alone never makes a match',
    !reachable({ artNr: 'x', label: 'Montageplatte Diaqua, Edelstahl,',
                 description: 'Montageplatte Diaqua, Edelstahl, zu Seifenspender und Handtuchhalter der Serie Bali' }));
check('Rule 3b: withoutPartnerRefs blanks only the noun after the marker, not the clause',
    !withoutPartnerRefs('panel cws, zu seifenspender cws paradise').includes('seifenspender')
    && withoutPartnerRefs('zur glasbefestigung mit innenliegender ablage und aussenliegendem handtuchhalter').includes('handtuchhalter'));
check('Rule 3: the accessoires that were already there still are',
    reachable({ label: 'Handtuchhalter Keuco Edition 11, Breite 450 mm' })
    && reachable({ label: 'Seifenspender Keuco Plan, Kristallglas' }));

// ── 3c. WANDHALTERUNG ───────────────────────────────────────────────────────
mkApp();
const wm = requiredWallMountFor(PAPIERKORB);
check('Rule 3c: a CWS Papierkorb gets its Wandhalterung', wm && wm.artNr === '4611 863.000.000', JSON.stringify(wm));
check('Rule 3c: every finish of a paired bin inherits it — the map is keyed by BASE',
    (requiredWallMountFor({ artNr: '4611 611.501.000' }) || {}).artNr === '4611 863.000.000');
check('Rule 3c: a bin the catalogue pairs with no bracket gets none (Paperbin Zubehör are Deckel/Rahmen)',
    requiredWallMountFor(PAPERBIN) === null);
check('Rule 3c: "freistehend oder Wandmontage" in the text alone infers nothing',
    requiredWallMountFor({ artNr: '4611 999.000.000', label: 'Abfallbehälter Testline', description: 'freistehend oder Wandmontage, ohne Befestigungsmaterial' }) === null);
check('Rule 3c: a dispenser is not a bin', requiredWallMountFor(DISPENSER) === null);

const a3c = mkApp();
a3c.showAccessoires = true;
a3c.selectedAccessoires = [PAPIERKORB.artNr];
const bomBin = a3c.getBOMPreviewItems();
const iBin = bomBin.findIndex(i => i.artNr === PAPIERKORB.artNr);
check('Rule 3c: the Wandhalterung row sits DIRECTLY under its bin',
    iBin > -1 && bomBin[iBin + 1] && bomBin[iBin + 1].artNr === '4611 863.000.000',
    artNrs(bomBin).join(','));
a3c.selectedAccessoires = [PAPERBIN.artNr];
check('Rule 3c: an unpaired bin adds no bracket row',
    !a3c.getBOMPreviewItems().some(i => i.artNr === '4611 863.000.000'));

// Two bins share one bracket art-Nr: one line at qty 2, not the same art-Nr twice.
const PAPIERKORB_2 = { ...PAPIERKORB, artNr: '4611 612.100.000', label: 'Papierkorb CWS, 40 x 25 cm, Höhe 62 cm, Eisengitter plastifiziert,' };
ACC_POOL.push(PAPIERKORB_2);
const a3e = mkApp();
a3e.showAccessoires = true;
a3e.selectedAccessoires = [PAPIERKORB.artNr, PAPIERKORB_2.artNr];
const bom2 = a3e.getBOMPreviewItems();
const mounts = bom2.filter(i => i.artNr === '4611 863.000.000');
check('Rule 3c: two bins give ONE bracket line at quantity 2',
    mounts.length === 1 && mounts[0].qty === 2, `${mounts.length} line(s), qty ${mounts[0] && mounts[0].qty}`);

// ── 3d. THE AUSFÜHRUNG PILL, both apps ──────────────────────────────────────
check('Rule 3d: isWaschtischKombination is the one shared rule',
    isWaschtischKombination(KOMBI) && !isWaschtischKombination(PLAIN_BASIN) && !isWaschtischKombination(PARTNER_REF));
const mmTyp = mkApp();
check('Rule 3d: Mix & Match files a combination under its own Ausführung',
    mmTyp.extractBasinTyp(KOMBI) === KOMBI_LABEL, mmTyp.extractBasinTyp(KOMBI));
check('Rule 3d: …and it outranks Doppelwaschtisch (Alterna progetto 2116 125 reads both)',
    mmTyp.extractBasinTyp({ label: 'Waschtischkombination Alterna progetto 46, Breite 122 cm,',
                            description: 'Waschtischkombination Alterna progetto 46, mit 2 Armaturenlöcher, Doppelwaschtisch aus Keramik, 2 Schubladen' }) === KOMBI_LABEL);
check('Rule 3d: a plain basin is untouched', mmTyp.extractBasinTyp(PLAIN_BASIN) === 'Waschtisch');

const wb = createWashbasinApp('Waschtisch', 'test', 'img.png');
check('Rule 3d: the Waschtisch app gets the same pill',
    wb.extractAusfuehrung(KOMBI) === KOMBI_LABEL, wb.extractAusfuehrung(KOMBI));
check('Rule 3d: …and reads the same rule, so the two apps can never drift',
    wb.extractAusfuehrung(PARTNER_REF) !== KOMBI_LABEL && mmTyp.extractBasinTyp(PARTNER_REF) !== KOMBI_LABEL);
check('Rule 3d: the Waschtisch app still classifies everything else as before',
    wb.extractAusfuehrung({ label: 'Doppelwaschtisch Laufen Pro S, 130 cm' }) === 'Doppelwaschtisch'
    && wb.extractAusfuehrung({ label: 'Handwaschbecken Laufen Pro S, 45 cm' }) === 'Handwaschbecken'
    && wb.extractAusfuehrung(PLAIN_BASIN) === 'Waschtisch');

// ── 3e. A ROUND BOWL HAS A WIDTH ────────────────────────────────────────────
// It states a DIAMETER and no Breite, and the Ø form is in both the label and the
// `size` field — 33 round basins fell into "unknown" and out of the Breite filter.
const a3e2 = mkApp();
check('Rule 3e: "Ø 40 cm" is a width of 40',
    a3e2.extractBreite({ label: 'Auflegewaschtisch Catalano Sfera, Ø 40 cm, Höhe 7,5 cm', size: 'Ø 40' }) === '40');
check('Rule 3e: the diameter is read from the description too (label truncates)',
    a3e2.extractBreite({ label: 'Auflegewaschtisch Catalano Sfera,', description: 'Auflegewaschtisch Catalano Sfera, Ø 42 cm, Höhe 16 cm' }) === '42');
check('Rule 3e: a Ø in mm converts to cm', a3e2.extractBreite({ label: 'Becken, Ø 420 mm' }) === '42');
check('Rule 3e: an explicit Breite still wins over anything else',
    a3e2.extractBreite({ label: 'Waschtisch Pro S, Breite 60 cm, Ø 42 cm', size: 'Ø 42' }) === '60');
check('Rule 3e: a rectangular size field is unchanged',
    a3e2.extractBreite({ label: 'Auflegewaschtisch Catalano Zero, 60 x 35 cm', size: '60 x 35' }) === '60');
check('Rule 3e: nothing readable is still "unknown"',
    a3e2.extractBreite({ label: 'Waschtisch ohne Masse', size: '' }) === 'unknown');

// ── 4. TXK103 ───────────────────────────────────────────────────────────────
const a4 = mkApp();
check('Rule 4: no furniture → no text position', !a4.getBOMPreviewItems().some(i => i.artNr === 'TXK103'));

a4.showMoebel = true; a4.selectedMoebel = MOEBEL.artNr;
const bomM = a4.getBOMPreviewItems();
const iM = bomM.findIndex(i => i.artNr === MOEBEL.artNr);
check('Rule 4: TXK103 sits directly under the Möbel line',
    iM > -1 && bomM[iM + 1] && bomM[iM + 1].artNr === 'TXK103', artNrs(bomM).join(','));
check('Rule 4: TXK103 carries no quantity', bomM[iM + 1].qty === null && bomM[iM + 1].isTextCode === true);
check('Rule 4: TXK103 exports as a bare line — no tab, no Menge', a4.sapLine(bomM[iM + 1]) === 'TXK103');
check('Rule 4: an ordinary article still exports art-Nr⇥Menge',
    a4.sapLine({ artNr: MOEBEL.artNr, qty: 1 }) === `${MOEBEL.artNr}\t1`);
check('Rule 4: a warning row is never exported', a4.sapLine({ isWarning: true, artNr: '4611 998', qty: 1 }) === null);

a4.showMoebel = false; a4.selectedMoebel = null;
a4.showSchraenke = true; a4.selectedSchraenke = HOCHSCHRANK.artNr;
const bomS = a4.getBOMPreviewItems();
const iS = bomS.findIndex(i => i.artNr === HOCHSCHRANK.artNr);
check('Rule 4: a Hochschrank is furniture too — TXK103 follows it',
    iS > -1 && bomS[iS + 1] && bomS[iS + 1].artNr === 'TXK103', artNrs(bomS).join(','));

// G4: the text goes past the set, never inside it.
const a4b = mkApp();
a4b.selectedBasin = KOMBI;
const bomK = a4b.getBOMPreviewItems();
const iSpacer = bomK.findIndex(i => i.isSpacer);
const iTxt = bomK.findIndex(i => i.artNr === 'TXK103');
check('Rule 4: a G4 combination gets TXK103 without any Möbel toggle', iTxt > -1);
check('Rule 4: …and it lands AFTER the set is closed, past the last Einbaukosten',
    iTxt > iSpacer && iSpacer > -1, `spacer@${iSpacer} txt@${iTxt}`);
check('Rule 4: the G4 copy block therefore never contains it',
    !bomK.slice(0, iSpacer).some(i => i.artNr === 'TXK103'));

// One note per order, however many furniture pieces are in it.
a4b.showMoebel = true; a4b.selectedMoebel = MOEBEL.artNr;
a4b.showSchraenke = true; a4b.selectedSchraenke = HOCHSCHRANK.artNr;
const bomAll = a4b.getBOMPreviewItems();
check('Rule 4: TXK103 appears exactly ONCE, even with a G4 basin + Möbel + Hochschrank',
    bomAll.filter(i => i.artNr === 'TXK103').length === 1,
    `${bomAll.filter(i => i.artNr === 'TXK103').length}× in ${artNrs(bomAll).join(',')}`);

console.log('\n' + '-'.repeat(50));
console.log(`Summary: ${passed} passed, ${failed} failed.`);
console.log('-'.repeat(50));
process.exit(failed > 0 ? 1 : 0);
