# CLAUDE.md

Guidance for working in this repository.

## What this is

An internal, German-language **product configurator** for bathroom fittings. The
user picks a product category, configures options, and the app assembles a
**Stückliste** (BOM — bill of materials) of article numbers (`Art-Nr`) to order.

Domain vocabulary: *Bademischer* = bath mixer, *Duschenmischer* = shower mixer,
*Waschtisch* = washbasin, *Duschenwanne* = shower tray, *Duschtrennwand* = shower
partition, *Stückliste* = BOM, *Zubehör* = accessories.

## Stack & build

- **Vanilla JS SPA**, no framework. ES modules, bundled by **Vite** into a single
  `dist/index.html` via `vite-plugin-singlefile` (everything inlined).
- `npm run dev` — Vite dev server on **port 5175** (see `.claude/launch.json`). Binds
  `0.0.0.0` (`host: true`), so it also prints a `Network:` URL — open that on a phone on
  the same Wi-Fi. Keep `host: true`; without it Vite is localhost-only and the phone just
  times out.
- `npm run preview` — serves the built single-file `dist/` on **4175**, also LAN-exposed.
  This is what to test on a phone before shipping, since `dev` and the inlined build load
  data differently (`/api/data` vs. the embedded gzip blob).
- `npm run serve:tailscale` — publishes the built `dist/` to your **tailnet** over HTTPS,
  so the phone works off Wi-Fi (5G, other networks) without exposing anything publicly.
  See "Remote access" below. `--off` stops it, `--status` shows current state.
- `node scripts/build-offline-assets.mjs` — regenerates `assets/offline-fonts.css`.
  Only needed when you add a new `ri-*` icon or change fonts; see "Offline assets".
- `npm test` — runs **18 suites, 695 assertions**: `verify-duschtrennwand` (38),
  `verify-all-apps` (16), `verify-shower-rules` (10), `verify-servicepaket` (7),
  `verify-fulltext-rule` (87), `verify-product-display` (37),
  `verify-no-kitchen-in-waschtischmischer` (4), `verify-scraper-maktx2` (7),
  `verify-accessory-colormatch` (47), `verify-mixmatch-rules` (67),
  `verify-copy-multiplier` (21), `verify-accessory-quantity` (81),
  `verify-data-intern` (14), `verify-offline-fonts` (9),
  `verify-installation-rules` (45), `verify-urinoir-rules` (77),
  `verify-ohne-never-copied` (39), `verify-accessibility-routing` (83). Plain Node with
  hand-rolled DOM mocks — no jsdom, no test runner. (`tests/verify-pricing.mjs` is the
  one jsdom test and is NOT in the chain; neither are the `test_*.cjs` scratch files.)
  **Run this after any change to `modules/factories/`.**
- `npm run build` — `test` → `backup` → `vite build` → copies `dist` to `backups/`.
- `npm run backup` — snapshots `modules/`, `index.html`, `index.css` into `backups/`
  (now git-ignored; prefer git history).

## Offline assets (fonts & icons)

The build used to `<link>` Google Fonts (Outfit/Inter) and the RemixIcon face from
jsdelivr, so with no connection **every icon rendered as a blank box**. Both are now
embedded as base64 `data:` URIs in **`assets/offline-fonts.css`** — a generated file,
checked in, inlined into `dist/index.html` by Vite like any other stylesheet.

- Regenerate with `node scripts/build-offline-assets.mjs` (needs `pip3 install fonttools
  brotli`, plus network for Google Fonts). A normal `npm run build` needs neither.
- The icon font is **subset to only the glyphs the app references** — 4.3 KB instead of
  the 140 KB full face. Adding a new `ri-*` icon therefore requires a regeneration, or it
  renders as nothing. `tests/verify-offline-fonts.js` fails `npm test` (and so
  `npm run build`) if any referenced icon has no glyph rule.
- The scan is static — it assumes no `'ri-' + name` string building anywhere. If you ever
  construct an icon class dynamically, the subset will silently miss it.
- **Inter is deliberately not bundled.** `index.css` names it, but Outfit covers Latin
  fully so it never renders, and it cost more than everything else combined. The
  Offertanfrage print window (`app.js`) is a separate `document.write()` document that
  can't see these `@font-face` rules at all, so it uses a system stack.
- Product thumbnails still load from `profishop.sanitastroesch.ch`, so they remain blank
  offline. Embedding those would mean thousands of images — deliberately not done.

## Remote access (phone, off-Wi-Fi)

`scripts/serve-tailscale.sh` serves the built `dist/index.html` over
`tailscale serve` — reachable at `https://<machine>.<tailnet>.ts.net/` from any device
signed into the same tailnet, and from nowhere else.

**Never switch this to `tailscale funnel`.** Serve is tailnet-only; Funnel publishes to
the open internet, and `custom-data.json` carries internal article numbers *and prices*.
The script refuses Funnel by design.

One-time prerequisites:

1. Tailscale installed on the Mac and on the phone, both signed into the **same** account.
2. HTTPS certificates enabled for the tailnet — admin console → **DNS → HTTPS
   Certificates**. Without it `tailscale serve` cannot get a cert; the script checks this
   and tells you.

Gotchas:

- **A sleeping Mac serves nothing.** This is host-based serving, so the Mac must be awake
  (`caffeinate -dims &`) for the phone to load anything. If you need genuine always-on,
  the app has to move to an always-on host — that's a different setup, not this script.
- Static serving means the production data path: no `/api/data`, so **admin edits persist
  to `localStorage` on the phone only** and never reach `custom-data.json`. Edit the
  catalog on the Mac via `npm run dev`, rebuild, then re-serve.
- The script rebuilds automatically when `dist/` is older than the sources.

## Architecture

```
index.html            # all views (home / config / admin / search) + modals, German UI
  └─ app.js            # orchestrator. Wires DOM events; holds cross-module state on window.*
       ├─ modules/data.js     # DATA_VERSION, base catalog
       ├─ modules/apps.js     # builds `productApps` registry by calling create*App factories
       ├─ modules/admin.js    # admin/data-editor panel
       └─ modules/factories.js  # SHIM -> ./factories/index.js
            └─ modules/factories/   # one file per configurator type (see below)
```

### `modules/factories/` (the core domain logic)

`factories.js` is a one-line shim (`export * from './factories/index.js'`). The real
code lives in `modules/factories/`, **one file per `create*App` factory**:

- `_shared.js` — shared helpers imported by every factory: `matchesSearchQuery`,
  `getVariantColor`, `getSanitasImgUrl`, `applyPillUI`, the DOM refs
  (`configSidebar`, `bomTableBody`, `bomCountCounter`), their short aliases
  (`Ae`, `re`, `me`, `ke`, `Be`, `X`), and the `window.copyTextToClipboard` /
  `window.copyBOMToClipboard` side-effects. **Add new cross-factory helpers here.**
- `_colorCodes.js` — the `COLOR_NAMES` finish-code table (art-Nr triplet → colour
  name). Imported **directly** (`from './_colorCodes.js'`), not through `_shared.js`.
- `_productDisplay.js` — side-effect-free display helpers, re-exported through
  `_shared.js` (`fullLabel`, `differentiatingChips`, `productAttrs` — import them
  from `_shared.js`, not from here):
  - `fullLabel(product)` — **the text every BOM row and product tile must show.**
    ERP labels are hard-truncated (often mid-word) and the rest of the sentence
    lives in `description`, usually repeating the label's tail. This stitches the
    two back together, de-duplicating the overlap and healing the cut-off word.
    ~10.7k of the 93k catalogue records gain text; none ever lose any. Emits
    plain text only — the SAP clipboard export scrapes the first `<strong>` in a
    BOM row for the quantity, so display text must never carry markup.
  - `differentiatingChips(product, group, opts)` — the attribute chips that tell
    a product apart from the ones listed beside it. `group` = every product shown
    under the same tile title. Curated German extractors first (Höhe Mischdüse,
    Batterie vs Netzgerät, Kaltwasser-Mitte, Armaturenlöcher, Überlauf …), then a
    generic auto-diff backstop for families no rule covers, so two tiles can never
    read alike. `opts.always` pins families that should show regardless;
    `opts.exclude` drops ones the tile already displays.
    A chip slot goes to a family that CONTRASTS with a neighbour (a neighbour
    states a *different* value), never to one that merely fills a gap in a
    neighbour's data — otherwise low-value families crowd out real ones.
    Structured attributes from `product.tech` (see Data layer) beat the regex
    rules for the same family. **`Ausprägung` is SAP's own variant discriminator**
    and is ranked first: it is what separates "Festelement links" from
    "Festelement rechts" when two articles carry byte-identical label text.
    `tech.Farbe` is deliberately ignored — the COLOUR RULE gives the finish to the
    art-Nr triplet alone, and SAP's Farbe often names the ceramic instead.
    **Deliberately NOT chipped:** Energieeffizienzklasse, Geräuschgruppe,
    Umweltdeklaration EPD (none are buying criteria here). Suppressing such an
    attribute takes TWO edits — drop the curated rule *and* add it to
    `AUTO_SUPPRESS` — otherwise the auto-diff backstop reintroduces it as raw
    ERP text.
  - Covered by `tests/verify-product-display.js` (part of `npm test`).
- `index.js` — barrel that re-exports all 14 factories.
- `createRelationalApp.js` — the engine (~2.9k lines); most configurators are
  built on it. `createDuschenwanneApp`, `createDuschenrinneApp`, `createBadewanneApp`
  are thin wrappers that call it.
- Other factories: `createFinishesApp`, `createWashbasinApp`,
  `createWaschtischMischerApp`, `createMixAndMatchApp`, `createDuschenmischerApp`,
  `createBademischerApp`, `createStandardApp`, `createGlassApp`, `createWCApp`,
  `createBidetApp`.

**Factory contract:** `create*App(title, desc, mainImgUrl, config = {})` returns an
app object exposing at least `init(...)`. `app.js#openConfigurator` sets
`window.currentActiveApp` and calls `init()`, which renders the sidebar selectors and
the BOM table.

When editing a factory, each file imports the **full** shared set from `./_shared.js`
— keep that import line intact when adding code that uses a shared helper.

### Accessoires panel — one implementation, all apps

