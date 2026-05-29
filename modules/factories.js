// DOM Elements needed by factories
const configSidebar = document.getElementById('configSidebar');
const bomTableBody = document.getElementById('bomTableBody');
const bomCountCounter = document.getElementById('bomCount');

// Smart parser to extract color codes from Sanitas Troesch / Laufen article numbers
const getVariantColor = (label, artNr) => {
    if (artNr) {
        const match = artNr.match(/\.(\d{3})(?:\.|$)/);
        if (match) {
            const code = match[1];
            switch (code) {
                case '000': return '#FFFFFF';
                case '100': return '#FFFFFF';
                case '757': return '#F5F5F5';
                case '071': return '#F5F5F5';
                case '020': return '#222222';
                case '070': return '#2A2C2E';
                case '068': return '#2A2C2E';
                case '073': return '#EAE2D6';
                case '004': return '#E8EAED';
                case '400': return '#E8EAED';
                case '061': return '#A0A0A0';
                case '040': return '#FFD700';
                case '062': return '#CD7F32';
            }
        }
    }

    const l = label ? label.toLowerCase() : '';
    if (l.includes('schwarz matt') || l.includes('graphit')) return '#2a2c2e';
    if (l.includes('schwarz') || l.includes('black')) return '#222';
    if (l.includes('weiss matt') || l.includes('white matt')) return '#f5f5f5';
    if (l.includes('weiss') || l.includes('white') || l.includes('weiß')) return '#ffffff';
    if (l.includes('chrom')) return '#e8eaed';
    if (l.includes('gold') || l.includes('messing')) return '#ffd700';
    if (l.includes('bronze')) return '#cd7f32';
    if (l.includes('nickel') || l.includes('edelstahl')) return '#999999';
    if (l.includes('sand') || l.includes('beige')) return '#d2b48c';
    if (l.includes('grau') || l.includes('grey') || l.includes('beton')) return '#888888';
    if (l.includes('pergamon') || l.includes('bahamabeige')) return '#eae2d6';

    return '#4FC3F7';
};

const getSanitasImgUrl = (artNr) => {
    if (!artNr) return '';
    // Strip everything except numbers and dots
    const cleanArt = String(artNr).replace(/[^0-9.]/g, '');
    if (!cleanArt) return '';

    const parts = cleanArt.split('.');
    let p1 = parts[0];

    // Sanitas usually uses 8-digit codes. If 7 digits, it almost always needs a leading 0.
    // If 4 digits (old style), we keep it as is.
    if (p1.length === 7) p1 = '0' + p1;

    // Full triplet format (Standard for Kaldewei/Laufen/Schmidlin)
    if (parts.length >= 3) {
        return `https://profishop.sanitastroesch.ch/multimedia/Web/PG1/${p1}_${parts[1]}_${parts[2]}.png`;
    }

    // Fallback to single block (Common for Wannenträger and Accessories)
    return `https://profishop.sanitastroesch.ch/multimedia/Web/PG1/${p1}.png`;
};

const applyPillUI = (headId, listId, currentVal, title, resetFn, displayVal) => {
    const head = document.getElementById(headId);
    const list = document.getElementById(listId);
    if (!head || !list) return;

    if (currentVal !== 'all' && currentVal !== 'alle') {
        const valText = displayVal !== undefined ? displayVal : currentVal;
        head.innerHTML = `<span class="pill-title-active">${title}: <strong>${valText}</strong></span> <button class="pill-reset-btn">Reset</button>`;
        const btn = head.querySelector('.pill-reset-btn');
        if (btn) {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                resetFn();
            });
        }
        list.classList.add('collapsed');
    } else {
        head.innerHTML = title;
        list.classList.remove('collapsed');
    }
};

const Ae = configSidebar;
const re = bomTableBody;
const me = bomCountCounter;
const ke = getVariantColor;
const Be = getSanitasImgUrl;
const X = applyPillUI;

export function createFinishesApp(title, desc, mainImgUrl, baseBodyLabel, baseBodyArtNr, baseBodyImg) {
    return {
        finishes: [
            { id: "chrome", label: "Chrom Standard", artNr: "XY-12345", color: "#e8eaed" }
        ],
        baseBody: {
            label: baseBodyLabel,
            artNr: baseBodyArtNr,
            imgUrl: baseBodyImg
        },
        mainImgUrl: mainImgUrl,
        currentFinishId: "chrome",
        init: function () { this.renderSidebar(); this.updateBOM(); },
        renderSidebar: function () {
            configSidebar.innerHTML = `
                    <div class="sidebar-section">
                        <h2>Produktsystem</h2>
                        <div class="product-selection-card">
                            <img src="${this.mainImgUrl}" class="thumb-img" alt="${title}">
                            <div class="product-info">
                                <h3>${title}</h3>
                                <p>${desc}</p>
                            </div>
                        </div>
                    </div>
                    <div class="sidebar-section">
                        <h2>Systemkonfiguration</h2>
                        <p class="section-desc">Konfigurieren Sie die Eigenschaften des Systems über die verfügbaren Optionen.</p>
                        <div class="finish-selector">
                            <label>Sichtbare Oberfläche</label>
                            <div class="finish-buttons-grid" id="finishOptionsContainer_${title.replace(/\s/g, '')}"></div>
                        </div>
                    </div>
                `;
            const container = document.getElementById(`finishOptionsContainer_${title.replace(/\s/g, '')}`);
            this.finishes.forEach(finish => {
                const btn = document.createElement('button');
                btn.className = `finish-row-btn ${finish.id === this.currentFinishId ? 'active' : ''}`;

                const imgUrl = getSanitasImgUrl(finish.artNr);
                const fallbackColor = finish.color || getVariantColor(finish.label, finish.artNr);

                btn.style.width = '100%';
                btn.style.display = 'flex';
                btn.style.alignItems = 'center';

                btn.innerHTML = `
                        <div class="finish-swatch" style="position: relative; overflow: hidden; background-color: ${fallbackColor}; box-shadow: inset 0 1px 3px rgba(0,0,0,0.15); width: 28px; height: 28px; border-radius: 50%; margin-right: 12px; border: 1px solid rgba(0,0,0,0.2);">
                            ${imgUrl ? `<img src="${imgUrl}" style="position: absolute; width: 100%; height: 100%; object-fit: cover; background: #fff; top: 0; left: 0;" onerror="this.style.display='none';">` : ''}
                        </div>
                        <div style="flex:1; text-align:left;">
                            <span style="display:block; font-weight: 500;">${finish.label}</span>
                            <span class="finish-artnr" style="margin-left: 0;">${finish.artNr}</span>
                        </div>
                    `;
                btn.addEventListener('click', () => {
                    container.querySelector('.finish-row-btn.active')?.classList.remove('active');
                    btn.classList.add('active');
                    this.currentFinishId = finish.id;
                    this.updateBOM();
                });
                container.appendChild(btn);
            });
        },
        updateBOM: function () {
            const finish = this.finishes.find(f => f.id === this.currentFinishId) || this.finishes[0];
            if (!finish) return;
            const finishMenge = finish.menge || 1;
            const baseMenge = this.baseBody.menge || 1;
            bomCountCounter.textContent = `${finishMenge + baseMenge} Artikel benötigt`;
            bomTableBody.innerHTML = `
                    <tr>
                        <td><div class="img-cell"><img src="${this.mainImgUrl}"></div></td>
                        <td><span class="bom-code">${finish.artNr}</span></td>
                        <td><div class="bom-desc">${title}</div><div style="font-size: 0.8rem; color: #9e9e9e; margin-top: 0.25rem;">Oberfläche: ${finish.label}</div></td>
                        
                        <td><strong>${finishMenge}</strong></td>
                    </tr>
                    <tr>
                        <td><div class="img-cell"><img src="${this.baseBody.imgUrl}"></div></td>
                        <td><span class="bom-code">${this.baseBody.artNr}</span></td>
                        <td><div class="bom-desc">${this.baseBody.label}</div><div style="font-size: 0.8rem; color: #9e9e9e; margin-top: 0.25rem;">Zwingendes Einbauteil</div></td>
                        
                        <td><strong>${baseMenge}</strong></td>
                    </tr>
                `;
        },
        copyToClipboard: function () {
            const finish = this.finishes.find(f => f.id === this.currentFinishId) || this.finishes[0];
            if (!finish) return;
            const text = `${finish.artNr}\t${finish.menge || 1}\n${this.baseBody.artNr}\t${this.baseBody.menge || 1}`;
            navigator.clipboard.writeText(text).then(() => alert("SAP Format kopiert:\n\n" + text.replace(/\t/g, "    "))).catch(e => alert("Fehler."));
        }
    };
}

