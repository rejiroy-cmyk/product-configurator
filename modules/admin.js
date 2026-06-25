import { catalog } from './data.js';
import { productApps } from './apps.js';
import { saveToIndexedDB, loadFromIndexedDB } from './storage.js';


/**
 * Admin Panel Controller
 * Handles CRUD operations, CSV imports, and data persistence.
 */
export function setupAdmin(modifiedApps, renderCatalog) {
    const homeView = document.getElementById('homeView');
    const configView = document.getElementById('configView');
    const adminView = document.getElementById('adminView');
    const openAdminBtn = document.getElementById('openAdminBtn');

    if (openAdminBtn) {
        const exitAdminBtn = document.getElementById('exitAdminBtn');
        const adminAppSelector = document.getElementById('adminAppSelector');
        const adminCurrentAppName = document.getElementById('adminCurrentAppName');
        const adminEditorArea = document.getElementById('adminEditorArea');
        const adminTableFilter = document.getElementById('adminTableFilter');
        const adminGlobalSearch = document.getElementById('adminGlobalSearch');
        const dropzoneOverlay = document.getElementById('dropzoneOverlay');

        const uploadCsvBtn = document.getElementById('uploadCsvBtn');
        const uploadCsvInput = document.getElementById('uploadCsvInput');

        // Recovery System: Inject Restore Button into Header
        const adminActions = document.querySelector('.admin-actions');
        if (adminActions) {
            const recoveryBtn = document.createElement('button');
            recoveryBtn.className = 'icon-btn';
            recoveryBtn.id = 'recoveryBtn';
            recoveryBtn.style.background = 'rgba(79, 70, 229, 0.12)';
            recoveryBtn.style.color = '#7c3aed';
            recoveryBtn.style.borderColor = 'rgba(124, 58, 237, 0.3)';
            recoveryBtn.style.fontWeight = '600';
            recoveryBtn.innerHTML = '<i class="ri-history-line"></i> Backup laden';
            recoveryBtn.title = 'Daten aus dem Browser-Backup (IndexedDB) wiederherstellen';
            recoveryBtn.onclick = restoreFromBackup;
            adminActions.insertBefore(recoveryBtn, adminActions.firstChild);
        }


        let currentAdminAppId = null;

        const safeJsonParse = (value, fallback) => {
            if (!value) return fallback;
            try {
                return JSON.parse(value);
            } catch (err) {
                console.warn('[Konfigurator Admin] Ignoring malformed stored JSON.', err);
                return fallback;
            }
        };

        // --- NAVIGATION & VIEW MANAGEMENT ---
        // Helper: re-detect manufacturer from label
        function detectManufacturer(tray) {
            const l = ((tray.label || '') + ' ' + (tray.description || '')).toLowerCase();
            if (l.includes('alterna')) return 'Alterna';
            if (l.includes('duscholux')) return 'Duscholux';
            if (l.includes('kaldewei')) return 'Kaldewei';
            if (l.includes('schmidlin')) return 'Schmidlin';
            if (l.includes('laufen')) return 'Laufen';
            if (l.includes('catalano')) return 'Catalano';
            if (l.includes('hansgrohe') || l.includes('hg ') || l.includes(' hg')) return 'Hansgrohe';
            if (l.includes('axor')) return 'Axor';
            if (l.includes('geberit')) return 'Geberit';
            if (l.includes('kwc')) return 'KWC';
            if (l.includes('villeroy') || l.includes('v&b') || l.includes('v+b') || l.includes('subway 2.0')) return 'Villeroy & Boch';
            if (l.includes('duravit') || l.includes('me by starck') || l.includes('philippe starck 1')) return 'Duravit';
            if (l.includes('similor')) return 'Similor';
            if (l.includes('kugler')) return 'Kugler';
            if (l.includes('schneider')) return 'Schneider';
            if (l.includes('arwa')) return 'Arwa';
            if (l.includes('totto')) return 'TOTO';
            if (l.includes('vitra')) return 'Vitra';
            if (l.includes('burgbad')) return 'Burgbad';
            if (l.includes('keuco')) return 'Keuco';
            if (l.includes('schaco')) return 'Schaco';

            // Fallback to existing or Andere
            return tray.manufacturer && tray.manufacturer !== 'Andere' ? tray.manufacturer : 'Andere';
        }

        // Helper: sync a single product (manufacturer + accessories)
        function syncProduct(tray, appId) {
            if (!tray) return;
            tray.manufacturer = detectManufacturer(tray);

            if (appId === 'duschenwanne') {
                tray.mountingMaterials = [];
                // autoLinkShowerAccessories(tray); (DISABLED - CLEAN SLATE)
            } else if (appId === 'duschenmischer' || appId === 'bademischer') {
                tray.mountingMaterials = [];
                autoLinkMixerAccessories(tray, appId);
            }
            return tray;
        }



        openAdminBtn.addEventListener('click', () => {
            homeView.classList.replace('active-view', 'hidden-view');
            configView.classList.replace('active-view', 'hidden-view');
            adminView.classList.replace('hidden-view', 'active-view');
            renderAdminSidebar();
        });

        exitAdminBtn.addEventListener('click', () => {
            adminView.classList.replace('active-view', 'hidden-view');
            homeView.classList.replace('hidden-view', 'active-view');
            if (renderCatalog) renderCatalog();
        });



        async function saveAllData(showSuccessAlert = true) {
            const apps = window.productApps || productApps;
            const dataToSave = {};
            Object.keys(apps).forEach(appId => {
                const app = apps[appId];
                dataToSave[appId] = {};
                if (app.trays) dataToSave[appId].trays = app.trays;
                if (app.parts) dataToSave[appId].parts = app.parts;
                if (app.finishes) dataToSave[appId].finishes = app.finishes;
                if (app.mainImgUrl !== undefined) dataToSave[appId].mainImgUrl = app.mainImgUrl;
            });
            const dataString = JSON.stringify(dataToSave);

            // 1. Save to IndexedDB (browser backup — no size limit)
            await saveToIndexedDB('latest_config', dataToSave);

            // 2. Write to Mac filesystem via Vite dev server bridge (primary source of truth)
            // NOTE: localStorage is intentionally NOT used here — the dataset (4.5MB+) exceeds
            // the browser's 5MB localStorage limit and causes silent crashes.
            try {
                const res = await fetch('/api/save', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: dataString
                });
                if (!res.ok) {
                    console.error('[Konfigurator] /api/save failed:', res.status);
                } else {
                    console.log('[Konfigurator] /api/save SUCCESS. File should be written.');
                }
            } catch(e) {
                console.warn('[Konfigurator] File sync unavailable (not running in dev server?):', e.message);
            }

            if (showSuccessAlert) alert('Änderungen gespeichert!');
        }


        async function restoreFromBackup() {
            console.log('[Konfigurator Admin] Attempting to restore from IndexedDB...');
            const localSnapshot = await loadFromIndexedDB('latest_config');
            console.log('[Konfigurator Admin] Local snapshot retrieved:', localSnapshot ? 'Success' : 'Empty');

            if (!localSnapshot) {
                alert('Kein lokaler Backup im Browser gefunden.');
                return;
            }
            if (confirm('Möchten Sie alle Daten aus dem Browser-Backup wiederherstellen? Dies überschreibt den aktuellen Speicherzustand.')) {
                const apps = window.productApps || productApps;
                Object.keys(localSnapshot).forEach(appId => {
                    if (apps[appId]) {
                        console.log(`[Konfigurator Admin] Restoring app: ${appId} (${localSnapshot[appId].trays?.length || 0} items)`);
                        Object.assign(apps[appId], localSnapshot[appId]);
                    }
                });
                alert('Daten aus Browser-Backup wiederhergestellt.');
                saveAllData(false); // Auto-save to server
                renderAdminSidebar();
                renderAdminEditorArea();
            }
        }


        // --- CSV UPLOAD (RE-CONNECTED) ---
        if (uploadCsvBtn) {
            uploadCsvBtn.onclick = () => uploadCsvInput.click();

            // Helper function to safely parse CSV lines respecting quotes
            const parseCsvLine = (line, delimiter) => {
                const cols = [];
                let current = '';
                let inQuotes = false;
                for (let i = 0; i < line.length; i++) {
                    const char = line[i];
                    if (inQuotes) {
                        if (char === '"') {
                            if (line[i + 1] === '"') { current += '"'; i++; } // Escaped quote
                            else inQuotes = false;
                        } else current += char;
                    } else {
                        if (char === '"') inQuotes = true;
                        else if (char === delimiter) { cols.push(current); current = ''; }
                        else current += char;
                    }
                }
                cols.push(current);
                return cols.map(c => c.trim());
            };

            uploadCsvInput.onchange = (e) => {
                const file = e.target.files[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = async (evt) => {
                    try {
                        const text = evt.target.result;
                        const lines = text.split(/\r?\n|\r/);
                        if (lines.filter(l => l.trim().length > 0).length < 1) return;

                        let del = lines[0].includes('\t') ? '\t' : (lines[0].includes(';') ? ';' : ',');
                        const currentApps = window.productApps || productApps;
                        const app = currentApps[currentAdminAppId];
                        let added = 0, updated = 0;

                        if (app.trays) {
                            let currentTray = null;
                            let targetAppId = currentAdminAppId;
                            let targetApp = (window.productApps || productApps)[targetAppId];

                            // Detect if first row is header
                            let startIdx = 0;
                            let headers = null;
                            const firstLineLower = lines[0].toLowerCase();
                            if (firstLineLower.includes('artikel') || firstLineLower.includes('art') || firstLineLower.includes('typ') || firstLineLower.includes('hersteller') || firstLineLower.includes('label')) {
                                console.log('Admin: Header row detected in CSV.');
                                startIdx = 1;
                                headers = { typ: -1, artNr: -1, label: -1, menge: -1, manufacturer: -1, size: -1, ablage: -1, form: -1 };
                                const hCols = parseCsvLine(lines[0], del);
                                hCols.forEach((h, idx) => {
                                    h = h.trim().toLowerCase();
                                    if (h.includes('typ')) headers.typ = idx;
                                    else if (h.includes('art') || h.includes('artikel')) headers.artNr = idx;
                                    else if (h.includes('bez') || h.includes('label') || h.includes('text')) headers.label = idx;
                                    else if (h.includes('menge') || h.includes('anzahl') || h.includes('amount') || h.includes('qty')) headers.menge = idx;
                                    else if (h.includes('hersteller') || h.includes('brand') || h.includes('manuf')) headers.manufacturer = idx;
                                    else if (h.includes('grösse') || h.includes('size')) headers.size = idx;
                                    else if (h.includes('form') || h.includes('shape') || h.includes('format')) headers.form = idx;
                                    else if (h.includes('ablage') || h.includes('abstell')) headers.ablage = idx;
                                });
                            }

                            try {
                                for (let i = startIdx; i < lines.length; i++) {
                                    const line = lines[i].trim();
                                    let cols = parseCsvLine(line, del);
                                    const isRowEmpty = line === '' || cols.every(c => !c || c.trim() === '');

                                    if (isRowEmpty) {
                                        currentTray = null; // Blank line means next row is a new product block
                                        continue;
                                    }

                                    let isAlt = false;
                                    let artNrColIdx = 0;
                                    let labelIdx = 1;

                                    if (headers && headers.artNr !== -1) {
                                        artNrColIdx = headers.artNr;
                                        if (headers.typ !== -1) {
                                            const t = cols[headers.typ] ? cols[headers.typ].trim().toUpperCase() : '';
                                            if (t === 'ALT' || t === 'OR') isAlt = true;
                                        } else if (cols[0].trim().toUpperCase() === 'ALT' || cols[0].trim().toUpperCase() === 'OR' || cols[0].trim() === '') {
                                            if (cols[0].trim() !== '') isAlt = true;
                                            if (artNrColIdx === 0) artNrColIdx = 1;
                                        }
                                        labelIdx = headers.label !== -1 ? headers.label : artNrColIdx + 2;
                                    } else {
                                        if (cols.length > 1 && (cols[0].trim().toUpperCase() === 'ALT' || cols[0].trim().toUpperCase() === 'OR' || cols[0].trim() === '')) {
                                            if (cols[0].trim() !== '') isAlt = true;
                                            artNrColIdx = 1;
                                        } else if (cols[0].toUpperCase().startsWith('ALT') || cols[0].toUpperCase().startsWith('OR')) {
                                            isAlt = true;
                                            cols[0] = cols[0].replace(/^(ALT|OR),?\s*/i, '').trim();
                                            artNrColIdx = 0;
                                        }
                                        labelIdx = artNrColIdx + 1;
                                        if (cols.length > artNrColIdx + 3 && !cols[artNrColIdx + 1].includes(' ')) {
                                            labelIdx = artNrColIdx + 3;
                                        } else if (cols.length > artNrColIdx + 2 && !cols[artNrColIdx + 1].includes(' ')) {
                                            labelIdx = artNrColIdx + 2;
                                        }
                                    }

                                    if (cols.length <= artNrColIdx) continue;
                                    const artNr = (cols[artNrColIdx] || '').trim();
                                    if (!artNr) continue;

                                    let label = (cols[labelIdx] || cols[artNrColIdx + 1] || '').trim();
                                    const menge = (headers && headers.menge !== -1 && cols[headers.menge]) ? parseInt(cols[headers.menge]) || 1 : 1;

                                    const looksLikeNewMain = !isAlt && cols[0].trim() !== '';

                                    if (!currentTray || (looksLikeNewMain && !headers)) {
                                        targetAppId = currentAdminAppId;
                                        const lblLower = label.toLowerCase();

                                        // Auto-routing based on Label Keywords
                                        
                                        // Auto-detect service costs and bundle them instead of treating them as main products
                                        const serviceKeywords = ['massaufnahme', 'anfahrtspauschale', 'montagepauschale', 'demontage', 'entsorgung', 'nettobetrag', 'richtpreise', 'pauschale', 'zuschlag'];
                                        const isService = serviceKeywords.some(k => lblLower.includes(k)) && !lblLower.includes('seitenwand') && !lblLower.includes('türe') && !lblLower.includes('tür');
                                        
                                        if (isService && currentTray && targetAppId === 'duschtrennwand') {
                                            if (!currentTray.services) currentTray.services = [];
                                            currentTray.services.push({ artNr, label, qty: menge });
                                            added++;
                                            continue; // Skip creating a new tray
                                        }

                                        const isAblauf = lblLower.includes('ablauf') || lblLower.includes('siebventil') || lblLower.includes('schaftventil') ||
                                            lblLower.includes('click') || lblLower.includes('clack') || lblLower.includes('clic') || lblLower.includes('clac');

                                        if (isAlt) {
                                            // If we hit an ALT item with NO currentTray, it's an orphan accessory from the pool!
                                            // UNLESS it's an Ablauf item and we are in a Mischer/Armatur tab - keep it here!
                                            if (isAblauf && (currentAdminAppId.includes('mischer') || currentAdminAppId.includes('match'))) {
                                                targetAppId = currentAdminAppId;
                                            } else {
                                                targetAppId = 'zubehoer_pool';
                                            }
                                        } else if (currentAdminAppId === 'zubehoer_pool') {
                                            // If we are EXPLICITLY in the Pool, don't let Auto-Routing hijack the products!
                                            targetAppId = 'zubehoer_pool';
                                        } else {
                                            // High Priority: If it's a valve and we're in a faucet context, don't let Ceramcis route hijack it!
                                            // Priority 1: Toilets (WC / Klosett)
                                            if (lblLower.includes('klosett') || lblLower.match(/\bwc\b/)) {
                                                if (lblLower.includes('stand')) targetAppId = 'standklosett';
                                                else targetAppId = 'wandklosett';
                                            }
                                            // Priority 2: Other Categories
                                            else if (isAblauf && (currentAdminAppId.includes('mischer') || currentAdminAppId.includes('match'))) {
                                                targetAppId = currentAdminAppId;
                                            } else if (lblLower.includes('duschmischer') || lblLower.includes('duschenmischer')) {
                                                targetAppId = 'duschenmischer';
                                            } else if (lblLower.includes('bademischer')) {
                                                targetAppId = 'bademischer';
                                            } else if (lblLower.includes('wandbatterie') || lblLower.includes('wandmischer')) {
                                                targetAppId = 'waschtischmischer';
                                            } else if (lblLower.includes('einlochmischer')) {
                                                targetAppId = 'waschtischmischer';
                                            } else if (lblLower.includes('eckventil') || lblLower.includes('waschautomat')) {
                                                targetAppId = 'wasch_einbausifon';
                                            } else if (lblLower.includes('spültischmischer')) {
                                                targetAppId = 'kueche_1teilig';
                                            } else if (lblLower.includes('waschtisch') || lblLower.includes('lavabo') || lblLower.includes('becken')) {
                                                targetAppId = 'waschtisch';
                                            } else if (lblLower.includes('duschenwanne') || lblLower.includes('duschwanne')) {
                                                targetAppId = 'duschenwanne';
                                            } else if (lblLower.includes('duschenrinne') || lblLower.includes('duschrinne') || lblLower.includes('duschkanal')) {
                                                targetAppId = 'duschenrinne';
                                            } else if (lblLower.includes('badewanne')) {
                                                targetAppId = 'badewanne';
                                            }
                                        }

                                        const currentApps = window.productApps || productApps;
                                        if (!currentApps[targetAppId]) targetAppId = currentAdminAppId;
                                        targetApp = currentApps[targetAppId];
                                        if (!targetApp.trays) targetApp.trays = [];
                                        modifiedApps.add(targetAppId);

                                        const isToilet = (targetAppId === 'wandklosett' || targetAppId === 'standklosett');
                                        let parsedSize = "Standard";
                                        let parsedForm = "Standard";
                                        let parsedMontageart = "alle";
                                        let parsedSeries = undefined;

                                        if (isToilet) {
                                            // 1. Label Extraction: Keep only Series
                                            let seriesLabel = label.split(',')[0].trim();
                                            const mfr = detectManufacturer({ label: lblLower });

                                            // Remove all variations of technical prefixes
                                            const toiletPrefixes = [/Wand-?\s*Klosett/gi, /Stand-?\s*Klosett/gi, /Wand-?\s*WC/gi, /Stand-?\s*WC/gi, /Bodenstehend/gi];
                                            toiletPrefixes.forEach(p => seriesLabel = seriesLabel.replace(p, ''));

                                            // Remove manufacturer
                                            seriesLabel = seriesLabel.replace(new RegExp(mfr, 'gi'), '').trim();

                                            // Clean up commas/dashes at the start
                                            seriesLabel = seriesLabel.replace(/^[\s,-/]+/, '').trim();
                                            parsedSeries = seriesLabel;

                                            // 2. Size Extraction (Compact < 53, Standard >= 53, SIA 500 = 70)
                                            // Match depth like ", 53," or " 53 cm"
                                            const depthMatch = lblLower.match(/,?\s*(\d{2,3})\s*(?:cm|,)/);
                                            if (depthMatch) {
                                                const depth = parseInt(depthMatch[1], 10);
                                                if (depth >= 70) parsedSize = "SIA 500";
                                                else if (depth < 53) parsedSize = "Compact";
                                                else parsedSize = "Standard";
                                            }

                                            // 3. Montage Visibility (Sichtbar / Verdeckt)
                                            if (lblLower.includes('verdeckt')) {
                                                parsedForm = "Verdeckt";
                                            } else if (lblLower.includes('sichtbar') || lblLower.includes('befestigung seitlich')) {
                                                parsedForm = "Sichtbar";
                                            }

                                            // 4. System (Unterputz / Aufputz)
                                            if (lblLower.includes('einbauspülkasten') || lblLower.includes('up-spülkasten')) {
                                                parsedMontageart = "unterputz";
                                            } else if (lblLower.includes('spülkastenmontage auf klosett') || lblLower.includes('für spülkastenmontage')) {
                                                parsedMontageart = "aufputz";
                                            } else if (lblLower.includes('unterputz')) {
                                                parsedMontageart = "unterputz";
                                            } else if (lblLower.includes('aufputz')) {
                                                parsedMontageart = "aufputz";
                                            }

                                        } else {
                                            // Standard logic for other apps
                                            if (headers && headers.size !== -1 && cols[headers.size]) {
                                                parsedSize = cols[headers.size].trim();
                                            } else {
                                                const sizeMatch = label.match(/(\d{2,4})\s?[xX\*/]\s?(\d{2,4})/);
                                                const singleSizeMatch = label.match(/(\d{2,4})\s?(cm|mm)/i);

                                                if (sizeMatch) {
                                                    let s1 = parseInt(sizeMatch[1], 10);
                                                    let s2 = parseInt(sizeMatch[2], 10);
                                                    if (s1 >= 400) s1 = Math.round(s1 / 10);
                                                    if (s2 >= 400) s2 = Math.round(s2 / 10);
                                                    parsedForm = (s1 === s2) ? "Quadratisch" : "Rechteckig";
                                                    if (s2 > s1) { const temp = s1; s1 = s2; s2 = temp; }
                                                    parsedSize = `${s1} x ${s2}`;
                                                } else if (singleSizeMatch) {
                                                    let s1 = parseInt(singleSizeMatch[1], 10);
                                                    if (singleSizeMatch[2].toLowerCase() === 'mm' || s1 >= 400) s1 = Math.round(s1 / 10);
                                                    
                                                    if (targetAppId === 'duschenrinne') {
                                                        parsedSize = `${s1}`;
                                                        parsedForm = "Rinne";
                                                    } else {
                                                        parsedSize = `${s1} x ${s1}`;
                                                        parsedForm = "Quadratisch";
                                                    }
                                                }
                                            }

                                            if (headers && headers.form !== -1 && cols[headers.form]) {
                                                parsedForm = cols[headers.form].trim();
                                            } else {
                                                if (lblLower.includes('viertelkreis') || lblLower.includes('1/4') || lblLower.includes('rund')) parsedForm = "Viertelkreis";
                                                else if (lblLower.includes('fünfeck') || lblLower.includes('5-eck') || lblLower.includes('fuenfeck')) parsedForm = "Fünfeck";
                                                else if (lblLower.includes('oval')) parsedForm = "Oval";
                                                else if (targetAppId === 'duschenrinne') parsedForm = "Rinne";
                                            }
                                        }

                                        let manufacturer = detectManufacturer({ label: lblLower, manufacturer: 'Andere' });

                                        let productImgUrl = undefined;
                                        const parts = artNr.replace(/\s/g, '').split('.');
                                        if (parts.length >= 3) {
                                            productImgUrl = `https://profishop.sanitastroesch.ch/multimedia/Web/PG1/${parts[0].padStart(8, '0')}_${parts[1]}_${parts[2]}.png`;
                                            if (!targetApp.mainImgUrl) targetApp.mainImgUrl = productImgUrl;
                                        }

                                        let existingIdx = targetApp.trays.findIndex(t => t.artNr === artNr);

                                        // Read Ablage column → overrideAbstell
                                        let overrideAbstell = undefined;
                                        if (headers && headers.ablage !== -1 && cols[headers.ablage]) {
                                            const ablageVal = cols[headers.ablage].trim().toLowerCase();
                                            if (['links', 'rechts', 'beidseitig', 'ohne'].includes(ablageVal)) {
                                                overrideAbstell = ablageVal;
                                            }
                                        }

                                        currentTray = {
                                            id: existingIdx >= 0 ? targetApp.trays[existingIdx].id : 'csv_' + Math.random().toString(36).substr(2, 5),
                                            manufacturer, form: parsedForm, size: parsedSize, montageart: parsedMontageart,
                                            serie: isToilet ? parsedSeries : undefined,
                                            artNr, label, menge,
                                            imgUrl: (existingIdx >= 0 && targetApp.trays[existingIdx].imgUrl) ? targetApp.trays[existingIdx].imgUrl : (productImgUrl || undefined),
                                            variants: [], mountingMaterials: [],
                                            ...(overrideAbstell ? { overrideAbstell } : {})
                                        };
                                        if (existingIdx >= 0) { targetApp.trays[existingIdx] = currentTray; updated++; }
                                        else { targetApp.trays.push(currentTray); added++; }

                                        // Unified Sync Logic for all categories
                                        syncProduct(currentTray, targetAppId);
                                    } else if (isAlt && currentTray.mountingMaterials.length === 0) {
                                        let vImgUrl = undefined;
                                        const vParts = artNr.replace(/\s/g, '').split('.');
                                        if (vParts.length >= 3) vImgUrl = `https://profishop.sanitastroesch.ch/multimedia/Web/PG1/${vParts[0].padStart(8, '0')}_${vParts[1]}_${vParts[2]}.png`;
                                        currentTray.variants.push({ artNr, label, menge, imgUrl: vImgUrl || undefined });
                                        added++;
                                    } else {
                                        // This is an accessory (Mandatory or Option)
                                        if (isAlt) {
                                            let oImgUrl = undefined;
                                            const oParts = artNr.replace(/\s/g, '').split('.');
                                            if (oParts.length >= 3) oImgUrl = `https://profishop.sanitastroesch.ch/multimedia/Web/PG1/${oParts[0].padStart(8, '0')}_${oParts[1]}_${oParts[2]}.png`;

                                            const lastGroup = currentTray.mountingMaterials[currentTray.mountingMaterials.length - 1];
                                            if (lastGroup) lastGroup.options.push({ artNr, label, menge, type: 'Option', imgUrl: oImgUrl || undefined });
                                        } else {
                                            const accId = 'mat_' + Math.random().toString(36).substr(2, 5);
                                            const accName = label.split(' ')[0] || 'Zubehör';

                                            let accImgUrl = undefined;
                                            const aParts = artNr.replace(/\s/g, '').split('.');
                                            if (aParts.length >= 3) accImgUrl = `https://profishop.sanitastroesch.ch/multimedia/Web/PG1/${aParts[0].padStart(8, '0')}_${aParts[1]}_${aParts[2]}.png`;

                                            currentTray.mountingMaterials.push({
                                                id: accId,
                                                name: accName,
                                                options: [{ artNr, label, menge, type: 'Zubehör', imgUrl: accImgUrl || undefined }]
                                            });
                                        }
                                    }
                                }
                            } catch (err) {
                                console.error('Import Error:', err);
                                alert(`Import Error: ${err.message}`);
                            }
                        } else if (app.parts) {
                            lines.filter(l => l.trim().length > 0).forEach(line => {
                                let cols = parseCsvLine(line, del);
                                if (cols.length < 2) return;
                                let existingIdx = app.parts.findIndex(p => p.artNr === cols[0]);
                                if (existingIdx >= 0) {
                                    app.parts[existingIdx].label = cols[cols.length > 3 ? 3 : 1];
                                    updated++;
                                } else {
                                    app.parts.push({ artNr: cols[0], label: cols[cols.length > 3 ? 3 : 1], type: 'CSV Import' });
                                    added++;
                                }
                            });
                        } else if (app.finishes) {
                            lines.filter(l => l.trim().length > 0).forEach(line => {
                                let cols = parseCsvLine(line, del);
                                if (cols.length < 2) return;
                                let existingIdx = app.finishes.findIndex(f => f.artNr === cols[0]);
                                if (existingIdx >= 0) {
                                    app.finishes[existingIdx].label = cols[cols.length > 3 ? 3 : 1];
                                    updated++;
                                } else {
                                    app.finishes.push({ id: 'csv_' + Math.random().toString(36).substr(2, 5), artNr: cols[0], label: cols[cols.length > 3 ? 3 : 1], color: '#cccccc' });
                                    added++;
                                }
                            });
                        }

                        await saveAllData(false);
                        modifiedApps.add(currentAdminAppId);
                        renderAdminEditorArea();
                        renderAdminSidebar();

                        alert(`IMPORT ERFOLGREICH!\n\nNeu hinzugefügt: ${added}\nAktualisiert: ${updated}`);
                        uploadCsvInput.value = '';
                    } catch (err) {
                        console.error('CSV Import Crash:', err);
                        alert('FEHLER BEIM IMPORT: ' + err.message);
                    }
                };
                reader.readAsText(file);
            };
        }


        // --- GLOBAL SEARCH ---
        if (adminGlobalSearch) {
            adminGlobalSearch.addEventListener('input', (e) => {
                const q = e.target.value.trim().toLowerCase();
                if (q.length < 2) return;
                let foundId = null;
                Object.keys(window.productApps || productApps).forEach(id => {
                    if (foundId) return;
                    const items = ((window.productApps || productApps)[id].trays || []).concat((window.productApps || productApps)[id].parts || []).concat((window.productApps || productApps)[id].finishes || []);
                    if (items.some(i => (i.artNr && i.artNr.toLowerCase().includes(q)) || (i.label && i.label.toLowerCase().includes(q)))) foundId = id;
                });
                if (foundId) {
                    catalog.forEach(cat => cat.subcategories.forEach(sub => {
                        if (sub.appId === foundId) {
                            openAdminEditor(sub.appId, `${cat.name} / ${sub.name}`);
                            renderAdminSidebar();
                        }
                    }));
                }
            });
        }

        // --- DRAG & DROP ---
        if (dropzoneOverlay) {
            window.addEventListener('dragenter', (e) => {
                if (adminView.classList.contains('active-view')) {
                    e.preventDefault();
                    dropzoneOverlay.classList.add('active');
                }
            });
            dropzoneOverlay.addEventListener('dragover', (e) => e.preventDefault());
            dropzoneOverlay.addEventListener('dragleave', (e) => {
                if (e.target === dropzoneOverlay) dropzoneOverlay.classList.remove('active');
            });
            dropzoneOverlay.addEventListener('drop', (e) => {
                e.preventDefault();
                dropzoneOverlay.classList.remove('active');
                if (!currentAdminAppId) return;
                const file = e.dataTransfer.files[0];
                if (file) {
                    if (/\.xlsx?$/i.test(file.name)) {
                        alert('Excel-Dateien werden nicht unterstützt. Bitte als .csv exportieren.');
                    } else {
                        uploadCsvInput.onchange({ target: { files: [file] } });
                    }
                }
            });
        }

        // --- LIVE FILTER ---
        if (adminTableFilter) {
            adminTableFilter.addEventListener('input', (e) => {
                const q = e.target.value.toLowerCase();
                adminEditorArea.querySelectorAll('tbody tr').forEach(r => r.classList.toggle('filtered', !r.textContent.toLowerCase().includes(q)));
            });
        }

        function renderAdminSidebar() {
            if (!adminAppSelector) return;
            adminAppSelector.innerHTML = '';
            const apps = window.productApps || productApps;
            const excludedApps = ['mixandmatch']; // Composite apps have no independent data

            console.log('[Konfigurator Admin] Rendering Sidebar. App counts:',
                Object.keys(apps).map(id => `${id}: ${(apps[id].trays || apps[id].parts || apps[id].finishes || []).length}`).join(', ')
            );

            catalog.forEach(cat => {
                cat.subcategories.forEach(sub => {
                    if (sub.hasApp && sub.appId && !excludedApps.includes(sub.appId)) {
                        const app = apps[sub.appId];
                        if (!app) {
                            console.warn(`[Konfigurator Admin] App definition missing for ID: ${sub.appId}`);
                            return;
                        }
                        const count = (app.trays || app.parts || app.finishes || []).length;
                        const btn = document.createElement('button');
                        btn.className = `finish-row-btn ${currentAdminAppId === sub.appId ? 'active' : ''}`;
                        btn.innerHTML = `<span>${cat.name} / ${sub.name}</span> <span class="badge ${count === 0 ? 'empty' : ''}">${count}</span>`;
                        btn.onclick = () => {
                            Array.from(adminAppSelector.children).forEach(c => c.classList.remove('active'));
                            btn.classList.add('active');
                            openAdminEditor(sub.appId, `${cat.name} / ${sub.name}`);
                        };
                        adminAppSelector.appendChild(btn);
                    }
                });
            });
        }

        function openAdminEditor(appId, name) {
            currentAdminAppId = appId;
            adminCurrentAppName.textContent = name;
            const apps = window.productApps || productApps;
            const app = apps[appId];
            const hasDataRows = (app.trays || app.parts || app.finishes);

            if (uploadCsvBtn) uploadCsvBtn.style.display = hasDataRows ? 'flex' : 'none';
            renderAdminEditorArea();
        }

        function renderAdminEditorArea() {
            if (!currentAdminAppId) return;
            const apps = window.productApps || productApps;
            const app = apps[currentAdminAppId];
            adminEditorArea.innerHTML = '';

            const header = document.createElement('div');
            header.className = 'admin-editor-header';
            header.innerHTML = `
                <div style="display:flex; gap:1rem; flex-wrap: wrap;">
                    <button class="finish-row-btn highlight-btn" id="adminResyncBtn" style="background: var(--accent); color: #000; border:none; font-weight:700;"><i class="ri-refresh-line"></i> 🔄 Patch & Sync Alle Regeln</button>
                    <button class="finish-row-btn btn-danger" id="adminWipeBtn"><i class="ri-delete-bin-line"></i> Alle löschen</button>
                    <button class="finish-row-btn btn-danger" id="adminDeleteSelectedBtn" style="display:none;"><i class="ri-delete-bin-line"></i> Markierte löschen (<span id="deleteSelectedCount">0</span>)</button>
                </div>
            `;
            adminEditorArea.appendChild(header);

            document.getElementById('adminWipeBtn').onclick = () => {
                if (confirm(`Alle Daten in ${currentAdminAppId} löschen?`)) {
                    if (app.trays) app.trays = [];
                    if (app.parts) app.parts = [];
                    if (app.finishes) app.finishes = [];
                    saveAllData(false); modifiedApps.add(currentAdminAppId); renderAdminEditorArea(); renderAdminSidebar();
                }
            };
            document.getElementById('adminResyncBtn').onclick = () => {
                const currentApps = window.productApps || productApps;
                const appIds = Object.keys(currentApps);
                const stats = appIds.map(id => `${id}: ${currentApps[id]?.trays?.length || 0}`).join('\n');
                const diagMsg = `--- SYSTEM AUDIT ---\n${stats}\n------------------\n\nProceed with Patching & Syncing all rules for ALL categories?`;

                if (!confirm(diagMsg)) return;

                let count = 0;
                console.log("🚀 Starting Global Patch & Sync...");

                appIds.forEach(appId => {
                    const app = currentApps[appId];
                    if (app && app.trays) {
                        app.trays.forEach(tray => {
                            syncProduct(tray, appId);
                            count++;
                        });
                    }
                });

                saveAllData(false);
                setTimeout(() => {
                    renderAdminSidebar();
                    renderAdminEditorArea();
                    alert(`✅ PATCH COMPLETE\n\n${count} items processed and synchronized.`);
                }, 100);
            };

            const tableWrap = document.createElement('div');
            tableWrap.className = 'admin-table-wrapper';
            const items = app.trays || app.parts || app.finishes || [];

            if (items.length > 0) {
                let tableHtml = `<table class="bom-table"><thead><tr>
                    <th width="40"><input type="checkbox" id="selectAllAdminItems" title="Alle sichtbaren auswählen"></th>
                    <th>Bild</th><th>Art-Nr</th><th>Label</th><th>Aktionen</th>
                </tr></thead><tbody>`;
                items.forEach((itm, idx) => {
                    const type = app.trays ? 'trays' : (app.parts ? 'parts' : 'finishes');
                    tableHtml += `
                        <tr>
                            <td><input type="checkbox" class="admin-item-checkbox" data-idx="${idx}" data-type="${type}"></td>
                            <td>${itm.imgUrl ? `<img src="${itm.imgUrl}" class="img-preview-mini">` : (itm.color ? `<div class="finish-swatch" style="background:${itm.color}; width:24px; height:24px;"></div>` : '-')}</td>
                            <td><span class="bom-code">${itm.artNr}</span></td>
                            <td>${itm.label}</td>
                            <td>
                                <button class="icon-btn" onclick="openEditModal('${type}', ${idx})"><i class="ri-edit-2-line"></i></button>
                                <button class="icon-btn btn-danger" onclick="deleteAdminItem('${type}', ${idx}, event)"><i class="ri-delete-bin-line"></i></button>
                            </td>
                        </tr>`;
                });
                tableHtml += `</tbody></table>`;
                tableWrap.innerHTML = tableHtml;
            } else {
                tableWrap.innerHTML = `<div style="text-align:center; padding:5rem; opacity:0.3;"><i class="ri-inbox-line" style="font-size:3rem;"></i><p>Keine Daten vorhanden.</p></div>`;
            }
            adminEditorArea.appendChild(tableWrap);

            // Bind Checkbox Logic
            setTimeout(() => bindAdminCheckboxes(currentAdminAppId), 50);
        }

        function bindAdminCheckboxes(appId) {
            const selectAll = document.getElementById('selectAllAdminItems');
            const checkboxes = document.querySelectorAll('.admin-item-checkbox');
            const delSelectedBtn = document.getElementById('adminDeleteSelectedBtn');
            const delCountSpan = document.getElementById('deleteSelectedCount');

            if (!delSelectedBtn) return;

            const updateCount = () => {
                const checked = document.querySelectorAll('.admin-item-checkbox:checked');
                if (checked.length > 0) {
                    delSelectedBtn.style.display = 'flex';
                    if (delCountSpan) delCountSpan.textContent = checked.length;
                } else {
                    delSelectedBtn.style.display = 'none';
                }
            };

            if (selectAll) {
                selectAll.addEventListener('change', (e) => {
                    checkboxes.forEach(cb => {
                        const tr = cb.closest('tr');
                        // visually filtered items shouldn't be selected
                        if (tr && !tr.classList.contains('filtered')) {
                            cb.checked = e.target.checked;
                        }
                    });
                    updateCount();
                });
            }

            checkboxes.forEach(cb => cb.addEventListener('change', updateCount));

            delSelectedBtn.onclick = () => {
                const checked = document.querySelectorAll('.admin-item-checkbox:checked');
                if (checked.length === 0) return;

                if (confirm(`Wirklich ${checked.length} markierte Elemente löschen?`)) {
                    // Extract items to delete
                    const toDelete = Array.from(checked).map(cb => ({
                        idx: parseInt(cb.dataset.idx),
                        type: cb.dataset.type
                    }));

                    // Sort descending so splicing earlier indices doesn't affect later indices
                    toDelete.sort((a, b) => b.idx - a.idx);

                    toDelete.forEach(item => {
                        if ((window.productApps || productApps)[appId] && (window.productApps || productApps)[appId][item.type]) {
                            (window.productApps || productApps)[appId][item.type].splice(item.idx, 1);
                        }
                    });

                    saveAllData(false);
                    modifiedApps.add(appId);
                    renderAdminEditorArea();
                    renderAdminSidebar();
                }
            };
        }

        window.deleteAdminItem = (type, idx, event) => {
            // Fallback for event if not explicitly passed
            const e = event || window.event;
            if (!e) {
                // If no event is found, just fallback to standard delete for safety
                if (confirm('Wirklich löschen?')) window.confirmDelete(type, idx);
                return;
            }
            const row = e.target.closest('tr');
            if (row) {
                row.style.background = 'rgba(255, 60, 60, 0.1)';
                row.innerHTML = `<td colspan="4" style="text-align:center; padding: 1rem;">
                    <strong style="color: #ff6b6b; margin-right: 1rem;">Wirklich löschen?</strong>
                    <button class="icon-btn btn-danger" style="margin-right: 0.5rem;" onclick="confirmDelete('${type}', ${idx})">Ja, Löschen</button>
                    <button class="icon-btn" onclick="renderAdminEditorArea()">Abbrechen</button>
                </td>`;
            }
        };

        window.confirmDelete = (type, idx) => {
            console.log('Deleting item at index', idx, 'from type', type);
            if ((window.productApps || productApps)[currentAdminAppId][type]) {
                (window.productApps || productApps)[currentAdminAppId][type].splice(idx, 1);
                saveAllData(false);
                modifiedApps.add(currentAdminAppId);
                renderAdminEditorArea();
                renderAdminSidebar();
            }
        };

        window.openEditModal = (type, idx) => {
            const currentApps = window.productApps || productApps;
            const item = currentApps[currentAdminAppId][type][idx];
            const isMixerApp = currentAdminAppId.toLowerCase().includes('mischer');
            const isDuschenwanneApp = currentAdminAppId === 'duschenwanne';
            const isTemplateApp = currentAdminAppId === 'vorlagen';

            const safeVal = (v) => String(v || '').replace(/"/g, '&quot;');

            let html = `
                <div class="filter-group"><label>${isTemplateApp ? 'Vorlagen-Name' : 'Art-Nr'}</label><input type="text" id="edit_artNr" class="admin-input" value="${safeVal(item.artNr)}"></div>
                <div class="filter-group"><label>${isTemplateApp ? 'Beschreibung (Intern)' : 'Label'}</label><input type="text" id="edit_label" class="admin-input" value="${safeVal(item.label)}"></div>
                ${!isTemplateApp ? `<div class="filter-group"><label>Anzahl (Vorgabe)</label><input type="number" id="edit_menge" class="admin-input" value="${item.menge || 1}"></div>` : ''}
                ${item.imgUrl !== undefined ? `<div class="filter-group"><label>Bild URL</label><input type="text" id="edit_imgUrl" class="admin-input" value="${safeVal(item.imgUrl)}"></div>` : ''}
            `;

            // Add Montageart Override for main products if relational
            if (type === 'trays' && !isTemplateApp) {
                const currentVal = item.overrideMontageart || 'auto';
                html += `
                    <div class="filter-group">
                        <label>Montageart Override (Manuelle Zuordnung)</label>
                        <select id="edit_override" class="admin-input">
                            <option value="auto" ${currentVal === 'auto' ? 'selected' : ''}>Automatisch (Keywords)</option>
                            <option value="common" ${currentVal === 'common' ? 'selected' : ''}>Alle Filter anzeigen</option>
                            <option value="${(isMixerApp || currentAdminAppId.includes('klosett')) ? 'aufputz' : 'wannenträger'}" ${currentVal === ((isMixerApp || currentAdminAppId.includes('klosett')) ? 'aufputz' : 'wannenträger') ? 'selected' : ''}>
                                ${(isMixerApp || currentAdminAppId.includes('klosett')) ? 'Aufputz (Sichtbar)' : 'Nur Wannenträger'}
                            </option>
                            <option value="${(isMixerApp || currentAdminAppId.includes('klosett')) ? 'unterputz' : 'montagerahmen'}" ${currentVal === ((isMixerApp || currentAdminAppId.includes('klosett')) ? 'unterputz' : 'montagerahmen') ? 'selected' : ''}>
                                ${(isMixerApp || currentAdminAppId.includes('klosett')) ? 'Unterputz (Eingebaut)' : 'Nur Montagerahmen'}
                            </option>
                            ${isDuschenwanneApp ? `<option value="stelzfüsse" ${currentVal === 'stelzfüsse' ? 'selected' : ''}>Nur Stelzfüsse</option>` : ''}
                            ${isDuschenwanneApp ? `<option value="nivodübel" ${currentVal === 'nivodübel' ? 'selected' : ''}>Nur Nivodübel</option>` : ''}
                            ${isDuschenwanneApp ? `<option value="wannenanker" ${currentVal === 'wannenanker' ? 'selected' : ''}>Nur Wannenanker</option>` : ''}
                            ${isMixerApp ? `<option value="standmodell" ${currentVal === 'standmodell' ? 'selected' : ''}>Standmodell</option>` : ''}
                        </select>
                    </div>
                `;

                const currentAbstell = item.overrideAbstell || 'auto';
                if (currentAdminAppId === 'waschtisch' || currentAdminAppId.includes('waschtisch')) {
                    html += `
                        <div class="filter-group">
                            <label>Abstellfläche Override</label>
                            <select id="edit_abstell_override" class="admin-input">
                                <option value="auto" ${currentAbstell === 'auto' ? 'selected' : ''}>Automatisch (Keywords)</option>
                                <option value="links" ${currentAbstell === 'links' ? 'selected' : ''}>Links</option>
                                <option value="rechts" ${currentAbstell === 'rechts' ? 'selected' : ''}>Rechts</option>
                                <option value="beidseitig" ${currentAbstell === 'beidseitig' ? 'selected' : ''}>Beidseitig</option>
                                <option value="ohne" ${currentAbstell === 'ohne' ? 'selected' : ''}>Ohne / Standard</option>
                            </select>
                        </div>
                    `;
                }
            }

            if (type === 'trays' && item.mountingMaterials) {
                html += `<div style="margin-top:2rem; border-top:1px solid var(--border); padding-top:1.5rem;">
                            <div style="display:flex; justify-content:space-between; align-items:center;">
                                <h4 style="margin:0;">Zubehör / Optionen</h4>
                                ${!isTemplateApp ? `
                                <div style="display:flex; gap:0.5rem;">
                                    <button class="icon-btn highlight-btn" style="background:#fff; color:var(--accent); border:none; font-size:0.8rem;" onclick="openTemplateSelector()"><i class="ri-folder-open-line"></i> Vorlage laden</button>
                                    <button class="icon-btn" style="font-size:0.8rem;" onclick="saveCurrentAsTemplate()"><i class="ri-save-3-line"></i> Als Vorlage speichern</button>
                                </div>
                                ` : ''}
                            </div>
                            <p style="font-size:0.85rem; color:var(--text-secondary); margin-bottom:1rem;">Alternative Zubehörprodukte hinzufügen. (Wird im Konfigurator als Dropdown angezeigt)</p>
                            <div id="adminAccessoriesEditor"></div>
                         </div>`;
            }

            document.getElementById('adminEditModalBody').innerHTML = html;
            document.getElementById('adminEditModal').classList.add('active');
            window.currentEditIdx = idx; window.currentEditType = type;

            if (type === 'trays' && item.mountingMaterials) {
                renderAccessoriesEditor(item);
            }
        };

        window.openTemplateSelector = () => {
            const templates = (window.productApps || productApps)['vorlagen'].trays;
            if (templates.length === 0) {
                alert('Keine Vorlagen gefunden. Speichern Sie zuerst eine Konfiguration als Vorlage.');
                return;
            }
            const name = prompt(`Vorlage wählen:\n${templates.map((t, idx) => `${idx + 1}. ${t.artNr}`).join('\n')}\n\nNummer eingeben:`);
            if (name) {
                const idx = parseInt(name) - 1;
                if (templates[idx]) {
                    const item = (window.productApps || productApps)[currentAdminAppId]['trays'][window.currentEditIdx];
                    // Deep copy accessories
                    item.mountingMaterials = JSON.parse(JSON.stringify(templates[idx].mountingMaterials));
                    renderAccessoriesEditor(item);
                }
            }
        };

        window.saveCurrentAsTemplate = () => {
            const item = (window.productApps || productApps)[currentAdminAppId]['trays'][window.currentEditIdx];
            const name = prompt('Name für diese Vorlage (z.B. Axor Chrome Standard):');
            if (name) {
                (window.productApps || productApps)['vorlagen'].trays.push({
                    id: 'temp_' + Math.random().toString(36).substr(2, 5),
                    artNr: name,
                    label: `Vorlage für ${item.label}`,
                    mountingMaterials: JSON.parse(JSON.stringify(item.mountingMaterials))
                });
                saveAllData(false);
                alert('Vorlage gespeichert!');
            }
        };

        function renderAccessoriesEditor(item) {
            const container = document.getElementById('adminAccessoriesEditor');
            container.innerHTML = '';
            const isMixerApp = currentAdminAppId.toLowerCase().includes('mischer');
            const isDuschenwanneApp = currentAdminAppId === 'duschenwanne';
            item.mountingMaterials.forEach((mat, mIdx) => {
                // Backward compat transform on the fly in admin mode
                if (!mat.options) {
                    mat = {
                        id: mat.id || 'mat_' + Math.random().toString(36).substr(2, 5),
                        name: mat.label ? mat.label.split(' ')[0] : 'Zubehör',
                        options: [{ artNr: mat.artNr || '', label: mat.label || '', type: mat.type || 'Zubehör' }]
                    };
                    item.mountingMaterials[mIdx] = mat;
                }

                const groupDiv = document.createElement('div');
                groupDiv.style.marginBottom = '1.5rem';
                groupDiv.style.padding = '1rem';
                groupDiv.style.background = 'rgba(255,255,255,0.02)';
                groupDiv.style.borderRadius = '8px';

                let optsHtml = '';
                mat.options.forEach((opt, oIdx) => {
                    const overrideVal = opt.overrideMontageart || 'auto';
                    optsHtml += `
                        <div style="display:flex; gap:0.5rem; margin-bottom:0.5rem; align-items:center;">
                            <div style="display:flex; flex-direction:column; gap:2px;">
                                ${oIdx > 0 ? `<button class="icon-btn" style="padding:0.1rem; font-size:0.7rem; background:rgba(255,255,255,0.05);" onclick="moveAccessoryOption(${mIdx}, ${oIdx}, -1)"><i class="ri-arrow-up-s-line"></i></button>` : `<div style="height:15px"></div>`}
                                ${oIdx < mat.options.length - 1 ? `<button class="icon-btn" style="padding:0.1rem; font-size:0.7rem; background:rgba(255,255,255,0.05);" onclick="moveAccessoryOption(${mIdx}, ${oIdx}, 1)"><i class="ri-arrow-down-s-line"></i></button>` : `<div style="height:15px"></div>`}
                            </div>
                            <input type="text" class="admin-input" style="flex:1" placeholder="Art-Nr" onchange="updateAccessoryOption(${mIdx}, ${oIdx}, 'artNr', this.value)" value="${opt.artNr}">
                            <input type="text" class="admin-input" style="flex:2" placeholder="Label" onchange="updateAccessoryOption(${mIdx}, ${oIdx}, 'label', this.value)" value="${opt.label}">
                            <input type="number" class="admin-input" style="width:60px" placeholder="Menge" onchange="updateAccessoryOption(${mIdx}, ${oIdx}, 'menge', parseInt(this.value)||1)" value="${opt.menge || 1}">
                            ${!isMixerApp ? `
                            <select class="admin-input" style="flex:1.2; padding: 0.25rem;" onchange="updateAccessoryOption(${mIdx}, ${oIdx}, 'overrideMontageart', this.value)">
                                <option value="auto" ${overrideVal === 'auto' ? 'selected' : ''}>Auto</option>
                                <option value="common" ${overrideVal === 'common' ? 'selected' : ''}>Beides</option>
                                <option value="wannenträger" ${overrideVal === 'wannenträger' ? 'selected' : ''}>Nur Träger</option>
                                <option value="montagerahmen" ${overrideVal === 'montagerahmen' ? 'selected' : ''}>Nur Rahmen</option>
                                ${isDuschenwanneApp ? `<option value="stelzfüsse" ${overrideVal === 'stelzfüsse' ? 'selected' : ''}>Nur Stelzfüsse</option>` : ''}
                                ${isDuschenwanneApp ? `<option value="nivodübel" ${overrideVal === 'nivodübel' ? 'selected' : ''}>Nur Nivodübel</option>` : ''}
                                ${isDuschenwanneApp ? `<option value="wannenanker" ${overrideVal === 'wannenanker' ? 'selected' : ''}>Nur Wannenanker</option>` : ''}
                            </select>
                            ` : ''}
                            <button class="icon-btn btn-danger" style="padding:0.5rem;" onclick="removeAccessoryOption(${mIdx}, ${oIdx})"><i class="ri-delete-bin-line"></i></button>
                        </div>
                    `;
                });

                groupDiv.innerHTML = `
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem;">
                        <input type="text" class="admin-input" style="font-weight:bold; max-width:200px; background:transparent;" onchange="updateAccessoryGroupName(${mIdx}, this.value)" value="${mat.name}">
                        <div style="display:flex; gap:0.5rem; align-items:center;">
                            ${mIdx > 0 ? `<button class="icon-btn" style="padding:0.3rem; font-size:0.9rem; background:rgba(255,255,255,0.05);" onclick="moveAccessoryGroup(${mIdx}, -1)"><i class="ri-arrow-up-line"></i></button>` : `<div style="width:28px"></div>`}
                            ${mIdx < item.mountingMaterials.length - 1 ? `<button class="icon-btn" style="padding:0.3rem; font-size:0.9rem; background:rgba(255,255,255,0.05);" onclick="moveAccessoryGroup(${mIdx}, 1)"><i class="ri-arrow-down-line"></i></button>` : `<div style="width:28px"></div>`}
                            <div style="width:8px;"></div>
                            <button class="icon-btn highlight-btn" style="padding:0.3rem 0.6rem; font-size:0.8rem;" onclick="addAccessoryOption(${mIdx})"><i class="ri-add-line"></i> Option</button>
                            <button class="icon-btn highlight-btn" style="padding:0.3rem 0.6rem; font-size:0.8rem; background:#fff; color:var(--accent);" onclick="window.openPoolBrowser(${mIdx})"><i class="ri-search-eye-line"></i> Pool</button>
                        </div>
                    </div>
                    ${optsHtml}
                `;
                container.appendChild(groupDiv);
            });

            if (isMixerApp) {
                const addSlotBtn = document.createElement('button');
                addSlotBtn.className = "icon-btn highlight-btn";
                addSlotBtn.style.padding = "0.5rem 1rem";
                addSlotBtn.innerHTML = "<i class='ri-add-circle-line'></i> Neues Zubehör hinzufügen";
                addSlotBtn.onclick = () => {
                    item.mountingMaterials.push({
                        id: 'mat_' + Math.random().toString(36).substr(2, 5),
                        name: 'Neues Zubehör',
                        options: [{ artNr: '', label: '', type: 'Zubehör' }]
                    });
                    renderAccessoriesEditor(item);
                };
                container.appendChild(addSlotBtn);

                const fromPoolBtn = document.createElement('button');
                fromPoolBtn.className = "icon-btn highlight-btn";
                fromPoolBtn.style.padding = "0.5rem 1rem";
                fromPoolBtn.style.marginLeft = "0.5rem";
                fromPoolBtn.style.background = "#fff";
                fromPoolBtn.style.color = "var(--accent)";
                fromPoolBtn.innerHTML = "<i class='ri-search-eye-line'></i> Vom Pool hinzufügen";
                fromPoolBtn.onclick = () => { window.openPoolBrowser(-1); };
                container.appendChild(fromPoolBtn);
            } else {
                const addSlotBtn = document.createElement('button');
                addSlotBtn.className = "finish-row-btn";
                addSlotBtn.innerHTML = "<i class='ri-add-circle-line'></i> Neue Zubehör-Gruppe";
                addSlotBtn.onclick = () => {
                    item.mountingMaterials.push({
                        id: 'mat_' + Math.random().toString(36).substr(2, 5),
                        name: 'Neues Zubehör',
                        options: [{ artNr: '', label: '', type: 'Zubehör' }]
                    });
                    renderAccessoriesEditor(item);
                };
                container.appendChild(addSlotBtn);
            }
        }

        window.moveAccessoryGroup = (mIdx, dir) => {
            const item = (window.productApps || productApps)[currentAdminAppId]['trays'][window.currentEditIdx];
            if (!item || !item.mountingMaterials) return;
            const targetIdx = mIdx + dir;
            if (targetIdx < 0 || targetIdx >= item.mountingMaterials.length) return;

            const temp = item.mountingMaterials[mIdx];
            item.mountingMaterials[mIdx] = item.mountingMaterials[targetIdx];
            item.mountingMaterials[targetIdx] = temp;

            renderAccessoriesEditor(item);
        };

        window.moveAccessoryOption = (mIdx, oIdx, dir) => {
            const item = (window.productApps || productApps)[currentAdminAppId]['trays'][window.currentEditIdx];
            if (!item || !item.mountingMaterials) return;
            const targetIdx = oIdx + dir;
            if (targetIdx < 0 || targetIdx >= item.mountingMaterials[mIdx].options.length) return;

            const temp = item.mountingMaterials[mIdx].options[oIdx];
            item.mountingMaterials[mIdx].options[oIdx] = item.mountingMaterials[mIdx].options[targetIdx];
            item.mountingMaterials[mIdx].options[targetIdx] = temp;

            renderAccessoriesEditor(item);
        };

        window.openPoolBrowser = (mIdx) => {
            const modal = document.getElementById('poolBrowserModal');
            const search = document.getElementById('poolBrowserSearch');
            const results = document.getElementById('poolBrowserResults');
            const footer = document.getElementById('poolBrowserFooter');
            const countSpan = document.getElementById('poolSelectionCount');
            if (!modal || !results) return;

            window.currentPoolTargetGroup = mIdx;
            window.selectedPoolIndices = new Set();
            modal.classList.add('active');
            search.value = '';
            if (footer) footer.style.display = 'flex';
            if (countSpan) countSpan.textContent = '0 Artikel ausgewählt';

            const renderPoolResults = (filter = '') => {
                const q = filter.toLowerCase();
                const pool = (window.productApps || productApps)['zubehoer_pool'] ? ((window.productApps || productApps)['zubehoer_pool'].trays || []) : [];
                const filtered = pool.filter(p => !q || (p.artNr || '').toLowerCase().includes(q) || (p.label || '').toLowerCase().includes(q));

                window.lastFilteredPool = filtered;

                results.innerHTML = filtered.map((p, idx) => `
                    <div style="display:flex; align-items:center; gap:1rem; padding:0.75rem; border-bottom:1px solid rgba(255,255,255,0.05); cursor:pointer;" onclick="togglePoolSelection(${idx}, event)">
                        <input type="checkbox" class="pool-item-check" data-idx="${idx}" ${window.selectedPoolIndices.has(idx) ? 'checked' : ''} onclick="event.stopPropagation()">
                        <div style="width:40px; height:40px; background:#fff; border-radius:4px; padding:2px; flex-shrink:0;">
                            <img src="${p.imgUrl || ''}" style="max-width:100%; max-height:100%; object-fit:contain;">
                        </div>
                        <div style="flex:1; min-width:0;">
                            <strong style="display:block; font-size:0.9rem; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${p.label}</strong>
                            <span style="font-size:0.75rem; color:var(--text-secondary);">${p.artNr}</span>
                        </div>
                    </div>
                `).join('') || '<div style="padding:2rem; text-align:center; opacity:0.5;">Keine Artikel im Pool gefunden.</div>';
            };

            window.togglePoolSelection = (idx, event) => {
                if (window.selectedPoolIndices.has(idx)) window.selectedPoolIndices.delete(idx);
                else window.selectedPoolIndices.add(idx);

                const cb = results.querySelectorAll('.pool-item-check')[idx];
                if (cb) cb.checked = window.selectedPoolIndices.has(idx);

                if (countSpan) countSpan.textContent = `${window.selectedPoolIndices.size} Artikel ausgewählt`;
            };

            search.oninput = (e) => renderPoolResults(e.target.value);
            renderPoolResults();
        };

        window.linkSelectedPoolItems = () => {
            if (window.selectedPoolIndices.size === 0) return;

            const mIdx = window.currentPoolTargetGroup;
            const item = (window.productApps || productApps)[currentAdminAppId]['trays'][window.currentEditIdx];
            const selectedIndices = Array.from(window.selectedPoolIndices);

            if (mIdx === -1) {
                // Create ONE new group for ALL selected items
                const firstP = window.lastFilteredPool[selectedIndices[0]];
                const newGroup = {
                    id: 'mat_' + Math.random().toString(36).substr(2, 5),
                    name: firstP.label.split(' ')[0] || 'Zubehör',
                    options: []
                };

                selectedIndices.forEach(idx => {
                    const p = window.lastFilteredPool[idx];
                    if (p) newGroup.options.push({ artNr: p.artNr, label: p.label, type: 'Option', imgUrl: p.imgUrl || '' });
                });

                item.mountingMaterials.push(newGroup);
            } else {
                // Add ALL selected items to the EXISTING group
                selectedIndices.forEach(idx => {
                    const p = window.lastFilteredPool[idx];
                    if (p) item.mountingMaterials[mIdx].options.push({ artNr: p.artNr, label: p.label, type: 'Option', imgUrl: p.imgUrl || '' });
                });
            }

            document.getElementById('poolBrowserModal').classList.remove('active');
            renderAccessoriesEditor(item);
        };

        window.updateAccessoryGroupName = (mIdx, val) => {
            const item = (window.productApps || productApps)[currentAdminAppId]['trays'][window.currentEditIdx];
            item.mountingMaterials[mIdx].name = val;
        };
        window.updateAccessoryOption = (mIdx, oIdx, field, val) => {
            const item = (window.productApps || productApps)[currentAdminAppId]['trays'][window.currentEditIdx];
            item.mountingMaterials[mIdx].options[oIdx][field] = val;
        };
        window.addAccessoryOption = (mIdx) => {
            const item = (window.productApps || productApps)[currentAdminAppId]['trays'][window.currentEditIdx];
            item.mountingMaterials[mIdx].options.push({ artNr: '', label: '', type: 'Option' });
            renderAccessoriesEditor(item);
        };
        window.removeAccessoryOption = (mIdx, oIdx) => {
            const item = (window.productApps || productApps)[currentAdminAppId]['trays'][window.currentEditIdx];
            item.mountingMaterials[mIdx].options.splice(oIdx, 1);
            if (item.mountingMaterials[mIdx].options.length === 0) {
                item.mountingMaterials.splice(mIdx, 1);
            }
            renderAccessoriesEditor(item);
        };

        const saveModalBtn = document.getElementById('saveEditModalBtn');
        saveModalBtn.onclick = () => {
            const item = (window.productApps || productApps)[currentAdminAppId][window.currentEditType][window.currentEditIdx];
            item.artNr = document.getElementById('edit_artNr').value;
            item.label = document.getElementById('edit_label').value;
            item.menge = parseInt(document.getElementById('edit_menge').value) || 1;
            if (document.getElementById('edit_imgUrl')) item.imgUrl = document.getElementById('edit_imgUrl').value;
            if (document.getElementById('edit_override')) {
                item.overrideMontageart = document.getElementById('edit_override').value;
            }
            if (document.getElementById('edit_abstell_override')) {
                item.overrideAbstell = document.getElementById('edit_abstell_override').value;
            }
            document.getElementById('adminEditModal').classList.remove('active');
            saveAllData(false); renderAdminEditorArea();
        };
    }

    function getBrandSpecificHandbrausen(mixerManufacturer, mixerLabel, appId) {
        const currentApps = window.productApps || productApps;
        if (!currentApps['zubehoer_pool']) return [];
        const pool = [
            ...(currentApps['zubehoer_pool'].trays || []),
            ...(currentApps['zubehoer_pool'].parts || []),
            ...(currentApps['zubehoer_pool'].finishes || [])
        ];
        
        const allHb = pool.filter(p => {
            // Use first word of label as the product type — unambiguous and brand-agnostic
            const firstWord = (p.label || '').trim().split(/\s+/)[0].toLowerCase();
            return firstWord === 'handbrause';
        });

        let results = [];
        let standardArtNr = null;

        if (mixerManufacturer) {
            const m = mixerManufacturer.toLowerCase();
            const l = (mixerLabel || '').toLowerCase();
            
            // Map standards based on user requirements
            if (m === 'kwc') {
                standardArtNr = appId === 'bademischer' ? '6541 152.501.000' : '6541 147.501.000';
            } else if (m === 'laufen') {
                standardArtNr = appId === 'bademischer' ? '6541 608.501.000' : '6541 670.501.000';
            } else if (m === 'hansgrohe') {
                const isSquare = l.includes(' e,') || l.includes(' e ') || l.includes(' square') || l.includes(' e-') || l.includes('eckig') || l.includes('finoris');
                if (appId === 'bademischer') {
                    standardArtNr = isSquare ? '6541 871.501.000' : '6541 873.501.000';
                } else {
                    standardArtNr = isSquare ? '6541 852.501.000' : '6541 853.501.000';
                }
            } else if (m === 'alterna') {
                standardArtNr = appId === 'bademischer' ? '6541 328.501.000' : '6541 336.501.000';
            }

            // Filter brand items
            let brandMatch = allHb.filter(p => p.label.toLowerCase().includes(m));
            if (brandMatch.length > 0) {
                if (standardArtNr) {
                    const stdItem = brandMatch.find(p => p.artNr === standardArtNr);
                    if (stdItem) {
                        // Put standard item first
                        results = [stdItem, ...brandMatch.filter(p => p.artNr !== standardArtNr)];
                    } else {
                        results = brandMatch;
                    }
                } else {
                    results = brandMatch;
                }
            }
        }
        
        // Fallback to Alterna, or generic
        if (results.length === 0) {
            results = allHb.filter(p => p.label.toLowerCase().includes('alterna') || p.label.toLowerCase().includes('easyline') || p.label.toLowerCase().includes('simijet'));
        }
        
        // Hard fallback
        if (results.length === 0) {
            results = [{
                artNr: "6541 326.501.000",
                label: "Handbrause Alterna easyline, Ø 101 mm, 1-jet",
                imgUrl: "https://profishop.sanitastroesch.ch/multimedia/Web/PG1/06541326_501_000.png"
            }];
        }
        
        return results.map((hb, i) => ({
            artNr: hb.artNr,
            label: hb.label,
            type: i === 0 ? "Zubehör" : "Option",
            imgUrl: hb.imgUrl || `https://profishop.sanitastroesch.ch/multimedia/Web/PG1/0${hb.artNr.replace(/\s+/g, '').replace(/\./g, '_')}.png`,
            menge: 1
        }));
    }
    function autoLinkMixerAccessories(tray, appId) {
        if (!tray) return;
        const l = ((tray.label || '') + ' ' + (tray.description || '')).toLowerCase();
        const manufacturer = (tray.manufacturer || '').toLowerCase();

        // Brauseschlauch: Duschenmischer = 1600mm standard + 1800mm option only
        //                 Bademischer   = 1250mm standard + 1800mm option only
        const isBadeMixer = appId === 'bademischer';
        const S1600 = { artNr: '6542 317.501.000', label: 'Brauseschlauch Alterna flexline, 1600 mm, ½"x½", Kunststoff mit Metalleffekt', type: 'Zubehör', imgUrl: 'https://profishop.sanitastroesch.ch/multimedia/Web/PG1/06542317_501_000.png', menge: 1 };
        const S1250 = { artNr: '6542 316.501.000', label: 'Brauseschlauch Alterna flexline, 1250 mm, ½"x½", Kunststoff mit Metalleffekt', type: 'Zubehör', imgUrl: 'https://profishop.sanitastroesch.ch/multimedia/Web/PG1/06542316_501_000.png', menge: 1 };
        const S1800 = { artNr: '6542 318.501.000', label: 'Brauseschlauch Alterna flexline, 1800 mm, ½"x½", Kunststoff mit Metalleffekt', type: 'Option', imgUrl: 'https://profishop.sanitastroesch.ch/multimedia/Web/PG1/06542318_501_000.png', menge: 1 };
        const OHNE  = { artNr: 'ohne_schlauch', label: 'Ohne Brauseschlauch', type: 'Option', imgUrl: '', menge: 0 };
        const schlauchOptions = isBadeMixer ? [S1250, S1800, OHNE] : [S1600, S1800, OHNE];

        // --- 1. AUFPUTZ LOGIC (AD 153 mm) ---
        if (l.includes('ad 153 mm') && !l.includes('endmontageset') && !l.includes('grundkörper')) {
            const accessories = [
                {
                    id: "mat_howjw",
                    name: "Abstellverschraubung,",
                    options: [
                        {
                            artNr: "6521 108.501.000",
                            label: "Abstellverschraubung, ½\" x ½\", mit flacher Rosette, Verchromt",
                            menge: 2,
                            type: "Zubehör",
                            imgUrl: "https://profishop.sanitastroesch.ch/multimedia/Web/PG1/06521108_501_000.png"
                        }
                    ]
                },
                {
                    id: "mat_dweg4",
                    name: "Brauseschlauch",
                    options: schlauchOptions
                },
                {
                    id: "mat_5utlf",
                    name: "Handbrause",
                    options: getBrandSpecificHandbrausen(manufacturer, l, appId)
                },
                {
                    id: "mat_37d4w",
                    name: "Brausehalter",
                    options: [
                        {
                            artNr: "6543 131.501.000",
                            label: "Brausehalter Alterna eco, Verchromt",
                            menge: 1,
                            type: "Zubehör",
                            imgUrl: "https://profishop.sanitastroesch.ch/multimedia/Web/PG1/06543131_501_000.png"
                        }
                    ]
                }
            ];

            // Filter accessories based on product label (strip already included items)
            tray.mountingMaterials = accessories.filter(mat => {
                const name = mat.name.toLowerCase();
                if (name.includes('abstell') && l.includes('abstellverschraubung')) return l.includes('ohne abstellverschraubung');
                if (name.includes('schlauch') && l.includes('brauseschlauch')) return l.includes('ohne brauseschlauch');
                if (name.includes('handbrause') && l.includes('handbrause')) return l.includes('ohne handbrause');
                return true;
            });
        }

        // --- 2. UNTERPUTZ LOGIC (Laufen / Alterna 8-Step Hierarchy) ---
        // --- 2. UNTERPUTZ LOGIC (Laufen 8-Step Hierarchy) ---
        else if (manufacturer === 'laufen' && (l.includes('endmontageset') || l.includes('unterputz'))) {
            // Dynamically extract Einbaukörper IDs from label
            const gkMatches = l.match(/einbauk[öo]rper\s*([0-9\s.\/]+)/);
            let gkOptions = [];

            if (gkMatches && gkMatches[1]) {
                // Extract all 7-digit patterns like "6158 110" or "6158 112"
                const parts = gkMatches[1].match(/\b\d{4}\s*\d{3}\b/g) || [];
                parts.forEach(p => {
                    const cleanP = p.replace(/\s+/g, ' ');
                    gkOptions.push({
                        artNr: cleanP + ".000.000",
                        label: `Einbaukörper Simibox ${cleanP}`,
                        type: "Zubehör",
                        imgUrl: `https://profishop.sanitastroesch.ch/multimedia/Web/PG1/0${cleanP.replace(/\s+/g, '')}_000_000.png`,
                        menge: 1
                    });
                });
            }

            // Fallback if no specific IDs found
            if (gkOptions.length === 0) {
                gkOptions.push({
                    artNr: "6158 110.000.000",
                    label: "Einbaukörper Laufen Simibox Light ½\", mit Vorabstellung",
                    type: "Zubehör",
                    imgUrl: "https://profishop.sanitastroesch.ch/multimedia/Web/PG1/06158110_000_000.png",
                    menge: 1
                });
            }

            tray.mountingMaterials = [
                {
                    id: "mat_grundkoerper",
                    name: "1. Grundkörper",
                    options: gkOptions
                },
                {
                    id: "mat_schiene",
                    name: "2. Montageschiene",
                    options: [
                        {
                            artNr: "6158 120.000.000",
                            label: "Montageset Laufen Simibox 2 Montageschienen 560 mm Befestigungsmaterial",
                            type: "Zubehör",
                            imgUrl: "https://profishop.sanitastroesch.ch/multimedia/Web/PG1/06158120_000_000.png",
                            menge: 1
                        }
                    ]
                },
                {
                    id: "mat_bogen",
                    name: "3. Anschlussbogen",
                    options: [
                        {
                            artNr: "6544 164.501.000",
                            label: "Anschlussbogen Laufen City, mit Rückflussverhinderer, Rosette rund, für Handbrause Geräuschgruppe NT Verchromt",
                            type: "Zubehör",
                            imgUrl: "https://profishop.sanitastroesch.ch/multimedia/Web/PG1/06544164_501_000.png",
                            menge: 1
                        },
                        {
                            artNr: "6544 166.501.000",
                            label: "Anschlussbogen Laufen City ½\" mit integriertem Brausehalter Rückflussverhinderer Rosette eckig Geräuschgruppe NT Verchromt",
                            type: "Option",
                            imgUrl: "https://profishop.sanitastroesch.ch/multimedia/Web/PG1/06544166_501_000.png",
                            menge: 1
                        }
                    ]
                },
                {
                    id: "mat_schlauch",
                    name: "4. Brauseschlauch",
                    options: schlauchOptions
                },
                {
                    id: "mat_handbrause",
                    name: "5. Handbrause",
                    options: getBrandSpecificHandbrausen(manufacturer, l, appId)
                },
                {
                    id: "mat_halter",
                    name: "6. Brausehalter",
                    options: [
                        {
                            artNr: "6543 131.501.000",
                            label: "Brausehalter Alterna eco, Verchromt",
                            type: "Zubehör",
                            imgUrl: "https://profishop.sanitastroesch.ch/multimedia/Web/PG1/06543131_501_000.png",
                            menge: 1
                        },
                        {
                            artNr: "OHNE",
                            label: "Ohne Brausehalter (Stange verwenden oder Bogen mit Halter)",
                            type: "Option",
                            imgUrl: "https://profishop.sanitastroesch.ch/multimedia/Web/PG1/00000000.png",
                            menge: 0
                        }
                    ]
                },
                {
                    id: "mat_stange",
                    name: "7. Duschengleitstange",
                    options: [
                        {
                            artNr: "OHNE",
                            label: "Ohne Duschengleitstange (nur Halter)",
                            type: "Option",
                            imgUrl: "https://profishop.sanitastroesch.ch/multimedia/Web/PG1/00000000.png",
                            menge: 0
                        },
                        {
                            artNr: "6531 404.501.000",
                            label: "Duschengleitstange Alterna fit Gelenkhalter Arretierungshebel, 1100 mm",
                            type: "Option",
                            imgUrl: "https://profishop.sanitastroesch.ch/multimedia/Web/PG1/06531404_501_000.png",
                            menge: 1
                        }
                    ]
                }
            ];
        }

        // --- 2b. ALTERNA UNTERPUTZ LOGIC ---
        else if (manufacturer === 'alterna' && (l.includes('endmontageset') || l.includes('unterputz'))) {
            const isArchitect = l.includes('architect');
            const poolApp = (window.productApps || productApps)['zubehoer_pool'];
            const pool = poolApp ? [
                ...(poolApp.trays || []),
                ...(poolApp.parts || []),
                ...(poolApp.finishes || [])
            ] : [];

            // Helper to get labels from pool
            function getPoolLabel(art, fallback) {
                const cleanTarget = art.replace(/[\s.]/g, '');
                const found = pool.find(item => item.artNr && item.artNr.replace(/[\s.]/g, '').startsWith(cleanTarget));
                return found ? found.label : fallback;
            }

            // GK
            const gkMatches = l.match(/einbauk[öo]rper\s*([0-9\s.\/]+)/);
            let gkOptions = [];

            if (gkMatches && gkMatches[1]) {
                const parts = gkMatches[1].match(/\b\d{4}\s*\d{3}\b/g) || [];
                parts.forEach(p => {
                    const cleanP = p.replace(/\s+/g, ' ');
                    const fullArt = cleanP + ".000.000";
                    const fallbackLabel = isArchitect ? `Einbaukörper Simibox ${cleanP}` : `Einbaukörper Alterna più / niù ${cleanP}`;
                    gkOptions.push({
                        artNr: fullArt,
                        label: getPoolLabel(fullArt, fallbackLabel),
                        type: "Zubehör",
                        imgUrl: `https://profishop.sanitastroesch.ch/multimedia/Web/PG1/0${cleanP.replace(/\s+/g, '')}_000_000.png`,
                        menge: 1
                    });
                });
            }

            if (gkOptions.length === 0) {
                if (isArchitect) {
                    const art = "6158 110.000.000";
                    gkOptions.push({
                        artNr: art,
                        label: getPoolLabel(art, "Einbaukörper Laufen Simibox Light ½\", mit Vorabstellung"),
                        type: "Zubehör",
                        imgUrl: "https://profishop.sanitastroesch.ch/multimedia/Web/PG1/06158110_000_000.png",
                        menge: 1
                    });
                } else {
                    const isBade = appId === 'bademischer';
                    const art = isBade ? "6252 891.000.000" : "6252 890.000.000";
                    const defaultLbl = isBade 
                        ? "Einbaukörper Alterna più / niù ½\", ohne Vorabsperrung, 2 Anschlüsse ½\", 2 Abgänge ½\""
                        : "Einbaukörper Alterna più / niù ½\", ohne Vorabsperrung, ohne Rohrunterbrecher, 2 Anschlüsse ½\", 1 Abgang ½\"";
                    const cleanImgNum = art.replace(/\s+/g, '').replace(/\./g, '_');
                    gkOptions.push({
                        artNr: art,
                        label: getPoolLabel(art, defaultLbl),
                        type: "Zubehör",
                        imgUrl: `https://profishop.sanitastroesch.ch/multimedia/Web/PG1/0${cleanImgNum}.png`,
                        menge: 1
                    });
                }
            }

            // Rails
            let railArt = "6158 120.000.000";
            let railLbl = "Montageset Laufen Simibox 2 Montageschienen 560 mm Befestigungsmaterial";
            if (!isArchitect) {
                const isBade = appId === 'bademischer';
                railArt = isBade ? "6252 898.000.000" : "6252 894.000.000";
                railLbl = isBade 
                    ? "Befestigungsset Gessi zu Einbaukörper 6252 859 6252 891"
                    : "Befestigungsset Gessi zu Einbaukörper 6252 858 / 888 / 890";
            }
            const railImgNum = railArt.replace(/\s+/g, '').replace(/\./g, '_');
            const railOptions = [
                {
                    artNr: railArt,
                    label: getPoolLabel(railArt, railLbl),
                    type: "Zubehör",
                    imgUrl: `https://profishop.sanitastroesch.ch/multimedia/Web/PG1/0${railImgNum}.png`,
                    menge: 1
                }
            ];

            // Bogen
            const bogenOptions = [
                {
                    artNr: "6544 100.501.000",
                    label: getPoolLabel("6544 100.501.000", "Anschlussbogen Alterna ½\", Rosette rund, für Handbrause Geräuschgruppe NT Verchromt"),
                    type: "Zubehör",
                    imgUrl: "https://profishop.sanitastroesch.ch/multimedia/Web/PG1/06544100_501_000.png",
                    menge: 1
                },
                {
                    artNr: "6544 102.501.000",
                    label: getPoolLabel("6544 102.501.000", "Anschlussbogen Alterna ½\" mit integriertem Brausehalter Rosette rund Geräuschgruppe NT Verchromt"),
                    type: "Option",
                    imgUrl: "https://profishop.sanitastroesch.ch/multimedia/Web/PG1/06544102_501_000.png",
                    menge: 1
                },
                {
                    artNr: "6252 349.501.000",
                    label: getPoolLabel("6252 349.501.000", "Anschlussbogen Alterna / Emporio ½\" mit integriertem Brausehalter Rosette eckig Geräuschgruppe NT Verchromt"),
                    type: "Option",
                    imgUrl: "https://profishop.sanitastroesch.ch/multimedia/Web/PG1/06252349_501_000.png",
                    menge: 1
                }
            ];

            tray.mountingMaterials = [
                {
                    id: "mat_grundkoerper",
                    name: "1. Grundkörper",
                    options: gkOptions
                },
                {
                    id: "mat_schiene",
                    name: "2. Montageschiene",
                    options: railOptions
                },
                {
                    id: "mat_bogen",
                    name: "3. Anschlussbogen",
                    options: bogenOptions
                },
                {
                    id: "mat_schlauch",
                    name: "4. Brauseschlauch",
                    options: schlauchOptions
                },
                {
                    id: "mat_handbrause",
                    name: "5. Handbrause",
                    options: getBrandSpecificHandbrausen(manufacturer, l, appId)
                },
                {
                    id: "mat_halter",
                    name: "6. Brausehalter",
                    options: [
                        {
                            artNr: "6543 132.501.000",
                            label: "Brausehalter Alterna, Rosette rund, Verchromt",
                            type: "Zubehör",
                            imgUrl: "https://profishop.sanitastroesch.ch/multimedia/Web/PG1/06543132_501_000.png",
                            menge: 1
                        },
                        {
                            artNr: "6543 131.501.000",
                            label: "Brausehalter Alterna eco, Verchromt",
                            type: "Option",
                            imgUrl: "https://profishop.sanitastroesch.ch/multimedia/Web/PG1/06543131_501_000.png",
                            menge: 1
                        },
                        {
                            artNr: "OHNE",
                            label: "Ohne Brausehalter (Stange verwenden oder Bogen mit Halter)",
                            type: "Option",
                            imgUrl: "https://profishop.sanitastroesch.ch/multimedia/Web/PG1/00000000.png",
                            menge: 0
                        }
                    ]
                },
                {
                    id: "mat_stange",
                    name: "7. Duschengleitstange",
                    options: [
                        {
                            artNr: "OHNE",
                            label: "Ohne Duschengleitstange (nur Halter)",
                            type: "Option",
                            imgUrl: "https://profishop.sanitastroesch.ch/multimedia/Web/PG1/00000000.png",
                            menge: 0
                        },
                        {
                            artNr: "6531 404.501.000",
                            label: "Duschengleitstange Alterna fit Gelenkhalter Arretierungshebel, 1100 mm",
                            type: "Option",
                            imgUrl: "https://profishop.sanitastroesch.ch/multimedia/Web/PG1/06531404_501_000.png",
                            menge: 1
                        }
                    ]
                }
            ];
        }

        // --- 3. KWC UNTERPUTZ LOGIC (Homebox / Bluebox / Bevo UP) ---
        else if (manufacturer === 'kwc' && (l.includes('endmontageset') || l.includes('unterputz') || l.includes('homebox') || l.includes('bluebox'))) {
            // Extract Grundkörper ArtNr from label if present (e.g. "ohne Einbaukörper 6118 132")
            // Regex handles spaces, dots, and common patterns
            const gkMatch = l.match(/einbauk[öo]rper\s*([0-9\s.]+)/);
            let gkArtNr = gkMatch ? gkMatch[1].trim() : (l.includes('homebox') ? "6118 135.000.000" : "Z.538.705.000");

            // Cleanup gkArtNr to standard format if it looks like a sequence of numbers
            if (gkArtNr.replace(/\s+/g, '').length === 7) {
                gkArtNr = gkArtNr.replace(/(\d{4})\s*(\d{3})/, "$1 $2") + ".000.000";
            }

            const isHomebox = l.includes('homebox');

            // Find description from pool if possible
            const poolApp = (window.productApps || productApps)['zubehoer_pool'];
            const pool = poolApp ? [
                ...(poolApp.trays || []),
                ...(poolApp.parts || []),
                ...(poolApp.finishes || [])
            ] : [];

            const cleanGkTarget = gkArtNr.replace(/[\s.]/g, '');
            const matchedPoolItem = pool.find(item => item.artNr && item.artNr.replace(/[\s.]/g, '').startsWith(cleanGkTarget));

            let gkLabel = "";
            if (matchedPoolItem) {
                gkLabel = matchedPoolItem.label;
            } else {
                if (isHomebox) {
                    gkLabel = "Einbaukörper KWC HOMEBOX ½\", zu Wandmischer KWC Zoe, mit Abdeckplatte, 1 Abgang, Einbautiefe 47 - 72 mm Geräuschgruppe I";
                } else if (gkArtNr.includes('116')) {
                    gkLabel = "Einbaukörper KWC Bluebox ½\", ohne Vorabstellung, ½\", ohne Vorabsperrung, inkl. Multifix, Die Montagehöhe des Einbaukörpers muss überprüft werden, wenn eine Wannengarnitur mit Einlauffunktion verbaut wird, (Bauart = HD), Einbautiefe 75 - 105 mm, Befestigungssystem Geräuschgruppe NT";
                } else {
                    gkLabel = "Einbaukörper KWC BLUEBOX 1/2\"";
                }
            }

            const materials = [
                {
                    id: "mat_kwc_gk",
                    name: "1. Grundkörper (KWC)",
                    options: [
                        {
                            artNr: gkArtNr,
                            label: gkLabel,
                            type: "Zubehör",
                            imgUrl: `https://profishop.sanitastroesch.ch/multimedia/Web/PG1/0${gkArtNr.replace(/\s+/g, '').replace(/\./g, '_')}.png`,
                            menge: 1
                        }
                    ]
                }
            ];

            if (!isHomebox) {
                materials.push({
                    id: "mat_kwc_schiene",
                    name: "2. Montageschiene",
                    options: [
                        {
                            artNr: "6118 122.000.000",
                            label: "Montageschiene KWC zu Einbaukörper KWC Bluebox",
                            type: "Zubehör",
                            imgUrl: "https://profishop.sanitastroesch.ch/multimedia/Web/PG1/06118122_000_000.png",
                            menge: 1
                        }
                    ]
                });
            }

            const stepOffset = !isHomebox ? 1 : 0;

            materials.push(
                {
                    id: "mat_kwc_bogen",
                    name: `${2 + stepOffset}. Anschlussbogen`,
                    options: [
                        {
                            artNr: "6544 121.501.000",
                            label: "Anschlussbogen KWC, für Handbrause Geräuschgruppe NT Verchromt",
                            type: "Zubehör",
                            imgUrl: "https://profishop.sanitastroesch.ch/multimedia/Web/PG1/06544121_501_000.png",
                            menge: 1
                        },
                        {
                            artNr: "6113 825.501.000",
                            label: "Anschlussbogen KWC, Rosette rund, für Handbrause Geräuschgruppe I Verchromt",
                            type: "Option",
                            imgUrl: "https://profishop.sanitastroesch.ch/multimedia/Web/PG1/06113825_501_000.png",
                            menge: 1
                        },
                        {
                            artNr: "6544 126.501.000",
                            label: "Anschlussbogen KWC, mit integriertem Brausehalter, Rosette eckig Geräuschgruppe I Verchromt",
                            type: "Option",
                            imgUrl: "https://profishop.sanitastroesch.ch/multimedia/Web/PG1/06544126_501_000.png",
                            menge: 1
                        },
                        {
                            artNr: "6113 413.501.000",
                            label: "Anschlussbogen KWC ½\", 90°, Rosette eckig, für Handbrause Geräuschgruppe I Verchromt",
                            type: "Option",
                            imgUrl: "https://profishop.sanitastroesch.ch/multimedia/Web/PG1/06113413_501_000.png",
                            menge: 1
                        }
                    ]
                },
                {
                    id: "mat_kwc_schlauch",
                    name: `${3 + stepOffset}. Brauseschlauch`,
                    options: schlauchOptions
                },
                {
                    id: "mat_kwc_handbrause",
                    name: `${4 + stepOffset}. Handbrause`,
                    options: getBrandSpecificHandbrausen(manufacturer, l, appId)
                },
                {
                    id: "mat_kwc_halter",
                    name: `${5 + stepOffset}. Brausehalter`,
                    options: [
                        {
                            artNr: "6113 432.501.000",
                            label: "Steckhalter KWC Rosette eckig Verchromt",
                            type: "Zubehör",
                            imgUrl: "https://profishop.sanitastroesch.ch/multimedia/Web/PG1/06113432_501_000.png",
                            menge: 1
                        },
                        {
                            artNr: "OHNE",
                            label: "Ohne Brausehalter (Bogen mit Halter verwenden)",
                            type: "Option",
                            imgUrl: "https://profishop.sanitastroesch.ch/multimedia/Web/PG1/00000000.png",
                            menge: 0
                        }
                    ]
                }
            );

            tray.mountingMaterials = materials;
        }

        // --- 4. DYNAMIC POOL SCANNER (Fallback / Auto-Injector) ---
        // Scans the product label for "ohne [ArtNr]" and injects missing items from Zubehör Pool
        // Example: "ohne Einbaukörper 6158 112"
        if ((window.productApps || productApps)['zubehoer_pool'] && tray.mountingMaterials.length === 0) {
            const fullPool = [
                ...((window.productApps || productApps)['zubehoer_pool'].trays || []),
                ...((window.productApps || productApps)['zubehoer_pool'].parts || []),
                ...((window.productApps || productApps)['zubehoer_pool'].finishes || [])
            ];

            // Look for standard 7-digit Swiss ArtNrs in the label, e.g. "6158 110" or "6158 112"
            const artNrMatches = l.match(/\b\d{4}\s*\d{3}\b/g) || [];

            let addedGroup = false;
            let addedIbox = false;
            artNrMatches.forEach((match, idx) => {
                const searchArtNr = match.replace(/\s+/g, ''); // "6158110"

                // Find matching items in pool (some might be .000.000, some .501.000)
                const foundItems = fullPool.filter(p => p.artNr && p.artNr.replace(/\s+/g, '').startsWith(searchArtNr));

                if (foundItems.length > 0) {
                    tray.mountingMaterials.push({
                        id: "mat_auto_" + searchArtNr + "_" + idx,
                        name: "Zubehör (Automatisch Erkannt)",
                        options: foundItems.map(item => ({
                            artNr: item.artNr,
                            label: item.label,
                            type: "Zubehör",
                            imgUrl: item.imgUrl || `https://profishop.sanitastroesch.ch/multimedia/Web/PG1/0${item.artNr.replace(/\s+/g, '').replace(/\./g, '_')}.png`,
                            menge: 1
                        }))
                    });
                    addedGroup = true;
                    if (searchArtNr === "6418101" || searchArtNr === "6418105") {
                        addedIbox = true;
                    }
                }
            });

            // Specific Hansgrohe rule: if 6418 101 or 105 is added, ALWAYS add 6418 111 (Montageset)
            if (addedIbox) {
                const msItems = fullPool.filter(p => p.artNr && p.artNr.replace(/\s+/g, '').startsWith('6418111'));
                if (msItems.length > 0) {
                    tray.mountingMaterials.push({
                        id: "mat_auto_6418111_ms",
                        name: "Montageset iBox",
                        options: msItems.map(item => ({
                            artNr: item.artNr,
                            label: item.label,
                            type: "Zubehör",
                            imgUrl: item.imgUrl || `https://profishop.sanitastroesch.ch/multimedia/Web/PG1/0${item.artNr.replace(/\s+/g, '').replace(/\./g, '_')}.png`,
                            menge: 1
                        }))
                    });
                }
            }
        }
    }

    // autoLinkShowerAccessories logic removed for CLEAN SLATE.
} // Final closing brace for setupAdmin or the module wrapper

window.closeAdminEditModal = () => document.getElementById('adminEditModal').classList.remove('active');
