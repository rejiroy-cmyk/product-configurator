const mock = () => {
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
    const parts = artNr.replace(/ /g, '').split('.');
    if (parts.length >= 3) {
        return `https://profishop.sanitastroesch.ch/multimedia/Web/PG1/${parts[0].padStart(8, '0')}_${parts[1]}_${parts[2]}.png`;
    } else if (parts.length === 2 && parts[0].length === 7) {
        return `https://profishop.sanitastroesch.ch/multimedia/Web/PG1/${parts[0].padStart(8, '0')}.png`;
    }
    return '';
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
            init: function () {
                this.selectedTray = null;
                this.currentMontageart = 'alle';
                this.renderSidebar();
                this.bindFilters();
                this.filterResults(); // initial run
                this.clearBOM();
            },
            getUniqueValues: function (key) {
                if (key === 'serie') {
                    const seriesArray = this.trays.map(t => {
                        let cleaned = t.label;
                        if (t.manufacturer && cleaned.toLowerCase().startsWith(t.manufacturer.toLowerCase())) {
                            cleaned = cleaned.substring(t.manufacturer.length).trim();
                        }
                        return cleaned.split(' ')[0] || 'Andere';
                    });
                    return [...new Set(seriesArray)].sort();
                }
                return [...new Set(this.trays.map(t => t[key]))].sort();
            },
            classifyAccessory: function (obj) {
                if (!obj) return 'common';
                
                // 1. Check for manual admin override first
                if (obj.overrideMontageart && obj.overrideMontageart !== 'auto') {
                    return obj.overrideMontageart;
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

                if (isMixer) {
                    const lblLower = label.toLowerCase();
                    if (lblLower.includes('standmodell') || lblLower.includes('freien stand')) {
                        return 'standmodell';
                    }
                    // Keywords that are relevant for BOTH Unterputz and Standmodell (e.g. floor/wall bodies)
                    if (lblLower.includes('einbaukörper') || lblLower.includes('grundkörper') || lblLower.includes('ibox') || lblLower.includes('up-gehäuse')) {
                        return 'common'; 
                    }
                    if (lblLower.includes('endmontage') || lblLower.includes('einbau') || lblLower.includes('anschlussbogen') || lblLower.includes('unterputz') || lblLower.includes(' up ')) {
                        return 'unterputz';
                    }
                    if (lblLower.includes('aufputz') || lblLower.includes(' ap ') || lblLower.includes('ausserhalb') || lblLower.includes('mischer') || lblLower.includes('batterie')) {
                        return 'aufputz';
                    }
                } else {
                    if (label.includes('träger') || label.includes('wannenträger') || label.includes('montageschaum')) {
                        return 'wannenträger';
                    }
                    if (label.includes('rahmen') || label.includes('füsse') || label.includes('fussset')) {
                        return 'montagerahmen';
                    }
                }

                return 'common';
            },
            renderSidebar: function () {
                const manufacturers = this.getUniqueValues('manufacturer');
                const forms = this.getUniqueValues('form');
                const sizes = this.getUniqueValues('size');

                configSidebar.innerHTML = `
                    <div class="sidebar-section">
                        <h2>Filter: ${title}</h2>
                        
                        <div class="filter-group">
                            <label>Hersteller</label>
                            <select id="filterManufacturer_${suffix}" class="filter-select">
                                <option value="all">Alle Hersteller</option>
                                ${manufacturers.map(m => `<option value="${m}">${m}</option>`).join('')}
                            </select>
                        </div>

                        <div class="filter-group">
                            <label>Serie</label>
                            <select id="filterSerie_${suffix}" class="filter-select">
                                <option value="all">Alle Serien</option>
                            </select>
                        </div>
                        
                        ${hideSizeForm ? '' : `
                        <div class="filter-group">
                            <label>Form</label>
                            <select id="filterForm_${suffix}" class="filter-select">
                                <option value="all">Alle Formen</option>
                                ${forms.map(f => `<option value="${f}">${f}</option>`).join('')}
                            </select>
                        </div>
                        
                        <div class="filter-group">
                            <label>Grösse</label>
                            <select id="filterSize_${suffix}" class="filter-select">
                                <option value="all">Alle Grössen</option>
                                ${sizes.map(s => `<option value="${s}">${s}</option>`).join('')}
                            </select>
                        </div>
                        `}
                        
                        <div class="filter-group">
                            <label>Montageart</label>
                            <select id="filterMontage_${suffix}" class="filter-select">
                                <option value="alle">Alle Typen</option>
                                <option value="${isMixer ? 'aufputz' : 'wannenträger'}">${montageLabel1}</option>
                                <option value="${isMixer ? 'unterputz' : 'montagerahmen'}">${montageLabel2}</option>
                                ${montageLabel3 ? `<option value="standmodell">${montageLabel3}</option>` : ''}
                            </select>
                        </div>

                        ${hideSizeForm ? '' : `
                        <div style="display:flex; gap:1rem;">
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
                        <div class="search-results-container" id="searchResults_${suffix}">
                            <!-- Populated by JS -->
                        </div>
                    </div>

                    <div class="sidebar-section" id="trayConfigurator_${suffix}" style="display:none; margin-top:2rem;">
                        <h2>Konfiguration</h2>
                        <p class="section-desc">Wählen Sie das passende Zubehör.</p>
                        <div id="trayConfiguratorInner_${title.replace(/\s/g,'')}"></div>
                    </div>
                `;
            },
            bindFilters: function () {
                const mSelect = document.getElementById(`filterManufacturer_${suffix}`);
                const serieSelect = document.getElementById(`filterSerie_${suffix}`);
                const fSelect = document.getElementById(`filterForm_${suffix}`);
                const sSelect = document.getElementById(`filterSize_${suffix}`);
                const lInput = document.getElementById(`filterLength_${suffix}`);
                const wInput = document.getElementById(`filterWidth_${suffix}`);
                const montageSelect = document.getElementById(`filterMontage_${suffix}`);
                
                if (montageSelect) {
                    montageSelect.addEventListener('change', (e) => {
                        this.currentMontageart = e.target.value;
                        this.filterResults(); // Instant refresh of main list
                        if (this.selectedTray) {
                            this.renderConfigurator();
                            this.updateBOM();
                        }
                    });
                }
                
                if (mSelect) mSelect.addEventListener('change', () => {
                    this.updateSerieOptions();
                    if (!hideSizeForm) this.updateSizeOptions();
                    this.filterResults();
                });
                if (serieSelect) serieSelect.addEventListener('change', () => {
                    if (!hideSizeForm) this.updateSizeOptions();
                    this.filterResults();
                });
                if (fSelect) fSelect.addEventListener('change', () => { 
                    if (!hideSizeForm) this.updateSizeOptions(); 
                    this.filterResults(); 
                });
                if (sSelect) sSelect.addEventListener('change', () => {
                    if (!hideSizeForm) this.updateManualInputs();
                    this.filterResults();
                });
                
                const onManualInput = () => {
                    if (!hideSizeForm) this.updateSizeDropdownFromManual();
                    this.filterResults();
                };
                if (lInput) lInput.addEventListener('input', onManualInput);
                const wInput = document.getElementById(`filterWidth_${suffix}`);
            },
            updateSerieOptions: function () {
                const mSelect = document.getElementById(`filterManufacturer_${suffix}`);
                const serieSelect = document.getElementById(`filterSerie_${suffix}`);
                if (!serieSelect) return;

                const mFilter = mSelect ? mSelect.value : 'all';
                const currentSerie = serieSelect.value;
                
                let series = [];
                if (mFilter === 'all') {
                    series = this.getUniqueValues('serie');
                } else {
                    const filteredTrays = this.trays.filter(t => t.manufacturer === mFilter);
                    const seriesArray = filteredTrays.map(t => {
                        let cleaned = t.label;
                        if (cleaned.toLowerCase().startsWith(mFilter.toLowerCase())) {
                            cleaned = cleaned.substring(mFilter.length).trim();
                        }
                        return cleaned.split(' ')[0] || 'Andere';
                    });
                    series = [...new Set(seriesArray)].sort();
                }

                serieSelect.innerHTML = `<option value="all">Alle Serien</option>` + series.map(s => `<option value="${s}">${s}</option>`).join('');
                if (series.includes(currentSerie)) serieSelect.value = currentSerie;
                else serieSelect.value = 'all';
            },
            updateSizeOptions: function () {
                const fSelect = document.getElementById(`filterForm_${suffix}`);
                const mSelect = document.getElementById(`filterManufacturer_${suffix}`);
                const serieSelect = document.getElementById(`filterSerie_${suffix}`);
                const sSelect = document.getElementById(`filterSize_${suffix}`);
                if (!sSelect) return;

                const fFilter = fSelect ? fSelect.value : 'all';
                const mFilter = mSelect ? mSelect.value : 'all';
                const serieFilter = serieSelect ? serieSelect.value : 'all';
                
                const currentSize = sSelect.value;
                
                let sizes = [];
                if (fFilter === 'all' && mFilter === 'all' && serieFilter === 'all') {
                    sizes = this.getUniqueValues('size');
                } else {
                    const filteredTrays = this.trays.filter(t => {
                        if (fFilter !== 'all' && t.form !== fFilter) return false;
                        if (mFilter !== 'all' && t.manufacturer !== mFilter) return false;
                        
                        if (serieFilter !== 'all') {
                            let cleaned = t.label;
                            if (t.manufacturer && cleaned.toLowerCase().startsWith(t.manufacturer.toLowerCase())) {
                                cleaned = cleaned.substring(t.manufacturer.length).trim();
                            }
                            const serie = cleaned.split(' ')[0] || 'Andere';
                            if (serie !== serieFilter) return false;
                        }

                        return true;
                    });
                    sizes = [...new Set(filteredTrays.map(t => t.size))].sort();
                }
                
                sSelect.innerHTML = `<option value="all">Alle Grössen</option>` + sizes.map(s => `<option value="${s}">${s}</option>`).join('');
                if (sizes.includes(currentSize)) sSelect.value = currentSize;
                else sSelect.value = 'all';
            },
            updateManualInputs: function () {
                const sSelect = document.getElementById(`filterSize_${suffix}`);
                const lInput = document.getElementById(`filterLength_${suffix}`);
                const wInput = document.getElementById(`filterWidth_${suffix}`);
                
                if (sSelect.value === 'all') {
                    lInput.value = '';
                    wInput.value = '';
                } else {
                    const parts = sSelect.value.split(/[xX]/).map(p => p.trim());
                    if (parts.length === 2) {
                        lInput.value = parts[0];
                        wInput.value = parts[1];
                    }
                }
            },
            updateSizeDropdownFromManual: function () {
                const sSelect = document.getElementById(`filterSize_${suffix}`);
                const lInput = document.getElementById(`filterLength_${suffix}`).value;
                const wInput = document.getElementById(`filterWidth_${suffix}`).value;
                
                if (lInput && wInput) {
                    const sizeStr = `${lInput} x ${wInput}`;
                    const sizeStrRev = `${wInput} x ${lInput}`;
                    const opts = Array.from(sSelect.options).map(o => o.value);
                    if (opts.includes(sizeStr)) sSelect.value = sizeStr;
                    else if (opts.includes(sizeStrRev)) sSelect.value = sizeStrRev;
                    else sSelect.value = 'all'; 
                } else {
                    sSelect.value = 'all';
                }
            },
            filterResults: function () {
                const mFilter = document.getElementById(`filterManufacturer_${suffix}`)?.value || 'all';
                const serieFilter = document.getElementById(`filterSerie_${suffix}`)?.value || 'all';
                const fFilter = document.getElementById(`filterForm_${suffix}`)?.value || 'all';
                const sFilter = document.getElementById(`filterSize_${suffix}`)?.value || 'all';
                const lFilter = document.getElementById(`filterLength_${suffix}`)?.value || '';
                const wFilter = document.getElementById(`filterWidth_${suffix}`)?.value || '';

                const filtered = this.trays.filter(t => {
                    if (mFilter !== 'all' && t.manufacturer !== mFilter) return false;
                    
                    if (serieFilter !== 'all') {
                        let cleaned = t.label;
                        if (t.manufacturer && cleaned.toLowerCase().startsWith(t.manufacturer.toLowerCase())) {
                            cleaned = cleaned.substring(t.manufacturer.length).trim();
                        }
                        const serie = cleaned.split(' ')[0] || 'Andere';
                        if (serie !== serieFilter) return false;
                    }
                    
                    if (!hideSizeForm) {
                        if (fFilter !== 'all' && t.form !== fFilter) return false;
                        if (sFilter !== 'all') {
                            if (t.size !== sFilter) return false;
                        } else if (lFilter || wFilter) {
                            const parts = t.size.toLowerCase().split('x').map(p => p.trim());
                            if (parts.length === 2) {
                                const [l, w] = parts;
                                if (lFilter && wFilter) {
                                    if (!((l == lFilter && w == wFilter) || (l == wFilter && w == lFilter))) return false;
                                } else if (lFilter) {
                                    if (l != lFilter && w != lFilter) return false;
                                } else if (wFilter) {
                                    if (l != wFilter && w != wFilter) return false;
                                }
                            }
                        }
                    }
                    
                    // Filter Main Products by Montageart if chosen
                    if (this.currentMontageart !== 'alle') {
                        const m = this.classifyAccessory(t);
                        if (m !== 'common' && m !== this.currentMontageart) return false;
                    }
                    
                    return true;
                });

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
            },
            selectTray: function (id) {
                this.selectedTray = this.trays.find(t => t.id === id);
                
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
                            
                            this.selectedTray.mountingMaterials.forEach(mat => {
                                if (mat.options && mat.options.length > 1) {
                                    let bestMatchOpt = null;
                                    let bestMatchScore = 0;
                                    
                                    if (activeColors.length > 0) {
                                        mat.options.forEach(opt => {
                                            const optLbl = opt.label.toLowerCase();
                                            let score = 0;
                                            activeColors.forEach(c => {
                                                if (optLbl.includes(c)) score++;
                                            });
                                            if (score > bestMatchScore) {
                                                bestMatchScore = score;
                                                bestMatchOpt = opt;
                                            }
                                        });
                                    }
                                    
                                    // Fallback to default index 0 if returning to standard finish
                                    const hasExotic = activeColors.some(c => !['chrom', 'weiss', 'white'].includes(c));
                                    if (!bestMatchOpt && !hasExotic) {
                                        bestMatchOpt = mat.options[0];
                                    }
                                    
                                    if (bestMatchOpt) {
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

                this.selectedTray.mountingMaterials.forEach(mat => {
                    if (!mat.options || mat.options.length === 0) return;

                    const matClass = this.classifyAccessory(mat.options[0]) !== 'common' ? this.classifyAccessory(mat.options[0]) : this.classifyAccessory(mat);
                    
                    if (this.currentMontageart !== 'alle') {
                        if (matClass !== 'common' && matClass !== this.currentMontageart) return;
                    }

                    const groupDiv = document.createElement('div');
                    groupDiv.className = 'filter-group';
                    const label = document.createElement('label');
                    label.textContent = mat.name || "Zubehör";
                    
                    if (mat.options.length === 1) {
                        const opt = mat.options[0];
                        groupDiv.innerHTML = `<label>${mat.name}</label>
                            <div style="background:var(--bg-surface); padding:0.75rem; border-radius:6px; font-size:0.85rem; color:var(--text-primary); border:1px solid var(--border);">
                                <strong style="display:block; margin-bottom:0.25rem;">${opt.label}</strong>
                                <span style="color:var(--text-secondary); font-family:monospace;">${opt.artNr}</span>
                            </div>`;
                    } else {
                        const select = document.createElement('select');
                        select.className = 'filter-select';
                        mat.options.forEach(opt => {
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
                bomTableBody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: #9da3ad; padding: 2rem;">Bitte wählen Sie ein Produkt aus den Suchergebnissen.</td></tr>';
            },
            updateBOM: function () {
                if (!this.selectedTray) return;

                const materials = this.selectedTray.mountingMaterials || [];
                let visibleCount = 1; // Start with the main tray
                bomTableBody.innerHTML = '';

                // Evaluate Variant selection
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

                // Add Main Item
                const trayRow = document.createElement('tr');
                trayRow.innerHTML = `
                    <td><div class="img-cell"><img src="${this.selectedTray.imgUrl || this.mainImgUrl}"></div></td>
                    <td><span class="bom-code">${activeTrayArtNr}</span></td>
                    <td>
                        <div class="bom-desc">${activeTrayLabel}</div>
                        <div style="font-size: 0.8rem; color: #9e9e9e; margin-top: 0.25rem;">Hauptartikel</div>
                    </td>
                    <td><span class="bom-type">${title}</span></td>
                    <td><strong>${activeTrayMenge}</strong></td>
                `;
                bomTableBody.appendChild(trayRow);

                // Add Selected Mounting Materials
                materials.forEach(mat => {
                    if (!mat.options || mat.options.length === 0) return;
                    
                    const matClass = this.classifyAccessory(mat.options[0]) !== 'common' ? this.classifyAccessory(mat.options[0]) : this.classifyAccessory(mat);
                    
                    if (this.currentMontageart !== 'alle') {
                        if (matClass !== 'common' && matClass !== this.currentMontageart) return;
                    }

                    const selectedArtNr = this.selectedTray.selections[mat.id];
                    const selectedOption = (mat.options || []).find(o => o.artNr === selectedArtNr) || (mat.options && mat.options[0]);
                    
                    if (selectedOption) {
                        const matRow = document.createElement('tr');
                        matRow.innerHTML = `
                            <td><div class="img-cell" ${!selectedOption.imgUrl ? 'style="background: transparent; border: 1px dashed var(--border);"' : ''}>
                                ${selectedOption.imgUrl ? `<img src="${selectedOption.imgUrl}" alt="${selectedOption.label}" onerror="this.style.display='none'; this.parentNode.style.background='transparent'; this.parentNode.style.border='1px dashed var(--border)';">` : ''}
                            </div></td>
                            <td><span class="bom-code">${selectedOption.artNr}</span></td>
                            <td>
                                <div class="bom-desc">${selectedOption.label}</div>
                                <div style="font-size: 0.8rem; color: #9e9e9e; margin-top: 0.25rem;">Zwingendes Zubehör: ${mat.name || 'Zubehör'}</div>
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
                if (!this.selectedTray) {
                    alert('Bitte wählen Sie zuerst ein Produkt aus.');
                    return;
                }

                let activeTrayArtNr = this.selectedTray.selections && this.selectedTray.selections['__variant__'] ? this.selectedTray.selections['__variant__'] : this.selectedTray.artNr;
                let activeTrayMenge = 1;
                if (this.selectedTray.selections && this.selectedTray.selections['__variant__'] && this.selectedTray.selections['__variant__'] !== this.selectedTray.artNr) {
                    const variant = (this.selectedTray.variants || []).find(v => v.artNr === this.selectedTray.selections['__variant__']);
                    if (variant) activeTrayMenge = variant.menge || 1;
                } else {
                    activeTrayMenge = this.selectedTray.menge || 1;
                }

                let textLines = [`${activeTrayArtNr}\t${activeTrayMenge}`];
                (this.selectedTray.mountingMaterials || []).forEach(mat => {
                    const selectedArtNr = this.selectedTray.selections[mat.id];
                    const selectedOption = (mat.options || []).find(o => o.artNr === selectedArtNr) || (mat.options && mat.options[0]);
                    if (selectedOption) {
                        textLines.push(`${selectedOption.artNr}\t${selectedOption.menge || 1}`);
                    }
                });

                const text = textLines.join('\n');
                navigator.clipboard.writeText(text).then(() => {
                    alert("Artikel und Menge kopiert für SAP:\n\n" + text.replace(/\t/g, "    "));
                }).catch(e => alert("Kopieren fehlgeschlagen."));
            }
        };
    }
}