export function createRelationalApp(title, desc, mainImgUrl, config = {}) {
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
        title: title,
        trays: [],
        mainImgUrl: mainImgUrl,
        selectedTray: null,
        showAccessoires: false,
        currentAccessoiresSerie: 'all',
        selectedAccessoires: [],
        showAccessoires: false,
        selectedAccessoires: [],
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

            const isAccessory = ['papierhalter', 'reserverollenhalter', 'klosettbürstenhalter', 'wc-bürste', 'seifenhalter', 'seifenspender', 'glashalter', 'doppelglashalter', 'handtuchhalter', 'handtuchring', 'handtuchhaken', 'badetuchstange', 'hakenleiste', 'drahtseifenhalter', 'duschkorb', 'schwammhalter', 'accessoire'].some(kw => (t.label||'').toLowerCase().includes(kw));
            if (isAccessory && serie.includes(' ')) serie = serie.split(' ')[0];

            return this.normalizeSerie(serie, t.manufacturer);
        },
        extractMontage: function (t) {
            const l = (t.label || '').toLowerCase();
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
            const l = (t.label || '').toLowerCase();
            const s = (t.serie || t.label || '').toLowerCase();
            
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
            const label = (obj.label || obj.name || '').toLowerCase();
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
                return isMixer ? 'unterputz' : 'schallschutz';
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
                    return 'schallschutz';
                }
            }

            return 'common';
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
            this.clearBOM();
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
                    
                    <div class="sidebar-section">
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
            mList.innerHTML = `<button class="pill-btn ${this.currentManufacturer === 'all' ? 'active' : ''}" data-val="all">Alle</button>` + manufacturers.map(m => `
                    <button class="pill-btn ${this.currentManufacturer === m ? 'active' : ''}" data-val="${m}">${m}</button>
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
            const rawSeries = [...new Set(validTraysForSerie.map(t => this.extractSerie(t)))].sort();
            const series = [...new Set(rawSeries.map(s => {
                if (s.startsWith('Cerawall')) return 'Cerawall';
                if (s.startsWith('Cerafloor')) return 'Cerafloor';
                return s;
            }))].sort();
            serList.innerHTML = `<button class="pill-btn ${this.currentSerie === 'all' ? 'active' : ''}" data-val="all">Alle</button>` + series.map(s => `
                    <button class="pill-btn ${this.currentSerie === s ? 'active' : ''}" data-val="${s}">${s}</button>
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
                    
                    varList.innerHTML = `<button class="pill-btn ${this.currentVariant === 'all' ? 'active' : ''}" data-val="all">Alle</button>` + variants.map(v => `
                        <button class="pill-btn ${this.currentVariant === v ? 'active' : ''}" data-val="${v}">${v}</button>
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

                fList.innerHTML = `<button class="pill-btn ${this.currentForm === 'all' ? 'active' : ''}" data-val="all">Alle</button>` + forms.map(f => `
                        <button class="pill-btn ${this.currentForm === f ? 'active' : ''}" data-val="${f}">${f}</button>
                    `).join('');
                applyPillUI(`head_rel_form_${suffix}`, `list_rel_form_${suffix}`, this.currentForm, formLabel, () => {
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
                sList.innerHTML = `<button class="pill-btn ${this.currentSize === 'all' ? 'active' : ''}" data-val="all">Alle</button>` + sizes.map(s => {
                    const btnLabel = config.sizeLabel === 'Breite' ? `bis ${s} cm` : s;
                    return `<button class="pill-btn ${this.currentSize === s ? 'active' : ''}" data-val="${s}">${btnLabel}</button>`;
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
        filterResults: function () {
            const mFilter = this.currentManufacturer || 'all';
            const serieFilter = this.currentSerie || 'all';
            const fFilter = this.currentForm || 'all';
            const sFilter = this.currentSize || 'all';
            const lFilter = document.getElementById(`filterLength_${suffix}`)?.value || '';
            const wFilter = document.getElementById(`filterWidth_${suffix}`)?.value || '';

            const isToilet = this.isToiletApp || (title.toLowerCase().includes('klosett') || title.toLowerCase().includes('wc'));

            const filtered = this.trays.filter(t => {
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

                    if (sFilter !== 'all' && sFilter !== 'alle') {
                        if (t.size !== sFilter) return false;
                    } else if (!isToilet && (lFilter || wFilter)) {
                        // Only run numeric parsing if it's NOT a toilet and looks like "120 x 80"
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
            });

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
                            ${t.imgUrl ? `<img src="${t.imgUrl}">` : '<i class="ri-image-line placeholder-icon"></i>'}
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
            }
        },
        selectTray: function (id) {
            this.selectedTray = this.trays.find(t => t.id === id);

            // Do NOT auto-change currentMontageart when a tray is selected.
            // This would re-filter the results and collapse the list to only matching trays,
            // which is confusing — the user should control the Montageart filter themselves.
            // Only update the pill UI to reflect the current state.
            this.updatePillFilters();

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
                        this.selectedTray.selections[mat.id] = mat.options[0].artNr;
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
            if (this.selectedTray && this.selectedTray.mountingMaterials && this.selectedTray.mountingMaterials.length > 0) {
                hasConfig = true;
            }

            if (!hasConfig) {
                configBlock.style.display = 'none';
                return;
            }

            configBlock.style.display = 'block';

            // --- Technical Compatibility Warning ---
            if (this.currentMontageart === 'wannenträger') {
                const hasCarrier = this.selectedTray.mountingMaterials.some(m => {
                    const firstOpt = m.options?.[0];
                    return firstOpt && this.classifyAccessory(firstOpt) === 'wannenträger';
                });

                if (!hasCarrier) {
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
            }

            const titleLower = title.toLowerCase();
            const isWanne = titleLower.includes('wanne') || titleLower.includes('duschfläche');
            const isRinne = titleLower.includes('rinne');

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

            sortedMaterials.forEach(mat => {
                if (!mat.options || mat.options.length === 0) return;

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
                        this.selectedTray.selections[mat.id] = activeOptions[0].artNr;
                        // Re-render immediately to propagate dependencies (cascading updates)
                        setTimeout(() => { this.renderConfigurator(); this.updateBOM(); }, 0);
                    }
                }

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
            if (!this.selectedTray) return;

            const materials = this.selectedTray.mountingMaterials || [];
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
                    } else if (mName === 'zargen-wannendichtband' || mName === 'dichtband') {
                        priority = 4;
                    } else if (mName === 'montageset' || mName === 'dichtset') {
                        priority = 5;
                    } else if (mName === 'wannenträger system' || mName === 'wannenträger' || mName === 'montagerahmen') {
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
                        } else if (exactMatch(['dichtband', 'wannenband', 'zargen', 'zargen-wannendichtband', 'zargenband'])) {
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
                        // Future Badewanne specific skipPush rules go here
                    }

                    if (!skipPush) {
                        finalBOM.push({
                            artNr: selectedOption.artNr,
                            label: enrichedLabel,
                            typ: selectedOption.type || mat.name || 'Zubehör',
                            menge: calculatedMenge,
                            img: enrichedImg,
                            note: note,
                            priority: priority
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
            dedupedBOM.forEach(item => {
                if (!item.artNr || item.artNr === 'none' || item.menge === 0 || (item.label && item.label.toLowerCase().startsWith('ohne'))) return;
                const row = document.createElement('tr');
                row.innerHTML = `
                        <td><div class="img-cell" ${!item.img ? 'style="background: transparent; border: 1px dashed var(--border);"' : ''}>
                            ${item.img ? `<img src="${item.img}" alt="${item.label}">` : '<i class="ri-settings-3-line" style="font-size:1.2rem;opacity:0.3;"></i>'}
                        </div></td>
                        <td><span class="bom-code">${item.artNr}</span></td>
                        <td>
                            <div class="bom-desc">${item.label}</div>
                            <div style="font-size: 0.8rem; color: #9e9e9e; margin-top: 0.25rem;">${item.note}</div>
                        </td>
                        
                        <td><strong>${item.menge}</strong></td>
                    `;
                bomTableBody.appendChild(row);
                totalCount += item.menge;
            });

            bomCountCounter.textContent = `${totalCount} Artikel benötigt`;
        },
        copyToClipboard: function () {
            if (!this.selectedTray) {
                alert('Bitte wählen Sie zuerst ein Produkt aus.');
                return;
            }

            let textLines = [];
            const bomTableBody = document.getElementById('bomTableBody');

            if (bomTableBody) {
                const rows = bomTableBody.querySelectorAll('tr');
                rows.forEach(row => {
                    const codeSpan = row.querySelector('.bom-code');
                    const qtyStrong = row.querySelector('strong');
                    if (codeSpan && qtyStrong) {
                        const code = codeSpan.textContent.replace(/\t/g, '').trim();
                        const menge = qtyStrong.textContent.replace(/\t/g, '').trim();
                        if (code !== 'none' && code !== '') {
                            textLines.push(`${code}\t${menge}`);
                        }
                    }
                });
            } else {
                alert("Tabelle konnte nicht gefunden werden.");
                return;
            }

            const text = textLines.join('\n');
            navigator.clipboard.writeText(text).then(() => {
                alert("Artikel und Menge kopiert für SAP:\n\n" + text.replace(/\t/g, "    "));
            }).catch(e => alert("Kopieren fehlgeschlagen."));
        }
    };
}

export function createWashbasinApp(title, desc, mainImgUrl, config = {}) {
    const suffix = title.replace(/\s/g, '');

    return {
        trays: [],
        mainImgUrl: mainImgUrl,
        selectedTray: null,
        init: function () {
            this.selectedTray = null;
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
            const label = (obj.label || '').toLowerCase();
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
            // Most "Aufsatzbecken" (countertop bowls) don't have overflows.
            if (lbl.includes('aufsatz') || lbl.includes('schale') || lbl.includes('countertop')) return 'ohne';

            // Most standard furniture/wall basins DO have overflows.
            if (lbl.includes('möbel') || lbl.includes('wandwaschtisch') || lbl.includes('waschtisch')) return 'mit';

            return 'unknown';
        },
        extractAusfuehrung: function (t) {
            const lbl = (t.label || '').toLowerCase();
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
            let cleaned = (t.label || '').toLowerCase();

            // 1. Strip product-type prefixes
            const prefixes = [
                'doppelwaschtisch', 'wandbecken', 'handwaschbecken',
                'aufsatzwaschbecken', 'aufsatzbecken', 'auflegewaschtisch',
                'einbaubecken', 'waschtisch', 'waschbecken'
            ];
            for (const p of prefixes) {
                if (cleaned.startsWith(p)) {
                    cleaned = cleaned.substring(p.length).trim();
                    break;
                }
            }

            // 2. Strip manufacturer name from the front if present
            if (t.manufacturer) {
                const mLower = t.manufacturer.toLowerCase();
                if (cleaned.startsWith(mLower)) {
                    cleaned = cleaned.substring(mLower.length).trim();
                }
            }

            // 3. Extract the series name up to any size, comma, or bracket
            const match = cleaned.match(/^(.*?)(?:\s+\d+\s*[xX]\s*\d+|\s*,|\s*\(|\s+-|\s+\d)/);
            let serie = match && match[1] ? match[1].trim() : cleaned.trim();

            const isAccessory = ['papierhalter', 'reserverollenhalter', 'klosettbürstenhalter', 'wc-bürste', 'seifenhalter', 'seifenspender', 'glashalter', 'doppelglashalter', 'handtuchhalter', 'handtuchring', 'handtuchhaken', 'badetuchstange', 'hakenleiste', 'drahtseifenhalter', 'duschkorb', 'schwammhalter', 'accessoire'].some(kw => (t.label||'').toLowerCase().includes(kw));
            if (isAccessory && serie.includes(' ')) serie = serie.split(' ')[0];

            // 4. Capitalize each word
            serie = serie.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

            return serie || 'Andere';
        },
        extractAbstellflaeche: function (obj) {
            if (obj.overrideAbstell && obj.overrideAbstell !== 'auto') return obj.overrideAbstell;
            const label = (obj.label || '').toLowerCase();
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
                        this.selectedTray.selections[mat.id] = filteredOptions[0].artNr;
                    }
                });
            }

            this.filterResults(); // highlight active
            this.renderConfigurator();
            this.updateBOM();
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
            bomCountCounter.textContent = `${visibleCount} Artikel benötigt`;
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
            navigator.clipboard.writeText(textLines.join('\n')).then(() => alert("Kopiert!"));
        }
    };
}
export function createWaschtischMischerApp(title, desc, mainImgUrl, config = {}) {
    const suffix = title.replace(/\s/g, '');

    return {
        trays: [],
        mainImgUrl: mainImgUrl,
        selectedTray: null,
        init: function () {
            this.selectedTray = null;

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
            this.filterResults(); // initial run
            this.clearBOM();
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
            if (t.serie) return t.serie;
            let lbl = (t.label || '');

            lbl = lbl.split(',')[0].trim();
            lbl = lbl.replace(/\bA\s*\d+/i, '').trim();

            const brand = (t.manufacturer || '').toLowerCase();
            const skipWords = [
                'einlochmischer', 'waschtischmischer', 'waschtischbatterie', 'batterie',
                'mischer', 'armatur', 'wandmischer', 'standmischer', 'm.', 'm', 'waschtisch-',
                'u-mischer', 'aufbau', brand, 'hansgrohe', 'axor', 'laufen', 'alterna', 'gessi', 'kwc',
                'auslauf', 'fest', 'schwenkbar', 'mit', 'ohne', 'ablaufventil'
            ];

            let remainingWords = lbl.split(/\s+/).filter(w => {
                let clean = w.toLowerCase().replace(/[^a-z0-9-]/g, '');
                if (!clean) return false;
                if (skipWords.includes(clean)) return false;
                return true;
            });

            let serie = remainingWords.join(' ');
            serie = serie.replace(/(ComfortZone|CoolStart|EcoSmart|Normalstrahl|Waterfall|WaterfallStream).*/i, '').trim();

            if (title === 'Duschenmischer') {
                return this.normalizeDuschenmischerSerie(serie);
            }

            return serie || 'Andere';
        },
        isAblaufItem: function (t) {
            const tl = (t.label || '').toLowerCase();
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
            const label = (obj.label || '');
            // Look for "A 120 mm" or "Ausladung 140 mm"
            const match = label.match(/(?:A\s|Ausladung\s*)([0-9]{2,3})\s*mm/i);
            if (match) return match[1];
            return 'unknown';
        },
        extractAblauf: function (obj) {
            const label = (obj.label || '').toLowerCase();
            if (label.includes('ohne ablauf')) return 'ohne';
            if (label.includes('ablauf')) return 'mit';
            return 'ohne';
        },
        extractAuslauf: function (obj) {
            const label = (obj.label || '').toLowerCase();
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
            return 'Waschtischmischer';
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
                ? this.normalizeDuschenmischerSerie(value)
                : String(value || '').trim();

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
                
                <div class="sidebar-section results-section">
                    <h2>Suchergebnisse <span id="resultCount_${suffix}" class="badge">0</span></h2>
                    <div id="searchResults_${suffix}" class="finder-list" style="max-height: 400px; overflow-y: auto;"></div>
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
                    this.selectedTray = t;
                    this.filterResults();
                    this.updateBOM();
                });
                container.appendChild(card);
            });

            // Ensure the active configuration refreshes when filters change
            if (this.selectedTray) {
                this.renderConfigurator();
                this.updateBOM();
            }
        },
        selectTray: function (tray) {
            this.selectedTray = JSON.parse(JSON.stringify(tray));
            if (!this.selectedTray.selections) this.selectedTray.selections = {};
            this.selectedTray.selections.variant = this.selectedTray.artNr;

            const l = (this.selectedTray.label || '').toLowerCase();
            const ablaufState = this.extractAblauf(this.selectedTray);
            const isWand = this.extractAusfuehrung(this.selectedTray) === 'Wandmischer';
            const labelLow = (this.selectedTray.label || '').toLowerCase();
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
        },
        renderConfigurator: function () {
            const confContainer = document.getElementById(`trayConfigurator_${suffix}`);
            const inner = document.getElementById(`trayConfiguratorInner_${suffix}`);

            if (!this.selectedTray) {
                confContainer.style.display = 'none';
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
            if (!this.selectedTray) return;

            let bomHtml = '';
            let count = 0;

            const activeTrayArtNr = this.selectedTray.selections.variant || this.selectedTray.artNr;
            const activeTrayLabel = this.selectedTray.mainLabel || this.selectedTray.label;
            const activeImg = this.selectedTray.mainImg || this.selectedTray.imgUrl;

            // Faucet
            let activeTrayMenge = 1;
            if (this.selectedTray.selections.variant && this.selectedTray.selections.variant !== this.selectedTray.artNr) {
                const variant = this.selectedTray.variants.find(v => v.artNr === this.selectedTray.selections.variant);
                if (variant) activeTrayMenge = variant.menge || 1;
            } else {
                activeTrayMenge = this.selectedTray.menge || 1;
            }

            bomHtml += `
                <tr>
                    <td><div class="img-cell"><img src="${activeImg}" onerror="this.src='https://placehold.co/40x40?text=N/A'"></div></td>
                    <td><span class="bom-code">${activeTrayArtNr}</span></td>
                    <td><div class="bom-desc">${activeTrayLabel}</div><div style="font-size:0.8rem;color:#2e7d32;margin-top:0.2rem;">Armatur (Hauptartikel)</div></td>
                    
                    <td><strong>${activeTrayMenge}</strong></td>
                </tr>
            `;
            count += activeTrayMenge;

            // Accessories
            (this.selectedTray.mountingMaterials || []).forEach(mat => {
                const selectedArtNr = this.selectedTray.selections[mat.id];
                if (selectedArtNr === 'none') return;

                const selectedOption = (mat.options || []).find(o => o.artNr === selectedArtNr) || (mat.options && mat.options[0]);

                if (selectedOption && selectedOption.artNr !== 'none') {
                    const optionMenge = selectedOption.menge || 1;
                    bomHtml += `
                        <tr>
                            <td><div class="img-cell"><img src="${selectedOption.imgUrl}" onerror="this.src='https://placehold.co/40x40?text=Pnl'"></div></td>
                            <td><span class="bom-code">${selectedOption.artNr}</span></td>
                            <td><div class="bom-desc">${selectedOption.label}</div><div style="font-size:0.8rem;color:#9e9e9e;margin-top:0.25rem;">${mat.name || 'Zubehör'}</div></td>
                            
                            <td><strong>${optionMenge}</strong></td>
                        </tr>
                    `;
                    count += optionMenge;

                    const nativeTray = this.trays.find(t => t.artNr === selectedOption.artNr);
                    if (nativeTray && nativeTray.mountingMaterials) {
                        nativeTray.mountingMaterials.forEach(subMat => {
                            const subOpt = subMat.options && subMat.options[0];
                            if (subOpt) {
                                bomHtml += `
                                    <tr style="background-color: rgba(59, 130, 246, 0.03);">
                                        <td><div class="img-cell">${(subOpt.imgUrl && !subOpt.label.toLowerCase().includes('einbaukosten') && !subOpt.label.toLowerCase().includes('montage')) ? `<img src="${subOpt.imgUrl}" onerror="this.parentNode.innerHTML='<div style=\\'width:40px;height:40px;background:#e0e7ff;border-radius:4px;display:flex;align-items:center;justify-content:center;color:#4f46e5;\\'>&#9874;</div>'" style="width:40px;height:40px;object-fit:contain;">` : `<div style="width:40px;height:40px;background:#e0e7ff;border-radius:4px;display:flex;align-items:center;justify-content:center;color:#4f46e5;"><i class="ri-tools-fill"></i></div>`}</div></td>
                                        <td><span class="bom-code">${subOpt.artNr}</span></td>
                                        <td><div class="bom-desc">${subOpt.label}</div><div style="font-size:0.8rem;color:#3b82f6;margin-top:0.2rem;">Serviceleistung (für ${mat.name})</div></td>
                                        
                                        <td><strong>${subOpt.menge || 1}</strong></td>
                                    </tr>
                                `;
                                count += (subOpt.menge || 1);
                            }
                        });
                    }
                }
            });

            bomTableBody.innerHTML = bomHtml;
            bomCountCounter.textContent = `${count} Artikel`;
        },
        copyToClipboard: function () {
            if (!this.selectedTray) return;

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

            const textArray = textLines.join('\n');
            navigator.clipboard.writeText(textArray).then(() => {
                alert("Artikel und Menge kopiert für SAP:\n\n" + textArray.replace(/\t/g, "    "));
            }).catch(e => alert("Kopieren fehlgeschlagen."));
        }
    };
}
export function createMixAndMatchApp(title, desc, mainImgUrl) {
    const suffix = 'MixMatch';

    return {
        basinTrays: [],
        faucetTrays: [],
        selectedBasin: null,
        selectedFaucet: null,
        selectedAblauf: null,

        // Addon Toggles
        showMoebel: false,
        showSpiegelschrank: false,
        showAccessoires: false,
        currentAccessoiresSerie: 'all',
        selectedMoebel: null,
        selectedSpiegelschrank: null,
        selectedAccessoires: [],
        selectedSiphon: null, // New: track user choice for Siphon

        // Selection States
        currentBasinType: 'all',
        currentBasinBrand: 'all',
        currentBasinSerie: 'all',
        currentBasinHahnloch: 'all',
        currentBasinUeberlauf: 'all',
        currentBasinAbstell: 'all',
        currentBasinBreite: 'all',

        currentFaucetBrand: 'all',
        currentFaucetType: 'all',
        currentFaucetAuslauf: 'all',
        currentFaucetAblauf: 'all',
        currentFaucetAusladung: 'all',
        currentFaucetSerie: 'all',

        init: function (basins, faucets) {
            this.basinTrays = basins || [];
            this.faucetTrays = (faucets || []).map(f => {
                const fCopy = { ...f };
                const lbl = (fCopy.label || '').toLowerCase();
                if (fCopy.manufacturer === 'Andere' || !fCopy.manufacturer || fCopy.manufacturer === 'Sanitas Troesch') {
                    if (lbl.includes('hansgrohe')) fCopy.manufacturer = 'Hansgrohe';
                    else if (lbl.includes('axor')) fCopy.manufacturer = 'Axor';
                    else if (lbl.includes('laufen')) fCopy.manufacturer = 'Laufen';
                    else if (lbl.includes('alterna')) fCopy.manufacturer = 'Alterna';
                    else if (lbl.includes('gessi')) fCopy.manufacturer = 'Gessi';
                    else if (lbl.includes('kwc')) fCopy.manufacturer = 'KWC';
                    else if (lbl.includes('dornbracht')) fCopy.manufacturer = 'Dornbracht';
                }
                return fCopy;
            });
            this.selectedBasin = null;
            this.selectedFaucet = null;
            this.selectedAblauf = null;

            this.showMoebel = false;
            this.showSpiegelschrank = false;
            this.showAccessoires = false;
            this.selectedMoebel = null;
            this.selectedSpiegelschrank = null;
            this.selectedAccessoires = [];

            this.currentBasinType = 'all';
            this.currentBasinBrand = 'all';
            this.currentBasinSerie = 'all';
            this.currentBasinHahnloch = 'all';
            this.currentBasinUeberlauf = 'all';
            this.currentBasinAbstell = 'all';
            this.currentBasinBreite = 'all';

            this.currentFaucetBrand = 'all';
            this.currentFaucetType = 'all';
            this.currentFaucetAuslauf = 'all';
            this.currentFaucetAblauf = 'all';
            this.currentFaucetAusladung = 'all';
            this.currentFaucetSerie = 'all';

            this.currentSpiegelschrankBrand = 'all';
            this.currentSpiegelschrankSerie = 'all';
            this.currentSpiegelschrankBreite = 'all';
            this.currentSpiegelschrankBand = 'all';
            this.currentSpiegelschrankSteckdose = 'all';
            this.currentSpiegelschrankLichtfarbe = 'all';

            this.basinSearchQuery = '';
            this.faucetSearchQuery = '';

            this.renderFinder();
            this.clearBOM();
        },

        cleanLabel: function (t) {
            let label = (t.label || t.name || '').trim();
            const manufacturer = (t.manufacturer || '').toLowerCase();
            const types = ['spiegelschrank', 'spiegelkabinett', 'miroir', 'mirror'];

            let changed = true;
            while (changed) {
                changed = false;
                const lower = label.toLowerCase();
                if (manufacturer && lower.startsWith(manufacturer)) {
                    label = label.substring(manufacturer.length).trim();
                    changed = true;
                }
                for (const type of types) {
                    if (label.toLowerCase().startsWith(type)) {
                        label = label.substring(type.length).trim();
                        if (['-', ':', '/', ','].includes(label[0])) label = label.substring(1).trim();
                        changed = true;
                        break;
                    }
                }
            }
            return label;
        },

        extractSerie: function (t) {
            if (t.serie) return t.serie;
            let cleaned = (t.label || t.name || '').trim().toLowerCase();
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

            // 2. Strip manufacturer name from the front if present
            if (manufacturer && cleaned.startsWith(manufacturer)) {
                cleaned = cleaned.substring(manufacturer.length).trim();
                if (['-', ':', '/', ','].includes(cleaned[0])) cleaned = cleaned.substring(1).trim();
            }

            // 3. Extract the first part of what remains (usually the series name)
            const match = cleaned.match(/^(.*?)(?:\s+\d+\s*[xX]\s*\d+|\s*,|\s*\(|\s+-|\s+\d)/);
            let serie = match && match[1] ? match[1].trim() : cleaned.trim();

            const isAccessory = ['papierhalter', 'reserverollenhalter', 'klosettbürstenhalter', 'wc-bürste', 'seifenhalter', 'seifenspender', 'glashalter', 'doppelglashalter', 'handtuchhalter', 'handtuchring', 'handtuchhaken', 'badetuchstange', 'hakenleiste', 'drahtseifenhalter', 'duschkorb', 'schwammhalter', 'accessoire'].some(kw => (t.label||'').toLowerCase().includes(kw));
            if (isAccessory && serie.includes(' ')) serie = serie.split(' ')[0];

            // 4. Capitalize each word
            serie = serie.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

            return serie || 'Andere';
        },

        isAblaufItem: function (t) {
            const tl = (t.label || '').toLowerCase();
            const keywords = ['ablauf', 'siebventil', 'schaftventil', 'click', 'clack', 'clic', 'clac', 'ventilstopfen'];
            const isVentil = keywords.some(k => tl.includes(k));
            const isMischer = tl.includes('mischer') || tl.includes('batterie') || tl.includes('armatur');
            return isVentil && !isMischer;
        },

        extractHahnloch: function (obj) {
            const label = (obj.label || '').toLowerCase();
            const desc = (obj.description || '').toLowerCase();
            const text = label + ' ' + desc;
            if (text.includes('ohne armaturenloch') || text.includes('ohne armaturenlöcher') || text.includes('ohne hahnloch')) return 'ohne';
            if (text.includes('3 armaturen') || text.includes('3 hahnlöcher') || text.includes('3-loch') || text.includes('dreiloch')) return '3';
            if (text.includes('2 armaturen') || text.includes('2 hahnlöcher') || text.includes('2-loch')) return '2';
            if (text.includes('1 hahnloch') || text.includes('1-loch') || text.includes('einloch') || text.includes('armaturenloch') || text.includes('hahnloch')) return '1';
            return 'unknown';
        },

        extractUeberlauf: function (obj) {
            const lbl = (obj.label || '').toLowerCase();
            const text = (obj.description || '').toLowerCase() + ' ' + lbl;

            if (obj.overrideUeberlauf) return obj.overrideUeberlauf;

            if (text.includes('ohne überlauf') || text.includes('ohne ueberlauf') ||
                text.includes('ohne ü-') || text.includes('o.ü') || text.includes('o. ue') ||
                text.includes('kein überlauf')) return 'ohne';

            if (text.includes('mit überlauf') || text.includes('mit ueberlauf') ||
                text.includes('mit ü-') || text.includes('m.ü') || text.includes('m. ue') ||
                text.includes('überlauf') || text.includes('ueberlauf')) return 'mit';

            if (text.includes('ohne') &&
                !text.includes('ohne armaturenloch') &&
                !text.includes('ohne armaturenlöcher') &&
                !text.includes('ohne hahnloch') &&
                !text.includes('ohne abstellfläche') &&
                !text.includes('ohne ablauf')) return 'ohne';
            if (text.includes('mit') && !text.includes('mit armaturenloch') && !text.includes('mit hahnloch')) return 'mit';

            if (lbl.includes('aufsatz') || lbl.includes('schale') || lbl.includes('countertop')) return 'ohne';
            if (lbl.includes('möbel') || lbl.includes('wandwaschtisch') || lbl.includes('waschtisch')) return 'mit';

            return 'unknown';
        },

        extractAblauf: function (obj) {
            const label = (obj.label || '').toLowerCase();
            if (label.includes('ohne ablauf')) return 'ohne';
            if (label.includes('ablauf')) return 'mit';
            return 'ohne';
        },

        extractAbstellflaeche: function (obj) {
            if (obj.overrideAbstell && obj.overrideAbstell !== 'auto') return obj.overrideAbstell;
            const label = (obj.label || '').toLowerCase();
            if (label.includes('abstellfläche links') || label.includes('ablage links')) return 'links';
            if (label.includes('abstellfläche rechts') || label.includes('ablage rechts')) return 'rechts';
            if (label.includes('abstellfläche beidseitig') || label.includes('ablage beidseitig')) return 'beidseitig';
            return 'ohne';
        },

        extractAusladung: function (obj) {
            const label = (obj.label || '');
            const match = label.match(/(?:A\s|Ausladung\s*)([0-9]{2,3})\s*mm/i);
            if (match) return match[1];
            return 'unknown';
        },

        extractAuslauf: function (obj) {
            const label = (obj.label || '').toLowerCase();
            if (label.includes('schwenkauslauf') || label.includes('schwenkbar')) return 'schwenkbar';
            if (label.includes('auslauf fest') || label.includes(' fest')) return 'fest';
            // some have "Auslauf" without specifying, assume fixed by default unless mentioned
            return 'fest';
        },

        extractBasinTyp: function (t) {
            const lbl = (t.label || '').toLowerCase();
            if (lbl.includes('doppelwaschtisch')) return 'Doppelwaschtisch';
            if (lbl.includes('aufsatzwaschbecken') || lbl.includes('aufsatzbecken') || lbl.includes('auflegewaschtisch')) return 'Aufsatzwaschtisch';
            if (lbl.includes('wandbecken')) return 'Wandbecken';
            if (lbl.includes('handwaschbecken')) return 'Handwaschbecken';
            if (lbl.includes('einbaubecken')) return 'Einbaubecken';
            return 'Waschtisch';
        },

        extractFaucetAusfuehrung: function (obj) {
            const label = (obj.label || '').toLowerCase();
            const desc = (obj.description || '').toLowerCase();
            const text = label + ' ' + desc;
            if (text.includes('einloch')) return 'Einlochmischer';
            if (text.includes('wand')) return 'Wandmischer'; // e.g. Wand-Waschtischmischer or Wandbatterie
            if (text.includes('stand')) return 'Standmischer';
            if (text.includes('3-loch') || text.includes('drei-loch') || text.includes('dreiloch')) return '3-Loch';
            return 'Waschtischmischer';
        },

        extractBreite: function (obj) {
            const label = (obj.label || obj.name || '');
            // 1. Try to parse "Breite 60 cm" or "Breite 600 mm" or "B 600" from label
            const bMatch = label.match(/(?:Breite|B)[:\s]+([\d,.]+)\s*(cm|mm)?/i);
            if (bMatch) {
                let val = bMatch[1].replace(',', '.');
                let unit = (bMatch[2] || 'mm').toLowerCase();
                if (unit === 'mm' || parseFloat(val) > 250) return (parseFloat(val) / 10).toString(); // mm or large val
                return val;
            }

            // 2. Fallback to size field
            const size = (obj.size || '');
            const match = size.match(/^(\d+(?:[.,]\d+)?)/);
            return match ? match[1].replace(',', '.') : 'unknown';
        },



        renderFinder: function () {
            const sidebar = document.getElementById('configSidebar');
            if (!sidebar) return;

            sidebar.innerHTML = `
                <div class="finder-shelf">
                    <!-- Column 1: Basin Logic -->
                    <div class="finder-column" id="col_basin">
                        <div class="finder-column-header"><h3><i class="ri-mouse-line"></i> Waschtisch</h3></div>
                        <div class="column-search-container">
                            <i class="ri-search-line"></i>
                            <input type="text" id="basin_local_search" placeholder="Art-Nr oder Modell suchen...">
                        </div>
                        
                        <div class="finder-sub-header" id="head_basin_brand">Hersteller</div>
                        <div class="pill-group" id="list_basin_brand"></div>
                        
                        <div class="finder-sub-header" id="head_basin_type">Ausführung</div>
                        <div class="pill-group" id="list_basin_type"></div>
                        
                        <div class="finder-sub-header" id="head_basin_serie_filter">Serie</div>
                        <div class="pill-group" id="list_basin_serie_filter" style="zoom: 0.85;"></div>
                        
                        <div class="finder-sub-header" id="head_basin_breite">Breite</div>
                        <div class="pill-group" id="list_basin_breite" style="zoom: 0.85;"></div>
                        
                        <div class="finder-sub-header" id="head_basin_hahnloch">Armaturenloch</div>
                        <div class="pill-group" id="list_basin_hahnloch"></div>
                        
                        <div class="finder-sub-header" id="head_basin_ueberlauf">Überlauf</div>
                        <div class="pill-group" id="list_basin_ueberlauf"></div>
                        
                        <div class="finder-sub-header" id="head_basin_abstell">Abstellfläche</div>
                        <div class="pill-group" id="list_basin_abstell"></div>
                        
                        <div class="finder-sub-header">Modell auswählen</div>
                        <div class="finder-list" id="list_basin_serie"></div>
                    </div>

                    <!-- Column 2: Faucet Logic -->
                    <div class="finder-column" id="col_faucet">
                        <div class="finder-column-header"><h3><i class="ri-drops-line"></i> Armatur</h3></div>
                        <div class="column-search-container">
                            <i class="ri-search-line"></i>
                            <input type="text" id="faucet_local_search" placeholder="Art-Nr oder Modell suchen...">
                        </div>
                        
                        <div class="finder-sub-header" id="head_faucet_brand">Hersteller</div>
                        <div class="pill-group" id="list_faucet_brand"></div>
                        
                        <div class="finder-sub-header" id="head_faucet_type">Typ</div>
                        <div class="pill-group" id="list_faucet_type"></div>
                        
                        <div class="finder-sub-header" id="head_faucet_serie">Serie</div>
                        <div class="pill-group" id="list_faucet_serie" style="zoom: 0.85;"></div>

                        <div class="finder-sub-header" id="head_faucet_ausl">Ausladung</div>
                        <div class="pill-group" id="list_faucet_ausl" style="zoom: 0.85;"></div>
                        
                        <div class="finder-sub-header" id="head_faucet_auslauf">Auslauf</div>
                        <div class="pill-group" id="list_faucet_auslauf"></div>

                        
                        <div class="finder-sub-header" id="head_faucet_ablauf">Ablaufventil</div>
                        <div class="pill-group" id="list_faucet_ablauf"></div>
                        
                        <div class="finder-sub-header">Modell auswählen</div>
                        <div class="finder-list" id="list_faucet_items"></div>
                    </div>

                    <!-- Column 3: Valve Logic + Addon Toggles -->
                    <div class="finder-column" id="col_valve">
                        <div class="finder-column-header"><h3><i class="ri-settings-3-line"></i> Ablauf</h3></div>
                        <div class="finder-list" id="list_valve_items"></div>

                        <div class="addon-toggles-section" id="addon_toggles_section">
                            <div class="finder-sub-header" style="margin-top: 1.5rem;">Zusatzoptionen</div>
                            <div class="addon-toggle-row" id="toggle_moebel">
                                <span class="addon-toggle-label"><i class="ri-door-line"></i> Möbel</span>
                                <button class="ios-toggle" data-target="moebel" aria-label="Möbel ein/aus"><span class="ios-toggle-knob"></span></button>
                            </div>
                            <div class="addon-toggle-row" id="toggle_spiegelschrank">
                                <span class="addon-toggle-label"><i class="ri-contrast-2-line"></i> Spiegelschrank</span>
                                <button class="ios-toggle" data-target="spiegelschrank" aria-label="Spiegelschrank ein/aus"><span class="ios-toggle-knob"></span></button>
                            </div>
                            <div class="addon-toggle-row" id="toggle_accessoires">
                                <span class="addon-toggle-label"><i class="ri-archive-line"></i> Accessoires</span>
                                <button class="ios-toggle" data-target="accessoires" aria-label="Accessoires ein/aus"><span class="ios-toggle-knob"></span></button>
                            </div>
                        </div>

                        <div id="addon_moebel_panel" class="addon-panel" style="display:none;">
                            <div class="finder-sub-header">Möbel wählen</div>
                            <div class="finder-list" id="list_addon_moebel"></div>
                        </div>
                        <div id="addon_spiegelschrank_panel" class="addon-panel" style="display:none;">
                            <div class="finder-sub-header" id="spiegelschrank_breite_header" style="display:none;">Breite</div>
                            <div class="pill-group" id="list_spiegelschrank_breite" style="margin-bottom: 0.75rem; display:none;"></div>
                            
                            <div class="finder-sub-header" id="spiegelschrank_brand_header">Marke</div>
                            <div class="pill-group" id="list_spiegelschrank_brand" style="margin-bottom: 0.75rem;"></div>
                            
                            <div class="finder-sub-header" id="spiegelschrank_serie_header">Serie</div>
                            <div class="pill-group" id="list_spiegelschrank_serie" style="margin-bottom: 0.75rem;"></div>

                            <div class="finder-sub-header" id="spiegelschrank_band_header" style="display:none;">Band</div>
                            <div class="pill-group" id="list_spiegelschrank_band" style="margin-bottom: 0.75rem; display:none;"></div>

                            <div class="finder-sub-header" id="spiegelschrank_steckdose_header" style="display:none;">Steckdose</div>
                            <div class="pill-group" id="list_spiegelschrank_steckdose" style="margin-bottom: 0.75rem; display:none;"></div>

                            <div class="finder-sub-header" id="spiegelschrank_lichtfarbe_header" style="display:none;">Lichtfarbe</div>
                            <div class="pill-group" id="list_spiegelschrank_lichtfarbe" style="margin-bottom: 0.75rem; display:none;"></div>

                            <div class="finder-sub-header">Modell wählen</div>
                            <div class="finder-list" id="list_addon_spiegelschrank"></div>
                        </div>
                        <div id="addon_accessoires_panel" class="addon-panel" style="display:none;">
                            <div class="finder-sub-header" id="addon_accessoires_serie_header">Serie</div>
                            <div class="pill-group" id="list_addon_accessoires_serie" style="margin-bottom: 0.75rem;"></div>
                            <div class="finder-sub-header">Accessoires wählen</div>
                            <div class="finder-list" id="list_addon_accessoires"></div>
                        </div>
                    </div>

                    <!-- Column 4: Inspector / Preview -->
                    <div class="finder-preview-col" id="col_preview">
                        <!-- Populated by updatePreview() -->
                    </div>
                </div>
            `;

            // Search listeners
            const basinSearch = document.getElementById('basin_local_search');
            if (basinSearch) {
                basinSearch.value = this.basinSearchQuery;
                basinSearch.addEventListener('input', (e) => {
                    this.basinSearchQuery = e.target.value;
                    this.updateBasinTiers();
                });
            }
            const faucetSearch = document.getElementById('faucet_local_search');
            if (faucetSearch) {
                faucetSearch.value = this.faucetSearchQuery;
                faucetSearch.addEventListener('input', (e) => {
                    this.faucetSearchQuery = e.target.value;
                    this.updateFaucetTiers();
                });
            }

            this.updateBasinTiers();
            this.updateFaucetTiers();
            this.updateValveTier();
            this.updateAddonToggles();
            this.updatePreview();
        },

        updateBasinTiers: function () {
            const typeList = document.getElementById('list_basin_type');
            const brandList = document.getElementById('list_basin_brand');
            const serieFilterList = document.getElementById('list_basin_serie_filter');
            const breiteList = document.getElementById('list_basin_breite');
            const hahnlochList = document.getElementById('list_basin_hahnloch');
            const ueberlaufList = document.getElementById('list_basin_ueberlauf');
            const abstellList = document.getElementById('list_basin_abstell');
            const serieList = document.getElementById('list_basin_serie');

            if (!typeList || !brandList || !serieList || !hahnlochList || !ueberlaufList || !abstellList) return;

            // 1. Hersteller (Brand)
            const brands = [...new Set(this.basinTrays.map(t => t.manufacturer || 'Andere'))].sort();
            brandList.innerHTML = `<button class="pill-btn ${this.currentBasinBrand === 'all' ? 'active' : ''}" data-val="all">Alle</button>` + brands.map(b => `
                <button class="pill-btn ${this.currentBasinBrand === b ? 'active' : ''}" data-val="${b}">${b}</button>
            `).join('');
            applyPillUI('head_basin_brand', 'list_basin_brand', this.currentBasinBrand, 'Hersteller', () => {
                this.currentBasinBrand = 'all';
                this.updateBasinTiers();
            });

            let f1 = this.basinTrays;
            if (this.currentBasinBrand !== 'all') f1 = f1.filter(t => (t.manufacturer || 'Andere') === this.currentBasinBrand);

            // 2. Ausführung (Typ)
            const types = [...new Set(f1.map(t => this.extractBasinTyp(t)))].sort();
            typeList.innerHTML = `<button class="pill-btn ${this.currentBasinType === 'all' ? 'active' : ''}" data-val="all">Alle</button>` + types.map(t => `
                <button class="pill-btn ${this.currentBasinType === t ? 'active' : ''}" data-val="${t}">${t}</button>
            `).join('');
            applyPillUI('head_basin_type', 'list_basin_type', this.currentBasinType, 'Ausführung', () => {
                this.currentBasinType = 'all';
                this.updateBasinTiers();
            });

            let f2 = f1;
            if (this.currentBasinType !== 'all') f2 = f2.filter(t => this.extractBasinTyp(t) === this.currentBasinType);

            // 3. Serie
            if (serieFilterList) {
                const series = [...new Set(f2.map(t => this.extractSerie(t)))].sort();
                serieFilterList.innerHTML = `<button class="pill-btn ${this.currentBasinSerie === 'all' ? 'active' : ''}" data-val="all">Alle</button>` +
                    series.map(s => `<button class="pill-btn ${this.currentBasinSerie === s ? 'active' : ''}" data-val="${s}">${s}</button>`).join('');
                applyPillUI('head_basin_serie_filter', 'list_basin_serie_filter', this.currentBasinSerie, 'Serie', () => {
                    this.currentBasinSerie = 'all';
                    this.updateBasinTiers();
                });
            }

            let f3 = f2;
            if (this.currentBasinSerie !== 'all') f3 = f3.filter(t => this.extractSerie(t) === this.currentBasinSerie);

            // 4. Breite
            if (breiteList) {
                const breiten = [...new Set(f3.map(t => this.extractBreite(t)))].filter(b => b !== 'unknown').sort((a, b) => parseFloat(a) - parseFloat(b));
                breiteList.innerHTML = `<button class="pill-btn ${this.currentBasinBreite === 'all' ? 'active' : ''}" data-val="all">Alle</button>` +
                    breiten.map(b => `<button class="pill-btn ${this.currentBasinBreite === b ? 'active' : ''}" data-val="${b}">${b} cm</button>`).join('');
                applyPillUI('head_basin_breite', 'list_basin_breite', this.currentBasinBreite, 'Breite', () => {
                    this.currentBasinBreite = 'all';
                    this.updateBasinTiers();
                });
            }

            let f4 = f3;
            if (this.currentBasinBreite !== 'all') f4 = f4.filter(t => this.extractBreite(t) === this.currentBasinBreite);

            // 5. Hahnloch
            hahnlochList.innerHTML = `
                <button class="pill-btn ${this.currentBasinHahnloch === 'all' ? 'active' : ''}" data-val="all">Alle</button>
                <button class="pill-btn ${this.currentBasinHahnloch === 'ohne' ? 'active' : ''}" data-val="ohne">Ohne</button>
                <button class="pill-btn ${this.currentBasinHahnloch === '1' ? 'active' : ''}" data-val="1">1 Loch</button>
                <button class="pill-btn ${this.currentBasinHahnloch === '2' ? 'active' : ''}" data-val="2">2 Löcher</button>
                <button class="pill-btn ${this.currentBasinHahnloch === '3' ? 'active' : ''}" data-val="3">3 Löcher</button>
            `;
            applyPillUI('head_basin_hahnloch', 'list_basin_hahnloch', this.currentBasinHahnloch, 'Armaturenloch', () => {
                this.currentBasinHahnloch = 'all';
                this.updateBasinTiers();
            });

            let f5 = f4;
            if (this.currentBasinHahnloch !== 'all') f5 = f5.filter(t => this.extractHahnloch(t) === this.currentBasinHahnloch);

            // 6. Überlauf
            ueberlaufList.innerHTML = `
                <button class="pill-btn ${this.currentBasinUeberlauf === 'all' ? 'active' : ''}" data-val="all">Alle</button>
                <button class="pill-btn ${this.currentBasinUeberlauf === 'mit' ? 'active' : ''}" data-val="mit">Mit</button>
                <button class="pill-btn ${this.currentBasinUeberlauf === 'ohne' ? 'active' : ''}" data-val="ohne">Ohne</button>
            `;
            applyPillUI('head_basin_ueberlauf', 'list_basin_ueberlauf', this.currentBasinUeberlauf, 'Überlauf', () => {
                this.currentBasinUeberlauf = 'all';
                this.updateBasinTiers();
            });

            let f6 = f5;
            if (this.currentBasinUeberlauf !== 'all') f6 = f6.filter(t => this.extractUeberlauf(t) === this.currentBasinUeberlauf);

            // 7. Abstellflaeche
            abstellList.innerHTML = `
                <button class="pill-btn ${this.currentBasinAbstell === 'all' ? 'active' : ''}" data-val="all">Alle</button>
                <button class="pill-btn ${this.currentBasinAbstell === 'ohne' ? 'active' : ''}" data-val="ohne">Standard</button>
                <button class="pill-btn ${this.currentBasinAbstell === 'links' ? 'active' : ''}" data-val="links">Links</button>
                <button class="pill-btn ${this.currentBasinAbstell === 'rechts' ? 'active' : ''}" data-val="rechts">Rechts</button>
                <button class="pill-btn ${this.currentBasinAbstell === 'beidseitig' ? 'active' : ''}" data-val="beidseitig">Beidseitig</button>
            `;
            applyPillUI('head_basin_abstell', 'list_basin_abstell', this.currentBasinAbstell, 'Abstellfläche', () => {
                this.currentBasinAbstell = 'all';
                this.updateBasinTiers();
            });

            let f7 = f6;
            if (this.currentBasinAbstell !== 'all') f7 = f7.filter(t => this.extractAbstellflaeche(t) === this.currentBasinAbstell);

            let f8 = f7;
            if (this.basinSearchQuery && this.basinSearchQuery.trim() !== '') {
                const q = this.basinSearchQuery.toLowerCase().trim();
                f8 = f8.filter(t => (t.label || '').toLowerCase().includes(q) || (t.artNr || '').toLowerCase().includes(q));
            }

            // 8. Items list
            serieList.innerHTML = f8.length === 0 ? '<div class="no-results">Keine Waschtische gefunden.</div>' : f8.sort((a, b) => {
                const sA = this.extractSerie(a).toLowerCase();
                const sB = this.extractSerie(b).toLowerCase();
                if (sA !== sB) return sA.localeCompare(sB);
                return (a.size || '').localeCompare(b.size || '');
            }).map(t => {
                const imgHTML = t.imgUrl ? `<img src="${t.imgUrl}" style="width:36px; height:36px; object-fit:contain; background:white; border-radius:4px; border:1px solid rgba(0,0,0,0.1);" onerror="this.style.display='none'">` : '';
                return `
                <div class="finder-item ${this.selectedBasin && this.selectedBasin.id === t.id ? 'active' : ''}" data-id="${t.id}">
                    <div style="display:flex; align-items:center; gap: 0.75rem;">
                        ${imgHTML}
                        <div style="display:flex; flex-direction:column;">
                            <span style="font-weight:500;">${this.extractSerie(t)}</span>
                            <span class="result-meta">${t.size} | ${t.artNr}</span>
                        </div>
                    </div>
                    <i class="ri-check-line finder-item-arrow" style="${this.selectedBasin && this.selectedBasin.id === t.id ? '' : 'display:none;'}"></i>
                </div>
            `}).join('');

            // Bind Clicks
            typeList.querySelectorAll('.pill-btn').forEach(el => {
                el.addEventListener('click', () => {
                    this.currentBasinType = el.dataset.val;
                    this.updateBasinTiers();
                });
            });
            brandList.querySelectorAll('.pill-btn').forEach(el => {
                el.addEventListener('click', () => {
                    this.currentBasinBrand = el.dataset.val;
                    this.updateBasinTiers();
                });
            });
            if (serieFilterList) {
                serieFilterList.querySelectorAll('.pill-btn').forEach(el => {
                    el.addEventListener('click', () => {
                        this.currentBasinSerie = el.dataset.val;
                        this.updateBasinTiers();
                    });
                });
            }
            if (breiteList) {
                breiteList.querySelectorAll('.pill-btn').forEach(el => {
                    el.addEventListener('click', () => {
                        this.currentBasinBreite = el.dataset.val;
                        this.updateBasinTiers();
                    });
                });
            }
            hahnlochList.querySelectorAll('.pill-btn').forEach(el => {
                el.addEventListener('click', () => {
                    this.currentBasinHahnloch = el.dataset.val;
                    this.updateBasinTiers();
                });
            });
            ueberlaufList.querySelectorAll('.pill-btn').forEach(el => {
                el.addEventListener('click', () => {
                    this.currentBasinUeberlauf = el.dataset.val;
                    this.updateBasinTiers();
                });
            });
            abstellList.querySelectorAll('.pill-btn').forEach(el => {
                el.addEventListener('click', () => {
                    this.currentBasinAbstell = el.dataset.val;
                    this.updateBasinTiers();
                });
            });
            serieList.querySelectorAll('.finder-item').forEach(el => {
                el.addEventListener('click', () => {
                    this.selectedBasin = this.basinTrays.find(x => x.id === el.dataset.id);
                    this.selectedFaucet = null;
                    this.updateBasinTiers();
                    this.updateFaucetTiers();
                    this.updateValveTier();
                    this.updatePreview();
                });
            });
        },

        extractFaucetSerie: function (t) {
            if (t.serie) return t.serie;
            let lbl = (t.label || '');

            lbl = lbl.split(',')[0].trim();
            lbl = lbl.replace(/\bA\s*\d+/i, '').trim();

            const brand = (t.manufacturer || '').toLowerCase();
            const skipWords = [
                'einlochmischer', 'waschtischmischer', 'waschtischbatterie', 'batterie',
                'mischer', 'armatur', 'wandmischer', 'standmischer', 'm.', 'm', 'waschtisch-',
                'u-mischer', 'aufbau', brand, 'hansgrohe', 'axor', 'laufen', 'alterna', 'gessi', 'kwc',
                'auslauf', 'fest', 'schwenkbar', 'mit', 'ohne', 'ablaufventil',
                'endmontageset', 'fertigset', 'fertigbauset'
            ];

            let remainingWords = lbl.split(/\s+/).filter(w => {
                let clean = w.toLowerCase().replace(/[^a-z0-9-]/g, '');
                if (!clean) return false;
                if (skipWords.includes(clean)) return false;
                return true;
            });

            let serie = remainingWords.join(' ');

            // Clean common technical suffixes often attached to series names
            serie = serie.replace(/(ComfortZone|CoolStart|EcoSmart|Normalstrahl|Waterfall|WaterfallStream).*/i, '').trim();

            return serie || 'Andere';
        },

        updateFaucetTiers: function () {
            const brandList = document.getElementById('list_faucet_brand');
            const typeList = document.getElementById('list_faucet_type');
            const serieList = document.getElementById('list_faucet_serie');
            const auslList = document.getElementById('list_faucet_ausl');
            const auslaufList = document.getElementById('list_faucet_auslauf');
            const ablaufList = document.getElementById('list_faucet_ablauf');
            const itemList = document.getElementById('list_faucet_items');

            if (!brandList || !typeList || !serieList || !auslList || !itemList || !auslaufList || !ablaufList) return;

            if (!this.selectedBasin) {
                brandList.innerHTML = serieList.innerHTML = itemList.innerHTML = auslaufList.innerHTML = ablaufList.innerHTML = '<div class="finder-empty-state">Bitte Waschtisch wählen</div>';
                return;
            }

            const hLoch = this.extractHahnloch(this.selectedBasin);
            const basinUeber = this.extractUeberlauf(this.selectedBasin);

            // 1. Initial technical filter
            let faucets = this.faucetTrays.filter(t => {
                if (this.isAblaufItem(t)) return false;
                const lbl = (t.label || '').toLowerCase();
                if (lbl.includes('einbaukörper') || lbl.includes('grundkörper')) {
                    if (!lbl.includes('ohne') && !lbl.includes('fertigset') && !lbl.includes('endmontageset') && !lbl.includes('mischer') && !lbl.includes('batterie')) return false;
                }
                if (lbl.includes('einbaukosten')) return false;
                return true;
            });

            // 2. Apply Rule 1, 2, 3, 4
            faucets = faucets.filter(t => {
                const lbl = (t.label || '').toLowerCase();
                const ausf = this.extractFaucetAusfuehrung(t);
                const abl = this.extractAblauf(t);

                // Rules 3 & 4: Hahnloch Compatibility
                if (hLoch === 'ohne') {
                    // Rule 3: Only Wandmischer/Wandbatterie
                    if (ausf !== 'Wandmischer') return false;
                } else {
                    // Rule 4: Only Einlochmischer or Waschtischmischer
                    if (ausf !== 'Einlochmischer' && ausf !== 'Waschtischmischer' && ausf !== 'Standmischer' && ausf !== '3-Loch') return false;
                }

                // Rules 1 & 2: Overflow Compatibility
                if (basinUeber === 'mit') {
                    // Rule 1: Allow ohne, Click Clack, or Siebventil mit Überlauf
                    if (abl === 'ohne') return true;
                    if (lbl.includes('click clack') || lbl.includes('push open') || lbl.includes('siebventil mit überlauf') || lbl.includes('siebventil mit ueberlauf')) return true;
                    // Standard "mit Ablaufventil" usually fits "mit Überlauf" unless explicitly unclosable
                    if (abl === 'mit' && !lbl.includes('unverschliessbar') && !lbl.includes('schaftventil') && !lbl.includes('siebventil ohne überlauf')) return true;
                    return false;
                } else if (basinUeber === 'ohne') {
                    // Rule 2: Allow ohne, Schaftventil, unverschliessbar, or Siebventil ohne Überlauf
                    if (abl === 'ohne') return true;
                    if (lbl.includes('schaftventil') || lbl.includes('unverschliessbar') || lbl.includes('siebventil ohne überlauf') || lbl.includes('siebventil ohne ueberlauf')) return true;
                    return false;
                }

                return true;
            });

            const brands = [...new Set(faucets.map(t => t.manufacturer || 'Andere'))].sort();
            brandList.innerHTML = `<button class="pill-btn ${this.currentFaucetBrand === 'all' ? 'active' : ''}" data-val="all">Alle</button>` + brands.map(b => `
                <button class="pill-btn ${this.currentFaucetBrand === b ? 'active' : ''}" data-val="${b}">${b}</button>
            `).join('');
            applyPillUI('head_faucet_brand', 'list_faucet_brand', this.currentFaucetBrand, 'Hersteller', () => {
                this.currentFaucetBrand = 'all';
                this.updateFaucetTiers();
            });

            let f1 = faucets;
            if (this.currentFaucetBrand !== 'all') f1 = f1.filter(t => (t.manufacturer || 'Andere') === this.currentFaucetBrand);

            // 2. Typ
            const types = [...new Set(f1.map(t => this.extractFaucetAusfuehrung(t)))].sort();
            typeList.innerHTML = `<button class="pill-btn ${this.currentFaucetType === 'all' ? 'active' : ''}" data-val="all">Alle</button>` + types.map(t => `
                <button class="pill-btn ${this.currentFaucetType === t ? 'active' : ''}" data-val="${t}">${t}</button>
            `).join('');
            applyPillUI('head_faucet_type', 'list_faucet_type', this.currentFaucetType, 'Typ', () => {
                this.currentFaucetType = 'all';
                this.updateFaucetTiers();
            });

            let f2 = f1;
            if (this.currentFaucetType !== 'all') f2 = f2.filter(t => this.extractFaucetAusfuehrung(t) === this.currentFaucetType);

            // 3. Serie
            const series = [...new Set(f2.map(t => this.extractFaucetSerie(t)))].filter(s => s !== 'Andere').sort();
            serieList.innerHTML = `<button class="pill-btn ${this.currentFaucetSerie === 'all' ? 'active' : ''}" data-val="all">Alle</button>` + series.map(s => `
                <button class="pill-btn ${this.currentFaucetSerie === s ? 'active' : ''}" data-val="${s}">${s}</button>
            `).join('');
            applyPillUI('head_faucet_serie', 'list_faucet_serie', this.currentFaucetSerie, 'Serie', () => {
                this.currentFaucetSerie = 'all';
                this.updateFaucetTiers();
            });

            let f3 = f2;
            if (this.currentFaucetSerie !== 'all') f3 = f3.filter(t => this.extractFaucetSerie(t) === this.currentFaucetSerie);

            // 4. Ausladung
            const ausladungen = [...new Set(f3.map(t => this.extractAusladung(t)))].filter(a => a !== 'unknown').sort((a, b) => parseInt(a) - parseInt(b));
            auslList.innerHTML = `<button class="pill-btn ${this.currentFaucetAusladung === 'all' ? 'active' : ''}" data-val="all">Alle</button>` + ausladungen.map(a => `
                <button class="pill-btn ${this.currentFaucetAusladung === a ? 'active' : ''}" data-val="${a}">${a} mm</button>
            `).join('');
            applyPillUI('head_faucet_ausl', 'list_faucet_ausl', this.currentFaucetAusladung, 'Ausladung', () => {
                this.currentFaucetAusladung = 'all';
                this.updateFaucetTiers();
            });

            let f4 = f3;
            if (this.currentFaucetAusladung !== 'all') f4 = f4.filter(t => this.extractAusladung(t) === this.currentFaucetAusladung);

            // 5. Auslauf
            const auslaeufe = [...new Set(f4.map(t => this.extractAuslauf(t)))].filter(a => a !== 'unknown').sort();
            auslaufList.innerHTML = `<button class="pill-btn ${this.currentFaucetAuslauf === 'all' ? 'active' : ''}" data-val="all">Alle</button>` + auslaeufe.map(a => `
                <button class="pill-btn ${this.currentFaucetAuslauf === a ? 'active' : ''}" data-val="${a}">${a.charAt(0).toUpperCase() + a.slice(1)}</button>
            `).join('');
            applyPillUI('head_faucet_auslauf', 'list_faucet_auslauf', this.currentFaucetAuslauf, 'Auslauf', () => {
                this.currentFaucetAuslauf = 'all';
                this.updateFaucetTiers();
            });

            let f5 = f4;
            if (this.currentFaucetAuslauf !== 'all') f5 = f5.filter(t => this.extractAuslauf(t) === this.currentFaucetAuslauf);

            // 6. Ablaufventil
            const ablaeufe = [...new Set(f5.map(t => this.extractAblauf(t)))].filter(a => a !== 'unknown').sort();
            ablaufList.innerHTML = `<button class="pill-btn ${this.currentFaucetAblauf === 'all' ? 'active' : ''}" data-val="all">Alle</button>` + ablaeufe.map(a => `
                <button class="pill-btn ${this.currentFaucetAblauf === a ? 'active' : ''}" data-val="${a}">${a.charAt(0).toUpperCase() + a.slice(1)}</button>
            `).join('');
            applyPillUI('head_faucet_ablauf', 'list_faucet_ablauf', this.currentFaucetAblauf, 'Ablaufventil', () => {
                this.currentFaucetAblauf = 'all';
                this.updateFaucetTiers();
            });

            let f6 = f5;
            if (this.currentFaucetAblauf !== 'all') f6 = f6.filter(t => this.extractAblauf(t) === this.currentFaucetAblauf);

            // Bind Events
            [brandList, typeList, serieList, auslList, auslaufList, ablaufList].forEach(list => {
                list.querySelectorAll('.pill-btn').forEach(btn => {
                    btn.addEventListener('click', () => {
                        const target = list.id.replace('list_faucet_', '');
                        const val = btn.dataset.val;
                        if (target === 'brand') this.currentFaucetBrand = val;
                        else if (target === 'type') this.currentFaucetType = val;
                        else if (target === 'serie') this.currentFaucetSerie = val;
                        else if (target === 'ausl') this.currentFaucetAusladung = val;
                        else if (target === 'auslauf') this.currentFaucetAuslauf = val;
                        else if (target === 'ablauf') this.currentFaucetAblauf = val;

                        this.updateFaucetTiers();
                    });
                });
            });

            let f7 = f6;
            if (this.faucetSearchQuery && this.faucetSearchQuery.trim() !== '') {
                const q = this.faucetSearchQuery.toLowerCase().trim();
                f7 = f7.filter(t => (t.label || '').toLowerCase().includes(q) || (t.artNr || '').toLowerCase().includes(q));
            }

            const itemsHTML = f7.length === 0 ? '<div class="no-results">Keine Armaturen gefunden.</div>' : f7.sort((a, b) => {
                const sA = this.extractFaucetSerie(a).toLowerCase();
                const sB = this.extractFaucetSerie(b).toLowerCase();
                if (sA !== sB) return sA.localeCompare(sB);
                return (a.artNr || '').localeCompare(b.artNr || '');
            }).map(t => {
                const ausladung = this.extractAusladung(t);
                const ablauf = this.extractAblauf(t);

                const tags = [];
                if (ausladung !== 'unknown') tags.push(`<span style="background: var(--bg-subtle); padding: 2px 6px; border-radius: 4px; border: 1px solid var(--border);">${ausladung} mm</span>`);
                if (ablauf === 'mit') tags.push(`<span style="background: var(--bg-subtle); padding: 2px 6px; border-radius: 4px; border: 1px solid var(--border);">mit Ablaufventil</span>`);
                if (ablauf === 'ohne') tags.push(`<span style="background: var(--bg-subtle); padding: 2px 6px; border-radius: 4px; border: 1px solid var(--border);">ohne Ablaufventil</span>`);
                const tagsHTML = tags.length > 0 ? `<div style="display:flex; flex-wrap:wrap; gap: 0.3rem; font-size: 0.65rem; color: var(--text-secondary); margin-top: 0.3rem;">${tags.join('')}</div>` : '';

                const imgHTML = t.imgUrl ? `<img src="${t.imgUrl}" style="width:54px; height:54px; object-fit:contain; background:white; border-radius:6px; border:1px solid rgba(0,0,0,0.1); padding: 2px; flex-shrink: 0;" onerror="this.style.display='none'">` : '';
                return `
                <div class="finder-item ${this.selectedFaucet && this.selectedFaucet.id === t.id ? 'active' : ''}" data-id="${t.id}" style="padding: 0.75rem;">
                    <div style="display:flex; align-items:flex-start; gap: 0.75rem;">
                        ${imgHTML}
                        <div style="display:flex; flex-direction:column; gap: 0.15rem; flex: 1;">
                            <span style="font-weight:600; font-size:0.9rem;">${this.extractFaucetSerie(t)}</span>
                            <span style="font-size:0.75rem; color:var(--text-secondary); font-family:monospace;">${t.artNr}</span>
                            ${tagsHTML}
                        </div>
                    </div>
                    <i class="ri-check-line finder-item-arrow" style="${this.selectedFaucet && this.selectedFaucet.id === t.id ? 'align-self: center;' : 'display:none;'}"></i>
                </div>
            `}).join('');

            itemList.innerHTML = itemsHTML;

            itemList.querySelectorAll('.finder-item').forEach(el => {
                el.addEventListener('click', () => {
                    this.selectedFaucet = this.faucetTrays.find(x => x.id === el.dataset.id);
                    this.updateFaucetTiers();
                    this.updateValveTier();
                    this.updatePreview();
                });
            });
        },

        updateValveTier: function () {
            const list = document.getElementById('list_valve_items');
            if (!list) return;

            if (!this.selectedBasin) {
                list.innerHTML = '<div class="finder-empty-state">Bitte Waschtisch wählen</div>';
                return;
            }

            let html = '';

            // 1. Ablaufventil Section
            if (this.selectedFaucet && this.extractAblauf(this.selectedFaucet) === 'mit') {
                html += '<div class="finder-sub-header" style="color:var(--accent);"><i class="ri-checkbox-circle-line"></i> Ablaufventil inklusive</div>';
            } else {
                html += '<div class="finder-sub-header">Ablaufventil</div>';
                const overflow = this.extractUeberlauf(this.selectedBasin);
                const requirements = {
                    mit: [
                        { artNr: "3161 111.501.000", label: "Siebventil mit Überlauf" },
                        { artNr: "3161 127.501.000", label: "Ablaufventil ClickClack" }
                    ],
                    ohne: [
                        { artNr: "3161 113.501.000", label: "Siebventil ohne Überlauf" },
                        { artNr: "3161 121.501.000", label: "Schaftventil" }
                    ]
                };
                const selectedReqs = requirements[overflow] || requirements.mit;
                html += selectedReqs.map(req => `
                    <div class="finder-item valve-item ${this.selectedAblauf === req.artNr ? 'active' : ''}" data-artnr="${req.artNr}">
                        <span>${req.label}</span>
                    </div>
                `).join('');
            }

            // 2. Siphon Section (Only if NO cabinet is selected)
            if (!this.showMoebel || !this.selectedMoebel) {
                html += '<div class="finder-sub-header" style="margin-top:1.5rem;">Siphon</div>';
                const siphons = [
                    { artNr: "3163 105.100.000", label: "Sifon Geberit 40mm Weiss" },
                    { artNr: "3163 115.501.000", label: "Sifon Geberit 40mm Chrom" }
                ];
                // Set default if none selected
                if (!this.selectedSiphon) this.selectedSiphon = siphons[1].artNr;

                html += siphons.map(s => `
                    <div class="finder-item siphon-item ${this.selectedSiphon === s.artNr ? 'active' : ''}" data-artnr="${s.artNr}">
                        <span>${s.label}</span>
                    </div>
                `).join('');
            } else {
                html += '<div class="finder-sub-header" style="margin-top:1.5rem; color:var(--accent);"><i class="ri-checkbox-circle-line"></i> Möbelsiphon inklusive</div>';
            }

            list.innerHTML = html;

            // Event Listeners
            list.querySelectorAll('.valve-item').forEach(el => {
                el.addEventListener('click', () => {
                    this.selectedAblauf = el.dataset.artnr;
                    this.updateValveTier();
                    this.updatePreview();
                });
            });
            list.querySelectorAll('.siphon-item').forEach(el => {
                el.addEventListener('click', () => {
                    this.selectedSiphon = el.dataset.artnr;
                    this.updateValveTier();
                    this.updatePreview();
                });
            });
        },

        updateAddonToggles: function () {
            // Sync toggle active states from app state
            const targets = ['moebel', 'spiegelschrank', 'accessoires'];
            targets.forEach(t => {
                const btn = document.querySelector(`.ios-toggle[data-target="${t}"]`);
                const panel = document.getElementById(`addon_${t}_panel`);
                const isOn = this[`show${t.charAt(0).toUpperCase() + t.slice(1)}`];
                if (btn) btn.classList.toggle('active', isOn);
                if (panel) panel.style.display = isOn ? 'block' : 'none';
            });

            // Bind toggle click events (only once — use a guard flag)
            const section = document.getElementById('addon_toggles_section');
            if (section && !section._bound) {
                section._bound = true;
                section.querySelectorAll('.ios-toggle').forEach(btn => {
                    btn.addEventListener('click', () => {
                        const t = btn.dataset.target;
                        const key = `show${t.charAt(0).toUpperCase() + t.slice(1)}`;
                        this[key] = !this[key];
                        if (!this[key]) {
                            // Clear selection when toggled off
                            if (t === 'moebel') this.selectedMoebel = null;
                            if (t === 'spiegelschrank') this.selectedSpiegelschrank = null;
                            if (t === 'accessoires') {
                                this.selectedAccessoires = [];
                                this.currentAccessoiresSerie = 'all';
                            }
                        }
                        this.updateAddonToggles();
                        this.populateAddonPanel(t);
                        this.updatePreview();
                    });
                });
            }

            // Auto-populate visible panels
            targets.forEach(t => {
                if (this[`show${t.charAt(0).toUpperCase() + t.slice(1)}`]) {
                    this.populateAddonPanel(t);
                }
            });
        },

        populateAddonPanel: function (target) {
            const listEl = document.getElementById(`list_addon_${target}`);
            if (!listEl) return;

            // Build the keyword map for each toggle category
            const keywordMap = {
                moebel: ['möbel', 'meuble', 'unterschrank', 'waschtischunterschrank', 'schrankunterschrank'],
                spiegelschrank: ['spiegelschrank', 'spiegelkabinett', 'miroir', 'mirror', ' mirror '],
                accessoires: ['accessoire', 'seifenhalter', 'seifenspender', 'glashalter', 'doppelglashalter', 'handtuchhalter', 'handtuchring', 'handtuchhaken', 'hakenleiste'],
                accessoires_wc: ['papierhalter', 'reserverollenhalter', 'klosettbürstenhalter', 'wc-bürste'],
                accessoires_dusche: ['drahtseifenhalter', 'duschkorb', 'badetuchstange', 'schwammhalter']
            };

            const keywords = keywordMap[target] || [];

            // 1. Search all app data for matching products (Gather Base Candidates)
            let baseCandidates = [];
            let allSpiegelschrankCandidates = []; // For width fallback logic
            const allApps = window.productApps || {};
            Object.values(allApps).forEach(app => {
                // Relational apps use 'trays', Mix & Match uses 'basinTrays'/'faucets'
                const items = app.trays || app.basinTrays || app.faucets || [];
                items.forEach(t => {
                    const lbl = (t.label || t.name || '').toLowerCase();
                    if (keywords.some(k => lbl.includes(k))) {
                        if (target === 'spiegelschrank') {
                            if (lbl.includes('schallschutz')) return;
                        }
                        if (target === 'accessoires' || target === 'accessoires_wc' || target === 'accessoires_dusche') {
                            if (lbl.includes('spiegelschrank') || lbl.includes('spiegelkabinett')) return;
                        }

                        // Filter to matching rules if basin is selected
                        if (this.selectedBasin) {
                            let matchFound = false;

                            // 1. Check strict "zu [Art-Nr]" rule for Möbel
                            if (target === 'moebel') {
                                const basinId7 = (this.selectedBasin.artNr || '').replace(/[^\d]/g, '').substring(0, 7);

                                // Parse label for "zu 2112 409 / 410 / ..."
                                const zuMatch = t.label.match(/zu\s+([\d\s\/]+)/i);
                                if (zuMatch && basinId7.length === 7) {
                                    const digits = zuMatch[1].match(/\d+/g);
                                    let validIds = [];
                                    let lastPrefix = "";

                                    if (digits) {
                                        digits.forEach(d => {
                                            if (d.length === 7) {
                                                validIds.push(d);
                                                lastPrefix = d.substring(0, 4);
                                            } else if (d.length === 4) {
                                                lastPrefix = d;
                                            } else if (d.length === 3 && lastPrefix) {
                                                validIds.push(lastPrefix + d);
                                            }
                                        });
                                    }

                                    if (validIds.length > 0) {
                                        // Strict check: if "zu" exists, it MUST match exactly
                                        if (!validIds.includes(basinId7)) return;
                                        matchFound = true;
                                    }
                                }
                            }

                            // 1.5 Rule for Spiegelschrank: Match Basin width (Rounded)
                            if (target === 'spiegelschrank') {
                                const basinWStr = this.extractBreite(this.selectedBasin);
                                const cabinetWStr = this.extractBreite(t);

                                if (basinWStr !== 'unknown' && cabinetWStr !== 'unknown') {
                                    const bW = parseFloat(basinWStr);
                                    const cW = parseFloat(cabinetWStr);
                                    
                                    // Save all valid cabinets for potential fallback
                                    allSpiegelschrankCandidates.push({ item: t, width: cW });

                                    // Round both to nearest integer cm (handles 59.5 vs 60 cases)
                                    if (Math.round(bW) !== Math.round(cW)) return;
                                    // If width matches, we consider it a found match (even if series differ)
                                    matchFound = true;
                                } else if (target === 'spiegelschrank' && basinWStr !== 'unknown') {
                                    // Basin has a width, but cabinet doesn't? Skip it to be safe.
                                    return;
                                }
                            }

                            // 2. Fallback to Series match if no specific rule matched
                            if (!matchFound && target !== 'accessoires') {
                                const basinSerie = this.extractSerie(this.selectedBasin).toLowerCase();
                                const tSerie = this.extractSerie(t).toLowerCase();
                                if (!tSerie.includes(basinSerie) && !basinSerie.includes(tSerie)) return;
                            }
                        }
                        baseCandidates.push(t);
                    }
                });
            });


            // 1.8 Fallback logic for Spiegelschrank if NO exact match was found
            let isOffsetMatch = false;
            if (target === 'spiegelschrank' && this.selectedBasin && baseCandidates.length === 0 && allSpiegelschrankCandidates.length > 0) {
                const basinWStr = this.extractBreite(this.selectedBasin);
                if (basinWStr !== 'unknown') {
                    const bW = Math.round(parseFloat(basinWStr));
                    
                    // Find all unique available mirror widths
                    const uniqueWidths = [...new Set(allSpiegelschrankCandidates.map(c => Math.round(c.width)))].sort((a, b) => a - b);
                    
                    // Find closest smaller and closest larger
                    let smallerWidth = -1;
                    let largerWidth = Infinity;
                    
                    for (let w of uniqueWidths) {
                        if (w < bW && w > smallerWidth) smallerWidth = w;
                        if (w > bW && w < largerWidth) largerWidth = w;
                    }
                    
                    // Add all cabinets that match the smaller or larger width (Bypass series filter just like exact match)
                    const fallbackItems = allSpiegelschrankCandidates.filter(c => Math.round(c.width) === smallerWidth || Math.round(c.width) === largerWidth);
                    if (fallbackItems.length > 0) {
                        isOffsetMatch = true;
                        fallbackItems.forEach(c => baseCandidates.push(c.item));
                    }
                }
            }

            // Deduplicate baseCandidates by artNr
            const seenArt = new Set();
            baseCandidates = baseCandidates.filter(c => {
                if (!c.artNr || seenArt.has(c.artNr)) return false;
                seenArt.add(c.artNr); return true;
            });

            let displayCandidates = baseCandidates;

            // 2. Handle Pill Filters for Spiegelschrank
            if (target === 'spiegelschrank') {
                const breiteHeaderEl = document.getElementById('spiegelschrank_breite_header');
                const breiteListEl = document.getElementById('list_spiegelschrank_breite');
                const brandListEl = document.getElementById('list_spiegelschrank_brand');
                const serieListEl = document.getElementById('list_spiegelschrank_serie');

                if (breiteHeaderEl && breiteListEl) {
                    if (isOffsetMatch) {
                        breiteHeaderEl.style.display = 'block';
                        breiteListEl.style.display = 'flex';
                        
                        // Extract precise raw widths from the fallback candidates
                        const widths = [...new Set(baseCandidates.map(c => {
                            const wStr = this.extractBreite(c);
                            return wStr !== 'unknown' ? parseFloat(wStr) : null;
                        }).filter(w => w !== null))].sort((a, b) => a - b);
                        
                        breiteListEl.innerHTML = `<button class="pill-btn ${this.currentSpiegelschrankBreite === 'all' ? 'active' : ''}" data-val="all">Alle</button>` +
                            widths.map(w => `<button class="pill-btn ${this.currentSpiegelschrankBreite === w.toString() ? 'active' : ''}" data-val="${w}">${w} cm</button>`).join('');
                            
                        breiteListEl.querySelectorAll('.pill-btn').forEach(btn => {
                            btn.addEventListener('click', () => {
                                this.currentSpiegelschrankBreite = btn.dataset.val;
                                this.currentSpiegelschrankBrand = 'all';
                                this.currentSpiegelschrankSerie = 'all';
                                this.populateAddonPanel('spiegelschrank');
                            });
                        });
                    } else {
                        breiteHeaderEl.style.display = 'none';
                        breiteListEl.style.display = 'none';
                        this.currentSpiegelschrankBreite = 'all'; // Reset if not in offset mode
                    }
                }

                if (brandListEl && serieListEl) {
                    // Gather brands from base candidates
                    const brands = [...new Set(baseCandidates.map(c => c.manufacturer).filter(Boolean))].sort();
                    brandListEl.innerHTML = `<button class="pill-btn ${this.currentSpiegelschrankBrand === 'all' ? 'active' : ''}" data-val="all">Alle</button>` +
                        brands.map(b => `<button class="pill-btn ${this.currentSpiegelschrankBrand === b ? 'active' : ''}" data-val="${b}">${b}</button>`).join('');

                    brandListEl.querySelectorAll('.pill-btn').forEach(btn => {
                        btn.addEventListener('click', () => {
                            this.currentSpiegelschrankBrand = btn.dataset.val;
                            this.currentSpiegelschrankSerie = 'all';
                            this.populateAddonPanel('spiegelschrank');
                        });
                    });

                    // Gather series from filtered brands
                    let fSeries = baseCandidates;
                    if (this.currentSpiegelschrankBrand !== 'all') fSeries = fSeries.filter(c => c.manufacturer === this.currentSpiegelschrankBrand);
                    const series = [...new Set(fSeries.map(c => this.extractSerie(c)))].filter(s => s !== 'Andere').sort();

                    serieListEl.innerHTML = `<button class="pill-btn ${this.currentSpiegelschrankSerie === 'all' ? 'active' : ''}" data-val="all">Alle</button>` +
                        series.map(s => `<button class="pill-btn ${this.currentSpiegelschrankSerie === s ? 'active' : ''}" data-val="${s}">${s}</button>`).join('');

                    serieListEl.querySelectorAll('.pill-btn').forEach(btn => {
                        btn.addEventListener('click', () => {
                            this.currentSpiegelschrankSerie = btn.dataset.val;
                            this.populateAddonPanel('spiegelschrank');
                        });
                    });

                    // APPLY UI RESET BUTTONS
                    const resetSpiegelschrankFn = () => {
                        this.currentSpiegelschrankBreite = 'all';
                        this.currentSpiegelschrankBrand = 'all';
                        this.currentSpiegelschrankSerie = 'all';
                        this.currentSpiegelschrankBand = 'all';
                        this.currentSpiegelschrankSteckdose = 'all';
                        this.currentSpiegelschrankLichtfarbe = 'all';
                        this.populateAddonPanel('spiegelschrank');
                    };

                    if (isOffsetMatch) {
                        applyPillUI('spiegelschrank_breite_header', 'list_spiegelschrank_breite', this.currentSpiegelschrankBreite, 'Breite', resetSpiegelschrankFn, this.currentSpiegelschrankBreite !== 'all' ? this.currentSpiegelschrankBreite + ' cm' : 'all');
                    }
                    applyPillUI('spiegelschrank_brand_header', 'list_spiegelschrank_brand', this.currentSpiegelschrankBrand, 'Marke', resetSpiegelschrankFn);
                    applyPillUI('spiegelschrank_serie_header', 'list_spiegelschrank_serie', this.currentSpiegelschrankSerie, 'Serie', resetSpiegelschrankFn);

                    // Final display filtering
                    if (this.currentSpiegelschrankBreite !== 'all') {
                        displayCandidates = displayCandidates.filter(c => {
                            const wStr = this.extractBreite(c);
                            return wStr !== 'unknown' && parseFloat(wStr).toString() === this.currentSpiegelschrankBreite;
                        });
                    }
                    if (this.currentSpiegelschrankBrand !== 'all') displayCandidates = displayCandidates.filter(c => c.manufacturer === this.currentSpiegelschrankBrand);
                    if (this.currentSpiegelschrankSerie !== 'all') displayCandidates = displayCandidates.filter(c => this.extractSerie(c) === this.currentSpiegelschrankSerie);

                    // NEW FILTERS: BAND, STECKDOSE, LICHTFARBE
                    const getProp = (c, type) => {
                        const l = (c.label || '').toLowerCase();
                        if (type === 'band') {
                            if (l.includes('band links')) return 'links';
                            if (l.includes('band rechts')) return 'rechts';
                            if (l.includes('wechselbar') || l.includes('beides')) return 'beides';
                            return null;
                        }
                        if (type === 'steckdose') {
                            if (!l.includes('steckdose')) return null;
                            if (l.includes('steckdose links')) return 'links';
                            if (l.includes('steckdose rechts')) return 'rechts';
                            if (l.includes('steckdose mitte') || l.includes('steckdose in der mitte')) return 'mitte';
                            return 'vorhanden';
                        }
                        if (type === 'lichtfarbe') {
                            if (l.includes('3000 k') || l.includes('3000k')) return '3000K';
                            if (l.includes('4000 k') || l.includes('4000k')) return '4000K';
                            if (l.includes('stufenlos')) return 'Stufenlos wechselbar';
                            return null;
                        }
                        return null;
                    };

                    const renderFilter = (type, currentVal, headerId, listId, titleLabel) => {
                        const header = document.getElementById(headerId);
                        const list = document.getElementById(listId);
                        if (!header || !list) return;

                        // Only show filter if there are actually options in the current displayCandidates
                        const options = [...new Set(displayCandidates.map(c => getProp(c, type)).filter(Boolean))].sort();
                        if (options.length === 0) {
                            header.style.display = 'none';
                            list.style.display = 'none';
                            return;
                        }
                        header.style.display = 'block';
                        list.style.display = 'flex';

                        list.innerHTML = `<button class="pill-btn ${currentVal === 'all' ? 'active' : ''}" data-val="all">Alle</button>` +
                            options.map(o => `<button class="pill-btn ${currentVal === o ? 'active' : ''}" data-val="${o}">${o}</button>`).join('');
                        
                        list.querySelectorAll('.pill-btn').forEach(btn => {
                            btn.addEventListener('click', () => {
                                if (type === 'band') this.currentSpiegelschrankBand = btn.dataset.val;
                                if (type === 'steckdose') this.currentSpiegelschrankSteckdose = btn.dataset.val;
                                if (type === 'lichtfarbe') this.currentSpiegelschrankLichtfarbe = btn.dataset.val;
                                this.populateAddonPanel('spiegelschrank');
                            });
                        });
                        
                        applyPillUI(headerId, listId, currentVal, titleLabel, resetSpiegelschrankFn);
                    };

                    renderFilter('band', this.currentSpiegelschrankBand, 'spiegelschrank_band_header', 'list_spiegelschrank_band', 'Band');
                    renderFilter('steckdose', this.currentSpiegelschrankSteckdose, 'spiegelschrank_steckdose_header', 'list_spiegelschrank_steckdose', 'Steckdose');
                    renderFilter('lichtfarbe', this.currentSpiegelschrankLichtfarbe, 'spiegelschrank_lichtfarbe_header', 'list_spiegelschrank_lichtfarbe', 'Lichtfarbe');

                    if (this.currentSpiegelschrankBand !== 'all') displayCandidates = displayCandidates.filter(c => getProp(c, 'band') === this.currentSpiegelschrankBand);
                    if (this.currentSpiegelschrankSteckdose !== 'all') displayCandidates = displayCandidates.filter(c => getProp(c, 'steckdose') === this.currentSpiegelschrankSteckdose);
                    if (this.currentSpiegelschrankLichtfarbe !== 'all') displayCandidates = displayCandidates.filter(c => getProp(c, 'lichtfarbe') === this.currentSpiegelschrankLichtfarbe);
                }
            }

            if (displayCandidates.length === 0) {
                const serieInfo = this.selectedBasin ? ` für "${this.extractSerie(this.selectedBasin)}"` : '';
                listEl.innerHTML = `<div class="finder-empty-state" style="font-size:0.8rem;">Keine passenden Produkte${serieInfo} gefunden.</div>`;
                return;
            }

            const isMulti = target === 'accessoires';
            if (target === 'accessoires') {
                const serieListEl = document.getElementById('list_addon_accessoires_serie');
                if (serieListEl) {
                    const series = [...new Set(displayCandidates.map(c => this.extractSerie(c)))].filter(Boolean).sort();
                    serieListEl.innerHTML = `<button class="pill-btn ${this.currentAccessoiresSerie === 'all' ? 'active' : ''}" data-val="all">Alle</button>` +
                        series.map(s => `<button class="pill-btn ${this.currentAccessoiresSerie === s ? 'active' : ''}" data-val="${s}">${s}</button>`).join('');
                    
                    serieListEl.querySelectorAll('.pill-btn').forEach(btn => {
                        btn.addEventListener('click', () => {
                            this.currentAccessoiresSerie = btn.dataset.val;
                            this.populateAddonPanel(target);
                        });
                    });
                }
                
                if (this.currentAccessoiresSerie !== 'all') {
                    displayCandidates = displayCandidates.filter(c => this.extractSerie(c) === this.currentAccessoiresSerie);
                }
            }
            
            listEl.innerHTML = displayCandidates.map(c => {
                const isSelected = isMulti
                    ? this.selectedAccessoires.includes(c.artNr)
                    : (target === 'moebel' ? this.selectedMoebel === c.artNr : this.selectedSpiegelschrank === c.artNr);
                return `
                    <div class="finder-item ${isSelected ? 'active' : ''}" data-artnr="${c.artNr}" data-target="${target}" title="${c.artNr}">
                        <div style="display:flex; align-items:center; gap:0.5rem; overflow:hidden;">
                            ${(c.imgUrl || getSanitasImgUrl(c.artNr)) ? `<img src="${c.imgUrl || getSanitasImgUrl(c.artNr)}" style="width:32px; height:32px; object-fit:contain; background:#fff; border-radius:4px; padding:2px; flex-shrink:0;" onerror="this.outerHTML='<div style=&quot;width:32px; height:32px; display:flex; align-items:center; justify-content:center; background:var(--bg-surface); border-radius:4px; flex-shrink:0;&quot;><i class=&quot;ri-image-line placeholder-icon&quot;></i></div>'">` : `<div style="width:32px; height:32px; display:flex; align-items:center; justify-content:center; background:var(--bg-surface); border-radius:4px; flex-shrink:0;"><i class="ri-image-line placeholder-icon"></i></div>`}
                            <div style="min-width:0; overflow:hidden;">
                                <div style="font-size:0.8rem; font-weight:500; line-height:1.3; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; text-overflow:ellipsis;">${this.cleanLabel(c)}</div>
                                <div style="font-size:0.7rem; color:var(--text-secondary); font-family:monospace; margin-top:2px;">${c.artNr}</div>
                            </div>
                        </div>
                        ${isSelected ? '<i class="ri-check-line" style="margin-left:auto; color:var(--accent); flex-shrink:0;"></i>' : ''}
                    </div>`;
            }).join('');

            listEl.querySelectorAll('.finder-item').forEach(el => {
                el.addEventListener('click', () => {
                    const artNr = el.dataset.artnr;
                    const t = el.dataset.target;
                    if (t === 'accessoires') {
                        const idx = this.selectedAccessoires.indexOf(artNr);
                        if (idx > -1) this.selectedAccessoires.splice(idx, 1);
                        else this.selectedAccessoires.push(artNr);
                    } else if (t === 'moebel') {
                        this.selectedMoebel = this.selectedMoebel === artNr ? null : artNr;
                    } else {
                        this.selectedSpiegelschrank = this.selectedSpiegelschrank === artNr ? null : artNr;
                    }
                    this.populateAddonPanel(t);
                    this.updatePreview();
                });
            });
        },

        updatePreview: function () {
            const container = document.getElementById('col_preview');
            if (!container) return;

            if (!this.selectedBasin) {
                container.innerHTML = `
                    <div class="finder-empty-state">
                        <i class="ri-find-replace-line"></i>
                        <h2>Konfiguration starten</h2>
                        <p>Wählen Sie links Ihre Produkte aus, um eine Vorschau zu generieren.</p>
                    </div>
                `;
                return;
            }

            const html = `
                <div class="finder-preview-card slide-in" style="width: 100%; margin: 0;">
                    <div class="finder-preview-header" style="margin-bottom: 1.5rem;">
                        <img src="${this.selectedBasin.imgUrl}" class="preview-thumbnail">
                        <div class="preview-header-info">
                            <h2 style="margin: 0 0 4px 0; font-size: 1.1rem; font-weight: 700;">${this.selectedBasin.label}</h2>
                            <p style="color: var(--text-secondary); font-size: 0.8rem; margin-bottom: 10px;">Art-Nr: ${this.selectedBasin.artNr}</p>
                            <div style="display: flex; gap: 6px;">
                                <span class="mini-badge blue">${this.extractUeberlauf(this.selectedBasin) === 'mit' ? 'Mit' : 'Ohne'} Überlauf</span>
                                <span class="mini-badge gray" style="background: rgba(255,255,255,0.05);">${this.extractHahnloch(this.selectedBasin)} Loch</span>
                            </div>
                        </div>
                    </div>

                        <div class="preview-details">
                        <div class="preview-bom-list" style="border-top: 1px solid var(--border); padding-top: 1.25rem;">
                            <h3 style="font-size: 0.75rem; margin-bottom: 0.75rem; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.5px; font-weight: 700;">Zusammenfassung</h3>
                            <div style="background: rgba(255,255,255,0.02); border-radius: 12px; padding: 0.75rem 1rem; border: 1px solid rgba(255,255,255,0.05); display: grid; grid-template-columns: 24px 1fr auto; gap: 0.4rem 0.75rem; align-items: start;">
                                ${this.getBOMPreviewItems().map(item => {
                if (item.isSpacer) return '<div style="grid-column: 1 / -1; margin: 0.3rem 0; border-top: 1px dashed rgba(255,255,255,0.1);"></div>';
                return `
                                        <div style="color: var(--text-secondary); font-size: 0.7rem; padding-top: 2px;">${item.qty}x</div>
                                        <div style="font-weight: 500; color: var(--text-primary); line-height: 1.35; font-size: 0.76rem; max-width: 380px;">${item.label}</div>
                                        <div style="font-family: monospace; color: var(--accent); font-weight: 700; font-size: 0.76rem; white-space: nowrap; text-align: right;">${item.artNr}</div>
                                    `;
            }).join('')}
                            </div>
                        </div>
                    </div>
                </div>
            `;
            container.innerHTML = html;
        },

        getBOMPreviewItems: function () {
            if (!this.selectedBasin) return [];
            const hLochStatus = this.extractHahnloch(this.selectedBasin);
            const isDoppel = (this.selectedBasin.label || '').toLowerCase().includes('doppel');

            const label = (this.selectedFaucet?.label || '').toLowerCase();
            const isSelectedWandModel = label.includes('wandmischer') || label.includes('wandbatterie');

            // Quantity rules:
            // - Doppelwaschtisch        → 2 faucets
            // - Single basin, 2 Löcher  → 2 faucets
            // - Single basin, 3 Löcher  → 1 faucet
            // - Single basin, 1 Loch    → 1 faucet
            let faucetQty = (isDoppel || hLochStatus === '2') ? 2 : 1;
            // Special rule: If no holes, we only have a faucet if it's a wall-mounted one
            if (hLochStatus === 'ohne' && !isSelectedWandModel) faucetQty = 0;
            const valveQty = isDoppel ? 2 : 1;

            const items = [];
            const faucetItems = [];

            // 1. Process Faucet (or Wandmischer) first for positioning logic
            if (this.selectedFaucet) {
                const label = (this.selectedFaucet.label || '').toLowerCase();
                const desc = (this.selectedFaucet.description || '').toLowerCase();
                const fullText = label + ' ' + desc;
                const isWandModel = label.includes('wandmischer') || label.includes('wandbatterie');

                // Add main faucet
                faucetItems.push({ qty: faucetQty, label: this.selectedFaucet.label, artNr: this.selectedFaucet.artNr });

                if (isWandModel) {
                    // Wandmischer Logic: No Einbaukosten

                    // KWC Specific Logic
                    const kwcMapping = {
                        '6113 266.501.000': ['6118 132.000.000', '6118 137.000.000'],
                        '6113 269.501.000': ['6118 132.000.000', '6118 137.000.000'],
                        '6113 268.501.000': ['6118 132.000.000', '6118 137.000.000'],
                        '6113 267.501.000': ['6118 132.000.000', '6118 137.000.000'],
                        '6111 864.501.000': ['6118 138.000.000', '6118 137.000.000'],
                        '6111 861.501.000': ['6118 138.000.000', '6118 137.000.000'],
                        '6111 863.501.000': ['6118 138.000.000', '6118 137.000.000'],
                        '6111 862.501.000': ['6118 138.000.000', '6118 137.000.000'],
                        '6111 261.501.000': ['6118 138.000.000', '6118 137.000.000'],
                        '6111 262.501.000': ['6118 138.000.000', '6118 137.000.000'],
                        '6113 661.502.000': ['6118 138.000.000', '6118 137.000.000'],
                        '6113 662.502.000': ['6118 138.000.000', '6118 137.000.000'],
                        '6113 972.501.000': ['6118 141.000.000', '6118 137.000.000'],
                        '6113 970.501.000': ['6118 142.000.000', '6118 137.000.000'],
                        '6111 142.501.000': ['6118 132.000.000', '6118 137.000.000'],
                        '6114 672.502.000': ['6118 135.000.000', '6118 137.000.000'],
                        '6114 671.502.000': ['6118 135.000.000', '6118 137.000.000']
                    };

                    const currentArtNr = this.selectedFaucet.artNr;
                    if (kwcMapping[currentArtNr]) {
                        kwcMapping[currentArtNr].forEach(accArtNr => {
                            const acc = this.faucetTrays.find(t => t.artNr === accArtNr);
                            if (acc) {
                                faucetItems.push({ qty: faucetQty, label: acc.label, artNr: acc.artNr });
                            } else {
                                // Fallback labels if not found in trays
                                if (accArtNr.includes('137')) faucetItems.push({ qty: faucetQty, label: 'KWC Befestigungsset zu KWC BLUEBOX', artNr: accArtNr });
                                else faucetItems.push({ qty: faucetQty, label: 'KWC Grundkörper zu KWC BLUEBOX', artNr: accArtNr });
                            }
                        });
                    }

                    // Hansgrohe Specific Logic
                    const isHG = (this.selectedFaucet.manufacturer || '').toLowerCase().includes('hansgrohe');
                    const hgWandModels = [
                        '6417 462.501.000', '6417 460.501.000', '6416 962.501.000', '6417 260.501.000',
                        '6416 659.501.000', '6417 567.501.000', '6417 568.501.000', '6416 660.501.000',
                        '6416 961.501.000', '6417 527.501.000'
                    ];
                    if (isHG && hgWandModels.includes(currentArtNr)) {
                        const accArtNr = '6418 132.000.000';
                        const acc = this.faucetTrays.find(t => t.artNr === accArtNr);
                        faucetItems.push({
                            qty: faucetQty,
                            label: acc ? acc.label : 'Einbaukörper Hansgrohe ½"',
                            artNr: accArtNr
                        });
                    }

                    if (fullText.includes('ad 153 mm')) {
                        // AP: Add 2x Abstellverschraubung per faucet
                        faucetItems.push({ qty: 2 * faucetQty, label: 'Abstellverschraubung Laufen Verchromt ½" x ½"', artNr: '6521 103.501.000' });
                    } else if (fullText.includes('endmontageset')) {
                        // UP: Add its existing mounting materials (Grundkörper etc.)
                        if (this.selectedFaucet.mountingMaterials) {
                            this.selectedFaucet.mountingMaterials.forEach(mat => {
                                if (mat.options && mat.options.length > 0) {
                                    faucetItems.push({ qty: faucetQty, label: mat.options[0].label, artNr: mat.options[0].artNr });
                                }
                            });
                        }
                    }
                } else {
                    // Standard Faucet Logic: Add Einbaukosten
                    let hasEinbau = false;
                    if (this.selectedFaucet.mountingMaterials) {
                        this.selectedFaucet.mountingMaterials.forEach(mat => {
                            if (mat.name && mat.name.toLowerCase().includes('einbaukosten') && mat.options && mat.options.length > 0) {
                                faucetItems.push({ qty: faucetQty, label: mat.options[0].label, artNr: mat.options[0].artNr });
                                hasEinbau = true;
                            }
                        });
                    }

                    // Dynamic fallback if not present in data
                    if (!hasEinbau && faucetQty > 0) {
                        const ablauf = this.extractAblauf(this.selectedFaucet);
                        const isMehrloch = label.includes('dreiloch') || label.includes('zweiloch');

                        if (isMehrloch) {
                            faucetItems.push({ qty: faucetQty, label: 'Einbaukosten, Zwei- und Dreilocharmatur, Nettopreis', artNr: '6000 015.000.000' });
                        } else if (ablauf === 'mit') {
                            faucetItems.push({ qty: faucetQty, label: 'Einbaukosten, Einlocharmatur mit Ablaufventil, Zugventil, Nettopreis', artNr: '6000 011.000.000' });
                        } else {
                            faucetItems.push({ qty: faucetQty, label: 'Einbaukosten, Einlocharmatur ohne Exzenterventil, Nettopreis', artNr: '6000 013.000.000' });
                        }
                    }
                }
            }

            // 2. Assemble the final item list in the correct order
            if (isSelectedWandModel) {
                // Wandmischer case
                const label = (this.selectedFaucet?.label || '').toLowerCase();
                const includesAblauf = (label.includes('ablauf') && !label.includes('ohne ablauf')) || this.selectedAblauf;

                if (includesAblauf) {
                    // Core order: Wandmischer items -> G1 -> Waschtisch -> Einbaukosten
                    const cleanFaucetItems = faucetItems.filter(it => !it.label.toLowerCase().includes('einbaukosten'));
                    const einbauItems = faucetItems.filter(it => it.label.toLowerCase().includes('einbaukosten'));

                    items.push(...cleanFaucetItems);
                    items.push({ qty: 1, label: 'Gürtelset', artNr: 'G1' });
                    items.push({ qty: 1, label: this.selectedBasin.label, artNr: this.selectedBasin.artNr });

                    // Standalone valve article if selected
                    if (this.selectedAblauf) {
                        const valve = this.faucetTrays.find(t => t.artNr === this.selectedAblauf);
                        if (valve) items.push({ qty: valveQty, label: valve.label, artNr: valve.artNr });
                    }

                    // Einbaukosten always at the bottom of the core set
                    if (einbauItems.length > 0) {
                        items.push(...einbauItems);
                    } else {
                        items.push({ qty: faucetQty, label: 'Einbaukosten, Ablaufventil einzeln, Wipp- und Siebventil, Nettopreis', artNr: '6000 017.000.000' });
                    }
                } else {
                    items.push(...faucetItems);
                    items.push({ qty: 1, label: 'Gürtelset', artNr: 'G1' });
                    items.push({ qty: 1, label: this.selectedBasin.label, artNr: this.selectedBasin.artNr });
                }
            } else {
                // Standard case: G1 -> Basin -> Faucet items
                items.push({ qty: 1, label: 'Gürtelset', artNr: 'G1' });
                items.push({ qty: 1, label: this.selectedBasin.label, artNr: this.selectedBasin.artNr });
                items.push(...faucetItems);
            }

            // 2. Add Ablaufventil (Only for Standard Deck-mounted case, Wandmischer is handled above)
            if (!isSelectedWandModel && this.selectedAblauf) {
                const valve = this.faucetTrays.find(t => t.artNr === this.selectedAblauf);
                if (valve) {
                    items.push({ qty: valveQty, label: valve.label, artNr: valve.artNr });

                    let hasEinbau = false;
                    if (valve.mountingMaterials) {
                        valve.mountingMaterials.forEach(mat => {
                            if (mat.name && mat.name.toLowerCase().includes('einbaukosten') && mat.options && mat.options.length > 0) {
                                items.push({ qty: valveQty, label: mat.options[0].label, artNr: mat.options[0].artNr });
                                hasEinbau = true;
                            }
                        });
                    }

                    // Dynamic fallback for standalone valve installation
                    if (!hasEinbau) {
                        items.push({ qty: valveQty, label: 'Einbaukosten, Ablaufventil einzeln, Wipp- und Siebventil, Nettopreis', artNr: '6000 017.000.000' });
                    }
                }
            }

            // 3. Spacer for SAP (Breaks the G1 bundle)
            items.push({ isSpacer: true });

            // 4. Mounting screws and Basin isolation (Dübelschrauben etc.)
            if (this.selectedBasin.mountingMaterials && this.selectedBasin.mountingMaterials.length > 0) {
                this.selectedBasin.mountingMaterials.forEach(mat => {
                    if (mat.options && mat.options.length > 0) {
                        const opt = mat.options[0];
                        items.push({ qty: opt.menge || 1, label: opt.label, artNr: opt.artNr });
                    }
                });
            }

            // 4. Inject Möbel and dependent logic (Cabinet, Cabinet Isolation, Siphon, Regulierventil)
            const hasCabinet = this.showMoebel && this.selectedMoebel;
            const faucetDesc = (this.selectedFaucet?.description || '').toLowerCase();
            const isMischwasser = faucetDesc.includes('mischwasser');
            const regQty = isSelectedWandModel ? 0 : (isMischwasser ? 1 : 2) * faucetQty;
            const siphonQty = (this.selectedBasin.label || '').toLowerCase().includes('doppelwaschtisch') ? 2 : 1;

            if (hasCabinet) {
                // Find cabinet object
                const allApps = window.productApps || {};
                let cabinetObj = null;
                Object.values(allApps).forEach(app => {
                    if (cabinetObj) return;
                    const itemsToSearch = app.trays || app.basinTrays || app.faucets || [];
                    cabinetObj = itemsToSearch.find(t => t.artNr === this.selectedMoebel);
                });

                if (cabinetObj) {
                    items.push({ qty: 1, label: cabinetObj.label, artNr: cabinetObj.artNr });
                }

                // Cabinet Isolation Tape (Automatically based on width)
                const width = parseFloat(this.extractBreite(this.selectedBasin));
                if (width <= 120) items.push({ qty: 1, label: 'Schallschutz Iso-Set Möbel 120', artNr: '3171 166.000.000' });
                else if (width <= 150) items.push({ qty: 1, label: 'Schallschutz Iso-Set Möbel 150', artNr: '3171 167.000.000' });
                else if (width <= 200) items.push({ qty: 1, label: 'Schallschutz Iso-Set Möbel 200', artNr: '3171 168.000.000' });
                else items.push({ qty: 1, label: 'Schallschutz Iso-Set Hafner Waschtischmöbel', artNr: '3171 165.000.000' });
            }

            // 5. Add Siphon and Regulierventile
            if (hasCabinet) {
                // Siphon (Strictly Möbelsiphon)
                items.push({ qty: siphonQty, label: 'Möbelsiphon Viega, Raumsparmodell', artNr: '3163 172.100.000' });

                // Regulierventil (Strictly 6511 222.501.000)
                if (regQty > 0) items.push({ qty: regQty, label: 'Regulierventil Laufen ½" Absperrung vertikal', artNr: '6511 222.501.000' });
            } else {
                // User-selected Siphon
                if (this.selectedSiphon) {
                    const sLabelMap = {
                        "3163 105.100.000": "Sifon Geberit 40mm Weiss",
                        "3163 115.501.000": "Sifon Geberit 40mm Chrom"
                    };
                    items.push({ qty: siphonQty, label: sLabelMap[this.selectedSiphon] || 'Sifon', artNr: this.selectedSiphon });
                }

                // Regulierventil (Standard)
                if (regQty > 0) items.push({ qty: regQty, label: 'Regulierventil Laufen ½" Verchromt', artNr: '6511 201.501.000' });
            }

            // 6. Add Spiegelschrank
            if (this.showSpiegelschrank && this.selectedSpiegelschrank) {
                const allApps = window.productApps || {};
                let mirrorObj = null;
                Object.values(allApps).forEach(app => {
                    if (mirrorObj) return;
                    const itemsToSearch = app.trays || app.basinTrays || app.faucets || [];
                    mirrorObj = itemsToSearch.find(t => t.artNr === this.selectedSpiegelschrank);
                });

                if (mirrorObj) {
                    items.push({ qty: 1, label: mirrorObj.label || mirrorObj.name, artNr: mirrorObj.artNr });
                } else {
                    items.push({ qty: 1, label: 'Spiegelschrank', artNr: this.selectedSpiegelschrank });
                }

                // Mandatory Isolation for Mirror Cabinet
                items.push({ qty: 1, label: 'Alterna Isolations-Set für Spiegelschränke', artNr: '5299 910.000.000' });
            }

            // 7. Add Accessories
            if (this.showAccessoires && this.selectedAccessoires.length > 0) {
                const allApps = window.productApps || {};
                this.selectedAccessoires.forEach(artNr => {
                    let accObj = null;
                    Object.values(allApps).forEach(app => {
                        if (accObj) return;
                        const itemsToSearch = app.trays || app.basinTrays || app.faucets || [];
                        accObj = itemsToSearch.find(t => t.artNr === artNr);
                    });
                    if (accObj) {
                        items.push({ qty: 1, label: accObj.label, artNr: accObj.artNr });
                    }
                });
            }

            return items;
        },

        // Copies only the G1 set lines (G1 header → basin → faucet → einbaukosten → ablaufventil → ablauf einbaukosten)
        copyToClipboard: function () {
            const previewItems = this.getBOMPreviewItems();
            if (previewItems.length === 0) {
                alert('Bitte konfigurieren Sie zuerst ein Mix & Match Set.');
                return;
            }

            // G1 set = all items up to (but NOT including) the spacer
            const g1Items = [];
            for (const item of previewItems) {
                if (item.isSpacer) break;
                g1Items.push(item);
            }

            if (g1Items.length === 0) {
                alert('Kein G1-Set vorhanden.');
                return;
            }

            const textLines = g1Items.map(item => {
                let cleanArtNr = (item.artNr || '').toString().replace(/\t/g, '').trim();
                return `${cleanArtNr}\t${item.qty}`;
            });
            const textArray = textLines.join('\n');
            navigator.clipboard.writeText(textArray).then(() => {
                alert("✅ G1-Set kopiert für SAP (" + g1Items.length + " Zeilen):\n\n" + textArray.replace(/\t/g, "    "));
            }).catch(e => alert("Kopieren fehlgeschlagen."));
        },

        // Copies ONLY the loose items (Schallschutz + Dübelschrauben) — paste SEPARATELY after the G1 set is closed
        copyLooseItemsToClipboard: function () {
            const previewItems = this.getBOMPreviewItems();
            if (previewItems.length === 0) {
                alert('Bitte konfigurieren Sie zuerst ein Mix & Match Set.');
                return;
            }

            // Loose items = everything AFTER the spacer
            let pastSpacer = false;
            const looseItems = [];
            for (const item of previewItems) {
                if (item.isSpacer) { pastSpacer = true; continue; }
                if (pastSpacer) looseItems.push(item);
            }

            if (looseItems.length === 0) {
                alert('Keine losen Artikel vorhanden (kein Schallschutz / keine Dübelschrauben konfiguriert).');
                return;
            }

            const textLines = looseItems.map(item => {
                let cleanArtNr = (item.artNr || '').toString().replace(/\t/g, '').trim();
                return `${cleanArtNr}\t${item.qty}`;
            });
            const textArray = textLines.join('\n');
            navigator.clipboard.writeText(textArray).then(() => {
                alert("✅ Lose Artikel kopiert für SAP (" + looseItems.length + " Zeilen):\n\nBitte NACH dem G1-Set einfügen!\n\n" + textArray.replace(/\t/g, "    "));
            }).catch(e => alert("Kopieren fehlgeschlagen."));
        },

        clearBOM: function () {
            bomTableBody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: #9da3ad; padding: 2rem;">Bitte konfigurieren Sie Ihr Mix & Match Set.</td></tr>';
            bomCountCounter.textContent = "0 Artikel";
        },

        updateBOM: function () {
            const previewItems = this.getBOMPreviewItems();
            if (previewItems.length === 0) return;

            let bomHtml = '';
            let totalCount = 0;

            previewItems.forEach(item => {
                if (item.isSpacer) {
                    bomHtml += `<tr><td colspan="5" style="height: 1.5rem; background: transparent; border: none;"></td></tr>`;
                    return;
                }

                const isService = item.label.toLowerCase().includes('einbaukosten');
                bomHtml += `
                    <tr style="${isService ? 'background: rgba(59, 130, 246, 0.03);' : ''}">
                        <td><div class="img-cell">
                            ${isService ? '<div style="width:40px;height:40px;background:#e0e7ff;border-radius:4px;display:flex;align-items:center;justify-content:center;color:#4f46e5;"><i class="ri-tools-fill"></i></div>' : `<i class="ri-box-3-line" style="font-size:1.5rem; color:var(--text-secondary);"></i>`}
                        </div></td>
                        <td><span class="bom-code">${item.artNr}</span></td>
                        <td>
                            <div class="bom-desc">${item.label}</div>
                        </td>
                        
                        <td><strong>${item.qty}</strong></td>
                    </tr>
                `;
                totalCount += item.qty;
            });

            bomTableBody.innerHTML = bomHtml;
            bomCountCounter.textContent = `${totalCount} Artikel`;

            if (window.saveWishlist) window.saveWishlist();
        }
    };
}

/* Mischer Factory */

export function createDuschenmischerApp(title, desc, mainImgUrl, config = {}) {
    function ut(B,F,R,N={}){const m=N.isBath||!1,s=B.replace(/\s/g,"")
return{trays:[],mainImgUrl:R,selectedTray:null,mischerOptionsState:{},currentHersteller:"all",currentMontage:"all",currentSerie:"all",init:function(){this.selectedTray=null,this.mischerOptionsState={},this.currentHersteller="all",this.currentMontage="all",this.currentSerie="all",this.renderSidebar(),this.bindFilters(),this.filterResults(),this.clearBOM()},normalizeDuschenmischerSerie:function(r,e=""){let t=String(r||"").toLowerCase().trim()
const n=String(e||"").toLowerCase()
return t=t.replace(/^[-\s/]+/,"").replace(/^-?\s*endmontageset\b/,"").replace(/^-?\s*fertigmontageset\b/,"").replace(/^[-\s/]+/,""),n&&t.startsWith(n)&&(t=t.slice(n.length).trim()),n&&(t=t.replace(new RegExp(`\\b${n.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")}\\b`,"gi"),"").trim()),t=t.replace(/^[-\s/]+/,"").replace(/\babdeckplatte\b.*$/i,"").replace(/\bdurchflussleistung\b.*$/i,"").replace(/\bohne einbaukörper\b.*$/i,"").replace(/\benergieeffizienzklasse\b.*$/i,"").replace(/\bgeräuschgruppe\b.*$/i,"").replace(/\barmhebel\b.*$/i,"").replace(/\bselbstschliessend\b.*$/i,"").replace(/\btemperaturgriff\b.*$/i,"").replace(/^thermostat\s+/i,"").replace(/\s+½[\"”]?\s+thermostat\b.*$/i,"").replace(/\s+thermostat\b.*$/i,"").replace(/\bmit sicherheitstaste\b.*$/i,"").replace(/\b1-weg\b.*$/i,"").replace(/\s+½[\"”]?$/i,"").replace(/\bav\.0\b/g,"ava 2.0").replace(/\bvit\.0\b/g,"vita 2.0").replace(/\s*,\s*$/g,"").replace(/\s+/g," ").trim(),t?t.split(" ").map(i=>/^kwc$/i.test(i)?"KWC":/^\d/.test(i)?i:i.charAt(0).toUpperCase()+i.slice(1)).join(" "):"Andere"},extractSerie:function(r){if(r.serie)return this.normalizeDuschenmischerSerie(r.serie,r.manufacturer)
const e=["aufputz-duschenmischer","unterputz-duschenmischer","duschenmischer","duschmischer","aufputz-bademischer","unterputz-bademischer","bademischer","waschtischmischer","thermostatmischer","thermostat-duschenmischer","einhebelmischer","einlochmischer","mischer"]
let t=(r.label||"").toLowerCase()
if(r.manufacturer){const a=r.manufacturer.toLowerCase()
t.startsWith(a)&&(t=t.slice(a.length).trim())}for(const a of e)if(t.startsWith(a)){t=t.slice(a.length).trim()
break}if(t=t.replace(/-?endmontageset/g,"").trim(),t=t.replace(/-?fertigmontageset/g,"").trim(),r.manufacturer){const a=r.manufacturer.toLowerCase()
t.startsWith(a)&&(t=t.slice(a.length).trim())}const n=t.match(/^(.*?)(?:\s+\d+\s*[xX]\s*\d+|\s*,|\s*\(|\s+-|\s+\d+mm|\s+\d+\s*mm)/)
let i=n&&n[1]?n[1].trim():t.trim()
return this.normalizeDuschenmischerSerie(i,r.manufacturer)},extractMontage:function(r){const e=(r.label||"").toLowerCase()
return e.includes("unterputz")||e.includes(" up ")||e.includes("einbau")||e.includes("endmontageset")||e.includes("grundkörper")||e.includes("grundkoerper")?"Unterputz":e.includes("aufputz")||e.includes(" ap ")||e.includes("wandbatterie")||e.includes("wandmischer")||e.includes("ad 153 mm")||e.includes("aufputz-duschenmischer")||e.includes("thermostat-duschenmischer")?"Aufputz":m&&(e.includes("standmodell")||e.includes("freistehend"))?"Standmodell":"Aufputz"},getUniqueValues:function(r,e){const t=e||this.trays
if(r==="hersteller"){const n=this.trays.map(i=>i.manufacturer||"Andere")
return[...new Set(n)].filter(Boolean).sort()}return r==="montage"?[...new Set(t.map(n=>this.extractMontage(n)))].sort():r==="serie"?[...new Set(t.map(n=>this.extractSerie(n)))].sort():[]},renderSidebar:function(){const r=document.getElementById("configSidebar")
if(!r)return
const e=this.currentHersteller==="all"?this.trays:this.trays.filter(o=>o.manufacturer===this.currentHersteller),t=e.filter(o=>this.currentMontage==="all"?!0:this.extractMontage(o)===this.currentMontage),n=this.getUniqueValues("hersteller"),i=this.getUniqueValues("serie",t),a=this.getUniqueValues("montage",e)
r.innerHTML=`
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
                            <button class="pill-btn ${this.currentHersteller==="all"?"active":""}" data-key="Hersteller" data-val="all">Alle</button>
                            ${n.map(o=>`<button class="pill-btn ${this.currentHersteller===o?"active":""}" data-key="Hersteller" data-val="${o}">${o}</button>`).join("")}
                        </div>
                    </div>

                    <div class="filter-group">
                        <label id="head_montage_${s}" class="filter-label">Montageart</label>
                        <div class="pill-group" id="list_montage_${s}">
                            <button class="pill-btn ${this.currentMontage==="all"?"active":""}" data-key="Montage" data-val="all">Alle</button>
                            ${a.map(o=>`<button class="pill-btn ${this.currentMontage===o?"active":""}" data-key="Montage" data-val="${o}">${o}</button>`).join("")}
                        </div>
                    </div>

                    <div class="filter-group">
                        <label id="head_serie_${s}" class="filter-label">Serie</label>
                        <div class="pill-group" id="list_serie_${s}">
                            <button class="pill-btn ${this.currentSerie==="all"?"active":""}" data-key="Serie" data-val="all">Alle</button>
                            ${i.map(o=>`<button class="pill-btn ${this.currentSerie===o?"active":""}" data-key="Serie" data-val="${o}">${o}</button>`).join("")}
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
                
                <div class="sidebar-section">
                    <h2>Suchergebnisse <span id="resultCount_${s}" class="badge">0</span></h2>
                    <div class="search-results-container" id="searchResults_${s}"></div>
                </div>

                <div class="sidebar-section" id="trayConfigurator_${s}" style="display:none
 margin-top:2rem
">
                    <h2>Konfiguration</h2>
                    <p class="section-desc">Bestimmen Sie das benötigte Zubehör.</p>
                    <div id="trayConfiguratorInner_${s}"></div>
                </div>
            `,r.querySelectorAll(".pill-btn[data-key]").forEach(o=>{o.addEventListener("click",()=>{this.setFilter(o.dataset.key,o.dataset.val)})}),X(`head_hersteller_${s}`,`list_hersteller_${s}`,this.currentHersteller,"Hersteller",()=>this.setFilter("Hersteller","all")),X(`head_montage_${s}`,`list_montage_${s}`,this.currentMontage,"Montageart",()=>this.setFilter("Montage","all")),X(`head_serie_${s}`,`list_serie_${s}`,this.currentSerie,"Serie",()=>this.setFilter("Serie","all"))
const l=document.getElementById(`input_search_${s}`)
l&&l.addEventListener("input",()=>this.filterResults()),this.filterResults()},setFilter:function(r,e){this[`current${r}`]=e,this.renderSidebar()},bindFilters:function(){},filterResults:function(){var i
const r=document.getElementById(`searchResults_${s}`),e=document.getElementById(`resultCount_${s}`),t=(((i=document.getElementById(`input_search_${s}`))==null?void 0:i.value)||"").toLowerCase()
if(!r)return
let n=this.trays
if(this.currentHersteller!=="all"&&(n=n.filter(a=>a.manufacturer===this.currentHersteller)),this.currentSerie!=="all"&&(n=n.filter(a=>this.extractSerie(a)===this.currentSerie)),this.currentMontage!=="all"&&(n=n.filter(a=>this.extractMontage(a)===this.currentMontage)),t&&(n=n.filter(a=>(a.label||"").toLowerCase().includes(t)||(a.artNr||"").toLowerCase().includes(t))),e.textContent=n.length,n.length===0){r.innerHTML='<div style="padding:2rem  text-align:center  color:var(--text-secondary) ">Keine Produkte gefunden. Bitte passen Sie die Filter an.</div>'
return}            r.innerHTML=n.map(a=>{
                const l=this.selectedTray&&this.selectedTray.id===a.id;
                return `
                <div class="result-item-card ${l?"active":""}" onclick="window.currentActiveApp.selectItem('${a.id}')" data-tid="${a.id}">
                    <div class="card-img-wrapper">
                        ${a.imgUrl ? `<img src="${a.imgUrl}">` : '<i class="ri-image-line placeholder-icon"></i>'}
                    </div>
                    <div class="result-info">
                        <strong>${this.extractSerie(a)}</strong>
                        <div class="result-meta">
                            <span>${a.manufacturer||"Andere"}</span> | <span>${this.extractMontage(a)}</span>
                        </div>
                        <span class="finish-artnr">${a.artNr}</span>
                    </div>
                </div>
                `}).join(""),r.querySelectorAll(".result-item-card").forEach(a=>{a.addEventListener("click",()=>{this.selectItem(a.dataset.tid)})})},selectItem:function(r){this.selectedTray=this.trays.find(e=>e.id===r),this.mischerOptionsState={},this.selectedTray&&this.selectedTray.mountingMaterials&&this.selectedTray.mountingMaterials.forEach((e,t)=>{e.options&&e.options.length>0&&(this.mischerOptionsState[t]=0)}),this.filterResults(),this.renderConfigurator(),this.updateBOM()},isMatVisible:function(r,e){if(!this.selectedTray||!this.selectedTray.mountingMaterials)return!0
if((r.name||"").toLowerCase().includes("duschengleitstange")){const n=this.selectedTray.mountingMaterials.findIndex(i=>(i.name||"").toLowerCase().includes("brausehalter"))
if(n>=0){const i=this.mischerOptionsState[n]
if(i!==void 0){const a=this.selectedTray.mountingMaterials[n].options[i]
return!!(a&&a.label&&a.label.toLowerCase().startsWith("ohne"))}}}return!0},renderConfigurator:function(){const r=document.getElementById(`trayConfigurator_${s}`),e=document.getElementById(`trayConfiguratorInner_${s}`)
if(!this.selectedTray){r&&(r.style.display="none")
return}if(r&&(r.style.display="block"),!e)return
e.innerHTML=""
const t=this.selectedTray.mountingMaterials||[]
if(t.length===0){e.innerHTML='<p class="section-desc">Kein spezifisches Zubehör verfügbar.</p>'
return}t.forEach((n,i)=>{if(!this.isMatVisible(n,i))return
const a=document.createElement("div")
a.className="filter-group",a.style.marginBottom="1.25rem"
const l=this.mischerOptionsState[i],o=l!==void 0?n.options[l]:null,y=(o==null?void 0:o.imgUrl)||"",M=n.options.length>1
a.innerHTML=`
                    <label style="display:block; margin-bottom:0.4rem; font-size:0.85rem; color:var(--text-secondary); text-transform:uppercase; letter-spacing:0.5px;">${n.name||"Zubehör"}</label>
                    <div style="display:flex; align-items:center; gap:0.75rem;">
                        <div style="width:40px; height:40px; background:#fff; border-radius:4px; border:1px solid var(--border); display:flex; align-items:center; justify-content:center; padding:2px; flex-shrink:0;">
                            ${y?`<img src="${y}" style="max-width:100%; max-height:100%; object-fit:contain;">`:'<i class="ri-image-line" style="color:#ddd;"></i>'}
                        </div>
                        <div style="flex:1; position:relative;">
                            <select class="filter-select mischer-acc-select" data-midx="${i}" style="width:100%; padding-right:2rem; ${M?"":"pointer-events:none; background-image:none !important;"}">
                                ${n.options.map((v,S)=>`
                                    <option value="${S}" ${l==S?"selected":""}>${v.label} (${v.artNr})</option>
                                `).join("")}
                            </select>
                            ${M?'<i class="ri-arrow-down-s-line" style="position:absolute; right:10px; top:50%; transform:translateY(-50%); pointer-events:none; color:var(--text-secondary); font-size:1.2rem;"></i>':""}
                        </div>
                    </div>
                `,e.appendChild(a)}),e.querySelectorAll(".mischer-acc-select").forEach(n=>{n.addEventListener("change",i=>{const a=parseInt(n.dataset.midx),l=parseInt(n.value)
this.mischerOptionsState[a]=l,this.renderConfigurator(),this.updateBOM()})})},updateBOM:function(){const r=document.getElementById("bomTableBody"),e=document.getElementById("bomCount")
if(!r)return
if(r.innerHTML="",!this.selectedTray){e&&(e.textContent="0 Artikel")
return}let t=1
r.innerHTML+=`
                <tr class="bom-main-item">
                    <td><div class="img-cell"><img src="${this.selectedTray.imgUrl||""}"></div></td>
                    <td><span class="bom-code">${this.selectedTray.artNr}</span></td>
                    <td><div class="bom-desc">${this.selectedTray.label}</div></td>
                    
                    <td><strong>1</strong></td>
                </tr>
            `,this.selectedTray.mountingMaterials&&this.selectedTray.mountingMaterials.forEach((n,i)=>{if(!this.isMatVisible(n,i))return
const a=this.mischerOptionsState[i]
if(a!==void 0){const l=n.options[a]
if(l&&!l.label.toLowerCase().startsWith("ohne")){const o=l.menge||1
t+=o,r.innerHTML+=`
                                <tr>
                                    <td><div class="img-cell"><img src="${l.imgUrl||""}"></div></td>
                                    <td><span class="bom-code">${l.artNr}</span></td>
                                    <td><div class="bom-desc">${l.label}</div></td>
                                    
                                    <td><strong>${o}</strong></td>
                                </tr>
                            `}}}),e&&(e.textContent=`${t} Artikel gewählt`)},clearBOM:function(){this.mischerOptionsState={},this.updateBOM()},copyToClipboard:function(){if(!this.selectedTray)return
let r=[`${this.selectedTray.artNr}	1`]
this.selectedTray.mountingMaterials&&this.selectedTray.mountingMaterials.forEach((e,t)=>{if(!this.isMatVisible(e,t))return
const n=this.mischerOptionsState[t]
if(n!==void 0){const i=e.options[n]
i&&!i.label.toLowerCase().startsWith("ohne")&&r.push(`${i.artNr}	${i.menge||1}`)}}),navigator.clipboard.writeText(r.join(`
`)).then(()=>alert("Stückliste kopiert!"))}}}
    return ut(title, desc, mainImgUrl, config);
}

