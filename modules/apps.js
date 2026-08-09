import { createFinishesApp, createRelationalApp, createDuschenwanneApp, createDuschenrinneApp, createBadewanneApp, createWCApp, createWashbasinApp, createWaschtischMischerApp, createDuschenmischerApp, createBademischerApp, createMixAndMatchApp, createStandardApp, createGlassApp } from './factories.js?v=2.6.73';
import { fullLabel } from './factories/_shared.js';

const configSidebar = document.getElementById('configSidebar');
const bomTableBody = document.getElementById('bomTableBody');
const bomCountCounter = document.getElementById('bomCount');

    export const productApps = {

        // ------------------------------------------
        //  App 1: Axor Uno Configurator (Bademischer)
        // ------------------------------------------
        "bademischer": createBademischerApp("Bademischer", "Wannenfüllkombination und Mischsysteme", "img/PG1_06410221_463_000_84c94d73.webp", { isBath: true, enableGalleryUX: true }),

        // ------------------------------------------
        //  Einlochmischer App -> Waschtischmischer
        // ------------------------------------------
        "waschtischmischer": createWaschtischMischerApp("Waschtischmischer", "Mischer und Armaturen für den Waschtisch", "img/PG1_06410221_463_000_84c94d73.webp"),

        // ------------------------------------------
        //  Spültischmischer — the kitchen/utility faucets that used to sit in
        //  `waschtischmischer` and leaked into Mix & Match. Own pool
        //  (`spueltischmischer` in custom-data.json), own subcategory, so they
        //  stay reachable without polluting the washbasin lists. Same factory:
        //  identical product shape (variants + Montagematerial).
        // ------------------------------------------
        "spueltischmischer": createWaschtischMischerApp("Spültischmischer", "Armaturen für Spültisch und Waschtrog", "img/PG1_06111894_523_000_68ca2e3a.webp"),

        // ------------------------------------------
        //  Integriertes Mix & Match (Becken + Mischer)
        // ------------------------------------------
        "mixandmatch": createMixAndMatchApp("Mix & Match", "Waschtisch & Armatur Kombination", "img/PG1_02112736_100_000_f8ecd198.webp"),


        // ------------------------------------------
        //  App 2: Küche 1-teilig (Static Bundle)
        // ------------------------------------------
        "kueche_1teilig": {
            parts: [
                {
                    artNr: "6511 227.508.000",
                    label: "Regulierventil Laufen ⅜\", 45 mm, ohne Klemmverschraubung, ohne Rosette, Messing",
                    imgUrl: "img/PG1_06511221_911a68e8.webp",
                    type: "Kaltwasser Ventil"
                },
                {
                    artNr: "6511 302.508.000",
                    label: "Doppelventil Laufen Siduo ½\", ohne Klemmverschraubung, ohne Rückschlagventil, Messing",
                    imgUrl: "img/PG1_06511302_a7d0162d.webp",
                    type: "Warmwasser Ventil"
                },
                {
                    artNr: "8112 211.336.000",
                    label: "Spültischsiphongarnitur 1-teilig, IG 1½\", Schlauchtülle 1\", Abgang 56 mm, grau",
                    imgUrl: "img/PG1_08112211_336_000_40a11b90.webp",
                    type: "Siphon"
                }
            ],
            mainImgUrl: "img/PG1_08112211_336_000_40a11b90.webp",

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
                let totalMenge = 0;
                bomTableBody.innerHTML = '';

                this.parts.forEach(part => {
                    const menge = part.menge || 1;
                    totalMenge += menge;
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td><div class="img-cell"><img src="${part.imgUrl}"></div></td>
                        <td><span class="bom-code">${part.artNr}</span></td>
                        <td>
                            <div class="bom-desc">${fullLabel(part)}</div>
                            <div style="font-size: 0.8rem; color: #9e9e9e; margin-top: 0.25rem;">Zwingendes Zubehör (Basic)</div>
                        </td>
                        <td><span class="bom-type">${part.type}</span></td>
                        <td><strong>${menge}</strong></td>
                    `;
                    bomTableBody.appendChild(row);
                });
                bomCountCounter.textContent = `${totalMenge} Artikel benötigt`;
            },

            copyToClipboard: window.copyBOMToClipboard
        },

        // ------------------------------------------
        //  App 3: Küche 2-teilig (Static Bundle)
        // ------------------------------------------
        "kueche_2teilig": {
            parts: [
                {
                    artNr: "6511 227.508.000",
                    label: "Regulierventil Laufen ⅜\", 45 mm, ohne Klemmverschraubung, ohne Rosette, Messing",
                    imgUrl: "img/PG1_06511221_911a68e8.webp",
                    type: "Kaltwasser Ventil"
                },
                {
                    artNr: "6511 302.508.000",
                    label: "Doppelventil Laufen Siduo ½\", ohne Klemmverschraubung, ohne Rückschlagventil, Messing",
                    imgUrl: "img/PG1_06511302_a7d0162d.webp",
                    type: "Warmwasser Ventil"
                },
                {
                    artNr: "3163 138.100.000",
                    label: "Rohrbogensiphon Geberit 2-teilig, 1¼\" / 1½\" x 40 mm, Steckdichtung, Weiss",
                    imgUrl: "img/PG1_03163138_100_000_a7d9d89c.webp",
                    type: "Siphon (2-teilig)"
                }
            ],
            mainImgUrl: "img/PG1_03163138_100_000_a7d9d89c.webp",

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
                let totalMenge = 0;
                bomTableBody.innerHTML = '';

                this.parts.forEach(part => {
                    const menge = part.menge || 1;
                    totalMenge += menge;
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td><div class="img-cell"><img src="${part.imgUrl}"></div></td>
                        <td><span class="bom-code">${part.artNr}</span></td>
                        <td>
                            <div class="bom-desc">${fullLabel(part)}</div>
                            <div style="font-size: 0.8rem; color: #9e9e9e; margin-top: 0.25rem;">Zwingendes Zubehör (Basic)</div>
                        </td>
                        <td><span class="bom-type">${part.type}</span></td>
                        <td><strong>${menge}</strong></td>
                    `;
                    bomTableBody.appendChild(row);
                });
                bomCountCounter.textContent = `${totalMenge} Artikel benötigt`;
            },

            copyToClipboard: window.copyBOMToClipboard
        },

        // ------------------------------------------
        //  App 4: Waschautomaten - Einbausifon
        // ------------------------------------------
        "wasch_einbausifon": {
            parts: [
                {
                    artNr: "6116 342.502.000",
                    label: "Waschautomaten-Eckventil Alterna ½\", Chromeline",
                    imgUrl: "img/PG1_06116342_502_000_489f5462.webp",
                    type: "Eckventil"
                },
                {
                    artNr: "7281 225.523.000",
                    label: "Einbausiphon Geberit, 2 Schlauchtüllen, Edelstahl matt",
                    imgUrl: "img/PG1_07281225_523_000_6d8dd389.webp",
                    type: "Siphon (Sichtteil)"
                },
                {
                    artNr: "3163 163.000.000",
                    label: "Rohbau-Set Geberit EinbauSiphon, UP-Gehäuse",
                    imgUrl: "img/PG1_03163163_000_000_9351348b.webp",
                    type: "Grundkörper"
                }
            ],
            mainImgUrl: "img/PG1_07281225_523_000_6d8dd389.webp",

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
                let totalMenge = 0;
                bomTableBody.innerHTML = '';
                this.parts.forEach(part => {
                    const menge = part.menge || 1;
                    totalMenge += menge;
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td><div class="img-cell"><img src="${part.imgUrl}"></div></td>
                        <td><span class="bom-code">${part.artNr}</span></td>
                        <td>
                            <div class="bom-desc">${fullLabel(part)}</div>
                            <div style="font-size: 0.8rem; color: #9e9e9e; margin-top: 0.25rem;">Zwingendes Zubehör (Basic)</div>
                        </td>
                        <td><span class="bom-type">${part.type}</span></td>
                        <td><strong>${menge}</strong></td>
                    `;
                    bomTableBody.appendChild(row);
                });
                bomCountCounter.textContent = `${totalMenge} Artikel benötigt`;
            },

            copyToClipboard: window.copyBOMToClipboard
        },

        // ------------------------------------------
        //  App 5: Waschautomaten - AP-Sifon weiss
        // ------------------------------------------
        "wasch_apsifon_weiss": {
            parts: [
                {
                    artNr: "6116 342.502.000",
                    label: "Waschautomaten-Eckventil Alterna ½\", Chromeline",
                    imgUrl: "img/PG1_06116342_502_000_489f5462.webp",
                    type: "Eckventil"
                },
                {
                    artNr: "7281 110.100.000",
                    label: "Siphon Geberit-AP, Schlauchtülle, Ø 40 mm, Weiss",
                    imgUrl: "img/PG1_07281110_100_000_b4f14107.webp",
                    type: "Aufputz Siphon"
                }
            ],
            mainImgUrl: "img/PG1_07281110_100_000_b4f14107.webp",

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
                let totalMenge = 0;
                bomTableBody.innerHTML = '';
                this.parts.forEach(part => {
                    const menge = part.menge || 1;
                    totalMenge += menge;
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td><div class="img-cell"><img src="${part.imgUrl}"></div></td>
                        <td><span class="bom-code">${part.artNr}</span></td>
                        <td>
                            <div class="bom-desc">${fullLabel(part)}</div>
                            <div style="font-size: 0.8rem; color: #9e9e9e; margin-top: 0.25rem;">Zwingendes Zubehör (Basic)</div>
                        </td>
                        <td><span class="bom-type">${part.type}</span></td>
                        <td><strong>${menge}</strong></td>
                    `;
                    bomTableBody.appendChild(row);
                });
                bomCountCounter.textContent = `${totalMenge} Artikel benötigt`;
            },

            copyToClipboard: window.copyBOMToClipboard
        },

        // ------------------------------------------
        //  App 6: Waschautomaten - AP-Sifon schwarz
        // ------------------------------------------
        "wasch_apsifon_schwarz": {
            parts: [
                {
                    artNr: "6116 342.502.000",
                    label: "Waschautomaten-Eckventil Alterna ½\", Chromeline",
                    imgUrl: "img/PG1_06116342_502_000_489f5462.webp",
                    type: "Eckventil"
                },
                {
                    artNr: "8111 112.000.000",
                    label: "Siphon waagrecht, Ø 50 / 56 mm (Schwarz)",
                    imgUrl: "img/PG1_08111112_000_000_60a2efb3.webp",
                    type: "Aufputz Siphon"
                }
            ],
            mainImgUrl: "img/PG1_08111112_000_000_60a2efb3.webp",

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
                let totalMenge = 0;
                bomTableBody.innerHTML = '';
                this.parts.forEach(part => {
                    const menge = part.menge || 1;
                    totalMenge += menge;
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td><div class="img-cell"><img src="${part.imgUrl}"></div></td>
                        <td><span class="bom-code">${part.artNr}</span></td>
                        <td>
                            <div class="bom-desc">${fullLabel(part)}</div>
                            <div style="font-size: 0.8rem; color: #9e9e9e; margin-top: 0.25rem;">Zwingendes Zubehör (Basic)</div>
                        </td>
                        <td><span class="bom-type">${part.type}</span></td>
                        <td><strong>${menge}</strong></td>
                    `;
                    bomTableBody.appendChild(row);
                });
                bomCountCounter.textContent = `${totalMenge} Artikel benötigt`;
            },

            copyToClipboard: window.copyBOMToClipboard
        },

        // ==========================================
        //  DYNAMIC GENERATED TEMPLATES
        // ==========================================

        "duschenmischer": createDuschenmischerApp("Duschenmischer", "Duscharmaturen und Sets", "", { enableGalleryUX: true }),
        "bidet": createWaschtischMischerApp("Bidet", "Bidetmischer und Bidetbatterien", "img/PG1_06111143_501_000_d4bcd641.webp"),
        "duschtrennwand": createGlassApp("Duschtrennwand", "Duschwände und Kabinen", "", { cheapestWhenUnfiltered: true }),
        "badeabtrennung": createGlassApp("Badeabtrennung", "Glastrennwand für Badewanne", "img/PG1_01311872_100_000_ce680c8f.webp"),
        "waschtrog": createRelationalApp("Waschtröge", "Waschtröge, Waschrinnen, Ausgussbecken & Zubehör", "img/PG1_07211801_104_000_4a2f6f4b.webp", { isMixer: false, hideMontageart: true, hideManualSizeInputs: true, hideForm: true, sizeLabel: "Breite", exactSizes: true, washStation: true }),

        "badewanne": Object.assign(createBadewanneApp("Badewanne", "Wannensystem mit passendem Zubehör", "img/PG1_01113324_ab097814.webp", { montageLabel1: "Mit Wannenträger", montageLabel2: "Mit Wannenfüssen", }), {
            trays: [
                { id: "bw1", manufacturer: "Schmidlin", form: "Rechteckig", size: "170x75", artNr: "1111 222.100.000", label: "Schmidlin DUO 170x75cm, Weiss", imgUrl: "img/PG1_01113324_ab097814.webp", mountingMaterials: [{ artNr: "0000 111.000.000", label: "Wannenfüsse Badewanne", type: "Zubehör" }, { artNr: "0000 444.000.000", label: "Ab- und Überlaufgarnitur", type: "Zubehör" }] },
                { id: "bw2", manufacturer: "Kaldewei", form: "Rechteckig", size: "180x80", artNr: "1111 333.100.000", label: "Kaldewei Puro 180x80cm, Weiss", imgUrl: "img/PG1_01113324_ab097814.webp", mountingMaterials: [{ artNr: "0000 222.000.000", label: "Spezial-Füsse Kaldewei", type: "Zubehör" }, { artNr: "0000 444.000.000", label: "Ab- und Überlaufgarnitur", type: "Zubehör" }] }
            ]
        }),
        // Duplicate Bademischer entry removed to prevent overwriting the correct one above
        "waschtisch": Object.assign(createWashbasinApp("Waschtisch", "Waschtisch mit Siphon und Montagezubehör", "img/PG1_02112736_100_000_f8ecd198.webp"), {
            trays: [] // Data loaded dynamically via custom-data.json
        }),
        "wandklosett": createWCApp("Wandklosett System", "Wand-WC inkl. passendem WC-Sitz", "img/PG1_02111845_100_000_a30e42df.webp", { sizeLabel: 'Ausladung', enableGalleryUX: true }),
        "standklosett": createWCApp("Standklosett System", "Bodenstehendes WC System", "img/PG1_02111845_100_000_a30e42df.webp", { sizeLabel: 'Ausladung', enableGalleryUX: true }),

        // ------------------------------------------
        //  App 7: Duschenwanne (Dynamic Filter)
        // ------------------------------------------
        "duschenwanne": Object.assign(createDuschenwanneApp("Duschenwanne", "Duschsystem mit passenden Komponenten", "img/PG1_01311872_100_000_ce680c8f.webp", { montageLabel3: "Stelzfüsse", montageLabel4: "Nivodübel", montageLabel5: "Wannenanker" }), {
            trays: [
                // === Alterna ===
                {
                    id: "a1", manufacturer: "Alterna", form: "Quadratisch", size: "80x80", artNr: "1317 153.100.000", label: "Alterna ecoplan 80x80cm, Weiss", imgUrl: "img/PG1_01317153_100_000_6f5b8287.webp",
                    mountingMaterials: [
                        { artNr: "0000 001.000.000", label: "Wannenfüsse (Platzhalter)", type: "Zubehör" },
                        { artNr: "0000 002.000.000", label: "Ablauf (Platzhalter)", type: "Zubehör" }
                    ]
                },
                {
                    id: "a2", manufacturer: "Alterna", form: "Quadratisch", size: "80x80", artNr: "1317 163.100.000", label: "Alterna ecoplan 80x80cm (Typ B), Weiss", imgUrl: "img/PG1_01317163_100_000_681c3454.webp",
                    mountingMaterials: [
                        { artNr: "0000 001.000.000", label: "Wannenfüsse (Platzhalter)", type: "Zubehör" },
                        { artNr: "0000 002.000.000", label: "Ablauf (Platzhalter)", type: "Zubehör" }
                    ]
                },
                {
                    id: "a3", manufacturer: "Alterna", form: "Quadratisch", size: "90x90", artNr: "1317 154.100.000", label: "Alterna ecoplan 90x90cm, Weiss", imgUrl: "img/PG1_01317153_100_000_6f5b8287.webp",
                    mountingMaterials: [
                        { artNr: "0000 001.000.000", label: "Wannenfüsse (Platzhalter)", type: "Zubehör" },
                        { artNr: "0000 002.000.000", label: "Ablauf (Platzhalter)", type: "Zubehör" }
                    ]
                },
                {
                    id: "a4", manufacturer: "Alterna", form: "Quadratisch", size: "90x90", artNr: "1317 164.100.000", label: "Alterna ecoplan 90x90cm (Typ B), Weiss", imgUrl: "img/PG1_01317164_100_000_3d31445d.webp",
                    mountingMaterials: [
                        { artNr: "0000 001.000.000", label: "Wannenfüsse (Platzhalter)", type: "Zubehör" },
                        { artNr: "0000 002.000.000", label: "Ablauf (Platzhalter)", type: "Zubehör" }
                    ]
                }
            ]
        }),
        
        // ------------------------------------------
        //  App 7.5: Duschenrinne
        // ------------------------------------------
        "duschenrinne": createDuschenrinneApp("Duschenrinne", "Rinnen für bodenebene Duschen", "img/PG1_01424287_617_000_63ce5256.webp"),
        
        // ------------------------------------------
        //  App 8: Zubehör Pool (Admin Only)
        // ------------------------------------------
        "zubehoer_pool": createRelationalApp("Zubehör Pool", "Sammelbecken für importiertes Zubehör", "", { isMixer: false }),

        // ------------------------------------------
        //  App 9: Zubehör-Vorlagen (Admin Only)
        // ------------------------------------------
        "vorlagen": { trays: [] }
    };
