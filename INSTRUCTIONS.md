# RULES — READ BEFORE EVERY CHANGE

This document outlines the strict business logic rules and safeguards that must be respected before making any changes to the configurator.

## 0. Architecture & Safeguards
- **NEVER let rules leak across products:** The `createRelationalApp` function in `factories.js` handles multiple products. You MUST branch logic by checking `this.title` (e.g., `if (this.title === 'Duschenwanne')`).
- **NEVER edit WC logic in relational block:** All WC logic must be edited inside the separate `createWCApp` block, NOT inside `createRelationalApp`.
- **ALWAYS ask for category clarification:** Always specify which category (Duschenwanne, Badewanne, WC) your logic applies to. If the user does not specify the category in their request, you MUST ask for clarification before making any code changes.

## 1. Business Logic and Prioritization
- **NEVER alter established BOM sorting orders or component priorities** unless explicitly requested by the user. Adhere strictly to comment-defined sequences.
- **NEVER refactor or modify unrelated code/items** when asked to fix a specific BOM or category issue. Scope edits strictly to the requested item.
- **ALWAYS read the FULL product text — label AND description AND specs (GLOBAL RULE, enforced):** ERP systems often enforce character limits that prematurely truncate the product `label`. ANY logic that classifies, matches, or filters a product (type, situation, series, dimensions, config keywords, service selection) MUST read `label` + `description` + `specs` values — never the label alone. Use `productText()` from `modules/factories/_shared.js`. The only permitted exception is a product-IDENTITY prefix check (label literally starting with e.g. "Seitenwand"/"Montagepauschale"), which must carry a `// label-prefix by design` comment. Beware the partner-reference trap: descriptions state what a product PAIRS WITH ("zur Kombination mit Gleittüre") — guard those before keyword-classifying. **Enforced by `tests/verify-fulltext-rule.js`** (static source guard + fixtures, part of `npm test`/`npm run build`) — add new classification functions to its `GUARDED` list.

## 2. Category-Specific Rules & BOM Orders

### Duschenrinne (Shower Channels)
- **BOM Sorting Order:**
  1. Rinne (Main Item / Hauptartikel)
  2. Ablaufabdeckung / Abdeckung / Rost
  3. Ablaufgehäuse
  4. Schallschutz
  5. Other accessories (e.g. Zargen-Wannendichtband, Höhenverstellung)

### Duschenwanne (Shower Trays)
- **BOM Sorting Order:**
  1. Wanne
  2. Ablaufdeckel (if not included with Ablaufgarnitur)
  3. Ablaufgarnitur
  4. Zargen-Wannendichtband
- **Dynamics by Montageart (Installation Type):**
  - **Wannenträger:**
    1. Wannenträger (styrofoam carrier)
    2. Montageschaum (quantity 1; quantity 2 for trays bigger than 120 cm on either side)
    3. Schallschutz set für Duschenwanne
  - **Montagerahmen / Füsse:**
    1. Montagerahmen
    2. Fussset (ONLY for Schmidlin Omnia frames)
    3. Mittenabstützsystem (MAS) (ONLY for Kaldewei trays > 90 cm on either side)
  - **Stelzfüsse:**
    - ONLY applies to Calima shower trays.
    1. Stelzfüsse (Calima exclusive, set of 4, amount depends on size)

### Badewanne (Bathtubs)
- **BOM Sorting Order:**
  1. Badewanne
  2. Ab- und Überlaufset (if not included with Ablaufgarnitur)
  3. Ablaufgarnitur / Überlaufgarnitur
  4. Zargen-Wannendichtband
- **Dynamics by Montageart (Installation Type):**
  - **Wannenträger:**
    1. Wannenträger (styrofoam carrier)
    2. Montageschaum (ALWAYS quantity 2)
    3. Schallschutz set für Badewannen
  - **Montagerahmen / Füsse:**
    1. Badewannen Montageset or Füsse or Wannenanker or Infinityträger

### Duschenmischer (Shower Mixers) — Aufputz
- **Aufputz detection:** identified in the description by an outer-diameter marker, e.g. `AD 153 mm` or `AD 138 - 162 mm`. These fall under the **Aufputz** filter pill. (Logic lives in `extractMontage`, regex `/\bad\s+\d/`; Unterputz markers are still checked first.)
- **BOM Sorting Order:**
  1. Mischer (Main Item / Hauptartikel)
  2. Abstellverschraubung — `6521 108.501.000`, **quantity 2** (ONLY if not already included — see rule below)
  3. Brauseschlauch — **standard = 1600 mm**; remaining lengths/variants as dropdown options
  4. Handbrause — **brand-matched** to the mixer if the option pool contains one; otherwise the existing first option
  5. Duschengleitstange — **standard = Alterna 1100 mm** (`6531 404.501.000`); 610 mm (`6531 403.501.000`) as a dropdown option
