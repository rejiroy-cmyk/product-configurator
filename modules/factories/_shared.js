import { COLOR_NAMES } from './_colorCodes.js';
import { fullLabel, differentiatingChips, productAttrs } from './_productDisplay.js';

function writeClipboard(text) {
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
}

// ============================================================================
//  Accessory quantity — ONE store, one helper, every configurator
// ============================================================================
// A Glashalter is often needed twice and a hook four times, so a PICKED accessory
// carries its own quantity. Before this there were four spellings of the same number
// across eight apps — a hardcoded `<strong>1</strong>` (Bademischer, Duschenmischer),
// `acc.menge || 1` (Waschtisch, Waschtischmischer), `a.qty || 1` (Bidet) and a
// hardcoded `menge: 1` / `qty: 1` (Wandklosett, Mix & Match, Relational).
//
// The store is a map on the app, keyed by art-Nr:
//     app.accQty = { '4331 217.100.000': 2 }
// Keyed, rather than a field on the selection entry, because the eight apps do not
// agree on what a selection IS: five keep objects (`selectedAddonAccessoires`), three
// keep bare art-Nr strings (`selectedAccessoires`). One map serves both without
// rewriting three toggle handlers, and it resets in one place.
//
// SCOPE — accessories only. Möbel, Schränke, Spiegelschrank and mirrors keep a fixed
// quantity of 1: they are configured single units, not serial parts. They are still
// scaled by the copy dialog, which multiplies the whole Stückliste. Mounting-material
// and dropdown rows stay read-only as well — their quantities are curated (an
// Abstellverschraubung position is 2) and `packUnits` divides by pack size, so a
// user-set quantity there would fight `accGroupChoice`.
const ACC_QTY_MAX = 99;

// `item` may be a pool object or a bare art-Nr string — the two selection shapes.
// Falls back to the article's OWN menge, so a data-side quantity still wins when the
// user has not touched the row (every pool accessory is 1 today, but that can change).
const accQty = (app, item) => {
    const art = typeof item === 'string' ? item : (item && item.artNr);
    const stored = (app && app.accQty) ? parseInt(app.accQty[art], 10) : NaN;
    if (stored >= 1) return Math.min(stored, ACC_QTY_MAX);
    const own = (item && typeof item === 'object') ? parseInt(item.menge, 10) : NaN;
    return (own >= 1) ? own : 1;
};

const setAccQty = (app, artNr, n) => {
    if (!app || !artNr) return 1;
    if (!app.accQty) app.accQty = {};
    const v = Math.max(1, Math.min(ACC_QTY_MAX, parseInt(n, 10) || 1));
    app.accQty[artNr] = v;
    return v;
};

// Drops a quantity the user can no longer see, so a de-selected accessory does not
// come back at 4 when it is picked again. Call wherever the selection is reset.
const clearAccQty = (app, artNr) => {
    if (!app || !app.accQty) return;
    if (artNr) delete app.accQty[artNr];
    else app.accQty = {};
};

// ---------------------------------------------------------------------------
// The quantity CONTRACT for a BOM row.
//
// Two readers used to recover the quantity by parsing the rendered row TEXT —
// `copyBOMToClipboard` from the first <strong>, `priceBOM` from the last cell — and
// both fall back to 1 when the parse fails, silently. That is fine while the cell
// holds nothing but digits, and a trap the moment it holds a control: a stepper
// rendering "-2+" makes the export ship ONE and the total bill ONE, with no error
// anywhere. `data-menge` states the number instead of implying it.
//
// Absent → both readers use the old text path unchanged, so a row that has not been
// migrated behaves exactly as before.
// Pass an art-Nr and the cell becomes a stepper — that is the ONLY difference between a
// read-only quantity and an editable one, so a factory opts a row in by handing over the
// art-Nr and nothing else changes. Mounting-material and dropdown rows simply never pass
// one, which is how they stay read-only.
//
// <strong> keeps ONLY the digits: the SAP export's fallback path reads the first <strong>
// in the row, so the buttons must sit outside it or the export would read "-3+".
const qtyStepperInner = (n, artNr) => {
    const btn = (d, label, glyph, off) =>
        `<button type="button" class="bom-qty-btn" data-qty-art="${artNr}" data-qty-d="${d}"`
        + ` aria-label="${label}"${off ? ' disabled' : ''}>${glyph}</button>`;
    return btn(-1, 'Menge verringern', '&minus;', n <= 1)
        + `<strong>${n}</strong>`
        + btn(1, 'Menge erhöhen', '+', n >= ACC_QTY_MAX);
};

const bomQtyCell = (n, artNr) => artNr
    ? `<td data-menge="${n}" class="bom-qty-cell">${qtyStepperInner(n, artNr)}</td>`
    : `<td data-menge="${n}"><strong>${n}</strong></td>`;

// Mix & Match and Bidet hide the BOM table entirely (`.mixmatch-active .bom-section
// { display:none }`) and show their Stückliste as a GRID in #col_preview instead, so a
// <td> never reaches the user there. Same stepper, same delegate, no table cell.
const bomQtyInline = (n, artNr, fallback) => artNr
    ? `<span class="bom-qty-cell" data-menge="${n}">${qtyStepperInner(n, artNr)}</span>`
    : (fallback !== undefined ? fallback : `${n}x`);

// ONE delegated listener for every stepper in the app, installed once on `document` —
// the BOM tbody has its innerHTML replaced on every render, so a listener bound to a
// button (or even to the tbody, in the apps that rebuild it) would not survive. Reads
// `window.currentActiveApp`, so a new configurator inherits this without wiring.
//
// ⚠ THE GUARD MUST LIVE ON `window`, NOT IN A MODULE-LEVEL `let`.
// This module is evaluated MORE THAN ONCE. Vite serves it under several URLs — the
// hand-bumped `?v=` cache-busting chain plus its own `?t=` HMR stamps — and a distinct
// URL is a distinct module instance with its own module scope:
//     /modules/factories/_shared.js?t=1786885214389&v=2.8.6
//     /modules/factories/_shared.js?t=1786885214389
//     /modules/factories/_shared.js?t=1786919099183
// A `let installed = false` is therefore per-instance and guards nothing: each instance
// added its own listener and every click on + stepped the quantity two or three times.
// Nothing throws, and the only symptom is a wrong number in a real order.
const installAccQtyDelegate = () => {
    if (typeof document === 'undefined' || !document.addEventListener) return;
    if (typeof window === 'undefined' || window.__accQtyDelegateInstalled) return;
    window.__accQtyDelegateInstalled = true;
    document.addEventListener('click', (e) => {
        const btn = e.target && e.target.closest && e.target.closest('.bom-qty-btn[data-qty-art]');
        if (!btn) return;
        e.preventDefault();
        e.stopPropagation();          // BOM rows carry their own handlers
        const app = window.currentActiveApp;
        if (!app || !app.updateBOM) return;
        const art = btn.getAttribute('data-qty-art');
        const step = parseInt(btn.getAttribute('data-qty-d'), 10) || 0;
        const next = accQty(app, art) + step;
        if (next < 1 || next > ACC_QTY_MAX) return;
        setAccQty(app, art, next);

        // the row is rebuilt, so the button under the cursor is destroyed — put keyboard
        // focus back on its replacement or a held Enter/Space walks off to the page
        const refocus = document.activeElement === btn;
        app.updateBOM();
        // Mix & Match and Bidet hide the BOM table and render the Stückliste the user
        // actually reads into #col_preview, so updateBOM alone would leave the number
        // they are looking at unchanged while the store moved underneath it.
        if (app.updatePreview) app.updatePreview();
        if (refocus) {
            const again = document.querySelector(`.bom-qty-btn[data-qty-art="${art}"][data-qty-d="${step}"]`);
            if (again && again.focus) again.focus();
        }
    });
};
installAccQtyDelegate();

// app.js has no import of this module — window.* is the cross-module bus, the same
// way copyTextToClipboard / copyBOMToClipboard are published from here.
const rowMenge = (tr) => {
    if (!tr || !tr.querySelector) return null;
    const holder = (tr.hasAttribute && tr.hasAttribute('data-menge')) ? tr : tr.querySelector('[data-menge]');
    if (!holder) return null;
    const n = parseInt(holder.getAttribute('data-menge'), 10);
    return (Number.isFinite(n) && n >= 1) ? n : null;
};

window.rowMenge = rowMenge;

