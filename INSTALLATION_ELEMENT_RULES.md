# Installationselement (Vorwandelement) Rules — Template

Fill in the `[ ]` brackets. Everything **not** in brackets was read out of
`custom-data.json` and needs no answer — correct it if it's wrong, otherwise leave it.
Save the file and tell me in chat; I'll implement from it.

Same working pattern as `SHOWER_TRAY_RULES.md` → `modules/rules/` → replay harness.

**Scope agreed:** attach the element to the trays that already exist. No new category.
Targets: `wandklosett` · `standklosett` · `waschtisch` · `urinoir`.

---

## 0. What is already there (no answer needed — context)

| Category | Trays | With mounting groups | Element group today |
| :-- | --: | --: | :-- |
| Wandklosett | 111 | 94 | ❌ **none** — but 82 trays already offer a `Betätigungsplatte` |
| Standklosett | 33 | 33 | ✅ `Duofix Element` on 15 trays (1 SKU: `3612 348.000.000`) |
| Waschtisch | 941 | 686 | ❌ none |
| Urinoir | 41 | 22 | ❌ none |

Three things worth knowing before you answer anything below:

1. **A wall-hung WC currently offers a flush plate but not the cistern it actuates.**
   That is the main gap this ruleset closes.
2. **All 82 `Betätigungsplatte` groups are byte-identical** — 3 options (2× Sigma20,
   1× Sigma01), no "Ohne" choice — while the pool holds ~45 plates across 9 families
   (Sigma01/10/20/40/50/70/80, Omega20/60). Section 4 decides whether that stays.
3. **98 elements are in the pool and already routed** to the right subcategories, so
   this is a linking job, not a scraping job.

| Element type | Duofix | Kombifix | TECE Profil | Laufen Ineo |
| :-- | --: | --: | --: | --: |
| Wandklosettelement | 25 | 2 | 4 | 3 |
| Waschtischelement | 30 | – | 6 | 3 |
| Urinoirelement | 12 | 2 | 3 | 2 |
| Wandbidetelement | 4 | – | 1 | – |
| Standklosettelement | 1 | – | – | – |

---

## 1. WHEN TO USE WHAT — choosing the system

This is the rule I most need from you. The systems differ by **wall construction**:

| System | Built for | In our data |
| :-- | :-- | --: |
| **Geberit Duofix** | drywall / stud wall (Trockenbau), pre-wall or in-wall | 173 articles |
| **Geberit Kombifix** | solid construction, walled in (Massiv-/Nassbau) | 4 elements |
| **TECE Profil** | drywall, competing system | 14 elements |
| **Laufen Ineo** | drywall, Laufen's own | 8 elements |
| **Geberit GIS** | full-height installation walls, tile-ready | `[ how many / in scope at all? ]` |

**1.1 — How does the configurator decide?**

- [X] **A**: Always default to one house system, user can switch. House system = `[ Duofix Sigma/ Duofix Omega ]`
- [ ] **B**: The user picks the wall type first (a new pill: *Trockenbau / Massivbau*), and
      the system follows from it.
- [ ] **C**: Follow the ceramic's brand (Laufen ceramic → Laufen Ineo element, etc.)
- [ ] **D**: Other — `[ …………………………………………………………… ]`

**1.2 — Are the non-Geberit systems offered at all, or is Geberit the only one we sell?**

`[ TECE:  hide ]`   `[ Laufen Ineo:  hide ]`   `[ Kombifix:  hide ]`

**1.3 — Is the element ever *not* wanted?** (e.g. the builder supplies it)

- [X] Always offer an `Ohne Installationselement` option with text 'bau115'→ `[ yes ]`
- [ ] If yes, is it the **default**, or is a real element the default? `[ Duofix Sigma ]`

---

## 2. Which element for which fixture

**2.1 — Wandklosett (111 trays → 34 candidate elements).** Standard Duofix WC element is
`Breite 50 cm · Höhe 112 cm · Ausladung max. 70 cm`.

