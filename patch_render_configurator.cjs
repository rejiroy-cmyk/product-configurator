const fs = require('fs');
const file = 'modules/factories.js';
let content = fs.readFileSync(file, 'utf8');

const oldRenderLoop = `
            sortedMaterials.forEach(mat => {
                if (!mat.options || mat.options.length === 0) return;

                const matClass = this.classifyAccessory(mat.options[0]) !== 'common' ? this.classifyAccessory(mat.options[0]) : this.classifyAccessory(mat);

                if (this.currentMontageart !== 'alle') {
                    if (matClass !== 'common' && matClass !== this.currentMontageart) return;
                }

                const groupDiv = document.createElement('div');
                groupDiv.className = 'filter-group';
                const label = document.createElement('label');
                label.textContent = mat.name || "Zubehör";

                const zubPool = (window.productApps && window.productApps['zubehoer_pool']) ? window.productApps['zubehoer_pool'].trays : [];

                if (mat.options.length === 1) {
                    const opt = mat.options[0];
                    const foundZub = zubPool.find(z => z.artNr === opt.artNr);
                    const finalLabel = foundZub ? foundZub.label : opt.label;

                    groupDiv.innerHTML = \`<label>\${mat.name}</label>
                            <div style="background:var(--bg-surface); padding:0.75rem; border-radius:6px; font-size:0.85rem; color:var(--text-primary); border:1px solid var(--border);">
                                <strong style="display:block; margin-bottom:0.25rem;">\${finalLabel}</strong>
                                <span style="color:var(--text-secondary); font-family:monospace;">\${opt.artNr}</span>
                            </div>\`;
                } else {
                    const select = document.createElement('select');
                    select.className = 'filter-select';
                    mat.options.forEach(opt => {
                        const foundZub = zubPool.find(z => z.artNr === opt.artNr);
                        const finalLabel = foundZub ? foundZub.label : opt.label;

                        const option = document.createElement('option');
                        option.value = opt.artNr;
                        option.textContent = opt.dropdownLabel ? opt.dropdownLabel : \`\${finalLabel} (\${opt.artNr})\`;
                        if (this.selectedTray.selections[mat.id] === opt.artNr) option.selected = true;
                        select.appendChild(option);
                    });
                    select.addEventListener('change', (e) => {
                        this.selectedTray.selections[mat.id] = e.target.value;
                        this.updateBOM();
                    });
                    groupDiv.appendChild(label);
                    groupDiv.appendChild(select);
                }
                inner.appendChild(groupDiv);
            });
`;