// ============================================================================
//  "Ohne …" is an OPT-OUT, never an order line
// ============================================================================
// A group parked on "Ohne Schallschutz" states that the position is NOT wanted.
// It still renders a BOM row — the dropdown IS the row under gallery UX, so
// hiding it would make the choice unreachable — but it must never reach SAP.
//
// This list used to be spelled out at every copy site, and the copies drifted:
// three of them read `code !== "-" && … && !startsWith("ohne") && … "Ausstehend"`
// while `app.js`'s BOM → Eigene Selektion transfer had the same line MINUS the
// `"-"` arm. A Duschenrinne parked on "Ohne Schallschutz" renders its code cell
// as `-`, so that one row entered the wishlist as `{artNr: "-", menge: 1}` and
// the wishlist's own copy button shipped a literal `-⇥1` to SAP. Same failure
// createWCApp's DOM reader was fixed for once already — one predicate now, so
// the next reader cannot re-diverge.
//
// `bau115` is deliberately NOT caught: it is a TEXT POSITION ("Ohne
// Installationselement (bauseits)") that SAP is meant to receive as a bare
// line, the TXK103 contract. It carries a real code, so the code arm passes it
// and `row.dataset.textpos` decides how it ships.
const OHNE_LABEL_RE = /^\s*(?:[-–—]\s*)?ohne\b/i;
const OHNE_CODES = new Set(['', '-', '–', '—', 'none', 'Ausstehend']);

/** The rendered code cell of a row that is an opt-out, a placeholder or empty. */
const isOhneCode = (code) => {
    const c = String(code == null ? '' : code).trim();
    return OHNE_CODES.has(c) || c.toLowerCase().startsWith('ohne');
};

/** The model-side twin: an option/BOM item that opts its position OUT. */
const isOhneOption = (opt) =>
    !opt || !opt.artNr || isOhneCode(opt.artNr) || OHNE_LABEL_RE.test(String(opt.label || ''));

window.isOhneCode = isOhneCode;
window.isOhneOption = isOhneOption;

// ============================================================================
//  Mengen-Multiplikator — asked once, honoured by every copy path
// ============================================================================
// Every copy button in the app funnels through `window.copyTextToClipboard`, so the
// multiplier is installed HERE and nowhere else; a new configurator inherits it just
// by calling the same function. There used to be a SECOND, byte-identical definition
// in `app.js`. Whichever module evaluated last silently won (ES imports evaluate
// before the importing module's body, so app.js did), which means a wrapper put on
// the other one would have been dead code that throws nothing. Keep exactly one.
//
// The payload is SAP's `Art-Nr⇥Menge`, one position per line:
//   • a line WITH a quantity column  → Menge × Faktor
//   • a line WITHOUT one             → untouched. TXK103 is a TEXT position and
//     carries no Menge by design — multiplying it would invent one.
//   • Faktor 1                       → the string is returned unchanged, so the
//     ordinary case stays byte-for-byte what it copied before this existed.
// Text with no quantity column anywhere never opens the dialog at all, which is what
// keeps the non-BOM copies (a bare art-Nr, free text) exactly as they were.
//
// The multiplier scales the MENGE, never the number of lines: three of a
// configuration is four positions at ×3, not twelve positions.
const SAP_QTY_LINE = /^(.*\S)\t(\d+)$/;
const COPY_FACTOR_MAX = 99;

const hasSapQty = (text) => String(text).split('\n').some(l => SAP_QTY_LINE.test(l));

const multiplySapQty = (text, factor) => {
    const f = parseInt(factor, 10);
    if (!(f > 1)) return String(text);
    return String(text).split('\n').map(line => {
        const m = line.match(SAP_QTY_LINE);
        return m ? `${m[1]}\t${parseInt(m[2], 10) * f}` : line;
    }).join('\n');
};

// Builds the dialog once, out of the app's own modal classes so it themes with
// everything else. Resolves the chosen factor, or NULL when the user cancels —
// null means "say nothing", never an error, so a cancelled copy stays silent.
let copyQtyDialog = null;

const buildCopyQtyDialog = () => {
    const el = document.createElement('div');
    el.className = 'admin-modal-overlay';
    el.id = 'copyQtyModal';
    el.innerHTML = `
        <div class="admin-modal-content" style="width: 400px; max-width: calc(100vw - 2rem);">
            <div class="admin-modal-header">
                <!-- Reuses an icon the app already ships. The icon font is SUBSET to the
                     glyphs referenced today, so a NEW one renders as nothing until
                     scripts/build-offline-assets.mjs is re-run — and the static scan that
                     enforces that counts any mention, comments included. -->
                <h3><i class="ri-clipboard-line" style="color: var(--accent);"></i> Menge multiplizieren</h3>
                <button class="admin-modal-close" data-act="cancel" aria-label="Modal schließen">
                    <i class="ri-close-line" aria-hidden="true"></i>
                </button>
            </div>
            <div class="modal-body" style="gap: 0.9rem;">
                <div style="font-size:0.85rem; color:var(--text-secondary); margin-top:-0.35rem;">
                    Wie oft wird diese Konfiguration benötigt?
                </div>
                <div style="display:flex; gap:0.5rem; align-items:stretch;">
                    <button class="icon-btn" data-act="minus" aria-label="Weniger" style="width:2.75rem; flex:none; justify-content:center; font-size:1.2rem;">&minus;</button>
                    <input type="number" class="admin-input" data-el="qty" min="1" max="${COPY_FACTOR_MAX}" value="1"
                           inputmode="numeric" aria-label="Anzahl Konfigurationen"
                           style="text-align:center; font-size:1.5rem; font-weight:700; font-family:var(--st-font-mono); padding:0.5rem;">
                    <button class="icon-btn" data-act="plus" aria-label="Mehr" style="width:2.75rem; flex:none; justify-content:center; font-size:1.2rem;">+</button>
                </div>
                <!-- min-height:0 so the preview SHRINKS on a short viewport instead of being
                     pushed below the scroll of .modal-body, where it may as well not exist. -->
                <div style="min-height:0; display:flex; flex-direction:column;">
                    <div style="font-size:0.66rem; letter-spacing:0.13em; text-transform:uppercase; color:var(--text-secondary); margin-bottom:0.4rem;">
                        Zwischenablage — Vorschau
                    </div>
                    <div data-el="preview" style="background:var(--bg-base); border:1px solid var(--border); border-radius:4px; padding:0.6rem 0.7rem; max-height:clamp(4rem, 26vh, 11rem); overflow:auto; font-family:var(--st-font-mono); font-size:0.76rem;"></div>
                </div>
            </div>
            <div class="modal-footer" style="margin-top:1.25rem;">
                <button class="icon-btn" data-act="cancel">Abbrechen</button>
                <button class="icon-btn highlight-btn" data-act="ok" style="background: var(--accent); color:#000; border:none; font-weight:600;">
                    <i class="ri-clipboard-line"></i> <span data-el="oklabel">Kopieren</span>
                </button>
            </div>
        </div>`;
    document.body.appendChild(el);
    return el;
};

const askCopyFactor = (text) => new Promise((resolve) => {
    if (typeof document === 'undefined' || !document.body) return resolve(1);
    // Adopt one already in the DOM before building: this module is evaluated once per
    // URL Vite serves it under (see the delegate guard above), so a per-instance `let`
    // would let a second instance append a SECOND #copyQtyModal.
    if (!copyQtyDialog || !document.body.contains(copyQtyDialog)) {
        copyQtyDialog = document.getElementById('copyQtyModal') || buildCopyQtyDialog();
    }
    const root = copyQtyDialog;
    const input = root.querySelector('[data-el="qty"]');
    const preview = root.querySelector('[data-el="preview"]');
    const okLabel = root.querySelector('[data-el="oklabel"]');
    const okBtn = root.querySelector('[data-act="ok"]');
    const lines = String(text).split('\n');
    const prevFocus = document.activeElement;

    // Always starts at 1 and preselected: one keystroke for the ordinary copy, and a
    // factor is never silently carried over from the last Stückliste.
    input.value = '1';

    const factor = () => {
        const n = parseInt(input.value, 10);
        return (isNaN(n) || n < 1) ? null : Math.min(n, COPY_FACTOR_MAX);
    };

    const render = () => {
        const f = factor();
        preview.innerHTML = lines.map(line => {
            const m = line.match(SAP_QTY_LINE);
            const code = m ? m[1] : line;
            const qty = m ? String(parseInt(m[2], 10) * (f || 1)) : '—';
            return `<div style="display:flex; justify-content:space-between; gap:1rem; padding:0.1rem 0; white-space:nowrap;">`
                + `<span>${code}</span>`
                + `<span style="color:${m ? 'var(--accent)' : 'var(--text-secondary)'}; font-weight:${m ? '700' : '400'};">${qty}</span>`
                + `</div>`;
        }).join('');
        const ok = f !== null;
        okLabel.textContent = ok && f > 1 ? `Kopieren (×${f})` : 'Kopieren';
        okBtn.disabled = !ok;
        okBtn.style.opacity = ok ? '1' : '0.45';
        okBtn.style.cursor = ok ? 'pointer' : 'not-allowed';
    };

    const close = (value) => {
        root.classList.remove('active');
        root.removeEventListener('click', onClick);
        document.removeEventListener('keydown', onKey, true);
        input.removeEventListener('input', render);
        if (prevFocus && prevFocus.focus) { try { prevFocus.focus(); } catch (e) { /* gone */ } }
        resolve(value);
    };

    const bump = (d) => {
        const n = parseInt(input.value, 10);
        input.value = String(Math.max(1, Math.min(COPY_FACTOR_MAX, (isNaN(n) ? 1 : n) + d)));
        render();
    };

    function onClick(e) {
        const act = e.target.closest('[data-act]');
        if (act) {
            const a = act.dataset.act;
            if (a === 'cancel') return close(null);
            if (a === 'ok') { const f = factor(); if (f !== null) close(f); return; }
            if (a === 'plus') return bump(1);
            if (a === 'minus') return bump(-1);
            return;
        }
        if (e.target === root) close(null);   // click the backdrop
    }
    function onKey(e) {
        if (e.key === 'Escape') { e.stopPropagation(); close(null); }
        else if (e.key === 'Enter') { const f = factor(); if (f !== null) { e.preventDefault(); e.stopPropagation(); close(f); } }
    }

    root.addEventListener('click', onClick);
    document.addEventListener('keydown', onKey, true);
    input.addEventListener('input', render);
    render();
    root.classList.add('active');
    input.focus();
    input.select();
});

