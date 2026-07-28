import { COLOR_NAMES } from './_colorCodes.js';

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

// Placeholder / broken CDN URL signals. A URL containing any of these is NOT a real
// product photo: _nV serves a generic grey box (200), _000_000/_100_000 are 404s.
const PLACEHOLDER_IMG = ['_nV', 'no-image', 'placeholder', '_100_000', '_000_000'];

// Non-photo image banks: SAP/YM1 = technical drawings / Schallschutz diagrams,
// Energieetiketten = EU energy labels. Real product photos live only in Web/PG1|PS1.
const NON_PHOTO_IMG = ['/multimedia/SAP/', '/Energieetiketten/'];

// True only for a confirmed, real product PHOTO URL. Guards every <img src> so the
// app never requests a fabricated/placeholder URL (that traffic got the account
// shadow-banned) and never shows a drawing/label as the product image. Confirmed
// URLs are baked into custom-data.json via st-scraper.
const isRealImg = (u) => !!(u && String(u).trim())
    && !PLACEHOLDER_IMG.some(s => u.includes(s))
    && !NON_PHOTO_IMG.some(s => u.includes(s));

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
// Expects on `app`: currentAccessoireSerie, accSecondary, selectedAddonAccessoires,
// populateAccessoires(), updateBOM(). Panel DOM ids follow `*_${s}`.
const DROPDOWN_TYPES = ['Duschgleitstange'];   // handled by the mischer's own dropdown groups, not here
const SIZE_TYPES = ['Badetuchstange'];         // only these expose the Breite secondary filter

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
const renderAccessoiresPanel = (app, s) => {
    const listEl = document.getElementById(`list_addon_accessoires_${s}`);
    const serieListEl = document.getElementById(`list_addon_accessoires_serie_${s}`);
    if (!listEl || !serieListEl) return;

    const subcatKey = Object.keys(window.productApps || {}).find(k => window.productApps[k] === app);
    const pool = (window.productApps && window.productApps.zubehoer_pool && window.productApps.zubehoer_pool.trays) || [];
    let candidates = pool.filter(t => Array.isArray(t.targetSubcats) && t.targetSubcats.includes(subcatKey)
        && !DROPDOWN_TYPES.includes(t.productType));
    const seen = new Set();
    candidates = candidates.filter(c => { if (seen.has(c.artNr)) return false; seen.add(c.artNr); return true; });

    // Primary pills by productType
    const typeList = ['Alle'];
    candidates.forEach(c => { if (c.productType && !typeList.includes(c.productType)) typeList.push(c.productType); });
    serieListEl.innerHTML = typeList.map(tx =>
        `<button class="pill-btn ${app.currentAccessoireSerie === tx ? 'active' : ''}" data-val="${tx}">${tx}</button>`).join('');
    serieListEl.querySelectorAll('.pill-btn').forEach(b => b.addEventListener('click', () => {
        app.currentAccessoireSerie = b.dataset.val;
        app.accSecondary = {};
        app.populateAccessoires();
    }));

    let filtered = candidates;
    if (app.currentAccessoireSerie !== 'Alle') filtered = filtered.filter(c => c.productType === app.currentAccessoireSerie);

    // Secondary adaptive filters (Serie / Breite / Farbe)
    if (!app.accSecondary) app.accSecondary = {};
    // COLOUR RULE: colour derives ONLY from the art-Nr finish code (the 3-digit triplet in
    // BASE.«COLOUR».VARIANT), mapped via COLOR_NAMES. Never parse the label text.
    // See INSTRUCTIONS.md § Colour codes.
    const farbeOf = (c) => {
        const m = String(c.artNr || '').match(/\.(\d{3})(?:\.|$)/);
        return m ? (COLOR_NAMES[m[1]] || null) : null;
    };
    const breiteOf = (c) => (c.size && c.size !== 'Standard' && /\d/.test(c.size)) ? c.size : null;
    // Brand-anchored (shared with Mix&Match). 'Andere' -> null so it isn't offered as a facet value.
    const herstellerOf = (c) => { const h = accessoryHersteller(c); return h === 'Andere' ? null : h; };
    const serieOf = (c) => { const sr = accessorySerie(c); return sr === 'Andere' ? null : sr; };
    let secWrap = document.getElementById(`list_addon_accessoires_secondary_${s}`);
    if (!secWrap) {
        secWrap = document.createElement('div');
        secWrap.id = `list_addon_accessoires_secondary_${s}`;
        secWrap.style.marginBottom = '0.75rem';
        serieListEl.parentNode.insertBefore(secWrap, listEl);
    }
    if (app.currentAccessoireSerie === 'Alle') {
        secWrap.innerHTML = ''; app.accSecondary = {};
    } else {
        const base = filtered;   // primary (productType) filtered set
        const dims = [['Hersteller', herstellerOf], ['Serie', serieOf], ['Breite', breiteOf], ['Farbe', farbeOf]]
            .filter(([name]) => name !== 'Breite' || SIZE_TYPES.includes(app.currentAccessoireSerie));
        // ADAPTIVE (faceted): a dimension's available values are those left after applying every
        // OTHER dimension's current selection — so Serie=piana narrows Breite/Farbe to piana's only.
        const availFor = (name) => {
            let subset = base;
            dims.forEach(([nm, f]) => {
                const sel = app.accSecondary[nm];
                if (nm !== name && sel && sel !== 'Alle') subset = subset.filter(c => f(c) === sel);
            });
            const fn = dims.find(([n]) => n === name)[1];
            return [...new Set(subset.map(fn).filter(Boolean))];
        };
        let html = '';
        dims.forEach(([name]) => {
            const vals = availFor(name);
            // a selection the other filters just made impossible → reset it so we never show empty
            if (app.accSecondary[name] && app.accSecondary[name] !== 'Alle' && !vals.includes(app.accSecondary[name]))
                app.accSecondary[name] = 'Alle';
            if (vals.length > 1) {
                const cur = app.accSecondary[name] || 'Alle';
                html += `<div class="pill-group" style="margin-bottom:0.4rem;">`
                    + `<button class="pill-btn ${cur === 'Alle' ? 'active' : ''}" data-dim="${name}" data-val="Alle">${name}: Alle</button>`
                    + vals.sort((a, b) => String(a).localeCompare(String(b), undefined, { numeric: true })).map(v =>
                        `<button class="pill-btn ${cur === v ? 'active' : ''}" data-dim="${name}" data-val="${v}">${v}</button>`).join('')
                    + `</div>`;
            }
        });
        Object.keys(app.accSecondary).forEach(k => { if (!dims.some(([n]) => n === k)) delete app.accSecondary[k]; });
        secWrap.innerHTML = html;
        secWrap.querySelectorAll('.pill-btn').forEach(b => b.addEventListener('click', () => {
            app.accSecondary[b.dataset.dim] = b.dataset.val;
            app.populateAccessoires();
        }));
        dims.forEach(([name, fn]) => {
            const sel = app.accSecondary[name];
            if (sel && sel !== 'Alle') filtered = filtered.filter(c => fn(c) === sel);
        });
    }

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
                    <div style="font-size:0.8rem; font-weight:500; line-height:1.3;">${c.label || c.name}</div>
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

export { matchesSearchQuery, configSidebar, bomTableBody, bomCountCounter, getVariantColor, isRealImg, imgOf, applyPillUI, Ae, re, me, ke, Be, X, getPrice, formatCHF, PRICE_NA, priceBOM, productText, renderAccessoiresPanel, accessoryHersteller, accessorySerie };
