import { DATA_VERSION, catalog } from './modules/data.js?v=2.5.4';
import { productApps } from './modules/apps.js?v=2.6.3';
import { setupAdmin } from './modules/admin.js?v=2.5.4';

document.addEventListener('DOMContentLoaded', async () => {
    window.productApps = productApps;

    const safeJsonParse = (value, fallback) => {
        if (!value) return fallback;
        try {
            return JSON.parse(value);
        } catch (err) {
            console.warn('[Konfigurator] Ignoring malformed stored JSON.', err);
            return fallback;
        }
    };

    const readStoredJson = (key, fallback) => safeJsonParse(localStorage.getItem(key), fallback);

    const wildcardQueryToRegex = (queryPart) => {
        const wildcardToken = '\u0000WILDCARD\u0000';
        const escaped = queryPart
            .replace(/\*/g, wildcardToken)
            .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
            .replaceAll(wildcardToken, '.*');
        return new RegExp(escaped, 'i');
    };

    const appendIcon = (parent, className) => {
        const icon = document.createElement('i');
        icon.className = className;
        parent.appendChild(icon);
        return icon;
    };

    const createSafeImage = (src, className, fallbackSrc = '') => {
        const img = document.createElement('img');
        if (className) img.className = className;
        img.src = src || fallbackSrc || 'about:blank';
        img.addEventListener('error', () => {
            img.style.display = 'none';
        });
        return img;
    };

    // --- Image Auto-Heal Engine ---
    document.addEventListener('error', (e) => {
        if (e.target && e.target.tagName === 'IMG') {
            const img = e.target;
            if (img.src.includes('placeholder.com') || img.src.includes('data:image')) return;
            
            if (img.getAttribute('data-healed') === 'true') {
                img.style.display = 'none';
                return;
            }

            // Temporarily suppress the inline onerror handler 
            img.onerror = null;
            img.removeAttribute('onerror');
            img.style.display = '';

            const match = img.src.match(/\/PG1\/0*(\d{7,8})/);
            if (match) {
                const prefixId = match[1].padStart(8, '0');
                
                let variants = [
                    `https://profishop.sanitastroesch.ch/multimedia/Web/PG1/${prefixId}_nV_000.png`,
                    `https://profishop.sanitastroesch.ch/multimedia/Web/PG1/${prefixId}_nV.png`,
                    `https://profishop.sanitastroesch.ch/multimedia/Web/PG1/${prefixId}.png`,
                    `https://profishop.sanitastroesch.ch/multimedia/Web/PG1/${prefixId}_100_000.png`
                ];
                
                const attempt = parseInt(img.dataset.attempt || "0", 10);
                if (attempt < variants.length) {
                    img.dataset.attempt = attempt + 1;
                    if (img.src !== variants[attempt]) {
                        img.src = variants[attempt]; 
                    } else {
                        img.src = variants[attempt + 1] || 'about:blank';
                        img.dataset.attempt = attempt + 2;
                    }
                } else {
                    img.setAttribute('data-healed', 'true');
                    img.style.display = 'none';
                    if (img.parentNode && img.parentNode.classList.contains('img-cell')) {
                        img.parentNode.style.background = 'transparent';
                        img.parentNode.style.border = '1px dashed var(--border)';
                    }
                }
            } else {
                img.style.display = 'none';
            }
        }
    }, true);

    // --- Theme Logic ---
    const initTheme = () => {
        const themeBtns = document.querySelectorAll('.theme-toggle-btn');
        const themeIcons = document.querySelectorAll('.theme-icon');
        const toggleTheme = (isLight) => {
            if (isLight) {
                document.body.classList.add('light-theme');
                themeIcons.forEach(icon => icon.className = 'ri-moon-fill theme-icon');
                localStorage.setItem('theme', 'light');
            } else {
                document.body.classList.remove('light-theme');
                themeIcons.forEach(icon => icon.className = 'ri-sun-fill theme-icon');
                localStorage.setItem('theme', 'dark');
            }
        };
        // Default to dark mode — only apply light if explicitly saved
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme === 'light') {
            toggleTheme(true);
        } else {
            // Ensure dark mode is active and saved
            toggleTheme(false);
        }
        themeBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                toggleTheme(!document.body.classList.contains('light-theme'));
            });
        });
    };
    initTheme();

    // --- Interactive Effects ---
    document.addEventListener('mousemove', (e) => {
        const cards = document.querySelectorAll('.category-card');
        cards.forEach(card => {
            const rect = card.getBoundingClientRect();
            const x = ((e.clientX - rect.left) / rect.width) * 100;
            const y = ((e.clientY - rect.top) / rect.height) * 100;
            card.style.setProperty('--mouse-x', `${x}%`);
            card.style.setProperty('--mouse-y', `${y}%`);
        });
    });
    // --- State & Navigation ---
    const homeView = document.getElementById('homeView');
    const configView = document.getElementById('configView');
    const searchResultView = document.getElementById('searchResultView');
    const backHomeBtn = document.getElementById('backHomeBtn');
    window.currentActiveApp = null; // Track which app is loaded globally for Admin View to reset
    window.customWishlist = readStoredJson('sanitas_wishlist', []);
    if (!Array.isArray(window.customWishlist)) window.customWishlist = [];

    function saveWishlist() {
        localStorage.setItem('sanitas_wishlist', JSON.stringify(window.customWishlist));
        updateWishlistBadges();
        renderWishlistModal();
    }

    function updateWishlistBadges() {
        const count = window.customWishlist.reduce((acc, item) => acc + (item.menge || 1), 0);
        const bHome = document.getElementById('wishlistBadgeHome');
        const bConfig = document.getElementById('wishlistBadgeConfig');
        if (bHome) bHome.textContent = count;
        if (bConfig) bConfig.textContent = count;
    }

    window.openConfigurator = function(appId, breadcrumbs) {
        if (!productApps[appId]) {
            alert(`Der Konfigurator für diese Auswahl ist nicht registriert.`);
            return;
        }

        window.currentActiveApp = productApps[appId];

        homeView.classList.remove('active-view');
        homeView.classList.add('hidden-view');
        if (searchResultView) {
            searchResultView.classList.remove('active-view');
            searchResultView.classList.add('hidden-view');
        }

        configView.classList.remove('hidden-view');
        configView.classList.add('active-view');

        document.getElementById('currentConfigBreadcrumb').innerHTML = `Big Konfigurator / ${breadcrumbs}`;

        const copyBtnText = document.getElementById('copyBtnText');
        if (copyBtnText) {
            if (appId === 'waschtisch' || appId === 'mixandmatch') {
                copyBtnText.textContent = 'G1 kopieren';
            } else {
                copyBtnText.textContent = 'Artikelnummern kopieren';
            }
        }
        
        if (appId === 'mixandmatch') {
            document.body.classList.add('mixmatch-active');
            const basins = productApps.waschtisch?.trays || [];
            const allFaucets = productApps.waschtischmischer?.trays || [];
            window.currentActiveApp.init(basins, allFaucets);
            // Show the Lose Artikel button only for Mix & Match
            const looseBtn = document.getElementById('copyLooseBtn');
            if (looseBtn) looseBtn.style.display = '';
        } else {
            document.body.classList.remove('mixmatch-active');
            window.currentActiveApp.init();
            // Hide the Lose Artikel button for all other configurators
            const looseBtn = document.getElementById('copyLooseBtn');
            if (looseBtn) looseBtn.style.display = 'none';
        }
    };

    const closeSearchBtn = document.getElementById('closeSearchBtn');
    if (closeSearchBtn) {
        closeSearchBtn.addEventListener('click', () => {
            if (searchResultView) {
                searchResultView.classList.remove('active-view');
                searchResultView.classList.add('hidden-view');
            }
            homeView.classList.remove('hidden-view');
            homeView.classList.add('active-view');
        });
    }

    backHomeBtn.addEventListener('click', () => {
        document.body.classList.remove('mixmatch-active');
        
        // Hide all views first
        [homeView, configView, searchResultView, adminView].forEach(v => {
            if (v) {
                v.classList.remove('active-view');
                v.classList.add('hidden-view');
            }
        });

        // Show Home
        homeView.classList.remove('hidden-view');
        homeView.classList.add('active-view');
        window.currentActiveApp = null;
    });

    const categoryGrid = document.getElementById('categoryGrid');

    function renderCatalog() {
        categoryGrid.innerHTML = '';
        catalog.filter(cat => !cat.adminOnly).forEach(cat => {
            const card = document.createElement('div');
            card.className = 'category-card';

            const header = document.createElement('div');
            header.className = 'cat-header';

            // Use icon as primary; show thumbnail as background if it loads
            const thumbBox = document.createElement('div');
            thumbBox.className = 'cat-thumb-box';
            thumbBox.innerHTML = `<i class="${cat.icon || 'ri-grid-fill'}" aria-hidden="true"></i>`;
            if (cat.thumbnail) {
                const testImg = new Image();
                testImg.onload = () => { thumbBox.style.backgroundImage = `url('${cat.thumbnail}')`; thumbBox.querySelector('i').style.display = 'none'; };
                testImg.src = cat.thumbnail;
            }
            header.appendChild(thumbBox);
            const h2 = document.createElement('h2');
            h2.textContent = cat.name;
            header.appendChild(h2);
            card.appendChild(header);

            if (cat.subcategories.length > 0) {
                const list = document.createElement('div');
                list.className = 'subcat-list';

                cat.subcategories.forEach(sub => {
                    const btn = document.createElement('button');
                    btn.className = `subcat-btn ${sub.hasApp ? 'has-app' : ''}`;
                    btn.setAttribute('aria-label', `Konfigurator für ${sub.name} öffnen`);
                    btn.innerHTML = `<span>${sub.name}</span> <i class="ri-arrow-right-line" aria-hidden="true"></i>`;

                    btn.addEventListener('click', () => {
                        if (sub.hasApp && sub.appId) {
                            window.openConfigurator(sub.appId, `${cat.name} / <strong style="color: #fff">${sub.name}</strong>`);
                        } else {
                            alert(`Der Konfigurator für "${sub.name}" ist noch nicht verfügbar. Bitte versuchen Sie es später noch einmal.`);
                        }
                    });

                    list.appendChild(btn);
                });
                card.appendChild(list);
            }
            categoryGrid.appendChild(card);
        });
    }

    // --- Master Search ---
    const masterSearchInput = document.getElementById('masterSearchInput');
    const masterSearchResults = document.getElementById('masterSearchResults');

    if (masterSearchInput && masterSearchResults) {
        let hideTimeout;

        const handleSearchResultClick = (appId, trayId, catLabel) => {
            if (appId) {
                window.openConfigurator(appId, catLabel);
                masterSearchResults.style.display = 'none';
                masterSearchInput.value = '';
                
                // Allow UI to render then select item
                setTimeout(() => {
                    const app = productApps[appId];
                    if (app && app.selectTray && trayId) {
                        app.selectTray(trayId);
                    }
                }, 50);
            }
        };

        const renderSearchEmptyState = (query) => {
            masterSearchResults.replaceChildren();
            const empty = document.createElement('div');
            empty.style.cssText = 'padding: 1.5rem; text-align: center; color: var(--text-secondary);';
            empty.append(`Keine Treffer für "${query}" `);
            empty.appendChild(document.createElement('br'));
            const hint = document.createElement('small');
            hint.style.opacity = '0.5';
            hint.textContent = 'Verwenden Sie * für Platzhalter (z.B. 1234*)';
            empty.appendChild(hint);
            masterSearchResults.appendChild(empty);
            masterSearchResults.style.display = 'block';
        };

        const createSearchResultDropdownItem = (result) => {
            const item = document.createElement('div');
            item.className = 'search-result-item';
            item.addEventListener('click', () => handleSearchResultClick(result.appId, result.trayId || '', result.category));

            item.appendChild(createSafeImage(result.imgUrl, 'search-result-img', 'https://via.placeholder.com/32'));

            const info = document.createElement('div');
            info.className = 'search-result-info';

            const code = document.createElement('span');
            code.className = 'search-result-code';
            code.textContent = result.artNr;
            info.appendChild(code);

            const desc = document.createElement('span');
            desc.className = 'search-result-desc';
            desc.textContent = result.label;
            info.appendChild(desc);

            const category = document.createElement('span');
            category.className = 'search-result-cat';
            category.textContent = result.category;
            info.appendChild(category);

            item.appendChild(info);

            const addBtn = document.createElement('button');
            addBtn.className = 'search-result-add';
            addBtn.title = 'Zur Eigenen Selektion hinzufügen';
            appendIcon(addBtn, 'ri-add-line');
            addBtn.addEventListener('click', (event) => {
                event.stopPropagation();
                window.addMasterSearchResultToWishlist(result.artNr, result.label, result.type, result.imgUrl || '');
            });
            item.appendChild(addBtn);

            return item;
        };

        const createFullSearchResultCard = (result) => {
            const card = document.createElement('div');
            card.className = 'product-selection-card';
            card.style.cssText = 'display: flex; flex-direction: column; height: 100%; border: 1px solid var(--border); box-shadow: 0 4px 6px rgba(0,0,0,0.1); cursor: default; padding: 1.5rem; border-radius: 8px;';

            const imageWrap = document.createElement('div');
            imageWrap.style.cssText = 'flex: 1; display:flex; align-items:center; justify-content:center; margin-bottom: 1.5rem; background:#fff; padding:1rem; border-radius:4px; max-height: 150px;';
            const img = createSafeImage(result.imgUrl, '', 'https://via.placeholder.com/150');
            img.style.cssText = 'max-height: 100%; max-width:100%; object-fit: contain;';
            imageWrap.appendChild(img);
            card.appendChild(imageWrap);

            const title = document.createElement('h4');
            title.style.cssText = 'font-size: 1.1rem; margin-bottom: 0.5rem;';
            title.textContent = result.label;
            card.appendChild(title);

            const meta = document.createElement('div');
            meta.style.cssText = 'display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;';
            const code = document.createElement('span');
            code.className = 'bom-code';
            code.style.cssText = 'font-size:1rem; font-weight:600; color:var(--text-primary);';
            code.textContent = result.artNr;
            meta.appendChild(code);
            const type = document.createElement('span');
            type.className = 'bom-type';
            type.style.cssText = 'background:var(--accent); color:#000; padding:2px 6px; border-radius:4px; font-size:0.8rem;';
            type.textContent = result.type;
            meta.appendChild(type);
            card.appendChild(meta);

            const category = document.createElement('p');
            category.style.cssText = 'font-size:0.85rem; color:var(--text-secondary); margin-bottom:1.5rem;';
            category.textContent = `Zugehörig: ${result.category}`;
            card.appendChild(category);

            const actions = document.createElement('div');
            actions.style.cssText = 'margin-top:auto; display:flex; gap:0.5rem;';

            const configureBtn = document.createElement('button');
            configureBtn.className = 'icon-btn highlight-btn';
            configureBtn.style.cssText = 'flex:1; justify-content: center; background:var(--bg-surface); border:1px solid var(--accent); color:var(--text-primary);';
            configureBtn.textContent = 'Konfigurieren';
            configureBtn.addEventListener('click', () => handleSearchResultClick(result.appId, result.trayId || '', result.category));
            actions.appendChild(configureBtn);

            const addBtn = document.createElement('button');
            addBtn.className = 'icon-btn highlight-btn';
            addBtn.style.cssText = 'background:var(--accent); color:#000;';
            addBtn.title = 'Zur Eigenen Selektion';
            appendIcon(addBtn, 'ri-add-line');
            addBtn.addEventListener('click', () => {
                window.addMasterSearchResultToWishlist(result.artNr, result.label, result.type, result.imgUrl || '');
            });
            actions.appendChild(addBtn);

            card.appendChild(actions);
            return card;
        };

        let searchTimeout = null;
        masterSearchInput.addEventListener('input', (e) => {
            const query = e.target.value.trim().toLowerCase();
            
            if (query.length < 2) {
                if (searchTimeout) clearTimeout(searchTimeout);
                masterSearchResults.style.display = 'none';
                return;
            }

            if (searchTimeout) clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                executeGlobalSearch(query);
            }, 300);
        });

        const executeGlobalSearch = (query) => {

            const queries = query.split(/\s+/).filter(q => q.length > 0);
            const regexQueries = queries.map(wildcardQueryToRegex);

            let results = [];
            
            Object.keys(productApps).forEach(appId => {
                const app = productApps[appId];
                
                const addIfMatch = (item, type, categoryLabel) => {
                    if (!item) return;
                    const artNrStr = item.artNr ? String(item.artNr) : '';
                    const labelStr = item.label ? String(item.label) : (item.name ? String(item.name) : '');
                    
                    const combinedStr = `${artNrStr} ${labelStr}`;
                    const isMatch = regexQueries.every(regex => regex.test(combinedStr));
                    
                    if (isMatch) {
                        results.push({
                            artNr: artNrStr,
                            label: labelStr,
                            type: type,
                            imgUrl: item.imgUrl || app.mainImgUrl,
                            category: categoryLabel || appId,
                            appId: appId,
                            trayId: item.id || null
                        });
                    }
                };

                let catLabel = appId;
                catalog.forEach(cat => cat.subcategories.forEach(sub => {
                    if (sub.appId === appId) catLabel = `${cat.name} / ${sub.name}`;
                }));

                if (app.trays) {
                    app.trays.forEach(tray => {
                        addIfMatch(tray, 'Grundkörper', catLabel);
                        if (tray.variants) tray.variants.forEach(v => addIfMatch(v, 'Variante', catLabel));
                        if (tray.mountingMaterials) {
                            tray.mountingMaterials.forEach(m => {
                                if (m.options) m.options.forEach(o => addIfMatch(o, 'Zubehör', catLabel));
                            });
                        }
                    });
                }
                if (app.parts) {
                    app.parts.forEach(p => addIfMatch(p, 'Teil', catLabel));
                }
                if (app.finishes) {
                    app.finishes.forEach(f => addIfMatch(f, 'Finish', catLabel));
                }
            });

            // Remove duplicates by artNr
            const uniqueResults = [];
            const seenArtNr = new Set();
            for (const r of results) {
                if (r.artNr && !seenArtNr.has(r.artNr)) {
                    seenArtNr.add(r.artNr);
                    uniqueResults.push(r);
                }
            }

            // Make results available globally for the Enter key to consume
            window.currentSearchUniqueResults = uniqueResults;
            window.currentSearchQuery = query;

            const limitedResults = uniqueResults.slice(0, 50); // limit for performance in dropdown

            if (limitedResults.length > 0) {
                masterSearchResults.replaceChildren(...limitedResults.map(createSearchResultDropdownItem));
                masterSearchResults.style.display = 'block';
            } else {
                renderSearchEmptyState(query);
            }
        };

        // Enter key handling: Open full search result view!
        masterSearchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                masterSearchResults.style.display = 'none';

                if (!window.currentSearchUniqueResults || window.currentSearchUniqueResults.length === 0) return;

                // Hide other views
                homeView.classList.remove('active-view');
                homeView.classList.add('hidden-view');
                configView.classList.remove('active-view');
                configView.classList.add('hidden-view');

                // Show Search Result View
                searchResultView.classList.remove('hidden-view');
                searchResultView.classList.add('active-view');

                // Populate View
                document.getElementById('searchResultMeta').textContent = `${window.currentSearchUniqueResults.length} Ergebnisse für "${window.currentSearchQuery}"`;
                
                const grid = document.getElementById('searchResultsGrid');
                grid.replaceChildren(...window.currentSearchUniqueResults.map(createFullSearchResultCard));
                
                masterSearchInput.value = '';
                masterSearchInput.blur();
            }
        });

        masterSearchInput.addEventListener('blur', () => {
            hideTimeout = setTimeout(() => { masterSearchResults.style.display = 'none'; }, 250);
        });
        masterSearchInput.addEventListener('focus', () => {
            if (masterSearchInput.value.length >= 2) masterSearchResults.style.display = 'block';
        });

        window.handleSearchResultClick = handleSearchResultClick;

        window.addMasterSearchResultToWishlist = (artNr, label, typ, imgUrl) => {
            // Adds specifically to the Wishlist (Eigene Selektion)
            const exists = window.customWishlist.find(i => i.artNr === artNr);
            if (exists) {
                exists.menge += 1;
            } else {
                window.customWishlist.push({
                    artNr: artNr,
                    label: label,
                    typ: typ,
                    imgUrl: imgUrl,
                    menge: 1
                });
            }
            saveWishlist();

            masterSearchResults.style.display = 'none';
            masterSearchInput.value = '';
            
            // Give user feedback safely via a small overlay toast
            const feedback = document.createElement('div');
            feedback.style.position = 'fixed';
            feedback.style.bottom = '20px';
            feedback.style.right = '20px';
            feedback.style.background = 'var(--accent)';
            feedback.style.color = '#000';
            feedback.style.padding = '1rem 1.5rem';
            feedback.style.borderRadius = '8px';
            feedback.style.fontWeight = 'bold';
            feedback.style.zIndex = '9999';
            feedback.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
            appendIcon(feedback, 'ri-check-line');
            feedback.append(` Artikel "${artNr}" zur Eigenen Selektion hinzugefügt`);
            document.body.appendChild(feedback);
            setTimeout(() => feedback.remove(), 3000);
        };
    }

    document.getElementById('copyBtn').addEventListener('click', () => {
        if (window.currentActiveApp && window.currentActiveApp.copyToClipboard) {
            window.currentActiveApp.copyToClipboard();
        }
    });

    const copyLooseBtn = document.getElementById('copyLooseBtn');
    if (copyLooseBtn) {
        copyLooseBtn.addEventListener('click', () => {
            if (window.currentActiveApp && window.currentActiveApp.copyLooseItemsToClipboard) {
                window.currentActiveApp.copyLooseItemsToClipboard();
            }
        });
    }

    // --- Artikel hinzufügen (Manual BOM Row) ---
    const addArtikelBtn = document.getElementById('addArtikelBtn');
    const addArtikelModal = document.getElementById('addArtikelModal');
    const confirmAddArtikelBtn = document.getElementById('confirmAddArtikelBtn');

    if (addArtikelBtn) {
        addArtikelBtn.addEventListener('click', () => {
            // Reset fields
            document.getElementById('newArtikelNr').value = '';
            document.getElementById('newArtikelLabel').value = '';
            document.getElementById('newArtikelTyp').value = 'Manuell';
            document.getElementById('newArtikelMenge').value = '1';
            addArtikelModal.classList.add('active');
            document.getElementById('newArtikelNr').focus();
        });
    }

    if (confirmAddArtikelBtn) {
        confirmAddArtikelBtn.addEventListener('click', () => {
            const artNr = document.getElementById('newArtikelNr').value.trim();
            const label = document.getElementById('newArtikelLabel').value.trim();
            const typ   = document.getElementById('newArtikelTyp').value.trim() || 'Manuell';
            const menge = parseInt(document.getElementById('newArtikelMenge').value) || 1;

            if (!artNr || !label) {
                alert('Bitte Art-Nr und Beschreibung angeben.');
                return;
            }

            // Add row to the BOM table
            const bomTableBody = document.getElementById('bomTableBody');
            const row = document.createElement('tr');
            row.dataset.manual = 'true';
            row.innerHTML = `
                <td><div class="img-cell"><i class="ri-add-circle-line" style="font-size:1.2rem;color:var(--accent);" aria-hidden="true"></i></div></td>
                <td><span class="bom-code">${artNr}</span></td>
                <td>
                    <div class="bom-desc">${label}</div>
                    <div style="font-size:0.8rem;color:#9e9e9e;margin-top:0.25rem;">Manuell hinzugef\u00fcgt</div>
                </td>
                <td><span class="bom-type">${typ}</span></td>
                <td><strong>${menge}</strong></td>
            `;
            bomTableBody.appendChild(row);

            // Update the article counter badge
            const allRows = bomTableBody.querySelectorAll('tr');
            const bomCount = document.getElementById('bomCount');
            if (bomCount) bomCount.textContent = `${allRows.length} Artikel ben\u00f6tigt`;

            addArtikelModal.classList.remove('active');
        });
    }

    // Allow closing modal with Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && addArtikelModal && addArtikelModal.classList.contains('active')) {
            addArtikelModal.classList.remove('active');
        }
    });

    // --- Boot Sequence ---
    // Priority: (1) Mac filesystem via /api/data  (2) IndexedDB backup
    // localStorage is intentionally NOT used for data — the dataset (4.5MB+) exceeds the 5MB limit.

    const modifiedApps = new Set();

    function applyDataToApps(data) {
        Object.keys(data).forEach(appId => {
            if (!productApps[appId]) return;
            const src = data[appId];
            const hasData = (src.trays?.length > 0 || src.parts?.length > 0 || src.finishes?.length > 0);
            if (!hasData) return;
            if (src.trays)    productApps[appId].trays    = src.trays;
            if (src.parts)    productApps[appId].parts    = src.parts;
            if (src.finishes) productApps[appId].finishes = src.finishes;
            if (src.mainImgUrl !== undefined) productApps[appId].mainImgUrl = src.mainImgUrl;
            modifiedApps.add(appId);
        });
    }

    let dataLoaded = false;

    // 1. Fetch fresh live data from Mac filesystem via Vite dev server
    try {
        const res = await fetch('/api/data?t=' + Date.now(), { cache: 'no-store' });
        if (res.ok) {
            const diskData = await res.json();
            const keys = Object.keys(diskData);
            if (keys.length > 0) {
                applyDataToApps(diskData);
                dataLoaded = true;
                console.log(`[Konfigurator] Loaded fresh data from Mac file: ${keys.length} categories.`);
            } else {
                console.warn('[Konfigurator] /api/data returned empty.');
            }
        } else {
            console.warn(`[Konfigurator] /api/data responded ${res.status}.`);
        }
    } catch(e) {
        console.warn('[Konfigurator] /api/data unavailable (not in dev server?):', e.message);
    }

    // 2. Fetch from bundled data (for static build)
    if (!dataLoaded) {
        try {
            const files = import.meta.glob('./custom-data.json', { eager: true });
            if (files['./custom-data.json']) {
                const bundledData = files['./custom-data.json'].default;
                if (bundledData && Object.keys(bundledData).length > 0) {
                    applyDataToApps(bundledData);
                    dataLoaded = true;
                    console.log('[Konfigurator] Loaded data from Vite bundled JSON.');
                }
            }
        } catch(e) {
            console.warn('[Konfigurator] Failed to load bundled JSON:', e.message);
        }
    }

    // 3. Fallback: load from IndexedDB
    if (!dataLoaded) {
    try {
        const { loadFromIndexedDB } = await import('./modules/storage.js');
        const backup = await loadFromIndexedDB('latest_config');
        if (backup && Object.keys(backup).length > 0) {
            applyDataToApps(backup);
            dataLoaded = true;
            console.log('[Konfigurator] Loaded from IndexedDB backup.');
        }
    } catch(e) {
        console.warn('[Konfigurator] IndexedDB backup unavailable:', e.message);
    }
    }


    // FINAL RENDER: Now that data is definitely in productApps, show the UI
    console.log('[Konfigurator] Boot sequence complete. Rendering catalog...');
    
    // Debug: Log counts of all apps to verify data injection
    const appStats = {};
    Object.keys(productApps).forEach(id => {
        const app = productApps[id];
        const count = (app.trays?.length || 0) + (app.parts?.length || 0) + (app.finishes?.length || 0);
        appStats[id] = count;
    });
    console.log('[Konfigurator] Final Data Payload Stats:');
    console.table(appStats);

    if (appStats['duschenwanne'] < 10) {
        console.warn('[Konfigurator] WARNING: Low product count detected for Duschenwanne. Check bundledData integrity.');
    }

    renderCatalog();

    // Note: Redundant localStorage-to-memory sync removed to prevent overwriting fresh API data with stale cache.
    // Logic for image auto-healing and size normalization should be moved to the data injection phase or handled on-demand.

    // Initialize Admin
    setupAdmin(modifiedApps, renderCatalog);

    // --- Custom List (Wishlist) Logic ---
    const wishlistModal = document.getElementById('wishlistModal');
    const closeWishlistBtn = document.getElementById('closeWishlistBtn');
    const openWishlistBtnConfig = document.getElementById('openWishlistBtnConfig');
    const openWishlistBtnHome = document.getElementById('openWishlistBtnHome');
    const clearWishlistBtn = document.getElementById('clearWishlistBtn');
    const copyWishlistBtn = document.getElementById('copyWishlistBtn');
    const pdfWishlistBtn = document.getElementById('pdfWishlistBtn');
    const addAllToWishlistBtn = document.getElementById('addAllToWishlistBtn');
    const wishlistTableBody = document.getElementById('wishlistTableBody');

    let draggedRowIndex = null;

    if (wishlistTableBody) {
        wishlistTableBody.addEventListener('dragover', (e) => {
            e.preventDefault();
            const tr = e.target.closest('tr');
            if (!tr || tr.dataset.index === undefined) return;

            const draggedNode = wishlistTableBody.querySelector(`tr[data-index="${draggedRowIndex}"]`);
            if (!draggedNode || draggedNode === tr) return;

            const rect = tr.getBoundingClientRect();
            const midY = rect.top + rect.height / 2;
            wishlistTableBody.insertBefore(draggedNode, e.clientY < midY ? tr : tr.nextSibling);
        });
    }

    window.renderWishlistModal = function() {
        wishlistTableBody.innerHTML = '';
        if (window.customWishlist.length === 0) {
            wishlistTableBody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: #9da3ad; padding: 2rem;">Ihre Eigene Selektion ist leer.</td></tr>';
            return;
        }

        window.customWishlist.forEach((item, index) => {
            const row = document.createElement('tr');
            row.draggable = true;
            row.dataset.index = index;
            row.style.cursor = 'grab';

            const imageTd = document.createElement('td');
            const dragIcon = document.createElement('i');
            dragIcon.className = 'ri-draggable';
            dragIcon.style.cssText = 'cursor: grab; color: var(--text-secondary); margin-right: 0.5rem; font-size: 1.2rem;';
            imageTd.appendChild(dragIcon);

            const imageCell = document.createElement('div');
            imageCell.className = 'img-cell';
            imageCell.style.cssText = 'display: inline-flex; vertical-align: middle;';
            if (item.imgUrl) {
                imageCell.appendChild(createSafeImage(item.imgUrl));
            } else {
                const placeholder = document.createElement('i');
                placeholder.className = 'ri-image-line';
                placeholder.style.cssText = 'font-size:1.2rem;color:var(--text-secondary);';
                imageCell.appendChild(placeholder);
            }
            imageTd.appendChild(imageCell);
            row.appendChild(imageTd);

            const artNrTd = document.createElement('td');
            const artNr = document.createElement('span');
            artNr.className = 'bom-code';
            artNr.textContent = item.artNr || '';
            artNrTd.appendChild(artNr);
            row.appendChild(artNrTd);

            const labelTd = document.createElement('td');
            const label = document.createElement('div');
            label.className = 'bom-desc';
            label.textContent = item.label || '';
            labelTd.appendChild(label);
            row.appendChild(labelTd);

            const typeTd = document.createElement('td');
            const type = document.createElement('span');
            type.className = 'bom-type';
            type.textContent = item.typ || 'Artikel';
            typeTd.appendChild(type);
            row.appendChild(typeTd);

            const qtyTd = document.createElement('td');
            const qty = document.createElement('strong');
            qty.textContent = item.menge || 1;
            qtyTd.appendChild(qty);
            row.appendChild(qtyTd);

            const actionTd = document.createElement('td');
            const removeBtn = document.createElement('button');
            removeBtn.className = 'icon-btn btn-danger';
            removeBtn.title = 'Entfernen';
            appendIcon(removeBtn, 'ri-delete-bin-line');
            removeBtn.addEventListener('click', () => window.removeFromWishlist(index));
            actionTd.appendChild(removeBtn);
            row.appendChild(actionTd);

            // Drag Events
            row.addEventListener('dragstart', (e) => {
                draggedRowIndex = parseInt(row.dataset.index);
                e.dataTransfer.effectAllowed = 'move';
                setTimeout(() => row.style.opacity = '0.4', 0);
            });

            row.addEventListener('dragend', () => {
                row.style.opacity = '1';
                // Calculate new order from DOM
                const newOrder = [];
                Array.from(wishlistTableBody.querySelectorAll('tr')).forEach(tr => {
                    const idx = parseInt(tr.dataset.index);
                    if (!isNaN(idx)) newOrder.push(window.customWishlist[idx]);
                });
                window.customWishlist = newOrder;
                saveWishlist();
                renderWishlistModal();
            });

            wishlistTableBody.appendChild(row);
        });
    };

    window.removeFromWishlist = function(index) {
        window.customWishlist.splice(index, 1);
        saveWishlist();
        renderWishlistModal();
    };

    const openWishlist = () => {
        updateWishlistBadges();
        renderWishlistModal();
        wishlistModal.classList.add('active');
    };

    if (openWishlistBtnConfig) openWishlistBtnConfig.addEventListener('click', openWishlist);
    if (openWishlistBtnHome) openWishlistBtnHome.addEventListener('click', openWishlist);
    if (closeWishlistBtn) closeWishlistBtn.addEventListener('click', () => wishlistModal.classList.remove('active'));

    if (clearWishlistBtn) {
        clearWishlistBtn.addEventListener('click', () => {
            if (confirm('Möchten Sie Ihre Eigene Selektion wirklich leeren?')) {
                window.customWishlist = [];
                saveWishlist();
            }
        });
    }

    if (copyWishlistBtn) {
        copyWishlistBtn.addEventListener('click', () => {
            if (window.customWishlist.length === 0) {
                alert('Die Eigene Selektion ist leer.');
                return;
            }
            const text = window.customWishlist.map(i => `${i.artNr}\t${i.menge}`).join('\n');
            navigator.clipboard.writeText(text).then(() => {
                alert("Eigene Selektion für SAP kopiert:\n\n" + text.replace(/\t/g, "    "));
            });
        });
    }

    if (pdfWishlistBtn) {
        pdfWishlistBtn.addEventListener('click', () => {
            if (window.customWishlist.length === 0) {
                alert('Die Eigene Selektion ist leer.');
                return;
            }
            const printWindow = window.open('', '', 'width=950,height=900');
            printWindow.document.write(`
                <html>
                <head>
                    <title>Offertanfrage - Sanitas Troesch</title>
                    <style>
                        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
                        body { font-family: 'Inter', -apple-system, sans-serif; color: #1a1d1f; padding: 40px; line-height: 1.5; }
                        .header { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 3px solid #ed1b24; padding-bottom: 20px; margin-bottom: 30px; }
                        .brand { font-size: 24px; font-weight: 800; color: #ed1b24; text-transform: uppercase; letter-spacing: -0.5px; }
                        .doc-type { font-size: 14px; color: #6f767e; text-transform: uppercase; font-weight: 600; }
                        h1 { font-size: 28px; margin: 20px 0 10px 0; font-weight: 700; }
                        .meta-info { font-size: 13px; color: #6f767e; margin-bottom: 40px; }
                        table { width: 100%; border-collapse: collapse; margin-top: 20px; border-radius: 8px; overflow: hidden; }
                        th { background-color: #f4f4f4; text-align: left; padding: 14px 12px; font-size: 12px; font-weight: 700; text-transform: uppercase; color: #6f767e; border-bottom: 2px solid #efefef; }
                        td { padding: 16px 12px; border-bottom: 1px solid #efefef; vertical-align: middle; font-size: 14px; }
                        .img-container { width: 80px; height: 80px; background: #fff; border: 1px solid #efefef; border-radius: 6px; display: flex; align-items: center; justify-content: center; padding: 4px; }
                        .img-container img { max-width: 100%; max-height: 100%; object-fit: contain; }
                        .art-nr { font-family: 'JetBrains Mono', monospace; font-weight: 600; color: #ed1b24; font-size: 13px; }
                        .description { font-weight: 600; margin-bottom: 4px; }
                        .sub-info { font-size: 12px; color: #6f767e; }
                        .qty { font-weight: 700; font-size: 16px; }
                        .footer { margin-top: 60px; padding-top: 20px; border-top: 1px solid #efefef; font-size: 12px; color: #9a9fa5; text-align: center; }
                        @media print {
                            body { padding: 0; }
                            .no-print { display: none; }
                            table { page-break-inside: auto; }
                            tr { page-break-inside: avoid; page-break-after: auto; }
                        }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <div class="brand">Sanitas Troesch</div>
                        <div class="doc-type">Konfigurations-Stückliste</div>
                    </div>
                    <h1>Eigene Selektion</h1>
                    <div class="meta-info">Erstellt am ${new Date().toLocaleDateString('de-CH')} | ${window.customWishlist.length} Positionen</div>
                    
                    <table>
                        <thead>
                            <tr>
                                <th width="100">Vorschau</th>
                                <th width="160">Artikelnummer</th>
                                <th>Bezeichnung / Details</th>
                                <th width="100">Typ</th>
                                <th width="60">Menge</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${window.customWishlist.map(item => `
                                <tr>
                                    <td>
                                        <div class="img-container">
                                            ${item.imgUrl ? `<img src="${item.imgUrl}">` : '<div style="color:#ccc;font-size:10px">Kein Bild</div>'}
                                        </div>
                                    </td>
                                    <td><span class="art-nr">${item.artNr}</span></td>
                                    <td>
                                        <div class="description">${item.label}</div>
                                        ${item.typ ? `<div class="sub-info">${item.typ}</div>` : ''}
                                    </td>
                                    <td><span style="background:#f4f4f4; padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: 600;">${item.typ || 'ARTIKEL'}</span></td>
                                    <td><span class="qty">${item.menge}</span></td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>

                    <div class="footer">
                        Diese Zusammenstellung dient als Grundlage für Ihre Offertanfrage. Änderungen vorbehalten.<br>
                        Sanitas Troesch AG - Ihr Partner für Bad und Küche.
                    </div>

                    <script>
                        window.onload = () => {
                            setTimeout(() => {
                                window.print();
                                window.close();
                            }, 500);
                        };
                    </script>
                </body>
                </html>
            `);
            printWindow.document.close();
        });
    }

    if (addAllToWishlistBtn) {
        addAllToWishlistBtn.addEventListener('click', () => {
            const bomTableBody = document.getElementById('bomTableBody');
            const rows = bomTableBody.querySelectorAll('tr');
            if (rows.length === 0 || rows[0].textContent.includes('Bitte wählen Sie ein Produkt')) {
                alert('Ihre Stückliste ist derzeit leer.');
                return;
            }

            let addedCount = 0;
            rows.forEach(row => {
                const artNrEl = row.querySelector('.bom-code');
                const labelEl = row.querySelector('.bom-desc');
                const typEl = row.querySelector('.bom-type');
                const imgEl = row.querySelector('.img-cell img');
                const mengeEl = row.querySelector("td:nth-child(5) strong");

                if (artNrEl && labelEl) {
                    const artNr = artNrEl.textContent.trim();
                    const label = labelEl.textContent.trim();
                    const typ = typEl ? typEl.textContent.trim() : 'Artikel';
                    const imgUrl = imgEl ? imgEl.src : undefined;
                    const menge = mengeEl ? parseInt(mengeEl.textContent) : 1;

                    const exists = window.customWishlist.find(i => i.artNr === artNr);
                    if (exists) {
                        exists.menge += menge;
                    } else {
                        window.customWishlist.push({
                            artNr, label, typ, imgUrl, menge
                        });
                    }
                    addedCount++;
                }
            });

            if (addedCount > 0) {
                saveWishlist();
                
                // Show feedback toast
                const feedback = document.createElement('div');
                feedback.style.position = 'fixed';
                feedback.style.bottom = '20px';
                feedback.style.right = '20px';
                feedback.style.background = 'var(--accent)';
                feedback.style.color = '#000';
                feedback.style.padding = '1rem 1.5rem';
                feedback.style.borderRadius = '8px';
                feedback.style.fontWeight = 'bold';
                feedback.style.zIndex = '9999';
                feedback.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
                appendIcon(feedback, 'ri-check-line');
                feedback.append(` ${addedCount} Artikel zur Eigenen Selektion hinzugefügt`);
                document.body.appendChild(feedback);
                setTimeout(() => feedback.remove(), 3000);
            }
        });
    }
    
    // Initializer call for badges
    updateWishlistBadges();

});

document.addEventListener('DOMContentLoaded', () => {
    const btnGlobalReset = document.getElementById('btn_global_reset');
    if (btnGlobalReset) {
        btnGlobalReset.addEventListener('click', () => {
            if (window.currentActiveApp && typeof window.currentActiveApp.init === 'function') {
                if (document.body.classList.contains('mixmatch-active')) {
                    const basins = window.productApps?.waschtisch?.trays || [];
                    const allFaucets = window.productApps?.waschtischmischer?.trays || [];
                    window.currentActiveApp.init(basins, allFaucets);
                } else {
                    window.currentActiveApp.init();
                }
            }
        });
    }
});