- **Abstellverschraubung rule (DYNAMIC — never hard-code per product; re-evaluated from the label on every import):**
  - **ADD** `2× 6521 108.501.000` **only when** the description explicitly says **`ohne Abstellverschraubungen`** (e.g. `ohne Abstellverschraubungen ½" x ½"`). Match: `/ohne\s+abstellverschraubung/i`.
  - **OTHERWISE leave it out** — the connections are already included. This covers Hansgrohe's **`mit S-Anschlüssen`** (S-Anschlüsse = the Abstellverschraubungen, included), as well as labels that list `Abstellverschraubungen` without `ohne`.
- **Standard selection** = the first option in each group (`options[0]`); the rules above reorder each group so the correct standard sits first. The Alterna Gleitstange stays the standard for the whole configurator until other Gleitstange products are introduced.
- **Montageart scope:** the Abstellverschraubung rule and this Aufputz BOM-order sort apply to **Aufputz** mixers only (gated via `isAufputz` in `transformDuschenmischerTrays`). The shared option-default rules (1600 mm Brauseschlauch, brand-matched Handbrause) apply to both montage types; Unterputz has its own order/extra rules below.
- **Scope:** Duschenmischer only (`createDuschenmischerApp.js`, `transformDuschenmischerTrays`). The Gleitstange feature also exists in Bademischer, but Bademischer is intentionally **not** covered by these rules yet.

### Duschenmischer (Shower Mixers) — Unterputz
- **Unterputz detection:** identified in the description by `ohne Grundkörper…`, `UP`, `Endmontageset` (also `unterputz`, `einbau`, `grundkörper`). These fall under the **Unterputz** filter pill. Same `extractMontage` logic; Unterputz markers are checked **before** the Aufputz AD-marker.
- **No Abstellverschraubung** — they sit on the Grundkörper, so it is never added for Unterputz.
- **Grundkörper ALWAYS needs mounting brackets** (like the UP-Bademischer): the Montageschiene/Montageset is mandatory. Integrated-box systems ship without one in the scraped data — the transform adds the brand's set when none is present: **KWC Homebox → `6118 149.000.000`** ("Montageschiene KWC, zu Einbaukörper KWC Homebox", URP 85.00 CHF), **Hansgrohe iBox → `6418 111.000.000`** ("Montageset Hansgrohe iBox Universal, 2 Montageschienen 550 mm"). Both menge 1, with verified profishop labels/images.
- **BOM Sorting Order:**
  1. Mischer (`Duschenmischer-Endmontageset …` — Main Item)
  2. Grundkörper or Einbaukörper
  3. Montageschiene or Montageset
  4. Anschlussbogen — **standard = ohne Brausehalter** (`für Handbrause`); `mit integriertem Brausehalter` as a dropdown option (same brand & series if possible)
  5. Brauseschlauch — **standard = 1600 mm**; the rest in the dropdown
  6. Handbrause — **same brand and series** if the pool has one (series is a best-effort tiebreak over brand)
  7. Duschengleitstange — **standard = Alterna 1100 mm** (`6531 404`); 610 mm (`6531 403`) as option
  8. Regenbrause *(future work — deferred)*
     - 8.1 Grundkörper for the Regenbrause (if required)
     - 8.2 Brausearm (if not already included with the Regenbrause)
- **Note:** the current scraped data already complies with order items 2–7; the rules above are encoded in the transform so future imports stay compliant.

### Bademischer (Bath Mixers) — Standmodell

A **free-standing** bath mixer is sold as a complete set: its own short text lists the
parts ("… Höhe 949-981 mm, **Brauseschlauch 1250 mm, Stabhandbrause TwinStick**"). So it
takes **no house-standard accessories at all**.

- **BOM Sorting Order — the whole list:**
  1. Bademischer (Main Item / Hauptartikel)
  2. Einbaukörper or Grundkörper — the **Bodeneinbaukörper**, mandatory
  3. Montageschiene or Montageset — **only if required** (never auto-added; the floor
     body is set in concrete and the brand bracket map is for wall boxes)
- **NO** Anschlussbogen, Brauseschlauch, Handbrause, Brausehalter or Brausegarnitur —
  they are inside the article's art-Nr. Adding them bills the hose and hand shower twice.
- **Detection:** `standmodell` or `freistehend` in the full text, bath context only
  (`needsShowerAccessories` in `_shared.js`, tested BEFORE the Unterputz branch).
- ⚠ **The trap:** a Standmodell's own text says "Einbaukörper … für **Bodeneinbau**", and
  `_isUPbath` matches `/einbau/` — so it classified as Unterputz and pinned the UP-only
  Anschlussbogen (`6544 100.501.000`, CHF 83.50) onto 34 of 36 trays, with **no "Ohne"
  option in `SHOWER_STD.anschlussbogen`** to remove it. Test the Standmodell first.
