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

export { matchesSearchQuery, configSidebar, bomTableBody, bomCountCounter, getVariantColor, getSanitasImgUrl, applyPillUI, Ae, re, me, ke, Be, X };
