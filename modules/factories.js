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

const applyPillUI = (headId, listId, currentVal, title, resetFn) => {
    const head = document.getElementById(headId);
    const list = document.getElementById(listId);
    if (!head || !list) return;

    if (currentVal !== 'all' && currentVal !== 'alle') {
        head.innerHTML = `<span class="pill-title-active">${title}: <strong>${currentVal}</strong></span> <button class="pill-reset-btn">Reset</button>`;
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
                            <div class="finish-buttons-grid" id="finishOptionsContainer_${title.replace(/\s/g,'')}"></div>
                        </div>
                    </div>
                `;
                const container = document.getElementById(`finishOptionsContainer_${title.replace(/\s/g,'')}`);
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
                        <td><span class="bom-type">Sichtteil</span></td>
                        <td><strong>${finishMenge}</strong></td>
                    </tr>
                    <tr>
                        <td><div class="img-cell"><img src="${this.baseBody.imgUrl}"></div></td>
                        <td><span class="bom-code">${this.baseBody.artNr}</span></td>
                        <td><div class="bom-desc">${this.baseBody.label}</div><div style="font-size: 0.8rem; color: #9e9e9e; margin-top: 0.25rem;">Zwingendes Einbauteil</div></td>
                        <td><span class="bom-type">Grundkörper</span></td>
                        <td><strong>${baseMenge}</strong></td>
                    </tr>
                `;
            },
            copyToClipboard: function () {
                const finish = this.finishes.find(f => f.id === this.currentFinishId) || this.finishes[0];
                if (!finish) return;
                const text = `${finish.artNr}\t${finish.menge || 1}\n${this.baseBody.artNr}\t${this.baseBody.menge || 1}`;
                navigator.clipboard.writeText(text).then(() => alert("SAP Format kopiert:\n\n" + text.replace(/\t/g,"    "))).catch(e => alert("Fehler."));
            }
        };
    }