- **The body may exist only as a text reference.** Five Standmodelle carry no Einbaukörper
  group and merely name the art-Nr; `createBademischerApp#updateBOM` resolves it via
  `requiredBodyFor` and injects the row under the main item, skipping the injection when a
  mounting group already offers that base (or it would be billed twice).
- **One article, one row.** 14 Standmodelle carried a "Zubehör (Automatisch Erkannt)" group
  holding exactly the Einbaukörper their Einbaukörper group already offered — two rows,
  two charges (Alterna `6252 811`, Hansgrohe `6412 905`, KWC `6118 128`). The transform
  drops a group whose art-Nr SET matches an earlier one's.
- Covered by `tests/verify-accessory-colormatch.js`.

### Accessory Combinations (Brausegarnitur & Regenbrause)

Applies to **both Duschenmischer and Bademischer** — every mixer configurator, not just the Aufputz/Unterputz cases above:

- **Brausegarnitur Bundle Rule**: If a user selects a `Brausegarnitur`, the individual `Brauseschlauch`, `Handbrause`, and `Duschgleitstange` MUST automatically switch to `ohne` — those three items are bundled together inside the Brausegarnitur.
- **Brausegarnitur Fallback (Colour Matching)**: A `Brausegarnitur` is never offered as the standard/default selection *unless* one of the individual accessories (e.g. `Duschgleitstange`) is not available in the selected colour (example: mixer `6415 120.475.000` in colour `.475` has no Duschgleitstange). In that fallback case, the `Brausegarnitur` becomes the standard/default and the individual accessories default to `ohne`.
- **Regenbrause Einbaukörper Injection**: If a `Regenbrause`'s description contains `ohne Einbaukörper` (or a similar required-missing-element phrase), the engine must automatically look up and inject the proper `Einbau-` or `Grundkörper` directly below it in the BOM.

### Installationselement (Vorwandelement) — Wandklosett / Standklosett / Waschtisch

Source of truth for the full ruleset: **`INSTALLATION_ELEMENT_RULES.md`** (filled 2026-08-17,
follow-ups 2026-08-18). Only **Geberit Duofix** is offered — TECE Profil, Kombifix and Laufen
Ineo are hidden by decision (Ineo is ~0.5% of Duofix volume), and GIS is out of scope. The
element sits in the SAME Stückliste as the ceramic.

- **House system = Duofix.** Sigma is the default cistern (front actuation); **Omega only on
  request** (it is the one that also actuates from above, for a half-height wall).
- **Element choice — Wandklosett:** standard `3612 348` · barrierefrei `3612 329` ·
  Kinder `3612 344` · halbhohe Wand `3612 301` (Omega 82 cm) · Hygienespülung `3612 304`.
  A Dusch-WC/AquaClean takes the **standard** `3612 348` — it already carries the
  Leerrohr für Wasseranschluss Dusch-Klosett.
- **Element choice — Waschtisch:** standard `3612 287` · Wandarmatur `3612 289` ·
  Einbausifon `3612 288` · schmale Ausführung `3612 104`. **Barrierefrei also takes
  `3612 288`** — the catalogue's only barrier-free Waschtischelement is Laufen Ineo
  `3100 117`, and Ineo is not used. The element does **not** follow the basin width.
- **The element is ALWAYS in the BOM by default** (Duofix Sigma). The user opts out with a
  toggle, which replaces the element line with the text position `bau115`.
- **`bau115` is a TEXT POSITION, not an article** — same contract as `TXK103` (see Mix & Match):
  it carries **no Menge**, exports as a bare line with no tab, and shows "—" in the BOM.
  It must never be given a quantity.
- **Betätigungsplatte — TWO-STAGE selection.** The first dropdown picks the **family**
  (Sigma01 · Sigma10 · Sigma20 · Sigma40 · Sigma50 · Sigma70 · Sigma80 / Omega20 · Omega60);
  a second dropdown then lists that family's plates. **Every option's description must name
  the colour**, resolved from the art-Nr finish triplet via `COLOR_NAMES` — the COLOUR RULE,
  never from label text. `Sigma*` families for a Sigma element, `Omega*` for an Omega one.
  Default finish **Weiss** (`100`).
  - **Sigma60 is not offered.** No Sigma60 plate exists in the catalogue anyway, so the
    "nicht geeignet für Sigma60" note on `3612 330` / `3612 340` is moot.
  - **Sigma80 stays.** Its exclusions still hold: `3612 343` and `3612 344` not with Sigma80.
  - Kappa20/21/50 and Highline plates belong to cisterns we do not offer → never listed.
