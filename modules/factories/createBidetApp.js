import { matchesSearchQuery, applyPillUI, bomTableBody, bomCountCounter, priceBOM, productText, renderAccessoiresPanel } from './_shared.js';
import { COLOR_NAMES } from './_colorCodes.js';

/**
 * createBidetApp — the Bidet subcategory as a Mix&Match-style builder.
 *
 * Two columns, like Mix & Match in Waschplatz: the ceramic on the left, the mixer on
 * the right, both bidirectionally faceted. The difference is where the accessories come
 * from: Mix & Match derives them by rule, while the catalogue prints an explicit
 * "Zubehör" list under every bidet (Rohrbogensiphon, Regulierventil,
 * Klemmverschraubung, Befestigung). That printed list ships with the ceramic tray as
 * `zubehoer[]` and IS the BOM rule here — no guessing.
 *
 * init(ceramics, mixers) — ceramics come from productApps.bidet_keramik.trays,
 * mixers are this app's own trays (the Ch6 Bidetmischer/Bidetbatterien).
 */
export function createBidetApp(title, desc, mainImgUrl) {
    const suffix = 'Bidet';

    return {
        title, desc, mainImgUrl,
        trays: [],                 // the mixers — the data loader fills this from custom-data.json
        ceramicTrays: [],
        mixerTrays: [],

        selectedCeramic: null,
        selectedMixer: null,

        // Ceramic facets
        currentCeramicBrand: 'all',
        currentCeramicSerie: 'all',
        currentCeramicMontage: 'all',
        currentCeramicBreite: 'all',
        currentCeramicBefestigung: 'all',
        currentCeramicFarbe: 'all',

        // Mixer facets
        currentMixerBrand: 'all',
        currentMixerTyp: 'all',
        currentMixerFarbe: 'all',
        currentMixerSerie: 'all',
        currentMixerAusladung: 'all',

        ceramicSearchQuery: '',
        mixerSearchQuery: '',

        // Accessoires add-on panel (shared with DM / BM / WTM / Waschtisch)
        showAccessoires: false,
        selectedAddonAccessoires: [],
        currentAccessoireSerie: 'Alle',
        accSecondary: {},

        init: function (ceramics, mixers) {
            this.ceramicTrays = ceramics || [];
            this.mixerTrays = mixers || this.trays || [];

            this.selectedCeramic = null;
            this.selectedMixer = null;

            this.currentCeramicBrand = 'all';
            this.currentCeramicSerie = 'all';
            this.currentCeramicMontage = 'all';
            this.currentCeramicBreite = 'all';
            this.currentCeramicBefestigung = 'all';
            this.currentCeramicFarbe = 'all';

            this.currentMixerBrand = 'all';
            this.currentMixerTyp = 'all';
            this.currentMixerFarbe = 'all';
            this.currentMixerSerie = 'all';
            this.currentMixerAusladung = 'all';

            this.ceramicSearchQuery = '';
            this.mixerSearchQuery = '';

            this.showAccessoires = false;
            this.selectedAddonAccessoires = [];
            this.currentAccessoireSerie = 'Alle';
            this.accSecondary = {};

            this.renderFinder();
            this.clearBOM();
        },

        // ---------------------------------------------------------------- extractors
        // FULL-TEXT RULE: every classifier reads label + description + specs via
        // productText(). The injection stores explicit fields, but a hand-edited tray in
        // the admin panel may only have the text, so the text stays the fallback.

        extractMontage: function (t) {
            if (t.montageart) return t.montageart;
            const txt = productText(t);
            if (/\bStand\s*-?\s*Bidet\b|Montage:\s*Boden/i.test(txt)) return 'Stand';
            return 'Wand';
        },

        extractBefestigung: function (t) {
            if (t.befestigung && t.befestigung !== 'Unbekannt') return t.befestigung;
            const txt = productText(t);
            if (/verdeckte?r?s?\s+Befestigung|Befestigung\s+verdeckt/i.test(txt)) return 'Verdeckt';
            if (/sichtbare?r?s?\s+Befestigung|Befestigung\s+sichtbar/i.test(txt)) return 'Sichtbar';
            return 'Unbekannt';
        },

        extractSerie: function (t) {
            if (t.serie) return t.serie;
            const txt = productText(t);
            const head = String(txt).split(',')[0];
            const brand = (t.manufacturer && t.manufacturer !== 'Andere') ? t.manufacturer : '';
            let s = head.replace(/^(Wand|Stand)\s*-?\s*Bidet\s*/i, '').trim();
            if (brand) s = s.replace(new RegExp(brand, 'i'), '').trim();
            return s.replace(/^[-\s]+/, '').trim() || 'Andere';
        },

        extractBreite: function (t) {
            if (t.size && /\d/.test(t.size)) return String(parseFloat(t.size));
            const m = productText(t).match(/\b(\d{2,3})\s*cm\b/);
            return m ? m[1] : 'unknown';
        },

        /** Mixer type — the catalogue distinguishes Bidetmischer from Bidetbatterie. */
        extractMixerTyp: function (t) {
            const txt = productText(t);
            if (/Bidetbatterie/i.test(txt)) return 'Bidetbatterie';
            if (/Bidetmischer/i.test(txt)) return 'Bidetmischer';
            return 'Andere';
        },

        extractMixerSerie: function (t) {
            if (t.serie) return t.serie;
            const brand = (t.manufacturer || '').toLowerCase();
            const skip = ['bidetmischer', 'bidetbatterie', 'mischer', 'batterie', 'armatur', brand,
                'auslauf', 'fest', 'schwenkbar', 'mit', 'ohne', 'ablaufventil', 'a'];
            // FULL-TEXT RULE: the label is regularly truncated mid-series, so fall back to
            // the description when the label's leading segment yields nothing usable.
            const parse = (raw) => {
                let head = String(raw || '').split(',')[0].trim().replace(/\bA\s*\d+/i, '');
                return head.split(/\s+/)
                    .filter(w => { const c = w.toLowerCase().replace(/[^a-z0-9.]/g, ''); return c && !skip.includes(c); })
                    .join(' ').trim();
            };
            return parse(t.label) || parse(t.description) || 'Andere';
        },

        extractAusladung: function (t) {
            const m = productText(t).match(/\bA\s*(\d{2,3})\s*mm/i);
            return m ? m[1] : 'unknown';
        },

        /**
         * COLOUR RULE: the finish comes ONLY from the art-Nr finish-code triplet, mapped
         * through COLOR_NAMES — never from label text. See INSTRUCTIONS.md § Colour codes.
         */
        colourOf: function (artNr) {
            const m = String(artNr || '').match(/\.(\d{3})(?:\.|$)/);
            return m ? (COLOR_NAMES[m[1]] || null) : null;
        },

        /** Every colour a tray is available in, base SKU and variants together. */
        coloursOf: function (t) {
            const out = new Set();
            const add = (a) => { const c = this.colourOf(a); if (c) out.add(c); };
            add(t.artNr);
            (t.variants || []).forEach(v => add(v.artNr));
            return [...out];
        },

        /** Resolve a tray to the SKU matching the active Farbe pill, else its base SKU. */
        skuFor: function (t, wanted) {
            if (!t) return null;
            if (!wanted || wanted === 'all' || this.colourOf(t.artNr) === wanted) {
                return { artNr: t.artNr, label: t.label };
            }
            const v = (t.variants || []).find(x => this.colourOf(x.artNr) === wanted);
            return v ? { artNr: v.artNr, label: v.label || t.label } : { artNr: t.artNr, label: t.label };
        },

        // ---------------------------------------------------------------- UI
        renderFinder: function () {
            const sidebar = document.getElementById('configSidebar');
            if (!sidebar) return;

            sidebar.innerHTML = `
                <div class="finder-shelf">
                    <!-- Column 1: the ceramic -->
                    <div class="finder-column" id="col_bidet">
                        <div class="finder-column-header"><h3><i class="ri-drop-line"></i> Bidet</h3></div>
                        <div class="column-search-container">
                            <i class="ri-search-line"></i>
                            <input type="text" id="bidet_local_search" placeholder="Art-Nr oder Modell suchen...">
                        </div>

                        <div class="finder-sub-header" id="head_bidet_brand">Hersteller</div>
                        <div class="pill-group" id="list_bidet_brand"></div>

                        <div class="finder-sub-header" id="head_bidet_montage">Montageart</div>
                        <div class="pill-group" id="list_bidet_montage"></div>

                        <div class="finder-sub-header" id="head_bidet_serie">Serie</div>
                        <div class="pill-group" id="list_bidet_serie" style="zoom: 0.85;"></div>

                        <div class="finder-sub-header" id="head_bidet_breite">Länge</div>
                        <div class="pill-group" id="list_bidet_breite" style="zoom: 0.85;"></div>

                        <div class="finder-sub-header" id="head_bidet_befestigung">Befestigung</div>
                        <div class="pill-group" id="list_bidet_befestigung"></div>

                        <div class="finder-sub-header" id="head_bidet_farbe">Farbe</div>
                        <div class="pill-group" id="list_bidet_farbe" style="zoom: 0.85;"></div>

                        <div class="finder-sub-header">Modell auswählen</div>
                        <div class="finder-list" id="list_bidet_items"></div>
                    </div>

                    <!-- Column 2: the mixer -->
                    <div class="finder-column" id="col_bidetmischer">
                        <div class="finder-column-header"><h3><i class="ri-water-flash-line"></i> Bidetmischer</h3></div>
                        <div class="column-search-container">
                            <i class="ri-search-line"></i>
                            <input type="text" id="bidetmischer_local_search" placeholder="Art-Nr oder Modell suchen...">
                        </div>

                        <div class="finder-sub-header" id="head_bmisch_brand">Hersteller</div>
                        <div class="pill-group" id="list_bmisch_brand"></div>

                        <div class="finder-sub-header" id="head_bmisch_typ">Typ</div>
                        <div class="pill-group" id="list_bmisch_typ"></div>

                        <div class="finder-sub-header" id="head_bmisch_farbe">Farbe</div>
                        <div class="pill-group" id="list_bmisch_farbe" style="zoom: 0.85;"></div>

                        <div class="finder-sub-header" id="head_bmisch_serie">Serie</div>
                        <div class="pill-group" id="list_bmisch_serie" style="zoom: 0.85;"></div>

                        <div class="finder-sub-header" id="head_bmisch_ausl">Ausladung</div>
                        <div class="pill-group" id="list_bmisch_ausl" style="zoom: 0.85;"></div>

                        <div class="finder-sub-header">Modell auswählen</div>
                        <div class="finder-list" id="list_bmisch_items"></div>
                    </div>

                    <!-- Column 3: catalogue Zubehör + add-ons -->
                    <div class="finder-column" id="col_bidet_zubehoer">
                        <div class="finder-column-header"><h3><i class="ri-settings-3-line"></i> Zubehör</h3></div>
                        <div id="bidet_zubehoer_list"></div>

                        <div class="addon-toggles-section" id="addon_toggles_section_${suffix}" style="display:none;">
                            <div class="finder-sub-header" style="margin-top: 1.5rem;">Zusatzoptionen</div>
                            <div class="addon-toggle-row" id="toggle_accessoires_${suffix}">
                                <span class="addon-toggle-label"><i class="ri-archive-line"></i> Accessoires</span>
                                <button class="ios-toggle" data-target="accessoires_${suffix}" aria-label="Accessoires ein/aus"><span class="ios-toggle-knob"></span></button>
                            </div>
                            <div id="addon_accessoires_panel_${suffix}" class="addon-panel" style="display:none;">
                                <div class="finder-sub-header">Kategorie</div>
                                <div class="pill-group" id="list_addon_accessoires_serie_${suffix}" style="margin-bottom: 0.75rem;"></div>
                                <div class="finder-sub-header">Accessoires wählen</div>
                                <div class="finder-list" id="list_addon_accessoires_${suffix}"></div>
                            </div>
                        </div>
                    </div>

                    <!-- Column 4: preview -->
                    <div class="finder-preview-col" id="col_preview"></div>
                </div>
            `;

            const cs = document.getElementById('bidet_local_search');
            if (cs) {
                cs.value = this.ceramicSearchQuery;
                cs.addEventListener('input', (e) => { this.ceramicSearchQuery = e.target.value; this.updateCeramicTiers(); });
            }
            const ms = document.getElementById('bidetmischer_local_search');
            if (ms) {
                ms.value = this.mixerSearchQuery;
                ms.addEventListener('input', (e) => { this.mixerSearchQuery = e.target.value; this.updateMixerTiers(); });
            }

            this.updateCeramicTiers();
            this.updateMixerTiers();
            this.updateZubehoerColumn();
            this.updateAccessoiresToggles();
            this.populateAccessoires();
            this.updatePreview();
        },

        /**
         * Shared faceted-pill engine (same contract as Mix & Match): every group offers
         * only the values still reachable given all the OTHER active filters, so the
         * filters narrow each other in both directions. The facet the user just clicked
         * is protected — conflicting older selections reset instead, so a click always
         * takes effect.
         */
        renderFacets: function (opts) {
            const { trays, fns, curKey, lastKey, groups, searchQuery, onChange } = opts;
            const facetSet = (except) => trays.filter(t =>
                Object.keys(fns).every(k => k === except || this[curKey[k]] === 'all' || fns[k](t) === this[curKey[k]]));

            Object.keys(fns).forEach(k => {
                if (k === this[lastKey]) return;
                const cur = this[curKey[k]];
                if (cur !== 'all' && !facetSet(k).some(t => fns[k](t) === cur)) this[curKey[k]] = 'all';
            });

            groups.forEach(g => {
                const list = document.getElementById(g.listId);
                if (!list) return;
                let vals = [...new Set(facetSet(g.key).map(t => fns[g.key](t)))].filter(v => v && v !== 'unknown' && v !== 'Unbekannt');
                vals.sort(g.numeric ? (a, b) => parseFloat(a) - parseFloat(b) : (a, b) => String(a).localeCompare(String(b)));
                const cur = this[curKey[g.key]];
                list.innerHTML = `<button class="pill-btn ${cur === 'all' ? 'active' : ''}" data-val="all">Alle</button>`
                    + vals.map(v => `<button class="pill-btn ${cur === v ? 'active' : ''}" data-val="${v}">${g.fmt ? g.fmt(v) : v}</button>`).join('');
                applyPillUI(g.headId, g.listId, cur, g.label, () => { this[curKey[g.key]] = 'all'; onChange(); });
                list.querySelectorAll('.pill-btn').forEach(el => el.addEventListener('click', () => {
                    this[curKey[g.key]] = el.dataset.val;
                    this[lastKey] = g.key;
                    onChange();
                }));
            });

            let result = facetSet(null);
            if (searchQuery && searchQuery.trim() !== '') result = result.filter(t => matchesSearchQuery(t, searchQuery));
            return result;
        },

        updateCeramicTiers: function () {
            const fns = {
                brand: t => t.manufacturer || 'Andere',
                montage: t => this.extractMontage(t),
                serie: t => this.extractSerie(t),
                breite: t => this.extractBreite(t),
                befestigung: t => this.extractBefestigung(t),
                // A tray matches a colour if ANY of its SKUs is available in it.
                farbe: t => {
                    const want = this.currentCeramicFarbe;
                    const cols = this.coloursOf(t);
                    return (want !== 'all' && cols.includes(want)) ? want : (cols[0] || null);
                },
            };
            const curKey = {
                brand: 'currentCeramicBrand', montage: 'currentCeramicMontage', serie: 'currentCeramicSerie',
                breite: 'currentCeramicBreite', befestigung: 'currentCeramicBefestigung', farbe: 'currentCeramicFarbe',
            };
            // The Farbe group lists every colour reachable in the current facet set, not just
            // each tray's first one, so a rare finish is still offered.
            const items = this.renderFacets({
                trays: this.ceramicTrays, fns, curKey, lastKey: '_lastCeramicFacet',
                searchQuery: this.ceramicSearchQuery,
                onChange: () => { this.updateCeramicTiers(); this.updateZubehoerColumn(); this.updatePreview(); },
                groups: [
                    { key: 'brand', headId: 'head_bidet_brand', listId: 'list_bidet_brand', label: 'Hersteller' },
                    { key: 'montage', headId: 'head_bidet_montage', listId: 'list_bidet_montage', label: 'Montageart' },
                    { key: 'serie', headId: 'head_bidet_serie', listId: 'list_bidet_serie', label: 'Serie' },
                    { key: 'breite', headId: 'head_bidet_breite', listId: 'list_bidet_breite', label: 'Länge', numeric: true, fmt: v => `${v} cm` },
                    { key: 'befestigung', headId: 'head_bidet_befestigung', listId: 'list_bidet_befestigung', label: 'Befestigung' },
                ],
            });

            this.renderColourGroup('farbe_ceramic', 'head_bidet_farbe', 'list_bidet_farbe', items, 'currentCeramicFarbe',
                () => { this.updateCeramicTiers(); this.updateZubehoerColumn(); this.updatePreview(); });

            const list = document.getElementById('list_bidet_items');
            if (!list) return;
            const shown = this.currentCeramicFarbe === 'all' ? items : items.filter(t => this.coloursOf(t).includes(this.currentCeramicFarbe));
            list.innerHTML = shown.length === 0
                ? '<div class="no-results">Keine Bidets gefunden.</div>'
                : shown.map(t => {
                    const sku = this.skuFor(t, this.currentCeramicFarbe);
                    const img = t.imgUrl ? `<img loading="lazy" decoding="async" src="${t.imgUrl}" style="width:36px; height:36px; object-fit:contain; background:white; border-radius:4px; border:1px solid rgba(0,0,0,0.1);" onerror="this.style.display='none'">` : '';
                    const active = this.selectedCeramic && this.selectedCeramic.id === t.id;
                    return `
                        <div class="finder-item ${active ? 'active' : ''}" data-id="${t.id}">
                            <div style="display:flex; align-items:center; gap: 0.75rem;">
                                ${img}
                                <div style="display:flex; flex-direction:column;">
                                    <span style="font-weight:500;">${t.manufacturer} ${this.extractSerie(t)}</span>
                                    <span class="result-meta">${this.extractMontage(t)} | ${t.size} | ${sku.artNr}</span>
                                </div>
                            </div>
                            <i class="ri-check-line finder-item-arrow" style="${active ? '' : 'display:none;'}"></i>
                        </div>`;
                }).join('');

            list.querySelectorAll('.finder-item').forEach(el => el.addEventListener('click', () => {
                this.selectedCeramic = this.ceramicTrays.find(x => x.id === el.dataset.id);
                this.updateCeramicTiers();
                this.updateMixerTiers();
                this.updateZubehoerColumn();
                this.updateAccessoiresToggles();
                this.populateAccessoires();
                this.updatePreview();
                this.updateBOM();
            }));
        },

        updateMixerTiers: function () {
            const fns = {
                brand: t => t.manufacturer || 'Andere',
                typ: t => this.extractMixerTyp(t),
                serie: t => this.extractMixerSerie(t),
                ausladung: t => this.extractAusladung(t),
                farbe: t => {
                    const want = this.currentMixerFarbe;
                    const cols = this.coloursOf(t);
                    return (want !== 'all' && cols.includes(want)) ? want : (cols[0] || null);
                },
            };
            const curKey = {
                brand: 'currentMixerBrand', typ: 'currentMixerTyp', serie: 'currentMixerSerie',
                ausladung: 'currentMixerAusladung', farbe: 'currentMixerFarbe',
            };
            const items = this.renderFacets({
                trays: this.mixerTrays, fns, curKey, lastKey: '_lastMixerFacet',
                searchQuery: this.mixerSearchQuery,
                onChange: () => { this.updateMixerTiers(); this.updatePreview(); },
                groups: [
                    { key: 'brand', headId: 'head_bmisch_brand', listId: 'list_bmisch_brand', label: 'Hersteller' },
                    { key: 'typ', headId: 'head_bmisch_typ', listId: 'list_bmisch_typ', label: 'Typ' },
                    { key: 'serie', headId: 'head_bmisch_serie', listId: 'list_bmisch_serie', label: 'Serie' },
                    { key: 'ausladung', headId: 'head_bmisch_ausl', listId: 'list_bmisch_ausl', label: 'Ausladung', numeric: true, fmt: v => `A ${v} mm` },
                ],
            });

            this.renderColourGroup('farbe_mixer', 'head_bmisch_farbe', 'list_bmisch_farbe', items, 'currentMixerFarbe',
                () => { this.updateMixerTiers(); this.updatePreview(); });

            const list = document.getElementById('list_bmisch_items');
            if (!list) return;
            const shown = this.currentMixerFarbe === 'all' ? items : items.filter(t => this.coloursOf(t).includes(this.currentMixerFarbe));
            list.innerHTML = shown.length === 0
                ? '<div class="no-results">Keine Bidetmischer gefunden.</div>'
                : shown.map(t => {
                    const sku = this.skuFor(t, this.currentMixerFarbe);
                    const img = t.imgUrl ? `<img loading="lazy" decoding="async" src="${t.imgUrl}" style="width:36px; height:36px; object-fit:contain; background:white; border-radius:4px; border:1px solid rgba(0,0,0,0.1);" onerror="this.style.display='none'">` : '';
                    const active = this.selectedMixer && this.selectedMixer.id === t.id;
                    return `
                        <div class="finder-item ${active ? 'active' : ''}" data-id="${t.id}">
                            <div style="display:flex; align-items:center; gap: 0.75rem;">
                                ${img}
                                <div style="display:flex; flex-direction:column;">
                                    <span style="font-weight:500;">${t.manufacturer} ${this.extractMixerSerie(t)}</span>
                                    <span class="result-meta">${sku.artNr}</span>
                                </div>
                            </div>
                            <i class="ri-check-line finder-item-arrow" style="${active ? '' : 'display:none;'}"></i>
                        </div>`;
                }).join('');

            list.querySelectorAll('.finder-item').forEach(el => el.addEventListener('click', () => {
                this.selectedMixer = this.mixerTrays.find(x => x.id === el.dataset.id);
                this.updateMixerTiers();
                this.updateZubehoerColumn();
                this.updatePreview();
                this.updateBOM();
            }));
        },

        /** Farbe pills: every colour reachable in the current facet set (union, not first-wins). */
        renderColourGroup: function (facetKey, headId, listId, items, stateKey, onChange) {
            const list = document.getElementById(listId);
            if (!list) return;
            const cols = [...new Set(items.flatMap(t => this.coloursOf(t)))].sort();
            const cur = this[stateKey];
            if (cur !== 'all' && !cols.includes(cur)) this[stateKey] = 'all';
            list.innerHTML = `<button class="pill-btn ${this[stateKey] === 'all' ? 'active' : ''}" data-val="all">Alle</button>`
                + cols.map(c => `<button class="pill-btn ${this[stateKey] === c ? 'active' : ''}" data-val="${c}">${c}</button>`).join('');
            applyPillUI(headId, listId, this[stateKey], 'Farbe', () => { this[stateKey] = 'all'; onChange(); });
            list.querySelectorAll('.pill-btn').forEach(el => el.addEventListener('click', () => {
                this[stateKey] = el.dataset.val;
                onChange();
            }));
        },

        /** The loose block for the chosen bidet, shown as a read-only list. */
        updateZubehoerColumn: function () {
            const el = document.getElementById('bidet_zubehoer_list');
            if (!el) return;
            if (!this.selectedCeramic) {
                el.innerHTML = '<div class="finder-empty-state" style="font-size:0.8rem;">Wählen Sie ein Bidet — das lose Zubehör erscheint hier.</div>';
                return;
            }
            const zub = this.looseItems();
            if (!zub.length) {
                el.innerHTML = '<div class="finder-empty-state" style="font-size:0.8rem;">Kein loses Zubehör nötig.</div>';
                return;
            }
            el.innerHTML = '<div class="finder-sub-header">Lose Artikel (nach G1)</div>' + zub.map(z => `
                <div class="finder-item" style="cursor:default;">
                    <div style="display:flex; flex-direction:column;">
                        <span style="font-weight:500; font-size:0.8rem;">${z.label}</span>
                        <span class="result-meta">${z.qty}x | ${z.artNr}${z.note ? ' · ' + z.note : ''}</span>
                    </div>
                </div>`).join('');
        },

        /**
         * The LOOSE block — everything that is booked after the G1 set is closed, in the
         * order it gets pasted into SAP:
         *
         *   1. Dübel und Schrauben — only when the ceramic does not already ship its own
         *      fixing kit, which the catalogue states as "Befestigungsmaterial".
         *   2. Schallschutz — the Hafner iso-set for a wall-hung ceramic. A Stand-Bidet
         *      stands on the floor, so it needs none.
         *   3. Siphon
         *   4. Regulierventil — one per supply (hot + cold); a Mischwasser mixer has one.
         *   5. Klemmverschraubung — only when the valve comes "ohne Klemmverschraubung".
         *
         * The specific Siphon / Regulierventil art-Nrs are the ones the catalogue prints
         * under each bidet. Where it prints none (Stand-Bidet Catalano Zero), the house
         * default for that mounting type stands in, so the Stückliste is still complete.
         */
        looseItems: function () {
            const c = this.selectedCeramic;
            if (!c) return [];
            const items = [];
            const text = productText(c);
            const isWand = this.extractMontage(c) === 'Wand';
            const zub = c.zubehoer || [];
            const byRole = (r) => zub.find(z => z.role === r);

            // 1. Dübel und Schrauben — FULL-TEXT RULE: "Befestigungsmaterial" is regularly
            //    truncated out of the label and only survives in the description.
            if (!/Befestigungsmaterial/i.test(text)) {
                const printed = byRole('befestigung');
                items.push(printed
                    ? { ...printed, qty: 2 }
                    : { artNr: '8211 114.000.000', label: 'Dübelschraube 165 mm, Länge 165 mm, Kunststoffdübel, M 12', role: 'befestigung', qty: 2, note: 'kein Befestigungsmaterial im Lieferumfang' });
            }

            // 2. Schallschutz — 3381 120 is literally the Wandklosett/Wandbidet iso-set.
            const includesSchall = /inkl\.\s*schall|m\.\s*schall|schallschutz-?set/i.test(text);
            if (isWand && !includesSchall) {
                items.push({ artNr: '3381 120.000.000', label: 'Schallschutz Iso-Set Hafner Wandklosett/Wandbidet', role: 'schallschutz', qty: 1 });
            }

            // 3. Siphon
            const siphon = byRole('siphon');
            items.push(siphon
                ? { ...siphon, qty: 1 }
                : { artNr: isWand ? '3531 110.100.000' : '3531 115.501.000', label: isWand ? 'Rohrbogensiphon Geberit für Wand-Bidet, 1¼" x 40 mm, Weiss' : 'Rohrbogensiphon für Bidet, 1¼" x 32 mm, Steckdichtung, Verchromt', role: 'siphon', qty: 1, note: 'Standard' });

            // 4. Regulierventil — one per supply.
            const supplies = /mischwasser/i.test(this.selectedMixer ? productText(this.selectedMixer) : '') ? 1 : 2;
            const valve = byRole('regulierventil')
                || { artNr: '6511 201.501.000', label: 'Regulierventil Laufen ½", 45 mm, ohne Klemmverschraubung, Verchromt', role: 'regulierventil', note: 'Standard' };
            items.push({ ...valve, qty: supplies });

            // 5. Klemmverschraubung — needed exactly when the valve ships without one.
            if (/ohne\s+Klemmverschraubung/i.test(valve.label || '')) {
                const clamp = byRole('klemmverschraubung')
                    || { artNr: '6561 112.501.000', label: 'Klemmverschraubung Neoperl, ⅜" x 10 mm Ø, Nylonklemmring, Verchromt', role: 'klemmverschraubung', note: 'Standard' };
                items.push({ ...clamp, qty: supplies });
            }

            return items;
        },

        // ---------------------------------------------------------------- add-ons
        updateAccessoiresToggles: function () {
            const section = document.getElementById(`addon_toggles_section_${suffix}`);
            const btn = document.querySelector(`#toggle_accessoires_${suffix} .ios-toggle`);
            const panel = document.getElementById(`addon_accessoires_panel_${suffix}`);
            if (btn) btn.classList.toggle('active', this.showAccessoires);
            if (panel) panel.style.display = this.showAccessoires ? 'block' : 'none';
            if (!section) return;

            if (this.selectedCeramic) {
                section.style.display = 'block';
            } else {
                section.style.display = 'none';
                this.showAccessoires = false;
            }
            const toggleBtn = section.querySelector('.ios-toggle');
            if (toggleBtn && !toggleBtn.dataset.bound) {
                toggleBtn.dataset.bound = 'true';
                toggleBtn.addEventListener('click', () => {
                    this.showAccessoires = !this.showAccessoires;
                    this.updateAccessoiresToggles();
                    this.populateAccessoires();
                    this.updatePreview();
                    this.updateBOM();
                });
            }
        },

        populateAccessoires: function () {
            renderAccessoiresPanel(this, suffix);
        },

        // ---------------------------------------------------------------- BOM
        /**
         * Same two-block shape as Mix & Match: a G1 bundle, then a spacer that closes it,
         * then the loose articles. The spacer is the boundary both copy buttons key off —
         * "G1 kopieren" takes everything before it, "Lose Artikel" everything after.
         *
         *   G1:    Gürtelset · Bidet · Bidetmischer · Einbaukosten
         *   ── G1 END ──
         *   lose:  Dübel/Schrauben · Schallschutz · Siphon · Regulierventil ·
         *          Klemmverschraubung · gewählte Accessoires
         */
        getBOMPreviewItems: function () {
            if (!this.selectedCeramic) return [];
            const items = [];

            // ---- G1 set ----
            items.push({ qty: 1, label: 'Gürtelset', artNr: 'G1' });

            const ceramic = this.skuFor(this.selectedCeramic, this.currentCeramicFarbe);
            items.push({ qty: 1, label: ceramic.label, artNr: ceramic.artNr });

            if (this.selectedMixer) {
                const mixer = this.skuFor(this.selectedMixer, this.currentMixerFarbe);
                items.push({ qty: 1, label: mixer.label, artNr: mixer.artNr });

                // Einbaukosten closes the G1 set — the mixer's own service when the data
                // carries one, otherwise the house standard for a single-hole mixer.
                let service = null;
                (this.selectedMixer.mountingMaterials || []).forEach(mat => {
                    if (service) return;
                    if (mat.name && mat.name.toLowerCase().includes('einbaukosten') && (mat.options || []).length) {
                        service = { label: mat.options[0].label, artNr: mat.options[0].artNr };
                    }
                });
                if (!service) {
                    // FULL-TEXT RULE: "Ablaufventil" is regularly truncated out of the label.
                    const txt = productText(this.selectedMixer);
                    const hasVentil = /ablaufventil/i.test(txt) && !/ohne\s+ablaufventil/i.test(txt);
                    service = hasVentil
                        ? { label: 'Einbaukosten, Einlocharmatur mit Ablaufventil, Zugventil, Nettopreis', artNr: '6000 011.000.000' }
                        : { label: 'Einbaukosten, Einlocharmatur ohne Exzenterventil, Nettopreis', artNr: '6000 013.000.000' };
                }
                items.push({ qty: 1, label: service.label, artNr: service.artNr });
            }

            // ---- G1 END: the spacer breaks the bundle for SAP ----
            items.push({ isSpacer: true });

            // ---- loose articles ----
            this.looseItems().forEach(z => items.push({ qty: z.qty, label: z.label, artNr: z.artNr }));

            if (this.showAccessoires && this.selectedAddonAccessoires.length) {
                this.selectedAddonAccessoires.forEach(a => items.push({ qty: a.qty || 1, label: a.label || a.name, artNr: a.artNr }));
            }

            return items;
        },

        updatePreview: function () {
            const container = document.getElementById('col_preview');
            if (!container) return;

            if (!this.selectedCeramic) {
                container.innerHTML = `
                    <div class="finder-empty-state">
                        <i class="ri-find-replace-line"></i>
                        <h2>Konfiguration starten</h2>
                        <p>Wählen Sie links ein Bidet und einen Bidetmischer, um eine Vorschau zu generieren.</p>
                    </div>`;
                return;
            }

            const c = this.selectedCeramic;
            const sku = this.skuFor(c, this.currentCeramicFarbe);
            container.innerHTML = `
                <div class="finder-preview-card slide-in" style="width: 100%; margin: 0;">
                    <div class="finder-preview-header" style="margin-bottom: 1.5rem;">
                        <img loading="lazy" decoding="async" src="${c.imgUrl}" class="preview-thumbnail" onerror="this.style.display='none'">
                        <div class="preview-header-info">
                            <h2 style="margin: 0 0 4px 0; font-size: 1.1rem; font-weight: 700;">${c.label}</h2>
                            <p style="color: var(--text-secondary); font-size: 0.8rem; margin-bottom: 10px;">Art-Nr: ${sku.artNr}</p>
                            <div style="display: flex; gap: 6px; flex-wrap: wrap;">
                                <span class="mini-badge blue">${this.extractMontage(c)}montage</span>
                                <span class="mini-badge gray" style="background: rgba(255,255,255,0.05);">Befestigung ${this.extractBefestigung(c)}</span>
                                ${c.ueberlauf === 'mit' ? '<span class="mini-badge gray" style="background: rgba(255,255,255,0.05);">Mit Überlauf</span>' : ''}
                            </div>
                        </div>
                    </div>
                    <div class="preview-details">
                        <div class="preview-bom-list" style="border-top: 1px solid var(--border); padding-top: 1.25rem;">
                            <h3 style="font-size: 0.75rem; margin-bottom: 0.75rem; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.5px; font-weight: 700;">Zusammenfassung</h3>
                            <div style="background: rgba(255,255,255,0.02); border-radius: 12px; padding: 0.75rem 1rem; border: 1px solid rgba(255,255,255,0.05); display: grid; grid-template-columns: 24px max-content 1fr; gap: 0.4rem 0.75rem; align-items: start; max-width: 900px;">
                                ${this.getBOMPreviewItems().map(item => item.isSpacer
                    ? '<div style="grid-column: 1 / -1; margin: 0.3rem 0; border-top: 1px dashed rgba(255,255,255,0.1);"></div>'
                    : `<div style="color: var(--text-secondary); font-size: 0.7rem; padding-top: 2px;">${item.qty}x</div>
                                       <div style="font-family: monospace; color: var(--accent); font-weight: 700; font-size: 0.76rem; white-space: nowrap; text-align: left;">${item.artNr}</div>
                                       <div style="font-weight: 500; color: var(--text-primary); line-height: 1.35; font-size: 0.76rem;">${item.label}</div>`).join('')}
                            </div>
                        </div>
                    </div>
                </div>`;
        },

        clearBOM: function () {
            bomTableBody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: #9da3ad; padding: 2rem;">Bitte wählen Sie ein Bidet.</td></tr>';
            bomCountCounter.textContent = "0 Artikel";
        },

        updateBOM: function () {
            const previewItems = this.getBOMPreviewItems();
            if (previewItems.length === 0) { this.clearBOM(); return; }

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
                        <td><div class="bom-desc">${item.label}</div></td>
                        <td><strong>${item.qty}</strong></td>
                    </tr>`;
                totalCount += item.qty;
            });

            bomTableBody.innerHTML = bomHtml;
            bomCountCounter.textContent = `${totalCount} Artikel`;
            priceBOM(bomTableBody);   // services (Einbaukosten) have no product price → "-"

            if (window.saveWishlist) window.saveWishlist();
        },

        // Copies ONLY the G1 set (Gürtelset → Bidet → Bidetmischer → Einbaukosten).
        copyToClipboard: function () {
            const previewItems = this.getBOMPreviewItems();
            if (previewItems.length === 0) { alert('Bitte konfigurieren Sie zuerst ein Bidet-Set.'); return; }

            const g1Items = [];
            for (const item of previewItems) {
                if (item.isSpacer) break;      // the spacer is G1 END
                g1Items.push(item);
            }
            if (g1Items.length === 0) { alert('Kein G1-Set vorhanden.'); return; }

            const textArray = g1Items.map(i => `${String(i.artNr || '').replace(/\t/g, '').trim()}\t${i.qty}`).join('\n');
            window.copyTextToClipboard(textArray).then(() => {
                alert("✅ G1-Set kopiert für SAP (" + g1Items.length + " Zeilen):\n\n" + textArray.replace(/\t/g, "    "));
            }).catch(() => alert("Kopieren fehlgeschlagen."));
        },

        // Copies ONLY the loose articles — paste SEPARATELY after the G1 set is closed.
        copyLooseItemsToClipboard: function () {
            const previewItems = this.getBOMPreviewItems();
            if (previewItems.length === 0) { alert('Bitte konfigurieren Sie zuerst ein Bidet-Set.'); return; }

            let pastSpacer = false;
            const looseItems = [];
            for (const item of previewItems) {
                if (item.isSpacer) { pastSpacer = true; continue; }
                if (pastSpacer) looseItems.push(item);
            }
            if (looseItems.length === 0) { alert('Keine losen Artikel vorhanden.'); return; }

            const textArray = looseItems.map(i => `${String(i.artNr || '').replace(/\t/g, '').trim()}\t${i.qty}`).join('\n');
            window.copyTextToClipboard(textArray).then(() => {
                alert("✅ Lose Artikel kopiert für SAP (" + looseItems.length + " Zeilen):\n\nBitte NACH dem G1-Set einfügen!\n\n" + textArray.replace(/\t/g, "    "));
            }).catch(() => alert("Kopieren fehlgeschlagen."));
        },
    };
}