export function createRelationalApp(title, desc, mainImgUrl, config = {}) {
    const isMixer = config.isMixer || title.toLowerCase().includes('mischer') || title.toLowerCase().includes('armatur');
    const montageLabel1 = config.montageLabel1 || (isMixer ? "Aufputz" : "Wannenträger");
    const montageLabel2 = config.montageLabel2 || (isMixer ? "Unterputz" : "Montagerahmen");
    const montageLabel3 = config.montageLabel3 || "";
    const hideSizeForm = config.hideSizeForm || isMixer;
    const suffix = title.replace(/\s/g,'');

    return {
            trays: [],
            mainImgUrl: mainImgUrl,
            selectedTray: null,
            normalizeSerie: function (label, manufacturer = '') {
                let s = String(label || '').toLowerCase().trim();
                const m = String(manufacturer || '').toLowerCase();
                
                // Remove leading junk and prefixes
                s = s.replace(/^[-\s/]+/, '')
                     .replace(/^-?\s*endmontageset\b/, '')
                     .replace(/^-?\s*fertigmontageset\b/, '')
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
                
                const typeKeywords = ["aufputz-duschenmischer", "unterputz-duschenmischer", "duschenmischer", "duschmischer", "aufputz-bademischer", "unterputz-bademischer", "bademischer", "waschtischmischer", "thermostatmischer", "thermostat-duschenmischer", "einhebelmischer", "einlochmischer", "mischer"];
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
            getUniqueValues: function (key) {
                if (key === 'serie') {
                    return [...new Set(this.trays.map(t => this.extractSerie(t)))].sort();
                }
                return [...new Set(this.trays.map(t => t[key]))].sort();
            },
            classifyAccessory: function (obj) {
                if (!obj) return 'common';
                
                // 1. Check for manual admin override first
                if (obj.overrideMontageart && obj.overrideMontageart !== 'auto') {
                    return obj.overrideMontageart.toLowerCase();
                }

                // 2. Clean input data
                const label = (obj.label || obj.name || '').toLowerCase();
                const artNr = (obj.artNr || '').replace(/\s/g, '');

                // 3. HARD EXCEPTIONS (Firm IDs)
                if (artNr === '1445782.000.000' || artNr === '1441782.000.000') {
                    return 'wannenträger';
                }
                if (artNr === '1431191.000.000' || artNr === '1431190.000.000' || artNr === '1435435.000.000') {
                    return 'montagerahmen';
                }

                // 4. KEYWORD LOGIC
                // Special Rule: If it mentions "schallschutz", it's ALWAYS Montagerahmen (unless it matched the IDs above)
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
                    // STRICT RULE for Standklosett:
                    // Unterputz ONLY if description explicitly states 'Einbauspülkasten'
                    // Everything else is Aufputz
                    if (lblLower.includes('einbauspülkasten') || lblLower.includes('einbauspulkasten')) {
                        return 'unterputz';
                    }
                    return 'aufputz';
                } else {
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
                        return 'montagerahmen';
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
                        <div class="filter-group">
                            <div class="finder-sub-header" id="head_rel_form_${suffix}">${formLabel}</div>
                            <div class="pill-group" id="list_rel_form_${suffix}"></div>
                        </div>
                        
                        <div class="filter-group">
                            <div class="finder-sub-header" id="head_rel_size_${suffix}">Grösse</div>
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
                        <div id="trayConfiguratorInner_${title.replace(/\s/g,'')}"></div>
                    </div>
                `;
                this.updatePillFilters();
            },
            updatePillFilters: function() {
                const suffix = title.replace(/\s/g,'');
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
                    const sizes = [...new Set(validTraysForSize.map(t => t.size))].sort();
                    sList.innerHTML = `<button class="pill-btn ${this.currentSize === 'all' ? 'active' : ''}" data-val="all">Alle</button>` + sizes.map(s => `
                        <button class="pill-btn ${this.currentSize === s ? 'active' : ''}" data-val="${s}">${s}</button>
                    `).join('');
                    applyPillUI(`head_rel_size_${suffix}`, `list_rel_size_${suffix}`, this.currentSize, 'Grösse', () => {
                        this.currentSize = 'all';
                        this.updatePillFilters();
                        this.filterResults();
                    });
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
                    if (parts.length === 2) {
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
                                if (parts.length === 2) {
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
                    return;
                }

                filtered.forEach(t => {
                    const btn = document.createElement('button');
                    btn.className = `result-item-btn ${this.selectedTray && this.selectedTray.id === t.id ? 'active' : ''}`;
                    btn.innerHTML = `
                        <div class="result-info">
                            <strong>${t.label}</strong>
                            <div class="result-meta">
                                <span>${t.manufacturer}</span> ${hideSizeForm ? '' : `| <span>${t.size}</span>`}
                            </div>
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
                                id: mat.id || 'mat_'+Math.random().toString(36).substr(2,5),
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
                        if (lbl.includes('sitz') || lbl.includes('deckel')) return 2;
                        if (lbl.includes('platte') || lbl.includes('betätigung')) return 3;
                        if (lbl.includes('schall') || lbl.includes('isolation')) return 4;
                        if (lbl.includes('manschette') || lbl.includes('garnitur')) return 5;
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
                            else if (matName === 'befestigungsschrauben') priority = 5;
                            else if (matName === 'ablaufmanschette') priority = 6;
                            else if (matName === 'duofix element' || selectedOption.artNr === '3612 348.000.000') priority = 7;
                            else if (matName === 'rückwandbefestigungssatz' || selectedOption.artNr === '3612 500.000.000') priority = 8;
                            else if (matName === 'ablaufbogen' || selectedOption.artNr === '3612 374.000.000') priority = 9;
                        } else {
                            // AUFPUTZ: 1=Spülkasten 2=Klosett 3=Sitz 4=Schall 5=Screws 6=Ablaufanschluss
                            if (matName === 'spülkasten') priority = 1;
                            else if (matName === 'wc-sitz' || matName === 'klosettsitz') priority = 3;
                            else if (matName === 'schallschutz') priority = 4;
                            else if (matName === 'befestigungsschrauben') priority = 5;
                            else if (matName === 'ablaufanschluss') priority = 6;
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

                        const combinedLbl = (enrichedLabel + ' ' + (selectedOption.type || mat.name || '')).toLowerCase();

                        let priority = 99; // Fallback
                        const note = mat.name || 'Zubehör';

                        // 1. Wanne / Duschfläche (Handled earlier, priority: 1)
                        // 2. Ablaufdeckel
                        // 3. Ablaufgarnitur / Sifon
                        // 4. Zargen-Wannendichtband
                        // 5. Wannenträger OR Montagerahmen
                        // 6. Montageschaum OR Fussset OR Mittenabstützsystem
                        // 7. Schallschutzset

                        if (combinedLbl.includes('deckel')) priority = 2;
                        else if (combinedLbl.includes('ablauf') || combinedLbl.includes('siphon') || combinedLbl.includes('garnitur') || combinedLbl.includes('sifon')) priority = 3;
                        else if (combinedLbl.includes('dichtband') || combinedLbl.includes('wannenband') || combinedLbl.includes('zargen') || combinedLbl.includes('dichtset')) priority = 4;
                        else if (combinedLbl.includes('träger') || combinedLbl.includes('rahmen') || combinedLbl.includes('wannenträger') || combinedLbl.includes('montagerahmen')) priority = 5;
                        else if (combinedLbl.includes('schaum') || combinedLbl.includes('fuss') || combinedLbl.includes('füsse') || combinedLbl.includes('mittenabstütz') || combinedLbl.includes('wannenanker') || combinedLbl.includes('stütz')) priority = 6;
                        else if (combinedLbl.includes('schall') || combinedLbl.includes('isolation')) priority = 7;
                        else priority = 8; // Any generic unclassified accessories

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
                        <td><span class="bom-type">${item.typ}</span></td>
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
                            textLines.push(`${code}\t${menge}`);
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
    const suffix = title.replace(/\s/g,'');

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

        updatePillFilters: function() {
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
                if(sA !== sB) return sA.localeCompare(sB);
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
                btn.className = `result-item-btn ${this.selectedTray && this.selectedTray.id === t.id ? 'active' : ''}`;
                
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
                <td><span class="bom-type">Zubehör</span></td>
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
                <td><span class="bom-type">Keramik</span></td>
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
                        <td><span class="bom-type">${selectedOption.type || mat.name || 'Zubehör'}</span></td>
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
    const suffix = title.replace(/\s/g,'');

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
            lbl = lbl.replace(/A\s*\d+/i, '').trim();

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
            if (key === 'ausladung') return [...new Set(nonAblaufTrays.map(t => this.extractAusladung(t)))].filter(a => a !== 'unknown').sort((a,b) => parseInt(a) - parseInt(b));
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

        updatePillFilters: function() {
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
            const ausladungen = [...new Set(validForAusl.map(t => this.extractAusladung(t)))].filter(a => a !== 'unknown').sort((a,b) => parseInt(a) - parseInt(b));
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
                        ablaufTrays.sort((a,b) => {
                            const al = (a.label||'').toLowerCase();
                            const bl = (b.label||'').toLowerCase();
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
                    
                    ablaufTrays.sort((a,b) => {
                       const al = (a.label||'').toLowerCase();
                       const bl = (b.label||'').toLowerCase();
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
                    <td><span class="bom-type">Mischer</span></td>
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
                            <td><span class="bom-type">${selectedOption.type || 'Zubehör'}</span></td>
                            <td><strong>${optionMenge}</strong></td>
                        </tr>
                    `;
                    count += optionMenge;

                    const nativeTray = this.trays.find(t => t.artNr === selectedOption.artNr);
                    if (nativeTray && nativeTray.mountingMaterials) {
                        nativeTray.mountingMaterials.forEach(subMat => {
                            const subOpt = subMat.options && subMat.options[0];
                            if(subOpt) {
                                bomHtml += `
                                    <tr style="background-color: rgba(59, 130, 246, 0.03);">
                                        <td><div class="img-cell">${(subOpt.imgUrl && !subOpt.label.toLowerCase().includes('einbaukosten') && !subOpt.label.toLowerCase().includes('montage')) ? `<img src="${subOpt.imgUrl}" onerror="this.parentNode.innerHTML='<div style=\\'width:40px;height:40px;background:#e0e7ff;border-radius:4px;display:flex;align-items:center;justify-content:center;color:#4f46e5;\\'>&#9874;</div>'" style="width:40px;height:40px;object-fit:contain;">` : `<div style="width:40px;height:40px;background:#e0e7ff;border-radius:4px;display:flex;align-items:center;justify-content:center;color:#4f46e5;"><i class="ri-tools-fill"></i></div>`}</div></td>
                                        <td><span class="bom-code">${subOpt.artNr}</span></td>
                                        <td><div class="bom-desc">${subOpt.label}</div><div style="font-size:0.8rem;color:#3b82f6;margin-top:0.2rem;">Serviceleistung (für ${mat.name})</div></td>
                                        <td><span class="bom-type">Dienstleistung</span></td>
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
                'wandmischer', 'einlochmischer', 'mischer', 'batterie', 'armatur'
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
                            <div class="finder-sub-header">Marke</div>
                            <div class="pill-group" id="list_spiegelschrank_brand" style="margin-bottom: 0.75rem;"></div>
                            
                            <div class="finder-sub-header">Serie</div>
                            <div class="pill-group" id="list_spiegelschrank_serie" style="margin-bottom: 0.75rem;"></div>

                            <div class="finder-sub-header">Modell wählen</div>
                            <div class="finder-list" id="list_addon_spiegelschrank"></div>
                        </div>
                        <div id="addon_accessoires_panel" class="addon-panel" style="display:none;">
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
            serieList.innerHTML = f8.length === 0 ? '<div class="no-results">Keine Waschtische gefunden.</div>' : f8.sort((a,b) => {
                const sA = this.extractSerie(a).toLowerCase();
                const sB = this.extractSerie(b).toLowerCase();
                if(sA !== sB) return sA.localeCompare(sB);
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
            lbl = lbl.replace(/A\s*\d+/i, '').trim();

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
            const ausladungen = [...new Set(f3.map(t => this.extractAusladung(t)))].filter(a => a !== 'unknown').sort((a,b) => parseInt(a) - parseInt(b));
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

            const itemsHTML = f7.length === 0 ? '<div class="no-results">Keine Armaturen gefunden.</div>' : f7.sort((a,b) => {
                const sA = this.extractFaucetSerie(a).toLowerCase();
                const sB = this.extractFaucetSerie(b).toLowerCase();
                if(sA !== sB) return sA.localeCompare(sB);
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
                            if (t === 'accessoires') this.selectedAccessoires = [];
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
                accessoires: ['accessoire', 'seifenspender', 'handtuchring', 'handtuchhalter', 'ablage', 'zahnbürstenhalter', 'wc-bürste']
            };

            const keywords = keywordMap[target] || [];

            // 1. Search all app data for matching products (Gather Base Candidates)
            let baseCandidates = [];
            const allApps = window.productApps || {};
            Object.values(allApps).forEach(app => {
                // Relational apps use 'trays', Mix & Match uses 'basinTrays'/'faucets'
                const items = app.trays || app.basinTrays || app.faucets || [];
                items.forEach(t => {
                    const lbl = (t.label || t.name || '').toLowerCase();
                    if (keywords.some(k => lbl.includes(k))) {
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
                            if (!matchFound) {
                                const basinSerie = this.extractSerie(this.selectedBasin).toLowerCase();
                                const tSerie = this.extractSerie(t).toLowerCase();
                                if (!tSerie.includes(basinSerie) && !basinSerie.includes(tSerie)) return;
                            }
                        }
                        baseCandidates.push(t);
                    }
                });
            });

            // Deduplicate baseCandidates by artNr
            const seenArt = new Set();
            baseCandidates = baseCandidates.filter(c => {
                if (!c.artNr || seenArt.has(c.artNr)) return false;
                seenArt.add(c.artNr); return true;
            });

            let displayCandidates = baseCandidates;

            // 2. Handle Pill Filters for Spiegelschrank
            if (target === 'spiegelschrank') {
                const brandListEl = document.getElementById('list_spiegelschrank_brand');
                const serieListEl = document.getElementById('list_spiegelschrank_serie');

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
                    const series = [...new Set(fSeries.map(c => this.extractSerie(c)))].sort();

                    serieListEl.innerHTML = `<button class="pill-btn ${this.currentSpiegelschrankSerie === 'all' ? 'active' : ''}" data-val="all">Alle</button>` + 
                        series.map(s => `<button class="pill-btn ${this.currentSpiegelschrankSerie === s ? 'active' : ''}" data-val="${s}">${s}</button>`).join('');

                    serieListEl.querySelectorAll('.pill-btn').forEach(btn => {
                        btn.addEventListener('click', () => {
                            this.currentSpiegelschrankSerie = btn.dataset.val;
                            this.populateAddonPanel('spiegelschrank');
                        });
                    });

                    // Final display filtering
                    if (this.currentSpiegelschrankBrand !== 'all') displayCandidates = displayCandidates.filter(c => c.manufacturer === this.currentSpiegelschrankBrand);
                    if (this.currentSpiegelschrankSerie !== 'all') displayCandidates = displayCandidates.filter(c => this.extractSerie(c) === this.currentSpiegelschrankSerie);
                }
            }

            if (displayCandidates.length === 0) {
                const serieInfo = this.selectedBasin ? ` für "${this.extractSerie(this.selectedBasin)}"` : '';
                listEl.innerHTML = `<div class="finder-empty-state" style="font-size:0.8rem;">Keine passenden Produkte${serieInfo} gefunden.</div>`;
                return;
            }

            const isMulti = target === 'accessoires';
            listEl.innerHTML = displayCandidates.map(c => {
                const isSelected = isMulti
                    ? this.selectedAccessoires.includes(c.artNr)
                    : (target === 'moebel' ? this.selectedMoebel === c.artNr : this.selectedSpiegelschrank === c.artNr);
                return `
                    <div class="finder-item ${isSelected ? 'active' : ''}" data-artnr="${c.artNr}" data-target="${target}" title="${c.artNr}">
                        <div style="display:flex; align-items:center; gap:0.5rem;">
                            ${c.imgUrl ? `<img src="${c.imgUrl}" style="width:32px; height:32px; object-fit:contain; background:#fff; border-radius:4px; padding:2px; flex-shrink:0;">` : ''}
                            <div>
                                <div style="font-size:0.8rem; font-weight:500; line-height:1.3;">${this.cleanLabel(c)}</div>
                                <div style="font-size:0.7rem; color:var(--text-secondary); font-family:monospace;">${c.artNr}</div>
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
                        <td><span class="bom-type">${isService ? 'Dienstleistung' : 'Artikel'}</span></td>
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
    const isBath = config.isBath || false;
    const suffix = title.replace(/\s/g,'');

    return {
        trays: [],
        mainImgUrl: mainImgUrl,
        selectedTray: null,
        mischerOptionsState: {},

	        currentHersteller: 'all',
	        currentMontage: 'all',
	        currentSerie: 'all',

        init: function () {
            this.selectedTray = null;
            this.mischerOptionsState = {};
            this.currentHersteller = 'all';
            this.currentMontage = 'all';
            this.currentSerie = 'all';
            
            this.renderSidebar();
            this.bindFilters();
            this.filterResults();
            this.clearBOM();
        },

	        normalizeDuschenmischerSerie: function (value, manufacturer = '') {
	            let serie = String(value || '').toLowerCase().trim();
	            const brand = String(manufacturer || '').toLowerCase();

	            serie = serie
	                .replace(/^[-\s/]+/, '')
	                .replace(/^-?\s*endmontageset\b/, '')
	                .replace(/^-?\s*fertigmontageset\b/, '')
	                .replace(/^[-\s/]+/, '');

	            if (brand && serie.startsWith(brand)) {
	                serie = serie.slice(brand.length).trim();
	            }
	            if (brand) {
	                serie = serie.replace(new RegExp(`\\b${brand.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi'), '').trim();
	            }

	            serie = serie
	                .replace(/^[-\s/]+/, '')
	                .replace(/\babdeckplatte\b.*$/i, '')
	                .replace(/\bdurchflussleistung\b.*$/i, '')
	                .replace(/\bohne einbaukörper\b.*$/i, '')
	                .replace(/\benergieeffizienzklasse\b.*$/i, '')
	                .replace(/\bgeräuschgruppe\b.*$/i, '')
	                .replace(/\barmhebel\b.*$/i, '')
	                .replace(/\bselbstschliessend\b.*$/i, '')
	                .replace(/\btemperaturgriff\b.*$/i, '')
	                .replace(/^thermostat\s+/i, '')
	                .replace(/\s+½[\"”]?\s+thermostat\b.*$/i, '')
	                .replace(/\s+thermostat\b.*$/i, '')
	                .replace(/\bmit sicherheitstaste\b.*$/i, '')
	                .replace(/\b1-weg\b.*$/i, '')
	                .replace(/\s+½[\"”]?$/i, '')
	                .replace(/\bav\.0\b/g, 'ava 2.0')
	                .replace(/\bvit\.0\b/g, 'vita 2.0')
	                .replace(/\s*,\s*$/g, '')
	                .replace(/\s+/g, ' ')
	                .trim();

	            if (!serie) return 'Andere';

	            return serie.split(' ').map(w => {
	                if (/^kwc$/i.test(w)) return 'KWC';
	                if (/^\d/.test(w)) return w;
	                return w.charAt(0).toUpperCase() + w.slice(1);
	            }).join(' ');
	        },

	        extractSerie: function (t) {
	            if (t.serie) {
	                return this.normalizeDuschenmischerSerie(t.serie, t.manufacturer);
	            }

            // Product-type prefixes to strip from labels
            const typePrefixes = [
                'aufputz-duschenmischer', 'unterputz-duschenmischer',
                'duschenmischer', 'duschmischer',
                'aufputz-bademischer', 'unterputz-bademischer',
                'bademischer', 'waschtischmischer',
                'thermostatmischer', 'thermostat-duschenmischer',
                'einhebelmischer', 'einlochmischer', 'mischer'
            ];

            let cleaned = (t.label || '').toLowerCase();

            // 1. Strip manufacturer name from the start
            if (t.manufacturer) {
                const mLower = t.manufacturer.toLowerCase();
                if (cleaned.startsWith(mLower)) {
                    cleaned = cleaned.slice(mLower.length).trim();
                }
            }

            // 2. Strip product-type prefix
            for (const prefix of typePrefixes) {
                if (cleaned.startsWith(prefix)) {
                    cleaned = cleaned.slice(prefix.length).trim();
                    break;
                }
            }

            // 3. Remove "endmontageset" specifically (often follows a hyphen)
            cleaned = cleaned.replace(/-?endmontageset/g, '').trim();
            cleaned = cleaned.replace(/-?fertigmontageset/g, '').trim();

            // 4. Strip manufacturer name AGAIN (in case it was after the prefix)
            if (t.manufacturer) {
                const mLower = t.manufacturer.toLowerCase();
                if (cleaned.startsWith(mLower)) {
                    cleaned = cleaned.slice(mLower.length).trim();
                }
            }

            // Take only the part before a size, comma, bracket or number
            const match = cleaned.match(/^(.*?)(?:\s+\d+\s*[xX]\s*\d+|\s*,|\s*\(|\s+-|\s+\d+mm|\s+\d+\s*mm)/);
	            let serie = match && match[1] ? match[1].trim() : cleaned.trim();

	            return this.normalizeDuschenmischerSerie(serie, t.manufacturer);

	            // Title-case
	            serie = serie.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

            return serie || 'Andere';
        },

        extractMontage: function (t) {
            const label = (t.label || '').toLowerCase();

            // --- Unterputz detection ---
            if (
                label.includes('unterputz') ||
                label.includes(' up ') ||
                label.includes('einbau') ||
                label.includes('endmontageset') ||
                label.includes('grundkörper') ||
                label.includes('grundkoerper')
            ) return 'Unterputz';

            // --- Aufputz detection ---
            if (
                label.includes('aufputz') ||
                label.includes(' ap ') ||
                label.includes('wandbatterie') ||
                label.includes('wandmischer') ||
                label.includes('ad 153 mm') ||   // KWC/Alterna Aufputz identifier
                label.includes('aufputz-duschenmischer') ||
                label.includes('thermostat-duschenmischer')
            ) return 'Aufputz';

            // --- Bademischer specific ---
            if (isBath && (label.includes('standmodell') || label.includes('freistehend'))) return 'Standmodell';

            return 'Aufputz';
        },

        getUniqueValues: function (key, filteredTrays) {
            const src = filteredTrays || this.trays;
            if (key === 'hersteller') {
                const list = this.trays.map(t => t.manufacturer || 'Andere');
                return [...new Set(list)].filter(Boolean).sort();
            }
            if (key === 'montage') return [...new Set(src.map(t => this.extractMontage(t)))].sort();
            if (key === 'serie') return [...new Set(src.map(t => this.extractSerie(t)))].sort();
            return [];
        },

        renderSidebar: function () {
            const configSidebar = document.getElementById('configSidebar');
            if(!configSidebar) return;
            
            // Get filtered sets for dependent UI
            const traysForMontage = this.currentHersteller === 'all' 
                ? this.trays 
                : this.trays.filter(t => t.manufacturer === this.currentHersteller);
            
            const traysForSerie = traysForMontage.filter(t => {
                if (this.currentMontage === 'all') return true;
                return this.extractMontage(t) === this.currentMontage;
            });

            const herstellers = this.getUniqueValues('hersteller');
            const series = this.getUniqueValues('serie', traysForSerie);
            const montages = this.getUniqueValues('montage', traysForMontage);

            configSidebar.innerHTML = `
                <div class="sidebar-section">
                    <h2 style="margin-bottom: 1.5rem; display: flex; align-items: center; gap: 0.5rem;">
                        <i class="ri-filter-3-line" style="color: var(--accent);"></i> Filter
                    </h2>

                    <div class="filter-group">
                        <label id="head_hersteller_${suffix}" class="filter-label">Hersteller</label>
                        <div class="pill-group" id="list_hersteller_${suffix}">
                            <button class="pill-btn ${this.currentHersteller === 'all' ? 'active' : ''}" data-key="Hersteller" data-val="all">Alle</button>
                            ${herstellers.map(h => `<button class="pill-btn ${this.currentHersteller === h ? 'active' : ''}" data-key="Hersteller" data-val="${h}">${h}</button>`).join('')}
                        </div>
                    </div>

                    <div class="filter-group">
                        <label id="head_montage_${suffix}" class="filter-label">Montageart</label>
                        <div class="pill-group" id="list_montage_${suffix}">
                            <button class="pill-btn ${this.currentMontage === 'all' ? 'active' : ''}" data-key="Montage" data-val="all">Alle</button>
                            ${montages.map(m => `<button class="pill-btn ${this.currentMontage === m ? 'active' : ''}" data-key="Montage" data-val="${m}">${m}</button>`).join('')}
                        </div>
                    </div>

                    <div class="filter-group">
                        <label id="head_serie_${suffix}" class="filter-label">Serie</label>
                        <div class="pill-group" id="list_serie_${suffix}">
                            <button class="pill-btn ${this.currentSerie === 'all' ? 'active' : ''}" data-key="Serie" data-val="all">Alle</button>
                            ${series.map(s => `<button class="pill-btn ${this.currentSerie === s ? 'active' : ''}" data-key="Serie" data-val="${s}">${s}</button>`).join('')}
                        </div>
                    </div>

                    <div class="filter-group" style="margin-top:1.5rem; padding-top:1.5rem; border-top: 1px solid var(--border);">
                        <label class="filter-label">Suche</label>
                        <input type="text" id="input_search_${suffix}" class="filter-select" placeholder="Art.Nr. oder Name...">
                    </div>
                </div>
                
                <div class="sidebar-section">
                    <h2>Suchergebnisse <span id="resultCount_${suffix}" class="badge">0</span></h2>
                    <div class="search-results-container" id="searchResults_${suffix}"></div>
                </div>

                <div class="sidebar-section" id="trayConfigurator_${suffix}" style="display:none; margin-top:2rem;">
                    <h2>Konfiguration</h2>
                    <p class="section-desc">Bestimmen Sie das benötigte Zubehör.</p>
                    <div id="trayConfiguratorInner_${suffix}"></div>
                </div>
            `;

            // Bind pill buttons via addEventListener
            configSidebar.querySelectorAll('.pill-btn[data-key]').forEach(btn => {
                btn.addEventListener('click', () => {
                    this.setFilter(btn.dataset.key, btn.dataset.val);
                });
            });

            // Apply Smart Collapse
            applyPillUI(`head_hersteller_${suffix}`, `list_hersteller_${suffix}`, this.currentHersteller, 'Hersteller', () => this.setFilter('Hersteller', 'all'));
            applyPillUI(`head_montage_${suffix}`, `list_montage_${suffix}`, this.currentMontage, 'Montageart', () => this.setFilter('Montage', 'all'));
            applyPillUI(`head_serie_${suffix}`, `list_serie_${suffix}`, this.currentSerie, 'Serie', () => this.setFilter('Serie', 'all'));

            const searchInput = document.getElementById(`input_search_${suffix}`);
            if (searchInput) {
                searchInput.addEventListener('input', () => this.filterResults());
            }
            this.filterResults();
        },

        setFilter: function (key, val) {
            this[`current${key}`] = val;
            this.renderSidebar();
        },

        bindFilters: function () {
            // Deprecated - Handled by inline onclicks in Pill UI
        },

        filterResults: function () {
            const container = document.getElementById(`searchResults_${suffix}`);
            const countSpan = document.getElementById(`resultCount_${suffix}`);
            const search = (document.getElementById(`input_search_${suffix}`)?.value || '').toLowerCase();
            if (!container) return;

            let results = this.trays;

            if (this.currentHersteller !== 'all') {
                results = results.filter(t => t.manufacturer === this.currentHersteller);
            }
            if (this.currentSerie !== 'all') {
                results = results.filter(t => this.extractSerie(t) === this.currentSerie);
            }
            if (this.currentMontage !== 'all') {
                results = results.filter(t => this.extractMontage(t) === this.currentMontage);
            }
            if (search) {
                results = results.filter(t => (t.label || '').toLowerCase().includes(search) || (t.artNr || '').toLowerCase().includes(search));
            }

            countSpan.textContent = results.length;

            if (results.length === 0) {
                container.innerHTML = '<div style="padding:2rem; text-align:center; color:var(--text-secondary);">Keine Produkte gefunden. Bitte passen Sie die Filter an.</div>';
                return;
            }

            container.innerHTML = results.map(t => {
                const isSel = this.selectedTray && this.selectedTray.id === t.id;
                const imgStr = t.imgUrl ? `<img src="${t.imgUrl}" style="max-width:100%; max-height:100%; object-fit:contain;">` : `<div style="font-size:10px; color:#bbb;">No Image</div>`;
                
                return `
                    <div class="result-item-btn ${isSel ? 'active' : ''}" data-tid="${t.id}" style="display:flex; align-items:center; gap:0.6rem; padding:0.5rem; margin-bottom:5px; border-radius:8px; min-height:54px; overflow:hidden; border:1px solid var(--border);">
                        <div style="width:38px; height:38px; background:#fff; border-radius:5px; flex-shrink:0; padding:2px; display:flex; align-items:center; justify-content:center; border:1px solid var(--border);">
                           ${imgStr}
                        </div>
                        <div class="result-info" style="flex:1; text-align:left; min-width:0; line-height:1.2;">
                            <strong style="display:block; font-size:0.85rem; margin-bottom:1px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; color:var(--text-primary);">${this.extractSerie(t)}</strong>
                            <div class="result-meta" style="font-size:0.7rem; color:var(--text-secondary); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
                                <span style="font-weight:600; color:var(--accent);">${t.artNr}</span> <span style="opacity:0.5; margin:0 2px;">|</span> ${this.extractMontage(t)}
                            </div>
                        </div>
                        <i class="ri-checkbox-circle-fill" style="color:var(--accent); font-size:1.1rem; flex-shrink:0; ${isSel?'':'display:none;'}"></i>
                    </div>
                `;
            }).join('');
            
            container.querySelectorAll('.result-item-btn').forEach(el => {
                el.addEventListener('click', () => {
                    this.selectItem(el.dataset.tid);
                });
            });
        },

        selectItem: function(id) {
            this.selectedTray = this.trays.find(t => t.id === id);
            this.mischerOptionsState = {}; 
            
            // Auto-select first accessory from each group
            if (this.selectedTray && this.selectedTray.mountingMaterials) {
                this.selectedTray.mountingMaterials.forEach((mat, mIdx) => {
                    if (mat.options && mat.options.length > 0) {
                        this.mischerOptionsState[mIdx] = 0; // Pre-select first option
                    }
                });
            }

            this.filterResults();
            this.renderConfigurator();
            this.updateBOM();
        },

        isMatVisible: function(mat, mIdx) {
            if (!this.selectedTray || !this.selectedTray.mountingMaterials) return true;
            
            const matName = (mat.name || '').toLowerCase();
            
            // Logic for Duschengleitstange
            if (matName.includes('duschengleitstange')) {
                // Find Brausehalter
                const bhIdx = this.selectedTray.mountingMaterials.findIndex(m => (m.name || '').toLowerCase().includes('brausehalter'));
                if (bhIdx >= 0) {
                    const selectedBhIdx = this.mischerOptionsState[bhIdx];
                    if (selectedBhIdx !== undefined) {
                        const opt = this.selectedTray.mountingMaterials[bhIdx].options[selectedBhIdx];
                        if (opt && opt.label && opt.label.toLowerCase().startsWith('ohne')) {
                            return true; // Show Duschengleitstange
                        } else {
                            return false; // Hide Duschengleitstange if Brausehalter is NOT "ohne"
                        }
                    }
                }
            }
            return true;
        },

        renderConfigurator: function () {
            const conf = document.getElementById(`trayConfigurator_${suffix}`);
            const inner = document.getElementById(`trayConfiguratorInner_${suffix}`);
            
            if (!this.selectedTray) {
                if(conf) conf.style.display = 'none';
                return;
            }
            if(conf) conf.style.display = 'block';
            if(!inner) return;
            inner.innerHTML = '';
            
            const materials = this.selectedTray.mountingMaterials || [];
            if (materials.length === 0) {
                inner.innerHTML = '<p class="section-desc">Kein spezifisches Zubehör verfügbar.</p>';
                return;
            }

            materials.forEach((mat, mIdx) => {
                if (!this.isMatVisible(mat, mIdx)) return;
                
                const groupDiv = document.createElement('div');
                groupDiv.className = 'filter-group';
                groupDiv.style.marginBottom = '1.25rem';
                
                const selectedIdx = this.mischerOptionsState[mIdx];
                const selectedOpt = (selectedIdx !== undefined) ? mat.options[selectedIdx] : null;
                const thumbUrl = selectedOpt?.imgUrl || '';
                
                const hasMultiple = mat.options.length > 1;
                
                groupDiv.innerHTML = `
                    <label style="display:block; margin-bottom:0.4rem; font-size:0.85rem; color:var(--text-secondary); text-transform:uppercase; letter-spacing:0.5px;">${mat.name || 'Zubehör'}</label>
                    <div style="display:flex; align-items:center; gap:0.75rem;">
                        <div style="width:40px; height:40px; background:#fff; border-radius:4px; border:1px solid var(--border); display:flex; align-items:center; justify-content:center; padding:2px; flex-shrink:0;">
                            ${thumbUrl ? `<img src="${thumbUrl}" style="max-width:100%; max-height:100%; object-fit:contain;">` : '<i class="ri-image-line" style="color:#ddd;"></i>'}
                        </div>
                        <div style="flex:1; position:relative;">
                            <select class="filter-select mischer-acc-select" data-midx="${mIdx}" style="width:100%; padding-right:2rem; ${!hasMultiple ? 'pointer-events:none; background-image:none !important;' : ''}">
                                ${mat.options.map((opt, oIdx) => `
                                    <option value="${oIdx}" ${selectedIdx == oIdx ? 'selected' : ''}>${opt.label} (${opt.artNr})</option>
                                `).join('')}
                            </select>
                            ${hasMultiple ? `<i class="ri-arrow-down-s-line" style="position:absolute; right:10px; top:50%; transform:translateY(-50%); pointer-events:none; color:var(--text-secondary); font-size:1.2rem;"></i>` : ''}
                        </div>
                    </div>
                `;
                inner.appendChild(groupDiv);
            });
            
            inner.querySelectorAll('.mischer-acc-select').forEach(sel => {
                sel.addEventListener('change', (e) => {
                    const mIdx = parseInt(sel.dataset.midx);
                    const oIdx = parseInt(sel.value);
                    this.mischerOptionsState[mIdx] = oIdx;
                    this.renderConfigurator();
                    this.updateBOM();
                });
            });
        },

        updateBOM: function () {
            const bomTableBody = document.getElementById('bomTableBody');
            const bomCount = document.getElementById('bomCount');
            if(!bomTableBody) return;
            bomTableBody.innerHTML = '';
            
            if (!this.selectedTray) {
                if(bomCount) bomCount.textContent = '0 Artikel';
                return;
            }
            
            let total = 1;
            bomTableBody.innerHTML += `
                <tr class="bom-main-item">
                    <td><div class="img-cell"><img src="${this.selectedTray.imgUrl || ''}"></div></td>
                    <td><span class="bom-code">${this.selectedTray.artNr}</span></td>
                    <td><div class="bom-desc">${this.selectedTray.label}</div></td>
                    <td><span class="bom-type">Hauptprodukt</span></td>
                    <td><strong>1</strong></td>
                </tr>
            `;

            if (this.selectedTray.mountingMaterials) {
                this.selectedTray.mountingMaterials.forEach((mat, mIdx) => {
                    if (!this.isMatVisible(mat, mIdx)) return;

                    const oIdx = this.mischerOptionsState[mIdx];
                    if (oIdx !== undefined) {
                        const opt = mat.options[oIdx];
                        if (opt && !opt.label.toLowerCase().startsWith('ohne')) {
                            const menge = opt.menge || 1;
                            total += menge;
                            bomTableBody.innerHTML += `
                                <tr>
                                    <td><div class="img-cell"><img src="${opt.imgUrl || ''}"></div></td>
                                    <td><span class="bom-code">${opt.artNr}</span></td>
                                    <td><div class="bom-desc">${opt.label}</div></td>
                                    <td><span class="bom-type">${mat.name || 'Zubehör'}</span></td>
                                    <td><strong>${menge}</strong></td>
                                </tr>
                            `;
                        }
                    }
                });
            }
            
            if(bomCount) bomCount.textContent = `${total} Artikel gewählt`;
        },

        clearBOM: function() {
            this.mischerOptionsState = {};
            this.updateBOM();
        },

        copyToClipboard: function () {
            if (!this.selectedTray) return;
            let list = [`${this.selectedTray.artNr}\t1`];
            if (this.selectedTray.mountingMaterials) {
                this.selectedTray.mountingMaterials.forEach((mat, mIdx) => {
                    if (!this.isMatVisible(mat, mIdx)) return;

                    const oIdx = this.mischerOptionsState[mIdx];
                    if (oIdx !== undefined) {
                        const opt = mat.options[oIdx];
                        if (opt && !opt.label.toLowerCase().startsWith('ohne')) {
                            list.push(`${opt.artNr}\t${opt.menge || 1}`);
                        }
                    }
                });
            }
            navigator.clipboard.writeText(list.join('\n')).then(() => alert('Stückliste kopiert!'));
        }
    };
}

export function createBademischerApp(title, desc, mainImgUrl, config = {}) {
    const isBath = config.isBath || false;
    const suffix = title.replace(/\s/g,'');

    return {
        trays: [],
        mainImgUrl: mainImgUrl,
        selectedTray: null,
        mischerOptionsState: {},

	        currentHersteller: 'all',
	        currentMontage: 'all',
	        currentSerie: 'all',

        init: function () {
            this.selectedTray = null;
            this.mischerOptionsState = {};
            this.currentHersteller = 'all';
            this.currentMontage = 'all';
            this.currentSerie = 'all';
            
            this.renderSidebar();
            this.bindFilters();
            this.filterResults();
            this.clearBOM();
        },

	        normalizeBademischerSerie: function (value, manufacturer = '') {
	            let serie = String(value || '').toLowerCase().trim();
	            const brand = String(manufacturer || '').toLowerCase();

	            serie = serie
	                .replace(/^[-\s/]+/, '')
	                .replace(/^-?\s*endmontageset\b/, '')
	                .replace(/^-?\s*fertigmontageset\b/, '')
	                .replace(/^[-\s/]+/, '');

	            if (brand && serie.startsWith(brand)) {
	                serie = serie.slice(brand.length).trim();
	            }
	            if (brand) {
	                serie = serie.replace(new RegExp(`\\b${brand.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi'), '').trim();
	            }

	            serie = serie
	                .replace(/^[-\s/]+/, '')
	                .replace(/\babdeckplatte\b.*$/i, '')
	                .replace(/\bdurchflussleistung\b.*$/i, '')
	                .replace(/\bohne einbaukörper\b.*$/i, '')
	                .replace(/\benergieeffizienzklasse\b.*$/i, '')
	                .replace(/\bgeräuschgruppe\b.*$/i, '')
	                .replace(/\barmhebel\b.*$/i, '')
	                .replace(/\bselbstschliessend\b.*$/i, '')
	                .replace(/\btemperaturgriff\b.*$/i, '')
	                .replace(/^thermostat\s+/i, '')
	                .replace(/\s+½[\"”]?\s+thermostat\b.*$/i, '')
	                .replace(/\s+thermostat\b.*$/i, '')
	                .replace(/\bmit sicherheitstaste\b.*$/i, '')
	                .replace(/\b1-weg\b.*$/i, '')
	                .replace(/\s+½[\"”]?$/i, '')
	                .replace(/\bav\.0\b/g, 'ava 2.0')
	                .replace(/\bvit\.0\b/g, 'vita 2.0')
	                .replace(/\s*,\s*$/g, '')
	                .replace(/\s+/g, ' ')
	                .trim();

	            if (!serie) return 'Andere';

	            return serie.split(' ').map(w => {
	                if (/^kwc$/i.test(w)) return 'KWC';
	                if (/^\d/.test(w)) return w;
	                return w.charAt(0).toUpperCase() + w.slice(1);
	            }).join(' ');
	        },

	        extractSerie: function (t) {
	            if (t.serie) {
	                return this.normalizeBademischerSerie(t.serie, t.manufacturer);
	            }

            // Product-type prefixes to strip from labels
            const typePrefixes = [
                'aufputz-duschenmischer', 'unterputz-duschenmischer',
                'duschenmischer', 'duschmischer',
                'aufputz-bademischer', 'unterputz-bademischer',
                'bademischer', 'waschtischmischer',
                'thermostatmischer', 'thermostat-duschenmischer',
                'einhebelmischer', 'einlochmischer', 'mischer'
            ];

            let cleaned = (t.label || '').toLowerCase();

            // 1. Strip manufacturer name from the start
            if (t.manufacturer) {
                const mLower = t.manufacturer.toLowerCase();
                if (cleaned.startsWith(mLower)) {
                    cleaned = cleaned.slice(mLower.length).trim();
                }
            }

            // 2. Strip product-type prefix
            for (const prefix of typePrefixes) {
                if (cleaned.startsWith(prefix)) {
                    cleaned = cleaned.slice(prefix.length).trim();
                    break;
                }
            }

            // 3. Remove "endmontageset" specifically (often follows a hyphen)
            cleaned = cleaned.replace(/-?endmontageset/g, '').trim();
            cleaned = cleaned.replace(/-?fertigmontageset/g, '').trim();

            // 4. Strip manufacturer name AGAIN (in case it was after the prefix)
            if (t.manufacturer) {
                const mLower = t.manufacturer.toLowerCase();
                if (cleaned.startsWith(mLower)) {
                    cleaned = cleaned.slice(mLower.length).trim();
                }
            }

            // Take only the part before a size, comma, bracket or number
            const match = cleaned.match(/^(.*?)(?:\s+\d+\s*[xX]\s*\d+|\s*,|\s*\(|\s+-|\s+\d+mm|\s+\d+\s*mm)/);
	            let serie = match && match[1] ? match[1].trim() : cleaned.trim();

	            return this.normalizeBademischerSerie(serie, t.manufacturer);

	            // Title-case
	            serie = serie.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

            return serie || 'Andere';
        },

        extractMontage: function (t) {
            const label = (t.label || '').toLowerCase();

            // --- Bademischer specific (Standmodell priority) ---
            if (isBath && (label.includes('standmodell') || label.includes('freistehend'))) return 'Standmodell';

            // --- Unterputz detection ---
            if (
                label.includes('unterputz') ||
                label.includes(' up ') ||
                label.includes('einbau') ||
                label.includes('endmontageset') ||
                label.includes('grundkörper') ||
                label.includes('grundkoerper')
            ) return 'Unterputz';

            // --- Aufputz detection ---
            if (
                label.includes('aufputz') ||
                label.includes(' ap ') ||
                label.includes('wandbatterie') ||
                label.includes('wandmischer') ||
                label.includes('ad 153 mm') ||
                label.includes('aufputz-duschenmischer') ||
                label.includes('thermostat-duschenmischer')
            ) return 'Aufputz';

            return 'Aufputz';
        },

        getUniqueValues: function (key, filteredTrays) {
            const src = filteredTrays || this.trays;
            if (key === 'hersteller') {
                const list = this.trays.map(t => t.manufacturer || 'Andere');
                return [...new Set(list)].filter(Boolean).sort();
            }
            if (key === 'montage') return [...new Set(src.map(t => this.extractMontage(t)))].sort();
            if (key === 'serie') return [...new Set(src.map(t => this.extractSerie(t)))].sort();
            return [];
        },

        renderSidebar: function () {
            const configSidebar = document.getElementById('configSidebar');
            if(!configSidebar) return;
            
            // Get filtered sets for dependent UI
            const traysForMontage = this.currentHersteller === 'all' 
                ? this.trays 
                : this.trays.filter(t => t.manufacturer === this.currentHersteller);
            
            const traysForSerie = traysForMontage.filter(t => {
                if (this.currentMontage === 'all') return true;
                return this.extractMontage(t) === this.currentMontage;
            });

            const herstellers = this.getUniqueValues('hersteller');
            const series = this.getUniqueValues('serie', traysForSerie);
            const montages = this.getUniqueValues('montage', traysForMontage);

            configSidebar.innerHTML = `
                <div class="sidebar-section">
                    <h2 style="margin-bottom: 1.5rem; display: flex; align-items: center; gap: 0.5rem;">
                        <i class="ri-filter-3-line" style="color: var(--accent);"></i> Filter
                    </h2>

                    <div class="filter-group">
                        <label id="head_hersteller_${suffix}" class="filter-label">Hersteller</label>
                        <div class="pill-group" id="list_hersteller_${suffix}">
                            <button class="pill-btn ${this.currentHersteller === 'all' ? 'active' : ''}" data-key="Hersteller" data-val="all">Alle</button>
                            ${herstellers.map(h => `<button class="pill-btn ${this.currentHersteller === h ? 'active' : ''}" data-key="Hersteller" data-val="${h}">${h}</button>`).join('')}
                        </div>
                    </div>

                    <div class="filter-group">
                        <label id="head_montage_${suffix}" class="filter-label">Montageart</label>
                        <div class="pill-group" id="list_montage_${suffix}">
                            <button class="pill-btn ${this.currentMontage === 'all' ? 'active' : ''}" data-key="Montage" data-val="all">Alle</button>
                            ${montages.map(m => `<button class="pill-btn ${this.currentMontage === m ? 'active' : ''}" data-key="Montage" data-val="${m}">${m}</button>`).join('')}
                        </div>
                    </div>

                    <div class="filter-group">
                        <label id="head_serie_${suffix}" class="filter-label">Serie</label>
                        <div class="pill-group" id="list_serie_${suffix}">
                            <button class="pill-btn ${this.currentSerie === 'all' ? 'active' : ''}" data-key="Serie" data-val="all">Alle</button>
                            ${series.map(s => `<button class="pill-btn ${this.currentSerie === s ? 'active' : ''}" data-key="Serie" data-val="${s}">${s}</button>`).join('')}
                        </div>
                    </div>

                    <div class="filter-group" style="margin-top:1.5rem; padding-top:1.5rem; border-top: 1px solid var(--border);">
                        <label class="filter-label">Suche</label>
                        <input type="text" id="input_search_${suffix}" class="filter-select" placeholder="Art.Nr. oder Name...">
                    </div>
                </div>
                
                <div class="sidebar-section">
                    <h2>Suchergebnisse <span id="resultCount_${suffix}" class="badge">0</span></h2>
                    <div class="search-results-container" id="searchResults_${suffix}"></div>
                </div>

                <div class="sidebar-section" id="trayConfigurator_${suffix}" style="display:none; margin-top:2rem;">
                    <h2>Konfiguration</h2>
                    <p class="section-desc">Bestimmen Sie das benötigte Zubehör.</p>
                    <div id="trayConfiguratorInner_${suffix}"></div>
                </div>
            `;

            // Bind pill buttons via addEventListener
            configSidebar.querySelectorAll('.pill-btn[data-key]').forEach(btn => {
                btn.addEventListener('click', () => {
                    this.setFilter(btn.dataset.key, btn.dataset.val);
                });
            });

            // Apply Smart Collapse
            applyPillUI(`head_hersteller_${suffix}`, `list_hersteller_${suffix}`, this.currentHersteller, 'Hersteller', () => this.setFilter('Hersteller', 'all'));
            applyPillUI(`head_montage_${suffix}`, `list_montage_${suffix}`, this.currentMontage, 'Montageart', () => this.setFilter('Montage', 'all'));
            applyPillUI(`head_serie_${suffix}`, `list_serie_${suffix}`, this.currentSerie, 'Serie', () => this.setFilter('Serie', 'all'));

            const searchInput = document.getElementById(`input_search_${suffix}`);
            if (searchInput) {
                searchInput.addEventListener('input', () => this.filterResults());
            }
            this.filterResults();
        },

        setFilter: function (key, val) {
            this[`current${key}`] = val;
            this.renderSidebar();
        },

        bindFilters: function () {
            // Deprecated - Handled by inline onclicks in Pill UI
        },

        filterResults: function () {
            const container = document.getElementById(`searchResults_${suffix}`);
            const countSpan = document.getElementById(`resultCount_${suffix}`);
            const search = (document.getElementById(`input_search_${suffix}`)?.value || '').toLowerCase();
            if (!container) return;

            let results = this.trays;

            if (this.currentHersteller !== 'all') {
                results = results.filter(t => t.manufacturer === this.currentHersteller);
            }
            if (this.currentSerie !== 'all') {
                results = results.filter(t => this.extractSerie(t) === this.currentSerie);
            }
            if (this.currentMontage !== 'all') {
                results = results.filter(t => this.extractMontage(t) === this.currentMontage);
            }
            if (search) {
                results = results.filter(t => (t.label || '').toLowerCase().includes(search) || (t.artNr || '').toLowerCase().includes(search));
            }

            countSpan.textContent = results.length;

            if (results.length === 0) {
                container.innerHTML = '<div style="padding:2rem; text-align:center; color:var(--text-secondary);">Keine Produkte gefunden. Bitte passen Sie die Filter an.</div>';
                return;
            }

            container.innerHTML = results.map(t => {
                const isSel = this.selectedTray && this.selectedTray.id === t.id;
                const imgStr = t.imgUrl ? `<img src="${t.imgUrl}" style="max-width:100%; max-height:100%; object-fit:contain;">` : `<div style="font-size:10px; color:#bbb;">No Image</div>`;
                
                return `
                    <div class="result-item-btn ${isSel ? 'active' : ''}" data-tid="${t.id}" style="display:flex; align-items:center; gap:0.6rem; padding:0.5rem; margin-bottom:5px; border-radius:8px; min-height:54px; overflow:hidden; border:1px solid var(--border);">
                        <div style="width:38px; height:38px; background:#fff; border-radius:5px; flex-shrink:0; padding:2px; display:flex; align-items:center; justify-content:center; border:1px solid var(--border);">
                           ${imgStr}
                        </div>
                        <div class="result-info" style="flex:1; text-align:left; min-width:0; line-height:1.2;">
                            <strong style="display:block; font-size:0.85rem; margin-bottom:1px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; color:var(--text-primary);">${this.extractSerie(t)}</strong>
                            <div class="result-meta" style="font-size:0.7rem; color:var(--text-secondary); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
                                <span style="font-weight:600; color:var(--accent);">${t.artNr}</span> <span style="opacity:0.5; margin:0 2px;">|</span> ${this.extractMontage(t)}
                            </div>
                        </div>
                        <i class="ri-checkbox-circle-fill" style="color:var(--accent); font-size:1.1rem; flex-shrink:0; ${isSel?'':'display:none;'}"></i>
                    </div>
                `;
            }).join('');
            
            container.querySelectorAll('.result-item-btn').forEach(el => {
                el.addEventListener('click', () => {
                    this.selectItem(el.dataset.tid);
                });
            });
        },

        selectItem: function(id) {
            this.selectedTray = this.trays.find(t => t.id === id);
            this.mischerOptionsState = {}; 
            
            // Auto-select first accessory from each group
            if (this.selectedTray && this.selectedTray.mountingMaterials) {
                this.selectedTray.mountingMaterials.forEach((mat, mIdx) => {
                    if (mat.options && mat.options.length > 0) {
                        this.mischerOptionsState[mIdx] = 0; // Pre-select first option
                    }
                });
            }

            this.filterResults();
            this.renderConfigurator();
            this.updateBOM();
        },

        isMatVisible: function(mat, mIdx) {
            if (!this.selectedTray || !this.selectedTray.mountingMaterials) return true;
            
            const matName = (mat.name || '').toLowerCase();
            
            if (matName.includes('brausehalter')) {
                // Hide if Duschgleitstange is NOT "ohne"
                const gsIdx = this.selectedTray.mountingMaterials.findIndex(m => (m.name || '').toLowerCase().includes('duschgleitstange') || (m.name || '').toLowerCase().includes('gleitstange'));
                if (gsIdx >= 0 && this.mischerOptionsState[gsIdx] !== undefined) {
                    const opt = this.selectedTray.mountingMaterials[gsIdx].options[this.mischerOptionsState[gsIdx]];
                    if (opt && !opt.label.toLowerCase().startsWith('ohne')) return false;
                }
                
                // Hide if Anschlussbogen "mit Brausehalter" or "mit integriertem Brausehalter" or "bitte_waehlen"
                const abIdx = this.selectedTray.mountingMaterials.findIndex(m => (m.name || '').toLowerCase().includes('anschlussbogen'));
                if (abIdx >= 0 && this.mischerOptionsState[abIdx] !== undefined) {
                    const opt = this.selectedTray.mountingMaterials[abIdx].options[this.mischerOptionsState[abIdx]];
                    if (opt && opt.label.toLowerCase().includes('mit integriertem brausehalter')) return false;
                    if (opt && opt.label.toLowerCase().includes('mit brausehalter')) return false;
                    if (opt && opt.artNr === 'bitte_waehlen') return false;
                }
            }
            return true;
        },

        renderConfigurator: function () {
            const conf = document.getElementById(`trayConfigurator_${suffix}`);
            const inner = document.getElementById(`trayConfiguratorInner_${suffix}`);
            
            if (!this.selectedTray) {
                if(conf) conf.style.display = 'none';
                return;
            }
            if(conf) conf.style.display = 'block';
            if(!inner) return;
            inner.innerHTML = '';
            
            const materials = this.selectedTray.mountingMaterials || [];
            if (materials.length === 0) {
                inner.innerHTML = '<p class="section-desc">Kein spezifisches Zubehör verfügbar.</p>';
                return;
            }

            materials.forEach((mat, mIdx) => {
                if (!this.isMatVisible(mat, mIdx)) return;
                
                const groupDiv = document.createElement('div');
                groupDiv.className = 'filter-group';
                groupDiv.style.marginBottom = '1.25rem';
                
                const selectedIdx = this.mischerOptionsState[mIdx];
                const selectedOpt = (selectedIdx !== undefined) ? mat.options[selectedIdx] : null;
                const thumbUrl = selectedOpt?.imgUrl || '';
                
                const hasMultiple = mat.options.length > 1;
                
                groupDiv.innerHTML = `
                    <label style="display:block; margin-bottom:0.4rem; font-size:0.85rem; color:var(--text-secondary); text-transform:uppercase; letter-spacing:0.5px;">${mat.name || 'Zubehör'}</label>
                    <div style="display:flex; align-items:center; gap:0.75rem;">
                        <div style="width:40px; height:40px; background:#fff; border-radius:4px; border:1px solid var(--border); display:flex; align-items:center; justify-content:center; padding:2px; flex-shrink:0;">
                            ${thumbUrl ? `<img src="${thumbUrl}" style="max-width:100%; max-height:100%; object-fit:contain;">` : '<i class="ri-image-line" style="color:#ddd;"></i>'}
                        </div>
                        <div style="flex:1; position:relative;">
                            <select class="filter-select mischer-acc-select" data-midx="${mIdx}" style="width:100%; padding-right:2rem; ${!hasMultiple ? 'pointer-events:none; background-image:none !important;' : ''}">
                                ${mat.options.map((opt, oIdx) => `
                                    <option value="${oIdx}" ${selectedIdx == oIdx ? 'selected' : ''}>${opt.label} (${opt.artNr})</option>
                                `).join('')}
                            </select>
                            ${hasMultiple ? `<i class="ri-arrow-down-s-line" style="position:absolute; right:10px; top:50%; transform:translateY(-50%); pointer-events:none; color:var(--text-secondary); font-size:1.2rem;"></i>` : ''}
                        </div>
                    </div>
                `;
                inner.appendChild(groupDiv);
            });
            
            inner.querySelectorAll('.mischer-acc-select').forEach(sel => {
                sel.addEventListener('change', (e) => {
                    const mIdx = parseInt(sel.dataset.midx);
                    const oIdx = parseInt(sel.value);
                    this.mischerOptionsState[mIdx] = oIdx;
                    
                    const mat = this.selectedTray.mountingMaterials[mIdx];
                    const matName = (mat.name || '').toLowerCase();
                    const opt = mat.options[oIdx];
                    
                    // Interaction logic
                    if (matName.includes('gleitstange') || matName.includes('duschgleitstange')) {
                        const schIdx = this.selectedTray.mountingMaterials.findIndex(m => (m.name || '').toLowerCase().includes('brauseschlauch'));
                        if (schIdx >= 0) {
                            const schMat = this.selectedTray.mountingMaterials[schIdx];
                            if (!opt.label.toLowerCase().startsWith('ohne')) {
                                // Jumps to 1800mm
                                const hose1800Idx = schMat.options.findIndex(o => o.label.includes('1800'));
                                if (hose1800Idx >= 0) this.mischerOptionsState[schIdx] = hose1800Idx;
                            } else {
                                // Reverts to 1250mm
                                const hose1250Idx = schMat.options.findIndex(o => o.label.includes('1250') || o.label.includes('1.25'));
                                if (hose1250Idx >= 0) this.mischerOptionsState[schIdx] = hose1250Idx;
                            }
                        }
                    }

                    this.renderConfigurator();
                    this.updateBOM();
                });
            });
        },

        updateBOM: function () {
            const bomTableBody = document.getElementById('bomTableBody');
            const bomCount = document.getElementById('bomCount');
            if(!bomTableBody) return;
            bomTableBody.innerHTML = '';
            
            if (!this.selectedTray) {
                if(bomCount) bomCount.textContent = '0 Artikel';
                return;
            }
            
            let total = 1;
            bomTableBody.innerHTML += `
                <tr class="bom-main-item">
                    <td><div class="img-cell"><img src="${this.selectedTray.imgUrl || ''}"></div></td>
                    <td><span class="bom-code">${this.selectedTray.artNr}</span></td>
                    <td><div class="bom-desc">${this.selectedTray.label}</div></td>
                    <td><span class="bom-type">Hauptprodukt</span></td>
                    <td><strong>1</strong></td>
                </tr>
            `;

            if (this.selectedTray.mountingMaterials) {
                this.selectedTray.mountingMaterials.forEach((mat, mIdx) => {
                    if (!this.isMatVisible(mat, mIdx)) return;

                    const oIdx = this.mischerOptionsState[mIdx];
                    if (oIdx !== undefined) {
                        const opt = mat.options[oIdx];
                        if (opt && !opt.label.toLowerCase().startsWith('ohne')) {
                            const menge = opt.menge || 1;
                            total += menge;
                            bomTableBody.innerHTML += `
                                <tr>
                                    <td><div class="img-cell"><img src="${opt.imgUrl || ''}"></div></td>
                                    <td><span class="bom-code">${opt.artNr}</span></td>
                                    <td><div class="bom-desc">${opt.label}</div></td>
                                    <td><span class="bom-type">${mat.name || 'Zubehör'}</span></td>
                                    <td><strong>${menge}</strong></td>
                                </tr>
                            `;
                        }
                    }
                });
            }
            
            if(bomCount) bomCount.textContent = `${total} Artikel gewählt`;
        },

        clearBOM: function() {
            this.mischerOptionsState = {};
            this.updateBOM();
        },

        copyToClipboard: function () {
            if (!this.selectedTray) return;
            let list = [`${this.selectedTray.artNr}\t1`];
            if (this.selectedTray.mountingMaterials) {
                this.selectedTray.mountingMaterials.forEach((mat, mIdx) => {
                    if (!this.isMatVisible(mat, mIdx)) return;

                    const oIdx = this.mischerOptionsState[mIdx];
                    if (oIdx !== undefined) {
                        const opt = mat.options[oIdx];
                        if (opt && !opt.label.toLowerCase().startsWith('ohne')) {
                            list.push(`${opt.artNr}\t${opt.menge || 1}`);
                        }
                    }
                });
            }
            navigator.clipboard.writeText(list.join('\n')).then(() => alert('Stückliste kopiert!'));
        }
    };
}

/**
 * Standard Product List App (Simple)
 */
/**
 * Standard Product List App (Simple)
 */
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
                <div class="result-item-btn ${this.selectedTray?.id === t.id ? 'active' : ''}" onclick="window.currentActiveApp.selectItem('${t.id}')">
                    <div class="result-info">
                        <strong>${t.label}</strong>
                        <div class="result-meta"><span>${t.manufacturer || ''}</span> | <span>${t.size || ''}</span></div>
                    </div>
                    <span class="finish-artnr">${t.artNr}</span>
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
                    <td><span class="bom-type">Basis</span></td>
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
    const suffix = title.replace(/\s/g, '');
    return {
        trays: [],
        mainImgUrl: mainImgUrl,
        selectedTray: null,
        
        currentType: 'all',
        currentSituation: 'all',
        currentColor: 'all',
        currentBand: 'all',
        currentManufacturer: 'all',
        currentBreite: '',
        currentLaenge: '',

        init: function () {
            this.selectedTray = null;
            this.currentType = 'all';
            this.currentSituation = 'all';
            this.currentColor = 'all';
            this.currentBand = 'all';
            this.currentManufacturer = 'all';
            this.currentBreite = '';
            this.currentLaenge = '';
            this.renderSidebar();
            this.updateBOM();
        },

        extractType: function(t) {
            const l = (t.label || '').toLowerCase();
            // Filter out service items — they are not products
            if (l.includes('massaufnahme') || l.includes('anfahrtspauschale') || l.includes('montagepauschale') || l.includes('demontage') || l.includes('nettobetrag')) return null;
            // Freistehende Seitenwand = standalone main product (check before door keywords)
            if (l.startsWith('freistehende seitenwand') || (l.includes('freistehend') && l.includes('seitenwand'))) return 'Seitenwand (freistehend)';
            // Seitenwand (Zusatz) — label starts with 'Seitenwand' + references a door (check BEFORE generic door checks)
            if (l.startsWith('seitenwand') && (l.includes('gleittür') || l.includes('pendeltür') || l.includes('kombination'))) return 'Seitenwand (Zusatz)';
            // Door types
            if (l.includes('pendeltür')) return 'Pendeltür';
            if (l.includes('flügeltür') || l.includes('flügelig')) return 'Flügeltür';
            if (l.includes('gleittür') || l.includes('schiebetür')) return 'Gleittür/Schiebetür';
            if (l.includes('drehfalttür') || l.includes('falttür')) return 'Drehfalttür';
            // Remaining seitenwand without door context = freistehend
            if (l.includes('seitenwand')) return 'Seitenwand (freistehend)';
            if (l.includes('nische')) return 'Nischentür';
            return null; // Unknown — exclude from filter
        },

        extractSituation: function(t) {
            const l = (t.label || '').toLowerCase();
            // Check Walk-In / Freistehend FIRST — before any 'seitenwand' check
            if (l.includes('walk-in') || l.includes('walkin') || l.includes('freistehend')) return 'Walk-In/Freistehende Seitenwand';
            if (l.includes('nische')) return 'Nische';
            if (l.includes('eckeinstieg') || l.includes('eck')) return 'Eckeinstieg';
            // 'seitenwand' alone (without freistehend/eckeinstieg/nische) = Eckeinstieg context
            if (l.includes('seitenwand')) return 'Eckeinstieg';
            return 'Eckeinstieg';
        },

        extractBand: function(t) {
            const l = (t.label || '').toLowerCase();
            if (l.includes('band links')) return 'links';
            if (l.includes('band rechts')) return 'rechts';
            if (l.includes('eckeinstieg')) return 'Universal';
            return 'Universal';
        },

        extractColor: function(t) {
            const l = (t.label || '').toLowerCase();
            if (l.includes('chrom') || l.includes('silber')) return 'Chrom';
            if (l.includes('schwarz')) return 'Schwarz';
            if (l.includes('weiss') || l.includes('weiß')) return 'Weiss';
            if (l.includes('matt')) return 'Matt';
            return 'Standard';
        },

        extractSizeScore: function(t) {
            const label = (t.label || '').toLowerCase();
            const cleanLabel = label.replace((t.artNr || '').toLowerCase(), '').trim();
            const allDims = (cleanLabel.match(/\d+([\.,]\d+)?/g) || [])
                .map(s => Number(s.replace(',', '.')))
                .filter(n => n > 20)
                .map(n => n > 250 ? n / 10 : n);
            const sizeDims = allDims.filter(d => d < 195);
            return sizeDims[0] || 9999;
        },

        checkCompatibility: function(t, b, l) {
            const label = (t.label || '').toLowerCase();
            const cleanLabel = label.replace((t.artNr || '').toLowerCase(), '').trim();
            const allDims = (cleanLabel.match(/\d+([\.,]\d+)?/g) || [])
                .map(s => Number(s.replace(',', '.')))
                .filter(n => n > 20)
                .map(n => n > 250 ? n / 10 : n);
            const sizeDims = allDims.filter(d => d < 195);
            
            if (sizeDims.length === 0) return true; // Fallback

            const targetDims = [];
            if (b) targetDims.push(b > 250 ? b/10 : b);
            if (l) targetDims.push(l > 250 ? l/10 : l);

            return targetDims.every((td, i) => {
                const gd = sizeDims[i] || sizeDims[0];
                
                // 1. Strict Range Check (e.g. 125.1 - 180)
                if (sizeDims.length >= 2 && !label.includes(' x ')) {
                    const min = Math.min(...sizeDims);
                    const max = Math.max(...sizeDims);
                    return td >= min && td <= max;
                }

                // 2. Multi-dimension Check (e.g. 90 x 90)
                if (label.includes(' x ') && sizeDims.length >= 2) {
                    return td <= (sizeDims[i] || sizeDims[0]);
                }

                // 3. Simple "Up to" or "From" check
                const hasWidthBis = label.includes('breite bis') || (label.includes('bis') && !label.includes('höhe bis'));
                if (hasWidthBis) return td <= gd;
                
                const hasWidthAb = label.includes('breite ab') || (label.includes('ab') && !label.includes('höhe ab'));
                if (hasWidthAb) return td >= gd;

                return Math.abs(td - gd) < 5; 
            });
        },

        renderSidebar: function () {
            const situations = [...new Set(this.trays.map(t => this.extractSituation(t)))].sort();
            const types = [...new Set(this.trays.map(t => this.extractType(t)).filter(Boolean))].sort();
            const colors = [...new Set(this.trays.map(t => this.extractColor(t)))].sort();
            const bands = [...new Set(this.trays.map(t => this.extractBand(t)))].sort();
            const manufacturers = [...new Set(this.trays.map(t => t.manufacturer).filter(m => m && m !== 'Andere'))].sort();

            configSidebar.innerHTML = `
                <div class="sidebar-section">
                    <h2>Filter: ${title}</h2>

                    <div class="filter-group">
                        <label>Hersteller</label>
                        <div class="pill-group">
                            <button class="pill-btn ${this.currentManufacturer === 'all' ? 'active' : ''}" onclick="window.currentActiveApp.setFilter('Manufacturer', 'all')">Alle</button>
                            ${manufacturers.map(m => `<button class="pill-btn ${this.currentManufacturer === m ? 'active' : ''}" onclick="window.currentActiveApp.setFilter('Manufacturer', '${m}')">${m}</button>`).join('')}
                        </div>
                    </div>

                    <div class="filter-group" style="margin-top:0.75rem;">
                        <label>Einbausituation</label>
                        <div class="pill-group">
                            <button class="pill-btn ${this.currentSituation === 'all' ? 'active' : ''}" onclick="window.currentActiveApp.setFilter('Situation', 'all')">Alle</button>
                            ${situations.map(s => `<button class="pill-btn ${this.currentSituation === s ? 'active' : ''}" onclick="window.currentActiveApp.setFilter('Situation', '${s}')">${s}</button>`).join('')}
                        </div>
                    </div>

                    <div class="filter-group" style="margin-top:0.75rem;">
                        <label>Türart / Typ</label>
                        <div class="pill-group">
                            <button class="pill-btn ${this.currentType === 'all' ? 'active' : ''}" onclick="window.currentActiveApp.setFilter('Type', 'all')">Alle</button>
                            ${types.map(t => `<button class="pill-btn ${this.currentType === t ? 'active' : ''}" onclick="window.currentActiveApp.setFilter('Type', '${t}')">${t}</button>`).join('')}
                        </div>
                    </div>

                    <div class="filter-group" style="margin-top:0.75rem;">
                        <label>Farbe</label>
                        <div class="pill-group">
                            <button class="pill-btn ${this.currentColor === 'all' ? 'active' : ''}" onclick="window.currentActiveApp.setFilter('Color', 'all')">Alle</button>
                            ${colors.map(c => `<button class="pill-btn ${this.currentColor === c ? 'active' : ''}" onclick="window.currentActiveApp.setFilter('Color', '${c}')">${c}</button>`).join('')}
                        </div>
                    </div>

                    <div class="filter-group" style="margin-top:0.75rem;">
                        <label>Band</label>
                        <div class="pill-group">
                            <button class="pill-btn ${this.currentBand === 'all' ? 'active' : ''}" onclick="window.currentActiveApp.setFilter('Band', 'all')">Alle</button>
                            ${bands.map(b => `<button class="pill-btn ${this.currentBand === b ? 'active' : ''}" onclick="window.currentActiveApp.setFilter('Band', '${b}')">${b}</button>`).join('')}
                        </div>
                    </div>

                    <div class="filter-group" style="margin-top:1rem;">
                        <label>Manuelle Grösse (mm)</label>
                        <div style="display:flex; gap:0.5rem;">
                            <input type="number" id="input_breite_${suffix}" class="filter-select" placeholder="Breite" value="${this.currentBreite}">
                            <input type="number" id="input_laenge_${suffix}" class="filter-select" placeholder="Länge" value="${this.currentLaenge}">
                        </div>
                    </div>

                    <div class="filter-group" style="margin-top:1rem;">
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
            document.getElementById(`input_breite_${suffix}`).addEventListener('input', (e) => { this.currentBreite = e.target.value; this.filterResults(); });
            document.getElementById(`input_laenge_${suffix}`).addEventListener('input', (e) => { this.currentLaenge = e.target.value; this.filterResults(); });
            this.filterResults();
        },

        setFilter: function(key, val) {
            this[`current${key}`] = val;
            this.renderSidebar();
        },

        filterResults: function () {
            const search = (document.getElementById(`input_search_${suffix}`)?.value || '').toLowerCase();
            
            const b = parseFloat(this.currentBreite);
            const l = parseFloat(this.currentLaenge);

            const filtered = this.trays.filter(t => {
                // Exclude service articles and unknown types
                const label = (t.label || '').toLowerCase();
                if (label.includes('massaufnahme') || label.includes('anfahrt')) return false;
                if (this.extractType(t) === null) return false;

                if (this.currentManufacturer !== 'all' && (t.manufacturer || '') !== this.currentManufacturer) return false;
                if (this.currentType !== 'all' && this.extractType(t) !== this.currentType) return false;
                if (this.currentSituation !== 'all' && this.extractSituation(t) !== this.currentSituation) return false;
                if (this.currentColor !== 'all' && this.extractColor(t) !== this.currentColor) return false;
                if (this.currentBand !== 'all' && this.extractBand(t) !== this.currentBand) return false;
                
                // Manual Size Filtering
                if (this.currentBreite || this.currentLaenge) {
                    if (!this.checkCompatibility(t, b, l)) return false;
                }

                if (search && !(t.label.toLowerCase().includes(search) || t.artNr.toLowerCase().includes(search))) return false;
                return true;
            });

            // Post-Filter: Tightest Fit logic
            let finalResults = filtered;
            if (this.currentBreite || this.currentLaenge) {
                const groups = {};
                filtered.forEach(t => {
                    const key = `${this.extractType(t)}|${this.extractSituation(t)}|${this.extractColor(t)}|${this.extractBand(t)}`;
                    if (!groups[key]) groups[key] = [];
                    groups[key].push(t);
                });
                finalResults = [];
                Object.values(groups).forEach(group => {
                    const minScore = Math.min(...group.map(t => this.extractSizeScore(t)));
                    group.filter(t => this.extractSizeScore(t) === minScore).forEach(t => finalResults.push(t));
                });
            }
            
            const countSpan = document.getElementById(`resultCount_${suffix}`);
            if (countSpan) countSpan.textContent = finalResults.length;
            
            const container = document.getElementById(`searchResults_${suffix}`);
            if (!container) return;
            
            container.innerHTML = finalResults.map(t => `
                <div class="result-item-btn ${this.selectedTray?.id === t.id ? 'active' : ''}" onclick="window.currentActiveApp.selectItem('${t.id}')">
                    <div class="result-info">
                        <strong>${t.label}</strong>
                        <div class="result-meta"><span>${t.manufacturer || ''}</span> | <span>${t.size || ''}</span></div>
                    </div>
                    <span class="finish-artnr">${t.artNr}</span>
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

            let total = 1;
            let rows = `
                <tr class="bom-main-item">
                    <td><div class="img-cell"><img src="${this.selectedTray.imgUrl || this.mainImgUrl}"></div></td>
                    <td><span class="bom-code">${this.selectedTray.artNr}</span></td>
                    <td><div class="bom-desc">${this.selectedTray.label}</div></td>
                    <td><span class="bom-type">Glas</span></td>
                    <td><strong>1</strong></td>
                </tr>
            `;

            // Auto-populate services with size-aware filtering for Montagepauschale
            const sizeScore = this.extractSizeScore(this.selectedTray);
            const rawServices = this.selectedTray.services || [];
            
            // Filter to only one Montagepauschale (bis 125 vs ab 125)
            const filteredServices = rawServices.filter(s => {
                const sl = s.label.toLowerCase();
                if (sl.includes('montagepauschale')) {
                    if (sl.includes('bis 125') && sizeScore > 125) return false;
                    if (sl.includes('ab 125') && sizeScore <= 125) return false;
                }
                return true;
            });

            filteredServices.forEach(svc => {
                total += (svc.qty || 1);
                rows += `
                        <tr class="service-row">
                            <td><div class="img-cell"><i class="ri-customer-service-2-line" style="font-size:1.5rem; color:var(--accent);"></i></div></td>
                            <td><span class="bom-code">${svc.artNr}</span></td>
                            <td><div class="bom-desc">${svc.label}</div></td>
                            <td><span class="bom-type">Dienstleistung</span></td>
                            <td><strong>${svc.qty || 1}</strong></td>
                        </tr>
                    `;
            });

            bomTableBody.innerHTML = rows;
            bomCountCounter.textContent = `${total} Artikel`;
        },

        copyToClipboard: function () {
            if (!this.selectedTray) return;
            let lines = [`${this.selectedTray.artNr}\t1`];
            if (this.selectedTray.services) {
                const sizeScore = this.extractSizeScore(this.selectedTray);
                const rawServices = this.selectedTray.services || [];
                const filteredServices = rawServices.filter(s => {
                    const sl = s.label.toLowerCase();
                    if (sl.includes('montagepauschale')) {
                        if (sl.includes('bis 125') && sizeScore > 125) return false;
                        if (sl.includes('ab 125') && sizeScore <= 125) return false;
                    }
                    return true;
                });
                filteredServices.forEach(svc => {
                    if (svc.artNr && svc.artNr !== 'none' && !svc.label.toLowerCase().startsWith('ohne')) {
                        lines.push(`${svc.artNr}\t${svc.qty || 1}`);
                    }
                });
            }
            navigator.clipboard.writeText(lines.join('\n')).then(() => alert('Kopiert!'));
        }
    };
}

/**
 * System Configurator (Multi-Tier Linear Selection)
 */



export function createWCApp(title, desc, mainImgUrl, config = {}) {
    const isMixer = config.isMixer || title.toLowerCase().includes('mischer') || title.toLowerCase().includes('armatur');
    const montageLabel1 = config.montageLabel1 || (isMixer ? "Aufputz" : "Wannenträger");
    const montageLabel2 = config.montageLabel2 || (isMixer ? "Unterputz" : "Montagerahmen");
    const montageLabel3 = config.montageLabel3 || "";
    const hideSizeForm = config.hideSizeForm || isMixer;
    const suffix = title.replace(/\s/g,'');

    return {
            trays: [],
            mainImgUrl: mainImgUrl,
            selectedTray: null,
            extractSerie: function (t) {
                if (t.serie) return t.serie;
                let cleaned = t.label || '';
                if (t.manufacturer && cleaned.toLowerCase().startsWith(t.manufacturer.toLowerCase())) {
                    cleaned = cleaned.substring(t.manufacturer.length).trim();
                }
                const match = cleaned.match(/^(.*?)(?:\s+\d+\s*[xX]\s*\d+|\s*,|\s*\(|\s+-| \d+)/);
                let serie = match && match[1] ? match[1].trim() : cleaned.trim();
                
                // Strip redundant basin/wanne type prefixes from series names
                const prefixes = [
                    'Doppelwaschtisch', 'Möbelwaschtisch', 'Aufsatzwaschtisch', 
                    'Waschtisch', 'Handwaschbecken', 'Einbaubecken', 'Wandbecken',
                    'Waschtischanlage', 'Aufsatzbecken', 'Waschbecken',
                    'Duschenwanne', 'Duschwanne', 'Badewanne', 'Duschfläche', 'Wanne'
                ];
                for (const prefix of prefixes) {
                    if (serie.toLowerCase().startsWith(prefix.toLowerCase())) {
                        serie = serie.substring(prefix.length).trim();
                        if (serie.startsWith('-') || serie.startsWith('/')) serie = serie.substring(1).trim();
                        // Strip manufacturer name again if it appears after the prefix (e.g. "Duschwanne Kaldewei...")
                        if (t.manufacturer && serie.toLowerCase().startsWith(t.manufacturer.toLowerCase())) {
                            serie = serie.substring(t.manufacturer.length).trim();
                        }
                        break;
                    }
                }
                
                // Final safety: if manufacturer is still at front, strip it
                if (t.manufacturer && serie.toLowerCase().startsWith(t.manufacturer.toLowerCase())) {
                    serie = serie.substring(t.manufacturer.length).trim();
                }

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
                
                // 1. Check for manual admin override first
                if (obj.overrideMontageart && obj.overrideMontageart !== 'auto') {
                    return obj.overrideMontageart.toLowerCase();
                }

                // 2. Clean input data
                const label = (obj.label || obj.name || '').toLowerCase();
                const artNr = (obj.artNr || '').replace(/\s/g, '');

                // 3. HARD EXCEPTIONS (Firm IDs)
                if (artNr === '1445782.000.000' || artNr === '1441782.000.000') {
                    return 'wannenträger';
                }
                if (artNr === '1431191.000.000' || artNr === '1431190.000.000' || artNr === '1435435.000.000') {
                    return 'montagerahmen';
                }

                // 4. KEYWORD LOGIC
                // Special Rule: If it mentions "schallschutz", it's ALWAYS Montagerahmen (unless it matched the IDs above)
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
                        return 'montagerahmen';
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
                        <div class="filter-group">
                            <div class="finder-sub-header" id="head_rel_form_${suffix}">${formLabel}</div>
                            <div class="pill-group" id="list_rel_form_${suffix}"></div>
                        </div>
                        
                        <div class="filter-group">
                            <div class="finder-sub-header" id="head_rel_size_${suffix}">Grösse</div>
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
                        <div id="trayConfiguratorInner_${title.replace(/\s/g,'')}"></div>
                    </div>
                `;
                this.updatePillFilters();
            },
            updatePillFilters: function() {
                const suffix = title.replace(/\s/g,'');
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
                    const sizes = [...new Set(validTraysForSize.map(t => t.size))].sort();
                    sList.innerHTML = `<button class="pill-btn ${this.currentSize === 'all' ? 'active' : ''}" data-val="all">Alle</button>` + sizes.map(s => `
                        <button class="pill-btn ${this.currentSize === s ? 'active' : ''}" data-val="${s}">${s}</button>
                    `).join('');
                    applyPillUI(`head_rel_size_${suffix}`, `list_rel_size_${suffix}`, this.currentSize, 'Grösse', () => {
                        this.currentSize = 'all';
                        this.updatePillFilters();
                        this.filterResults();
                    });
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
                    if (parts.length === 2) {
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
                                if (parts.length === 2) {
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
                    return;
                }

                filtered.forEach(t => {
                    const btn = document.createElement('button');
                    btn.className = `result-item-btn ${this.selectedTray && this.selectedTray.id === t.id ? 'active' : ''}`;
                    btn.innerHTML = `
                        <div class="result-info">
                            <strong>${t.label}</strong>
                            <div class="result-meta">
                                <span>${t.manufacturer}</span> ${hideSizeForm ? '' : `| <span>${t.size}</span>`}
                            </div>
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
                                id: mat.id || 'mat_'+Math.random().toString(36).substr(2,5),
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
                        if (lbl.includes('sitz') || lbl.includes('deckel')) return 2;
                        if (lbl.includes('platte') || lbl.includes('betätigung')) return 3;
                        if (lbl.includes('schall') || lbl.includes('isolation')) return 4;
                        if (lbl.includes('manschette') || lbl.includes('garnitur')) return 5;
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
                            else if (matName === 'befestigungsschrauben') priority = 5;
                            else if (matName === 'ablaufmanschette') priority = 6;
                            else if (matName === 'duofix element' || selectedOption.artNr === '3612 348.000.000') priority = 7;
                            else if (matName === 'rückwandbefestigungssatz' || selectedOption.artNr === '3612 500.000.000') priority = 8;
                            else if (matName === 'ablaufbogen' || selectedOption.artNr === '3612 374.000.000') priority = 9;
                        } else {
                            // AUFPUTZ: 1=Spülkasten 2=Klosett 3=Sitz 4=Schall 5=Screws 6=Ablaufanschluss
                            if (matName === 'spülkasten') priority = 1;
                            else if (matName === 'wc-sitz' || matName === 'klosettsitz') priority = 3;
                            else if (matName === 'schallschutz') priority = 4;
                            else if (matName === 'befestigungsschrauben') priority = 5;
                            else if (matName === 'ablaufanschluss') priority = 6;
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

                        const combinedLbl = (enrichedLabel + ' ' + (selectedOption.type || mat.name || '')).toLowerCase();

                        let priority = 99; // Fallback
                        const note = mat.name || 'Zubehör';

                        // 1. Wanne / Duschfläche (Handled earlier, priority: 1)
                        // 2. Ablaufdeckel
                        // 3. Ablaufgarnitur / Sifon
                        // 4. Zargen-Wannendichtband
                        // 5. Wannenträger OR Montagerahmen
                        // 6. Montageschaum OR Fussset OR Mittenabstützsystem
                        // 7. Schallschutzset

                        if (combinedLbl.includes('deckel')) priority = 2;
                        else if (combinedLbl.includes('ablauf') || combinedLbl.includes('siphon') || combinedLbl.includes('garnitur') || combinedLbl.includes('sifon')) priority = 3;
                        else if (combinedLbl.includes('dichtband') || combinedLbl.includes('wannenband') || combinedLbl.includes('zargen') || combinedLbl.includes('dichtset')) priority = 4;
                        else if (combinedLbl.includes('träger') || combinedLbl.includes('rahmen') || combinedLbl.includes('wannenträger') || combinedLbl.includes('montagerahmen')) priority = 5;
                        else if (combinedLbl.includes('schaum') || combinedLbl.includes('fuss') || combinedLbl.includes('füsse') || combinedLbl.includes('mittenabstütz') || combinedLbl.includes('wannenanker') || combinedLbl.includes('stütz')) priority = 6;
                        else if (combinedLbl.includes('schall') || combinedLbl.includes('isolation')) priority = 7;
                        else priority = 8; // Any generic unclassified accessories

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
                        <td><span class="bom-type">${item.typ}</span></td>
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
    const isMixer = config.isMixer || title.toLowerCase().includes('mischer') || title.toLowerCase().includes('armatur');
    const montageLabel1 = config.montageLabel1 || (isMixer ? "Aufputz" : "Wannenträger");
    const montageLabel2 = config.montageLabel2 || (isMixer ? "Unterputz" : "Montagerahmen");
    const montageLabel3 = config.montageLabel3 || "";
    const hideSizeForm = config.hideSizeForm || isMixer;
    const suffix = title.replace(/\s/g,'');

    return {
            trays: [],
            mainImgUrl: mainImgUrl,
            selectedTray: null,
            extractSerie: function (t) {
                if (t.serie) return t.serie;
                let cleaned = t.label || '';
                if (t.manufacturer && cleaned.toLowerCase().startsWith(t.manufacturer.toLowerCase())) {
                    cleaned = cleaned.substring(t.manufacturer.length).trim();
                }
                const match = cleaned.match(/^(.*?)(?:\s+\d+\s*[xX]\s*\d+|\s*,|\s*\(|\s+-| \d+)/);
                let serie = match && match[1] ? match[1].trim() : cleaned.trim();
                
                // Strip redundant basin/wanne type prefixes from series names
                const prefixes = [
                    'Doppelwaschtisch', 'Möbelwaschtisch', 'Aufsatzwaschtisch', 
                    'Waschtisch', 'Handwaschbecken', 'Einbaubecken', 'Wandbecken',
                    'Waschtischanlage', 'Aufsatzbecken', 'Waschbecken',
                    'Duschenwanne', 'Duschwanne', 'Badewanne', 'Duschfläche', 'Wanne'
                ];
                for (const prefix of prefixes) {
                    if (serie.toLowerCase().startsWith(prefix.toLowerCase())) {
                        serie = serie.substring(prefix.length).trim();
                        if (serie.startsWith('-') || serie.startsWith('/')) serie = serie.substring(1).trim();
                        // Strip manufacturer name again if it appears after the prefix (e.g. "Duschwanne Kaldewei...")
                        if (t.manufacturer && serie.toLowerCase().startsWith(t.manufacturer.toLowerCase())) {
                            serie = serie.substring(t.manufacturer.length).trim();
                        }
                        break;
                    }
                }
                
                // Final safety: if manufacturer is still at front, strip it
                if (t.manufacturer && serie.toLowerCase().startsWith(t.manufacturer.toLowerCase())) {
                    serie = serie.substring(t.manufacturer.length).trim();
                }

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
                
                // 1. Check for manual admin override first
                if (obj.overrideMontageart && obj.overrideMontageart !== 'auto') {
                    return obj.overrideMontageart.toLowerCase();
                }

                // 2. Clean input data
                const label = (obj.label || obj.name || '').toLowerCase();
                const artNr = (obj.artNr || '').replace(/\s/g, '');

                // 3. HARD EXCEPTIONS (Firm IDs)
                if (artNr === '1445782.000.000' || artNr === '1441782.000.000') {
                    return 'wannenträger';
                }
                if (artNr === '1431191.000.000' || artNr === '1431190.000.000' || artNr === '1435435.000.000') {
                    return 'montagerahmen';
                }

                // 4. KEYWORD LOGIC
                // Special Rule: If it mentions "schallschutz", it's ALWAYS Montagerahmen (unless it matched the IDs above)
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
                    // STRICT RULE for Standklosett:
                    // Unterputz ONLY if description explicitly states 'Einbauspülkasten'
                    // Everything else is Aufputz
                    if (lblLower.includes('einbauspülkasten') || lblLower.includes('einbauspulkasten')) {
                        return 'unterputz';
                    }
                    return 'aufputz';
                } else {
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
                        return 'montagerahmen';
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
                        <div class="filter-group">
                            <div class="finder-sub-header" id="head_rel_form_${suffix}">${formLabel}</div>
                            <div class="pill-group" id="list_rel_form_${suffix}"></div>
                        </div>
                        
                        <div class="filter-group">
                            <div class="finder-sub-header" id="head_rel_size_${suffix}">Grösse</div>
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
                        <div id="trayConfiguratorInner_${title.replace(/\s/g,'')}"></div>
                    </div>
                `;
                this.updatePillFilters();
            },
            updatePillFilters: function() {
                const suffix = title.replace(/\s/g,'');
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
                    const sizes = [...new Set(validTraysForSize.map(t => t.size))].sort();
                    sList.innerHTML = `<button class="pill-btn ${this.currentSize === 'all' ? 'active' : ''}" data-val="all">Alle</button>` + sizes.map(s => `
                        <button class="pill-btn ${this.currentSize === s ? 'active' : ''}" data-val="${s}">${s}</button>
                    `).join('');
                    applyPillUI(`head_rel_size_${suffix}`, `list_rel_size_${suffix}`, this.currentSize, 'Grösse', () => {
                        this.currentSize = 'all';
                        this.updatePillFilters();
                        this.filterResults();
                    });
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
                    if (parts.length === 2) {
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
                                if (parts.length === 2) {
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
                    return;
                }

                filtered.forEach(t => {
                    const btn = document.createElement('button');
                    btn.className = `result-item-btn ${this.selectedTray && this.selectedTray.id === t.id ? 'active' : ''}`;
                    btn.innerHTML = `
                        <div class="result-info">
                            <strong>${t.label}</strong>
                            <div class="result-meta">
                                <span>${t.manufacturer}</span> ${hideSizeForm ? '' : `| <span>${t.size}</span>`}
                            </div>
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
                                id: mat.id || 'mat_'+Math.random().toString(36).substr(2,5),
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
                        if (lbl.includes('sitz') || lbl.includes('deckel')) return 2;
                        if (lbl.includes('platte') || lbl.includes('betätigung')) return 3;
                        if (lbl.includes('schall') || lbl.includes('isolation')) return 4;
                        if (lbl.includes('manschette') || lbl.includes('garnitur')) return 5;
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
                            else if (matName === 'befestigungsschrauben') priority = 5;
                            else if (matName === 'ablaufmanschette') priority = 6;
                            else if (matName === 'duofix element' || selectedOption.artNr === '3612 348.000.000') priority = 7;
                            else if (matName === 'rückwandbefestigungssatz' || selectedOption.artNr === '3612 500.000.000') priority = 8;
                            else if (matName === 'ablaufbogen' || selectedOption.artNr === '3612 374.000.000') priority = 9;
                        } else {
                            // AUFPUTZ: 1=Spülkasten 2=Klosett 3=Sitz 4=Schall 5=Screws 6=Ablaufanschluss
                            if (matName === 'spülkasten') priority = 1;
                            else if (matName === 'wc-sitz' || matName === 'klosettsitz') priority = 3;
                            else if (matName === 'schallschutz') priority = 4;
                            else if (matName === 'befestigungsschrauben') priority = 5;
                            else if (matName === 'ablaufanschluss') priority = 6;
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

                        const combinedLbl = (enrichedLabel + ' ' + (selectedOption.type || mat.name || '')).toLowerCase();

                        let priority = 99; // Fallback
                        const note = mat.name || 'Zubehör';

                        // 1. Wanne / Duschfläche (Handled earlier, priority: 1)
                        // 2. Ablaufdeckel
                        // 3. Ablaufgarnitur / Sifon
                        // 4. Zargen-Wannendichtband
                        // 5. Wannenträger OR Montagerahmen
                        // 6. Montageschaum OR Fussset OR Mittenabstützsystem
                        // 7. Schallschutzset

                        if (combinedLbl.includes('deckel')) priority = 2;
                        else if (combinedLbl.includes('ablauf') || combinedLbl.includes('siphon') || combinedLbl.includes('garnitur') || combinedLbl.includes('sifon')) priority = 3;
                        else if (combinedLbl.includes('dichtband') || combinedLbl.includes('wannenband') || combinedLbl.includes('zargen') || combinedLbl.includes('dichtset')) priority = 4;
                        else if (combinedLbl.includes('träger') || combinedLbl.includes('rahmen') || combinedLbl.includes('wannenträger') || combinedLbl.includes('montagerahmen')) priority = 5;
                        else if (combinedLbl.includes('schaum') || combinedLbl.includes('fuss') || combinedLbl.includes('füsse') || combinedLbl.includes('mittenabstütz') || combinedLbl.includes('wannenanker') || combinedLbl.includes('stütz')) priority = 6;
                        else if (combinedLbl.includes('schall') || combinedLbl.includes('isolation')) priority = 7;
                        else priority = 8; // Any generic unclassified accessories

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
                        <td><span class="bom-type">${item.typ}</span></td>
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
                            textLines.push(`${code}\t${menge}`);
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

export function createBadewanneApp(title, desc, mainImgUrl, config = {}) {
    const isMixer = config.isMixer || title.toLowerCase().includes('mischer') || title.toLowerCase().includes('armatur');
    const montageLabel1 = config.montageLabel1 || (isMixer ? "Aufputz" : "Wannenträger");
    const montageLabel2 = config.montageLabel2 || (isMixer ? "Unterputz" : "Montagerahmen");
    const montageLabel3 = config.montageLabel3 || "";
    const hideSizeForm = config.hideSizeForm || isMixer;
    const suffix = title.replace(/\s/g,'');

    return {
            trays: [],
            mainImgUrl: mainImgUrl,
            selectedTray: null,
            extractSerie: function (t) {
                if (t.serie) return t.serie;
                let cleaned = t.label || '';
                if (t.manufacturer && cleaned.toLowerCase().startsWith(t.manufacturer.toLowerCase())) {
                    cleaned = cleaned.substring(t.manufacturer.length).trim();
                }
                const match = cleaned.match(/^(.*?)(?:\s+\d+\s*[xX]\s*\d+|\s*,|\s*\(|\s+-| \d+)/);
                let serie = match && match[1] ? match[1].trim() : cleaned.trim();
                
                // Strip redundant basin/wanne type prefixes from series names
                const prefixes = [
                    'Doppelwaschtisch', 'Möbelwaschtisch', 'Aufsatzwaschtisch', 
                    'Waschtisch', 'Handwaschbecken', 'Einbaubecken', 'Wandbecken',
                    'Waschtischanlage', 'Aufsatzbecken', 'Waschbecken',
                    'Duschenwanne', 'Duschwanne', 'Badewanne', 'Duschfläche', 'Wanne'
                ];
                for (const prefix of prefixes) {
                    if (serie.toLowerCase().startsWith(prefix.toLowerCase())) {
                        serie = serie.substring(prefix.length).trim();
                        if (serie.startsWith('-') || serie.startsWith('/')) serie = serie.substring(1).trim();
                        // Strip manufacturer name again if it appears after the prefix (e.g. "Duschwanne Kaldewei...")
                        if (t.manufacturer && serie.toLowerCase().startsWith(t.manufacturer.toLowerCase())) {
                            serie = serie.substring(t.manufacturer.length).trim();
                        }
                        break;
                    }
                }
                
                // Final safety: if manufacturer is still at front, strip it
                if (t.manufacturer && serie.toLowerCase().startsWith(t.manufacturer.toLowerCase())) {
                    serie = serie.substring(t.manufacturer.length).trim();
                }

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
                
                // 1. Check for manual admin override first
                if (obj.overrideMontageart && obj.overrideMontageart !== 'auto') {
                    return obj.overrideMontageart.toLowerCase();
                }

                // 2. Clean input data
                const label = (obj.label || obj.name || '').toLowerCase();
                const artNr = (obj.artNr || '').replace(/\s/g, '');

                // 3. HARD EXCEPTIONS (Firm IDs)
                if (artNr === '1445782.000.000' || artNr === '1441782.000.000') {
                    return 'wannenträger';
                }
                if (artNr === '1431191.000.000' || artNr === '1431190.000.000' || artNr === '1435435.000.000') {
                    return 'montagerahmen';
                }

                // 4. KEYWORD LOGIC
                // Special Rule: If it mentions "schallschutz", it's ALWAYS Montagerahmen (unless it matched the IDs above)
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
                    // STRICT RULE for Standklosett:
                    // Unterputz ONLY if description explicitly states 'Einbauspülkasten'
                    // Everything else is Aufputz
                    if (lblLower.includes('einbauspülkasten') || lblLower.includes('einbauspulkasten')) {
                        return 'unterputz';
                    }
                    return 'aufputz';
                } else {
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
                        return 'montagerahmen';
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
                        <div class="filter-group">
                            <div class="finder-sub-header" id="head_rel_form_${suffix}">${formLabel}</div>
                            <div class="pill-group" id="list_rel_form_${suffix}"></div>
                        </div>
                        
                        <div class="filter-group">
                            <div class="finder-sub-header" id="head_rel_size_${suffix}">Grösse</div>
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
                        <div id="trayConfiguratorInner_${title.replace(/\s/g,'')}"></div>
                    </div>
                `;
                this.updatePillFilters();
            },
            updatePillFilters: function() {
                const suffix = title.replace(/\s/g,'');
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
                    const sizes = [...new Set(validTraysForSize.map(t => t.size))].sort();
                    sList.innerHTML = `<button class="pill-btn ${this.currentSize === 'all' ? 'active' : ''}" data-val="all">Alle</button>` + sizes.map(s => `
                        <button class="pill-btn ${this.currentSize === s ? 'active' : ''}" data-val="${s}">${s}</button>
                    `).join('');
                    applyPillUI(`head_rel_size_${suffix}`, `list_rel_size_${suffix}`, this.currentSize, 'Grösse', () => {
                        this.currentSize = 'all';
                        this.updatePillFilters();
                        this.filterResults();
                    });
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
                    if (parts.length === 2) {
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
                                if (parts.length === 2) {
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
                    return;
                }

                filtered.forEach(t => {
                    const btn = document.createElement('button');
                    btn.className = `result-item-btn ${this.selectedTray && this.selectedTray.id === t.id ? 'active' : ''}`;
                    btn.innerHTML = `
                        <div class="result-info">
                            <strong>${t.label}</strong>
                            <div class="result-meta">
                                <span>${t.manufacturer}</span> ${hideSizeForm ? '' : `| <span>${t.size}</span>`}
                            </div>
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
                                id: mat.id || 'mat_'+Math.random().toString(36).substr(2,5),
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
                                    Für dieses Modell ist kein passender Wannenträger im System hinterlegt. Bitte nutzen Sie die Montageart <strong>Mit Wannenfüssen</strong>.
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
                        // Core/Standard logic
                        if (lbl.includes('sitz') || lbl.includes('deckel') || lbl.includes('überlauf')) return 2;
                        if (lbl.includes('platte') || lbl.includes('betätigung') || lbl.includes('garnitur') || lbl.includes('siphon')) return 3;
                        if (lbl.includes('zargen') || lbl.includes('dicht')) return 4;
                        if (lbl.includes('manschette') || lbl.includes('träger') || lbl.includes('füsse') || lbl.includes('anker')) return 5;
                        if (lbl.includes('schaum') || lbl.includes('kleber')) return 6;
                        if (lbl.includes('schall') || lbl.includes('isolation')) return 7;
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

                    // Check dependency for Infinity Board Add-on
                    if (mat.name.includes("Infinity Board (Add-on)")) {
                        const feetMat = this.selectedTray.mountingMaterials.find(m => m.name.includes("Füsse / Anker"));
                        if (feetMat) {
                            const selectedFeet = this.selectedTray.selections[feetMat.id];
                            if (selectedFeet !== '1111 905.000.000') {
                                return; // Hide the add-on dropdown if the Infinity Foot isn't active
                            }
                        }
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
                            const val = e.target.value;
                            this.selectedTray.selections[mat.id] = val;

                            // --- SPECIAL DEPENDENCY: Multiplex Trio ---
                            const isWanneApp = title.toLowerCase().includes('wanne') || title.toLowerCase().includes('duschfläche');
                            if (isWanneApp) {
                                // Trim sets
                                const isMT5Trim = val === '1411 342.501.000' || val === '1411 342.100.000';
                                const isM5Trim = val === '1411 322.501.000' || val === '1411 322.100.000';
                                
                                // Siphons
                                const isMT5Siphon = val === '1411 333.000.000' || val === '1411 334.000.000';
                                const isM5Siphon = val === '1411 311.000.000' || val === '1411 312.000.000';

                                if (isMT5Trim) {
                                    const siphonMat = this.selectedTray.mountingMaterials.find(m => m.name.includes('Ablaufgarnitur'));
                                    if (siphonMat) {
                                        // Try to find the matching trio body (standard or long)
                                        const trioBody = siphonMat.options.find(o => o.artNr === '1411 333.000.000' || o.artNr === '1411 334.000.000');
                                        if (trioBody) this.selectedTray.selections[siphonMat.id] = trioBody.artNr;
                                    }
                                } else if (isMT5Siphon) {
                                    const overflowMat = this.selectedTray.mountingMaterials.find(m => m.name.includes('Ab- und Überlaufset'));
                                    if (overflowMat) {
                                        const mt5Trim = overflowMat.options.find(o => o.artNr === '1411 342.501.000' || o.artNr === '1411 342.100.000');
                                        if (mt5Trim) this.selectedTray.selections[overflowMat.id] = mt5Trim.artNr;
                                    }
                                } else if (isM5Trim) {
                                    const siphonMat = this.selectedTray.mountingMaterials.find(m => m.name.includes('Ablaufgarnitur'));
                                    if (siphonMat) {
                                        // Try to find standard body (without einlauf)
                                        const stdBody = siphonMat.options.find(o => o.artNr === '1411 311.000.000' || o.artNr === '1411 312.000.000' || o.artNr === '1411 107.000.000');
                                        if (stdBody) this.selectedTray.selections[siphonMat.id] = stdBody.artNr;
                                    }
                                } else if (isM5Siphon) {
                                    const overflowMat = this.selectedTray.mountingMaterials.find(m => m.name.includes('Ab- und Überlaufset'));
                                    if (overflowMat) {
                                        const m5Trim = overflowMat.options.find(o => o.artNr === '1411 322.501.000' || o.artNr === '1411 322.100.000');
                                        if (m5Trim) this.selectedTray.selections[overflowMat.id] = m5Trim.artNr;
                                    }
                                }
                            }

                            this.updateBOM();
                            this.renderConfigurator(); // Re-render to show updated cross-selections
                        });
                        groupDiv.appendChild(label);
                        groupDiv.appendChild(select);
                    }
                    inner.appendChild(groupDiv);
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
                            else if (matName === 'befestigungsschrauben') priority = 5;
                            else if (matName === 'ablaufmanschette') priority = 6;
                            else if (matName === 'duofix element' || selectedOption.artNr === '3612 348.000.000') priority = 7;
                            else if (matName === 'rückwandbefestigungssatz' || selectedOption.artNr === '3612 500.000.000') priority = 8;
                            else if (matName === 'ablaufbogen' || selectedOption.artNr === '3612 374.000.000') priority = 9;
                        } else {
                            // AUFPUTZ: 1=Spülkasten 2=Klosett 3=Sitz 4=Schall 5=Screws 6=Ablaufanschluss
                            if (matName === 'spülkasten') priority = 1;
                            else if (matName === 'wc-sitz' || matName === 'klosettsitz') priority = 3;
                            else if (matName === 'schallschutz') priority = 4;
                            else if (matName === 'befestigungsschrauben') priority = 5;
                            else if (matName === 'ablaufanschluss') priority = 6;
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

                        // Check dependency for Infinity Board Add-on
                        if (mat.name.includes("Infinity Board (Add-on)")) {
                            const feetMat = this.selectedTray.mountingMaterials.find(m => m.name.includes("Füsse / Anker"));
                            if (feetMat) {
                                const selectedFeet = this.selectedTray.selections[feetMat.id];
                                if (selectedFeet !== '1111 905.000.000') {
                                    return; // Hide the add-on from BOM if the Infinity Foot isn't active
                                }
                            }
                        }

                        // Check against active Montageart filter
                        const matClass = this.classifyAccessory(selectedOption) !== 'common' ? this.classifyAccessory(selectedOption) : this.classifyAccessory(mat);
                        if (this.currentMontageart !== 'alle') {
                            if (matClass !== 'common' && matClass !== this.currentMontageart) return;
                        }

                        const zubPool = (window.productApps && window.productApps['zubehoer_pool']) ? window.productApps['zubehoer_pool'].trays : [];
                        const foundZub = zubPool.find(z => z.artNr === selectedOption.artNr);
                        const enrichedLabel = foundZub ? foundZub.label : selectedOption.label;
                        const enrichedImg = (foundZub && foundZub.imgUrl) ? foundZub.imgUrl : selectedOption.imgUrl;

                        const combinedLbl = (enrichedLabel + ' ' + (selectedOption.type || mat.name || '')).toLowerCase();

                        let priority = 99; // Fallback
                        const note = mat.name || 'Zubehör';

                        // 1. Wanne / Duschfläche (Handled earlier, priority: 1)
                        // 2. Ablaufdeckel
                        // 3. Ablaufgarnitur / Sifon
                        // 4. Zargen-Wannendichtband
                        // 5. Wannenträger OR Montagerahmen
                        // 6. Montageschaum OR Fussset OR Mittenabstützsystem
                        // 7. Schallschutzset

                        if (combinedLbl.includes('deckel') || combinedLbl.includes('überlauf')) priority = 2;
                        else if (combinedLbl.includes('ablauf') || combinedLbl.includes('siphon') || combinedLbl.includes('garnitur') || combinedLbl.includes('sifon')) priority = 3;
                        else if (combinedLbl.includes('dichtband') || combinedLbl.includes('wannenband') || combinedLbl.includes('zargen') || combinedLbl.includes('dichtset')) priority = 4;
                        else if (combinedLbl.includes('träger') || combinedLbl.includes('rahmen') || combinedLbl.includes('wannenträger') || combinedLbl.includes('montagerahmen') || combinedLbl.includes('fuss') || combinedLbl.includes('füsse') || combinedLbl.includes('mittenabstütz') || combinedLbl.includes('wannenanker') || combinedLbl.includes('stütz')) priority = 5;
                        else if (combinedLbl.includes('schaum')) priority = 6;
                        else if (combinedLbl.includes('schall') || combinedLbl.includes('isolation')) priority = 7;
                        else priority = 8; // Any generic unclassified accessories

                        let calculatedMenge = selectedOption.menge !== undefined ? selectedOption.menge : 1;

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
                        <td><span class="bom-type">${item.typ}</span></td>
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
                            textLines.push(`${code}\t${menge}`);
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