- **Schallschutz belongs to the Wandklosett itself, not to the element.** It stays injected by
  default; the element rule neither adds nor removes it.
- **Bauschutz `3612 362` is a REPLACEMENT part for the Duofix element** → never auto-added.
  **Brandschutzset is never automatic** — manual add only.
- **Rückwandbefestigungssatz `3612 500`** is mandatory alongside the element — **and ONLY
  with it.** Its own label says "für alle Elemente": it fastens the element to the wall, so
  with no element there is nothing to fasten. Same `dependsOn` + empty-`optionArtNrs`
  suppression as the Ablaufbogen below.
- **Ablaufbogen `3612 374`** (Geberit-Silent, D. 90 mm, CHF 56) is mandatory alongside the
  element — **and ONLY with it.** It `dependsOn` the Installationselement group: pick a real
  element and the Ablaufbogen is there; opt out via `bau115` and it disappears, because it
  has nothing left to connect. Suppression is an empty `optionArtNrs`, the same mechanism
  the Abstellverschraubung uses in `createRelationalApp`. This is the `Ablaufbogen` group
  only; the `Ablaufanschluss` groups on 6 Standklosett trays are a different part
  (`3241 130` / `3241 120` / `3242 110`) and are never touched.
- **Endmontageset `3612 235` ONLY when the Einbausifon element `3612 288` is chosen** — it
  finishes that element's concealed siphon and bundles the Abdeckplatte. Offer its three
  finishes: `501` Verchromt · `100` Weiss · `523` Edelstahl matt.
- **Anschlussbogen `3612 272`** is mandatory on Waschtisch.
- **A Duofix element suppresses the Dübel-/Schraubenset** — that fixing is only required when
  no Duofix element is in the BOM.
- Brand priority: **always the house system**, regardless of the ceramic's brand.
- **These rules OVERRULE the earlier hard-coded auto-injection.** `createWCApp.js` and
  `createRelationalApp.js` each carry a `step6/step7/step8` block that injects `3612 348` +
  `3612 500` + `3612 374` (Ablaufbogen Geberit-Silent) as fixed defaults. Both copies are
  superseded and must go when the linker ships.
- **Plate before element, by design.** The Betätigungsplatte stays at BOM position 3, above
  the Installationselement at 6: the user picks the plate and the engine adjusts the element
  to match its cistern. The dependency runs plate → element.

- **BOM Sorting Order — Wandklosett:**
  1. Wand-Klosett (Hauptartikel)
  2. WC-Sitz
  3. Betätigungsplatte
  4. Schallschutz
  5. Dübel-/Schraubenset (only when no Duofix element is present)
  6. Installationselement (Vorwandelement inkl. Einbauspülkasten)
  7. Rückwandbefestigungssatz
  8. Ablaufbogen
  9. Brandschutzset (if required)
  10. Other accessories

- **Standklosett uses the SAME element as Wandklosett, `3612 348`** — deliberately, not an
  oversight; `3612 343` (the dedicated Standklosettelement) is not used.

- **BOM Sorting Order — Standklosett:**
  1. Stand-Klosett (Hauptartikel)
  2. WC-Sitz
  3. Betätigungsplatte
  4. Schallschutz
  5. Dübel-/Schraubenset (only when no Duofix element is present)
  6. Spülkasten / Installationselement
  7. Rückwandbefestigungssatz
  8. Ablaufbogen / Ablaufanschluss
  9. Other accessories

- **Waschtisch (Mix & Match only):** the MM BOM order is unchanged. The Waschtischelement gets
  its own toggle under **Möbel**, **OFF by default**, and its lines go **under the
  Regulierventil** in this fixed order:
  1. Installationselement (`3612 287` standard · `3612 289` Wandarmatur · `3612 288` Einbausifon ·
     `3612 104` schmal — the user picks; MM has no montage field to derive it from)
  2. Rückwandbefestigungssatz `3612 500`
  3. Anschlussbogen `3612 272`
  4. Endmontageset `3612 235` — ONLY with the Einbausifon element `3612 288`

  **⚠ The Einbausifon element `3612 288` reorders the whole block, because the
  Endmontageset REPLACES the Siphon:**

      Waschtisch -> Endmontageset 3612 235 -> Regulierventil -> 3612 288 -> 3612 500

  The element carries its siphon inside the wall ("mit Einbausifon"), so the Möbelsiphon /
  designer siphon must NOT also be ordered — one basin, one siphon. `3612 235` takes that
  slot. **`3612 272` is dropped** for this element: the Endmontageset already states
  "Anschlussbogen 1¼" x 32 mm", so ordering 272 beside it buys the connection twice — the
  same double-charge the Brausegarnitur bundle rule prevents. The Rückwandbefestigungssatz
  `3612 500` stays; it is the wall fixing and nothing bundles it.

  The siphon and the Regulierventil are **independent slots** in `updatePreview()`. They
  used to be nested in one if/else, which made the Regulierventil vanish the moment the
  Einbausifon branch took over the siphon.
  MM renders its Stückliste as the GRID in `#col_preview`, not the BOM table
  (`.mixmatch-active .bom-section { display:none }`), so this is a toggle + `updatePreview()`
  line — **not** a `mountingMaterials` group. The article numbers are imported from
  `modules/rules/linkInstallationElement.js` so the two implementations cannot drift.

