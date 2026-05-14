const fs = require('fs');

const factoriesPath = './modules/factories.js';
let content = fs.readFileSync(factoriesPath, 'utf8');

// If already injected, do nothing
if (!content.includes('export function createMischerApp')) {
    const mischerAppLogic = `
export function createMischerApp(title, desc, mainImgUrl, config = {}) {
    const isBath = config.isBath || false;
    const suffix = title.replace(/\\s/g,'');

    return {
        trays: [],
        mainImgUrl: mainImgUrl,
        selectedTray: null,
        init: function () {
            this.selectedTray = null;
            this.currentMontage = 'all'; 
            this.currentSerie = 'all';
            this.currentThermostat = 'all';
            this.currentBrauseset = 'all';
            this.inklusiveMontage = true;
            this.renderSidebar();
            this.bindFilters();
            this.filterResults();
            this.clearBOM();
        },
        extractSerie: function (t) {
            if (t.serie) return t.serie;
            let cleaned = (t.label || '').toLowerCase();
            const match = cleaned.match(/^(.*?)(?:\\s+\\d+\\s*[xX]\\s*\\d+|\\s*,|\\s*\\(|\\s+-| \\d+)/);
            let serie = match && match[1] ? match[1].trim() : cleaned.trim();
            serie = serie.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
            if (t.manufacturer) {
                const mLower = t.manufacturer.toLowerCase();
                const sLower = serie.toLowerCase();
                if (sLower.startsWith(mLower)) {
                    serie = serie.substring(mLower.length).trim();
                }
                serie = \`\${t.manufacturer.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')} \${serie}\`;
            }
            return serie || 'Andere';
        },
        extractMontage: function (t) {
            const label = (t.label || '').toLowerCase();
            if (label.includes('aufputz') || label.includes(' ap ') || label.includes('wandbatterie') || label.includes('wandmischer')) return 'Aufputz';
            if (label.includes('unterputz') || label.includes(' up ') || label.includes('einbau')) return 'Unterputz';
            if (isBath && (label.includes('standmodell') || label.includes('freistehend'))) return 'Standmodell';
            return 'Aufputz';
        },
        extractThermostat: function (t) {
            const label = (t.label || '').toLowerCase();
            return label.includes('thermostat') ? 'Mit Thermostat' : 'Ohne Thermostat';
        },
        extractBrauseset: function (t) {
            const label = (t.label || '').toLowerCase();
            return (label.includes('garnitur') || label.includes('brauseset') || label.includes('handbrause')) ? 'Mit Brauseset' : 'Ohne Brauseset';
        },
        getUniqueValues: function (key) {
            if (key === 'montage') return [...new Set(this.trays.map(t => this.extractMontage(t)))].sort();
            if (key === 'serie') return [...new Set(this.trays.map(t => this.extractSerie(t)))].sort();
            if (key === 'thermostat') return ['Mit Thermostat', 'Ohne Thermostat'];
            if (key === 'brauseset') return ['Mit Brauseset', 'Ohne Brauseset'];
            return [];
        },
        renderSidebar: function () {
            const configSidebar = document.getElementById('configSidebar');
            configSidebar.innerHTML = \`
                <div class="sidebar-section">
                    <h2>Filter: \${title}</h2>
                    
                    <div class="filter-group">
                        <div class="finder-sub-header" id="head_misch_montage_\${suffix}">Montageart</div>
                        <div class="pill-group" id="list_misch_montage_\${suffix}"></div>
                    </div>

                    <div class="filter-group">
                        <div class="finder-sub-header" id="head_misch_serie_\${suffix}">Serie</div>
                        <div class="pill-group" id="list_misch_serie_\${suffix}"></div>
                    </div>

                    <div class="filter-group" style="margin-top:1.5rem;">
                        <div class="finder-sub-header" id="head_misch_thermo_\${suffix}">Ausführung (Thermostat)</div>
                        <div class="pill-group" id="list_misch_thermo_\${suffix}"></div>
                    </div>

                    <div class="filter-group" style="margin-top:1rem;">
                        <div class="finder-sub-header" id="head_misch_brause_\${suffix}">Brauseset / Garnitur</div>
                        <div class="pill-group" id="list_misch_brause_\${suffix}"></div>
                    </div>
                </div>
                
                <div class="sidebar-section">
                    <h2>Suchergebnisse <span id="resultCount_\${suffix}" class="badge">0</span></h2>
                    <div class="search-results-container" id="searchResults_\${suffix}"></div>
                </div>

                <div class="sidebar-section" id="trayConfigurator_\${suffix}" style="display:none; margin-top:2rem;">
                    <h2>Wählen Sie das Zubehör (Mischer)</h2>
                    <p class="section-desc">Ergänzende Auf- und Unterputzteile.</p>
                    <div id="trayConfiguratorInner_\${suffix}"></div>
                </div>
            \`;
        },
        updatePillFilters: function() {
            const applyPillUI = window.applyPillUI || function(){}; // Using global helper if available, else we inline logic
            
            const montageList = document.getElementById(\`list_misch_montage_\${suffix}\`);
            const serList = document.getElementById(\`list_misch_serie_\${suffix}\`);
            const thermoList = document.getElementById(\`list_misch_thermo_\${suffix}\`);
            const brauseList = document.getElementById(\`list_misch_brause_\${suffix}\`);

            if (!montageList) return;

            // 1. Montage
            const montages = this.getUniqueValues('montage');
            montageList.innerHTML = \`<button class="pill-btn \${this.currentMontage === 'all' ? 'active' : ''}" data-val="all">Alle</button>\` + montages.map(a => \`
                <button class="pill-btn \${this.currentMontage === a ? 'active' : ''}" data-val="\${a}">\${a}</button>
            \`).join('');
            if(window.applyPillUI) window.applyPillUI(\`head_misch_montage_\${suffix}\`, \`list_misch_montage_\${suffix}\`, this.currentMontage, 'Montageart', () => {
                this.currentMontage = 'all'; this.currentSerie = 'all'; this.updatePillFilters(); this.filterResults();
            });
            montageList.querySelectorAll('.pill-btn').forEach(btn => btn.addEventListener('click', () => {
                this.currentMontage = btn.dataset.val; this.currentSerie = 'all'; this.updatePillFilters(); this.filterResults();
            }));

            // 2. Serie
            let validForSerie = this.trays;
            if (this.currentMontage !== 'all') {
                validForSerie = validForSerie.filter(t => this.extractMontage(t) === this.currentMontage);
            }
            const series = [...new Set(validForSerie.map(t => this.extractSerie(t)))].sort();
            serList.innerHTML = \`<button class="pill-btn \${this.currentSerie === 'all' ? 'active' : ''}" data-val="all">Alle</button>\` + series.map(s => \`
                <button class="pill-btn \${this.currentSerie === s ? 'active' : ''}" data-val="\${s}">\${s}</button>
            \`).join('');
            if(window.applyPillUI) window.applyPillUI(\`head_misch_serie_\${suffix}\`, \`list_misch_serie_\${suffix}\`, this.currentSerie, 'Serie', () => {
                this.currentSerie = 'all'; this.updatePillFilters(); this.filterResults();
            });
            serList.querySelectorAll('.pill-btn').forEach(btn => btn.addEventListener('click', () => {
                this.currentSerie = btn.dataset.val; this.updatePillFilters(); this.filterResults();
            }));

            // 3. Thermostat
            thermoList.innerHTML = \`
                <button class="pill-btn \${this.currentThermostat === 'all' ? 'active' : ''}" data-val="all">Alle</button>
                <button class="pill-btn \${this.currentThermostat === 'Mit Thermostat' ? 'active' : ''}" data-val="Mit Thermostat">Mit Thermostat</button>
                <button class="pill-btn \${this.currentThermostat === 'Ohne Thermostat' ? 'active' : ''}" data-val="Ohne Thermostat">Ohne Thermostat</button>
            \`;
            if(window.applyPillUI) window.applyPillUI(\`head_misch_thermo_\${suffix}\`, \`list_misch_thermo_\${suffix}\`, this.currentThermostat, 'Thermostat', () => {
                this.currentThermostat = 'all'; this.updatePillFilters(); this.filterResults();
            });
            thermoList.querySelectorAll('.pill-btn').forEach(btn => btn.addEventListener('click', () => {
                this.currentThermostat = btn.dataset.val; this.updatePillFilters(); this.filterResults();
            }));

            // 4. Brauseset
            brauseList.innerHTML = \`
                <button class="pill-btn \${this.currentBrauseset === 'all' ? 'active' : ''}" data-val="all">Alle</button>
                <button class="pill-btn \${this.currentBrauseset === 'Mit Brauseset' ? 'active' : ''}" data-val="Mit Brauseset">Mit Garnitur</button>
                <button class="pill-btn \${this.currentBrauseset === 'Ohne Brauseset' ? 'active' : ''}" data-val="Ohne Brauseset">Ohne Garnitur</button>
            \`;
            if(window.applyPillUI) window.applyPillUI(\`head_misch_brause_\${suffix}\`, \`list_misch_brause_\${suffix}\`, this.currentBrauseset, 'Brauseset', () => {
                this.currentBrauseset = 'all'; this.updatePillFilters(); this.filterResults();
            });
            brauseList.querySelectorAll('.pill-btn').forEach(btn => btn.addEventListener('click', () => {
                this.currentBrauseset = btn.dataset.val; this.updatePillFilters(); this.filterResults();
            }));
        },
        bindFilters: function () {},
        filterResults: function () {
            const container = document.getElementById(\`searchResults_\${suffix}\`);
            const countSpan = document.getElementById(\`resultCount_\${suffix}\`);
            if (!container) return;

            // Recalculate pills state safely
            this.updatePillFilters();

            let results = this.trays;
            
            if (this.currentMontage !== 'all') {
                results = results.filter(t => this.extractMontage(t) === this.currentMontage);
            }
            if (this.currentSerie !== 'all') {
                results = results.filter(t => this.extractSerie(t) === this.currentSerie);
            }
            if (this.currentThermostat !== 'all') {
                results = results.filter(t => this.extractThermostat(t) === this.currentThermostat);
            }
            if (this.currentBrauseset !== 'all') {
                results = results.filter(t => this.extractBrauseset(t) === this.currentBrauseset);
            }

            countSpan.textContent = results.length;

            if (results.length === 0) {
                container.innerHTML = '<div style="padding:2rem; text-align:center; color:var(--text-secondary);">Keine Produkte gefunden. Bitte passen Sie die Filter an.</div>';
                return;
            }

            container.innerHTML = results.map(t => {
                const isSel = this.selectedTray && this.selectedTray.id === t.id;
                const imgStr = t.imgUrl ? \`<img src="\${t.imgUrl}" class="result-img">\` : \`<div class="result-img" style="display:flex;align-items:center;justify-content:center;background:#eee;color:#bbb;">Kein Bild</div>\`;
                
                return \`
                    <div class="result-card \${isSel ? 'active' : ''}" onclick="window.selectMischerItem('\${t.id}')">
                        \${imgStr}
                        <div class="result-info">
                            <h4 class="result-title">\${this.extractSerie(t)}</h4>
                            <p class="result-meta">\${t.artNr} | \${this.extractMontage(t)} | \${this.extractThermostat(t)}</p>
                            <p style="font-size: 0.75rem; color:var(--text-secondary); margin-top:0.25rem; line-height:1.2;">\${t.label}</p>
                        </div>
                        <i class="ri-checkbox-circle-fill" style="position:absolute; top:0.5rem; right:0.5rem; color:var(--primary); font-size:1.2rem; \${isSel?'':'display:none;'}"></i>
                    </div>
                \`;
            }).join('');
        },
        selectItem: function(id) {
            this.selectedTray = this.trays.find(t => t.id === id);
            this.filterResults();
            this.renderConfigurator();
            this.updateBOM();
        },
        renderConfigurator: function () {
            const conf = document.getElementById(\`trayConfigurator_\${suffix}\`);
            const inner = document.getElementById(\`trayConfiguratorInner_\${suffix}\`);
            
            if (!this.selectedTray) {
                conf.style.display = 'none';
                return;
            }
            conf.style.display = 'block';
            inner.innerHTML = '';
            
            const materials = this.selectedTray.mountingMaterials || [];
            if (materials.length === 0) {
                inner.innerHTML = '<p class="section-desc">Für dieses Produkt ist kein spezifisches Zubehör definiert.</p>';
                return;
            }

            materials.forEach((mat, mIdx) => {
                const groupDiv = document.createElement('div');
                groupDiv.className = 'acc-group';
                
                let titleHtml = \`<h4>\${mat.name || 'Zubehör'}</h4>\`;
                
                let optsHtml = mat.options.map((opt, oIdx) => {
                    const isSelected = window.mischerOptionsState && window.mischerOptionsState[\`\${mIdx}_\${oIdx}\`];
                    const imgHTML = opt.imgUrl ? \`<img src="\${opt.imgUrl}" style="width:32px; height:32px; object-fit:contain; border-radius:4px; margin-right:0.5rem; background:white;">\` : '';
                    return \`
                        <div class="acc-item \${isSelected ? 'active' : ''}" onclick="window.toggleMischerAcc(\${mIdx}, \${oIdx})">
                            <div class="acc-info">
                                \${imgHTML}
                                <div>
                                    <div class="acc-label">\${opt.label}</div>
                                    <div class="acc-meta">\${opt.artNr} | Menge: \${opt.menge || 1}</div>
                                </div>
                            </div>
                            <div class="acc-checkbox"><i class="\${isSelected ? 'ri-checkbox-circle-fill' : 'ri-checkbox-blank-circle-line'}"></i></div>
                        </div>
                    \`;
                }).join('');

                groupDiv.innerHTML = titleHtml + optsHtml;
                inner.appendChild(groupDiv);
            });
        },
        updateBOM: function () {
            const bomTableBody = document.getElementById('bomTableBody');
            const bomCount = document.getElementById('bomCount');
            if(!bomTableBody) return;
            bomTableBody.innerHTML = '';
            
            if (!this.selectedTray) {
                bomCount.textContent = '0 Artikel';
                return;
            }
            
            let total = 1;
            bomTableBody.innerHTML += \`
                <tr>
                    <td><div class="img-cell"><img src="\${this.selectedTray.imgUrl || ''}"></div></td>
                    <td><span class="bom-code">\${this.selectedTray.artNr}</span></td>
                    <td><div class="bom-desc">\${this.selectedTray.label}</div></td>
                    <td><span class="bom-type">Mischer</span></td>
                    <td><strong>1</strong></td>
                </tr>
            \`;

            if (this.selectedTray.mountingMaterials) {
                this.selectedTray.mountingMaterials.forEach((mat, mIdx) => {
                    mat.options.forEach((opt, oIdx) => {
                        if (window.mischerOptionsState && window.mischerOptionsState[\`\${mIdx}_\${oIdx}\`]) {
                            const menge = opt.menge || 1;
                            total += menge;
                            bomTableBody.innerHTML += \`
                                <tr>
                                    <td><div class="img-cell"><img src="\${opt.imgUrl || ''}"></div></td>
                                    <td><span class="bom-code">\${opt.artNr}</span></td>
                                    <td><div class="bom-desc">\${opt.label}</div></td>
                                    <td><span class="bom-type">\${opt.type || 'Zubehör'}</span></td>
                                    <td><strong>\${menge}</strong></td>
                                </tr>
                            \`;
                        }
                    });
                });
            }
            
            bomCount.textContent = \`\${total} Artikel gewählt\`;
        },
        clearBOM: function() {
            window.mischerOptionsState = {};
            this.updateBOM();
        },
        copyToClipboard: function () {
            if (!this.selectedTray) return;
            let list = [\`\${this.selectedTray.artNr}\\t1\`];
            if (this.selectedTray.mountingMaterials) {
                this.selectedTray.mountingMaterials.forEach((mat, mIdx) => {
                    mat.options.forEach((opt, oIdx) => {
                        if (window.mischerOptionsState && window.mischerOptionsState[\`\${mIdx}_\${oIdx}\`]) {
                            list.push(\`\${opt.artNr}\\t\${opt.menge || 1}\`);
                        }
                    });
                });
            }
            navigator.clipboard.writeText(list.join('\\n')).then(() => alert('Stückliste kopiert!'));
        }
    };
}
`;
    content += `\n/* Mischer Factory */\n` + mischerAppLogic;
    fs.writeFileSync(factoriesPath, content);
    console.log("Injected createMischerApp to factories.js");
} else {
    console.log("createMischerApp already inside factories.js");
}

