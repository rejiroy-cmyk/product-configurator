import { matchesSearchQuery, configSidebar, bomTableBody, bomCountCounter, getVariantColor, isRealImg, imgOf, applyPillUI, Ae, re, me, ke, Be, X, priceBOM } from './_shared.js';

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

                const imgUrl = imgOf(finish);
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
            priceBOM(document.getElementById('bomTableBody'));
        },
        copyToClipboard: function () {
            const finish = this.finishes.find(f => f.id === this.currentFinishId) || this.finishes[0];
            if (!finish) return;
            const text = `${finish.artNr}\t${finish.menge || 1}\n${this.baseBody.artNr}\t${this.baseBody.menge || 1}`;
            window.copyTextToClipboard(text).then(() => alert("SAP Format kopiert:\n\n" + text.replace(/\t/g, "    "))).catch(e => alert("Fehler."));
        }
    };
}