Every configurator's Accessoires toggle renders the **same** filter bar via
`accessoryFacetBar(candidates, state, wrapEl, idPrefix, onChange)` in `_shared.js`:
**Produktkategorie · Hersteller · Serie · Farbe**, always visible (a facet hides
only when it has fewer than two values to offer) and *bidirectionally faceted* —
each facet's options are what survives every OTHER facet's current selection, so
no combination can produce an empty list. Farbe derives from the art-Nr finish
code (COLOR_NAMES), never from label text. State lives on `app.accFacets`; the
panel markup only needs an `<div id="acc_facets_<suffix>"></div>` container.

Do **not** hand-roll another accessory filter. The three that existed before
(`renderAccessoiresPanel`, Mix & Match's own, and the Serie-only ones in
`createRelationalApp` / `createWCApp`) all drifted apart — that drift is exactly
what this helper exists to prevent.

**Produktkategorie is `accessoryKategorie(t)`, not the raw `productType`.** SAP's tag
is too coarse in two places, both of them made a family unfindable: EVERY bin is tagged
`Papierhandtuchspender` (104 Abfallbehälter + 34 Papierkorb, searchable only under
"paper-towel dispenser"), and `WC-Zubehör` was ONE pill over 1'277 articles that are
really three families (496 Papierhalter · 372 Klosettbürstenhalter · 229
Reserverollenhalter). The helper maps the leading noun of the short text to a canonical
pill and falls back to `productType` — `// label-prefix by design`, the GLOBAL RULE's
identity exception, and the reason "Ablage …, passt zu Papierhalter" files under Ablage
instead of following the partner reference. Longest prefix first, or
"Papierhandtuchspender-Abfallbehälter" is eaten by the plain "Papierhandtuchspender".

**A multi-word line name beats the noise list** (`ACC_SERIE_PHRASES` in `accessorySerie`).
CWS's own line is "Stainless Steel", but `stainless` also ends Frost's material spec
("Edelstahl, Polished stainless steel"), so the token sits in `ACC_SERIE_NOISE` and the
17 CWS SKUs fell through to the brand — printing **CWS** in the Serie pill as well as in
Hersteller, with no way to filter the line. The phrase is tested first and anchored at
the brand, so it only ever fires on `<Brand> <Phrase>` and the material spelling stays
noise. Add a line here rather than deleting a noise token.

**A phrase may be scoped to one `brand`, and its `name` may be a function of the
match.** Both exist for one reason: *a rule that is safe for ONE brand is not safe for
all of them.* `accessorySerie` demands a leading LETTER in the token after the brand,
because after most brands a number is a DIMENSION — reading it invents "Bodenschatz 33"
out of the size range "33 - 51 cm" and "Geberit 90" out of a drain diameter. But **Hewi's
lines ARE bare numbers**, so 984 pool articles plus 485 of the Ch4 accessibility range
all sat in one undifferentiated "Hewi" pill. The numeric rule is therefore scoped to Hewi
alone (→ System 100/800 478 · 900 238 · 805 40 · 801 36 · 477 · 162), and two assertions
in `verify-accessibility-routing` exist purely to prove it does not leak past that brand.
Four more lines were spread over pills that say nothing, all fixed the same way:
Keuco names its lines **`Collection <name>`** (Axess 135 · Moll 41 · Reva 30) and the
single token merged all three into "Collection"; the same Nosag line is written both
"Normbau Cavere" (80) and "Cavere" (23); and **Alterna hangs a SHAPE on the name with a
hyphen** — `piana-gewinkelt`, `rondo-gerade`, `nonda - gerade` — so one line got a pill
per shape. `gestell`, `abgewinkelt` and `sechskantig` are in `ACC_SERIE_NOISE`: they
state construction, not a product line.

**The Klosett panel has its own family list** — `WC_ACC_FAMILIES` + `isWCAccessory` in
`createWCApp.js`, matched as an identity PREFIX. It replaced a substring scan over four
keywords that matched anything merely NAMING one (the partner-reference trap), which
cost three things at once: eight Frost "Ablage …, passt zu Papierhalter" tiles sat in
the Klosett panel; Hygienekombination and Hygieneabfallbehälter never showed although
the pool tags all 35 `wandklosett` + `standklosett`; and only 50 of 154 Klappgriff
appeared — the ones whose text happens to read "Zubehör: Papierhalter". Note this panel
scans every app's trays and ignores `targetSubcats` entirely; the family list IS the
routing — a family routed to a Klosett and *not* named here is invisible, silently, with
nothing in the data to show for it. `tests/verify-accessibility-routing.js` pins the two
files to each other. The list is sorted longest-first, because `find` returns the FIRST
prefix that matches and the family it returns decides whether the rail rule below runs.

**A grab bar carrying a shower rail is a shower article** — `RX_GRIFF_RAIL` +
`GRIFF_FAMILIES`, FULL-TEXT, since half of them state the rail only in the description.
Two things it took a second round to get right. The rule applies to *every* bar family,
not just Winkelgriff — the first version hardcoded `fam === 'winkelgriff'`. And Keuco
spells the same article **`Brausestange`**, so testing `Duschgleitstange` alone let two
of them (`4171 284/285.501.000`) walk into the Klosett panel. The regex is duplicated in
`st-scraper/inject-ch4-accessibility.cjs`, which routes exactly these to the shower;
the test fails if the two spellings drift apart.

**`createRelationalApp`'s panel had no routing at all.** Duschenwanne / Duschenrinne /
Badewanne selected candidates from a hardcoded four-keyword `includes` scan and never
read `targetSubcats` — so the 118 articles tagged `badewanne` and the 105 tagged
`duschenwanne` were unreachable for as long as they had been tagged. The routed arm now
sits BESIDE the keyword scan (so the change can only ever ADD) and excludes the same
`DROPDOWN_TYPES`. Note the `isToiletApp` branch in that function is dead: those titles
are "Wandklosett System" / "Standklosett System" and the apps are `createWCApp`.

#### The Barrierefreiheit range — Ch4's HOLD bucket, and how it routes

`inject-ch4-accessories.js` parks the whole accessibility range in a `HOLD` bucket —
392 bases / 1168 SKUs that were scraped and never injected, so not one grab bar could be
ordered. `inject-ch4-winkelgriff.cjs` took the first family out (197 SKUs);
**`inject-ch4-accessibility.cjs`** takes the remaining 971, across 17 productTypes
(Haltegriff 381 · Eckhaltegriff 138 · Duschhandlauf 106 · Winkelgriff 70 ·
Rückenstütze 62 · Duschsitz 44 · Stützklappgriff 42 · Duschhocker 42 · Klappgriff 42 ·
Duschklappsitz 21 · Wannengriff 8 · Seitenwandgriff 6 · Armlehne 5 · and five singles).

- **The rail picks the ROOM, it does not drop the article.** The Winkelgriff script read
  "not WC kit" as "hold it back", which left 70 SKUs invisible; a bar with an integrated
  shower rail is a *shower* accessory, so it is routed there instead. It never reaches
  the Gleitstange dropdown — that group reads `productType`, and these are bars.
- **The plain bars go to all three rooms** (`wandklosett standklosett duschenmischer
  duschenwanne bademischer badewanne`): nothing in a Haltegriff's text picks a room.
- **`Mobiler Klappsitz` is a shower seat, not a Klappgriff.** Longest-prefix-first in
  the FAMILIES table is what keeps a bare `mobiler` from eating it.
- The 42 `Mobiler Klappgriff` follow the 154 Klappgriffe already in the pool and include
  `bidet` — one productType with two different routes reads as an oversight.
- `Stand WC-Garnitur Neoperl Florida` is the one article in that bucket that is not
  accessibility at all; the HOLD list's bare `'Stand'` prefix swept it up. It goes in as
  WC-Zubehör.
- **⚠ Do not run `inject-ch4-accessories.js` to do any of this.** It predates
  `_dataFile.cjs` and writes `JSON.stringify(data)` with bare `fs` — minified AND
  un-interned. One run undoes ~20 MB of interning and buries the change in a whole-file
  diff.

### A Klappgriff is delivered without its anchors — and the anchor is the WALL

Covered by `tests/verify-accessibility-routing.js` (part of `npm test`).

"Klappgriff Hewi 801, A 60 cm, **ohne Befestigungsmaterial**, Zubehör:
Befestigungsmaterial" — SAP offers five, and they differ by what you drill into
(Beton · Leichtbeton/Lochziegel · Leichtbauwand · Hohlblockstein · Vorwandmontage).
Only the installer knows, so it is a **forced pick, never a default**: the row opens on
"— Befestigung wählen —", is flagged `Auswahl erforderlich`, and contributes **nothing**
to the SAP export until answered. No memory across rows — one Stückliste can span two
walls, and a remembered answer silently orders the wrong anchor for the second bar.

- **⚠ EVERY MANUFACTURER SHIPS ITS OWN.** Hewi takes `4711 179/180/187/189/190`, Nosag
  `4721 187/188` — no overlap. The options live **per article** (`fixingOptions` /
  `plateOptions` on the tray, written by `st-scraper/inject-klapp-fixings.cjs` from SAP's
  `additionalMaterials`), so the pairing is right by construction. **Never** derive it
  from a `Befestigungsmaterial` family filtered by brand: that is what eventually puts a
  Hewi anchor under a Nosag bar. A test fails if any article offers anchors from an
  unrelated 4-digit family.
