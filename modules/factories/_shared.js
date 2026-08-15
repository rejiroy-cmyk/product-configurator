import { COLOR_NAMES } from './_colorCodes.js';
import { fullLabel, differentiatingChips, productAttrs } from './_productDisplay.js';

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

// Filename blocklists for REMOTE urls only. Twice now a pattern on this list turned
// out to mean the opposite of what was assumed:
//   _100_000 / _000_000 — believed to be 404s, actually the colour-code half of the
//     art-Nr; 2000 of 2004 were live photos and listing them hid ~7.5k images.
//   _nV — believed to be a generic grey box, actually the per-article technical
//     DRAWING that profishop itself shows as the primary listing thumbnail. In PG1 it
//     is a real ~26 KB drawing; in PS1 the same name is an 859-byte placeholder.
// The lesson both times: a filename tells you nothing, only fetching does.
const PLACEHOLDER_IMG = ['no-image', 'placeholder'];

// Non-photo image banks: SAP/YM1 = technical drawings / Schallschutz diagrams,
// Energieetiketten = EU energy labels. Real product photos live only in Web/PG1|PS1.
const NON_PHOTO_IMG = ['/multimedia/SAP/', '/Energieetiketten/'];

// True only for an image we can actually show.
//
// Local `img/…` paths are trusted unconditionally: they exist only because the
// scraper fetched, decoded and size-checked them, so a filename heuristic can only
// do damage here — `img/PG1_01545379_nV_….webp` IS the shop's own thumbnail, and the
// old _nV rule would have blanked every Duschtrennwand tile.
// Remote urls still get the blocklists, since nothing has validated those.
const isRealImg = (u) => {
    if (!u || !String(u).trim()) return false;
    if (String(u).startsWith('img/')) return true;
    return !PLACEHOLDER_IMG.some(s => u.includes(s))
        && !NON_PHOTO_IMG.some(s => u.includes(s));
};

// Real image URL for a product object, or '' → callers fall back to the local
// placeholder icon. Replaces the old getSanitasImgUrl guesser (which fabricated URLs).
const imgOf = (o) => (o && isRealImg(o.imgUrl)) ? o.imgUrl : '';

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
const Be = imgOf; // legacy alias retained for any inline callers
const X = applyPillUI;

// ── Pricing (additive, read-only) ─────────────────────────────────────────────
// `prices.json` (loaded into window.__PRICES__ by app.js, inlined in the bundle)
// maps the FULL art-Nr (base.colour.finish) → ‹without taxes› price (exkl. MWSt).
// Read LIVE at BOM-render time, so it follows whatever variant is selected; never
// baked into product data. Unknown art-Nr → null → "Preis auf Anfrage".
const PRICE_NA = 'Preis auf Anfrage';
const getPrice = (artNr) => {
    if (!artNr) return null;
    const map = (typeof window !== 'undefined' && window.__PRICES__) || null;
    if (!map) return null;
    const p = map[String(artNr).trim()];
    return typeof p === 'number' ? p : null;
};
// Swiss formatting: 1006 → "1'006.00"
const formatCHF = (n) => {
    const [int, dec] = Number(n).toFixed(2).split('.');
    return int.replace(/\B(?=(\d{3})+(?!\d))/g, "'") + '.' + dec;
};
const ART_RE = /\d{4}\s\d{3}\.\d{3}\.\d{3}/;
// Shared post-render pass: every factory renders its 4-cell BOM rows (art-Nr in .bom-code,
// Menge as the last <td>); call priceBOM(tbody) at the END of updateBOM to append a per-line
// ‹without taxes› price cell + a grand-total row. Idempotent on a freshly-rendered tbody.
// Rows without a real art-Nr (placeholders, "ohne") show "-"; unknown art-Nr → "Preis auf Anfrage".
// ============================================================================
// GLOBAL ENGINE RULE — FULL-TEXT CLASSIFICATION (user directive 2026-07-03,
// INSTRUCTIONS.md §1). Any logic that CLASSIFIES, MATCHES, or FILTERS a product
// (type, situation, series, dimensions, config keywords, service selection)
// must consider the FULL product text — label AND description AND spec values —
// never the label alone. ERP labels are truncated; the distinguishing keyword
// regularly lives only in the description. Use productText() as the single
// source of truth for such checks.
//
// The ONLY permitted exception: product-IDENTITY prefix checks (e.g. a label
// literally starting with "Seitenwand" or "Montagepauschale" identifies what
// the product IS). Those may read the label alone but MUST carry a
// `// label-prefix by design` comment at the call site.
//
// Enforced by tests/verify-fulltext-rule.js (npm test fails on regression).
// ============================================================================
const productText = (m) => {
    if (!m) return '';
    const parts = [m.label || '', m.description || ''];
    if (m.specs && typeof m.specs === 'object') {
        for (const v of Object.values(m.specs)) if (typeof v === 'string') parts.push(v);
    }
    return parts.join(' ')
        .toLowerCase()
        .replace(/[‐-―]/g, '-')   // unicode hyphens -> ascii
        .replace(/\s+/g, ' ')
        .trim();
};

const priceBOM = (tbody, cols = 5) => {
    if (!tbody || !tbody.querySelectorAll) return;
    let grand = 0, anyNA = false, anyRow = false;
    tbody.querySelectorAll(':scope > tr').forEach((tr) => {
        const codeEl = tr.querySelector('.bom-code');
        const cells = tr.querySelectorAll(':scope > td');
        if (!codeEl || cells.length < 2 || tr.classList.contains('bom-total-row')) return;
        anyRow = true;
        const code = (codeEl.textContent || '').trim();
        const mengeTxt = (cells[cells.length - 1].textContent || '').trim();
        const menge = parseInt(mengeTxt, 10);
        const m = code.match(ART_RE);
        const p = m ? getPrice(m[0]) : null;
        const td = document.createElement('td');
        td.style.textAlign = 'right';
        if (!m || mengeTxt === '-') {
            td.innerHTML = '<span style="color:var(--text-secondary)">-</span>';
        } else if (p == null) {
            anyNA = true;
            td.innerHTML = `<span style="font-style:italic; font-size:0.78rem; color:var(--st-gray)">${PRICE_NA}</span>`;
        } else {
            grand += p * (isNaN(menge) ? 1 : menge);
            td.style.whiteSpace = 'nowrap';
            td.style.fontFamily = 'var(--st-font-mono)';
            td.textContent = formatCHF(p);
        }
        tr.appendChild(td);
    });
    if (!anyRow) return;
    const total = document.createElement('tr');
    total.className = 'bom-total-row';
    total.style.cssText = 'border-top:2px solid var(--border); font-weight:700;';
    total.innerHTML = `<td colspan="${cols - 1}" style="text-align:right; text-transform:uppercase; font-size:0.82rem; letter-spacing:0.5px; padding-right:1rem;">Gesamtbetrag exkl. MwSt${anyNA ? ' *' : ''}</td><td style="text-align:right; white-space:nowrap; font-family:var(--st-font-mono);">CHF ${formatCHF(grand)}</td>`;
    tbody.appendChild(total);
    if (anyNA) {
        const fn = document.createElement('tr');
        fn.innerHTML = `<td colspan="${cols}" style="font-size:0.72rem; color:var(--st-gray); font-style:italic; padding-top:0.25rem;">* zzgl. Positionen mit „Preis auf Anfrage"</td>`;
        tbody.appendChild(fn);
    }
};

// ---------------------------------------------------------------------------
// Shared "Accessoires" add-on panel (Ch4 zubehoer_pool). Used by every configurator
// that exposes the toggle so the wiring stays in ONE place. Reads the shared
// zubehoer_pool, filtering products whose `targetSubcats` include THIS app's
// registry key, with productType primary pills + adaptive Serie/Breite/Farbe
// secondary pills. `app` is the configurator instance, `s` its element-id slug.
// Expects on `app`: accFacets, selectedAddonAccessoires,
// populateAccessoires(), updateBOM(). Panel DOM ids follow `*_${s}`.
const DROPDOWN_TYPES = ['Duschgleitstange'];   // handled by the mischer's own dropdown groups, not here

