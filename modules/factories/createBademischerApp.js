import { matchesSearchQuery, configSidebar, bomTableBody, bomCountCounter, getVariantColor, getSanitasImgUrl, applyPillUI, Ae, re, me, ke, Be, X } from './_shared.js';

export function createBademischerApp(title, desc, mainImgUrl, config = {}) {
  function transformBademischerUPTrays(trays) {
    if (!Array.isArray(trays)) return trays;
    return trays.map(tray => {
      // Only apply to UP products
      if (!tray.label || (!tray.label.includes('UP') && !tray.label.includes('Endmontage'))) return tray;
      if (!tray.mountingMaterials) return tray;
      
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
            imgUrl: "https://profishop.sanitastroesch.ch/multimedia/Web/PG1/06531404_501_000.png"
          },
          {
            artNr: "6531 403.501.000",
            label: "Duschengleitstange Alterna fit Gelenkhalter Arretierungshebel, 610 mm Verchromt",
            menge: 1,
            type: "Option",
            imgUrl: "https://profishop.sanitastroesch.ch/multimedia/Web/PG1/06531403_501_000.png"
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
      currentHersteller: "all",
      currentMontage: "all",
      currentSerie: "all",
      showAccessoires: false,
      selectedAddonAccessoires: [],
      currentAccessoireSerie: 'Alle',
      init: function () {
        ((this.selectedTray = null),
          (this.mischerOptionsState = {}),
          (this.currentHersteller = "all"),
          (this.currentMontage = "all"),
          (this.currentSerie = "all"),
          (this.showAccessoires = false),
          (this.selectedAddonAccessoires = []),
          (this.currentAccessoireSerie = 'Alle'),
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
        let t = (r.label || "").toLowerCase();
        if (r.manufacturer) {
          const a = r.manufacturer.toLowerCase();
          t.startsWith(a) && (t = t.slice(a.length).trim());
        }
        for (const a of e)
          if (t.startsWith(a)) {
            t = t.slice(a.length).trim();
            break;
          }
        if (
          ((t = t.replace(/-?endmontageset/g, "").trim()),
          (t = t.replace(/-?fertigmontageset/g, "").trim()),
          r.manufacturer)
        ) {
          const a = r.manufacturer.toLowerCase();
          t.startsWith(a) && (t = t.slice(a.length).trim());
        }
        const n = t.match(
          /^(.*?)(?:\s+\d+\s*[xX]\s*\d+|\s*,|\s*\(|\s+-|\s+\d+mm|\s+\d+\s*mm)/,
        );
        let i = n && n[1] ? n[1].trim() : t.trim();
        return this.normalizeBademischerSerie(i, r.manufacturer);
      },
      extractMontage: function (r) {
        const e = (r.label || "").toLowerCase();
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
                        <div class="finder-sub-header">Serie</div>
                        <div class="pill-group" id="list_addon_accessoires_serie_${s}" style="margin-bottom: 0.75rem;"></div>
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
            const listId = `list_addon_accessoires_${s}`;
            const serieListId = `list_addon_accessoires_serie_${s}`;
            const listEl = document.getElementById(listId);
            const serieListEl = document.getElementById(serieListId);
            if (!listEl || !serieListEl) return;
            
            let candidates = [];
            const allApps = window.productApps || {};
            const keywords = ['badetuchstange', 'schwammhalter', 'eckseifenhalter', 'drahtseifenhalter', 'duschkorb'];
            
            Object.keys(allApps).forEach(appKey => {
                const a = allApps[appKey];
                if (a.trays) {
                    a.trays.forEach(t => {
                        const lbl = (t.label || t.name || '').toLowerCase();
                        if (keywords.some(kw => lbl.includes(kw))) {
                            candidates.push(t);
                        }
                    });
                }
            });
            const seen = new Set();
            candidates = candidates.filter(c => {
                if (seen.has(c.artNr)) return false;
                seen.add(c.artNr);
                return true;
            });

            const extractAccessoireSerie = (t) => {
                if (t.serie) return t.serie;
                let label = (t.label || '').toLowerCase();
                if (t.manufacturer) {
                    const m = t.manufacturer.toLowerCase();
                    if (label.startsWith(m)) label = label.slice(m.length).trim();
                }
                for (const kw of keywords) {
                    if (label.startsWith(kw)) {
                        label = label.slice(kw.length).trim();
                        break;
                    }
                }
                if (t.manufacturer) {
                    const m = t.manufacturer.toLowerCase();
                    if (label.startsWith(m)) label = label.slice(m.length).trim();
                }
                const match = label.match(/^(.*?)(?:\s+\d+\s*[xX]\s*\d+|\s*,|\s*\(|\s+-|\s+\d+mm|\s+\d+\s*mm)/);
                let serie = match && match[1] ? match[1].trim() : label.trim();
                if (serie.includes(' ')) serie = serie.split(' ')[0];
                return serie ? serie.charAt(0).toUpperCase() + serie.slice(1) : 'Andere';
            };

            // Filters
            const seriesList = ['Alle'];
            candidates.forEach(c => {
                const s = extractAccessoireSerie(c);
                if (!seriesList.includes(s)) seriesList.push(s);
            });
            
            serieListEl.innerHTML = seriesList.map(sx => 
                `<button class="pill-btn ${this.currentAccessoireSerie === sx ? 'active' : ''}" data-val="${sx}">${sx}</button>`
            ).join('');
            
            serieListEl.querySelectorAll('.pill-btn').forEach(b => {
                b.addEventListener('click', () => {
                    this.currentAccessoireSerie = b.dataset.val;
                    this.populateAccessoires();
                });
            });

            let filtered = candidates;
            if (this.currentAccessoireSerie !== 'Alle') {
                filtered = filtered.filter(c => extractAccessoireSerie(c) === this.currentAccessoireSerie);
            }

            listEl.innerHTML = '';
            if (filtered.length === 0) {
                listEl.innerHTML = '<div class="finder-empty-state" style="font-size:0.8rem;">Keine Accessoires gefunden.</div>';
                return;
            }

            filtered.forEach(c => {
                const btn = document.createElement('div');
                const isSelected = this.selectedAddonAccessoires.some(x => x.artNr === c.artNr);
                btn.className = `finder-item ${isSelected ? 'active' : ''}`;
                btn.innerHTML = `
                    <div style="display:flex; align-items:center; gap:0.5rem;">
                        ${c.imgUrl ? `<img src="${c.imgUrl}" style="width:32px; height:32px; object-fit:contain; background:#fff; border-radius:4px; padding:2px; flex-shrink:0;">` : `<div style="width:32px; height:32px; display:flex; align-items:center; justify-content:center; background:var(--bg-surface); border-radius:4px; flex-shrink:0;"><i class="ri-image-line placeholder-icon"></i></div>`}
                        <div>
                            <div style="font-size:0.8rem; font-weight:500; line-height:1.3;">${c.label || c.name}</div>
                            <div style="font-size:0.7rem; color:var(--st-gray); margin-top:0.25rem;">
                                ${c.manufacturer || ''} ${extractAccessoireSerie(c) !== 'Andere' ? '· ' + extractAccessoireSerie(c) : ''}
                            </div>
                        </div>
                    </div>
                    <div style="font-size:0.75rem; color:var(--st-gray); font-family:var(--st-font-mono); margin-top:0.5rem; text-align:right;">${c.artNr}</div>
                `;
                btn.addEventListener('click', () => {
                    if (isSelected) {
                        this.selectedAddonAccessoires = this.selectedAddonAccessoires.filter(x => x.artNr !== c.artNr);
                    } else {
                        this.selectedAddonAccessoires.push({ ...c, qty: 1, origin: 'Zusatzoptionen' });
                    }
                    this.populateAccessoires();
                    this.updateBOM();
                });
                listEl.appendChild(btn);
            });
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
                            ${(t.imgUrl || getSanitasImgUrl(t.artNr)) ? `<img src="${t.imgUrl || getSanitasImgUrl(t.artNr)}" loading="lazy" style="max-height:100%; max-width:100%; object-fit:contain;">` : '<i class="ri-image-line placeholder-icon" style="font-size:2rem; color:var(--text-secondary);"></i>'}
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
          (this.showAccessoires = false), (this.selectedAddonAccessoires = []), this.updateAccessoiresToggles(), this.populateAccessoires(), this.renderConfigurator(), this.updateBOM());
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
          if (n >= 0 && this.mischerOptionsState[n] !== void 0) {
            const a =
              this.selectedTray.mountingMaterials[n].options[
                this.mischerOptionsState[n]
              ];
            if (a && !a.label.toLowerCase().startsWith("ohne")) return !1;
          }
          const i = this.selectedTray.mountingMaterials.findIndex((a) =>
            (a.name || "").toLowerCase().includes("anschlussbogen"),
          );
          if (i >= 0 && this.mischerOptionsState[i] !== void 0) {
            const a =
              this.selectedTray.mountingMaterials[i].options[
                this.mischerOptionsState[i]
              ];
            if (
              (a &&
                a.label
                  .toLowerCase()
                  .includes("mit integriertem brausehalter")) ||
              (a && a.label.toLowerCase().includes("mit brausehalter")) ||
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
              const o = this.selectedTray.mountingMaterials[a],
                y = (o.name || "").toLowerCase();
              if (y.includes("gleitstange") || y.includes("duschgleitstange")) {
                this.applyGleitstangeHoseRelation(a);
              }
              ((this.showAccessoires = false), (this.selectedAddonAccessoires = []), this.updateAccessoiresToggles(), this.populateAccessoires(), this.renderConfigurator(), this.updateBOM());
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
        ((r.innerHTML += `
                <tr class="bom-main-item">
                    <td><div class="img-cell"><img src="${this.selectedTray.imgUrl || ""}"></div></td>
                    <td><span class="bom-code">${this.selectedTray.artNr}</span></td>
                    <td><div class="bom-desc">${this.selectedTray.label}</div></td>
                    
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

                let descHTML = `<div class="bom-desc">${l ? l.label : ''}</div>`;
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

                const o = l ? (l.menge || 1) : 1;
                if (!isOhne) t += o;

                const rowOpacity = isOhne ? 'opacity: 0.6; background: rgba(0,0,0,0.02);' : '';
                const artNrDisplay = isOhne ? '-' : (l ? l.artNr : '');
                const imgDisplay = (l && l.imgUrl) ? `<img src="${l.imgUrl}">` : '<i class="ri-settings-3-line" style="font-size:1.2rem;opacity:0.3;"></i>';

                r.innerHTML += `
                    <tr style="${rowOpacity}">
                        <td><div class="img-cell" ${!(l && l.imgUrl) ? 'style="background: transparent; border: 1px dashed var(--border);"' : ''}>${imgDisplay}</div></td>
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
                            <td><div class="bom-desc">${acc.label || acc.name}</div></td>
                            
                            <td><strong>1</strong></td>
                        </tr>
                    `;
                });
            }
        }).call(this), e && (e.textContent = `${t} Artikel gewählt`));
        if (config.enableGalleryUX) {
            r.querySelectorAll('.inline-bom-select').forEach(sel => {
                sel.addEventListener('change', (ev) => {
                    const midx = parseInt(ev.target.dataset.midx);
                    const newVal = parseInt(ev.target.value);
                    this.mischerOptionsState[midx] = newVal;
                    
                    const o = this.selectedTray.mountingMaterials[midx],
                      y = (o.name || "").toLowerCase();
                    if (y.includes("gleitstange") || y.includes("duschgleitstange")) {
                      this.applyGleitstangeHoseRelation(midx);
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
  return gt(title, desc, mainImgUrl, config);
}