- **A Rückenstütze mounts either on a Klappgriff or to the wall.** 7 of its 24 bases say
  "ohne Befestigungsmaterial" (13 SKUs); 10 ship it included, 7 state nothing. SAP named
  **six anchors that existed nowhere in the data** — `4711 178/185/186` (1-teilig, for the
  back-rests that mount on a Klappgriff) and `4711 290/291/292` (2-teilig; 290 says *"zu
  Rückenstütze"* outright). The four Hewi 801/805 bases offer both sets per wall — SAP's
  own list, and a real choice; the piece count is in each option's text.
- **⚠ THE PARTNER-REFERENCE TRAP, and this family walks into it.** A Rückenstütze's SAP
  Zubehör group carries **30 Klappgriff entries** — the bars it fits, not its screws. The
  identity-prefix filter drops them, and a test fails if any Rückenstütze ever offers a
  non-`Befestigungsmaterial` as a fixing. Offering a CHF 500 grab bar where a CHF 45
  anchor belongs is the failure mode.
- **A Duschhandlauf needs NOTHING — and that is why it has an OPTIONAL row, not a forced
  one.** Not one of its 37 bases says "ohne Befestigungsmaterial": the Keuco rails say
  *"mit Befestigungsmaterial, Set Nr. 1"*, Nosag Verso Care *"inkl."*, and ten Hewi/Nosag
  bases state nothing. What 18 Keuco Collection Axess bases (54 SKUs) do offer is two
  **alternative** sets for substrates Set Nr. 1 will not hold in (`4171 442` Nr. 4,
  `4171 444` Nr. 7). `fixingOptional` + `fixingSupplied` render a row that opens on
  "Set Nr. 1 (mitgeliefert)", is **not** flagged incomplete, and adds **no SAP line** until
  switched. A forced pick here would order a second fixing set for every rail.
- **⚠ The fixing select must NOT carry `inline-bom-select`.** Three factories bind their
  own `change` handler to every `.inline-bom-select` in the BOM and read it as a
  mounting-material pick; with that class their handler fired on the fixing select too and
  wiped `selectedAddonAccessoires` — accessory and fixing row both vanished on the first
  choice, the total dropped back, and nothing threw or logged. The styling is inline, so
  the class bought nothing. Guarded by a test.
- **Scope is Klappgriff / Stützklappgriff / Klappsitz / Rückenstütze / Duschhandlauf.** Haltegriff, Winkelgriff and
  Eckhaltegriff ship WITH their material — SAP agrees, a Haltegriff Hewi 801 names no
  `additionalMaterials` at all. An **Einhängesitz hangs on a Winkelgriff** and needs none.
  A **Duschhocker stands on the floor**: all 21 bases were queried and SAP names zero
  fixings across the family, none says "ohne Befestigungsmaterial", and 19 describe a
  Gestell / Beine / höhenverstellbar — the only partner reference in the whole family is a
  Sitzkissen. A **Seitenwandgriff** likewise: 5 bases, zero fixings named, and only the
  KWC one mentions material at all ("Befestigungsmaterial für Beton" — included).
  The sharpest proof of the whole scope sits inside ONE Hewi series: of the 805 articles
  that say "ohne Befestigungsmaterial", **all 13 are Klappgriff** — its Haltegriff,
  Winkelgriff, Eckhaltegriff, Rückenstütze and Seitenwandgriff say nothing of the kind.
  A test fails if any of those six families gains a fixing list.
- **The Montageplatte row comes FIRST**, and it is a different part, not an alternative:
  the plate's own text says "ohne Befestigungsmaterial, Zubehör: … siehe 4711 187 - 190".
  124 SKUs get both rows.
- **SAP's `Zubehör` group is a mixed bag.** Of the 52 articles it named, 28 are anchors,
  13 are plates and **11 are unrelated** (Papierhalter, Rückenstütze, Armlehne,
  Abdeckplatte). The split is an identity PREFIX on the leading noun; offering a
  Papierhalter as a screw option would be nonsense.
- **A PLATE CARRIES THE ANCHORS when the bar names none.** The plate is what gets
  screwed to the wall, so its own `additionalMaterials` hold the Befestigungsmaterial —
  `plateFixings` in `klapp-fixings.json`, read off each plate, **not** parsed out of its
  "Zubehör: Befestigungsmaterial siehe 4721 795 - 798" text. That is what takes the six
  Nosag Verso Care Klappgriffe (12 SKUs) off the warning row: `4722 241` names
  `4721 795/796/798`, all Nosag, all already injected. 4 of the 13 plates carry a list.
- **"ohne Befestigungsmaterial" is a property of the MODEL, not of one finish.** Only the
  `.100` variants of that family carry the phrase, so a per-SKU test warned on six SKUs
  and stayed silent on their six identical `.337` twins. Decided once per base; a test
  fails if two finishes of one model ever offer different anchors.
- **A Duschklappsitz mostly needs nothing, and the reason must be readable.** 127 SKUs
  split three ways — 93 get a dropdown, **27 hang on a grab bar** ("zum Einhängen"), 7
  ship the material included (Inda, Neoperl, KWC Contina). A test fails if any one falls
  outside all three: an article explained by none is one nobody decided about.
- **⚠ 170 trays from the old `inject-ch4-accessories.js` carried NO `description`**, so
  the GLOBAL RULE had only SAP's short text — truncated ~80 chars, 61 of them severed
  mid-phrase. The worst read `"… anthrazit, zum , Silberfarbig"`, the missing word being
  *Einhängen*; 15 Nosag Klappsitze were excluded from the anchor rule by ACCIDENT rather
  than by it. `st-scraper/heal-ch4-descriptions.cjs` fills them from SAP's own
  `description` field and never overwrites an existing one. A test now fails if any tray
  in this range lacks a description.
- **Silence is not always a gap.** 14 SKUs get no row because their own text says the
  material is included (Inda, Neoperl, KWC Contina) — SAP's silence and the article text
  agree in every case. No article needs the **warning row** today, but the path stays and
  a test fails if it is removed: the next data gap must not silently render nothing.
- Rendering lives in `_shared.js` (`klappFixingPlan`, `klappFixingRowsHTML`,
  `klappFixingSapLines`) with **one** delegated `change` listener keyed on
  `window.__klappFixDelegateInstalled` — a module-level guard is per-instance under
  Vite's `?v=`/`?t=` URLs. Five factories render the rows; `clearKlappPick` must run
  wherever a selection is reset.

**`article.ws` needs a SESSION, not a login.** A plain `https.get` returns `NOSESSION`;
the `sap-usercontext` / `sap-appcontext` cookies an ordinary page visit sets are enough,
so this is reachable anonymously and needs no credentials. Those two are readable from
`document.cookie`, which is how a Node script can use the same guest session — pass them
in the environment, never commit a value, never use a personal login. `result.additionalMaterials` carries `Z` Zubehör ·
`M` Montage · `E` Ersatzteile · `S` Stücklisten. Raw data in
`st-scraper/klapp-fixings.json` (base → options) and `klapp-fixing-details.json`
(label, description, price, image) — 110 bases + 41 detail calls, 0 errors.

### Accessory colour matching — one helper, both Mischer apps

A coloured Armatur wants its Anschlussbogen / Brauseschlauch / Handbrause /
Regenbrause / Brausearm / Gleitstange in the **same finish**, and the finish is the
art-Nr triplet (COLOUR RULE), never label text. `_shared.js` owns the whole rule:

- **`accFamilyOf(groupName)`** — mounting-group name → the pool's `productType`
  (`"3. Anschlussbogen"` → `Anschlussbogen`, `Handbrausegarnitur` → `Handbrause`,
  `Deckenanschluss` → `Brausearm`). Reads a *group* name, not a product, so the
  full-text rule doesn't apply; the pool side matches the structured field.
- **`accCandidates(family, brand, code, {serie, prefer, avoid})`** — ranked SKUs:
  **1** own brand + right colour · **2** any brand + right colour · **3** own brand
  in another colour, and tier 3 *only* when the family has nothing in that colour
  at all (Gessi builds no coloured Anschlussbogen — that gap is what used to leave
  the row sitting on the Alterna chrome standard).
- **`accGroupChoice(group, opts)`** — what the BOM row shows *and* the merged
  `<optgroup>` markup: colour candidates first, the curated/ERP options under
  `Standard`. Default = best colour match, **except** on chrome 501 (the house
  standards already are chrome) and on an `Ohne …` default (an optional group stays
  off). `opts.used` stops two groups of one family auto-matching the same SKU.
- **`accSkuInColour(family, artNr, code)`** — a user's pick is stored as a MODEL, so
  changing the mixer's finish keeps the part and swaps its colour.

State lives in `app.accPick[groupIdx]`: `{k:'std',i}` or `{k:'pool',art}`; an explicit
pick always outranks the auto-match. Reset it wherever `mischerOptionsState` is reset.
Any rule that reads one group to decide another's visibility must go through
`app.effectiveMat(idx)`, or it judges a part the BOM no longer shows.

**Never freeze a colour-matched row again** — the previous `matchAccessory()` replaced
the row with a single SKU and dropped its dropdown, so hose length, hand-shower design
and rain head became unchangeable. Covered by `tests/verify-accessory-colormatch.js`.

### Serie pills — one cleaner, all apps

ERP `serie` strings carry the product type in FRONT ("Wanneneinlauf Vaia",
"Wandmischer-Endmontageset Torino") and the variant BEHIND ("Moderna R Compact
rimless", "Metris 110", "Habito-Standmodell"). A pill wants neither, or one product
line spreads over a dozen pills — Wandklosett had 52 pills for 78 products.

**`cleanSerie(raw)`** in `_shared.js` is the single cleaner: peel type prefixes
(`SERIE_TYPE_PREFIXES`, longest match, repeated), then strip variant suffixes
(`SERIE_VARIANT_RE`), then alias (`SERIE_ALIASES`, e.g. Subway 2 → Subway 2.0). It is
idempotent — safe to call on an already-clean pill. Order matters: prefixes come off
FIRST, because a series can be a bare number (Gessi "316") that the trailing-dimension
rule would otherwise eat. When nothing survives underneath, the peeled type becomes
the pill, so the five "Wandbatterie Set 125/175/200/225/250 mm" share one.

Called at the end of `extractSerie` in `createWCApp`, `createWaschtischMischerApp`
(also Spültischmischer) and of `normalizeBademischerSerie` /
`normalizeDuschenmischerSerie`. Watch the words that are variants in one line and the
name itself in another: "Classic" is a variant on "Moderna S Classic" but the name on
Catalano "New Classic" — that rule only fires when a two-word series survives.

### Gallery UX — one product grid, all apps

`config.enableGalleryUX` swaps the cramped sidebar hit-list for a tile grid in the
main panel. Twelve apps are on it; nine draw their tiles from the shared helper —
Duschenwanne, Badewanne, Duschenrinne, Waschtröge, Wandklosett, Standklosett,
Waschtisch, Waschtischmischer, Spültischmischer.

That helper is **`renderGalleryGrid(items, {idOf, lines, cap})`** in `_shared.js`:
a 70×90 thumbnail beside the text, `minmax(320px, 1fr)` columns, capped at 150 with
a "bitte filtern" note. Geometry lives there and nowhere else — `createWCApp` had
grown its own stacked card with a full-width 160px image, so the two WCs looked
nothing like the wannen. **Never hand-roll another grid**: call the helper and pass
`lines` for the one or two app-specific detail rows. `galleryBackButton(show)` owns
the "Zurück zur Übersicht" button, and `renderGalleryGrid` hides it for you, since
the grid being up means nothing is being configured.

Bademischer, Duschenmischer and Duschtrennwand (`createGlassApp`) still build their
own cards inside an identical `minmax(320px, 1fr)` wrapper — same size, duplicated
code. Migrate them to the helper when you next touch them.

Turning gallery UX on for an app means its sidebar configurator is hidden, so **every
selectable group must become an inline `<select class="inline-bom-select">` in its own
BOM row** — including groups parked on "— keine —", or that choice becomes unreachable.
Each factory does this in its own `updateBOM`; `createRelationalApp` has four BOM
branches (Standklosett / Wanne / Rinne / OTHER) and the inline path has to be wired in
whichever one the app's title falls into.

## Data layer

- The product database is **`custom-data.json`** (tracked, **~36 MB on disk**, ~55 MB
  expanded). It is the source of truth for article numbers, labels, prices, services,
  and rules. "Healing" labels in this file is a routine maintenance task. It is too big
  to read or grep whole — go through `node -e` and address it by top-level pool. Merge
  conflicts in it are best resolved **per pool** (separate workstreams inject into
  separate pools, so the edits are usually disjoint), never textually.
  **Write it with `JSON.stringify(data, null, 2)`** — anything else reformats all
  94k records and buries the real change in a whole-file diff.

  ### ⚠ It is stored INTERNED — never read it with plain `fs`

  Every tray used to carry its own full copy of the same options: 29,779
  `mountingMaterials` options were copies of **1,894** distinct objects, and 16,956
  `services` copies of **279**. They now live once in top-level `_options` / `_services`
  tables and each tray holds the **key string** (`"o412"`). Read the file raw and
  `group.options[0].label` is `undefined` — a classifier silently matches nothing and an
  injector happily writes a duplicate.

  - **Scripts:** `const { readData, writeData } = require('./_dataFile.cjs')`.
    `readData()` expands, `writeData(data)` re-interns + backs up + holds indent 2.
    33 scripts are migrated; the handful that were not are listed in that file's header
    and none of them inspect an option or service object.
  - **Runtime:** `modules/dataHydrate.js#expandData` is called once in
    `app.js#applyDataToApps`, which covers all THREE load paths (`/api/data`, the
    bundled gz blob, the IndexedDB backup).
  - **Saving from the admin panel:** `/api/save` in `vite.config.js` re-interns before
    writing, or the first save undoes ~20 MB of it.
  - **The keys are SEEDED from the file being replaced, and must stay that way.**
    `internData(data, {seed})` hands an unchanged option the key it already had;
    `writeData` passes `diskTables()` and `/api/save` does the same. Without the seed
    keys are reassigned in first-encounter order on every write, so deleting one option
    low in the table renumbers every key above it — dropping 4 trays + 2 options wrote a
    **24,000-line diff with 752 keys changing meaning**, against 660 lines and none
    with it. A new option takes a fresh key above the highest; an option nobody
    references drops out. If you ever call `internData` directly, pass a seed.
  - **Tests that read the file must expand it too** — `verify-duschtrennwand` and
    `verify-servicepaket` do; forgetting it makes every service rule test nothing while
    still reporting green-ish failures.
  - Expanding is idempotent and tolerant: an already-expanded file, an old IndexedDB
    backup and a half-migrated file all load. Each reference expands into its OWN copy,
    so an in-place edit of one tray's option cannot leak into another's.
  - Guarded by `tests/verify-data-intern.js`, which pins the ESM and CommonJS
    expanders against each other (they exist separately because the `.cjs` injectors
    cannot import ESM synchronously).

  Together with the redundant-`description` prune
  (`st-scraper/prune-redundant-descriptions.mjs`, 24,265 fields that the label already
  contained), this took the file from **59.48 MB to 36.13 MB**. The remaining lever is
  splitting per pool — `zubehoer_pool` alone is ~16 MB of it.
- **`tech` — SAP's structured attributes.** A flat map on ~32k records
  (`{Marke, Serie, Ausprägung, Breite, Höhe, Modell, Montage, …}`) written by
  `st-scraper/apply-refetched-text.cjs`. Stored flat, not as an array of objects:
  the array form costs +16.3 MB against this file, the flat map +5.1 MB. Kept OUT
  of `specs` on purpose — `productText()` feeds classification from
  label+description+specs, so putting them there would silently move every
  series/type decision. Four labels are dropped at ingest (`Volumen`, `Gewicht`,
  `Geräuschgruppe`, `Energieeffizienzklasse`) as non-criteria.

### SAP short text is TWO fields — the label-truncation root cause

`article.ws` splits the short text across `maktx` **and `maktx2`**, ~40 chars each:

    maktx : "Wandbecken Alterna calea, 45 x 36 cm,"
    maktx2: "Armaturenloch, mit Überlauf, Weiss"

Reading only `maktx` yields a label cut off mid-sentence — that is where the
truncated labels came from, not from any gap at the vendor. The structured
attributes live under **`technicalInformations`**; `tech` is merely the name used
in the post-processed `catalogue-inspection/*-api.json` dumps, so looking for
`tech` on a live response silently yields nothing.
`tests/verify-scraper-maktx2.js` guards every script that reads the API directly
and fails `npm test` if a `maktx`-only read reappears.

**Label re-scrape pipeline** (`st-scraper/`), in order:
`audit-truncated-labels.cjs` → work-list + shards ·
`run-refetch-all.sh` → session pre-flight + parallel fetch ·
`apply-refetched-text.cjs` → dry-run by default, `--write` backs up first.
The SAP session behind `cookie.txt` lives ~20-30 min; refresh it immediately
before starting, and note `cookie.txt` has a `#` comment header that must be
stripped before use (an em-dash in it throws `ERR_INVALID_CHAR`).
- **Dev:** read/written via a Vite middleware in `vite.config.js`
  (`GET /api/data`, `POST /api/save`).
- **Prod (single-file):** there is no server; state persists in `localStorage`
  (e.g. `sanitas_wishlist`).
- **`skippedUnresolved` was a work-list, not a verdict — and it is now empty.**
  `inject-ch2-waschtisch.cjs` parked 29 bases because neither the variant scrape nor
  `ch2-api.json` could resolve a full art-Nr (the API dump holds every one of those
  keys with the value **null**, so nothing was ever coming). All 29 are in now:
  **`inject-ch2-progetto.cjs`** — 6 bases / 12 SKUs, Waschtischkombination Alterna
  progetto 46, the house's own combination, absent for as long as Laufen's and
  Duravit's were in. **`inject-ch2-unresolved.cjs`** — the other 23 / 118 SKUs
  (5 Waschtischkombination Laufen Pro S, 16 Auflegewaschtisch Catalano Zero/Sfera/Green,
  2 Villeroy & Boch Antao).
  The source is the catalogue's own `Farbe:` tail, which states the finish codes AND
  their net prices — a stated art-Nr, not a synthesized one. Four things any
  catalogue-sourced injector has to get right, all of them learned the hard way here:
  - **Heal the PDF's soft hyphens** (`Armaturenlö‐ cher` → `Armaturenlöcher`).
    `productText()` normalises that hyphen to ASCII and would keep the split word forever.
  - **Cut the `Farbe: … Zubehör` price tail** off `description`, or every classifier
    reads "379 871" as product text.
  - **A price can look like a colour code.** With the "202: Cleaneffekt" marker lifted
    out, "… 227, 228,  322.— 348.10" leaves the net price exactly where the next code
    would be and a greedy comma-run swallows it — that is how a phantom
    `2231 640.322.000` appeared. A 3-digit token immediately followed by `.—` or a
    decimal is a PRICE.
  - **⚠ THE CATALOGUE CANNOT BE TRUSTED FOR THE ART-NR — only the shop can.** The
    expensive lesson of this exercise. "202: Cleaneffekt" was read as a stray legend
    token, and the evidence looked conclusive: 202 is in no article, no price key, and
    not in the 339-code Farbschlüssel. It is the **THIRD art-Nr group** — the coating.
    The shop serves `PG1/02231638_536_202.png`, so the real SKU is
    `2231 638.536.202`, not the `…536.000` that went in. **78 wrong art-Nrs were
    injected** and only `scrape-ch7-images.cjs` caught them. The reconstructed colour
    LISTS were wrong too: catalogue said {228,423,535,536} for `2231 638`, the shop
    shows {172,226,423,535,536} — not a subset, not a superset, different.
    **So: scrape the images before believing a Farbe list.** The filenames carry the
    full 13-digit art-Nr, one page visit returns the whole variant matrix, and it needs
    no login. `inject-ch2-unresolved.cjs` now treats `ch2-gap-images.json` as
    authoritative and uses the catalogue only for specs and the two price tiers; with
    no scrape it emits ONLY the tier-1 finish and holds the coloured SKUs back. It also
    PURGES any art-Nr under a handled base that the shop does not list — that is how
    the 78 went away.
  **The VAT gate**: every printed net/gross pair must satisfy gross ≈ net × 1.081, and
  every colour must resolve in COLOR_NAMES, or the base is reported and skipped. 39/39
  pass. Note what it can and cannot do — it proved the numbers were prices, and it
  could never have caught the third-group error above.
  Labels carry the discriminators (`2112 273` vs `274` are both 120 cm, `2231 641` vs
  `642` both Ø 42): three BOM lines that read alike are three chances to order the
  wrong one. Images: all 143 SKUs carry a scraped PG1 shot, localised to `public/img`.
- **Chapter 3 injection (Einzelsanitärapparate + Installationssysteme).** 887 articles,
  the largest single injection. Routing is owned by **`st-scraper/classify-ch3.cjs`**
  (`classify(entry)` → `waschtisch` | `wandklosett` | `standklosett` | `urinoir` |
  `zubehoer_pool` | `skip`); `inject-ch3.cjs` carries no routing rules of its own and is
  **idempotent** — a re-run refreshes the trays it already wrote (variants, mounting,
  `serie`) instead of duplicating them, which is how a later variant re-scrape gets folded
  in. Hebeanlagen are excluded by decision (40 articles, incl. their SFA-brand accessories).
  Thumbnails: `localize-ch3.cjs` → `localize_fetch.py` → `localize-ch3.cjs --rewrite`.
  Final: **924 products / 933 variant SKUs**, after the variant scrape was taken from 305 to
  all 1046 bases (`CHAPTER=3 AGENTS=8 ONLY_BASES=… node scrape-armaturen-variants.js`, then
  re-run the injector). 23 bases stay out — the shop has no page for them, and fabricating a
  finish triplet would put a wrong art-Nr into an order.
  **Gotcha:** in `chapter-N-variants-scraped.json`, `variants` is an OBJECT keyed by art-Nr,
  not an array — `Array.isArray(v.variants)` counts 0 SKUs and makes the file look empty.
- **Ch4 `HOLD` is a work-list, not a verdict** — the same lesson as Ch2's
  `skippedUnresolved`. `inject-ch4-accessories.js` parks the whole accessibility range
  (Haltegriff, Winkelgriff, Eckhaltegriff, Stützklappgriff, Duschhandlauf, Badewannensitz …)
  in a `HOLD` bucket that is scraped but never injected. **`inject-ch4-winkelgriff.cjs`**
  takes the first family out of it: 94 scraped bases → **197 SKUs** (Hewi 86 · Nosag 81 ·
  Keuco 22 · KWC 8) tagged `productType: Winkelgriff`, routed to `wandklosett` +
  `standklosett`. 22 bases stay held — a Winkelgriff carrying a **Duschgleitstange** is a
  shower rail on a grab bar, not WC kit. It is a separate script because the old one routes
  per BASE and this rule is per SKU.
  **`HOLD` is now empty.** `inject-ch4-accessibility.cjs` took the remaining 971 SKUs and
  those 22 held bases with them — see "The Barrierefreiheit range" under the Accessoires
  panel for the routing, and note the rail no longer holds an article back, it picks the
  room. A re-run of `inject-ch4-accessories.js` still reports `HOLD: 392`; that is its own
  bucket, not the state of the data.
  **Two traps it hit, both already in this file's rules:** a synthesized PG1 URL is a
  recorded 404 — 71 of 201 were, because these bases publish one image for a whole colour
  RANGE (`04711120_100-339_000.png`) or a bare per-base shot (`04722520.png`), neither of
  which the art-Nr triplet can produce; `scrape-ch7-images.cjs` (anonymous, reads the URL
  from the DOM) resolved all 40 in one pass. And re-running must never re-judge a local
  `img/` path — it exists only because the localiser already fetched and size-checked it.
- **`urinoir` is its own pool + subcategory** (Klosett → Urinoir, after Bidet), 41 urinals
  built on `createWCApp`: a urinal is a ceramic plus the accessories the catalogue pairs
  with it (Steuerung, Absaugesiphon, Trennwand, Dübelschraube), which is exactly what that
  factory renders from `mountingMaterials`. Its `form` field carries Verdeckt/Sichtbar, the
  same meaning the WC trays give it. `cleanSerie` peels the `urinoir*` type prefixes, so
  "Urinoiranlage Laufen Lema" and "Urinoir Laufen Lema" share one pill.
- **`spueltischmischer` is its own pool + subcategory.** 120 kitchen mixers
  (118 `Spültischmischer …`, 2 `Standventil … für Spültisch`) had been scraped into
  `waschtischmischer.trays`, where they polluted both the Waschtischmischer
  configurator and Mix & Match (MM's Armatur column is fed from
  `productApps.waschtischmischer.trays`, `app.js#openConfigurator`). They now live
  under their own top-level key, surfaced by the **Spültischmischer** subcategory
  under Waschplatz (`modules/data.js`) via its own `createWaschtischMischerApp`
  instance. `applyDataToApps` matches data key → `productApps` key, so registering
  the app is all that is needed to feed it. Don't let a re-scrape/inject drop kitchen
  mixers back into `waschtischmischer` — `tests/verify-no-kitchen-in-waschtischmischer.js`
  fails `npm test` (and `npm run build`) if one reappears.
  Its Accessoires panel is empty **by design for now**: `renderAccessoiresPanel`
  selects from `zubehoer_pool` by `targetSubcats.includes(subcatKey)` and nothing is
  tagged `spueltischmischer` yet.

### Images — judge by BANK, never by filename

`_nV`, `_100_000` and `_000_000` look like placeholder markers and mean the
exact opposite. They sat on the blocklist in every image fetcher for months:

- **`_nV`** — the per-article technical drawing profishop itself renders as the
  primary listing thumbnail. Blocking it is why 1,673 Duschtrennwand slots once
  shared 12 bathroom scene photos.
- **`_000_000`** — the finish triplet of a **colourless** article: every
  Einbaukörper and Grundkörper in the catalogue.
- **`_100_000`** — the same mistake, caught a round earlier.

Together they name ~3,158 images that are on disk and referenced today. The
quality signal is the **bank**: `PS1/…_nV.png` is an 859-byte blank while
`PG1/…_nV.png` is the real ~26 KB drawing — *same basename, different bank*.

Two rules follow, both in **`st-scraper/_imagePick.cjs`** (`isDistinctive`,
`needsImage`, `bestImage`) — import it, never re-derive it. This filter had been
copied into every fetcher and the copies drifted with the same wrong list.

1. **A local `img/…` path is real, unconditionally.** It exists only because a
   scraper already fetched, decoded and size-checked it, and the local filenames
   literally contain `_nV` / `_000_000`. Re-judging them by name marked 23,321
   articles holding good images as needing a re-heal — and re-healing overwrites
   them. `isRealImg()` in `_shared.js` encodes the same rule for the runtime.
2. **Picking = take `result.image`, then upgrade to its PG1 twin** (same
   basename, PG1 bank) when the response actually carries one. That reproduces
   what the shop lists. Do *not* "take the best PG1 anywhere in `images[]`" — it
   swaps in a different picture than the shop shows. The twin must be present in
   the response; a synthesized PG1 URL is just a recorded 404.

`scrape-image-urls.js` knows this trap and gates re-scraping behind
`ONLY_EMPTY`. The `proxy` helpers in `inject-ch*.cjs` still carry the old list,
but they build `wsrv.nl` URLs — a path retired when localisation went direct.

**`scrape-ch7-images.cjs` is the image scraper to reach for, and it is not Ch7-only** —
`OUT=` points it at another chapter's file rather than forking it (every forked filter
in this toolkit drifted). It is **anonymous**: no login, no `cookie.txt`, so it works
where the `article.ws` API returns null. Two things make it worth running beyond images:
the URL is read from the DOM and never constructed, and the filename carries the full
13-digit art-Nr — which makes it the **ground truth for what SKUs actually exist**.
`all[]` returns every per-SKU image the page showed, so ONE visit covers a base's whole
variant matrix. Run it before trusting any catalogue-derived art-Nr:

```bash
BASES=2231638,2231640 OUT=ch2-gap-images.json node st-scraper/scrape-ch7-images.cjs
```

Then localise, or the data holds a remote URL that fires a vendor request on every
render: `localize-images.cjs --emit-jobs` → `localize_fetch.py` → `--rewrite`.

## Staying in sync — the catalogue moves, `custom-data.json` did not

Every injector in `st-scraper/` is a one-shot import of a chapter, so the data is a
photograph of the day it ran. The shop adds and drops articles continuously, and
nothing noticed: **143 art-Nrs a configurator can still put in a Stückliste are no
longer listed** (Schmidlin Aria 50, Catalano Sfera `.105`, Keuco Axess rails, Laufen
Easytouch, KWC F4LT…), and **1'179 prices have moved** — 1'108 of them UP, which is
money quoted away silently on every offer.

Two scripts close the loop. Both are REPORT-ONLY: routing an article into a pool is a
decision with rules and tests (`classify-ch3.cjs`, the injectors), and a script that
wrote `custom-data.json` from a diff would be an injector with neither.

```bash
npm run catalog:census     # ~8 min → st-scraper/census/<date>.json.gz
npm run catalog:diff       # instant → GONE / PRICE / UNCOVERED
node st-scraper/catalog-diff.cjs --since st-scraper/census/2026-08-15.json.gz
```

### `search.ws GET_CATALOG` is a full product feed, and it needs no login

The shop's catalogue browse is backed by a FACT-Finder service that hands back the
**entire** record, not a search-result stub — 26'971 masters / **92'741 SKUs in 135
requests, ~8 minutes**:

    POST /business(bD1kZSZjPTAwMQ==)/webservices/search.ws
         event=GET_CATALOG&is_options-rows=200&is_options-page=N

    hits[].variantValues[]   one entry PER SKU — the whole colour matrix
      ArticleNr · Price (exkl. MwSt, same basis as prices.json) · Availability
      Title · Description_short · Description_long · Brand · Warengruppe (= productType)
      Produktlinie · Farbe · VarDim_ColorCode · EAN · SupplierArticleNr · Montageart
      ImageURL   the REAL PG1 url, read from the vendor — never synthesized, so no 404s
      CategoryPath_lvl0..2 · RecoAccessories / RecoDownstream (related art-Nrs)

- **`rows` caps at 200** server-side; `rows=500` silently returns 200.
- **No credentials.** Like `article.ws` this needs a SESSION, not a login, and an
  ordinary anonymous page visit mints one — which is the whole reason it can run
  unattended. `cookie.txt` is a human refreshing a token every 20 minutes, and a
  weekly job cannot depend on that.
- **Never buffer the raw pages into one string.** 135 pages of FACT-Finder JSON is
  ~500 MB, past V8's max string length; the first run died at page 100 with
  `Invalid string length` and nothing written. The resume cache is one file per page.
- A census is ~98 MB raw / 7.5 MB gzipped. `census/` is **git-ignored** — it is
  reproducible in 8 minutes, and the last 8 are rotated automatically so a
  week-over-week `--since` always has a baseline.

### Two fields that look authoritative and are dead

`PublishingDate` is `2012/01/01` on every article and `FaceOffDate` is `2099/12/31`
on every article — both unmaintained in the vendor's index, so neither can date a
change or warn of an end-of-life. `IsNew` does vary (~6% "Ja") but it is a
merchandising badge, not a changelog. **The only trustworthy signal for what changed
is diffing two censuses.**

### How a dropped article actually looks

`article.ws` keeps answering `OK` with a full price long after an article is gone —
SAP's material master is history, not the assortment. The signature is elsewhere, and
two signals agree:

| | listed | dropped | purged |
|---|---|---|---|
| in the census | yes | **no** | no |
| `article.ws` `result.image` | a path | **empty** | empty |
| `article.ws` `status` | OK | OK | ERROR / `matnrDisplay: "ERROR"` |

So **absence from the census is the verdict**, and an empty `image` corroborates it.
A bogus art-Nr is its own case: the API answers OK with
`maktx: "EDIV - manueller Artikel"` and `matnrDisplay: "ERROR"`.

### What the diff cannot tell you

`UNCOVERED` (38'394 SKUs the shop lists that no configurator reaches) is a standing
backlog, not a weekly signal — most of it is deliberately out of scope (5'982
Ersatzteile, Hebeanlagen). Only `--since <previous census>` narrows it to what
genuinely appeared, which is the work-list worth reading. And the census indexes the
CATALOGUE: Montagepauschale / Demontage positions live outside it, so three of the
143 GONE are service lines that were never listed in the first place.

## GLOBAL RULE — full-text classification (no exceptions without a comment)

**Any logic that classifies, matches, or filters a product** (type, situation,
series, dimensions, config keywords, service selection) **must read the FULL
product text — `label` AND `description` AND `specs` values — never the label
alone.** ERP labels are truncated; the distinguishing keyword regularly lives
only in the description. Use `productText()` from `_shared.js` (or explicit
label+description concatenation) as the source for such checks.

- The **only** permitted exception: product-**identity** prefix checks (a label
  literally *starting with* "Seitenwand"/"Montagepauschale" states what the
  product IS). These must carry a `// label-prefix by design` comment.
- Beware the **partner-reference trap**: descriptions mention what a product
  *pairs with* ("zur Kombination mit Gleittüre") — strip/guard those before
  keyword-classifying, or an accessory becomes a door.
- Enforced by `tests/verify-fulltext-rule.js` (static source guard + behavioral
  fixtures; part of `npm test`, so `npm run build` fails on regression). When
  adding/migrating a classification function, ADD IT to the `GUARDED` list there.

## Mix & Match — what SAP receives

Covered by `tests/verify-mixmatch-rules.js` (part of `npm test`).

- **The set header is G1 or G4.** `setCodeFor(basin)` picks it. A
  **Waschtischkombination / Möbelkombination** (42 articles — Laufen Pro S,
  Duravit Happy D.2 Plus) is basin AND furniture under ONE art-Nr, and SAP books
  that as **G4**; everything else is G1 and nothing else about the set changes.
  The test is **`isWaschtischKombination`** in `_shared.js` — one rule, because the
  **Ausführung pill** in *both* basin configurators reads it too
  (`extractBasinTyp` in Mix & Match, `extractAusfuehrung` in `createWashbasinApp`,
  where it must be checked FIRST or a combination that is also a Doppelwaschtisch
  files under that instead). It is an identity-PREFIX check (the word is at the
  head of the short text, the one part truncation never eats) — deliberately not a
  full-text search, because a Möbelwaschtisch's description says "passend zur
  Waschtischkombination" and is not one. The copy button retitles itself in
  `updateBOM`; `app.js` writes "G1 kopieren" when the configurator opens, before a
  basin exists.
  53 combinations today: 42 Laufen/Duravit, six **Alterna progetto 46** and five more
  **Laufen Pro S** (`2112 267`–`274`) recovered from Ch2's `skippedUnresolved` — see
  the Data layer.
- **A round bowl has a width.** It states a DIAMETER and no Breite, and the `Ø` form
  is in both the label and the `size` field ("Ø 45"), so `extractBreite` read neither
  and 33 basins across Laufen Pro, Kartell, Gessi and Catalano fell into `unknown` —
  out of the Breite pill entirely. The diameter IS the width; `extractBreite` reads it
  now and `unknown` is down to 0 of 941.
- **TXK103 is a text position, not an article.** Furniture in the order adds it:
  under the Möbel line, under a Hochschrank/Seitenschrank, and for a G4
  combination (whose furniture is inside the ceramic's art-Nr) on the first line
  *after* the spacer — past the last Einbaukosten, so it never lands inside the
  G4 block that gets pasted as one set. `pushTextCode` emits it **once** per
  Stückliste. It carries NO quantity: `sapLine` exports it as a bare line with no
  tab and no Menge, and both the BOM row and the preview summary show "—".
- **A CWS dispenser needs its front Panel.** 24 dispensers (12 Paradise,
  12 PureLine) state "ohne Panel <name> <art-Nr>" in their own text;
  `requiredPanelFor` (`_shared.js`) reads that art-Nr — FULL-TEXT RULE, the label
  truncates long before the number, and ERP `<br>` tags are stripped first — and
  resolves the **white** SKU via `findPanelSku(base, '100')`. COLOUR RULE: white is
  the finish triplet 100, never a word; the seven colours a panel comes in are all
  real SKUs. The row goes directly under its dispenser. `4611 183.000.000` says
  "ohne Panel" and names nothing — the catalogue pairs it (p. 4.169) and
  `inject-cws-panels.cjs` writes that onto the article as `panelBase`. A panel that
  resolves to nothing renders a **visible warning row**, never a guessed art-Nr.
  The 13 Panel articles were injected by `st-scraper/inject-cws-panels.cjs`; five
  of them also had the *dispenser's* price bled onto them by the catalogue PDF
  parser (a CHF 199 panel), corrected there from the per-art-Nr shop scrape.
- **A Panel is never a standalone accessory choice.** Its label names the dispenser
  it serves ("Panel CWS Paper Slim, zu Papierhandtuchspender CWS Paradise …"), so
  the accessory keywords match it — the partner-reference trap. Guarded by a
  `^panel` identity prefix in `populateAddonPanel`.
- **A bin needs its Wandhalterung.** `requiredWallMountFor` puts the bracket
  directly under the bin. `WALL_MOUNT_BY_BASE` is an explicit pairing taken from the
  catalogue's own Zubehör list — the four CWS Papierkorb bases (`4611 611/612/861/862`)
  → **`4611 863`**, injected by `st-scraper/inject-cws-wandhalterung.cjs`. It is
  deliberately NOT inferred from text: nearly every Abfallbehälter says "freistehend
  oder Wandmontage" while no bracket exists to order, and the pool's five
  "Wandhalter*" articles all belong to Duschwischer and Geberit Duofix. The Paperbin
  Zubehör (`4611 876/877` …) look like brackets in a Zubehör column and are Deckel
  and Rahmen. Two bins sharing one bracket give ONE line at quantity 2.
- **Accessoires keyword map** (`populateAddonPanel`): `handtuchspender` alone
  covers Papier-/Stoff-/Rollenpapierhandtuchspender (81); `abfallbehälter` covers
  Papierabfallbehälter and the combined Papierhandtuchspender-Abfallbehälter (116);
  plus `papierkorb` (34). **`Hygieneabfallbehälter` is excluded** — WC sanitary
  disposal belongs to the WC app, and it ends in the same word.
- **The Accessoires scan is FULL-TEXT, guarded.** The match is
  `keyword in label` **OR** `keyword in withoutPartnerRefs(productText(t))`. The
  label arm is kept as its own arm so the change can only ever ADD. The description
  arm is what finds "Spenderkombination KWC Rodan RODX 617", which names
  Seifenspender + Papierhandtuchspender + Abfallbehälter nowhere in its truncated
  label; 12 articles are reachable only that way (5 Spenderkombination,
  4 Handtuchwärmer with integrated Handtuchhalter, 3 Duschablage).
  **`withoutPartnerRefs`** (`_shared.js`) is the trap guard: it blanks the noun
  after a zu/zur/zum/für marker plus any coordinated list ("zu Seifenspender **und**
  Handtuchhalter"), and stops at the first non-coordinator — so a Duschablage's
  "zur Glasbefestigung mit … und aussenliegendem Handtuchhalter" keeps the
  Handtuchhalter it genuinely is. Blanking to the next comma would swallow it.
  The mirror and Möbel toggles still match on the label alone; they were left
  alone on purpose (mirrors match by `productType` tag first).

## Accessory quantity — one store, one helper, eight apps

Covered by `tests/verify-accessory-quantity.js` (part of `npm test`).

A Glashalter is often needed twice and a hook four times, so a **picked accessory**
carries its own quantity, set with a `− n +` stepper in its own BOM row.

- **`app.accQty` is the store** — a map keyed by art-Nr, read through `accQty(app, item)`
  and written with `setAccQty` / `clearAccQty` in `_shared.js`. Keyed rather than stored
  on the selection entry because the eight apps **do not agree on what a selection is**:
  five keep objects (`selectedAddonAccessoires`), three keep bare art-Nr strings
  (`selectedAccessoires`). One map serves both without rewriting three toggle handlers.
  `accQty` accepts either an object or a bare art-Nr for that reason.
- Before this the same number had **four spellings**: a hardcoded `<strong>1</strong>`
  (Bademischer, Duschenmischer), `acc.menge || 1` (Waschtisch, Waschtischmischer),
  `a.qty || 1` (Bidet) and a hardcoded `menge: 1` (Wandklosett, Mix & Match, Relational).
- **Scope:** accessories only. Möbel, Schränke, Spiegelschrank *and mirrors* keep a fixed
  quantity of 1 — they are configured single units. They are still scaled by the copy
  dialog, which multiplies the whole Stückliste. Mounting-material / dropdown rows stay
  read-only: their quantities are curated (an Abstellverschraubung position is 2) and
  `packUnits` divides by pack size, so a user-set quantity there would fight
  `accGroupChoice`.
- **The quantity must not outlive the pick.** `clearAccQty` runs on de-select and every
  `selected*Accessoires = []` reset, or re-ticking an accessory restores the 4 you set an
  hour ago.

### `data-menge` — the row quantity CONTRACT

**FOUR** places recover a row's quantity, and every one of them used to parse the
rendered TEXT: `copyBOMToClipboard` (`_shared.js`), the DOM-scraping copy branch in
`createWCApp`, the one in `createGlassApp`, and the BOM → Eigene Selektion transfer in
`app.js`. All fell back to 1 on a failed parse, **silently** — and `createWCApp`'s did no
validation at all, so a `-` row shipped `code⇥-` to SAP.

`bomQtyCell(n)` emits `<td data-menge="n"><strong>n</strong></td>`; `rowMenge(tr)` reads
it and returns **null** when absent, so an un-migrated row keeps the old text path
exactly. Add a fifth reader and the test fails. `rowMenge` is also published on the
`window.*` bus, because `app.js` does not import `_shared.js`.

**A stepper in that cell is exactly what the text path cannot survive** — `"-2+"` parses
to nothing, the export ships ONE and the total bills ONE, with no error anywhere. That is
why the contract landed before the UI.

### The stepper, and how a row opts in

`bomQtyCell(n)` renders a read-only quantity; **`bomQtyCell(n, artNr)` renders the
`− n +` stepper.** Handing over the art-Nr is the only difference, so a factory opts a
row in and nothing else changes — and Möbel, Schränke, Spiegelschrank, mirrors and every
mounting-material row stay read-only simply by never passing one. The four generic row
renderers (Wandklosett, Relational, Mix & Match, Bidet) gate it on the row being tagged
an accessory (`typ === 'Accessoire'` / `isAccessory`); a test fails if that gate is
dropped, because an ungated `bomQtyCell(item.menge, item.artNr)` there would make every
furniture and mounting row editable.

The `<strong>` holds **only the digits** — the SAP export's fallback path reads the first
`<strong>` in the row, so the buttons must sit outside it or the export reads `-2+`.

One delegated `click` listener on `document` serves every stepper (`installAccQtyDelegate`
in `_shared.js`): the BOM tbody has its innerHTML replaced on each render, so anything
bound to a button dies immediately. It reads `window.currentActiveApp`, so a new
configurator inherits the behaviour without wiring, and it restores focus after
`updateBOM()` rebuilds the row.

**⚠ Mix & Match and Bidet never show the BOM table.** Both set the `mixmatch-active` body
class (`app.js#openConfigurator`), and `.mixmatch-active .bom-section { display: none }`.
Their Stückliste is the **grid** in `#col_preview`, rendered by `updatePreview()` — so a
`<td>` stepper is built, is correct, and is *invisible*, which is exactly how it first
shipped. `bomQtyInline(n, artNr, fallback)` is the same stepper without the table cell,
for that grid; the delegate calls `updatePreview()` alongside `updateBOM()`, or the number
the user is reading would not move. Their quantity column was `24px` — wide enough for
`3x`, not for a stepper — and is now `max-content`.

### ⚠ `_shared.js` IS EVALUATED MORE THAN ONCE — a module-level `let` is not a singleton

Vite serves this module under several URLs at the same time: the hand-bumped `?v=`
cache-busting chain plus its own `?t=` HMR stamps.

    /modules/factories/_shared.js?t=1786885214389&v=2.8.6
    /modules/factories/_shared.js?t=1786885214389
    /modules/factories/_shared.js?t=1786919099183

Each distinct URL is a **distinct module instance with its own module scope**. The
stepper's first guard was a module-level `let installed = false`, so every instance
installed its own listener and one click on `+` stepped the quantity two or three times.
Nothing threw, nothing logged — the only symptom was a wrong number in a real order.
**Any cross-instance singleton here must be keyed on `window`** (`window.__accQtyDelegateInstalled`),
and any DOM node cached in a module variable must adopt an existing node by id before
appending its own — which is what the Mengen-Multiplikator dialog now does.

### Two apps never copied their accessories at all

`createWashbasinApp` and `createWaschtischMischerApp` build their SAP lines from the tray
and its mounting groups only. Picked accessories were rendered in the BOM and counted in
the price total, then **silently dropped from the clipboard** — so a Glashalter was never
ordered. Both now append them (with `accQty`), and the test asserts it. Bidet copies from
`getBOMPreviewItems` and Relational delegates to `copyBOMToClipboard`, so both were fine.

## Mengen-Multiplikator — the quantity dialog on every copy

Covered by `tests/verify-copy-multiplier.js` (part of `npm test`).

Copying a Stückliste asks once how many times the configuration is needed and
multiplies the Menge column on the way to the clipboard — the same order three times
is one dialog, not three passes of hand-typing quantities in SAP.

- **There is exactly ONE `window.copyTextToClipboard`, in `_shared.js`.** All fourteen
  copy paths funnel through it, so the dialog is installed there and nowhere else and a
  new configurator inherits it for free. It used to be defined **twice** — `app.js` had
  a byte-identical copy, and since ES imports evaluate before the importing module's
  body, app.js silently won. A wrapper placed on the loser is dead code that throws
  nothing and logs nothing; the test now fails if a second definition reappears.
- **The MENGE is multiplied, never the line count.** Three of a configuration is four
  positions at ×3, not twelve positions. A position that already reads 2 becomes 6 —
  the position quantity is the base, not 1.
- **A line without a Menge column is never touched.** `TXK103` is a text position and
  carries no quantity by design (see Mix & Match above); the regex only matches
  `…⇥<digits>`, so multiplying it is impossible rather than merely avoided.
- **Factor 1 returns the payload byte for byte**, and text with no quantity column
  anywhere (a bare art-Nr, free text) never opens the dialog at all. That is what keeps
  "global" from meaning "changed everything".
- **The dialog resolves the text that was ACTUALLY written**, or `null` when cancelled.
  Every caller's "Kopiert: …" confirmation reads that resolved value — a caller that
  kept printing its own local variable would show the pre-dialog quantities and look
  like the multiplier had not run. `null` means stay silent: a cancelled copy is not an
  error and must not alert. Both are enforced by a static scan over the call sites.
- Cap is **99** — a typo of 300 for 3 must not reach SAP unbraked. The field always
  opens at 1 and preselected (one keystroke for an ordinary copy) and never carries a
  factor over from the last Stückliste; a forgotten 5 is an expensive mistake.
- The dialog is **built in JS from the app's own modal classes**, not added to
  `index.html`. One source of truth, no id collisions, and it cannot be half-removed by
  an HTML edit. It reuses an icon the app already ships — see the offline-assets note,
  the subset scan counts a mention in a comment too.

## Conventions & gotchas

- **`window.*` is the cross-module bus.** `app.js` exposes ~55 functions/state on
  `window` (e.g. `window.productApps`, `window.currentActiveApp`,
  `window.customWishlist`, `window.openConfigurator`). Some `window.*` functions are
  **load-bearing for inline `onclick=` handlers in `index.html`** — don't remove a
  global without also fixing its HTML caller.
- **Manual cache-busting:** imports/assets carry hand-bumped `?v=x.y.z` query strings.
  There are exactly six, in a chain — `grep -rn '?v=' index.html app.js modules/apps.js`
  finds all of them (values as of 2026-08-11; they drift, so grep rather than trust this
  list):
  - `index.html` → `app.js?v=3.0.0`, `index.css?v=1.1.12`
  - `app.js` → `modules/data.js?v=2.6.2`, `modules/apps.js?v=2.8.0`, `modules/admin.js?v=2.5.7`
  - `modules/apps.js` → `factories.js?v=2.8.0`

  This is a deliberate workflow; bump them when shipping if you rely on it. Bumping a
  module means bumping it at its **importer**, not inside the module itself.
  **Vite serves a `?v=`-tagged asset as `Cache-Control: max-age=31536000, immutable`,**
  so a browser that has loaded it once never re-fetches it until the version changes.
  Forget the bump and your edit simply does not exist for that browser — this cost a
  debugging round twice in one session: an `app.js` change that appeared to do nothing,
  and stepper CSS that rendered as unstyled 12px buttons. Sub-imports WITHOUT a `?v=`
  (everything under `modules/factories/`) refresh normally, which is why only the
  versioned entry points need touching.
- `st-scraper/` is a separate data-pipeline toolkit (scrapes vendor catalogs into
  `custom-data.json`). `_archive/` and `scratch/` are git-ignored throwaways.
- After touching `modules/factories/`, verify with: `npm test`, then load the dev
  server and open a couple of configurators (watch the console for `ReferenceError`).

## Accessory Combinations (Brausegarnitur & Regenbrause)

Applies to **all Duschenmischer and Bademischer** (not one montage type or brand). Both
rules live in `_shared.js` and are called from both factories' `updateBOM`; covered by
`tests/verify-accessory-colormatch.js`.

- **A "…-Set" bundle is not a TRAY.** `Duschmischer-Set KWC Wamas 2.0`
  (`6110 151.501.000`) is one art-Nr over a frozen Stückliste — mixer, Abstell-
  verschraubung, Handbrause, Brauseschlauch — which is the one thing a configurator
  tray must not be: the hose length and the hand-shower design are exactly what the
  user is here to pick. All **56** of them (28 Bademischer-Set + 28 Duschmischer-Set)
  were removed by `st-scraper/remove-mischer-sets.cjs`; every one's own mixer is in
  the catalogue as its own, configurable tray, and the script asserts that before it
  drops anything. A re-injection into these two pools must keep excluding them.
  Still standing, a pool this was not asked for: the 24 `Wandmischer-Set` trays in
  `waschtischmischer`. The Zubehör pool's `Wasseranschluss-Set` / `WC-Set` /
  `Regulierventil-Set` are single articles, not bundled configurations — leave them.
- **A set is only ever offered by the bundle row.** No part dropdown may list one —
  it is three articles under one art-Nr, so picking it beside the individual rows
  double-charges the hose. Two gates enforce it, and both are needed: `accPoolOf`
  withholds sets from **every** part family (not just `Handbrause`), and
  `accGroupChoice` hides a set that a curated/ERP option list carries, keeping the
  surviving options on their **original indices** so a stored `{k:'std',i}` pick and
  `mischerOptionsState` cannot slide onto a different article.
- **The bundle row sits directly under the Handbrause** — it is the alternative to that
  row. Three rank functions decide it and all three must agree: `ensureShowerGroups` in
  `_shared.js` plus the AP and UP sorts in `createDuschenmischerApp`. Each ranks by NAME,
  so each tests `isGarniturGroupName()` **before** its part rules —
  `"handbrausegarnitur".includes("handbrause")` is true and files the bundle row as a part.
- **A group NAMED for a set is the bundle row** (`RX_GARNITUR_GROUP`, used by
  `accFamilyOf`, `ensureShowerGroups` and the factory sorts via `isGarniturGroupName`). "Handbrausegarnitur" contains "Handbrause"
  and used to be read as the tray's hand-shower group — which cost three things at
  once on the 35 trays that ship one: no Handbrause row of their own, no Garnitur
  group for `brausegarniturPlan` to key off (the whole bundle rule was inert there),
  and a set pre-selected at options[0] next to the hose it contains. `ensureShowerGroups`
  now pulls the `Ohne …` option to the front of such a group (the set is never the
  default) and **merges** duplicates — Dornbracht ships the row under two spellings
  ("Handbrausegarnitur" + "Handbrausengarnitur") holding different articles.
- **Brausegarnitur Bundle Rule** — `brausegarniturPlan(materials, {brand, code, serie, picks})`
  returns `{idx, forceAuto, forceOhne, bundled, autoArt}`. `bundled` is
  `garniturCovers(chosen)` — the families **that** set actually contains, read off its
  own text: a hose set must not empty the `Gleitstange` row it never had, and Dornbracht
  `6431 725.501.000` says "ohne Handbrause" outright. `ACC_BUNDLED_BY_GARNITUR` is only
  the default (all four).
- **The bar is often only in SAP** (`garniturHasRail`). Half the sets never write
  "Gleitstange" — the bar IS the series name ("Unica'C, 900 mm"; Dornbracht "800 mm,
  Gelenkhalter"). `tech.Ausprägung` is a bare length for a bar set ("900 mm", "110 cm")
  while a hose set's carries the thread spec (`½" x ⅜", 1250 mm`), and `tech.Höhe` is the
  built height; ≥ **600 mm** is a bar (below that is hand-shower geometry). 8 of the 61
  sets are bar sets by this route only — without it a Unica'C set left a CHF 479 rail row
  standing beside itself. A length in the *label* alone still infers nothing: a wrong bar
  empties the row and ships an order without one.
- **Brausegarnitur Fallback** — the Garnitur is never the default *unless* a bundled part
  has no SKU in the mixer's finish **and a colour-matched Garnitur covers every missing
  part**. Axor Citterio M `6415 120.475.000` is the case: in `.475` there are 14
  Handbrausen, 5 Brauseschläuche, **0 Duschgleitstangen**, 3 Axor Garnituren. Without the
  second half of that condition the rule would empty three rows and put nothing in their
  place — and a *hose* set would pass a mere existence check while leaving the shower
  railless. The plan hands the row its `autoArt`, so the set the row fills with is the
  one the plan verified.
- A forced-off row renders as `Ohne …` **without a dropdown** (`choice.forcedOhne`) — the
  Garnitur row is the control, and a pick there would be overwritten on the next render.
  Not every group carries an `Ohne …` option (Handbrause and Gleitstange do not), so
  `accGroupChoice` **synthesizes** one; without that the rule silently skipped exactly the
  rows it was meant to switch off.
- **Regenbrause Einbaukörper Rule** — `requiredBodyFor(item)` reads `ohne Einbaukörper NNNN NNN`
  out of the **description** (FULL-TEXT RULE — the label truncates long before it) and
  `findArticleByBase` resolves it across every loaded pool, since the body usually sits in
  another category. The row is injected directly below the head and deduped against the
  BOM's existing art-Nrs (a mixer's own iBox must not appear twice). Across every pool,
  1161 SKUs name a body and **1159 resolve**; the rest render a **visible warning row**
  rather than a guessed art-Nr, because inventing a finish triplet puts a wrong part into
  a real order. ERP descriptions break lines *inside* the number (`6438<br>844`), so tags
  are stripped before matching — that alone took detection from 160 SKUs to 396.
  **The gap was never the rule, it was the catalogue.** 75 of those SKUs pointed at 21
  bodies that had simply never been injected, though 20 sat fully specified in
  `ch6-api.json`. `st-scraper/inject-ch6-named-bodies.cjs` closed it: it takes its
  work-list from the LIVE data (scan → unresolved bases → API dump), so a re-run after any
  future injection only adds what is still missing, and it cross-checks SAP's `matnr`
  against the shop's image filename before writing — a base the shop has no page for is
  reported and keeps its warning row (`6171 974` is the one). Not to be confused with
  `inject-ch6-einbaukoerper.cjs`, which attaches a body to UP mixers from the catalogue's
  own Zubehör bundles.
  Note the rule fires on the **chosen accessory**, not on the tray: a mixer whose own text
  says "ohne Einbaukörper NNNN NNN" gets its body from an `Einbaukörper` mounting group, and
  a tray that has neither shows no body row at all.
- **Regenbrause Brausearm Rule** — `requiredArmFor(head, {brand, code, used})`. The other
  half of what a head is sold without: "ohne Anschlussbogen" names **no art-Nr** at all,
  so `requiredBodyFor` never fired and 19 of the 178 pool heads could be swapped into a
  tray with no Brausearm row, leaving a Stückliste that cannot be mounted. The arm follows
  the **head's** brand (a Hansgrohe Raindance takes a Hansgrohe arm), the colour still
  follows the mixer, and wall vs ceiling follows whatever the head states — a ceiling
  connector cannot mount a wall head. Injected only when no Brausearm row is already
  standing (`effectiveMat`), and since the injected row has no dropdown it prints its own
  tier note; nothing at all in the catalogue is REPORTED, never invented.
- **A part sold FOR one body leaves with it** — `bodyPresentFor(item, usedArtNrs)`.
  "Befestigungsset Gessi, zu Einbaukörper 6252 861" has no purpose once that body is out
  of the BOM. 44 articles name their body this way, some as a shared-prefix list
  ("6252 820 / 826 / 850"), which `bodyRefsFor` expands. Note this is the Einbaukörper's
  set, NOT the Regenbrause's — swapping the head leaves it standing, correctly.

### A candidate must be a free-standing article, and the badge must be honest

- **`isSystemPart`** — a COMPONENT of another product is not an accessory. KWC
  `6545 114/115.501.000` is a "Duschgleitstange … für Duschsystem, **wasserführende**"
  (SAP agrees: `tech.Ausprägung: "für Duschsystem"`) — a water-carrying bar that only
  works inside its Duschsystem, and at CHF 479 it was the brand-matched default rail on
  every KWC mixer. Watch the partner-reference trap: the text must say what the article
  IS, not what it pairs with. Exactly 2 articles match today.
- **`Abstellverschraubung` is a family** whose pool articles carried **no `productType`** —
  a productType-only lookup found none, so the row never even got a dropdown.
  `ACC_POOL_LABEL` matches them by identity prefix as well (the permitted exception),
  and `st-scraper/inject-abstellverschraubung.cjs` tagged them and injected the rest:
  **4 chrome articles → 39 SKUs in 11 finishes**. That script reads TWO sources and
  reading only the first is why its first run came up short — the `ch6-api*.json` dumps
  carry the full SAP record but only ONE finish per article; the OTHER finishes live in
  `chapter-6-variants-scraped.json` (Edelstahloptik, Brushed copper/graphite, the PVD
  golds). Entries are written per 7-digit base with the rest as `variants`, which is
  what `accSkuInColour` needs to swap a chosen model's colour.
- **A thread is not interchangeable, so a mismatch is REMOVED, not ranked down**
  (`threadOf` + the new `opts.filter` on `accCandidates`). ½" x ¾" does not screw onto
  a ½" x ½" inlet; offering it anywhere in the list is offering the wrong part. An
  article that states no thread stays — there is nothing to contradict.
- **`packUnits(item)` — how many pieces one art-Nr delivers.** Alterna sells its stop
  valves as a "Set à 2 Stück", so the position that needs two takes **one** line, while
  a single-piece KWC valve takes two. `accGroupChoice` divides the position's `menge` by
  the pack size; getting this wrong bills four valves.
- **A swap must not change the POSITION's quantity.** `_accItem` stamps every pool part
  `menge: 1`, so colour-matching a Duschmischer's Abstellverschraubung silently ordered
  one stop valve instead of two. `accGroupChoice` now carries the curated option's
  quantity onto the matched article. All 88 mixer groups with `menge > 1` are this family.
- **No brand match → the HOUSE line is the standard** (`ACC_HOUSE_BRAND` = Alterna /
  Emporio, +3 in the ranking). Tier 2 is by definition another brand, and it used to be
  whichever the pool listed first — a Schwarz-matt KWC Ora opened on a CHF 519 Emporio
  rail while the Alterna one at CHF 282 sat further down. Inert in tiers 1 and 3, where
  every candidate already is the own brand.
- **Tier 4 = "Farbe abweichend": states a mismatch, claims nothing.** Tier 3 means "own
  brand, other colour", and it was being printed under a *Hansgrohe* set on a KWC mixer
  (a pool pick survives a finish change, and its brand need not match). Tier 4 also
  replaces the old SILENT tier 0 whenever a curated part's triplet differs from the
  mixer's — a chrome Alterna rail in a copper BOM with no badge reads as "matched".
  `000` is the colourless code and never counts as a mismatch.

### Pool tags do not equal these families

`accPoolOf` translates. Rails are tagged **both** `Gleitstange` (33) and `Duschgleitstange`
(96) — reading only the first missed three quarters of them and made the colour-gap check
above see a gap everywhere. A **Brausegarnitur has no tag at all**: all 58 sit under
`productType: Handbrause` and are found by text (`isGarniturSet`), then withheld from every
part family so a hand-shower row can never silently become a whole set.

`isGarniturSet` = a **Brause**-anchored Garnitur word (`brausen?garnitur|brauseset|duschset|
duschgarnitur` — a *Duschwannengarnitur* is a drain part) **and** a rail or a hose. Three
traps sit in that second half, all of them label-invisible:

- the hose is spelled four ways plus a typo — `Brauseschlauch`, `Brausenschlauch`,
  `Metallschlauch`, a bare `Schlauch 1750 mm`, and Dornbracht's `Brauseschaluch`
  (`6431 263.501.000`). Matching only the tidy spelling left three sets in the Handbrause row.
- **only the description says so.** "Handbrausegarnitur Fantini Fit ½", mit integiertem
  Brausenanschluss, Rosette" reads like one article until the description adds
  "Brauseschlauch 1500 mm, Handbrause Fantini Fit". Reading labels alone left **29** sets
  in the Handbrause dropdown — half of them.
- what a set does NOT say is not inferred. Dornbracht's `800 mm, Gelenkhalter,
  Arretierungshebel` family reads like a rail set but never states a rail; inferring one
  would switch off the `Gleitstange` row and ship an order without a rail, so it does not.
