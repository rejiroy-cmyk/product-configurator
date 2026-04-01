document.addEventListener('DOMContentLoaded', () => {

    // ============================================
    // = DATA VERSION — Bump this when you update =
    // = product data in app.js to force all      =
    // = browsers to discard old LocalStorage.     =
    // ============================================
    const DATA_VERSION = '2.0.0';

    // --- State & Navigation ---
    const homeView = document.getElementById('homeView');
    const configView = document.getElementById('configView');
    const backHomeBtn = document.getElementById('backHomeBtn');
    let currentActiveApp = null; // Track which app is loaded

    backHomeBtn.addEventListener('click', () => {
        configView.classList.remove('active-view');
        configView.classList.add('hidden-view');

        homeView.classList.remove('hidden-view');
        homeView.classList.add('active-view');
        currentActiveApp = null;
    });

    function openConfigurator(appId, breadcrumbs) {
        if (!productApps[appId]) {
            alert(`Der Konfigurator für diese Auswahl ist nicht registriert.`);
            return;
        }

        currentActiveApp = productApps[appId];

        homeView.classList.remove('active-view');
        homeView.classList.add('hidden-view');

        configView.classList.remove('hidden-view');
        configView.classList.add('active-view');

        document.getElementById('currentConfigBreadcrumb').innerHTML = `Big Konfigurator / ${breadcrumbs}`;
        currentActiveApp.init();
    }

    // --- Catalog Architecture ---
    const catalog = [
        {
            id: "dusche",
            name: "Dusche",
            thumbnail: "https://profishop.sanitastroesch.ch/multimedia/Web/PG1/01311872_100_181.png",
            subcategories: [
                { id: "duschenwanne", name: "Duschenwanne", appId: "duschenwanne", hasApp: true },
                { id: "duschenmischer", name: "Duschenmischer", appId: "duschenmischer", hasApp: true }
            ]
        },
        {
            id: "bad",
            name: "Bad",
            thumbnail: "https://profishop.sanitastroesch.ch/multimedia/Web/PG1/01113324.png",
            subcategories: [
                { id: "badewanne", name: "Badewanne", appId: "badewanne", hasApp: true },
                { id: "bademischer", name: "Bademischer", appId: "bademischer", hasApp: true } // Axor App
            ]
        },
        {
            id: "waschplatz",
            name: "Waschplatz",
            thumbnail: "https://profishop.sanitastroesch.ch/multimedia/Web/PG1/02112736_100_000.png",
            subcategories: [
                { id: "waschtisch", name: "Waschtisch", appId: "waschtisch", hasApp: true },
                { id: "einlochmischer", name: "Einlochmischer", appId: "einlochmischer", hasApp: true },
                { id: "wandmischer", name: "Wandmischer", appId: "wandmischer", hasApp: true }
            ]
        },
        {
            id: "kueche",
            name: "Küche",
            thumbnail: "https://profishop.sanitastroesch.ch/multimedia/Web/PG1/06511302.png",
            subcategories: [
                { id: "1teilig", name: "1-teilig", appId: "kueche_1teilig", hasApp: true }, // New App
                { id: "2teilig", name: "2-teilig", appId: "kueche_2teilig", hasApp: true }
            ]
        },
        {
            id: "waschautomaten",
            name: "Waschautomaten",
            thumbnail: "https://profishop.sanitastroesch.ch/multimedia/Web/PG1/07121279_100_000.png",
            subcategories: [
                { id: "einbausifon", name: "Einbausifon", appId: "wasch_einbausifon", hasApp: true },
                { id: "ap-sifon-weiss", name: "AP-Sifon weiss", appId: "wasch_apsifon_weiss", hasApp: true },
                { id: "ap-sifon-schwarz", name: "AP-Sifon schwarz", appId: "wasch_apsifon_schwarz", hasApp: true }
            ]
        },
        {
            id: "klosett",
            name: "Klosett",
            thumbnail: "https://profishop.sanitastroesch.ch/multimedia/Web/PG1/02111845_100_000.png",
            subcategories: [
                { id: "wandklosett", name: "Wandklosett", appId: "wandklosett", hasApp: true },
                { id: "standklosett", name: "Standklosett", appId: "standklosett", hasApp: true }
            ]
        }
    ];

    const categoryGrid = document.getElementById('categoryGrid');

    function renderCatalog() {
        categoryGrid.innerHTML = '';
        catalog.forEach(cat => {
            const card = document.createElement('div');
            card.className = 'category-card';

            const header = document.createElement('div');
            header.className = 'cat-header';
            header.innerHTML = `<img src="${cat.thumbnail}" class="cat-thumb" alt="${cat.name}"><h2>${cat.name}</h2>`;
            card.appendChild(header);

            if (cat.subcategories.length > 0) {
                const list = document.createElement('div');
                list.className = 'subcat-list';

                cat.subcategories.forEach(sub => {
                    const btn = document.createElement('button');
                    btn.className = `subcat-btn ${sub.hasApp ? 'has-app' : ''}`;
                    btn.innerHTML = `<span>${sub.name}</span> <i class="ri-arrow-right-line"></i>`;

                    btn.addEventListener('click', () => {
                        if (sub.hasApp && sub.appId) {
                            openConfigurator(sub.appId, `${cat.name} / <strong style="color: #fff">${sub.name}</strong>`);
                        } else {
                            alert(`Der Konfigurator für "${sub.name}" ist noch nicht verfügbar. Bitte versuchen Sie es später noch einmal.`);
                        }
                    });

                    list.appendChild(btn);
                });
                card.appendChild(list);
            }
            categoryGrid.appendChild(card);
        });
    }


    // ==========================================
    // = APP REGISTRY (PRODUCT CONFIGURATORS) =
    // ==========================================

    document.getElementById('printBtn').addEventListener('click', () => window.print());
    document.getElementById('copyBtn').addEventListener('click', () => {
        if (currentActiveApp && currentActiveApp.copyToClipboard) {
            currentActiveApp.copyToClipboard();
        }
    });

    const configSidebar = document.getElementById('configSidebar');
    const bomTableBody = document.getElementById('bomTableBody');
    const bomCountCounter = document.getElementById('bomCount');

    // === APP CONFIGURATOR FACTORIES ===
    function createFinishesApp(title, desc, mainImgUrl, baseBodyLabel, baseBodyArtNr, baseBodyImg) {
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
                    btn.innerHTML = `<div class="finish-swatch" style="background-color: ${finish.color}"></div><span>${finish.label}</span><span class="finish-artnr">${finish.artNr}</span>`;
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
                bomCountCounter.textContent = "2 Artikel benötigt";
                bomTableBody.innerHTML = `
                    <tr>
                        <td><div class="img-cell"><img src="${this.mainImgUrl}"></div></td>
                        <td><span class="bom-code">${finish.artNr}</span></td>
                        <td><div class="bom-desc">${title}</div><div style="font-size: 0.8rem; color: #9e9e9e; margin-top: 0.25rem;">Oberfläche: ${finish.label}</div></td>
                        <td><span class="bom-type">Sichtteil</span></td>
                        <td><strong>1</strong></td>
                    </tr>
                    <tr>
                        <td><div class="img-cell"><img src="${this.baseBody.imgUrl}"></div></td>
                        <td><span class="bom-code">${this.baseBody.artNr}</span></td>
                        <td><div class="bom-desc">${this.baseBody.label}</div><div style="font-size: 0.8rem; color: #9e9e9e; margin-top: 0.25rem;">Zwingendes Einbauteil</div></td>
                        <td><span class="bom-type">Grundkörper</span></td>
                        <td><strong>1</strong></td>
                    </tr>
                `;
            },
            copyToClipboard: function () {
                const finish = this.finishes.find(f => f.id === this.currentFinishId) || this.finishes[0];
                if (!finish) return;
                const text = `${finish.artNr}\t1\n${this.baseBody.artNr}\t1`;
                navigator.clipboard.writeText(text).then(() => alert("SAP Format kopiert:\n\n" + text.replace(/\t/g,"    "))).catch(e => alert("Fehler."));
            }
        };
    }

    function createRelationalApp(title, desc, mainImgUrl) {
        return {
            trays: [],
            mainImgUrl: mainImgUrl,
            selectedTray: null,
            init: function () {
                this.selectedTray = null;
                this.renderSidebar();
                this.bindFilters();
                this.filterResults(); // initial run
                this.clearBOM();
            },
            getUniqueValues: function (key) {
                return [...new Set(this.trays.map(t => t[key]))].sort();
            },
            renderSidebar: function () {
                const manufacturers = this.getUniqueValues('manufacturer');
                const forms = this.getUniqueValues('form');
                const sizes = this.getUniqueValues('size');

                configSidebar.innerHTML = `
                    <div class="sidebar-section">
                        <h2>Filter: ${title}</h2>
                        <p class="section-desc">Filtern Sie nach Hersteller, Form und Grösse, um das passende Produkt zu finden.</p>
                        
                        <div class="filter-group">
                            <label>Hersteller</label>
                            <select id="filterManufacturer_${title.replace(/\s/g,'')}" class="filter-select">
                                <option value="all">Alle Hersteller</option>
                                ${manufacturers.map(m => `<option value="${m}">${m}</option>`).join('')}
                            </select>
                        </div>
                        
                        <div class="filter-group">
                            <label>Form</label>
                            <select id="filterForm_${title.replace(/\s/g,'')}" class="filter-select">
                                <option value="all">Alle Formen</option>
                                ${forms.map(f => `<option value="${f}">${f}</option>`).join('')}
                            </select>
                        </div>
                        
                        <div class="filter-group">
                            <label>Grösse</label>
                            <select id="filterSize_${title.replace(/\s/g,'')}" class="filter-select">
                                <option value="all">Alle Grössen</option>
                                ${sizes.map(s => `<option value="${s}">${s}</option>`).join('')}
                            </select>
                        </div>
                    </div>
                    
                    <div class="sidebar-section">
                        <h2>Suchergebnisse <span id="resultCount_${title.replace(/\s/g,'')}" class="badge">0</span></h2>
                        <div class="search-results-container" id="searchResults_${title.replace(/\s/g,'')}">
                            <!-- Populated by JS -->
                        </div>
                    </div>
                `;
            },
            bindFilters: function () {
                const suffix = title.replace(/\s/g,'');
                const mSelect = document.getElementById(`filterManufacturer_${suffix}`);
                const fSelect = document.getElementById(`filterForm_${suffix}`);
                const sSelect = document.getElementById(`filterSize_${suffix}`);
                
                if (mSelect) mSelect.addEventListener('change', () => this.filterResults());
                if (fSelect) fSelect.addEventListener('change', () => this.filterResults());
                if (sSelect) sSelect.addEventListener('change', () => this.filterResults());
            },
            filterResults: function () {
                const suffix = title.replace(/\s/g,'');
                const mFilter = document.getElementById(`filterManufacturer_${suffix}`).value;
                const fFilter = document.getElementById(`filterForm_${suffix}`).value;
                const sFilter = document.getElementById(`filterSize_${suffix}`).value;

                const filtered = this.trays.filter(t => {
                    if (mFilter !== 'all' && t.manufacturer !== mFilter) return false;
                    if (fFilter !== 'all' && t.form !== fFilter) return false;
                    if (sFilter !== 'all' && t.size !== sFilter) return false;
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
                                <span>${t.manufacturer}</span> | <span>${t.size}</span>
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
                this.filterResults(); // re-render to highlight active
                this.updateBOM();
            },
            clearBOM: function () {
                bomCountCounter.textContent = "0 Artikel ausgewählt";
                bomTableBody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: #9da3ad; padding: 2rem;">Bitte wählen Sie ein Produkt aus den Suchergebnissen.</td></tr>';
            },
            updateBOM: function () {
                if (!this.selectedTray) return;

                const totalItems = 1 + this.selectedTray.mountingMaterials.length;
                bomCountCounter.textContent = `${totalItems} Artikel benötigt`;
                bomTableBody.innerHTML = '';

                // Add Main Item
                const trayRow = document.createElement('tr');
                trayRow.innerHTML = `
                    <td><div class="img-cell"><img src="${this.selectedTray.imgUrl || this.mainImgUrl}"></div></td>
                    <td><span class="bom-code">${this.selectedTray.artNr}</span></td>
                    <td>
                        <div class="bom-desc">${this.selectedTray.label}</div>
                        <div style="font-size: 0.8rem; color: #9e9e9e; margin-top: 0.25rem;">Hauptartikel</div>
                    </td>
                    <td><span class="bom-type">${title}</span></td>
                    <td><strong>1</strong></td>
                `;
                bomTableBody.appendChild(trayRow);

                // Add Mounting Materials
                this.selectedTray.mountingMaterials.forEach(mat => {
                    const matRow = document.createElement('tr');
                    matRow.innerHTML = `
                        <td><div class="img-cell" style="background: transparent; border: 1px dashed var(--border);"></div></td>
                        <td><span class="bom-code">${mat.artNr}</span></td>
                        <td>
                            <div class="bom-desc">${mat.label}</div>
                            <div style="font-size: 0.8rem; color: #9e9e9e; margin-top: 0.25rem;">Zwingendes Zubehör</div>
                        </td>
                        <td><span class="bom-type">${mat.type}</span></td>
                        <td><strong>1</strong></td>
                    `;
                    bomTableBody.appendChild(matRow);
                });
            },
            copyToClipboard: function () {
                if (!this.selectedTray) {
                    alert('Bitte wählen Sie zuerst ein Produkt aus.');
                    return;
                }

                let textLines = [`${this.selectedTray.artNr}\t1`];
                this.selectedTray.mountingMaterials.forEach(m => {
                    textLines.push(`${m.artNr}\t1`);
                });

                const text = textLines.join('\n');
                navigator.clipboard.writeText(text).then(() => {
                    alert("Artikel und Menge kopiert für SAP:\n\n" + text.replace(/\t/g, "    "));
                }).catch(e => alert("Kopieren fehlgeschlagen."));
            }
        };
    }


    const productApps = {

        // ------------------------------------------
        //  App 1: Axor Uno Configurator (Bademischer)
        // ------------------------------------------
        "bademischer": {
            finishes: [
                { id: "chrome", label: "Chrom Standard", artNr: "6410 221.501.000", color: "#e8eaed" },
                { id: "brushed-brass", label: "Brushed Brass", artNr: "6410 221.419.000", color: "#d9ae61" },
                { id: "brushed-nickel", label: "Brushed Nickel", artNr: "6410 221.463.000", color: "#b5b7b9" },
                { id: "polished-black-chrome", label: "Polished Black Chrome", artNr: "6410 221.472.000", color: "#2d2d2d" },
                { id: "brushed-black-chrome", label: "Brushed Black Chrome", artNr: "6410 221.462.000", color: "#4a4a4a" },
                { id: "brushed-bronze", label: "Brushed Bronze", artNr: "6410 221.461.000", color: "#b37b56" }
            ],
            baseBody: {
                label: "Grundkörper Hansgrohe 4-Loch Armatur",
                artNr: "6410 291.000.000",
                imgUrl: "https://profishop.sanitastroesch.ch/multimedia/Web/PG1/06410291_000_000.png"
            },
            mainImgUrl: "https://profishop.sanitastroesch.ch/multimedia/Web/PG1/06410221_463_000.png",
            currentFinishId: "chrome",

            init: function () {
                this.renderSidebar();
                this.updateBOM();
            },

            renderSidebar: function () {
                configSidebar.innerHTML = `
                    <div class="sidebar-section">
                        <h2>Produktsystem</h2>
                        <div class="product-selection-card">
                            <img src="${this.mainImgUrl}" class="thumb-img" alt="Axor">
                            <div class="product-info">
                                <h3>Wannenfüllkombination Axor Uno Zero</h3>
                                <p>4-Loch System, Standeinlauf</p>
                            </div>
                        </div>
                    </div>
                    
                    <div class="sidebar-section">
                        <h2>Systemkonfiguration</h2>
                        <p class="section-desc">Wählen Sie die sichtbare Oberfläche. Abhängigkeiten aktualisieren die Stückliste (BOM) automatisch.</p>
                        <div class="finish-selector">
                            <label>Sichtbare Oberfläche / Finish</label>
                            <div class="finish-buttons-grid" id="axorOptionsContainer"></div>
                        </div>
                    </div>
                    
                    <div class="sidebar-section alert-box">
                        <i class="ri-information-line"></i>
                        <div>
                            <strong>Hinweis zu Abhängigkeiten:</strong>
                            <p>Die Änderung der sichtbaren Oberfläche ändert nicht den benötigten verborgenen Grundkörper (Art-Nr: 6410 291.000.000). Dieser bleibt unabhängig von der Oberflächenfarbe identisch.</p>
                        </div>
                    </div>
                `;

                const container = document.getElementById('axorOptionsContainer');
                this.finishes.forEach(finish => {
                    const btn = document.createElement('button');
                    btn.className = `finish-row-btn ${finish.id === this.currentFinishId ? 'active' : ''}`;
                    btn.innerHTML = `
                        <div class="finish-swatch" style="background-color: ${finish.color}"></div>
                        <span>${finish.label}</span>
                        <span class="finish-artnr">${finish.artNr}</span>
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
                const finish = this.finishes.find(f => f.id === this.currentFinishId);
                bomCountCounter.textContent = "2 Artikel benötigt";

                bomTableBody.innerHTML = `
                    <tr>
                        <td><div class="img-cell"><img src="${this.mainImgUrl}"></div></td>
                        <td><span class="bom-code">${finish.artNr}</span></td>
                        <td>
                            <div class="bom-desc">Wannenfüllkombination Axor Uno Zero</div>
                            <div style="font-size: 0.8rem; color: #9e9e9e; margin-top: 0.25rem;">Oberfläche: ${finish.label}</div>
                        </td>
                        <td><span class="bom-type">Sichtteil</span></td>
                        <td><strong>1</strong></td>
                    </tr>
                    <tr>
                        <td><div class="img-cell"><img src="${this.baseBody.imgUrl}"></div></td>
                        <td><span class="bom-code">${this.baseBody.artNr}</span></td>
                        <td>
                            <div class="bom-desc">${this.baseBody.label}</div>
                            <div style="font-size: 0.8rem; color: #9e9e9e; margin-top: 0.25rem;">Zwingendes Einbauteil</div>
                        </td>
                        <td><span class="bom-type">Grundkörper</span></td>
                        <td><strong>1</strong></td>
                    </tr>
                `;
            },

            copyToClipboard: function () {
                const finish = this.finishes.find(f => f.id === this.currentFinishId);
                const text = `${finish.artNr}\t1\n${this.baseBody.artNr}\t1`;

                navigator.clipboard.writeText(text).then(() => {
                    alert("Artikel und Menge kopiert für SAP:\n\n" + text.replace(/\t/g, "    "));
                }).catch(e => alert("Kopieren fehlgeschlagen."));
            }
        },

        // ------------------------------------------
        //  App 2: Küche 1-teilig (Static Bundle)
        // ------------------------------------------
        "kueche_1teilig": {
            parts: [
                {
                    artNr: "6511 227.508.000",
                    label: "Regulierventil Laufen ⅜\", 45 mm, ohne Klemmverschraubung, ohne Rosette, Messing",
                    imgUrl: "https://profishop.sanitastroesch.ch/multimedia/Web/PG1/06511227.png",
                    type: "Kaltwasser Ventil"
                },
                {
                    artNr: "6511 302.508.000",
                    label: "Doppelventil Laufen Siduo ½\", ohne Klemmverschraubung, ohne Rückschlagventil, Messing",
                    imgUrl: "https://profishop.sanitastroesch.ch/multimedia/Web/PG1/06511302.png",
                    type: "Warmwasser Ventil"
                },
                {
                    artNr: "8112 211.336.000",
                    label: "Spültischsiphongarnitur 1-teilig, IG 1½\", Schlauchtülle 1\", Abgang 56 mm, grau",
                    imgUrl: "https://profishop.sanitastroesch.ch/multimedia/Web/PG1/08112211_336_000.png",
                    type: "Siphon"
                }
            ],
            mainImgUrl: "https://profishop.sanitastroesch.ch/multimedia/Web/PG1/08112211_336_000.png",

            init: function () {
                this.renderSidebar();
                this.updateBOM();
            },

            renderSidebar: function () {
                configSidebar.innerHTML = `
                    <div class="sidebar-section">
                        <h2>Produktsystem (Set)</h2>
                        <div class="product-selection-card">
                            <img src="${this.mainImgUrl}" class="thumb-img" alt="Siphon">
                            <div class="product-info">
                                <h3>Küche - 1-teiliges Setup</h3>
                                <p>Komplettausstattung Spültisch</p>
                            </div>
                        </div>
                    </div>
                    
                    <div class="sidebar-section">
                        <h2>Systemkonfiguration</h2>
                        <p class="section-desc">Dies ist ein statisches Komplettset. Alle benötigten Unterputz- und Montageteile sind fest definiert. Keine alternativen Oberflächen wählbar.</p>
                        <div class="alert-box" style="margin-top: 1rem; border-left-color: #4caf50;">
                            <i class="ri-check-double-line" style="color: #4caf50;"></i>
                            <div>
                                <strong style="color: #66bb6a;">Statische Stückliste</strong>
                                <p>Das Set enthält standardmässig das Laufen Regulierventil + Doppelventil sowie einen Spültischsiphon. Die Konfiguration ist abgeschlossen.</p>
                            </div>
                        </div>
                    </div>
                `;
            },

            updateBOM: function () {
                bomCountCounter.textContent = `${this.parts.length} Artikel benötigt`;
                bomTableBody.innerHTML = '';

                this.parts.forEach(part => {
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td><div class="img-cell"><img src="${part.imgUrl}"></div></td>
                        <td><span class="bom-code">${part.artNr}</span></td>
                        <td>
                            <div class="bom-desc">${part.label}</div>
                            <div style="font-size: 0.8rem; color: #9e9e9e; margin-top: 0.25rem;">Zwingendes Zubehör (Basic)</div>
                        </td>
                        <td><span class="bom-type">${part.type}</span></td>
                        <td><strong>1</strong></td>
                    `;
                    bomTableBody.appendChild(row);
                });
            },

            copyToClipboard: function () {
                const textLines = this.parts.map(p => `${p.artNr}\t1`);
                const text = textLines.join('\n');

                navigator.clipboard.writeText(text).then(() => {
                    alert("Artikel und Menge kopiert für SAP:\n\n" + text.replace(/\t/g, "    "));
                }).catch(e => alert("Kopieren fehlgeschlagen."));
            }
        },

        // ------------------------------------------
        //  App 3: Küche 2-teilig (Static Bundle)
        // ------------------------------------------
        "kueche_2teilig": {
            parts: [
                {
                    artNr: "6511 227.508.000",
                    label: "Regulierventil Laufen ⅜\", 45 mm, ohne Klemmverschraubung, ohne Rosette, Messing",
                    imgUrl: "https://profishop.sanitastroesch.ch/multimedia/Web/PG1/06511227.png",
                    type: "Kaltwasser Ventil"
                },
                {
                    artNr: "6511 302.508.000",
                    label: "Doppelventil Laufen Siduo ½\", ohne Klemmverschraubung, ohne Rückschlagventil, Messing",
                    imgUrl: "https://profishop.sanitastroesch.ch/multimedia/Web/PG1/06511302.png",
                    type: "Warmwasser Ventil"
                },
                {
                    artNr: "3163 138.100.000",
                    label: "Rohrbogensiphon Geberit 2-teilig, 1¼\" / 1½\" x 40 mm, Steckdichtung, Weiss",
                    imgUrl: "https://profishop.sanitastroesch.ch/multimedia/Web/PG1/03163138_100_000.png",
                    type: "Siphon (2-teilig)"
                }
            ],
            mainImgUrl: "https://profishop.sanitastroesch.ch/multimedia/Web/PG1/03163138_100_000.png",

            init: function () {
                this.renderSidebar();
                this.updateBOM();
            },

            renderSidebar: function () {
                configSidebar.innerHTML = `
                    <div class="sidebar-section">
                        <h2>Produktsystem (Set)</h2>
                        <div class="product-selection-card">
                            <img src="${this.mainImgUrl}" class="thumb-img" alt="Siphon 2-teilig">
                            <div class="product-info">
                                <h3>Küche - 2-teiliges Setup</h3>
                                <p>Komplettausstattung Doppelspültisch</p>
                            </div>
                        </div>
                    </div>
                    
                    <div class="sidebar-section">
                        <h2>Systemkonfiguration</h2>
                        <p class="section-desc">Dies ist ein statisches Komplettset. Alle benötigten Unterputz- und Montageteile sind fest definiert. Keine alternativen Oberflächen wählbar.</p>
                        <div class="alert-box" style="margin-top: 1rem; border-left-color: #4caf50;">
                            <i class="ri-check-double-line" style="color: #4caf50;"></i>
                            <div>
                                <strong style="color: #66bb6a;">Statische Stückliste</strong>
                                <p>Das Set enthält standardmässig das Laufen Regulierventil + Doppelventil sowie einen 2-teiligen Geberit Spültischsiphon. Die Konfiguration ist abgeschlossen.</p>
                            </div>
                        </div>
                    </div>
                `;
            },

            updateBOM: function () {
                bomCountCounter.textContent = `${this.parts.length} Artikel benötigt`;
                bomTableBody.innerHTML = '';

                this.parts.forEach(part => {
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td><div class="img-cell"><img src="${part.imgUrl}"></div></td>
                        <td><span class="bom-code">${part.artNr}</span></td>
                        <td>
                            <div class="bom-desc">${part.label}</div>
                            <div style="font-size: 0.8rem; color: #9e9e9e; margin-top: 0.25rem;">Zwingendes Zubehör (Basic)</div>
                        </td>
                        <td><span class="bom-type">${part.type}</span></td>
                        <td><strong>1</strong></td>
                    `;
                    bomTableBody.appendChild(row);
                });
            },

            copyToClipboard: function () {
                const textLines = this.parts.map(p => `${p.artNr}\t1`);
                const text = textLines.join('\n');

                navigator.clipboard.writeText(text).then(() => {
                    alert("Artikel und Menge kopiert für SAP:\n\n" + text.replace(/\t/g, "    "));
                }).catch(e => alert("Kopieren fehlgeschlagen."));
            }
        },

        // ------------------------------------------
        //  App 4: Waschautomaten - Einbausifon
        // ------------------------------------------
        "wasch_einbausifon": {
            parts: [
                {
                    artNr: "6116 342.502.000",
                    label: "Waschautomaten-Eckventil Alterna ½\", Chromeline",
                    imgUrl: "https://profishop.sanitastroesch.ch/multimedia/Web/PG1/06116342_502_000.png",
                    type: "Eckventil"
                },
                {
                    artNr: "7281 225.523.000",
                    label: "Einbausiphon Geberit, 2 Schlauchtüllen, Edelstahl matt",
                    imgUrl: "https://profishop.sanitastroesch.ch/multimedia/Web/PG1/07281225_523_000.png",
                    type: "Siphon (Sichtteil)"
                },
                {
                    artNr: "3163 163.000.000",
                    label: "Rohbau-Set Geberit EinbauSiphon, UP-Gehäuse",
                    imgUrl: "https://profishop.sanitastroesch.ch/multimedia/Web/PG1/03163163_000_000.png",
                    type: "Grundkörper"
                }
            ],
            mainImgUrl: "https://profishop.sanitastroesch.ch/multimedia/Web/PG1/07281225_523_000.png",

            init: function () { this.renderSidebar(); this.updateBOM(); },

            renderSidebar: function () {
                configSidebar.innerHTML = `
                    <div class="sidebar-section">
                        <h2>Produktsystem (Set)</h2>
                        <div class="product-selection-card">
                            <img src="${this.mainImgUrl}" class="thumb-img" alt="Einbausifon">
                            <div class="product-info">
                                <h3>Unterputz Siphon Set</h3>
                                <p>Waschautomaten komplett</p>
                            </div>
                        </div>
                    </div>
                    <div class="sidebar-section">
                        <h2>Systemkonfiguration</h2>
                        <p class="section-desc">Dies ist ein statisches Komplettset für den Unterputzeinbau.</p>
                        <div class="alert-box" style="margin-top: 1rem; border-left-color: #4caf50;">
                            <i class="ri-check-double-line" style="color: #4caf50;"></i>
                            <div>
                                <strong style="color: #66bb6a;">Statische Stückliste</strong>
                                <p>3-teiliges Set inklusive Eckventil, Sichtteil (Edelstahl) und UP-Gehäuse.</p>
                            </div>
                        </div>
                    </div>
                `;
            },

            updateBOM: function () {
                bomCountCounter.textContent = `${this.parts.length} Artikel benötigt`;
                bomTableBody.innerHTML = '';
                this.parts.forEach(part => {
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td><div class="img-cell"><img src="${part.imgUrl}"></div></td>
                        <td><span class="bom-code">${part.artNr}</span></td>
                        <td>
                            <div class="bom-desc">${part.label}</div>
                            <div style="font-size: 0.8rem; color: #9e9e9e; margin-top: 0.25rem;">Zwingendes Zubehör (Basic)</div>
                        </td>
                        <td><span class="bom-type">${part.type}</span></td>
                        <td><strong>1</strong></td>
                    `;
                    bomTableBody.appendChild(row);
                });
            },

            copyToClipboard: function () {
                const text = this.parts.map(p => `${p.artNr}\t1`).join('\n');
                navigator.clipboard.writeText(text).then(() => {
                    alert("Artikel und Menge kopiert für SAP:\n\n" + text.replace(/\t/g, "    "));
                });
            }
        },

        // ------------------------------------------
        //  App 5: Waschautomaten - AP-Sifon weiss
        // ------------------------------------------
        "wasch_apsifon_weiss": {
            parts: [
                {
                    artNr: "6116 342.502.000",
                    label: "Waschautomaten-Eckventil Alterna ½\", Chromeline",
                    imgUrl: "https://profishop.sanitastroesch.ch/multimedia/Web/PG1/06116342_502_000.png",
                    type: "Eckventil"
                },
                {
                    artNr: "7281 110.100.000",
                    label: "Siphon Geberit-AP, Schlauchtülle, Ø 40 mm, Weiss",
                    imgUrl: "https://profishop.sanitastroesch.ch/multimedia/Web/PG1/07281110_100_000.png",
                    type: "Aufputz Siphon"
                }
            ],
            mainImgUrl: "https://profishop.sanitastroesch.ch/multimedia/Web/PG1/07281110_100_000.png",

            init: function () { this.renderSidebar(); this.updateBOM(); },

            renderSidebar: function () {
                configSidebar.innerHTML = `
                    <div class="sidebar-section">
                        <h2>Produktsystem (Set)</h2>
                        <div class="product-selection-card">
                            <img src="${this.mainImgUrl}" class="thumb-img" alt="AP-Sifon Weiss">
                            <div class="product-info">
                                <h3>Aufputz Siphon (Weiss)</h3>
                                <p>Waschautomaten komplett</p>
                            </div>
                        </div>
                    </div>
                `;
            },

            updateBOM: function () {
                bomCountCounter.textContent = `${this.parts.length} Artikel benötigt`;
                bomTableBody.innerHTML = '';
                this.parts.forEach(part => {
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td><div class="img-cell"><img src="${part.imgUrl}"></div></td>
                        <td><span class="bom-code">${part.artNr}</span></td>
                        <td>
                            <div class="bom-desc">${part.label}</div>
                            <div style="font-size: 0.8rem; color: #9e9e9e; margin-top: 0.25rem;">Zwingendes Zubehör (Basic)</div>
                        </td>
                        <td><span class="bom-type">${part.type}</span></td>
                        <td><strong>1</strong></td>
                    `;
                    bomTableBody.appendChild(row);
                });
            },

            copyToClipboard: function () {
                const text = this.parts.map(p => `${p.artNr}\t1`).join('\n');
                navigator.clipboard.writeText(text).then(() => alert("Artikel und Menge kopiert für SAP:\n\n" + text.replace(/\t/g, "    ")));
            }
        },

        // ------------------------------------------
        //  App 6: Waschautomaten - AP-Sifon schwarz
        // ------------------------------------------
        "wasch_apsifon_schwarz": {
            parts: [
                {
                    artNr: "6116 342.502.000",
                    label: "Waschautomaten-Eckventil Alterna ½\", Chromeline",
                    imgUrl: "https://profishop.sanitastroesch.ch/multimedia/Web/PG1/06116342_502_000.png",
                    type: "Eckventil"
                },
                {
                    artNr: "8111 112.000.000",
                    label: "Siphon waagrecht, Ø 50 / 56 mm (Schwarz)",
                    imgUrl: "https://profishop.sanitastroesch.ch/multimedia/Web/PG1/08111112_000_000.png",
                    type: "Aufputz Siphon"
                }
            ],
            mainImgUrl: "https://profishop.sanitastroesch.ch/multimedia/Web/PG1/08111112_000_000.png",

            init: function () { this.renderSidebar(); this.updateBOM(); },

            renderSidebar: function () {
                configSidebar.innerHTML = `
                    <div class="sidebar-section">
                        <h2>Produktsystem (Set)</h2>
                        <div class="product-selection-card">
                            <img src="${this.mainImgUrl}" class="thumb-img" alt="AP-Sifon Schwarz">
                            <div class="product-info">
                                <h3>Aufputz Siphon (Schwarz)</h3>
                                <p>Waschautomaten komplett</p>
                            </div>
                        </div>
                    </div>
                `;
            },

            updateBOM: function () {
                bomCountCounter.textContent = `${this.parts.length} Artikel benötigt`;
                bomTableBody.innerHTML = '';
                this.parts.forEach(part => {
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td><div class="img-cell"><img src="${part.imgUrl}"></div></td>
                        <td><span class="bom-code">${part.artNr}</span></td>
                        <td>
                            <div class="bom-desc">${part.label}</div>
                            <div style="font-size: 0.8rem; color: #9e9e9e; margin-top: 0.25rem;">Zwingendes Zubehör (Basic)</div>
                        </td>
                        <td><span class="bom-type">${part.type}</span></td>
                        <td><strong>1</strong></td>
                    `;
                    bomTableBody.appendChild(row);
                });
            },

            copyToClipboard: function () {
                const text = this.parts.map(p => `${p.artNr}\t1`).join('\n');
                navigator.clipboard.writeText(text).then(() => alert("Artikel und Menge kopiert für SAP:\n\n" + text.replace(/\t/g, "    ")));
            }
        },

        // ==========================================
        //  DYNAMIC GENERATED TEMPLATES
        // ==========================================

        "duschenmischer": createFinishesApp(
            "Duschenmischer", "Mischbatterie für den Duschbereich", "https://profishop.sanitastroesch.ch/multimedia/Web/PG1/01113324.png",
            "HG iBox universal Grundkörper", "0000 018.001.000", "https://profishop.sanitastroesch.ch/multimedia/Web/PG1/06410291_000_000.png"
        ),
        "badewanne": Object.assign(createRelationalApp("Badewanne", "Wannensystem mit passendem Zubehör", "https://profishop.sanitastroesch.ch/multimedia/Web/PG1/01113324.png"), {
            trays: [
                { id: "bw1", manufacturer: "Schmidlin", form: "Rechteckig", size: "170x75", artNr: "1111 222.100.000", label: "Schmidlin DUO 170x75cm, Weiss", imgUrl: "https://profishop.sanitastroesch.ch/multimedia/Web/PG1/01113324.png", mountingMaterials: [{ artNr: "0000 111.000.000", label: "Wannenfüsse Badewanne", type: "Zubehör" }, { artNr: "0000 444.000.000", label: "Ab- und Überlaufgarnitur", type: "Zubehör" }] },
                { id: "bw2", manufacturer: "Kaldewei", form: "Rechteckig", size: "180x80", artNr: "1111 333.100.000", label: "Kaldewei Puro 180x80cm, Weiss", imgUrl: "https://profishop.sanitastroesch.ch/multimedia/Web/PG1/01113324.png", mountingMaterials: [{ artNr: "0000 222.000.000", label: "Spezial-Füsse Kaldewei", type: "Zubehör" }, { artNr: "0000 444.000.000", label: "Ab- und Überlaufgarnitur", type: "Zubehör" }] }
            ]
        }),
        "waschtisch": Object.assign(createRelationalApp("Waschtisch", "Waschtisch mit Siphon und Montagezubehör", "https://profishop.sanitastroesch.ch/multimedia/Web/PG1/02112736_100_000.png"), {
            trays: [
                { id: "wt1", manufacturer: "Laufen", form: "Rechteckig", size: "60x48", artNr: "2111 222.100.000", label: "Laufen Pro Waschtisch 60x48cm", imgUrl: "https://profishop.sanitastroesch.ch/multimedia/Web/PG1/02112736_100_000.png", mountingMaterials: [{ artNr: "3111 111.000.000", label: "Waschtisch-Siphon 5/4\" Chrom", type: "Siphon" }, { artNr: "4111 111.000.000", label: "Befestigungs-Set M10", type: "Montage" }] },
                { id: "wt2", manufacturer: "Alterna", form: "Oval", size: "55x42", artNr: "2111 333.100.000", label: "Alterna Aufsatzbecken Oval", imgUrl: "https://profishop.sanitastroesch.ch/multimedia/Web/PG1/02112736_100_000.png", mountingMaterials: [{ artNr: "3111 111.000.000", label: "Waschtisch-Siphon Raumsparschnitt", type: "Siphon" }] }
            ]
        }),
        "einlochmischer": createFinishesApp(
            "Einlochmischer", "Standarmatur für Waschtische", "https://profishop.sanitastroesch.ch/multimedia/Web/PG1/06410221_463_000.png",
            "HG Grundkörper 1-Loch", "0000 001.000.000", ""
        ),
        "wandmischer": createFinishesApp(
            "Wandmischer", "Wand-Montierte Waschtischarmatur", "https://profishop.sanitastroesch.ch/multimedia/Web/PG1/06410221_463_000.png",
            "HG Unterputz-Grundkörper Wandmischer", "1362 018.000.000", ""
        ),
        "wandklosett": createRelationalApp("Wandklosett System", "Wand-WC inkl. passendem WC-Sitz", "https://profishop.sanitastroesch.ch/multimedia/Web/PG1/02111845_100_000.png"),
        "standklosett": createRelationalApp("Standklosett System", "Bodenstehendes WC System", "https://profishop.sanitastroesch.ch/multimedia/Web/PG1/02111845_100_000.png"),

        // ------------------------------------------
        //  App 7: Duschenwanne (Dynamic Filter)
        // ------------------------------------------
        "duschenwanne": Object.assign(createRelationalApp("Duschenwanne", "Duschsystem mit passenden Komponenten", "https://profishop.sanitastroesch.ch/multimedia/Web/PG1/01311872_100_181.png"), {
            trays: [
                // === Alterna ===
                {
                    id: "a1", manufacturer: "Alterna", form: "Quadratisch", size: "80x80", artNr: "1317 153.100.000", label: "Alterna ecoplan 80x80cm, Weiss", imgUrl: "https://profishop.sanitastroesch.ch/multimedia/Web/PG1/01317153_100_000.png",
                    mountingMaterials: [
                        { artNr: "0000 001.000.000", label: "Wannenfüsse (Platzhalter)", type: "Zubehör" },
                        { artNr: "0000 002.000.000", label: "Ablauf (Platzhalter)", type: "Zubehör" }
                    ]
                },
                {
                    id: "a2", manufacturer: "Alterna", form: "Quadratisch", size: "80x80", artNr: "1317 163.100.000", label: "Alterna ecoplan 80x80cm (Typ B), Weiss", imgUrl: "https://profishop.sanitastroesch.ch/multimedia/Web/PG1/01317163_100_000.png",
                    mountingMaterials: [
                        { artNr: "0000 001.000.000", label: "Wannenfüsse (Platzhalter)", type: "Zubehör" },
                        { artNr: "0000 002.000.000", label: "Ablauf (Platzhalter)", type: "Zubehör" }
                    ]
                },
                {
                    id: "a3", manufacturer: "Alterna", form: "Quadratisch", size: "90x90", artNr: "1317 154.100.000", label: "Alterna ecoplan 90x90cm, Weiss", imgUrl: "https://profishop.sanitastroesch.ch/multimedia/Web/PG1/01317154_100_000.png",
                    mountingMaterials: [
                        { artNr: "0000 001.000.000", label: "Wannenfüsse (Platzhalter)", type: "Zubehör" },
                        { artNr: "0000 002.000.000", label: "Ablauf (Platzhalter)", type: "Zubehör" }
                    ]
                },
                {
                    id: "a4", manufacturer: "Alterna", form: "Quadratisch", size: "90x90", artNr: "1317 164.100.000", label: "Alterna ecoplan 90x90cm (Typ B), Weiss", imgUrl: "https://profishop.sanitastroesch.ch/multimedia/Web/PG1/01317164_100_000.png",
                    mountingMaterials: [
                        { artNr: "0000 001.000.000", label: "Wannenfüsse (Platzhalter)", type: "Zubehör" },
                        { artNr: "0000 002.000.000", label: "Ablauf (Platzhalter)", type: "Zubehör" }
                    ]
                }
            ]
        })
    };

    // --- Boot Sequence ---
    renderCatalog();

    const modifiedApps = new Set(); // Track which apps have local overrides

    // Auto-invalidate stale LocalStorage when DATA_VERSION changes
    const storedVersion = localStorage.getItem('sanitas_data_version');
    if (storedVersion !== DATA_VERSION) {
        // Version mismatch — wipe old data so all browsers load fresh defaults
        localStorage.removeItem('sanitas_config_data');
        localStorage.setItem('sanitas_data_version', DATA_VERSION);
        console.log(`[Konfigurator] Data version updated: ${storedVersion || 'none'} → ${DATA_VERSION}. LocalStorage cleared.`);
    } else {
        // Version matches — load user's saved customizations
        const savedData = localStorage.getItem('sanitas_config_data');
        if (savedData) {
            const parsed = JSON.parse(savedData);
            Object.keys(parsed).forEach(appId => {
                if (productApps[appId]) {
                    Object.assign(productApps[appId], parsed[appId]);
                    modifiedApps.add(appId);
                }
            });
        }
    }

    // ==========================================
    // = ADMIN VIEW & EXCEL INTEGRATION =
    // ==========================================
    const adminView = document.getElementById('adminView');
    const openAdminBtn = document.getElementById('openAdminBtn');
    if (openAdminBtn) {
        const exitAdminBtn = document.getElementById('exitAdminBtn');
        const saveAdminBtn = document.getElementById('saveAdminBtn');
        const resetAdminBtn = document.getElementById('resetAdminBtn');
        const resetAllAdminBtn = document.getElementById('resetAllAdminBtn');
        const adminAppSelector = document.getElementById('adminAppSelector');
        const adminCurrentAppName = document.getElementById('adminCurrentAppName');
        const adminEditorArea = document.getElementById('adminEditorArea');

        const downloadExcelBtn = document.getElementById('downloadExcelBtn');
        const uploadExcelBtn = document.getElementById('uploadExcelBtn');
        const uploadExcelInput = document.getElementById('uploadExcelInput');

        let currentAdminAppId = null;

        openAdminBtn.addEventListener('click', () => {
            homeView.classList.remove('active-view');
            homeView.classList.add('hidden-view');
            configView.classList.remove('active-view');
            configView.classList.add('hidden-view');

            adminView.classList.remove('hidden-view');
            adminView.classList.add('active-view');

            if (currentActiveApp && currentActiveApp.selectedTray) {
                // reset state if they were in the middle of a configuration
                currentActiveApp = null;
            }

            renderAdminSidebar();
        });

        exitAdminBtn.addEventListener('click', () => {
            adminView.classList.remove('active-view');
            adminView.classList.add('hidden-view');
            homeView.classList.remove('hidden-view');
            homeView.classList.add('active-view');
        });

        function saveAllData(showSuccessAlert = true) {
            const dataToSave = {};
            Object.keys(productApps).forEach(appId => {
                const app = productApps[appId];
                dataToSave[appId] = {};
                if (app.parts) dataToSave[appId].parts = app.parts;
                if (app.finishes) dataToSave[appId].finishes = app.finishes;
                if (app.baseBody) dataToSave[appId].baseBody = app.baseBody;
                if (app.mainImgUrl !== undefined) dataToSave[appId].mainImgUrl = app.mainImgUrl;
                if (app.trays) dataToSave[appId].trays = app.trays;
            });
            localStorage.setItem('sanitas_config_data', JSON.stringify(dataToSave));
            if (showSuccessAlert) {
                alert('Änderungen erfolgreich gespeichert! Beim nächsten Laden des Konfigurators werden diese verwendet.');
            }
        }

        saveAdminBtn.addEventListener('click', () => {
            saveAllData(true);
        });
        
        if (resetAdminBtn) {
            resetAdminBtn.addEventListener('click', () => {
                if(!currentAdminAppId) return;
                
                if(confirm('Möchten Sie wirklich alle importierten Daten für diese Kategorie löschen? Der Standard aus app.js wird beim nächsten Laden wiederhergestellt.')) {
                    const savedData = localStorage.getItem('sanitas_config_data');
                    if(savedData) {
                         const parsed = JSON.parse(savedData);
                         if (parsed[currentAdminAppId]) {
                               delete parsed[currentAdminAppId];
                               localStorage.setItem('sanitas_config_data', JSON.stringify(parsed));
                         }
                    }
                    alert('Daten für diese Kategorie zurückgesetzt. Die Seite wird neu geladen.');
                    location.reload();
                }
            });
        }

        if (resetAllAdminBtn) {
            resetAllAdminBtn.addEventListener('click', () => {
                if(confirm('ACHTUNG: Dies löscht ALLE Ihre lokalen Änderungen in ALLEN Kategorien. Die Anwendung wird komplett mit dem neuesten Quellcode synchronisiert. Fortfahren?')) {
                    localStorage.removeItem('sanitas_config_data');
                    alert('Gesamte Anwendung synchronisiert! Die Seite wird nun neu geladen.');
                    location.reload();
                }
            });
        }

        function renderAdminSidebar() {
            adminAppSelector.innerHTML = '';
            catalog.forEach(cat => {
                cat.subcategories.forEach(sub => {
                    if (sub.hasApp && sub.appId) {
                        const btn = document.createElement('button');
                        btn.className = `finish-row-btn ${currentAdminAppId === sub.appId ? 'active' : ''}`;
                        btn.innerHTML = `<span>${cat.name} / ${sub.name}</span>`;
                        btn.addEventListener('click', () => {
                            Array.from(adminAppSelector.children).forEach(c => c.classList.remove('active'));
                            btn.classList.add('active');
                            openAdminEditor(sub.appId, `${cat.name} / ${sub.name}`);
                        });
                        adminAppSelector.appendChild(btn);
                    }
                });
            });
        }

        function openAdminEditor(appId, name) {
            currentAdminAppId = appId;
            adminCurrentAppName.textContent = name;

            downloadExcelBtn.style.display = 'flex';
            uploadExcelBtn.style.display = 'flex';

            const uploadCsvInput = document.getElementById('uploadCsvInput');
            if (uploadCsvInput) {
                if (productApps[appId].trays || productApps[appId].parts || productApps[appId].finishes) {
                    uploadCsvInput.style.display = 'block';
                } else {
                    uploadCsvInput.style.display = 'none';
                }
            }

            renderAdminEditorArea();
        }

        function renderAdminEditorArea() {
            const app = productApps[currentAdminAppId];
            adminEditorArea.innerHTML = '';

            // Persistence Indicator
            if (modifiedApps.has(currentAdminAppId)) {
                const indicator = document.createElement('div');
                indicator.className = 'alert-box';
                indicator.style.borderLeftColor = '#f44336';
                indicator.style.marginBottom = '1rem';
                indicator.innerHTML = `
                    <i class="ri-history-line" style="color: #f44336;"></i>
                    <div>
                        <strong style="color: #ef5350;">Lokale Änderungen aktiv</strong>
                        <p>Diese Kategorie lädt Daten aus Ihrem Browser-Speicher. Wenn Sie die neueste Version aus dem Quellcode (app.js) sehen möchten, klicken Sie oben auf <b>Zurücksetzen</b>.</p>
                    </div>
                `;
                adminEditorArea.appendChild(indicator);
            }

            if (app.mainImgUrl !== undefined) {
                const imgWrap = document.createElement('div');
                imgWrap.innerHTML = `
                    <div class="filter-group">
                        <label>Hauptbild URL (mainImgUrl)</label>
                        <input type="text" class="admin-input" id="adminMainImgUrl" value="${app.mainImgUrl}">
                    </div>
                `;
                adminEditorArea.appendChild(imgWrap);
                document.getElementById('adminMainImgUrl').addEventListener('change', (e) => app.mainImgUrl = e.target.value);
            }

            if (app.baseBody !== undefined) {
                const baseWrap = document.createElement('div');
                baseWrap.className = "filter-group";
                baseWrap.innerHTML = `
                    <label>Statischer Grundkörper (für Mischer)</label>
                    <div style="display:flex; gap: 0.5rem; margin-bottom: 0.5rem;">
                       <input type="text" class="admin-input" id="baseArtNr" placeholder="Art-Nr" value="${app.baseBody.artNr}">
                       <input type="text" class="admin-input" id="baseLabel" placeholder="Label" value="${app.baseBody.label}">
                       <input type="text" class="admin-input" id="baseImgUrl" placeholder="Image URL" value="${app.baseBody.imgUrl}">
                    </div>
                 `;
                adminEditorArea.appendChild(baseWrap);
                document.getElementById('baseArtNr').addEventListener('change', (e) => app.baseBody.artNr = e.target.value);
                document.getElementById('baseLabel').addEventListener('change', (e) => app.baseBody.label = e.target.value);
                document.getElementById('baseImgUrl').addEventListener('change', (e) => app.baseBody.imgUrl = e.target.value);
            }

            const tableWrap = document.createElement('div');
            tableWrap.className = 'admin-table-wrapper';

            if (app.trays) {
                tableWrap.innerHTML = `<h3>Duschenwannen Datensatz (${app.trays.length} Einträge)</h3>
                    <div style="padding: 1rem;"><p style="font-size: 0.85rem; color: var(--text-secondary);">Native Editier- und Löschfunktion für schnelle Anpassungen.</p></div>
                    <table class="bom-table">
                      <thead><tr><th>ID</th><th>Hersteller</th><th>Art-Nr</th><th>Label</th><th>Zubehör</th><th>Aktionen</th></tr></thead>
                      <tbody>
                        ${app.trays.map((t, i) => `<tr>
                            <td>${t.id}</td><td>${t.manufacturer}</td><td><span class="bom-code">${t.artNr}</span></td><td>${t.label}</td><td>${t.mountingMaterials.length} Artikel</td>
                            <td style="white-space:nowrap;">
                                <button class="icon-btn" onclick="openEditModal('trays', ${i})" style="padding:0.2rem;display:inline-block;"><i class="ri-edit-2-line"></i></button>
                                <button class="icon-btn btn-danger" onclick="deleteAdminItem('trays', ${i})" style="padding:0.2rem;border:none;display:inline-block;"><i class="ri-delete-bin-line"></i></button>
                            </td>
                        </tr>`).join('')}
                      </tbody>
                    </table>
                `;
            } else if (app.parts) {
                tableWrap.innerHTML = `<h3>Komponenten des Sets (${app.parts.length} Einträge)</h3>
                    <div style="padding: 1rem;"><p style="font-size: 0.85rem; color: var(--text-secondary);">Kopierbares CSV-Warenkorb Format wird für Import voll unterstützt.</p></div>
                    <table class="bom-table">
                      <thead><tr><th>Art-Nr</th><th>Label</th><th>Typ</th><th>Aktionen</th></tr></thead>
                      <tbody>
                        ${app.parts.map((p, i) => `<tr>
                            <td><span class="bom-code">${p.artNr}</span></td><td>${p.label}</td><td>${p.type}</td>
                            <td style="white-space:nowrap;">
                                <button class="icon-btn" onclick="openEditModal('parts', ${i})" style="padding:0.2rem;display:inline-block;"><i class="ri-edit-2-line"></i></button>
                                <button class="icon-btn btn-danger" onclick="deleteAdminItem('parts', ${i})" style="padding:0.2rem;border:none;display:inline-block;"><i class="ri-delete-bin-line"></i></button>
                            </td>
                        </tr>`).join('')}
                      </tbody>
                    </table>
                `;
            } else if (app.finishes) {
                tableWrap.innerHTML = `<h3>Oberflächen Varianten (${app.finishes.length} Einträge)</h3>
                    <table class="bom-table">
                      <thead><tr><th>ID</th><th>Art-Nr</th><th>Label</th><th>Farbe (Hex)</th><th>Aktionen</th></tr></thead>
                      <tbody>
                        ${app.finishes.map((f, i) => `<tr>
                            <td>${f.id}</td><td><span class="bom-code">${f.artNr}</span></td><td>${f.label}</td><td><div style="display:flex;align-items:center;gap:0.5rem;"><div class="finish-swatch" style="background:${f.color}"></div>${f.color}</div></td>
                            <td style="white-space:nowrap;">
                                <button class="icon-btn" onclick="openEditModal('finishes', ${i})" style="padding:0.2rem;display:inline-block;"><i class="ri-edit-2-line"></i></button>
                                <button class="icon-btn btn-danger" onclick="deleteAdminItem('finishes', ${i})" style="padding:0.2rem;border:none;display:inline-block;"><i class="ri-delete-bin-line"></i></button>
                            </td>
                        </tr>`).join('')}
                      </tbody>
                    </table>
                `;
            }

            adminEditorArea.appendChild(tableWrap);
        }

        // EXCEL DOWNLOAD REFACTOR FOR RELATIONAL MAP
        downloadExcelBtn.onclick = () => {
            if (!window.XLSX) { alert("XLSX Library not loaded yet."); return; }
            const app = productApps[currentAdminAppId];
            const wb = XLSX.utils.book_new();

            if (app.trays) {
                // Multi-Sheet Relational Model
                const traysData = app.trays.map(t => ({
                    id: t.id, manufacturer: t.manufacturer, form: t.form, size: t.size,
                    artNr: t.artNr, label: t.label, imgUrl: t.imgUrl
                }));

                const zubehoerData = [];
                app.trays.forEach(t => {
                    t.mountingMaterials.forEach(m => {
                        zubehoerData.push({
                            tray_id: t.id,
                            artNr: m.artNr,
                            label: m.label,
                            type: m.type
                        });
                    });
                });

                XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(traysData), "Duschenwannen");
                XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(zubehoerData), "Zubehoer");

            } else if (app.parts) {
                XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(app.parts.map(p => ({ ...p }))), "Database");
            } else if (app.finishes) {
                XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(app.finishes.map(f => ({ ...f }))), "Database");
            }

            XLSX.writeFile(wb, `${currentAdminAppId}_data.xlsx`);
        };

        // EXCEL UPLOAD REFACTOR
        uploadExcelBtn.onclick = () => uploadExcelInput.click();

        uploadExcelInput.onchange = (e) => {
            if (!window.XLSX) { alert("XLSX Library not loaded."); return; }
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (evt) => {
                try {
                    const data = new Uint8Array(evt.target.result);
                    const workbook = XLSX.read(data, { type: 'array' });
                    const app = productApps[currentAdminAppId];

                    if (app.trays) {
                        const traysSheet = workbook.Sheets['Duschenwannen'];
                        const zubehoerSheet = workbook.Sheets['Zubehoer'];

                        if (!traysSheet) {
                            alert("Ungültiges Excel Format. Das Arbeitsblatt 'Duschenwannen' fehlt.");
                            return;
                        }

                        const traysRows = XLSX.utils.sheet_to_json(traysSheet);
                        const zubehoerRows = zubehoerSheet ? XLSX.utils.sheet_to_json(zubehoerSheet) : [];

                        applyExcelRelationalData(currentAdminAppId, traysRows, zubehoerRows);
                    } else {
                        const firstSheet = workbook.SheetNames[0];
                        const rows = XLSX.utils.sheet_to_json(workbook.Sheets[firstSheet]);
                        if (rows.length === 0) {
                            alert("Das Excel Dokument scheint leer zu sein.");
                            return;
                        }
                        applyExcelData(currentAdminAppId, rows);
                    }

                    renderAdminEditorArea();
                    alert("Daten erfolgreich temporär geladen! Vergessen Sie nicht, auf 'Änderungen Speichern' zu klicken.");
                } catch (err) {
                    console.error(err);
                    alert("Fehler beim Verarbeiten der Excel Datei.");
                }
                uploadExcelInput.value = '';
            };
            reader.readAsArrayBuffer(file);
        };

        // --- NATIVE MODAL CRUD LOGIC ---
        window.deleteAdminItem = function(type, idx) {
            const app = productApps[currentAdminAppId];
            if(confirm('Diesen Eintrag wirklich löschen?')) {
                if(type === 'trays') app.trays.splice(idx, 1);
                else if(type === 'parts') app.parts.splice(idx, 1);
                else if(type === 'finishes') app.finishes.splice(idx, 1);
                
                // Auto-save deletion
                saveAllData(false);
                if (currentAdminAppId) modifiedApps.add(currentAdminAppId);
                
                renderAdminEditorArea();
            }
        };

        let currentEditItem = null;
        let currentEditType = null;
        let currentEditIdx = -1;

        window.openEditModal = function(type, idx) {
            const app = productApps[currentAdminAppId];
            currentEditType = type;
            currentEditIdx = idx;
            const modalBody = document.getElementById('adminEditModalBody');
            
            let item;
            if(type === 'trays') item = app.trays[idx];
            else if(type === 'parts') item = app.parts[idx];
            else if(type === 'finishes') item = app.finishes[idx];
            currentEditItem = item;

            let html = '';
            if(type === 'trays') {
                html = `
                    <div class="filter-group"><label>Spezifische ID</label><input type="text" id="edit_id" class="admin-input" value="${item.id}" readonly></div>
                    <div class="filter-group"><label>Hersteller</label><input type="text" id="edit_manufacturer" class="admin-input" value="${item.manufacturer}"></div>
                    <div class="filter-group"><label>Form</label><input type="text" id="edit_form" class="admin-input" value="${item.form}"></div>
                    <div class="filter-group"><label>Grösse</label><input type="text" id="edit_size" class="admin-input" value="${item.size}"></div>
                    <div class="filter-group"><label>Art-Nr</label><input type="text" id="edit_artNr" class="admin-input" value="${item.artNr}"></div>
                    <div class="filter-group"><label>Label (Bezeichnung)</label><input type="text" id="edit_label" class="admin-input" value="${item.label}"></div>
                    <div class="filter-group"><label>Bild URL</label><input type="text" id="edit_imgUrl" class="admin-input" value="${item.imgUrl || ''}"></div>
                `;
            } else if(type === 'parts') {
                html = `
                    <div class="filter-group"><label>Art-Nr</label><input type="text" id="edit_artNr" class="admin-input" value="${item.artNr}"></div>
                    <div class="filter-group"><label>Label (Bezeichnung)</label><input type="text" id="edit_label" class="admin-input" value="${item.label}"></div>
                    <div class="filter-group"><label>Typ (z.B. Zubehör)</label><input type="text" id="edit_type" class="admin-input" value="${item.type || ''}"></div>
                    <div class="filter-group"><label>Bild URL</label><input type="text" id="edit_imgUrl" class="admin-input" value="${item.imgUrl || ''}"></div>
                `;
            } else if(type === 'finishes') {
                html = `
                    <div class="filter-group"><label>ID</label><input type="text" id="edit_id" class="admin-input" value="${item.id}" readonly></div>
                    <div class="filter-group"><label>Art-Nr</label><input type="text" id="edit_artNr" class="admin-input" value="${item.artNr}"></div>
                    <div class="filter-group"><label>Label (Bezeichnung)</label><input type="text" id="edit_label" class="admin-input" value="${item.label}"></div>
                    <div class="filter-group"><label>Farbe (Hex-Code)</label><input type="text" id="edit_color" class="admin-input" value="${item.color || ''}"></div>
                `;
            }
            modalBody.innerHTML = html;
            document.getElementById('adminEditModal').classList.add('active');
        };

        window.closeAdminEditModal = function() {
            document.getElementById('adminEditModal').classList.remove('active');
        };

        const saveEditModalBtn = document.getElementById('saveEditModalBtn');
        if(saveEditModalBtn) {
            saveEditModalBtn.addEventListener('click', () => {
                if(!currentEditItem) return;
                
                if(currentEditType === 'trays') {
                    currentEditItem.manufacturer = document.getElementById('edit_manufacturer').value;
                    currentEditItem.form = document.getElementById('edit_form').value;
                    currentEditItem.size = document.getElementById('edit_size').value;
                    currentEditItem.artNr = document.getElementById('edit_artNr').value;
                    currentEditItem.label = document.getElementById('edit_label').value;
                    currentEditItem.imgUrl = document.getElementById('edit_imgUrl').value;
                } else if(currentEditType === 'parts') {
                    currentEditItem.artNr = document.getElementById('edit_artNr').value;
                    currentEditItem.label = document.getElementById('edit_label').value;
                    currentEditItem.type = document.getElementById('edit_type').value;
                    currentEditItem.imgUrl = document.getElementById('edit_imgUrl').value;
                } else if(currentEditType === 'finishes') {
                    currentEditItem.artNr = document.getElementById('edit_artNr').value;
                    currentEditItem.label = document.getElementById('edit_label').value;
                    currentEditItem.color = document.getElementById('edit_color').value;
                }
                
                closeAdminEditModal();
                
                // Auto-save edit
                saveAllData(false);
                if (currentAdminAppId) modifiedApps.add(currentAdminAppId);
                
                renderAdminEditorArea();
            });
        }

        // SMART CSV CART UPLOAD ODER DROPZONE
        const uploadCsvInput = document.getElementById('uploadCsvInput');

        if (uploadCsvInput) {
            uploadCsvInput.onchange = (e) => {
                const file = e.target.files[0];
                if (!file) return;

                const reader = new FileReader();
                reader.onload = (evt) => {
                    const text = evt.target.result;
                    const lines = text.split(/\r?\n|\r/).map(l => l.trim()).filter(l => l.length > 0);
                    if (lines.length < 1) {
                        alert("Leere CSV Datei.");
                        return;
                    }

                    const app = productApps[currentAdminAppId];
                    if (!app) return;

                    if (app.trays) {
                        // Parse first row for Duschwanne
                        const firstRowCols = lines[0].split(';');
                        if (firstRowCols.length < 4) {
                            alert("Ungültiges Warenkorb Format. Erwartet wird ein Semicolon-separiertes CSV.");
                            return;
                        }

                        const mainArtNr = firstRowCols[0].trim();
                        const mainDesc = firstRowCols[3].trim();
                        
                        // smart extraction
                        let size = "90x90";
                        const sizeMatch = mainDesc.match(/(\d+)\s*x\s*(\d+)/);
                        if (sizeMatch) {
                            size = `${Math.round(parseInt(sizeMatch[1]) / 10)}x${Math.round(parseInt(sizeMatch[2]) / 10)}`;
                        }
                        
                        let manufacturer = "Alterna";
                        if (mainDesc.toLowerCase().includes("kaldewei")) manufacturer = "Kaldewei";
                        else if (mainDesc.toLowerCase().includes("schmidlin")) manufacturer = "Schmidlin";
                        
                        let form = "Rechteckig";
                        if (sizeMatch && sizeMatch[1] === sizeMatch[2]) form = "Quadratisch";

                        const newTray = {
                            id: `csv_${Math.random().toString(36).substr(2, 5)}`,
                            manufacturer: manufacturer,
                            form: form,
                            size: size,
                            artNr: mainArtNr,
                            label: mainDesc,
                            imgUrl: '', 
                            mountingMaterials: []
                        };

                        // Parse rows 2 to N
                        for (let i = 1; i < lines.length; i++) {
                            const cols = lines[i].split(';');
                            if (cols.length >= 4) {
                                newTray.mountingMaterials.push({
                                    artNr: cols[0].trim(),
                                    label: cols[3].trim(),
                                    type: 'Zubehör'
                                });
                            }
                        }
                        app.trays.push(newTray);
                        
                        renderAdminEditorArea();
                        alert(`Warenkorb erfolgreich als Duschwanne importiert:\n- Größe: ${size}\n- Form: ${form}\n- Zubehör-Artikel: ${newTray.mountingMaterials.length} Stück.\n\nVergessen Sie nicht, zu speichern!`);
                    
                    } else if (app.parts) {
                        
                        let added = 0;
                        for (let i = 0; i < lines.length; i++) {
                            const cols = lines[i].split(';');
                            if (cols.length >= 4) {
                                app.parts.push({
                                    artNr: cols[0].trim(),
                                    label: cols[3].trim(),
                                    type: 'Zubehör (CSV Import)',
                                    imgUrl: ''
                                });
                                added++;
                            }
                        }
                        renderAdminEditorArea();
                        alert(`${added} Artikel erfolgreich zur Stückliste hinzugefügt!\nVergessen Sie nicht, zu speichern.`);

                    } else if (app.finishes) {

                        let added = 0;
                        for (let i = 0; i < lines.length; i++) {
                            const cols = lines[i].split(';');
                            if (cols.length >= 4) {
                                app.finishes.push({
                                    id: `csv_${Math.random().toString(36).substr(2, 5)}`,
                                    label: cols[3].trim(),
                                    artNr: cols[0].trim(),
                                    color: '#cccccc' // Default color marker
                                });
                                added++;
                            }
                        }
                        renderAdminEditorArea();
                        alert(`${added} Optionen erfolgreich als Oberflächen importiert!\nVergessen Sie nicht, zu speichern.`);
                    }
                    uploadCsvInput.value = '';
                };
                reader.readAsText(file);
            };
        }

        function applyExcelRelationalData(appId, traysRows, zubehoerRows) {
            const app = productApps[appId];
            app.trays = traysRows.map(r => {
                const trayId = r.id || ('new_' + Math.random().toString(36).substr(2, 5));
                // filter matching accessories
                const relatedZubes = zubehoerRows.filter(z => z.tray_id == trayId);
                return {
                    id: trayId,
                    manufacturer: r.manufacturer || '',
                    form: r.form || '',
                    size: r.size || '',
                    artNr: r.artNr || '',
                    label: r.label || '',
                    imgUrl: r.imgUrl || '',
                    mountingMaterials: relatedZubes.map(z => ({
                        artNr: z.artNr || '',
                        label: z.label || '',
                        type: z.type || 'Zubehör'
                    }))
                };
            });
        }

        function applyExcelData(appId, rows) {
            const app = productApps[appId];
            if (app.parts) {
                app.parts = rows.map(r => ({
                    artNr: r.artNr || '',
                    label: r.label || '',
                    imgUrl: r.imgUrl || '',
                    type: r.type || ''
                }));
            } else if (app.finishes) {
                app.finishes = rows.map(r => ({
                    id: r.id || '',
                    label: r.label || '',
                    artNr: r.artNr || '',
                    color: r.color || ''
                }));
            }
        }
    }

});
