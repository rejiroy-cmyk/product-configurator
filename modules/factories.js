window.copyTextToClipboard = function(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
        return navigator.clipboard.writeText(text).catch(err => {
            console.warn("navigator.clipboard.writeText failed, trying fallback...", err);
            return copyFallback(text);
        });
    }
    return copyFallback(text);

    function copyFallback(txt) {
        const textArea = document.createElement("textarea");
        textArea.value = txt;
        textArea.style.top = "0";
        textArea.style.left = "0";
        textArea.style.position = "fixed";
        textArea.style.opacity = "0";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        try {
            const successful = document.execCommand('copy');
            document.body.removeChild(textArea);
            return successful ? Promise.resolve() : Promise.reject(new Error("Fallback copy failed"));
        } catch (err) {
            document.body.removeChild(textArea);
            return Promise.reject(err);
        }
    }
};

window.copyBOMToClipboard = function() {
    try {
        if (window.currentActiveApp && !window.currentActiveApp.parts && !window.currentActiveApp.selectedTray) {
            alert("Bitte wählen Sie zuerst ein Produkt aus.");
            return;
        }
        const bomTableBody = document.getElementById("bomTableBody");
        if (!bomTableBody) {
            alert("Keine Produkte gefunden.");
            return;
        }
        let textLines = [];
        bomTableBody.querySelectorAll("tr").forEach(row => {
            if (row.style.display === "none" || row.style.opacity === "0.5" || window.getComputedStyle(row).display === "none") return;
            if (row.querySelector("td[colspan]")) return;
            
            const codeSpan = row.querySelector(".bom-code");
            const qtyStrong = row.querySelector("strong");
            if (codeSpan && codeSpan.textContent.trim()) {
                let code = codeSpan.textContent.replace(/\t/g, "").trim();
                let menge = qtyStrong ? qtyStrong.textContent.replace(/\t/g, "").trim() : "1";
                if (!/^\d+$/.test(menge)) menge = "1";
                if (code !== "-" && code !== "none" && code !== "" && !code.toLowerCase().startsWith("ohne") && code !== "Ausstehend") {
                    textLines.push(code + "\t" + menge);
                }
            }
        });
        if (textLines.length === 0) {
            alert("Keine kopierbaren Produkte gefunden.");
            return;
        }
        const text = textLines.join("\n");
        window.copyTextToClipboard(text).then(() => {
            alert("Kopiert:\n\n" + text.replace(/\t/g, "    "));
        }).catch(e => alert("Kopieren fehlgeschlagen: " + e.message));
    } catch (err) {
        alert("Fehler beim Kopieren: " + err.message);
    }
};