// ── Accessory Hersteller / Serie ───────────────────────────────────────────────
// Accessory labels read "<type words…> <Brand> <Line>, <attributes>". Deriving the
// series by front-stripping the type word grabs adjectives / dimensions / connectors
// as noise (Zweiarmig, Elektronischer, Für, Höhe, Edelstahl, Eck …). Instead anchor
// on the BRAND (the clean manufacturer field) and take the model token right after it.
const accessoryHersteller = (t) => ((t && t.manufacturer) || '').trim() || 'Andere';

// Tokens that are attributes/materials/connectors, never a real model line.
const ACC_SERIE_NOISE = new Set([
    'für', 'zur', 'und', 'mit', 'ohne', 'set', 'aus', 'bis', 'per', 'à', 'im', 'am',
    'höhe', 'breite', 'tiefe', 'länge', 'ausladung', 'auslauf', 'inhalt', 'durchmesser',
    'füllmenge', 'grösse', 'gross', 'klein', 'wandmodell', 'standmodell', 'wandmontage',
    'bodenmontage', 'selbstklebend', 'eck', 'doppelt', 'einfach', 'zweiarmig', 'einarmig',
    'edelstahl', 'stainless', 'steel', 'chrom', 'verchromt', 'messing', 'kunststoff',
    'glas', 'klarglas', 'aluminium', 'matt', 'glanz', 'hochglanz', 'poliert', 'gebürstet',
    'a', 'b', 'h', 'ø'
]);
const accessorySerie = (t) => {
    if (!t) return 'Andere';
    const cap = w => w ? w.charAt(0).toUpperCase() + w.slice(1) : w;
    const mfr = (t.manufacturer || '').trim();
    if (mfr && mfr.toLowerCase() !== 'andere') {
        // FULL-TEXT RULE: look in the label, then the description if the label is truncated.
        for (const raw of [t.label || t.name || '', t.description || '']) {
            const text = String(raw);
            const bi = text.toLowerCase().indexOf(mfr.toLowerCase());
            if (bi < 0) continue;
            const after = text.substring(bi + mfr.length).replace(/^[\s\-:,/]+/, '');
            const m = after.match(/^([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ0-9.\-]*)/);
            const tok = m ? m[1] : '';
            if (tok && tok.length > 1 && !ACC_SERIE_NOISE.has(tok.toLowerCase())) return cap(tok);
            break;   // brand found but no clean model line → group under the brand
        }
        return mfr;
    }
    return 'Andere';
};
// ── Shared accessory facet bar ────────────────────────────────────────────────
// ONE filter UI for every configurator's Accessoires panel: Produktkategorie,
// Hersteller, Serie and Farbe, always visible (a facet hides only when it has a
// single value to offer). Bidirectional/faceted: each facet's options are the
// values that survive every OTHER facet's current selection, so no combination
// can ever yield an empty list. Returns the filtered candidates.
//
// `state` is the caller's persistent object (e.g. app.accFacets), `wrapEl` the
// container to render into, `idPrefix` a unique DOM-id stem.
const ACC_SIZE_TYPES = ['Badetuchstange'];   // only these expose the Breite facet

const accessoryFacetBar = (candidates, state, wrapEl, idPrefix, onChange) => {
    if (!wrapEl) return candidates;

    // COLOUR RULE: the finish comes ONLY from the art-Nr finish-code triplet,
    // mapped via COLOR_NAMES — never from label text. See INSTRUCTIONS.md.
    const farbeOf = (c) => {
        const m = String(c.artNr || '').match(/\.(\d{3})(?:\.|$)/);
        return m ? (COLOR_NAMES[m[1]] || null) : null;
    };
    const dims = [
        ['Produktkategorie', (c) => c.productType || null],
        ['Hersteller', (c) => { const h = accessoryHersteller(c); return h === 'Andere' ? null : h; }],
        ['Serie', (c) => { const sr = accessorySerie(c); return sr === 'Andere' ? null : sr; }],
        ['Farbe', farbeOf],
    ];
    const cat = state['Produktkategorie'];
    if (cat && cat !== 'all' && ACC_SIZE_TYPES.includes(cat)) {
        dims.push(['Breite', (c) => (c.size && c.size !== 'Standard' && /\d/.test(c.size)) ? c.size : null]);
    }
    // a facet that no longer applies must not keep filtering invisibly
    Object.keys(state).forEach(k => { if (!dims.some(([n]) => n === k)) delete state[k]; });

    // FACETED: a dimension offers the values left after every OTHER dimension's pick.
    const availFor = (name) => {
        let subset = candidates;
        dims.forEach(([nm, fn]) => {
            const sel = state[nm];
            if (nm !== name && sel && sel !== 'all') subset = subset.filter(c => fn(c) === sel);
        });
        const self = dims.find(([n]) => n === name)[1];
        return [...new Set(subset.map(self).filter(Boolean))]
            .sort((a, b) => String(a).localeCompare(String(b), 'de', { numeric: true }));
    };

    let html = '';
    const groups = [];
    dims.forEach(([name], i) => {
        const vals = availFor(name);
        // a pick the other facets just made impossible → drop it, never show empty
        if (state[name] && state[name] !== 'all' && !vals.includes(state[name])) state[name] = 'all';
        if (vals.length < 2) return;
        const cur = state[name] || 'all';
        const hId = `${idPrefix}_h${i}`, lId = `${idPrefix}_l${i}`;
        html += `<div class="finder-sub-header" id="${hId}">${name}</div>`
            + `<div class="pill-group" id="${lId}" style="margin-bottom:0.75rem;">`
            + `<button class="pill-btn ${cur === 'all' ? 'active' : ''}" data-dim="${name}" data-val="all">Alle</button>`
            + vals.map(v => `<button class="pill-btn ${cur === v ? 'active' : ''}" data-dim="${name}" data-val="${v}">${v}</button>`).join('')
            + `</div>`;
        groups.push([name, hId, lId]);
    });
    wrapEl.innerHTML = html;
    wrapEl.querySelectorAll('.pill-btn').forEach(b => b.addEventListener('click', () => {
        state[b.dataset.dim] = b.dataset.val;
        onChange();
    }));
    // same "FACET: value  [Reset]" chrome as every other filter in the app
    groups.forEach(([name, hId, lId]) => applyPillUI(hId, lId, state[name] || 'all', name, () => {
        state[name] = 'all';
        onChange();
    }));

    let out = candidates;
    dims.forEach(([name, fn]) => {
        const sel = state[name];
        if (sel && sel !== 'all') out = out.filter(c => fn(c) === sel);
    });
    return out;
};