### Installationselement — Urinoir

Own ruleset, own linker (`modules/rules/linkUrinoirElement.js`), own document:
**`URINOIR_ELEMENT_RULES.md`**. It is separate because a urinal's element is
model-specific — `3612 406` carries NO water connection, `3612 403` carries a Rohbauset
for the control, `3612 402` is 144 cm tall. Ordering the wrong one opens the wall twice.

- **Evidence beats derivation.** 38 of the 49 urinals carry the pairing they were
  actually configured with in a competitor's public catalogue, each GTIN re-resolved on
  our own Profishop (`st-scraper/urinoir-sabag/`). Those are used verbatim.
- **The fallback is Anlage-vs-ceramic, not water-vs-control.** An `Urinoiranlage` brings
  its own control and valve, so it takes the element WITHOUT a Rohbauset (`3612 406`, or
  `3612 405` for a Tamaro-S); the same series as a bare `Urinoir` needs the element to
  bring water (`3612 403`). Measured against the 38 known pairings this reproduces 36;
  URINOIR_ELEMENT_RULES §2's water+control table reproduces 23.
- **An Anlage that names Duofix or Kombifix already CONTAINS its element** — `3411 516`
  says so only in the description — and gets none. FULL-TEXT RULE.
- **Pflichtteile: `3612 500` + `3612 272`, with any element and only with it.** Keyed off
  "has an element", nothing else, so the four urinals that take none get neither.
- **Schallschutz `3461 110` belongs to the CERAMIC** — the same reading the Klosett rules
  give it, so it does NOT hang off the element. Lema `3411 128` carries one while taking
  no element at all. The Geberit-own Preda / Selva / Tamina never carry one: they ship
  complete.
- **ONE element per urinal, plus `bau115`. Nothing else.** Offering the other six invites
  ordering a frame that does not fit — `3612 406` carries no water connection, `3612 402`
  is 144 cm tall — and their labels all start "Urinoirelement Geberit-Duofix,
  Montagerahmen, Füsse verstellbar", so the dropdown is a trap, not a choice.
- **The Urinoirsteuerung is preselected: `3451 106.100.000`** — HyTronic IR Typ01 square,
  Netzbetrieb, **Weiss** (Reji, 2026-08-21). Weiss is the art-Nr triplet `100`, never a word
  in the label — the COLOUR RULE. That matters here: every one of these bases is stored
  under a different finish (`3451 106.501.000` is Verchromt, `3451 100.503.000`
  Mattverchromt), so taking the base tray's own art-Nr would have preselected chrome.
  Only four of the six HyTronic articles exist in Weiss at all.
- **Every finish of a control is its own orderable SKU** — 25 options, the same treatment
  the Betätigungsplatte gets. Listing one SKU per base made a white control unreachable.
  `Ohne Urinoirsteuerung` is LAST now that it is no longer the default, same position and
  same reason as the element's `bau115`.
- **Opting out of the element parks the Steuerung on "Ohne" — ONE-SHOT.** It happens in
  the dropdown's change handler, deliberately NOT as a `dependsOn` rule: the Steuerung
  dropdown has to stay fully selectable afterwards, because "cistern is already in the
  wall, only the plate gets replaced" is a real order. A cascade rule would re-park the
  pick on every render and make that Stückliste unbuildable.
- **Nothing in a Urinoir row is shortened.** The Hauptartikel and every mounting row carry
  their `description` into the BOM item so `fullLabel` can stitch the truncated ERP label
  back together, dropdown options included — and since a `<select>` clips its text at the
  column width, the selected option's full text is repeated underneath it.
- **Rohbau-Set `3451 173` only under `3612 407`.** Every other element states "Rohbauset
  für Steuerung Hytronic und HyTouch" in its own text — the box is already inside it.
  It hangs off the *Steuerung* group and disappears with "Ohne Urinoirsteuerung".
- **The Dübelschraube is the wall-mounted case.** `8211 112` fixes a urinal straight to
  the wall; with an element it hangs on the element's bolts instead, so the group is
  suppressed unless the user opts out via `bau115`. Same class as the Spülrohr
  `3432 115`. The patch is applied to the EXISTING group — its options are SAP's.
  It matches on the group's own NAME: `3411 524` has a "Stücklisten Artikel" group that
  merely LISTS the screws, and suppressing that would have hidden the whole Anlage.
