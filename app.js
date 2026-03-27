document.addEventListener('DOMContentLoaded', () => {

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
                { id: "duschenwanne", name: "Duschenwanne", hasApp: false },
                { id: "duschenmischer", name: "Duschenmischer", hasApp: false }
            ]
        },
        {
            id: "bad",
            name: "Bad",
            thumbnail: "https://profishop.sanitastroesch.ch/multimedia/Web/PG1/01113324.png",
            subcategories: [
                { id: "badewanne", name: "Badewanne", hasApp: false },
                { id: "bademischer", name: "Bademischer", appId: "bademischer", hasApp: true } // Axor App
            ]
        },
        {
            id: "waschplatz",
            name: "Waschplatz",
            thumbnail: "https://profishop.sanitastroesch.ch/multimedia/Web/PG1/02112736_100_000.png",
            subcategories: [
                { id: "waschtisch", name: "Waschtisch", hasApp: false },
                { id: "einlochmischer", name: "Einlochmischer", hasApp: false },
                { id: "wandmischer", name: "Wandmischer", hasApp: false }
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
            subcategories: []
        },
        {
            id: "klosett",
            name: "Klosett",
            thumbnail: "https://profishop.sanitastroesch.ch/multimedia/Web/PG1/02111845_100_000.png",
            subcategories: [
                { id: "wandklosett", name: "Wandklosett", hasApp: false },
                { id: "standklosett", name: "Standklosett", hasApp: false }
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
            
            init: function() {
                this.renderSidebar();
                this.updateBOM();
            },

            renderSidebar: function() {
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

            updateBOM: function() {
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

            copyToClipboard: function() {
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

            init: function() {
                this.renderSidebar();
                this.updateBOM();
            },

            renderSidebar: function() {
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

            updateBOM: function() {
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

            copyToClipboard: function() {
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

            init: function() {
                this.renderSidebar();
                this.updateBOM();
            },

            renderSidebar: function() {
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

            updateBOM: function() {
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

            copyToClipboard: function() {
                const textLines = this.parts.map(p => `${p.artNr}\t1`);
                const text = textLines.join('\n');
                
                navigator.clipboard.writeText(text).then(() => {
                    alert("Artikel und Menge kopiert für SAP:\n\n" + text.replace(/\t/g, "    "));
                }).catch(e => alert("Kopieren fehlgeschlagen."));
            }
        }
    };

    // --- Boot Sequence ---
    renderCatalog();
    
});