| Situation | Element | Default? |
| :-- | :-- | :-- |
| Standard wall-hung WC | `[ 3612 348.000.000 ]` | `[ yes ]` |
| Dusch-WC / AquaClean | `[ 3612 348.000.000 ]` *(several carry "Leerrohr für Wasseranschluss Dusch-Klosett")* | |
| Barrier-free (rollstuhlgängig) | `[ 3612 329 ]` *(42.5 cm and 88 cm variants)* | |
| Children's WC | `[ 3612 344.000.000 ]` *(Höhe 97 cm)* | |
| Half-height / low wall | `[ 3612 301 (Omega 82 cm) ]` | |
| Hygienespülung required | `[ 3612 304 ]` *(HS30 vs HS50, 1 vs 2 Wasseranschlüsse)* | |

**2.2 — Waschtisch (941 trays → 39 candidate elements).** These differ by height, width,
tap position and siphon type:

| Situation | Element | Notes from data |
| :-- | :-- | :-- |
| Standard washbasin | `[ 3612 287.000.000 ]` | H 112 · B 50 is the common size |
| **Wandarmatur** (wall tap) | `[ 3612 289.000.000 ]` |  |
| Concealed siphon (Einbausifon) | `[ 3612 288.000.000 ]` | 5 elements; these need the `3612 235` Endmontageset (it bundles the Abdeckplatte) |
| Barrier-free | `[ 3612 288.000.000 ]` | |
| Narrow / schmale Ausführung | `[ 3612 104.000.000 ]` | B 44 cm |

**Question:** should the element follow the basin's **width**? The elements are 44 / 50 /
80 / 150 cm. `[ no — always 50 cm ]`

**2.3 — Urinoir (41 trays → 19 candidate elements).**

| Situation | Element |
| :-- | :-- |
| Standard urinal, concealed flush control | `[ …………… ]` *(Typ 112/130, H 112–130)* |
| Tall installation | `[ 3612 402 / 412 (Typ 144) ]` |
| Urinal with no flush control | `[ 3612 405 / 406 ]` |

**2.4 — Standklosett.** A floor-standing WC needs a cistern, not a full frame. Today 15
trays offer `Duofix Element` → `3612 348.000.000`.

---

## 3. Cistern & actuation (WC only)

| Cistern | Actuation | Element heights we stock |
| :-- | :-- | :-- |
| **Sigma** | front only | 112 cm (plus 97 cm kids, 42.5/88 cm barrier-free) |
| **Omega** | **front or from above** | 82 · 98 · 112 cm |

**3.1 — When does a job get Omega instead of Sigma?**
`[ "only on request" ]`

**3.2 — Is Sigma the default in every other case?** `[ yes ]`

---

## 4. Betätigungsplatte ↔ cistern compatibility

Today every WC tray offers the same three plates regardless of its element. If we attach
elements, the plate list should follow the cistern.

**4.1 — Keep the current curated 3, or open it to the full range?**
- [ ] Keep exactly today's 3 (Sigma20 ×2, Sigma01)
- [X] Offer all plates compatible with the chosen cistern
- [ ] Offer a curated shortlist per cistern → fill the table below

| Cistern | Compatible plate families | Default plate |
| :-- | :-- | :-- |
| Sigma | `[ Sigma01, Sigma10, Sigma20, Sigma50, Sigma70, Sigma80 …? ]` | `[ …………… ]` |
| Omega | `[ Omega20, Omega60 …? ]` | `[ …………… ]` |

**4.2 — Known exclusions already stated in the data** (confirm these are the only ones):
- `3612 340` — *nicht geeignet für Abdeckplatte Sigma60*
- `3612 343` — *nicht geeignet für Sigma80*
- `3612 344` — *nicht geeignet für Sigma80*

Any others we should encode? `[ …………………………………………… ]`

**4.3 — Does the plate finish follow the ceramic/mixer colour, or is it a free choice?**
`[ free choice, default weiss ]`

---

## 5. Mandatory vs optional companions

For each part: **M** = always in the BOM · **O** = offered, off by default · **–** = never.

