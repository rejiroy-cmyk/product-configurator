import { matchesSearchQuery, configSidebar, bomTableBody, bomCountCounter, getVariantColor, isRealImg, imgOf, applyPillUI, Ae, re, me, ke, Be, X, priceBOM, accessoryHersteller, accessorySerie } from './_shared.js';
import { COLOR_NAMES } from './_colorCodes.js';

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
        showSpiegel: false,
        showLichtspiegel: false,
        showSchraenke: false,
        showAccessoires: false,
        currentAccessoiresHersteller: 'all',
        currentAccessoiresSerie: 'all',
        currentSchraenkeFilter: 'all',   // 'all' | 'Hochschrank' | 'Seitenschrank'
        currentSchraenkeFarbe: 'all',    // colour name from the art-Nr finish code (COLOR_NAMES)
        currentSchraenkeBreite: 'all',   // width in cm (extractBreite)
        currentSchraenkeHoehe: 'all',    // height in cm (extractHoehe)
        currentMoebelFarbe: 'all',       // colour name from the art-Nr finish code (COLOR_NAMES)
        selectedMoebel: null,
        selectedSpiegelschrank: null,
        selectedSpiegel: null,
        selectedLichtspiegel: null,
        selectedSchraenke: null,
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
        currentFaucetFarbe: 'all',

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
            this.showSpiegel = false;
            this.showLichtspiegel = false;
            this.showSchraenke = false;
            this.showAccessoires = false;
            this.selectedMoebel = null;
            this.selectedSpiegelschrank = null;
            this.selectedSpiegel = null;
            this.selectedLichtspiegel = null;
            this.selectedSchraenke = null;
            this.currentSchraenkeFilter = 'all';
            this.currentSchraenkeFarbe = 'all';
            this.currentSchraenkeBreite = 'all';
            this.currentSchraenkeHoehe = 'all';
            this.currentMoebelFarbe = 'all';
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
            this.currentFaucetFarbe = 'all';

            ['Spiegelschrank', 'Spiegel', 'Lichtspiegel'].forEach(m => {
                this['current' + m + 'Brand'] = 'all';
                this['current' + m + 'Serie'] = 'all';
                this['current' + m + 'Breite'] = 'all';
                this['current' + m + 'Band'] = 'all';
                this['current' + m + 'Steckdose'] = 'all';
                this['current' + m + 'Lichtfarbe'] = 'all';
            });

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
            const manufacturer = (t.manufacturer || '').toLowerCase();

            // 1. Strip product-type prefixes
            const typeWords = [
                // furniture / basin prefixes FIRST (longest-match) so "Waschtischmöbel Alterna Calea S"
                // and "Auflegebecken Alterna Dinea" both reduce to the shared model series ("Calea"/"Dinea").
                'waschtischmöbel', 'waschtischunterschrank', 'waschtischunterbau', 'unterschrank', 'unterbau',
                'hochschrank', 'seitenschrank', 'mittelschrank', 'auflegewandbecken', 'auflegebecken',
                'spiegelschrank', 'spiegelkabinett', 'miroir', 'mirror',
                'doppelwaschtisch', 'möbelwaschtisch', 'aufsatzwaschbecken', 'aufsatzbecken',
                'auflegewaschtisch', 'wandbecken', 'handwaschbecken', 'waschtisch', 'becken', 'waschbecken',
                'wandmischer', 'einlochmischer', 'mischer', 'batterie', 'armatur',
                'papierhalter', 'reserverollenhalter', 'klosettbürstenhalter', 'wc-bürste',
                'seifenhalter', 'seifenspender', 'glashalter', 'doppelglashalter', 'handtuchhalter', 'handtuchring', 'handtuchhaken', 'badetuchstange', 'hakenleiste',
                'drahtseifenhalter', 'duschkorb', 'schwammhalter', 'accessoire'
            ];

            // FULL-TEXT RULE: parse the label for the leading series token; fall back to the
            // description when the label is truncated to nothing usable.
            const parse = (raw) => {
                let cleaned = (raw || '').trim().toLowerCase();
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
                if (manufacturer && cleaned.startsWith(manufacturer)) {
                    cleaned = cleaned.substring(manufacturer.length).trim();
                    if (['-', ':', '/', ','].includes(cleaned[0])) cleaned = cleaned.substring(1).trim();
                }
                const match = cleaned.match(/^(.*?)(?:\s+\d+\s*[xX]\s*\d+|\s*,|\s*\(|\s+-|\s+\d)/);
                return match && match[1] ? match[1].trim() : cleaned.trim();
            };
            let serie = parse(t.label || t.name) || parse(t.description);

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

        // Number of wash bowls (positions) on the basin → how many faucets /
        // Ablaufventile / Siphons the set needs. This is the BOWL count, NOT the
        // Armaturenloch (drill-hole) count: a single wide basin "mit 3 Armaturenlöcher"
        // is one bowl drilled for one 3-hole widespread mixer (→ 1), whereas a
        // "Reihenwaschtisch … mit 3 Armaturenlöcher" is three separate bowls (→ 3).
        // FULL-TEXT RULE: read label AND description.
        positionCount: function (obj) {
            const text = ((obj.label || '') + ' ' + (obj.description || '')).toLowerCase();
            if (text.includes('reihenwaschtisch')) {
                // A row: one bowl per Armaturenloch, e.g. "mit 3 Armaturenlöcher" → 3.
                const m = text.match(/(\d+)\s*(?:armaturenl|hahnl)/);
                return m ? parseInt(m[1], 10) : 1; // "ohne Armaturenlöcher" row → count unknown, fall back to 1
            }
            if (text.includes('doppelwaschtisch')) return 2; // always 2 bowls, regardless of hole count
            return 1;
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

            // FULL-TEXT RULE: infer from label AND description (`text`), not the label alone.
            if (text.includes('aufsatz') || text.includes('schale') || text.includes('countertop')) return 'ohne';
            if (text.includes('möbel') || text.includes('wandwaschtisch') || text.includes('waschtisch')) return 'mit';

            return 'unknown';
        },

        extractAblauf: function (obj) {
            // FULL-TEXT RULE: read label AND description.
            const label = ((obj.label || '') + ' ' + (obj.description || '')).toLowerCase();
            if (label.includes('ohne ablauf')) return 'ohne';
            if (label.includes('ablauf')) return 'mit';
            return 'ohne';
        },

        extractAbstellflaeche: function (obj) {
            if (obj.overrideAbstell && obj.overrideAbstell !== 'auto') return obj.overrideAbstell;
            // FULL-TEXT RULE: read label AND description.
            const label = ((obj.label || '') + ' ' + (obj.description || '')).toLowerCase();
            if (label.includes('abstellfläche links') || label.includes('ablage links')) return 'links';
            if (label.includes('abstellfläche rechts') || label.includes('ablage rechts')) return 'rechts';
            if (label.includes('abstellfläche beidseitig') || label.includes('ablage beidseitig')) return 'beidseitig';
            return 'ohne';
        },

        extractAusladung: function (obj) {
            // FULL-TEXT RULE: read label AND description.
            const label = (obj.label || '') + ' ' + (obj.description || '');
            const match = label.match(/(?:A\s|Ausladung\s*)([0-9]{2,3})\s*mm/i);
            if (match) return match[1];
            return 'unknown';
        },

        extractAuslauf: function (obj) {
            // FULL-TEXT RULE: read label AND description.
            const label = ((obj.label || '') + ' ' + (obj.description || '')).toLowerCase();
            if (label.includes('schwenkauslauf') || label.includes('schwenkbar')) return 'schwenkbar';
            if (label.includes('auslauf fest') || label.includes(' fest')) return 'fest';
            // some have "Auslauf" without specifying, assume fixed by default unless mentioned
            return 'fest';
        },

        extractBasinTyp: function (t) {
            // FULL-TEXT RULE: read label AND description.
            const lbl = ((t.label || '') + ' ' + (t.description || '')).toLowerCase();
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
            // FULL-TEXT RULE: width can be truncated off the label — read label AND description.
            const label = (obj.label || obj.name || '') + ' ' + (obj.description || '');
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

        extractHoehe: function (obj) {
            // FULL-TEXT RULE: height can be truncated off the label — read label AND description.
            const label = (obj.label || obj.name || '') + ' ' + (obj.description || '');
            // "Höhe 168 cm" / "Höhe 1680 mm" / "H 1680"
            const hMatch = label.match(/(?:Höhe|Hoehe|H)[:\s]+([\d,.]+)\s*(cm|mm)?/i);
            if (hMatch) {
                let val = hMatch[1].replace(',', '.');
                let unit = (hMatch[2] || 'mm').toLowerCase();
                if (unit === 'mm' || parseFloat(val) > 250) return (parseFloat(val) / 10).toString(); // mm or large val -> cm
                return val;
            }
            return 'unknown';
        },

        // Width in cm for MIRRORS (Spiegelschrank/Lichtspiegel/Spiegel). Handles "Breite N",
        // "N x N cm" (W×H → width is first) and "Ø N cm" (round → diameter is the width).
        // extractBreite can't read Ø/N×N, so use this for all mirror width logic. Returns null if unknown.
        extractMirrorWidth: function (obj) {
            const text = (obj.label || obj.name || '') + ' ' + (obj.description || '');
            let w = null;
            let m = text.match(/(?:Breite|B)[:\s]+([\d.,]+)\s*(cm|mm)?/i);
            if (m) { let v = parseFloat(m[1].replace(',', '.')); const u = (m[2] || '').toLowerCase(); if (u === 'mm' || v > 250) v = v / 10; w = Math.round(v); } // NB: no unit → cm (a "50" is 50 cm, not 5)
            else if ((m = text.match(/(\d+(?:[.,]\d+)?)\s*x\s*\d+(?:[.,]\d+)?\s*cm/i))) w = Math.round(parseFloat(m[1].replace(',', '.')));
            else if ((m = text.match(/ø\s*(\d+(?:[.,]\d+)?)\s*cm/i))) w = Math.round(parseFloat(m[1].replace(',', '.')));
            return (w !== null && w >= 20) ? w : null; // floor: nothing legit is < 20 cm (guards mis-parses)
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
                        <div class="finder-sub-header" id="head_faucet_farbe">Farbe</div>
                        <div class="pill-group" id="list_faucet_farbe"></div>
                        
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
                            <div class="addon-toggle-row" id="toggle_lichtspiegel">
                                <span class="addon-toggle-label"><i class="ri-lightbulb-line"></i> Lichtspiegel</span>
                                <button class="ios-toggle" data-target="lichtspiegel" aria-label="Lichtspiegel ein/aus"><span class="ios-toggle-knob"></span></button>
                            </div>
                            <div class="addon-toggle-row" id="toggle_spiegel">
                                <span class="addon-toggle-label"><i class="ri-square-line"></i> Spiegel</span>
                                <button class="ios-toggle" data-target="spiegel" aria-label="Spiegel ein/aus"><span class="ios-toggle-knob"></span></button>
                            </div>
                            <div class="addon-toggle-row" id="toggle_schraenke">
                                <span class="addon-toggle-label"><i class="ri-archive-drawer-line"></i> Hochschrank / Seitenschrank</span>
                                <button class="ios-toggle" data-target="schraenke" aria-label="Hochschrank / Seitenschrank ein/aus"><span class="ios-toggle-knob"></span></button>
                            </div>
                            <div class="addon-toggle-row" id="toggle_accessoires">
                                <span class="addon-toggle-label"><i class="ri-archive-line"></i> Accessoires</span>
                                <button class="ios-toggle" data-target="accessoires" aria-label="Accessoires ein/aus"><span class="ios-toggle-knob"></span></button>
                            </div>
                        </div>

                        <div id="addon_moebel_panel" class="addon-panel" style="display:none;">
                            <div class="finder-sub-header" id="moebel_farbe_header">Farbe</div>
                            <div class="pill-group" id="list_moebel_farbe" style="margin-bottom: 0.75rem;"></div>
                            <div class="finder-sub-header">Möbel wählen</div>
                            <div class="finder-list" id="list_addon_moebel"></div>
                        </div>
                        <div id="addon_schraenke_panel" class="addon-panel" style="display:none;">
                            <div class="finder-sub-header">Typ</div>
                            <div class="pill-group" id="list_schraenke_filter" style="margin-bottom: 0.75rem;"></div>
                            <div class="finder-sub-header" id="schraenke_farbe_header" style="display:none;">Farbe</div>
                            <div class="pill-group" id="list_schraenke_farbe" style="margin-bottom: 0.75rem; display:none;"></div>
                            <div class="finder-sub-header" id="schraenke_breite_header" style="display:none;">Breite</div>
                            <div class="pill-group" id="list_schraenke_breite" style="margin-bottom: 0.75rem; display:none;"></div>
                            <div class="finder-sub-header" id="schraenke_hoehe_header" style="display:none;">Höhe</div>
                            <div class="pill-group" id="list_schraenke_hoehe" style="margin-bottom: 0.75rem; display:none;"></div>
                            <div class="finder-sub-header">Schrank wählen</div>
                            <div class="finder-list" id="list_addon_schraenke"></div>
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
                        <div id="addon_lichtspiegel_panel" class="addon-panel" style="display:none;">
                            <div class="finder-sub-header" id="lichtspiegel_breite_header" style="display:none;">Breite</div>
                            <div class="pill-group" id="list_lichtspiegel_breite" style="margin-bottom: 0.75rem; display:none;"></div>
                            <div class="finder-sub-header" id="lichtspiegel_brand_header">Marke</div>
                            <div class="pill-group" id="list_lichtspiegel_brand" style="margin-bottom: 0.75rem;"></div>
                            <div class="finder-sub-header" id="lichtspiegel_serie_header">Serie</div>
                            <div class="pill-group" id="list_lichtspiegel_serie" style="margin-bottom: 0.75rem;"></div>
                            <div class="finder-sub-header" id="lichtspiegel_band_header" style="display:none;">Band</div>
                            <div class="pill-group" id="list_lichtspiegel_band" style="margin-bottom: 0.75rem; display:none;"></div>
                            <div class="finder-sub-header" id="lichtspiegel_steckdose_header" style="display:none;">Steckdose</div>
                            <div class="pill-group" id="list_lichtspiegel_steckdose" style="margin-bottom: 0.75rem; display:none;"></div>
                            <div class="finder-sub-header" id="lichtspiegel_lichtfarbe_header" style="display:none;">Lichtfarbe</div>
                            <div class="pill-group" id="list_lichtspiegel_lichtfarbe" style="margin-bottom: 0.75rem; display:none;"></div>
                            <div class="finder-sub-header">Modell wählen</div>
                            <div class="finder-list" id="list_addon_lichtspiegel"></div>
                        </div>
                        <div id="addon_spiegel_panel" class="addon-panel" style="display:none;">
                            <div class="finder-sub-header" id="spiegel_breite_header" style="display:none;">Breite</div>
                            <div class="pill-group" id="list_spiegel_breite" style="margin-bottom: 0.75rem; display:none;"></div>
                            <div class="finder-sub-header" id="spiegel_brand_header">Marke</div>
                            <div class="pill-group" id="list_spiegel_brand" style="margin-bottom: 0.75rem;"></div>
                            <div class="finder-sub-header" id="spiegel_serie_header">Serie</div>
                            <div class="pill-group" id="list_spiegel_serie" style="margin-bottom: 0.75rem;"></div>
                            <div class="finder-sub-header" id="spiegel_band_header" style="display:none;">Band</div>
                            <div class="pill-group" id="list_spiegel_band" style="margin-bottom: 0.75rem; display:none;"></div>
                            <div class="finder-sub-header" id="spiegel_steckdose_header" style="display:none;">Steckdose</div>
                            <div class="pill-group" id="list_spiegel_steckdose" style="margin-bottom: 0.75rem; display:none;"></div>
                            <div class="finder-sub-header" id="spiegel_lichtfarbe_header" style="display:none;">Lichtfarbe</div>
                            <div class="pill-group" id="list_spiegel_lichtfarbe" style="margin-bottom: 0.75rem; display:none;"></div>
                            <div class="finder-sub-header">Modell wählen</div>
                            <div class="finder-list" id="list_addon_spiegel"></div>
                        </div>
                        <div id="addon_accessoires_panel" class="addon-panel" style="display:none;">
                            <div class="finder-sub-header" id="addon_accessoires_hersteller_header" style="display:none;">Hersteller</div>
                            <div class="pill-group" id="list_addon_accessoires_hersteller" style="margin-bottom: 0.75rem; display:none;"></div>
                            <div class="finder-sub-header" id="addon_accessoires_serie_header">Kategorie</div>
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

            // Faceted filtering: each pill group offers only values that still yield results
            // given ALL OTHER active basin filters — so Serie ⇄ Breite ⇄ Hahnloch ⇄ … all narrow
            // each other (both directions), not just top-down. facetSet(k) = the trays passing
            // every active filter EXCEPT k (so group k keeps its own options while the rest prune).
            const facetFns = {
                brand: t => (t.manufacturer || 'Andere') === this.currentBasinBrand,
                type: t => this.extractBasinTyp(t) === this.currentBasinType,
                serie: t => this.extractSerie(t) === this.currentBasinSerie,
                breite: t => this.extractBreite(t) === this.currentBasinBreite,
                hahnloch: t => this.extractHahnloch(t) === this.currentBasinHahnloch,
                ueberlauf: t => this.extractUeberlauf(t) === this.currentBasinUeberlauf,
                abstell: t => this.extractAbstellflaeche(t) === this.currentBasinAbstell,
            };
            const curKey = { brand: 'currentBasinBrand', type: 'currentBasinType', serie: 'currentBasinSerie', breite: 'currentBasinBreite', hahnloch: 'currentBasinHahnloch', ueberlauf: 'currentBasinUeberlauf', abstell: 'currentBasinAbstell' };
            const facetSet = (except) => this.basinTrays.filter(t => Object.keys(facetFns).every(k => k === except || this[curKey[k]] === 'all' || facetFns[k](t)));
            const valOf = { brand: t => (t.manufacturer || 'Andere'), type: t => this.extractBasinTyp(t), serie: t => this.extractSerie(t), breite: t => this.extractBreite(t), hahnloch: t => this.extractHahnloch(t), ueberlauf: t => this.extractUeberlauf(t), abstell: t => this.extractAbstellflaeche(t) };
            // Drop any active selection another filter has made impossible (validate vs all
            // OTHERS). The just-clicked facet (_lastBasinFacet) is protected — it stays and the
            // OTHER conflicting filters reset instead, so a fresh click always takes effect.
            Object.keys(facetFns).forEach(k => {
                if (k === this._lastBasinFacet) return;
                const cur = this[curKey[k]];
                if (cur !== 'all' && !facetSet(k).some(t => valOf[k](t) === cur)) this[curKey[k]] = 'all';
            });

            // 1. Hersteller (Brand)
            const brands = [...new Set(facetSet('brand').map(t => t.manufacturer || 'Andere'))].sort();
            brandList.innerHTML = `<button class="pill-btn ${this.currentBasinBrand === 'all' ? 'active' : ''}" data-val="all">Alle</button>` + brands.map(b => `
                <button class="pill-btn ${this.currentBasinBrand === b ? 'active' : ''}" data-val="${b}">${b}</button>
            `).join('');
            applyPillUI('head_basin_brand', 'list_basin_brand', this.currentBasinBrand, 'Hersteller', () => {
                this.currentBasinBrand = 'all';
                this.updateBasinTiers();
            });

            // 2. Ausführung (Typ)
            const types = [...new Set(facetSet('type').map(t => this.extractBasinTyp(t)))].sort();
            typeList.innerHTML = `<button class="pill-btn ${this.currentBasinType === 'all' ? 'active' : ''}" data-val="all">Alle</button>` + types.map(t => `
                <button class="pill-btn ${this.currentBasinType === t ? 'active' : ''}" data-val="${t}">${t}</button>
            `).join('');
            applyPillUI('head_basin_type', 'list_basin_type', this.currentBasinType, 'Ausführung', () => {
                this.currentBasinType = 'all';
                this.updateBasinTiers();
            });

            // 3. Serie
            if (serieFilterList) {
                const series = [...new Set(facetSet('serie').map(t => this.extractSerie(t)))].sort();
                serieFilterList.innerHTML = `<button class="pill-btn ${this.currentBasinSerie === 'all' ? 'active' : ''}" data-val="all">Alle</button>` +
                    series.map(s => `<button class="pill-btn ${this.currentBasinSerie === s ? 'active' : ''}" data-val="${s}">${s}</button>`).join('');
                applyPillUI('head_basin_serie_filter', 'list_basin_serie_filter', this.currentBasinSerie, 'Serie', () => {
                    this.currentBasinSerie = 'all';
                    this.updateBasinTiers();
                });
            }

            // 4. Breite
            if (breiteList) {
                const breiten = [...new Set(facetSet('breite').map(t => this.extractBreite(t)))].filter(b => b !== 'unknown').sort((a, b) => parseFloat(a) - parseFloat(b));
                breiteList.innerHTML = `<button class="pill-btn ${this.currentBasinBreite === 'all' ? 'active' : ''}" data-val="all">Alle</button>` +
                    breiten.map(b => `<button class="pill-btn ${this.currentBasinBreite === b ? 'active' : ''}" data-val="${b}">${b} cm</button>`).join('');
                applyPillUI('head_basin_breite', 'list_basin_breite', this.currentBasinBreite, 'Breite', () => {
                    this.currentBasinBreite = 'all';
                    this.updateBasinTiers();
                });
            }

            // 5. Hahnloch
            const hahnAvail = new Set(facetSet('hahnloch').map(t => this.extractHahnloch(t)));
            const HAHN = [['ohne', 'Ohne'], ['1', '1 Loch'], ['2', '2 Löcher'], ['3', '3 Löcher']];
            hahnlochList.innerHTML = `<button class="pill-btn ${this.currentBasinHahnloch === 'all' ? 'active' : ''}" data-val="all">Alle</button>` +
                HAHN.filter(([v]) => hahnAvail.has(v)).map(([v, l]) => `<button class="pill-btn ${this.currentBasinHahnloch === v ? 'active' : ''}" data-val="${v}">${l}</button>`).join('');
            applyPillUI('head_basin_hahnloch', 'list_basin_hahnloch', this.currentBasinHahnloch, 'Armaturenloch', () => {
                this.currentBasinHahnloch = 'all';
                this.updateBasinTiers();
            });

            // 6. Überlauf
            const uebAvail = new Set(facetSet('ueberlauf').map(t => this.extractUeberlauf(t)));
            const UEB = [['mit', 'Mit'], ['ohne', 'Ohne']];
            ueberlaufList.innerHTML = `<button class="pill-btn ${this.currentBasinUeberlauf === 'all' ? 'active' : ''}" data-val="all">Alle</button>` +
                UEB.filter(([v]) => uebAvail.has(v)).map(([v, l]) => `<button class="pill-btn ${this.currentBasinUeberlauf === v ? 'active' : ''}" data-val="${v}">${l}</button>`).join('');
            applyPillUI('head_basin_ueberlauf', 'list_basin_ueberlauf', this.currentBasinUeberlauf, 'Überlauf', () => {
                this.currentBasinUeberlauf = 'all';
                this.updateBasinTiers();
            });

            // 7. Abstellflaeche
            const abstAvail = new Set(facetSet('abstell').map(t => this.extractAbstellflaeche(t)));
            const ABST = [['ohne', 'Standard'], ['links', 'Links'], ['rechts', 'Rechts'], ['beidseitig', 'Beidseitig']];
            abstellList.innerHTML = `<button class="pill-btn ${this.currentBasinAbstell === 'all' ? 'active' : ''}" data-val="all">Alle</button>` +
                ABST.filter(([v]) => abstAvail.has(v)).map(([v, l]) => `<button class="pill-btn ${this.currentBasinAbstell === v ? 'active' : ''}" data-val="${v}">${l}</button>`).join('');
            applyPillUI('head_basin_abstell', 'list_basin_abstell', this.currentBasinAbstell, 'Abstellfläche', () => {
                this.currentBasinAbstell = 'all';
                this.updateBasinTiers();
            });

            // Final result list = all active filters applied.
            let f8 = facetSet(null);
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
                const imgHTML = t.imgUrl ? `<img loading="lazy" decoding="async" src="${t.imgUrl}" style="width:36px; height:36px; object-fit:contain; background:white; border-radius:4px; border:1px solid rgba(0,0,0,0.1);" onerror="this.style.display='none'">` : '';
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

            // Bind Clicks. Record which facet the user just clicked so the faceted validation
            // keeps THAT choice and clears any older filter it conflicts with (the click wins).
            typeList.querySelectorAll('.pill-btn').forEach(el => {
                el.addEventListener('click', () => {
                    this.currentBasinType = el.dataset.val; this._lastBasinFacet = 'type';
                    this.updateBasinTiers();
                });
            });
            brandList.querySelectorAll('.pill-btn').forEach(el => {
                el.addEventListener('click', () => {
                    this.currentBasinBrand = el.dataset.val; this._lastBasinFacet = 'brand';
                    this.updateBasinTiers();
                });
            });
            if (serieFilterList) {
                serieFilterList.querySelectorAll('.pill-btn').forEach(el => {
                    el.addEventListener('click', () => {
                        this.currentBasinSerie = el.dataset.val; this._lastBasinFacet = 'serie';
                        this.updateBasinTiers();
                    });
                });
            }
            if (breiteList) {
                breiteList.querySelectorAll('.pill-btn').forEach(el => {
                    el.addEventListener('click', () => {
                        this.currentBasinBreite = el.dataset.val; this._lastBasinFacet = 'breite';
                        this.updateBasinTiers();
                    });
                });
            }
            hahnlochList.querySelectorAll('.pill-btn').forEach(el => {
                el.addEventListener('click', () => {
                    this.currentBasinHahnloch = el.dataset.val; this._lastBasinFacet = 'hahnloch';
                    this.updateBasinTiers();
                });
            });
            ueberlaufList.querySelectorAll('.pill-btn').forEach(el => {
                el.addEventListener('click', () => {
                    this.currentBasinUeberlauf = el.dataset.val; this._lastBasinFacet = 'ueberlauf';
                    this.updateBasinTiers();
                });
            });
            abstellList.querySelectorAll('.pill-btn').forEach(el => {
                el.addEventListener('click', () => {
                    this.currentBasinAbstell = el.dataset.val; this._lastBasinFacet = 'abstell';
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
            const brand = (t.manufacturer || '').toLowerCase();
            const skipWords = [
                'einlochmischer', 'waschtischmischer', 'waschtischbatterie', 'batterie',
                'mischer', 'armatur', 'wandmischer', 'standmischer', 'm.', 'm', 'waschtisch-',
                'u-mischer', 'aufbau', brand, 'hansgrohe', 'axor', 'laufen', 'alterna', 'gessi', 'kwc',
                'auslauf', 'fest', 'schwenkbar', 'mit', 'ohne', 'ablaufventil',
                'endmontageset', 'fertigset', 'fertigbauset'
            ];
            // FULL-TEXT RULE: parse the label's leading segment for the series; fall back to the
            // description when the label is truncated to nothing usable.
            const parse = (raw) => {
                let lbl = (raw || '').split(',')[0].trim();
                lbl = lbl.replace(/\bA\s*\d+/i, '').trim();
                let remainingWords = lbl.split(/\s+/).filter(w => {
                    let clean = w.toLowerCase().replace(/[^a-z0-9-]/g, '');
                    if (!clean) return false;
                    if (skipWords.includes(clean)) return false;
                    return true;
                });
                let serie = remainingWords.join(' ');
                return serie.replace(/(ComfortZone|CoolStart|EcoSmart|Normalstrahl|Waterfall|WaterfallStream).*/i, '').trim();
            };
            let serie = parse(t.label) || parse(t.description);

            return serie || 'Andere';
        },

        updateFaucetTiers: function () {
            const brandList = document.getElementById('list_faucet_brand');
            const typeList = document.getElementById('list_faucet_type');
            const farbeList = document.getElementById('list_faucet_farbe');
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
                // FULL-TEXT RULE: read label AND description.
                const lbl = ((t.label || '') + ' ' + (t.description || '')).toLowerCase();
                if (lbl.includes('einbaukörper') || lbl.includes('grundkörper')) {
                    if (!lbl.includes('ohne') && !lbl.includes('fertigset') && !lbl.includes('endmontageset') && !lbl.includes('mischer') && !lbl.includes('batterie')) return false;
                }
                if (lbl.includes('einbaukosten')) return false;
                return true;
            });

            // 2. Apply Rule 1, 2, 3, 4
            faucets = faucets.filter(t => {
                // FULL-TEXT RULE: read label AND description.
                const lbl = ((t.label || '') + ' ' + (t.description || '')).toLowerCase();
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

            // Faceted filtering (same model as the basin column): every Armatur facet —
            // Hersteller / Typ / Farbe / Serie / Ausladung / Auslauf / Ablaufventil — narrows
            // every other, both directions, over the basin-compatible pool `faucets`.
            // fset(k) = trays passing all active filters EXCEPT k. Farbe is multi-valued
            // (a tray's base + variant finish colours from the art-Nr code).
            const faucetColourOf = (art) => { const m = String(art || '').match(/\.(\d{3})(?:\.|$)/); return m ? (COLOR_NAMES[m[1]] || null) : null; };
            const faucetColours = (t) => [...new Set([faucetColourOf(t.artNr), ...((t.variants || []).map(v => faucetColourOf(v.artNr)))].filter(Boolean))];
            const ffns = {
                brand: t => (t.manufacturer || 'Andere') === this.currentFaucetBrand,
                type: t => this.extractFaucetAusfuehrung(t) === this.currentFaucetType,
                farbe: t => faucetColours(t).includes(this.currentFaucetFarbe),
                serie: t => this.extractFaucetSerie(t) === this.currentFaucetSerie,
                ausl: t => this.extractAusladung(t) === this.currentFaucetAusladung,
                auslauf: t => this.extractAuslauf(t) === this.currentFaucetAuslauf,
                ablauf: t => this.extractAblauf(t) === this.currentFaucetAblauf,
            };
            const fcur = { brand: 'currentFaucetBrand', type: 'currentFaucetType', farbe: 'currentFaucetFarbe', serie: 'currentFaucetSerie', ausl: 'currentFaucetAusladung', auslauf: 'currentFaucetAuslauf', ablauf: 'currentFaucetAblauf' };
            const fset = (except) => faucets.filter(t => Object.keys(ffns).every(k => k === except || this[fcur[k]] === 'all' || ffns[k](t)));
            const fval = { brand: t => (t.manufacturer || 'Andere'), type: t => this.extractFaucetAusfuehrung(t), serie: t => this.extractFaucetSerie(t), ausl: t => this.extractAusladung(t), auslauf: t => this.extractAuslauf(t), ablauf: t => this.extractAblauf(t) };
            // Drop a selection another filter made impossible; protect the just-clicked facet.
            Object.keys(ffns).forEach(k => {
                if (k === this._lastFaucetFacet) return;
                const cur = this[fcur[k]];
                if (cur === 'all') return;
                const ok = k === 'farbe' ? fset(k).some(t => faucetColours(t).includes(cur)) : fset(k).some(t => fval[k](t) === cur);
                if (!ok) this[fcur[k]] = 'all';
            });

            // 1. Hersteller
            const brands = [...new Set(fset('brand').map(t => t.manufacturer || 'Andere'))].sort();
            brandList.innerHTML = `<button class="pill-btn ${this.currentFaucetBrand === 'all' ? 'active' : ''}" data-val="all">Alle</button>` + brands.map(b => `
                <button class="pill-btn ${this.currentFaucetBrand === b ? 'active' : ''}" data-val="${b}">${b}</button>
            `).join('');
            applyPillUI('head_faucet_brand', 'list_faucet_brand', this.currentFaucetBrand, 'Hersteller', () => {
                this.currentFaucetBrand = 'all';
                this.updateFaucetTiers();
            });

            // 2. Typ
            const types = [...new Set(fset('type').map(t => this.extractFaucetAusfuehrung(t)))].sort();
            typeList.innerHTML = `<button class="pill-btn ${this.currentFaucetType === 'all' ? 'active' : ''}" data-val="all">Alle</button>` + types.map(t => `
                <button class="pill-btn ${this.currentFaucetType === t ? 'active' : ''}" data-val="${t}">${t}</button>
            `).join('');
            applyPillUI('head_faucet_type', 'list_faucet_type', this.currentFaucetType, 'Typ', () => {
                this.currentFaucetType = 'all';
                this.updateFaucetTiers();
            });

            // 2b. Farbe — union of base + variant finish colours across the faceted set.
            const farben = [...new Set(fset('farbe').flatMap(faucetColours))].sort((a, b) => a.localeCompare(b));
            if (farbeList) {
                farbeList.innerHTML = `<button class="pill-btn ${this.currentFaucetFarbe === 'all' ? 'active' : ''}" data-val="all">Alle</button>` + farben.map(c => `
                <button class="pill-btn ${this.currentFaucetFarbe === c ? 'active' : ''}" data-val="${c}">${c}</button>
            `).join('');
                applyPillUI('head_faucet_farbe', 'list_faucet_farbe', this.currentFaucetFarbe, 'Farbe', () => {
                    this.currentFaucetFarbe = 'all';
                    this.updateFaucetTiers();
                });
            }

            // 3. Serie
            const series = [...new Set(fset('serie').map(t => this.extractFaucetSerie(t)))].filter(s => s !== 'Andere').sort();
            serieList.innerHTML = `<button class="pill-btn ${this.currentFaucetSerie === 'all' ? 'active' : ''}" data-val="all">Alle</button>` + series.map(s => `
                <button class="pill-btn ${this.currentFaucetSerie === s ? 'active' : ''}" data-val="${s}">${s}</button>
            `).join('');
            applyPillUI('head_faucet_serie', 'list_faucet_serie', this.currentFaucetSerie, 'Serie', () => {
                this.currentFaucetSerie = 'all';
                this.updateFaucetTiers();
            });

            // 4. Ausladung
            const ausladungen = [...new Set(fset('ausl').map(t => this.extractAusladung(t)))].filter(a => a !== 'unknown').sort((a, b) => parseInt(a) - parseInt(b));
            auslList.innerHTML = `<button class="pill-btn ${this.currentFaucetAusladung === 'all' ? 'active' : ''}" data-val="all">Alle</button>` + ausladungen.map(a => `
                <button class="pill-btn ${this.currentFaucetAusladung === a ? 'active' : ''}" data-val="${a}">${a} mm</button>
            `).join('');
            applyPillUI('head_faucet_ausl', 'list_faucet_ausl', this.currentFaucetAusladung, 'Ausladung', () => {
                this.currentFaucetAusladung = 'all';
                this.updateFaucetTiers();
            });

            // 5. Auslauf
            const auslaeufe = [...new Set(fset('auslauf').map(t => this.extractAuslauf(t)))].filter(a => a !== 'unknown').sort();
            auslaufList.innerHTML = `<button class="pill-btn ${this.currentFaucetAuslauf === 'all' ? 'active' : ''}" data-val="all">Alle</button>` + auslaeufe.map(a => `
                <button class="pill-btn ${this.currentFaucetAuslauf === a ? 'active' : ''}" data-val="${a}">${a.charAt(0).toUpperCase() + a.slice(1)}</button>
            `).join('');
            applyPillUI('head_faucet_auslauf', 'list_faucet_auslauf', this.currentFaucetAuslauf, 'Auslauf', () => {
                this.currentFaucetAuslauf = 'all';
                this.updateFaucetTiers();
            });

            // 6. Ablaufventil
            const ablaeufe = [...new Set(fset('ablauf').map(t => this.extractAblauf(t)))].filter(a => a !== 'unknown').sort();
            ablaufList.innerHTML = `<button class="pill-btn ${this.currentFaucetAblauf === 'all' ? 'active' : ''}" data-val="all">Alle</button>` + ablaeufe.map(a => `
                <button class="pill-btn ${this.currentFaucetAblauf === a ? 'active' : ''}" data-val="${a}">${a.charAt(0).toUpperCase() + a.slice(1)}</button>
            `).join('');
            applyPillUI('head_faucet_ablauf', 'list_faucet_ablauf', this.currentFaucetAblauf, 'Ablaufventil', () => {
                this.currentFaucetAblauf = 'all';
                this.updateFaucetTiers();
            });

            // Bind Events. Record which facet was clicked so the faceted validation keeps that
            // choice and clears any older filter it conflicts with (the click wins).
            [brandList, typeList, farbeList, serieList, auslList, auslaufList, ablaufList].forEach(list => {
                if (!list) return;
                list.querySelectorAll('.pill-btn').forEach(btn => {
                    btn.addEventListener('click', () => {
                        const target = list.id.replace('list_faucet_', '');
                        const val = btn.dataset.val;
                        if (target === 'brand') this.currentFaucetBrand = val;
                        else if (target === 'type') this.currentFaucetType = val;
                        else if (target === 'farbe') this.currentFaucetFarbe = val;
                        else if (target === 'serie') this.currentFaucetSerie = val;
                        else if (target === 'ausl') this.currentFaucetAusladung = val;
                        else if (target === 'auslauf') this.currentFaucetAuslauf = val;
                        else if (target === 'ablauf') this.currentFaucetAblauf = val;
                        this._lastFaucetFacet = target;

                        this.updateFaucetTiers();
                        // Colour change must re-emit the selected faucet's SKU in the BOM.
                        if (target === 'farbe' && this.selectedFaucet) this.updatePreview();
                    });
                });
            });

            let f7 = fset(null);
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

                // Show the art-Nr (+ image) for the colour picked in the Farbe filter, so the
                // tile matches what the BOM will emit. Falls back to the base when Farbe='Alle'
                // or the tile has no variant in that colour. (Serie/tags are colour-invariant.)
                let dispArt = t.artNr, dispImg = t.imgUrl;
                if (this.currentFaucetFarbe && this.currentFaucetFarbe !== 'all' && faucetColourOf(t.artNr) !== this.currentFaucetFarbe) {
                    const dv = (t.variants || []).find(v => faucetColourOf(v.artNr) === this.currentFaucetFarbe);
                    if (dv) { dispArt = dv.artNr; if (dv.imgUrl) dispImg = dv.imgUrl; }
                }

                const tags = [];
                if (ausladung !== 'unknown') tags.push(`<span style="background: var(--bg-subtle); padding: 2px 6px; border-radius: 4px; border: 1px solid var(--border);">${ausladung} mm</span>`);
                if (ablauf === 'mit') tags.push(`<span style="background: var(--bg-subtle); padding: 2px 6px; border-radius: 4px; border: 1px solid var(--border);">mit Ablaufventil</span>`);
                if (ablauf === 'ohne') tags.push(`<span style="background: var(--bg-subtle); padding: 2px 6px; border-radius: 4px; border: 1px solid var(--border);">ohne Ablaufventil</span>`);
                const tagsHTML = tags.length > 0 ? `<div style="display:flex; flex-wrap:wrap; gap: 0.3rem; font-size: 0.65rem; color: var(--text-secondary); margin-top: 0.3rem;">${tags.join('')}</div>` : '';

                const imgHTML = dispImg ? `<img loading="lazy" decoding="async" src="${dispImg}" style="width:54px; height:54px; object-fit:contain; background:white; border-radius:6px; border:1px solid rgba(0,0,0,0.1); padding: 2px; flex-shrink: 0;" onerror="this.style.display='none'">` : '';
                return `
                <div class="finder-item ${this.selectedFaucet && this.selectedFaucet.id === t.id ? 'active' : ''}" data-id="${t.id}" style="padding: 0.75rem;">
                    <div style="display:flex; align-items:flex-start; gap: 0.75rem;">
                        ${imgHTML}
                        <div style="display:flex; flex-direction:column; gap: 0.15rem; flex: 1;">
                            <span style="font-weight:600; font-size:0.9rem;">${this.extractFaucetSerie(t)}</span>
                            <span style="font-size:0.75rem; color:var(--text-secondary); font-family:monospace;">${dispArt}</span>
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
            const targets = ['moebel', 'spiegelschrank', 'lichtspiegel', 'spiegel', 'schraenke', 'accessoires'];
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
                            if (t === 'moebel') { this.selectedMoebel = null; this.currentMoebelFarbe = 'all'; }
                            if (t === 'spiegelschrank') this.selectedSpiegelschrank = null;
                            if (t === 'spiegel') this.selectedSpiegel = null;
                            if (t === 'lichtspiegel') this.selectedLichtspiegel = null;
                            if (t === 'schraenke') { this.selectedSchraenke = null; this.currentSchraenkeFilter = 'all'; this.currentSchraenkeFarbe = 'all'; this.currentSchraenkeBreite = 'all'; this.currentSchraenkeHoehe = 'all'; }
                            if (t === 'accessoires') {
                                this.selectedAccessoires = [];
                                this.currentAccessoiresHersteller = 'all';
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

            // Hochschrank / Seitenschrank — self-contained (free-standing furniture by productType tag,
            // with a 2-value Typ filter pill). Independent of the mirror/moebel basin-matching logic.
            if (target === 'schraenke') {
                const pool = (window.productApps.zubehoer_pool && window.productApps.zubehoer_pool.trays) || [];
                let cands = pool.filter(t => t.productType === 'Hochschrank' || t.productType === 'Seitenschrank');
                const pillEl = document.getElementById('list_schraenke_filter');
                if (pillEl) {
                    const opts = [['all', 'Alle'], ['Hochschrank', 'Hochschrank'], ['Seitenschrank', 'Seitenschrank']];
                    pillEl.innerHTML = opts.map(([v, l]) => `<button class="pill-btn ${this.currentSchraenkeFilter === v ? 'active' : ''}" data-val="${v}">${l}</button>`).join('');
                    pillEl.querySelectorAll('.pill-btn').forEach(b => b.addEventListener('click', () => {
                        this.currentSchraenkeFilter = b.dataset.val;
                        this.populateAddonPanel('schraenke');
                    }));
                }
                if (this.currentSchraenkeFilter !== 'all') cands = cands.filter(t => t.productType === this.currentSchraenkeFilter);
                const seen = new Set();
                cands = cands.filter(c => { if (!c.artNr || seen.has(c.artNr)) return false; seen.add(c.artNr); return true; });

                // Farbe / Breite / Höhe filters — cascade in order. Farbe derives from the art-Nr
                // finish code (COLOR_NAMES), exactly like the Möbel Farbe filter (colour RULE: never
                // from label text). Each pill shows only when >1 value exists; choosing one narrows
                // the next filter's options.
                const schrankFarbeOf = (c) => { const m = String(c.artNr || '').match(/\.(\d{3})(?:\.|$)/); return m ? (COLOR_NAMES[m[1]] || null) : null; };
                const renderSchrankFilter = (getVal, stateKey, listId, headerId, label, numeric, suffix) => {
                    const vals = [...new Set(cands.map(getVal).filter(v => v && v !== 'unknown'))]
                        .sort((a, b) => numeric ? (parseFloat(a) - parseFloat(b)) : a.localeCompare(b));
                    if (this[stateKey] !== 'all' && !vals.includes(this[stateKey])) this[stateKey] = 'all';
                    const el = document.getElementById(listId);
                    const hdr = document.getElementById(headerId);
                    const show = vals.length > 1;
                    if (el) {
                        el.innerHTML = `<button class="pill-btn ${this[stateKey] === 'all' ? 'active' : ''}" data-val="all">Alle</button>` +
                            vals.map(v => `<button class="pill-btn ${this[stateKey] === v ? 'active' : ''}" data-val="${v}">${v}${suffix || ''}</button>`).join('');
                        el.querySelectorAll('.pill-btn').forEach(b => b.addEventListener('click', () => { this[stateKey] = b.dataset.val; this.populateAddonPanel('schraenke'); }));
                        el.style.display = show ? '' : 'none';
                    }
                    if (hdr) hdr.style.display = show ? '' : 'none';
                    if (show) applyPillUI(headerId, listId, this[stateKey], label, () => { this[stateKey] = 'all'; this.populateAddonPanel('schraenke'); });
                    if (this[stateKey] !== 'all') cands = cands.filter(c => getVal(c) === this[stateKey]);
                };
                renderSchrankFilter(schrankFarbeOf, 'currentSchraenkeFarbe', 'list_schraenke_farbe', 'schraenke_farbe_header', 'Farbe', false, '');
                renderSchrankFilter((c) => this.extractBreite(c), 'currentSchraenkeBreite', 'list_schraenke_breite', 'schraenke_breite_header', 'Breite', true, ' cm');
                renderSchrankFilter((c) => this.extractHoehe(c), 'currentSchraenkeHoehe', 'list_schraenke_hoehe', 'schraenke_hoehe_header', 'Höhe', true, ' cm');

                if (!cands.length) { listEl.innerHTML = '<div class="finder-empty-state" style="font-size:0.8rem;">Keine Schränke gefunden.</div>'; return; }
                listEl.innerHTML = cands.map(c => {
                    const sel = this.selectedSchraenke === c.artNr;
                    const img = imgOf(c);
                    return `<div class="finder-item ${sel ? 'active' : ''}" data-artnr="${c.artNr}" title="${c.artNr}">
                        <div style="display:flex; align-items:center; gap:0.5rem; overflow:hidden;">
                            ${img ? `<img loading="lazy" decoding="async" src="${img}" style="width:32px;height:32px;object-fit:contain;background:#fff;border-radius:4px;padding:2px;flex-shrink:0;" onerror="this.style.visibility='hidden'">` : `<div style="width:32px;height:32px;background:var(--bg-surface);border-radius:4px;flex-shrink:0;"></div>`}
                            <div style="min-width:0; overflow:hidden;">
                                <div style="font-size:0.8rem;font-weight:500;line-height:1.3;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;">${this.cleanLabel(c)}</div>
                                <div style="font-size:0.7rem;color:var(--text-secondary);font-family:monospace;margin-top:2px;">${c.artNr} · ${c.productType}</div>
                            </div>
                        </div>
                        ${sel ? '<i class="ri-check-line" style="margin-left:auto;color:var(--accent);flex-shrink:0;"></i>' : ''}
                    </div>`;
                }).join('');
                listEl.querySelectorAll('.finder-item').forEach(el => el.addEventListener('click', () => {
                    const a = el.dataset.artnr;
                    this.selectedSchraenke = this.selectedSchraenke === a ? null : a;
                    this.populateAddonPanel('schraenke');
                    this.updatePreview();
                }));
                return;
            }

            // Build the keyword map for each toggle category
            const keywordMap = {
                moebel: ['möbel', 'meuble', 'unterschrank', 'waschtischunterschrank', 'schrankunterschrank'],
                spiegelschrank: ['spiegelschrank', 'spiegelkabinett', 'miroir', 'mirror', ' mirror '],
                lichtspiegel: ['lichtspiegel'],
                spiegel: [], // matched purely by productType tag (avoids catching Spiegelschrank/Lichtspiegel)
                accessoires: ['accessoire', 'seifenhalter', 'seifenspender', 'glashalter', 'doppelglashalter', 'handtuchhalter', 'handtuchring', 'handtuchhaken', 'hakenleiste'],
                accessoires_wc: ['papierhalter', 'reserverollenhalter', 'klosettbürstenhalter', 'wc-bürste'],
                accessoires_dusche: ['drahtseifenhalter', 'duschkorb', 'badetuchstange', 'schwammhalter']
            };

            const keywords = keywordMap[target] || [];
            // Mirror toggles share one code path; candidates are matched by the productType tag
            // (with a keyword fallback so the legacy CSV Spiegelschränke without a tag still match).
            const MIRROR_TARGETS = ['spiegelschrank', 'spiegel', 'lichtspiegel'];
            const MIRROR_PTYPE = { spiegelschrank: 'Spiegelschrank', spiegel: 'Spiegel', lichtspiegel: 'Lichtspiegel' };
            const isMirror = MIRROR_TARGETS.includes(target);

            // 1. Search all app data for matching products (Gather Base Candidates)
            let baseCandidates = [];
            let allSpiegelschrankCandidates = []; // For width fallback logic (per mirror target)
            const allApps = window.productApps || {};
            Object.values(allApps).forEach(app => {
                // Relational apps use 'trays', Mix & Match uses 'basinTrays'/'faucets'
                const items = app.trays || app.basinTrays || app.faucets || [];
                items.forEach(t => {
                    const lbl = (t.label || t.name || '').toLowerCase();
                    const matched = isMirror
                        ? (t.productType === MIRROR_PTYPE[target] || (keywords.length > 0 && keywords.some(k => lbl.includes(k))))
                        : keywords.some(k => lbl.includes(k));
                    if (matched) {
                        if (isMirror) {
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

                                // Parse for "zu 2112 409 / 410 / ..." — FULL-TEXT RULE: the zu-reference
                                // regularly lives only in the description (labels are truncated).
                                const zuMatch = ((t.label || '') + ' ' + (t.description || '')).match(/zu\s+([\d\s\/]+)/i);
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

                            // 1.5 Rule for ALL mirror toggles: match the basin width. Perfect matches (±3cm)
                            // are collected here; the next-smaller/larger NEIGHBOUR sizes are supplemented
                            // after the scan (see 1.8). Uses extractMirrorWidth (Ø / N×N / Breite).
                            if (isMirror) {
                                const bW = this.extractMirrorWidth(this.selectedBasin);
                                const cW = this.extractMirrorWidth(t);

                                if (bW !== null && cW !== null) {
                                    // Save all valid mirrors (with a width) for the neighbour supplement
                                    allSpiegelschrankCandidates.push({ item: t, width: cW });

                                    // Allow up to 3cm difference (e.g. 78cm quattro luci for 80cm basin)
                                    if (Math.abs(bW - cW) > 3) return;
                                    // If width matches or is close, we consider it a found match
                                    matchFound = true;
                                } else if (bW !== null) {
                                    // Basin has a width, but the mirror width is unreadable? Skip it to be safe.
                                    return;
                                }
                            }

                            // 2. Fallback to Series match — Möbel only (mirrors are matched by width)
                            if (!matchFound && target === 'moebel') {
                                const basinSerie = this.extractSerie(this.selectedBasin).toLowerCase();
                                const tSerie = this.extractSerie(t).toLowerCase();
                                if (!tSerie.includes(basinSerie) && !basinSerie.includes(tSerie)) return;
                            }
                        }
                        baseCandidates.push(t);
                    }
                });
            });


            // 1.8 Neighbour-size supplement for mirror toggles.
            //  - HALF-SIZE basin width (not a multiple of 10 → 45/48/52/…): ALWAYS add the next-smaller
            //    AND next-larger available size, on top of any perfect (±3cm) match. Don't ditch the match.
            //  - ROUND basin width (40/50/60/…): only fall back to neighbours when there is NO perfect match.
            let isOffsetMatch = false;
            if (isMirror && this.selectedBasin && allSpiegelschrankCandidates.length > 0) {
                const bW = this.extractMirrorWidth(this.selectedBasin);
                if (bW !== null) {
                    const isHalfSize = (bW % 10) !== 0;
                    if (baseCandidates.length === 0 || isHalfSize) {
                        // Nearest distinct available size BELOW / ABOVE the perfect (±3cm) window.
                        const uniqueWidths = [...new Set(allSpiegelschrankCandidates.map(c => Math.round(c.width)))].sort((a, b) => a - b);
                        let smallerWidth = -1;
                        let largerWidth = Infinity;
                        for (let w of uniqueWidths) {
                            if (w < bW - 3 && w > smallerWidth) smallerWidth = w;
                            if (w > bW + 3 && w < largerWidth) largerWidth = w;
                        }
                        const seen = new Set(baseCandidates.map(c => c.artNr));
                        const neighbours = allSpiegelschrankCandidates.filter(c =>
                            (Math.round(c.width) === smallerWidth || Math.round(c.width) === largerWidth) && !seen.has(c.item.artNr));
                        if (neighbours.length > 0) {
                            isOffsetMatch = true; // enables the Breite pill so the user can pick the size bracket
                            neighbours.forEach(c => baseCandidates.push(c.item));
                        }
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

            // 2. Handle Pill Filters for mirror toggles (Spiegelschrank / Spiegel / Lichtspiegel)
            if (isMirror) {
                const cap = MIRROR_PTYPE[target];                 // 'Spiegelschrank' | 'Spiegel' | 'Lichtspiegel'
                const S = (k) => this['current' + cap + k];        // getter for the per-target filter state
                const setS = (k, v) => { this['current' + cap + k] = v; };
                // Breite pill shows whenever neighbour sizes were supplemented (isOffsetMatch) — i.e. a
                // half-size basin or a no-perfect-match fallback — so the user can pick the size bracket
                // (40 / 45 / 50 …). Widths read via extractMirrorWidth (Ø / N×N / Breite).
                const showBreite = isOffsetMatch;
                const breiteHeaderEl = document.getElementById(`${target}_breite_header`);
                const breiteListEl = document.getElementById(`list_${target}_breite`);
                const brandListEl = document.getElementById(`list_${target}_brand`);
                const serieListEl = document.getElementById(`list_${target}_serie`);

                // Cross-filter the facet pills (faceted search): each of Breite / Marke / Serie lists only
                // the values still available under the OTHER two selections — so picking Breite 62 narrows
                // the Serie pills to series that have a 62cm product, and vice versa. Selections combine
                // (no reset-on-click); a selection that is no longer available is auto-cleared.
                const wStr = c => { const w = this.extractMirrorWidth(c); return w !== null ? w.toString() : null; };
                const passBreite = c => S('Breite') === 'all' || wStr(c) === S('Breite');
                const passBrand = c => S('Brand') === 'all' || c.manufacturer === S('Brand');
                const passSerie = c => S('Serie') === 'all' || this.extractSerie(c) === S('Serie');

                const availBreite = new Set(baseCandidates.filter(c => passBrand(c) && passSerie(c)).map(wStr).filter(Boolean));
                if (S('Breite') !== 'all' && !availBreite.has(S('Breite'))) setS('Breite', 'all');
                const availBrand = new Set(baseCandidates.filter(c => passBreite(c) && passSerie(c)).map(c => c.manufacturer).filter(Boolean));
                if (S('Brand') !== 'all' && !availBrand.has(S('Brand'))) setS('Brand', 'all');
                const availSerie = new Set(baseCandidates.filter(c => passBreite(c) && passBrand(c)).map(c => this.extractSerie(c)).filter(s => s && s !== 'Andere'));
                if (S('Serie') !== 'all' && !availSerie.has(S('Serie'))) setS('Serie', 'all');

                if (breiteHeaderEl && breiteListEl) {
                    if (showBreite) {
                        breiteHeaderEl.style.display = 'block';
                        breiteListEl.style.display = 'flex';

                        // Widths available under the current Marke + Serie (mirror-aware: Ø / N×N / Breite)
                        const widths = [...new Set(baseCandidates.filter(c => passBrand(c) && passSerie(c)).map(c => this.extractMirrorWidth(c)).filter(w => w !== null))].sort((a, b) => a - b);

                        breiteListEl.innerHTML = `<button class="pill-btn ${S('Breite') === 'all' ? 'active' : ''}" data-val="all">Alle</button>` +
                            widths.map(w => `<button class="pill-btn ${S('Breite') === w.toString() ? 'active' : ''}" data-val="${w}">${w} cm</button>`).join('');

                        breiteListEl.querySelectorAll('.pill-btn').forEach(btn => {
                            btn.addEventListener('click', () => {
                                setS('Breite', btn.dataset.val);
                                this.populateAddonPanel(target);
                            });
                        });
                    } else {
                        breiteHeaderEl.style.display = 'none';
                        breiteListEl.style.display = 'none';
                        setS('Breite', 'all'); // Reset if not in offset mode
                    }
                }

                if (brandListEl && serieListEl) {
                    // Brands available under the current Breite + Serie
                    const brands = [...new Set(baseCandidates.filter(c => passBreite(c) && passSerie(c)).map(c => c.manufacturer).filter(Boolean))].sort();
                    brandListEl.innerHTML = `<button class="pill-btn ${S('Brand') === 'all' ? 'active' : ''}" data-val="all">Alle</button>` +
                        brands.map(b => `<button class="pill-btn ${S('Brand') === b ? 'active' : ''}" data-val="${b}">${b}</button>`).join('');

                    brandListEl.querySelectorAll('.pill-btn').forEach(btn => {
                        btn.addEventListener('click', () => {
                            setS('Brand', btn.dataset.val);
                            this.populateAddonPanel(target);
                        });
                    });

                    // Series available under the current Breite + Marke
                    const series = [...new Set(baseCandidates.filter(c => passBreite(c) && passBrand(c)).map(c => this.extractSerie(c)))].filter(s => s !== 'Andere').sort();

                    serieListEl.innerHTML = `<button class="pill-btn ${S('Serie') === 'all' ? 'active' : ''}" data-val="all">Alle</button>` +
                        series.map(s => `<button class="pill-btn ${S('Serie') === s ? 'active' : ''}" data-val="${s}">${s}</button>`).join('');

                    serieListEl.querySelectorAll('.pill-btn').forEach(btn => {
                        btn.addEventListener('click', () => {
                            setS('Serie', btn.dataset.val);
                            this.populateAddonPanel(target);
                        });
                    });

                    // APPLY UI RESET BUTTONS
                    const resetMirrorFn = () => {
                        setS('Breite', 'all');
                        setS('Brand', 'all');
                        setS('Serie', 'all');
                        setS('Band', 'all');
                        setS('Steckdose', 'all');
                        setS('Lichtfarbe', 'all');
                        this.populateAddonPanel(target);
                    };

                    if (showBreite) {
                        applyPillUI(`${target}_breite_header`, `list_${target}_breite`, S('Breite'), 'Breite', resetMirrorFn, S('Breite') !== 'all' ? S('Breite') + ' cm' : 'all');
                    }
                    applyPillUI(`${target}_brand_header`, `list_${target}_brand`, S('Brand'), 'Marke', resetMirrorFn);
                    applyPillUI(`${target}_serie_header`, `list_${target}_serie`, S('Serie'), 'Serie', resetMirrorFn);

                    // Final display filtering
                    if (S('Breite') !== 'all') {
                        displayCandidates = displayCandidates.filter(c => {
                            const w = this.extractMirrorWidth(c);
                            return w !== null && w.toString() === S('Breite');
                        });
                    }
                    if (S('Brand') !== 'all') displayCandidates = displayCandidates.filter(c => c.manufacturer === S('Brand'));
                    if (S('Serie') !== 'all') displayCandidates = displayCandidates.filter(c => this.extractSerie(c) === S('Serie'));

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

                    const stateKeyOf = { band: 'Band', steckdose: 'Steckdose', lichtfarbe: 'Lichtfarbe' };
                    const renderFilter = (type, headerId, listId, titleLabel) => {
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

                        const currentVal = S(stateKeyOf[type]);
                        list.innerHTML = `<button class="pill-btn ${currentVal === 'all' ? 'active' : ''}" data-val="all">Alle</button>` +
                            options.map(o => `<button class="pill-btn ${currentVal === o ? 'active' : ''}" data-val="${o}">${o}</button>`).join('');

                        list.querySelectorAll('.pill-btn').forEach(btn => {
                            btn.addEventListener('click', () => {
                                setS(stateKeyOf[type], btn.dataset.val);
                                this.populateAddonPanel(target);
                            });
                        });

                        applyPillUI(headerId, listId, currentVal, titleLabel, resetMirrorFn);
                    };

                    renderFilter('band', `${target}_band_header`, `list_${target}_band`, 'Band');
                    renderFilter('steckdose', `${target}_steckdose_header`, `list_${target}_steckdose`, 'Steckdose');
                    renderFilter('lichtfarbe', `${target}_lichtfarbe_header`, `list_${target}_lichtfarbe`, 'Lichtfarbe');

                    if (S('Band') !== 'all') displayCandidates = displayCandidates.filter(c => getProp(c, 'band') === S('Band'));
                    if (S('Steckdose') !== 'all') displayCandidates = displayCandidates.filter(c => getProp(c, 'steckdose') === S('Steckdose'));
                    if (S('Lichtfarbe') !== 'all') displayCandidates = displayCandidates.filter(c => getProp(c, 'lichtfarbe') === S('Lichtfarbe'));
                }
            }

            // Möbel Farbe pill — COLOUR RULE: colour derives ONLY from the art-Nr finish code
            // (COLOR_NAMES), never from label text. See INSTRUCTIONS.md § Colour codes.
            if (target === 'moebel') {
                const farbeOf = (c) => { const m = String(c.artNr || '').match(/\.(\d{3})(?:\.|$)/); return m ? (COLOR_NAMES[m[1]] || null) : null; };
                const farbeEl = document.getElementById('list_moebel_farbe');
                if (farbeEl) {
                    const vals = [...new Set(displayCandidates.map(farbeOf).filter(Boolean))].sort((a, b) => a.localeCompare(b));
                    if (this.currentMoebelFarbe !== 'all' && !vals.includes(this.currentMoebelFarbe)) this.currentMoebelFarbe = 'all';
                    farbeEl.innerHTML = `<button class="pill-btn ${this.currentMoebelFarbe === 'all' ? 'active' : ''}" data-val="all">Alle</button>` +
                        vals.map(v => `<button class="pill-btn ${this.currentMoebelFarbe === v ? 'active' : ''}" data-val="${v}">${v}</button>`).join('');
                    farbeEl.querySelectorAll('.pill-btn').forEach(btn => btn.addEventListener('click', () => {
                        this.currentMoebelFarbe = btn.dataset.val;
                        this.populateAddonPanel('moebel');
                    }));
                    const hdr = document.getElementById('moebel_farbe_header');
                    const show = vals.length > 1;
                    if (hdr) hdr.style.display = show ? '' : 'none';
                    farbeEl.style.display = show ? '' : 'none';
                    applyPillUI('moebel_farbe_header', 'list_moebel_farbe', this.currentMoebelFarbe, 'Farbe', () => {
                        this.currentMoebelFarbe = 'all';
                        this.populateAddonPanel('moebel');
                    });
                }
                if (this.currentMoebelFarbe !== 'all') displayCandidates = displayCandidates.filter(c => farbeOf(c) === this.currentMoebelFarbe);
            }

            if (displayCandidates.length === 0) {
                const serieInfo = this.selectedBasin ? ` für "${this.extractSerie(this.selectedBasin)}"` : '';
                listEl.innerHTML = `<div class="finder-empty-state" style="font-size:0.8rem;">Keine passenden Produkte${serieInfo} gefunden.</div>`;
                return;
            }

            const isMulti = target === 'accessoires';
            if (target === 'accessoires') {
                // Hersteller (brand) — from the clean manufacturer field. Cascades into Serie.
                const herEl = document.getElementById('list_addon_accessoires_hersteller');
                const herHdr = document.getElementById('addon_accessoires_hersteller_header');
                const brands = [...new Set(displayCandidates.map(accessoryHersteller))].filter(Boolean).sort();
                if (this.currentAccessoiresHersteller !== 'all' && !brands.includes(this.currentAccessoiresHersteller)) this.currentAccessoiresHersteller = 'all';
                const showHer = brands.length > 1;
                if (herEl) {
                    herEl.innerHTML = `<button class="pill-btn ${this.currentAccessoiresHersteller === 'all' ? 'active' : ''}" data-val="all">Alle</button>` +
                        brands.map(b => `<button class="pill-btn ${this.currentAccessoiresHersteller === b ? 'active' : ''}" data-val="${b}">${b}</button>`).join('');
                    herEl.querySelectorAll('.pill-btn').forEach(btn => btn.addEventListener('click', () => { this.currentAccessoiresHersteller = btn.dataset.val; this.currentAccessoiresSerie = 'all'; this.populateAddonPanel(target); }));
                    herEl.style.display = showHer ? '' : 'none';
                }
                if (herHdr) herHdr.style.display = showHer ? '' : 'none';
                if (this.currentAccessoiresHersteller !== 'all') displayCandidates = displayCandidates.filter(c => accessoryHersteller(c) === this.currentAccessoiresHersteller);

                // Serie (model line) — brand-anchored, noise-guarded (accessorySerie in _shared.js).
                const serieListEl = document.getElementById('list_addon_accessoires_serie');
                if (serieListEl) {
                    const series = [...new Set(displayCandidates.map(c => accessorySerie(c)))].filter(Boolean).sort();
                    serieListEl.innerHTML = `<button class="pill-btn ${this.currentAccessoiresSerie === 'all' ? 'active' : ''}" data-val="all">Alle</button>` +
                        series.map(s => `<button class="pill-btn ${this.currentAccessoiresSerie === s ? 'active' : ''}" data-val="${s}">${s}</button>`).join('');
                    serieListEl.querySelectorAll('.pill-btn').forEach(btn => btn.addEventListener('click', () => {
                        this.currentAccessoiresSerie = btn.dataset.val;
                        this.populateAddonPanel(target);
                    }));
                }
                if (this.currentAccessoiresSerie !== 'all') {
                    displayCandidates = displayCandidates.filter(c => accessorySerie(c) === this.currentAccessoiresSerie);
                }
            }
            
            listEl.innerHTML = displayCandidates.map(c => {
                const isSelected = isMulti
                    ? this.selectedAccessoires.includes(c.artNr)
                    : (target === 'moebel' ? this.selectedMoebel === c.artNr : this['selected' + MIRROR_PTYPE[target]] === c.artNr);
                return `
                    <div class="finder-item ${isSelected ? 'active' : ''}" data-artnr="${c.artNr}" data-target="${target}" title="${c.artNr}">
                        <div style="display:flex; align-items:center; gap:0.5rem; overflow:hidden;">
                            ${(imgOf(c)) ? `<img loading="lazy" decoding="async" src="${imgOf(c)}" style="width:32px; height:32px; object-fit:contain; background:#fff; border-radius:4px; padding:2px; flex-shrink:0;" onerror="this.outerHTML='<div style=&quot;width:32px; height:32px; display:flex; align-items:center; justify-content:center; background:var(--bg-surface); border-radius:4px; flex-shrink:0;&quot;><i class=&quot;ri-image-line placeholder-icon&quot;></i></div>'">` : `<div style="width:32px; height:32px; display:flex; align-items:center; justify-content:center; background:var(--bg-surface); border-radius:4px; flex-shrink:0;"><i class="ri-image-line placeholder-icon"></i></div>`}
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
                        const sk = 'selected' + MIRROR_PTYPE[t];
                        this[sk] = this[sk] === artNr ? null : artNr;
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
                        <img loading="lazy" decoding="async" src="${this.selectedBasin.imgUrl}" class="preview-thumbnail">
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
            // N = number of wash bowls (positions). Single basin = 1, Doppelwaschtisch = 2,
            // Reihenwaschtisch = one per Armaturenloch. Each bowl gets its own faucet /
            // Ablaufventil / Siphon; the per-faucet Verschraubung, Regulierventil and
            // Einbaukosten already derive from faucetQty, so they scale automatically.
            const N = this.positionCount(this.selectedBasin);

            const label = (this.selectedFaucet?.label || '').toLowerCase();
            const isSelectedWandModel = label.includes('wandmischer') || label.includes('wandbatterie');

            // Quantity rules:
            // - Multi-bowl (Doppel / Reihe) → N faucets (one per bowl)
            // - Single basin, 2 Löcher      → 2 faucets (wide basin, two tap positions)
            // - Single basin, 3 Löcher      → 1 faucet (one 3-hole widespread mixer)
            // - Single basin, 1 Loch        → 1 faucet
            let faucetQty = (N >= 2) ? N : (hLochStatus === '2' ? 2 : 1);
            // Special rule: If no holes, we only have a faucet if it's a wall-mounted one
            if (hLochStatus === 'ohne' && !isSelectedWandModel) faucetQty = 0;
            // Ablaufventil scales by bowl count (one drain per bowl); single basin = 1.
            const valveQty = (N >= 2) ? N : 1;

            const items = [];
            const faucetItems = [];

            // 1. Process Faucet (or Wandmischer) first for positioning logic
            if (this.selectedFaucet) {
                const label = (this.selectedFaucet.label || '').toLowerCase();
                const desc = (this.selectedFaucet.description || '').toLowerCase();
                const fullText = label + ' ' + desc;
                const isWandModel = label.includes('wandmischer') || label.includes('wandbatterie');

                // Resolve the emitted SKU to the colour chosen in the Armatur Farbe filter:
                // if a Farbe is active and the base art-Nr isn't that colour, swap in the
                // matching finish variant's SKU + label. (Structural logic below still keys off
                // the base art-Nr — colour never changes type/accessories.)
                const _colourOf = (art) => { const m = String(art || '').match(/\.(\d{3})(?:\.|$)/); return m ? (COLOR_NAMES[m[1]] || null) : null; };
                let _faucetArt = this.selectedFaucet.artNr;
                let _faucetLabel = this.selectedFaucet.label;
                if (this.currentFaucetFarbe && this.currentFaucetFarbe !== 'all' && _colourOf(_faucetArt) !== this.currentFaucetFarbe) {
                    const _v = (this.selectedFaucet.variants || []).find(v => _colourOf(v.artNr) === this.currentFaucetFarbe);
                    if (_v) { _faucetArt = _v.artNr; _faucetLabel = _v.label || _faucetLabel; }
                }

                // Add main faucet
                faucetItems.push({ qty: faucetQty, label: _faucetLabel, artNr: _faucetArt });

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

                // De-dupe accidental repeats within the faucet block — e.g. an Einbaukörper
                // added by BOTH the brand mapping and the Endmontageset mounting list. Keep the
                // first occurrence (richer label) per art-Nr; never inflate its quantity.
                const _seenFaucetArt = new Set();
                for (let i = 0; i < faucetItems.length; i++) {
                    const k = String(faucetItems[i].artNr || '').replace(/\s/g, '');
                    if (!k) continue;
                    if (_seenFaucetArt.has(k)) { faucetItems.splice(i, 1); i--; } else _seenFaucetArt.add(k);
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
            const siphonQty = (N >= 2) ? N : 1; // one Siphon per bowl (Doppel = 2, Reihe = N)

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

            // 6b. Add Spiegel / Lichtspiegel (plain mirrors — no cabinet isolation set)
            [['showLichtspiegel', 'selectedLichtspiegel'], ['showSpiegel', 'selectedSpiegel']].forEach(([showKey, selKey]) => {
                if (!this[showKey] || !this[selKey]) return;
                const allApps = window.productApps || {};
                let obj = null;
                Object.values(allApps).forEach(app => {
                    if (obj) return;
                    const its = app.trays || app.basinTrays || app.faucets || [];
                    obj = its.find(t => t.artNr === this[selKey]);
                });
                items.push({ qty: 1, label: obj ? (obj.label || obj.name) : this[selKey], artNr: this[selKey] });
                // Büchlerglas mirrors need the concealed mounting kit (1× each) — right after the mirror.
                if (obj && /büchlerglas/i.test((obj.manufacturer || '') + ' ' + (obj.label || ''))) {
                    items.push({ qty: 1, label: 'Spiegelbefestigung Büchlerglas verdeckt', artNr: '5111 514.000.000' });
                }
            });

            // 6c. Add Hochschrank / Seitenschrank (free-standing furniture, no isolation set)
            if (this.showSchraenke && this.selectedSchraenke) {
                const allApps = window.productApps || {};
                let obj = null;
                Object.values(allApps).forEach(app => {
                    if (obj) return;
                    const its = app.trays || app.basinTrays || app.faucets || [];
                    obj = its.find(t => t.artNr === this.selectedSchraenke);
                });
                items.push({ qty: 1, label: obj ? (obj.label || obj.name) : this.selectedSchraenke, artNr: this.selectedSchraenke });
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
            priceBOM(bomTableBody);   // services (Einbaukosten) have no product price → shown as "-"

            if (window.saveWishlist) window.saveWishlist();
        }
    };
}

/* Mischer Factory */

