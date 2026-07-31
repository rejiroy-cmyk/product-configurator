import { matchesSearchQuery, configSidebar, bomTableBody, bomCountCounter, getVariantColor, isRealImg, imgOf, applyPillUI, Ae, re, me, ke, Be, X, priceBOM, renderAccessoiresPanel } from './_shared.js';

export function createWashbasinApp(title, desc, mainImgUrl, config = {}) {
    const suffix = title.replace(/\s/g, '');

    return {
        trays: [],
        mainImgUrl: mainImgUrl,
        selectedTray: null,
        showAccessoires: false,
        selectedAddonAccessoires: [],
        currentAccessoireSerie: 'Alle',
        accSecondary: {},
        init: function () {
            this.selectedTray = null;
            this.showAccessoires = false;
            this.selectedAddonAccessoires = [];
            this.currentAccessoireSerie = 'Alle';
            this.accSecondary = {};
            this.currentBrand = 'all';
            this.currentAusfuehrung = 'all';
            this.currentSerie = 'all';
            this.currentSize = 'all';
            this.currentHahnloch = 'all';
            this.currentUeberlauf = 'all';
            this.currentAbstell = 'all';
            this.renderSidebar();
            this.updatePillFilters();
            this.filterResults(); // initial run
            this.clearBOM();
        },
        extractHahnloch: function (obj) {
            const label = ((obj.label || '') + ' ' + (obj.description || '')).toLowerCase();
            if (label.includes('ohne armaturenloch') || label.includes('ohne armaturenlöcher') || label.includes('ohne hahnloch')) return 'ohne';
            if (label.includes('3 armaturen') || label.includes('3 hahnlöcher')) return '3';
            if (label.includes('2 armaturen') || label.includes('2 hahnlöcher')) return '2';
            if (label.includes('armaturenloch') || label.includes('hahnloch')) return '1';
            return 'unknown';
        },
        extractUeberlauf: function (obj) {
            const lbl = (obj.label || '').toLowerCase();
            const text = (obj.description || '').toLowerCase() + ' ' + lbl;

            // 1. Check for overrides first (from Admin manual edits)
            if (obj.overrideUeberlauf) return obj.overrideUeberlauf;

            // 2. Specific "Ohne Überlauf" indicators
            if (text.includes('ohne überlauf') || text.includes('ohne ueberlauf') ||
                text.includes('ohne ü-') || text.includes('o.ü') || text.includes('o. ue') ||
                text.includes('kein überlauf')) return 'ohne';

            // 3. Specific "Mit Überlauf" indicators
            if (text.includes('mit überlauf') || text.includes('mit ueberlauf') ||
                text.includes('mit ü-') || text.includes('m.ü') || text.includes('m. ue') ||
                text.includes('überlauf') || text.includes('ueberlauf')) return 'mit';

            // 4. Fallback for generic "mit" / "ohne" (only if NOT clearly attached to Armaturenloch)
            if (text.includes('ohne') && !text.includes('ohne armaturenloch') && !text.includes('ohne hahnloch')) return 'ohne';
            if (text.includes('mit') && !text.includes('mit armaturenloch') && !text.includes('mit hahnloch')) return 'mit';

            // 4. Smart Inference (Defaulting based on product type)
            // FULL-TEXT RULE: infer from label AND description (`text`), not the label alone.
            // Most "Aufsatzbecken" (countertop bowls) don't have overflows.
            if (text.includes('aufsatz') || text.includes('schale') || text.includes('countertop')) return 'ohne';

            // Most standard furniture/wall basins DO have overflows.
            if (text.includes('möbel') || text.includes('wandwaschtisch') || text.includes('waschtisch')) return 'mit';

            return 'unknown';
        },
        extractAusfuehrung: function (t) {
            const lbl = ((t.label || '') + ' ' + (t.description || '')).toLowerCase();
            if (lbl.includes('doppelwaschtisch')) return 'Doppelwaschtisch';
            if (lbl.includes('aufsatzwaschbecken') || lbl.includes('aufsatzbecken') || lbl.includes('auflegewaschtisch')) return 'Aufsatzwaschtisch';
            if (lbl.includes('wandbecken')) return 'Wandbecken';
            if (lbl.includes('handwaschbecken')) return 'Handwaschbecken';
            if (lbl.includes('einbaubecken')) return 'Einbaubecken';
            return 'Waschtisch';
        },
        extractSerie: function (t) {
            if (t.serie) {
                return title === 'Duschenmischer' ? this.normalizeDuschenmischerSerie(t.serie) : t.serie;
            }
            // 1. Strip product-type prefixes
            const prefixes = [
                'doppelwaschtisch', 'wandbecken', 'handwaschbecken',
                'aufsatzwaschbecken', 'aufsatzbecken', 'auflegewaschtisch',
                'einbaubecken', 'waschtisch', 'waschbecken'
            ];
            // FULL-TEXT RULE: parse the label for the leading series token; fall back to the
            // description when the label is truncated to nothing usable.
            const parse = (raw) => {
                let cleaned = (raw || '').toLowerCase();
                for (const p of prefixes) {
                    if (cleaned.startsWith(p)) { cleaned = cleaned.substring(p.length).trim(); break; }
                }
                if (t.manufacturer) {
                    const mLower = t.manufacturer.toLowerCase();
                    if (cleaned.startsWith(mLower)) cleaned = cleaned.substring(mLower.length).trim();
                }
                const match = cleaned.match(/^(.*?)(?:\s+\d+\s*[xX]\s*\d+|\s*,|\s*\(|\s+-|\s+\d)/);
                return match && match[1] ? match[1].trim() : cleaned.trim();
            };
            let serie = parse(t.label) || parse(t.description);

            const isAccessory = ['papierhalter', 'reserverollenhalter', 'klosettbürstenhalter', 'wc-bürste', 'seifenhalter', 'seifenspender', 'glashalter', 'doppelglashalter', 'handtuchhalter', 'handtuchring', 'handtuchhaken', 'badetuchstange', 'hakenleiste', 'drahtseifenhalter', 'duschkorb', 'schwammhalter', 'accessoire'].some(kw => ((t.label||'') + ' ' + (t.description||'')).toLowerCase().includes(kw));
            if (isAccessory && serie.includes(' ')) serie = serie.split(' ')[0];

            // 4. Capitalize each word
            serie = serie.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

            return serie || 'Andere';
        },
        extractAbstellflaeche: function (obj) {
            if (obj.overrideAbstell && obj.overrideAbstell !== 'auto') return obj.overrideAbstell;
            const label = ((obj.label || '') + ' ' + (obj.description || '')).toLowerCase();
            if (label.includes('abstellfläche links') || label.includes('ablage links')) return 'links';
            if (label.includes('abstellfläche rechts') || label.includes('ablage rechts')) return 'rechts';
            if (label.includes('abstellfläche beidseitig') || label.includes('ablage beidseitig')) return 'beidseitig';
            return 'ohne';
        },
        getUniqueValues: function (key) {
            if (key === 'serie') return [...new Set(this.trays.map(t => this.extractSerie(t)))].sort();
            if (key === 'ausfuehrung') return [...new Set(this.trays.map(t => this.extractAusfuehrung(t)))].sort();
            return [...new Set(this.trays.map(t => t[key]))].sort();
        },
        renderSidebar: function () {
            configSidebar.innerHTML = `
                <div class="sidebar-section">
                    <h2>Filter: ${title}</h2>
                    
                    <div class="filter-group">
                        <div class="finder-sub-header" id="head_wb_brand_${suffix}">Hersteller</div>
                        <div class="pill-group" id="list_wb_brand_${suffix}"></div>
                    </div>

                    <div class="filter-group">
                        <div class="finder-sub-header" id="head_wb_ausf_${suffix}">Ausführung</div>
                        <div class="pill-group" id="list_wb_ausf_${suffix}"></div>
                    </div>

                    <div class="filter-group">
                        <div class="finder-sub-header" id="head_wb_serie_${suffix}">Serie</div>
                        <div class="pill-group" id="list_wb_serie_${suffix}"></div>
                    </div>
                    
                    <div class="filter-group">
                        <div class="finder-sub-header" id="head_wb_size_${suffix}">Grösse</div>
                        <div class="pill-group" id="list_wb_size_${suffix}"></div>
                    </div>

                    <div class="filter-group" style="margin-top:1.5rem;">
                        <div class="finder-sub-header" id="head_wb_hahn_${suffix}">Armaturenloch</div>
                        <div class="pill-group" id="list_wb_hahn_${suffix}"></div>
                    </div>

                    <div class="filter-group" style="margin-top:1rem;">
                        <div class="finder-sub-header" id="head_wb_ueber_${suffix}">Überlauf</div>
                        <div class="pill-group" id="list_wb_ueber_${suffix}"></div>
                    </div>

                    <div class="filter-group" style="margin-top:1rem;">
                        <div class="finder-sub-header" id="head_wb_abstell_${suffix}">Abstellfläche</div>
                        <div class="pill-group" id="list_wb_abstell_${suffix}"></div>
                    </div>
                </div>
                
                <div class="sidebar-section">
                    <h2>Suchergebnisse <span id="resultCount_${suffix}" class="badge">0</span></h2>
                    <div class="search-results-container" id="searchResults_${suffix}">
                        <!-- Populated by JS -->
                    </div>
                </div>

                <div class="sidebar-section addon-toggles-section" id="addon_toggles_section_${suffix}" style="display:none; margin-top:2rem;">
                    <div class="finder-sub-header">Zusatzoptionen</div>
                    <div class="addon-toggle-row" id="toggle_accessoires_${suffix}">
                        <span class="addon-toggle-label"><i class="ri-archive-line"></i> Accessoires</span>
                        <button class="ios-toggle" data-target="accessoires_mischer_${suffix}" aria-label="Accessoires ein/aus"><span class="ios-toggle-knob"></span></button>
                    </div>
                    <div id="addon_accessoires_mischer_panel_${suffix}" class="addon-panel" style="display:none;">
                        <div class="finder-sub-header">Kategorie</div>
                        <div class="pill-group" id="list_addon_accessoires_serie_${suffix}" style="margin-bottom: 0.75rem;"></div>
                        <div class="finder-sub-header">Accessoires wählen</div>
                        <div class="finder-list" id="list_addon_accessoires_${suffix}"></div>
                    </div>
                </div>

                <div class="sidebar-section" id="trayConfigurator_${suffix}" style="display:none; margin-top:2rem;">
                    <h2>Wählen Sie den Ablauf / Faucet</h2>
                    <p class="section-desc">Die Zubehöre werden intelligent nach Kompatibilität gefiltert.</p>
                    <div id="trayConfiguratorInner_${suffix}"></div>
                </div>
            `;
        },

        updatePillFilters: function () {
            const brandList = document.getElementById(`list_wb_brand_${suffix}`);
            const serList = document.getElementById(`list_wb_serie_${suffix}`);
            const aList = document.getElementById(`list_wb_ausf_${suffix}`);
            const sList = document.getElementById(`list_wb_size_${suffix}`);
            const hList = document.getElementById(`list_wb_hahn_${suffix}`);
            const uList = document.getElementById(`list_wb_ueber_${suffix}`);
            const absList = document.getElementById(`list_wb_abstell_${suffix}`);

            if (!brandList) return;

            // 1. Hersteller (Brand)
            const brands = [...new Set(this.trays.map(t => t.manufacturer || 'Andere'))].sort();
            brandList.innerHTML = `<button class="pill-btn ${this.currentBrand === 'all' ? 'active' : ''}" data-val="all">Alle</button>` + brands.map(b => `
                <button class="pill-btn ${this.currentBrand === b ? 'active' : ''}" data-val="${b}">${b}</button>
            `).join('');
            applyPillUI(`head_wb_brand_${suffix}`, `list_wb_brand_${suffix}`, this.currentBrand, 'Hersteller', () => {
                this.currentBrand = 'all';
                this.updatePillFilters();
                this.filterResults();
            });
            brandList.querySelectorAll('.pill-btn').forEach(btn => btn.addEventListener('click', () => {
                this.currentBrand = btn.dataset.val;
                this.updatePillFilters();
                this.filterResults();
            }));

            // 2. Ausführung (filtered by brand)
            let f1 = this.trays;
            if (this.currentBrand !== 'all') f1 = f1.filter(t => (t.manufacturer || 'Andere') === this.currentBrand);

            const ausf = [...new Set(f1.map(t => this.extractAusfuehrung(t)))].sort();
            aList.innerHTML = `<button class="pill-btn ${this.currentAusfuehrung === 'all' ? 'active' : ''}" data-val="all">Alle</button>` + ausf.map(a => `
                <button class="pill-btn ${this.currentAusfuehrung === a ? 'active' : ''}" data-val="${a}">${a}</button>
            `).join('');
            applyPillUI(`head_wb_ausf_${suffix}`, `list_wb_ausf_${suffix}`, this.currentAusfuehrung, 'Ausführung', () => {
                this.currentAusfuehrung = 'all';
                this.updatePillFilters();
                this.filterResults();
            });
            aList.querySelectorAll('.pill-btn').forEach(btn => btn.addEventListener('click', () => {
                this.currentAusfuehrung = btn.dataset.val;
                this.updatePillFilters();
                this.filterResults();
            }));

            // 3. Serie (filtered by brand + Ausführung)
            let validForSerie = f1;
            if (this.currentAusfuehrung !== 'all') validForSerie = validForSerie.filter(t => this.extractAusfuehrung(t) === this.currentAusfuehrung);
            const series = [...new Set(validForSerie.map(t => this.extractSerie(t)))].sort();
            serList.innerHTML = `<button class="pill-btn ${this.currentSerie === 'all' ? 'active' : ''}" data-val="all">Alle</button>` + series.map(s => `
                <button class="pill-btn ${this.currentSerie === s ? 'active' : ''}" data-val="${s}">${s}</button>
            `).join('');
            applyPillUI(`head_wb_serie_${suffix}`, `list_wb_serie_${suffix}`, this.currentSerie, 'Serie', () => {
                this.currentSerie = 'all';
                this.updatePillFilters();
                this.filterResults();
            });
            serList.querySelectorAll('.pill-btn').forEach(btn => btn.addEventListener('click', () => {
                this.currentSerie = btn.dataset.val;
                this.updatePillFilters();
                this.filterResults();
            }));

            // 4. Size (filtered by brand + Ausführung + Serie)
            let validForSize = validForSerie;
            if (this.currentSerie !== 'all') {
                validForSize = validForSize.filter(t => this.extractSerie(t) === this.currentSerie);
            }
            const sizes = [...new Set(validForSize.map(t => t.size))].sort();
            sList.innerHTML = `<button class="pill-btn ${this.currentSize === 'all' ? 'active' : ''}" data-val="all">Alle</button>` + sizes.map(s => `
                <button class="pill-btn ${this.currentSize === s ? 'active' : ''}" data-val="${s}">${s}</button>
            `).join('');
            applyPillUI(`head_wb_size_${suffix}`, `list_wb_size_${suffix}`, this.currentSize, 'Grösse', () => {
                this.currentSize = 'all';
                this.updatePillFilters();
                this.filterResults();
            });
            sList.querySelectorAll('.pill-btn').forEach(btn => btn.addEventListener('click', () => {
                this.currentSize = btn.dataset.val;
                this.updatePillFilters();
                this.filterResults();
            }));

            // 6. Hahnloch
            hList.innerHTML = `
                <button class="pill-btn ${this.currentHahnloch === 'all' ? 'active' : ''}" data-val="all">Alle</button>
                <button class="pill-btn ${this.currentHahnloch === 'ohne' ? 'active' : ''}" data-val="ohne">Ohne</button>
                <button class="pill-btn ${this.currentHahnloch === '1' ? 'active' : ''}" data-val="1">1 Loch</button>
                <button class="pill-btn ${this.currentHahnloch === '2' ? 'active' : ''}" data-val="2">2 Löcher</button>
                <button class="pill-btn ${this.currentHahnloch === '3' ? 'active' : ''}" data-val="3">3 Löcher</button>
            `;
            applyPillUI(`head_wb_hahn_${suffix}`, `list_wb_hahn_${suffix}`, this.currentHahnloch, 'Armaturenloch', () => {
                this.currentHahnloch = 'all';
                this.updatePillFilters();
                this.filterResults();
            });
            hList.querySelectorAll('.pill-btn').forEach(btn => btn.addEventListener('click', () => {
                this.currentHahnloch = btn.dataset.val;
                this.updatePillFilters();
                this.filterResults();
            }));

            // 7. Überlauf
            uList.innerHTML = `
                <button class="pill-btn ${this.currentUeberlauf === 'all' ? 'active' : ''}" data-val="all">Alle</button>
                <button class="pill-btn ${this.currentUeberlauf === 'mit' ? 'active' : ''}" data-val="mit">Mit Überlauf</button>
                <button class="pill-btn ${this.currentUeberlauf === 'ohne' ? 'active' : ''}" data-val="ohne">Ohne Überlauf</button>
            `;
            applyPillUI(`head_wb_ueber_${suffix}`, `list_wb_ueber_${suffix}`, this.currentUeberlauf, 'Überlauf', () => {
                this.currentUeberlauf = 'all';
                this.updatePillFilters();
                this.filterResults();
            });
            uList.querySelectorAll('.pill-btn').forEach(btn => btn.addEventListener('click', () => {
                this.currentUeberlauf = btn.dataset.val;
                this.updatePillFilters();
                this.filterResults();
            }));

            // 8. Abstellfläche
            absList.innerHTML = `
                <button class="pill-btn ${this.currentAbstell === 'all' ? 'active' : ''}" data-val="all">Alle</button>
                <button class="pill-btn ${this.currentAbstell === 'ohne' ? 'active' : ''}" data-val="ohne">Ohne/Standard</button>
                <button class="pill-btn ${this.currentAbstell === 'links' ? 'active' : ''}" data-val="links">Links</button>
                <button class="pill-btn ${this.currentAbstell === 'rechts' ? 'active' : ''}" data-val="rechts">Rechts</button>
                <button class="pill-btn ${this.currentAbstell === 'beidseitig' ? 'active' : ''}" data-val="beidseitig">Beidseitig</button>
            `;
            applyPillUI(`head_wb_abstell_${suffix}`, `list_wb_abstell_${suffix}`, this.currentAbstell, 'Abstellfläche', () => {
                this.currentAbstell = 'all';
                this.updatePillFilters();
                this.filterResults();
            });
            absList.querySelectorAll('.pill-btn').forEach(btn => btn.addEventListener('click', () => {
                this.currentAbstell = btn.dataset.val;
                this.updatePillFilters();
                this.filterResults();
            }));
        },
        filterResults: function () {
            const brandFilter = this.currentBrand || 'all';
            const aFilter = this.currentAusfuehrung || 'all';
            const serieFilter = this.currentSerie || 'all';
            const sFilter = this.currentSize || 'all';

            const filtered = this.trays.filter(t => {
                if (brandFilter !== 'all' && (t.manufacturer || 'Andere') !== brandFilter) return false;
                if (aFilter !== 'all' && this.extractAusfuehrung(t) !== aFilter) return false;
                if (serieFilter !== 'all' && this.extractSerie(t) !== serieFilter) return false;
                if (sFilter !== 'all' && t.size !== sFilter) return false;

                const tHahn = this.extractHahnloch(t);
                const tUeber = this.extractUeberlauf(t);
                const tAbstell = this.extractAbstellflaeche(t);

                if (this.currentHahnloch !== 'all' && tHahn !== 'unknown') {
                    if (tHahn !== this.currentHahnloch) return false;
                }
                if (this.currentUeberlauf !== 'all') {
                    // Back to strict logic: only show what positively matches the filter.
                    if (tUeber !== this.currentUeberlauf) return false;
                }
                if (this.currentAbstell !== 'all') {
                    if (tAbstell !== this.currentAbstell) return false;
                }

                return true;
            });

            // Predictably sort the output so imported items are easily found
            filtered.sort((a, b) => {
                const sA = this.extractSerie(a).toLowerCase();
                const sB = this.extractSerie(b).toLowerCase();
                if (sA !== sB) return sA.localeCompare(sB);
                return (a.size || '').localeCompare(b.size || '');
            });

            document.getElementById(`resultCount_${suffix}`).textContent = filtered.length;
            const resultsContainer = document.getElementById(`searchResults_${suffix}`);
            resultsContainer.innerHTML = '';

            if (filtered.length === 0) {
                resultsContainer.innerHTML = '<div class="no-results">Keine Waschtische gefunden. Bitte Filter anpassen.</div>';
                return;
            }

            filtered.forEach(t => {
                const btn = document.createElement('button');
                btn.className = `result-item-card ${this.selectedTray && this.selectedTray.id === t.id ? 'active' : ''}`;

                // Badges
                const hLoch = this.extractHahnloch(t);
                const uLauf = this.extractUeberlauf(t);
                let badgesHtml = '<div class="mini-badges">';
                if (hLoch === '1') badgesHtml += '<span class="mini-badge blue">1 Loch</span>';
                if (hLoch === '2') badgesHtml += '<span class="mini-badge blue">2 Löcher</span>';
                if (hLoch === '3') badgesHtml += '<span class="mini-badge blue">3 Löcher</span>';
                if (hLoch === 'ohne') badgesHtml += '<span class="mini-badge gray">Ohne Hahnloch</span>';

                if (uLauf === 'mit') badgesHtml += '<span class="mini-badge blue">Mit Überlauf</span>';
                if (uLauf === 'ohne') badgesHtml += '<span class="mini-badge red">Ohne Überlauf</span>';

                const aFlaeche = this.extractAbstellflaeche(t);
                if (aFlaeche === 'links') badgesHtml += '<span class="mini-badge gray">Ablage Links</span>';
                if (aFlaeche === 'rechts') badgesHtml += '<span class="mini-badge gray">Ablage Rechts</span>';
                if (aFlaeche === 'beidseitig') badgesHtml += '<span class="mini-badge gray">Ablage Beidseitig</span>';
                badgesHtml += '</div>';

                btn.innerHTML = `
                    <div class="result-info">
                        <strong>${t.label}</strong>
                        <div class="result-meta">
                            <span>${t.manufacturer}</span> | <span>${t.size}</span>
                        </div>
                        ${badgesHtml}
                    </div>
                    <span class="finish-artnr">${t.artNr}</span>
                `;
                btn.addEventListener('click', () => this.selectTray(t.id));
                resultsContainer.appendChild(btn);
            });

            // Ensure the active configuration refreshes when filters change
            if (this.selectedTray) {
                this.renderConfigurator();
                this.updateBOM();
            }
        },
        selectTray: function (id) {
            this.selectedTray = this.trays.find(t => t.id === id);
            this.selectedTray.selections = {};

            if (this.selectedTray.mountingMaterials) {
                this.selectedTray.mountingMaterials.forEach((mat) => {
                    const filteredOptions = this.getCompatibleOptions(mat);
                    if (filteredOptions.length > 0) {
                        let selectedArtNr = filteredOptions[0].artNr;
                        // For Badewanne Zargen-Wannendichtband, default to 3-seitig (Nische-Variante)
                        if (title === 'Badewanne' && (mat.name === 'Zargen-Wannendichtband' || mat.name === 'Wannenzargenband' || mat.id === 'mat_tape')) {
                            const threeSided = filteredOptions.find(o => (o.label || '').toLowerCase().includes('3-seitig') || (o.label || '').toLowerCase().includes('nische'));
                            if (threeSided) {
                                selectedArtNr = threeSided.artNr;
                            }
                        }
                        this.selectedTray.selections[mat.id] = selectedArtNr;
                    }
                });
            }

            this.filterResults(); // highlight active
            this.renderConfigurator();
            this.updateBOM();
            this.updateAccessoiresToggles();
            this.populateAccessoires();
        },
        updateAccessoiresToggles: function () {
            const btn = document.querySelector(`#toggle_accessoires_${suffix} .ios-toggle`);
            const panel = document.getElementById(`addon_accessoires_mischer_panel_${suffix}`);
            if (btn) btn.classList.toggle('active', this.showAccessoires);
            if (panel) panel.style.display = this.showAccessoires ? 'block' : 'none';

            const section = document.getElementById(`addon_toggles_section_${suffix}`);
            if (section) {
                if (this.selectedTray) {
                    section.style.display = 'block';
                } else {
                    section.style.display = 'none';
                    this.showAccessoires = false;
                }
                const toggleBtn = section.querySelector('.ios-toggle');
                if (toggleBtn && !toggleBtn.dataset.bound) {
                    toggleBtn.dataset.bound = 'true';
                    toggleBtn.addEventListener('click', () => {
                        this.showAccessoires = !this.showAccessoires;
                        this.updateAccessoiresToggles();
                        this.updateBOM();
                    });
                }
            }
        },
        populateAccessoires: function () {
            renderAccessoiresPanel(this, suffix);
        },
        getCompatibleOptions: function (mat) {
            // Intelligently filter out options based on the basin type!
            if (!mat.options) return [];
            const rHahn = this.extractHahnloch(this.selectedTray);
            const rUeber = this.extractUeberlauf(this.selectedTray);

            return mat.options.filter(opt => {
                const oLbl = opt.label.toLowerCase();

                // Rule 1: Ohne Überlauf -> Force Always Open Ventile
                if (rUeber === 'ohne') {
                    if (oLbl.includes('push-open') || oLbl.includes('zugstange') || oLbl.includes('verschliessbar')) {
                        return false;
                    }
                }

                // Rule 2: Ohne Hahnloch -> Remove regular deck-mounted mischers
                // (Assuming mischers are added as optional accessories in the future)
                if (rHahn === 'ohne') {
                    if (oLbl.includes('einlochmischer') && !oLbl.includes('hoher')) {
                        return false;
                    }
                }

                return true;
            });
        },
        renderConfigurator: function () {
            const configBlock = document.getElementById(`trayConfigurator_${suffix}`);
            const inner = document.getElementById(`trayConfiguratorInner_${suffix}`);
            inner.innerHTML = '';

            let hasConfig = false;

            if (this.selectedTray && this.selectedTray.mountingMaterials && this.selectedTray.mountingMaterials.length > 0) {
                hasConfig = true;

                // Warn User contextually
                const rUeber = this.extractUeberlauf(this.selectedTray);
                if (rUeber === 'ohne') {
                    const wAlert = document.createElement('div');
                    wAlert.className = 'alert-box';
                    wAlert.style.marginBottom = '1rem';
                    wAlert.innerHTML = '<i class="ri-alert-line"></i><div><strong>Sicherheitshinweis</strong><p>Becken ohne Überlauf: Ablaufventile sind automatisch auf "Starr / Immer offen" eingeschränkt (Schutz vor Überflutung).</p></div>';
                    inner.appendChild(wAlert);
                }
            }

            if (!hasConfig) {
                configBlock.style.display = 'none';
                return;
            }

            configBlock.style.display = 'block';

            this.selectedTray.mountingMaterials.forEach(mat => {
                const filteredOptions = this.getCompatibleOptions(mat);
                if (filteredOptions.length === 0) return;

                const groupDiv = document.createElement('div');
                groupDiv.className = 'filter-group';
                const label = document.createElement('label');
                label.textContent = mat.name || "Zubehör (Mischer / Ablauf)";

                if (filteredOptions.length === 1) {
                    const opt = filteredOptions[0];
                    groupDiv.innerHTML = `<label>${mat.name || label.textContent}</label>
                        <div style="background:var(--bg-surface); padding:0.75rem; border-radius:6px; font-size:0.85rem; color:var(--text-primary); border:1px solid var(--border);">
                            <strong style="display:block; margin-bottom:0.25rem;">${opt.label}</strong>
                            <span style="color:var(--text-secondary); font-family:monospace;">${opt.artNr}</span>
                        </div>`;
                } else {
                    const select = document.createElement('select');
                    select.className = 'filter-select';
                    filteredOptions.forEach(opt => {
                        const option = document.createElement('option');
                        option.value = opt.artNr;
                        option.textContent = `${opt.label} (${opt.artNr})`;
                        if (this.selectedTray.selections[mat.id] === opt.artNr) option.selected = true;
                        select.appendChild(option);
                    });
                    select.addEventListener('change', (e) => {
                        this.selectedTray.selections[mat.id] = e.target.value;
                        this.updateBOM();
                    });
                    groupDiv.appendChild(label);
                    groupDiv.appendChild(select);
                }
                inner.appendChild(groupDiv);
            });
        },
        clearBOM: function () {
            bomCountCounter.textContent = "0 Artikel ausgewählt";
            bomTableBody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: #9da3ad; padding: 2rem;">Bitte wählen Sie ein Waschtisch aus.</td></tr>';
        },
        updateBOM: function () {
            if (!this.selectedTray) return;

            const materials = this.selectedTray.mountingMaterials || [];
            let visibleCount = 1;
            bomTableBody.innerHTML = '';

            const startRow = document.createElement('tr');
            startRow.innerHTML = `
                <td><div class="img-cell" style="background: var(--bg-surface); display:flex; align-items:center; justify-content:center;"><i class="ri-archive-line" style="font-size:1.5rem; color:var(--text-secondary);"></i></div></td>
                <td><span class="bom-code">G1</span></td>
                <td>
                    <div class="bom-desc">Gürtelset</div>
                    <div style="font-size: 0.8rem; color: #9e9e9e; margin-top: 0.25rem;">Montage Set</div>
                </td>
                
                <td><strong>1</strong></td>
            `;
            bomTableBody.appendChild(startRow);
            visibleCount++;

            const trayRow = document.createElement('tr');
            trayRow.innerHTML = `
                <td><div class="img-cell"><img src="${this.selectedTray.imgUrl || this.mainImgUrl}"></div></td>
                <td><span class="bom-code">${this.selectedTray.artNr}</span></td>
                <td>
                    <div class="bom-desc">${this.selectedTray.label}</div>
                    <div style="font-size: 0.8rem; color: #9e9e9e; margin-top: 0.25rem;">Waschtisch</div>
                </td>
                
                <td><strong>${this.selectedTray.menge || 1}</strong></td>
            `;
            bomTableBody.appendChild(trayRow);

            materials.forEach(mat => {
                const selectedArtNr = this.selectedTray.selections[mat.id];
                const selectedOption = this.getCompatibleOptions(mat).find(o => o.artNr === selectedArtNr);

                if (selectedOption) {
                    const matRow = document.createElement('tr');
                    matRow.innerHTML = `
                        <td><div class="img-cell" ${!selectedOption.imgUrl ? 'style="background: transparent; border: 1px dashed var(--border);"' : ''}>
                            ${selectedOption.imgUrl ? `<img src="${selectedOption.imgUrl}" alt="${selectedOption.label}" onerror="this.style.display='none';">` : ''}
                        </div></td>
                        <td><span class="bom-code">${selectedOption.artNr}</span></td>
                        <td>
                            <div class="bom-desc">${selectedOption.label}</div>
                        </td>
                        
                        <td><strong>${selectedOption.menge || 1}</strong></td>
                    `;
                    bomTableBody.appendChild(matRow);
                    visibleCount += (selectedOption.menge || 1);
                }
            });

            // Zusatzoptionen: pool accessories chosen via the Accessoires toggle
            if (this.showAccessoires && this.selectedAddonAccessoires && this.selectedAddonAccessoires.length > 0) {
                this.selectedAddonAccessoires.forEach(acc => {
                    const accRow = document.createElement('tr');
                    accRow.innerHTML = `
                        <td><div class="img-cell">${acc.imgUrl ? `<img src="${acc.imgUrl}" onerror="this.style.display='none';">` : ''}</div></td>
                        <td><span class="bom-code">${acc.artNr}</span></td>
                        <td>
                            <div class="bom-desc">${acc.label || acc.name}</div>
                            <div style="font-size: 0.8rem; color: #9e9e9e; margin-top: 0.25rem;">${acc.productType || 'Accessoire'}</div>
                        </td>
                        <td><strong>${acc.menge || 1}</strong></td>
                    `;
                    bomTableBody.appendChild(accRow);
                    visibleCount += (acc.menge || 1);
                });
            }

            bomCountCounter.textContent = `${visibleCount} Artikel benötigt`;
            priceBOM(document.getElementById('bomTableBody'));
        },
        copyToClipboard: function () {
            if (!this.selectedTray) { alert('Bitte wählen Sie zuerst einen Waschtisch aus.'); return; }
            let cleanTrayArtNr = (this.selectedTray.artNr || '').toString().replace(/\t/g, '').trim();
            let textLines = [`G1\t1`, `${cleanTrayArtNr}\t${this.selectedTray.menge || 1}`];
            (this.selectedTray.mountingMaterials || []).forEach(mat => {
                const selectedArtNr = this.selectedTray.selections[mat.id];
                const compatibleOpts = this.getCompatibleOptions(mat);
                const selectedOption = compatibleOpts.find(o => o.artNr === selectedArtNr) || compatibleOpts[0];
                if (selectedOption && selectedOption.artNr && selectedOption.artNr !== 'none' && !selectedOption.label.toLowerCase().startsWith('ohne')) {
                    let cleanOptArtNr = (selectedOption.artNr || '').toString().replace(/\t/g, '').trim();
                    textLines.push(`${cleanOptArtNr}\t${selectedOption.menge || 1}`);
                }
            });
            const text = textLines.join('\n');
            window.copyTextToClipboard(text).then(() => alert("Kopiert:\n\n" + text.replace(/\t/g, "    "))).catch(e => alert("Kopieren fehlgeschlagen."));
        }
    };
}
