import { createFinishesApp, createRelationalApp, createDuschenwanneApp, createDuschenrinneApp, createBadewanneApp, createWCApp, createWashbasinApp, createWaschtischMischerApp, createDuschenmischerApp, createBademischerApp, createMixAndMatchApp, createStandardApp, createGlassApp } from './factories.js?v=2.6.38';

const configSidebar = document.getElementById('configSidebar');
const bomTableBody = document.getElementById('bomTableBody');
const bomCountCounter = document.getElementById('bomCount');

    export const productApps = {

        // ------------------------------------------
        //  App 1: Axor Uno Configurator (Bademischer)
        // ------------------------------------------
        "bademischer": createBademischerApp("Bademischer", "Wannenfüllkombination und Mischsysteme", "https://profishop.sanitastroesch.ch/multimedia/Web/PG1/06410221_463_000.png", { isBath: true, enableGalleryUX: true }),

        // ------------------------------------------
        //  Einlochmischer App -> Waschtischmischer
        // ------------------------------------------
        "waschtischmischer": createWaschtischMischerApp("Waschtischmischer", "Mischer und Armaturen für den Waschtisch", "https://profishop.sanitastroesch.ch/multimedia/Web/PG1/06410221_463_000.png"),

        // ------------------------------------------
        //  Integriertes Mix & Match (Becken + Mischer)
        // ------------------------------------------
        "mixandmatch": createMixAndMatchApp("Mix & Match", "Waschtisch & Armatur Kombination", "https://profishop.sanitastroesch.ch/multimedia/Web/PG1/02112736_100_000.png"),


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
                            <div class="bom-desc">${part.label}</div>
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
                            <div class="bom-desc">${part.label}</div>
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
                            <div class="bom-desc">${part.label}</div>
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
                            <div class="bom-desc">${part.label}</div>
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
                            <div class="bom-desc">${part.label}</div>
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

        "duschenmischer": createDuschenmischerApp("Duschenmischer", "Duscharmaturen und Sets", "https://profishop.sanitastroesch.ch/multimedia/Web/PG1/06113661_501_000.png", { enableGalleryUX: true }),
        "duschtrennwand": createGlassApp("Duschtrennwand", "Duschwände und Kabinen", "https://profishop.sanitastroesch.ch/multimedia/Web/PG1/01510403_000_000.png", { cheapestWhenUnfiltered: true }),
        "badeabtrennung": createGlassApp("Badeabtrennung", "Glastrennwand für Badewanne", "https://profishop.sanitastroesch.ch/multimedia/Web/PG1/01311872_100_181.png"),
        "waschtrog": createRelationalApp("Waschtröge", "Waschtröge, Waschrinnen, Ausgussbecken & Zubehör", "https://profishop.sanitastroesch.ch/multimedia/Web/PG1/07211801_104_000.png", { isMixer: false, hideMontageart: true, hideManualSizeInputs: true, hideForm: true, sizeLabel: "Breite", washStation: true }),

        "badewanne": Object.assign(createBadewanneApp("Badewanne", "Wannensystem mit passendem Zubehör", "https://profishop.sanitastroesch.ch/multimedia/Web/PG1/01113324.png", { montageLabel1: "Mit Wannenträger", montageLabel2: "Mit Wannenfüssen", }), {
            trays: [
                { id: "bw1", manufacturer: "Schmidlin", form: "Rechteckig", size: "170x75", artNr: "1111 222.100.000", label: "Schmidlin DUO 170x75cm, Weiss", imgUrl: "https://profishop.sanitastroesch.ch/multimedia/Web/PG1/01113324.png", mountingMaterials: [{ artNr: "0000 111.000.000", label: "Wannenfüsse Badewanne", type: "Zubehör" }, { artNr: "0000 444.000.000", label: "Ab- und Überlaufgarnitur", type: "Zubehör" }] },
                { id: "bw2", manufacturer: "Kaldewei", form: "Rechteckig", size: "180x80", artNr: "1111 333.100.000", label: "Kaldewei Puro 180x80cm, Weiss", imgUrl: "https://profishop.sanitastroesch.ch/multimedia/Web/PG1/01113324.png", mountingMaterials: [{ artNr: "0000 222.000.000", label: "Spezial-Füsse Kaldewei", type: "Zubehör" }, { artNr: "0000 444.000.000", label: "Ab- und Überlaufgarnitur", type: "Zubehör" }] }
            ]
        }),
        // Duplicate Bademischer entry removed to prevent overwriting the correct one above
        "waschtisch": Object.assign(createWashbasinApp("Waschtisch", "Waschtisch mit Siphon und Montagezubehör", "https://profishop.sanitastroesch.ch/multimedia/Web/PG1/02112736_100_000.png"), {
            trays: [] // Data loaded dynamically via custom-data.json
        }),
        "wandklosett": createWCApp("Wandklosett System", "Wand-WC inkl. passendem WC-Sitz", "https://profishop.sanitastroesch.ch/multimedia/Web/PG1/02111845_100_000.png", { sizeLabel: 'Ausladung', enableGalleryUX: true }),
        "standklosett": createWCApp("Standklosett System", "Bodenstehendes WC System", "https://profishop.sanitastroesch.ch/multimedia/Web/PG1/02111845_100_000.png", { sizeLabel: 'Ausladung', enableGalleryUX: true }),

        // ------------------------------------------
        //  App 7: Duschenwanne (Dynamic Filter)
        // ------------------------------------------
        "duschenwanne": Object.assign(createDuschenwanneApp("Duschenwanne", "Duschsystem mit passenden Komponenten", "https://profishop.sanitastroesch.ch/multimedia/Web/PG1/01311872_100_181.png", { montageLabel3: "Stelzfüsse", montageLabel4: "Nivodübel", montageLabel5: "Wannenanker" }), {
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
        }),
        
        // ------------------------------------------
        //  App 7.5: Duschenrinne
        // ------------------------------------------
        "duschenrinne": createDuschenrinneApp("Duschenrinne", "Rinnen für bodenebene Duschen", "https://profishop.sanitastroesch.ch/multimedia/Web/PG1/01424287_617_000.png"),
        
        // ------------------------------------------
        //  App 8: Zubehör Pool (Admin Only)
        // ------------------------------------------
        "zubehoer_pool": createRelationalApp("Zubehör Pool", "Sammelbecken für importiertes Zubehör", "", { isMixer: false }),

        // ------------------------------------------
        //  App 9: Zubehör-Vorlagen (Admin Only)
        // ------------------------------------------
        "vorlagen": { trays: [] }
    };
