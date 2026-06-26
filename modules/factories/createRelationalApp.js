import { matchesSearchQuery, configSidebar, bomTableBody, bomCountCounter, getVariantColor, getSanitasImgUrl, applyPillUI, Ae, re, me, ke, Be, X } from './_shared.js';

export function createRelationalApp(title, desc, mainImgUrl, config = {}) {
    const w = title;
    const E = desc;
    const V = mainImgUrl;
    const k = config;
    
    if (!config.sizeLabel && title.toLowerCase().includes('rinne')) {
        config.sizeLabel = 'Breite';
    }
    const isMixer = config.isMixer || title.toLowerCase().includes('mischer') || title.toLowerCase().includes('armatur');
    const montageLabel1 = config.montageLabel1 || (isMixer ? "Aufputz" : "Wannenträger");
    const montageLabel2 = config.montageLabel2 || (isMixer ? "Unterputz" : "Montagerahmen");
    const montageLabel3 = config.montageLabel3 || "";
    const montageLabel4 = config.montageLabel4 || "";
    const montageLabel5 = config.montageLabel5 || "";
    const hideSizeForm = config.hideSizeForm || isMixer;
    const suffix = title.replace(/\s/g, '');

    return {
        parseSize: function (t) {
            let s = t.size || '';
            const isRange = s.includes('-');
            const hasMissingDim = s.split('x').length < 3;
            
            let isVario = false;
            let vMinL = null, vMaxL = null, vMinW = null, vMaxW = null;

            if (isRange || hasMissingDim) {
                const match = t.label && t.label.match(/(?:(\d+)\s*-\s*)?(\d+)\s*x\s*(?:(\d+)\s*-\s*)?(\d+)\s*x\s*(\d+(?:[.,]\d+)?)/);
                if (match) {
                    let m1_min = match[1] ? parseFloat(match[1]) : parseFloat(match[2]);
                    let m1_max = parseFloat(match[2]);
                    
                    let m2_min = match[3] ? parseFloat(match[3]) : parseFloat(match[4]);
                    let m2_max = parseFloat(match[4]);
                    
                    let m3 = parseFloat(match[5].replace(',', '.'));

                    if (m1_max > 300 || m2_max > 300) {
                        m1_min /= 10; m1_max /= 10;
                        m2_min /= 10; m2_max /= 10;
                        m3 /= 10;
                    }
                    
                    s = `${m1_max} x ${m2_max} x ${m3}`;
                    
                    if (match[1] || match[3] || (t.label && t.label.includes('Vario'))) {
                        isVario = true;
                        vMinL = m1_min; vMaxL = m1_max;
                        vMinW = m2_min; vMaxW = m2_max;
                    }
                }
            } else if (s.includes('Vario') || (t.label && t.label.includes('Vario'))) {
                 isVario = true;
            }

            if (!s) return { size2D: '', size2DReversed: '', depth: null, isVario: false };
            
            let parts = s.split('x').map(p => p.trim());
            if (parts.length >= 2) {
                let m1 = parseFloat(parts[0]);
                let m2 = parseFloat(parts[1]);
                if (m1 > 300 || m2 > 300) {
                    m1 /= 10; m2 /= 10;
                    parts[0] = m1.toString();
                    parts[1] = m2.toString();
                    if (parts.length >= 3) {
                        parts[2] = (parseFloat(parts[2].replace(',', '.')) / 10).toString();
                    }
                }
            }

            return { 
                size2D: parts.length >= 2 ? parts[0] + ' x ' + parts[1] : s, 
                size2DReversed: parts.length >= 2 ? parts[1] + ' x ' + parts[0] : s,
                depth: parts.length >= 3 ? parts[2] : null,
                isVario: isVario,
                varioMinL: vMinL, varioMaxL: vMaxL,
                varioMinW: vMinW, varioMaxW: vMaxW
            };
        },
        title: title,
        trays: [],
        mainImgUrl: mainImgUrl,
        selectedTray: null,
        showAccessoires: false,
        currentAccessoiresSerie: 'all',
        selectedAccessoires: [],
        useMontageset: false,
        toggleMontageset: function (val) {
            this.useMontageset = val;
            this.renderConfigurator();
            this.updateBOM();
        },
        cleanLabel: function (label) {
            if (config.sizeLabel === 'Breite' && label) {
                return label.replace(/^(Duschrinne|Duschenrinne)\s+/i, '').trim();
            }
            return label;
        },
        normalizeSerie: function (label, manufacturer = '') {
            let s = String(label || '').toLowerCase().trim();
            const m = String(manufacturer || '').toLowerCase();

            // Remove leading junk and prefixes
            s = s.replace(/^[-\s/]+/, '')
                .replace(/^-?\s*endmontageset\b/, '')
                .replace(/^-?\s*fertigmontageset\b/, '')
                .replace(/^-?\s*(duschrinne|duschenrinne|duschkanal)\b/, '')
                .replace(/^[-\s/]+/, '');

            if (m && s.startsWith(m)) s = s.slice(m.length).trim();
            if (m) s = s.replace(new RegExp(`\\b${m.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi'), '').trim();

            // Advanced cleaning
            s = s.replace(/^[-\s/]+/, '')
                .replace(/\babdeckplatte\b.*$/i, '')
                .replace(/\bdurchflussleistung\b.*$/i, '')
                .replace(/\bohne einbaukörper\b.*$/i, '')
                .replace(/\benergieeffizienzklasse\b.*$/i, '')
                .replace(/\bgeräuschgruppe\b.*$/i, '')
                .replace(/\barmhebel\b.*$/i, '')
                .replace(/\bselbstschliessend\b.*$/i, '')
                .replace(/\btemperaturgriff\b.*$/i, '')
                .replace(/^thermostat\s+/i, '')
                .replace(/\s+½["”]?\s+thermostat\b.*$/i, '')
                .replace(/\s+thermostat\b.*$/i, '')
                .replace(/\bmit sicherheitstaste\b.*$/i, '')
                .replace(/\b1-weg\b.*$/i, '')
                .replace(/\s+½["”]?$/i, '')
                .replace(/\bav\.0\b/g, 'Ava 2.0')
                .replace(/\bvit\.0\b/g, 'Vita 2.0')
                .replace(/\s*,\s*$/g, '')
                .replace(/\s+/g, ' ')
                .trim();

            if (!s) return 'Andere';

            // CamelCase formatting
            return s.split(' ').map(word => {
                if (/^kwc$/i.test(word)) return 'KWC';
                if (/^\d/.test(word)) return word;
                return word.charAt(0).toUpperCase() + word.slice(1);
            }).join(' ');
        },
        extractSerie: function (t) {
            if (t.serie) return this.normalizeSerie(t.serie, t.manufacturer);

            let typeKeywords = ["aufputz-duschenmischer", "unterputz-duschenmischer", "duschenmischer", "duschmischer", "aufputz-bademischer", "unterputz-bademischer", "bademischer", "waschtischmischer", "thermostatmischer", "thermostat-duschenmischer", "einhebelmischer", "einlochmischer", "mischer", "duschenrinne", "duschrinne", "duschkanal", "papierhalter", "reserverollenhalter", "klosettbürstenhalter", "wc-bürste", "seifenhalter", "seifenspender", "glashalter", "doppelglashalter", "handtuchhalter", "handtuchring", "handtuchhaken", "badetuchstange", "hakenleiste", "drahtseifenhalter", "duschkorb", "schwammhalter", "accessoire"];
            if (title && title.toLowerCase().includes('wanne')) {
                typeKeywords.push("duschenwanne", "duschwanne", "badewanne", "duschfläche", "wanne");
            }
            let label = (t.label || '').toLowerCase();

            if (t.manufacturer) {
                const m = t.manufacturer.toLowerCase();
                if (label.startsWith(m)) label = label.slice(m.length).trim();
            }

            for (const kw of typeKeywords) {
                if (label.startsWith(kw)) {
                    label = label.slice(kw.length).trim();
                    break;
                }
            }

            label = label.replace(/-?endmontageset/g, '').replace(/-?fertigmontageset/g, '').trim();

            if (t.manufacturer) {
                const m = t.manufacturer.toLowerCase();
                if (label.startsWith(m)) label = label.slice(m.length).trim();
            }

            const match = label.match(/^(.*?)(?:\s+\d+\s*[xX]\s*\d+|\s*,|\s*\(|\s+-|\s+\d+mm|\s+\d+\s*mm|\s+\d+\s*x\s*\d+)/);
            let serie = match && match[1] ? match[1].trim() : label.trim();

            const isAccessory = ['papierhalter', 'reserverollenhalter', 'klosettbürstenhalter', 'wc-bürste', 'seifenhalter', 'seifenspender', 'glashalter', 'doppelglashalter', 'handtuchhalter', 'handtuchring', 'handtuchhaken', 'badetuchstange', 'hakenleiste', 'drahtseifenhalter', 'duschkorb', 'schwammhalter', 'accessoire'].some(kw => ((t.label||'') + ' ' + (t.description||'')).toLowerCase().includes(kw));
            if (isAccessory && serie.includes(' ')) serie = serie.split(' ')[0];

            return this.normalizeSerie(serie, t.manufacturer);
        },
        extractMontage: function (t) {
            const l = ((t.label || '') + ' ' + (t.description || '')).toLowerCase();
            const isBath = title.toLowerCase().includes('badewanne') || title.toLowerCase().includes('wanne');

            if (l.includes('unterputz') || l.includes(' up ') || l.includes('einbau') || l.includes('endmontageset') || l.includes('grundkörper')) {
                return 'Unterputz';
            }
            if (l.includes('aufputz') || l.includes(' ap ') || l.includes('wandbatterie') || l.includes('wandmischer') || l.includes('ad 153 mm')) {
                return 'Aufputz';
            }
            if (isBath && (l.includes('standmodell') || l.includes('freistehend'))) {
                return 'Standmodell';
            }
            return 'Aufputz';
        },
        extractTrayMontage: function (t) {
            const l = ((t.label || '') + ' ' + (t.description || '')).toLowerCase();
            const s = ((t.serie || t.label || '') + ' ' + (t.description || '')).toLowerCase();
            
            if (s.includes('cerawall')) return 'wand';
            if (s.includes('cerafloor') || s.includes('ceraframe')) return 'raum';
            if (s.includes('ineva w')) return 'wand';
            if (s.includes('ineva f')) return 'raum';
            
            if (s.includes('cleanline')) return 'both';
            
            if (l.includes('raum- oder wandmontage') || l.includes('wandmontage möglich, frei im raum') || l.includes('direkt vor der wand oder mittig')) return 'both';
            if (l.includes('wandmontage') || l.includes('wandangebunden') || l.includes('an der wand') || l.includes('zur wand')) return 'wand';
            if (l.includes('raummontage') || l.includes('frei im raum') || l.includes('mittig') || l.includes('in der fläche')) return 'raum';
            
            return 'both';
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
                // Only use mountingMaterials to detect the main tray object, because accessories now have manufacturer fields too.
                if (obj.mountingMaterials !== undefined) return 'common';

                // 1. Check for manual admin override first
                if (obj.overrideMontageart && obj.overrideMontageart !== 'auto') {
                    return obj.overrideMontageart.toLowerCase();
                }

                // 2. CHECK CATEGORY NAME / ID FIRST (New & Robust)
                // If the object is a category (mat) or an option, check its container name
                const catName = (obj.name || '').toLowerCase();
                const catId = (obj.id || '').toLowerCase();
                if (catName.includes('träger') || catName.includes('wannenträger') || catId.includes('carrier') || catId.includes('träger')) return 'wannenträger';
                if (catName.includes('rahmen') || catName.includes('montagerahmen') || catId.includes('rahmen') || catId.includes('frame')) return 'montagerahmen';
                if (catName.includes('stelz')) return 'stelzfüsse';

                // 3. Clean input data for keyword matching
                const label = ((obj.label || obj.name || '') + ' ' + (obj.description || '')).toLowerCase();
                const artNr = (obj.artNr || '').replace(/\s/g, '');

                // 4. HARD EXCEPTIONS (Firm IDs)
                if (this.title === 'Duschenwanne') {
                    if (artNr === '1445782.000.000' || artNr === '1441782.000.000') {
                        return 'wannenträger';
                    }
                    if (artNr === '1431191.000.000' || artNr === '1431190.000.000' || artNr === '1435435.000.000' || artNr === '1435433.000.000') {
                        return 'montagerahmen';
                    }
                } else if (this.title === 'Badewanne') {
                    // Future Badewanne specific exceptions go here
                }

                // 5. KEYWORD LOGIC
                // Special Rule: If it's a Siphon (Ablauf) or Deckel, it's ALWAYS common
                if (label.includes('ablauf') || label.includes('siphon') || label.includes('garnitur') || label.includes('ventil') || label.includes('deckel')) {
                    return 'common';
                }

                if (label.includes('schallschutzset') || label.includes('schallschutz')) {
                    return isMixer ? 'unterputz' : 'montagerahmen';
                }

                const isToilet = title.toLowerCase().includes('klosett') || title.toLowerCase().includes('wc');

                if (isMixer) {
                    const lblLower = label.toLowerCase();
                    if (lblLower.includes('standmodell') || lblLower.includes('freien stand')) {
                        return 'standmodell';
                    }
                    if (lblLower.includes('einbaukörper') || lblLower.includes('grundkörper') || lblLower.includes('ibox') || lblLower.includes('up-gehäuse')) {
                        return 'unterputz';
                    }
                    if (lblLower.includes('endmontage') || lblLower.includes('einbau') || lblLower.includes('anschlussbogen') || lblLower.includes('unterputz') || lblLower.includes(' up ')) {
                        return 'unterputz';
                    }
                    if (lblLower.includes('aufputz') || lblLower.includes(' ap ') || lblLower.includes('ausserhalb') || lblLower.includes('mischer') || lblLower.includes('batterie')) {
                        return 'aufputz';
                    }
                } else if (isToilet) {
                    const lblLower = label.toLowerCase();
                    if (lblLower.includes('einbauspülkasten') || lblLower.includes('einbauspulkasten')) {
                        return 'unterputz';
                    }
                    return 'aufputz';
                } else {
                    if (label.includes('träger') || label.includes('wannenträger') || label.includes('montageschaum')) {
                        return 'wannenträger';
                    }
                    // IMPORTANT: stelzfüsse check MUST come before generic 'füsse' check
                    // otherwise "Stelzfüsse" matches 'füsse' and is wrongly classified as montagerahmen
                    if (label.includes('stelzfüss') || label.includes('stelzfuss')) {
                        return 'stelzfüsse';
                    }
                    if (label.includes('rahmen') || label.includes('füsse') || label.includes('fussset')) {
                        return 'montagerahmen';
                    }
                    if (label.includes('schallschutzset') || label.includes('schallschutz')) {
                        return 'montagerahmen';
                    }
                }

                return 'common';
            };

            const rawClass = getRawClass.call(this, obj);
            
            const validCategories = [
                'common',
                'alle',
                'all',
                (config.montageLabel1 || (isMixer ? "Aufputz" : "Wannenträger")).toLowerCase(),
                (config.montageLabel2 || (isMixer ? "Unterputz" : "Montagerahmen")).toLowerCase(),
                (config.montageLabel3 || "").toLowerCase(),
                (config.montageLabel4 || "").toLowerCase(),
                (config.montageLabel5 || "").toLowerCase()
            ].filter(Boolean);

            if (!validCategories.includes(rawClass)) {
                console.warn(`[Configurator] Invalid RelationalApp mounting category "${rawClass}" detected for ${obj.artNr || obj.name}. Falling back to "common" to prevent silent exclusion.`);
                return 'common';
            }
            return rawClass;
        },
        init: function () {
            this.isToiletApp = (title.toLowerCase().includes('klosett') || title.toLowerCase().includes('wc'));
            this.selectedTray = null;
            this.showAccessoires = false;
            this.currentAccessoiresSerie = 'all';
            this.selectedAccessoires = [];
            this.showAccessoires = false;
            this.selectedAccessoires = [];
            this.currentMontageart = 'alle';
            this.currentManufacturer = 'all';
            this.currentSerie = 'all';
            this.currentVariant = 'all';
            this.currentForm = 'all';
            this.currentSize = 'all';
            this.renderSidebar();
            this.bindFilters();
            this.filterResults(); // initial run
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

                        <div class="filter-group" id="group_rel_variant_${suffix}" style="display: none;">
                            <div class="finder-sub-header" id="head_rel_variant_${suffix}">Varianten</div>
                            <div class="pill-group" id="list_rel_variant_${suffix}"></div>
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

                        <div class="filter-group" id="group_rel_tiefe_${suffix}" style="display: none;">
                            <div class="finder-sub-header" id="head_rel_tiefe_${suffix}">Tiefe</div>
                            <div class="pill-group" id="list_rel_tiefe_${suffix}"></div>
                        </div>
                        `}
                        
                        <div class="filter-group">
                            <div class="finder-sub-header" id="head_rel_montage_${suffix}">${systemLabel}</div>
                            <div class="pill-group" id="list_rel_montage_${suffix}"></div>
                        </div>

                        ${(hideSizeForm || isToiletApp || config.hideManualSizeInputs) ? '' : `
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

                    ${(title.toLowerCase().includes('dusche') || title.toLowerCase().includes('wanne') || title.toLowerCase().includes('rinne')) && !isMixer ? `
                    <div class="sidebar-section addon-toggles-section" id="addon_toggles_section_${suffix}" style="display:none; margin-top:2rem;">
                        <div class="finder-sub-header">Zusatzoptionen</div>
                        <div class="addon-toggle-row" id="toggle_accessoires_${suffix}">
                            <span class="addon-toggle-label"><i class="ri-archive-line"></i> Accessoires</span>
                            <button class="ios-toggle" data-target="accessoires_dusche" aria-label="Accessoires ein/aus"><span class="ios-toggle-knob"></span></button>
                        </div>
                        <div id="addon_accessoires_dusche_panel_${suffix}" class="addon-panel" style="display:none;">
                            <div class="finder-sub-header">Serie</div>
                            <div class="pill-group" id="list_addon_accessoires_serie_dusche_${suffix}" style="margin-bottom: 0.75rem;"></div>
                            <div class="finder-sub-header">Accessoires wählen</div>
                            <div class="finder-list" id="list_addon_accessoires_dusche_${suffix}"></div>
                        </div>
                    </div>
                    ` : ''}


                    ${isToiletApp ? `
                    <div class="sidebar-section addon-toggles-section" id="addon_toggles_section_${suffix}" style="display:none; margin-top:2rem;">
                        <div class="finder-sub-header">Zusatzoptionen</div>
                        <div class="addon-toggle-row" id="toggle_accessoires_${suffix}">
                            <span class="addon-toggle-label"><i class="ri-archive-line"></i> Accessoires</span>
                            <button class="ios-toggle" data-target="accessoires_wc" aria-label="Accessoires ein/aus"><span class="ios-toggle-knob"></span></button>
                        </div>
                        <div id="addon_accessoires_wc_panel_${suffix}" class="addon-panel" style="display:none;">
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
                this.currentTiefe = 'all';
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
            const rawSeries = [...new Set(validTraysForSerie.map(t => this.extractSerie(t)))].sort();
            const series = [...new Set(rawSeries.map(s => {
                if (s.startsWith('Cerawall')) return 'Cerawall';
                if (s.startsWith('Cerafloor')) return 'Cerafloor';
                return s;
            }))].sort();
            serList.innerHTML = `<button class="pill-btn ${this.currentSerie === 'all' ? 'active' : ''}" data-val="all">Alle <span class="badge" style="font-size:0.7rem;opacity:0.6;margin-left:4px;">${this.getFilteredCount('Serie', 'all')}</span></button>` + series.map(s => `
                    <button class="pill-btn ${this.currentSerie === s ? 'active' : ''}" data-val="${s}">${s} <span class="badge" style="font-size:0.7rem;opacity:0.6;margin-left:4px;">${this.getFilteredCount('Serie', s)}</span></button>
                `).join('');
            applyPillUI(`head_rel_serie_${suffix}`, `list_rel_serie_${suffix}`, this.currentSerie, 'Serie', () => {
                this.currentSerie = 'all';
                this.currentVariant = 'all';
                this.currentSize = 'all';
                this.updatePillFilters();
                this.filterResults();
            });
            serList.querySelectorAll('.pill-btn').forEach(btn => btn.addEventListener('click', () => {
                this.currentSerie = btn.dataset.val;
                this.currentVariant = 'all';
                this.updatePillFilters();
                this.filterResults();
            }));

            // 2.5 Dynamic Variant Filter
            const varList = document.getElementById(`list_rel_variant_${suffix}`);
            const varGroup = document.getElementById(`group_rel_variant_${suffix}`);
            if (varList && varGroup) {
                if (this.currentSerie === 'Cerawall' || this.currentSerie === 'Cerafloor') {
                    varGroup.style.display = 'block';
                    const baseSerie = this.currentSerie;
                    const matchingFullSeries = rawSeries.filter(s => s.startsWith(baseSerie));
                    const variants = [...new Set(matchingFullSeries.map(s => s.slice(baseSerie.length).trim()))].sort();
                    
                    varList.innerHTML = `<button class="pill-btn ${this.currentVariant === 'all' ? 'active' : ''}" data-val="all">Alle <span class="badge" style="font-size:0.7rem;opacity:0.6;margin-left:4px;">${this.getFilteredCount('Variant', 'all')}</span></button>` + variants.map(v => `
                        <button class="pill-btn ${this.currentVariant === v ? 'active' : ''}" data-val="${v}">${v} <span class="badge" style="font-size:0.7rem;opacity:0.6;margin-left:4px;">${this.getFilteredCount('Variant', v)}</span></button>
                    `).join('');
                    
                    applyPillUI(`head_rel_variant_${suffix}`, `list_rel_variant_${suffix}`, this.currentVariant, 'Varianten', () => {
                        this.currentVariant = 'all';
                        this.updatePillFilters();
                        this.filterResults();
                    });
                    
                    varList.querySelectorAll('.pill-btn').forEach(btn => btn.addEventListener('click', () => {
                        this.currentVariant = btn.dataset.val;
                        this.updatePillFilters();
                        this.filterResults();
                    }));
                } else {
                    varGroup.style.display = 'none';
                    this.currentVariant = 'all';
                }
            }

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
                applyPillUI(`head_rel_form_${suffix}`, `list_rel_form_${suffix}`, this.currentForm, formLabel, () => {
                    this.currentForm = 'all';
                    this.currentSize = 'all';
                    this.currentTiefe = 'all';
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
                const sizes2D = [...new Set(validTraysForSize.filter(t => !this.parseSize(t).isVario).map(t => this.parseSize(t).size2D))].filter(Boolean).sort((a, b) => {
                    const partsA = String(a).split('x').map(s => parseFloat(s.trim()));
                    const partsB = String(b).split('x').map(s => parseFloat(s.trim()));
                    for (let i = 0; i < Math.max(partsA.length, partsB.length); i++) {
                        const numA = partsA[i];
                        const numB = partsB[i];
                        if (isNaN(numA) && isNaN(numB)) continue;
                        if (isNaN(numA)) return 1;
                        if (isNaN(numB)) return -1;
                        if (numA !== numB) return numA - numB;
                    }
                    return String(a).localeCompare(String(b));
                });
                sList.innerHTML = `<button class="pill-btn ${this.currentSize === 'all' ? 'active' : ''}" data-val="all">Alle <span class="badge" style="font-size:0.7rem;opacity:0.6;margin-left:4px;">${this.getFilteredCount('Size', 'all')}</span></button>` + sizes2D.map(s => {
                    const btnLabel = config.sizeLabel === 'Breite' ? `bis ${s} cm` : s;
                    return `<button class="pill-btn ${this.currentSize === s ? 'active' : ''}" data-val="${s}">${btnLabel} <span class="badge" style="font-size:0.7rem;opacity:0.6;margin-left:4px;">${this.getFilteredCount('Size', s)}</span></button>`;
                }).join('');
                const displaySizeVal = config.sizeLabel === 'Breite' ? `bis ${this.currentSize} cm` : this.currentSize;
                applyPillUI(`head_rel_size_${suffix}`, `list_rel_size_${suffix}`, this.currentSize, config.sizeLabel || 'Grösse', () => {
                    this.currentSize = 'all';
                    this.currentTiefe = 'all';
                    this.updatePillFilters();
                    this.filterResults();
                }, displaySizeVal);
                sList.querySelectorAll('.pill-btn').forEach(btn => btn.addEventListener('click', () => {
                    this.currentSize = btn.dataset.val;
                    this.currentTiefe = 'all';
                    this.updatePillFilters();
                    this.filterResults();
                }));
            }

            // 4.5. Tiefe (Depth)
            const tiefeGroup = document.getElementById(`group_rel_tiefe_${suffix}`);
            const tList = document.getElementById(`list_rel_tiefe_${suffix}`);
            if (tiefeGroup && tList) {
                if (title.toLowerCase().includes('wanne') && this.currentSize !== 'all') {
                    let validTraysForTiefe = validTraysForSerie;
                    if (this.currentSerie !== 'all') validTraysForTiefe = validTraysForTiefe.filter(t => this.extractSerie(t) === this.currentSerie);
                    if (this.currentForm !== 'all') validTraysForTiefe = validTraysForTiefe.filter(t => t.form === this.currentForm);
                    
                    let filterW = null, filterL = null;
                    if (this.currentSize && this.currentSize !== 'all' && this.currentSize !== 'alle') {
                        const fParts = this.currentSize.split('x').map(x => parseFloat(x.trim()));
                        if (fParts.length >= 2) { filterW = fParts[0]; filterL = fParts[1]; }
                    }
                    
                    let traysForDepth = validTraysForTiefe.filter(t => {
                        const parsed = this.parseSize(t);
                        if (parsed.isVario && filterW && filterL) {
                            let passDirect = (filterW >= parsed.varioMinL && filterW <= parsed.varioMaxL) && (filterL >= parsed.varioMinW && filterL <= parsed.varioMaxW);
                            let passRotated = (filterW >= parsed.varioMinW && filterW <= parsed.varioMaxW) && (filterL >= parsed.varioMinL && filterL <= parsed.varioMaxL);
                            return passDirect || passRotated;
                        }
                        return parsed.size2D === this.currentSize || parsed.size2DReversed === this.currentSize;
                    });
                    const depths = [...new Set(traysForDepth.map(t => this.parseSize(t).depth).filter(Boolean))].sort((a,b) => parseFloat(a) - parseFloat(b));
                    
                    if (depths.length > 0) {
                        tiefeGroup.style.display = 'block';
                        tList.innerHTML = `<button class="pill-btn ${this.currentTiefe === 'all' ? 'active' : ''}" data-val="all">Alle <span class="badge" style="font-size:0.7rem;opacity:0.6;margin-left:4px;">${this.getFilteredCount('Tiefe', 'all')}</span></button>` + depths.map(d => {
                            return `<button class="pill-btn ${this.currentTiefe === d ? 'active' : ''}" data-val="${d}">${d} <span class="badge" style="font-size:0.7rem;opacity:0.6;margin-left:4px;">${this.getFilteredCount('Tiefe', d)}</span></button>`;
                        }).join('');
                        
                        applyPillUI(`head_rel_tiefe_${suffix}`, `list_rel_tiefe_${suffix}`, this.currentTiefe, 'Tiefe', () => {
                            this.currentTiefe = 'all';
                            this.updatePillFilters();
                            this.filterResults();
                        });
                        
                        tList.querySelectorAll('.pill-btn').forEach(btn => btn.addEventListener('click', () => {
                            this.currentTiefe = btn.dataset.val;
                            this.updatePillFilters();
                            this.filterResults();
                        }));
                    } else {
                        tiefeGroup.style.display = 'none';
                        this.currentTiefe = 'all';
                    }
                } else {
                    tiefeGroup.style.display = 'none';
                    this.currentTiefe = 'all';
                }
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

            if (!lInput && !wInput) {
                this.currentSize = 'all';
            } else if (lInput && wInput) {
                const sizeStr = `${lInput} x ${wInput}`;
                const sizeStrRev = `${wInput} x ${lInput}`;

                const found = this.trays.find(t => t.size === sizeStr || t.size === sizeStrRev);
                if (found) {
                    this.currentSize = found.size;
                } else {
                    this.currentSize = 'custom';
                }
            } else {
                this.currentSize = 'custom';
            }
            this.updatePillFilters();
        },
        // Pure filter predicate — extracted verbatim from filterResults so the pill
        // counts (getFilteredCount) reuse the EXACT same filtering. Filter values are
        // read live from this.current*; lFilter/wFilter/isToilet come via ctx (computed
        // once per pass). Behaviour-preserving.
        matchesFilters: function (t, ctx) {
            const mFilter = this.currentManufacturer || 'all';
            const serieFilter = this.currentSerie || 'all';
            const fFilter = this.currentForm || 'all';
            const sFilter = this.currentSize || 'all';
            const tiefeFilter = this.currentTiefe || 'all';
            const lFilter = ctx.lFilter;
            const wFilter = ctx.wFilter;
            const isToilet = ctx.isToilet;

            if (mFilter !== 'all' && mFilter !== 'alle' && t.manufacturer !== mFilter) return false;

            if (serieFilter !== 'all' && serieFilter !== 'alle') {
                const s = this.extractSerie(t);
                if (serieFilter === 'Cerawall' || serieFilter === 'Cerafloor') {
                    if (!s.startsWith(serieFilter)) return false;
                    if (this.currentVariant !== 'all' && s !== `${serieFilter} ${this.currentVariant}`) {
                        return false;
                    }
                } else {
                    if (s !== serieFilter) return false;
                }
            }

            if (!hideSizeForm) {
                const fFilterClean = fFilter.toLowerCase();
                const tFormClean = (t.form || '').toLowerCase();
                if (fFilterClean !== 'all' && fFilterClean !== 'alle' && !tFormClean.includes(fFilterClean) && !fFilterClean.includes(tFormClean)) return false;

                if (sFilter !== 'all' && sFilter !== 'alle' && sFilter !== 'custom') {
                    const parsed = this.parseSize(t);

                    if (parsed.isVario) {
                        const fParts = sFilter.split('x').map(x => parseFloat(x.trim()));
                        if (fParts.length >= 2) {
                            let filterW = fParts[0];
                            let filterL = fParts[1];
                            let passDirect = (filterW >= parsed.varioMinL && filterW <= parsed.varioMaxL) && (filterL >= parsed.varioMinW && filterL <= parsed.varioMaxW);
                            let passRotated = (filterW >= parsed.varioMinW && filterW <= parsed.varioMaxW) && (filterL >= parsed.varioMinL && filterL <= parsed.varioMaxL);
                            if (!passDirect && !passRotated) return false;
                        } else {
                            return false;
                        }
                    } else {
                        if (parsed.size2D !== sFilter && parsed.size2DReversed !== sFilter) return false;
                    }

                    if (tiefeFilter !== 'all' && parsed.depth !== tiefeFilter) return false;
                } else if (!isToilet && (lFilter || wFilter)) {
                    const parsed = this.parseSize(t);
                    let lf = parseFloat(lFilter);
                    let wf = parseFloat(wFilter);

                    if (parsed.isVario) {
                        let passDirect = (!lf || (lf >= parsed.varioMinL && lf <= parsed.varioMaxL)) &&
                                         (!wf || (wf >= parsed.varioMinW && wf <= parsed.varioMaxW));
                        let passRotated = (!lf || (lf >= parsed.varioMinW && lf <= parsed.varioMaxW)) &&
                                          (!wf || (wf >= parsed.varioMinL && wf <= parsed.varioMaxL));
                        if (!passDirect && !passRotated) return false;
                    } else if (parsed.size2D) {
                        const fParts = parsed.size2D.split('x').map(x => parseFloat(x.trim()));
                        if (fParts.length >= 2) {
                            let tL = fParts[0];
                            let tW = fParts[1];
                            let passDirect = (!lf || lf === tL) && (!wf || wf === tW);
                            let passRotated = (!lf || lf === tW) && (!wf || wf === tL);
                            if (!passDirect && !passRotated) return false;
                        } else {
                            return false;
                        }
                    } else {
                        return false;
                    }
                }
            }

            // Filter Main Products by Montageart if chosen
            if (this.currentMontageart !== 'alle' && this.currentMontageart !== 'all') {
                if (title.toLowerCase().includes('rinne')) {
                    const m = this.extractTrayMontage(t);
                    if (m !== 'both' && m !== this.currentMontageart) return false;
                } else {
                    const m = this.classifyAccessory(t);
                    if (m !== 'common' && m !== this.currentMontageart) return false;

                    // For trays/products that are 'common' themselves, check their accessories
                    if (m === 'common') {
                        let hasMatchingAccessory = false;
                        if (t.mountingMaterials) {
                            t.mountingMaterials.forEach(mat => {
                                // Classify by the mat CATEGORY itself (id/name) — most reliable
                                const matCls = this.classifyAccessory(mat);
                                if (matCls === this.currentMontageart) {
                                    hasMatchingAccessory = true;
                                } else if (matCls === 'common' && mat.options && mat.options[0]) {
                                    // Fall back to classifying by the first option label
                                    if (this.classifyAccessory(mat.options[0]) === this.currentMontageart) {
                                        hasMatchingAccessory = true;
                                    }
                                }
                            });
                        }
                        if (!hasMatchingAccessory && t.mountingMaterials && t.mountingMaterials.length > 0) return false;
                    }
                }
            }

            return true;
        },

        // Faceted count for a product-filter pill value: how many products match if this
        // value were selected, given the other active filters (mirrors the Glass app).
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
            const tiefeFilter = this.currentTiefe || 'all';
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
                return;
            }

            filtered.forEach(t => {
                const btn = document.createElement('button');
                btn.className = `result-item-card ${this.selectedTray && this.selectedTray.id === t.id ? 'active' : ''}`;
                btn.innerHTML = `
                        <div class="card-img-wrapper">
                            ${(t.imgUrl || getSanitasImgUrl(t.artNr)) ? `<img src="${t.imgUrl || getSanitasImgUrl(t.artNr)}">` : '<i class="ri-image-line placeholder-icon"></i>'}
                        </div>
                        <div class="result-info">
                            <strong>${t.label}</strong>
                            <div class="result-meta">
                                <span>${t.manufacturer}</span> ${hideSizeForm ? '' : `| <span>${config.sizeLabel === 'Breite' ? `bis ${t.size} cm` : t.size}</span>`}
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
                if (config.enableGalleryUX) {
                    this.renderGridInMainPanel(filtered);
                } else {
                    this.clearBOM();
                }
            }
        },
        renderGridInMainPanel: function (filtered) {
            bomCountCounter.textContent = filtered.length + ' Produkte gefunden';
            if (filtered.length === 0) {
                bomTableBody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:#9da3ad; padding:2rem;">Keine Produkte gefunden. Bitte passen Sie die Filter an.</td></tr>';
                return;
            }

            // Explicitly sort by size for the initial load
            const sortedFiltered = [...filtered].sort((a, b) => {
                const partsA = String(a.size || '').split('x').map(s => parseFloat(s.trim()));
                const partsB = String(b.size || '').split('x').map(s => parseFloat(s.trim()));
                for (let i = 0; i < Math.max(partsA.length, partsB.length); i++) {
                    const numA = partsA[i];
                    const numB = partsB[i];
                    if (isNaN(numA) && isNaN(numB)) continue;
                    if (isNaN(numA)) return 1;
                    if (isNaN(numB)) return -1;
                    if (numA !== numB) return numA - numB;
                }
                return String(a.size || '').localeCompare(String(b.size || ''));
            });

            // If there's an overwhelming number, cap it like GlassApp
            const cappedFiltered = sortedFiltered.slice(0, 150);

            let cards = cappedFiltered.map(t => {
                return `
                    <div class="result-item-card catalog-preview-card" onclick="window.currentActiveApp.selectTray('${t.id}')" style="display:flex; flex-direction:row; align-items:center; gap:1rem; border:1px solid var(--border); border-radius:8px; padding:1rem; background:var(--bg-surface); cursor:pointer; transition:all 0.2s;" onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 6px 20px rgba(0,0,0,0.2)'" onmouseout="this.style.transform=''; this.style.boxShadow=''">
                        <div class="card-img-wrapper" style="width:70px; height:90px; display:flex; align-items:center; justify-content:center; border-radius:6px; overflow:hidden; background:var(--bg-subtle); flex-shrink:0;">
                            ${(t.imgUrl || getSanitasImgUrl(t.artNr)) ? `<img src="${t.imgUrl || getSanitasImgUrl(t.artNr)}" loading="lazy" style="max-height:100%; max-width:100%; object-fit:contain;">` : '<i class="ri-image-line placeholder-icon" style="font-size:2rem; color:var(--text-secondary);"></i>'}
                        </div>
                        <div class="result-info" style="display:flex; flex-direction:column; flex:1; min-width:0;">
                            <span style="font-size:0.7rem; color:var(--text-secondary); text-transform:uppercase; letter-spacing:0.5px; margin-bottom:2px;">${t.manufacturer || "Marke unbekannt"}</span>
                            <strong style="font-size:0.85rem; line-height:1.3; margin-bottom:4px; color:var(--text-primary); display:-webkit-box; -webkit-line-clamp:3; -webkit-box-orient:vertical; overflow:hidden;">${t.label}</strong>
                            <div style="font-size:0.75rem; color:var(--text-secondary);">${t.size || ""}</div>
                            ${t.form ? `<div style="font-size:0.7rem; color:var(--text-secondary); margin-top:2px;">${t.form}</div>` : ''}
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

            // Do NOT auto-change currentMontageart when a tray is selected.
            // This would re-filter the results and collapse the list to only matching trays,
            // which is confusing — the user should control the Montageart filter themselves.
            // Only update the pill UI to reflect the current state.
            this.updatePillFilters();

            // Ensure data structure and setup selections
            this.selectedTray.selections = {};

            // Montageset trays (e.g. Schmidlin Swiss Line) ship as one complete kit —
            // default the "Komplettes Montageset verwenden" toggle ON so the set shows
            // immediately; trays without a Montageset reset it OFF.
            this.useMontageset = (this.selectedTray.mountingMaterials || []).some(g => g.id === 'mat_montageset');

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

                // Enforce initial compatibility (ensure mat_deckel is compatible with mat_siphon)
                if (this.selectedTray.selections && this.selectedTray.mountingMaterials) {
                    const siphonSelection = this.selectedTray.selections['mat_siphon'];
                    const deckelMat = this.selectedTray.mountingMaterials.find(m => m.id === 'mat_deckel');
                    if (siphonSelection && deckelMat && deckelMat.optionRules) {
                        if (siphonSelection === '1422 117.000.000' || siphonSelection === '1422117.000.000') {
                            const currentDeckel = this.selectedTray.selections['mat_deckel'];
                            if (currentDeckel !== '1422 118.100.000' && currentDeckel !== '1422 118.501.000') {
                                this.selectedTray.selections['mat_deckel'] = '1422 118.501.000';
                            }
                        } else {
                            const rule = deckelMat.optionRules.find(r => r.whenArtNr === siphonSelection);
                            if (rule) {
                                const currentDeckel = this.selectedTray.selections['mat_deckel'];
                                if (!rule.optionArtNrs.includes(currentDeckel)) {
                                    const validOpt = deckelMat.options.find(o => rule.optionArtNrs.includes(o.artNr));
                                    if (validOpt) {
                                        this.selectedTray.selections['mat_deckel'] = validOpt.artNr;
                                    }
                                }
                            }
                        }
                    }
                }
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

            if (config.enableGalleryUX) {
                if (configBlock) configBlock.style.display = 'none';
                return;
            }

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

                const renderVariantSwatch = (artNr, label) => {
                    const btn = document.createElement('button');
                    const isActive = this.selectedTray.selections['__variant__'] === artNr;
                    btn.className = `finish-row-btn ${isActive ? 'active' : ''}`;
                    btn.style.width = '100%';
                    btn.style.display = 'flex';
                    btn.style.alignItems = 'center';

                    const imgUrl = getSanitasImgUrl(artNr);
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
                                // Exclude Geberit siphon 1422 117 from color selection propagation for cover
                                if (mat.id === 'mat_deckel') {
                                    const selSiphon = this.selectedTray.selections['mat_siphon'];
                                    if (selSiphon === '1422 117.000.000' || selSiphon === '1422117.000.000') {
                                        return;
                                    }
                                }

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

                        // Enforce compatibility after color matching (ensure mat_deckel is compatible with mat_siphon)
                        if (this.selectedTray.selections && this.selectedTray.mountingMaterials) {
                            const siphonSelection = this.selectedTray.selections['mat_siphon'];
                            const deckelMat = this.selectedTray.mountingMaterials.find(m => m.id === 'mat_deckel');
                            if (siphonSelection && deckelMat && deckelMat.optionRules) {
                                if (siphonSelection === '1422 117.000.000' || siphonSelection === '1422117.000.000') {
                                    const currentDeckel = this.selectedTray.selections['mat_deckel'];
                                    if (currentDeckel !== '1422 118.100.000' && currentDeckel !== '1422 118.501.000') {
                                        this.selectedTray.selections['mat_deckel'] = '1422 118.501.000';
                                    }
                                } else {
                                    const rule = deckelMat.optionRules.find(r => r.whenArtNr === siphonSelection);
                                    if (rule) {
                                        const currentDeckel = this.selectedTray.selections['mat_deckel'];
                                        if (!rule.optionArtNrs.includes(currentDeckel)) {
                                            const validOpt = deckelMat.options.find(o => rule.optionArtNrs.includes(o.artNr));
                                            if (validOpt) {
                                                this.selectedTray.selections['mat_deckel'] = validOpt.artNr;
                                            }
                                        }
                                    }
                                }
                            }
                        }

                        this.updateBOM();
                        this.renderConfigurator();
                    });
                    return btn;
                };

                // Add base item (Standard)
                const standardLabel = `Standard ${this.selectedTray.label.split(',').pop().trim()}`;
                swatchGrid.appendChild(renderVariantSwatch(this.selectedTray.artNr, standardLabel));

                // Add all specific variants
                this.selectedTray.variants.forEach(v => {
                    swatchGrid.appendChild(renderVariantSwatch(v.artNr, v.label));
                });

                variantDiv.appendChild(vLabel);
                variantDiv.appendChild(swatchGrid);
                inner.appendChild(variantDiv);
            }

            // 2. Render Accessories
            const titleLower = title.toLowerCase();
            const isWanne = titleLower.includes('wanne') || titleLower.includes('duschfläche');
            const isDuschenwanne = titleLower === 'duschenwanne';
            const isRinne = titleLower.includes('rinne');

            if (this.selectedTray && this.selectedTray.mountingMaterials && this.selectedTray.mountingMaterials.length > 0) {
                hasConfig = true;
            }

            // Technical Compatibility Warning might also need configBlock
            let needsWarning = false;
            if (this.currentMontageart === 'wannenträger') {
                const hasCarrier = this.selectedTray && this.selectedTray.mountingMaterials && this.selectedTray.mountingMaterials.some(m => {
                    const firstOpt = m.options?.[0];
                    return firstOpt && this.classifyAccessory(firstOpt) === 'wannenträger';
                });
                if (!hasCarrier) needsWarning = true;
            }
            if (needsWarning) hasConfig = true;

            if (!hasConfig) {
                configBlock.style.display = 'none';
                return;
            }

            configBlock.style.display = 'block';

            // --- Technical Compatibility Warning ---
            if (needsWarning) {
                const warnDiv = document.createElement('div');
                warnDiv.className = 'compatibility-warning';
                warnDiv.innerHTML = `
                        <div style="background: rgba(255, 152, 0, 0.1); border: 1px solid rgba(255, 152, 0, 0.3); color: #e65100; padding: 1rem; border-radius: 8px; font-size: 0.9rem; margin-bottom: 1.5rem; display: flex; align-items: start; gap: 0.75rem;">
                            <span style="font-size: 1.2rem;">⚠️</span>
                            <div>
                                <strong style="display: block; margin-bottom: 0.25rem;">Kein Wannenträger verfügbar</strong>
                                Diese Duschwanne ist nicht carrier-kompatibel oder es wurde kein passender Träger im Pool gefunden. Bitte nutzen Sie das <strong>Montagerahmen-System</strong>.
                            </div>
                        </div>
                    `;
                inner.appendChild(warnDiv);
            }

            // Only show the "Komplettes Montageset verwenden" toggle when there is an
            // actual choice — i.e. a Montageset AND individual raw parts to switch to.
            // Montageset-only trays (e.g. Schmidlin Swiss Line today) keep the toggle
            // HIDDEN, but all its logic/properties stay so it re-appears automatically
            // if individual parts are added for those trays later. (useMontageset still
            // defaults ON in selectTray, so the set renders by default while hidden.)
            const hasMontageset = this.selectedTray.mountingMaterials.some(g => g.id === 'mat_montageset');
            const hasIndividualParts = this.selectedTray.mountingMaterials.some(g => g.id !== 'mat_montageset' && g.options && g.options.length > 0);
            if (hasMontageset && hasIndividualParts) {
                const toggleDiv = document.createElement('div');
                toggleDiv.className = 'montageset-toggle-wrapper';
                toggleDiv.style.marginBottom = '1.5rem';
                toggleDiv.innerHTML = `
                    <div class="addon-toggle-row" style="cursor: pointer;">
                        <span class="addon-toggle-label"><i class="ri-box-3-line"></i> Komplettes Montageset verwenden</span>
                        <button class="ios-toggle ${this.useMontageset ? 'active' : ''}" aria-label="Montageset ein/aus" style="pointer-events: none;"><span class="ios-toggle-knob"></span></button>
                    </div>
                `;
                inner.appendChild(toggleDiv);

                toggleDiv.querySelector('.addon-toggle-row').addEventListener('click', () => {
                    this.toggleMontageset(!this.useMontageset);
                });
            }

            // Create a sorted copy of mountingMaterials for UI rendering
            const sortedMaterials = [...this.selectedTray.mountingMaterials].sort((a, b) => {
                const getPri = (mat) => {
                    const lbl = (mat.name || '').toLowerCase();
                    if (isWanne) {
                         if (lbl.includes('deckel')) return 2;
                         if (lbl.includes('garnitur') || lbl.includes('siphon')) return 3;
                         if (lbl.includes('band') || lbl.includes('zargen')) return 4;
                         if (lbl.includes('montageset') || lbl.includes('dichtset')) return 5;
                         if (lbl.includes('träger') || lbl.includes('rahmen')) return 6;
                         if (lbl.includes('schaum') || lbl.includes('fuss') || lbl.includes('stütz') || lbl.includes('anker')) return 7;
                         if (lbl.includes('schall') || lbl.includes('isolation')) return 8;
                         return 99;
                    } else if (isRinne) {
                         if (lbl.includes('abdeckung') || lbl.includes('rost') || lbl.includes('deckel')) return 2;
                         if (lbl.includes('gehäuse') || lbl.includes('gehause')) return 3;
                         if (lbl.includes('schall')) return 4;
                         return 99;
                    } else {
                         if (lbl.includes('sitz') || lbl.includes('deckel')) return 2;
                         if (lbl.includes('platte') || lbl.includes('betätigung')) return 3;
                         if (lbl.includes('schall') || lbl.includes('isolation')) return 4;
                         if (lbl.includes('manschette') || lbl.includes('garnitur')) return 5;
                         return 99;
                    }
                };
                return getPri(a) - getPri(b);
            });

            const isAufMass = this.selectedTray && this.selectedTray.label && !!this.selectedTray.label.match(/\d+\s*-\s*\d+\s*x\s*\d+\s*-\s*\d+/);

            sortedMaterials.forEach(mat => {
                if (!mat.options || mat.options.length === 0) return;

                if (mat.id === 'mat_montageset') return;
                if (this.useMontageset) return;
                
                const isTape = mat.id === 'mat_tape' || mat.name === 'Zargen-Wannendichtband' || mat.name === 'Wannenzargenband';
                if (isWanne && isAufMass && isTape) return; // Hide tape from sidebar for custom trays, render inline in BOM instead

                const matClass = this.classifyAccessory(mat.options[0]) !== 'common' ? this.classifyAccessory(mat.options[0]) : this.classifyAccessory(mat);

                if (this.currentMontageart !== 'alle') {
                    if (matClass !== 'common' && matClass !== this.currentMontageart) return;
                }

                // Check dependencies
                let blocked = false;
                let activeOptions = [...mat.options];
                let noOptionsNeeded = false;

                if (mat.dependsOn) {
                    const parentSelection = this.selectedTray.selections[mat.dependsOn];
                    if (!parentSelection) {
                        blocked = true;
                    } else if (mat.optionRules && mat.optionRules.length > 0) {
                        const rule = mat.optionRules.find(r => r.whenArtNr === parentSelection);
                        if (rule) {
                            activeOptions = mat.options.filter(o => rule.optionArtNrs.includes(o.artNr));
                            if (activeOptions.length === 0) noOptionsNeeded = true;
                        } else {
                            // If parent selected but no rule matches, maybe none are compatible or needed.
                            activeOptions = [];
                            noOptionsNeeded = true;
                        }
                    }
                }

                // If standalone, but was bundled automatically by another selection, we might want to hide it.
                // We'll handle this in updateBOM by deduping finalBOM, but visually it's cleaner to hide it.
                // Find if any currently selected material bundles this mat's options.
                let isBundled = false;
                this.selectedTray.mountingMaterials.forEach(m => {
                    if (m.id !== mat.id && this.selectedTray.selections[m.id]) {
                        const selOptArtNr = this.selectedTray.selections[m.id];
                        // check static bundles
                        if (m.bundle && m.bundle.some(b => activeOptions.some(o => o.artNr === b.artNr))) isBundled = true;
                        // check bundleRules
                        if (m.bundleRules) {
                            const r = m.bundleRules.find(br => br.optionArtNrs.includes(selOptArtNr));
                            if (r && r.bundle && r.bundle.some(b => activeOptions.some(o => o.artNr === b.artNr))) isBundled = true;
                        }
                    }
                });
                if (isBundled) return; // Completely hide redundant options if they are bundled by another selection.

                if (activeOptions.length === 0 && !blocked) return; // nothing to show

                // Auto-select first option if current selection is invalid or missing
                if (!blocked && !noOptionsNeeded) {
                    if (!this.selectedTray.selections[mat.id] || !activeOptions.find(o => o.artNr === this.selectedTray.selections[mat.id])) {
                        let defaultOpt = activeOptions[0];
                        if (title && title.toLowerCase().includes('badewanne') && (mat.id === 'mat_tape' || (mat.name && mat.name.includes('Dichtband')))) {
                            const nischeOpt = activeOptions.find(o => (o.label && o.label.includes('3-seitig')) || (o.dropdownLabel && o.dropdownLabel.includes('3-seitig')));
                            if (nischeOpt) defaultOpt = nischeOpt;
                        }
                        this.selectedTray.selections[mat.id] = defaultOpt.artNr;
                        // Re-render immediately to propagate dependencies (cascading updates)
                        setTimeout(() => { this.renderConfigurator(); this.updateBOM(); }, 0);
                    }
                }

                if (title.toLowerCase() === 'duschenwanne') return;

                const groupDiv = document.createElement('div');
                groupDiv.className = 'filter-group';
                const label = document.createElement('label');
                label.textContent = mat.name || "Zubehör";

                const zubPool = (window.productApps && window.productApps['zubehoer_pool']) ? window.productApps['zubehoer_pool'].trays : [];

                if (blocked) {
                    groupDiv.innerHTML = `<label>${mat.name}</label>
                            <div style="background:#fff3cd; padding:0.75rem; border-radius:6px; font-size:0.85rem; color:#856404; border:1px solid #ffeeba;">
                                <strong>Gesperrt</strong><br>
                                ${mat.blockedMessage || 'Bitte zuerst das übergeordnete Zubehör wählen.'}
                            </div>`;
                } else if (noOptionsNeeded) {
                    groupDiv.innerHTML = `<label>${mat.name}</label>
                            <div style="background:#e2e3e5; padding:0.75rem; border-radius:6px; font-size:0.85rem; color:#383d41; border:1px solid #d6d8db;">
                                ${mat.noOptionsMessage || 'Keine weitere Auswahl nötig.'}
                            </div>`;
                } else if (activeOptions.length === 1) {
                    const opt = activeOptions[0];
                    const foundZub = zubPool.find(z => z.artNr === opt.artNr);
                    const finalLabel = foundZub ? foundZub.label : opt.label;

                    groupDiv.innerHTML = `<label>${mat.name}</label>
                            <div style="background:var(--bg-surface); padding:0.75rem; border-radius:6px; font-size:0.85rem; color:var(--text-primary); border:1px solid var(--border);">
                                <strong style="display:block; margin-bottom:0.25rem;">${finalLabel}</strong>
                                <span style="color:var(--text-secondary); font-family:monospace;">${opt.artNr}</span>
                            </div>`;
                } else {
                    const select = document.createElement('select');
                    select.className = 'filter-select';
                    activeOptions.forEach(opt => {
                        const foundZub = zubPool.find(z => z.artNr === opt.artNr);
                        const finalLabel = foundZub ? foundZub.label : opt.label;

                        const option = document.createElement('option');
                        option.value = opt.artNr;
                        option.textContent = opt.dropdownLabel ? opt.dropdownLabel : `${finalLabel} (${opt.artNr})`;
                        if (this.selectedTray.selections[mat.id] === opt.artNr) option.selected = true;
                        select.appendChild(option);
                    });
                    select.addEventListener('change', (e) => {
                        this.selectedTray.selections[mat.id] = e.target.value;
                        // Render config again to update downstream dependencies
                        this.renderConfigurator();
                        this.updateBOM();
                    });
                    groupDiv.appendChild(label);
                    groupDiv.appendChild(select);
                }
                inner.appendChild(groupDiv);
            });
        },
        
        updateAccessoiresToggles: function () {
            const suffix = title.replace(/\s/g, '');
            const btn = document.querySelector(`#toggle_accessoires_${suffix} .ios-toggle`);
            const isToiletApp = ['Wandklosett', 'Standklosett'].includes(title);
            const isShowerApp = ['Duschenwanne', 'Duschenrinne', 'Badewanne'].includes(title);
            let panelId = '';
            if (isToiletApp) panelId = `addon_accessoires_wc_panel_${suffix}`;
            else if (isShowerApp) panelId = `addon_accessoires_dusche_panel_${suffix}`;
            const panel = document.getElementById(panelId);
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
                            this.currentAccessoiresSerie = 'all';
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
            
            const isToiletApp = ['Wandklosett', 'Standklosett'].includes(title);
            const isShowerApp = ['Duschenwanne', 'Duschenrinne', 'Badewanne'].includes(title);
            
            let listId = '';
            let keywords = [];
            
            if (isToiletApp) {
                listId = `list_addon_accessoires_wc_${suffix}`;
                keywords = ['papierhalter', 'reserverollenhalter', 'klosettbürstenhalter', 'wc-bürste'];
            } else if (isShowerApp) {
                listId = `list_addon_accessoires_dusche_${suffix}`;
                if (title === 'Duschenwanne' || title === 'Duschenrinne') {
                    keywords = ['drahtseifenhalter', 'duschkorb', 'badetuchstange', 'schwammhalter keuco elegance, eckmodell'];
                } else if (title === 'Badewanne') {
                    keywords = ['drahtseifenhalter', 'duschkorb', 'badetuchstange', 'schwammhalter keuco elegance, 10,5 x 23,9 cm'];
                } else {
                    keywords = ['drahtseifenhalter', 'duschkorb', 'badetuchstange'];
                }
            } else {
                return;
            }
            
            const listEl = document.getElementById(listId);
            if (!listEl) return;
            const serieListEl = document.getElementById(listId.replace('list_addon_accessoires_', 'list_addon_accessoires_serie_'));

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
            
            
            if (serieListEl) {
                const series = [...new Set(candidates.map(c => this.extractSerie(c)))].filter(Boolean).sort();
                serieListEl.innerHTML = `<button class="pill-btn ${this.currentAccessoiresSerie === 'all' ? 'active' : ''}" data-val="all">Alle</button>` +
                    series.map(s => `<button class="pill-btn ${this.currentAccessoiresSerie === s ? 'active' : ''}" data-val="${s}">${s}</button>`).join('');
                
                serieListEl.querySelectorAll('.pill-btn').forEach(btn => {
                    btn.addEventListener('click', () => {
                        this.currentAccessoiresSerie = btn.dataset.val;
                        this.populateAccessoires();
                    });
                });
            }
            
            if (this.currentAccessoiresSerie !== 'all') {
                candidates = candidates.filter(c => this.extractSerie(c) === this.currentAccessoiresSerie);
            }
            
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
                        ${(c.imgUrl || getSanitasImgUrl(c.artNr)) ? `<img src="${c.imgUrl || getSanitasImgUrl(c.artNr)}" style="width:32px; height:32px; object-fit:contain; background:#fff; border-radius:4px; padding:2px; flex-shrink:0;" onerror="this.outerHTML='<div style=&quot;width:32px; height:32px; display:flex; align-items:center; justify-content:center; background:var(--bg-surface); border-radius:4px; flex-shrink:0;&quot;><i class=&quot;ri-image-line placeholder-icon&quot;></i></div>'">` : `<div style="width:32px; height:32px; display:flex; align-items:center; justify-content:center; background:var(--bg-surface); border-radius:4px; flex-shrink:0;"><i class="ri-image-line placeholder-icon"></i></div>`}
                        <div>
                            <div style="font-size:0.8rem; font-weight:500; line-height:1.3;">${c.label}</div>
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
            bomTableBody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: #9da3ad; padding: 2rem;">Bitte wählen Sie ein Produkt aus den Suchergebnissen.</td></tr>';
        },
        updateBOM: function () {
            let backBtn = document.getElementById("backToCatalogBtn");
            if (!this.selectedTray) {
                if (backBtn) backBtn.style.display = "none";
                return;
            }
            if (config.enableGalleryUX) {
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

            let materials = this.selectedTray.mountingMaterials || [];
            bomTableBody.innerHTML = '';
            const finalBOM = [];

            const titleLower = title.toLowerCase();
            const isWandKlosett = titleLower.includes('wandklosett');
            const isStandKlosett = titleLower.includes('standklosett');
            const isWanne = titleLower.includes('wanne') || titleLower.includes('duschfläche');
            const isRinne = titleLower.includes('rinne');

            const isMatActive = (mat) => {
                let blocked = false;
                let activeOptions = [...(mat.options || [])];
                let noOptionsNeeded = false;
                if (mat.dependsOn) {
                    const parentSelection = this.selectedTray.selections[mat.dependsOn];
                    if (!parentSelection) {
                        blocked = true;
                    } else if (mat.optionRules && mat.optionRules.length > 0) {
                        const rule = mat.optionRules.find(r => r.whenArtNr === parentSelection);
                        if (rule) {
                            activeOptions = (mat.options || []).filter(o => rule.optionArtNrs.includes(o.artNr));
                            if (activeOptions.length === 0) noOptionsNeeded = true;
                        } else {
                            activeOptions = [];
                            noOptionsNeeded = true;
                        }
                    }
                }
                let isBundled = false;
                materials.forEach(m => {
                    if (m.id !== mat.id && this.selectedTray.selections[m.id]) {
                        const selOptArtNr = this.selectedTray.selections[m.id];
                        if (m.bundle && m.bundle.some(b => activeOptions.some(o => o.artNr === b.artNr))) isBundled = true;
                        if (m.bundleRules) {
                            const r = m.bundleRules.find(br => br.optionArtNrs.includes(selOptArtNr));
                            if (r && r.bundle && r.bundle.some(b => activeOptions.some(o => o.artNr === b.artNr))) isBundled = true;
                        }
                    }
                });

                // === ALL-IN-ONE SUPPRESSION LOGIC ===
                const allInOneItems = ['1411 556.501.000', '1124 769.501.000', '1124 770.501.000', '1113 302.100.000', '1113 397.100.000'];

                if (mat.name && (mat.name.toLowerCase().includes('ablaufgarnitur') || mat.name.toLowerCase().includes('wannengarnitur'))) {
                    const coverGroup = materials.find(m => m.name && (m.name.toLowerCase().includes('überlaufset') || m.name.toLowerCase().includes('ablaufdeckel')));
                    if (coverGroup && this.selectedTray.selections[coverGroup.id]) {
                        if (allInOneItems.includes(this.selectedTray.selections[coverGroup.id])) {
                            blocked = true;
                        }
                    }
                }
                if (mat.name && (mat.name.toLowerCase().includes('überlaufset') || mat.name.toLowerCase().includes('ablaufdeckel'))) {
                    const siphonGroup = materials.find(m => m.name && (m.name.toLowerCase().includes('ablaufgarnitur') || m.name.toLowerCase().includes('wannengarnitur')));
                    if (siphonGroup && this.selectedTray.selections[siphonGroup.id]) {
                        if (allInOneItems.includes(this.selectedTray.selections[siphonGroup.id])) {
                            blocked = true;
                        }
                    }
                }
                // ===================================

                if (blocked || noOptionsNeeded || isBundled || activeOptions.length === 0) return false;
                return true;
            };

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

            let variantInline = false;
            let variantOpts = [];
            if (config.enableGalleryUX && this.selectedTray.variants && this.selectedTray.variants.length > 0) {
                variantInline = true;
                variantOpts = [{ artNr: this.selectedTray.artNr, label: this.selectedTray.label }].concat(this.selectedTray.variants);
            }
            finalBOM.push({ 
                artNr: activeTrayArtNr, 
                label: activeTrayLabel, 
                typ: title, 
                menge: activeTrayMenge, 
                img: this.selectedTray.imgUrl || this.mainImgUrl, 
                note: 'Hauptartikel', 
                priority: ceramicPriority,
                isInlineDropdown: variantInline,
                options: variantOpts,
                matId: '__variant__'
            });

            if (this.useMontageset) {
                const mSet = materials.find(m => m.id === 'mat_montageset');
                if (mSet) {
                    const mSetOption = mSet.options.find(o => o.artNr !== 'none');
                    if (mSetOption) {
                        finalBOM.push({
                            artNr: mSetOption.artNr,
                            label: mSetOption.label,
                            typ: mSetOption.type || 'Montageset',
                            menge: mSetOption.menge || 1,
                            img: mSetOption.imgUrl || this.selectedTray.imgUrl || this.mainImgUrl,
                            note: 'Montageset',
                            priority: 5
                        });
                    }
                }
                materials = [];
            } else {
                materials = materials.filter(m => m.id !== 'mat_montageset');
            }

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
                    if (!isMatActive(mat)) return;
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

                    finalBOM.push({
                        artNr: selectedOption.artNr,
                        label: enrichedLabel,
                        typ: selectedOption.type || mat.name || 'Zubehör',
                        menge: selectedOption.menge || 1,
                        img: enrichedImg,
                        note: note,
                        priority: priority
                    });
                });

            } else if (isWanne) {
                // ─── DUSCHENWANNE / BADEWANNE: Dedicated Priority Engine ──────────
                materials.forEach(mat => {
                    if (!isMatActive(mat)) return;
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
                    // 5. Sealing / Montageset
                    // 6. Mounting method: Wannenträger / Montagerahmen / Nivodübel / Wannenanker
                    // 7. Montageschaum OR Fussset OR Mittenabstützsystem
                    // 8. Schallschutzset

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
                    const mName = (mat.name || '').toLowerCase();

                    // Prioritize exactly based on the standardized mat.name set by the patch script
                    if (mName === 'ablaufdeckel' || mName.includes('überlaufset')) {
                        priority = 2;
                    } else if (mName === 'ablaufgarnitur') {
                        priority = 3;
                    } else if (mName === 'zargen-wannendichtband' || mName === 'dichtband' || mName === 'wannenzargenband') {
                        priority = 4;
                    } else if (mName === 'montageset' || mName === 'dichtset') {
                        priority = 5;
                    } else if (mName === 'wannenträger system' || mName === 'wannenträger' || mName === 'montagerahmen' || mName.includes('installationsrahmen')) {
                        priority = 6;
                    } else if (mName === 'montageschaum' || mName === 'fussset' || mName === 'wannenfüsse' || mName === 'stelzfüsse' || mName.includes('abstütz') || mName.includes('anker')) {
                        priority = 7;
                    } else if (mName === 'schallschutzset' || mName === 'schallschutz') {
                        priority = 8;
                    } else {
                        // Fallback logic for generic Zubehör or unpatched trays
                        if (exactMatch(['deckel', 'ablaufabdeckung', 'ablaufdeckel', 'überlaufset']) && !combinedLbl.includes('ohne ablaufdeckel')) {
                            priority = 2;
                        } else if (exactMatch(['schallschutz', 'schallschutzset', 'isolation', 'schallband'])) {
                            priority = 8;
                        } else if (exactMatch(['schaum', 'montageschaum', 'fuss', 'füsse', 'fussset', 'wannenfüsse', 'stelzfüsse', 'mittenabstütz', 'wannenanker', 'mittenabstützsystem', 'stütz'])) {
                            priority = 7;
                        } else if (exactMatch(['träger', 'rahmen', 'wannenträger', 'montagerahmen'])) {
                            priority = 6;
                        } else if (exactMatch(['montageset', 'dichtset', 'einbauset'])) {
                            priority = 5;
                        } else if (exactMatch(['dichtband', 'wannenband', 'zargen', 'zargen-wannendichtband', 'zargenband', 'wannenzargenband'])) {
                            priority = 4;
                        } else if (exactMatch(['ablauf', 'siphon', 'garnitur', 'sifon', 'ablaufgarnitur'])) {
                            priority = 3;
                        } else {
                            priority = 9;
                        }
                    }

                    let calculatedMenge = selectedOption.menge || 1;

                    // RULE: Do not overwrite Calima logic without asking the user for keyword 'Jariel'
                    // Dynamic quantity calculation for Kaldewei Calima Stelzfüsse (Pack of 4)
                    const trayLbl = (this.selectedTray.label || '').toLowerCase();
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

                    let skipPush = false;
                    if (this.title === 'Duschenwanne') {
                        if (selectedOption.artNr === '1435 435.000.000' || selectedOption.artNr === '1435435.000.000' || selectedOption.artNr === '1435 433.000.000' || selectedOption.artNr === '1435433.000.000') {
                            const isKaldewei = (this.selectedTray.manufacturer || '').toLowerCase() === 'kaldewei';
                            const E = (this.selectedTray.label || "").toLowerCase();
                            const isCalima = E.includes("calima");
                            let maxSide = 0;
                            if (this.selectedTray.size && this.selectedTray.size.includes('x')) {
                                const parts = this.selectedTray.size.toLowerCase().split('x').map(p => parseFloat(p));
                                maxSide = Math.max(...parts.filter(n => !isNaN(n)));
                            }
                            if (isKaldewei && maxSide <= 90 && !isCalima) {
                                skipPush = true;
                            }
                        }
                    } else if (this.title === 'Badewanne') {
                        if (mat.name === 'Wannenzargenband' && this.selectedTray.mountingMaterials.some(m => m.name === 'Zargen-Wannendichtband')) {
                            skipPush = true; // Remove duplicate tape
                        }
                    }
                    if (this.title === 'Duschenwanne') {
                        if (mat.id === 'mat_deckel') {
                            const selSiphon = this.selectedTray.selections['mat_siphon'];
                            if (selSiphon === '1435 435.000.000' || selSiphon === '1435 433.000.000' || selSiphon === '1435435.000.000' || selSiphon === '1435433.000.000') {
                                skipPush = true; // KA 90 already has an Ablaufdeckel
                            }
                        }
                    }

                    if (!skipPush) {
                        const isAufMass = activeTrayLabel && !!activeTrayLabel.match(/\d+\s*-\s*\d+\s*x\s*\d+\s*-\s*\d+/);
                        const isTape = mat.id === 'mat_tape' || mat.name === 'Zargen-Wannendichtband' || mat.name === 'Wannenzargenband';
                        let isInlineDropdown = isAufMass && isTape;

                        if ((this.title === 'Duschenwanne' || config.enableGalleryUX) && mat.options && mat.options.length > 1) {
                            isInlineDropdown = true;
                        }

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
                    }

                    // ─── BUNDLE INJECTION (Logic 3) ──────────────────────────────
                    let bundlesToInject = [];
                    if (mat.bundle && mat.bundle.length > 0) {
                        bundlesToInject = [...mat.bundle];
                    }
                    if (mat.bundleRules && mat.bundleRules.length > 0) {
                        const r = mat.bundleRules.find(br => br.optionArtNrs.includes(selectedOption.artNr));
                        if (r && r.bundle) {
                            bundlesToInject.push(...r.bundle);
                        }
                    }

                    if (bundlesToInject.length > 0) {
                        bundlesToInject.forEach(b => {
                            const bArtClean = (b.artNr || '').replace(/\s/g, '');
                            const foundZubB = zubPool.find(z => (z.artNr || '').replace(/\s/g, '') === bArtClean);
                            const labelB = foundZubB ? foundZubB.label : b.label;
                            const imgB = foundZubB ? foundZubB.imgUrl : b.imgUrl;
                            const combinedLblB = (labelB + ' ' + (b.type || '')).toLowerCase();
                            let priB = 99;
                            if (combinedLblB.includes('schaum') || combinedLblB.includes('kleber') || combinedLblB.includes('mittenabstütz')) priB = 7;
                            else if (combinedLblB.includes('schall') || combinedLblB.includes('isolation')) priB = 8;
                            else priB = priority + 0.1; // Stay close to parent item

                            let skipBundlePush = false;
                            if (this.title === 'Duschenwanne') {
                                if (b.artNr === '1435 435.000.000' || b.artNr === '1435435.000.000' || b.artNr === '1435 433.000.000' || b.artNr === '1435433.000.000') {
                                    const isKaldewei = (this.selectedTray.manufacturer || '').toLowerCase() === 'kaldewei';
                                    const E = (this.selectedTray.label || "").toLowerCase();
                                    const isCalima = E.includes("calima");
                                    let maxSide = 0;
                                    if (this.selectedTray.size && this.selectedTray.size.includes('x')) {
                                        const parts = this.selectedTray.size.toLowerCase().split('x').map(p => parseFloat(p));
                                        maxSide = Math.max(...parts.filter(n => !isNaN(n)));
                                    }
                                    if (isKaldewei && maxSide <= 90 && !isCalima) {
                                        skipBundlePush = true;
                                    }
                                }
                            } else if (this.title === 'Badewanne') {
                                // Future Badewanne specific skipBundlePush rules go here
                            }

                            if (!skipBundlePush) {
                                finalBOM.push({
                                    artNr: b.artNr,
                                    label: labelB,
                                    typ: b.type || 'Bündelartikel',
                                    menge: b.menge || 1,
                                    img: imgB,
                                    note: `Inkl. zu ${mat.name}`,
                                    priority: priB
                                });
                            }
                        });
                    }
                });

            } else if (isRinne) {
                // ─── DUSCHENRINNE: Dedicated Priority Engine ─────────────────────
                materials.forEach(mat => {
                    if (!isMatActive(mat)) return;
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

                    const mName = (mat.name || '').toLowerCase();
                    const combinedLbl = (enrichedLabel + ' ' + (selectedOption.type || '') + ' ' + (mat.name || '')).toLowerCase();

                    let priority = 99; // Fallback
                    const note = mat.name || 'Zubehör';

                    const exactMatch = (words) => words.some(w => new RegExp(`(^|\\s|-|\\/)${w}(\\s|-|\\/|$)`, 'i').test(combinedLbl));

                    if (mName.includes('abdeckung') || mName.includes('rost')) {
                        priority = 2;
                    } else if (mName.includes('gehäuse') || mName.includes('gehause')) {
                        priority = 3;
                    } else if (mName.includes('schall')) {
                        priority = 4;
                    } else {
                        // Fallback logic
                        if (exactMatch(['abdeckung', 'rost', 'deckel', 'ablaufabdeckung'])) {
                            priority = 2;
                        } else if (exactMatch(['gehäuse', 'gehause', 'ablaufgehäuse', 'ablaufgehause'])) {
                            priority = 3;
                        } else if (exactMatch(['schallschutz', 'schallschutzset', 'schall', 'isolation', 'schallband'])) {
                            priority = 4;
                        } else if (exactMatch(['dichtband', 'butylband', 'zargen', 'zargen-wannendichtband'])) {
                            priority = 5;
                        } else {
                            priority = 6;
                        }
                    }

                    let isInlineDropdown = false;
                    if (config.enableGalleryUX && mat.options && mat.options.length > 1) {
                        isInlineDropdown = true;
                    }

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

            } else {
                // ─── WANDKLOSETT / OTHER: Original Priority Engine ────────────────
                materials.forEach(mat => {
                    if (!isMatActive(mat)) return;
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
                    else if (combinedLbl.includes('manschette') || combinedLbl.includes('garnitur') || combinedLbl.includes('ablaufanschluss') || selectedOption.artNr.includes('3241 116') || selectedOption.artNr.includes('3241 101') || selectedOption.artNr.includes('3241 102')) priority = 5;

                    finalBOM.push({
                        artNr: selectedOption.artNr,
                        label: enrichedLabel,
                        typ: selectedOption.type || mat.name || 'Zubehör',
                        menge: selectedOption.menge || 1,
                        img: enrichedImg,
                        note: note,
                        priority: priority
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
                    const hasScrapedSleeve = finalBOM.some(item => item.priority === 5);

                    if (!hasManschette && !hasScrapedSleeve) {
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
            const mainLblLower = (activeTrayLabel || '').toLowerCase();

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
                sortedBOM = sortedBOM.filter(item => item.priority !== 8);
            }

            console.log(`[BOM] Raw BOM for ${activeTrayArtNr}:`);
            console.table(finalBOM.map(i => ({ ArtNr: i.artNr, Label: i.label.substring(0, 30), Pri: i.priority })));

            const artNrMap = new Map();
            sortedBOM.forEach(item => {
                const art = (item.artNr || '').replace(/\s/g, '');
                if (artNrMap.has(art)) {
                    const existing = artNrMap.get(art);
                    // Keep the one with LOWER priority (1 is most important)
                    if (item.priority < existing.priority) {
                        artNrMap.set(art, item);
                    }
                } else {
                    artNrMap.set(art, item);
                }
            });
            let dedupedBOM = Array.from(artNrMap.values()).sort((a, b) => a.priority - b.priority);

            console.log(`[BOM] Deduped BOM:`, dedupedBOM.map(i => i.artNr).join(', '));

            // Render
            let totalCount = 0;
            const zubPool = (window.productApps && window.productApps['zubehoer_pool']) ? window.productApps['zubehoer_pool'].trays : [];

            dedupedBOM.forEach(item => {
                // If it's a dropdown, we MUST render it so the user can change it, even if the current selection is "none" or menge is 0.
                if (!item.isInlineDropdown) {
                    if (!item.artNr || item.artNr === 'none' || item.menge === 0 || (item.label && item.label.toLowerCase().startsWith('ohne'))) return;
                }
                
                let descHTML = `<div class="bom-desc">${item.label}</div>`;
                if (item.isInlineDropdown && item.options) {
                    if (this.selectedTray.artNr === '1121 533.100.000' && item.matId === '__variant__') {
                        const currentSel = this.selectedTray.selections['__variant__'] || '1121 533.100.000';
                        
                        let curColor = '100';
                        let curSurface = '000';
                        if (currentSel === '1121 533.100.000') { curColor = '100'; curSurface = '000'; }
                        else if (currentSel === '1121 533.100.186') { curColor = '100'; curSurface = '186'; }
                        else if (currentSel === '1121 533.105.000') { curColor = '105'; curSurface = '000'; }
                        else if (currentSel === '1121 533.536.000') { curColor = '536'; curSurface = '000'; }
                        else if (currentSel === '1121 533.536.202') { curColor = '536'; curSurface = '202'; }
                        
                        const colors = [
                            { val: '100', lbl: 'Farbe: Weiss' },
                            { val: '105', lbl: 'Farbe: Weiss Cleaneffect' },
                            { val: '536', lbl: 'Farbe: Weiss matt' }
                        ];
                        
                        const availableSurfaces = [];
                        if (curColor === '100') availableSurfaces.push('000', '186');
                        else if (curColor === '105') availableSurfaces.push('000');
                        else if (curColor === '536') availableSurfaces.push('000', '202');
                        
                        const colorSwatchesHTML = `
                            <div style="display:flex; gap:0.5rem;">
                                <button class="custom-swatch" data-color="100" title="Weiss" style="width: 28px; height: 28px; border-radius: 50%; border: 2px solid ${curColor==='100' ? 'var(--accent)' : 'rgba(0,0,0,0.1)'}; background: #ffffff; box-shadow: 0 1px 3px rgba(0,0,0,0.1); cursor:pointer; padding:0; position: relative;">
                                    ${curColor==='100' ? '<i class="ri-check-line" style="color:white; position:absolute; top:-4px; right:-6px; font-size:10px; background:var(--accent); border-radius:50%; padding: 1px;"></i>' : ''}
                                </button>
                                <button class="custom-swatch" data-color="105" title="Weiss Cleaneffect" style="width: 28px; height: 28px; border-radius: 50%; border: 2px solid ${curColor==='105' ? 'var(--accent)' : 'rgba(0,0,0,0.1)'}; background: #fdfdfd; box-shadow: 0 1px 3px rgba(0,0,0,0.1); cursor:pointer; padding:0; position: relative;">
                                    ${curColor==='105' ? '<i class="ri-check-line" style="color:white; position:absolute; top:-4px; right:-6px; font-size:10px; background:var(--accent); border-radius:50%; padding: 1px;"></i>' : ''}
                                </button>
                                <button class="custom-swatch" data-color="536" title="Weiss matt" style="width: 28px; height: 28px; border-radius: 50%; border: 2px solid ${curColor==='536' ? 'var(--accent)' : 'rgba(0,0,0,0.1)'}; background: #f1f3f5; box-shadow: 0 1px 3px rgba(0,0,0,0.1); cursor:pointer; padding:0; position: relative;">
                                    ${curColor==='536' ? '<i class="ri-check-line" style="color:white; position:absolute; top:-4px; right:-6px; font-size:10px; background:var(--accent); border-radius:50%; padding: 1px;"></i>' : ''}
                                </button>
                            </div>
                        `;
                        
                        const surfacePillsHTML = `
                            <div style="display:inline-flex; background: rgba(0,0,0,0.3); border: 1px solid var(--border); border-radius: 20px; padding: 3px;">
                                ${availableSurfaces.includes('000') ? `<button class="custom-pill" data-surface="000" style="padding: 4px 12px; border:none; border-radius: 16px; font-size:0.8rem; font-weight:500; cursor:pointer; background: ${curSurface==='000' ? 'var(--bg-subtle)' : 'transparent'}; box-shadow: ${curSurface==='000' ? '0 2px 8px rgba(0,0,0,0.2)' : 'none'}; color: ${curSurface==='000' ? 'var(--accent)' : 'var(--text-secondary)'}; transition: all 0.2s;">Standard</button>` : ''}
                                ${availableSurfaces.includes('186') ? `<button class="custom-pill" data-surface="186" style="padding: 4px 12px; border:none; border-radius: 16px; font-size:0.8rem; font-weight:500; cursor:pointer; background: ${curSurface==='186' ? 'var(--bg-subtle)' : 'transparent'}; box-shadow: ${curSurface==='186' ? '0 2px 8px rgba(0,0,0,0.2)' : 'none'}; color: ${curSurface==='186' ? 'var(--accent)' : 'var(--text-secondary)'}; transition: all 0.2s;">Gleitschutz</button>` : ''}
                                ${availableSurfaces.includes('202') ? `<button class="custom-pill" data-surface="202" style="padding: 4px 12px; border:none; border-radius: 16px; font-size:0.8rem; font-weight:500; cursor:pointer; background: ${curSurface==='202' ? 'var(--bg-subtle)' : 'transparent'}; box-shadow: ${curSurface==='202' ? '0 2px 8px rgba(0,0,0,0.2)' : 'none'}; color: ${curSurface==='202' ? 'var(--accent)' : 'var(--text-secondary)'}; transition: all 0.2s;">Gleitschutz</button>` : ''}
                            </div>
                        `;

                        descHTML = `
                            <div class="bom-desc" style="margin-bottom: 0.75rem;">${item.label}</div>
                            <div style="display:flex; gap:1.5rem; margin-bottom:0.5rem; align-items:center;">
                                <div>
                                    <div style="font-size: 0.7rem; color: var(--st-gray); margin-bottom: 0.35rem; font-weight: 500; text-transform: uppercase; letter-spacing: 0.5px;">Farbe</div>
                                    ${colorSwatchesHTML}
                                </div>
                                <div style="width: 1px; height: 30px; background: var(--border); margin-top: 15px;"></div>
                                <div>
                                    <div style="font-size: 0.7rem; color: var(--st-gray); margin-bottom: 0.35rem; font-weight: 500; text-transform: uppercase; letter-spacing: 0.5px;">Oberfläche</div>
                                    ${surfacePillsHTML}
                                </div>
                                <div id="variantStateData" data-color="${curColor}" data-surface="${curSurface}" style="display:none;"></div>
                            </div>
                        `;
                    } else if (this.title === 'Duschenwanne' && this.selectedTray.artNr === '1425 543.536.000' && item.matId === '__variant__') {
                        const currentSel = this.selectedTray.selections['__variant__'] || '1425 543.536.000';
                        
                        let curColor = '536';
                        if (currentSel === '1425 543.536.000') { curColor = '536'; }
                        else if (currentSel === '1425 543.136.000') { curColor = '136'; }
                        else if (currentSel === '1425 543.171.000') { curColor = '171'; }
                        else if (currentSel === '1425 543.841.000') { curColor = '841'; }
                        
                        const colorSwatchesHTML = `
                            <div style="display:flex; gap:0.5rem;">
                                <button class="custom-swatch-laufen" data-color="536" title="Weiss matt" style="width: 28px; height: 28px; border-radius: 50%; border: 2px solid ${curColor==='536' ? 'var(--accent)' : 'rgba(0,0,0,0.1)'}; background: #f1f3f5; box-shadow: 0 1px 3px rgba(0,0,0,0.1); cursor:pointer; padding:0; position: relative;">
                                    ${curColor==='536' ? '<i class="ri-check-line" style="color:white; position:absolute; top:-4px; right:-6px; font-size:10px; background:var(--accent); border-radius:50%; padding: 1px;"></i>' : ''}
                                </button>
                                <button class="custom-swatch-laufen" data-color="136" title="Betongrau matt" style="width: 28px; height: 28px; border-radius: 50%; border: 2px solid ${curColor==='136' ? 'var(--accent)' : 'rgba(0,0,0,0.1)'}; background: #9e9e9e; box-shadow: 0 1px 3px rgba(0,0,0,0.1); cursor:pointer; padding:0; position: relative;">
                                    ${curColor==='136' ? '<i class="ri-check-line" style="color:white; position:absolute; top:-4px; right:-6px; font-size:10px; background:var(--accent); border-radius:50%; padding: 1px;"></i>' : ''}
                                </button>
                                <button class="custom-swatch-laufen" data-color="171" title="Kaffee matt" style="width: 28px; height: 28px; border-radius: 50%; border: 2px solid ${curColor==='171' ? 'var(--accent)' : 'rgba(0,0,0,0.1)'}; background: #795548; box-shadow: 0 1px 3px rgba(0,0,0,0.1); cursor:pointer; padding:0; position: relative;">
                                    ${curColor==='171' ? '<i class="ri-check-line" style="color:white; position:absolute; top:-4px; right:-6px; font-size:10px; background:var(--accent); border-radius:50%; padding: 1px;"></i>' : ''}
                                </button>
                                <button class="custom-swatch-laufen" data-color="841" title="Anthrazit matt" style="width: 28px; height: 28px; border-radius: 50%; border: 2px solid ${curColor==='841' ? 'var(--accent)' : 'rgba(0,0,0,0.1)'}; background: #36454f; box-shadow: 0 1px 3px rgba(0,0,0,0.1); cursor:pointer; padding:0; position: relative;">
                                    ${curColor==='841' ? '<i class="ri-check-line" style="color:white; position:absolute; top:-4px; right:-6px; font-size:10px; background:var(--accent); border-radius:50%; padding: 1px;"></i>' : ''}
                                </button>
                            </div>
                        `;
                        
                        descHTML = `
                            <div class="bom-desc" style="margin-bottom: 0.75rem;">${item.label}</div>
                            <div style="display:flex; gap:1.5rem; margin-bottom:0.5rem; align-items:center;">
                                <div>
                                    <div style="font-size: 0.7rem; color: var(--st-gray); margin-bottom: 0.35rem; font-weight: 500; text-transform: uppercase; letter-spacing: 0.5px;">Farbe (Marbond)</div>
                                    ${colorSwatchesHTML}
                                </div>
                                <div class="variantStateDataLaufen" data-color="${curColor}" style="display:none;"></div>
                            </div>
                        `;
                    } else if (this.title === 'Duschenwanne' && this.selectedTray.artNr === '1311 407.100.000' && item.matId === '__variant__') {
                        const currentSel = this.selectedTray.selections['__variant__'] || '1311 407.100.000';
                        
                        let curColor = '100';
                        let curSurface = '000';
                        
                        const parts = currentSel.split('.');
                        if (parts.length === 3) {
                            curColor = parts[1];
                            curSurface = parts[2];
                        }
                        
                        const colorSwatchesHTML = `
                            <div style="display:flex; flex-wrap:wrap; gap:0.5rem; max-width:200px;">
                                <button class="custom-swatch-schmidlin" data-color="100" title="Weiss" style="width: 28px; height: 28px; border-radius: 50%; border: 2px solid ${curColor==='100' ? 'var(--accent)' : 'rgba(0,0,0,0.1)'}; background: #ffffff; box-shadow: 0 1px 3px rgba(0,0,0,0.1); cursor:pointer; padding:0; position: relative;">
                                    ${curColor==='100' ? '<i class="ri-check-line" style="color:white; position:absolute; top:-4px; right:-6px; font-size:10px; background:var(--accent); border-radius:50%; padding: 1px;"></i>' : ''}
                                </button>
                                <button class="custom-swatch-schmidlin" data-color="105" title="Weiss Cleaneffect" style="width: 28px; height: 28px; border-radius: 50%; border: 2px solid ${curColor==='105' ? 'var(--accent)' : 'rgba(0,0,0,0.1)'}; background: #fdfdfd; box-shadow: 0 1px 3px rgba(0,0,0,0.1); cursor:pointer; padding:0; position: relative;">
                                    ${curColor==='105' ? '<i class="ri-check-line" style="color:white; position:absolute; top:-4px; right:-6px; font-size:10px; background:var(--accent); border-radius:50%; padding: 1px;"></i>' : ''}
                                </button>
                                <button class="custom-swatch-schmidlin" data-color="536" title="Weiss matt" style="width: 28px; height: 28px; border-radius: 50%; border: 2px solid ${curColor==='536' ? 'var(--accent)' : 'rgba(0,0,0,0.1)'}; background: #f1f3f5; box-shadow: 0 1px 3px rgba(0,0,0,0.1); cursor:pointer; padding:0; position: relative;">
                                    ${curColor==='536' ? '<i class="ri-check-line" style="color:white; position:absolute; top:-4px; right:-6px; font-size:10px; background:var(--accent); border-radius:50%; padding: 1px;"></i>' : ''}
                                </button>
                                <button class="custom-swatch-schmidlin" data-color="151" title="Bahamabeige Cleaneffect" style="width: 28px; height: 28px; border-radius: 50%; border: 2px solid ${curColor==='151' ? 'var(--accent)' : 'rgba(0,0,0,0.1)'}; background: #e0d5c1; box-shadow: 0 1px 3px rgba(0,0,0,0.1); cursor:pointer; padding:0; position: relative;">
                                    ${curColor==='151' ? '<i class="ri-check-line" style="color:white; position:absolute; top:-4px; right:-6px; font-size:10px; background:var(--accent); border-radius:50%; padding: 1px;"></i>' : ''}
                                </button>
                                <button class="custom-swatch-schmidlin" data-color="152" title="Manhattan Cleaneffect" style="width: 28px; height: 28px; border-radius: 50%; border: 2px solid ${curColor==='152' ? 'var(--accent)' : 'rgba(0,0,0,0.1)'}; background: #b0b5b9; box-shadow: 0 1px 3px rgba(0,0,0,0.1); cursor:pointer; padding:0; position: relative;">
                                    ${curColor==='152' ? '<i class="ri-check-line" style="color:white; position:absolute; top:-4px; right:-6px; font-size:10px; background:var(--accent); border-radius:50%; padding: 1px;"></i>' : ''}
                                </button>
                                <button class="custom-swatch-schmidlin" data-color="153" title="Pergamon Cleaneffect" style="width: 28px; height: 28px; border-radius: 50%; border: 2px solid ${curColor==='153' ? 'var(--accent)' : 'rgba(0,0,0,0.1)'}; background: #e8e3d9; box-shadow: 0 1px 3px rgba(0,0,0,0.1); cursor:pointer; padding:0; position: relative;">
                                    ${curColor==='153' ? '<i class="ri-check-line" style="color:white; position:absolute; top:-4px; right:-6px; font-size:10px; background:var(--accent); border-radius:50%; padding: 1px;"></i>' : ''}
                                </button>
                            </div>
                        `;

                        const availableSurfaces = ['000', '181'];
                        if (curColor === '100') availableSurfaces.push('186');

                        const surfacePillsHTML = `
                            <div style="display:inline-flex; background: rgba(0,0,0,0.3); border: 1px solid var(--border); border-radius: 20px; padding: 3px;">
                                ${availableSurfaces.includes('000') ? `<button class="custom-pill-schmidlin" data-surface="000" style="padding: 4px 12px; border:none; border-radius: 16px; font-size:0.8rem; font-weight:500; cursor:pointer; background: ${curSurface==='000' ? 'var(--bg-subtle)' : 'transparent'}; box-shadow: ${curSurface==='000' ? '0 2px 8px rgba(0,0,0,0.2)' : 'none'}; color: ${curSurface==='000' ? 'var(--accent)' : 'var(--text-secondary)'}; transition: all 0.2s;">Standard</button>` : ''}
                                ${availableSurfaces.includes('181') ? `<button class="custom-pill-schmidlin" data-surface="181" style="padding: 4px 12px; border:none; border-radius: 16px; font-size:0.8rem; font-weight:500; cursor:pointer; background: ${curSurface==='181' ? 'var(--bg-subtle)' : 'transparent'}; box-shadow: ${curSurface==='181' ? '0 2px 8px rgba(0,0,0,0.2)' : 'none'}; color: ${curSurface==='181' ? 'var(--accent)' : 'var(--text-secondary)'}; transition: all 0.2s;">Gleitschutz Antigliss Pro</button>` : ''}
                                ${availableSurfaces.includes('186') ? `<button class="custom-pill-schmidlin" data-surface="186" style="padding: 4px 12px; border:none; border-radius: 16px; font-size:0.8rem; font-weight:500; cursor:pointer; background: ${curSurface==='186' ? 'var(--bg-subtle)' : 'transparent'}; box-shadow: ${curSurface==='186' ? '0 2px 8px rgba(0,0,0,0.2)' : 'none'}; color: ${curSurface==='186' ? 'var(--accent)' : 'var(--text-secondary)'}; transition: all 0.2s;">Gleitschutz 186</button>` : ''}
                            </div>
                        `;

                        descHTML = `
                            <div class="bom-desc" style="margin-bottom: 0.75rem;">${item.label}</div>
                            <div style="display:flex; gap:1.5rem; margin-bottom:0.5rem; align-items:center; flex-wrap: wrap;">
                                <div>
                                    <div style="font-size: 0.7rem; color: var(--st-gray); margin-bottom: 0.35rem; font-weight: 500; text-transform: uppercase; letter-spacing: 0.5px;">Farbe</div>
                                    ${colorSwatchesHTML}
                                </div>
                                <div style="width: 1px; height: 30px; background: var(--border); margin-top: 15px;"></div>
                                <div>
                                    <div style="font-size: 0.7rem; color: var(--st-gray); margin-bottom: 0.35rem; font-weight: 500; text-transform: uppercase; letter-spacing: 0.5px;">Oberfläche</div>
                                    ${surfacePillsHTML}
                                </div>
                                <div class="variantStateDataSchmidlin" data-color="${curColor}" data-surface="${curSurface}" style="display:none;"></div>
                            </div>
                        `;
                    } else {
                        const optionsHTML = item.options.map(opt => {
                            const foundZub = zubPool.find(z => z.artNr === opt.artNr);
                            const finalLabel = foundZub ? foundZub.label : opt.label;
                            const selected = (this.selectedTray.selections[item.matId] === opt.artNr) ? 'selected' : '';
                            const dropdownLbl = opt.dropdownLabel ? opt.dropdownLabel : `${finalLabel} (${opt.artNr})`;
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
                }

                const row = document.createElement('tr');
                const isPlaceholder = item.artNr === 'bitte_waehlen';
                const artNrDisplay = isPlaceholder ? '<span style="color:var(--accent); font-weight:bold;">Ausstehend</span>' : (item.artNr === 'none' ? '-' : item.artNr);
                const rowOpacity = isPlaceholder ? 'opacity: 0.8; background: rgba(255,152,0,0.05);' : '';

                row.innerHTML = `
                        <td style="${rowOpacity}"><div class="img-cell" ${!item.img ? 'style="background: transparent; border: 1px dashed var(--border);"' : ''}>
                            ${item.img ? `<img src="${item.img}" alt="${item.label}">` : '<i class="ri-settings-3-line" style="font-size:1.2rem;opacity:0.3;"></i>'}
                        </div></td>
                        <td style="${rowOpacity}"><span class="bom-code">${artNrDisplay}</span></td>
                        <td style="${rowOpacity}">
                            ${descHTML}
                            <div style="font-size: 0.8rem; color: #9e9e9e; margin-top: 0.25rem;">${item.note}</div>
                        </td>
                        
                        <td style="${rowOpacity}"><strong>${isPlaceholder ? '-' : item.menge}</strong></td>
                    `;
                    
                if (item.isInlineDropdown) {
                    const selectEl = row.querySelector('.inline-bom-select');
                    if (selectEl) {
                        selectEl.addEventListener('change', (e) => {
                            const newVal = e.target.value;
                            this.selectedTray.selections[item.matId] = newVal;
                            
                            // Reverse Dependency Check (Bidirectional Auto-switching)
                            console.log("=== INLINE BOM CHANGE ===");
                            console.log("Changed:", item.matId, "to", newVal);
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
                                const currentMat = this.selectedTray.mountingMaterials.find(m => m.id === item.matId);
                                if (currentMat && currentMat.dependsOn) {
                                    const parentMatId = currentMat.dependsOn;
                                    if (currentMat.optionRules) {
                                        const matchingRules = currentMat.optionRules.filter(r => r.optionArtNrs.includes(newVal));
                                        if (matchingRules.length > 0) {
                                            const currentParentVal = this.selectedTray.selections[parentMatId];
                                            const isAlreadyCompatible = matchingRules.some(r => r.whenArtNr === currentParentVal);
                                            if (!isAlreadyCompatible) {
                                                let nextParent = matchingRules[0].whenArtNr;
                                                if (currentParentVal) {
                                                    const currentCode = currentParentVal.split('.')[1] || '';
                                                    const bestMatch = matchingRules.find(r => r.whenArtNr.includes('.' + currentCode + '.'));
                                                    if (bestMatch) nextParent = bestMatch.whenArtNr;
                                                }
                                                this.selectedTray.selections[parentMatId] = nextParent;
                                            }
                                        }
                                    }
                                }
                            }
                            this.renderConfigurator();
                            this.updateBOM();
                        });
                    }

                    const stateDataEl = row.querySelector('#variantStateData');
                    if (stateDataEl) {
                        const updateVariant = (newColor, newSurface) => {
                            const validCombs = {
                                '100_000': '1121 533.100.000',
                                '100_186': '1121 533.100.186',
                                '105_000': '1121 533.105.000',
                                '536_000': '1121 533.536.000',
                                '536_202': '1121 533.536.202'
                            };
                            
                            let key = `${newColor}_${newSurface}`;
                            if (!validCombs[key]) {
                                newSurface = '000';
                                key = `${newColor}_${newSurface}`;
                            }
                            
                            if (validCombs[key]) {
                                this.selectedTray.selections['__variant__'] = validCombs[key];
                                this.renderConfigurator();
                                this.updateBOM();
                            }
                        };

                        const curColor = stateDataEl.getAttribute('data-color');
                        const curSurface = stateDataEl.getAttribute('data-surface');

                        const swatches = row.querySelectorAll('.custom-swatch');
                        swatches.forEach(btn => {
                            btn.addEventListener('click', (e) => {
                                const newColor = e.currentTarget.getAttribute('data-color');
                                if (newColor !== curColor) updateVariant(newColor, curSurface);
                            });
                        });

                        const pills = row.querySelectorAll('.custom-pill');
                        pills.forEach(btn => {
                            btn.addEventListener('click', (e) => {
                                const newSurface = e.currentTarget.getAttribute('data-surface');
                                if (newSurface !== curSurface) updateVariant(curColor, newSurface);
                            });
                        });
                    }

                    const stateDataElLaufen = row.querySelector('.variantStateDataLaufen');
                    if (stateDataElLaufen) {
                        const updateVariantLaufen = (newColor) => {
                            const validCombs = {
                                '536': '1425 543.536.000',
                                '136': '1425 543.136.000',
                                '171': '1425 543.171.000',
                                '841': '1425 543.841.000'
                            };
                            
                            if (validCombs[newColor]) {
                                this.selectedTray.selections['__variant__'] = validCombs[newColor];
                                this.renderConfigurator();
                                this.updateBOM();
                            }
                        };

                        const curColor = stateDataElLaufen.getAttribute('data-color');

                        const swatches = row.querySelectorAll('.custom-swatch-laufen');
                        swatches.forEach(btn => {
                            btn.addEventListener('click', (e) => {
                                const newColor = e.currentTarget.getAttribute('data-color');
                                if (newColor !== curColor) updateVariantLaufen(newColor);
                            });
                        });
                    }

                    const stateDataElSchmidlin = row.querySelector('.variantStateDataSchmidlin');
                    if (stateDataElSchmidlin) {
                        const updateVariantSchmidlin = (newColor, newSurface) => {
                            if (newSurface === '186' && newColor !== '100') {
                                newSurface = '000';
                            }
                            
                            const validCombs = {
                                '100_000': '1311 407.100.000',
                                '100_181': '1311 407.100.181',
                                '100_186': '1311 407.100.186',
                                '105_000': '1311 407.105.000',
                                '105_181': '1311 407.105.181',
                                '151_000': '1311 407.151.000',
                                '151_181': '1311 407.151.181',
                                '152_000': '1311 407.152.000',
                                '152_181': '1311 407.152.181',
                                '153_000': '1311 407.153.000',
                                '153_181': '1311 407.153.181',
                                '536_000': '1311 407.536.000',
                                '536_181': '1311 407.536.181'
                            };
                            
                            let key = `${newColor}_${newSurface}`;
                            if (!validCombs[key]) {
                                newSurface = '000';
                                key = `${newColor}_${newSurface}`;
                            }
                            
                            if (validCombs[key]) {
                                this.selectedTray.selections['__variant__'] = validCombs[key];
                                
                                // Dynamic Deckel Sync for 1311 699
                                let finalDeckel = null;
                                const curDeckel = this.selectedTray.selections['mat_deckel'];
                                if (curDeckel && curDeckel.startsWith('1311 699.')) {
                                    const nextDeckel = `1311 699.${newColor}.${newSurface}`;
                                    const nextDeckelFallback = `1311 699.${newColor}.000`;
                                    
                                    const allApps = window.productApps || {};
                                    const zubPool = allApps['zubehoer_pool'] ? allApps['zubehoer_pool'].trays : [];
                                    
                                    if (zubPool.find(z => z.artNr === nextDeckel)) finalDeckel = nextDeckel;
                                    else if (zubPool.find(z => z.artNr === nextDeckelFallback)) finalDeckel = nextDeckelFallback;
                                    
                                    // FORCE Deckel Sync
                                    if (finalDeckel) {
                                        const matDeckelObj = this.selectedTray.mountingMaterials.find(m => m.id === 'mat_deckel');
                                        if (matDeckelObj) {
                                            if (!matDeckelObj.options.find(o => o.artNr === finalDeckel)) {
                                                const zubObj = zubPool.find(z => z.artNr === finalDeckel);
                                                matDeckelObj.options.push({
                                                    artNr: finalDeckel,
                                                    label: zubObj.label,
                                                    type: 'Zubehör',
                                                    imgUrl: zubObj.imgUrl,
                                                    menge: 1
                                                });
                                            }
                                            // Explicitly force the selection
                                            this.selectedTray.selections['mat_deckel'] = finalDeckel;
                                        }
                                    }
                                }

                                // We must execute renderConfigurator BEFORE updateBOM 
                                // to ensure the left panel is updated
                                this.renderConfigurator();
                                
                                // Force selected Deckel again just in case renderConfigurator overrode it
                                if (finalDeckel) {
                                    this.selectedTray.selections['mat_deckel'] = finalDeckel;
                                }

                                this.updateBOM();
                            }
                        };

                        const stateDataElSchmidlin = row.querySelector('.variantStateDataSchmidlin');
                        const curColor = stateDataElSchmidlin ? stateDataElSchmidlin.getAttribute('data-color') : '100';
                        const curSurface = stateDataElSchmidlin ? stateDataElSchmidlin.getAttribute('data-surface') : '000';

                        const swatches = row.querySelectorAll('.custom-swatch-schmidlin');
                        swatches.forEach(btn => {
                            btn.addEventListener('click', (e) => {
                                const newColor = e.currentTarget.getAttribute('data-color');
                                if (newColor !== curColor) updateVariantSchmidlin(newColor, curSurface);
                            });
                        });

                        const pills = row.querySelectorAll('.custom-pill-schmidlin');
                        pills.forEach(btn => {
                            btn.addEventListener('click', (e) => {
                                const newSurface = e.currentTarget.getAttribute('data-surface');
                                if (newSurface !== curSurface) updateVariantSchmidlin(curColor, newSurface);
                            });
                        });
                    }
                }
                
                bomTableBody.appendChild(row);
                totalCount += isPlaceholder ? 0 : item.menge;
            });

            bomCountCounter.textContent = `${totalCount} Artikel benötigt`;
        },
        copyToClipboard: window.copyBOMToClipboard
    };
}