// Resolves with the text that was ACTUALLY written to the clipboard, so a caller's
// "Kopiert: …" confirmation shows the multiplied Mengen rather than the pre-dialog
// ones. Resolves with NULL when the user cancelled — callers must stay silent then.
window.copyTextToClipboard = function (text) {
    if (!hasSapQty(text)) return writeClipboard(text).then(() => text);
    return askCopyFactor(text).then(f => {
        if (f === null) return null;
        const out = multiplySapQty(text, f);
        return writeClipboard(out).then(() => out);
    });
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
                // data-menge STATES the quantity; the text path is the fallback for rows
                // that do not carry it. Reading text alone silently shipped 1 as soon as
                // the cell held anything but digits.
                const stated = rowMenge(row);
                let menge = stated != null ? String(stated)
                    : (qtyStrong ? qtyStrong.textContent.replace(/\t/g, "").trim() : "1");
                if (!/^\d+$/.test(menge)) menge = "1";
                if (!isOhneCode(code)) {
                    textLines.push(code + "\t" + menge);
                }
            }
        });
        if (textLines.length === 0) {
            alert("Keine kopierbaren Produkte gefunden.");
            return;
        }
        const text = textLines.join("\n");
        window.copyTextToClipboard(text).then(copied => {
            if (copied === null) return;   // Dialog abgebrochen — keine Meldung
            alert("Kopiert:\n\n" + copied.replace(/\t/g, "    "));
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

// ── The partner-reference trap, defused ──────────────────────────────────────
// Reading the FULL text is the global rule, but a description also says what an
// article PAIRS WITH: "Panel CWS CF Slim, zu Seifenspender CWS Paradise" is not a
// Seifenspender. Keyword-classifying the raw text turns every such accessory into
// the thing it hangs on.
//
// The marker is a zu/zur/zum/für immediately followed by the partner's NAME, and
// only that name is blanked — plus the rest of a coordinated list, because ERP
// writes "zu Seifenspender und Handtuchhalter der Serie Bali" and blanking one
// half would let the other through.
//
// The list stops at the first word that is not a coordinator, and that boundary is
// what keeps it from being greedy: a Duschablage reads "zur Glasbefestigung mit
// innenliegender Ablage und aussenliegendem Handtuchhalter" — "mit" ends the list
// at "Glasbefestigung", so the Handtuchhalter it genuinely IS still counts.
// Blanking to the next comma instead would have swallowed it.
//
// Use it on the description side of an inclusive keyword match, never as the only
// arm: keep the plain label match beside it so this can only ever subtract false
// positives, never a hit the label already earned. Identity checks (a label
// literally STARTING with the word) need none — they read the label.
const _RX_PARTNER_REF = /\b(?:passend\s+|geeignet\s+)?(?:zu|zur|zum|f[üu]r)\s+(\S+(?:\s*(?:,|und|oder|&|\/)\s*\S+)*)/g;
const withoutPartnerRefs = (text) =>
    String(text || '').replace(_RX_PARTNER_REF, (m, names) => m.slice(0, m.length - names.length));

// ── Waschtischkombination = basin + furniture in ONE art-Nr ──────────────────
// One article that is both the ceramic and the cabinet (Laufen Pro S, Duravit
// Happy D.2 Plus, Alterna progetto). Two things ride on it: SAP books the set
// under G4 rather than G1 (Mix & Match), and both basin configurators offer it as
// its own Ausführung pill.
//
// Deliberately an identity-PREFIX check, and the one place where reading less
// than the full text is right: the word sits at the head of the short text, which
// is the one part ERP truncation never eats, while a Möbelwaschtisch's
// description says "passend zur Waschtischkombination Happy D.2 Plus" and is a
// plain basin. The description is read too — with the same prefix rule — because
// it repeats the label's opening when the label itself is cut short.
// label-prefix by design
const KOMBI_LABEL = 'Waschtischkombination';          // the Ausführung pill's caption
const _RX_KOMBI = /^\s*(?:waschtisch|m[öo]bel|waschplatz)kombination\b/i;
const isWaschtischKombination = (product) => {
    if (!product) return false;
    return _RX_KOMBI.test((product.label || product.name || '').trim())
        || _RX_KOMBI.test((product.description || '').trim());
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
        // Same contract as the SAP export: data-menge first, cell text as the fallback.
        const stated = rowMenge(tr);
        const mengeTxt = stated != null ? String(stated) : (cells[cells.length - 1].textContent || '').trim();
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
// Families the configurator's OWN dropdown group owns. Offering them in the Accessoires
// panel as well gives the same art-Nr two routes into one Stückliste, and the BOM then
// carries it on two lines — which reads like a mistake once a quantity can be set.
//   Duschgleitstange — the mischer's rail group.
//   Ablaufventil     — the basin's drain-valve group. 6 Villeroy & Boch Loop & Friends
//                      Auflegewaschtische offer 3161 107/108 in an inline BOM select;
//                      the same articles sat in the pool tagged `waschtisch`.
// A drain valve belongs to the basin, not to the accessories.
const DROPDOWN_TYPES = ['Duschgleitstange', 'Ablaufventil'];

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
    'a', 'b', 'h', 'ø',
    // frame/shape words that follow a brand where a line name would be:
    // "Duschhocker Hewi, Gestell hochwertig verchromt", "Haltegriff Bodenschatz,
    // abgewinkelt" — both state construction, not a product line.
    'gestell', 'abgewinkelt', 'sechskantig'
]);
// Product lines whose name IS made of words the noise list has to keep rejecting
// elsewhere. "Stainless Steel" is CWS's own line (17 SKUs — Foam Slim, Paper Slim,
// Paperbin, Superroll …), but `stainless` is also the tail of Frost's material spec
// "Edelstahl, Polished stainless steel", which is why the token sits in the noise
// list. Single-token extraction therefore fell through to the brand and printed the
// Serie pill as "CWS" — the brand twice, once per facet, and no way to filter the
// line. A phrase wins over the token rules, so the material spelling stays noise
// while the line name comes through whole. Anchored at the brand, so it can only
// ever fire on "<Brand> <Phrase>".
// A `brand` narrows an entry to one manufacturer, and `name` may be a function of the
// match. Both exist for the same reason: a rule that is safe for ONE brand is not safe
// for all of them — see the Hewi entries below.
const ACC_SERIE_PHRASES = [
    { re: /^stainless\s+steel\b/i, name: 'Stainless Steel' },
    // Hewi's product lines ARE bare numbers (801, 802, 805, 900, System 100/800), and
    // the token rule below cannot read them: it demands a leading LETTER, because a
    // number after a brand is usually a dimension — "Bodenschatz, 33 - 51 cm" would
    // otherwise pill as "Bodenschatz 33". Anchoring to the brand is what makes the
    // digits safe. Without this, 984 pool articles plus 485 of the Ch4 accessibility
    // range all sat in one undifferentiated "Hewi" pill; they split into System
    // 100/800 (478), 900 (238), 805 (40), 801 (36), 477 and 162.
    { brand: 'Hewi', re: /^system\s+\d/i, name: 'System 100/800' },
    { brand: 'Hewi', re: /^(\d{3})\b/, name: (m) => `Hewi ${m[1]}` },
    // Keuco's lines are "Collection <name>" — Axess (135), Moll (41), Reva (30).
    // The single token gives "Collection", which says nothing and merges all three.
    { brand: 'Keuco', re: /^collection\s+([A-Za-zÀ-ÿ0-9.\-]+)/i, name: (m) => `Collection ${m[1]}` },
    // The same Nosag line is written both "Nosag Normbau Cavere" (80) and "Nosag
    // Cavere" (23) — two pills for one line unless the longer form is folded in.
    { brand: 'Nosag', re: /^normbau\s+cavere\b/i, name: 'Cavere' },
    // Alterna hangs a SHAPE on its line name with a hyphen — "piana-gewinkelt",
    // "rondo-gerade", "nonda - gerade". The token rule keeps the hyphen, so one line
    // spread over a pill per shape. The shape is a variant, the word before it is the
    // line.
    { brand: 'Alterna', re: /^([A-Za-zÀ-ÿ]+)\s*-\s*(?:gerade|gewinkelt|eckig|rund)\b/i,
      name: (m) => m[1].charAt(0).toUpperCase() + m[1].slice(1).toLowerCase() },
];

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
            const phrase = ACC_SERIE_PHRASES.find(p =>
                (!p.brand || p.brand.toLowerCase() === mfr.toLowerCase()) && p.re.test(after));
            if (phrase) return typeof phrase.name === 'function' ? phrase.name(after.match(phrase.re)) : phrase.name;
            const m = after.match(/^([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ0-9.\-]*)/);
            const tok = m ? m[1] : '';
            if (tok && tok.length > 1 && !ACC_SERIE_NOISE.has(tok.toLowerCase())) return cap(tok);
            break;   // brand found but no clean model line → group under the brand
        }
        return mfr;
    }
    return 'Andere';
};

