# RULES — READ BEFORE EVERY CHANGE

This document outlines the strict business logic rules and safeguards that must be respected before making any changes to the configurator.

## 0. Architecture & Safeguards
- **NEVER let rules leak across products:** The `createRelationalApp` function in `factories.js` handles multiple products. You MUST branch logic by checking `this.title` (e.g., `if (this.title === 'Duschenwanne')`).
- **NEVER edit WC logic in relational block:** All WC logic must be edited inside the separate `createWCApp` block, NOT inside `createRelationalApp`.
- **ALWAYS ask for category clarification:** Always specify which category (Duschenwanne, Badewanne, WC) your logic applies to. If the user does not specify the category in their request, you MUST ask for clarification before making any code changes.

## 1. Business Logic and Prioritization
- **NEVER alter established BOM sorting orders or component priorities** unless explicitly requested by the user. Adhere strictly to comment-defined sequences.
- **NEVER refactor or modify unrelated code/items** when asked to fix a specific BOM or category issue. Scope edits strictly to the requested item.
- **ALWAYS read both label AND description:** ERP systems often enforce character limits that prematurely truncate the product `label`. Whenever building extraction/categorization logic (such as for `extractSituation` or `extractType`), you MUST concatenate and read both the `label` AND the full `description` fields to prevent miscategorization.

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