export function createBademischerApp(title, desc, mainImgUrl, config = {}) {
    function gt(B,F,R,N={}){const m=N.isBath||!1,s=B.replace(/\s/g,"")
return{trays:[],mainImgUrl:R,selectedTray:null,mischerOptionsState:{},currentHersteller:"all",currentMontage:"all",currentSerie:"all",init:function(){this.selectedTray=null,this.mischerOptionsState={},this.currentHersteller="all",this.currentMontage="all",this.currentSerie="all",this.renderSidebar(),this.bindFilters(),this.filterResults(),this.clearBOM()},normalizeBademischerSerie:function(r,e=""){let t=String(r||"").toLowerCase().trim()
const n=String(e||"").toLowerCase()
return t=t.replace(/^[-\s/]+/,"").replace(/^-?\s*endmontageset\b/,"").replace(/^-?\s*fertigmontageset\b/,"").replace(/^[-\s/]+/,""),n&&t.startsWith(n)&&(t=t.slice(n.length).trim()),n&&(t=t.replace(new RegExp(`\\b${n.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")}\\b`,"gi"),"").trim()),t=t.replace(/^[-\s/]+/,"").replace(/\babdeckplatte\b.*$/i,"").replace(/\bdurchflussleistung\b.*$/i,"").replace(/\bohne einbaukörper\b.*$/i,"").replace(/\benergieeffizienzklasse\b.*$/i,"").replace(/\bgeräuschgruppe\b.*$/i,"").replace(/\barmhebel\b.*$/i,"").replace(/\bselbstschliessend\b.*$/i,"").replace(/\btemperaturgriff\b.*$/i,"").replace(/^thermostat\s+/i,"").replace(/\s+½[\"”]?\s+thermostat\b.*$/i,"").replace(/\s+thermostat\b.*$/i,"").replace(/\bmit sicherheitstaste\b.*$/i,"").replace(/\b1-weg\b.*$/i,"").replace(/\s+½[\"”]?$/i,"").replace(/\bav\.0\b/g,"ava 2.0").replace(/\bvit\.0\b/g,"vita 2.0").replace(/\s*,\s*$/g,"").replace(/\s+/g," ").trim(),t?t.split(" ").map(i=>/^kwc$/i.test(i)?"KWC":/^\d/.test(i)?i:i.charAt(0).toUpperCase()+i.slice(1)).join(" "):"Andere"},extractSerie:function(r){if(r.serie)return this.normalizeBademischerSerie(r.serie,r.manufacturer)
const e=["aufputz-duschenmischer","unterputz-duschenmischer","duschenmischer","duschmischer","aufputz-bademischer","unterputz-bademischer","bademischer","waschtischmischer","thermostatmischer","thermostat-duschenmischer","einhebelmischer","einlochmischer","mischer"]
let t=(r.label||"").toLowerCase()
if(r.manufacturer){const a=r.manufacturer.toLowerCase()
t.startsWith(a)&&(t=t.slice(a.length).trim())}for(const a of e)if(t.startsWith(a)){t=t.slice(a.length).trim()
break}if(t=t.replace(/-?endmontageset/g,"").trim(),t=t.replace(/-?fertigmontageset/g,"").trim(),r.manufacturer){const a=r.manufacturer.toLowerCase()
t.startsWith(a)&&(t=t.slice(a.length).trim())}const n=t.match(/^(.*?)(?:\s+\d+\s*[xX]\s*\d+|\s*,|\s*\(|\s+-|\s+\d+mm|\s+\d+\s*mm)/)
let i=n&&n[1]?n[1].trim():t.trim()
return this.normalizeBademischerSerie(i,r.manufacturer)},extractMontage:function(r){const e=(r.label||"").toLowerCase()
return m&&(e.includes("standmodell")||e.includes("freistehend"))?"Standmodell":e.includes("unterputz")||e.includes(" up ")||e.includes("einbau")||e.includes("endmontageset")||e.includes("grundkörper")||e.includes("grundkoerper")?"Unterputz":(e.includes("aufputz")||e.includes(" ap ")||e.includes("wandbatterie")||e.includes("wandmischer")||e.includes("ad 153 mm")||e.includes("aufputz-duschenmischer")||e.includes("thermostat-duschenmischer"),"Aufputz")},getUniqueValues:function(r,e){const t=e||this.trays
if(r==="hersteller"){const n=this.trays.map(i=>i.manufacturer||"Andere")
return[...new Set(n)].filter(Boolean).sort()}return r==="montage"?[...new Set(t.map(n=>this.extractMontage(n)))].sort():r==="serie"?[...new Set(t.map(n=>this.extractSerie(n)))].sort():[]},renderSidebar:function(){const r=document.getElementById("configSidebar")
if(!r)return
const e=this.currentHersteller==="all"?this.trays:this.trays.filter(o=>o.manufacturer===this.currentHersteller),t=e.filter(o=>this.currentMontage==="all"?!0:this.extractMontage(o)===this.currentMontage),n=this.getUniqueValues("hersteller"),i=this.getUniqueValues("serie",t),a=this.getUniqueValues("montage",e)
r.innerHTML=`
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
                            <button class="pill-btn ${this.currentHersteller==="all"?"active":""}" data-key="Hersteller" data-val="all">Alle</button>
                            ${n.map(o=>`<button class="pill-btn ${this.currentHersteller===o?"active":""}" data-key="Hersteller" data-val="${o}">${o}</button>`).join("")}
                        </div>
                    </div>

                    <div class="filter-group">
                        <label id="head_montage_${s}" class="filter-label">Montageart</label>
                        <div class="pill-group" id="list_montage_${s}">
                            <button class="pill-btn ${this.currentMontage==="all"?"active":""}" data-key="Montage" data-val="all">Alle</button>
                            ${a.map(o=>`<button class="pill-btn ${this.currentMontage===o?"active":""}" data-key="Montage" data-val="${o}">${o}</button>`).join("")}
                        </div>
                    </div>

                    <div class="filter-group">
                        <label id="head_serie_${s}" class="filter-label">Serie</label>
                        <div class="pill-group" id="list_serie_${s}">
                            <button class="pill-btn ${this.currentSerie==="all"?"active":""}" data-key="Serie" data-val="all">Alle</button>
                            ${i.map(o=>`<button class="pill-btn ${this.currentSerie===o?"active":""}" data-key="Serie" data-val="${o}">${o}</button>`).join("")}
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
                
                <div class="sidebar-section">
                    <h2>Suchergebnisse <span id="resultCount_${s}" class="badge">0</span></h2>
                    <div class="search-results-container" id="searchResults_${s}"></div>
                </div>

                <div class="sidebar-section" id="trayConfigurator_${s}" style="display:none
 margin-top:2rem
">
                    <h2>Konfiguration</h2>
                    <p class="section-desc">Bestimmen Sie das benötigte Zubehör.</p>
                    <div id="trayConfiguratorInner_${s}"></div>
                </div>
            `,r.querySelectorAll(".pill-btn[data-key]").forEach(o=>{o.addEventListener("click",()=>{this.setFilter(o.dataset.key,o.dataset.val)})}),X(`head_hersteller_${s}`,`list_hersteller_${s}`,this.currentHersteller,"Hersteller",()=>this.setFilter("Hersteller","all")),X(`head_montage_${s}`,`list_montage_${s}`,this.currentMontage,"Montageart",()=>this.setFilter("Montage","all")),X(`head_serie_${s}`,`list_serie_${s}`,this.currentSerie,"Serie",()=>this.setFilter("Serie","all"))
const l=document.getElementById(`input_search_${s}`)
l&&l.addEventListener("input",()=>this.filterResults()),this.filterResults()},setFilter:function(r,e){this[`current${r}`]=e,this.renderSidebar()},bindFilters:function(){},filterResults:function(){var i
const r=document.getElementById(`searchResults_${s}`),e=document.getElementById(`resultCount_${s}`),t=(((i=document.getElementById(`input_search_${s}`))==null?void 0:i.value)||"").toLowerCase()
if(!r)return
let n=this.trays
if(this.currentHersteller!=="all"&&(n=n.filter(a=>a.manufacturer===this.currentHersteller)),this.currentSerie!=="all"&&(n=n.filter(a=>this.extractSerie(a)===this.currentSerie)),this.currentMontage!=="all"&&(n=n.filter(a=>this.extractMontage(a)===this.currentMontage)),t&&(n=n.filter(a=>(a.label||"").toLowerCase().includes(t)||(a.artNr||"").toLowerCase().includes(t))),e.textContent=n.length,n.length===0){r.innerHTML='<div style="padding:2rem  text-align:center  color:var(--text-secondary) ">Keine Produkte gefunden. Bitte passen Sie die Filter an.</div>'
return}            r.innerHTML=n.map(a=>{
                const l=this.selectedTray&&this.selectedTray.id===a.id;
                return `
                <div class="result-item-card ${l?"active":""}" onclick="window.currentActiveApp.selectItem('${a.id}')" data-tid="${a.id}">
                    <div class="card-img-wrapper">
                        ${a.imgUrl ? `<img src="${a.imgUrl}">` : '<i class="ri-image-line placeholder-icon"></i>'}
                    </div>
                    <div class="result-info">
                        <strong>${this.extractSerie(a)}</strong>
                        <div class="result-meta">
                            <span>${a.manufacturer||"Andere"}</span> | <span>${this.extractMontage(a)}</span>
                        </div>
                        <span class="finish-artnr">${a.artNr}</span>
                    </div>
                </div>
                `}).join(""),r.querySelectorAll(".result-item-card").forEach(a=>{a.addEventListener("click",()=>{this.selectItem(a.dataset.tid)})})},selectItem:function(r){this.selectedTray=this.trays.find(e=>e.id===r),this.mischerOptionsState={},this.selectedTray&&this.selectedTray.mountingMaterials&&this.selectedTray.mountingMaterials.forEach((e,t)=>{e.options&&e.options.length>0&&(this.mischerOptionsState[t]=0)}),this.filterResults(),this.renderConfigurator(),this.updateBOM()},isMatVisible:function(r,e){if(!this.selectedTray||!this.selectedTray.mountingMaterials)return!0
if((r.name||"").toLowerCase().includes("brausehalter")){const n=this.selectedTray.mountingMaterials.findIndex(a=>(a.name||"").toLowerCase().includes("duschgleitstange")||(a.name||"").toLowerCase().includes("gleitstange"))
if(n>=0&&this.mischerOptionsState[n]!==void 0){const a=this.selectedTray.mountingMaterials[n].options[this.mischerOptionsState[n]]
if(a&&!a.label.toLowerCase().startsWith("ohne"))return!1}const i=this.selectedTray.mountingMaterials.findIndex(a=>(a.name||"").toLowerCase().includes("anschlussbogen"))
if(i>=0&&this.mischerOptionsState[i]!==void 0){const a=this.selectedTray.mountingMaterials[i].options[this.mischerOptionsState[i]]
if(a&&a.label.toLowerCase().includes("mit integriertem brausehalter")||a&&a.label.toLowerCase().includes("mit brausehalter")||a&&a.artNr==="bitte_waehlen")return!1}}return!0},renderConfigurator:function(){const r=document.getElementById(`trayConfigurator_${s}`),e=document.getElementById(`trayConfiguratorInner_${s}`)
if(!this.selectedTray){r&&(r.style.display="none")
return}if(r&&(r.style.display="block"),!e)return
e.innerHTML=""
const t=this.selectedTray.mountingMaterials||[]
if(t.length===0){e.innerHTML='<p class="section-desc">Kein spezifisches Zubehör verfügbar.</p>'
return}t.forEach((n,i)=>{if(!this.isMatVisible(n,i))return
const a=document.createElement("div")
a.className="filter-group",a.style.marginBottom="1.25rem"
const l=this.mischerOptionsState[i],o=l!==void 0?n.options[l]:null,y=(o==null?void 0:o.imgUrl)||"",M=n.options.length>1
a.innerHTML=`
                    <label style="display:block; margin-bottom:0.4rem; font-size:0.85rem; color:var(--text-secondary); text-transform:uppercase; letter-spacing:0.5px;">${n.name||"Zubehör"}</label>
                    <div style="display:flex; align-items:center; gap:0.75rem;">
                        <div style="width:40px; height:40px; background:#fff; border-radius:4px; border:1px solid var(--border); display:flex; align-items:center; justify-content:center; padding:2px; flex-shrink:0;">
                            ${y?`<img src="${y}" style="max-width:100%; max-height:100%; object-fit:contain;">`:'<i class="ri-image-line" style="color:#ddd;"></i>'}
                        </div>
                        <div style="flex:1; position:relative;">
                            <select class="filter-select mischer-acc-select" data-midx="${i}" style="width:100%; padding-right:2rem; ${M?"":"pointer-events:none; background-image:none !important;"}">
                                ${n.options.map((v,S)=>`
                                    <option value="${S}" ${l==S?"selected":""}>${v.label} (${v.artNr})</option>
                                `).join("")}
                            </select>
                            ${M?'<i class="ri-arrow-down-s-line" style="position:absolute; right:10px; top:50%; transform:translateY(-50%); pointer-events:none; color:var(--text-secondary); font-size:1.2rem;"></i>':""}
                        </div>
                    </div>
                `,e.appendChild(a)}),e.querySelectorAll(".mischer-acc-select").forEach(n=>{n.addEventListener("change",i=>{const a=parseInt(n.dataset.midx),l=parseInt(n.value)
this.mischerOptionsState[a]=l
const o=this.selectedTray.mountingMaterials[a],y=(o.name||"").toLowerCase(),M=o.options[l]
if(y.includes("gleitstange")||y.includes("duschgleitstange")){const v=this.selectedTray.mountingMaterials.findIndex(S=>(S.name||"").toLowerCase().includes("brauseschlauch"))
if(v>=0){const S=this.selectedTray.mountingMaterials[v]
if(M.label.toLowerCase().startsWith("ohne")){const _=S.options.findIndex(u=>u.label.includes("1250")||u.label.includes("1.25"))
_>=0&&(this.mischerOptionsState[v]=_)}else{const _=S.options.findIndex(u=>u.label.includes("1800"))
_>=0&&(this.mischerOptionsState[v]=_)}}}this.renderConfigurator(),this.updateBOM()})})},updateBOM:function(){const r=document.getElementById("bomTableBody"),e=document.getElementById("bomCount")
if(!r)return
if(r.innerHTML="",!this.selectedTray){e&&(e.textContent="0 Artikel")
return}let t=1
r.innerHTML+=`
                <tr class="bom-main-item">
                    <td><div class="img-cell"><img src="${this.selectedTray.imgUrl||""}"></div></td>
                    <td><span class="bom-code">${this.selectedTray.artNr}</span></td>
                    <td><div class="bom-desc">${this.selectedTray.label}</div></td>
                    
                    <td><strong>1</strong></td>
                </tr>
            `,this.selectedTray.mountingMaterials&&this.selectedTray.mountingMaterials.forEach((n,i)=>{if(!this.isMatVisible(n,i))return
const a=this.mischerOptionsState[i]
if(a!==void 0){const l=n.options[a]
if(l&&!l.label.toLowerCase().startsWith("ohne")){const o=l.menge||1
t+=o,r.innerHTML+=`
                                <tr>
                                    <td><div class="img-cell"><img src="${l.imgUrl||""}"></div></td>
                                    <td><span class="bom-code">${l.artNr}</span></td>
                                    <td><div class="bom-desc">${l.label}</div></td>
                                    
                                    <td><strong>${o}</strong></td>
                                </tr>
                            `}}}),e&&(e.textContent=`${t} Artikel gewählt`)},clearBOM:function(){this.mischerOptionsState={},this.updateBOM()},copyToClipboard:function(){if(!this.selectedTray)return
let r=[`${this.selectedTray.artNr}	1`]
this.selectedTray.mountingMaterials&&this.selectedTray.mountingMaterials.forEach((e,t)=>{if(!this.isMatVisible(e,t))return
const n=this.mischerOptionsState[t]
if(n!==void 0){const i=e.options[n]
i&&!i.label.toLowerCase().startsWith("ohne")&&r.push(`${i.artNr}	${i.menge||1}`)}}),navigator.clipboard.writeText(r.join(`
`)).then(()=>alert("Stückliste kopiert!"))}}}
    return gt(title, desc, mainImgUrl, config);
}

export function createStandardApp(title, desc, mainImgUrl) {
    const suffix = title.replace(/\s/g, '');
    return {
        trays: [],
        mainImgUrl: mainImgUrl,
        selectedTray: null,
        init: function () {
            this.selectedTray = null;
            this.renderSidebar();
            this.filterResults();
            this.updateBOM();
        },
        renderSidebar: function () {
            configSidebar.innerHTML = `
                <div class="sidebar-section">
                    <h2>Filter: ${title}</h2>
                    <div class="filter-group">
                        <label>Suche</label>
                        <input type="text" id="input_search_${suffix}" class="filter-select" placeholder="Art.Nr. oder Name...">
                    </div>
                </div>
                <div class="sidebar-section">
                    <h2>Ergebnisse <span id="resultCount_${suffix}" class="badge">0</span></h2>
                    <div id="searchResults_${suffix}" class="search-results-container"></div>
                </div>
            `;
            document.getElementById(`input_search_${suffix}`).addEventListener('input', () => this.filterResults());
        },
        filterResults: function () {
            const search = document.getElementById(`input_search_${suffix}`).value.toLowerCase();
            const filtered = this.trays.filter(t =>
                (t.label || '').toLowerCase().includes(search) ||
                (t.artNr || '').toLowerCase().includes(search)
            );

            const countSpan = document.getElementById(`resultCount_${suffix}`);
            if (countSpan) countSpan.textContent = filtered.length;

            const container = document.getElementById(`searchResults_${suffix}`);
            if (!container) return;

            container.innerHTML = filtered.map(t => `
                <div class="result-item-card ${this.selectedTray?.id === t.id ? 'active' : ''}" onclick="window.currentActiveApp.selectItem('${t.id}')">
                    <div class="card-img-wrapper">
                        ${t.imgUrl ? `<img src="${t.imgUrl}">` : '<i class="ri-image-line placeholder-icon"></i>'}
                    </div>
                    <div class="result-info">
                        <strong>${t.label}</strong>
                        <div class="result-meta"><span>${t.manufacturer || ''}</span> | <span>${t.size || ''}</span></div>
                        <span class="finish-artnr">${t.artNr}</span>
                    </div>
                </div>
            `).join('');
        },
        selectItem: function (id) {
            this.selectedTray = this.trays.find(t => t.id === id);
            this.filterResults();
            this.updateBOM();
        },
        updateBOM: function () {
            if (!this.selectedTray) {
                bomTableBody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:2rem;">Bitte wählen Sie ein Produkt.</td></tr>';
                bomCountCounter.textContent = "0 Artikel";
                return;
            }
            bomTableBody.innerHTML = `
                <tr>
                    <td><div class="img-cell"><img src="${this.selectedTray.imgUrl || this.mainImgUrl}"></div></td>
                    <td><span class="bom-code">${this.selectedTray.artNr}</span></td>
                    <td><div class="bom-desc">${this.selectedTray.label}</div></td>
                    
                    <td><strong>1</strong></td>
                </tr>
            `;
            bomCountCounter.textContent = "1 Artikel";
        },
        copyToClipboard: function () {
            if (!this.selectedTray) return;
            navigator.clipboard.writeText(`${this.selectedTray.artNr}\t1`).then(() => alert('Kopiert!'));
        }
    };
}

/**
 * Glass Enclosure App (Master App)
 */
export function createGlassApp(title, desc, mainImgUrl) {
    function pt(B,F,R){const N=B.replace(/\s/g,"")
return{trays:[],mainImgUrl:R,selectedTray:null,currentType:"all",currentSituation:"all",currentColor:"all",currentBand:"all",currentManufacturer:"all",currentBreite:"",currentLaenge:"",init:function(){this.selectedTray=null,this.currentType="all",this.currentSituation="all",this.currentColor="all",this.currentBand="all",this.currentManufacturer="all",this.currentBreite="",this.currentLaenge="",this.renderSidebar(),this.updateBOM()},extractType:function(m){const s=(m.label||"").toLowerCase()
return s.includes("massaufnahme")||s.includes("anfahrtspauschale")||s.includes("montagepauschale")||s.includes("demontage")||s.includes("nettobetrag")?null:s.startsWith("freistehende seitenwand")||s.includes("freistehend")&&s.includes("seitenwand")?"Seitenwand (freistehend)":s.startsWith("seitenwand")&&(s.includes("gleittür")||s.includes("pendeltür")||s.includes("kombination"))?"Seitenwand (Zusatz)":s.includes("pendeltür")?"Pendeltür":s.includes("flügeltür")||s.includes("flügelig")?"Flügeltür":s.includes("gleittür")||s.includes("schiebetür")?"Gleittür/Schiebetür":s.includes("drehfalttür")||s.includes("falttür")?"Drehfalttür":s.includes("seitenwand")?"Seitenwand (freistehend)":s.includes("nische")?"Nischentür":null},extractSituation:function(m){const s=(m.label||"").toLowerCase()
return s.includes("walk-in")||s.includes("walkin")||s.includes("freistehend")?"Walk-In/Freistehende Seitenwand":s.includes("nische")?"Nische":(s.includes("eckeinstieg")||s.includes("eck")||s.includes("seitenwand"),"Eckeinstieg")},extractBand:function(m){const s=(m.label||"").toLowerCase()
return s.includes("band links")?"links":s.includes("band rechts")?"rechts":(s.includes("eckeinstieg"),"Universal")},extractColor:function(m){const s=(m.label||"").toLowerCase()
return s.includes("chrom")||s.includes("silber")?"Chrom":s.includes("schwarz")?"Schwarz":s.includes("weiss")||s.includes("weiß")?"Weiss":s.includes("matt")?"Matt":"Standard"},extractSizeScore:function(m){return((m.label||"").toLowerCase().replace((m.artNr||"").toLowerCase(),"").trim().match(/\d+([\.,]\d+)?/g)||[]).map(n=>Number(n.replace(",","."))).filter(n=>n>20).map(n=>n>250?n/10:n).filter(n=>n<195)[0]||9999},checkCompatibility:function(m,s,r){const e=(m.label||"").toLowerCase(),i=(e.replace((m.artNr||"").toLowerCase(),"").trim().match(/\d+([\.,]\d+)?/g)||[]).map(l=>Number(l.replace(",","."))).filter(l=>l>20).map(l=>l>250?l/10:l).filter(l=>l<195)
if(i.length===0)return!0
const a=[]
return s&&a.push(s>250?s/10:s),r&&a.push(r>250?r/10:r),a.every((l,o)=>{const y=i[o]||i[0]
if(i.length>=2&&!e.includes(" x ")){const S=Math.min(...i),_=Math.max(...i)
return l>=S&&l<=_}return e.includes(" x ")&&i.length>=2?l<=(i[o]||i[0]):e.includes("breite bis")||e.includes("bis")&&!e.includes("höhe bis")?l<=y:e.includes("breite ab")||e.includes("ab")&&!e.includes("höhe ab")?l>=y:Math.abs(l-y)<5})},renderSidebar:function(){const m=[...new Set(this.trays.map(n=>this.extractSituation(n)))].sort(),s=[...new Set(this.trays.map(n=>this.extractType(n)).filter(Boolean))].sort(),r=[...new Set(this.trays.map(n=>this.extractColor(n)))].sort(),e=[...new Set(this.trays.map(n=>this.extractBand(n)))].sort(),t=[...new Set(this.trays.map(n=>n.manufacturer).filter(n=>n&&n!=="Andere"))].sort()
Ae.innerHTML=`
                <div class="sidebar-section">
                    <h2>Filter: ${B}</h2>

                    <div class="filter-group">
                        <label>Hersteller</label>
                        <div class="pill-group">
                            <button class="pill-btn ${this.currentManufacturer==="all"?"active":""}" onclick="window.currentActiveApp.setFilter('Manufacturer', 'all')">Alle</button>
                            ${t.map(n=>`<button class="pill-btn ${this.currentManufacturer===n?"active":""}" onclick="window.currentActiveApp.setFilter('Manufacturer', '${n}')">${n}</button>`).join("")}
                        </div>
                    </div>

                    <div class="filter-group" style="margin-top:0.75rem
">
                        <label>Einbausituation</label>
                        <div class="pill-group">
                            <button class="pill-btn ${this.currentSituation==="all"?"active":""}" onclick="window.currentActiveApp.setFilter('Situation', 'all')">Alle</button>
                            ${m.map(n=>`<button class="pill-btn ${this.currentSituation===n?"active":""}" onclick="window.currentActiveApp.setFilter('Situation', '${n}')">${n}</button>`).join("")}
                        </div>
                    </div>

                    <div class="filter-group" style="margin-top:0.75rem
">
                        <label>Türart / Typ</label>
                        <div class="pill-group">
                            <button class="pill-btn ${this.currentType==="all"?"active":""}" onclick="window.currentActiveApp.setFilter('Type', 'all')">Alle</button>
                            ${s.map(n=>`<button class="pill-btn ${this.currentType===n?"active":""}" onclick="window.currentActiveApp.setFilter('Type', '${n}')">${n}</button>`).join("")}
                        </div>
                    </div>

                    <div class="filter-group" style="margin-top:0.75rem
">
                        <label>Farbe</label>
                        <div class="pill-group">
                            <button class="pill-btn ${this.currentColor==="all"?"active":""}" onclick="window.currentActiveApp.setFilter('Color', 'all')">Alle</button>
                            ${r.map(n=>`<button class="pill-btn ${this.currentColor===n?"active":""}" onclick="window.currentActiveApp.setFilter('Color', '${n}')">${n}</button>`).join("")}
                        </div>
                    </div>

                    <div class="filter-group" style="margin-top:0.75rem
">
                        <label>Band</label>
                        <div class="pill-group">
                            <button class="pill-btn ${this.currentBand==="all"?"active":""}" onclick="window.currentActiveApp.setFilter('Band', 'all')">Alle</button>
                            ${e.map(n=>`<button class="pill-btn ${this.currentBand===n?"active":""}" onclick="window.currentActiveApp.setFilter('Band', '${n}')">${n}</button>`).join("")}
                        </div>
                    </div>

                    <div class="filter-group" style="margin-top:1rem
">
                        <label>Manuelle Grösse (mm)</label>
                        <div style="display:flex
 gap:0.5rem
">
                            <input type="number" id="input_breite_${N}" class="filter-select" placeholder="Breite" value="${this.currentBreite}">
                            <input type="number" id="input_laenge_${N}" class="filter-select" placeholder="Länge" value="${this.currentLaenge}">
                        </div>
                    </div>

                    <div class="filter-group" style="margin-top:1rem
">
                        <label>Suche</label>
                        <input type="text" id="input_search_${N}" class="filter-select" placeholder="Art.Nr. oder Name...">
                    </div>
                </div>
                <div class="sidebar-section">
                    <h2>Ergebnisse <span id="resultCount_${N}" class="badge">0</span></h2>
                    <div id="searchResults_${N}" class="search-results-container"></div>
                </div>
            `,document.getElementById(`input_search_${N}`).addEventListener("input",()=>this.filterResults()),document.getElementById(`input_breite_${N}`).addEventListener("input",n=>{this.currentBreite=n.target.value,this.filterResults()}),document.getElementById(`input_laenge_${N}`).addEventListener("input",n=>{this.currentLaenge=n.target.value,this.filterResults()}),this.filterResults()},setFilter:function(m,s){this[`current${m}`]=s,this.renderSidebar()},filterResults:function(){var a
const m=(((a=document.getElementById(`input_search_${N}`))==null?void 0:a.value)||"").toLowerCase(),s=parseFloat(this.currentBreite),r=parseFloat(this.currentLaenge),e=this.trays.filter(l=>{const o=(l.label||"").toLowerCase()
return!(o.includes("massaufnahme")||o.includes("anfahrt")||this.extractType(l)===null||this.currentManufacturer!=="all"&&(l.manufacturer||"")!==this.currentManufacturer||this.currentType!=="all"&&this.extractType(l)!==this.currentType||this.currentSituation!=="all"&&this.extractSituation(l)!==this.currentSituation||this.currentColor!=="all"&&this.extractColor(l)!==this.currentColor||this.currentBand!=="all"&&this.extractBand(l)!==this.currentBand||(this.currentBreite||this.currentLaenge)&&!this.checkCompatibility(l,s,r)||m&&!(l.label.toLowerCase().includes(m)||l.artNr.toLowerCase().includes(m)))})
let t=e
if(this.currentBreite||this.currentLaenge){const l={}
e.forEach(o=>{const y=`${this.extractType(o)}|${this.extractSituation(o)}|${this.extractColor(o)}|${this.extractBand(o)}`
l[y]||(l[y]=[]),l[y].push(o)}),t=[],Object.values(l).forEach(o=>{const y=Math.min(...o.map(M=>this.extractSizeScore(M)))
o.filter(M=>this.extractSizeScore(M)===y).forEach(M=>t.push(M))})}const n=document.getElementById(`resultCount_${N}`)
n&&(n.textContent=t.length)
const i=document.getElementById(`searchResults_${N}`)
i&&(i.innerHTML=t.map(l=>{var o
return`
                <div class="result-item-card ${((o=this.selectedTray)==null?void 0:o.id)===l.id?"active":""}" onclick="window.currentActiveApp.selectItem('${l.id}')">
                    <div class="card-img-wrapper">
                        ${l.imgUrl ? `<img src="${l.imgUrl}">` : '<i class="ri-image-line placeholder-icon"></i>'}
                    </div>
                    <div class="result-info">
                        <strong>${l.label}</strong>
                        <div class="result-meta"><span>${l.manufacturer||""}</span> | <span>${l.size||""}</span></div>
                        <span class="finish-artnr">${l.artNr}</span>
                    </div>
                </div>
            `}).join(""))},selectItem:function(m){this.selectedTray=this.trays.find(s=>s.id===m),this.filterResults(),this.updateBOM()},updateBOM:function(){if(!this.selectedTray){re.innerHTML='<tr><td colspan="5" style="text-align:center  padding:2rem ">Bitte wählen Sie ein Produkt.</td></tr>',me.textContent="0 Artikel"
return}let m=1,s=`
                <tr class="bom-main-item">
                    <td><div class="img-cell"><img src="${this.selectedTray.imgUrl||this.mainImgUrl}"></div></td>
                    <td><span class="bom-code">${this.selectedTray.artNr}</span></td>
                    <td><div class="bom-desc">${this.selectedTray.label}</div></td>
                    
                    <td><strong>1</strong></td>
                </tr>
            `
const r=this.extractSizeScore(this.selectedTray);
(this.selectedTray.services||[]).filter(n=>{const i=n.label.toLowerCase()
return!(i.includes("montagepauschale")&&(i.includes("bis 125")&&r>125||i.includes("ab 125")&&r<=125))}).forEach(n=>{m+=n.qty||1,s+=`
                        <tr class="service-row">
                            <td><div class="img-cell"><i class="ri-customer-service-2-line" style="font-size:1.5rem
 color:var(--accent)
"></i></div></td>
                            <td><span class="bom-code">${n.artNr}</span></td>
                            <td><div class="bom-desc">${n.label}</div></td>
                            
                            <td><strong>${n.qty||1}</strong></td>
                        </tr>
                    `}),re.innerHTML=s,me.textContent=`${m} Artikel`},copyToClipboard:function(){if(!this.selectedTray)return
let m=[`${this.selectedTray.artNr}	1`]
if(this.selectedTray.services){const s=this.extractSizeScore(this.selectedTray);
(this.selectedTray.services||[]).filter(t=>{const n=t.label.toLowerCase()
return!(n.includes("montagepauschale")&&(n.includes("bis 125")&&s>125||n.includes("ab 125")&&s<=125))}).forEach(t=>{t.artNr&&t.artNr!=="none"&&!t.label.toLowerCase().startsWith("ohne")&&m.push(`${t.artNr}	${t.qty||1}`)})}navigator.clipboard.writeText(m.join(`
`)).then(()=>alert("Kopiert!"))}}}function He(B,F,R,N={}){const m=N.isMixer||B.toLowerCase().includes("mischer")||B.toLowerCase().includes("armatur")
N.montageLabel1,N.montageLabel2,N.montageLabel3
const s=N.hideSizeForm||m,r=B.replace(/\s/g,"")
return{trays:[],mainImgUrl:R,selectedTray:null,extractSerie:function(e){if(e.serie)return e.serie
let t=e.label||""
e.manufacturer&&t.toLowerCase().startsWith(e.manufacturer.toLowerCase())&&(t=t.substring(e.manufacturer.length).trim())
const n=t.match(/^(.*?)(?:\s+\d+\s*[xX]\s*\d+|\s*,|\s*\(|\s+-| \d+)/)
let i=n&&n[1]?n[1].trim():t.trim()
const a=["Doppelwaschtisch","Möbelwaschtisch","Aufsatzwaschtisch","Waschtisch","Handwaschbecken","Einbaubecken","Wandbecken","Waschtischanlage","Aufsatzbecken","Waschbecken","Duschenwanne","Duschwanne","Badewanne","Duschfläche","Wanne"]
for(const l of a)if(i.toLowerCase().startsWith(l.toLowerCase())){i=i.substring(l.length).trim(),(i.startsWith("-")||i.startsWith("/"))&&(i=i.substring(1).trim()),e.manufacturer&&i.toLowerCase().startsWith(e.manufacturer.toLowerCase())&&(i=i.substring(e.manufacturer.length).trim())
break}return e.manufacturer&&i.toLowerCase().startsWith(e.manufacturer.toLowerCase())&&(i=i.substring(e.manufacturer.length).trim()),i||"Andere"},getUniqueValues:function(e){return e==="serie"?[...new Set(this.trays.map(t=>this.extractSerie(t)))].sort():[...new Set(this.trays.map(t=>t[e]))].sort()},classifyAccessory:function(e){if(!e)return"common"
if(e.overrideMontageart&&e.overrideMontageart!=="auto")return e.overrideMontageart.toLowerCase()
const t=(e.label||e.name||"").toLowerCase(),n=(e.artNr||"").replace(/\s/g,"")
if(n==="1445782.000.000"||n==="1441782.000.000")return"wannenträger"
if(n==="1431191.000.000"||n==="1431190.000.000"||n==="1435435.000.000")return"montagerahmen"
if(t.includes("schallschutzset")||t.includes("schallschutz"))return m?"unterputz":"montagerahmen"
const i=B.toLowerCase().includes("klosett")||B.toLowerCase().includes("wc")
if(m){const a=t.toLowerCase()
if(a.includes("standmodell")||a.includes("freien stand"))return"standmodell"
if(a.includes("einbaukörper")||a.includes("grundkörper")||a.includes("ibox")||a.includes("up-gehäuse"))return"common"
if(a.includes("endmontage")||a.includes("einbau")||a.includes("anschlussbogen")||a.includes("unterputz")||a.includes(" up "))return"unterputz"
if(a.includes("aufputz")||a.includes(" ap ")||a.includes("ausserhalb")||a.includes("mischer")||a.includes("batterie"))return"aufputz"}else if(i){const a=t.toLowerCase()
return a.includes("sitz")||a.includes("deckel")||a.includes("betätigungsplatte")||a.includes("drückerplatte")||a.includes("manschette")||a.includes("garnitur")?"common":a.includes("einbauspülkasten")||a.includes("einbauspulkasten")||a.includes("duofix")||a.includes("unterputz")||a.includes(" up ")?"unterputz":a.includes("aufputz")||a.includes(" ap ")?"aufputz":"common"}else{if(t.includes("träger")||t.includes("wannenträger")||t.includes("montageschaum"))return"wannenträger"
if(t.includes("rahmen")||t.includes("füsse")||t.includes("fussset")||t.includes("schallschutzset")||t.includes("schallschutz"))return"montagerahmen"
if(t.includes("stelzfüss")||t.includes("stelzfuss"))return"stelzfüsse"}return"common"},init:function(){this.isToiletApp=B.toLowerCase().includes("klosett")||B.toLowerCase().includes("wc"),this.selectedTray=null,this.currentMontageart="alle",this.currentManufacturer="all",this.currentSerie="all",this.currentForm="all",this.currentSize="all",this.renderSidebar(),this.bindFilters(),this.filterResults(),this.clearBOM()},renderSidebar:function(){const e=B.toLowerCase().includes("klosett")||B.toLowerCase().includes("wc")
console.log(`[Configurator] Rendering Sidebar for ${B}. isToiletApp: ${e}`),this.getUniqueValues("manufacturer"),this.getUniqueValues("form"),this.getUniqueValues("size")
const t=e?"Montage":"Form",n=e?"System":"Montageart"
Ae.innerHTML=`
                    <div class="sidebar-section">
                        <h2>Filter: ${B}</h2>
                        
                        <div class="filter-group">
                            <div class="finder-sub-header" id="head_rel_mfr_${r}">Hersteller</div>
                            <div class="pill-group" id="list_rel_mfr_${r}"></div>
                        </div>

                        <div class="filter-group">
                            <div class="finder-sub-header" id="head_rel_serie_${r}">Serie</div>
                            <div class="pill-group" id="list_rel_serie_${r}"></div>
                        </div>
                        
                        ${s?"":`
                        <div class="filter-group">
                            <div class="finder-sub-header" id="head_rel_form_${r}">${t}</div>
                            <div class="pill-group" id="list_rel_form_${r}"></div>
                        </div>
                        
                        <div class="filter-group">
                            <div class="finder-sub-header" id="head_rel_size_${r}">Grösse</div>
                            <div class="pill-group" id="list_rel_size_${r}"></div>
                        </div>
                        `}
                        
                        <div class="filter-group">
                            <div class="finder-sub-header" id="head_rel_montage_${r}">${n}</div>
                            <div class="pill-group" id="list_rel_montage_${r}"></div>
                        </div>

                        ${s||e?"":`
                        <div style="display:flex
 gap:1rem
 margin-top: 1rem
">
                            <div class="filter-group" style="flex:1
">
                                <label>Länge (cm)</label>
                                <input type="number" id="filterLength_${r}" class="filter-select" placeholder="z.B. 120" style="background:var(--bg-surface)
 color:var(--text-primary)
 border:1px solid var(--border)
" />
                            </div>
                            <div class="filter-group" style="flex:1
">
                                <label>Breite (cm)</label>
                                <input type="number" id="filterWidth_${r}" class="filter-select" placeholder="z.B. 80" style="background:var(--bg-surface)
 color:var(--text-primary)
 border:1px solid var(--border)
" />
                            </div>
                        </div>
                        `}
                    </div>
                    
                    <div class="sidebar-section">
                        <h2>Suchergebnisse <span id="resultCount_${r}" class="badge">0</span></h2>
                        <div class="search-results-container" id="searchResults_${r}"></div>
                    </div>

                    <div class="sidebar-section" id="trayConfigurator_${r}" style="display:none
 margin-top:2rem
">
                        <h2>Konfiguration</h2>
                        <p class="section-desc">Wählen Sie das passende Zubehör.</p>
                        <div id="trayConfiguratorInner_${B.replace(/\s/g,"")}"></div>
                    </div>
                `,this.updatePillFilters()},updatePillFilters:function(){const e=B.replace(/\s/g,""),t=document.getElementById(`list_rel_mfr_${e}`),n=document.getElementById(`list_rel_serie_${e}`),i=document.getElementById(`list_rel_form_${e}`),a=document.getElementById(`list_rel_size_${e}`),l=document.getElementById(`list_rel_montage_${e}`)
if(!t)return
const o=B.toLowerCase().includes("klosett")||B.toLowerCase().includes("wc"),y=m||o,M=o?"Montage":"Form",v=o?"System":"Montageart",S=y?"Aufputz":N.montageLabel1||"Wannenträger",_=y?"Unterputz":N.montageLabel2||"Montagerahmen",u=N.montageLabel3||"",x=this.getUniqueValues("manufacturer")
t.innerHTML=`<button class="pill-btn ${this.currentManufacturer==="all"?"active":""}" data-val="all">Alle</button>`+x.map(g=>`
                    <button class="pill-btn ${this.currentManufacturer===g?"active":""}" data-val="${g}">${g}</button>
                `).join(""),X(`head_rel_mfr_${e}`,`list_rel_mfr_${e}`,this.currentManufacturer,"Hersteller",()=>{this.currentManufacturer="all",this.currentSerie="all",this.currentForm="all",this.currentSize="all",this.updatePillFilters(),this.filterResults()}),t.querySelectorAll(".pill-btn").forEach(g=>g.addEventListener("click",()=>{this.currentManufacturer=g.dataset.val,this.updatePillFilters(),this.filterResults()}))
let A=this.trays
this.currentManufacturer!=="all"&&(A=A.filter(g=>g.manufacturer===this.currentManufacturer))
const H=[...new Set(A.map(g=>this.extractSerie(g)))].sort()
if(n.innerHTML=`<button class="pill-btn ${this.currentSerie==="all"?"active":""}" data-val="all">Alle</button>`+H.map(g=>`
                    <button class="pill-btn ${this.currentSerie===g?"active":""}" data-val="${g}">${g}</button>
                `).join(""),X(`head_rel_serie_${e}`,`list_rel_serie_${e}`,this.currentSerie,"Serie",()=>{this.currentSerie="all",this.currentSize="all",this.updatePillFilters(),this.filterResults()}),n.querySelectorAll(".pill-btn").forEach(g=>g.addEventListener("click",()=>{this.currentSerie=g.dataset.val,this.updatePillFilters(),this.filterResults()})),i){let g=A
this.currentSerie!=="all"&&(g=g.filter(d=>this.extractSerie(d)===this.currentSerie))
const c=[...new Set(g.map(d=>d.form))].filter(Boolean).sort()
i.innerHTML=`<button class="pill-btn ${this.currentForm==="all"?"active":""}" data-val="all">Alle</button>`+c.map(d=>`
                        <button class="pill-btn ${this.currentForm===d?"active":""}" data-val="${d}">${d}</button>
                    `).join(""),X(`head_rel_form_${e}`,`list_rel_form_${e}`,this.currentForm,M,()=>{this.currentForm="all",this.currentSize="all",this.updatePillFilters(),this.filterResults()}),i.querySelectorAll(".pill-btn").forEach(d=>d.addEventListener("click",()=>{this.currentForm=d.dataset.val,this.updatePillFilters(),this.filterResults()}))}if(a){let g=A
this.currentSerie!=="all"&&(g=g.filter(d=>this.extractSerie(d)===this.currentSerie)),this.currentForm!=="all"&&(g=g.filter(d=>d.form===this.currentForm))
const c=[...new Set(g.map(d=>d.size))].sort()
a.innerHTML=`<button class="pill-btn ${this.currentSize==="all"?"active":""}" data-val="all">Alle</button>`+c.map(d=>`
                        <button class="pill-btn ${this.currentSize===d?"active":""}" data-val="${d}">${d}</button>
                    `).join(""),X(`head_rel_size_${e}`,`list_rel_size_${e}`,this.currentSize,"Grösse",()=>{this.currentSize="all",this.updatePillFilters(),this.filterResults()}),a.querySelectorAll(".pill-btn").forEach(d=>d.addEventListener("click",()=>{this.currentSize=d.dataset.val,this.updatePillFilters(),this.filterResults()}))}const p=S.toLowerCase(),k=_.toLowerCase(),f=u?u.toLowerCase():""
l.innerHTML=`
                    <button class="pill-btn ${this.currentMontageart==="alle"?"active":""}" data-val="alle">Alle</button>
                    <button class="pill-btn ${this.currentMontageart===p?"active":""}" data-val="${p}">${S}</button>
                    <button class="pill-btn ${this.currentMontageart===k?"active":""}" data-val="${k}">${_}</button>
                    ${u?`<button class="pill-btn ${this.currentMontageart===f?"active":""}" data-val="${f}">${u}</button>`:""}
                `,X(`head_rel_montage_${e}`,`list_rel_montage_${e}`,this.currentMontageart,v,()=>{this.currentMontageart="alle",this.updatePillFilters(),this.filterResults()}),l.querySelectorAll(".pill-btn").forEach(g=>g.addEventListener("click",()=>{this.currentMontageart=g.dataset.val,this.updatePillFilters(),this.filterResults()})),s||this.updateManualInputs()},bindFilters:function(){if(!s){const e=document.getElementById(`filterLength_${r}`),t=document.getElementById(`filterWidth_${r}`),n=()=>{this.updateSizeDropdownFromManual(),this.filterResults()}
e&&e.addEventListener("input",n),t&&t.addEventListener("input",n)}},updateManualInputs:function(){const e=this.currentSize,t=document.getElementById(`filterLength_${r}`),n=document.getElementById(`filterWidth_${r}`)
if(!(!t||!n))if(e==="all")t.value="",n.value=""
else{const i=e.split(/[xX]/).map(a=>a.trim())
i.length===2&&(t.value=i[0],n.value=i[1])}},updateSizeDropdownFromManual:function(){const e=document.getElementById(`filterLength_${r}`),t=document.getElementById(`filterWidth_${r}`)
if(!e||!t)return
const n=e.value,i=t.value
if(n&&i){const a=`${n} x ${i}`,l=`${i} x ${n}`,o=this.trays.find(y=>y.size===a||y.size===l)
o?this.currentSize=o.size:this.currentSize="all"}else this.currentSize="all"
this.updatePillFilters()},filterResults:function(){var v,S
const e=this.currentManufacturer||"all",t=this.currentSerie||"all",n=this.currentForm||"all",i=this.currentSize||"all",a=((v=document.getElementById(`filterLength_${r}`))==null?void 0:v.value)||"",l=((S=document.getElementById(`filterWidth_${r}`))==null?void 0:S.value)||"",o=this.isToiletApp||B.toLowerCase().includes("klosett")||B.toLowerCase().includes("wc"),y=this.trays.filter(_=>{if(e!=="all"&&e!=="alle"&&_.manufacturer!==e||t!=="all"&&t!=="alle"&&this.extractSerie(_)!==t)return!1
if(!s){const u=n.toLowerCase(),x=(_.form||"").toLowerCase()
if(u!=="all"&&u!=="alle"&&!x.includes(u)&&!u.includes(x))return!1
if(i!=="all"&&i!=="alle"){if(_.size!==i)return!1}else if(!o&&(a||l)&&_.size&&_.size.includes("x")){const A=_.size.toLowerCase().split("x").map(H=>H.trim())
if(A.length===2){let[H,p]=A.map(c=>parseFloat(c)),k=parseFloat(a),f=parseFloat(l)
const g=c=>c<400?c*10:c
if(a&&l){if(!(g(H)==g(k)&&g(p)==g(f)||g(H)==g(f)&&g(p)==g(k)))return!1}else if(a){if(g(H)!=g(k)&&g(p)!=g(k))return!1}else if(l&&g(H)!=g(f)&&g(p)!=g(f))return!1}}}if(this.currentMontageart!=="alle"&&this.currentMontageart!=="all"){const u=this.classifyAccessory(_)
if(u!=="common"&&u!==this.currentMontageart)return!1
if(u==="common"){let hasMatch=false;if(_.mountingMaterials){_.mountingMaterials.forEach(mat=>{const mc=this.classifyAccessory(mat);if(mc===this.currentMontageart){hasMatch=true}else if(mc==="common"&&mat.options&&mat.options[0]){if(this.classifyAccessory(mat.options[0])===this.currentMontageart){hasMatch=true}}})};if(!hasMatch&&_.mountingMaterials&&_.mountingMaterials.length>0)return!1}}return!0})
console.log(`[Configurator] ${B} Filter Results: ${y.length} of ${this.trays.length} visible. (M:${e}, S:${t}, F:${n})`),document.getElementById(`resultCount_${r}`).textContent=y.length
const M=document.getElementById(`searchResults_${r}`)
if(M.innerHTML="",y.length===0){M.innerHTML='<div class="no-results">Keine Produkte gefunden. Bitte Filter anpassen.</div>'
return}y.forEach(_=>{const u=document.createElement("button")
u.className=`result-item-card ${this.selectedTray&&this.selectedTray.id===_.id?"active":""}`,u.innerHTML=`
                        <div class="card-img-wrapper">
                            ${_.imgUrl ? `<img src="${_.imgUrl}">` : '<i class="ri-image-line placeholder-icon"></i>'}
                        </div>
                        <div class="result-info">
                            <strong>${_.label}</strong>
                            <div class="result-meta">
                                <span>${_.manufacturer}</span> ${s?"":`| <span>${_.size}</span>`}
                            </div>
                            <span class="finish-artnr">${_.artNr}</span>
                        </div>
                    `,u.addEventListener("click",()=>this.selectTray(_.id)),M.appendChild(u)}),this.selectedTray&&(this.renderConfigurator(),this.updateBOM())},selectTray:function(e){this.selectedTray=this.trays.find(t=>t.id===e)
// Do not auto-change currentMontageart on tray select — user controls the filter
this.updatePillFilters()
this.selectedTray.selections={},this.selectedTray.variants&&this.selectedTray.variants.length>0&&(this.selectedTray.selections.__variant__=this.selectedTray.artNr),this.selectedTray.mountingMaterials&&this.selectedTray.mountingMaterials.forEach((t,n)=>{t.options||(t={id:t.id||"mat_"+Math.random().toString(36).substr(2,5),name:t.label?t.label.split(" ")[0]:"Zubehör",options:[{artNr:t.artNr||"",label:t.label||"",type:t.type||"Zubehör"}]},this.selectedTray.mountingMaterials[n]=t),t.options.length>0&&(this.selectedTray.selections[t.id]=t.options[0].artNr)}),this.filterResults(),this.renderConfigurator(),this.updateBOM()},renderConfigurator:function(){const e=document.getElementById(`trayConfigurator_${r}`),t=document.getElementById(`trayConfiguratorInner_${r}`)
t.innerHTML=""
let n=!1
if(this.selectedTray&&this.selectedTray.variants&&this.selectedTray.variants.length>0){n=!0
const a=document.createElement("div")
a.className="filter-group",a.style.marginBottom="1.5rem"
const l=document.createElement("label")
l.textContent="Ausführung / Variante / Farbe"
const o=document.createElement("div")
o.className="finish-buttons-grid",o.style.marginTop="0.5rem"
const y=(v,S)=>{const _=document.createElement("button"),u=this.selectedTray.selections.__variant__===v
_.className=`finish-row-btn ${u?"active":""}`,_.style.width="100%",_.style.display="flex",_.style.alignItems="center"
const x=Be(v),A=ke(S,v)
return _.innerHTML=`
                            <div class="finish-swatch" style="position: relative
 overflow: hidden
 background-color: ${A}
 box-shadow: inset 0 1px 3px rgba(0,0,0,0.15)
 width: 28px
 height: 28px
 border-radius: 50%
 margin-right: 12px
 border: 1px solid rgba(0,0,0,0.2)
">
                                ${x?`<img src="${x}" style="position: absolute
 width: 100%
 height: 100%
 object-fit: cover
 background: #fff
 top: 0
 left: 0
" onerror="this.style.display='none'
">`:""}
                            </div>
                            <div style="flex:1
 text-align:left
">
                                <span style="display:block
 font-weight: 500
">${S}</span>
                                <span class="finish-artnr" style="margin-left: 0
">${v}</span>
                            </div>
                        `,_.addEventListener("click",H=>{this.selectedTray.selections.__variant__=v
const p=S.toLowerCase(),f=["schwarz","black","matt","chrom","weiss","white","gold","bronze","nickel","edelstahl","inox","pvd","messing","brushed","poliert","gebürstet","copper","kupfer"].filter(d=>p.includes(d)),g=v&&String(v).match(/\.(\d{3})(?:\.|$)/),c=g?g[1]:null
this.selectedTray.mountingMaterials.forEach(d=>{if(d.options&&d.options.length>1){let z=null,L=0
d.options.forEach(C=>{let K=0
if(c){const E=C.artNr&&String(C.artNr).match(/\.(\d{3})(?:\.|$)/)
E&&E[1]===c&&(K+=100)}const D=C.label.toLowerCase()
f.forEach(E=>{D.includes(E)&&K++}),K>L&&(L=K,z=C)})
const G=f.some(C=>!["chrom","weiss","white"].includes(C))||c&&!["000","100"].includes(c)
!z&&!G&&(z=d.options[0]),z&&(L>0||!G)&&(this.selectedTray.selections[d.id]=z.artNr)}}),this.updateBOM(),this.renderConfigurator()}),_},M=`Standard ${this.selectedTray.label.split(",").pop().trim()}`
o.appendChild(y(this.selectedTray.artNr,M)),this.selectedTray.variants.forEach(v=>{o.appendChild(y(v.artNr,v.label))}),a.appendChild(l),a.appendChild(o),t.appendChild(a)}if(this.selectedTray&&this.selectedTray.mountingMaterials&&this.selectedTray.mountingMaterials.length>0&&(n=!0),!n){e.style.display="none"
return}if(e.style.display="block",this.currentMontageart==="wannenträger"&&!this.selectedTray.mountingMaterials.some(l=>{var y
const o=(y=l.options)==null?void 0:y[0]
return o&&this.classifyAccessory(o)==="wannenträger"})){const l=document.createElement("div")
l.className="compatibility-warning",l.innerHTML=`
                            <div style="background: rgba(255, 152, 0, 0.1)
 border: 1px solid rgba(255, 152, 0, 0.3)
 color: #e65100
 padding: 1rem
 border-radius: 8px
 font-size: 0.9rem
 margin-bottom: 1.5rem
 display: flex
 align-items: start
 gap: 0.75rem
">
                                <span style="font-size: 1.2rem
">⚠️</span>
                                <div>
                                    <strong style="display: block
 margin-bottom: 0.25rem
">Kein Wannenträger verfügbar</strong>
                                    Diese Duschwanne ist nicht carrier-kompatibel oder es wurde kein passender Träger im Pool gefunden. Bitte nutzen Sie das <strong>Montagerahmen-System</strong>.
                                </div>
                            </div>
                        `,t.appendChild(l)}[...this.selectedTray.mountingMaterials].sort((a,l)=>{const o=y=>{const M=(y.name||"").toLowerCase()
return M.includes("sitz")||M.includes("deckel")?2:M.includes("platte")||M.includes("betätigung")?3:M.includes("schall")||M.includes("isolation")?4:M.includes("manschette")||M.includes("garnitur")?5:99}
return o(a)-o(l)}).forEach(a=>{if(!a.options||a.options.length===0)return
const l=this.classifyAccessory(a.options[0])!=="common"?this.classifyAccessory(a.options[0]):this.classifyAccessory(a)
if(this.currentMontageart!=="alle"&&l!=="common"&&l!==this.currentMontageart)return
const o=document.createElement("div")
o.className="filter-group"
const y=document.createElement("label")
y.textContent=a.name||"Zubehör"
const M=window.productApps&&window.productApps.zubehoer_pool?window.productApps.zubehoer_pool.trays:[]
if(a.options.length===1){const v=a.options[0],S=M.find(u=>u.artNr===v.artNr),_=S?S.label:v.label
o.innerHTML=`<label>${a.name}</label>
                            <div style="background:var(--bg-surface)
 padding:0.75rem
 border-radius:6px
 font-size:0.85rem
 color:var(--text-primary)
 border:1px solid var(--border)
">
                                <strong style="display:block
 margin-bottom:0.25rem
">${_}</strong>
                                <span style="color:var(--text-secondary)
 font-family:monospace
">${v.artNr}</span>
                            </div>`}else{const v=document.createElement("select")
v.className="filter-select",a.options.forEach(S=>{const _=M.find(A=>A.artNr===S.artNr),u=_?_.label:S.label,x=document.createElement("option")
x.value=S.artNr,x.textContent=S.dropdownLabel?S.dropdownLabel:`${u} (${S.artNr})`,this.selectedTray.selections[a.id]===S.artNr&&(x.selected=!0),v.appendChild(x)}),v.addEventListener("change",S=>{this.selectedTray.selections[a.id]=S.target.value,this.updateBOM()}),o.appendChild(y),o.appendChild(v)}t.appendChild(o)})},clearBOM:function(){me.textContent="0 Artikel ausgewählt",re.innerHTML='<tr><td colspan="5" style="text-align: center  color: #9da3ad  padding: 2rem ">Bitte wählen Sie ein Produkt aus den Suchergebnissen.</td></tr>'},updateBOM:function(){if(!this.selectedTray)return
const e=this.selectedTray.mountingMaterials||[]
re.innerHTML=""
const t=[],n=B.toLowerCase(),i=n.includes("wandklosett"),a=n.includes("standklosett"),l=n.includes("wanne")||n.includes("duschfläche")
let o=this.selectedTray.artNr,y=this.selectedTray.label,M=this.selectedTray.menge||1
if(this.selectedTray.selections.__variant__&&this.selectedTray.selections.__variant__!==this.selectedTray.artNr){const p=(this.selectedTray.variants||[]).find(k=>k.artNr===this.selectedTray.selections.__variant__)
p&&(o=p.artNr,y=p.label,M=p.menge||1)}const v=o==="2111 845.100.000"||o==="3231 113.100.000",S=v?2:1
if(t.push({artNr:o,label:y,typ:B,menge:M,img:this.selectedTray.imgUrl||this.mainImgUrl,note:"Hauptartikel",priority:S}),a){const p=y.toLowerCase(),k=p.includes("einbauspülkasten")||p.includes("einbauspulkasten"),f=k?1:2
t[t.length-1].priority=f
const g=window.productApps&&window.productApps.zubehoer_pool?window.productApps.zubehoer_pool.trays:[]
e.forEach(c=>{const d=this.selectedTray.selections[c.id],z=(c.options||[]).find(b=>b.artNr===d)||c.options&&c.options[0]
if(!z)return
const L=this.classifyAccessory(z)!=="common"?this.classifyAccessory(z):this.classifyAccessory(c)
if(this.currentMontageart!=="alle"&&L!=="common"&&L!==this.currentMontageart)return
const G=g.find(b=>b.artNr===z.artNr),C=G?G.label:z.label,K=G&&G.imgUrl?G.imgUrl:z.imgUrl
C.toLowerCase()
const D=c.name.toLowerCase()
let E=99
const h=c.name||"Zubehör"
k?D==="wc-sitz"||D==="klosettsitz"?E=2:D==="betätigungsplatte"?E=3:D==="schallschutz"?E=4:D==="befestigungsschrauben"?E=5:D==="ablaufmanschette"?E=6:D==="duofix element"||z.artNr==="3612 348.000.000"?E=7:D==="rückwandbefestigungssatz"||z.artNr==="3612 500.000.000"?E=8:(D==="ablaufbogen"||z.artNr==="3612 374.000.000")&&(E=9):D==="spülkasten"?E=1:D==="wc-sitz"||D==="klosettsitz"?E=3:D==="schallschutz"?E=4:D==="befestigungsschrauben"?E=5:D==="ablaufanschluss"&&(E=6),t.push({artNr:z.artNr,label:C,typ:z.type||c.name||"Zubehör",menge:z.menge||1,img:K,note:h,priority:E})})}else l?e.forEach(p=>{const k=this.selectedTray.selections[p.id],f=(p.options||[]).find(h=>h.artNr===k)||p.options&&p.options[0]
if(!f)return
const g=this.classifyAccessory(f)!=="common"?this.classifyAccessory(f):this.classifyAccessory(p)
if(this.currentMontageart!=="alle"&&g!=="common"&&g!==this.currentMontageart)return
const d=(window.productApps&&window.productApps.zubehoer_pool?window.productApps.zubehoer_pool.trays:[]).find(h=>h.artNr===f.artNr),z=d?d.label:f.label,L=d&&d.imgUrl?d.imgUrl:f.imgUrl,G=(z+" "+(f.type||p.name||"")).toLowerCase()
let C=99
const K=p.name||"Zubehör"
const matNameL=(p.name||"").toLowerCase()
matNameL.includes("ablaufdeckel")||matNameL.includes("ablaufabdeckung")?C=2:matNameL.includes("ablaufgarnitur")||matNameL.includes("siphon")||matNameL.includes("sifon")?C=3:matNameL.includes("dichtband")||matNameL.includes("wannenband")||matNameL.includes("zargen")?C=4:(G.includes("deckel")&&!G.includes("ohne ablaufdeckel")&&!G.includes("ohne deckel"))?C=2:G.includes("ablauf")||G.includes("siphon")||G.includes("garnitur")||G.includes("sifon")?C=3:G.includes("dichtband")||G.includes("wannenband")||G.includes("zargen")||G.includes("dichtset")?C=4:G.includes("träger")||G.includes("rahmen")||G.includes("wannenträger")||G.includes("montagerahmen")?C=5:G.includes("schaum")||G.includes("fuss")||G.includes("füsse")||G.includes("mittenabstütz")||G.includes("wannenanker")||G.includes("stütz")?C=6:G.includes("schall")||G.includes("isolation")?C=7:C=8
let D=f.menge||1
const E=(this.selectedTray.label||"").toLowerCase()
if(E.includes("calima")&&G.includes("stelz")){const h=E.match(/(\d{3,4})\s*x\s*(\d{3,4})/)
if(h){const b=Math.max(parseInt(h[1]),parseInt(h[2])),U=Math.min(parseInt(h[1]),parseInt(h[2]))
let W=16
U<=700?b<=1e3?W=12:b<=1300?W=15:b<=1600?W=18:W=21:b<=1e3?W=16:b<=1300?W=20:b<=1600?W=24:W=28,D=Math.ceil(W/4)}}
t.push({artNr:f.artNr,label:z,typ:f.type||p.name||"Zubehör",menge:D,img:L,note:K,priority:C})
if(p.bundle&&p.bundle.length>0){const bundlePool=window.productApps&&window.productApps.zubehoer_pool?window.productApps.zubehoer_pool.trays:[]
p.bundle.forEach(bItem=>{const bPoolItem=bundlePool.find(x=>x.artNr===bItem.artNr),bLabel=bPoolItem?bPoolItem.label:bItem.label,bImg=bPoolItem&&bPoolItem.imgUrl?bPoolItem.imgUrl:bItem.imgUrl,bG=(bLabel+" "+(bItem.type||"")).toLowerCase()
let bPriority=99
bG.includes("schaum")||bG.includes("kleber")?bPriority=6:bG.includes("schall")||bG.includes("isolation")?bPriority=7:bPriority=8
t.push({artNr:bItem.artNr,label:bLabel,typ:bItem.type||"Zubehör",menge:bItem.menge||1,img:bImg,note:K,priority:bPriority})})}}):e.forEach(p=>{const k=this.selectedTray.selections[p.id],f=(p.options||[]).find(h=>h.artNr===k)||p.options&&p.options[0]
if(!f)return
const g=this.classifyAccessory(f)!=="common"?this.classifyAccessory(f):this.classifyAccessory(p)
if(this.currentMontageart!=="alle"&&g!=="common"&&g!==this.currentMontageart)return
const d=(window.productApps&&window.productApps.zubehoer_pool?window.productApps.zubehoer_pool.trays:[]).find(h=>h.artNr===f.artNr),z=d?d.label:f.label,L=d&&d.imgUrl?d.imgUrl:f.imgUrl,G=z.toLowerCase(),C=(f.type||p.name||"").toLowerCase(),K=G+" "+C
let D=99,E=p.name||"Zubehör"
K.includes("sitz")||K.includes("deckel")?D=v?3:2:K.includes("platte")||K.includes("betätigung")?D=3:K.includes("schall")||K.includes("isolation")?D=v?5:4:K.includes("reservoir")||K.includes("spülkasten")||K.includes("ap128")||K.includes("ap116")?D=1:(K.includes("manschette")||K.includes("garnitur")||K.includes("ablaufanschluss")||f.artNr.includes("3241 116")||f.artNr.includes("3241 101")||f.artNr.includes("3241 102"))&&(D=5),t.push({artNr:f.artNr,label:z,typ:f.type||p.name||"Zubehör",menge:f.menge||1,img:L,note:E,priority:D})})
if(i){const p=y.toLowerCase(),k=window.productApps&&window.productApps.zubehoer_pool?window.productApps.zubehoer_pool.trays:[],f=g=>{const c=k.find(d=>d.artNr===g)
return c?{artNr:c.artNr,label:c.label,img:c.imgUrl}:null}
if(v){const g=f("8211 114.000.000")||{artNr:"8211 114.000.000",label:"Befestigungsschrauben"}
t.push({...g,typ:"Technik",menge:2,priority:4,note:"Aufputz-Technik"})}else{const g=p.includes("manschette")||p.includes("garnitur"),c=t.some(G=>G.priority===5)
if(!g&&!c){const G=f("3241 101.000.000")||{artNr:"3241 101.000.000",label:"Manschettengarnitur"}
t.push({...G,typ:"Technik",menge:1,priority:5,note:"Standard-Technik"})}const d=f("3612 348.000.000")||{artNr:"3612 348.000.000",label:"Wandklosettelement Geberit Duofix"}
t.push({...d,typ:"Technik",menge:1,priority:6,note:"Standard-Technik"})
const z=f("3612 500.000.000")||{artNr:"3612 500.000.000",label:"Rückwandbefestigungssatz Geberit Duofix"}
t.push({...z,typ:"Technik",menge:1,priority:7,note:"Standard-Technik"})
const L=f("3612 374.000.000")||{artNr:"3612 374.000.000",label:"Ablaufbogen Geberit- Silent"}
t.push({...L,typ:"Technik",menge:1,priority:8,note:"Standard-Technik"})}}const _=y.toLowerCase(),u=_.includes("pack")||/m\.\s*(klosett|wc-)?sitz/.test(_)||/inkl\.\s*(klosett|wc-)?sitz/.test(_)||/\bset\b/.test(_)&&!_.includes("schallschutz"),x=_.includes("inkl. schall")||_.includes("m. schall")||_.includes("schallschutz-set")||_.includes("schallschutzset")||_.includes("inkl. isolation")
let A=t.sort((p,k)=>p.priority-k.priority)
u&&(A=A.filter(p=>p.priority!==2)),x&&(A=A.filter(p=>p.priority!==4))
A=A.filter(p=>p.artNr!=='none'&&p.menge!==0)
let H=0
A.forEach(p=>{
if(!p.artNr||p.artNr==='none'||p.menge===0||p.label.toLowerCase().startsWith("ohne"))return;
const k=document.createElement("tr")
k.innerHTML=`
                        <td><div class="img-cell" ${p.img?"":'style="background: transparent  border: 1px dashed var(--border) "'}>
                            ${p.img?`<img src="${p.img}" alt="${p.label}">`:'<i class="ri-settings-3-line" style="font-size:1.2rem opacity:0.3 "></i>'}
                        </div></td>
                        <td><span class="bom-code">${p.artNr}</span></td>
                        <td>
                            <div class="bom-desc">${p.label}</div>
                            <div style="font-size: 0.8rem
 color: #9e9e9e
 margin-top: 0.25rem
">${p.note}</div>
                        </td>
                        
                        <td><strong>${p.menge}</strong></td>
                    `,re.appendChild(k),H+=p.menge}),me.textContent=`${H} Artikel benötigt`},copyToClipboard:function(){if(!this.selectedTray){alert("Bitte wählen Sie zuerst ein Produkt aus.")
return}const e=B.toLowerCase(),t=e.includes("wandklosett"),n=e.includes("standklosett")
let i=[]
if(t||n){const l=document.getElementById("bomTableBody")
if(l)l.querySelectorAll("tr").forEach(y=>{const M=y.querySelector(".bom-code"),v=y.querySelector("strong")
if(M&&v){const S=M.textContent.replace(/\t/g,"").trim(),_=v.textContent.replace(/\t/g,"").trim()
if(S&&S!=="none"&&_!=="0")i.push(`${S}	${_}`)}})
else{alert("Tabelle konnte nicht gefunden werden.")
return}}else{let l=this.selectedTray.selections&&this.selectedTray.selections.__variant__?this.selectedTray.selections.__variant__:this.selectedTray.artNr,o=1
if(this.selectedTray.selections&&this.selectedTray.selections.__variant__&&this.selectedTray.selections.__variant__!==this.selectedTray.artNr){const M=(this.selectedTray.variants||[]).find(v=>v.artNr===this.selectedTray.selections.__variant__)
M&&(o=M.menge||1)}else o=this.selectedTray.menge||1
i=[`${(l||"").toString().replace(/\t/g,"").trim()}	${o}`],(this.selectedTray.mountingMaterials||[]).forEach(M=>{if(!M.options||M.options.length===0)return
const v=this.classifyAccessory(M.options[0])!=="common"?this.classifyAccessory(M.options[0]):this.classifyAccessory(M)
if(this.currentMontageart!=="alle"&&v!=="common"&&v!==this.currentMontageart)return
const S=this.selectedTray.selections[M.id],_=(M.options||[]).find(u=>u.artNr===S)||M.options&&M.options[0]
if(_&&_.artNr&&_.artNr!=="none"&&!_.label.toLowerCase().startsWith("ohne")){let u=(_.artNr||"").toString().replace(/\t/g,"").trim()
i.push(`${u}	${_.menge||1}`)}})}const a=i.join(`
`)
navigator.clipboard.writeText(a).then(()=>{alert(`Artikel und Menge kopiert für SAP:

`+a.replace(/\t/g,"    "))}).catch(l=>alert("Kopieren fehlgeschlagen."))}}}
    return pt(title, desc, mainImgUrl);
}

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
        currentAccessoiresSerie: 'all',
        selectedAccessoires: [],
        extractSerie: function (t) {
            if (t.serie) return t.serie;
            let cleaned = (t.label || t.name || '').trim().toLowerCase();
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

            // 2. Strip manufacturer name from the front if present
            if (manufacturer && cleaned.startsWith(manufacturer)) {
                cleaned = cleaned.substring(manufacturer.length).trim();
                if (['-', ':', '/', ','].includes(cleaned[0])) cleaned = cleaned.substring(1).trim();
            }

            // 3. Extract the first part of what remains (usually the series name)
            const match = cleaned.match(/^(.*?)(?:\s+\d+\s*[xX]\s*\d+|\s*,|\s*\(|\s+-|\s+\d)/);
            let serie = match && match[1] ? match[1].trim() : cleaned.trim();

            const isAccessory = ['papierhalter', 'reserverollenhalter', 'klosettbürstenhalter', 'wc-bürste', 'seifenhalter', 'seifenspender', 'glashalter', 'doppelglashalter', 'handtuchhalter', 'handtuchring', 'handtuchhaken', 'badetuchstange', 'hakenleiste', 'drahtseifenhalter', 'duschkorb', 'schwammhalter', 'accessoire'].some(kw => (t.label||'').toLowerCase().includes(kw));
            if (isAccessory && serie.includes(' ')) serie = serie.split(' ')[0];

            // 4. Capitalize each word
            serie = serie.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

            return serie || 'Andere';
        },
        getUniqueValues: function (key) {
            if (key === 'serie') {
                return [...new Set(this.trays.map(t => this.extractSerie(t)))].sort();
            }
            return [...new Set(this.trays.map(t => t[key]))].sort();
        },
        classifyAccessory: function (obj) {
            if (!obj) return 'common';
            // Detect main tray object using mountingMaterials. For toilets, extract explicit montage info from description.
            if (obj.mountingMaterials !== undefined) {
                const label = (obj.label || obj.name || '').toLowerCase();
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

            // 2. Clean input data
            const label = (obj.label || obj.name || '').toLowerCase();
            const artNr = (obj.artNr || '').replace(/\s/g, '');

            // 3. HARD EXCEPTIONS (Firm IDs)
            if (artNr === '1431191.000.000' || artNr === '1431190.000.000') {
                return 'montagerahmen';
            }

            // 4. KEYWORD LOGIC
            // Special Rule: If it mentions schallschutz, it's its own category
            if (label.includes('schallschutzset') || label.includes('schallschutz')) {
                return isMixer ? 'unterputz' : 'schallschutz';
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
                    return 'schallschutz';
                }
                if (label.includes('stelzfüss') || label.includes('stelzfuss')) {
                    return 'stelzfüsse';
                }
            }

            return 'common';
        },
        init: function () {
            this.isToiletApp = (title.toLowerCase().includes('klosett') || title.toLowerCase().includes('wc'));
            this.selectedTray = null;
            this.showAccessoires = false;
            this.currentAccessoiresSerie = 'all';
            this.selectedAccessoires = [];
            this.currentMontageart = 'alle';
            this.currentManufacturer = 'all';
            this.currentSerie = 'all';
            this.currentForm = 'all';
            this.currentSize = 'all';
            this.renderSidebar();
            this.bindFilters();
            this.filterResults(); // initial run
            this.clearBOM();
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
                    
                    <div class="sidebar-section">
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
                            <div class="finder-sub-header">Serie</div>
                            <div class="pill-group" id="list_addon_accessoires_serie_wc_${suffix}" style="margin-bottom: 0.75rem;"></div>
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
            mList.innerHTML = `<button class="pill-btn ${this.currentManufacturer === 'all' ? 'active' : ''}" data-val="all">Alle</button>` + manufacturers.map(m => `
                    <button class="pill-btn ${this.currentManufacturer === m ? 'active' : ''}" data-val="${m}">${m}</button>
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
            serList.innerHTML = `<button class="pill-btn ${this.currentSerie === 'all' ? 'active' : ''}" data-val="all">Alle</button>` + series.map(s => `
                    <button class="pill-btn ${this.currentSerie === s ? 'active' : ''}" data-val="${s}">${s}</button>
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

                fList.innerHTML = `<button class="pill-btn ${this.currentForm === 'all' ? 'active' : ''}" data-val="all">Alle</button>` + forms.map(f => `
                        <button class="pill-btn ${this.currentForm === f ? 'active' : ''}" data-val="${f}">${f}</button>
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
                sList.innerHTML = `<button class="pill-btn ${this.currentSize === 'all' ? 'active' : ''}" data-val="all">Alle</button>` + sizes.map(s => {
                    const btnLabel = config.sizeLabel === 'Breite' ? `bis ${s} cm` : s;
                    return `<button class="pill-btn ${this.currentSize === s ? 'active' : ''}" data-val="${s}">${btnLabel}</button>`;
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
        filterResults: function () {
            const mFilter = this.currentManufacturer || 'all';
            const serieFilter = this.currentSerie || 'all';
            const fFilter = this.currentForm || 'all';
            const sFilter = this.currentSize || 'all';
            const lFilter = document.getElementById(`filterLength_${suffix}`)?.value || '';
            const wFilter = document.getElementById(`filterWidth_${suffix}`)?.value || '';

            const isToilet = this.isToiletApp || (title.toLowerCase().includes('klosett') || title.toLowerCase().includes('wc'));

            const filtered = this.trays.filter(t => {
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
                        // Only run numeric parsing if it's NOT a toilet and looks like "120 x 80"
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
            });

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
                            ${t.imgUrl ? `<img src="${t.imgUrl}">` : '<i class="ri-image-line placeholder-icon"></i>'}
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
        renderGridInMainPanel: function (filtered) {
            bomCountCounter.textContent = filtered.length + ' Produkte gefunden';
            if (filtered.length === 0) {
                bomTableBody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:#9da3ad; padding:2rem;">Keine Produkte gefunden. Bitte passen Sie die Filter an.</td></tr>';
                return;
            }
            let cards = '';
            filtered.forEach(function (t) {
                const imgHTML = t.imgUrl
                    ? '<img src="' + t.imgUrl + '" style="width:100%; height:160px; object-fit:contain; background:white; border-radius:6px; margin-bottom:1rem;" onerror="this.style.display=\'none\'">'
                    : '<div style="height:160px; background:var(--bg-surface); display:flex; align-items:center; justify-content:center; margin-bottom:1rem; border-radius:6px;"><i class="ri-image-line" style="font-size:2.5rem; opacity:0.2;"></i></div>';
                const mfr = t.manufacturer ? '<div style="font-size:0.8rem; color:var(--text-secondary); margin-bottom:0.25rem;">' + t.manufacturer + '</div>' : '';
                const sz = t.size ? '<div style="font-size:0.8rem; color:var(--text-secondary); margin-bottom:0.25rem;">' + t.size + '</div>' : '';
                cards += '<div onclick="window.currentActiveApp.selectTray(\'' + t.id + '\')" style="display:flex; flex-direction:column; cursor:pointer; padding:1rem; border:1px solid var(--border); border-radius:8px; background:var(--bg-surface); transition:transform 0.15s, box-shadow 0.15s;" onmouseover="this.style.transform=\'translateY(-2px)\'; this.style.boxShadow=\'0 6px 20px rgba(0,0,0,0.2)\'" onmouseout="this.style.transform=\'\'; this.style.boxShadow=\'\'">'
                    + imgHTML
                    + '<strong style="margin-bottom:0.4rem; font-size:0.9rem; color:var(--text-primary); line-height:1.3;">' + t.label + '</strong>'
                    + mfr + sz
                    + '<div style="margin-top:auto; padding-top:0.6rem; border-top:1px solid var(--border); font-size:0.8rem; color:var(--text-secondary);">Art-Nr: <strong style="font-family:monospace;">' + t.artNr + '</strong></div>'
                    + '</div>';
            });
            bomTableBody.innerHTML = '<tr><td colspan="5" style="padding:0; border:none;"><div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(260px, 1fr)); gap:1.25rem; padding:1.25rem;">' + cards + '</div></td></tr>';
        },
        selectTray: function (id) {
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
                        this.selectedTray.selections[mat.id] = mat.options[0].artNr;
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
            if (this.selectedTray && this.selectedTray.mountingMaterials && this.selectedTray.mountingMaterials.length > 0) {
                hasConfig = true;
            }

            if (!hasConfig) {
                configBlock.style.display = 'none';
                return;
            }

            configBlock.style.display = 'block';

            // --- Technical Compatibility Warning ---
            if (this.currentMontageart === 'wannenträger') {
                const hasCarrier = this.selectedTray.mountingMaterials.some(m => {
                    const firstOpt = m.options?.[0];
                    return firstOpt && this.classifyAccessory(firstOpt) === 'wannenträger';
                });

                if (!hasCarrier) {
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
            }

            // Create a sorted copy of mountingMaterials for UI rendering
            const sortedMaterials = [...this.selectedTray.mountingMaterials].sort((a, b) => {
                const getPri = (mat) => {
                    const lbl = (mat.name || '').toLowerCase();
                    if (lbl.includes('deckel') || lbl.includes('haube') || lbl.includes('sitz')) return 2;
                    if (lbl.includes('ablauf') || lbl.includes('garnitur') || lbl.includes('siphon') || lbl.includes('sifon')) return 3;
                    if (lbl.includes('band') || lbl.includes('dicht')) return 4;
                    if (lbl.includes('rahmen') || lbl.includes('träger')) return 5;
                    if (lbl.includes('platte') || lbl.includes('betätigung')) return 6;
                    if (lbl.includes('schaum') || lbl.includes('fuss') || lbl.includes('füsse') || lbl.includes('stütz')) return 7;
                    if (lbl.includes('schall') || lbl.includes('isolation')) return 8;
                    if (lbl.includes('manschette')) return 9;
                    return 99;
                };
                return getPri(a) - getPri(b);
            });

            sortedMaterials.forEach(mat => {
                if (!mat.options || mat.options.length === 0) return;

                const matClass = this.classifyAccessory(mat.options[0]) !== 'common' ? this.classifyAccessory(mat.options[0]) : this.classifyAccessory(mat);

                if (this.currentMontageart !== 'alle') {
                    if (matClass !== 'common' && matClass !== this.currentMontageart) return;
                }

                const groupDiv = document.createElement('div');
                groupDiv.className = 'filter-group';
                const label = document.createElement('label');
                label.textContent = mat.name || "Zubehör";

                const zubPool = (window.productApps && window.productApps['zubehoer_pool']) ? window.productApps['zubehoer_pool'].trays : [];

                if (mat.options.length === 1) {
                    const opt = mat.options[0];
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
                    mat.options.forEach(opt => {
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
            
            
            const serieListEl = document.getElementById(`list_addon_accessoires_serie_wc_${suffix}`);
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
            bomTableBody.innerHTML = '';
        },
        updateBOM: function () {
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

                    finalBOM.push({
                        artNr: selectedOption.artNr,
                        label: enrichedLabel,
                        typ: selectedOption.type || mat.name || 'Zubehör',
                        menge: calculatedMenge,
                        img: enrichedImg,
                        note: note,
                        priority: priority
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
            sortedBOM.forEach(item => {
                if (!item.artNr || item.artNr === 'none' || item.menge === 0 || (item.label && item.label.toLowerCase().startsWith('ohne'))) return;
                const row = document.createElement('tr');
                row.innerHTML = `
                        <td><div class="img-cell" ${!item.img ? 'style="background: transparent; border: 1px dashed var(--border);"' : ''}>
                            ${item.img ? `<img src="${item.img}" alt="${item.label}">` : '<i class="ri-settings-3-line" style="font-size:1.2rem;opacity:0.3;"></i>'}
                        </div></td>
                        <td><span class="bom-code">${item.artNr}</span></td>
                        <td>
                            <div class="bom-desc">${item.label}</div>
                            <div style="font-size: 0.8rem; color: #9e9e9e; margin-top: 0.25rem;">${item.note}</div>
                        </td>
                        
                        <td><strong>${item.menge}</strong></td>
                    `;
                bomTableBody.appendChild(row);
                totalCount += item.menge;
            });

            bomCountCounter.textContent = `${totalCount} Artikel benötigt`;
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
                        const codeSpan = row.querySelector('.bom-code');
                        const qtyStrong = row.querySelector('strong');
                        if (codeSpan && qtyStrong) {
                            const code = codeSpan.textContent.replace(/\t/g, '').trim();
                            const menge = qtyStrong.textContent.replace(/\t/g, '').trim();
                            textLines.push(`${code}\t${menge}`);
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
            navigator.clipboard.writeText(text).then(() => {
                alert("Artikel und Menge kopiert für SAP:\n\n" + text.replace(/\t/g, "    "));
            }).catch(e => alert("Kopieren fehlgeschlagen."));
        }
    };
}




export function createDuschenwanneApp(title, desc, mainImgUrl, config = {}) {
    return createRelationalApp(title, desc, mainImgUrl, config);
}

export function createDuschenrinneApp(title, desc, mainImgUrl, config = {}) {
    return createRelationalApp(title, desc, mainImgUrl, {
        montageLabel1: 'Wand',
        montageLabel2: 'Raum',
        sizeLabel: 'Breite',
        hideForm: true,
        hideManualSizeInputs: true,
        ...config
    });
}

export function createBadewanneApp(title, desc, mainImgUrl, config = {}) {
    return createRelationalApp(title, desc, mainImgUrl, config);
}