| Part | Wandklosett | Standklosett | Waschtisch | Urinoir |
| :-- | :-- | :-- | :-- | :-- |
| Installationselement | `[O]` | `[O]` | `[O]` | `[O]` |
| Betätigungsplatte | `[M]` | `[M]` | – | `[M]` |
| Schallschutz(set) | `[-]` | `[-]` | `[-]` | `[-]` |
| Bauschutz `3612 362` | `[-]` | `[-]` | – | – |
| Rückwandbefestigungssatz `3612 500` | `[M*]` | `[M*]` | `[M]` | `[M]` |  ← \* only with a real element (2026-08-18)
| Brandschutzset EI30/60/90 | `[-]` | `[-]` | – | – |
| Endmontageset `3612 235` | – | – | `[M]`  | – |
| Anschlussbogen `3612 272` | – | – | `[M]` | `[M]` |
| **Ablaufbogen `3612 374`** | **M\*** | **M\*** | – | – |  ← \* only when a real element is selected; `bau115` suppresses it

**5.1 — Brandschutz:** is it ever automatic, or always a manual add? `[manual]`

---

## 6. Brand priority

When the ceramic is Laufen / Duravit / KWC etc., which element brand wins?

- [X] Always the house system regardless of ceramic brand
- [ ] Match the ceramic brand when that brand builds an element (Laufen → Laufen Ineo)
- [ ] Other — `[ …………………………………………… ]`

*(For reference, the accessory colour-matching rules use `ACC_HOUSE_BRAND` = Alterna /
Emporio as the house line. Is there an equivalent for installation systems? No )*

---

## 7. Proposed BOM order — for review before it goes into `INSTRUCTIONS.md` §2

Written in the existing house style. **Nothing here is implemented yet.**

### Wandklosett (Wall-hung WC)
1. Wand-Klosett (Hauptartikel)
2. WC-Sitz
3. Betätigungsplatte
4. Schallschutz
5. Dübel, Schraubenset (if required, if combined with Duofix not required)
6. Installationselement (Vorwandelement inkl. Einbauspülkasten)
7. Rückwandbefestigungssatz
8. Ablaufbogen
9. Brandschutzset (if required) 
10. Other accessories

### Standklosett (Floor-standing WC)
1. Stand-Klosett (Hauptartikel)
2. WC-Sitz
3. Betätigungsplatte
4. Schallschutz
5. Dübel, Schraubenset (if required, if combined with Duofix not required)
6. Spülkasten / Installationselement
7. Rückwandbefestigungssatz
8. Ablaufbogen / Ablaufanschluss
9. Other accessories

### Waschtisch (Washbasin) MM BOM order stays, Waschtischelement gets a toggle under the Möbel and gets placed under the Regulierventil.


### Urinoir needs alot of research to get it right. Let's not implement something only understanding the helf of it


---

## 8. Open questions I could not answer from the data

1. **Does the element belong in the same Stückliste as the ceramic at all**, or does the
   Sanitär-Installateur order it separately? If separately, this whole ruleset becomes an
   optional group rather than a mandatory one. `[ together ]`
2. **Is GIS in scope?** It's a different animal — full installation walls, planned in
   Geberit ProPlanner with its own parts list. `[ out ]`
3. **Ausladung**: every Duofix WC element states "Ausladung max. 70 cm". Do any of our
   ceramics exceed that, i.e. is there ever an element that *cannot* take a given WC?
   `[ no ]`
4. **Floor build-up**: Duofix supports up to 25 cm. Does that ever need to be a user
   input? `[ no ]`
5. `3612 232.000.000` is in our data but **the shop has no page for it** — a retired
   article. Should it be excluded from any rule, and dropped? `[ drop it ]`

---

## 9. Follow-up answers (2026-08-18) — these SUPERSEDE the sections above where they differ

1. **`bau115` is a TEXT POSITION**, not an article. Same contract as `TXK103` in Mix & Match:
   no Menge, exported as a bare line with no tab, shows "—" in the BOM. Never give it a quantity.
2. **The Duofix Sigma element is always in the BOM by default.** The user opts out via a
   toggle, which swaps the element line for the `bau115` text position. (This resolves the
   `O` in §5 — the group is not "off by default"; the element is preselected.)
