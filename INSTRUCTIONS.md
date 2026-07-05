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