// Dynamic search engine to support multi-term queries and alphanumeric normalization
const matchesSearchQuery = (item, queryText) => {
    if (!queryText || queryText.trim() === '') return true;
    const terms = queryText.toLowerCase().split(/\s+/).filter(Boolean);
    const cleanLabel = ((item.label || '') + ' ' + (item.description || '')).toLowerCase().replace(/[^a-z0-9]/g, '');
    const cleanArtNr = (item.artNr || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const cleanMfr = (item.manufacturer || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    
    return terms.every(term => {
        const cleanTerm = term.replace(/[^a-z0-9]/g, '');
        if (!cleanTerm) return true;
        return cleanLabel.includes(cleanTerm) || cleanArtNr.includes(cleanTerm) || cleanMfr.includes(cleanTerm);
    });
};


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
            window.copyTextToClipboard(text).then(() => alert("SAP Format kopiert:\n\n" + text.replace(/\t/g, "    "))).catch(e => alert("Fehler."));
        }
    };
}

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
            mList.innerHTML = `<button class="pill-btn ${this.currentManufacturer === 'all' ? 'active' : ''}" data-val="all">Alle</button>` + manufacturers.map(m => `
                    <button class="pill-btn ${this.currentManufacturer === m ? 'active' : ''}" data-val="${m}">${m}</button>
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
                sList.innerHTML = `<button class="pill-btn ${this.currentSize === 'all' ? 'active' : ''}" data-val="all">Alle</button>` + sizes2D.map(s => {
                    const btnLabel = config.sizeLabel === 'Breite' ? `bis ${s} cm` : s;
                    return `<button class="pill-btn ${this.currentSize === s ? 'active' : ''}" data-val="${s}">${btnLabel}</button>`;
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
                        tList.innerHTML = `<button class="pill-btn ${this.currentTiefe === 'all' ? 'active' : ''}" data-val="all">Alle</button>` + depths.map(d => {
                            return `<button class="pill-btn ${this.currentTiefe === d ? 'active' : ''}" data-val="${d}">${d}</button>`;
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
        filterResults: function () {
            const mFilter = this.currentManufacturer || 'all';
            const serieFilter = this.currentSerie || 'all';
            const fFilter = this.currentForm || 'all';
            const sFilter = this.currentSize || 'all';
            const tiefeFilter = this.currentTiefe || 'all';
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

            if (this.selectedTray.mountingMaterials.some(g => g.id === 'mat_montageset')) {
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
                                const curDeckel = this.selectedTray.selections['mat_deckel'];
                                if (curDeckel && curDeckel.startsWith('1311 699.')) {
                                    const nextDeckel = `1311 699.${newColor}.${newSurface}`;
                                    const nextDeckelFallback = `1311 699.${newColor}.000`;
                                    
                                    const allApps = window.productApps || {};
                                    const zubPool = allApps['zubehoer_pool'] ? allApps['zubehoer_pool'].trays : [];
                                    
                                    let finalDeckel = null;
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
            const label = ((obj.label || '') + ' ' + (obj.description || '')).toLowerCase();
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
            const lbl = ((t.label || '') + ' ' + (t.description || '')).toLowerCase();
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

            const isAccessory = ['papierhalter', 'reserverollenhalter', 'klosettbürstenhalter', 'wc-bürste', 'seifenhalter', 'seifenspender', 'glashalter', 'doppelglashalter', 'handtuchhalter', 'handtuchring', 'handtuchhaken', 'badetuchstange', 'hakenleiste', 'drahtseifenhalter', 'duschkorb', 'schwammhalter', 'accessoire'].some(kw => ((t.label||'') + ' ' + (t.description||'')).toLowerCase().includes(kw));
            if (isAccessory && serie.includes(' ')) serie = serie.split(' ')[0];

            // 4. Capitalize each word
            serie = serie.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

            return serie || 'Andere';
        },
        extractAbstellflaeche: function (obj) {
            if (obj.overrideAbstell && obj.overrideAbstell !== 'auto') return obj.overrideAbstell;
            const label = ((obj.label || '') + ' ' + (obj.description || '')).toLowerCase();
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
                        let selectedArtNr = filteredOptions[0].artNr;
                        // For Badewanne Zargen-Wannendichtband, default to 3-seitig (Nische-Variante)
                        if (title === 'Badewanne' && (mat.name === 'Zargen-Wannendichtband' || mat.name === 'Wannenzargenband' || mat.id === 'mat_tape')) {
                            const threeSided = filteredOptions.find(o => (o.label || '').toLowerCase().includes('3-seitig') || (o.label || '').toLowerCase().includes('nische'));
                            if (threeSided) {
                                selectedArtNr = threeSided.artNr;
                            }
                        }
                        this.selectedTray.selections[mat.id] = selectedArtNr;
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
            const text = textLines.join('\n');
            window.copyTextToClipboard(text).then(() => alert("Kopiert:\n\n" + text.replace(/\t/g, "    "))).catch(e => alert("Kopieren fehlgeschlagen."));
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
            const tl = ((t.label || '') + ' ' + (t.description || '')).toLowerCase();
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
            const label = (obj.label || '') + ' ' + (obj.description || '');
            // Look for "A 120 mm" or "Ausladung 140 mm"
            const match = label.match(/(?:A\s|Ausladung\s*)([0-9]{2,3})\s*mm/i);
            if (match) return match[1];
            return 'unknown';
        },
        extractAblauf: function (obj) {
            const label = ((obj.label || '') + ' ' + (obj.description || '')).toLowerCase();
            if (label.includes('ohne ablauf')) return 'ohne';
            if (label.includes('ablauf')) return 'mit';
            return 'ohne';
        },
        extractAuslauf: function (obj) {
            const label = ((obj.label || '') + ' ' + (obj.description || '')).toLowerCase();
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
            if (!this.selectedTray) {
                alert('Bitte wählen Sie zuerst ein Produkt aus.');
                return;
            }

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
            window.copyTextToClipboard(textArray).then(() => {
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

            const isAccessory = ['papierhalter', 'reserverollenhalter', 'klosettbürstenhalter', 'wc-bürste', 'seifenhalter', 'seifenspender', 'glashalter', 'doppelglashalter', 'handtuchhalter', 'handtuchring', 'handtuchhaken', 'badetuchstange', 'hakenleiste', 'drahtseifenhalter', 'duschkorb', 'schwammhalter', 'accessoire'].some(kw => ((t.label||'') + ' ' + (t.description||'')).toLowerCase().includes(kw));
            if (isAccessory && serie.includes(' ')) serie = serie.split(' ')[0];

            // 4. Capitalize each word
            serie = serie.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

            return serie || 'Andere';
        },

        isAblaufItem: function (t) {
            const tl = ((t.label || '') + ' ' + (t.description || '')).toLowerCase();
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
                f8 = f8.filter(t => matchesSearchQuery(t, this.basinSearchQuery));
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
                f7 = f7.filter(t => matchesSearchQuery(t, this.faucetSearchQuery));
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

                                    // Allow up to 3cm difference (e.g. 78cm quattro luci for 80cm basin)
                                    if (Math.abs(bW - cW) > 3) return;
                                    // If width matches or is close, we consider it a found match
                                    matchFound = true;
                                } else if (target === 'spiegelschrank' && basinWStr !== 'unknown') {
                                    // Basin has a width, but cabinet doesn't? Skip it to be safe.
                                    return;
                                }
                            }

                            // 2. Fallback to Series match if no specific rule matched
                            if (!matchFound && !target.startsWith('accessoires')) {
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
                            <div style="background: rgba(255,255,255,0.02); border-radius: 12px; padding: 0.75rem 1rem; border: 1px solid rgba(255,255,255,0.05); display: grid; grid-template-columns: 24px max-content 1fr; gap: 0.4rem 0.75rem; align-items: start; max-width: 900px;">
                                ${this.getBOMPreviewItems().map(item => {
                if (item.isSpacer) return '<div style="grid-column: 1 / -1; margin: 0.3rem 0; border-top: 1px dashed rgba(255,255,255,0.1);"></div>';
                return `
                                        <div style="color: var(--text-secondary); font-size: 0.7rem; padding-top: 2px;">${item.qty}x</div>
                                        <div style="font-family: monospace; color: var(--accent); font-weight: 700; font-size: 0.76rem; white-space: nowrap; text-align: left;">${item.artNr}</div>
                                        <div style="font-weight: 500; color: var(--text-primary); line-height: 1.35; font-size: 0.76rem;">${item.label}</div>
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
            window.copyTextToClipboard(textArray).then(() => {
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
            window.copyTextToClipboard(textArray).then(() => {
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
  function ut(B, F, R, N = {}) {
    const m = N.isBath || !1,
      s = B.replace(/\s/g, "");
    return {
      trays: [],
      mainImgUrl: R,
      selectedTray: null,
      mischerOptionsState: {},
      currentHersteller: "all",
      currentMontage: "all",
      currentSerie: "all",
      showAccessoires: false,
      selectedAddonAccessoires: [],
      currentAccessoireSerie: 'Alle',
      init: function () {
        ((this.selectedTray = null),
          (this.mischerOptionsState = {}),
          (this.currentHersteller = "all"),
          (this.currentMontage = "all"),
          (this.currentSerie = "all"),
          (this.showAccessoires = false),
          (this.selectedAddonAccessoires = []),
          (this.currentAccessoireSerie = 'Alle'),
          this.renderSidebar(),
          this.bindFilters(), this.filterResults());
          if (!config.enableGalleryUX) { this.clearBOM(); }
        
      },
      normalizeDuschenmischerSerie: function (r, e = "") {
        let t = String(r || "")
          .toLowerCase()
          .trim();
        const n = String(e || "").toLowerCase();
        return (
          (t = t
            .replace(/^[-\s/]+/, "")
            .replace(/^-?\s*endmontageset\b/, "")
            .replace(/^-?\s*fertigmontageset\b/, "")
            .replace(/^[-\s/]+/, "")),
          n && t.startsWith(n) && (t = t.slice(n.length).trim()),
          n &&
            (t = t
              .replace(
                new RegExp(
                  `\\b${n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`,
                  "gi",
                ),
                "",
              )
              .trim()),
          (t = t
            .replace(/^[-\s/]+/, "")
            .replace(/\babdeckplatte\b.*$/i, "")
            .replace(/\bdurchflussleistung\b.*$/i, "")
            .replace(/\bohne einbaukörper\b.*$/i, "")
            .replace(/\benergieeffizienzklasse\b.*$/i, "")
            .replace(/\bgeräuschgruppe\b.*$/i, "")
            .replace(/\barmhebel\b.*$/i, "")
            .replace(/\bselbstschliessend\b.*$/i, "")
            .replace(/\btemperaturgriff\b.*$/i, "")
            .replace(/^thermostat\s+/i, "")
            .replace(/\s+½[\"”]?\s+thermostat\b.*$/i, "")
            .replace(/\s+thermostat\b.*$/i, "")
            .replace(/\bmit sicherheitstaste\b.*$/i, "")
            .replace(/\b1-weg\b.*$/i, "")
            .replace(/\s+½[\"”]?$/i, "")
            .replace(/\bav\.0\b/g, "ava 2.0")
            .replace(/\bvit\.0\b/g, "vita 2.0")
            .replace(/\s*,\s*$/g, "")
            .replace(/\s+/g, " ")
            .trim()),
          t
            ? t
                .split(" ")
                .map((i) =>
                  /^kwc$/i.test(i)
                    ? "KWC"
                    : /^\d/.test(i)
                      ? i
                      : i.charAt(0).toUpperCase() + i.slice(1),
                )
                .join(" ")
            : "Andere"
        );
      },
      extractSerie: function (r) {
        if (r.serie)
          return this.normalizeDuschenmischerSerie(r.serie, r.manufacturer);
        const e = [
          "aufputz-duschenmischer",
          "unterputz-duschenmischer",
          "duschenmischer",
          "duschmischer",
          "aufputz-bademischer",
          "unterputz-bademischer",
          "bademischer",
          "waschtischmischer",
          "thermostatmischer",
          "thermostat-duschenmischer",
          "einhebelmischer",
          "einlochmischer",
          "mischer",
        ];
        let t = (r.label || "").toLowerCase();
        if (r.manufacturer) {
          const a = r.manufacturer.toLowerCase();
          t.startsWith(a) && (t = t.slice(a.length).trim());
        }
        for (const a of e)
          if (t.startsWith(a)) {
            t = t.slice(a.length).trim();
            break;
          }
        if (
          ((t = t.replace(/-?endmontageset/g, "").trim()),
          (t = t.replace(/-?fertigmontageset/g, "").trim()),
          r.manufacturer)
        ) {
          const a = r.manufacturer.toLowerCase();
          t.startsWith(a) && (t = t.slice(a.length).trim());
        }
        const n = t.match(
          /^(.*?)(?:\s+\d+\s*[xX]\s*\d+|\s*,|\s*\(|\s+-|\s+\d+mm|\s+\d+\s*mm)/,
        );
        let i = n && n[1] ? n[1].trim() : t.trim();
        return this.normalizeDuschenmischerSerie(i, r.manufacturer);
      },
      extractMontage: function (r) {
        const e = (r.label || "").toLowerCase();
        return e.includes("unterputz") ||
          e.includes(" up ") ||
          e.includes("einbau") ||
          e.includes("endmontageset") ||
          e.includes("grundkörper") ||
          e.includes("grundkoerper")
          ? "Unterputz"
          : e.includes("aufputz") ||
              e.includes(" ap ") ||
              e.includes("wandbatterie") ||
              e.includes("wandmischer") ||
              e.includes("ad 153 mm") ||
              e.includes("aufputz-duschenmischer") ||
              e.includes("thermostat-duschenmischer")
            ? "Aufputz"
            : m && (e.includes("standmodell") || e.includes("freistehend"))
              ? "Standmodell"
              : "Aufputz";
      },
      getUniqueValues: function (r, e) {
        const t = e || this.trays;
        if (r === "hersteller") {
          const n = this.trays.map((i) => i.manufacturer || "Andere");
          return [...new Set(n)].filter(Boolean).sort();
        }
        return r === "montage"
          ? [...new Set(t.map((n) => this.extractMontage(n)))].sort()
          : r === "serie"
            ? [...new Set(t.map((n) => this.extractSerie(n)))].sort()
            : [];
      },
      renderSidebar: function () {
        const r = document.getElementById("configSidebar");
        if (!r) return;
        const e =
            this.currentHersteller === "all"
              ? this.trays
              : this.trays.filter(
                  (o) => o.manufacturer === this.currentHersteller,
                ),
          t = e.filter((o) =>
            this.currentMontage === "all"
              ? !0
              : this.extractMontage(o) === this.currentMontage,
          ),
          n = this.getUniqueValues("hersteller"),
          i = this.getUniqueValues("serie", t),
          a = this.getUniqueValues("montage", e);
        ((r.innerHTML = `
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
                            <button class="pill-btn ${this.currentHersteller === "all" ? "active" : ""}" data-key="Hersteller" data-val="all">Alle</button>
                            ${n.map((o) => `<button class="pill-btn ${this.currentHersteller === o ? "active" : ""}" data-key="Hersteller" data-val="${o}">${o}</button>`).join("")}
                        </div>
                    </div>

                    <div class="filter-group">
                        <label id="head_montage_${s}" class="filter-label">Montageart</label>
                        <div class="pill-group" id="list_montage_${s}">
                            <button class="pill-btn ${this.currentMontage === "all" ? "active" : ""}" data-key="Montage" data-val="all">Alle</button>
                            ${a.map((o) => `<button class="pill-btn ${this.currentMontage === o ? "active" : ""}" data-key="Montage" data-val="${o}">${o}</button>`).join("")}
                        </div>
                    </div>

                    <div class="filter-group">
                        <label id="head_serie_${s}" class="filter-label">Serie</label>
                        <div class="pill-group" id="list_serie_${s}">
                            <button class="pill-btn ${this.currentSerie === "all" ? "active" : ""}" data-key="Serie" data-val="all">Alle</button>
                            ${i.map((o) => `<button class="pill-btn ${this.currentSerie === o ? "active" : ""}" data-key="Serie" data-val="${o}">${o}</button>`).join("")}
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
                
                <div class="sidebar-section" ${config.enableGalleryUX ? 'style="display:none;"' : ''}>
                    <h2>Suchergebnisse <span id="resultCount_${s}" class="badge">0</span></h2>
                    <div class="search-results-container" id="searchResults_${s}"></div>
                </div>

                
                <div class="sidebar-section addon-toggles-section" id="addon_toggles_section_${s}" style="display:none; margin-top:2rem;">
                    <div class="finder-sub-header">Zusatzoptionen</div>
                    <div class="addon-toggle-row" id="toggle_accessoires_${s}">
                        <span class="addon-toggle-label"><i class="ri-archive-line"></i> Accessoires</span>
                        <button class="ios-toggle" data-target="accessoires_mischer_${s}" aria-label="Accessoires ein/aus"><span class="ios-toggle-knob"></span></button>
                    </div>
                    <div id="addon_accessoires_mischer_panel_${s}" class="addon-panel" style="display:none;">
                        <div class="finder-sub-header">Serie</div>
                        <div class="pill-group" id="list_addon_accessoires_serie_${s}" style="margin-bottom: 0.75rem;"></div>
                        <div class="finder-sub-header">Accessoires wählen</div>
                        <div class="finder-list" id="list_addon_accessoires_${s}"></div>
                    </div>
                </div>
                <div class="sidebar-section" id="trayConfigurator_${s}" style="display:none
 margin-top:2rem
">
                    <h2>Konfiguration</h2>
                    <p class="section-desc">Bestimmen Sie das benötigte Zubehör.</p>
                    <div id="trayConfiguratorInner_${s}"></div>
                </div>
            `),
          r.querySelectorAll(".pill-btn[data-key]").forEach((o) => {
            o.addEventListener("click", () => {
              this.setFilter(o.dataset.key, o.dataset.val);
            });
          }),
          X(
            `head_hersteller_${s}`,
            `list_hersteller_${s}`,
            this.currentHersteller,
            "Hersteller",
            () => this.setFilter("Hersteller", "all"),
          ),
          X(
            `head_montage_${s}`,
            `list_montage_${s}`,
            this.currentMontage,
            "Montageart",
            () => this.setFilter("Montage", "all"),
          ),
          X(
            `head_serie_${s}`,
            `list_serie_${s}`,
            this.currentSerie,
            "Serie",
            () => this.setFilter("Serie", "all"),
          ));
        
          this.updateAccessoiresToggles();
          this.populateAccessoires();
          const l = document.getElementById(`input_search_${s}`);
        (l && l.addEventListener("input", () => this.filterResults()),
          this.filterResults());
      },
      setFilter: function (r, e) {
        ((this[`current${r}`] = e), this.renderSidebar());
      },
      bindFilters: function () {},
      
      updateAccessoiresToggles: function () {
            const btn = document.querySelector(`#toggle_accessoires_${s} .ios-toggle`);
            const panel = document.getElementById(`addon_accessoires_mischer_panel_${s}`);
            if (btn) btn.classList.toggle('active', this.showAccessoires);
            if (panel) panel.style.display = this.showAccessoires ? 'block' : 'none';
            
            const section = document.getElementById(`addon_toggles_section_${s}`);
            if (section) {
                if (this.selectedTray) {
                    section.style.display = 'block';
                } else {
                    section.style.display = 'none';
                    this.showAccessoires = false;
                }
                const toggleBtn = section.querySelector('.ios-toggle');
                if (toggleBtn && !toggleBtn.dataset.bound) {
                    toggleBtn.dataset.bound = "true";
                    toggleBtn.addEventListener('click', () => {
                        this.showAccessoires = !this.showAccessoires;
                        this.updateAccessoiresToggles();
                        this.updateBOM();
                    });
                }
            }
      },
      populateAccessoires: function () {
            const listId = `list_addon_accessoires_${s}`;
            const serieListId = `list_addon_accessoires_serie_${s}`;
            const listEl = document.getElementById(listId);
            const serieListEl = document.getElementById(serieListId);
            if (!listEl || !serieListEl) return;
            
            let candidates = [];
            const allApps = window.productApps || {};
            const keywords = ['badetuchstange', 'schwammhalter', 'eckseifenhalter', 'drahtseifenhalter', 'duschkorb'];
            
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

            const extractAccessoireSerie = (t) => {
                if (t.serie) return t.serie;
                let label = (t.label || '').toLowerCase();
                if (t.manufacturer) {
                    const m = t.manufacturer.toLowerCase();
                    if (label.startsWith(m)) label = label.slice(m.length).trim();
                }
                for (const kw of keywords) {
                    if (label.startsWith(kw)) {
                        label = label.slice(kw.length).trim();
                        break;
                    }
                }
                if (t.manufacturer) {
                    const m = t.manufacturer.toLowerCase();
                    if (label.startsWith(m)) label = label.slice(m.length).trim();
                }
                const match = label.match(/^(.*?)(?:\s+\d+\s*[xX]\s*\d+|\s*,|\s*\(|\s+-|\s+\d+mm|\s+\d+\s*mm)/);
                let serie = match && match[1] ? match[1].trim() : label.trim();
                if (serie.includes(' ')) serie = serie.split(' ')[0];
                return serie ? serie.charAt(0).toUpperCase() + serie.slice(1) : 'Andere';
            };

            // Filters
            const seriesList = ['Alle'];
            candidates.forEach(c => {
                const s = extractAccessoireSerie(c);
                if (!seriesList.includes(s)) seriesList.push(s);
            });
            
            serieListEl.innerHTML = seriesList.map(sx => 
                `<button class="pill-btn ${this.currentAccessoireSerie === sx ? 'active' : ''}" data-val="${sx}">${sx}</button>`
            ).join('');
            
            serieListEl.querySelectorAll('.pill-btn').forEach(b => {
                b.addEventListener('click', () => {
                    this.currentAccessoireSerie = b.dataset.val;
                    this.populateAccessoires();
                });
            });

            let filtered = candidates;
            if (this.currentAccessoireSerie !== 'Alle') {
                filtered = filtered.filter(c => extractAccessoireSerie(c) === this.currentAccessoireSerie);
            }

            listEl.innerHTML = '';
            if (filtered.length === 0) {
                listEl.innerHTML = '<div class="finder-empty-state" style="font-size:0.8rem;">Keine Accessoires gefunden.</div>';
                return;
            }

            filtered.forEach(c => {
                const btn = document.createElement('div');
                const isSelected = this.selectedAddonAccessoires.some(x => x.artNr === c.artNr);
                btn.className = `finder-item ${isSelected ? 'active' : ''}`;
                btn.innerHTML = `
                    <div style="display:flex; align-items:center; gap:0.5rem;">
                        ${c.imgUrl ? `<img src="${c.imgUrl}" style="width:32px; height:32px; object-fit:contain; background:#fff; border-radius:4px; padding:2px; flex-shrink:0;">` : `<div style="width:32px; height:32px; display:flex; align-items:center; justify-content:center; background:var(--bg-surface); border-radius:4px; flex-shrink:0;"><i class="ri-image-line placeholder-icon"></i></div>`}
                        <div>
                            <div style="font-size:0.8rem; font-weight:500; line-height:1.3;">${c.label || c.name}</div>
                            <div style="font-size:0.7rem; color:var(--st-gray); margin-top:0.25rem;">
                                ${c.manufacturer || ''} ${extractAccessoireSerie(c) !== 'Andere' ? '· ' + extractAccessoireSerie(c) : ''}
                            </div>
                        </div>
                    </div>
                    <div style="font-size:0.75rem; color:var(--st-gray); font-family:var(--st-font-mono); margin-top:0.5rem; text-align:right;">${c.artNr}</div>
                `;
                btn.addEventListener('click', () => {
                    if (isSelected) {
                        this.selectedAddonAccessoires = this.selectedAddonAccessoires.filter(x => x.artNr !== c.artNr);
                    } else {
                        this.selectedAddonAccessoires.push({ ...c, qty: 1, origin: 'Zusatzoptionen' });
                    }
                    this.populateAccessoires();
                    this.updateBOM();
                });
                listEl.appendChild(btn);
            });
      },
      
      renderGridInMainPanel: function (filtered) {
            const bomTableBody = document.getElementById("bomTableBody");
            const bomCountCounter = document.getElementById("bomCount");
            if (bomCountCounter) bomCountCounter.textContent = filtered.length + ' Produkte gefunden';
            if (filtered.length === 0) {
                bomTableBody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:#9da3ad; padding:2rem;">Keine Produkte gefunden. Bitte passen Sie die Filter an.</td></tr>';
                return;
            }

            const sortedFiltered = [...filtered].sort((a, b) => String(a.artNr || '').localeCompare(String(b.artNr || '')));
            const cappedFiltered = sortedFiltered.slice(0, 150);

            let cards = cappedFiltered.map(t => {
                return `
                    <div class="result-item-card catalog-preview-card" onclick="window.currentActiveApp.selectItem('${t.id}')" style="display:flex; flex-direction:row; align-items:center; gap:1rem; border:1px solid var(--border); border-radius:8px; padding:1rem; background:var(--bg-surface); cursor:pointer; transition:all 0.2s;" onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 6px 20px rgba(0,0,0,0.2)'" onmouseout="this.style.transform=''; this.style.boxShadow=''">
                        <div class="card-img-wrapper" style="width:70px; height:90px; display:flex; align-items:center; justify-content:center; border-radius:6px; overflow:hidden; background:var(--bg-subtle); flex-shrink:0;">
                            ${(t.imgUrl || getSanitasImgUrl(t.artNr)) ? `<img src="${t.imgUrl || getSanitasImgUrl(t.artNr)}" loading="lazy" style="max-height:100%; max-width:100%; object-fit:contain;">` : '<i class="ri-image-line placeholder-icon" style="font-size:2rem; color:var(--text-secondary);"></i>'}
                        </div>
                        <div class="result-info" style="display:flex; flex-direction:column; flex:1; min-width:0;">
                            <span style="font-size:0.7rem; color:var(--text-secondary); text-transform:uppercase; letter-spacing:0.5px; margin-bottom:2px;">${t.manufacturer || "Marke unbekannt"}</span>
                            <strong style="font-size:0.85rem; line-height:1.3; margin-bottom:4px; color:var(--text-primary); display:-webkit-box; -webkit-line-clamp:3; -webkit-box-orient:vertical; overflow:hidden;">${t.label || t.name || ""}</strong>
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
      filterResults: function () {
        var i;
        const r = document.getElementById(`searchResults_${s}`),
          e = document.getElementById(`resultCount_${s}`),
          t = (
            ((i = document.getElementById(`input_search_${s}`)) == null
              ? void 0
              : i.value) || ""
          ).toLowerCase();
        if (!r) return;
        let n = this.trays;
        if (
          (this.currentHersteller !== "all" &&
            (n = n.filter((a) => a.manufacturer === this.currentHersteller)),
          this.currentSerie !== "all" &&
            (n = n.filter((a) => this.extractSerie(a) === this.currentSerie)),
          this.currentMontage !== "all" &&
            (n = n.filter(
              (a) => this.extractMontage(a) === this.currentMontage,
            )),
          t &&
            (n = n.filter((a) => matchesSearchQuery(a, t))),
          (e.textContent = n.length),
          n.length === 0)
        ) {
          r.innerHTML = '<div style="padding:2rem; text-align:center; color:var(--text-secondary);">Keine Produkte gefunden. Bitte passen Sie die Filter an.</div>';
          if (config.enableGalleryUX) {
              if (this.selectedTray) {
                  this.renderConfigurator();
                  this.updateBOM();
              } else {
                  this.renderGridInMainPanel([]);
              }
          }
          return;
        }
        if (this.selectedTray) {
            this.renderConfigurator();
            this.updateBOM();
        } else {
            if (config.enableGalleryUX) {
                this.renderGridInMainPanel(n);
                r.innerHTML = '<div style="padding:1rem; text-align:center; color:var(--text-secondary);">Bitte wählen Sie ein Produkt aus der Hauptansicht.</div>';
                return;
            } else {
                ((r.innerHTML = n
                  .map((a) => {
                    const l = this.selectedTray && this.selectedTray.id === a.id;
                    return `
                        <div class="result-item-card ${l ? "active" : ""}" onclick="window.currentActiveApp.selectItem('${a.id}')" data-tid="${a.id}">
                            <div class="card-img-wrapper">
                                ${a.imgUrl ? `<img src="${a.imgUrl}">` : '<i class="ri-image-line placeholder-icon"></i>'}
                            </div>
                            <div class="result-info">
                                <strong>${this.extractSerie(a)}</strong>
                                <div class="result-meta">
                                    <span>${a.manufacturer || "Andere"}</span> | <span>${this.extractMontage(a)}</span>
                                </div>
                                <span class="finish-artnr">${a.artNr}</span>
                            </div>
                        </div>
                        `;
                  })
                  .join("")),
                  r.querySelectorAll(".result-item-card").forEach((a) => {
                    a.addEventListener("click", () => {
                      this.selectItem(a.dataset.tid);
                    });
                  }));
            }
        }
      },
      selectItem: function (r) {
          if (!r) {
              this.selectedTray = null;
              this.mischerOptionsState = {};
              this.showAccessoires = false;
              this.selectedAddonAccessoires = [];
              if (config.enableGalleryUX) {
                  this.updateBOM();
                  this.filterResults();
                  this.renderConfigurator();
                  this.updateAccessoiresToggles();
              } else {
                  this.clearBOM();
              }
              return;
          }
          if (!r) {
              this.selectedTray = null;
              this.mischerOptionsState = {};
              this.showAccessoires = false;
              this.selectedAddonAccessoires = [];
              if (config.enableGalleryUX) {
                  this.updateBOM();
                  this.filterResults();
                  this.renderConfigurator();
                  this.updateAccessoiresToggles();
              } else {
                  this.clearBOM();
              }
              return;
          }
        ((this.selectedTray = this.trays.find((e) => e.id === r)),
          (this.mischerOptionsState = {}),
          this.selectedTray &&
            this.selectedTray.mountingMaterials &&
            this.selectedTray.mountingMaterials.forEach((e, t) => {
              e.options &&
                e.options.length > 0 &&
                (this.mischerOptionsState[t] = 0);
            }),
          this.filterResults(),
          (this.showAccessoires = false), (this.selectedAddonAccessoires = []), this.updateAccessoiresToggles(), this.populateAccessoires(), this.renderConfigurator(), this.updateBOM());
      },
      isMatVisible: function (r, e) {
        if (!this.selectedTray || !this.selectedTray.mountingMaterials)
          return !0;
        if ((r.name || "").toLowerCase().includes("duschengleitstange")) {
          const n = this.selectedTray.mountingMaterials.findIndex((i) =>
            (i.name || "").toLowerCase().includes("brausehalter"),
          );
          if (n >= 0) {
            const i = this.mischerOptionsState[n];
            if (i !== void 0) {
              const a = this.selectedTray.mountingMaterials[n].options[i];
              return !!(
                a &&
                a.label &&
                a.label.toLowerCase().startsWith("ohne")
              );
            }
          }
        }
        return !0;
      },
      renderConfigurator: function () {
        const r = document.getElementById(`trayConfigurator_${s}`),
          e = document.getElementById(`trayConfiguratorInner_${s}`);
        if (!this.selectedTray) {
          r && (r.style.display = "none");
          return;
        }
        if ((r && (r.style.display = "block"), !e)) return;
        if (config.enableGalleryUX) {
            r.style.display = "none";
            return;
        }
        e.innerHTML = "";
        const t = this.selectedTray.mountingMaterials || [];
        if (t.length === 0) {
          e.innerHTML =
            '<p class="section-desc">Kein spezifisches Zubehör verfügbar.</p>';
          return;
        }
        (t.forEach((n, i) => {
          if (!this.isMatVisible(n, i)) return;
          const a = document.createElement("div");
          ((a.className = "filter-group"), (a.style.marginBottom = "1.25rem"));
          const l = this.mischerOptionsState[i],
            o = l !== void 0 ? n.options[l] : null,
            y = (o == null ? void 0 : o.imgUrl) || "",
            M = n.options.length > 1;
          ((a.innerHTML = `
                    <label style="display:block; margin-bottom:0.4rem; font-size:0.85rem; color:var(--text-secondary); text-transform:uppercase; letter-spacing:0.5px;">${n.name || "Zubehör"}</label>
                    <div style="display:flex; align-items:center; gap:0.75rem;">
                        <div style="width:40px; height:40px; background:#fff; border-radius:4px; border:1px solid var(--border); display:flex; align-items:center; justify-content:center; padding:2px; flex-shrink:0;">
                            ${y ? `<img src="${y}" style="max-width:100%; max-height:100%; object-fit:contain;">` : '<i class="ri-image-line" style="color:#ddd;"></i>'}
                        </div>
                        <div style="flex:1; position:relative;">
                            <select class="filter-select mischer-acc-select" data-midx="${i}" style="width:100%; padding-right:2rem; ${M ? "" : "pointer-events:none; background-image:none !important;"}">
                                ${n.options
                                  .map(
                                    (v, S) => `
                                    <option value="${S}" ${l == S ? "selected" : ""}>${v.label} (${v.artNr})</option>
                                `,
                                  )
                                  .join("")}
                            </select>
                            ${M ? '<i class="ri-arrow-down-s-line" style="position:absolute; right:10px; top:50%; transform:translateY(-50%); pointer-events:none; color:var(--text-secondary); font-size:1.2rem;"></i>' : ""}
                        </div>
                    </div>
                `),
            e.appendChild(a));
        }),
          e.querySelectorAll(".mischer-acc-select").forEach((n) => {
            n.addEventListener("change", (i) => {
              const a = parseInt(n.dataset.midx),
                l = parseInt(n.value);
              ((this.mischerOptionsState[a] = l),
                (this.showAccessoires = false), (this.selectedAddonAccessoires = []), this.updateAccessoiresToggles(), this.populateAccessoires(), this.renderConfigurator(), this.updateBOM());
            });
          }));
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
                            if (typeof window.currentActiveApp.selectItem === 'function') {
                                window.currentActiveApp.selectItem(null);
                            } else if (typeof window.currentActiveApp.selectTray === 'function') {
                                window.currentActiveApp.selectTray(null);
                            }
                        }
                    };
                    backBtn.style.display = "inline-flex";
                }
            }
        }
        const r = document.getElementById("bomTableBody"),
          e = document.getElementById("bomCount");
        if (!r) return;
        if (((r.innerHTML = ""), !this.selectedTray)) {
          e && (e.textContent = "0 Artikel");
          return;
        }
        let t = 1;
        ((r.innerHTML += `
                <tr class="bom-main-item">
                    <td><div class="img-cell"><img src="${this.selectedTray.imgUrl || ""}"></div></td>
                    <td><span class="bom-code">${this.selectedTray.artNr}</span></td>
                    <td><div class="bom-desc">${this.selectedTray.label}</div></td>
                    
                    <td><strong>1</strong></td>
                </tr>
            `),
          this.selectedTray.mountingMaterials &&
            this.selectedTray.mountingMaterials.forEach((n, i) => {
              if (!this.isMatVisible(n, i)) return;
              const a = this.mischerOptionsState[i];
              if (a !== void 0) {
                const l = n.options[a];
                const isOhne = l && l.label.toLowerCase().startsWith("ohne");
                
                let isInlineDropdown = config.enableGalleryUX && n.options.length > 1;
                
                if (!isInlineDropdown && isOhne) return;

                let descHTML = `<div class="bom-desc">${l ? l.label : ''}</div>`;
                if (isInlineDropdown) {
                    const optionsHTML = n.options.map((opt, idx) => {
                        const selected = (a === idx) ? 'selected' : '';
                        return `<option value="${idx}" ${selected}>${opt.label} (${opt.artNr})</option>`;
                    }).join('');
                    
                    descHTML = `
                        <div class="bom-desc" style="margin-bottom:0.25rem; font-size:0.75rem; color:var(--text-secondary); text-transform:uppercase;">${n.name || 'Zubehör'}</div>
                        <select class="inline-bom-select" data-midx="${i}" style="width: 100%; padding: 0.5rem; border-radius: 6px; border: 1px solid var(--border); background: var(--bg-surface); color: var(--text-primary); font-size: 0.9rem; margin-bottom: 0.25rem; font-family: inherit; font-weight: 500; cursor: pointer; outline: none; transition: border-color 0.2s ease;">
                            ${optionsHTML}
                        </select>
                    `;
                }

                const o = l ? (l.menge || 1) : 1;
                if (!isOhne) t += o;

                const rowOpacity = isOhne ? 'opacity: 0.6; background: rgba(0,0,0,0.02);' : '';
                const artNrDisplay = isOhne ? '-' : (l ? l.artNr : '');
                const imgDisplay = (l && l.imgUrl) ? `<img src="${l.imgUrl}">` : '<i class="ri-settings-3-line" style="font-size:1.2rem;opacity:0.3;"></i>';

                r.innerHTML += `
                    <tr style="${rowOpacity}">
                        <td><div class="img-cell" ${!(l && l.imgUrl) ? 'style="background: transparent; border: 1px dashed var(--border);"' : ''}>${imgDisplay}</div></td>
                        <td><span class="bom-code">${artNrDisplay}</span></td>
                        <td>${descHTML}</td>
                        <td><strong>${isOhne ? '-' : o}</strong></td>
                    </tr>
                `;
              }
            }),
          (function() {
            if (this.showAccessoires && this.selectedAddonAccessoires && this.selectedAddonAccessoires.length > 0) {
                this.selectedAddonAccessoires.forEach(acc => {
                    t += 1;
                    r.innerHTML += `
                        <tr>
                            <td><div class="img-cell"><img src="${acc.imgUrl || ''}"></div></td>
                            <td><span class="bom-code">${acc.artNr}</span></td>
                            <td><div class="bom-desc">${acc.label || acc.name}</div></td>
                            
                            <td><strong>1</strong></td>
                        </tr>
                    `;
                });
            }
        }).call(this), e && (e.textContent = `${t} Artikel gewählt`));
        if (config.enableGalleryUX) {
            r.querySelectorAll('.inline-bom-select').forEach(sel => {
                sel.addEventListener('change', (ev) => {
                    const midx = parseInt(ev.target.dataset.midx);
                    const newVal = parseInt(ev.target.value);
                    this.mischerOptionsState[midx] = newVal;
                    
                    this.showAccessoires = false;
                    this.selectedAddonAccessoires = [];
                    this.updateAccessoiresToggles();
                    this.populateAccessoires();
                    this.renderConfigurator();
                    this.updateBOM();
                });
            });
        }
      },

      clearBOM: function () {
        ((this.mischerOptionsState = {}), (this.showAccessoires = false), (this.selectedAddonAccessoires = []), this.updateAccessoiresToggles(), this.updateBOM());
      },
      copyToClipboard: window.copyBOMToClipboard,
    };
  }
  return ut(title, desc, mainImgUrl, config);
}
export function createBademischerApp(title, desc, mainImgUrl, config = {}) {
  function gt(B, F, R, N = {}) {
    const m = N.isBath || !1,
      s = B.replace(/\s/g, "");
    return {
      trays: [],
      mainImgUrl: R,
      selectedTray: null,
      mischerOptionsState: {},
      currentHersteller: "all",
      currentMontage: "all",
      currentSerie: "all",
      showAccessoires: false,
      selectedAddonAccessoires: [],
      currentAccessoireSerie: 'Alle',
      init: function () {
        ((this.selectedTray = null),
          (this.mischerOptionsState = {}),
          (this.currentHersteller = "all"),
          (this.currentMontage = "all"),
          (this.currentSerie = "all"),
          (this.showAccessoires = false),
          (this.selectedAddonAccessoires = []),
          (this.currentAccessoireSerie = 'Alle'),
          this.renderSidebar(),
          this.bindFilters(), this.filterResults());
          if (!config.enableGalleryUX) { this.clearBOM(); }
      },
      normalizeBademischerSerie: function (r, e = "") {
        let t = String(r || "")
          .toLowerCase()
          .trim();
        const n = String(e || "").toLowerCase();
        return (
          (t = t
            .replace(/^[-\s/]+/, "")
            .replace(/^-?\s*endmontageset\b/, "")
            .replace(/^-?\s*fertigmontageset\b/, "")
            .replace(/^[-\s/]+/, "")),
          n && t.startsWith(n) && (t = t.slice(n.length).trim()),
          n &&
            (t = t
              .replace(
                new RegExp(
                  `\\b${n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`,
                  "gi",
                ),
                "",
              )
              .trim()),
          (t = t
            .replace(/^[-\s/]+/, "")
            .replace(/\babdeckplatte\b.*$/i, "")
            .replace(/\bdurchflussleistung\b.*$/i, "")
            .replace(/\bohne einbaukörper\b.*$/i, "")
            .replace(/\benergieeffizienzklasse\b.*$/i, "")
            .replace(/\bgeräuschgruppe\b.*$/i, "")
            .replace(/\barmhebel\b.*$/i, "")
            .replace(/\bselbstschliessend\b.*$/i, "")
            .replace(/\btemperaturgriff\b.*$/i, "")
            .replace(/^thermostat\s+/i, "")
            .replace(/\s+½[\"”]?\s+thermostat\b.*$/i, "")
            .replace(/\s+thermostat\b.*$/i, "")
            .replace(/\bmit sicherheitstaste\b.*$/i, "")
            .replace(/\b1-weg\b.*$/i, "")
            .replace(/\s+½[\"”]?$/i, "")
            .replace(/\bav\.0\b/g, "ava 2.0")
            .replace(/\bvit\.0\b/g, "vita 2.0")
            .replace(/\s*,\s*$/g, "")
            .replace(/\s+/g, " ")
            .trim()),
          t
            ? t
                .split(" ")
                .map((i) =>
                  /^kwc$/i.test(i)
                    ? "KWC"
                    : /^\d/.test(i)
                      ? i
                      : i.charAt(0).toUpperCase() + i.slice(1),
                )
                .join(" ")
            : "Andere"
        );
      },
      extractSerie: function (r) {
        if (r.serie)
          return this.normalizeBademischerSerie(r.serie, r.manufacturer);
        const e = [
          "aufputz-duschenmischer",
          "unterputz-duschenmischer",
          "duschenmischer",
          "duschmischer",
          "aufputz-bademischer",
          "unterputz-bademischer",
          "bademischer",
          "waschtischmischer",
          "thermostatmischer",
          "thermostat-duschenmischer",
          "einhebelmischer",
          "einlochmischer",
          "mischer",
        ];
        let t = (r.label || "").toLowerCase();
        if (r.manufacturer) {
          const a = r.manufacturer.toLowerCase();
          t.startsWith(a) && (t = t.slice(a.length).trim());
        }
        for (const a of e)
          if (t.startsWith(a)) {
            t = t.slice(a.length).trim();
            break;
          }
        if (
          ((t = t.replace(/-?endmontageset/g, "").trim()),
          (t = t.replace(/-?fertigmontageset/g, "").trim()),
          r.manufacturer)
        ) {
          const a = r.manufacturer.toLowerCase();
          t.startsWith(a) && (t = t.slice(a.length).trim());
        }
        const n = t.match(
          /^(.*?)(?:\s+\d+\s*[xX]\s*\d+|\s*,|\s*\(|\s+-|\s+\d+mm|\s+\d+\s*mm)/,
        );
        let i = n && n[1] ? n[1].trim() : t.trim();
        return this.normalizeBademischerSerie(i, r.manufacturer);
      },
      extractMontage: function (r) {
        const e = (r.label || "").toLowerCase();
        return m && (e.includes("standmodell") || e.includes("freistehend"))
          ? "Standmodell"
          : e.includes("unterputz") ||
              e.includes(" up ") ||
              e.includes("einbau") ||
              e.includes("endmontageset") ||
              e.includes("grundkörper") ||
              e.includes("grundkoerper")
            ? "Unterputz"
            : (e.includes("aufputz") ||
                e.includes(" ap ") ||
                e.includes("wandbatterie") ||
                e.includes("wandmischer") ||
                e.includes("ad 153 mm") ||
                e.includes("aufputz-duschenmischer") ||
                e.includes("thermostat-duschenmischer"),
              "Aufputz");
      },
      getUniqueValues: function (r, e) {
        const t = e || this.trays;
        if (r === "hersteller") {
          const n = this.trays.map((i) => i.manufacturer || "Andere");
          return [...new Set(n)].filter(Boolean).sort();
        }
        return r === "montage"
          ? [...new Set(t.map((n) => this.extractMontage(n)))].sort()
          : r === "serie"
            ? [...new Set(t.map((n) => this.extractSerie(n)))].sort()
            : [];
      },
      renderSidebar: function () {
        const r = document.getElementById("configSidebar");
        if (!r) return;
        const e =
            this.currentHersteller === "all"
              ? this.trays
              : this.trays.filter(
                  (o) => o.manufacturer === this.currentHersteller,
                ),
          t = e.filter((o) =>
            this.currentMontage === "all"
              ? !0
              : this.extractMontage(o) === this.currentMontage,
          ),
          n = this.getUniqueValues("hersteller"),
          i = this.getUniqueValues("serie", t),
          a = this.getUniqueValues("montage", e);
        ((r.innerHTML = `
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
                            <button class="pill-btn ${this.currentHersteller === "all" ? "active" : ""}" data-key="Hersteller" data-val="all">Alle</button>
                            ${n.map((o) => `<button class="pill-btn ${this.currentHersteller === o ? "active" : ""}" data-key="Hersteller" data-val="${o}">${o}</button>`).join("")}
                        </div>
                    </div>

                    <div class="filter-group">
                        <label id="head_montage_${s}" class="filter-label">Montageart</label>
                        <div class="pill-group" id="list_montage_${s}">
                            <button class="pill-btn ${this.currentMontage === "all" ? "active" : ""}" data-key="Montage" data-val="all">Alle</button>
                            ${a.map((o) => `<button class="pill-btn ${this.currentMontage === o ? "active" : ""}" data-key="Montage" data-val="${o}">${o}</button>`).join("")}
                        </div>
                    </div>

                    <div class="filter-group">
                        <label id="head_serie_${s}" class="filter-label">Serie</label>
                        <div class="pill-group" id="list_serie_${s}">
                            <button class="pill-btn ${this.currentSerie === "all" ? "active" : ""}" data-key="Serie" data-val="all">Alle</button>
                            ${i.map((o) => `<button class="pill-btn ${this.currentSerie === o ? "active" : ""}" data-key="Serie" data-val="${o}">${o}</button>`).join("")}
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
                
                <div class="sidebar-section" ${config.enableGalleryUX ? 'style="display:none;"' : ''}>
                    <h2>Suchergebnisse <span id="resultCount_${s}" class="badge">0</span></h2>
                    <div class="search-results-container" id="searchResults_${s}"></div>
                </div>

                
                <div class="sidebar-section addon-toggles-section" id="addon_toggles_section_${s}" style="display:none; margin-top:2rem;">
                    <div class="finder-sub-header">Zusatzoptionen</div>
                    <div class="addon-toggle-row" id="toggle_accessoires_${s}">
                        <span class="addon-toggle-label"><i class="ri-archive-line"></i> Accessoires</span>
                        <button class="ios-toggle" data-target="accessoires_mischer_${s}" aria-label="Accessoires ein/aus"><span class="ios-toggle-knob"></span></button>
                    </div>
                    <div id="addon_accessoires_mischer_panel_${s}" class="addon-panel" style="display:none;">
                        <div class="finder-sub-header">Serie</div>
                        <div class="pill-group" id="list_addon_accessoires_serie_${s}" style="margin-bottom: 0.75rem;"></div>
                        <div class="finder-sub-header">Accessoires wählen</div>
                        <div class="finder-list" id="list_addon_accessoires_${s}"></div>
                    </div>
                </div>
                <div class="sidebar-section" id="trayConfigurator_${s}" style="display:none
 margin-top:2rem
">
                    <h2>Konfiguration</h2>
                    <p class="section-desc">Bestimmen Sie das benötigte Zubehör.</p>
                    <div id="trayConfiguratorInner_${s}"></div>
                </div>
            `),
          r.querySelectorAll(".pill-btn[data-key]").forEach((o) => {
            o.addEventListener("click", () => {
              this.setFilter(o.dataset.key, o.dataset.val);
            });
          }),
          X(
            `head_hersteller_${s}`,
            `list_hersteller_${s}`,
            this.currentHersteller,
            "Hersteller",
            () => this.setFilter("Hersteller", "all"),
          ),
          X(
            `head_montage_${s}`,
            `list_montage_${s}`,
            this.currentMontage,
            "Montageart",
            () => this.setFilter("Montage", "all"),
          ),
          X(
            `head_serie_${s}`,
            `list_serie_${s}`,
            this.currentSerie,
            "Serie",
            () => this.setFilter("Serie", "all"),
          ));
        
          this.updateAccessoiresToggles();
          this.populateAccessoires();
          const l = document.getElementById(`input_search_${s}`);
        (l && l.addEventListener("input", () => this.filterResults()),
          this.filterResults());
      },
      setFilter: function (r, e) {
        ((this[`current${r}`] = e), this.renderSidebar());
      },
      bindFilters: function () {},
      
      updateAccessoiresToggles: function () {
            const btn = document.querySelector(`#toggle_accessoires_${s} .ios-toggle`);
            const panel = document.getElementById(`addon_accessoires_mischer_panel_${s}`);
            if (btn) btn.classList.toggle('active', this.showAccessoires);
            if (panel) panel.style.display = this.showAccessoires ? 'block' : 'none';
            
            const section = document.getElementById(`addon_toggles_section_${s}`);
            if (section) {
                if (this.selectedTray) {
                    section.style.display = 'block';
                } else {
                    section.style.display = 'none';
                    this.showAccessoires = false;
                }
                const toggleBtn = section.querySelector('.ios-toggle');
                if (toggleBtn && !toggleBtn.dataset.bound) {
                    toggleBtn.dataset.bound = "true";
                    toggleBtn.addEventListener('click', () => {
                        this.showAccessoires = !this.showAccessoires;
                        this.updateAccessoiresToggles();
                        this.updateBOM();
                    });
                }
            }
      },
      populateAccessoires: function () {
            const listId = `list_addon_accessoires_${s}`;
            const serieListId = `list_addon_accessoires_serie_${s}`;
            const listEl = document.getElementById(listId);
            const serieListEl = document.getElementById(serieListId);
            if (!listEl || !serieListEl) return;
            
            let candidates = [];
            const allApps = window.productApps || {};
            const keywords = ['badetuchstange', 'schwammhalter', 'eckseifenhalter', 'drahtseifenhalter', 'duschkorb'];
            
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

            const extractAccessoireSerie = (t) => {
                if (t.serie) return t.serie;
                let label = (t.label || '').toLowerCase();
                if (t.manufacturer) {
                    const m = t.manufacturer.toLowerCase();
                    if (label.startsWith(m)) label = label.slice(m.length).trim();
                }
                for (const kw of keywords) {
                    if (label.startsWith(kw)) {
                        label = label.slice(kw.length).trim();
                        break;
                    }
                }
                if (t.manufacturer) {
                    const m = t.manufacturer.toLowerCase();
                    if (label.startsWith(m)) label = label.slice(m.length).trim();
                }
                const match = label.match(/^(.*?)(?:\s+\d+\s*[xX]\s*\d+|\s*,|\s*\(|\s+-|\s+\d+mm|\s+\d+\s*mm)/);
                let serie = match && match[1] ? match[1].trim() : label.trim();
                if (serie.includes(' ')) serie = serie.split(' ')[0];
                return serie ? serie.charAt(0).toUpperCase() + serie.slice(1) : 'Andere';
            };

            // Filters
            const seriesList = ['Alle'];
            candidates.forEach(c => {
                const s = extractAccessoireSerie(c);
                if (!seriesList.includes(s)) seriesList.push(s);
            });
            
            serieListEl.innerHTML = seriesList.map(sx => 
                `<button class="pill-btn ${this.currentAccessoireSerie === sx ? 'active' : ''}" data-val="${sx}">${sx}</button>`
            ).join('');
            
            serieListEl.querySelectorAll('.pill-btn').forEach(b => {
                b.addEventListener('click', () => {
                    this.currentAccessoireSerie = b.dataset.val;
                    this.populateAccessoires();
                });
            });

            let filtered = candidates;
            if (this.currentAccessoireSerie !== 'Alle') {
                filtered = filtered.filter(c => extractAccessoireSerie(c) === this.currentAccessoireSerie);
            }

            listEl.innerHTML = '';
            if (filtered.length === 0) {
                listEl.innerHTML = '<div class="finder-empty-state" style="font-size:0.8rem;">Keine Accessoires gefunden.</div>';
                return;
            }

            filtered.forEach(c => {
                const btn = document.createElement('div');
                const isSelected = this.selectedAddonAccessoires.some(x => x.artNr === c.artNr);
                btn.className = `finder-item ${isSelected ? 'active' : ''}`;
                btn.innerHTML = `
                    <div style="display:flex; align-items:center; gap:0.5rem;">
                        ${c.imgUrl ? `<img src="${c.imgUrl}" style="width:32px; height:32px; object-fit:contain; background:#fff; border-radius:4px; padding:2px; flex-shrink:0;">` : `<div style="width:32px; height:32px; display:flex; align-items:center; justify-content:center; background:var(--bg-surface); border-radius:4px; flex-shrink:0;"><i class="ri-image-line placeholder-icon"></i></div>`}
                        <div>
                            <div style="font-size:0.8rem; font-weight:500; line-height:1.3;">${c.label || c.name}</div>
                            <div style="font-size:0.7rem; color:var(--st-gray); margin-top:0.25rem;">
                                ${c.manufacturer || ''} ${extractAccessoireSerie(c) !== 'Andere' ? '· ' + extractAccessoireSerie(c) : ''}
                            </div>
                        </div>
                    </div>
                    <div style="font-size:0.75rem; color:var(--st-gray); font-family:var(--st-font-mono); margin-top:0.5rem; text-align:right;">${c.artNr}</div>
                `;
                btn.addEventListener('click', () => {
                    if (isSelected) {
                        this.selectedAddonAccessoires = this.selectedAddonAccessoires.filter(x => x.artNr !== c.artNr);
                    } else {
                        this.selectedAddonAccessoires.push({ ...c, qty: 1, origin: 'Zusatzoptionen' });
                    }
                    this.populateAccessoires();
                    this.updateBOM();
                });
                listEl.appendChild(btn);
            });
      },
      
      renderGridInMainPanel: function (filtered) {
            const bomTableBody = document.getElementById("bomTableBody");
            const bomCountCounter = document.getElementById("bomCount");
            if (bomCountCounter) bomCountCounter.textContent = filtered.length + ' Produkte gefunden';
            if (filtered.length === 0) {
                bomTableBody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:#9da3ad; padding:2rem;">Keine Produkte gefunden. Bitte passen Sie die Filter an.</td></tr>';
                return;
            }

            const sortedFiltered = [...filtered].sort((a, b) => String(a.artNr || '').localeCompare(String(b.artNr || '')));
            const cappedFiltered = sortedFiltered.slice(0, 150);

            let cards = cappedFiltered.map(t => {
                return `
                    <div class="result-item-card catalog-preview-card" onclick="window.currentActiveApp.selectItem('${t.id}')" style="display:flex; flex-direction:row; align-items:center; gap:1rem; border:1px solid var(--border); border-radius:8px; padding:1rem; background:var(--bg-surface); cursor:pointer; transition:all 0.2s;" onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 6px 20px rgba(0,0,0,0.2)'" onmouseout="this.style.transform=''; this.style.boxShadow=''">
                        <div class="card-img-wrapper" style="width:70px; height:90px; display:flex; align-items:center; justify-content:center; border-radius:6px; overflow:hidden; background:var(--bg-subtle); flex-shrink:0;">
                            ${(t.imgUrl || getSanitasImgUrl(t.artNr)) ? `<img src="${t.imgUrl || getSanitasImgUrl(t.artNr)}" loading="lazy" style="max-height:100%; max-width:100%; object-fit:contain;">` : '<i class="ri-image-line placeholder-icon" style="font-size:2rem; color:var(--text-secondary);"></i>'}
                        </div>
                        <div class="result-info" style="display:flex; flex-direction:column; flex:1; min-width:0;">
                            <span style="font-size:0.7rem; color:var(--text-secondary); text-transform:uppercase; letter-spacing:0.5px; margin-bottom:2px;">${t.manufacturer || "Marke unbekannt"}</span>
                            <strong style="font-size:0.85rem; line-height:1.3; margin-bottom:4px; color:var(--text-primary); display:-webkit-box; -webkit-line-clamp:3; -webkit-box-orient:vertical; overflow:hidden;">${t.label || t.name || ""}</strong>
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
      filterResults: function () {
        var i;
        const r = document.getElementById(`searchResults_${s}`),
          e = document.getElementById(`resultCount_${s}`),
          t = (
            ((i = document.getElementById(`input_search_${s}`)) == null
              ? void 0
              : i.value) || ""
          ).toLowerCase();
        if (!r) return;
        let n = this.trays;
        
        if (
          (this.currentHersteller !== "all" &&
            (n = n.filter((a) => a.manufacturer === this.currentHersteller)),
          this.currentSerie !== "all" &&
            (n = n.filter((a) => this.extractSerie(a) === this.currentSerie)),
          this.currentMontage !== "all" &&
            (n = n.filter(
              (a) => this.extractMontage(a) === this.currentMontage,
            )),
          t &&
            (n = n.filter((a) => matchesSearchQuery(a, t))),
          (e.textContent = n.length),
          n.length === 0)
        ) {
          r.innerHTML = '<div style="padding:2rem; text-align:center; color:var(--text-secondary);">Keine Produkte gefunden. Bitte passen Sie die Filter an.</div>';
          if (config.enableGalleryUX) {
              if (this.selectedTray) {
                  this.renderConfigurator();
                  this.updateBOM();
              } else {
                  this.renderGridInMainPanel([]);
              }
          }
          return;
        }
        if (this.selectedTray) {
            this.renderConfigurator();
            this.updateBOM();
        } else {
            if (config.enableGalleryUX) {
                this.renderGridInMainPanel(n);
                r.innerHTML = '<div style="padding:1rem; text-align:center; color:var(--text-secondary);">Bitte wählen Sie ein Produkt aus der Hauptansicht.</div>';
                return;
            } else {
                ((r.innerHTML = n
                  .map((a) => {
                    const l = this.selectedTray && this.selectedTray.id === a.id;
                    return `
                        <div class="result-item-card ${l ? "active" : ""}" onclick="window.currentActiveApp.selectItem('${a.id}')" data-tid="${a.id}">
                            <div class="card-img-wrapper">
                                ${a.imgUrl ? `<img src="${a.imgUrl}">` : '<i class="ri-image-line placeholder-icon"></i>'}
                            </div>
                            <div class="result-info">
                                <strong>${this.extractSerie(a)}</strong>
                                <div class="result-meta">
                                    <span>${a.manufacturer || "Andere"}</span> | <span>${this.extractMontage(a)}</span>
                                </div>
                                <span class="finish-artnr">${a.artNr}</span>
                            </div>
                        </div>
                        `;
                  })
                  .join("")),
                  r.querySelectorAll(".result-item-card").forEach((a) => {
                    a.addEventListener("click", () => {
                      this.selectItem(a.dataset.tid);
                    });
                  }));
            }
        }
      },
      selectItem: function (r) {
          if (!r) {
              this.selectedTray = null;
              this.mischerOptionsState = {};
              this.showAccessoires = false;
              this.selectedAddonAccessoires = [];
              if (config.enableGalleryUX) {
                  this.updateBOM();
                  this.filterResults();
                  this.renderConfigurator();
                  this.updateAccessoiresToggles();
              } else {
                  this.clearBOM();
              }
              return;
          }
          if (!r) {
              this.selectedTray = null;
              this.mischerOptionsState = {};
              this.showAccessoires = false;
              this.selectedAddonAccessoires = [];
              if (config.enableGalleryUX) {
                  this.updateBOM();
                  this.filterResults();
                  this.renderConfigurator();
                  this.updateAccessoiresToggles();
              } else {
                  this.clearBOM();
              }
              return;
          }
        ((this.selectedTray = this.trays.find((e) => e.id === r)),
          (this.mischerOptionsState = {}),
          this.selectedTray &&
            this.selectedTray.mountingMaterials &&
            this.selectedTray.mountingMaterials.forEach((e, t) => {
              e.options &&
                e.options.length > 0 &&
                (this.mischerOptionsState[t] = 0);
            }),
          this.filterResults(),
          (this.showAccessoires = false), (this.selectedAddonAccessoires = []), this.updateAccessoiresToggles(), this.populateAccessoires(), this.renderConfigurator(), this.updateBOM());
      },
      isMatVisible: function (r, e) {
        if (!this.selectedTray || !this.selectedTray.mountingMaterials)
          return !0;
        if ((r.name || "").toLowerCase().includes("brausehalter")) {
          const n = this.selectedTray.mountingMaterials.findIndex(
            (a) =>
              (a.name || "").toLowerCase().includes("duschgleitstange") ||
              (a.name || "").toLowerCase().includes("gleitstange"),
          );
          if (n >= 0 && this.mischerOptionsState[n] !== void 0) {
            const a =
              this.selectedTray.mountingMaterials[n].options[
                this.mischerOptionsState[n]
              ];
            if (a && !a.label.toLowerCase().startsWith("ohne")) return !1;
          }
          const i = this.selectedTray.mountingMaterials.findIndex((a) =>
            (a.name || "").toLowerCase().includes("anschlussbogen"),
          );
          if (i >= 0 && this.mischerOptionsState[i] !== void 0) {
            const a =
              this.selectedTray.mountingMaterials[i].options[
                this.mischerOptionsState[i]
              ];
            if (
              (a &&
                a.label
                  .toLowerCase()
                  .includes("mit integriertem brausehalter")) ||
              (a && a.label.toLowerCase().includes("mit brausehalter")) ||
              (a && a.artNr === "bitte_waehlen")
            )
              return !1;
          }
        }
        return !0;
      },
      renderConfigurator: function () {
        const r = document.getElementById(`trayConfigurator_${s}`),
          e = document.getElementById(`trayConfiguratorInner_${s}`);
        if (!this.selectedTray) {
          r && (r.style.display = "none");
          return;
        }
        if ((r && (r.style.display = "block"), !e)) return;
        if (config.enableGalleryUX) {
            r.style.display = "none";
            return;
        }
        e.innerHTML = "";
        const t = this.selectedTray.mountingMaterials || [];
        if (t.length === 0) {
          e.innerHTML =
            '<p class="section-desc">Kein spezifisches Zubehör verfügbar.</p>';
          return;
        }
        (t.forEach((n, i) => {
          if (!this.isMatVisible(n, i)) return;
          const a = document.createElement("div");
          ((a.className = "filter-group"), (a.style.marginBottom = "1.25rem"));
          const l = this.mischerOptionsState[i],
            o = l !== void 0 ? n.options[l] : null,
            y = (o == null ? void 0 : o.imgUrl) || "",
            M = n.options.length > 1;
          ((a.innerHTML = `
                    <label style="display:block; margin-bottom:0.4rem; font-size:0.85rem; color:var(--text-secondary); text-transform:uppercase; letter-spacing:0.5px;">${n.name || "Zubehör"}</label>
                    <div style="display:flex; align-items:center; gap:0.75rem;">
                        <div style="width:40px; height:40px; background:#fff; border-radius:4px; border:1px solid var(--border); display:flex; align-items:center; justify-content:center; padding:2px; flex-shrink:0;">
                            ${y ? `<img src="${y}" style="max-width:100%; max-height:100%; object-fit:contain;">` : '<i class="ri-image-line" style="color:#ddd;"></i>'}
                        </div>
                        <div style="flex:1; position:relative;">
                            <select class="filter-select mischer-acc-select" data-midx="${i}" style="width:100%; padding-right:2rem; ${M ? "" : "pointer-events:none; background-image:none !important;"}">
                                ${n.options
                                  .map(
                                    (v, S) => `
                                    <option value="${S}" ${l == S ? "selected" : ""}>${v.label} (${v.artNr})</option>
                                `,
                                  )
                                  .join("")}
                            </select>
                            ${M ? '<i class="ri-arrow-down-s-line" style="position:absolute; right:10px; top:50%; transform:translateY(-50%); pointer-events:none; color:var(--text-secondary); font-size:1.2rem;"></i>' : ""}
                        </div>
                    </div>
                `),
            e.appendChild(a));
        }),
          e.querySelectorAll(".mischer-acc-select").forEach((n) => {
            n.addEventListener("change", (i) => {
              const a = parseInt(n.dataset.midx),
                l = parseInt(n.value);
              this.mischerOptionsState[a] = l;
              const o = this.selectedTray.mountingMaterials[a],
                y = (o.name || "").toLowerCase(),
                M = o.options[l];
              if (y.includes("gleitstange") || y.includes("duschgleitstange")) {
                const v = this.selectedTray.mountingMaterials.findIndex((S) =>
                  (S.name || "").toLowerCase().includes("brauseschlauch"),
                );
                if (v >= 0) {
                  const S = this.selectedTray.mountingMaterials[v];
                  if (M.label.toLowerCase().startsWith("ohne")) {
                    const _ = S.options.findIndex(
                      (u) =>
                        u.label.includes("1250") || u.label.includes("1.25"),
                    );
                    _ >= 0 && (this.mischerOptionsState[v] = _);
                  } else {
                    const _ = S.options.findIndex((u) =>
                      u.label.includes("1800"),
                    );
                    _ >= 0 && (this.mischerOptionsState[v] = _);
                  }
                }
              }
              ((this.showAccessoires = false), (this.selectedAddonAccessoires = []), this.updateAccessoiresToggles(), this.populateAccessoires(), this.renderConfigurator(), this.updateBOM());
            });
          }));
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
                            if (typeof window.currentActiveApp.selectItem === 'function') {
                                window.currentActiveApp.selectItem(null);
                            } else if (typeof window.currentActiveApp.selectTray === 'function') {
                                window.currentActiveApp.selectTray(null);
                            }
                        }
                    };
                    backBtn.style.display = "inline-flex";
                }
            }
        }
        const r = document.getElementById("bomTableBody"),
          e = document.getElementById("bomCount");
        if (!r) return;
        if (((r.innerHTML = ""), !this.selectedTray)) {
          e && (e.textContent = "0 Artikel");
          return;
        }
        let t = 1;
        ((r.innerHTML += `
                <tr class="bom-main-item">
                    <td><div class="img-cell"><img src="${this.selectedTray.imgUrl || ""}"></div></td>
                    <td><span class="bom-code">${this.selectedTray.artNr}</span></td>
                    <td><div class="bom-desc">${this.selectedTray.label}</div></td>
                    
                    <td><strong>1</strong></td>
                </tr>
            `),
          this.selectedTray.mountingMaterials &&
            this.selectedTray.mountingMaterials.forEach((n, i) => {
              if (!this.isMatVisible(n, i)) return;
              const a = this.mischerOptionsState[i];
              if (a !== void 0) {
                const l = n.options[a];
                const isOhne = l && l.label.toLowerCase().startsWith("ohne");
                
                let isInlineDropdown = config.enableGalleryUX && n.options.length > 1;
                
                if (!isInlineDropdown && isOhne) return;

                let descHTML = `<div class="bom-desc">${l ? l.label : ''}</div>`;
                if (isInlineDropdown) {
                    const optionsHTML = n.options.map((opt, idx) => {
                        const selected = (a === idx) ? 'selected' : '';
                        return `<option value="${idx}" ${selected}>${opt.label} (${opt.artNr})</option>`;
                    }).join('');
                    
                    descHTML = `
                        <div class="bom-desc" style="margin-bottom:0.25rem; font-size:0.75rem; color:var(--text-secondary); text-transform:uppercase;">${n.name || 'Zubehör'}</div>
                        <select class="inline-bom-select" data-midx="${i}" style="width: 100%; padding: 0.5rem; border-radius: 6px; border: 1px solid var(--border); background: var(--bg-surface); color: var(--text-primary); font-size: 0.9rem; margin-bottom: 0.25rem; font-family: inherit; font-weight: 500; cursor: pointer; outline: none; transition: border-color 0.2s ease;">
                            ${optionsHTML}
                        </select>
                    `;
                }

                const o = l ? (l.menge || 1) : 1;
                if (!isOhne) t += o;

                const rowOpacity = isOhne ? 'opacity: 0.6; background: rgba(0,0,0,0.02);' : '';
                const artNrDisplay = isOhne ? '-' : (l ? l.artNr : '');
                const imgDisplay = (l && l.imgUrl) ? `<img src="${l.imgUrl}">` : '<i class="ri-settings-3-line" style="font-size:1.2rem;opacity:0.3;"></i>';

                r.innerHTML += `
                    <tr style="${rowOpacity}">
                        <td><div class="img-cell" ${!(l && l.imgUrl) ? 'style="background: transparent; border: 1px dashed var(--border);"' : ''}>${imgDisplay}</div></td>
                        <td><span class="bom-code">${artNrDisplay}</span></td>
                        <td>${descHTML}</td>
                        <td><strong>${isOhne ? '-' : o}</strong></td>
                    </tr>
                `;
              }
            }),
          (function() {
            if (this.showAccessoires && this.selectedAddonAccessoires && this.selectedAddonAccessoires.length > 0) {
                this.selectedAddonAccessoires.forEach(acc => {
                    t += 1;
                    r.innerHTML += `
                        <tr>
                            <td><div class="img-cell"><img src="${acc.imgUrl || ''}"></div></td>
                            <td><span class="bom-code">${acc.artNr}</span></td>
                            <td><div class="bom-desc">${acc.label || acc.name}</div></td>
                            
                            <td><strong>1</strong></td>
                        </tr>
                    `;
                });
            }
        }).call(this), e && (e.textContent = `${t} Artikel gewählt`));
        if (config.enableGalleryUX) {
            r.querySelectorAll('.inline-bom-select').forEach(sel => {
                sel.addEventListener('change', (ev) => {
                    const midx = parseInt(ev.target.dataset.midx);
                    const newVal = parseInt(ev.target.value);
                    this.mischerOptionsState[midx] = newVal;
                    
                    this.showAccessoires = false;
                    this.selectedAddonAccessoires = [];
                    this.updateAccessoiresToggles();
                    this.populateAccessoires();
                    this.renderConfigurator();
                    this.updateBOM();
                });
            });
        }
      },

      clearBOM: function () {
        ((this.mischerOptionsState = {}), (this.showAccessoires = false), (this.selectedAddonAccessoires = []), this.updateAccessoiresToggles(), this.updateBOM());
      },
      copyToClipboard: window.copyBOMToClipboard,
    };
  }
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
            const filtered = this.trays.filter(t => matchesSearchQuery(t, search));

            const countSpan = document.getElementById(`resultCount_${suffix}`);
            if (countSpan) countSpan.textContent = filtered.length;

            const container = document.getElementById(`searchResults_${suffix}`);
            if (!container) return;

            container.innerHTML = filtered.map(t => `
                <div class="result-item-card ${this.selectedTray?.id === t.id ? 'active' : ''}" onclick="window.currentActiveApp.selectItem('${t.id}')">
                    <div class="card-img-wrapper">
                        ${(t.imgUrl || getSanitasImgUrl(t.artNr)) ? `<img src="${t.imgUrl || getSanitasImgUrl(t.artNr)}">` : '<i class="ri-image-line placeholder-icon"></i>'}
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
                    <td><span class="bom-type">Basis</span></td>
                    <td><strong>1</strong></td>
                </tr>
            `;
            bomCountCounter.textContent = "1 Artikel";
        },
        copyToClipboard: function () {
            if (!this.selectedTray) {
                alert('Bitte wählen Sie zuerst ein Produkt aus.');
                return;
            }
            window.copyTextToClipboard(`${this.selectedTray.artNr}\t1`).then(() => alert('Kopiert:\n\n' + `${this.selectedTray.artNr}    1`)).catch(e => alert("Kopieren fehlgeschlagen."));
        }
    };
}

export function createGlassApp(title, desc, mainImgUrl, config = {}) {
    const appConfig = { enableGalleryUX: true, ...config };
    return {
        title,
        desc,
        mainImgUrl,
        trays: [],
        selectedTray: null,
        includeServices: false,
        currentType: "all",
        currentSituation: "all",
        currentColor: "all",
        currentBand: "all",
        currentGlasart: "all",
        currentOption: "all",
        currentManufacturer: "all",
        currentSeries: "all",
        currentHeight: "all",
        currentWidthBucket: "all",
        currentBreite: "",
        currentLaenge: "",
        
        init: function() {
            this.selectedTray = null;
            this.currentType = "all";
            this.currentSituation = "all";
            this.currentColor = "all";
            this.currentBand = "all";
            this.currentGlasart = "all";
            this.currentOption = "all";
            this.currentManufacturer = "all";
            this.currentSeries = "all";
            this.currentHeight = "all";
            this.currentWidthBucket = "all";
            this.currentBreite = "";
            this.currentLaenge = "";
            this.renderSidebar();
            this.updateBOM();
            if (!appConfig.enableGalleryUX) { this.clearBOM(); }
        },
        
        extractOption: function(m) {
            const s = ((m.label||"")+" "+(m.description||"")).toLowerCase().replace(/\n/g, " ");
            if ((s.includes("zur kombination") && s.includes("seitenwand")) || s.includes("mit seitenwand/in nische")) return "zur Kombination mit Seitenwand";
            if (s.includes("unterputz") || s.match(/\bup\b/) || s.match(/\bup1\b/) || s.match(/\bup2\b/) || s.includes("up-profil") || s.includes("up-wandprofil") || s.includes("up profil")) return "mit Wandprofil Unterputz";
            if (s.includes("aufputz") || s.match(/\bap\b/) || s.match(/\bap1\b/) || s.match(/\bap2\b/) || s.match(/\bap1b\b/) || s.includes("ap-profil") || s.includes("ap-wandprofil") || s.includes("ap profil")) return "mit Wandprofil Aufputz";
            return null;
        },
        
        isAlternaCostaEckeinstieg: function(tray) {
            if (!tray) return false;
            const l = (tray.label || '').toLowerCase();
            if (l.includes('klebeset') || l.includes('montagepauschale') || l.includes('massaufnahme') || l.includes('anfahrtspauschale')) {
                return false;
            }
            return l.includes('alterna') && l.includes('costa') && (l.includes('gleittüre') || l.includes('gleittür')) && l.includes('eckeinstieg');
        },
        
        getParent: function(m) {
            if (!m) return null;
            if (!this.parentMap) {
                this.parentMap = new Map();
                if (this.trays) {
                    for (const parent of this.trays) {
                        if (parent.variants) {
                            for (const variant of parent.variants) {
                                this.parentMap.set(variant.artNr, parent);
                            }
                        }
                    }
                }
            }
            return this.parentMap.get(m.artNr) || null;
        },
        
        getSpec: function(m, cleanKeyPrefix) {
            if (!m || !m.specs) return "";
            const target = cleanKeyPrefix.toLowerCase().replace(/[^a-z]/g, '');
            const foundKey = Object.keys(m.specs).find(k => {
                return k.toLowerCase().replace(/[^a-z]/g, '').includes(target);
            });
            return foundKey ? m.specs[foundKey] || "" : "";
        },

        extractGlasart: function(m) {
            if (m.glasart && m.glasart !== 'Andere') return m.glasart;
            const specAusfuehrung = this.getSpec(m, "ausführung");
            if (specAusfuehrung) return specAusfuehrung;
            const specGlasart = this.getSpec(m, "glasart");
            if (specGlasart) return specGlasart;
            const specMaterial = this.getSpec(m, "material");
            if (specMaterial) return specMaterial;
            return 'Andere';
        },
        
        getVirtualGlasart: function(actual) {
            if (!actual) return 'Standard';
            const norm = actual.trim();
            if (norm === 'Echtglas klar Duschguard') {
                return 'Korrosionsgeschützt';
            }
            if ([
                'Echtglas klar Glasplus',
                'Echtglas klar Plus',
                'Echtglas klar CareTec Pro',
                'Echtglas klar CareTec',
                'Echtglas klar ProCare',
                'Echtglas klar Aquaperl'
            ].includes(norm)) {
                return 'Pflegeleicht (Easy-Clean)';
            }
            return 'Standard';
        },
        
        extractType: function(m) {
            if (m.türvariante && m.türvariante !== 'Andere') return m.türvariante;
            
            const parent = this.getParent(m);
            const labelObj = parent ? parent : m;
            
            const s = (m.label || "").toLowerCase();
            const ps = parent ? (parent.label || "").toLowerCase() : "";
            const desc = (m.description || labelObj.description || "").toLowerCase();
            const specSerie = (this.getSpec(m, "serie") || this.getSpec(labelObj, "serie") || "").toLowerCase();

            const text = `${s} ${ps}`;

            if (text.includes("massaufnahme") || text.includes("anfahrt") || (text.includes("montage") && !text.includes("montage ausschliesslich") && !text.includes("bodenmontage") && !text.includes("wannenmontage")) || text.includes("demontage") || text.includes("nettobetrag") || (text.includes("für wannenmontage") && !text.includes("bodenmontage"))) return null;
            
            // Robust encoding-independent door checks (supporting replacements/umlauts)
            const isPivotOrDreh = text.includes("pivot") || text.includes("drehtür") || text.includes("dreht") || text.includes("dreh-t");
            const isFalt = text.includes("falttür") || text.includes("drehfalttür") || text.includes("faltt") || text.includes("falt-t");
            const isFluegel = text.includes("flügeltür") || text.includes("flügelig") || text.includes("flügel") || text.includes("fluegel");
            const isPendel = text.includes("pendeltür") || text.includes("pendelt") || text.includes("pendel-t");
            const isGleitOrSchiebe = text.includes("gleittür") || text.includes("schiebetür") || text.includes("gleitt") || text.includes("gleit-t") || text.includes("schiebet") || text.includes("schiebe-t");

            // 1. Check if it's a side wall (form is seitenwand or label contains seitenwand)
            const hasSeitenwand = (m.form || labelObj.form || "").toLowerCase() === 'seitenwand' || s.startsWith('seitenwand') || s.includes('seitenwand') || ps.startsWith('seitenwand') || ps.includes('seitenwand');
            if (hasSeitenwand &&
                !s.startsWith('gleit') && !ps.startsWith('gleit') &&
                !s.startsWith('pendel') && !ps.startsWith('pendel') &&
                !s.startsWith('dreh') && !ps.startsWith('dreh') &&
                !s.startsWith('falt') && !ps.startsWith('falt') &&
                !s.startsWith('flügel') && !ps.startsWith('flügel') &&
                !s.startsWith('schiebe') && !ps.startsWith('schiebe') &&
                !s.startsWith('pivot') && !ps.startsWith('pivot') &&
                !s.startsWith('eckeinstieg') && !ps.startsWith('eckeinstieg')) {
                
                // Identify freistehende / walk-in side walls (which are main products)
                const isFreistehend = text.includes("freistehend") || desc.includes("freistehend") || specSerie.includes("freistehend") ||
                                      text.includes("walk-in") || desc.includes("walk-in") || specSerie.includes("walk-in") ||
                                      text.includes("walkin") || desc.includes("walkin") || specSerie.includes("walkin");
                if (isFreistehend) {
                    return "Freistehende Seitenwand";
                }
                // Optional side wall (meant only to be combined) returns null to be hidden from catalog
                return null;
            }

            // 2. Identify doors using robust keywords
            if (isPivotOrDreh) return "Pivot/Drehtüre";
            if (isFalt) return "Falttür";
            if (isFluegel) return "Flügeltür";
            if (isPendel) return "Pendeltür";
            if (isGleitOrSchiebe) return "Schiebetür";

            return null;
        },
        
        extractSituation: function(m) {
            if (!m) return "Eckeinstieg";
            const parent = this.getParent(m);
            const artNr = m.artNr || (parent && parent.artNr) || "";
            const cleanArt = artNr.replace(/\s+/g, "");
            if (/^154322[2-9]/.test(cleanArt)) return "Nische";

            if (m.einbausituation && m.einbausituation !== 'Andere') return m.einbausituation;
            
            const parentObj = parent;
            const labelObj = parent ? parent : m;
            const s = (m.label || "").toLowerCase().replace(/\s+/g, ' ');
            const ps = parent ? (parent.label || "").toLowerCase().replace(/\s+/g, ' ') : "";
            const desc = (m.description || labelObj.description || "").toLowerCase().replace(/\s+/g, ' ');
            const specSerie = (this.getSpec(m, "serie") || this.getSpec(labelObj, "serie") || "").toLowerCase().replace(/\s+/g, ' ');
            
            const text = `${s} ${ps} ${desc} ${specSerie}`;
            if (text.includes("viertelkreis")) return "Viertelkreis";
            if (text.includes("walk-in") || text.includes("walkin") || text.includes("freistehend")) {
                return "Freistehend / Walk-in";
            }
            if (text.includes("nische") || text.includes("in flucht")) return "Nische";
            if (text.includes("eckeinstieg") || text.includes("eck")) return "Eckeinstieg";
            return "Eckeinstieg";
        },
        
        extractBand: function(m) {
            if (!m) return "Universal";
            
            const parent = this.getParent(m);
            const labelObj = parent ? parent : m;
            
            const l = (m.label || "").toLowerCase();
            const pl = parent ? (parent.label || "").toLowerCase() : "";
            const d = (m.description || labelObj.description || "").toLowerCase();
            const specAuspraegung = (this.getSpec(m, "ausprägung") || this.getSpec(labelObj, "ausprägung") || "").toLowerCase();
            
            const text = `${l} ${pl} ${d} ${specAuspraegung}`;

            // Check if explicitly universal
            if (text.includes("links oder rechts") || text.includes("rechts oder links") || text.includes("links/rechts") || text.includes("rechts/links") || text.includes("universal")) {
                return "Universal";
            }

            // 1. Explicit hinge/position checks
            if (text.includes("band links") || text.includes("linksband") || text.includes("anschlag links") || text.includes("linksanschlag") || text.includes("anschlag l")) return "links";
            if (text.includes("band rechts") || text.includes("rechtsband") || text.includes("anschlag rechts") || text.includes("rechtsanschlag") || text.includes("anschlag r")) return "rechts";

            // Check variant consensus if parent text is neutral
            if (!parent && m.variants && m.variants.length > 0) {
                let linksCount = 0;
                let rechtsCount = 0;
                for (let v of m.variants) {
                    const vl = (v.label || "").toLowerCase();
                    if (vl.includes("band links") || vl.includes("linksband") || vl.includes("anschlag links") || vl.includes("linksanschlag") || vl.includes("anschlag l") || vl.includes("seitenwand links") || vl.includes("festteil links") || vl.includes(" links") || vl.includes(", links") || vl.includes("/links")) linksCount++;
                    if (vl.includes("band rechts") || vl.includes("rechtsband") || vl.includes("anschlag rechts") || vl.includes("rechtsanschlag") || vl.includes("anschlag r") || vl.includes("seitenwand rechts") || vl.includes("festteil rechts") || vl.includes(" rechts") || vl.includes(", rechts") || vl.includes("/rechts")) rechtsCount++;
                }
                if (linksCount > 0 && rechtsCount === 0) return "links";
                if (rechtsCount > 0 && linksCount === 0) return "rechts";
            }

            // 2. Specific side wall positions or fixed element positions
            if (text.includes("seitenwand links") || text.includes("festteil links")) return "links";
            if (text.includes("seitenwand rechts") || text.includes("festteil rechts")) return "rechts";

            // 3. Fallback on specs Ausprägung
            if (specAuspraegung.includes("links") || specAuspraegung === "l") return "links";
            if (specAuspraegung.includes("rechts") || specAuspraegung === "r") return "rechts";

            // 4. Simple fallback keywords in label
            if (l.includes(" links") || l.includes(", links") || l.includes("/links") || pl.includes(" links") || pl.includes(", links") || pl.includes("/links")) return "links";
            if (l.includes(" rechts") || l.includes(", rechts") || l.includes("/rechts") || pl.includes(" rechts") || pl.includes(", rechts") || pl.includes("/rechts")) return "rechts";

            return "Universal";
        },
        
        extractColor: function(m) {
            if (m.farbe && m.farbe !== 'Andere' && m.farbe !== 'Standard') return m.farbe;
            const s = (m.label || "").toLowerCase();
            const art = (m.artNr || "").toLowerCase();
            if (art.includes(".350.") || s.includes("schwarz")) return "Schwarz";
            if (art.includes(".100.") || s.includes("weiss") || s.includes("weiß")) return "Weiss";
            if (art.includes(".501.") || s.includes("chrom") || s.includes("silber")) return "Chrom";
            if (s.includes("finox")) return "Finox";
            if (s.includes("matt")) return "Matt";
            
            // fallback to parent color
            const parent = this.getParent(m);
            if (parent && parent.artNr !== m.artNr) {
                const parentColor = this.extractColor(parent);
                if (parentColor && parentColor !== 'Standard') return parentColor;
            }
            
            return "Standard";
        },
        
        extractSizeScore: function(m) {
            const cleanLabel = (m.label || "").toLowerCase().replace((m.artNr || "").toLowerCase(), "").replace(/\b[a-zA-Z]-?\d+\b/g, "").trim();
            const nums = (cleanLabel.match(/\d+([\.,]\d+)?/g) || []).map(n => Number(n.replace(",", "."))).filter(n => n > 20).map(n => n > 250 ? n / 10 : n).filter(n => n < 195);
            return nums[0] || 9999;
        },
        
        checkCompatibility: function(m, s, r) {
            const e = (m.label || "").toLowerCase().replace(/\b[a-zA-Z]-?\d+\b/g, "");
            const i = (e.replace((m.artNr || "").toLowerCase(), "").trim().match(/\d+([\.,]\d+)?/g) || []).map(l => Number(l.replace(",", "."))).filter(l => l > 20).map(l => l > 250 ? l / 10 : l).filter(l => l < 195);
            if (i.length === 0) return true;
            const a = [];
            if (s) a.push(s > 250 ? s / 10 : s);
            if (r) a.push(r > 250 ? r / 10 : r);
            return a.every((l, o) => {
                const y = i[o] || i[0];
                if (i.length >= 2 && !e.includes(" x ")) {
                    const S = Math.min(...i), _ = Math.max(...i);
                    return l >= S && l <= _;
                }
                if (e.includes(" x ") && i.length >= 2) return l <= (i[o] || i[0]);
                if (e.includes("breite bis") || (e.includes("bis") && !e.includes("höhe bis"))) return l <= y;
                if (e.includes("breite ab") || (e.includes("ab") && !e.includes("höhe ab"))) return l >= y;
                return Math.abs(l - y) < 5;
            });
        },
        
        renderSidebar: function() {
            const N = this.title.replace(/\s+/g, "").toLowerCase();
            const B = this.title.toUpperCase();
            const Ae = document.getElementById("configSidebar");
            if (!Ae) return;
            
            const m = [...new Set(this.trays.map(n => this.extractSituation(n)))].filter(Boolean).sort();
            const s = [...new Set(this.trays.map(n => this.extractType(n)))].filter(Boolean).sort();
            const r = [...new Set(this.trays.flatMap(n => [this.extractColor(n), ...(n.variants || []).map(v => this.extractColor(v))]))].filter(Boolean).sort();
            const e = [...new Set(this.trays.map(n => this.extractBand(n)))].filter(Boolean).sort();
            const opts = [...new Set(this.trays.map(n => this.extractOption(n)))].filter(Boolean).sort();
            const rawGlassTypes = [...new Set(this.trays.flatMap(n => [this.extractGlasart(n), ...(n.variants || []).map(v => this.extractGlasart(v))]))].filter(Boolean);
            const availableVirtual = new Set(rawGlassTypes.map(g => this.getVirtualGlasart(g)));
            const glassTypes = ['Standard', 'Pflegeleicht (Easy-Clean)', 'Korrosionsgeschützt'].filter(g => availableVirtual.has(g));
            const manufacturers = [...new Set(this.trays.map(n => n.manufacturer).filter(n => n && n !== 'Andere'))].sort();
            
            const seriesList = [...new Set(this.trays.map(n => this.extractSeries(n)))].filter(Boolean);
            seriesList.sort((a, b) => a === 'Andere' ? 1 : b === 'Andere' ? -1 : a.localeCompare(b));

            const widthList = ["75 cm", "80 cm", "90 cm", "100 cm", "120 cm", "140 cm", "160 cm", "180+ cm"];
            const heightList = ["190 cm", "200 cm", "210 cm", "220 cm", "Andere"];

            const searchResultsHTML = appConfig.enableGalleryUX ? '' : `
                <div class="sidebar-section">
                    <h2>Ergebnisse <span id="resultCount_${N}" class="badge">0</span></h2>
                    <div id="searchResults_${N}" class="search-results-container"></div>
                </div>
            `;
            
            Ae.innerHTML = `
                <div class="sidebar-section">
                    <div style="border-bottom: 1px solid var(--border); padding-bottom: 1rem; margin-bottom: 1rem;">
                        <button class="pill-btn highlight-btn" onclick="window.currentActiveApp.resetAllFilters();" style="width:100%; display:flex; justify-content:center; gap:0.5rem; align-items:center; background:var(--accent); color:#fff; border:none; padding:0.65rem; border-radius:6px; font-weight:600; cursor:pointer; font-family:inherit; transition:opacity 0.2s;" onmouseover="this.style.opacity='0.9'" onmouseout="this.style.opacity='1'">
                            <i class="ri-refresh-line"></i> Alle Filter zurücksetzen
                        </button>
                    </div>

                    <h2>Filter: ${B}</h2>
                    
                    <div class="filter-group" style="margin-top:0.75rem; ${manufacturers.length === 0 ? 'display:none;' : ''}">
                        <label>Hersteller</label>
                        <div class="pill-group">
                            <button class="pill-btn ${this.currentManufacturer === "all" ? "active" : ""}" onclick="window.currentActiveApp.setFilter('Manufacturer', 'all')">Alle <span class="badge" style="font-size:0.7rem; opacity:0.6; margin-left:4px;">${this.getFilteredCount('Manufacturer', 'all')}</span></button>
                            ${manufacturers.map(n => `<button class="pill-btn ${this.currentManufacturer === n ? "active" : ""}" onclick="window.currentActiveApp.setFilter('Manufacturer', '${n}')">${n} <span class="badge" style="font-size:0.7rem; opacity:0.6; margin-left:4px;">${this.getFilteredCount('Manufacturer', n)}</span></button>`).join("")}
                        </div>
                    </div>

                    <div class="filter-group" style="margin-top:0.75rem; ${seriesList.length === 0 ? 'display:none;' : ''}">
                        <label>Modellreihe</label>
                        <div class="pill-group">
                            <button class="pill-btn ${this.currentSeries === "all" ? "active" : ""}" onclick="window.currentActiveApp.setFilter('Series', 'all')">Alle <span class="badge" style="font-size:0.7rem; opacity:0.6; margin-left:4px;">${this.getFilteredCount('Series', 'all')}</span></button>
                            ${seriesList.map(n => `<button class="pill-btn ${this.currentSeries === n ? "active" : ""}" onclick="window.currentActiveApp.setFilter('Series', '${n}')">${n} <span class="badge" style="font-size:0.7rem; opacity:0.6; margin-left:4px;">${this.getFilteredCount('Series', n)}</span></button>`).join("")}
                        </div>
                    </div>

                    <div class="filter-group" style="margin-top:0.75rem;">
                        <label>Einbausituation</label>
                        <div class="pill-group" id="pill_situation_${N}">
                            <button class="pill-btn ${this.currentSituation === "all" ? "active" : ""}" onclick="window.currentActiveApp.setFilter('Situation', 'all')">Alle <span class="badge" style="font-size:0.7rem; opacity:0.6; margin-left:4px;">${this.getFilteredCount('Situation', 'all')}</span></button>
                            ${m.map(n => `<button class="pill-btn ${this.currentSituation === n ? "active" : ""}" onclick="window.currentActiveApp.setFilter('Situation', '${n}')">${n} <span class="badge" style="font-size:0.7rem; opacity:0.6; margin-left:4px;">${this.getFilteredCount('Situation', n)}</span></button>`).join("")}
                        </div>
                    </div>

                    <div class="filter-group" style="margin-top:0.75rem;">
                        <label>Türvariante</label>
                        <div class="pill-group" id="pill_type_${N}">
                            <button class="pill-btn ${this.currentType === "all" ? "active" : ""}" onclick="window.currentActiveApp.setFilter('Type', 'all')">Alle <span class="badge" style="font-size:0.7rem; opacity:0.6; margin-left:4px;">${this.getFilteredCount('Type', 'all')}</span></button>
                            ${s.map(n => `<button class="pill-btn ${this.currentType === n ? "active" : ""}" onclick="window.currentActiveApp.setFilter('Type', '${n}')">${n} <span class="badge" style="font-size:0.7rem; opacity:0.6; margin-left:4px;">${this.getFilteredCount('Type', n)}</span></button>`).join("")}
                        </div>
                    </div>
                    
                    <div class="filter-group" style="margin-top:0.75rem; ${opts.length === 0 ? 'display:none;' : ''}">
                        <label>Optionen</label>
                        <div class="pill-group" id="pill_option_${N}">
                            <button class="pill-btn ${this.currentOption === "all" ? "active" : ""}" onclick="window.currentActiveApp.setFilter('Option', 'all')">Alle <span class="badge" style="font-size:0.7rem; opacity:0.6; margin-left:4px;">${this.getFilteredCount('Option', 'all')}</span></button>
                            ${opts.map(n => `<button class="pill-btn ${this.currentOption === n ? "active" : ""}" onclick="window.currentActiveApp.setFilter('Option', '${n}')">${n} <span class="badge" style="font-size:0.7rem; opacity:0.6; margin-left:4px;">${this.getFilteredCount('Option', n)}</span></button>`).join("")}
                        </div>
                    </div>

                    <div class="filter-group" style="margin-top:0.75rem;">
                        <label>Breite (Standard)</label>
                        <div class="pill-group">
                            <button class="pill-btn ${this.currentWidthBucket === "all" ? "active" : ""}" onclick="window.currentActiveApp.setFilter('WidthBucket', 'all')">Alle <span class="badge" style="font-size:0.7rem; opacity:0.6; margin-left:4px;">${this.getFilteredCount('WidthBucket', 'all')}</span></button>
                            ${widthList.map(n => `<button class="pill-btn ${this.currentWidthBucket === n ? "active" : ""}" onclick="window.currentActiveApp.setFilter('WidthBucket', '${n}')">${n} <span class="badge" style="font-size:0.7rem; opacity:0.6; margin-left:4px;">${this.getFilteredCount('WidthBucket', n)}</span></button>`).join("")}
                        </div>
                    </div>

                    <div class="filter-group" style="margin-top:0.75rem;">
                        <label>Höhe</label>
                        <div class="pill-group">
                            <button class="pill-btn ${this.currentHeight === "all" ? "active" : ""}" onclick="window.currentActiveApp.setFilter('Height', 'all')">Alle <span class="badge" style="font-size:0.7rem; opacity:0.6; margin-left:4px;">${this.getFilteredCount('Height', 'all')}</span></button>
                            ${heightList.map(n => `<button class="pill-btn ${this.currentHeight === n ? "active" : ""}" onclick="window.currentActiveApp.setFilter('Height', '${n}')">${n} <span class="badge" style="font-size:0.7rem; opacity:0.6; margin-left:4px;">${this.getFilteredCount('Height', n)}</span></button>`).join("")}
                        </div>
                    </div>

                    <div class="filter-group" style="margin-top:0.75rem;">
                        <label>Farbe</label>
                        <div class="pill-group">
                            <button class="pill-btn ${this.currentColor === "all" ? "active" : ""}" onclick="window.currentActiveApp.setFilter('Color', 'all')">Alle <span class="badge" style="font-size:0.7rem; opacity:0.6; margin-left:4px;">${this.getFilteredCount('Color', 'all')}</span></button>
                            ${r.map(n => `<button class="pill-btn ${this.currentColor === n ? "active" : ""}" onclick="window.currentActiveApp.setFilter('Color', '${n}')">${n} <span class="badge" style="font-size:0.7rem; opacity:0.6; margin-left:4px;">${this.getFilteredCount('Color', n)}</span></button>`).join("")}
                        </div>
                    </div>

                    <div class="filter-group" style="margin-top:0.75rem;">
                        <label>Band</label>
                        <div class="pill-group">
                            <button class="pill-btn ${this.currentBand === "all" ? "active" : ""}" onclick="window.currentActiveApp.setFilter('Band', 'all')">Alle <span class="badge" style="font-size:0.7rem; opacity:0.6; margin-left:4px;">${this.getFilteredCount('Band', 'all')}</span></button>
                            ${e.map(n => `<button class="pill-btn ${this.currentBand === n ? "active" : ""}" onclick="window.currentActiveApp.setFilter('Band', '${n}')">${n} <span class="badge" style="font-size:0.7rem; opacity:0.6; margin-left:4px;">${this.getFilteredCount('Band', n)}</span></button>`).join("")}
                        </div>
                    </div>
                    
                    <div class="filter-group" style="margin-top:0.75rem; ${glassTypes.length === 0 ? 'display:none;' : ''}">
                        <label>Glasart</label>
                        <div class="pill-group">
                            <button class="pill-btn ${this.currentGlasart === "all" ? "active" : ""}" onclick="window.currentActiveApp.setFilter('Glasart', 'all')">Alle <span class="badge" style="font-size:0.7rem; opacity:0.6; margin-left:4px;">${this.getFilteredCount('Glasart', 'all')}</span></button>
                            ${glassTypes.map(n => `<button class="pill-btn ${this.currentGlasart === n ? "active" : ""}" onclick="window.currentActiveApp.setFilter('Glasart', '${n}')">${n} <span class="badge" style="font-size:0.7rem; opacity:0.6; margin-left:4px;">${this.getFilteredCount('Glasart', n)}</span></button>`).join("")}
                        </div>
                    </div>

                    <div class="filter-group" style="margin-top:1rem;">
                        <label>Manuelle Grösse (mm)</label>
                        <div style="display:flex; gap:0.5rem;">
                            <input type="number" id="input_breite_${N}" class="filter-select" placeholder="Breite" value="${this.currentBreite}">
                            <input type="number" id="input_laenge_${N}" class="filter-select" placeholder="Länge" value="${this.currentLaenge}">
                        </div>
                    </div>

                    <div class="filter-group" style="margin-top:1rem;">
                        <label>Suche</label>
                        <input type="text" id="input_search_${N}" class="filter-select" placeholder="Art.Nr. oder Name...">
                    </div>
                </div>
                <div class="sidebar-section" id="trayConfigurator_${N}" style="display:none; margin-top:2rem;">
                    <h2>Konfiguration</h2>
                    <p class="section-desc">Wählen Sie das passende Zubehör.</p>
                    <div id="trayConfiguratorInner_${N}"></div>
                </div>
                ${searchResultsHTML}
            `;
            
            document.getElementById(`input_search_${N}`).addEventListener("input", () => this.filterResults());
            document.getElementById(`input_breite_${N}`).addEventListener("input", n => { this.currentBreite = n.target.value; this.filterResults() });
            document.getElementById(`input_laenge_${N}`).addEventListener("input", n => { this.currentLaenge = n.target.value; this.filterResults() });
            this.filterResults();
        },
        
        setFilter: function(m, s) {
            this[`current${m}`] = s;
            this.renderSidebar();
            this.filterResults();
        },
        
        filterResults: function() {
            const N = this.title.replace(/\s+/g, "").toLowerCase();
            var a;
            const m = (((a = document.getElementById(`input_search_${N}`)) == null ? void 0 : a.value) || "").toLowerCase();
            const s = parseFloat(this.currentBreite);
            const r = parseFloat(this.currentLaenge);
            const e = this.trays.filter(l => {
                const o = (l.label || "").toLowerCase();
                return !(
                    o.includes("massaufnahme") || o.includes("anfahrt") || (o.includes("badewanne") && !o.includes("duschwanne")) || 
                    (this.extractType(l) === null && !m) || 
                    (this.currentManufacturer !== "all" && (l.manufacturer || "") !== this.currentManufacturer) ||
                    (this.currentType !== "all" && this.extractType(l) !== this.currentType) || 
                    (this.currentSituation !== "all" && this.extractSituation(l) !== this.currentSituation) || 
                    (this.currentColor !== "all" && this.extractColor(l) !== this.currentColor && !(l.variants || []).some(v => this.extractColor(v) === this.currentColor)) || 
                    (this.currentBand !== "all" && this.extractBand(l) !== this.currentBand) || 
                    (this.currentOption !== "all" && this.extractOption(l) !== this.currentOption) || 
                    (this.currentGlasart !== "all" && this.getVirtualGlasart(this.extractGlasart(l)) !== this.currentGlasart && !(l.variants || []).some(v => this.getVirtualGlasart(this.extractGlasart(v)) === this.currentGlasart)) || 
                    (this.currentSeries !== "all" && this.extractSeries(l) !== this.currentSeries) ||
                    (this.currentHeight !== "all" && this.extractHeightCm(l) !== this.currentHeight) ||
                    (this.currentWidthBucket !== "all" && this.getWidthBucket(l) !== this.currentWidthBucket) ||
                    ((this.currentBreite || this.currentLaenge) && !this.checkCompatibility(l, s, r)) || 
                    (m && !matchesSearchQuery(l, m))
                );
            });
            let t = e;
            if (this.currentBreite || this.currentLaenge) {
                t = e.sort((a, b) => this.extractSizeScore(a) - this.extractSizeScore(b));
            }
            const n = document.getElementById(`resultCount_${N}`);
            if (n) n.textContent = t.length;
 
            if (this.selectedTray) {
                this.updateBOM();
            } else {
                if (appConfig.enableGalleryUX) {
                    this.renderGridInMainPanel(t);
                } else {
                    const i = document.getElementById(`searchResults_${N}`);
                    if (i) {
                        i.innerHTML = t.map(l => {
                            const variant = this.getMatchedVariant(l);
                            const cleanLabel = this.reconstructDescription(l, variant);
                            return `
                            <div class="result-card ${this.selectedTray && this.selectedTray.artNr === l.artNr ? "selected" : ""}" onclick="window.currentActiveApp.selectTray('${l.artNr}')">
                                <img src="${variant.imgUrl || this.mainImgUrl}" alt="${cleanLabel}">
                                <div class="result-info">
                                    <div class="result-brand">${variant.manufacturer || ""}</div>
                                    <div class="result-title">${cleanLabel}</div>
                                    <div class="result-meta">
                                        ${variant.artNr ? `<span>${variant.artNr}</span>` : ""}
                                    </div>
                                </div>
                            </div>
                        `}).join("");
                    }
                }
            }
        },

        renderGridInMainPanel: function (filtered) {
            bomCountCounter.textContent = filtered.length + ' Produkte gefunden';
            if (filtered.length === 0) {
                bomTableBody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:#9da3ad; padding:2rem;">Keine Produkte gefunden. Bitte passen Sie die Filter an.</td></tr>';
                return;
            }
            const capped = filtered.slice(0, 150);
            let cards = capped.map(t => {
                const variant = this.getMatchedVariant(t);
                
                let suffixParts = [];
                if (variant) {
                    if (variant.farbe && variant.farbe !== "Standard" && variant.farbe !== "Andere") {
                        suffixParts.push(variant.farbe);
                    }
                    if (variant.glasart && variant.glasart !== "Standard" && variant.glasart !== "Andere") {
                        suffixParts.push(variant.glasart);
                    }
                }
                let displayLabel = t.label || "";
                if (suffixParts.length > 0) {
                    displayLabel += ", " + suffixParts.join(", ");
                }

                return `
                    <div class="result-item-card catalog-preview-card" onclick="window.currentActiveApp.selectTray('${t.artNr}')" style="display:flex; flex-direction:row; align-items:center; gap:1rem; border:1px solid var(--border); border-radius:8px; padding:1rem; background:var(--bg-surface); cursor:pointer; transition:all 0.2s;" onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 6px 20px rgba(0,0,0,0.2)'" onmouseout="this.style.transform=''; this.style.boxShadow=''">
                        <div class="card-img-wrapper" style="width:70px; height:90px; display:flex; align-items:center; justify-content:center; border-radius:6px; overflow:hidden; background:var(--bg-subtle); flex-shrink:0;">
                            ${(variant.imgUrl || this.mainImgUrl) ? `<img src="${variant.imgUrl || this.mainImgUrl}" loading="lazy" style="max-height:100%; max-width:100%; object-fit:contain;">` : '<i class="ri-image-line placeholder-icon" style="font-size:2rem; color:var(--text-secondary);"></i>'}
                        </div>
                        <div class="result-info" style="display:flex; flex-direction:column; flex:1; min-width:0;">
                            <span style="font-size:0.7rem; color:var(--text-secondary); text-transform:uppercase; letter-spacing:0.5px; margin-bottom:2px;">${variant.manufacturer || "Marke unbekannt"}</span>
                            <strong style="font-size:0.85rem; line-height:1.3; margin-bottom:4px; color:var(--text-primary); display:-webkit-box; -webkit-line-clamp:3; -webkit-box-orient:vertical; overflow:hidden;">${displayLabel}</strong>
                            <div style="font-size:0.75rem; color:var(--text-secondary);">${variant.size || ""}</div>
                            <span class="finish-artnr" style="margin-top:6px; font-size:0.8rem;">${variant.artNr}</span>
                        </div>
                    </div>
                `;
            }).join('');
            if (filtered.length > 150) {
                cards += `<div style="grid-column:1/-1; padding:2rem; text-align:center; color:var(--text-secondary); font-size:0.95rem;">Es gibt ${filtered.length - 150} weitere Ergebnisse. Bitte passen Sie Ihre Filter an, um diese zu sehen.</div>`;
            }
            bomTableBody.innerHTML = '<tr><td colspan="5" style="padding:0; border:none; background:transparent;"><div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(320px, 1fr)); gap:12px; padding:12px; background:var(--bg-body); border-radius:8px;">' + cards + '</div></td></tr>';
        },
        
        getMatchedVariant: function(tray) {
            if (!tray || !tray.variants || tray.variants.length === 0) return tray;
            const matched = tray.variants.find(v => {
                const matchesColor = this.currentColor === "all" || this.extractColor(v) === this.currentColor;
                const matchesGlas = this.currentGlasart === "all" || this.getVirtualGlasart(this.extractGlasart(v)) === this.currentGlasart;
                return matchesColor && matchesGlas;
            });
            if (matched) return { ...tray, ...matched };
            
            const matchedGlas = tray.variants.find(v => this.currentGlasart === "all" || this.getVirtualGlasart(this.extractGlasart(v)) === this.currentGlasart);
            if (matchedGlas) return { ...tray, ...matchedGlas };
            
            const matchedColor = tray.variants.find(v => this.currentColor === "all" || this.extractColor(v) === this.currentColor);
            if (matchedColor) return { ...tray, ...matchedColor };
            
            return tray;
        },

        selectTray: function(m) {
            if (!m) {
                this.selectedTray = null;
                this.filterResults();
                const N = this.title.replace(/\s+/g, "").toLowerCase();
                const configBlock = document.getElementById(`trayConfigurator_${N}`);
                if (configBlock) configBlock.style.display = "none";
                return;
            }
            this.selectedTray = this.trays.find(s => s.artNr === m);
            this.selectedTray.selections = this.selectedTray.selections || {};
            
            const hasSideWall = this.checkSideWallSupport(this.selectedTray);
            if (hasSideWall) {
                const sameSeriesSideWalls = this.getMatchingSideWalls(this.selectedTray);
                if (sameSeriesSideWalls.length > 0) {
                    const isMust = this.checkIsMustSideWall(this.selectedTray);
                    if (isMust) {
                        this.selectedTray.selections.__seitenwand__ = sameSeriesSideWalls[0].artNr;
                    } else {
                        this.selectedTray.selections.__seitenwand__ = "none";
                    }
                }
            }
            
            this.renderSidebar();
            this.updateBOM();
        },

        isAlternaOrDuscholuxCombination: function(tray) {
            if (!tray) return false;
            const m = (tray.manufacturer || '').toLowerCase();
            if (m !== 'alterna' && m !== 'duscholux') return false;

            const l = (tray.label || '').toLowerCase();
            const d = (tray.description || '').toLowerCase();
            const text = (l + ' ' + d).replace(/\s+/g, ' ');
            const normalizedText = text.replace(/\s*\/\s*/g, '/');

            return (
                normalizedText.includes('zur kombination') || 
                normalizedText.includes('kombination mit') || 
                normalizedText.includes('für seitenwand') || 
                normalizedText.includes('fuer seitenwand') || 
                normalizedText.includes('zu seitenwände') || 
                normalizedText.includes('zu seitenwand') || 
                normalizedText.includes('zu seitenwänden') ||
                normalizedText.includes('oder mit seitenwand') ||
                normalizedText.includes('oder seitenwand') ||
                normalizedText.includes('in nische/mit seitenwand') || 
                normalizedText.includes('mit seitenwand/in nische') ||
                normalizedText.includes('in nische/mit einer seitenwand') ||
                normalizedText.includes('mit einer seitenwand/in nische') ||
                normalizedText.includes('nische/seitenwand') ||
                normalizedText.includes('seitenwand/nische')
            );
        },

        isAlternaOrDuscholuxSideWallIncluded: function(tray) {
            if (!tray) return false;
            const m = (tray.manufacturer || '').toLowerCase();
            if (m !== 'alterna' && m !== 'duscholux') return false;

            const l = (tray.label || '').toLowerCase();
            const d = (tray.description || '').toLowerCase();
            const text = (l + ' ' + d).replace(/\s+/g, ' ');
            const normalizedText = text.replace(/\s*\/\s*/g, '/');

            if (!normalizedText.includes('seitenwand')) return false;
            if (this.isAlternaOrDuscholuxCombination(tray)) return false;

            return (
                normalizedText.includes('mit seitenwand') || 
                normalizedText.includes('mit einer seitenwand') || 
                normalizedText.includes('und seitenwand') || 
                normalizedText.includes('seitenwand und') ||
                normalizedText.includes('seitenwand,')
            );
        },

        checkSideWallSupport: function(tray) {
            if (!tray) return false;
            if (this.isAlternaCostaEckeinstieg(tray)) return true;
            const cleanArt = (tray.artNr || "").replace(/\s+/g, "");
            if (/^154322[2-9]/.test(cleanArt)) return false;
            if (this.extractSituation(tray) === "Freistehend / Walk-in") return false;
            const l = (tray.label || '').trim();
            const lower = l.toLowerCase().replace(/\s+/g, ' ');
            const d = (tray.description || '').toLowerCase().replace(/\s+/g, ' ');
            
            // Exclude services, accessories, and side walls themselves
            const isMainProduct = !lower.includes('massaufnahme') && !lower.includes('montagepauschale') && !lower.includes('anfahrtspauschale') &&
                                  !lower.includes('klebeset') && !lower.includes('stabilisationsstrebe') && !lower.includes('wandanschlussprofil') &&
                                  !lower.includes('handtuchhalter') && !lower.includes('verbreiterungsprofil') &&
                                  !lower.startsWith('seitenwand') && !lower.startsWith('freistehende seitenwand') && !lower.startsWith('freistehend');
            if (!isMainProduct) return false;

            const m = (tray.manufacturer || '').toLowerCase();
            if (m === 'alterna' || m === 'duscholux') {
                return this.isAlternaOrDuscholuxCombination(tray);
            }

            const isLivaNischeExclusion = this.extractSeries(tray) === "Liva" && (lower.includes("in nische") || d.includes("in nische"));
            if (isLivaNischeExclusion) return false;

            // Complete corner entry enclosures and other specific layouts do not get side walls
            const isCornerEntry = lower.startsWith('eckeinstieg') || lower.startsWith('viertelkreis') || lower.startsWith('fünfeck') || lower.startsWith('fuenfeck');
            if (isCornerEntry) return false;

            // Niche-only doors do not support side walls
            let hasNischeExclusion = lower.includes('nur für nische') || lower.includes('nur für eine nische') || lower.includes('nur nische') || d.includes('nur für nische') ||
                lower.includes('vormauerung') || d.includes('vormauerung');

            if (lower.includes('in flucht') || d.includes('in flucht')) {
                // If it contains "in flucht", it is niche-only unless a side-wall mounting cost is available in its services
                const hasSideWallService = (tray.services || []).some(s => {
                    const sText = ((s.label || "") + " " + (s.description || "")).toLowerCase();
                    return sText.includes("seitenwand") && (sText.includes("bis") || sText.includes("ab"));
                });
                if (!hasSideWallService) {
                    hasNischeExclusion = true;
                }
            }
            
            if (hasNischeExclusion) {
                return false;
            }

            // Products starting with door keywords can be combined with side walls if they have matching side wall products
            const startsWithDoorKeyword = l.startsWith('Pendeltüre') || l.startsWith('Schiebetüre') || l.startsWith('Drehtüre') || 
                                          l.startsWith('Drehfalttür') || l.startsWith('Drehfalttüre') || l.startsWith('Gleittüre') || 
                                          l.startsWith('Falttüre') || l.startsWith('Faltwand') || l.startsWith('Pendeltür') || 
                                          l.startsWith('Drehtür') || l.startsWith('Schiebetür') || l.startsWith('Gleittür') ||
                                          l.startsWith('Gleitfalttüre') || l.startsWith('Flügeltüre') || l.startsWith('Flügeltür');

            if (startsWithDoorKeyword) {
                return this.getMatchingSideWalls(tray).length > 0;
            }

            // Fallback for any other custom door styles if matching side walls exist
            return this.getMatchingSideWalls(tray).length > 0;
        },
        
        checkIsMustSideWall: function(tray) {
            if (!tray) return false;
            if (this.isAlternaCostaEckeinstieg(tray)) return true;
            const l = (tray.label || '').toLowerCase();
            const d = (tray.description || '').toLowerCase();
            const text = l + ' ' + d;
            const hasNische = text.includes('nische') || text.includes('wandanschlag');
            const hasSeitenwand = text.includes('mit seitenwand') || text.includes('für seitenwand') || text.includes('fuer seitenwand') || text.includes('zur kombination mit seitenwand') || text.includes('zur kombination mit einer seitenwand');
            return (
                (!hasNische && hasSeitenwand) ||
                tray.form === 'mit Seitenwand' ||
                (tray.manufacturer === 'Duscholux' && tray.form === 'Quadratisch' && text.includes('mit seitenwand')) ||
                (tray.manufacturer === 'Koralle' && text.includes('für kombination mit seitenwand'))
            );
        },

        extractSeries: function(r) {
            const s = (r.label || "").toLowerCase();
            if (
              s.includes("massaufnahme") ||
              s.includes("anfahrtspauschale") ||
              s.includes("montagepauschale") ||
              s.includes("demontage") ||
              s.includes("nettobetrag")
            )
              return null;
            if (s.includes("alterna ")) {
              const n = s.match(/alterna\s+([a-z0-9\.]+)/);
              if (n && n[1]) {
                let m = n[1];
                m = m.charAt(0).toUpperCase() + m.slice(1);
                return (m === "Lin3" || m === "Lin.3" ? "Lin.3" : m);
              }
            }
            return s.includes("viva")
              ? "Viva"
              : s.includes("collection")
                ? "Collection"
                : s.includes("air")
                  ? "Air"
                  : s.includes("bella vita")
                    ? "Bella Vita"
                    : s.includes("optima")
                      ? "Optima"
                      : s.includes("step-in")
                        ? "Step-in"
                        : s.includes("twiggytop")
                          ? "Twiggytop"
                          : s.includes("x77")
                            ? "X77"
                            : s.includes("x88")
                              ? "X88"
                              : s.match(/libero \d+/)
                                ? "Libero"
                                : s.match(/acqua \d+/)
                                  ? "Acqua"
                                  : s.match(/multi-s \d+/)
                                    ? "Multi-S"
                                    : s.match(/stila \d+/)
                                      ? "Stila"
                                      : s.match(/natura \d+/)
                                        ? "Natura"
                                        : s.match(/s\d{3}/)
                                          ? s.match(/s\d{3}/)[0].toUpperCase()
                                          : "Andere";
        },

        getExactColor: function(m) {
            if (m.specs && m.specs.Farbe) return m.specs.Farbe;
            if (m.farbe && m.farbe !== 'Andere' && m.farbe !== 'Standard') return m.farbe;
            const s = (m.label || '').toLowerCase();
            if (s.includes('silber hochglanzeloxiert')) return 'Silber hochglanzeloxiert';
            if (s.includes('silbereloxiert') || s.includes('silberexoliert')) return 'Silbereloxiert';
            if (s.includes('silber hochglanz')) return 'Silber hochglanz';
            if (s.includes('schwarz matt') || s.includes('schwarz')) return 'Schwarz matt';
            if (s.includes('weiss matt')) return 'Weiss matt';
            if (s.includes('finox')) return 'Finox';
            if (s.includes('weiss') || s.includes('weiß')) return 'Weiss';
            if (s.includes('verchromt')) return 'Verchromt';
            if (s.includes('edelstahloptik')) return 'Edelstahloptik';
            if (s.includes('silver polish')) return 'Silver polish';
            if (s.includes('silberfarbig')) return 'Silberfarbig';
            if (s.includes('edelstahl glanz')) return 'Edelstahl glanz';
            return '';
        },

        getExactGlasart: function(m) {
            if (m.specs) {
                if (m.specs['Ausführung']) return m.specs['Ausführung'];
                if (m.specs['Glasart']) return m.specs['Glasart'];
            }
            if (m.glasart && m.glasart !== 'Andere' && m.glasart !== 'Standard') return m.glasart;
            const s = (m.label || '').toLowerCase();
            if (s.includes('caretec pro') || s.includes('caretecpro')) return 'Echtglas klar CareTec Pro';
            if (s.includes('procare') || s.includes('pro-care')) return 'Echtglas klar ProCare';
            if (s.includes('aquaperl')) return 'Echtglas klar Aquaperl';
            if (s.includes('caretec')) return 'Echtglas klar CareTec';
            if (s.includes('glas klar plus') || s.includes('klar plus')) return 'Echtglas klar Plus';
            if (s.includes('echtglas klar') || s.includes('glas klar') || s.includes('klarglas')) return 'Echtglas klar';
            return '';
        },

        extractHeight: function(m) {
            const h = this.getSpec(m, "höhe");
            if (h) return h;
            const s = (m.label || '').toLowerCase();
            const hMatch = s.match(/(?:h|h.|höhe|hoehe)\s*(?:bis)?\s*(\d+)\s*cm/);
            if (hMatch) return hMatch[1] + '0 mm';
            return '';
        },

        extractDoorTypes: function(text) {
            const s = (text || '').toLowerCase();
            const types = [];
            if (s.includes('pivot')) types.push('pivot');
            if (s.includes('gleit')) types.push('gleittür');
            if (s.includes('drehfaltt')) types.push('drehfalttür');
            if (s.includes('pendel')) {
                if (!s.includes('pivot')) types.push('pendeltür');
            }
            if (s.includes('schiebe')) types.push('schiebetür');
            if (s.includes('dreh') && !s.includes('drehfaltt')) {
                types.push('drehtür');
            }
            if (s.includes('flügel') || s.includes('fluegel')) types.push('flügeltür');
            return types;
        },

        extractWidthCm: function(m) {
            const specBreite = this.getSpec(m, "breite");
            if (specBreite) {
                const w = parseFloat(specBreite);
                if (w > 0) return w / 10;
            }
            const s = (m.label || "").toLowerCase().replace(/\b[a-zA-Z]-?\d+\b/g, "");
            const bMatch = s.match(/breite\s*(?:bis|tür)?\s*(\d+(?:[\.,]\d+)?)\s*cm/);
            if (bMatch) return parseFloat(bMatch[1].replace(",", "."));
            const mmMatch = s.match(/breite\s*(?:bis|tür)?\s*(\d+(?:[\.,]\d+)?)\s*(?:-\s*\d+(?:[\.,]\d+)?\s*)?mm/);
            if (mmMatch) return parseFloat(mmMatch[1].replace(",", ".")) / 10;
            const pMatch = s.match(/produktmass\s*(\d+(?:[\.,]\d+)?)/);
            if (pMatch) return parseFloat(pMatch[1].replace(",", "."));
            const nums = (s.replace((m.artNr || "").toLowerCase(), "").match(/\d+([\.,]\d+)?/g) || [])
                .map(n => parseFloat(n.replace(",", ".")))
                .map(n => n > 250 ? n / 10 : n)
                .filter(n => n >= 50 && n <= 220);
            if (nums.length > 0) return nums[0];
            return 999;
        },

        getWidthBucket: function(m) {
            const w = this.extractWidthCm(m);
            if (!w || w > 220 || w < 40) return null;
            if (w <= 75) return "75 cm";
            if (w <= 80) return "80 cm";
            if (w <= 90) return "90 cm";
            if (w <= 100) return "100 cm";
            if (w <= 120) return "120 cm";
            if (w <= 140) return "140 cm";
            if (w <= 160) return "160 cm";
            return "180+ cm";
        },

        extractHeightCm: function(m) {
            const h = this.extractHeight(m);
            if (!h) return null;
            const mm = parseFloat(h);
            if (isNaN(mm)) return null;
            const cm = Math.round(mm / 10);
            if (cm === 190 || cm === 200 || cm === 210 || cm === 220) {
                return cm + " cm";
            }
            return "Andere";
        },

        resetAllFilters: function() {
            this.currentType = "all";
            this.currentSituation = "all";
            this.currentColor = "all";
            this.currentBand = "all";
            this.currentGlasart = "all";
            this.currentOption = "all";
            this.currentManufacturer = "all";
            this.currentSeries = "all";
            this.currentHeight = "all";
            this.currentWidthBucket = "all";
            this.currentBreite = "";
            this.currentLaenge = "";
            const N = this.title.replace(/\s+/g, "").toLowerCase();
            const sInput = document.getElementById(`input_search_${N}`);
            if (sInput) sInput.value = "";
            const bInput = document.getElementById(`input_breite_${N}`);
            if (bInput) bInput.value = "";
            const lInput = document.getElementById(`input_laenge_${N}`);
            if (lInput) lInput.value = "";
            this.renderSidebar();
            this.filterResults();
        },

        getFilteredCount: function(category, value) {
            const originalVal = this[`current${category}`];
            this[`current${category}`] = value;
            
            const N = this.title.replace(/\s+/g, "").toLowerCase();
            var a;
            const searchVal = (((a = document.getElementById(`input_search_${N}`)) == null ? void 0 : a.value) || "").toLowerCase();
            const s = parseFloat(this.currentBreite);
            const r = parseFloat(this.currentLaenge);

            const count = this.trays.filter(l => {
                const o = (l.label || "").toLowerCase();
                if (o.includes("massaufnahme") || o.includes("anfahrt") || (o.includes("badewanne") && !o.includes("duschwanne"))) return false;
                if (this.extractType(l) === null && !searchVal) return false;
                
                if (this.currentManufacturer !== "all" && (l.manufacturer || "") !== this.currentManufacturer) return false;
                if (this.currentType !== "all" && this.extractType(l) !== this.currentType) return false;
                if (this.currentSituation !== "all" && this.extractSituation(l) !== this.currentSituation) return false;
                if (this.currentColor !== "all" && this.extractColor(l) !== this.currentColor && !(l.variants || []).some(v => this.extractColor(v) === this.currentColor)) return false;
                if (this.currentBand !== "all" && this.extractBand(l) !== this.currentBand) return false;
                if (this.currentOption !== "all" && this.extractOption(l) !== this.currentOption) return false;
                if (this.currentGlasart !== "all" && this.getVirtualGlasart(this.extractGlasart(l)) !== this.currentGlasart && !(l.variants || []).some(v => this.getVirtualGlasart(this.extractGlasart(v)) === this.currentGlasart)) return false;
                
                if (this.currentSeries !== "all" && this.extractSeries(l) !== this.currentSeries) return false;
                if (this.currentHeight !== "all" && this.extractHeightCm(l) !== this.currentHeight) return false;
                if (this.currentWidthBucket !== "all" && this.getWidthBucket(l) !== this.currentWidthBucket) return false;
                
                if ((this.currentBreite || this.currentLaenge) && !this.checkCompatibility(l, s, r)) return false;
                if (searchVal && !matchesSearchQuery(l, searchVal)) return false;
                
                return true;
            }).length;

            this[`current${category}`] = originalVal;
            return count;
        },

        getMatchingSideWalls: function(tray) {
            if (!tray) return [];
            if (this.isAlternaCostaEckeinstieg(tray)) {
                const band = this.extractBand(tray);
                if (band !== 'links' && band !== 'rechts') return [];
                
                const oppositeBand = band === 'links' ? 'rechts' : 'links';
                const color = this.getExactColor(tray);
                const glass = this.getExactGlasart(tray);
                const height = this.extractHeight(tray);
                
                // First pass: find all candidates matching opposite band, color, height, and series
                let candidates = this.trays.filter(t => {
                    if (!this.isAlternaCostaEckeinstieg(t)) return false;
                    if (this.extractBand(t) !== oppositeBand) return false;
                    
                    if (color && this.getExactColor(t) !== color) return false;
                    if (height && this.extractHeight(t) !== height) return false;
                    
                    return true;
                });
                
                // Try to match exact glass type
                let matches = candidates.filter(t => {
                    if (glass && this.getExactGlasart(t) !== glass) return false;
                    return true;
                });
                
                // Fallback if no exact glass match
                if (matches.length === 0) {
                    matches = candidates;
                }
                
                return matches.sort((a, b) => this.extractSizeScore(a) - this.extractSizeScore(b));
            }
            const series = this.extractSeries(tray);
            const mfg = tray.manufacturer;
            if (!series || !mfg) return [];

            const doorColor = this.getExactColor(tray);
            const doorGlas = this.getExactGlasart(tray);
            const doorHeight = this.extractHeight(tray);
            const doorTypes = this.extractDoorTypes(tray.label + ' ' + (tray.description || ''));

            const walls = this.trays.filter(t => {
                if (t.manufacturer !== mfg || this.extractSeries(t) !== series) return false;
                if (this.extractSituation(t) === "Freistehend / Walk-in") return false;
                const l = (t.label || '').toLowerCase();
                const form = (t.form || '').toLowerCase();
                
                // Side wall detection
                const isSeitenwand = (form === 'seitenwand' || l.startsWith('seitenwand') || l.includes('seitenwand')) &&
                                     !l.startsWith('gleit') &&
                                     !l.startsWith('pendel') &&
                                     !l.startsWith('dreh') &&
                                     !l.startsWith('falt') &&
                                     !l.startsWith('flügel') &&
                                     !l.startsWith('schiebe') &&
                                     !l.startsWith('pivot') &&
                                     !l.startsWith('eckeinstieg') &&
                                     !l.includes('walk-in') &&
                                     !l.includes('walkin') &&
                                     !l.includes('freistehend') &&
                                     !l.startsWith('montage') &&
                                     !l.startsWith('anfahrt') &&
                                     !l.startsWith('massaufnahme');
                if (!isSeitenwand) return false;

                // Door type matching
                const wallDoorTypes = this.extractDoorTypes(l + ' ' + (t.description || ''));
                if (doorTypes.length > 0 && wallDoorTypes.length > 0) {
                    if (!wallDoorTypes.some(type => doorTypes.includes(type))) {
                        return false;
                    }
                }
                
                // Color & Glass & Height matching
                if (doorColor && this.getExactColor(t) !== doorColor) return false;
                if (doorGlas && this.getExactGlasart(t) !== doorGlas) return false;
                if (doorHeight && this.extractHeight(t) !== doorHeight) return false;

                // Band (hinge) direction matching (must be opposite if specified)
                const doorBand = this.extractBand(tray);
                const wallBand = this.extractBand(t);
                if (doorBand === 'links' && wallBand !== 'rechts' && wallBand !== 'Universal') return false;
                if (doorBand === 'rechts' && wallBand !== 'links' && wallBand !== 'Universal') return false;

                return true;
            });
            return walls.sort((a, b) => this.extractSizeScore(a) - this.extractSizeScore(b));
        },

        renderConfigurator: function() {
            const N = this.title.replace(/\s+/g, "").toLowerCase();
            const configBlock = document.getElementById(`trayConfigurator_${N}`);
            if (configBlock) configBlock.style.display = "none";
        },

        clearBOM: function() {
            bomCountCounter.textContent = "0 Artikel ausgewählt";
            bomTableBody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: #9da3ad; padding: 2rem;">Bitte wählen Sie ein Produkt aus den Suchergebnissen.</td></tr>';
        },

        reconstructDescription: function(parent, variant) {
            if (!parent) return "";
            let desc = parent.description || parent.label || "";
            desc = desc.replace(/[\r\n\t]+/g, " ").replace(/\s+/g, " ").trim();
            
            // Clean up parent's color and glass suffixes from desc to prevent duplication
            if (parent) {
                const parentColor = this.extractColor(parent);
                const parentGlas = this.extractGlasart(parent);
                
                if (parentColor && parentColor !== 'Standard' && parentColor !== 'Andere') {
                    const regex = new RegExp(`[,\\s\\/]*` + parentColor.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&') + `\\b`, 'gi');
                    desc = desc.replace(regex, '');
                }
                if (parentGlas && parentGlas !== 'Standard' && parentGlas !== 'Andere') {
                    const regex = new RegExp(`[,\\s\\/]*` + parentGlas.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&') + `\\b`, 'gi');
                    desc = desc.replace(regex, '');
                }
                
                // Remove generic trailing color/glass names in German if they remain
                desc = desc.replace(/[,;\s\/]+(chrom|schwarz|weiss|weiß|matt|silber|silberfarbig|silver polish|finox|edelstahl glanz|edelstahl matt|edelstahloptik)\b/gi, '');
                desc = desc.replace(/[,;\s\/]+(echtglas klar|glasplus|caretec pro|duschguard|procare|aquaperl|satiniert|chinchilla|glas)\b/gi, '');
            }

            let suffixParts = [];
            if (variant) {
                if (variant.farbe && variant.farbe !== "Standard" && variant.farbe !== "Andere") {
                    suffixParts.push(variant.farbe);
                }
                if (variant.glasart && variant.glasart !== "Standard" && variant.glasart !== "Andere") {
                    suffixParts.push(variant.glasart);
                }
            }
            desc = desc.replace(/[,;\.\s]+$/, "").trim();
            if (suffixParts.length > 0) {
                desc += ", " + suffixParts.join(", ");
            }
            return desc;
        },
        
        updateBOM: function() {
            this.renderConfigurator();
            let backBtn = document.getElementById("backToCatalogBtn");
            if (!this.selectedTray) {
                if (backBtn) backBtn.style.display = "none";
                if (appConfig.enableGalleryUX) {
                    this.filterResults();
                } else {
                    this.clearBOM();
                }
                return;
            }

            if (appConfig.enableGalleryUX) {
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
        
            const trayToRender = this.getMatchedVariant(this.selectedTray);
            let html = `
                <tr class="bom-main-item">
                    <td><div class="img-cell"><img src="${trayToRender.imgUrl || this.mainImgUrl}" alt="Preview"></div></td>
                    <td><span class="bom-code">${trayToRender.artNr}</span></td>
                    <td><div class="bom-desc">${this.reconstructDescription(this.selectedTray, trayToRender)}</div></td>
                    <td><strong>1</strong></td>
                </tr>
            `;
            
            let count = 1;
            let hasSideWallActive = false;
            let activeSideWall = null;
            
            if (this.checkSideWallSupport(this.selectedTray)) {
                const walls = this.getMatchingSideWalls(this.selectedTray);
                if (walls.length > 0) {
                    const isMust = this.checkIsMustSideWall(this.selectedTray);
                    const selectedVal = this.selectedTray.selections.__seitenwand__ || (isMust ? walls[0].artNr : "none");
                    
                    if (!this.selectedTray.selections.__seitenwand__) {
                        this.selectedTray.selections.__seitenwand__ = selectedVal;
                    }
                    
                    hasSideWallActive = selectedVal !== "none";
                    activeSideWall = walls.find(w => w.artNr === selectedVal);
                    const sideWallToRender = activeSideWall ? this.getMatchedVariant(activeSideWall) : null;
                    
                    let optionsHTML = '';
                    if (!isMust) {
                        optionsHTML += `<option value="none" ${selectedVal === "none" ? "selected" : ""}>Ohne Seitenwand (Einbau in Nische)</option>`;
                    }
                    optionsHTML += walls.map(w => `<option value="${w.artNr}" ${selectedVal === w.artNr ? "selected" : ""}>${w.label} (${w.artNr})</option>`).join('');
                    
                    const previewImg = sideWallToRender ? (sideWallToRender.imgUrl || this.mainImgUrl) : this.mainImgUrl;
                    const artNrText = sideWallToRender ? sideWallToRender.artNr : "none";
                    const qtyText = sideWallToRender ? "1" : "0";
                    
                    const labelText = this.isAlternaCostaEckeinstieg(this.selectedTray) ? "Zweite Hälfte (Eckeinstieg)" : "Passende Seitenwand";
                    
                    html += `
                         <tr class="accessory-row seitenwand-bom-row" style="background:var(--bg-subtle);">
                            <td><div class="img-cell"><img src="${previewImg}" alt="Preview" style="max-height:100%; max-width:100%; object-fit:contain;"></div></td>
                            <td><span class="bom-code">${artNrText}</span></td>
                            <td>
                                <div class="bom-desc">
                                    <strong style="color:var(--accent); font-size:0.75rem; text-transform:uppercase; display:block; margin-bottom:4px;">${labelText}</strong>
                                    <select class="inline-bom-select config-select-seitenwand" style="width:100%; padding:0.4rem; border-radius:6px; border:1px solid var(--border); background:var(--bg-surface); color:var(--text-primary); font-size:0.85rem; font-family:inherit; cursor:pointer; outline:none; transition:border-color 0.2s ease;">
                                        ${optionsHTML}
                                    </select>
                                </div>
                            </td>
                            <td><strong>${qtyText}</strong></td>
                        </tr>
                    `;
                    
                    if (sideWallToRender) {
                        count += 1;
                    }
                }
            }
            
            const r = this.extractSizeScore(this.selectedTray);
            let checkWidth = this.extractWidthCm(this.selectedTray);

            const isSideWallIncluded = this.isAlternaOrDuscholuxSideWallIncluded(this.selectedTray);
            const isMainProductSeitenwand = this.extractType(this.selectedTray) === "Freistehende Seitenwand";
            const hasSideWallActiveOrIncluded = hasSideWallActive || isSideWallIncluded || isMainProductSeitenwand;

            const filteredServices = (this.selectedTray.services || []).filter(n => {
                const labelAndDesc = (n.label + " " + (n.description || "")).toLowerCase();
                const isEckeinstiegProduct = 
                    (this.selectedTray.label || "").toLowerCase().includes("eckeinstieg") || 
                    (this.selectedTray.form || "").toLowerCase().includes("eckeinstieg") ||
                    isSideWallIncluded;
                
                // Original size filter
                if (labelAndDesc.includes("montagepauschale") && ((labelAndDesc.includes("bis 125") && r > 125) || (labelAndDesc.includes("ab 125") && r <= 125))) {
                    return false;
                }

                // If it's an Eckeinstieg product and this is an Eckeinstieg service, include it
                if (isEckeinstiegProduct && labelAndDesc.includes("eckeinstieg")) {
                    return true;
                }
                
                // Dynamic mounting service filtering based on side wall selection
                if (hasSideWallActiveOrIncluded) {
                    if (!isMainProductSeitenwand && (labelAndDesc.includes("in nische") || labelAndDesc.includes("für nische") || labelAndDesc.includes("fuer nische"))) {
                        return false;
                    }
                    if (n.artNr === '1521 964.000.000') {
                        const hasSpecificService = (this.selectedTray.services || []).some(s => 
                            s.artNr === '1521 969.000.000' || s.artNr === '1521 970.000.000' || 
                            s.artNr === '1521 971.000.000' || s.artNr === '1521 896.000.000'
                        );
                        if (hasSpecificService) return false;
                    }
                    // If not an Eckeinstieg product, exclude Eckeinstieg services
                    if (!isEckeinstiegProduct && labelAndDesc.includes("eckeinstieg")) {
                        return false;
                    }
                    // If it is an Eckeinstieg product, exclude standard side wall services (only for Koralle)
                    const isKoralle = (this.selectedTray.manufacturer || "").toLowerCase() === "koralle";
                    if (isKoralle && isEckeinstiegProduct && labelAndDesc.includes("seitenwand") && !labelAndDesc.includes("eckeinstieg")) {
                        return false;
                    }
                } else {
                    const cleanLabel = n.label.toLowerCase();
                    if (cleanLabel.includes("nische") || cleanLabel.includes("nischen")) {
                        // Keep it!
                    } else if (labelAndDesc.includes("mit seitenwand") || labelAndDesc.includes("für seitenwand") || labelAndDesc.includes("fuer seitenwand") || labelAndDesc.includes("seitenwand") || (!isEckeinstiegProduct && labelAndDesc.includes("eckeinstieg")) || 
                        (labelAndDesc.includes(" mit") && !labelAndDesc.includes("nische") && !labelAndDesc.includes("festelement") && !labelAndDesc.includes("pendelelement") && !labelAndDesc.includes("glasteil"))) {
                        return false;
                    }
                }

                // Dynamic width-based mounting service filtering (for 100 cm, 120 cm, 160 cm, and 120-160 cm ranges)
                if (checkWidth !== null && labelAndDesc.includes("montagepauschale")) {
                    // Check 100 cm threshold
                    if (labelAndDesc.includes("bis 100") && checkWidth > 100) return false;
                    if ((labelAndDesc.includes("ab 100") || labelAndDesc.includes("100,1") || labelAndDesc.includes("100.1")) && checkWidth <= 100) return false;
                    
                    // Check 120 cm threshold
                    if (labelAndDesc.includes("bis 120") && checkWidth > 120) return false;
                    if ((labelAndDesc.includes("ab 120") || labelAndDesc.includes("120,1") || labelAndDesc.includes("120.1")) && !labelAndDesc.includes("160") && checkWidth <= 120) return false;
                    
                    // Check 160 cm threshold
                    if (labelAndDesc.includes("bis 160") && checkWidth > 160) return false;
                    if ((labelAndDesc.includes("ab 160") || labelAndDesc.includes("160,1") || labelAndDesc.includes("160.1")) && checkWidth <= 160) return false;
                    
                    // Check 120 to 160 range
                    if ((labelAndDesc.includes("120,1") || labelAndDesc.includes("120")) && labelAndDesc.includes("160")) {
                        if (checkWidth <= 120 || checkWidth > 160) return false;
                    }
                }
                
                return true;
            });

            // Sort services: 1. Massaufnahme/Ausmass, 2. Anfahrtspauschale, 3. Montagepauschale, 4. Others
            filteredServices.sort((a, b) => {
                const getPriority = (item) => {
                    const text = ((item.label || "") + " " + (item.description || "")).toLowerCase();
                    if (text.includes("massaufnahme") || text.includes("ausmass") || text.includes("ausmaß")) return 1;
                    if (text.includes("anfahrt")) return 2;
                    if (text.includes("montage")) return 3;
                    return 4;
                };
                return getPriority(a) - getPriority(b);
            });

            filteredServices.forEach(n => {
                count += n.qty || 1;
                let showDescription = false;
                if (n.description) {
                    const cleanLabel = n.label.toLowerCase().replace(/[^a-z0-9]/g, '');
                    const cleanDesc = n.description.toLowerCase().replace(/[^a-z0-9]/g, '');
                    if (!cleanLabel.includes(cleanDesc) && !cleanDesc.includes(cleanLabel)) {
                        showDescription = true;
                    }
                }
                html += `
                    <tr class="service-row">
                        <td><div class="img-cell"><i class="ri-customer-service-2-line" style="font-size:1.5rem; color:var(--accent);"></i></div></td>
                        <td><span class="bom-code">${n.artNr}</span></td>
                        <td><div class="bom-desc">${n.label}${showDescription ? '<div style="font-size:0.75rem; color:var(--text-secondary); margin-top:2px;">' + n.description + '</div>' : ''}</div></td>
                        <td><strong>${n.qty || 1}</strong></td>
                    </tr>
                `;
            });

            bomTableBody.innerHTML = html;

            // Bind InlineBOM Seitenwand selection listener
            const selectEl = bomTableBody.querySelector('.config-select-seitenwand');
            if (selectEl) {
                selectEl.addEventListener('change', (e) => {
                    this.selectedTray.selections = this.selectedTray.selections || {};
                    this.selectedTray.selections.__seitenwand__ = e.target.value;
                    this.updateBOM();
                });
            }

            bomCountCounter.textContent = `${count} Artikel benötigt`;
        },

        copyToClipboard: function() {
            if (!this.selectedTray) {
                alert('Bitte wählen Sie zuerst ein Produkt aus.');
                return;
            }
            const bomTableBody = document.getElementById("bomTableBody");
            if (!bomTableBody) {
                alert("Keine Produkte gefunden.");
                return;
            }
            let m = [];
            bomTableBody.querySelectorAll("tr").forEach(row => {
                if (row.style.display === "none" || row.style.opacity === "0.5" || window.getComputedStyle(row).display === "none") return;
                if (row.querySelector("td[colspan]")) return;
                
                const codeSpan = row.querySelector(".bom-code");
                const qtyStrong = row.querySelector("strong");
                if (codeSpan && codeSpan.textContent.trim()) {
                    let code = codeSpan.textContent.replace(/\t/g, "").trim();
                    let menge = qtyStrong ? qtyStrong.textContent.replace(/\t/g, "").trim() : "1";
                    if (!/^\d+$/.test(menge)) menge = "1";
                    if (code !== "-" && code !== "none" && code !== "" && !code.toLowerCase().startsWith("ohne") && code !== "Ausstehend") {
                        if (row.classList.contains("service-row")) {
                            m.push(`${code}\t${menge}\t\t\t\tYNOK`);
                        } else {
                            m.push(`${code}\t${menge}\t\t\t\tYMAS`);
                        }
                    }
                }
            });
            if (m.length === 0) {
                alert("Keine kopierbaren Produkte gefunden.");
                return;
            }
            const text = m.join('\n');
            window.copyTextToClipboard(text).then(() => {
                alert("Stückliste kopiert:\n\n" + text.replace(/\t/g, "    "));
            }).catch(err => {
                alert("Kopieren fehlgeschlagen.");
            });
        }
    };
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
            const getRawClass = (obj) => {
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
                console.warn(`[Configurator] Invalid WCApp mounting category "${rawClass}" detected for ${obj.artNr || obj.name}. Falling back to "common" to prevent silent exclusion.`);
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
                            ${(t.imgUrl || getSanitasImgUrl(t.artNr)) ? `<img src="${t.imgUrl || getSanitasImgUrl(t.artNr)}">` : '<i class="ri-image-line placeholder-icon"></i>'}
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
            const zubPool = (window.productApps && window.productApps['zubehoer_pool']) ? window.productApps['zubehoer_pool'].trays : [];

            sortedBOM.forEach(item => {
                // If it's a dropdown, we MUST render it so the user can change it, even if the current selection is "none" or menge is 0.
                if (!item.isInlineDropdown) {
                    if (!item.artNr || item.artNr === 'none' || item.menge === 0 || (item.label && item.label.toLowerCase().startsWith('ohne'))) return;
                }
                
                let descHTML = `<div class="bom-desc">${item.label}</div>`;
                if (item.isInlineDropdown && item.options) {
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

                const row = document.createElement('tr');
                row.innerHTML = `
                        <td><div class="img-cell" ${!item.img ? 'style="background: transparent; border: 1px dashed var(--border);"' : ''}>
                            ${item.img ? `<img src="${item.img}" alt="${item.label}">` : '<i class="ri-settings-3-line" style="font-size:1.2rem;opacity:0.3;"></i>'}
                        </div></td>
                        <td><span class="bom-code">${item.artNr}</span></td>
                        <td>
                            ${descHTML}
                            <div style="font-size: 0.8rem; color: #9e9e9e; margin-top: 0.25rem;">${item.note}</div>
                        </td>
                        
                        <td><strong>${item.menge}</strong></td>
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




export function createDuschenwanneApp(title, desc, mainImgUrl, config = {}) {
    return createRelationalApp(title, desc, mainImgUrl, { enableGalleryUX: true, ...config });
}

export function createDuschenrinneApp(title, desc, mainImgUrl, config = {}) {
    return createRelationalApp(title, desc, mainImgUrl, {
        montageLabel1: 'Wand',
        montageLabel2: 'Raum',
        sizeLabel: 'Breite',
        hideForm: true,
        hideManualSizeInputs: true,
        enableGalleryUX: true,
        ...config
    });
}

export function createBadewanneApp(title, desc, mainImgUrl, config = {}) {
    return createRelationalApp(title, desc, mainImgUrl, { enableGalleryUX: true, ...config });
}
