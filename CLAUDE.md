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
- `npm test` — runs `tests/verify-duschtrennwand.js` (jsdom-based; ~37 assertions
  over the relational BOM rules). **Run this after any change to `modules/factories/`.**
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
- `index.js` — barrel that re-exports all 13 factories.
- `createRelationalApp.js` — the engine (~2.6k lines); most configurators are
  built on it. `createDuschenwanneApp`, `createDuschenrinneApp`, `createBadewanneApp`
  are thin wrappers that call it.
- Other factories: `createFinishesApp`, `createWashbasinApp`,
  `createWaschtischMischerApp`, `createMixAndMatchApp`, `createDuschenmischerApp`,
  `createBademischerApp`, `createStandardApp`, `createGlassApp`, `createWCApp`.

**Factory contract:** `create*App(title, desc, mainImgUrl, config = {})` returns an
app object exposing at least `init(...)`. `app.js#openConfigurator` sets
`window.currentActiveApp` and calls `init()`, which renders the sidebar selectors and
the BOM table.

When editing a factory, each file imports the **full** shared set from `./_shared.js`
— keep that import line intact when adding code that uses a shared helper.

## Data layer

- The product database is **`custom-data.json`** (tracked, ~12 MB). It is the source
  of truth for article numbers, labels, prices, services, and rules. "Healing" labels
  in this file is a routine maintenance task.
- **Dev:** read/written via a Vite middleware in `vite.config.js`
  (`GET /api/data`, `POST /api/save`).
- **Prod (single-file):** there is no server; state persists in `localStorage`
  (e.g. `sanitas_wishlist`).

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
- **Manual cache-busting:** imports/assets carry hand-bumped `?v=x.y.z` query strings
  (`app.js?v=2.8.30`, `factories.js?v=2.6.31`, etc.). This is a deliberate workflow;
  bump them when shipping if you rely on it.
- `st-scraper/` is a separate data-pipeline toolkit (scrapes vendor catalogs into
  `custom-data.json`). `_archive/` and `scratch/` are git-ignored throwaways.
- After touching `modules/factories/`, verify with: `npm test`, then load the dev
  server and open a couple of configurators (watch the console for `ReferenceError`).