// ── Accessory Produktkategorie ────────────────────────────────────────────────
// The value the Produktkategorie facet pills on. SAP's own `productType` is the
// default, but it is too coarse in two places:
//   • EVERY bin is tagged `Papierhandtuchspender` — 104 Abfallbehälter and 34
//     Papierkorb could only be found under "paper-towel dispenser".
//   • `WC-Zubehör` is ONE pill covering 1'277 articles that are really three
//     families (496 Papierhalter, 372 Klosettbürstenhalter, 229 Reserverollenhalter).
// The leading noun of the short text states what an article IS, so it is the honest
// source for the pill. `// label-prefix by design` (the GLOBAL RULE's identity
// exception): this asks what the product IS, it does not classify it — and that is
// precisely what keeps "Ablage …, passt zu Papierhalter" filed under Ablage instead
// of following the partner reference into the Papierhalter pill.
// Longest key first, so "Papierhandtuchspender-Abfallbehälter" cannot be eaten by
// the "Papierhandtuchspender" fallback nor "Papierabfallbehälter" by "Papierhalter".
const ACC_KATEGORIE_BY_PREFIX = [
    // bins — Reji's own grouping: "Abfallbehälter, Papierkorb etc."
    ['papierhandtuchspender-abfallbehälter', 'Abfallbehälter'],
    ['papierabfallbehälter', 'Abfallbehälter'],
    ['abfallbehälter', 'Abfallbehälter'],
    ['papierkorb', 'Abfallbehälter'],
    // WC-Zubehör, broken out
    ['doppelpapierhalter', 'Papierhalter'],
    ['toilettenpapierhalter', 'Papierhalter'],
    ['toilettenpapierspender', 'Papierhalter'],
    ['papierhalter', 'Papierhalter'],
    ['klosettbürstenhalter', 'Klosettbürstenhalter'],
    ['wc-bürste', 'Klosettbürstenhalter'],
    ['reserverollenhalter', 'Reserverollenhalter'],
    // hygiene — their own pills, so the Klosett panel can tell them apart
    ['hygieneabfallbehälter', 'Hygieneabfallbehälter'],
    ['hygienebehälter', 'Hygieneabfallbehälter'],
    ['hygienekombination', 'Hygienekombination'],
    ['hygienebeutelspender', 'Hygienebeutelspender'],
    ['winkelgriff', 'Winkelgriff'],
].sort((a, b) => b[0].length - a[0].length);

