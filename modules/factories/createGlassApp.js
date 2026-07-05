import { matchesSearchQuery, configSidebar, bomTableBody, bomCountCounter, getVariantColor, getSanitasImgUrl, applyPillUI, Ae, re, me, ke, Be, X, priceBOM, productText } from './_shared.js';

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

            // label-prefix by design: service definitions carry their identity in the label
            if (text.includes("massaufnahme") || text.includes("anfahrt") || (text.includes("montage") && !text.includes("montage ausschliesslich") && !text.includes("bodenmontage") && !text.includes("wannenmontage")) || text.includes("demontage") || text.includes("nettobetrag") || (text.includes("für wannenmontage") && !text.includes("bodenmontage"))) return null;

            // label-prefix by design: pure hardware identity lives at the label start; their
            // descriptions reference partner doors and must not classify them as doors.
            if (/^(wandprofil|klebeset|handtuchhalter|verbreiterungsprofil|nischenfüllstück|nischenfuellstueck|stabilisationsstrebe|oberflächenschutz|oberflaechenschutz|dienstleistungspaket|eckregal)/.test(s.trim())) return null;

            // FULL-TEXT RULE: door-type keywords may live only in the description when the
            // label is truncated — classify from label+description+specs, not label alone.
            // Partner references ("zur Kombination mit Gleittüre", "zu Pendeltüren") describe
            // what this product PAIRS WITH, not what it IS — strip them before matching.
            const partnerStripped = (`${desc} ${specSerie}`).replace(/(?:zur?m?|für|fuer|in kombination mit|kombination mit|mit)\s+(?:\d+\s+)?(?:einer\s+|der\s+|den\s+)?(?:gleit|pendel|dreh|falt|schiebe|flügel|fluegel)[a-zäöüß()\/-]*/g, ' ');
            const full = `${text} ${partnerStripped}`;

            // Robust encoding-independent door checks (supporting replacements/umlauts)
            const isPivotOrDreh = full.includes("pivot") || full.includes("drehtür") || full.includes("dreht") || full.includes("dreh-t");
            const isFalt = full.includes("falttür") || full.includes("drehfalttür") || full.includes("faltt") || full.includes("falt-t");
            const isFluegel = full.includes("flügeltür") || full.includes("flügelig") || full.includes("flügel") || full.includes("fluegel");
            const isPendel = full.includes("pendeltür") || full.includes("pendelt") || full.includes("pendel-t");
            const isGleitOrSchiebe = full.includes("gleittür") || full.includes("schiebetür") || full.includes("gleitt") || full.includes("gleit-t") || full.includes("schiebet") || full.includes("schiebe-t");

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
            // FULL-TEXT RULE: dimensions may only survive in the description when the label
            // is truncated — fall back to it when the label yields no usable number.
            const scoreFrom = (raw) => {
                const clean = (raw || "").toLowerCase().replace((m.artNr || "").toLowerCase(), "").replace(/\b[a-zA-Z]-?\d+\b/g, "").trim();
                const nums = (clean.match(/\d+([\.,]\d+)?/g) || []).map(n => Number(n.replace(",", "."))).filter(n => n > 20).map(n => n > 250 ? n / 10 : n).filter(n => n < 195);
                return nums[0] || null;
            };
            return scoreFrom(m.label) || scoreFrom(m.description) || 9999;
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
            // label-prefix by design: service definitions carry their identity in the label
            const lbl = (r.label || "").toLowerCase();
            if (
              lbl.includes("massaufnahme") ||
              lbl.includes("anfahrtspauschale") ||
              lbl.includes("montagepauschale") ||
              lbl.includes("demontage") ||
              lbl.includes("nettobetrag")
            )
              return null;
            // FULL-TEXT RULE: the series regularly lives in the DESCRIPTION after the brand
            // (Duscholux "Bella Vita 3"/"Optima 6", Koralle S-codes, Alterna sub-series) —
            // read label+description+specs, not the label alone.
            const s = productText(r);
            if (s.includes("alterna ")) {
              // Validate the captured word against the known Alterna sub-series — on full
              // text, a naive capture could grab whatever word follows "Alterna" in a spec.
              const KNOWN_ALTERNA = ["costa", "lin.3", "lin3", "lin", "liva", "primo"];
              for (const n of s.matchAll(/alterna\s+([a-z0-9\.]+)/g)) {
                let m = (n[1] || "").replace(/[.,;:]+$/, "");
                if (!KNOWN_ALTERNA.includes(m)) continue;
                m = m.charAt(0).toUpperCase() + m.slice(1);
                return (m === "Lin3" || m === "Lin.3" || m === "Lin" ? "Lin.3" : m);
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
                        : (s.includes("twiggytop") || s.includes("twiggy top"))
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
            // FULL-TEXT RULE: read label AND description — truncated labels drop the height.
            const s = ((m.label || '') + ' ' + (m.description || '')).toLowerCase().replace(/[\r\n]+/g, ' ');
            const hMatch = s.match(/(?:h|h.|höhe|hoehe)\s*(?:bis)?\s*(\d+)\s*cm/);
            if (hMatch) return hMatch[1] + '0 mm';
            return '';
        },

        // A door stating its height as a CEILING ("Höhe bis 210 cm") accepts companion side
        // walls at or under that ceiling — e.g. a fixed 200 cm wall fits under a bis-210 door
        // (user rule 2026-07-03). Doors with an exact stated height keep strict equality.
        statesCeilingHeight: function(m) {
            const s = ((m.label || '') + ' ' + (m.description || '')).toLowerCase();
            return /(?:h|höhe|hoehe)\s*[.:]?\s*bis\s*\d+/.test(s);
        },
        heightsCompatible: function(door, doorHeight, wallHeight) {
            if (wallHeight === doorHeight) return true;
            if (!this.statesCeilingHeight(door)) return false;
            const d = parseInt(doorHeight, 10), w = parseInt(wallHeight, 10);
            if (isNaN(d) || isNaN(w)) return false;
            return w <= d;
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
            // FULL-TEXT RULE: read label AND description — truncated labels drop the width.
            const s = ((m.label || "") + " " + (m.description || "")).toLowerCase().replace(/[\r\n]+/g, " ").replace(/\b[a-zA-Z]-?\d+\b/g, "");
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
                if (doorHeight && !this.heightsCompatible(tray, doorHeight, this.extractHeight(t))) return false;

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

            // When a product's own Montage candidates include more than one "ab N,1 cm"
            // (unbounded-upward) threshold — e.g. "ab 120,1 cm" AND "ab 160,1 cm" as a 3-tier
            // bis120/120-160/ab160 bracket system — the lower threshold has no stated upper
            // bound in its own text, so per-candidate width checks alone can't tell it's meant
            // to stop where the higher one starts. Precompute the highest "ab" threshold this
            // product's width actually qualifies for, so only that one survives.
            let highestQualifyingAbThreshold = null;
            if (checkWidth !== null) {
                const abThresholds = [];
                (this.selectedTray.services || []).forEach(s => {
                    const t = ((s.label || '') + ' ' + (s.description || '')).toLowerCase();
                    if (!t.includes('montagepauschale')) return;
                    const m = t.match(/ab\s+(\d+)(?:[.,]1)?\s*cm/);
                    if (m) abThresholds.push(+m[1]);
                });
                const qualifying = [...new Set(abThresholds)].filter(v => checkWidth > v);
                if (qualifying.length) highestQualifyingAbThreshold = Math.max(...qualifying);
            }

            const isSideWallIncluded = this.isAlternaOrDuscholuxSideWallIncluded(this.selectedTray);
            const isMainProductSeitenwand = this.extractType(this.selectedTray) === "Freistehende Seitenwand";
            const hasSideWallActiveOrIncluded = hasSideWallActive || isSideWallIncluded || isMainProductSeitenwand;
            // A "Seitenwand ..." product selected AS THE MAIN PRODUCT (browsed/ordered on its
            // own, not as a companion picked under some door) carries no information about
            // which door it'll actually be paired with — Nische vs a specific door's side-wall
            // bracket is a real installation fact only the customer knows, not derivable from
            // the wall's own data. Don't run the door-oriented Nische/Seitenwand toggle branch
            // for this case; let every width/config-compatible candidate through instead.
            const isSeitenwandMainProduct = /^seitenwand/i.test((this.selectedTray.label || '').trim());

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
                if (isSeitenwandMainProduct) {
                    // Only drop services that are exclusively for a different product shape
                    // (Eckeinstieg-only); everything else — Nische install AND width-bracketed
                    // companion-wall options — survives to the width filter below, and if 2+
                    // remain they surface via the Montage dropdown for the customer to pick.
                    if (!isEckeinstiegProduct && labelAndDesc.includes("eckeinstieg") && !labelAndDesc.includes("seitenwand")) {
                        return false;
                    }
                    // 1521 964 is a broad catch-all superseded by the more specific S606 SKUs
                    // below when they're also present on the same product — same redundancy
                    // rule as the door-toggle branch, so it doesn't duplicate as a vague option
                    // alongside its precise siblings.
                    if (n.artNr === '1521 964.000.000') {
                        const hasSpecificService = (this.selectedTray.services || []).some(s =>
                            s.artNr === '1521 969.000.000' || s.artNr === '1521 970.000.000' ||
                            s.artNr === '1521 971.000.000' || s.artNr === '1521 896.000.000'
                        );
                        if (hasSpecificService) return false;
                    }
                } else if (hasSideWallActiveOrIncluded) {
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
                    // If not an Eckeinstieg product, exclude Eckeinstieg-EXCLUSIVE services —
                    // but a shared "Seitenwand / Eckeinstieg" Montage entry (one SKU covering
                    // BOTH configs) must survive for a non-Eckeinstieg product with a side wall
                    // active, or the Montage line disappears entirely instead of switching.
                    if (!isEckeinstiegProduct && labelAndDesc.includes("eckeinstieg") && !labelAndDesc.includes("seitenwand")) {
                        return false;
                    }
                    // If it is an Eckeinstieg product, exclude standard side wall services (only for Koralle)
                    const isKoralle = (this.selectedTray.manufacturer || "").toLowerCase() === "koralle";
                    if (isKoralle && isEckeinstiegProduct && labelAndDesc.includes("seitenwand") && !labelAndDesc.includes("eckeinstieg")) {
                        return false;
                    }
                } else {
                    // Check label+description (not label alone) for "nische" — some Montage
                    // entries only state their config in the description (e.g. "1521 464.000.000"
                    // whose label is just "für S808," but description says "...in Nische").
                    if (labelAndDesc.includes("nische") || labelAndDesc.includes("nischen")) {
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

                    // A lower "ab N,1 cm" threshold with no stated upper bound of its own must
                    // not survive when a higher "ab" threshold on a sibling candidate ALSO
                    // qualifies for this width (e.g. width=180 qualifies both "ab 120,1" and
                    // "ab 160,1" — only the more specific "ab 160,1" should remain).
                    if (highestQualifyingAbThreshold !== null) {
                        const abMatch = labelAndDesc.match(/ab\s+(\d+)(?:[.,]1)?\s*cm/);
                        if (abMatch && +abMatch[1] < highestQualifyingAbThreshold) return false;
                    }
                    
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

            // When the size/config filters above still leave 2+ Montagepauschale candidates
            // (an installation bracket the data itself can't disambiguate further — e.g. a
            // width+height combination that splits across brackets, or a config the product's
            // own label doesn't state), don't charge all of them at once. Pull them into a
            // single dropdown so the customer picks the one matching the real situation.
            const montageCandidates = filteredServices.filter(n => /^montagepauschale/i.test((n.label || '').trim()));
            const showMontageDropdown = montageCandidates.length >= 2;
            const otherServices = showMontageDropdown ? filteredServices.filter(n => !montageCandidates.includes(n)) : filteredServices;

            otherServices.forEach(n => {
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

            if (showMontageDropdown) {
                this.selectedTray.selections = this.selectedTray.selections || {};
                const selMontage = this.selectedTray.selections.__montage__ || '';
                const activeMontage = montageCandidates.find(m => m.artNr === selMontage);
                if (activeMontage) count += activeMontage.qty || 1;
                // Some Montage labels are short/generic ("Montagepauschale Koralle, mit") while
                // the description carries the actual distinguishing install context — show
                // whichever is more informative so the dropdown is actually readable.
                const montageOptionText = m => {
                    const label = (m.label || '').trim();
                    const desc = (m.description || '').replace(/\s+/g, ' ').trim();
                    return desc.length > label.length ? desc : label;
                };
                const montageOptions = `<option value="" ${!activeMontage ? 'selected' : ''}>Bitte wählen…</option>` +
                    montageCandidates.map(m => `<option value="${m.artNr}" ${selMontage === m.artNr ? 'selected' : ''}>${montageOptionText(m)} (${m.artNr})</option>`).join('');
                const artNrDisplay = activeMontage ? activeMontage.artNr : '<span style="color:var(--accent); font-weight:bold;">Ausstehend</span>';
                const mengeDisplay = activeMontage ? (activeMontage.qty || 1) : '-';
                html += `
                    <tr class="service-row montage-bom-row">
                        <td><div class="img-cell"><i class="ri-customer-service-2-line" style="font-size:1.5rem; color:var(--accent);"></i></div></td>
                        <td><span class="bom-code">${artNrDisplay}</span></td>
                        <td><div class="bom-desc">
                            <strong style="color:var(--accent); font-size:0.75rem; text-transform:uppercase; display:block; margin-bottom:4px;">Montagepauschale — Situation wählen</strong>
                            <select class="inline-bom-select config-select-montage" style="width:100%; padding:0.4rem; border-radius:6px; border:1px solid var(--border); background:var(--bg-surface); color:var(--text-primary); font-size:0.85rem; font-family:inherit; cursor:pointer; outline:none;">
                                ${montageOptions}
                            </select>
                        </div></td>
                        <td><strong>${mengeDisplay}</strong></td>
                    </tr>
                `;
            }

            // Alterna primo freistehende Seitenwand: bundled Dienstleistungspaket (Ausmass +
            // Anfahrt + Montage in ONE Art-Nr) with a quantity-tier dropdown — 1549 180 for
            // 1–4 Stück (standard) and 1549 181 for ab 5 Stück (option). Replaces the individual
            // service rows for these products (their `services` array is intentionally empty).
            if (Array.isArray(this.selectedTray.servicePackage) && this.selectedTray.servicePackage.length) {
                const pkgs = this.selectedTray.servicePackage;
                this.selectedTray.selections = this.selectedTray.selections || {};
                const selPkg = this.selectedTray.selections.__servicepaket__ || pkgs[0].artNr;
                this.selectedTray.selections.__servicepaket__ = selPkg;
                const activePkg = pkgs.find(p => p.artNr === selPkg) || pkgs[0];
                count += activePkg.qty || 1;
                const pkgOptions = pkgs.map(p => `<option value="${p.artNr}" ${selPkg === p.artNr ? "selected" : ""}>${p.label} (${p.artNr})</option>`).join('');
                html += `
                    <tr class="service-row servicepaket-bom-row">
                        <td><div class="img-cell"><i class="ri-customer-service-2-line" style="font-size:1.5rem; color:var(--accent);"></i></div></td>
                        <td><span class="bom-code">${activePkg.artNr}</span></td>
                        <td><div class="bom-desc">
                            <strong style="color:var(--accent); font-size:0.75rem; text-transform:uppercase; display:block; margin-bottom:4px;">Dienstleistungspaket</strong>
                            <select class="inline-bom-select config-select-servicepaket" style="width:100%; padding:0.4rem; border-radius:6px; border:1px solid var(--border); background:var(--bg-surface); color:var(--text-primary); font-size:0.85rem; font-family:inherit; cursor:pointer; outline:none;">
                                ${pkgOptions}
                            </select>
                        </div></td>
                        <td><strong>${activePkg.qty || 1}</strong></td>
                    </tr>
                `;
            }

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

            // Bind Montagepauschale (ambiguous-bracket) selection listener
            const montageSelectEl = bomTableBody.querySelector('.config-select-montage');
            if (montageSelectEl) {
                montageSelectEl.addEventListener('change', (e) => {
                    this.selectedTray.selections = this.selectedTray.selections || {};
                    this.selectedTray.selections.__montage__ = e.target.value;
                    this.updateBOM();
                });
            }

            // Bind service-package (Dienstleistungspaket) selection listener
            const pkgSelectEl = bomTableBody.querySelector('.config-select-servicepaket');
            if (pkgSelectEl) {
                pkgSelectEl.addEventListener('change', (e) => {
                    this.selectedTray.selections = this.selectedTray.selections || {};
                    this.selectedTray.selections.__servicepaket__ = e.target.value;
                    this.updateBOM();
                });
            }

            bomCountCounter.textContent = `${count} Artikel benötigt`;
            priceBOM(document.getElementById('bomTableBody'));
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

