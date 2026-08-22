import { matchesSearchQuery, configSidebar, bomTableBody, bomCountCounter, getVariantColor, isRealImg, imgOf, applyPillUI, Ae, re, me, ke, Be, X, priceBOM, productText, renderAccessoiresPanel, needsShowerAccessories, ensureShowerGroups, fullLabel, cleanSerie, artFinishCode, accFamilyOf, accSkuInColour, accGroupChoice, accTierNote, brausegarniturPlan, ACC_BUNDLED_BY_GARNITUR, requiredBodyFor, requiredArmFor, bodyPresentFor, bomExtraRowHTML, accQty, bomQtyCell, klappFixingRowsHTML, clearKlappPick} from './_shared.js';
import { COLOR_NAMES } from './_colorCodes.js';

export function createBademischerApp(title, desc, mainImgUrl, config = {}) {
  function transformBademischerUPTrays(trays) {
    if (!Array.isArray(trays)) return trays;
    return trays.map(tray => {
      // Abstellverschraubung rule (all montage): keep it ONLY when the description says
      // "ohne Abstellverschraubungen". Anything else — "mit Verschraubungen", "mit S-Anschlüssen",
      // or a label that simply doesn't state "ohne" — means it's already included → drop the
      // baked Abstellverschraubung line. (Everything else in Bademischer stays untouched.)
      // FULL-TEXT RULE: read label AND description for the "ohne"/UP classification.
      const trayFull = (tray.label || "") + " " + (tray.description || "");
      if (tray.mountingMaterials && !/ohne\s+abstellverschraubung/.test(trayFull.toLowerCase())) {
        tray.mountingMaterials = tray.mountingMaterials.filter(
          m => !(m.name || "").toLowerCase().includes("abstellverschraubung")
        );
      }

      // The SAME article under two group names is billed twice. 14 Standmodell trays
      // carry a "Zubehör (Automatisch Erkannt)" group holding exactly the Einbaukörper
      // the "Einbaukörper" group already offers (Alterna 6252 811, Hansgrohe 6412 905,
      // KWC 6118 128), so the Stückliste ordered — and charged — two floor bodies.
      // Compared by art-Nr SET, so a group that merely shares a first option survives;
      // the earlier group wins because the ERP name is the specific one.
      if (Array.isArray(tray.mountingMaterials)) {
        const seen = new Set();
        tray.mountingMaterials = tray.mountingMaterials.filter(m => {
          const key = (m.options || []).map(o => o && o.artNr).filter(Boolean).sort().join('|');
          if (!key || !seen.has(key)) { if (key) seen.add(key); return true; }
          return false;
        });
      }

      // Shower set (AP + UP): ERP-injected Bademischer often ship WITHOUT their
      // Brauseschlauch / Handbrause / Brausehalter. Add the house-standard groups when
      // missing so the copied Stückliste is complete — skips bath-only fillers
      // (Wanneneinlauf/Wannenfüll), self-contained systems and Standmodelle (which ship
      // the accessories inside the article). Runs before the UP-only logic below so
      // Aufputz Bademischer are covered too.
      const _isUPbath = /unterputz|endmontage|einbau|grundk[öo]rper/i.test(trayFull.toLowerCase());
      tray.mountingMaterials = ensureShowerGroups(tray.mountingMaterials || [], tray, { isBath: true, isUP: _isUPbath });

      // Only apply to UP products
      if (!tray.label || (!trayFull.includes('UP') && !trayFull.includes('Endmontage'))) return tray;
      if (!tray.mountingMaterials) return tray;

      // Grundkörper ALWAYS needs mounting brackets (same rule as Duschenmischer Unterputz):
      // a Grundkörper/Einbaukörper with no Montageschiene gets the brand's mounting set,
      // inserted right after the Grundkörper. KWC Homebox Endmontagesets need this.
      const hasMontage = tray.mountingMaterials.some(m => {
        const x = (m.name || "").toLowerCase();
        return x.includes("montageschiene") || x.includes("montageset");
      });
      const gkIdx = tray.mountingMaterials.findIndex(m => {
        const x = (m.name || "").toLowerCase();
        return x.includes("grundkörper") || x.includes("grundkoerper") || x.includes("einbaukörper") || x.includes("einbaukoerper") || x.includes("ibox") || x.includes("homebox");
      });
      if (gkIdx >= 0 && !hasMontage) {
        const mfr = (tray.manufacturer || "").toLowerCase();
        let bracket = null;
        if (mfr === "kwc") {
          const eLabel = (tray.mountingMaterials.find(m => /einbaukörper|grundkörper/i.test(m.name || ""))?.options?.[0]?.label || "").toLowerCase();
          bracket = /bluebox/.test(eLabel)
            ? { artNr: "6118 122.000.000", label: "Montageschiene KWC, zu Einbaukörper KWC Bluebox", menge: 1, type: "Zubehör", imgUrl: "img/PG1_06118122_000_000_4b6378f7.webp" }
            : { artNr: "6118 149.000.000", label: "Montageschiene KWC, zu Einbaukörper KWC Homebox", menge: 1, type: "Zubehör", imgUrl: "img/PG1_06118149_000_000_2c2ac83a.webp" };
        } else if (mfr === "hansgrohe") {
          bracket = { artNr: "6418 111.000.000", label: "Montageset Hansgrohe iBox Universal, 2 Montageschienen 550 mm, Befestigungsmaterial", menge: 1, type: "Zubehör", imgUrl: "img/PG1_06418111_000_000_79a07b3f.webp" };
        }
        if (bracket) tray.mountingMaterials.splice(gkIdx + 1, 0, { name: "Montageschiene", options: [bracket] });
      }

      const hasGleitstange = tray.mountingMaterials.some(m => (m.name || "").toLowerCase().includes("gleitstange"));
      if (hasGleitstange) return tray;

      // Add Duschgleitstange (Optional) as a brand new material
      tray.mountingMaterials.push({
        id: "mat_gleitstange_up",
        name: "Duschgleitstange (Optional)",
        options: [
          {
            artNr: "ohne_gleitstange",
            label: "Ohne Duschgleitstange",
            type: "Option",
            menge: 0,
            imgUrl: ""
          },
          {
            artNr: "6531 404.501.000",
            label: "Duschengleitstange Alterna fit Gelenkhalter Arretierungshebel, 1100 mm Verchromt",
            menge: 1,
            type: "Option",
            imgUrl: "img/PG1_06531404_501_000_371b9158.webp"
          },
          {
            artNr: "6531 403.501.000",
            label: "Duschengleitstange Alterna fit Gelenkhalter Arretierungshebel, 610 mm Verchromt",
            menge: 1,
            type: "Option",
            imgUrl: "img/PG1_06531403_501_000_7cf400fd.webp"
          }
        ]
      });
      return tray;
    });
  }

  function gt(B, F, R, N = {}) {
    const m = N.isBath || !1,
      s = B.replace(/\s/g, "");
    let _trays = [];
    return {
      get trays() { return _trays; },
      set trays(val) { _trays = transformBademischerUPTrays(val); },
      mainImgUrl: R,
      selectedTray: null,
      mischerOptionsState: {},
      // Per-group accessory choice on top of mischerOptionsState: {k:'std',i} keeps a
      // curated/ERP option, {k:'pool',art} a colour-matched part from the Zubehör pool.
      // A pool pick survives a finish change — the MODEL is remembered, the colour
      // follows the Armatur (accSkuInColour).
      accPick: {},
      currentHersteller: "all",
      currentMontage: "all",
      currentSerie: "all",
      showAccessoires: false,
      selectedAddonAccessoires: [],
      accQty: {},

      accFacets: {},
      init: function () {
        ((this.selectedTray = null),
          (this.mischerOptionsState = {}),
          (this.accPick = {}),
          (this.currentHersteller = "all"),
          (this.currentMontage = "all"),
          (this.currentSerie = "all"),
          (this.showAccessoires = false),
          (this.selectedAddonAccessoires = [], this.accQty = {}),
          (this.accFacets = {}),
          this.renderSidebar(),
          this.bindFilters(), this.filterResults());
          if (!config.enableGalleryUX) { this.clearBOM(); }
      },
      applyGleitstangeHoseRelation: function (gleitMidx) {
        if (!this.selectedTray || !this.selectedTray.mountingMaterials) return;
        const o = this.selectedTray.mountingMaterials[gleitMidx];
        const l = this.mischerOptionsState[gleitMidx];
        if (l === undefined) return;
        const M = o.options[l];
        if (!M) return;
        const v = this.selectedTray.mountingMaterials.findIndex((S) =>
          (S.name || "").toLowerCase().includes("brauseschlauch"),
        );
        if (v >= 0) {
          const S = this.selectedTray.mountingMaterials[v];
          const parseLength = (label) => {
            const lbl = label.toLowerCase();
            if (lbl.includes("ohne") || lbl.includes("without")) return 0;
            let m = lbl.match(/(\d+)\s*mm/i);
            if (m) return parseInt(m[1]);
            m = lbl.match(/(\d+)\s*cm/i);
            if (m) return parseInt(m[1]) * 10;
            m = lbl.match(/(\d+(?:\.\d+)?)\s*m/i);
            if (m) return parseFloat(m[1]) * 1000;
            return 0;
          };
          const validHoses = S.options
            .map((opt, idx) => ({ idx, opt, len: parseLength(opt.label) }))
            .filter(item => item.len > 0);
          if (validHoses.length > 0) {
            if (M.label.toLowerCase().startsWith("ohne") || M.artNr.toLowerCase() === "ohne") {
              validHoses.sort((a, b) => a.len - b.len);
              this.mischerOptionsState[v] = validHoses[0].idx;
            } else {
              const hose180 = validHoses.find(item => item.len === 1800);
              if (hose180) {
                this.mischerOptionsState[v] = hose180.idx;
              } else {
                validHoses.sort((a, b) => b.len - a.len);
                this.mischerOptionsState[v] = validHoses[0].idx;
              }
            }
          }
        }
      },
      normalizeBademischerSerie: function (r, e = "") {
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
          // cleanSerie has the last word: it drops the product type in front
          // ("Wanneneinlauf Vaia") and the variant behind ("Habito-Standmodell").
          t
            ? cleanSerie(
                t
                  .split(" ")
                  .map((i) =>
                    /^kwc$/i.test(i)
                      ? "KWC"
                      : /^\d/.test(i)
                        ? i
                        : i.charAt(0).toUpperCase() + i.slice(1),
                  )
                  .join(" ")
              ) || "Andere"
            : "Andere"
        );
      },
      extractSerie: function (r) {
        if (r.serie)
          return this.normalizeBademischerSerie(r.serie, r.manufacturer);
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
        // FULL-TEXT RULE (INSTRUCTIONS §1): the series is a leading token, but the label
        // can be truncated to nothing usable — parse the label first, then fall back to the
        // description (same prefix structure) so a truncated label never loses the series.
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
          // "Bademischer-Set KWC Thermostat Fit" — the leading "-Set" has to go here,
          // or the "…Thermostat …" rule below truncates the series away and every
          // KWC set lands on one "Set" pill.
          t = t.replace(/^-?\s*set\b/, "").trim();
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
        return this.normalizeBademischerSerie(i, r.manufacturer);
      },
      extractMontage: function (r) {
        // FULL-TEXT RULE: mounting keywords (Unterputz/Aufputz/Standmodell) can be truncated
        // off the label — classify from label AND description.
        const e = ((r.label || "") + " " + (r.description || "")).toLowerCase();
        return m && (e.includes("standmodell") || e.includes("freistehend"))
          ? "Standmodell"
          : e.includes("unterputz") ||
              e.includes(" up ") ||
              e.includes("einbau") ||
              e.includes("endmontageset") ||
              e.includes("grundkörper") ||
              e.includes("grundkoerper")
            ? "Unterputz"
            : (e.includes("aufputz") ||
                e.includes(" ap ") ||
                e.includes("wandbatterie") ||
                e.includes("wandmischer") ||
                e.includes("ad 153 mm") ||
                e.includes("aufputz-duschenmischer") ||
                e.includes("thermostat-duschenmischer"),
              "Aufputz");
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
              this.accPick = {};
              this.showAccessoires = false;
              this.selectedAddonAccessoires = [], this.accQty = {};
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
              this.accPick = {};
              this.showAccessoires = false;
              this.selectedAddonAccessoires = [], this.accQty = {};
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
          (this.accPick = {}),
          this.selectedTray &&
            this.selectedTray.mountingMaterials &&
            (this.selectedTray.mountingMaterials.forEach((e, t) => {
              e.options &&
                e.options.length > 0 &&
                (this.mischerOptionsState[t] = 0);
            }),
            this.selectedTray.mountingMaterials.forEach((e, t) => {
              const y = (e.name || "").toLowerCase();
              if (y.includes("gleitstange") || y.includes("duschgleitstange")) {
                this.applyGleitstangeHoseRelation(t);
              }
            })),
          this.filterResults(),
          (this.showAccessoires = false), (this.selectedAddonAccessoires = [], this.accQty = {}), this.updateAccessoiresToggles(), this.populateAccessoires(), this.renderConfigurator(), this.updateBOM());
      },
      // The SKU in the BOM's main row — the chosen finish variant, or the tray itself.
      // Accessory colour matching keys off its art-Nr triplet (COLOUR RULE).
      activeSku: function () {
        if (!this.selectedTray) return null;
        const v = this.selectedTray.variants || [];
        return (this.selectedVariantIdx > 0 && v[this.selectedVariantIdx - 1]) ? v[this.selectedVariantIdx - 1] : this.selectedTray;
      },
      // The part actually sitting in group `idx`: the user's dropdown pick (a pool
      // part, re-resolved into the current finish) or the standard option. Rules that
      // read one group to decide another's visibility must go through this, or they
      // judge a part the BOM no longer shows.
      effectiveMat: function (idx) {
        const g = ((this.selectedTray && this.selectedTray.mountingMaterials) || [])[idx];
        if (!g) return null;
        const p = this.accPick && this.accPick[idx];
        if (p && p.k === "pool") {
          const hit = accSkuInColour(accFamilyOf(g.name), p.art, artFinishCode((this.activeSku() || {}).artNr));
          if (hit) return hit;
        }
        const i = this.mischerOptionsState[idx];
        return (i !== void 0 && g.options) ? g.options[i] : null;
      },
      isMatVisible: function (r, e) {
        if (!this.selectedTray || !this.selectedTray.mountingMaterials)
          return !0;
        if ((r.name || "").toLowerCase().includes("brausehalter")) {
          const n = this.selectedTray.mountingMaterials.findIndex(
            (a) =>
              (a.name || "").toLowerCase().includes("duschgleitstange") ||
              (a.name || "").toLowerCase().includes("gleitstange"),
          );
          if (n >= 0) {
            const a = this.effectiveMat(n);
            if (a && !(a.label || "").toLowerCase().startsWith("ohne")) return !1;
          }
          const i = this.selectedTray.mountingMaterials.findIndex((a) =>
            (a.name || "").toLowerCase().includes("anschlussbogen"),
          );
          if (i >= 0) {
            // FULL-TEXT RULE: the integrated-holder wording is regularly truncated out
            // of the label and only stated in the description.
            const a = this.effectiveMat(i);
            const x = a ? productText(a) : "";
            if (
              (a && /mit integriertem brausehalter|mit brausehalter/.test(x)) ||
              (a && a.artNr === "bitte_waehlen")
            )
              return !1;
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
            y = (o == null ? void 0 : o.imgUrl) || "",
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
              if (!this.accPick) this.accPick = {};
              this.accPick[a] = { k: "std", i: l };   // an explicit pick outranks the colour auto-match
              const o = this.selectedTray.mountingMaterials[a],
                y = (o.name || "").toLowerCase();
              if (y.includes("gleitstange") || y.includes("duschgleitstange")) {
                this.applyGleitstangeHoseRelation(a);
              }
              ((this.showAccessoires = false), (this.selectedAddonAccessoires = [], this.accQty = {}), this.updateAccessoiresToggles(), this.populateAccessoires(), this.renderConfigurator(), this.updateBOM());
            });
          }));
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
        // Effective finish of the main mixer — the accessory dropdowns are narrowed to it.
        const _mainCode = artFinishCode(_active.artNr);
        const _mixerBrand = this.selectedTray.manufacturer || '';
        const _mixerSerie = String(this.extractSerie ? (this.extractSerie(this.selectedTray) || '') : '').toLowerCase().trim();
        // Art-Nrs already in this BOM: two groups of the same family must not auto-match
        // onto the identical SKU (Handbrause + Handbrausegarnitur would duplicate).
        const _usedArt = new Set([_active.artNr]);
        if (!this.accPick) this.accPick = {};
        let _mainDesc = `<div class="bom-desc">${fullLabel(_active)}</div>`;
        if (config.enableGalleryUX && _variants.length) {
            const _opts = [this.selectedTray, ..._variants].map((sk, idx) =>
                `<option value="${idx}" ${this.selectedVariantIdx === idx ? 'selected' : ''}>${_finishName(sk.artNr)} (${sk.artNr})</option>`).join('');
            _mainDesc += `
                <div class="bom-desc" style="margin-top:0.35rem; margin-bottom:0.25rem; font-size:0.75rem; color:var(--text-secondary); text-transform:uppercase;">Ausführung / Farbe</div>
                <select class="inline-bom-select" data-variant="1" style="width:100%; padding:0.5rem; border-radius:6px; border:1px solid var(--border); background:var(--bg-surface); color:var(--text-primary); font-size:0.9rem; font-family:inherit; font-weight:500; cursor:pointer; outline:none;">${_opts}</select>`;
        }

        const _garnitur = brausegarniturPlan(this.selectedTray.mountingMaterials, {
            brand: _mixerBrand, code: _mainCode, serie: _mixerSerie, picks: this.accPick
        });
        // Does the tray already show an arm? A head sold "ohne Anschlussbogen" only needs
        // one injected when no Brausearm/Deckenanschluss row is standing. effectiveMat()
        // is the rule for reading one group to decide another — it sees the user's pick.
        const _hasArmRow = (this.selectedTray.mountingMaterials || []).some((m, idx) => {
            if (accFamilyOf(m.name) !== 'Brausearm' || !this.isMatVisible(m, idx)) return false;
            const cur = this.effectiveMat(idx);
            return !!(cur && !/^ohne/i.test(cur.label || ''));   // label-prefix by design
        });

        // The mixer's OWN body. A Standmodell is the mixer plus its Bodeneinbaukörper and
        // nothing else, so when the tray only NAMES the body in its text and carries no
        // Einbaukörper group to pick it from, the one mandatory position would be missing
        // altogether — five Standmodelle were in exactly that state. Injected only when no
        // group already offers that base, or the group and this row would bill it twice.
        let _trayBodyHTML = '';
        const _trayBody = requiredBodyFor(_active);
        if (_trayBody) {
            const _base = (a) => String(a || '').replace(/[^0-9]/g, '').slice(0, 7);
            const _wanted = _trayBody.artNr ? _base(_trayBody.artNr) : String(_trayBody.missingBase || '').replace(/[^0-9]/g, '');
            const _inGroup = (this.selectedTray.mountingMaterials || []).some(m =>
                (m.options || []).some(o => o && _base(o.artNr) === _wanted));
            if (!_inGroup) {
                if (_trayBody.artNr) { _usedArt.add(_trayBody.artNr); t += 1; }
                _trayBodyHTML = bomExtraRowHTML(_trayBody, 'zwingend zur Armatur');
            }
        }

        ((r.innerHTML += `
                <tr class="bom-main-item">
                    <td><div class="img-cell">${imgOf(_active) ? `<img src="${imgOf(_active)}">` : '<i class="ri-image-line placeholder-icon" style="opacity:0.3;"></i>'}</div></td>
                    <td><span class="bom-code">${_active.artNr}</span></td>
                    <td>${_mainDesc}</td>

                    <td><strong>1</strong></td>
                </tr>
            ` + _trayBodyHTML),
          this.selectedTray.mountingMaterials &&
            this.selectedTray.mountingMaterials.forEach((n, i) => {
              if (!this.isMatVisible(n, i)) return;
              const a = this.mischerOptionsState[i];
              if (a !== void 0) {
                const fam = accFamilyOf(n.name);
                const allowAuto = _garnitur.forceAuto && fam === 'Brausegarnitur';
                // Only the rows the CHOSEN set actually contains go off (a hose set
                // leaves the Gleitstange row standing).
                const forceOhne = _garnitur.forceOhne && (_garnitur.bundled || ACC_BUNDLED_BY_GARNITUR).indexOf(fam) >= 0;

                const choice = accGroupChoice(n, {
                    brand: _mixerBrand, code: _mainCode, serie: _mixerSerie,
                    stdIdx: a, pick: this.accPick[i], used: _usedArt,
                    forceOhne: forceOhne, allowOhneAutoMatch: allowAuto,
                    autoArt: allowAuto ? _garnitur.autoArt : null
                });
                const l = choice.item;
                const isOhne = choice.isOhne;

                let isInlineDropdown = config.enableGalleryUX && choice.hasChoices;

                if (!isInlineDropdown && isOhne && !choice.forcedOhne) return;
                // A part sold "zu Einbaukörper NNNN NNN" leaves with that body: the
                // Einbaukörper row is rendered first, so _usedArt already knows.
                if (!isOhne && l && !bodyPresentFor(l, _usedArt)) return;
                if (l && l.artNr) _usedArt.add(l.artNr);

                let descHTML = `<div class="bom-desc">${l ? fullLabel(l) : ''}</div>`;
                if (isInlineDropdown) {
                    descHTML = `
                        <div class="bom-desc" style="margin-bottom:0.25rem; font-size:0.75rem; color:var(--text-secondary); text-transform:uppercase;">${n.name || 'Zubehör'}</div>
                        <select class="inline-bom-select" data-midx="${i}" style="width: 100%; padding: 0.5rem; border-radius: 6px; border: 1px solid var(--border); background: var(--bg-surface); color: var(--text-primary); font-size: 0.9rem; margin-bottom: 0.25rem; font-family: inherit; font-weight: 500; cursor: pointer; outline: none; transition: border-color 0.2s ease;">
                            ${choice.optionsHTML}
                        </select>
                    `;
                    if (choice.tier) descHTML += `<div class="bom-desc" style="font-size:0.7rem; color:var(--accent); text-transform:uppercase; letter-spacing:0.03em;">${accTierNote(choice.tier)}</div>`;
                } else if (choice.tier) {
                    descHTML += `<div class="bom-desc" style="margin-top:0.2rem; font-size:0.7rem; color:var(--accent); text-transform:uppercase; letter-spacing:0.03em;">${n.name || 'Zubehör'} · ${accTierNote(choice.tier)}</div>`;
                }
                if (choice.forcedOhne) descHTML += `<div class="bom-desc" style="margin-top:0.2rem; font-size:0.7rem; color:var(--text-secondary); text-transform:uppercase; letter-spacing:0.03em;">In der Brausegarnitur enthalten</div>`;

                const o = l ? (l.menge || 1) : 1;
                if (!isOhne) t += o;

                const rowOpacity = isOhne ? 'opacity: 0.6; background: rgba(0,0,0,0.02);' : '';
                const artNrDisplay = isOhne ? '-' : (l ? l.artNr : '');
                const imgSrc = l ? imgOf(l) : '';
                const imgDisplay = imgSrc ? `<img src="${imgSrc}">` : '<i class="ri-settings-3-line" style="font-size:1.2rem;opacity:0.3;"></i>';

                r.innerHTML += `
                    <tr style="${rowOpacity}">
                        <td><div class="img-cell" ${!imgSrc ? 'style="background: transparent; border: 1px dashed var(--border);"' : ''}>${imgDisplay}</div></td>
                        <td><span class="bom-code">${artNrDisplay}</span></td>
                        <td>${descHTML}</td>
                        <td><strong>${isOhne ? '-' : o}</strong></td>
                    </tr>
                `;

                // A concealed head names the Einbaukörper it is sold without — it rides along.
                if (!isOhne && l) {
                    const body = requiredBodyFor(l);
                    if (body && !(body.artNr && _usedArt.has(body.artNr))) {
                        if (body.artNr) { _usedArt.add(body.artNr); t += 1; }
                        r.innerHTML += bomExtraRowHTML(body, `zwingend zu ${n.name || 'Zubehör'}`);
                    }
                    // …and a head sold "ohne Anschlussbogen" needs an arm to hang on.
                    // Skipped when the tray already carries a filled Brausearm row.
                    if (!_hasArmRow) {
                        const arm = requiredArmFor(l, { brand: l.brand || _mixerBrand, code: _mainCode, used: _usedArt });
                        if (arm) {
                            if (arm.artNr) { _usedArt.add(arm.artNr); t += 1; }
                            // The row carries no dropdown, so it says what it settled for.
                            const armNote = `zwingend zu ${n.name || 'Zubehör'}`
                                + (arm.tier && arm.tier !== 1 ? ` · ${accTierNote(arm.tier)}` : '');
                            r.innerHTML += bomExtraRowHTML(arm, armNote);
                        }
                    }
                }
              }
            }),
          (function() {
            if (this.showAccessoires && this.selectedAddonAccessoires && this.selectedAddonAccessoires.length > 0) {
                this.selectedAddonAccessoires.forEach(acc => {
                    const q = accQty(this, acc);
                    t += q;
                    r.innerHTML += `
                        <tr>
                            <td><div class="img-cell"><img src="${acc.imgUrl || ''}"></div></td>
                            <td><span class="bom-code">${acc.artNr}</span></td>
                            <td><div class="bom-desc">${fullLabel(acc)}</div></td>
                            
                            ${bomQtyCell(q, acc.artNr)}
                        </tr>
                        ${klappFixingRowsHTML(this, acc)}
                    `;
                });
            }
        }).call(this), e && (e.textContent = `${t} Artikel gewählt`));
        priceBOM(document.getElementById('bomTableBody'));
        if (config.enableGalleryUX) {
            r.querySelectorAll('.inline-bom-select').forEach(sel => {
                sel.addEventListener('change', (ev) => {
                    if (ev.target.dataset.variant) {
                        // Finish change: pool picks are NOT reset — accGroupChoice re-resolves
                        // each chosen model into the new colour, so the user keeps their parts.
                        this.selectedVariantIdx = parseInt(ev.target.value) || 0;
                    } else {
                        const midx = parseInt(ev.target.dataset.midx);
                        const v = String(ev.target.value || '');
                        if (!this.accPick) this.accPick = {};
                        if (v.charAt(0) === 'c') {
                            this.accPick[midx] = { k: 'pool', art: v.slice(1) };
                        } else {
                            const oi = parseInt(v.slice(1)) || 0;
                            this.accPick[midx] = { k: 'std', i: oi };
                            this.mischerOptionsState[midx] = oi;
                            const o = this.selectedTray.mountingMaterials[midx],
                              y = (o.name || "").toLowerCase();
                            if (y.includes("gleitstange") || y.includes("duschgleitstange")) {
                              this.applyGleitstangeHoseRelation(midx);
                            }
                        }
                    }
                    this.showAccessoires = false;
                    this.selectedAddonAccessoires = [], this.accQty = {};
                    this.updateAccessoiresToggles();
                    this.populateAccessoires();
                    this.renderConfigurator();
                    this.updateBOM();
                });
            });
        }
      },

      clearBOM: function () {
        ((this.mischerOptionsState = {}), (this.accPick = {}), (this.showAccessoires = false), (this.selectedAddonAccessoires = [], this.accQty = {}), this.updateAccessoiresToggles(), this.updateBOM());
      },
      copyToClipboard: window.copyBOMToClipboard,
    };
  }
  return gt(title, desc, mainImgUrl, config);
}
