import { matchesSearchQuery, configSidebar, bomTableBody, bomCountCounter, getVariantColor, isRealImg, imgOf, applyPillUI, Ae, re, me, ke, Be, X, priceBOM, renderAccessoiresPanel, needsShowerAccessories, ensureShowerGroups, outletCount, isShowerSystem , fullLabel } from './_shared.js';
import { COLOR_NAMES } from './_colorCodes.js';

export function createDuschenmischerApp(title, desc, mainImgUrl, config = {}) {
  function transformDuschenmischerTrays(trays) {
    if (!Array.isArray(trays)) return trays;
    
    const standardOptions = [
      {
        artNr: "6531 404.501.000",
        label: "Duschengleitstange Alterna fit Gelenkhalter Arretierungshebel, 1100 mm Verchromt",
        menge: 1,
        type: "Zubehör",
        imgUrl: "img/PG1_06531404_501_000_371b9158.webp"
      },
      {
        artNr: "6531 403.501.000",
        label: "Duschengleitstange Alterna fit Gelenkhalter Arretierungshebel, 610 mm Verchromt",
        menge: 1,
        type: "Option",
        imgUrl: "img/PG1_06531403_501_000_7cf400fd.webp"
      }
    ];

    return trays.map(tray => {
      if (!tray.mountingMaterials) return tray;
      
      let materials = tray.mountingMaterials.map(m => ({
        ...m,
        options: m.options ? m.options.map(o => ({ ...o })) : []
      }));

      // Wanneneinlauf is bathtub-filling ONLY — never a Duschmischer accessory. Hybrid
      // "Bade- und Duschmischer" (mostly Gessi) carry it in their set; strip it here so the
      // Duschmischer app never offers it. (It stays available in the Bademischer app.)
      // Any "Wannen…" group (Wanneneinlauf, Wannen-Schwalleinlauf, Wannenrand, Wannenfüll…)
      // is bathtub-filling — never valid on a shower mixer.
      materials = materials.filter(m => !/wannen|einlaufgarnitur/i.test(m.name || ""));

      // ERP-injected mixers often ship WITHOUT their Anschlussbogen (UP) / Brauseschlauch /
      // Handbrause. Add the house-standard groups when missing (skips self-contained
      // Duschsysteme/Showerpipes). The AP/UP BOM-order sorts below place them per INSTRUCTIONS §2.
      const _isUPmix = /unterputz|endmontage|einbau|grundk[öo]rper/i.test(((tray.label || "") + " " + (tray.description || "")).toLowerCase());
      materials = ensureShowerGroups(materials, tray, { isBath: false, isUP: _isUPmix });

      // Regenbrause is ALWAYS optional: default "Ohne Regenbrause", with a dropdown to pick a
      // head. ABGANG BUDGET: only offer it when the mixer has a free outlet — a 1-Abgang mixer
      // serves Handbrause OR Regenbrause, never both, so a second head cannot be plumbed.
      // (Users who need both pick a 2-Abgang mixer via the Funktionen filter.)
      if (needsShowerAccessories(tray, { isBath: false }) && outletCount(tray) >= 2) {
        const OHNE_REGEN = { artNr: "ohne_regenbrause", label: "Ohne Regenbrause", menge: 0, type: "Option", imgUrl: "" };
        const STD_REGEN = { artNr: "6545 102.501.000", label: 'Regenbrause Alterna rainshower ½", Ø 300 mm, Kugelgelenk, Verchromt', menge: 1, type: "Option", imgUrl: "img/PG1_06545102_501_000_350a10d0.webp" };
        let rg = materials.find(m => /regenbrause|kopfbrause/i.test(m.name || ""));
        if (rg) {
          if (!/^ohne/i.test(((rg.options || [])[0] || {}).label || "")) rg.options.unshift({ ...OHNE_REGEN });
        } else {
          materials.push({ name: "Regenbrause", options: [{ ...OHNE_REGEN }, { ...STD_REGEN }] });
        }
      }

      // The Aufputz BOM rules below (Abstellverschraubung, 1600/brand option defaults,
      // BOM-order sort, guaranteed Gleitstange) apply to AUFPUTZ mixers ONLY. Unterputz
      // Endmontagesets keep their established numbered group order untouched.
      // FULL-TEXT RULE: read label AND description for the Aufputz/Unterputz classification.
      const _lbl = ((tray.label || "") + " " + (tray.description || "")).toLowerCase();
      const isAufputz = !(_lbl.includes("unterputz") || _lbl.includes(" up ") || _lbl.includes("einbau")
        || _lbl.includes("endmontageset") || _lbl.includes("grundkörper") || _lbl.includes("grundkoerper"));

      const holderIdx = materials.findIndex(m => {
        const name = (m.name || "").toLowerCase();
        return (name.includes("brausehalter") || name.includes("steckhalter") || name.includes("steckholder"))
          && !name.includes("anschlussbogen") && !name.includes("bogen");
      });

      const gleitIdx = materials.findIndex(m => {
        const name = (m.name || "").toLowerCase();
        return name.includes("gleitstange");
      });

      if (holderIdx !== -1) {
        if (gleitIdx !== -1) {
          materials.splice(holderIdx, 1);
          const newGleitIdx = holderIdx < gleitIdx ? gleitIdx - 1 : gleitIdx;
          materials[newGleitIdx].name = "Duschengleitstange";
          materials[newGleitIdx].options = standardOptions.map(o => ({ ...o }));
        } else {
          materials[holderIdx].name = "Duschengleitstange";
          materials[holderIdx].options = standardOptions.map(o => ({ ...o }));
        }
      } else if (gleitIdx !== -1) {
        materials[gleitIdx].name = "Duschengleitstange";
        materials[gleitIdx].options = standardOptions.map(o => ({ ...o }));
      } else if (needsShowerAccessories(tray, { isBath: false })) {
        // No Brausehalter/Gleitstange group in the scraped data — but the Alterna
        // Gleitstange is a standard line for every Duschenmischer (INSTRUCTIONS.md §2,
        // AP order item 5 / UP order item 7). Add it. Self-contained Duschsysteme are skipped.
        materials.push({
          name: "Duschengleitstange",
          options: standardOptions.map(o => ({ ...o }))
        });
      }

      // === Per-group standard defaults (Aufputz + Unterputz) — the default selection is always
      // options[0] (see selectItem). Reorder each group so the correct standard sits first. ===
      const brand = (tray.manufacturer || "").toLowerCase().trim();
      const has = (o, ...needles) => needles.every(x => (o.label || "").toLowerCase().includes(x));
      const toFront = (opts, idx) => {
        if (idx > 0) { const [p] = opts.splice(idx, 1); opts.unshift(p); }
      };
      // Best-effort series tokens from the mixer text, for "same brand and series if possible".
      // FULL-TEXT RULE: read label AND description.
      const serieTokens = ((tray.label || "") + " " + (tray.description || "")).toLowerCase()
        .replace(/duschenmischer|endmontageset|fertigmontageset|grundk[öo]rper|thermostat/g, " ")
        .replace(brand, " ")
        .replace(/[^a-zäöü\s]/g, " ")
        .split(/\s+/)
        .filter(w => w.length >= 4 && !["ohne", "rund", "eckig", "abdeckplatte", "verchromt", "rosette"].includes(w))
        .slice(0, 2);

      materials.forEach(mat => {
        const n = (mat.name || "").toLowerCase();
        const opts = mat.options;
        if (!Array.isArray(opts) || opts.length < 2) return;
        // Fixed / brand-neutral groups keep their existing order.
        if (n.includes("gleitstange") || n.includes("abstellverschraubung")
          || n.includes("grundkörper") || n.includes("grundkoerper")
          || n.includes("montageschiene") || n.includes("montageset")) return;
        if (n.includes("anschlussbogen")) {
          // Standard = "ohne Brausehalter" (für Handbrause); "mit Brausehalter" stays a dropdown option.
          toFront(opts, opts.findIndex(o => !(o.label || "").toLowerCase().includes("brausehalter")));
          return;
        }
        if (n.includes("brauseschlauch")) {
          // Standard = 1600 mm (brand-matched 1600 first, then any 1600), then brand, else leave.
          let i = brand ? opts.findIndex(o => has(o, brand, "1600")) : -1;
          if (i < 0) i = opts.findIndex(o => has(o, "1600"));
          if (i < 0 && brand) i = opts.findIndex(o => has(o, brand));
          toFront(opts, i);
          return;
        }
        // Handbrause (and any other accessory): brand-matched as standard. Series is an extra
        // tiebreak for UNTERPUTZ only ("same brand and series" — Aufputz spec is brand-only).
        if (brand) {
          let i = (!isAufputz && serieTokens.length)
            ? opts.findIndex(o => has(o, brand) && serieTokens.some(s => (o.label || "").toLowerCase().includes(s)))
            : -1;
          if (i < 0) i = opts.findIndex(o => has(o, brand));
          toFront(opts, i);
        }
      });

      if (isAufputz) {
        // === Abstellverschraubung (AUFPUTZ only, dynamic/label-driven) ===
        // ADD 2× 6521 108.501.000 only when the label says "ohne Abstellverschraubungen"
        // (incl. Hansgrohe "mit S-Anschlüssen" = included → skip). Unterputz never needs it —
        // the connections sit on the Grundkörper.
        // FULL-TEXT RULE: read label AND description for the "ohne Abstellverschraubung" check.
        const label = ((tray.label || "") + " " + (tray.description || "")).toLowerCase();
        materials = materials.filter(m => !(m.name || "").toLowerCase().includes("abstellverschraubung"));
        if (/ohne\s+abstellverschraubung/.test(label)) {
          materials.unshift({
            name: "Abstellverschraubung",
            options: [{
              artNr: "6521 108.501.000",
              label: 'Abstellverschraubung, ½" x ½", mit flacher Rosette, Verchromt',
              menge: 2,
              type: "Zubehör",
              imgUrl: "img/PG1_06521108_501_000_a53f0369.webp"
            }]
          });
        }
        // BOM order: Abstellverschraubung → Brauseschlauch → Handbrause → Gleitstange
        const rank = (name) => {
          const x = (name || "").toLowerCase();
          if (x.includes("abstellverschraubung")) return 0;
          if (x.includes("brauseschlauch")) return 1;
          if (x.includes("handbrause")) return 2;
          if (x.includes("gleitstange")) return 3;
          return 4;
        };
        materials.sort((a, b) => rank(a.name) - rank(b.name));
      } else {
        // === Unterputz: Grundkörper ALWAYS needs mounting brackets (like the UP-Bademischer) ===
        // Integrated-box systems (KWC Homebox, Hansgrohe iBox) ship without a Montageschiene group
        // in the scraped data — add the brand's mandatory mounting set when none is present.
        const hasMontage = materials.some(m => {
          const x = (m.name || "").toLowerCase();
          return x.includes("montageschiene") || x.includes("montageset");
        });
        if (!hasMontage) {
          const mfr = (tray.manufacturer || "").toLowerCase();
          let bracket = null;
          if (mfr === "kwc") {
            // KWC Montageschiene depends on the Einbaukörper: Bluebox -> 6118 122, Homebox -> 6118 149.
            const eLabel = (materials.find(m => /einbaukörper|grundkörper/i.test(m.name || ""))?.options?.[0]?.label || "").toLowerCase();
            bracket = /bluebox/.test(eLabel)
              ? { artNr: "6118 122.000.000", label: "Montageschiene KWC, zu Einbaukörper KWC Bluebox", menge: 1, type: "Zubehör", imgUrl: "img/PG1_06118122_000_000_4b6378f7.webp" }
              : { artNr: "6118 149.000.000", label: "Montageschiene KWC, zu Einbaukörper KWC Homebox", menge: 1, type: "Zubehör", imgUrl: "img/PG1_06118149_000_000_2c2ac83a.webp" };
          } else if (mfr === "hansgrohe") {
            bracket = { artNr: "6418 111.000.000", label: "Montageset Hansgrohe iBox Universal, 2 Montageschienen 550 mm, Befestigungsmaterial", menge: 1, type: "Zubehör", imgUrl: "img/PG1_06418111_000_000_79a07b3f.webp" };
          }
          if (bracket) materials.push({ name: "Montageschiene", options: [bracket] });
        }

        // === Unterputz BOM order (INSTRUCTIONS.md §2) ===
        // Grundkörper → Montageschiene → Anschlussbogen → Brauseschlauch → Handbrause → Gleitstange.
        // (Regenbrause block = future work.) No Abstellverschraubung — it sits on the Grundkörper.
        const rank = (name) => {
          const x = (name || "").toLowerCase();
          if (x.includes("grundkörper") || x.includes("grundkoerper") || x.includes("einbaukörper") || x.includes("einbaukoerper") || x.includes("ibox")) return 0;
          if (x.includes("montageschiene") || x.includes("montageset")) return 1;
          if (x.includes("anschlussbogen")) return 2;
          if (x.includes("brauseschlauch")) return 3;
          if (x.includes("handbrause")) return 4;
          if (x.includes("gleitstange")) return 5;
          if (x.includes("regenbrause") || x.includes("brausearm")) return 6;
          return 7;
        };
        materials.sort((a, b) => rank(a.name) - rank(b.name));
      }

      return {
        ...tray,
        mountingMaterials: materials
      };
    });
  }

  function ut(B, F, R, N = {}) {
    const m = N.isBath || !1,
      s = B.replace(/\s/g, "");
    let _trays = [];
    return {
      get trays() {
        return _trays;
      },
      set trays(val) {
        _trays = transformDuschenmischerTrays(val);
      },
      mainImgUrl: R,
      selectedTray: null,
      mischerOptionsState: {},
      currentHersteller: "all",
      currentMontage: "all",
      currentSerie: "all",
      // Abgang budget as a FUNCTION filter: "1" = nur Handbrause (single outlet),
      // "2" = Handbrause + Regenbrause (needs a free second outlet).
      currentFunktion: "all",
      showAccessoires: false,
      selectedAddonAccessoires: [],
      accFacets: {},
      init: function () {
        ((this.selectedTray = null),
          (this.mischerOptionsState = {}),
          (this.currentHersteller = "all"),
          (this.currentMontage = "all"),
          (this.currentSerie = "all"),
          (this.currentFunktion = "all"),
          (this.showAccessoires = false),
          (this.selectedAddonAccessoires = []),
          (this.accFacets = {}),
          this.renderSidebar(),
          this.bindFilters(), this.filterResults());
          if (!config.enableGalleryUX) { this.clearBOM(); }
        
      },
      normalizeDuschenmischerSerie: function (r, e = "") {
        let t = String(r || "")
          .toLowerCase()
          .trim();
        const n = String(e || "").toLowerCase();
        return (
          (t = t
            .replace(/^[-\s/]+/, "")
            .replace(/^-?\s*endmontageset\b/, "")
            .replace(/^-?\s*fertigmontageset\b/, "")
            .replace(/^[-\s/]+/, "")),
          n && t.startsWith(n) && (t = t.slice(n.length).trim()),
          n &&
            (t = t
              .replace(
                new RegExp(
                  `\\b${n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`,
                  "gi",
                ),
                "",
              )
              .trim()),
          (t = t
            .replace(/^[-\s/]+/, "")
            .replace(/\babdeckplatte\b.*$/i, "")
            .replace(/\bdurchflussleistung\b.*$/i, "")
            .replace(/\bohne einbaukörper\b.*$/i, "")
            .replace(/\benergieeffizienzklasse\b.*$/i, "")
            .replace(/\bgeräuschgruppe\b.*$/i, "")
            .replace(/\barmhebel\b.*$/i, "")
            .replace(/\bselbstschliessend\b.*$/i, "")
            .replace(/\btemperaturgriff\b.*$/i, "")
            .replace(/^thermostat\s+/i, "")
            .replace(/\s+½[\"”]?\s+thermostat\b.*$/i, "")
            .replace(/\s+thermostat\b.*$/i, "")
            .replace(/\bmit sicherheitstaste\b.*$/i, "")
            .replace(/\b1-weg\b.*$/i, "")
            .replace(/\s+½[\"”]?$/i, "")
            .replace(/\bav\.0\b/g, "ava 2.0")
            .replace(/\bvit\.0\b/g, "vita 2.0")
            .replace(/\s*,\s*$/g, "")
            .replace(/\s+/g, " ")
            .trim()),
          t
            ? t
                .split(" ")
                .map((i) =>
                  /^kwc$/i.test(i)
                    ? "KWC"
                    : /^\d/.test(i)
                      ? i
                      : i.charAt(0).toUpperCase() + i.slice(1),
                )
                .join(" ")
            : "Andere"
        );
      },
      extractSerie: function (r) {
        if (r.serie)
          return this.normalizeDuschenmischerSerie(r.serie, r.manufacturer);
        const e = [
          "aufputz-duschenmischer",
          "unterputz-duschenmischer",
          "duschenmischer",
          "duschmischer",
          "aufputz-bademischer",
          "unterputz-bademischer",
          "bademischer",
          "waschtischmischer",
          "thermostatmischer",
          "thermostat-duschenmischer",
          "einhebelmischer",
          "einlochmischer",
          "mischer",
        ];
        // FULL-TEXT RULE (INSTRUCTIONS §1): parse the label for the leading series token;
        // fall back to the description when the label is truncated to nothing usable.
        const parseSerie = (raw) => {
          let t = (raw || "").toLowerCase();
          if (r.manufacturer) {
            const a = r.manufacturer.toLowerCase();
            t.startsWith(a) && (t = t.slice(a.length).trim());
          }
          for (const a of e)
            if (t.startsWith(a)) {
              t = t.slice(a.length).trim();
              break;
            }
          t = t.replace(/-?endmontageset/g, "").trim().replace(/-?fertigmontageset/g, "").trim();
          if (r.manufacturer) {
            const a = r.manufacturer.toLowerCase();
            t.startsWith(a) && (t = t.slice(a.length).trim());
          }
          const n = t.match(
            /^(.*?)(?:\s+\d+\s*[xX]\s*\d+|\s*,|\s*\(|\s+-|\s+\d+mm|\s+\d+\s*mm)/,
          );
          return n && n[1] ? n[1].trim() : t.trim();
        };
        let i = parseSerie(r.label);
        if (!i) i = parseSerie(r.description);
        return this.normalizeDuschenmischerSerie(i, r.manufacturer);
      },
      extractMontage: function (r) {
        // FULL-TEXT RULE: mounting keywords can be truncated off the label — read both.
        const e = ((r.label || "") + " " + (r.description || "")).toLowerCase();
        return e.includes("unterputz") ||
          e.includes(" up ") ||
          e.includes("einbau") ||
          e.includes("endmontageset") ||
          e.includes("grundkörper") ||
          e.includes("grundkoerper")
          ? "Unterputz"
          : e.includes("aufputz") ||
              e.includes(" ap ") ||
              e.includes("wandbatterie") ||
              e.includes("wandmischer") ||
              /\bad\s+\d/.test(e) ||
              e.includes("aufputz-duschenmischer") ||
              e.includes("thermostat-duschenmischer")
            ? "Aufputz"
            : m && (e.includes("standmodell") || e.includes("freistehend"))
              ? "Standmodell"
              : "Aufputz";
      },
      getUniqueValues: function (r, e) {
        const t = e || this.trays;
        if (r === "hersteller") {
          const n = this.trays.map((i) => i.manufacturer || "Andere");
          return [...new Set(n)].filter(Boolean).sort();
        }
        return r === "montage"
          ? [...new Set(t.map((n) => this.extractMontage(n)))].sort()
          : r === "serie"
            ? [...new Set(t.map((n) => this.extractSerie(n)))].sort()
            : [];
      },
      renderSidebar: function () {
        const r = document.getElementById("configSidebar");
        if (!r) return;
        const e =
            this.currentHersteller === "all"
              ? this.trays
              : this.trays.filter(
                  (o) => o.manufacturer === this.currentHersteller,
                ),
          t = e.filter((o) =>
            this.currentMontage === "all"
              ? !0
              : this.extractMontage(o) === this.currentMontage,
          ),
          n = this.getUniqueValues("hersteller"),
          i = this.getUniqueValues("serie", t),
          a = this.getUniqueValues("montage", e);
        ((r.innerHTML = `
                <div class="sidebar-section">
                    <h2 style="margin-bottom: 1.5rem
 display: flex
 align-items: center
 gap: 0.5rem
">
                        <i class="ri-filter-3-line" style="color: var(--accent)
"></i> Filter
                    </h2>

                    <div class="filter-group">
                        <label id="head_funktion_${s}" class="filter-label">Funktionen</label>
                        <div class="pill-group" id="list_funktion_${s}">
                            <button class="pill-btn ${this.currentFunktion === "all" ? "active" : ""}" data-key="Funktion" data-val="all">Alle <span class="badge" style="font-size:0.7rem;opacity:0.6;margin-left:4px;">${this.getFilteredCount("Funktion", "all")}</span></button>
                            <button class="pill-btn ${this.currentFunktion === "1" ? "active" : ""}" data-key="Funktion" data-val="1" title="1 Abgang — Handbrause oder Regenbrause, nicht beides">Nur Handbrause <span class="badge" style="font-size:0.7rem;opacity:0.6;margin-left:4px;">${this.getFilteredCount("Funktion", "1")}</span></button>
                            <button class="pill-btn ${this.currentFunktion === "2" ? "active" : ""}" data-key="Funktion" data-val="2" title="2+ Abgänge — Handbrause und Regenbrause gleichzeitig">+ Regenbrause <span class="badge" style="font-size:0.7rem;opacity:0.6;margin-left:4px;">${this.getFilteredCount("Funktion", "2")}</span></button>
                        </div>
                    </div>

                    <div class="filter-group">
                        <label id="head_hersteller_${s}" class="filter-label">Hersteller</label>
                        <div class="pill-group" id="list_hersteller_${s}">
                            <button class="pill-btn ${this.currentHersteller === "all" ? "active" : ""}" data-key="Hersteller" data-val="all">Alle <span class="badge" style="font-size:0.7rem;opacity:0.6;margin-left:4px;">${this.getFilteredCount("Hersteller", "all")}</span></button>
                            ${n.map((o) => `<button class="pill-btn ${this.currentHersteller === o ? "active" : ""}" data-key="Hersteller" data-val="${o}">${o} <span class="badge" style="font-size:0.7rem;opacity:0.6;margin-left:4px;">${this.getFilteredCount("Hersteller", o)}</span></button>`).join("")}
                        </div>
                    </div>

                    <div class="filter-group">
                        <label id="head_montage_${s}" class="filter-label">Montageart</label>
                        <div class="pill-group" id="list_montage_${s}">
                            <button class="pill-btn ${this.currentMontage === "all" ? "active" : ""}" data-key="Montage" data-val="all">Alle <span class="badge" style="font-size:0.7rem;opacity:0.6;margin-left:4px;">${this.getFilteredCount("Montage", "all")}</span></button>
                            ${a.map((o) => `<button class="pill-btn ${this.currentMontage === o ? "active" : ""}" data-key="Montage" data-val="${o}">${o} <span class="badge" style="font-size:0.7rem;opacity:0.6;margin-left:4px;">${this.getFilteredCount("Montage", o)}</span></button>`).join("")}
                        </div>
                    </div>

                    <div class="filter-group">
                        <label id="head_serie_${s}" class="filter-label">Serie</label>
                        <div class="pill-group" id="list_serie_${s}">
                            <button class="pill-btn ${this.currentSerie === "all" ? "active" : ""}" data-key="Serie" data-val="all">Alle <span class="badge" style="font-size:0.7rem;opacity:0.6;margin-left:4px;">${this.getFilteredCount("Serie", "all")}</span></button>
                            ${i.map((o) => `<button class="pill-btn ${this.currentSerie === o ? "active" : ""}" data-key="Serie" data-val="${o}">${o} <span class="badge" style="font-size:0.7rem;opacity:0.6;margin-left:4px;">${this.getFilteredCount("Serie", o)}</span></button>`).join("")}
                        </div>
                    </div>

                    <div class="filter-group" style="margin-top:1.5rem
 padding-top:1.5rem
 border-top: 1px solid var(--border)
">
                        <label class="filter-label">Suche</label>
                        <input type="text" id="input_search_${s}" class="filter-select" placeholder="Art.Nr. oder Name...">
                    </div>
                </div>
                
                <div class="sidebar-section" ${config.enableGalleryUX ? 'style="display:none;"' : ''}>
                    <h2>Suchergebnisse <span id="resultCount_${s}" class="badge">0</span></h2>
                    <div class="search-results-container" id="searchResults_${s}"></div>
                </div>

                
                <div class="sidebar-section addon-toggles-section" id="addon_toggles_section_${s}" style="display:none; margin-top:2rem;">
                    <div class="finder-sub-header">Zusatzoptionen</div>
                    <div class="addon-toggle-row" id="toggle_accessoires_${s}">
                        <span class="addon-toggle-label"><i class="ri-archive-line"></i> Accessoires</span>
                        <button class="ios-toggle" data-target="accessoires_mischer_${s}" aria-label="Accessoires ein/aus"><span class="ios-toggle-knob"></span></button>
                    </div>
                    <div id="addon_accessoires_mischer_panel_${s}" class="addon-panel" style="display:none;">
                        <div id="acc_facets_${s}"></div>
                        <div class="finder-sub-header">Accessoires wählen</div>
                        <div class="finder-list" id="list_addon_accessoires_${s}"></div>
                    </div>
                </div>
                <div class="sidebar-section" id="trayConfigurator_${s}" style="display:none
 margin-top:2rem
">
                    <h2>Konfiguration</h2>
                    <p class="section-desc">Bestimmen Sie das benötigte Zubehör.</p>
                    <div id="trayConfiguratorInner_${s}"></div>
                </div>
            `),
          r.querySelectorAll(".pill-btn[data-key]").forEach((o) => {
            o.addEventListener("click", () => {
              this.setFilter(o.dataset.key, o.dataset.val);
            });
          }),
          X(
            `head_funktion_${s}`,
            `list_funktion_${s}`,
            this.currentFunktion,
            "Funktionen",
            () => this.setFilter("Funktion", "all"),
            this.currentFunktion === "2" ? "+ Regenbrause" : this.currentFunktion === "1" ? "Nur Handbrause" : this.currentFunktion,
          ),
          X(
            `head_hersteller_${s}`,
            `list_hersteller_${s}`,
            this.currentHersteller,
            "Hersteller",
            () => this.setFilter("Hersteller", "all"),
          ),
          X(
            `head_montage_${s}`,
            `list_montage_${s}`,
            this.currentMontage,
            "Montageart",
            () => this.setFilter("Montage", "all"),
          ),
          X(
            `head_serie_${s}`,
            `list_serie_${s}`,
            this.currentSerie,
            "Serie",
            () => this.setFilter("Serie", "all"),
          ));
        
          this.updateAccessoiresToggles();
          this.populateAccessoires();
          const l = document.getElementById(`input_search_${s}`);
        (l && l.addEventListener("input", () => this.filterResults()),
          this.filterResults());
      },
      setFilter: function (r, e) {
        ((this[`current${r}`] = e), this.renderSidebar());
      },
      bindFilters: function () {},
      
      updateAccessoiresToggles: function () {
            const btn = document.querySelector(`#toggle_accessoires_${s} .ios-toggle`);
            const panel = document.getElementById(`addon_accessoires_mischer_panel_${s}`);
            if (btn) btn.classList.toggle('active', this.showAccessoires);
            if (panel) panel.style.display = this.showAccessoires ? 'block' : 'none';
            
            const section = document.getElementById(`addon_toggles_section_${s}`);
            if (section) {
                if (this.selectedTray) {
                    section.style.display = 'block';
                } else {
                    section.style.display = 'none';
                    this.showAccessoires = false;
                }
                const toggleBtn = section.querySelector('.ios-toggle');
                if (toggleBtn && !toggleBtn.dataset.bound) {
                    toggleBtn.dataset.bound = "true";
                    toggleBtn.addEventListener('click', () => {
                        this.showAccessoires = !this.showAccessoires;
                        this.updateAccessoiresToggles();
                        this.updateBOM();
                    });
                }
            }
      },
      populateAccessoires: function () {
            renderAccessoiresPanel(this, s);
      },

      renderGridInMainPanel: function (filtered) {
            const bomTableBody = document.getElementById("bomTableBody");
            const bomCountCounter = document.getElementById("bomCount");
            if (bomCountCounter) bomCountCounter.textContent = filtered.length + ' Produkte gefunden';
            if (filtered.length === 0) {
                bomTableBody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:#9da3ad; padding:2rem;">Keine Produkte gefunden. Bitte passen Sie die Filter an.</td></tr>';
                return;
            }

            const sortedFiltered = [...filtered].sort((a, b) => String(a.artNr || '').localeCompare(String(b.artNr || '')));
            const cappedFiltered = sortedFiltered.slice(0, 150);

            let cards = cappedFiltered.map(t => {
                return `
                    <div class="result-item-card catalog-preview-card" onclick="window.currentActiveApp.selectItem('${t.id}')" style="display:flex; flex-direction:row; align-items:center; gap:1rem; border:1px solid var(--border); border-radius:8px; padding:1rem; background:var(--bg-surface); cursor:pointer; transition:all 0.2s;" onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 6px 20px rgba(0,0,0,0.2)'" onmouseout="this.style.transform=''; this.style.boxShadow=''">
                        <div class="card-img-wrapper" style="width:70px; height:90px; display:flex; align-items:center; justify-content:center; border-radius:6px; overflow:hidden; background:var(--bg-subtle); flex-shrink:0;">
                            ${(imgOf(t)) ? `<img src="${imgOf(t)}" loading="lazy" style="max-height:100%; max-width:100%; object-fit:contain;">` : '<i class="ri-image-line placeholder-icon" style="font-size:2rem; color:var(--text-secondary);"></i>'}
                        </div>
                        <div class="result-info" style="display:flex; flex-direction:column; flex:1; min-width:0;">
                            <span style="font-size:0.7rem; color:var(--text-secondary); text-transform:uppercase; letter-spacing:0.5px; margin-bottom:2px;">${t.manufacturer || "Marke unbekannt"}</span>
                            <strong style="font-size:0.85rem; line-height:1.3; margin-bottom:4px; color:var(--text-primary); display:-webkit-box; -webkit-line-clamp:3; -webkit-box-orient:vertical; overflow:hidden;">${t.label || t.name || ""}</strong>
                            <span class="finish-artnr" style="margin-top:6px; font-size:0.8rem;">${t.artNr}</span>
                        </div>
                    </div>
                `;
            }).join('');

            if (sortedFiltered.length > 150) {
                cards += `<div style="grid-column:1/-1; padding:2rem; text-align:center; color:var(--text-secondary); font-size:0.95rem;">Es gibt ${sortedFiltered.length - 150} weitere Ergebnisse. Bitte passen Sie Ihre Filter an, um diese zu sehen.</div>`;
            }

            bomTableBody.innerHTML = '<tr><td colspan="5" style="padding:0; border:none; background:transparent;"><div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(320px, 1fr)); gap:12px; padding:12px; background:var(--bg-body); border-radius:8px;">' + cards + '</div></td></tr>';
      },
      // Faceted count for a filter pill value — mirrors the filterResults predicate
      // below (Hersteller / Serie / Montage + search). Keep the two in sync.
      // Does a tray satisfy the selected Funktion (Abgang budget)? A self-contained
      // Duschsystem already includes its heads, so it always qualifies for "+ Regenbrause".
      matchesFunktion: function (t) {
        if (this.currentFunktion === "all") return true;
        if (isShowerSystem(t)) return this.currentFunktion === "2";
        const n = outletCount(t);
        return this.currentFunktion === "2" ? n >= 2 : n === 1;
      },
      getFilteredCount: function (key, value) {
        var i;
        const prop = `current${key}`;
        const orig = this[prop];
        this[prop] = value;
        const t = (((i = document.getElementById(`input_search_${s}`)) == null ? void 0 : i.value) || "").toLowerCase();
        let n = this.trays;
        if (this.currentHersteller !== "all") n = n.filter((a) => a.manufacturer === this.currentHersteller);
        if (this.currentSerie !== "all") n = n.filter((a) => this.extractSerie(a) === this.currentSerie);
        if (this.currentMontage !== "all") n = n.filter((a) => this.extractMontage(a) === this.currentMontage);
        if (this.currentFunktion !== "all") n = n.filter((a) => this.matchesFunktion(a));
        if (t) n = n.filter((a) => matchesSearchQuery(a, t));
        this[prop] = orig;
        return n.length;
      },

      filterResults: function () {
        var i;
        const r = document.getElementById(`searchResults_${s}`),
          e = document.getElementById(`resultCount_${s}`),
          t = (
            ((i = document.getElementById(`input_search_${s}`)) == null
              ? void 0
              : i.value) || ""
          ).toLowerCase();
        if (!r) return;
        let n = this.trays;
        if (
          (this.currentHersteller !== "all" &&
            (n = n.filter((a) => a.manufacturer === this.currentHersteller)),
          this.currentSerie !== "all" &&
            (n = n.filter((a) => this.extractSerie(a) === this.currentSerie)),
          this.currentMontage !== "all" &&
            (n = n.filter(
              (a) => this.extractMontage(a) === this.currentMontage,
            )),
          this.currentFunktion !== "all" &&
            (n = n.filter((a) => this.matchesFunktion(a))),
          t &&
            (n = n.filter((a) => matchesSearchQuery(a, t))),
          (e.textContent = n.length),
          n.length === 0)
        ) {
          r.innerHTML = '<div style="padding:2rem; text-align:center; color:var(--text-secondary);">Keine Produkte gefunden. Bitte passen Sie die Filter an.</div>';
          if (config.enableGalleryUX) {
              if (this.selectedTray) {
                  this.renderConfigurator();
                  this.updateBOM();
              } else {
                  this.renderGridInMainPanel([]);
              }
          }
          return;
        }
        if (this.selectedTray) {
            this.renderConfigurator();
            this.updateBOM();
        } else {
            if (config.enableGalleryUX) {
                this.renderGridInMainPanel(n);
                r.innerHTML = '<div style="padding:1rem; text-align:center; color:var(--text-secondary);">Bitte wählen Sie ein Produkt aus der Hauptansicht.</div>';
                return;
            } else {
                ((r.innerHTML = n
                  .map((a) => {
                    const l = this.selectedTray && this.selectedTray.id === a.id;
                    return `
                        <div class="result-item-card ${l ? "active" : ""}" onclick="window.currentActiveApp.selectItem('${a.id}')" data-tid="${a.id}">
                            <div class="card-img-wrapper">
                                ${a.imgUrl ? `<img src="${a.imgUrl}">` : '<i class="ri-image-line placeholder-icon"></i>'}
                            </div>
                            <div class="result-info">
                                <strong>${this.extractSerie(a)}</strong>
                                <div class="result-meta">
                                    <span>${a.manufacturer || "Andere"}</span> | <span>${this.extractMontage(a)}</span>
                                </div>
                                <span class="finish-artnr">${a.artNr}</span>
                            </div>
                        </div>
                        `;
                  })
                  .join("")),
                  r.querySelectorAll(".result-item-card").forEach((a) => {
                    a.addEventListener("click", () => {
                      this.selectItem(a.dataset.tid);
                    });
                  }));
            }
        }
      },
      selectItem: function (r) {
          if (!r) {
              this.selectedTray = null;
              this.mischerOptionsState = {};
              this.showAccessoires = false;
              this.selectedAddonAccessoires = [];
              if (config.enableGalleryUX) {
                  this.updateBOM();
                  this.filterResults();
                  this.renderConfigurator();
                  this.updateAccessoiresToggles();
              } else {
                  this.clearBOM();
              }
              return;
          }
          if (!r) {
              this.selectedTray = null;
              this.mischerOptionsState = {};
              this.showAccessoires = false;
              this.selectedAddonAccessoires = [];
              if (config.enableGalleryUX) {
                  this.updateBOM();
                  this.filterResults();
                  this.renderConfigurator();
                  this.updateAccessoiresToggles();
              } else {
                  this.clearBOM();
              }
              return;
          }
        ((this.selectedTray = this.trays.find((e) => e.id === r)),
          (this.mischerOptionsState = {}),
          this.selectedTray &&
            this.selectedTray.mountingMaterials &&
            this.selectedTray.mountingMaterials.forEach((e, t) => {
              e.options &&
                e.options.length > 0 &&
                (this.mischerOptionsState[t] = 0);
            }),
          this.filterResults(),
          (this.showAccessoires = false), (this.selectedAddonAccessoires = []), this.updateAccessoiresToggles(), this.populateAccessoires(), this.renderConfigurator(), this.updateBOM());
      },
      isMatVisible: function (r, e) {
        if (!this.selectedTray || !this.selectedTray.mountingMaterials)
          return !0;
        if ((r.name || "").toLowerCase().includes("duschengleitstange")) {
          const n = this.selectedTray.mountingMaterials.findIndex((i) =>
            (i.name || "").toLowerCase().includes("brausehalter"),
          );
          if (n >= 0) {
            const i = this.mischerOptionsState[n];
            if (i !== void 0) {
              const a = this.selectedTray.mountingMaterials[n].options[i];
              return !!(
                a &&
                a.label &&
                a.label.toLowerCase().startsWith("ohne")
              );
            }
          }
        }
        return !0;
      },
      renderConfigurator: function () {
        const r = document.getElementById(`trayConfigurator_${s}`),
          e = document.getElementById(`trayConfiguratorInner_${s}`);
        if (!this.selectedTray) {
          r && (r.style.display = "none");
          return;
        }
        if ((r && (r.style.display = "block"), !e)) return;
        if (config.enableGalleryUX) {
            r.style.display = "none";
            return;
        }
        e.innerHTML = "";
        const t = this.selectedTray.mountingMaterials || [];
        if (t.length === 0) {
          e.innerHTML =
            '<p class="section-desc">Kein spezifisches Zubehör verfügbar.</p>';
          return;
        }
        (t.forEach((n, i) => {
          if (!this.isMatVisible(n, i)) return;
          const a = document.createElement("div");
          ((a.className = "filter-group"), (a.style.marginBottom = "1.25rem"));
          const l = this.mischerOptionsState[i],
            o = l !== void 0 ? n.options[l] : null,
            y = (o && (imgOf(o))) || "",
            M = n.options.length > 1;
          ((a.innerHTML = `
                    <label style="display:block; margin-bottom:0.4rem; font-size:0.85rem; color:var(--text-secondary); text-transform:uppercase; letter-spacing:0.5px;">${n.name || "Zubehör"}</label>
                    <div style="display:flex; align-items:center; gap:0.75rem;">
                        <div style="width:40px; height:40px; background:#fff; border-radius:4px; border:1px solid var(--border); display:flex; align-items:center; justify-content:center; padding:2px; flex-shrink:0;">
                            ${y ? `<img src="${y}" style="max-width:100%; max-height:100%; object-fit:contain;">` : '<i class="ri-image-line" style="color:#ddd;"></i>'}
                        </div>
                        <div style="flex:1; position:relative;">
                            <select class="filter-select mischer-acc-select" data-midx="${i}" style="width:100%; padding-right:2rem; ${M ? "" : "pointer-events:none; background-image:none !important;"}">
                                ${n.options
                                  .map(
                                    (v, S) => `
                                    <option value="${S}" ${l == S ? "selected" : ""}>${v.label} (${v.artNr})</option>
                                `,
                                  )
                                  .join("")}
                            </select>
                            ${M ? '<i class="ri-arrow-down-s-line" style="position:absolute; right:10px; top:50%; transform:translateY(-50%); pointer-events:none; color:var(--text-secondary); font-size:1.2rem;"></i>' : ""}
                        </div>
                    </div>
                `),
            e.appendChild(a));
        }),
          e.querySelectorAll(".mischer-acc-select").forEach((n) => {
            n.addEventListener("change", (i) => {
              const a = parseInt(n.dataset.midx),
                l = parseInt(n.value);
              this.mischerOptionsState[a] = l;
              ((this.showAccessoires = false), (this.selectedAddonAccessoires = []), this.updateAccessoiresToggles(), this.populateAccessoires(), this.renderConfigurator(), this.updateBOM());
            });
          }));
      },
      // Map a mounting-group name to the accessory pool's productType tag.
      _accFamily: function (groupName) {
        const n = (groupName || "").toLowerCase();
        if (/brauseschlauch/.test(n)) return "Brauseschlauch";
        if (/handbrause/.test(n)) return "Handbrause";
        if (/brausehalter/.test(n)) return "Brausehalter";
        if (/gleitstange/.test(n)) return "Gleitstange";
        if (/regenbrause|kopfbrause/.test(n)) return "Regenbrause";
        if (/brausearm|deckenanschluss/.test(n)) return "Brausearm";
        if (/anschlussbogen/.test(n)) return "Anschlussbogen";
        return null;
      },
      // Colour-match a mandatory accessory to the main mixer's brand + finish, like the MM
      // Regulierventil/Siphon: same-brand accessory of the same family in the mixer's colour
      // (Ch6 accessory pool). Returns {artNr,label,imgUrl} or null (chrome/no match -> default).
      matchAccessory: function (family, brand, colourCode) {
        if (!family || !brand || brand.toLowerCase() === "andere" || !colourCode || colourCode === "501") return null;
        const codeOf = (a) => { const m = String(a || "").match(/\.(\d{3})(?:\.|$)/); return m ? m[1] : null; };
        this._accPool = this._accPool || {};
        if (!this._accPool[family] || !this._accPool[family].length) {
          const pool = (window.productApps && window.productApps.zubehoer_pool && window.productApps.zubehoer_pool.trays) || [];
          this._accPool[family] = pool.filter((t) => t.productType === family);
        }
        const bl = brand.toLowerCase();
        for (const t of this._accPool[family]) {
          if ((t.manufacturer || "").toLowerCase() !== bl) continue;
          if (codeOf(t.artNr) === colourCode) return { artNr: t.artNr, label: t.label, imgUrl: t.imgUrl };
          const v = (t.variants || []).find((x) => codeOf(x.artNr) === colourCode);
          if (v) return { artNr: v.artNr, label: v.label || t.label, imgUrl: v.imgUrl || "" };
        }
        return null;
      },
      updateBOM: function () {
        let backBtn = document.getElementById("backToCatalogBtn");
        if (config.enableGalleryUX) {
            if (!this.selectedTray) {
                if (backBtn) backBtn.style.display = "none";
            } else {
                if (!backBtn) {
                    const h = document.querySelector(".bom-header");
                    if (h) {
                        backBtn = document.createElement("button");
                        backBtn.id = "backToCatalogBtn";
                        backBtn.className = "icon-btn highlight-btn";
                        backBtn.style.marginRight = "auto";
                        backBtn.innerHTML = '<i class="ri-arrow-left-s-line" aria-hidden="true"></i> Zurück zur Übersicht';
                        h.insertBefore(backBtn, h.firstChild);
                    }
                }
                if (backBtn) {
                    backBtn.onclick = () => {
                        if (window.currentActiveApp) {
                            if (typeof window.currentActiveApp.selectItem === 'function') {
                                window.currentActiveApp.selectItem(null);
                            } else if (typeof window.currentActiveApp.selectTray === 'function') {
                                window.currentActiveApp.selectTray(null);
                            }
                        }
                    };
                    backBtn.style.display = "inline-flex";
                }
            }
        }
        const r = document.getElementById("bomTableBody"),
          e = document.getElementById("bomCount");
        if (!r) return;
        if (((r.innerHTML = ""), !this.selectedTray)) {
          e && (e.textContent = "0 Artikel");
          return;
        }
        let t = 1;
        // Finish/colour variant selector (InlineBOM). Reset on tray change; the active SKU is the
        // chosen finish (default = the tray itself). Colour name derives from the art-Nr code.
        if (this._variantTrayId !== this.selectedTray.id) { this._variantTrayId = this.selectedTray.id; this.selectedVariantIdx = 0; }
        const _variants = this.selectedTray.variants || [];
        const _active = (this.selectedVariantIdx > 0 && _variants[this.selectedVariantIdx - 1]) ? _variants[this.selectedVariantIdx - 1] : this.selectedTray;
        const _finishName = (art) => { const m = String(art || '').match(/\.(\d{3})(?:\.|$)/); return (m && COLOR_NAMES[m[1]]) || (art || ''); };
        // Effective finish of the main mixer — mandatory accessories colour-match to it.
        const _mainCode = (String(_active.artNr).match(/\.(\d{3})(?:\.|$)/) || [])[1] || null;
        const _mixerBrand = this.selectedTray.manufacturer || '';
        // NOTE: a _imgDerive() helper used to sit here, fabricating a vendor CDN URL from
        // the art-Nr at render time and letting <img onerror> swallow the 404s. That is
        // live third-party traffic on every render and the exact pattern that got the
        // account shadow-banned. Removed: every URL it could resolve was fetched once,
        // offline, and baked into custom-data.json as a local img/*.webp (961 items), so
        // imgOf() now covers them. Items with no real photo fall back to the local icon.
        // Do not reintroduce a URL guesser — bake images in the scraper instead.
        let _mainDesc = `<div class="bom-desc">${fullLabel(_active)}</div>`;
        if (config.enableGalleryUX && _variants.length) {
            const _opts = [this.selectedTray, ..._variants].map((sk, idx) =>
                `<option value="${idx}" ${this.selectedVariantIdx === idx ? 'selected' : ''}>${_finishName(sk.artNr)} (${sk.artNr})</option>`).join('');
            _mainDesc += `
                <div class="bom-desc" style="margin-top:0.35rem; margin-bottom:0.25rem; font-size:0.75rem; color:var(--text-secondary); text-transform:uppercase;">Ausführung / Farbe</div>
                <select class="inline-bom-select" data-variant="1" style="width:100%; padding:0.5rem; border-radius:6px; border:1px solid var(--border); background:var(--bg-surface); color:var(--text-primary); font-size:0.9rem; font-family:inherit; font-weight:500; cursor:pointer; outline:none;">${_opts}</select>`;
        }
        ((r.innerHTML += `
                <tr class="bom-main-item">
                    <td><div class="img-cell">${imgOf(_active) ? `<img src="${imgOf(_active)}">` : '<i class="ri-image-line placeholder-icon" style="opacity:0.3;"></i>'}</div></td>
                    <td><span class="bom-code">${_active.artNr}</span></td>
                    <td>${_mainDesc}</td>

                    <td><strong>1</strong></td>
                </tr>
            `),
          this.selectedTray.mountingMaterials &&
            this.selectedTray.mountingMaterials.forEach((n, i) => {
              if (!this.isMatVisible(n, i)) return;
              const a = this.mischerOptionsState[i];
              if (a !== void 0) {
                const l = n.options[a];
                const isOhne = l && l.label.toLowerCase().startsWith("ohne");

                let isInlineDropdown = config.enableGalleryUX && n.options.length > 1;

                if (!isInlineDropdown && isOhne) return;

                const o = l ? (l.menge || 1) : 1;

                // Colour-match: when the main mixer is a coloured brand product, a mandatory
                // accessory becomes that brand's part in the matching finish (the Alterna
                // standard parts are chrome-only). Overrides the emitted line + drops the model
                // dropdown for that group (colour is dictated by the Armatur). Skipped for "ohne".
                const _fam = this._accFamily(n.name);
                const _cm = (_fam && !isOhne) ? this.matchAccessory(_fam, _mixerBrand, _mainCode) : null;

                let descHTML, artNrDisplay, imgSrc;
                if (_cm) {
                    artNrDisplay = _cm.artNr;
                    imgSrc = imgOf(_cm);
                    descHTML = `<div class="bom-desc">${fullLabel(_cm)}</div>
                        <div class="bom-desc" style="margin-top:0.2rem; font-size:0.7rem; color:var(--accent); text-transform:uppercase; letter-spacing:0.03em;">${n.name || 'Zubehör'} · Farbe passend zur Armatur</div>`;
                } else {
                    descHTML = `<div class="bom-desc">${l ? fullLabel(l) : ''}</div>`;
                    if (isInlineDropdown) {
                        const optionsHTML = n.options.map((opt, idx) => {
                            const selected = (a === idx) ? 'selected' : '';
                            return `<option value="${idx}" ${selected}>${opt.label} (${opt.artNr})</option>`;
                        }).join('');
                        descHTML = `
                            <div class="bom-desc" style="margin-bottom:0.25rem; font-size:0.75rem; color:var(--text-secondary); text-transform:uppercase;">${n.name || 'Zubehör'}</div>
                            <select class="inline-bom-select" data-midx="${i}" style="width: 100%; padding: 0.5rem; border-radius: 6px; border: 1px solid var(--border); background: var(--bg-surface); color: var(--text-primary); font-size: 0.9rem; margin-bottom: 0.25rem; font-family: inherit; font-weight: 500; cursor: pointer; outline: none; transition: border-color 0.2s ease;">
                                ${optionsHTML}
                            </select>
                        `;
                    }
                    artNrDisplay = isOhne ? '-' : (l ? l.artNr : '');
                    imgSrc = l ? imgOf(l) : '';
                }

                if (!isOhne) t += o;

                const rowOpacity = isOhne ? 'opacity: 0.6; background: rgba(0,0,0,0.02);' : '';
                const imgDisplay = imgSrc ? `<img src="${imgSrc}">` : '<i class="ri-settings-3-line" style="font-size:1.2rem;opacity:0.3;"></i>';

                r.innerHTML += `
                    <tr style="${rowOpacity}">
                        <td><div class="img-cell" ${!imgSrc ? 'style="background: transparent; border: 1px dashed var(--border);"' : ''}>${imgDisplay}</div></td>
                        <td><span class="bom-code">${artNrDisplay}</span></td>
                        <td>${descHTML}</td>
                        <td><strong>${isOhne ? '-' : o}</strong></td>
                    </tr>
                `;
              }
            }),
          (function() {
            if (this.showAccessoires && this.selectedAddonAccessoires && this.selectedAddonAccessoires.length > 0) {
                this.selectedAddonAccessoires.forEach(acc => {
                    t += 1;
                    r.innerHTML += `
                        <tr>
                            <td><div class="img-cell"><img src="${acc.imgUrl || ''}"></div></td>
                            <td><span class="bom-code">${acc.artNr}</span></td>
                            <td><div class="bom-desc">${fullLabel(acc)}</div></td>

                            <td><strong>1</strong></td>
                        </tr>
                    `;
                });
            }
        }).call(this), e && (e.textContent = `${t} Artikel gewählt`));
        priceBOM(r);   // append ‹without taxes› price column + grand total
        if (config.enableGalleryUX) {
            r.querySelectorAll('.inline-bom-select').forEach(sel => {
                sel.addEventListener('change', (ev) => {
                    if (ev.target.dataset.variant) {
                        this.selectedVariantIdx = parseInt(ev.target.value) || 0;
                    } else {
                        this.mischerOptionsState[parseInt(ev.target.dataset.midx)] = parseInt(ev.target.value);
                    }
                    this.showAccessoires = false;
                    this.selectedAddonAccessoires = [];
                    this.updateAccessoiresToggles();
                    this.populateAccessoires();
                    this.renderConfigurator();
                    this.updateBOM();
                });
            });
        }
      },

      clearBOM: function () {
        ((this.mischerOptionsState = {}), (this.showAccessoires = false), (this.selectedAddonAccessoires = []), this.updateAccessoiresToggles(), this.updateBOM());
      },
      copyToClipboard: window.copyBOMToClipboard,
    };
  }
  return ut(title, desc, mainImgUrl, config);
}