- **BOM order** (Reji, 2026-08-21) — the table is `urinoirBomBucket()` in
  `modules/rules/linkUrinoirElement.js`, imported by `createWCApp` so the runtime and the
  reconciler cannot drift (the same reason `createMixAndMatchApp` imports the Klosett
  article table):

  | | | |
  | --: | :-- | :-- |
  | 10 | Urinoirsteuerung | unconditionally, "Ohne" included — it is what the wall is roughed in for |
  | 15 | Rohbau-Set | rides with the Steuerung |
  | 20 | **Urinal** | the Hauptartikel, below the control the wall is roughed in for |
  | 30 | Dübelschraube / Gewindebolzen | the screws only show when no element is set |
  | 40 | Schallschutz | |
  | 50 | Siphon / Ablauf | unless the ceramic already includes one |
  | 60 | Einlaufmanschette / -garnitur | unless the ceramic already includes one |
  | 70 | Installationselement | |
  | 80 | Rückwandbefestigungssatz | |
  | 90 | Anschlussbogen | the supply side — never files with the drain |
  | 95 | Quertraverse / Zubehörset | element accessories |
  | 100 | misc. | **and a misc group that offers an opt-out opens on it** |

  "Ohne as default" is a REORDER of the group's options, not a stored selection — the same
  way `ensureShowerGroups` fronts a Garnitur's `Ohne …`. `options[0]` is what every seeding
  path picks, so moving it is the whole change. Only the misc bucket: the element's own
  "Ohne" stays LAST (the element IS the default), and a Siphon or Einlaufmanschette is
  ordered unless the ceramic includes it.
- Applied with `node scripts/reconcile-urinoir.js --write` (idempotent). Covered by
  `tests/verify-urinoir-rules.js`.

## 3. Brand & Bundling Rules

### Kaldewei
- `Montageschaum` and `Schallschutzset 1445 782.000.000` must **always be bundled** with `Duschenwannenträger` (matClass evaluates to `wannenträger`).
- `1435 435.000.000` (MAS) **only gets bundled with FR 5300** (`montagerahmen`) if **one side of a Kaldewei shower tray is larger than 90 cm**. Otherwise, exclude it.

### Schmidlin
- **Floor Series:** Must bundle with the **exact matching size standard Omnia frame** (e.g. `Montagerahmen Schmidlin Omnia 140 x 100 cm`).
- **Vario Series:** Frame depends on the maximum dimension extracted from the size range:
  - Max Dimension < 130 cm: Use `1435 199.000.000`.
  - Max Dimension $\ge$ 130 cm: Use `1435 200.000.000`.
- **Fussset:** Must be forcefully injected into the `bundleRules` of the Omnia Frame options (not as a separate tray accessory).
- **Duschen-Montageset Toggle:** Render iOS-style toggle ("Komplettes Montageset verwenden") if `mat_montageset` is present.
  - When ON: Hide individual raw accessories (frames, siphons, tapes) and exclude from BOM.
  - When OFF: Show raw accessories for selection.

### Alterna
- Alterna is a private label brand. **ALWAYS prioritize the "Alterna" keyword** above all other OEM brands (e.g. Duscholux, Laufen) in classification.

### Zargen-Wannendichtband (Sealing Tape)
- Every shower tray MUST have a sealing tape option.
- **Fixed Size Trays:** Calculate dynamically based on installation variants:
  - **Unit Check:** Normalize/convert units if main product (e.g. `cm`) and accessory (e.g. `mm`) differ.
  - **L-Variante (2-seitig):** Select smallest available tape length $\ge$ `Length + Width + 20cm`.
  - **U-Variante (3-seitig):** Select smallest available tape length $\ge$ `Length + (2 × Width) + 20cm`.
- **Custom Size Trays (auf Mass):** Render as a manual dropdown containing all available tape lengths.

## Colour codes (art-Nr finish triplet)

**RULE:** any colour filter, pill, or colour label is derived **only** from the article number's finish
code — the 3-digit triplet in `BASE.«COLOUR».VARIANT` (e.g. `4111 411.501.000` → `501` → Verchromt).
**Never** parse the colour from the label/description text. Source of truth: catalogue *Farbschlüssel
2026.6, nummerisch* (PDF pages 4–6); mirrored verbatim in `modules/factories/_colorCodes.js` (`COLOR_NAMES`,
339 codes). Regenerate both together from those catalogue pages.