const accessoryKategorie = (t) => {
    if (!t) return null;
    const lbl = String(t.label || t.name || '').trim().toLowerCase();   // label-prefix by design
    const hit = ACC_KATEGORIE_BY_PREFIX.find(([p]) => lbl.startsWith(p));
    return hit ? hit[1] : (t.productType || null);
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
        // accessoryKategorie, not the raw productType: it splits WC-Zubehör into the
        // three families it really holds and lifts every bin out of Papierhandtuchspender.
        ['Produktkategorie', (c) => accessoryKategorie(c)],
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
            // forget the quantity with the pick, or re-ticking an accessory brings back
            // the 4 you set an hour ago
            if (isSelected) { clearAccQty(app, c.artNr); app.selectedAddonAccessoires = app.selectedAddonAccessoires.filter(x => x.artNr !== c.artNr); }
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
// (Duschsystem / Showerpipe / Paneel — the brause is already part of the unit), a
// bath-only filler with no shower outlet, or a BATH STANDMODELL (see below).
// FULL-TEXT RULE: read label AND description.
const _SELF_CONTAINED = /duschsystem|showerpipe|shower\s*pipe|duschpaneel|duschs[äa]ule|showerstation|duschset|brauseset|duschgarnitur|kopfbrausenset/i;
const _BATH_ONLY = /wanneneinlauf|wannenf[üu]ll|einlaufgarnitur|wannenrandgarnitur|wannenrandarmatur|wannenzulauf/i;
// A free-standing bath mixer SHIPS with its Brauseschlauch, Handbrause and holder —
// the article IS the set. Its Stückliste is the mixer plus its Bodeneinbaukörper and,
// where one is needed, the Montageschiene/Montageset: nothing else (Reji, 2026-08-16).
// This has to be tested BEFORE the UP branch, because a Standmodell's own text says
// "Einbaukörper … für Bodeneinbau" — the `einbau` in its floor body is what made
// `_isUPbath` classify it Unterputz and pin a wall Anschlussbogen (CHF 83.50, and
// SHOWER_STD.anschlussbogen carries no "Ohne" option) onto 34 of 36 trays.
const _BATH_STANDMODELL = /standmodell|freistehend/i;
function needsShowerAccessories(tray, opts = {}) {
    const t = productText(tray).toLowerCase();
    if (_SELF_CONTAINED.test(t)) return false;
    if (opts.isBath && _BATH_STANDMODELL.test(t)) return false;
    if (opts.isBath && _BATH_ONLY.test(t) && !/brause|dusch/.test(t)) return false;
    return true;
}

// A group whose NAME says Garnitur/-set is the BUNDLE row, never a part row.
// "Handbrausegarnitur" contains "Handbrause" and was therefore read as the tray's
// hand-shower group — which cost three things at once: the tray got no Handbrause
// row of its own, the bundling rule never found a Garnitur group to key off, and a
// three-part set sat in a dropdown next to single hand showers where it could be
// picked by accident. Group names are internal bucket labels, so this reads the name
// alone; the FULL-TEXT rule applies to the PRODUCTS inside a group (isGarniturSet).
const RX_GARNITUR_GROUP = /(?:hand)?brausen?garnitur|duschgarnitur|brauseset|duschset/i;
// Exported for the factories' own BOM-order sorts: they rank by name too, and
// `"handbrausegarnitur".includes("handbrause")` would file the bundle row as a part.
const isGarniturGroupName = (name) => RX_GARNITUR_GROUP.test(name || "");

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
    // A Garnitur group never satisfies a part group: a tray whose only "Handbrause"
    // is a "Handbrausegarnitur" still needs its own Handbrause row.
    const isGarniturGroup = (m) => RX_GARNITUR_GROUP.test(m.name || "");
    const hasGroup = (re) => materials.some(m => re.test((m.name || "")) && !isGarniturGroup(m));
    // Unterputz mixers need the Anschlussbogen (the concealed connection to the hose) — a
    // house-standard part (§2 UP item 4), added when the ERP data omits it.
    if (opts.isUP && !hasGroup(/anschlussbogen/i)) { materials.push({ name: "Anschlussbogen", options: _cloneOpts(SHOWER_STD.anschlussbogen) }); }
    if (!hasGroup(/brauseschlauch/i)) { materials.push({ name: "Brauseschlauch", options: _cloneOpts(SHOWER_STD.brauseschlauch) }); }
    if (!hasGroup(/handbrause/i)) { materials.push({ name: "Handbrause", options: _cloneOpts(SHOWER_STD.handbrause) }); }
    if (opts.isBath && !hasGroup(/brausehalter/i)) { materials.push({ name: "Brausehalter", options: _cloneOpts(SHOWER_STD.brausehalter) }); }
    // Add Brausegarnitur to all — one bundle row per tray, whatever the ERP called it.
    if (!materials.some(isGarniturGroup)) { materials.push({ name: "Brausegarnitur", options: _cloneOpts(SHOWER_STD.brausegarnitur) }); }

    // …and exactly one. Dornbracht ships the same row under two ERP spellings
    // ("Handbrausegarnitur" + "Handbrausengarnitur"), each holding different sets: two
    // rows let two rail sets be ordered side by side, and only the first would drive
    // the bundling rule. Merge them, keeping every article, deduped by art-Nr.
    const gIdx = materials.map((m, i) => isGarniturGroup(m) ? i : -1).filter(i => i >= 0);
    if (gIdx.length > 1) {
        const seen = new Set(), merged = [];
        for (const i of gIdx) for (const o of (materials[i].options || [])) {
            if (o && !seen.has(o.artNr)) { seen.add(o.artNr); merged.push(o); }
        }
        materials[gIdx[0]] = { ...materials[gIdx[0]], options: merged };
        materials = materials.filter((m, i) => gIdx.indexOf(i) <= 0);
    }

    // The Garnitur is never the default (INSTRUCTIONS.md §2): a set billed beside the
    // individual rows charges the hose twice. ERP Garnitur groups do carry an
    // "Ohne …" option but list it LAST, so the set was selected on open — the exact
    // accident this row is supposed to prevent. Pull the opt-out to the front, and
    // synthesize one for a group that has none.
    materials = materials.map(m => {
        if (!isGarniturGroup(m)) return m;
        const o = (m.options || []).slice();
        const i = o.findIndex(x => /^ohne/i.test(x.label || ""));   // label-prefix by design
        if (i > 0) o.unshift(o.splice(i, 1)[0]);
        else if (i < 0) o.unshift({ artNr: "ohne_garnitur", label: "Ohne " + (m.name || "Brausegarnitur"), menge: 0, type: "Option", imgUrl: "" });
        return { ...m, options: o };
    });

    const rank = (m) => {
        const x = ((m.name || "") + " " + (m.options?.[0]?.label || "") + " " + (m.options?.[0]?.description || "")).toLowerCase();
        if (/grundk[öo]rper|einbauk[öo]rper|ibox|homebox/.test(x)) return 0;
        if (/montageschiene|montageset/.test(x)) return 1;
        if (/anschlussbogen/.test(x)) return 2;
        if (/abstellverschraubung/.test(x)) return 3;
        // The bundle row sits directly UNDER the Handbrause — it is the alternative to
        // that row and reads as one with it. Tested on the NAME and before the part
        // rules, since "Handbrausegarnitur" would otherwise rank as a Handbrause.
        if (isGarniturGroup(m)) return 6;
        if (/brauseschlauch/.test(x)) return 4;
        if (/handbrause/.test(x)) return 5;
        if (/brausehalter/.test(x)) return 7;
        if (/gleitstange/.test(x)) return 8;
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
// Order matters: "Handbrausegarnitur" is a BUNDLE row, not the tray's Handbrause, so
// the Garnitur rule sits above the part rules; and "Anschlussbogen mit integriertem
// Brausehalter" is an Anschlussbogen.
const ACC_FAMILY_RULES = [
    [/anschlussbogen/, 'Anschlussbogen'],
    [/abstellverschraubung/, 'Abstellverschraubung'],
    [RX_GARNITUR_GROUP, 'Brausegarnitur'],
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
// `Handbrause` and are recognised by their text. A set is a SET when it names more
// than the hand shower: a rail or a hose. Both make it a substitute for separate
// rows, so it belongs in the bundle row and nowhere else — Hansgrohe Pulsify,
// Dornbracht and Axor One all ship hose sets that were sitting in the Handbrause
// dropdown next to bare hand showers.
// FULL-TEXT RULE, and it earns its keep here: "Handbrausegarnitur Fantini Fit ½",
// mit integiertem Brausenanschluss, Rosette" reads like a single article until the
// description adds "Brauseschlauch 1500 mm, Handbrause Fantini Fit".
// The word must be BRAUSE-anchored — a Duschwannengarnitur / Ablaufgarnitur is a
// drain part, not a shower set.
const _RX_GARNITUR = /brausen?garnitur|brauseset|duschset|duschgarnitur/;
const _RX_GARNITUR_RAIL = /gleitstange|brausestange|wandstange/;
// The hose is spelled four ways inside these sets — "Brauseschlauch",
// "Brausenschlauch", "Metallschlauch", a bare "Schlauch 1750 mm" — and Dornbracht
// `6431 263.501.000` carries the ERP typo "Brauseschaluch". Matching only the tidy
// spelling left three sets sitting in the Handbrause dropdown. Safe to read loosely:
// the word only counts inside an article already named a Brause-Garnitur, and not one
// of the 61 in the catalogue says "ohne …schlauch".
const _RX_GARNITUR_HOSE = /schlauch|schaluch/;
function isGarniturSet(t) {
    // ERP descriptions carry hard line breaks as markup, and they land inside the very
    // phrases read here ("ohne<br>Handbrause").
    const x = productText(t).replace(/<[^>]*>/g, ' ');
    return _RX_GARNITUR.test(x) && (_RX_GARNITUR_RAIL.test(x) || _RX_GARNITUR_HOSE.test(x));
}

// Half the sets never write the word "Gleitstange" — the bar is the series name
// ("Unica'C, 900 mm", Dornbracht "800 mm, Gelenkhalter"). SAP states the length as
// STRUCTURED data instead, and structured attributes beat the regex for the same
// question: `Ausprägung` is a bare length for a bar set ("900 mm", "110 cm") while a
// hose set's carries the thread spec (`½" x ⅜", 1250 mm`), and `Höhe` is the built
// height. Below 600 mm nothing is a shower bar, so the threshold keeps hand-shower
// dimensions out. Missing the bar left a CHF 479 rail row standing beside a set that
// already contains one.
const _RX_BARE_LENGTH = /^\s*(\d{2,4})\s*(mm|cm)?\s*$/i;
const ACC_RAIL_MIN_MM = 600;
// `Ausprägung` must carry its unit ("900 mm"); `Höhe` is a plain millimetre number.
const _lenMM = (v, unitOptional) => {
    const m = _RX_BARE_LENGTH.exec(String(v == null ? '' : v));
    if (!m || (!m[2] && !unitOptional)) return 0;
    return +m[1] * (m[2] && m[2].toLowerCase() === 'cm' ? 10 : 1);
};
function garniturHasRail(item) {
    if (_RX_GARNITUR_RAIL.test(productText(item).replace(/<[^>]*>/g, ' '))) return true;
    const tech = (item && item.tech) || null;
    if (!tech) return false;
    return _lenMM(tech['Ausprägung']) >= ACC_RAIL_MIN_MM || _lenMM(tech['Höhe'], true) >= ACC_RAIL_MIN_MM;
}

// Which part rows one CHOSEN set replaces. A set names its contents, so read them:
// switching off more rows than the set actually contains empties a row and puts
// nothing in its place. A bar set carries the holder with it; Dornbracht
// `6431 725.501.000` (bar + hose) says "ohne Handbrause" outright.
function garniturCovers(item) {
    const x = productText(item).replace(/<[^>]*>/g, ' ');   // "ohne<br>Handbrause"
    const fams = [];
    if (_RX_GARNITUR_HOSE.test(x)) fams.push('Brauseschlauch');
    if (!/ohne\s+handbrause/.test(x)) fams.push('Handbrause');
    if (garniturHasRail(item)) fams.push('Gleitstange', 'Brausehalter');
    else if (/halter/.test(x)) fams.push('Brausehalter');
    return fams;
}

// A COMPONENT of another product is not a free-standing accessory. KWC's
// `6545 114/115.501.000` is a "Duschgleitstange … für Duschsystem, wasserführende" —
// a water-carrying bar that only functions as part of its Duschsystem (SAP agrees:
// `tech.Ausprägung: "für Duschsystem"`), and at CHF 479 it was auto-filling the rail
// row of any KWC mixer as a brand match. Beware the partner-reference trap: this must
// state what the article IS, not what it pairs with — "passend zu …" does not count,
// and only these two articles in the whole accessory pool match today.
// FULL-TEXT RULE: read label + description + specs via productText().
const _RX_SYSTEM_PART = /f[üu]r\s+duschsystem|ersatzteil/;
function isSystemPart(t) {
    if (t && t.tech && /^f[üu]r\s+duschsystem$/i.test(String(t.tech['Ausprägung'] || ''))) return true;
    return _RX_SYSTEM_PART.test(productText(t));
}

// Abstellverschraubungen sit in the pool UNTAGGED (productType undefined), so a
// productType-only lookup found none and the row never got a dropdown at all.
// label-prefix by design: a label starting with "Abstellverschraubung" states what
// the product IS — the permitted identity exception to the full-text rule.
const ACC_POOL_LABEL = { Abstellverschraubung: /^abstellverschraubung/i };

// The pool is scanned per family and cached; the cache drops itself when the pool
// size changes (data loads after the first configurator may already be open).
let _accPoolCache = {}, _accPoolSize = -1;
const accPoolOf = (family) => {
    const pool = (typeof window !== 'undefined' && window.productApps
        && window.productApps.zubehoer_pool && window.productApps.zubehoer_pool.trays) || [];
    if (_accPoolSize !== pool.length) { _accPoolCache = {}; _accPoolSize = pool.length; }
    if (!_accPoolCache[family]) {
        let list;
        if (family === 'Brausegarnitur') {
            list = pool.filter(isGarniturSet);
        } else {
            // A set is three parts in one art-Nr and belongs to the Garnitur row alone —
            // it is excluded from EVERY part family, not just the Handbrause one it is
            // tagged under today, so a re-tagged set can never surface in a part dropdown.
            const types = ACC_POOL_TYPES[family] || [family];
            const byLabel = ACC_POOL_LABEL[family];
            list = pool.filter(t => (types.indexOf(t.productType) >= 0 || (byLabel && byLabel.test(t.label || '')))
                && !isGarniturSet(t));
        }
        _accPoolCache[family] = list.filter(t => !isSystemPart(t));
    }
    return _accPoolCache[family];
};

const _accItem = (base, sku) => ({
    artNr: sku.artNr,
    label: sku.label || base.label || '',
    description: sku.description || base.description || '',
    specs: sku.specs || base.specs,
    // SAP's structured attributes ride along: garniturHasRail reads the bar length
    // out of them when the text never names the bar.
    tech: sku.tech || base.tech,
    imgUrl: sku.imgUrl || base.imgUrl || '',
    menge: 1,
    brand: base.manufacturer || '',
    baseArtNr: base.artNr,
});

const ACC_TIER2_CAP = 80, ACC_TIER3_CAP = 12;
// Alterna is the house line — the standard whenever the mixer's own brand builds
// nothing in the finish. (Emporio is the same house range under its design name.)
const ACC_HOUSE_BRAND = /^(alterna|emporio)/i;
// Ranked candidate list for one family in one finish. `opts.serie` keeps an Uno Zero
// set from opening on a Starck hose; `opts.prefer`/`opts.avoid` keep the shape of the
// standard part (an Anschlussbogen "mit integriertem Brausehalter" replaces the
// separate Brausehalter, so the two shapes are not interchangeable). `opts.filter`
// REMOVES what does not fit at all — ranking is not enough when the mismatch is a
// dimension: a ½" x ¾" Abstellverschraubung does not screw onto a ½" x ½" inlet, so
// it must not be in the list, however far down.
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
        if (opts.filter && !opts.filter(base)) continue;
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
        // No brand match to be had (tier 2 is by definition another brand): then the
        // HOUSE line is the standard, not whichever brand the pool happened to list
        // first. Inert in tiers 1 and 3 — every item there is already the own brand.
        if (ACC_HOUSE_BRAND.test((x.brand || ''))) s += 3;
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

// The thread an article connects with, normalised ("½"x¾"). Two Abstellverschraubungen
// differ in nothing else, and a wrong one simply does not screw on.
// FULL-TEXT RULE: the size can sit in either field, and SAP repeats it in Ausprägung.
const _RX_THREAD = /([½⅜¾⅝]"|\d\s*\/\s*\d\s*")\s*x\s*([½⅜¾⅝]"|\d\s*\/\s*\d\s*")/;
function threadOf(item) {
    const m = _RX_THREAD.exec(productText(item).replace(/<[^>]*>/g, ' '));
    return m ? (m[1] + 'x' + m[2]).replace(/\s+/g, '') : null;
}

// How many pieces one art-Nr delivers. Alterna's stop valves are sold "Set à 2 Stück":
// a position that needs two takes ONE set, and ordering two sets bills four valves.
// FULL-TEXT RULE: the pack size is stated in the label, and truncated labels put it
// in the description instead.
const _RX_PACK = /set\s+[àa]\s+(\d+)\s*st(?:\.|ück|k)?/i;
function packUnits(item) {
    const m = _RX_PACK.exec(productText(item).replace(/<[^>]*>/g, ' '));
    const n = m ? parseInt(m[1], 10) : 1;
    return n > 0 ? n : 1;
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
    const allOpts = Array.isArray(group.options) ? group.options : [];
    const family = accFamilyOf(group.name);
    const code = opts.code || null;
    const pick = opts.pick || null;
    // label-prefix by design: an option literally starting with "Ohne" IS the opt-out.
    const isOhneOpt = (o) => !!(o && /^ohne/i.test(o.label || ''));

    // A Brausegarnitur is Brauseschlauch + Handbrause + Gleitstange in ONE art-Nr, so
    // it may only ever be offered by the Garnitur row: in a part row it is a
    // double-charge waiting to be clicked. The pool side already withholds sets from
    // the part families; this does the same for a curated/ERP list that carries one.
    // Options keep their ORIGINAL index, so a hidden entry cannot shift a stored pick
    // ({k:'std',i}) or mischerOptionsState onto a different article.
    const stdShown = allOpts.map((o, i) => ({ o, i }))
        .filter(x => family === 'Brausegarnitur' || !isGarniturSet(x.o));
    const shown = (i) => stdShown.some(x => x.i === i);
    let stdIdx = Math.min(Math.max(0, opts.stdIdx | 0), Math.max(0, allOpts.length - 1));
    if (!shown(stdIdx)) stdIdx = stdShown.length ? stdShown[0].i : 0;   // never default onto a hidden set
    const std = allOpts[stdIdx] || null;

    // Anschlussbogen comes in two shapes and they are not interchangeable — the
    // integrated-holder one replaces the separate Brausehalter group.
    let prefer = null, avoid = null, filter = null;
    if (family === 'Anschlussbogen' && std) {
        const withHolder = /integriertem brausehalter|mit brausehalter/.test(productText(std));
        prefer = withHolder ? /integriertem brausehalter|mit brausehalter/ : null;
        avoid = withHolder ? null : /integriertem brausehalter|mit brausehalter/;
    }
    // An Abstellverschraubung IS a thread size, and ½" x ¾" does not screw onto a
    // ½" x ½" inlet — offering it is offering the wrong part, so the mismatches are
    // REMOVED, not merely ranked down. An article that states no thread stays (nothing
    // to contradict); the mixer's own thread comes from the curated option.
    if (family === 'Abstellverschraubung' && std) {
        const want = threadOf(std);
        if (want) filter = (c) => { const t = threadOf(c); return !t || t === want; };
    }
    const cands = family ? accCandidates(family, opts.brand, code, { serie: opts.serie, prefer, avoid, filter }) : [];

    let item = std, tier = 0, chosenArt = null, pickedStd = -1, forcedOhne = false;
    if (opts.forceOhne) {
        // Bundled away by another group. Only SOME of these groups carry an "Ohne …"
        // option (the Handbrause and Gleitstange lists do not), so the opt-out is
        // synthesized when it is missing — otherwise the rule would silently skip
        // exactly the rows it is supposed to switch off.
        const ohne = stdShown.find(x => isOhneOpt(x.o));
        item = ohne ? ohne.o : { artNr: 'ohne_' + (family || 'zubehoer').toLowerCase(), label: 'Ohne ' + (group.name || 'Zubehör'), menge: 0 };
        pickedStd = ohne ? ohne.i : -1;
        forcedOhne = true;
    } else if (pick && pick.k === 'std') {
        if (allOpts[pick.i] && shown(pick.i)) { item = allOpts[pick.i]; pickedStd = pick.i; }
    } else if (pick && pick.k === 'pool') {
        const hit = accSkuInColour(family, pick.art, code);
        if (hit) {
            item = hit; tier = hit.tier; chosenArt = hit.artNr;
            // Tier 3 means "own brand, other colour". A pick the user made in one
            // finish and carried into another can be ANY brand, and the badge must not
            // claim a brand match it does not have — the row would read
            // "Marke passend" under a Hansgrohe set on a KWC mixer.
            const bl = (opts.brand || '').toLowerCase().trim();
            if (tier === 3 && bl && (hit.brand || '').toLowerCase().trim() !== bl) tier = 4;
        }
    } else if (cands.length && code && code !== '501' && (!isOhneOpt(std) || opts.allowOhneAutoMatch)) {
        // Auto-match. `used` holds the art-Nrs already emitted in this BOM, so two
        // groups of the same family cannot both land on the identical SKU. `autoArt`
        // pins the article a caller already decided on — the Garnitur fallback checked
        // that ITS set closes the colour gap, so the row must not fill with another.
        const auto = (opts.autoArt && cands.find(c => c.artNr === opts.autoArt))
            || cands.find(c => !opts.used || !opts.used.has(c.artNr)) || cands[0];
        item = auto; tier = auto.tier; chosenArt = auto.artNr;
    }

    // Swapping the ARTICLE must not change the POSITION's need: a Duschmischer takes
    // two Abstellverschraubungen (one per inlet, `menge: 2` on the curated option)
    // whichever brand they are, and _accItem stamps every pool part `menge: 1`.
    // What changes is how many PIECES one art-Nr delivers — Alterna sells its stop
    // valves as a "Set à 2 Stück", so two pieces are one order line, not two.
    // 88 mixer groups carry a quantity > 1 and all of them are this family.
    if (chosenArt && std) {
        const need = std.menge || 1;
        const qty = Math.max(1, Math.ceil(need / packUnits(item)));
        if (qty !== (item.menge || 1)) item = { ...item, menge: qty };
    }

    // A curated standard in a coloured BOM says so. The house parts are chrome, and a
    // chrome Abstellverschraubung or Alterna rail under a Brushed-copper mixer used to
    // render with no badge at all — silence reads as "matched". It is not always a
    // fault: for several families the catalogue simply builds nothing in that finish.
    // COLOUR RULE: compare art-Nr triplets. `000` is the colourless code (every
    // Einbau-/Grundkörper), so it never counts as a mismatch.
    if (!tier && !forcedOhne && code && item && item.artNr) {
        const c = artFinishCode(item.artNr);
        if (c && c !== '000' && c !== code) tier = 4;
    }

    // A resolved pick may sit outside the ranked list (tier-3 fallback) — make sure
    // the option it selects actually exists in the markup.
    let listed = cands;
    if (chosenArt && !cands.some(c => c.artNr === chosenArt)) listed = [item].concat(cands);

    const selVal = chosenArt ? 'c' + chosenArt : 'o' + (pickedStd >= 0 ? pickedStd : stdIdx);
    const optHTML = (c) => `<option value="c${_accEsc(c.artNr)}"${selVal === 'c' + c.artNr ? ' selected' : ''}>${_accEsc(c.label)} (${_accEsc(c.artNr)})</option>`;
    const stdHTML = stdShown.map(({ o, i }) => `<option value="o${i}"${selVal === 'o' + i ? ' selected' : ''}>${_accEsc(o.label)} (${_accEsc(o.artNr)})</option>`).join('');
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
        hasChoices: !forcedOhne && (listed.length + stdShown.length) > 1,
    };
}

// The badge under a colour-matched BOM row. Honest about WHY the part was swapped —
// a brand fallback must not claim the colour matches.
const accTierNote = (tier) => {
    if (tier === 1) return 'Farbe passend zur Armatur';
    if (tier === 2) return 'Farbe passend, andere Marke';
    if (tier === 3) return 'Marke passend, Farbe abweichend';
    if (tier === 4) return 'Farbe abweichend';   // a kept pick of another brand: claim nothing
    return '';
};

// ============================================================================
//  Brausegarnitur bundling — INSTRUCTIONS.md §2, all Dusch-/Bademischer
//
//  A Brausegarnitur IS the Brauseschlauch + Handbrause + Gleitstange in one
//  art-Nr, so picking one switches those rows off; ordering both would bill the
//  hose twice. WHICH rows go off is read off the chosen set (garniturCovers) — a
//  hose set must not empty the Gleitstange row it never contained.
//  It is never the default — EXCEPT when a bundled part has no SKU in
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
    // `bundled` = the families this plan switches off; the caller asks it per row
    // rather than assuming a set contains all four parts.
    const plan = { idx: -1, forceAuto: false, forceOhne: false, bundled: ACC_BUNDLED_BY_GARNITUR };
    if (!Array.isArray(materials)) return plan;
    plan.idx = materials.findIndex(m => accFamilyOf(m.name) === 'Brausegarnitur');
    if (plan.idx < 0) return plan;

    const pick = (opts.picks || {})[plan.idx];
    if (pick) {
        // An explicit choice decides it, and only a real set bundles: an ERP Garnitur
        // group also lists articles that merely carry the word (a hand shower with a
        // wall connector). What the set covers comes from the set itself.
        const chosen = pick.k === 'std'
            ? (materials[plan.idx].options || [])[pick.i]
            : accSkuInColour('Brausegarnitur', pick.art, opts.code);
        if (chosen && isGarniturSet(chosen)) { plan.forceOhne = true; plan.bundled = garniturCovers(chosen); }
        else if (pick.k === 'pool' && !chosen) plan.forceOhne = true;   // pool picks here are always sets
        return plan;
    }

    const code = opts.code;
    if (!code || code === '501') return plan;   // chrome: the house standards already are chrome
    const inColour = (fam) => accCandidates(fam, opts.brand, code, { serie: opts.serie })
        .some(c => c.tier === 1 || c.tier === 2);
    const missing = _GARNITUR_PARTS.filter(f => !inColour(f));
    if (!missing.length) return plan;
    // The fallback has to actually CLOSE the gap: a hose set cannot stand in for a
    // rail that has no SKU in this finish, so the set must contain every missing part.
    const cover = accCandidates('Brausegarnitur', opts.brand, code, { serie: opts.serie })
        .filter(c => (c.tier === 1 || c.tier === 2) && missing.every(f => garniturCovers(c).indexOf(f) >= 0));
    if (cover.length) {
        plan.forceAuto = true;
        plan.forceOhne = true;
        plan.bundled = garniturCovers(cover[0]);
        plan.autoArt = cover[0].artNr;   // the row fills with THIS set, so the two agree
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
// ============================================================================
//  Regenbrause → its Brausearm — INSTRUCTIONS.md §2, all Dusch-/Bademischer
//
//  A rain head states what it is sold WITHOUT. "ohne Einbaukörper 6418 101" names
//  an art-Nr (requiredBodyFor); "ohne Anschlussbogen" names none — the head simply
//  has no way onto the wall or ceiling until an arm is ordered with it. 19 of the
//  178 pool heads say so, and swapping a head into a tray that has no Brausearm row
//  (the Emporio Via Meravigli ships heads with the arm built in) left a Stückliste
//  that cannot be mounted.
//  The arm follows the HEAD's brand, not the mixer's: a Hansgrohe Raindance takes a
//  Hansgrohe arm. Colour still comes from the mixer's triplet (COLOUR RULE).
//  FULL-TEXT RULE: the phrase lives in the description; the label truncates.
// ============================================================================
const _RX_NEEDS_ARM = /ohne\s+(?:anschlussbogen|brausen?arm|wandarm|wandanschluss|deckenanschluss)/;
function requiredArmFor(item, opts = {}) {
    if (!item || !item.artNr) return null;
    const x = productText(item).replace(/<[^>]*>/g, ' ');
    if (!_RX_NEEDS_ARM.test(x)) return null;
    const brand = opts.brand || item.brand || '';
    // Wall or ceiling is the head's decision when the head states one — a ceiling
    // connector cannot mount a head meant for the wall.
    const ceiling = /decken(?:anschluss|montage|arm)/.test(x);
    const wall = !ceiling && /wand(?:anschluss|montage|arm)/.test(x);
    const prefer = ceiling ? /deckenanschluss|deckenarm/ : wall ? /wandarm|wandanschluss|brausen?arm/ : null;
    const avoid = ceiling ? /wandarm|wandanschluss/ : wall ? /deckenanschluss|deckenarm/ : null;
    const cands = accCandidates('Brausearm', brand, opts.code || artFinishCode(item.artNr), { prefer, avoid });
    const hit = cands.find(c => !opts.used || !opts.used.has(c.artNr));
    // No arm in that brand and finish: report it. Guessing one would put a part that
    // does not fit — or does not exist in the colour — into a real order.
    if (!hit) return { missingArm: brand || 'passend' };
    return { artNr: hit.artNr, label: hit.label, description: hit.description, imgUrl: hit.imgUrl, menge: 1, tier: hit.tier };
}

// ============================================================================
//  CWS dispenser → its front Panel
//
//  A CWS dispenser is a housing; the coloured front Panel is a separate article
//  and the dispenser says so in its own text, naming the panel's art-Nr base:
//
//      "… Schaumgenerator für Seifenkonzentrate, ohne Panel CF Slim 4611 230"
//
//  24 dispensers do this (12 Paradise, 12 PureLine). Ordering one without its
//  panel ships a housing nobody can use, so the panel goes into the BOM directly
//  under the dispenser it belongs to.
//
//  COLOUR RULE — the panel is always ordered in WHITE, and white is the finish
//  code 100 in the art-Nr triplet, never a word in the label. The seven colours
//  a panel comes in are all real SKUs; picking by name would pick the wrong one.
//
//  FULL-TEXT RULE: the phrase lives in the description — "ohne Panel" is the last
//  thing the truncated label ever keeps and the art-Nr never survives the cut.
//  ERP breaks lines inside the number, so tags come off before matching, exactly
//  as requiredBodyFor does.
//
//  `4611 183.000.000` says "ohne Panel" and names nothing; the catalogue pairs it
//  (p. 4.169) and inject-cws-panels.cjs writes that pairing onto the article as
//  `panelBase`. A dispenser with neither returns `{ missingPanel }` so the gap is
//  a visible row — inventing a base would put a wrong art-Nr into a real order.
// ============================================================================
const PANEL_COLOUR = '100';                                  // COLOR_NAMES['100'] === 'Weiss'
const _RX_OHNE_PANEL = /ohne\s+panel\b([^.;]*?)(\d{4})\s*(\d{3})\b/;
const _RX_HAS_PANEL_PHRASE = /ohne\s+panel\b/;
// label-prefix by design: a label starting with "Panel" states what the article IS.
const _RX_PANEL_IDENTITY = /^panel\b/i;

let _panelIdx = null, _panelIdxSize = -1;
function _buildPanelIndex() {
    const pool = ((typeof window !== 'undefined' && window.productApps
        && window.productApps.zubehoer_pool && window.productApps.zubehoer_pool.trays) || []);
    const idx = {};
    const add = (a) => {
        if (!a || !a.artNr || !_RX_PANEL_IDENTITY.test(a.label || '')) return;
        const d = String(a.artNr).replace(/[^0-9]/g, '');
        if (d.length < 13) return;
        idx[`${d.slice(0, 7)}.${d.slice(7, 10)}`] = a;
    };
    for (const t of pool) { add(t); for (const v of t.variants || []) add(v); }
    _panelIdx = idx;
    _panelIdxSize = pool.length;
}
// The panel article for one art-Nr base in one finish, or null.
function findPanelSku(base, code = PANEL_COLOUR) {
    const pool = ((typeof window !== 'undefined' && window.productApps
        && window.productApps.zubehoer_pool && window.productApps.zubehoer_pool.trays) || []);
    if (!_panelIdx || _panelIdxSize !== pool.length) _buildPanelIndex();
    return _panelIdx[`${String(base).replace(/[^0-9]/g, '')}.${code}`] || null;
}

// The white front panel a dispenser still needs, or null when it needs none.
function requiredPanelFor(item) {
    if (!item || !item.artNr) return null;
    const x = productText(item).replace(/<[^>]*>/g, ' ');
    if (!_RX_HAS_PANEL_PHRASE.test(x)) return null;
    const m = _RX_OHNE_PANEL.exec(x);
    const base = m ? m[2] + m[3] : String(item.panelBase || '').replace(/[^0-9]/g, '');
    if (!base || base.length !== 7) return { missingPanel: true };
    const hit = findPanelSku(base);
    if (!hit) return { missingPanel: true, missingBase: `${base.slice(0, 4)} ${base.slice(4)}` };
    return { artNr: hit.artNr, label: hit.label, description: hit.description, imgUrl: hit.imgUrl || '', menge: 1 };
}

// ============================================================================
//  A bin that goes on the wall needs its Wandhalterung
//
//  "Papierkorb CWS, 31 x 21 cm, … zusammenlegbar, freistehend, ohne
//  Befestigungsmaterial" — the bin ships with nothing to fix it to a wall, and the
//  bracket is a separate art-Nr. The catalogue lists ONE against all four CWS
//  Papierkorb bases (pp. 4.170, 4.179): `4611 863` Wandhalterung CWS weiss.
//
//  An explicit pairing, NOT a text rule, and that is the whole point: nearly every
//  Abfallbehälter says "freistehend oder Wandmontage" while no bracket article
//  exists to order — the pool's five "Wandhalter*" articles all belong to
//  Duschwischer and Geberit Duofix. Inferring one from the words would put a
//  Duschwischer bracket under a waste bin. The Paperbin Zubehör (`4611 876/877`
//  …) look like brackets in a Zubehör column and are Deckel and Rahmen.
//
//  Extend the map from the catalogue's own Zubehör list when a brand gains one.
//  Keyed by the bin's 7-digit BASE, so every finish of a bin inherits it.
// ============================================================================
const WALL_MOUNT_BY_BASE = {
    '4611611': '4611863',   // Papierkorb CWS, Eisengitter 31 × 21
    '4611612': '4611863',   // Papierkorb CWS, Eisengitter 40 × 25
    '4611861': '4611863',   // Papierkorb CWS Stainless Steel 40 × 25
    '4611862': '4611863',   // Papierkorb CWS Stainless Steel 30 × 18
};

// The wall bracket a bin still needs, or null when the catalogue pairs it with none.
function requiredWallMountFor(item) {
    if (!item || !item.artNr) return null;
    const digits = String(item.artNr).replace(/[^0-9]/g, '');
    if (digits.length < 7) return null;
    const base = WALL_MOUNT_BY_BASE[digits.slice(0, 7)];
    if (!base) return null;
    const hit = findArticleByBase(base);
    // Paired by the catalogue but absent from the data: report it rather than
    // guessing a finish triplet. inject-cws-wandhalterung.cjs is what fills it.
    if (!hit) return { missingWallMount: true, missingBase: `${base.slice(0, 4)} ${base.slice(4)}` };
    return { artNr: hit.artNr, label: hit.label, description: hit.description, imgUrl: hit.imgUrl || '', menge: 1 };
}

// ============================================================================
//  A part sold FOR one body leaves with it
//
//  "Befestigungsset Gessi, zu Einbaukörper 6252 859, 6252 891" only has a purpose
//  while one of those bodies is in the BOM — switch the Einbaukörper to "Ohne" (or
//  to a body it does not serve) and the set is dead weight in the order. 44 articles
//  name their body this way, some as a shared-prefix list ("6252 820 / 826 / 850").
//  FULL-TEXT RULE, and the tags are stripped first: ERP breaks lines inside the
//  number exactly as it does for the "ohne Einbaukörper" case.
// ============================================================================
const _RX_FOR_BODY = /zu\s+(?:einbau|grund)k[öo]rper\s+([\d\s,/.]+)/i;
function bodyRefsFor(item) {
    const m = _RX_FOR_BODY.exec(productText(item).replace(/<[^>]*>/g, ' '));
    if (!m) return [];
    const refs = [];
    let prefix = null;
    for (const tok of m[1].match(/\d+/g) || []) {
        if (tok.length >= 7) { refs.push(tok.slice(0, 7)); prefix = tok.slice(0, 4); }
        else if (tok.length === 4) prefix = tok;                       // "6252" — a new base prefix
        else if (tok.length === 3 && prefix) refs.push(prefix + tok);   // "859" / "891" under that prefix
    }
    return refs;
}
// True unless the item names bodies and none of them is in the BOM.
function bodyPresentFor(item, usedArtNrs) {
    const refs = bodyRefsFor(item);
    if (!refs.length) return true;
    const bases = new Set();
    for (const a of (usedArtNrs || [])) { const d = String(a).replace(/[^0-9]/g, ''); if (d.length >= 7) bases.add(d.slice(0, 7)); }
    return refs.some(r => bases.has(r));
}

function bomExtraRowHTML(item, note) {
    if (item.missingArm) {
        return `
            <tr style="background: rgba(255,166,0,0.07);">
                <td><div class="img-cell" style="background: transparent; border: 1px dashed var(--border);"><i class="ri-alert-line" style="font-size:1.2rem;opacity:0.5;"></i></div></td>
                <td><span class="bom-code">—</span></td>
                <td><div class="bom-desc">Diese Regenbrause wird ohne Anschlussbogen geliefert — es gibt keinen Brausearm ${_accEsc(item.missingArm)} in dieser Farbe. Bitte manuell ergänzen.</div></td>
                <td><strong>1</strong></td>
            </tr>`;
    }
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

export { hasSapQty, multiplySapQty, SAP_QTY_LINE, COPY_FACTOR_MAX,
    accQty, setAccQty, clearAccQty, bomQtyCell, bomQtyInline, rowMenge, ACC_QTY_MAX,
    isOhneCode, isOhneOption,
    matchesSearchQuery, configSidebar, bomTableBody, bomCountCounter, getVariantColor, isRealImg, imgOf, applyPillUI, Ae, re, me, ke, Be, X, getPrice, formatCHF, PRICE_NA, priceBOM, productText, renderAccessoiresPanel, accessoryFacetBar, accessoryHersteller, accessorySerie, accessoryKategorie, cleanSerie, galleryGridHTML, renderGalleryGrid, galleryBackButton, SHOWER_STD, needsShowerAccessories, ensureShowerGroups, outletCount, isShowerSystem, fullLabel, differentiatingChips, productAttrs, artFinishCode, accFamilyOf, accCandidates, accSkuInColour, accGroupChoice, accTierNote, isGarniturSet, garniturCovers, garniturHasRail, isSystemPart, isGarniturGroupName, threadOf, packUnits, brausegarniturPlan, ACC_BUNDLED_BY_GARNITUR, findArticleByBase, requiredBodyFor, requiredArmFor, bodyRefsFor, bodyPresentFor, bomExtraRowHTML, findPanelSku, requiredPanelFor, PANEL_COLOUR, withoutPartnerRefs, isWaschtischKombination, KOMBI_LABEL, requiredWallMountFor, WALL_MOUNT_BY_BASE };
