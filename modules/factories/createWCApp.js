import { matchesSearchQuery, configSidebar, bomTableBody, bomCountCounter, getVariantColor, isRealImg, imgOf, applyPillUI, Ae, re, me, ke, Be, X, priceBOM , fullLabel , accessoryFacetBar, renderGalleryGrid, cleanSerie } from './_shared.js';

// An opt-out sentinel ("ohne_wandbedienpanel", "none") rather than a real art-Nr.
// Such a row is shown so the dropdown stays reachable, but it must not display a
// code or a quantity — and "-" specifically, because copyBOMToClipboard drops "-".
const isNoneArtNr = (a) => !a || a === 'none' || /^ohne/i.test(String(a));

export function createWCApp(title, desc, mainImgUrl, config = {}) {
    const isMixer = config.isMixer || title.toLowerCase().includes('mischer') || title.toLowerCase().includes('armatur');
    const montageLabel1 = config.montageLabel1 || (isMixer ? "Aufputz" : "Wannenträger");
    const montageLabel2 = config.montageLabel2 || (isMixer ? "Unterputz" : "Montagerahmen");
    const montageLabel3 = config.montageLabel3 || "";
    const hideSizeForm = config.hideSizeForm || isMixer;
    const suffix = title.replace(/\s/g, '');

    return {
        trays: [],
        mainImgUrl: mainImgUrl,
        selectedTray: null,
        showAccessoires: false,
        accFacets: {},
        selectedAccessoires: [],
        extractSerie: function (t) {
            // cleanSerie strips the product type in front and the variant behind, so
            // "Moderna R Compact rimless" and "Moderna R - UP" land on one pill.
            if (t.serie) return cleanSerie(t.serie) || 'Andere';
            const manufacturer = (t.manufacturer || '').toLowerCase();

            // 1. Strip product-type prefixes
            const typeWords = [
                'spiegelschrank', 'spiegelkabinett', 'miroir', 'mirror',
                'doppelwaschtisch', 'möbelwaschtisch', 'aufsatzwaschbecken', 'aufsatzbecken',
                'auflegewaschtisch', 'wandbecken', 'handwaschbecken', 'waschtisch', 'becken', 'waschbecken',
                'wandmischer', 'einlochmischer', 'mischer', 'batterie', 'armatur',
                'papierhalter', 'reserverollenhalter', 'klosettbürstenhalter', 'wc-bürste',
                'seifenhalter', 'seifenspender', 'glashalter', 'doppelglashalter', 'handtuchhalter', 'handtuchring', 'handtuchhaken', 'badetuchstange', 'hakenleiste',
                'drahtseifenhalter', 'duschkorb', 'schwammhalter', 'accessoire'
            ];

            // FULL-TEXT RULE: parse the label for the leading series token; fall back to the
            // description when the label is truncated to nothing usable.
            const parse = (raw) => {
                let cleaned = (raw || '').trim().toLowerCase();
                let changed = true;
                while (changed) {
                    changed = false;
                    for (const word of typeWords) {
                        if (cleaned.startsWith(word)) {
                            cleaned = cleaned.substring(word.length).trim();
                            if (['-', ':', '/', ','].includes(cleaned[0])) cleaned = cleaned.substring(1).trim();
                            changed = true;
                            break;
                        }
                    }
                }
                if (manufacturer && cleaned.startsWith(manufacturer)) {
                    cleaned = cleaned.substring(manufacturer.length).trim();
                    if (['-', ':', '/', ','].includes(cleaned[0])) cleaned = cleaned.substring(1).trim();
                }
                const match = cleaned.match(/^(.*?)(?:\s+\d+\s*[xX]\s*\d+|\s*,|\s*\(|\s+-|\s+\d)/);
                return match && match[1] ? match[1].trim() : cleaned.trim();
            };
            let serie = parse(t.label || t.name) || parse(t.description);

            // FULL-TEXT RULE: an accessory keyword may live only in the description.
            const accFull = ((t.label || '') + ' ' + (t.description || '')).toLowerCase();
            const isAccessory = ['papierhalter', 'reserverollenhalter', 'klosettbürstenhalter', 'wc-bürste', 'seifenhalter', 'seifenspender', 'glashalter', 'doppelglashalter', 'handtuchhalter', 'handtuchring', 'handtuchhaken', 'badetuchstange', 'hakenleiste', 'drahtseifenhalter', 'duschkorb', 'schwammhalter', 'accessoire'].some(kw => accFull.includes(kw));
            if (isAccessory && serie.includes(' ')) serie = serie.split(' ')[0];

            // 4. Capitalize each word
            serie = serie.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

            return cleanSerie(serie) || 'Andere';
        },
        getUniqueValues: function (key) {
            if (key === 'serie') {
                return [...new Set(this.trays.map(t => this.extractSerie(t)))].sort();
            }
            return [...new Set(this.trays.map(t => t[key]))].sort();
        },
        classifyAccessory: function (obj) {
            const getRawClass = (obj) => {
                if (!obj) return 'common';
                // Detect main tray object using mountingMaterials. For toilets, extract explicit montage info from description.
                if (obj.mountingMaterials !== undefined) {
                    // FULL-TEXT RULE: montage keywords ("für Einbauspülkasten" etc.) can live in
                    // the description — classify from label AND description.
                    const label = ((obj.label || obj.name || '') + ' ' + (obj.description || '')).toLowerCase();
                    const isToilet = title.toLowerCase().includes('klosett') || title.toLowerCase().includes('wc');
                    if (isToilet) {
                        if (label.includes('für einbauspülkasten') || label.includes('fuer einbauspuelkasten')) return 'unterputz';
                        if (label.includes('für spülkastenmontage') || label.includes('fuer spuelkastenmontage') || label.includes('für aufputzspülkasten')) return 'aufputz';
                    }
                    return 'common';
                }

                // 1. Check for manual admin override first
                if (obj.overrideMontageart && obj.overrideMontageart !== 'auto') {
                    return obj.overrideMontageart.toLowerCase();
                }

                // 2. Clean input data — FULL-TEXT RULE: read label AND description.
                const label = ((obj.label || obj.name || '') + ' ' + (obj.description || '')).toLowerCase();
                const artNr = (obj.artNr || '').replace(/\s/g, '');

                // 3. HARD EXCEPTIONS (Firm IDs)
                if (artNr === '1431191.000.000' || artNr === '1431190.000.000') {
                    return 'montagerahmen';
                }

                // 4. KEYWORD LOGIC
                // Special Rule: If it mentions schallschutz, it's its own category
                if (label.includes('schallschutzset') || label.includes('schallschutz')) {
                    return isMixer ? 'unterputz' : 'common';
                }

                const isToilet = title.toLowerCase().includes('klosett') || title.toLowerCase().includes('wc');

                if (isMixer) {
                    const lblLower = label.toLowerCase();
                    if (lblLower.includes('standmodell') || lblLower.includes('freien stand')) {
                        return 'standmodell';
                    }
                    if (lblLower.includes('einbaukörper') || lblLower.includes('grundkörper') || lblLower.includes('ibox') || lblLower.includes('up-gehäuse')) {
                        return 'common';
                    }
                    if (lblLower.includes('endmontage') || lblLower.includes('einbau') || lblLower.includes('anschlussbogen') || lblLower.includes('unterputz') || lblLower.includes(' up ')) {
                        return 'unterputz';
                    }
                    if (lblLower.includes('aufputz') || lblLower.includes(' ap ') || lblLower.includes('ausserhalb') || lblLower.includes('mischer') || lblLower.includes('batterie')) {
                        return 'aufputz';
                    }
                } else if (isToilet) {
                    const lblLower = label.toLowerCase();

                    // Toilet seats, flush plates, and connection sets are ALWAYS common (independent of montageart)
                    if (lblLower.includes('sitz') || lblLower.includes('deckel') || lblLower.includes('betätigungsplatte') || lblLower.includes('drückerplatte') || lblLower.includes('manschette') || lblLower.includes('garnitur')) {
                        return 'common';
                    }

                    // Classify the reservoir/element
                    if (lblLower.includes('einbauspülkasten') || lblLower.includes('einbauspulkasten') || lblLower.includes('duofix') || lblLower.includes('unterputz') || lblLower.includes(' up ')) {
                        return 'unterputz';
                    }
                    if (lblLower.includes('aufputz') || lblLower.includes(' ap ')) {
                        return 'aufputz';
                    }

                    return 'common';
                } else {
                    if (label.includes('mittenabstütz') || label.includes(' mas ')) {
                        return 'mas';
                    }
                    // Carrier Logic First (Higher Priority than Schallschutz)
                    if (label.includes('träger') || label.includes('wannenträger') || label.includes('montageschaum')) {
                        return 'wannenträger';
                    }
                    // Frame Logic
                    if (label.includes('rahmen') || label.includes('füsse') || label.includes('fussset')) {
                        return 'montagerahmen';
                    }
                    // Schallschutz as Fallback for Frames
                    if (label.includes('schallschutzset') || label.includes('schallschutz')) {
                        return 'common';
                    }
                    if (label.includes('stelzfüss') || label.includes('stelzfuss')) {
                        return 'stelzfüsse';
                    }
                }

                return 'common';
            };

            const rawClass = getRawClass.call(this, obj);

            // Valid montage classes must match the pill VALUES. Toilets (and mixers)
            // use Aufputz/Unterputz — the same `isUpAp` logic the pill labels use —
            // NOT the Wannenträger/Montagerahmen defaults, otherwise getRawClass's
            // correct 'aufputz'/'unterputz' would be squashed to 'common' and the
            // Aufputz/Unterputz pills would filter everything out.
            const isToilet = title.toLowerCase().includes('klosett') || title.toLowerCase().includes('wc');
            const isUpAp = isMixer || isToilet;
            const validCategories = [
                'common',
                'alle',
                'all',
                (config.montageLabel1 || (isUpAp ? "Aufputz" : "Wannenträger")).toLowerCase(),
                (config.montageLabel2 || (isUpAp ? "Unterputz" : "Montagerahmen")).toLowerCase(),
                (config.montageLabel3 || "").toLowerCase(),
                (config.montageLabel4 || "").toLowerCase(),
                (config.montageLabel5 || "").toLowerCase()
            ].filter(Boolean);

            if (!validCategories.includes(rawClass)) {
                console.warn(`[Configurator] Invalid WCApp mounting category "${rawClass}" detected for ${obj.artNr || obj.name}. Falling back to "common" to prevent silent exclusion.`);
                return 'common';
            }
            return rawClass;
        },
        init: function () {
            this.isToiletApp = (title.toLowerCase().includes('klosett') || title.toLowerCase().includes('wc'));
            this.selectedTray = null;
            this.showAccessoires = false;
            this.accFacets = {};
            this.selectedAccessoires = [];
            this.currentMontageart = 'alle';
            this.currentManufacturer = 'all';
            this.currentSerie = 'all';
            this.currentForm = 'all';
            this.currentSize = 'all';
            this.renderSidebar();
            this.bindFilters();
            this.filterResults(); // initial run
            if (!config.enableGalleryUX) { this.clearBOM(); }
        },
        renderSidebar: function () {
            const isToiletApp = (title.toLowerCase().includes('klosett') || title.toLowerCase().includes('wc'));
            console.log(`[Configurator] Rendering Sidebar for ${title}. isToiletApp: ${isToiletApp}`);
            const manufacturers = this.getUniqueValues('manufacturer');
            const forms = this.getUniqueValues('form');
            const sizes = this.getUniqueValues('size');
            const formLabel = isToiletApp ? "Montage" : "Form";
            const systemLabel = isToiletApp ? "System" : "Montageart";

            configSidebar.innerHTML = `
                    <div class="sidebar-section">
                        <h2>Filter: ${title}</h2>
                        
                        <div class="filter-group">
                            <div class="finder-sub-header" id="head_rel_mfr_${suffix}">Hersteller</div>
                            <div class="pill-group" id="list_rel_mfr_${suffix}"></div>
                        </div>

                        <div class="filter-group">
                            <div class="finder-sub-header" id="head_rel_serie_${suffix}">Serie</div>
                            <div class="pill-group" id="list_rel_serie_${suffix}"></div>
                        </div>
                        
                        ${hideSizeForm ? '' : `
                        ${config.hideForm ? '' : `
                        <div class="filter-group">
                            <div class="finder-sub-header" id="head_rel_form_${suffix}">${config.formLabel || formLabel}</div>
                            <div class="pill-group" id="list_rel_form_${suffix}"></div>
                        </div>
                        `}
                        
                        <div class="filter-group">
                            <div class="finder-sub-header" id="head_rel_size_${suffix}">${config.sizeLabel || 'Grösse'}</div>
                            <div class="pill-group" id="list_rel_size_${suffix}"></div>
                        </div>
                        `}
                        
                        <div class="filter-group">
                            <div class="finder-sub-header" id="head_rel_montage_${suffix}">${systemLabel}</div>
                            <div class="pill-group" id="list_rel_montage_${suffix}"></div>
                        </div>

                        ${(hideSizeForm || isToiletApp) ? '' : `
                        <div style="display:flex; gap:1rem; margin-top: 1rem;">
                            <div class="filter-group" style="flex:1;">
                                <label>Länge (cm)</label>
                                <input type="number" id="filterLength_${suffix}" class="filter-select" placeholder="z.B. 120" style="background:var(--bg-surface); color:var(--text-primary); border:1px solid var(--border);" />
                            </div>
                            <div class="filter-group" style="flex:1;">
                                <label>Breite (cm)</label>
                                <input type="number" id="filterWidth_${suffix}" class="filter-select" placeholder="z.B. 80" style="background:var(--bg-surface); color:var(--text-primary); border:1px solid var(--border);" />
                            </div>
                        </div>
                        `}
                    </div>
                    
                    <div class="sidebar-section" ${config.enableGalleryUX ? 'style="display:none;"' : ''}>
                    <h2>Suchergebnisse <span id="resultCount_${suffix}" class="badge">0</span></h2>
                        <div class="search-results-container" id="searchResults_${suffix}"></div>
                    </div>

                    
                    <div class="sidebar-section" id="trayConfigurator_${suffix}" style="display:none; margin-top:2rem;">
                        <h2>Konfiguration</h2>
                        <p class="section-desc">Wählen Sie das passende Zubehör.</p>
                        <div id="trayConfiguratorInner_${title.replace(/\s/g, '')}"></div>
                    </div>

                    ${isToiletApp ? `
                    <div class="sidebar-section addon-toggles-section" id="addon_toggles_section_${suffix}" style="display:none; margin-top:2rem;">
                        <div class="finder-sub-header">Zusatzoptionen</div>
                        <div class="addon-toggle-row" id="toggle_accessoires_${suffix}">
                            <span class="addon-toggle-label"><i class="ri-archive-line"></i> Accessoires</span>
                            <button class="ios-toggle" data-target="accessoires_wc" aria-label="Accessoires ein/aus"><span class="ios-toggle-knob"></span></button>
                        </div>
                        <div id="addon_accessoires_wc_panel_${suffix}" class="addon-panel" style="display:none;">
                            <div id="acc_facets_wc_${suffix}"></div>
                            <div class="finder-sub-header">Accessoires wählen</div>
                            <div class="finder-list" id="list_addon_accessoires_wc_${suffix}"></div>
                        </div>
                    </div>
                    ` : ''}

                `;
            this.updatePillFilters();
        },
        updatePillFilters: function () {
            const suffix = title.replace(/\s/g, '');
            const mList = document.getElementById(`list_rel_mfr_${suffix}`);
            const serList = document.getElementById(`list_rel_serie_${suffix}`);
            const fList = document.getElementById(`list_rel_form_${suffix}`);
            const sList = document.getElementById(`list_rel_size_${suffix}`);
            const monList = document.getElementById(`list_rel_montage_${suffix}`);

            if (!mList) return;

            const isToilet = title.toLowerCase().includes('klosett') || title.toLowerCase().includes('wc');
            const isUpAp = isMixer || isToilet;
            const formLabel = isToilet ? "Montage" : "Form";
            const systemLabel = isToilet ? "System" : "Montageart";
            const label1 = isUpAp ? "Aufputz" : (config.montageLabel1 || "Wannenträger");
            const label2 = isUpAp ? "Unterputz" : (config.montageLabel2 || "Montagerahmen");
            const label3 = config.montageLabel3 || "";

            // 1. Manufacturer
            const manufacturers = this.getUniqueValues('manufacturer');
            mList.innerHTML = `<button class="pill-btn ${this.currentManufacturer === 'all' ? 'active' : ''}" data-val="all">Alle <span class="badge" style="font-size:0.7rem;opacity:0.6;margin-left:4px;">${this.getFilteredCount('Manufacturer', 'all')}</span></button>` + manufacturers.map(m => `
                    <button class="pill-btn ${this.currentManufacturer === m ? 'active' : ''}" data-val="${m}">${m} <span class="badge" style="font-size:0.7rem;opacity:0.6;margin-left:4px;">${this.getFilteredCount('Manufacturer', m)}</span></button>
                `).join('');
            applyPillUI(`head_rel_mfr_${suffix}`, `list_rel_mfr_${suffix}`, this.currentManufacturer, 'Hersteller', () => {
                this.currentManufacturer = 'all';
                this.currentSerie = 'all';
                this.currentForm = 'all';
                this.currentSize = 'all';
                this.updatePillFilters();
                this.filterResults();
            });

            mList.querySelectorAll('.pill-btn').forEach(btn => btn.addEventListener('click', () => {
                this.currentManufacturer = btn.dataset.val;
                this.updatePillFilters();
                this.filterResults();
            }));

            // 2. Serie
            let validTraysForSerie = this.trays;
            if (this.currentManufacturer !== 'all') {
                validTraysForSerie = validTraysForSerie.filter(t => t.manufacturer === this.currentManufacturer);
            }
            const series = [...new Set(validTraysForSerie.map(t => this.extractSerie(t)))].sort();
            serList.innerHTML = `<button class="pill-btn ${this.currentSerie === 'all' ? 'active' : ''}" data-val="all">Alle <span class="badge" style="font-size:0.7rem;opacity:0.6;margin-left:4px;">${this.getFilteredCount('Serie', 'all')}</span></button>` + series.map(s => `
                    <button class="pill-btn ${this.currentSerie === s ? 'active' : ''}" data-val="${s}">${s} <span class="badge" style="font-size:0.7rem;opacity:0.6;margin-left:4px;">${this.getFilteredCount('Serie', s)}</span></button>
                `).join('');
            applyPillUI(`head_rel_serie_${suffix}`, `list_rel_serie_${suffix}`, this.currentSerie, 'Serie', () => {
                this.currentSerie = 'all';
                this.currentSize = 'all';
                this.updatePillFilters();
                this.filterResults();
            });
            serList.querySelectorAll('.pill-btn').forEach(btn => btn.addEventListener('click', () => {
                this.currentSerie = btn.dataset.val;
                this.updatePillFilters();
                this.filterResults();
            }));

            // 3. Form (Montage)
            if (fList) {
                let validTraysForForm = validTraysForSerie;
                if (this.currentSerie !== 'all') {
                    validTraysForForm = validTraysForForm.filter(t => this.extractSerie(t) === this.currentSerie);
                }
                const forms = [...new Set(validTraysForForm.map(t => t.form))].filter(Boolean).sort();

                fList.innerHTML = `<button class="pill-btn ${this.currentForm === 'all' ? 'active' : ''}" data-val="all">Alle <span class="badge" style="font-size:0.7rem;opacity:0.6;margin-left:4px;">${this.getFilteredCount('Form', 'all')}</span></button>` + forms.map(f => `
                        <button class="pill-btn ${this.currentForm === f ? 'active' : ''}" data-val="${f}">${f} <span class="badge" style="font-size:0.7rem;opacity:0.6;margin-left:4px;">${this.getFilteredCount('Form', f)}</span></button>
                    `).join('');
                applyPillUI(`head_rel_form_${suffix}`, `list_rel_form_${suffix}`, this.currentForm, config.formLabel || formLabel, () => {
                    this.currentForm = 'all';
                    this.currentSize = 'all';
                    this.updatePillFilters();
                    this.filterResults();
                });
                fList.querySelectorAll('.pill-btn').forEach(btn => btn.addEventListener('click', () => {
                    this.currentForm = btn.dataset.val;
                    this.updatePillFilters();
                    this.filterResults();
                }));
            }

            // 4. Size
            if (sList) {
                let validTraysForSize = validTraysForSerie;
                if (this.currentSerie !== 'all') {
                    validTraysForSize = validTraysForSize.filter(t => this.extractSerie(t) === this.currentSerie);
                }
                if (this.currentForm !== 'all') {
                    validTraysForSize = validTraysForSize.filter(t => t.form === this.currentForm);
                }
                const sizes = [...new Set(validTraysForSize.map(t => t.size))].sort((a, b) => {
                    const numA = parseFloat(a);
                    const numB = parseFloat(b);
                    if (isNaN(numA) && isNaN(numB)) return String(a).localeCompare(String(b));
                    if (isNaN(numA)) return 1;
                    if (isNaN(numB)) return -1;
                    return numA - numB;
                });
                sList.innerHTML = `<button class="pill-btn ${this.currentSize === 'all' ? 'active' : ''}" data-val="all">Alle <span class="badge" style="font-size:0.7rem;opacity:0.6;margin-left:4px;">${this.getFilteredCount('Size', 'all')}</span></button>` + sizes.map(s => {
                    const btnLabel = config.sizeLabel === 'Breite' ? `bis ${s} cm` : s;
                    return `<button class="pill-btn ${this.currentSize === s ? 'active' : ''}" data-val="${s}">${btnLabel} <span class="badge" style="font-size:0.7rem;opacity:0.6;margin-left:4px;">${this.getFilteredCount('Size', s)}</span></button>`;
                }).join('');
                const displaySizeVal = config.sizeLabel === 'Breite' ? `bis ${this.currentSize} cm` : this.currentSize;
                applyPillUI(`head_rel_size_${suffix}`, `list_rel_size_${suffix}`, this.currentSize, config.sizeLabel || 'Grösse', () => {
                    this.currentSize = 'all';
                    this.updatePillFilters();
                    this.filterResults();
                }, displaySizeVal);
                sList.querySelectorAll('.pill-btn').forEach(btn => btn.addEventListener('click', () => {
                    this.currentSize = btn.dataset.val;
                    this.updatePillFilters();
                    this.filterResults();
                }));
            }

            const val1 = label1.toLowerCase();
            const val2 = label2.toLowerCase();
            const val3 = label3 ? label3.toLowerCase() : '';

            monList.innerHTML = `
                    <button class="pill-btn ${this.currentMontageart === 'alle' ? 'active' : ''}" data-val="alle">Alle</button>
                    <button class="pill-btn ${this.currentMontageart === val1 ? 'active' : ''}" data-val="${val1}">${label1}</button>
                    <button class="pill-btn ${this.currentMontageart === val2 ? 'active' : ''}" data-val="${val2}">${label2}</button>
                    ${label3 ? `<button class="pill-btn ${this.currentMontageart === val3 ? 'active' : ''}" data-val="${val3}">${label3}</button>` : ''}
                `;
            applyPillUI(`head_rel_montage_${suffix}`, `list_rel_montage_${suffix}`, this.currentMontageart, systemLabel, () => {
                this.currentMontageart = 'alle';
                this.updatePillFilters();
                this.filterResults();
            });
            monList.querySelectorAll('.pill-btn').forEach(btn => btn.addEventListener('click', () => {
                this.currentMontageart = btn.dataset.val;
                this.updatePillFilters();
                this.filterResults();
            }));
            if (!hideSizeForm) this.updateManualInputs();
        },
        bindFilters: function () {
            // Re-bind click events for manual length/width inputs if hideSizeForm is false
            if (!hideSizeForm) {
                const lInput = document.getElementById(`filterLength_${suffix}`);
                const wInput = document.getElementById(`filterWidth_${suffix}`);
                const onManualInput = () => {
                    this.updateSizeDropdownFromManual();
                    this.filterResults();
                };
                if (lInput) lInput.addEventListener('input', onManualInput);
                if (wInput) wInput.addEventListener('input', onManualInput);
            }
        },

        updateManualInputs: function () {
            const val = this.currentSize;
            const lInput = document.getElementById(`filterLength_${suffix}`);
            const wInput = document.getElementById(`filterWidth_${suffix}`);

            if (!lInput || !wInput) return; // Skip if inputs are hidden (e.g. for toilets)

            if (val === 'all') {
                lInput.value = '';
                wInput.value = '';
            } else {
                const parts = val.split(/[xX]/).map(p => p.trim());
                if (parts.length >= 2) {
                    lInput.value = parts[0];
                    wInput.value = parts[1];
                }
            }
        },
        updateSizeDropdownFromManual: function () {
            const lEl = document.getElementById(`filterLength_${suffix}`);
            const wEl = document.getElementById(`filterWidth_${suffix}`);
            if (!lEl || !wEl) return;

            const lInput = lEl.value;
            const wInput = wEl.value;

            if (lInput && wInput) {
                const sizeStr = `${lInput} x ${wInput}`;
                const sizeStrRev = `${wInput} x ${lInput}`;

                const found = this.trays.find(t => t.size === sizeStr || t.size === sizeStrRev);
                if (found) {
                    this.currentSize = found.size;
                } else {
                    this.currentSize = 'all';
                }
            } else {
                this.currentSize = 'all';
            }
            this.updatePillFilters();
        },
        // Pure filter predicate — extracted from filterResults so the pill counts
        // (getFilteredCount) reuse the EXACT same filtering. Behaviour-preserving.
        matchesFilters: function (t, ctx) {
            const mFilter = this.currentManufacturer || 'all';
            const serieFilter = this.currentSerie || 'all';
            const fFilter = this.currentForm || 'all';
            const sFilter = this.currentSize || 'all';
            const lFilter = ctx.lFilter;
            const wFilter = ctx.wFilter;
            const isToilet = ctx.isToilet;

            if (mFilter !== 'all' && mFilter !== 'alle' && t.manufacturer !== mFilter) return false;

            if (serieFilter !== 'all' && serieFilter !== 'alle') {
                const s = this.extractSerie(t);
                if (s !== serieFilter) return false;
            }

            if (!hideSizeForm) {
                const fFilterClean = fFilter.toLowerCase();
                const tFormClean = (t.form || '').toLowerCase();
                if (fFilterClean !== 'all' && fFilterClean !== 'alle' && !tFormClean.includes(fFilterClean) && !fFilterClean.includes(tFormClean)) return false;

                if (sFilter !== 'all' && sFilter !== 'alle') {
                    if (t.size !== sFilter) return false;
                } else if (!isToilet && (lFilter || wFilter)) {
                    if (t.size && t.size.includes('x')) {
                        const parts = t.size.toLowerCase().split('x').map(p => p.trim());
                        if (parts.length >= 2) {
                            let [l, w] = parts.map(p => parseFloat(p));
                            let lf = parseFloat(lFilter);
                            let wf = parseFloat(wFilter);
                            const norm = (v) => (v < 400 ? v * 10 : v);
                            if (lFilter && wFilter) {
                                if (!((norm(l) == norm(lf) && norm(w) == norm(wf)) || (norm(l) == norm(wf) && norm(w) == norm(lf)))) return false;
                            } else if (lFilter) {
                                if (norm(l) != norm(lf) && norm(w) != norm(lf)) return false;
                            } else if (wFilter) {
                                if (norm(l) != norm(wf) && norm(w) != norm(wf)) return false;
                            }
                        }
                    }
                }
            }

            // Filter Main Products by Montageart if chosen
            if (this.currentMontageart !== 'alle' && this.currentMontageart !== 'all') {
                const m = this.classifyAccessory(t);
                if (m !== 'common' && m !== this.currentMontageart) return false;

                // For trays/products that are 'common' themselves, check their accessories
                if (m === 'common') {
                    let hasMatchingAccessory = false;
                    if (t.mountingMaterials) {
                        t.mountingMaterials.forEach(mat => {
                            if (mat.options && mat.options[0]) {
                                if (this.classifyAccessory(mat.options[0]) === this.currentMontageart) {
                                    hasMatchingAccessory = true;
                                }
                            }
                        });
                    }
                    if (!hasMatchingAccessory && t.mountingMaterials && t.mountingMaterials.length > 0) return false;
                }
            }

            return true;
        },

        // Faceted count for a product-filter pill value (mirrors the Glass app).
        getFilteredCount: function (category, value) {
            const prop = 'current' + category;
            const original = this[prop];
            this[prop] = value;
            const ctx = {
                lFilter: document.getElementById(`filterLength_${suffix}`)?.value || '',
                wFilter: document.getElementById(`filterWidth_${suffix}`)?.value || '',
                isToilet: this.isToiletApp || (title.toLowerCase().includes('klosett') || title.toLowerCase().includes('wc')),
            };
            const count = this.trays.filter(t => this.matchesFilters(t, ctx)).length;
            this[prop] = original;
            return count;
        },

        filterResults: function () {
            const mFilter = this.currentManufacturer || 'all';
            const serieFilter = this.currentSerie || 'all';
            const fFilter = this.currentForm || 'all';
            const sFilter = this.currentSize || 'all';
            const lFilter = document.getElementById(`filterLength_${suffix}`)?.value || '';
            const wFilter = document.getElementById(`filterWidth_${suffix}`)?.value || '';

            const isToilet = this.isToiletApp || (title.toLowerCase().includes('klosett') || title.toLowerCase().includes('wc'));

            const ctx = { lFilter, wFilter, isToilet };
            const filtered = this.trays.filter(t => this.matchesFilters(t, ctx));

            console.log(`[Configurator] ${title} Filter Results: ${filtered.length} of ${this.trays.length} visible. (M:${mFilter}, S:${serieFilter}, F:${fFilter})`);

            document.getElementById(`resultCount_${suffix}`).textContent = filtered.length;
            const resultsContainer = document.getElementById(`searchResults_${suffix}`);
            resultsContainer.innerHTML = '';

            if (filtered.length === 0) {
                resultsContainer.innerHTML = '<div class="no-results">Keine Produkte gefunden. Bitte Filter anpassen.</div>';
                if (this.selectedTray) {
                    this.renderConfigurator();
                    this.updateBOM();
                } else {
                    this.renderGridInMainPanel(filtered);
                }
                return;
            }

            filtered.forEach(t => {
                const btn = document.createElement('button');
                btn.className = `result-item-card ${this.selectedTray && this.selectedTray.id === t.id ? 'active' : ''}`;
                btn.innerHTML = `
                        <div class="card-img-wrapper">
                            ${(imgOf(t)) ? `<img src="${imgOf(t)}">` : '<i class="ri-image-line placeholder-icon"></i>'}
                        </div>
                        <div class="result-info">
                            <strong>${t.label}</strong>
                            <div class="result-meta">
                                <span>${t.manufacturer}</span> ${hideSizeForm ? '' : `| <span>${t.size}</span>`}
                            </div>
                            <span class="finish-artnr">${t.artNr}</span>
                        </div>
                    `;
                btn.addEventListener('click', () => this.selectTray(t.id));
                resultsContainer.appendChild(btn);
            });

            // Ensure the active configuration refreshes when filters change
            if (this.selectedTray) {
                this.renderConfigurator();
                this.updateBOM();
            } else {
                this.renderGridInMainPanel(filtered);
            }
        },
        // Same tiles as Duschenwanne/Badewanne — see renderGalleryGrid in _shared.js.
        renderGridInMainPanel: function (filtered) {
            renderGalleryGrid(filtered, { lines: t => [t.size, t.form] });
        },
        selectTray: function (id) {
            if (!id) {
                this.selectedTray = null;
                if (config.enableGalleryUX) {
                    this.filterResults();
                } else {
                    this.clearBOM();
                    this.renderConfigurator();
                }
                return;
            }
            this.selectedTray = this.trays.find(t => t.id === id);

            if (this.currentMontageart === 'alle') {
                const supportedMethods = new Set();
                if (this.selectedTray.mountingMaterials) {
                    this.selectedTray.mountingMaterials.forEach(mat => {
                        const ft = mat.options && mat.options[0];
                        if (ft) {
                            const cls = this.classifyAccessory(ft);
                            if (cls !== 'common') supportedMethods.add(cls);
                        }
                    });
                }
                if (supportedMethods.has('wannenträger')) {
                    this.currentMontageart = 'wannenträger';
                } else if (supportedMethods.size > 0) {
                    this.currentMontageart = Array.from(supportedMethods)[0];
                }
                this.updatePillFilters();
            }

            // Ensure data structure and setup selections
            this.selectedTray.selections = {};

            // Initialize default variant
            if (this.selectedTray.variants && this.selectedTray.variants.length > 0) {
                this.selectedTray.selections['__variant__'] = this.selectedTray.artNr;
            }
            if (this.selectedTray.mountingMaterials) {
                this.selectedTray.mountingMaterials.forEach((mat, mIdx) => {
                    if (!mat.options) {
                        mat = {
                            id: mat.id || 'mat_' + Math.random().toString(36).substr(2, 5),
                            name: mat.label ? mat.label.split(' ')[0] : 'Zubehör',
                            options: [{ artNr: mat.artNr || '', label: mat.label || '', type: mat.type || 'Zubehör' }]
                        };
                        this.selectedTray.mountingMaterials[mIdx] = mat;
                    }
                    if (mat.options.length > 0) {
                        let defaultOpt = mat.options[0];
                        if (title && title.toLowerCase().includes('badewanne') && (mat.id === 'mat_tape' || (mat.name && mat.name.includes('Dichtband')))) {
                            const nischeOpt = mat.options.find(o => (o.label && o.label.includes('3-seitig')) || (o.dropdownLabel && o.dropdownLabel.includes('3-seitig')));
                            if (nischeOpt) defaultOpt = nischeOpt;
                        }
                        this.selectedTray.selections[mat.id] = defaultOpt.artNr;
                    }
                });
            }

            this.filterResults(); // re-render to highlight active
            this.renderConfigurator();
            
            const addonSection = document.getElementById(`addon_toggles_section_${suffix}`);
            if (addonSection) addonSection.style.display = 'block';
            if (this.updateAccessoiresToggles) this.updateAccessoiresToggles();
            this.updateBOM();
        },
        renderConfigurator: function () {
            const configBlock = document.getElementById(`trayConfigurator_${suffix}`);
            const inner = document.getElementById(`trayConfiguratorInner_${suffix}`);
            inner.innerHTML = '';

            let hasConfig = false;

            // 1. Render Variant Dropdown (if exists)
            if (this.selectedTray && this.selectedTray.variants && this.selectedTray.variants.length > 0) {
                hasConfig = true;
                const variantDiv = document.createElement('div');
                variantDiv.className = 'filter-group';
                variantDiv.style.marginBottom = '1.5rem';
                const vLabel = document.createElement('label');
                vLabel.textContent = "Ausführung / Variante / Farbe";

                const swatchGrid = document.createElement('div');
                swatchGrid.className = 'finish-buttons-grid';
                swatchGrid.style.marginTop = '0.5rem';

                const renderVariantSwatch = (artNr, label, variantImgUrl) => {
                    const btn = document.createElement('button');
                    const isActive = this.selectedTray.selections['__variant__'] === artNr;
                    btn.className = `finish-row-btn ${isActive ? 'active' : ''}`;
                    btn.style.width = '100%';
                    btn.style.display = 'flex';
                    btn.style.alignItems = 'center';

                    const imgUrl = isRealImg(variantImgUrl) ? variantImgUrl : '';
                    const fallbackColor = getVariantColor(label, artNr);

                    btn.innerHTML = `
                            <div class="finish-swatch" style="position: relative; overflow: hidden; background-color: ${fallbackColor}; box-shadow: inset 0 1px 3px rgba(0,0,0,0.15); width: 28px; height: 28px; border-radius: 50%; margin-right: 12px; border: 1px solid rgba(0,0,0,0.2);">
                                ${imgUrl ? `<img src="${imgUrl}" style="position: absolute; width: 100%; height: 100%; object-fit: cover; background: #fff; top: 0; left: 0;" onerror="this.style.display='none';">` : ''}
                            </div>
                            <div style="flex:1; text-align:left;">
                                <span style="display:block; font-weight: 500;">${label}</span>
                                <span class="finish-artnr" style="margin-left: 0;">${artNr}</span>
                            </div>
                        `;

                    btn.addEventListener('click', (e) => {
                        this.selectedTray.selections['__variant__'] = artNr;

                        // Auto-Match Accessories by Color
                        const selectedVariantLabel = label.toLowerCase();
                        const colors = ['schwarz', 'black', 'matt', 'chrom', 'weiss', 'white', 'gold', 'bronze', 'nickel', 'edelstahl', 'inox', 'pvd', 'messing', 'brushed', 'poliert', 'gebürstet', 'copper', 'kupfer'];
                        const activeColors = colors.filter(c => selectedVariantLabel.includes(c));

                        // 1. Get specific color code from variant artNr (e.g. .340)
                        const variantMatch = artNr && String(artNr).match(/\.(\d{3})(?:\.|$)/);
                        const variantColorCode = variantMatch ? variantMatch[1] : null;

                        this.selectedTray.mountingMaterials.forEach(mat => {
                            if (mat.options && mat.options.length > 1) {
                                let bestMatchOpt = null;
                                let bestMatchScore = 0;

                                mat.options.forEach(opt => {
                                    let score = 0;
                                    // Priority 1: Exact color code suffix match (Score 100)
                                    if (variantColorCode) {
                                        const optMatch = opt.artNr && String(opt.artNr).match(/\.(\d{3})(?:\.|$)/);
                                        if (optMatch && optMatch[1] === variantColorCode) {
                                            score += 100;
                                        }
                                    }
                                    // Priority 2: Label matches variant colors (Score 1 per word)
                                    const optLbl = opt.label.toLowerCase();
                                    activeColors.forEach(c => {
                                        if (optLbl.includes(c)) score++;
                                    });

                                    if (score > bestMatchScore) {
                                        bestMatchScore = score;
                                        bestMatchOpt = opt;
                                    }
                                });

                                // Fallback: If no match and variant is standard, fall back to option 0
                                const hasExotic = activeColors.some(c => !['chrom', 'weiss', 'white'].includes(c)) || (variantColorCode && !['000', '100'].includes(variantColorCode));
                                if (!bestMatchOpt && !hasExotic) {
                                    bestMatchOpt = mat.options[0];
                                }

                                if (bestMatchOpt && (bestMatchScore > 0 || !hasExotic)) {
                                    this.selectedTray.selections[mat.id] = bestMatchOpt.artNr;
                                }
                            }
                        });

                        this.updateBOM();
                        this.renderConfigurator();
                    });
                    return btn;
                };

                // Add base item (Standard)
                const standardLabel = `Standard ${this.selectedTray.label.split(',').pop().trim()}`;
                swatchGrid.appendChild(renderVariantSwatch(this.selectedTray.artNr, standardLabel, this.selectedTray.imgUrl));

                // Add all specific variants
                this.selectedTray.variants.forEach(v => {
                    swatchGrid.appendChild(renderVariantSwatch(v.artNr, v.label, v.imgUrl));
                });

                variantDiv.appendChild(vLabel);
                variantDiv.appendChild(swatchGrid);
                inner.appendChild(variantDiv);
            }

            if (!hasConfig) {
                configBlock.style.display = 'none';
                return;
            }

            configBlock.style.display = 'block';
        },
        
        updateAccessoiresToggles: function () {
            const suffix = title.replace(/\s/g, '');
            const btn = document.querySelector(`#toggle_accessoires_${suffix} .ios-toggle`);
            const panel = document.getElementById(`addon_accessoires_wc_panel_${suffix}`);
            if (btn) btn.classList.toggle('active', this.showAccessoires);
            if (panel) panel.style.display = this.showAccessoires ? 'block' : 'none';

            const section = document.getElementById(`addon_toggles_section_${suffix}`);
            if (section && !section._bound) {
                section._bound = true;
                const toggleBtn = section.querySelector('.ios-toggle');
                if (toggleBtn) {
                    toggleBtn.addEventListener('click', () => {
                        this.showAccessoires = !this.showAccessoires;
                        if (!this.showAccessoires) {
                            this.selectedAccessoires = [];
                            this.accFacets = {};
                        }
                        this.updateAccessoiresToggles();
                        if (this.showAccessoires) this.populateAccessoires();
                        this.updateBOM();
                    });
                }
            }
        },
        populateAccessoires: function () {
            const suffix = title.replace(/\s/g, '');
            const listEl = document.getElementById(`list_addon_accessoires_wc_${suffix}`);
            if (!listEl) return;
            const keywords = ['papierhalter', 'reserverollenhalter', 'klosettbürstenhalter', 'wc-bürste'];
            let candidates = [];
            const allApps = window.productApps || {};
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
            
            
            // Same shared facet bar as every other configurator (Produktkategorie /
            // Hersteller / Serie / Farbe, bidirectionally faceted).
            let facetWrap = document.getElementById(`acc_facets_wc_${suffix}`);
            if (!facetWrap) {
                facetWrap = document.createElement('div');
                facetWrap.id = `acc_facets_wc_${suffix}`;
                listEl.parentNode.insertBefore(facetWrap, listEl.previousElementSibling || listEl);
            }
            if (!this.accFacets) this.accFacets = {};
            candidates = accessoryFacetBar(candidates, this.accFacets, facetWrap, `acc_wc_${suffix}`, () => this.populateAccessoires());
            
            listEl.innerHTML = '';
            if (candidates.length === 0) {
                listEl.innerHTML = '<div class="finder-empty-state" style="font-size:0.8rem;">Keine passenden Produkte gefunden.</div>';
                return;
            }
            candidates.forEach(c => {
                const btn = document.createElement('div');
                btn.className = `finder-item ${this.selectedAccessoires.includes(c.artNr) ? 'active' : ''}`;
                btn.innerHTML = `
                    <div style="display:flex; align-items:center; gap:0.5rem;">
                        ${(imgOf(c)) ? `<img src="${imgOf(c)}" style="width:32px; height:32px; object-fit:contain; background:#fff; border-radius:4px; padding:2px; flex-shrink:0;" onerror="this.outerHTML='<div style=&quot;width:32px; height:32px; display:flex; align-items:center; justify-content:center; background:var(--bg-surface); border-radius:4px; flex-shrink:0;&quot;><i class=&quot;ri-image-line placeholder-icon&quot;></i></div>'">` : `<div style="width:32px; height:32px; display:flex; align-items:center; justify-content:center; background:var(--bg-surface); border-radius:4px; flex-shrink:0;"><i class="ri-image-line placeholder-icon"></i></div>`}
                        <div>
                            <div style="font-size:0.8rem; font-weight:500; line-height:1.3;">${fullLabel(c)}</div>
                            <div style="font-size:0.7rem; color:var(--st-gray); margin-top:0.25rem;">
                                ${c.manufacturer || ''} ${this.extractSerie(c) !== 'Andere' ? '· ' + this.extractSerie(c) : ''}
                            </div>
                        </div>
                    </div>
                    <div style="font-size:0.75rem; color:var(--st-gray); font-family:var(--st-font-mono); margin-top:0.5rem; text-align:right;">${c.artNr}</div>
                `;
                btn.addEventListener('click', () => {
                    const idx = this.selectedAccessoires.indexOf(c.artNr);
                    if (idx > -1) this.selectedAccessoires.splice(idx, 1);
                    else this.selectedAccessoires.push(c.artNr);
                    this.populateAccessoires(); 
                    this.updateBOM();
                });
                listEl.appendChild(btn);
            });
        },
        clearBOM: function () {
            bomCountCounter.textContent = "0 Artikel ausgewählt";
            bomTableBody.innerHTML = '';
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
                            if (typeof window.currentActiveApp.selectTray === 'function') {
                                window.currentActiveApp.selectTray(null);
                            } else if (typeof window.currentActiveApp.selectItem === 'function') {
                                window.currentActiveApp.selectItem(null);
                            }
                        }
                    };
                    backBtn.style.display = "inline-flex";
                }
            }
        }
            if (!this.selectedTray) return;

            const materials = this.selectedTray.mountingMaterials || [];
            bomTableBody.innerHTML = '';
            const finalBOM = [];

            const titleLower = title.toLowerCase();
            const isWandKlosett = titleLower.includes('wandklosett');
            const isStandKlosett = titleLower.includes('standklosett');
            const isWanne = titleLower.includes('wanne') || titleLower.includes('duschfläche');

            // 1. Ceramic (Main Item)
            let activeTrayArtNr = this.selectedTray.artNr;
            let activeTrayLabel = this.selectedTray.label;
            let activeTrayMenge = this.selectedTray.menge || 1;
            if (this.selectedTray.selections['__variant__'] && this.selectedTray.selections['__variant__'] !== this.selectedTray.artNr) {
                const variant = (this.selectedTray.variants || []).find(v => v.artNr === this.selectedTray.selections['__variant__']);
                if (variant) {
                    activeTrayArtNr = variant.artNr;
                    activeTrayLabel = variant.label;
                    activeTrayMenge = variant.menge || 1;
                }
            }

            const isAufputz = activeTrayArtNr === '2111 845.100.000' || activeTrayArtNr === '3231 113.100.000';
            const ceramicPriority = isAufputz ? 2 : 1;

            finalBOM.push({ artNr: activeTrayArtNr, label: activeTrayLabel, typ: title, menge: activeTrayMenge, img: this.selectedTray.imgUrl || this.mainImgUrl, note: 'Hauptartikel', priority: ceramicPriority });

            // ─── STANDKLOSETT: Dedicated BOM Priority Engine ─────────────────────
            if (isStandKlosett) {
                const standLbl = activeTrayLabel.toLowerCase();
                const isStandUnterputz = standLbl.includes('einbauspülkasten') || standLbl.includes('einbauspulkasten');

                // Ceramic priority: Aufputz → 2 (Spülkasten is #1), Unterputz → 1
                const standCeramicPriority = isStandUnterputz ? 1 : 2;
                // Override the ceramic priority that was already pushed
                finalBOM[finalBOM.length - 1].priority = standCeramicPriority;

                const zubPool = (window.productApps && window.productApps['zubehoer_pool']) ? window.productApps['zubehoer_pool'].trays : [];

                materials.forEach(mat => {
                    const selectedArtNr = this.selectedTray.selections[mat.id];
                    const selectedOption = (mat.options || []).find(o => o.artNr === selectedArtNr) || (mat.options && mat.options[0]);
                    if (!selectedOption) return;

                    // Check against active Montageart filter
                    const matClass = this.classifyAccessory(selectedOption) !== 'common' ? this.classifyAccessory(selectedOption) : this.classifyAccessory(mat);
                    if (this.currentMontageart !== 'alle') {
                        if (matClass !== 'common' && matClass !== this.currentMontageart) return;
                    }

                    const foundZub = zubPool.find(z => z.artNr === selectedOption.artNr);
                    const enrichedLabel = foundZub ? foundZub.label : selectedOption.label;
                    const enrichedImg = (foundZub && foundZub.imgUrl) ? foundZub.imgUrl : selectedOption.imgUrl;

                    const lbl = enrichedLabel.toLowerCase();
                    const matName = mat.name.toLowerCase();

                    let priority = 99;
                    const note = mat.name || 'Zubehör';

                    if (isStandUnterputz) {
                        // UNTERPUTZ: 1=Klosett 2=Sitz 3=Platte 4=Schall 5=Screws 6=Ablaufmanschette 7=Duofix 8=Rückwand 9=Ablaufbogen
                        if (matName === 'wc-sitz' || matName === 'klosettsitz') priority = 2;
                        else if (matName === 'betätigungsplatte') priority = 3;
                        else if (matName === 'schallschutz') priority = 4;
                        else if (matName === 'befestigungsschrauben') priority = 6;
                        else if (matName === 'ablaufmanschette') priority = 7;
                        else if (matName === 'duofix element' || selectedOption.artNr === '3612 348.000.000') priority = 8;
                        else if (matName === 'rückwandbefestigungssatz' || selectedOption.artNr === '3612 500.000.000') priority = 8;
                        else if (matName === 'ablaufbogen' || selectedOption.artNr === '3612 374.000.000') priority = 9;
                    } else {
                        // AUFPUTZ: 1=Spülkasten 2=Klosett 3=Sitz 4=Schall 5=Screws 6=Ablaufanschluss
                        if (matName === 'spülkasten') priority = 1;
                        else if (matName === 'wc-sitz' || matName === 'klosettsitz') priority = 3;
                        else if (matName === 'schallschutz') priority = 4;
                        else if (matName === 'befestigungsschrauben') priority = 6;
                        else if (matName === 'ablaufanschluss') priority = 7;
                    }

                    const isInlineDropdown = config.enableGalleryUX && mat.options && mat.options.length > 1;

                    finalBOM.push({
                        artNr: selectedOption.artNr,
                        label: enrichedLabel,
                        typ: selectedOption.type || mat.name || 'Zubehör',
                        menge: selectedOption.menge || 1,
                        img: enrichedImg,
                        note: note,
                        priority: priority,
                        isInlineDropdown: isInlineDropdown,
                        matId: mat.id,
                        options: isInlineDropdown ? mat.options : null
                    });
                });

            } else if (isWanne) {
                // ─── DUSCHENWANNE / BADEWANNE: Dedicated Priority Engine ──────────
                materials.forEach(mat => {
                    const selectedArtNr = this.selectedTray.selections[mat.id];
                    const selectedOption = (mat.options || []).find(o => o.artNr === selectedArtNr) || (mat.options && mat.options[0]);
                    if (!selectedOption) return;

                    // Check against active Montageart filter
                    const matClass = this.classifyAccessory(selectedOption) !== 'common' ? this.classifyAccessory(selectedOption) : this.classifyAccessory(mat);
                    if (this.currentMontageart !== 'alle') {
                        if (matClass !== 'common' && matClass !== this.currentMontageart) return;
                    }

                    const zubPool = (window.productApps && window.productApps['zubehoer_pool']) ? window.productApps['zubehoer_pool'].trays : [];
                    const foundZub = zubPool.find(z => z.artNr === selectedOption.artNr);
                    const enrichedLabel = foundZub ? foundZub.label : selectedOption.label;
                    const enrichedImg = (foundZub && foundZub.imgUrl) ? foundZub.imgUrl : selectedOption.imgUrl;

                    const combinedLbl = (enrichedLabel + ' ' + (selectedOption.type || '') + ' ' + (mat.name || '')).toLowerCase();

                    let priority = 99; // Fallback
                    const note = mat.name || 'Zubehör';

                    // 1. Wanne / Duschfläche (Handled earlier, priority: 1)
                    // 2. Ablaufdeckel
                    // 3. Ablaufgarnitur / Sifon
                    // 4. Zargen-Wannendichtband
                    // 5. Wannenträger OR Montagerahmen
                    // 6. Montageschaum OR Fussset OR Mittenabstützsystem
                    // 7. Schallschutzset

                    // Use RegEx for exact word boundaries to ensure whole words are matched
                    const matchWord = (words) => {
                        return words.some(w => {
                            // Support German compound words by allowing hyphens or spaces, but match full token
                            // Actually, let's use a dynamic RegEx to match the exact word or substantial compound part
                            // Since combinedLbl is lowercased, we match it.
                            return new RegExp(`\\b${w}\\b`, 'i').test(combinedLbl) || 
                                   new RegExp(`${w}`, 'i').test(combinedLbl); // Fallback to includes but prioritize exact match?
                        });
                    };
                    
                    // A better approach: explicitly check the exact accessory type if possible, or use strict word boundary.
                    // But wait, the user said "whole description is getting read".
                    // Let's create a robust parser that checks for exact words using regex.
                    const exactMatch = (words) => words.some(w => new RegExp(`(^|\\s|-|\\/)${w}(\\s|-|\\/|$)`, 'i').test(combinedLbl));

                    if (exactMatch(['deckel', 'ablaufabdeckung', 'ablaufdeckel', 'haube', 'ablaufhaube']) && !exactMatch(['ohne'])) {
                        priority = 2;
                    } else if (exactMatch(['ablauf', 'siphon', 'garnitur', 'sifon', 'ablaufgarnitur'])) {
                        priority = 3;
                    } else if (exactMatch(['dichtband', 'wannenband', 'zargen', 'zargen-wannendichtband', 'zargenband'])) {
                        priority = 4;
                    } else if (exactMatch(['träger', 'rahmen', 'wannenträger', 'montagerahmen'])) {
                        priority = 5;
                    } else if (exactMatch(['schaum', 'montageschaum', 'fuss', 'füsse', 'fussset', 'wannenfüsse', 'stelzfüsse', 'mittenabstütz', 'wannenanker', 'mittenabstützsystem', 'stütz', 'mas'])) {
                        priority = 6;
                    } else if (exactMatch(['schallschutz', 'schallschutzset', 'isolation', 'schallband'])) {
                        priority = 7;
                    } else {
                        priority = 9; // Any generic unclassified accessories
                    }

                    let calculatedMenge = selectedOption.menge || 1;

                    // RULE: Do not overwrite Calima logic without asking the user for keyword 'Jariel'
                    // Dynamic quantity calculation for Kaldewei Calima Stelzfüsse (Pack of 4)
                    // FULL-TEXT RULE: series keyword + dimensions can be truncated off the label.
                    const trayLbl = ((this.selectedTray.label || '') + ' ' + (this.selectedTray.description || '')).toLowerCase();
                    if (trayLbl.includes('calima') && combinedLbl.includes('stelz')) {
                        const dims = trayLbl.match(/(\d{3,4})\s*x\s*(\d{3,4})/);
                        if (dims) {
                            const l = Math.max(parseInt(dims[1]), parseInt(dims[2]));
                            const w = Math.min(parseInt(dims[1]), parseInt(dims[2]));

                            let req = 16;
                            if (w <= 700) {
                                if (l <= 1000) req = 12;
                                else if (l <= 1300) req = 15;
                                else if (l <= 1600) req = 18;
                                else req = 21;
                            } else {
                                if (l <= 1000) req = 16;
                                else if (l <= 1300) req = 20;
                                else if (l <= 1600) req = 24;
                                else req = 28;
                            }
                            // Feet are sold in packs of 4. Round up to the nearest pack.
                            calculatedMenge = Math.ceil(req / 4);
                        }
                    }

                    const isInlineDropdown = config.enableGalleryUX && mat.options && mat.options.length > 1;

                    finalBOM.push({
                        artNr: selectedOption.artNr,
                        label: enrichedLabel,
                        typ: selectedOption.type || mat.name || 'Zubehör',
                        menge: calculatedMenge,
                        img: enrichedImg,
                        note: note,
                        priority: priority,
                        isInlineDropdown: isInlineDropdown,
                        matId: mat.id,
                        options: isInlineDropdown ? mat.options : null
                    });
                });

            } else {
                // ─── WANDKLOSETT / OTHER: Original Priority Engine ────────────────
                materials.forEach(mat => {
                    const selectedArtNr = this.selectedTray.selections[mat.id];
                    const selectedOption = (mat.options || []).find(o => o.artNr === selectedArtNr) || (mat.options && mat.options[0]);
                    if (!selectedOption) return;

                    // Check against active Montageart filter
                    const matClass = this.classifyAccessory(selectedOption) !== 'common' ? this.classifyAccessory(selectedOption) : this.classifyAccessory(mat);
                    if (this.currentMontageart !== 'alle') {
                        if (matClass !== 'common' && matClass !== this.currentMontageart) return;
                    }

                    // Dynamically enrich from zubehoer_pool (for imported seats/plates)
                    const zubPool = (window.productApps && window.productApps['zubehoer_pool']) ? window.productApps['zubehoer_pool'].trays : [];
                    const foundZub = zubPool.find(z => z.artNr === selectedOption.artNr);

                    const enrichedLabel = foundZub ? foundZub.label : selectedOption.label;
                    const enrichedImg = (foundZub && foundZub.imgUrl) ? foundZub.imgUrl : selectedOption.imgUrl;

                    const lbl = enrichedLabel.toLowerCase();
                    const typeLbl = (selectedOption.type || mat.name || '').toLowerCase();
                    const combinedLbl = lbl + ' ' + typeLbl;

                    let priority = 99; // Default for unknown
                    let note = mat.name || 'Zubehör';

                    if (combinedLbl.includes('sitz') || combinedLbl.includes('deckel')) priority = isAufputz ? 3 : 2;
                    else if (combinedLbl.includes('platte') || combinedLbl.includes('betätigung')) priority = 3;
                    else if (combinedLbl.includes('schall') || combinedLbl.includes('isolation')) priority = isAufputz ? 5 : 4;
                    else if (combinedLbl.includes('reservoir') || combinedLbl.includes('spülkasten') || combinedLbl.includes('ap128') || combinedLbl.includes('ap116')) priority = 1;
                    else if (combinedLbl.includes('manschette') || combinedLbl.includes('garnitur') || combinedLbl.includes('ablaufanschluss') || selectedOption.artNr.includes('3241 116') || selectedOption.artNr.includes('3241 101') || selectedOption.artNr.includes('3241 102')) priority = 6;

                    const isInlineDropdown = config.enableGalleryUX && mat.options && mat.options.length > 1;

                    finalBOM.push({
                        artNr: selectedOption.artNr,
                        label: enrichedLabel,
                        typ: selectedOption.type || mat.name || 'Zubehör',
                        menge: selectedOption.menge || 1,
                        img: enrichedImg,
                        note: note,
                        priority: priority,
                        isInlineDropdown: isInlineDropdown,
                        matId: mat.id,
                        options: isInlineDropdown ? mat.options : null
                    });
                });
            }

            // 5-8. Technical Injection for Wandklosett (with Dynamic Lookup)
            if (isWandKlosett) {
                const mainLbl = activeTrayLabel.toLowerCase();

                // Access the global pool if available
                const zubPool = (window.productApps && window.productApps['zubehoer_pool']) ? window.productApps['zubehoer_pool'].trays : [];

                const getZub = (art) => {
                    const found = zubPool.find(z => z.artNr === art);
                    return found ? { artNr: found.artNr, label: found.label, img: found.imgUrl } : null;
                };

                if (isAufputz) {
                    const screws = getZub('8211 114.000.000') || { artNr: '8211 114.000.000', label: 'Befestigungsschrauben' };
                    finalBOM.push({ ...screws, typ: 'Technik', menge: 2, priority: 4, note: 'Aufputz-Technik' });
                } else {
                    const hasManschette = mainLbl.includes('manschette') || mainLbl.includes('garnitur');
                    // A Manschette that came from the tray's own groups sits at priority 6,
                    // not 5, so the priority test alone missed it and Alba/Sela ended up with
                    // BOTH their own 3241 116 and this injected 3241 101.
                    const MANSCHETTE_ART = ['3241 116.000.000', '3241 101.000.000', '3241 102.000.000'];
                    const hasScrapedSleeve = finalBOM.some(item => item.priority === 5
                        || MANSCHETTE_ART.includes(item.artNr)
                        || /manschette/i.test(item.label || ''));
                    // AquaClean Alba/Sela carry their own Manschettengarnitur as a selectable
                    // group and AquaClean Mera takes none at all, so none of the three may get
                    // the generic one injected on top.
                    // FULL-TEXT RULE: read label AND description — the model name is regularly
                    // truncated off the label.
                    const trayFull = ((this.selectedTray.label || '') + ' ' + (this.selectedTray.description || ''));
                    const skipAutoManschette = /aquaclean\s+(alba|sela|mera)/i.test(trayFull);

                    if (!hasManschette && !hasScrapedSleeve && !skipAutoManschette) {
                        const item = getZub('3241 101.000.000') || { artNr: '3241 101.000.000', label: 'Manschettengarnitur' };
                        finalBOM.push({ ...item, typ: 'Technik', menge: 1, priority: 5, note: 'Standard-Technik' });
                    }

                    const step6 = getZub('3612 348.000.000') || { artNr: '3612 348.000.000', label: 'Wandklosettelement Geberit Duofix' };
                    finalBOM.push({ ...step6, typ: 'Technik', menge: 1, priority: 6, note: 'Standard-Technik' });

                    const step7 = getZub('3612 500.000.000') || { artNr: '3612 500.000.000', label: 'Rückwandbefestigungssatz Geberit Duofix' };
                    finalBOM.push({ ...step7, typ: 'Technik', menge: 1, priority: 7, note: 'Standard-Technik' });

                    const step8 = getZub('3612 374.000.000') || { artNr: '3612 374.000.000', label: 'Ablaufbogen Geberit- Silent' };
                    finalBOM.push({ ...step8, typ: 'Technik', menge: 1, priority: 8, note: 'Standard-Technik' });
                }
            }

            // Final Sort and Independent Deduplication Checks
            const mainLblLower = activeTrayLabel.toLowerCase();

            // Seat Deduplication: Catch 'inkl. sitz', 'inkl. klosettsitz', 'inkl. wc-sitz', 'm. sitz'
            const ceramicIncludesSeat = mainLblLower.includes('pack') ||
                /m\.\s*(klosett|wc-)?sitz/.test(mainLblLower) ||
                /inkl\.\s*(klosett|wc-)?sitz/.test(mainLblLower) ||
                (/\bset\b/.test(mainLblLower) && !mainLblLower.includes('schallschutz'));

            // Isolation Deduplication: Only if explicitly included or stated as 'Schallschutz-Set'
            const ceramicIncludesSchallschutz = mainLblLower.includes('inkl. schall') ||
                mainLblLower.includes('m. schall') ||
                mainLblLower.includes('schallschutz-set') ||
                mainLblLower.includes('schallschutzset') ||
                mainLblLower.includes('inkl. isolation');

            
            // Add Accessories to finalBOM
            if (this.showAccessoires && this.selectedAccessoires && this.selectedAccessoires.length > 0) {
                const allApps = window.productApps || {};
                this.selectedAccessoires.forEach(artNr => {
                    let accObj = null;
                    Object.keys(allApps).forEach(appKey => {
                        if (accObj) return;
                        const app = allApps[appKey];
                        const itemsToSearch = app.trays || [];
                        accObj = itemsToSearch.find(t => t.artNr === artNr);
                    });
                    if (accObj) {
                        finalBOM.push({
                            artNr: accObj.artNr,
                            label: accObj.label,
                            typ: 'Accessoire',
                            menge: 1,
                            img: accObj.imgUrl,
                            note: 'Accessoire',
                            priority: 90
                        });
                    }
                });
            }


            let sortedBOM = finalBOM.sort((a, b) => a.priority - b.priority);

            // Remove redundant line items if they are already physically bundled with the main ceramic
            if (ceramicIncludesSeat) {
                sortedBOM = sortedBOM.filter(item => item.priority !== 2);
            }
            if (ceramicIncludesSchallschutz) {
                sortedBOM = sortedBOM.filter(item => item.priority !== 4);
            }

            // Render
            let totalCount = 0;
            const zubPool = (window.productApps && window.productApps['zubehoer_pool']) ? window.productApps['zubehoer_pool'].trays : [];

            sortedBOM.forEach(item => {
                // If it's a dropdown, we MUST render it so the user can change it, even if the current selection is "none" or menge is 0.
                if (!item.isInlineDropdown) {
                    if (!item.artNr || item.artNr === 'none' || item.menge === 0 || (item.label && item.label.toLowerCase().startsWith('ohne'))) return;
                }
                
                let descHTML = `<div class="bom-desc">${fullLabel(item)}</div>`;
                if (item.isInlineDropdown && item.options) {
                    const optionsHTML = item.options.map(opt => {
                        const foundZub = zubPool.find(z => z.artNr === opt.artNr);
                        const finalLabel = foundZub ? foundZub.label : opt.label;
                        const selected = (this.selectedTray.selections[item.matId] === opt.artNr) ? 'selected' : '';
                        // "ohne_wandbedienpanel" is an opt-out sentinel, not an art-Nr — don't
                        // print it after the label.
                        const dropdownLbl = opt.dropdownLabel ? opt.dropdownLabel
                            : (isNoneArtNr(opt.artNr) ? finalLabel : `${finalLabel} (${opt.artNr})`);
                        return `<option value="${opt.artNr}" ${selected}>${dropdownLbl}</option>`;
                    }).join('');

                    const selectedArtNr = this.selectedTray.selections[item.matId] || (item.options[0] && item.options[0].artNr);
                    const selectedOpt = item.options.find(opt => opt.artNr === selectedArtNr);
                    const foundZub = selectedOpt ? zubPool.find(z => z.artNr === selectedOpt.artNr) : null;
                    const selectedDesc = foundZub ? foundZub.label : (selectedOpt ? selectedOpt.label : '');

                    const isTape = item.matId === 'mat_tape' || 
                                   (item.label && item.label.toLowerCase().includes('dichtband')) ||
                                   (item.artNr && item.artNr.replace(/\s/g, '').startsWith('1461')) ||
                                   (item.options && item.options.some(o => o.artNr && o.artNr.replace(/\s/g, '').startsWith('1461')));

                    let tapeDescHTML = '';
                    if (isTape && selectedDesc) {
                        tapeDescHTML = `<div style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 0.35rem; line-height: 1.35; background: rgba(0,0,0,0.15); padding: 0.5rem; border-radius: 4px; border-left: 3px solid var(--accent); font-weight: normal; text-align: left;">${selectedDesc}</div>`;
                    }

                    descHTML = `
                        <select class="inline-bom-select" data-matid="${item.matId}" style="width: 100%; padding: 0.5rem; border-radius: 6px; border: 1px solid var(--border); background: var(--bg-surface); color: var(--text-primary); font-size: 0.9rem; margin-bottom: 0.25rem; font-family: inherit; font-weight: 500; cursor: pointer; outline: none; transition: border-color 0.2s ease;">
                            ${optionsHTML}
                        </select>
                        ${tapeDescHTML}
                    `;
                }

                const row = document.createElement('tr');
                row.innerHTML = `
                        <td><div class="img-cell" ${!item.img ? 'style="background: transparent; border: 1px dashed var(--border);"' : ''}>
                            ${item.img ? `<img src="${item.img}" alt="${item.label}">` : '<i class="ri-settings-3-line" style="font-size:1.2rem;opacity:0.3;"></i>'}
                        </div></td>
                        <td><span class="bom-code">${isNoneArtNr(item.artNr) ? '-' : item.artNr}</span></td>
                        <td>
                            ${descHTML}
                            <div style="font-size: 0.8rem; color: #9e9e9e; margin-top: 0.25rem;">${item.note}</div>
                        </td>

                        <td><strong>${isNoneArtNr(item.artNr) ? '-' : item.menge}</strong></td>
                    `;
                bomTableBody.appendChild(row);

                if (item.isInlineDropdown) {
                    const selectEl = row.querySelector('.inline-bom-select');
                    if (selectEl) {
                        selectEl.addEventListener('change', (e) => {
                            const newVal = e.target.value;
                            this.selectedTray.selections[item.matId] = newVal;
                            
                            // Forward Dependency Check (Bidirectional Auto-switching)
                            if (this.selectedTray && this.selectedTray.mountingMaterials) {
                                this.selectedTray.mountingMaterials.forEach(mat => {
                                    if (mat.dependsOn === item.matId && mat.optionRules) {
                                        const rule = mat.optionRules.find(r => r.whenArtNr === newVal);
                                        if (rule) {
                                            const validOpt = mat.options.find(o => rule.optionArtNrs.includes(o.artNr));
                                            if (validOpt) {
                                                this.selectedTray.selections[mat.id] = validOpt.artNr;
                                            }
                                        }
                                    }
                                });
                            }

                            // Reverse Dependency Check (Bidirectional Auto-switching)
                            if (this.selectedTray && this.selectedTray.mountingMaterials) {
                                this.selectedTray.mountingMaterials.forEach(mat => {
                                    if (mat.options && mat.options.length > 0) {
                                        mat.options.forEach(opt => {
                                            if (opt.artNr === newVal && mat.dependsOn) {
                                                const dependedMat = this.selectedTray.mountingMaterials.find(m => m.id === mat.dependsOn);
                                                if (dependedMat && dependedMat.optionRules) {
                                                    const matchingRule = dependedMat.optionRules.find(r => r.optionArtNrs.includes(newVal));
                                                    if (matchingRule) {
                                                        this.selectedTray.selections[dependedMat.id] = matchingRule.whenArtNr;
                                                    }
                                                }
                                            }
                                        });
                                    }
                                });
                            }

                            this.updateBOM();
                            this.renderConfigurator();
                        });
                    }
                }

                totalCount += item.menge;
            });

            bomCountCounter.textContent = `${totalCount} Artikel benötigt`;
            priceBOM(document.getElementById('bomTableBody'));
        },
        copyToClipboard: function () {
            if (!this.selectedTray) {
                alert('Bitte wählen Sie zuerst ein Produkt aus.');
                return;
            }

            const titleLower = title.toLowerCase();
            const isWandKlosett = titleLower.includes('wandklosett');
            const isStandKlosett = titleLower.includes('standklosett');

            let textLines = [];

            if (isWandKlosett || isStandKlosett) {
                const bomTableBody = document.getElementById('bomTableBody');
                if (bomTableBody) {
                    const rows = bomTableBody.querySelectorAll('tr');
                    rows.forEach(row => {
                        if (row.style.display === "none" || row.style.opacity === "0.5" || window.getComputedStyle(row).display === "none") return;
                        if (row.querySelector("td[colspan]")) return;

                        const codeSpan = row.querySelector('.bom-code');
                        const qtyStrong = row.querySelector('strong');
                        if (codeSpan && qtyStrong) {
                            const code = codeSpan.textContent.replace(/\t/g, '').trim();
                            const menge = qtyStrong.textContent.replace(/\t/g, '').trim();
                            if (code !== "none" && code !== "" && !code.toLowerCase().startsWith("ohne") && code !== "Ausstehend") {
                                textLines.push(`${code}\t${menge}`);
                            }
                        }
                    });
                } else {
                    alert("Tabelle konnte nicht gefunden werden.");
                    return;
                }
            } else {
                let activeTrayArtNr = this.selectedTray.selections && this.selectedTray.selections['__variant__'] ? this.selectedTray.selections['__variant__'] : this.selectedTray.artNr;
                let activeTrayMenge = 1;
                if (this.selectedTray.selections && this.selectedTray.selections['__variant__'] && this.selectedTray.selections['__variant__'] !== this.selectedTray.artNr) {
                    const variant = (this.selectedTray.variants || []).find(v => v.artNr === this.selectedTray.selections['__variant__']);
                    if (variant) activeTrayMenge = variant.menge || 1;
                } else {
                    activeTrayMenge = this.selectedTray.menge || 1;
                }

                let cleanMainArtNr = (activeTrayArtNr || '').toString().replace(/\t/g, '').trim();
                textLines = [`${cleanMainArtNr}\t${activeTrayMenge}`];
                (this.selectedTray.mountingMaterials || []).forEach(mat => {
                    if (!mat.options || mat.options.length === 0) return;
                    const matClass = this.classifyAccessory(mat.options[0]) !== 'common' ? this.classifyAccessory(mat.options[0]) : this.classifyAccessory(mat);
                    if (this.currentMontageart !== 'alle') {
                        if (matClass !== 'common' && matClass !== this.currentMontageart) return;
                    }

                    const selectedArtNr = this.selectedTray.selections[mat.id];
                    const selectedOption = (mat.options || []).find(o => o.artNr === selectedArtNr) || (mat.options && mat.options[0]);
                    if (selectedOption && selectedOption.artNr && selectedOption.artNr !== 'none' && !selectedOption.label.toLowerCase().startsWith('ohne')) {
                        let cleanAccArtNr = (selectedOption.artNr || '').toString().replace(/\t/g, '').trim();
                        textLines.push(`${cleanAccArtNr}\t${selectedOption.menge || 1}`);
                    }
                });
            }

            const text = textLines.join('\n');
            window.copyTextToClipboard(text).then(() => {
                alert("Artikel und Menge kopiert für SAP:\n\n" + text.replace(/\t/g, "    "));
            }).catch(e => alert("Kopieren fehlgeschlagen."));
        }
    };
}