const renderAccessoiresPanel = (app, s) => {
    const listEl = document.getElementById(`list_addon_accessoires_${s}`);
    const serieListEl = document.getElementById(`list_addon_accessoires_serie_${s}`);
    if (!listEl) return;

    const subcatKey = Object.keys(window.productApps || {}).find(k => window.productApps[k] === app);
    const pool = (window.productApps && window.productApps.zubehoer_pool && window.productApps.zubehoer_pool.trays) || [];
    let candidates = pool.filter(t => Array.isArray(t.targetSubcats) && t.targetSubcats.includes(subcatKey)
        && !DROPDOWN_TYPES.includes(t.productType));
    const seen = new Set();
    candidates = candidates.filter(c => { if (seen.has(c.artNr)) return false; seen.add(c.artNr); return true; });

    // One shared facet bar (Produktkategorie / Hersteller / Serie / Farbe) — identical
    // in every configurator. Older markup carried a hand-rolled "Kategorie" pill row;
    // if it is still in the DOM, retire it so the two can never both filter.
    if (serieListEl) {
        serieListEl.innerHTML = '';
        serieListEl.style.display = 'none';
        const prev = serieListEl.previousElementSibling;
        if (prev && prev.classList.contains('finder-sub-header')) prev.style.display = 'none';
    }
    let facetWrap = document.getElementById(`acc_facets_${s}`);
    if (!facetWrap) {
        facetWrap = document.createElement('div');
        facetWrap.id = `acc_facets_${s}`;
        listEl.parentNode.insertBefore(facetWrap, listEl.previousElementSibling || listEl);
    }
    if (!app.accFacets) app.accFacets = {};
    const filtered = accessoryFacetBar(candidates, app.accFacets, facetWrap, `acc_${s}`, () => app.populateAccessoires());

    listEl.innerHTML = '';
    if (filtered.length === 0) {
        listEl.innerHTML = '<div class="finder-empty-state" style="font-size:0.8rem;">Keine Accessoires gefunden.</div>';
        return;
    }
    filtered.forEach(c => {
        const btn = document.createElement('div');
        const isSelected = app.selectedAddonAccessoires.some(x => x.artNr === c.artNr);
        btn.className = `finder-item ${isSelected ? 'active' : ''}`;
        btn.innerHTML = `
            <div style="display:flex; align-items:center; gap:0.5rem;">
                ${c.imgUrl ? `<img src="${c.imgUrl}" style="width:32px; height:32px; object-fit:contain; background:#fff; border-radius:4px; padding:2px; flex-shrink:0;">` : `<div style="width:32px; height:32px; display:flex; align-items:center; justify-content:center; background:var(--bg-surface); border-radius:4px; flex-shrink:0;"><i class="ri-image-line placeholder-icon"></i></div>`}
                <div>
                    <div style="font-size:0.8rem; font-weight:500; line-height:1.3;">${fullLabel(c)}</div>
                    <div style="font-size:0.7rem; color:var(--st-gray); margin-top:0.25rem;">
                        ${c.manufacturer || ''} ${c.productType ? '· ' + c.productType : ''}
                    </div>
                </div>
            </div>
            <div style="font-size:0.75rem; color:var(--st-gray); font-family:var(--st-font-mono); margin-top:0.5rem; text-align:right;">${c.artNr}</div>
        `;
        btn.addEventListener('click', () => {
            if (isSelected) app.selectedAddonAccessoires = app.selectedAddonAccessoires.filter(x => x.artNr !== c.artNr);
            else app.selectedAddonAccessoires.push({ ...c, qty: 1, origin: 'Zusatzoptionen' });
            app.populateAccessoires();
            app.updateBOM();
        });
        listEl.appendChild(btn);
    });
};

// ============================================================================
//  Serie pill normalisation — ONE cleaner for every app with a Serie filter
//  ERP `serie` strings carry the product type in FRONT ("Wanneneinlauf Vaia",
//  "Wandmischer-Endmontageset Torino", "Duschsystem Mit Brausethermostat") and
//  the variant BEHIND ("Moderna R Compact rimless", "Metris 110",
//  "Habito-Standmodell", "Subway 2"). A filter pill wants neither — just the
//  series — or the same product line ends up spread over a dozen pills.
//  Wandklosett alone had 52 pills for 78 products before this.
// ============================================================================

// Leading product-type phrases. Scanned repeatedly, longest match first, so
// "Set Wandmischer-Endmontageset Torino" folds all the way down to "Torino".
const SERIE_TYPE_PREFIXES = [
    // Wanne
    'wannenfüllkombination', 'wannenfüllbatterie', 'wannen-schwalleinlauf', 'wannen-standeinlauf',
    'wannenrandarmatur', 'wannenthermostat', 'wanneneinlauf', 'wannenzulauf',
    // Bad / Dusche
    'bade- und duschmischer', 'bade-und duschmischer', 'bade- und duschenmischer',
    'bade-einbaumischer', 'bade-und', 'badebatterie', 'bademischer', 'badethermostat',
    'aufputz-duschenmischer', 'unterputz-duschenmischer', 'aufputz-bademischer', 'unterputz-bademischer',
    'duschsystem', 'duschpaneel', 'duschsäule', 'duschsteuerung', 'duschbatterie',
    'duschenbatterie', 'duschenmischer', 'duschmischer', 'duschthermostat', 'brausethermostat',
    // NOT "shower tablet select" — that IS Hansgrohe's line name, and peeling it left
    // the bare size "300" as the pill. The trailing-number rule trims the size instead.
    'showerpipe', 'shower pipe', 'showerstation',
    'für wandeinbaumontage', 'wandeinbaumontage',
    // Montage-Sets
    'thermostat-endmontageset', 'wandmischer-endmontageset', 'wandmischer- endmontageset',
    'wandbatterie-endmontageset', 'einhandbatterie-endmontageset', 'endmontageset',
    'fertigmontageset', 'umbauset zu up bademischer', 'umbauset', 'homebox', 'set',
    // Wand
    'wandmischer-set', 'wandbatterie set', 'wandmischer', 'wandbatterie', 'wandarmatur',
    'wandsteuerung', 'wandventil', 'wandthermostat',
    // Loch-Batterien / Ventile
    'dreilochbatterie', 'zweilochbatterie', 'einlochbatterie', 'vierlochbatterie',
    'zweigriff-brückenarmatur', 'zweigriffmischer', 'einhandbatterie',
    'einloch- standventil', 'einloch-standventil', 'selbstschluss-standventil',
    'standventil', 'schaftventil', 'siebventil',
    // Waschtisch / Küche
    'waschtischauslauf stand', 'waschtischauslauf wand', 'waschtischauslauf',
    'waschtischsteuerung', 'waschtischmischer', 'spültischmischer', 'einlochmischer',
    // WC
    'wand- klosett', 'wand-klosett', 'stand- klosett', 'stand-klosett', 'wand- wc', 'stand- wc',
    'dusch- wc', 'dusch-wc', 'dusch- klosett', 'dusch-klosett',
    // Urinoir (Ch3). "Urinoiranlage" is the complete unit and "Urinoir" the bare ceramic,
    // but both print the same line name behind them — Laufen Lema, Geberit Tamina — so
    // peeling the type is what puts the two on one pill.
    'urinoiranlage', 'urinoirelement', 'urinoirsteuerung', 'urinoir', 'urinal',
];

// Prefixes that ARE the answer: service and carcass positions carry no series,
// so every one of them collapses onto a single pill.
const SERIE_TYPE_ONLY = ['einbaukosten', 'einbaukörper', 'einbausockel', 'montagepauschale', 'sockel'];

