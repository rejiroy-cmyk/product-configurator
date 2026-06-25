# Duschenwanne Auto-Link Rule Engine — Design Draft

> Status: **draft for review.** Replaces the destructive `mountingMaterials = []`
> wipe in Patch & Sync with an additive, provenance-tagged, validated auto-linker
> for shower-tray mounting accessories — triggered on import, safe to re-run.

## 🚫 Guardrails — DO NOT BREAK

These are shared, working systems. The linker **only produces `mountingMaterials` data**;
it must never modify the code below.

1. **Filter-pill classifier is GLOBAL.** `getRawClass` / `validCategories` /
   `montageLabel*` in `createRelationalApp.js` serve *every* configurator (mixers, WC,
   trays…). Scope all rule work to `this.title === 'Duschenwanne'`; only *feed* the
   classifier (via `overrideMontageart`); never change its shared logic. (INSTRUCTIONS §0.)
2. **InlineBOM stays exactly as-is.** The in-row `<select>` engine (`.inline-bom-select`)
   is used across Relational/Bademischer/WC/Glass/Duschenmischer. Its data contract —
   `item.matId`, `item.options[]`, `item.isInlineDropdown`, `selections[matId]`, and the
   **bidirectional dependency system** (`dependsOn` + `optionRules{whenArtNr, optionArtNrs}`),
   plus tape-desc boxes and `bitte_waehlen` placeholders — must be produced faithfully.
   **Never edit the InlineBOM render/binding/dependency code.** The replay harness
   guarantees compatibility: rules must reproduce the existing (InlineBOM-valid) data.

## Sources of truth (settled)

| Source | Provides | Tracked |
| :-- | :-- | :-- |
| `INSTRUCTIONS.md` | BOM order, Montageart branching, tape formula, frame thresholds, qty/conditional rules, brand priority | ✅ |
| `SHOWER_TRAY_RULES.md` | Siphon family per series; siphon → cover compatibility | ✅ |
| `custom-data.json` (483 trays) | Part-number **pools** + the **validation oracle** | ✅ |
| _exempt_ | Schmidlin Swiss Line (39) + Kaldewei Sanidusch (4): siphon from the MD, accessories **flagged** (data incomplete) | — |

## Anti-chaos principles

1. **Additive + idempotent** — match by `mat_*` id; re-running yields the same result, never duplicates.
2. **Provenance** — generated groups carry `_auto:true, _rule:"<id>"`. **Manual edits (no `_auto`) are never touched.**
3. **Scoped** — auto-link the *new* import batch only; per-category preview; never a global wipe.
4. **Validated** — every rule is replayed against the 483 trays and must reproduce the known-good linking before it ships.
5. **Flag, don't guess** — unknown series / unseen size / missing part → flag for manual import, never fabricate.

## Target accessory shape

```js
{ id:"mat_siphon", name:"Ablaufgarnitur", _auto:true, _rule:"siphon:kaldewei-superplan",
  options:[ { artNr, label, type, imgUrl, menge }, ... ] }
```

## Rule modules — pure functions `(tray) => group | null`

- **`linkSiphon`** [RULES §1] — classify series from **`label` + `description`** (read both; "Alterna" keyword wins). Look up primary/fallback siphon. Records `hasIntegratedCover`.
- **`linkCover`** [RULES §2] — skip if siphon has integrated cover; else attach compatible covers as a `common` group. Cover **color is the user's pick** (RULES §3 was removed).
- **`linkTape`** [INSTRUCTIONS §3 — **algorithmic**] — parse L×W from `size` (normalize cm/mm); L-Variante: smallest tape ≥ `L+W+20cm`; U-Variante: ≥ `L+2W+20cm`; "auf Mass" → manual dropdown.
- **`linkCarrier`** [INSTRUCTIONS §2–3] — returns **every applicable Montageart path** (the linker never picks one; the user chooses via the existing filter pill), each material tagged with `overrideMontageart` so `getRawClass` routes it to the right pill:
  - *Wannenträger:* size-matched carrier + Montageschaum (qty 1; **2 if a side > 120 cm**) + Schallschutz. Kaldewei bundles foam+Schallschutz with the carrier.
  - *Montagerahmen:* frame by rule — Schmidlin Floor → exact-size Omnia; Vario → max-dim threshold (`<130 → 1435 199`, `≥130 → 1435 200`); Kaldewei → FR5300. + Fussset (Omnia only, into frame `bundleRules`) + MAS `1435 435` (Kaldewei only, a side > 90 cm).
  - *Stelzfüsse:* **Calima only** — set of 4, qty by size.
- **`orderBOM`** [recovered priority block] — Deckel(2) → Siphon(3) → Dichtband(4) → Träger/Rahmen(5) → Schaum/Füsse(6) → Schallschutz(7) → other(9). **Never altered unless requested.**

## The reconciler — `reconcile(tray)`

1. Series exempt → flag, skip.
2. `desired = [linkSiphon, linkCover, linkTape, …linkCarrier].filter(Boolean)`.
3. Per desired group: a non-`_auto` group with the same id wins (manual is sacred); else add/replace the `_auto` group.
4. Tag `_auto`/`_rule`; sort via `orderBOM`.
5. Collect flags (missing part, unknown series).

## Validation harness — `tests/verify-shower-rules.js`

Extends the existing test harness. For each non-exempt tray: run `reconcile`, diff produced-vs-existing.
Report `✅ reproduced | ⚠️ diff (rule X vs data Y) | 🚩 flag (missing part)`. A rule ships only when replay is green; diffs are a rule bug **or** a data error to fix.

## Integration (last — only after rules pass replay)

- **Import** (`admin.js` `uploadCsvInput.onchange`): `reconcile` the **new batch only**.
- **"Re-link (preview)" button:** dry-run diff across the category → apply on confirm.
- **Patch & Sync:** swap `mountingMaterials = []` → `reconcile` (additive).

## Build order (each gate = replay green)

1. Provenance tags + reconciler skeleton + replay harness. *(no behavior change)*
2. `linkSiphon` + `linkCover` → replay green.
3. `linkTape` → replay green.
4. `linkCarrier` per Montageart → replay green.
5. Wire import + preview button.
6. Swap the Patch & Sync wipe → `reconcile`.

## Montageart = a USER choice, fed into the EXISTING pill system

The linker does **not** decide installation type. It provides the *complete* set of
available, correctly-matched materials and tags each one; the user then chooses a
direction with a filter pill that **already exists** in `createRelationalApp.js`:
`getRawClass(obj)` classifies each material as `common` (always shown — siphon,
Deckel, tape) or `wannenträger` / `montagerahmen` / `stelzfüsse`; `validCategories`
+ `montageLabel1..5` drive show/hide. Tagging via `overrideMontageart` is priority-1
in that classifier, so the linker just sets it and the pills do the rest. **We feed
the existing UI; we don't build new filtering.**

## Resolved (2026-06-24)

- Montageart is a user choice (above) — `linkCarrier` returns ALL applicable paths.
- Cover-color propagation (RULES §3) removed — cover is `common`, color is user-picked.
- **Tape margin = strict `+20 cm` (INSTRUCTIONS §3) is the rule of record.** The
  existing data was sized tighter (rule ≥ data in 380/380 cases); the rule corrects it.
- **Exemptions are PER-RULE, not per-series.** Swiss Line / Sanidusch are exempt only
  from *mined* rules (carriers/frames — incomplete data). Algorithmic rules (tape) apply
  to them normally — in fact Swiss Line had *no* tape at all, which the rule fills.