`100` Weiss | `101` Weiss seidenmatt
`102` Verkehrsgrau | `103` Wildeiche
`104` Weiss marmoriert | `105` Weiss Cleaneffekt
`106` Grau marmoriert | `107` Betongrau
`111` Bahamabeige | `112` Moosgrün
`114` Nordic white matt | `116` Taupe matt
`117` Night blue matt | `120` Aluminium eloxiert
`123` Chrom gebürstet/Chrom/Chrom gebürstet | `124` Verchromt/Chrom gebürstet/Verchromt
`125` Schiefer | `127` Kaffeebraun
`129` Mustang Schiefer | `130` Betonoptik
`131` Bermudablau | `132` Caramel
`133` Manhattan | `136` Betongrau matt
`143` Pergamon | `146` Warm beige 20
`148` Ägäis | `149` Finox
`150` Fugengrau | `155` Warm grey 10
`156` Warm grey 60 | `157` Cool grey 30
`158` Cool grey 70 | `159` Cool grey 90
`160` Black blue | `165` Navyblue matt
`166` Deep dream | `167` Soft touch
`168` Sweet love | `169` Petrol
`170` Terre | `172` Sand matt
`178` Monument grey | `179` Antique rose
`180` Garnet red | `181` Dark taupe
`182` Whisper‐blau | `183` Pure white
`184` Beige textile | `191` Rubinrot
`194` Nordic white seidenmatt | `199` Taupe seidenmatt
`200` Flannel grey hochglanz | `205` Jasmin
`210` Messing matt | `211` Rotgold matt
`216` Night blue seidenmatt | `222` Ulme hell
`223` Ulme dunkelbraun | `224` Signalweiss
`225` Acqua matt | `226` Leinen matt
`227` Seiden matt | `228` Taubengrau matt
`229` Chrom schwarz gebürstet | `230` Grau matt
`232` Graphit | `234` Graphit supermatt
`235` Petrole | `236` Pink
`237` Basaltgrau | `239` Graphite matt Cleaneffekt
`240` Almond matt Cleaneffekt | `242` Edelstahl geschliffen
`244` Silk grey matt | `245` Leaf green matt
`246` Honey oak | `247` Warm walnut
`248` Coal black | `249` Sage green
`250` Waldgrün | `251` Greige
`252` Linen | `253` Tan
`254` Terracotta | `255` Greenery
`261` Titan black | `262` Gold optic gebürstet
`263` Rotgold gebürstet | `264` Rusted steel
`265` Signalgrau | `266` Sandbeige
`267` Dark platinum gebürstet | `268` Platin gebürstet
`275` Lackiert creme | `276` Lackiert earth
`277` Lackiert carbon | `279` Weiss cn
`293` Carat beige | `294` Almond beige
`295` Darkgray | `296` Casella oak
`297` Pacific walnut tobacco | `298` Mirto
`299` Midnight blue | `301` Weiss RAL 9010
`305` Schwarz RAL 9005 | `306` Graphite
`309` Navy blue | `312` Grau ombra
`317` Seta | `320` Basalt matt
`321` Beige | `325` Blau
`335` Gelb | `336` Grau
`337` Dunkelgrau | `338` Hellgrau
`339` Lichtgrau | `341` Silber
`343` Rot | `346` Graphit matt
`347` Mintgrün | `348` Transparent
`350` Schwarz | `356` Graphite grey
`360` Nussbaum natur | `364` Taupe
`365` Cashmere grey | `367` Arctic grey
`368` Pearl grey | `369` Grau dekor
`370` Bernstein | `372` Mandarine
`373` Pistaziengrün | `374` Rauchgrau
`376` Lava grey | `377` Pebble grey
`379` Premium weiss | `380` Lava
`384` Granitgrau | `398` Flannel grey seidenmatt
`399` Zementgrau | `400` Anthrazit‐schwarz
`402` Ulme dunkel | `403` Bianco alaska
`404` Grigio efeso | `405` Grigio londra
`406` Grigio bromo | `408` Nero ingo
`409` Nussbaum hell | `410` Bronce doha
`412` Aged bronze | `416` Antique brass
`417` Copper | `418` Black metal
`419` Brushed brass | `420` Gold optic
`423` Zement satiniert | `424` Black volcano
`425` Marine blue | `426` Eiche arizona
`427` Eiche nordic | `428` Eiche kansas
`429` Eiche stone | `430` Zinco doha
`431` Messing gebürstet | `432` Dark platinum matt
`435` Platin/Platin matt | `436` Messing/Messing gebürstet
`437` Titanio doha | `438` Piombo doha
`439` Cacao orinoco | `440` Verde comodoro
`441` Blu fes | `443` Argento dukat
`444` Oro cortez | `445` Acciaio hamilton
`446` Signalweiss glänzend | `447` Anthrazit glänzend
`448` Eiche schwarz | `450` Nussbaum dunkel
`461` Brushed bronze | `462` Brushed black chrome
`463` Brushed nickel | `464` Polished gold optic
`466` Brushed gold | `467` Brushed black
`468` Polished stainless | `469` Polished copper
`470` Polished gold | `471` Edelstahl finish gebürstet
`472` Polished black chrom | `473` Brushed gold optic
`474` Polished red gold | `475` Brushed red gold
`476` Matt gun metall PVD | `477` Matt british gold PVD
`478` Matt copper PVD | `479` Deep black PVD
`480` Summerfield dusk | `481` Angora grey
`482` Cubanit grey | `483` Abano esh anthrazit
`484` Leather beige | `488` Edelstahl finish
`489` Chromoptik hochglanz | `490` Edelstahloptik
`493` Messing PVD | `494` Warm bronze PVD
`495` Steel brushed | `496` Black metal brushed
`497` Copper brushed | `498` Warm bronze brushed PVD
`499` Farbe | `500` Eiche thermisch behandelt
`501` Verchromt | `502` Chromeline
`503` Mattverchromt | `507` Schwarzchrom
`508` Messing | `509` Rotguss
`510` Verchromt‐mattverchromt | `515` Rotgold
`521` Platin matt | `522` Platin
`523` Edelstahl matt | `524` Edelstahl glanz
`531` Nickel brushed | `532` Nickel polished
`534` Edelstahl matt PVD | `535` Schwarz matt
`536` Weiss matt | `538` Verchromt/Alu hochglanz
`541` Verchromt‐weiss | `544` Verchromt‐schwarz
`545` Verchromt‐braun | `546` Verchromt‐anthrazit
`547` Titanschwarz matt PVD | `548` Inox schwarz PVD
`552` Rosengold PVD | `553` Gold PVD
`554` Gold matt pale PVD | `555` Weiss/Glanz/Weiss
`556` Glanz/Matt/Glanz | `557` Matt/Glanz/Matt
`558` Schwarz/Glanz/Schwarz | `559` Chrome matt
`560` Dark chrome | `561` Champagne gebürstet
`562` Champagne | `564` Dark bronze
`566` Edelstahl gebürstet PVD schwarz | `567` Bronze gebürstet
`568` Graphit gebürstet | `570` Light gold
`571` Light gold gebürstet | `572` Dark brass gebürstet
`573` Eiche gewachst | `575` Nickel gebürstet
`579` Ombra | `580` Rosengold gebürstet PVD basis chrom
`583` Messing glänzend | `589` Edelstahl gebürstet PVD rosegold
`591` Silbereloxiert | `592` Silver polish
`593` Silver grey | `595` Silber hochglanz
`596` Brushed gold PVD | `597` Silber hochglanzeloxiert
`599` Silberfarbig | `602` Brushed copper PVD
`612` Nussbaum gebürstet | `617` Edelstahl gebürstet
`619` Mediterrane eiche | `627` Alu top
`633` Brushed graphite PVD | `634` Edelstahl seidenmatt
`646` Leinen | `664` Industrial black PVD
`670` Eisengrau | `686` Glas weiss
`689` Glas schwarz | `704` Rauchglas verspiegelt
`713` Weiss hochglanz | `714` Schwarz hochglanz
`717` Amerikanischer Nussbaum | `730` Forest green
`748` Eiche evoke | `756` Glacier white
`761` Cappuccino | `793` Light grey
`801` Posh purple | `805` Stone grey matt
`807` Esche honig | `808` Sand strukturiert
`809` Sand grau | `819` Stone white matt Cleaneffekt
`830` Walnut predazzo | `840` Sherman eiche anthrazit
`841` Anthrazit matt | `843` Weiss‐anthrazit matt
`846` Berglärche braun | `847` Spitzahorn
`848` Solid gold ivory | `849` Ever rose stone
`850` Titan rock carbon | `851` Flaw less nude
`852` Iconic gold toffee | `853` Vanity fair mocha
`854` Carbon | `860` Brushed graphite
`861` Dark bronze gebürstet PVD | `876` Eiche weiss gerillt
`881` Eiche dunkelgrau | `900` Anthrazit
`902` Anthrazit metallic hochglanz | `922` Eiche hell
`925` Eiche natura sägerau | `926` Eiche graphite
`927` Eiche graphit sägerau | `928` Eiche natura
`937` Tortona | `942` American walnut
`949` Eiche naturale | `959` Eiche kleinastig
`960` Tanne | `964` Titanium oak
`965` Planked walnut | `966` Light oak
`967` Amerikanische Ulme | `968` Kastanie
`969` Eiche silber | `972` Eiche gerillt
`991` Eiche weiss | `995` Weiss seda
`996` Fango | `998` Eiche dunkelbraun
`999` Kundenspezifisch