// Trailing variant qualifiers. Stripping never empties the string — a series
// that IS a qualifier ("Comfort", "Zero", "Set") keeps its own name.
const SERIE_VARIANT_RE = [
    /[\s-]+(?:rimless|spülrandlos|randlos)$/i,
    /[\s-]+(?:compact|comfort|liberty|silent|vital)$/i,
    // "Classic" is a variant on "Moderna S Classic" but part of the name itself on
    // Catalano "New Classic" and Laufen "The New Classic". Drop it only when a
    // two-word series survives AND that series does not end in "New".
    /(?<=\S+\s+\S+)(?<!\bnew)[\s-]+classic$/i,
    /[\s-]+(?:standmodell|standmontage|stand)$/i,
    /[\s-]+(?:ecosmart\+|ecosmart|eco\+|eco)$/i,
    /[\s-]+(?:reno|grande)$/i,
    /[\s-]+(?:up|ap)$/i,
    /\s*\d+\s*-?\s*loch$/i,
    /\s+\d+([.,]\d+)?\s*(?:mm|cm)$/i,
    /\s+\d{2,3}$/,                 // Metris 110, Talis E 240 — but not "Starck 3" / "Domo 6.0"
    /[\s-]+h[öo]he$/i,             // "Axor Front Höhe 91" → Front (the number goes first)
    /\s*["”½¾¼]+$/,
    /[\s,\-/]+$/,
];

// Components, not series. When one of these is all that survives the type peel, the
// peeled type is the better pill: "Duschsystem Schulterbrause Axor" belongs with the
// other Duschsysteme, exactly where "Duschsystem mit Schulterbrause Axor" already lands.
const SERIE_NON_SERIES = new Set([
    'schulterbrause', 'kopfbrause', 'handbrause', 'brausethermostat',
    'duschenbatterie', 'thermostatmodul', 'brausenmodul',
]);

// Genuine spelling splits of one and the same line.
const SERIE_ALIASES = { 'subway 2': 'Subway 2.0', 'design style': 'Design / Style' };

const _stripSerieVariants = (s) => {
    let out = s.trim();
    for (let changed = true; changed;) {
        changed = false;
        for (const re of SERIE_VARIANT_RE) {
            const next = out.replace(re, '').trim();
            if (next && next !== out) { out = next; changed = true; }
        }
    }
    return out || s.trim();
};

// Uppercase a leading lowercase word ("niù" → "Niù") but never touch a token
// that already carries capitals ("iCon", "F5LT1001", "S- Tec" stay as they are).
const _capSerie = (s) => (/^[a-zà-ÿ]+(\s|$)/.test(s) ? s.charAt(0).toUpperCase() + s.slice(1) : s);

// Last step for every path out of cleanSerie. The hyphen split runs HERE, not on the
// way in: "Domo.5-Duplex" and "Domo.5 Duplex" are one line and must share a pill, but
// splitting earlier would break the "Bade-Und Duschmischer" prefix match. The left side
// must carry a digit or a dot — a model token like "Domo.5" — and the right side must be
// capitalised. That keeps "D-Code", "Water-fall", "Modena S-Tec" and, importantly,
// "Wandmischer-Endmontageset" intact; splitting the last one would re-peel to a
// different pill on a second pass and break idempotency.
const _finishSerie = (s) => {
    const out = _capSerie(String(s).replace(/([A-Za-zÀ-ÿ]*[0-9.][A-Za-zÀ-ÿ0-9.]*)-([A-ZÀ-Þ])/g, '$1 $2').trim());
    return SERIE_ALIASES[out.toLowerCase()] || out;
};

const cleanSerie = (raw) => {
    // "D- Code" / "modena S- Tec" — the ERP splits hyphenated names with a space.
    const base = String(raw || '').replace(/\s+/g, ' ').replace(/(\w)-\s+(\w)/g, '$1-$2').trim();
    if (!base) return '';

    const lower = base.toLowerCase();
    for (const t of SERIE_TYPE_ONLY) {
        if (lower === t || lower.startsWith(t + ' ')) return _finishSerie(base.slice(0, t.length));
    }

    // Peel product-type prefixes FIRST — a series can be a bare number ("Gessi 316"),
    // and stripping variants first would eat it as a trailing dimension. Remember the
    // last prefix peeled: it becomes the pill when no series survives underneath.
    let core = base, peeled = '';
    for (let changed = true; changed;) {
        changed = false;
        const l = core.toLowerCase();
        let hit = '';
        for (const p of SERIE_TYPE_PREFIXES) {
            if ((l === p || l.startsWith(p + ' ') || l.startsWith(p + '-')) && p.length > hit.length) hit = p;
        }
        if (hit) {
            peeled = core.slice(0, hit.length);
            core = core.slice(hit.length).replace(/^[\s,\-/]+/, '').trim();
            changed = true;
        }
    }
    core = _stripSerieVariants(core);

    // "Duschsystem Mit Brausethermostat" / "Wandbatterie Set 125 mm" describe a
    // product, not a line — fall back to the type so they share one pill. Same for a
    // remainder that is only a component ("Duschsystem Schulterbrause").
    if (!core || /^(mit|für|ohne|inkl|zu)\b/i.test(core) || SERIE_NON_SERIES.has(core.toLowerCase())) {
        return _finishSerie(peeled || _stripSerieVariants(base));
    }

    return _finishSerie(core);
};

// ============================================================================
//  Gallery view — ONE product grid for every gallery-UX configurator
//  The tile geometry (70x90 thumbnail beside the text, 320px minimum column)
//  is defined here and nowhere else. Hand-rolled copies drift: createWCApp had
//  already grown its own stacked card with a full-width 160px-tall image, so
//  Wandklosett/Standklosett looked nothing like Duschenwanne/Badewanne.
//  Add a gallery to a new app by calling renderGalleryGrid, never by writing
//  another grid.
// ============================================================================
const GALLERY_CAP = 150;   // tiles rendered before we ask the user to filter

// opts.idOf(t)   → the value handed to app.selectTray() on click (default t.id)
// opts.lines(t)  → extra small text lines under the label (default size + form)
// opts.cap       → override the tile cap
const galleryGridHTML = (items, opts = {}) => {
    const idOf = opts.idOf || (t => t.id);
    const lines = opts.lines || (t => [t.size, t.form]);
    const cap = opts.cap || GALLERY_CAP;

    let cards = items.slice(0, cap).map(t => {
        const extra = (lines(t) || []).filter(Boolean).map((txt, i) =>
            `<div style="font-size:${i ? '0.7rem' : '0.75rem'}; color:var(--text-secondary);${i ? ' margin-top:2px;' : ''}">${txt}</div>`
        ).join('');
        return `
            <div class="result-item-card catalog-preview-card" onclick="window.currentActiveApp.selectTray('${idOf(t)}')" style="display:flex; flex-direction:row; align-items:center; gap:1rem; border:1px solid var(--border); border-radius:8px; padding:1rem; background:var(--bg-surface); cursor:pointer; transition:all 0.2s;" onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 6px 20px rgba(0,0,0,0.2)'" onmouseout="this.style.transform=''; this.style.boxShadow=''">
                <div class="card-img-wrapper" style="width:70px; height:90px; display:flex; align-items:center; justify-content:center; border-radius:6px; overflow:hidden; background:var(--bg-subtle); flex-shrink:0;">
                    ${imgOf(t) ? `<img src="${imgOf(t)}" loading="lazy" style="max-height:100%; max-width:100%; object-fit:contain;">` : '<i class="ri-image-line placeholder-icon" style="font-size:2rem; color:var(--text-secondary);"></i>'}
                </div>
                <div class="result-info" style="display:flex; flex-direction:column; flex:1; min-width:0;">
                    <span style="font-size:0.7rem; color:var(--text-secondary); text-transform:uppercase; letter-spacing:0.5px; margin-bottom:2px;">${t.manufacturer || "Marke unbekannt"}</span>
                    <strong style="font-size:0.85rem; line-height:1.3; margin-bottom:4px; color:var(--text-primary); display:-webkit-box; -webkit-line-clamp:3; -webkit-box-orient:vertical; overflow:hidden;">${fullLabel(t)}</strong>
                    ${extra}
                    <span class="finish-artnr" style="margin-top:6px; font-size:0.8rem;">${t.artNr}</span>
                </div>
            </div>
        `;
    }).join('');

    if (items.length > cap) {
        cards += `<div style="grid-column:1/-1; padding:2rem; text-align:center; color:var(--text-secondary); font-size:0.95rem;">Es gibt ${items.length - cap} weitere Ergebnisse. Bitte passen Sie Ihre Filter an, um diese zu sehen.</div>`;
    }
    return '<div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(320px, 1fr)); gap:12px; padding:12px; background:var(--bg-body); border-radius:8px;">' + cards + '</div>';
};

// "Zurück zur Übersicht" in the BOM header: visible while a product is being
// configured, hidden while the grid is up.
const galleryBackButton = (show) => {
    let btn = document.getElementById('backToCatalogBtn');
    if (!show) { if (btn) btn.style.display = 'none'; return; }
    if (!btn) {
        const h = document.querySelector('.bom-header');
        if (!h) return;
        btn = document.createElement('button');
        btn.id = 'backToCatalogBtn';
        btn.className = 'icon-btn highlight-btn';
        btn.style.marginRight = 'auto';
        btn.innerHTML = '<i class="ri-arrow-left-s-line" aria-hidden="true"></i> Zurück zur Übersicht';
        h.insertBefore(btn, h.firstChild);
    }
    btn.onclick = () => {
        const a = window.currentActiveApp;
        if (!a) return;
        if (typeof a.selectTray === 'function') a.selectTray(null);
        else if (typeof a.selectItem === 'function') a.selectItem(null);
    };
    btn.style.display = 'inline-flex';
};

// Draws the grid into the main panel (the BOM table area) and updates the counter.
// The grid being up means no product is being configured, so the back button goes
// away here — the per-app updateBOM() never runs on this path to hide it itself.
const renderGalleryGrid = (items, opts = {}) => {
    galleryBackButton(false);
    bomCountCounter.textContent = items.length + ' Produkte gefunden';
    if (!items.length) {
        bomTableBody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:#9da3ad; padding:2rem;">Keine Produkte gefunden. Bitte passen Sie die Filter an.</td></tr>';
        return;
    }
    bomTableBody.innerHTML = '<tr><td colspan="5" style="padding:0; border:none; background:transparent;">'
        + galleryGridHTML(items, opts) + '</td></tr>';
};

// ============================================================================
//  Standard shower accessories (INSTRUCTIONS.md §2)
//  Many ERP-injected Bade-/Duschmischer ship WITHOUT their Brauseschlauch /
//  Handbrause / Brausehalter in the API data. These house-standard Alterna parts
//  are added by rule to any AP/UP mixer that lacks them, so the copied Stückliste
//  is complete. Brauseschlauch standard = flexline 1600 mm (options[0]); Handbrause
//  standard = Alterna saveline 3 (the caller's reorder step brand-matches it).
// ============================================================================
const SHOWER_STD = {
    brauseschlauch: [
        { artNr: "6542 317.501.000", label: 'Brauseschlauch Alterna flexline, 1600 mm, ½"x½", Kunststoff mit Metalleffekt', menge: 1, type: "Zubehör", imgUrl: "img/PG1_06542316_501_000_3528e29b.webp" },
        { artNr: "6542 318.501.000", label: 'Brauseschlauch Alterna flexline, 1800 mm, ½"x½", Kunststoff mit Metalleffekt', menge: 1, type: "Option", imgUrl: "img/PG1_06542316_501_000_3528e29b.webp" },
        { artNr: "ohne_schlauch", label: "Ohne Brauseschlauch", menge: 0, type: "Option", imgUrl: "" }
    ],
    handbrause: [
        { artNr: "6541 336.501.000", label: "Handbrause Alterna saveline 3, Ø 120 mm, 3-jet, umstellbar, Verchromt", menge: 1, type: "Zubehör", imgUrl: "img/PG1_06541334_501_000_d3cc8a6e.webp" },
        { artNr: "6541 333.501.000", label: "Handbrause Alterna saveline, Ø 120 mm, 1-jet, IntensiveRain, Verchromt", menge: 1, type: "Option", imgUrl: "img/PG1_06541330_501_000_1a034628.webp" },
        { artNr: "6541 326.501.000", label: "Handbrause Alterna easyline, Ø 101 mm, 1-jet, SoftRain, Verchromt", menge: 1, type: "Option", imgUrl: "img/PG1_06541326_501_000_a6b9a8ef.webp" },
        { artNr: "6541 329.501.000", label: "Handbrause Alterna streamline, rund, 1-jet, SoftRain, Verchromt", menge: 1, type: "Option", imgUrl: "img/PG1_06541329_501_000_c8293ee3.webp" },
        { artNr: "6541 324.501.000", label: "Handbrause Alterna smartline, Ø 93 mm, 1-jet, SoftRain, Verchromt", menge: 1, type: "Option", imgUrl: "img/PG1_06541324_501_000_c5075f1c.webp" },
        { artNr: "6541 337.501.000", label: "Handbrause Alterna cosyline, Ø 120 mm, 3-jet, umstellbar, Verchromt", menge: 1, type: "Option", imgUrl: "img/PG1_06541337_501_000_a491c21e.webp" },
        { artNr: "6541 328.501.000", label: "Handbrause Alterna squareline, eckig, 1-jet, SoftRain, Verchromt", menge: 1, type: "Option", imgUrl: "img/PG1_06541328_501_000_80b03659.webp" }
    ],
    brausehalter: [
        { artNr: "6543 132.501.000", label: "Brausehalter Alterna, Rosette rund, Verchromt", menge: 1, type: "Zubehör", imgUrl: "img/PG1_06543132_501_000_8287472d.webp" },
        { artNr: "ohne_halter", label: "Ohne Brausehalter", menge: 0, type: "Option", imgUrl: "" }
    ],
    brausegarnitur: [
        { artNr: "ohne_garnitur", label: "Ohne Brausegarnitur", menge: 0, type: "Option", imgUrl: "" }
    ],
    // Unterputz only (INSTRUCTIONS.md §2 UP item 4). Standard = "für Handbrause" (ohne
    // Brausehalter); "mit integriertem Brausehalter" as a dropdown option.
    anschlussbogen: [
        { artNr: "6544 100.501.000", label: 'Anschlussbogen Alterna ½", Rosette rund, für Handbrause', menge: 1, type: "Zubehör", imgUrl: "img/PG1_06544100_501_000_7791d623.webp" },
        { artNr: "6544 102.501.000", label: 'Anschlussbogen Alterna ½", mit integriertem Brausehalter, Rosette rund', menge: 1, type: "Option", imgUrl: "img/PG1_06544102_501_000_d4ab2245.webp" }
    ]
};
const _cloneOpts = (arr) => arr.map(o => ({ ...o }));

// ============================================================================
//  Abgang budget (outlet count) — the spine of mixer configuration.
//  The number of outlets the mixer/diverter can serve = the number of functions
//  it supports. 1 Abgang -> Handbrause OR Regenbrause (never both); 2 -> both;
//  3 -> plus a third. A function beyond the budget cannot be plumbed, so the
//  configurator must not offer it.
//  FULL-TEXT RULE: the count is stated in the description ("1 Abgang",
//  "2 Abgänge", "2-Wege-Umsteller"), which is often truncated out of the label —
//  so read label + description + specs via productText().
// ============================================================================
function outletCount(tray) {
    const x = productText(tray);
    const m = x.match(/(\d)\s*abg(?:ä|ae)nge/);           // "2 Abgänge", "3 Abgänge"
    if (m) return Math.max(1, Math.min(3, +m[1]));
    if (/\b1\s*abgang\b/.test(x)) return 1;                // explicit single outlet
    if (/3[-\s]?wege|3[-\s]?fach[-\s]?umstell/.test(x)) return 3;
    if (/2[-\s]?wege|umstell/.test(x)) return 2;           // any Umsteller => >= 2 outlets
    // A bath+shower mixer inherently serves two (spout + shower).
    if (/bade[-\s]*(?:und|\/|&|\+)\s*dusch|dusch[-\s]*(?:und|\/|&|\+)\s*bade/.test(x)) return 2;
    return 1;                                              // plain mixer = single outlet
}
// A self-contained system already includes its heads — the budget doesn't apply.
function isShowerSystem(tray) { return _SELF_CONTAINED.test(productText(tray)); }

// A mixer needs shower accessories UNLESS it is a self-contained shower system
// (Duschsystem / Showerpipe / Paneel — the brause is already part of the unit) or a
// bath-only filler with no shower outlet. FULL-TEXT RULE: read label AND description.
const _SELF_CONTAINED = /duschsystem|showerpipe|shower\s*pipe|duschpaneel|duschs[äa]ule|showerstation|duschset|brauseset|duschgarnitur|kopfbrausenset/i;
const _BATH_ONLY = /wanneneinlauf|wannenf[üu]ll|einlaufgarnitur|wannenrandgarnitur|wannenrandarmatur|wannenzulauf/i;
function needsShowerAccessories(tray, opts = {}) {
    const t = productText(tray).toLowerCase();
    if (_SELF_CONTAINED.test(t)) return false;
    if (opts.isBath && _BATH_ONLY.test(t) && !/brause|dusch/.test(t)) return false;
    return true;
}

// Ensure a qualifying AP/UP mixer carries Brauseschlauch + Handbrause (+ Brausehalter for
// baths). Only ADDS groups that are missing — curated trays that already have them are left
// untouched (so their established order is preserved). When something is added, the whole
// list is re-ranked to the INSTRUCTIONS.md §2 order. Returns the (possibly new) array.
function ensureShowerGroups(materials, tray, opts = {}) {
    if (!Array.isArray(materials)) materials = [];
    
    // Strip out redundant mixer accessories (the main item IS already a mixer).
    materials = materials.filter(m => {
        const t = (m.name || "").toLowerCase();
        return !/(?:thermostat|duschen|bade|waschtisch)?mischer|armatur|batterie/i.test(t) || /abstellverschraubung|absperrventil|regulier/i.test(t);
    });

    if (!needsShowerAccessories(tray, opts)) return materials;
    const hasGroup = (re) => materials.some(m => re.test((m.name || "")));
    // Unterputz mixers need the Anschlussbogen (the concealed connection to the hose) — a
    // house-standard part (§2 UP item 4), added when the ERP data omits it.
    if (opts.isUP && !hasGroup(/anschlussbogen/i)) { materials.push({ name: "Anschlussbogen", options: _cloneOpts(SHOWER_STD.anschlussbogen) }); }
    if (!hasGroup(/brauseschlauch/i)) { materials.push({ name: "Brauseschlauch", options: _cloneOpts(SHOWER_STD.brauseschlauch) }); }
    if (!hasGroup(/handbrause/i)) { materials.push({ name: "Handbrause", options: _cloneOpts(SHOWER_STD.handbrause) }); }
    if (opts.isBath && !hasGroup(/brausehalter/i)) { materials.push({ name: "Brausehalter", options: _cloneOpts(SHOWER_STD.brausehalter) }); }
    // Add Brausegarnitur to all
    if (!hasGroup(/brausegarnitur/i)) { materials.push({ name: "Brausegarnitur", options: _cloneOpts(SHOWER_STD.brausegarnitur) }); }

    const rank = (m) => {
        const x = ((m.name || "") + " " + (m.options?.[0]?.label || "") + " " + (m.options?.[0]?.description || "")).toLowerCase();
        if (/grundk[öo]rper|einbauk[öo]rper|ibox|homebox/.test(x)) return 0;
        if (/montageschiene|montageset/.test(x)) return 1;
        if (/anschlussbogen/.test(x)) return 2;
        if (/abstellverschraubung/.test(x)) return 3;
        if (/brauseschlauch/.test(x)) return 4;
        if (/handbrause/.test(x)) return 5;
        if (/brausehalter/.test(x)) return 6;
        if (/gleitstange/.test(x)) return 7;
        if (/brausegarnitur/.test(x)) return 8;
        return 9;
    };
    return materials.map((m, i) => ({ m, i })).sort((a, b) => (rank(a.m) - rank(b.m)) || (a.i - b.i)).map(x => x.m);
}

// ============================================================================
//  Accessory colour matching — the Zubehör pool, narrowed to ONE finish
//
//  A coloured mixer wants its Anschlussbogen / Brauseschlauch / Handbrause /
//  Regenbrause in the SAME finish. COLOUR RULE: the finish is the art-Nr triplet,
//  never label text — so a candidate is any pool SKU of the same product family
//  whose triplet equals the mixer's. Ranked in three tiers:
//    1  own brand, right colour  — a Gessi bathroom gets Gessi parts
//    2  any brand, right colour  — the part is visible, so colour beats brand
//    3  own brand, any colour    — ONLY when the family has nothing in that colour
//                                  at all (Gessi builds no coloured Anschlussbogen).
//                                  Still better than the Alterna chrome standard.
//  The point is that the caller renders the WHOLE ranked list as a dropdown: the
//  finish is matched FOR the user, not decided for them. Hose length, hand-shower
//  design and rain-head shape stay free inside the matching colour — which a
//  single frozen auto-match took away.
// ============================================================================
const artFinishCode = (artNr) => { const m = String(artNr || '').match(/\.(\d{3})(?:\.|$)/); return m ? m[1] : null; };

// Mounting-group name → the pool's `productType` tag. This reads the GROUP name (an
// internal bucket label like "3. Anschlussbogen"), not a product, so the full-text
// rule does not apply here; the pool side matches on the structured productType.
// Order matters: "Handbrausegarnitur" must not fall through to Brausehalter, and
// "Anschlussbogen mit integriertem Brausehalter" is an Anschlussbogen.
const ACC_FAMILY_RULES = [
    [/anschlussbogen/, 'Anschlussbogen'],
    [/^brausegarnitur/i, 'Brausegarnitur'],
    [/brause[ns]?schlauch/, 'Brauseschlauch'],
    [/regenbrause|kopfbrause/, 'Regenbrause'],
    [/brausen?(?:wand)?arm|wandarm|deckenanschluss/, 'Brausearm'],
    [/gleitstange/, 'Gleitstange'],
    [/handbrause/, 'Handbrause'],
    [/brausehalter|steckhalter/, 'Brausehalter'],
];
const accFamilyOf = (groupName) => {
    const n = (groupName || '').toLowerCase();
    for (const [rx, fam] of ACC_FAMILY_RULES) if (rx.test(n)) return fam;
    return null;
};

// Pool tags do not line up 1:1 with these families. Rails are tagged BOTH
// `Gleitstange` (33) and `Duschgleitstange` (96) — reading only the first missed
// three quarters of them, which made the colour-gap check below always see a gap.
const ACC_POOL_TYPES = { Gleitstange: ['Gleitstange', 'Duschgleitstange'] };

// A Brausegarnitur carries no productType of its own — the sets sit under
// `Handbrause` and are recognised by their text. The RAIL is what makes a set a
// substitute for three separate rows, so a "Handbrausegarnitur" without one is an
// ordinary hand shower and stays in the Handbrause family.
// FULL-TEXT RULE: read label + description + specs via productText().
const _RX_GARNITUR = /garnitur|brauseset|duschset/;
const _RX_GARNITUR_RAIL = /gleitstange|brausestange|wandstange/;
function isGarniturSet(t) {
    const x = productText(t);
    return _RX_GARNITUR.test(x) && _RX_GARNITUR_RAIL.test(x);
}

// The pool is scanned per family and cached; the cache drops itself when the pool
// size changes (data loads after the first configurator may already be open).
let _accPoolCache = {}, _accPoolSize = -1;
const accPoolOf = (family) => {
    const pool = (typeof window !== 'undefined' && window.productApps
        && window.productApps.zubehoer_pool && window.productApps.zubehoer_pool.trays) || [];
    if (_accPoolSize !== pool.length) { _accPoolCache = {}; _accPoolSize = pool.length; }
    if (!_accPoolCache[family]) {
        if (family === 'Brausegarnitur') {
            _accPoolCache[family] = pool.filter(isGarniturSet);
        } else {
            const types = ACC_POOL_TYPES[family] || [family];
            _accPoolCache[family] = pool.filter(t => types.indexOf(t.productType) >= 0
                && !(family === 'Handbrause' && isGarniturSet(t)));
        }
    }
    return _accPoolCache[family];
};

const _accItem = (base, sku) => ({
    artNr: sku.artNr,
    label: sku.label || base.label || '',
    description: sku.description || base.description || '',
    specs: sku.specs || base.specs,
    imgUrl: sku.imgUrl || base.imgUrl || '',
    menge: 1,
    brand: base.manufacturer || '',
    baseArtNr: base.artNr,
});

const ACC_TIER2_CAP = 80, ACC_TIER3_CAP = 12;
// Ranked candidate list for one family in one finish. `opts.serie` keeps an Uno Zero
// set from opening on a Starck hose; `opts.prefer`/`opts.avoid` keep the shape of the
// standard part (an Anschlussbogen "mit integriertem Brausehalter" replaces the
// separate Brausehalter, so the two shapes are not interchangeable).
// FULL-TEXT RULE: the serie/shape checks read label + description + specs.
function accCandidates(family, brand, code, opts = {}) {
    if (!family || !code) return [];
    const bl = (brand || '').toLowerCase().trim();
    const ownBrand = !!bl && bl !== 'andere';
    const serie = (opts.serie || '').toLowerCase().trim();
    const t1 = [], t2 = [], t3 = [];
    const seen = new Set();
    for (const base of accPoolOf(family)) {
        const m = (base.manufacturer || '').toLowerCase();
        const isOwn = ownBrand && (m === bl || (/gessi|emporio/.test(bl) && /gessi|emporio/.test(m)));
        for (const sku of [base, ...(base.variants || [])]) {
            if (!sku || !sku.artNr || seen.has(sku.artNr)) continue;
            seen.add(sku.artNr);
            const c = artFinishCode(sku.artNr);
            const item = _accItem(base, sku);
            if (c === code) { item.tier = isOwn ? 1 : 2; (isOwn ? t1 : t2).push(item); }
            else if (isOwn) { item.tier = 3; t3.push(item); }
        }
    }
    const score = (x) => {
        const t = productText(x);
        let s = 0;
        if (opts.prefer && opts.prefer.test(t)) s += 4;
        if (opts.avoid && opts.avoid.test(t)) s -= 4;
        if (serie && t.includes(serie)) s += 2;
        return s;
    };
    const rank = (arr) => arr.map((x, i) => ({ x, i, s: score(x) }))
        .sort((a, b) => (b.s - a.s) || (a.i - b.i)).map(o => o.x);
    if (t1.length || t2.length) return rank(t1).concat(rank(t2).slice(0, ACC_TIER2_CAP));
    return rank(t3).slice(0, ACC_TIER3_CAP);
}

// Keep the user's chosen MODEL when the mixer's finish changes: same base article,
// the SKU carrying the new triplet. Falls back to the picked SKU itself.
function accSkuInColour(family, artNr, code) {
    if (!family || !artNr) return null;
    for (const base of accPoolOf(family)) {
        const all = [base, ...(base.variants || [])];
        if (!all.some(s => s && s.artNr === artNr)) continue;
        const hit = code ? all.find(s => artFinishCode(s.artNr) === code) : null;
        const sku = hit || all.find(s => s.artNr === artNr);
        const item = _accItem(base, sku);
        item.tier = hit ? 1 : 3;   // colour matched, or the picked model has no such finish
        return item;
    }
    return null;
}

const _accEsc = (s) => String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// What one mounting group shows in the BOM, and what its dropdown offers.
// `pick` is the user's stored choice for the group — {k:'std',i} (a curated/ERP
// option) or {k:'pool',art} (a pool part, re-resolved into the current finish).
// Without a pick the best colour match wins, EXCEPT on chrome (the curated
// standards already ARE chrome) and on an "Ohne …" default (an optional group
// stays off until the user asks for it).
// Returns { item, isOhne, tier, family, optionsHTML, hasChoices }.
function accGroupChoice(group, opts = {}) {
    const stdOpts = Array.isArray(group.options) ? group.options : [];
    const stdIdx = Math.min(Math.max(0, opts.stdIdx | 0), Math.max(0, stdOpts.length - 1));
    const std = stdOpts[stdIdx] || null;
    const family = accFamilyOf(group.name);
    const code = opts.code || null;
    const pick = opts.pick || null;
    // label-prefix by design: an option literally starting with "Ohne" IS the opt-out.
    const isOhneOpt = (o) => !!(o && /^ohne/i.test(o.label || ''));

    // Anschlussbogen comes in two shapes and they are not interchangeable — the
    // integrated-holder one replaces the separate Brausehalter group.
    let prefer = null, avoid = null;
    if (family === 'Anschlussbogen' && std) {
        const withHolder = /integriertem brausehalter|mit brausehalter/.test(productText(std));
        prefer = withHolder ? /integriertem brausehalter|mit brausehalter/ : null;
        avoid = withHolder ? null : /integriertem brausehalter|mit brausehalter/;
    }
    const cands = family ? accCandidates(family, opts.brand, code, { serie: opts.serie, prefer, avoid }) : [];

    let item = std, tier = 0, chosenArt = null, pickedStd = -1, forcedOhne = false;
    if (opts.forceOhne) {
        // Bundled away by another group. Only SOME of these groups carry an "Ohne …"
        // option (the Handbrause and Gleitstange lists do not), so the opt-out is
        // synthesized when it is missing — otherwise the rule would silently skip
        // exactly the rows it is supposed to switch off.
        const ohneIdx = stdOpts.findIndex(isOhneOpt);
        item = ohneIdx >= 0 ? stdOpts[ohneIdx] : { artNr: 'ohne_' + (family || 'zubehoer').toLowerCase(), label: 'Ohne ' + (group.name || 'Zubehör'), menge: 0 };
        pickedStd = ohneIdx;
        forcedOhne = true;
    } else if (pick && pick.k === 'std') {
        if (stdOpts[pick.i]) { item = stdOpts[pick.i]; pickedStd = pick.i; }
    } else if (pick && pick.k === 'pool') {
        const hit = accSkuInColour(family, pick.art, code);
        if (hit) { item = hit; tier = hit.tier; chosenArt = hit.artNr; }
    } else if (cands.length && code && code !== '501' && (!isOhneOpt(std) || opts.allowOhneAutoMatch)) {
        // Auto-match. `used` holds the art-Nrs already emitted in this BOM, so two
        // groups of the same family (Handbrause + Handbrausegarnitur) cannot both
        // land on the identical SKU.
        const auto = cands.find(c => !opts.used || !opts.used.has(c.artNr)) || cands[0];
        item = auto; tier = auto.tier; chosenArt = auto.artNr;
    }

    // A resolved pick may sit outside the ranked list (tier-3 fallback) — make sure
    // the option it selects actually exists in the markup.
    let listed = cands;
    if (chosenArt && !cands.some(c => c.artNr === chosenArt)) listed = [item].concat(cands);

    const selVal = chosenArt ? 'c' + chosenArt : 'o' + (pickedStd >= 0 ? pickedStd : stdIdx);
    const optHTML = (c) => `<option value="c${_accEsc(c.artNr)}"${selVal === 'c' + c.artNr ? ' selected' : ''}>${_accEsc(c.label)} (${_accEsc(c.artNr)})</option>`;
    const stdHTML = stdOpts.map((o, i) => `<option value="o${i}"${selVal === 'o' + i ? ' selected' : ''}>${_accEsc(o.label)} (${_accEsc(o.artNr)})</option>`).join('');
    const colourLbl = (code && COLOR_NAMES[code]) || 'Farbe';
    const brandLbl = opts.brand || 'Marke';
    let optionsHTML;
    if (!listed.length) {
        optionsHTML = stdHTML;                      // no pool coverage → unchanged behaviour
    } else {
        const g = (t) => listed.filter(c => c.tier === t);
        optionsHTML = '';
        if (g(1).length) optionsHTML += `<optgroup label="${_accEsc(brandLbl + ' · ' + colourLbl)}">${g(1).map(optHTML).join('')}</optgroup>`;
        if (g(2).length) optionsHTML += `<optgroup label="${_accEsc('Weitere Marken · ' + colourLbl)}">${g(2).map(optHTML).join('')}</optgroup>`;
        if (g(3).length) optionsHTML += `<optgroup label="${_accEsc(brandLbl + ' · andere Farbe')}">${g(3).map(optHTML).join('')}</optgroup>`;
        if (stdHTML) optionsHTML += `<optgroup label="Standard">${stdHTML}</optgroup>`;
    }
    return {
        item, family, tier, forcedOhne,
        isOhne: forcedOhne || (!chosenArt && isOhneOpt(item)),
        optionsHTML,
        // A forced row offers no dropdown: the group that bundled it away is the
        // control, and a pick here would just be overwritten on the next render.
        hasChoices: !forcedOhne && (listed.length + stdOpts.length) > 1,
    };
}

// The badge under a colour-matched BOM row. Honest about WHY the part was swapped —
// a brand fallback must not claim the colour matches.
const accTierNote = (tier) => {
    if (tier === 1) return 'Farbe passend zur Armatur';
    if (tier === 2) return 'Farbe passend, andere Marke';
    if (tier === 3) return 'Marke passend, Farbe abweichend';
    return '';
};

// ============================================================================
//  Brausegarnitur bundling — INSTRUCTIONS.md §2, all Dusch-/Bademischer
//
//  A Brausegarnitur IS the Brauseschlauch + Handbrause + Gleitstange in one
//  art-Nr, so picking one switches those rows off; ordering both would bill the
//  hose twice. It is never the default — EXCEPT when a bundled part has no SKU in
//  the mixer's finish while a Garnitur does. Axor Citterio M in .475
//  (`6415 120.475.000`) is the case: 14 Handbrausen and 5 Brauseschläuche exist
//  in that finish, zero Duschgleitstangen, three Axor Garnituren. Then the set is
//  the only colour-correct way to get a shower, so it becomes the standard and
//  the three individual rows go to "Ohne".
//  The `inColour('Brausegarnitur')` guard matters: without a colour-matched set
//  to fall back ON, forcing the bundle would switch three working rows off and
//  put nothing in their place.
// ============================================================================
const ACC_BUNDLED_BY_GARNITUR = ['Brauseschlauch', 'Handbrause', 'Gleitstange', 'Brausehalter'];
const _GARNITUR_PARTS = ['Brauseschlauch', 'Handbrause', 'Gleitstange'];

function brausegarniturPlan(materials, opts = {}) {
    const plan = { idx: -1, forceAuto: false, forceOhne: false };
    if (!Array.isArray(materials)) return plan;
    plan.idx = materials.findIndex(m => accFamilyOf(m.name) === 'Brausegarnitur');
    if (plan.idx < 0) return plan;

    const pick = (opts.picks || {})[plan.idx];
    if (pick) {
        // An explicit choice decides it. A pool pick is always a real Garnitur; a
        // curated pick bundles unless it is the "Ohne" opt-out.
        // label-prefix by design: an option starting with "Ohne" IS the opt-out.
        const opt = pick.k === 'std' ? (materials[plan.idx].options || [])[pick.i] : null;
        plan.forceOhne = pick.k === 'pool' || !!(opt && !/^ohne/i.test(opt.label || ''));
        return plan;
    }

    const code = opts.code;
    if (!code || code === '501') return plan;   // chrome: the house standards already are chrome
    const inColour = (fam) => accCandidates(fam, opts.brand, code, { serie: opts.serie })
        .some(c => c.tier === 1 || c.tier === 2);
    if (_GARNITUR_PARTS.some(f => !inColour(f)) && inColour('Brausegarnitur')) {
        plan.forceAuto = true;
        plan.forceOhne = true;
    }
    return plan;
}

// ============================================================================
//  Regenbrause → its Einbaukörper — INSTRUCTIONS.md §2, all Dusch-/Bademischer
//
//  A concealed rain head is sold without its body and NAMES the body it needs in
//  its own text ("… ohne Einbaukörper 6418 101"). Ordering the head alone leaves
//  an unbuildable Stückliste, so the named body rides along in the BOM.
//  FULL-TEXT RULE: that art-Nr lives in the description — the label is truncated
//  long before it. 160 pool SKUs name a body; only some of those bodies are in
//  the catalogue today, and a missing one is REPORTED, never invented: guessing a
//  finish triplet would put a wrong art-Nr into a real order.
// ============================================================================
const _RX_REQUIRED_BODY = /ohne\s+(?:einbau|grund)k[öo]rper\s+(\d{4})\s?(\d{3})/i;

// Art-Nr base (7 digits) → article, indexed across every loaded pool: the body a
// rain head names often sits in another category's trays or inside a mounting
// group, not beside the head. Built once, dropped when the data reloads.
let _artIndex = null, _artIndexSize = -1;
const _artBase = (artNr) => { const d = String(artNr || '').replace(/[^0-9]/g, ''); return d.length >= 7 ? d.slice(0, 7) : null; };

function _buildArtIndex() {
    const apps = (typeof window !== 'undefined' && window.productApps) || {};
    const idx = {};
    let size = 0;
    const add = (a) => {
        if (!a || !a.artNr || !a.label) return;
        const b = _artBase(a.artNr);
        if (!b) return;
        // A body is colourless (.000.000); prefer one that says so over a random
        // sibling that happens to share the base.
        const better = /^(?:einbau|grund)k[öo]rper/i.test(a.label);
        if (!idx[b] || (better && !idx[b]._pref)) idx[b] = { artNr: a.artNr, label: a.label, description: a.description || '', imgUrl: a.imgUrl || '', _pref: better };
    };
    for (const key of Object.keys(apps)) {
        const trays = (apps[key] && apps[key].trays) || [];
        size += trays.length;
        for (const t of trays) {
            add(t);
            for (const v of t.variants || []) add(v);
            for (const g of t.mountingMaterials || []) for (const o of g.options || []) add(o);
        }
    }
    _artIndex = idx;
    _artIndexSize = size;
}

function findArticleByBase(base) {
    const apps = (typeof window !== 'undefined' && window.productApps) || {};
    let size = 0;
    for (const key of Object.keys(apps)) size += ((apps[key] && apps[key].trays) || []).length;
    if (!_artIndex || _artIndexSize !== size) _buildArtIndex();
    return _artIndex[base] || null;
}

// The body one chosen accessory still needs, or null. Returns `{ missingBase }`
// when the text names a body the catalogue does not carry — the caller shows that
// as a warning row so the gap is visible instead of silently dropped.
function requiredBodyFor(item) {
    if (!item || !item.artNr) return null;
    // ERP descriptions carry hard line breaks as markup, and they land INSIDE the
    // art-Nr ("ohne Einbaukörper 6438<br>844") — a plain \s+ separator misses those.
    const m = _RX_REQUIRED_BODY.exec(productText(item).replace(/<[^>]*>/g, ' '));
    if (!m) return null;
    const base = m[1] + m[2];
    const hit = findArticleByBase(base);
    if (!hit) return { missingBase: m[1] + ' ' + m[2] };
    return { artNr: hit.artNr, label: hit.label, description: hit.description, imgUrl: hit.imgUrl, menge: 1 };
}

// One extra BOM row, rendered identically by both Mischer apps.
function bomExtraRowHTML(item, note) {
    if (item.missingBase) {
        return `
            <tr style="background: rgba(255,166,0,0.07);">
                <td><div class="img-cell" style="background: transparent; border: 1px dashed var(--border);"><i class="ri-alert-line" style="font-size:1.2rem;opacity:0.5;"></i></div></td>
                <td><span class="bom-code">${_accEsc(item.missingBase)}</span></td>
                <td><div class="bom-desc">Einbaukörper ${_accEsc(item.missingBase)} wird benötigt, ist im Katalog aber nicht erfasst — bitte manuell ergänzen.</div></td>
                <td><strong>1</strong></td>
            </tr>`;
    }
    const img = isRealImg(item.imgUrl) ? `<img src="${_accEsc(item.imgUrl)}">` : '<i class="ri-settings-3-line" style="font-size:1.2rem;opacity:0.3;"></i>';
    return `
        <tr>
            <td><div class="img-cell" ${!isRealImg(item.imgUrl) ? 'style="background: transparent; border: 1px dashed var(--border);"' : ''}>${img}</div></td>
            <td><span class="bom-code">${_accEsc(item.artNr)}</span></td>
            <td><div class="bom-desc">${fullLabel(item)}</div>${note ? `<div class="bom-desc" style="margin-top:0.2rem; font-size:0.7rem; color:var(--accent); text-transform:uppercase; letter-spacing:0.03em;">${_accEsc(note)}</div>` : ''}</td>
            <td><strong>${item.menge || 1}</strong></td>
        </tr>`;
}

export { matchesSearchQuery, configSidebar, bomTableBody, bomCountCounter, getVariantColor, isRealImg, imgOf, applyPillUI, Ae, re, me, ke, Be, X, getPrice, formatCHF, PRICE_NA, priceBOM, productText, renderAccessoiresPanel, accessoryFacetBar, accessoryHersteller, accessorySerie, cleanSerie, galleryGridHTML, renderGalleryGrid, galleryBackButton, SHOWER_STD, needsShowerAccessories, ensureShowerGroups, outletCount, isShowerSystem, fullLabel, differentiatingChips, productAttrs, artFinishCode, accFamilyOf, accCandidates, accSkuInColour, accGroupChoice, accTierNote, isGarniturSet, brausegarniturPlan, ACC_BUNDLED_BY_GARNITUR, findArticleByBase, requiredBodyFor, bomExtraRowHTML };