const newRenderLoop = `
            sortedMaterials.forEach(mat => {
                if (!mat.options || mat.options.length === 0) return;

                const matClass = this.classifyAccessory(mat.options[0]) !== 'common' ? this.classifyAccessory(mat.options[0]) : this.classifyAccessory(mat);

                if (this.currentMontageart !== 'alle') {
                    if (matClass !== 'common' && matClass !== this.currentMontageart) return;
                }

                // Check dependencies
                let blocked = false;
                let activeOptions = [...mat.options];
                let noOptionsNeeded = false;

                if (mat.dependsOn) {
                    const parentSelection = this.selectedTray.selections[mat.dependsOn];
                    if (!parentSelection) {
                        blocked = true;
                    } else if (mat.optionRules && mat.optionRules.length > 0) {
                        const rule = mat.optionRules.find(r => r.whenArtNr === parentSelection);
                        if (rule) {
                            activeOptions = mat.options.filter(o => rule.optionArtNrs.includes(o.artNr));
                            if (activeOptions.length === 0) noOptionsNeeded = true;
                        } else {
                            // If parent selected but no rule matches, maybe none are compatible or needed.
                            activeOptions = [];
                            noOptionsNeeded = true;
                        }
                    }
                }

                // If standalone, but was bundled automatically by another selection, we might want to hide it.
                // We'll handle this in updateBOM by deduping finalBOM, but visually it's cleaner to hide it.
                // Find if any currently selected material bundles this mat's options.
                let isBundled = false;
                this.selectedTray.mountingMaterials.forEach(m => {
                    if (m.id !== mat.id && this.selectedTray.selections[m.id]) {
                        const selOptArtNr = this.selectedTray.selections[m.id];
                        // check static bundles
                        if (m.bundle && m.bundle.some(b => activeOptions.some(o => o.artNr === b.artNr))) isBundled = true;
                        // check bundleRules
                        if (m.bundleRules) {
                            const r = m.bundleRules.find(br => br.optionArtNrs.includes(selOptArtNr));
                            if (r && r.bundle && r.bundle.some(b => activeOptions.some(o => o.artNr === b.artNr))) isBundled = true;
                        }
                    }
                });
                if (isBundled) return; // Completely hide redundant options if they are bundled by another selection.

                if (activeOptions.length === 0 && !blocked) return; // nothing to show

                // Auto-select first option if current selection is invalid or missing
                if (!blocked && !noOptionsNeeded) {
                    if (!this.selectedTray.selections[mat.id] || !activeOptions.find(o => o.artNr === this.selectedTray.selections[mat.id])) {
                        this.selectedTray.selections[mat.id] = activeOptions[0].artNr;
                        // Re-render immediately to propagate dependencies (cascading updates)
                        setTimeout(() => { this.renderConfigurator(); this.updateBOM(); }, 0);
                    }
                }

                const groupDiv = document.createElement('div');
                groupDiv.className = 'filter-group';
                const label = document.createElement('label');
                label.textContent = mat.name || "Zubehör";

                const zubPool = (window.productApps && window.productApps['zubehoer_pool']) ? window.productApps['zubehoer_pool'].trays : [];

                if (blocked) {
                    groupDiv.innerHTML = \`<label>\${mat.name}</label>
                            <div style="background:#fff3cd; padding:0.75rem; border-radius:6px; font-size:0.85rem; color:#856404; border:1px solid #ffeeba;">
                                <strong>Gesperrt</strong><br>
                                \${mat.blockedMessage || 'Bitte zuerst das übergeordnete Zubehör wählen.'}
                            </div>\`;
                } else if (noOptionsNeeded) {
                    groupDiv.innerHTML = \`<label>\${mat.name}</label>
                            <div style="background:#e2e3e5; padding:0.75rem; border-radius:6px; font-size:0.85rem; color:#383d41; border:1px solid #d6d8db;">
                                \${mat.noOptionsMessage || 'Keine weitere Auswahl nötig.'}
                            </div>\`;
                } else if (activeOptions.length === 1) {
                    const opt = activeOptions[0];
                    const foundZub = zubPool.find(z => z.artNr === opt.artNr);
                    const finalLabel = foundZub ? foundZub.label : opt.label;

                    groupDiv.innerHTML = \`<label>\${mat.name}</label>
                            <div style="background:var(--bg-surface); padding:0.75rem; border-radius:6px; font-size:0.85rem; color:var(--text-primary); border:1px solid var(--border);">
                                <strong style="display:block; margin-bottom:0.25rem;">\${finalLabel}</strong>
                                <span style="color:var(--text-secondary); font-family:monospace;">\${opt.artNr}</span>
                            </div>\`;
                } else {
                    const select = document.createElement('select');
                    select.className = 'filter-select';
                    activeOptions.forEach(opt => {
                        const foundZub = zubPool.find(z => z.artNr === opt.artNr);
                        const finalLabel = foundZub ? foundZub.label : opt.label;

                        const option = document.createElement('option');
                        option.value = opt.artNr;
                        option.textContent = opt.dropdownLabel ? opt.dropdownLabel : \`\${finalLabel} (\${opt.artNr})\`;
                        if (this.selectedTray.selections[mat.id] === opt.artNr) option.selected = true;
                        select.appendChild(option);
                    });
                    select.addEventListener('change', (e) => {
                        this.selectedTray.selections[mat.id] = e.target.value;
                        // Render config again to update downstream dependencies
                        this.renderConfigurator();
                        this.updateBOM();
                    });
                    groupDiv.appendChild(label);
                    groupDiv.appendChild(select);
                }
                inner.appendChild(groupDiv);
            });
`;

if (content.includes('groupDiv.innerHTML = `<label>${mat.name}</label>')) {
    // The replace string is quite large, let's use a regex that matches the forEach block
    const regex = /sortedMaterials\.forEach\(mat => \{[\s\S]*?inner\.appendChild\(groupDiv\);\s*\}\);/;
    content = content.replace(regex, newRenderLoop.trim());
    fs.writeFileSync(file, content, 'utf8');
    console.log('Render configurator patched');
} else {
    console.log('Failed to find matching block');
}