3. **Schallschutz belongs to the Wandklosett itself and is needed** — it stays injected by
   default and this ruleset neither adds nor removes it. **Bauschutz `3612 362` is a
   replacement part for the Duofix element**, so it is never auto-added; Brandschutz likewise
   stays a manual add. Nothing existing gets deleted.
4. **Betätigungsplatte becomes a TWO-STAGE dropdown:** family first (Sigma01 · Sigma10 ·
   Sigma20 · Sigma40 · Sigma50 · Sigma70 · Sigma80 / Omega20 · Omega60), then a second
   dropdown for that family's plates. **Each option's description must carry the colour**,
   resolved from the art-Nr finish triplet via `COLOR_NAMES` (COLOUR RULE), default Weiss `100`.
   - **Sigma60 dropped.** Note: no Sigma60 plate exists in the catalogue at all — the only
     mentions are the "nicht geeignet für Sigma60" notes on `3612 330` / `3612 340`, now moot.
   - **Sigma80 kept**; its exclusions (`3612 343`, `3612 344`) still apply.
   - Kappa20/21/50 and Highline are for cisterns we do not offer → never listed.
5. **Laufen Ineo is not used at all** (~0.5% of Duofix volume). Barrier-free Waschtisch
   therefore takes `3612 288`, accepted as a deliberate stand-in. **The Endmontageset gets a
   colour choice**: `3612 235.501` Verchromt (CHF 83) · `.100` Weiss (CHF 35) ·
   `.523` Edelstahl matt (CHF 134).
6. **Endmontageset `3612 235` only when `3612 288` is the chosen element** — not on every
   Waschtisch. (Corrects the unconditional `M` in §5.)

7. **Standklosett keeps `3612 348`** — the same element as Wandklosett, deliberately, even
   though `3612 343` is the dedicated Standklosettelement. Do not "fix" this later.

8. **Barrier-free = every product under SIA 500.** Not the word "barrierefrei" and not the
   ceramic's geometry. ⚠ **NOT YET IMPLEMENTABLE — the data carries no SIA 500 flag.** See
   §10 below.
9. **This ruleset OVERRULES every earlier auto-injection**, Wandklosett included. Until now
   `createWCApp.js` and `createRelationalApp.js` each hard-coded a `step6/step7/step8`
   sequence injecting `3612 348` (Element) + `3612 500` (Rückwandbefestigung) +
   `3612 374` (Ablaufbogen Geberit-Silent, D. 90 mm, CHF 56). Those hard-coded steps are
   superseded by the rules in this document and must be removed when the linker ships —
   in **both** factories, which carry byte-similar copies of the block.
10. **The BOM order stands as given.** The Betätigungsplatte stays at position 3, above the
   Installationselement at 6. **The user picks the plate first and the engine adjusts the
   element accordingly** — the dependency runs plate → element, not element → plate. The
   existing `dependsOn`/`optionRules` system is bidirectional, so this is supported.

**The ruleset is complete.** One implementation blocker remains — see §10.

---

## 10. SIA 500 — RESOLVED (the signal already existed)

**Barrier-free = SIA 500 = Ausladung >= 70 cm**, and that verdict is already computed:
`modules/admin.js:401` parses the depth out of the label (`, 70,` / `, 70 cm`) and stores
it as **`tray.size = "SIA 500"`** — the field behind the **AUSLADUNG** filter pill.

    wandklosett  ->  Standard 85 · Compact 22 · SIA 500 4
    standklosett ->  Standard 29 · Compact  4 · SIA 500 0

The linker reads `tray.size` first (a structured field beats a regex over the same fact),
and falls back to a full-text "barrierefrei" check only for a tray whose Ausladung never
parsed. Those four take element `3612 329`; everything else takes `3612 348`.

Two notes for later, neither blocking:
- The parser needs a **comma-delimited** depth in the label. A SIA 500 WC that states its
  Ausladung only in the description would be missed — the fallback catches it just if the
  text also says "barrierefrei".
- The earlier claim in this file that SIA 500 was undetectable was wrong; the 432 "SIA"
  hits in the catalogue really are SIA-Norm 271/1 (Schedel waterproofing) and unrelated,
  but the Ausladung classifier was the thing to look at, not the product text.
