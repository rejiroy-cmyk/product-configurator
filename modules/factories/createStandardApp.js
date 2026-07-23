import { matchesSearchQuery, configSidebar, bomTableBody, bomCountCounter, getVariantColor, isRealImg, imgOf, applyPillUI, Ae, re, me, ke, Be, X, priceBOM } from './_shared.js';

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
                        ${(imgOf(t)) ? `<img src="${imgOf(t)}">` : '<i class="ri-image-line placeholder-icon"></i>'}
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
            priceBOM(document.getElementById('bomTableBody'));
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

