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

export { matchesSearchQuery, configSidebar, bomTableBody, bomCountCounter, getVariantColor, getSanitasImgUrl, applyPillUI, Ae, re, me, ke, Be, X, getPrice, formatCHF, PRICE_NA, priceBOM };