const appsPath = './modules/apps.js';
let appsContent = fs.readFileSync(appsPath, 'utf8');

// Update imports
if (!appsContent.includes('createMischerApp')) {
    appsContent = appsContent.replace(
        `import { createFinishesApp, createRelationalApp, createWashbasinApp, createWaschtischMischerApp, createMixAndMatchApp } from './factories.js';`,
        `import { createFinishesApp, createRelationalApp, createWashbasinApp, createWaschtischMischerApp, createMischerApp, createMixAndMatchApp } from './factories.js';`
    );
}

// Ensure the specific instances are replaced and nothing else is broken!
// The user said: "only for those two subcats and nothing else. Don't touch anything else."
appsContent = appsContent.replace(
    /"duschenmischer": createRelationalApp\("Duschenmischer", "Mischbatterie für den Duschbereich", "https:\/\/profishop\.sanitastroesch\.ch\/multimedia\/Web\/PG1\/01113324\.png", \{ isMixer: true \}\),/g,
    `"duschenmischer": createMischerApp("Duschenmischer", "Mischbatterie für den Duschbereich", "https://profishop.sanitastroesch.ch/multimedia/Web/PG1/01113324.png", { isBath: false }),`
);

appsContent = appsContent.replace(
    /"bademischer": createRelationalApp\("Bademischer", "Wannenfüllkombination und Mischsysteme", "https:\/\/profishop\.sanitastroesch\.ch\/multimedia\/Web\/PG1\/06410221_463_000\.png", \{ isMixer: true, montageLabel3: "Standmodell" \}\),/g,
    `"bademischer": createMischerApp("Bademischer", "Wannenfüllkombination und Mischsysteme", "https://profishop.sanitastroesch.ch/multimedia/Web/PG1/06410221_463_000.png", { isBath: true }),`
);

fs.writeFileSync(appsPath, appsContent);
console.log("Updated modules/apps.js to use createMischerApp for duschenmischer/bademischer");

