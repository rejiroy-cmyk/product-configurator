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
- `npm test` — runs **7 suites, 175 assertions**: `verify-duschtrennwand` (38),
  `verify-all-apps` (16), `verify-shower-rules` (10), `verify-servicepaket` (7),
  `verify-fulltext-rule` (70), `verify-product-display` (30),
  `verify-no-kitchen-in-waschtischmischer` (4). Plain Node with hand-rolled DOM
  mocks — no jsdom, no test runner. (`tests/verify-pricing.mjs` is the one jsdom
  test and is NOT in the chain; neither are the `test_*.cjs` scratch files.)
  **Run this after any change to `modules/factories/`.**
- `npm run build` — `test` → `backup` → `vite build` → copies `dist` to `backups/`.
- `npm run backup` — snapshots `modules/`, `index.html`, `index.css` into `backups/`
  (now git-ignored; prefer git history).

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

## Data layer

- The product database is **`custom-data.json`** (tracked, **~45 MB / ~1.05 M lines**
  after the Ch2/Ch4/Ch5/Ch6 injections). It is the source of truth for article
  numbers, labels, prices, services, and rules. "Healing" labels in this file is a
  routine maintenance task. It is too big to read or grep whole — go through
  `node -e` and address it by top-level pool. Merge conflicts in it are best
  resolved **per pool** (separate workstreams inject into separate pools, so the
  edits are usually disjoint), never textually.
  **Write it with `JSON.stringify(data, null, 2)`** — anything else reformats all
  94k records and buries the real change in a whole-file diff.
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

## Conventions & gotchas

- **`window.*` is the cross-module bus.** `app.js` exposes ~55 functions/state on
  `window` (e.g. `window.productApps`, `window.currentActiveApp`,
  `window.customWishlist`, `window.openConfigurator`). Some `window.*` functions are
  **load-bearing for inline `onclick=` handlers in `index.html`** — don't remove a
  global without also fixing its HTML caller.
- **Manual cache-busting:** imports/assets carry hand-bumped `?v=x.y.z` query strings.
  There are exactly six, in a chain — `grep -rn '?v=' index.html app.js modules/apps.js`
  finds all of them (values as of 2026-08-09; they drift, so grep rather than trust this
  list):
  - `index.html` → `app.js?v=2.9.2`, `index.css?v=1.1.12`
  - `app.js` → `modules/data.js?v=2.6.1`, `modules/apps.js?v=2.7.2`, `modules/admin.js?v=2.5.6`
  - `modules/apps.js` → `factories.js?v=2.7.2`

  This is a deliberate workflow; bump them when shipping if you rely on it. Bumping a
  module means bumping it at its **importer**, not inside the module itself.
- `st-scraper/` is a separate data-pipeline toolkit (scrapes vendor catalogs into
  `custom-data.json`). `_archive/` and `scratch/` are git-ignored throwaways.
- After touching `modules/factories/`, verify with: `npm test`, then load the dev
  server and open a couple of configurators (watch the console for `ReferenceError`).
