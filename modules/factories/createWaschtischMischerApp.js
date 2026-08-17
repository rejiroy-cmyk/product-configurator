import { matchesSearchQuery, configSidebar, bomTableBody, bomCountCounter, getVariantColor, isRealImg, imgOf, applyPillUI, Ae, re, me, ke, Be, X, priceBOM, renderAccessoiresPanel, fullLabel, renderGalleryGrid, galleryBackButton, cleanSerie, accQty, bomQtyCell } from './_shared.js';

export function createWaschtischMischerApp(title, desc, mainImgUrl, config = {}) {
    const suffix = title.replace(/\s/g, '');

    return {
        trays: [],
        mainImgUrl: mainImgUrl,
        selectedTray: null,
        showAccessoires: false,
        selectedAddonAccessoires: [],
        accQty: {},

        accFacets: {},
        init: function () {
            this.selectedTray = null;
            this.showAccessoires = false;
            this.selectedAddonAccessoires = [], this.accQty = {};
            this.accFacets = {};

            // Auto-fix brands if they are "Andere" or missing
            if (this.trays) {
                this.trays.forEach(f => {
                    const lbl = (f.label || '').toLowerCase();
                    if (f.manufacturer === 'Andere' || !f.manufacturer || f.manufacturer === 'Sanitas Troesch') {
                        if (lbl.includes('hansgrohe')) f.manufacturer = 'Hansgrohe';
                        else if (lbl.includes('axor')) f.manufacturer = 'Axor';
                        else if (lbl.includes('laufen')) f.manufacturer = 'Laufen';
                        else if (lbl.includes('alterna')) f.manufacturer = 'Alterna';
                        else if (lbl.includes('gessi')) f.manufacturer = 'Gessi';
                        else if (lbl.includes('kwc')) f.manufacturer = 'KWC';
                        else if (lbl.includes('dornbracht')) f.manufacturer = 'Dornbracht';
                    }
                });
            }

            this.currentBrand = 'all';
            this.currentAusfuehrung = 'all'; // Now represents "Typ" (Einloch, Wand, etc.)
            this.currentSerie = 'all';       // Now represents "Ausführung" in UI
            this.currentAuslauf = 'all';
            this.currentAblauf = 'all';
            this.currentAusladung = 'all';
            this.inklusiveMontage = true; // Toggle for Service Cost (default true)
            this.renderSidebar();
            this.updatePillFilters();
            this.filterResults(); // initial run — paints the gallery grid when enabled
            if (!config.enableGalleryUX) { this.clearBOM(); }
        },
        normalizeDuschenmischerSerie: function (value) {
            let label = String(value || '').trim();
            label = label
                .replace(/^[-\s]+/, '')
                .replace(/\bDuschenmischer\s*-\s*/i, '')
                .replace(/\bDuschenmischer-?\s*/i, '')
                .replace(/\bDuschmischer\s*-\s*/i, '')
                .replace(/\bDuschmischer-?\s*/i, '')
                .replace(/\bEndmontageset\s*/i, '')
                .replace(/\bAbdeckplatte\b.*$/i, '')
                .replace(/\bDurchflussleistung\b.*$/i, '')
                .replace(/\bohne Einbaukörper\b.*$/i, '')
                .replace(/\bEnergieeffizienzklasse\b.*$/i, '')
                .replace(/\bGeräuschgruppe\b.*$/i, '')
                .replace(/\bAD\s+\d+.*$/i, '')
                .replace(/\bThermostat\s+Vita Pro\b/i, 'Vita Pro')
                .replace(/\s+Thermostat\b.*$/i, '')
                .replace(/\bselbstschliessend\b.*$/i, '')
                .replace(/\bArmhebel\b.*$/i, '')
                .replace(/\bAv\.0\b/g, 'Ava 2.0')
                .replace(/\bVit\.0\b/g, 'Vita 2.0')
                .replace(/\s*,\s*$/g, '')
                .replace(/\s+/g, ' ')
                .trim();

            return label || 'Andere';
        },
        extractSerie: function (t) {
            // cleanSerie drops the product type in front ("Wandmischer-Endmontageset
            // Torino") and the variant behind ("Metris 110") — see _shared.js.
            if (t.serie) return cleanSerie(t.serie) || 'Andere';
            const brand = (t.manufacturer || '').toLowerCase();
            // Words are compared in a stripped form (a-z0-9- only), so the skip list has to be
            // normalised the same way or an umlaut entry could never match: "Spültischmischer"
            // reduces to "spltischmischer", which no literal in this list would have equalled.
            const norm = (w) => String(w || '').toLowerCase().replace(/[^a-z0-9-]/g, '');
            const skipWords = [
                'einlochmischer', 'waschtischmischer', 'waschtischbatterie', 'batterie',
                'mischer', 'armatur', 'wandmischer', 'standmischer', 'm.', 'm', 'waschtisch-',
                'u-mischer', 'aufbau', brand, 'hansgrohe', 'axor', 'laufen', 'alterna', 'gessi', 'kwc',
                'auslauf', 'fest', 'schwenkbar', 'mit', 'ohne', 'ablaufventil',
                // This instance's own product word — every label in the pool starts with it, so it
                // is never what tells two series apart (Spültischmischer, Bidet, …).
                title
            ].map(norm);
            // FULL-TEXT RULE: parse the label's leading segment for the series; fall back to the
            // description when the label is truncated to nothing usable.
            const parse = (raw) => {
                let lbl = (raw || '').split(',')[0].trim();
                lbl = lbl.replace(/\bA\s*\d+/i, '').trim();
                let remainingWords = lbl.split(/\s+/).filter(w => {
                    let clean = norm(w);
                    if (!clean) return false;
                    if (skipWords.includes(clean)) return false;
                    return true;
                });
                let serie = remainingWords.join(' ');
                return serie.replace(/(ComfortZone|CoolStart|EcoSmart|Normalstrahl|Waterfall|WaterfallStream).*/i, '').trim();
            };
            let serie = parse(t.label) || parse(t.description);

            if (title === 'Duschenmischer') {
                return cleanSerie(this.normalizeDuschenmischerSerie(serie)) || 'Andere';
            }

            return cleanSerie(serie) || 'Andere';
        },
        isAblaufItem: function (t) {
            const tl = ((t.label || '') + ' ' + (t.description || '')).toLowerCase();
            if (tl.includes('einbaukosten')) return true;

            // Faucet keywords (if these are present, it's likely a faucet even if it mentions valves)
            const isFaucet = tl.includes('mischer') || tl.includes('batterie') || tl.includes('armatur') ||
                tl.includes('hansgrohe') || tl.includes('axor') || tl.includes('laufen') ||
                tl.includes('gessi') || tl.includes('kwc') || tl.includes('dornbracht') ||
                tl.includes('alterna');

            if (isFaucet) return false;

            // Standalone valve keywords
            const isValve = tl.includes('siebventil') || tl.includes('schaftventil') || tl.includes('ventilstopfen') ||
                tl.includes('click') || tl.includes('clack') || tl.includes('clic') || tl.includes('clac') ||
                tl.includes('ablauf');

            return isValve;
        },
        extractAusladung: function (obj) {
            const label = (obj.label || '') + ' ' + (obj.description || '');
            // Look for "A 120 mm" or "Ausladung 140 mm"
            const match = label.match(/(?:A\s|Ausladung\s*)([0-9]{2,3})\s*mm/i);
            if (match) return match[1];
            return 'unknown';
        },
        extractAblauf: function (obj) {
            const label = ((obj.label || '') + ' ' + (obj.description || '')).toLowerCase();
            if (label.includes('ohne ablauf')) return 'ohne';
            if (label.includes('ablauf')) return 'mit';
            return 'ohne';
        },
        extractAuslauf: function (obj) {
            const label = ((obj.label || '') + ' ' + (obj.description || '')).toLowerCase();
            if (label.includes('schwenkauslauf') || label.includes('schwenkbar')) return 'schwenkbar';
            if (label.includes('auslauf fest') || label.includes(' fest')) return 'fest';
            // some have "Auslauf" without specifying, assume fixed by default unless mentioned
            return 'fest';
        },
        extractAusfuehrung: function (obj) {
            const label = (obj.label || '').toLowerCase();
            const desc = (obj.description || '').toLowerCase();
            const text = label + ' ' + desc;
            if (text.includes('einloch')) return 'Einlochmischer';
            if (text.includes('wand')) return 'Wandmischer'; // e.g. Wand-Waschtischmischer
            if (text.includes('stand')) return 'Standmischer';
            if (text.includes('3-loch') || text.includes('drei-loch') || text.includes('dreiloch')) return '3-Loch';
            // Catch-all = "a mixer of this app's kind that names no mounting type". Follows the
            // instance, so the Spültischmischer pool can't offer a "Waschtischmischer" Typ pill
            // (nor the Bidet pool, which used to inherit the same wrong fallback).
            return title;
        },
        getUniqueValues: function (key) {
            const nonAblaufTrays = this.trays.filter(t => !this.isAblaufItem(t));
            if (key === 'serie') return [...new Set(nonAblaufTrays.map(t => this.extractSerie(t)))].sort();
            if (key === 'ausladung') return [...new Set(nonAblaufTrays.map(t => this.extractAusladung(t)))].filter(a => a !== 'unknown').sort((a, b) => parseInt(a) - parseInt(b));
            if (key === 'ausfuehrung') return [...new Set(nonAblaufTrays.map(t => this.extractAusfuehrung(t)))].sort();
            return [...new Set(nonAblaufTrays.map(t => t[key]))].filter(x => x).sort();
        },
        formatPillLabel: function (kind, value) {
            if (value === 'all' || value === 'alle') return 'Alle';
            if (title === 'Duschenmischer' && kind === 'type' && value === 'Waschtischmischer') {
                return 'Duschenmischer';
            }
            if (kind !== 'serie') return value;

            const label = title === 'Duschenmischer'
                ? cleanSerie(this.normalizeDuschenmischerSerie(value))
                : cleanSerie(value);

            return label || value;
        },
        renderSidebar: function () {
            const sidebar = document.getElementById('configSidebar');
            if (!sidebar) return;

            sidebar.innerHTML = `
                <div class="sidebar-section">
                    <h2>Filter: ${title}</h2>
                    
                    <div class="filter-group">
                        <div class="finder-sub-header" id="head_misch_brand_${suffix}">Hersteller</div>
                        <div class="pill-group" id="list_misch_brand_${suffix}"></div>
                    </div>

                    <div class="filter-group">
                        <div class="finder-sub-header" id="head_misch_ausf_${suffix}">Typ</div>
                        <div class="pill-group" id="list_misch_ausf_${suffix}"></div>
                    </div>

                    <div class="filter-group">
                        <div class="finder-sub-header" id="head_misch_serie_${suffix}">Ausführung</div>
                        <div class="pill-group" id="list_misch_serie_${suffix}"></div>
                    </div>

                    <div class="filter-group" style="margin-top:1.5rem;">
                        <div class="finder-sub-header" id="head_misch_ausl_${suffix}">Ausladung (mm)</div>
                        <div class="pill-group" id="list_misch_ausl_${suffix}"></div>
                    </div>

                    <div class="filter-group" style="margin-top:1rem;">
                        <div class="finder-sub-header" id="head_misch_auslauf_${suffix}">Auslauf</div>
                        <div class="pill-group" id="list_misch_auslauf_${suffix}"></div>
                    </div>

                    <div class="filter-group" style="margin-top:1rem;">
                        <div class="finder-sub-header" id="head_misch_ablauf_${suffix}">Ablaufventil</div>
                        <div class="pill-group" id="list_misch_ablauf_${suffix}"></div>
                    </div>
                </div>
                
                <div class="sidebar-section results-section" ${config.enableGalleryUX ? 'style="display:none;"' : ''}>
                    <h2>Suchergebnisse <span id="resultCount_${suffix}" class="badge">0</span></h2>
                    <div id="searchResults_${suffix}" class="finder-list" style="max-height: 400px; overflow-y: auto;"></div>
                </div>

                <div class="sidebar-section addon-toggles-section" id="addon_toggles_section_${suffix}" style="display:none; margin-top:2rem;">
                    <div class="finder-sub-header">Zusatzoptionen</div>
                    <div class="addon-toggle-row" id="toggle_accessoires_${suffix}">
                        <span class="addon-toggle-label"><i class="ri-archive-line"></i> Accessoires</span>
                        <button class="ios-toggle" data-target="accessoires_mischer_${suffix}" aria-label="Accessoires ein/aus"><span class="ios-toggle-knob"></span></button>
                    </div>
                    <div id="addon_accessoires_mischer_panel_${suffix}" class="addon-panel" style="display:none;">
                        <div id="acc_facets_${suffix}"></div>
                        <div class="finder-sub-header">Accessoires wählen</div>
                        <div class="finder-list" id="list_addon_accessoires_${suffix}"></div>
                    </div>
                </div>

                <div id="trayConfigurator_${suffix}" class="tray-configurator" style="display: none; margin-top: 2rem;">
                    <h3><i class="ri-settings-3-line"></i> Konfiguration</h3>
                    <div class="config-block" id="trayConfiguratorInner_${suffix}"></div>
                </div>
            `;
        },

        updatePillFilters: function () {
            const brandList = document.getElementById(`list_misch_brand_${suffix}`);
            const ausfList = document.getElementById(`list_misch_ausf_${suffix}`);
            const serList = document.getElementById(`list_misch_serie_${suffix}`);
            const auslList = document.getElementById(`list_misch_ausl_${suffix}`);
            const auslaufList = document.getElementById(`list_misch_auslauf_${suffix}`);
            const ablaufList = document.getElementById(`list_misch_ablauf_${suffix}`);

            if (!brandList) return;

            const nonAblaufTrays = this.trays.filter(t => !this.isAblaufItem(t));

            // 1. Hersteller (Brand)
            const brands = [...new Set(nonAblaufTrays.map(t => t.manufacturer || 'Andere'))].sort();
            brandList.innerHTML = `<button class="pill-btn ${this.currentBrand === 'all' ? 'active' : ''}" data-val="all">Alle</button>` + brands.map(b => `
                <button class="pill-btn ${this.currentBrand === b ? 'active' : ''}" data-val="${b}">${b}</button>
            `).join('');
            applyPillUI(`head_misch_brand_${suffix}`, `list_misch_brand_${suffix}`, this.currentBrand, 'Hersteller', () => {
                this.currentBrand = 'all';
                this.updatePillFilters();
                this.filterResults();
            });
            brandList.querySelectorAll('.pill-btn').forEach(btn => btn.addEventListener('click', () => {
                this.currentBrand = btn.dataset.val;
                this.updatePillFilters();
                this.filterResults();
            }));

            // 2. Typ (formerly Ausführung)
            let f1 = nonAblaufTrays;
            if (this.currentBrand !== 'all') f1 = f1.filter(t => (t.manufacturer || 'Andere') === this.currentBrand);

            const ausf = [...new Set(f1.map(t => this.extractAusfuehrung(t)))].sort();
            ausfList.innerHTML = `<button class="pill-btn ${this.currentAusfuehrung === 'all' ? 'active' : ''}" data-val="all">Alle</button>` + ausf.map(a => `
                <button class="pill-btn ${this.currentAusfuehrung === a ? 'active' : ''}" data-val="${a}">${this.formatPillLabel('type', a)}</button>
            `).join('');
            applyPillUI(`head_misch_ausf_${suffix}`, `list_misch_ausf_${suffix}`, this.currentAusfuehrung, 'Typ', () => {
                this.currentAusfuehrung = 'all';
                this.updatePillFilters();
                this.filterResults();
            });
            ausfList.querySelectorAll('.pill-btn').forEach(btn => btn.addEventListener('click', () => {
                this.currentAusfuehrung = btn.dataset.val;
                this.updatePillFilters();
                this.filterResults();
            }));

            // 3. Ausführung (formerly Serie)
            let f2 = f1;
            if (this.currentAusfuehrung !== 'all') f2 = f2.filter(t => this.extractAusfuehrung(t) === this.currentAusfuehrung);

            const series = [...new Set(f2.map(t => this.extractSerie(t)))].sort();
            serList.innerHTML = `<button class="pill-btn ${this.currentSerie === 'all' ? 'active' : ''}" data-val="all">Alle</button>` + series.map(s => `
                <button class="pill-btn ${this.currentSerie === s ? 'active' : ''}" data-val="${s}">${this.formatPillLabel('serie', s)}</button>
            `).join('');
            applyPillUI(`head_misch_serie_${suffix}`, `list_misch_serie_${suffix}`, this.currentSerie, 'Ausführung', () => {
                this.currentSerie = 'all';
                this.updatePillFilters();
                this.filterResults();
            });
            serList.querySelectorAll('.pill-btn').forEach(btn => btn.addEventListener('click', () => {
                this.currentSerie = btn.dataset.val;
                this.updatePillFilters();
                this.filterResults();
            }));

            // 3. Ausladung
            let validForAusl = f2;
            if (this.currentSerie !== 'all') {
                validForAusl = validForAusl.filter(t => this.extractSerie(t) === this.currentSerie);
            }
            const ausladungen = [...new Set(validForAusl.map(t => this.extractAusladung(t)))].filter(a => a !== 'unknown').sort((a, b) => parseInt(a) - parseInt(b));
            auslList.innerHTML = `<button class="pill-btn ${this.currentAusladung === 'all' ? 'active' : ''}" data-val="all">Alle</button>` + ausladungen.map(a => `
                <button class="pill-btn ${this.currentAusladung === a ? 'active' : ''}" data-val="${a}">${a} mm</button>
            `).join('');
            applyPillUI(`head_misch_ausl_${suffix}`, `list_misch_ausl_${suffix}`, this.currentAusladung, 'Ausladung', () => {
                this.currentAusladung = 'all';
                this.updatePillFilters();
                this.filterResults();
            });
            auslList.querySelectorAll('.pill-btn').forEach(btn => btn.addEventListener('click', () => {
                this.currentAusladung = btn.dataset.val;
                this.updatePillFilters();
                this.filterResults();
            }));

            // 4. Auslauf
            auslaufList.innerHTML = `
                <button class="pill-btn ${this.currentAuslauf === 'all' ? 'active' : ''}" data-val="all">Alle</button>
                <button class="pill-btn ${this.currentAuslauf === 'fest' ? 'active' : ''}" data-val="fest">Fest</button>
                <button class="pill-btn ${this.currentAuslauf === 'schwenkbar' ? 'active' : ''}" data-val="schwenkbar">Schwenkbar</button>
            `;
            applyPillUI(`head_misch_auslauf_${suffix}`, `list_misch_auslauf_${suffix}`, this.currentAuslauf, 'Auslauf', () => {
                this.currentAuslauf = 'all';
                this.updatePillFilters();
                this.filterResults();
            });
            auslaufList.querySelectorAll('.pill-btn').forEach(btn => btn.addEventListener('click', () => {
                this.currentAuslauf = btn.dataset.val;
                this.updatePillFilters();
                this.filterResults();
            }));

            // 5. Ablaufventil
            ablaufList.innerHTML = `
                <button class="pill-btn ${this.currentAblauf === 'all' ? 'active' : ''}" data-val="all">Alle</button>
                <button class="pill-btn ${this.currentAblauf === 'mit' ? 'active' : ''}" data-val="mit">Mit</button>
                <button class="pill-btn ${this.currentAblauf === 'ohne' ? 'active' : ''}" data-val="ohne">Ohne</button>
            `;
            applyPillUI(`head_misch_ablauf_${suffix}`, `list_misch_ablauf_${suffix}`, this.currentAblauf, 'Ablaufventil', () => {
                this.currentAblauf = 'all';
                this.updatePillFilters();
                this.filterResults();
            });
            ablaufList.querySelectorAll('.pill-btn').forEach(btn => btn.addEventListener('click', () => {
                this.currentAblauf = btn.dataset.val;
                this.updatePillFilters();
                this.filterResults();
            }));
        },
        filterResults: function () {
            const trays = this.trays || [];
            let filtered = trays.filter(t => {
                // 1. Filter out utility/accessory items
                if (this.isAblaufItem(t)) return false;

                // 2. Extract properties for filtering
                const brand = t.manufacturer || 'Andere';
                const s = this.extractSerie(t);
                const ausf = this.extractAusfuehrung(t);
                const ausladung = this.extractAusladung(t);
                const ablauf = this.extractAblauf(t);
                const auslauf = this.extractAuslauf(t);

                // 3. Apply active filters
                if (this.currentBrand !== 'all' && brand !== this.currentBrand) return false;
                if (this.currentSerie !== 'all' && s !== this.currentSerie) return false;
                if (this.currentAusfuehrung !== 'all' && ausf !== this.currentAusfuehrung) return false;
                if (this.currentAusladung !== 'all' && ausladung !== this.currentAusladung) return false;
                if (this.currentAuslauf !== 'all' && auslauf !== this.currentAuslauf) return false;
                if (this.currentAblauf !== 'all' && ablauf !== this.currentAblauf) return false;

                return true;
            });

            const countEl = document.getElementById(`resultCount_${suffix}`);
            if (countEl) countEl.textContent = filtered.length;

            const container = document.getElementById(`searchResults_${suffix}`);
            if (!container) return;

            container.innerHTML = '';
            const configPanel = document.getElementById(`trayConfigurator_${suffix}`);
            if (configPanel) configPanel.style.display = 'none';

            if (filtered.length === 0) {
                container.innerHTML = '<div class="finder-empty-state">Keine Produkte gefunden</div>';
                if (config.enableGalleryUX && !this.selectedTray) this.renderGridInMainPanel(filtered);
                return;
            }

            filtered.forEach(t => {
                const isSelected = this.selectedTray && this.selectedTray.artNr === t.artNr;
                const card = document.createElement('button');
                card.className = `result-item-btn ${isSelected ? 'active' : ''}`;

                const ablaufText = this.extractAblauf(t) === 'mit' ? 'Mit Ablauf' : 'Ohne Ablauf';
                const auslaufText = this.extractAuslauf(t) === 'schwenkbar' ? 'Schwenkbar' : 'Fest';
                const ausladungText = this.extractAusladung(t);
                const typText = this.extractAusfuehrung(t).replace('mischer', '');

                card.innerHTML = `
                    <div style="display:flex; align-items:flex-start; gap: 12px; width:100%; text-align: left;">
                        <div style="width: 50px; height: 50px; flex-shrink: 0; background: #fff; border-radius: 4px; display:flex; align-items:center; justify-content:center; border: 1px solid #eee; overflow: hidden;">
                            <img src="${t.imgUrl}" alt="${t.label}" style="max-width: 40px; max-height: 40px; object-fit: contain;" onerror="this.src='https://placehold.co/40x40?text=--'">
                        </div>
                        <div class="result-info" style="flex:1;">
                            <strong style="font-size:0.8rem; line-height:1.2; display:block; margin-bottom:4px;">${t.label}</strong>
                            <div class="result-meta">
                                <span>${t.manufacturer || 'Marke'}</span> | <span>${t.artNr}</span>
                            </div>
                            <div class="mini-badges" style="margin-top: 6px; display: flex; flex-wrap: wrap; gap: 4px;">
                                <span class="mini-badge" style="background:#e8f5e9;color:#2e7d32;">${typText}</span>
                                ${ausladungText !== 'unknown' ? `<span class="mini-badge gray">A: ${ausladungText} mm</span>` : ''}
                                <span class="mini-badge ${ablaufText === 'Mit Ablauf' ? 'blue' : 'gray'}">${ablaufText}</span>
                                <span class="mini-badge gray">${auslaufText}</span>
                            </div>
                            <!-- Inline Configuration for Ablaufventil if active -->
                            ${isSelected && (this.extractAusfuehrung(t) === 'Wandmischer' || this.extractAblauf(t) === 'ohne') ? `
                                <div class="inline-config" style="margin-top: 10px; padding-top: 8px; border-top: 1px solid #eee; width: 100%;">
                                    <label style="font-size: 0.75rem; color: #666; display: block; margin-bottom: 4px;">Ablaufventil wählen:</label>
                                    <select class="inline-ablauf-select" style="width: 100%; font-size: 0.8rem; padding: 4px; border-radius: 4px; border: 1px solid #ddd;">
                                        <!-- Will be populated by JS -->
                                    </select>
                                </div>
                            ` : ''}
                        </div>
                    </div>
                `;

                // Populate and bind inline select if it exists
                if (isSelected) {
                    const inlineSelect = card.querySelector('.inline-ablauf-select');
                    if (inlineSelect) {
                        const ablaufTrays = this.trays.filter(it => this.isAblaufItem(it));
                        // Sort Click-Clack to top
                        ablaufTrays.sort((a, b) => {
                            const al = (a.label || '').toLowerCase();
                            const bl = (b.label || '').toLowerCase();
                            const aC = al.includes('clic') || al.includes('click');
                            const bC = bl.includes('clic') || bl.includes('click');
                            return (aC === bC) ? 0 : aC ? -1 : 1;
                        });

                        const options = [
                            ...ablaufTrays.map(it => ({ artNr: it.artNr, label: it.label })),
                            { artNr: 'none', label: '— Ohne Ablaufventil —' }
                        ];

                        inlineSelect.innerHTML = options.map(opt =>
                            `<option value="${opt.artNr}" ${(this.selectedTray.selections && this.selectedTray.selections['ablaufventil_virtual'] === opt.artNr) ? 'selected' : ''}>${opt.label}</option>`
                        ).join('');

                        inlineSelect.addEventListener('change', (e) => {
                            e.stopPropagation();
                            if (!this.selectedTray.selections) this.selectedTray.selections = {};
                            this.selectedTray.selections['ablaufventil_virtual'] = e.target.value;
                            this.updateBOM();
                        });
                        inlineSelect.addEventListener('click', (e) => e.stopPropagation());
                    }
                }

                card.addEventListener('click', () => {
                    // Must go through selectTray(): it clones the tray and initialises
                    // `selections` (+ the virtual Ablaufventil options). Assigning the raw
                    // tray here left `selections` undefined, so updateBOM() threw on
                    // `selections.variant` and the BOM never rendered. filterResults()
                    // re-draws the cards (selection highlight, inline Ablauf select) and
                    // calls renderConfigurator()/updateBOM() itself.
                    this.selectTray(t);
                    this.filterResults();
                });
                container.appendChild(card);
            });

            // Ensure the active configuration refreshes when filters change
            if (this.selectedTray) {
                this.renderConfigurator();
                this.updateBOM();
            } else if (config.enableGalleryUX) {
                this.renderGridInMainPanel(filtered);
            }
        },
        // Same tiles as Duschenwanne/Badewanne — see renderGalleryGrid in _shared.js.
        renderGridInMainPanel: function (filtered) {
            renderGalleryGrid(filtered, {
                lines: t => {
                    const a = this.extractAusladung(t);
                    return [this.extractAusfuehrung(t), a !== 'unknown' ? `Ausladung ${a} mm` : ''];
                }
            });
        },
        // Accepts a tray object (sidebar list) or a tray id (gallery tile); null goes back
        // to the grid.
        selectTray: function (tray) {
            if (!tray) {
                this.selectedTray = null;
                galleryBackButton(false);
                this.renderConfigurator();
                this.updateAccessoiresToggles();
                if (config.enableGalleryUX) this.filterResults();
                else this.clearBOM();
                return;
            }
            if (typeof tray === 'string') {
                tray = this.trays.find(t => t.id === tray || t.artNr === tray);
                if (!tray) return;
            }
            this.selectedTray = JSON.parse(JSON.stringify(tray));
            if (!this.selectedTray.selections) this.selectedTray.selections = {};
            this.selectedTray.selections.variant = this.selectedTray.artNr;

            // FULL-TEXT RULE: read label AND description for the built-in-Ablauf classification.
            const l = ((this.selectedTray.label || '') + ' ' + (this.selectedTray.description || '')).toLowerCase();
            const ablaufState = this.extractAblauf(this.selectedTray);
            const isWand = this.extractAusfuehrung(this.selectedTray) === 'Wandmischer';
            const labelLow = ((this.selectedTray.label || '') + ' ' + (this.selectedTray.description || '')).toLowerCase();
            const hasNoBuiltInAblauf = !labelLow.includes('ablauf') || labelLow.includes('ohne ablauf');

            if (isWand || hasNoBuiltInAblauf) {
                const ablaufTrays = this.trays.filter(t => this.isAblaufItem(t));
                if (ablaufTrays.length > 0) {
                    if (!this.selectedTray.mountingMaterials) this.selectedTray.mountingMaterials = [];

                    ablaufTrays.sort((a, b) => {
                        const al = (a.label || '').toLowerCase();
                        const bl = (b.label || '').toLowerCase();
                        const aClick = al.includes('click') || al.includes('clic');
                        const bClick = bl.includes('click') || bl.includes('clic');
                        if (aClick && !bClick) return -1;
                        if (bClick && !aClick) return 1;
                        return 0;
                    });

                    const matOptions = [
                        ...ablaufTrays.map(t => ({
                            artNr: t.artNr,
                            label: t.label,
                            type: 'Zubehör',
                            imgUrl: t.imgUrl,
                            menge: 1
                        })),
                        { artNr: 'none', label: 'Ohne Ablaufventil', type: 'Zubehör' }
                    ];

                    this.selectedTray.mountingMaterials.push({
                        id: 'ablaufventil_virtual',
                        name: 'Ablaufventil',
                        options: matOptions
                    });

                    if (!this.selectedTray.selections['ablaufventil_virtual']) {
                        this.selectedTray.selections['ablaufventil_virtual'] = matOptions[0].artNr;
                    }
                }
            }

            const confContainer = document.getElementById(`trayConfigurator_${suffix}`);
            const inner = document.getElementById(`trayConfiguratorInner_${suffix}`);
            confContainer.style.display = 'block';
            inner.innerHTML = '';

            this.renderConfigurator();
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
        renderConfigurator: function () {
            const confContainer = document.getElementById(`trayConfigurator_${suffix}`);
            const inner = document.getElementById(`trayConfiguratorInner_${suffix}`);

            // Gallery UX: Oberfläche and every Zubehör group become inline dropdowns in
            // the BOM rows (updateBOM), so the sidebar configurator stays closed.
            if (!this.selectedTray || config.enableGalleryUX) {
                confContainer.style.display = 'none';
                inner.innerHTML = '';
                if (config.enableGalleryUX && this.selectedTray) {
                    // Keep the default-selection contract the sidebar loop below provides.
                    (this.selectedTray.mountingMaterials || []).forEach(mat => {
                        if (!this.selectedTray.selections[mat.id] && mat.options && mat.options.length) {
                            this.selectedTray.selections[mat.id] = mat.options[0].artNr;
                        }
                    });
                    this.updateBOM();
                }
                return;
            }

            confContainer.style.display = 'block';
            inner.innerHTML = '';

            // Color Variants
            if (this.selectedTray.variants && this.selectedTray.variants.length > 0) {
                const selArtNr = this.selectedTray.selections.variant || this.selectedTray.artNr;
                const vGroup = document.createElement('div');
                vGroup.className = 'config-group slide-in';
                vGroup.innerHTML = '<h3>Oberfläche</h3>';
                const list = document.createElement('div');
                list.className = 'accessory-list';

                const mainBtn = document.createElement('div');
                mainBtn.className = `accessory-item ${selArtNr === this.selectedTray.artNr ? 'active' : ''}`;
                mainBtn.innerHTML = `
                    <div class="acc-info">
                        <span class="acc-name">Standard</span>
                        <span class="acc-artnr">${this.selectedTray.artNr}</span>
                    </div>
                `;
                mainBtn.addEventListener('click', () => {
                    this.selectedTray.selections.variant = this.selectedTray.artNr;
                    this.selectedTray.mainLabel = this.selectedTray.label;
                    this.selectedTray.mainImg = this.selectedTray.imgUrl;
                    this.updateBOM();
                    this.renderConfigurator();
                });
                list.appendChild(mainBtn);

                this.selectedTray.variants.forEach(v => {
                    const btn = document.createElement('div');
                    btn.className = `accessory-item ${selArtNr === v.artNr ? 'active' : ''}`;

                    btn.innerHTML = `
                        ${v.imgUrl ? `<img src="${v.imgUrl}" class="acc-thumb" style="width:40px;height:40px;object-fit:contain;border-radius:4px;border:1px solid #eee;">` : ''}
                        <div class="acc-info" style="margin-left:10px;">
                            <span class="acc-name">${v.label.split(',').splice(-2).join(',')}</span>
                            <span class="acc-artnr">${v.artNr}</span>
                        </div>
                    `;
                    btn.addEventListener('click', () => {
                        this.selectedTray.selections.variant = v.artNr;
                        this.selectedTray.mainLabel = v.label;
                        this.selectedTray.mainImg = v.imgUrl;
                        this.updateBOM();
                        this.renderConfigurator();
                    });
                    list.appendChild(btn);
                });
                vGroup.appendChild(list);
                inner.appendChild(vGroup);
            }

            (this.selectedTray.mountingMaterials || []).forEach(mat => {
                const group = document.createElement('div');
                group.className = 'config-group slide-in';
                group.innerHTML = `<h3>${mat.name || 'Zubehör'}</h3>`;

                if (!this.selectedTray.selections[mat.id]) {
                    if (mat.options && mat.options.length > 0) {
                        this.selectedTray.selections[mat.id] = mat.options[0].artNr;
                    }
                }

                if (mat.id === 'ablaufventil_virtual') {
                    const info = document.createElement('div');
                    info.style.cssText = 'padding: 0 0.5rem; font-size: 0.8rem; color: #666;';
                    info.textContent = 'Auswahl erfolgt direkt auf der Produktkarte.';
                    group.appendChild(info);
                } else {
                    const list = document.createElement('div');
                    list.className = 'accessory-list';
                    const activeArtNr = this.selectedTray.selections[mat.id];
                    if (mat.options) {
                        mat.options.forEach(opt => {
                            const btn = document.createElement('div');
                            btn.className = `accessory-item ${activeArtNr === opt.artNr ? 'active' : ''}`;
                            btn.innerHTML = `
                                ${opt.imgUrl ? `<img src="${opt.imgUrl}" class="acc-thumb" style="width:40px;height:40px;object-fit:contain;border-radius:4px;border:1px solid #eee;">` : ''}
                                <div class="acc-info" style="${opt.imgUrl ? 'margin-left:10px;' : ''}">
                                    <span class="acc-name">${opt.label}</span>
                                    <span class="acc-artnr">${opt.artNr} ${opt.type === 'Zubehör' ? '<span class="badge" style="background:#e8f5e9;color:#2e7d32;font-size:0.6rem;padding:2px 4px;margin-left:4px;">Erforderlich</span>' : '<span class="badge" style="background:#f3f4f6;color:#6b7280;font-size:0.6rem;padding:2px 4px;margin-left:4px;">Optional</span>'}</span>
                                </div>
                            `;
                            btn.addEventListener('click', () => {
                                this.selectedTray.selections[mat.id] = opt.artNr;
                                this.updateBOM();
                                this.renderConfigurator();
                            });
                            list.appendChild(btn);
                        });
                    }
                    group.appendChild(list);
                }

                inner.appendChild(group);
            });
            this.updateBOM();
        },

        clearBOM: function () {
            bomTableBody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:#9e9e9e;padding:2rem;">Bitte wählen Sie ein Modell</td></tr>';
            bomCountCounter.textContent = '0 Artikel';
        },
        updateBOM: function () {
            if (config.enableGalleryUX) galleryBackButton(!!this.selectedTray);
            if (!this.selectedTray) return;

            // Gallery UX has no sidebar configurator, so every choice is a dropdown
            // inside its own BOM row.
            const gallery = !!config.enableGalleryUX;
            const inlineSelect = (attr, opts, selArtNr) => `
                <select class="inline-bom-select" ${attr} style="width:100%; padding:0.5rem; border-radius:6px; border:1px solid var(--border); background:var(--bg-surface); color:var(--text-primary); font-size:0.9rem; margin-bottom:0.25rem; font-family:inherit; font-weight:500; cursor:pointer; outline:none; transition:border-color 0.2s ease;">${
                    opts.map(o => `<option value="${o.artNr}" ${o.artNr === selArtNr ? 'selected' : ''}>${o.text}</option>`).join('')
                }</select>`;

            let bomHtml = '';
            let count = 0;

            const activeTrayArtNr = this.selectedTray.selections.variant || this.selectedTray.artNr;
            const activeTrayLabel = this.selectedTray.mainLabel || fullLabel(this.selectedTray);
            const activeImg = this.selectedTray.mainImg || this.selectedTray.imgUrl;

            // Faucet
            let activeTrayMenge = 1;
            if (this.selectedTray.selections.variant && this.selectedTray.selections.variant !== this.selectedTray.artNr) {
                const variant = this.selectedTray.variants.find(v => v.artNr === this.selectedTray.selections.variant);
                if (variant) activeTrayMenge = variant.menge || 1;
            } else {
                activeTrayMenge = this.selectedTray.menge || 1;
            }

            const variantList = this.selectedTray.variants || [];
            const mainDesc = (gallery && variantList.length)
                ? inlineSelect('data-variant="1"',
                    [{ artNr: this.selectedTray.artNr, text: fullLabel(this.selectedTray) }]
                        .concat(variantList.map(v => ({ artNr: v.artNr, text: fullLabel(v) }))),
                    activeTrayArtNr)
                : `<div class="bom-desc">${activeTrayLabel}</div>`;

            bomHtml += `
                <tr>
                    <td><div class="img-cell"><img src="${activeImg}" onerror="this.src='https://placehold.co/40x40?text=N/A'"></div></td>
                    <td><span class="bom-code">${activeTrayArtNr}</span></td>
                    <td>${mainDesc}<div style="font-size:0.8rem;color:#2e7d32;margin-top:0.2rem;">Armatur (Hauptartikel)</div></td>

                    <td><strong>${activeTrayMenge}</strong></td>
                </tr>
            `;
            count += activeTrayMenge;

            // Accessories
            (this.selectedTray.mountingMaterials || []).forEach(mat => {
                const selectedArtNr = this.selectedTray.selections[mat.id];
                const matOpts = mat.options || [];
                // In gallery UX the dropdown IS the row, so a group parked on "none"
                // must still be rendered — otherwise the choice disappears for good.
                const matInline = gallery && matOpts.length > 1;
                if (selectedArtNr === 'none' && !matInline) return;

                const selectedOption = matOpts.find(o => o.artNr === selectedArtNr) || matOpts[0];

                if (selectedOption && (selectedOption.artNr !== 'none' || matInline)) {
                    const isNone = selectedOption.artNr === 'none';
                    const optionMenge = isNone ? 0 : (selectedOption.menge || 1);
                    const desc = matInline
                        ? inlineSelect(`data-matid="${mat.id}"`,
                            matOpts.map(o => ({ artNr: o.artNr, text: o.artNr === 'none' ? o.label : `${fullLabel(o)} (${o.artNr})` })),
                            selectedOption.artNr)
                        : `<div class="bom-desc">${fullLabel(selectedOption)}</div>`;
                    bomHtml += `
                        <tr>
                            <td><div class="img-cell">${isNone ? '' : `<img src="${selectedOption.imgUrl}" onerror="this.src='https://placehold.co/40x40?text=Pnl'">`}</div></td>
                            <!-- "-" and not an em-dash: copyBOMToClipboard drops "-" but would
                                 happily export "—" as if it were an art-Nr. -->
                            <td><span class="bom-code">${isNone ? '-' : selectedOption.artNr}</span></td>
                            <td>${desc}<div style="font-size:0.8rem;color:#9e9e9e;margin-top:0.25rem;">${mat.name || 'Zubehör'}</div></td>

                            <td><strong>${isNone ? '-' : optionMenge}</strong></td>
                        </tr>
                    `;
                    count += optionMenge;
                    if (isNone) return;

                    const nativeTray = this.trays.find(t => t.artNr === selectedOption.artNr);
                    if (nativeTray && nativeTray.mountingMaterials) {
                        nativeTray.mountingMaterials.forEach(subMat => {
                            const subOpt = subMat.options && subMat.options[0];
                            if (subOpt) {
                                bomHtml += `
                                    <tr style="background-color: rgba(59, 130, 246, 0.03);">
                                        <td><div class="img-cell">${(subOpt.imgUrl && !subOpt.label.toLowerCase().includes('einbaukosten') && !subOpt.label.toLowerCase().includes('montage')) ? `<img src="${subOpt.imgUrl}" onerror="this.parentNode.innerHTML='<div style=\\'width:40px;height:40px;background:#e0e7ff;border-radius:4px;display:flex;align-items:center;justify-content:center;color:#4f46e5;\\'>&#9874;</div>'" style="width:40px;height:40px;object-fit:contain;">` : `<div style="width:40px;height:40px;background:#e0e7ff;border-radius:4px;display:flex;align-items:center;justify-content:center;color:#4f46e5;"><i class="ri-tools-fill"></i></div>`}</div></td>
                                        <td><span class="bom-code">${subOpt.artNr}</span></td>
                                        <td><div class="bom-desc">${fullLabel(subOpt)}</div><div style="font-size:0.8rem;color:#3b82f6;margin-top:0.2rem;">Serviceleistung (für ${mat.name})</div></td>
                                        
                                        <td><strong>${subOpt.menge || 1}</strong></td>
                                    </tr>
                                `;
                                count += (subOpt.menge || 1);
                            }
                        });
                    }
                }
            });

            // Zusatzoptionen: pool accessories chosen via the Accessoires toggle
            if (this.showAccessoires && this.selectedAddonAccessoires && this.selectedAddonAccessoires.length > 0) {
                this.selectedAddonAccessoires.forEach(acc => {
                    const accMenge = accQty(this, acc);
                    bomHtml += `
                        <tr>
                            <td><div class="img-cell"><img src="${acc.imgUrl || ''}" onerror="this.src='https://placehold.co/40x40?text=N/A'"></div></td>
                            <td><span class="bom-code">${acc.artNr}</span></td>
                            <td><div class="bom-desc">${fullLabel(acc)}</div><div style="font-size:0.8rem;color:#9e9e9e;margin-top:0.25rem;">${acc.productType || 'Accessoire'}</div></td>
                            ${bomQtyCell(accMenge, acc.artNr)}
                        </tr>
                    `;
                    count += accMenge;
                });
            }

            bomTableBody.innerHTML = bomHtml;

            if (gallery) {
                bomTableBody.querySelectorAll('.inline-bom-select').forEach(sel => {
                    sel.addEventListener('change', (e) => {
                        const val = e.target.value;
                        if (sel.dataset.variant) {
                            this.selectedTray.selections.variant = val;
                            const v = (this.selectedTray.variants || []).find(x => x.artNr === val);
                            this.selectedTray.mainLabel = v ? fullLabel(v) : fullLabel(this.selectedTray);
                            this.selectedTray.mainImg = v ? v.imgUrl : this.selectedTray.imgUrl;
                        } else {
                            this.selectedTray.selections[sel.dataset.matid] = val;
                        }
                        this.updateBOM();
                    });
                });
            }

            bomCountCounter.textContent = `${count} Artikel`;
            priceBOM(document.getElementById('bomTableBody'));
        },
        copyToClipboard: function () {
            if (!this.selectedTray) {
                alert('Bitte wählen Sie zuerst ein Produkt aus.');
                return;
            }

            const activeTrayArtNr = this.selectedTray.selections.variant || this.selectedTray.artNr;
            let activeTrayMenge = 1;
            if (this.selectedTray.selections.variant && this.selectedTray.selections.variant !== this.selectedTray.artNr) {
                const variant = this.selectedTray.variants.find(v => v.artNr === this.selectedTray.selections.variant);
                if (variant) activeTrayMenge = variant.menge || 1;
            } else {
                activeTrayMenge = this.selectedTray.menge || 1;
            }

            let textLines = [`${activeTrayArtNr}\t${activeTrayMenge}`];

            (this.selectedTray.mountingMaterials || []).forEach(mat => {
                const selectedArtNr = this.selectedTray.selections[mat.id];
                if (selectedArtNr === 'none') return;

                const selectedOption = (mat.options || []).find(o => o.artNr === selectedArtNr) || (mat.options && mat.options[0]);
                if (selectedOption && selectedOption.artNr && selectedOption.artNr !== 'none' && !selectedOption.label.toLowerCase().startsWith('ohne')) {
                    textLines.push(`${selectedOption.artNr}\t${selectedOption.menge || 1}`);

                    const nativeTray = this.trays.find(t => t.artNr === selectedOption.artNr);
                    if (nativeTray && nativeTray.mountingMaterials) {
                        nativeTray.mountingMaterials.forEach(subMat => {
                            const subOpt = subMat.options && subMat.options[0];
                            if (subOpt && subOpt.artNr && subOpt.artNr !== 'none' && !subOpt.label.toLowerCase().startsWith('ohne')) {
                                textLines.push(`${subOpt.artNr}\t${subOpt.menge || 1}`);
                            }
                        });
                    }
                }
            });

            // Accessoires were rendered in the BOM and priced, but never copied — this
            // path builds its lines from the tray and its mounting groups only, so a
            // picked Glashalter silently never reached SAP. Quantity via accQty.
            if (this.showAccessoires) {
                (this.selectedAddonAccessoires || []).forEach(acc => {
                    const cleanAccArtNr = (acc.artNr || '').toString().replace(/\t/g, '').trim();
                    if (cleanAccArtNr) textLines.push(`${cleanAccArtNr}\t${accQty(this, acc)}`);
                });
            }
            const textArray = textLines.join('\n');
            window.copyTextToClipboard(textArray).then(copied => {
                if (copied === null) return;   // Dialog abgebrochen — keine Meldung
                alert("Artikel und Menge kopiert für SAP:\n\n" + copied.replace(/\t/g, "    "));
            }).catch(e => alert("Kopieren fehlgeschlagen."));
        }
    };
}
