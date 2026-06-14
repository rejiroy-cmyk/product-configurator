import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 1. Mock Browser Environment for Node.js (Must be set before importing factories.js)
global.window = {
    copyTextToClipboard: () => {},
    copyBOMToClipboard: () => {}
};
const globalMockElements = {
    bomTableBody: { 
        style: {}, 
        querySelectorAll: () => [], 
        querySelector: () => null 
    },
    bomCountCounter: { style: {} },
    backToCatalogBtn: { style: {} }
};

global.document = {
    createElement: () => ({ style: {} }),
    body: { appendChild: () => {}, removeChild: () => {} },
    getElementById: (id) => {
        if (id === "bomTableBody") return globalMockElements.bomTableBody;
        if (id === "bomCount" || id === "bomCountCounter") return globalMockElements.bomCountCounter;
        if (id === "backToCatalogBtn") return globalMockElements.backToCatalogBtn;
        return null;
    },
    querySelector: () => null
};

// Workaround Node.js read-only global.navigator restriction
Object.defineProperty(global, 'navigator', {
    value: { clipboard: {} },
    writable: true,
    configurable: true
});

// 2. Dynamic import to prevent hoisting issues in ESM
const { createGlassApp } = await import('../modules/factories.js');

// Load actual catalog data
const projectDir = path.join(__dirname, '..');
const data = JSON.parse(fs.readFileSync(path.join(projectDir, 'custom-data.json'), 'utf8'));
const trays = data.duschtrennwand.trays || [];

// Create an instance of the Glass App and load trays
const app = createGlassApp('DUSCHTRENNWAND', 'Test Configurator', 'placeholder.png');
app.trays = trays;

// 3. Define the tests
const tests = [
    {
        name: "Optional side wall is hidden (type is null)",
        fn: () => {
            const item = trays.find(t => t.artNr === "1442 238.501.118"); // Seitenwand Koralle S600 Plus
            const type = app.extractType(item);
            if (type !== null) throw new Error(`Expected null, got "${type}"`);
        }
    },
    {
        name: "Walk-in side wall remains visible (type is Freistehende Seitenwand)",
        fn: () => {
            const item = trays.find(t => t.artNr === "1545 686.501.119"); // Freistehende Seitenwand Alterna lin.3
            const type = app.extractType(item);
            if (type !== "Freistehende Seitenwand") throw new Error(`Expected "Freistehende Seitenwand", got "${type}"`);
        }
    },
    {
        name: "Door with 'seitenwand' in label is classified as door",
        fn: () => {
            const item = trays.find(t => t.artNr === "1545 364.501.119"); // Pendeltüre Alterna lin.3 mit Seitenwand
            const type = app.extractType(item);
            if (type !== "Pendeltür") throw new Error(`Expected "Pendeltür", got "${type}"`);
        }
    },
    {
        name: "Door with corrupted umlauts is classified correctly",
        fn: () => {
            const item = trays.find(t => t.artNr === "1513 172.597.119"); // Drehfalttr Duscholux Bella Vita 3
            const type = app.extractType(item);
            if (type !== "Falttür") throw new Error(`Expected "Falttür", got "${type}"`);
        }
    },
    {
        name: "Model numbers are cleaned from label for size score",
        fn: () => {
            const item1 = trays.find(t => t.artNr === "1541 240.501.118"); // S505 Plus freistehende Seitenwand parent
            const item2 = trays.find(t => t.artNr === "1522 876.100.118"); // S606 Plus - Raumhoch parent
            
            if (!item1) throw new Error("Could not find item 1541 240.501.118");
            if (!item2) throw new Error("Could not find item 1522 876.100.118");

            const score1 = app.extractSizeScore(item1);
            const score2 = app.extractSizeScore(item2);
            
            // Scores should be width dimensions, not series numbers
            if (score1 === 505) throw new Error(`Model S505 corrupted size score for 1541 240.501.118!`);
            if (score2 === 606) throw new Error(`Model S606 corrupted size score for 1522 876.100.118!`);
        }
    },
    {
        name: "Width is extracted correctly ignoring model names",
        fn: () => {
            const item = trays.find(t => t.artNr === "1541 240.501.118"); // S505 Plus parent
            if (!item) throw new Error("Could not find item 1541 240.501.118");
            const width = app.extractWidthCm(item);
            if (width === 50.5 || width === 505) throw new Error(`Expected width to ignore S505, got ${width}`);
        }
    },
    {
        name: "Freistehende Seitenwand situation is Walk-in",
        fn: () => {
            const item = trays.find(t => t.artNr === "1173 962.490.118"); // Seitenwand Koralle S808
            const sit = app.extractSituation(item);
            if (sit !== "Freistehend / Walk-in") throw new Error(`Expected "Freistehend / Walk-in", got "${sit}"`);
        }
    },
    {
        name: "Side wall pairing requires opposite hinges (links -> rechts)",
        fn: () => {
            const door = trays.find(t => t.artNr === "1545 364.501.119"); // Pendeltüre Band rechts
            const walls = app.getMatchingSideWalls(door);
            
            // Check that all matched walls are either links or Universal
            walls.forEach(w => {
                const band = app.extractBand(w);
                if (band === "rechts") {
                    throw new Error(`Invalid side wall pairing: Door with Band rechts (${door.artNr}) paired with side wall with Band rechts (${w.artNr})!`);
                }
            });
        }
    },
    {
        name: "getMatchedVariant selects correct article number based on selected Glasart",
        fn: () => {
            const parent = trays.find(t => t.artNr === "1372 666.599.118"); // Eckeinstieg Koralle S300 parent
            if (!parent) throw new Error("Could not find parent 1372 666.599.118");
            
            // Simulating Pflegeleicht (Easy-Clean) filter
            app.currentGlasart = "Pflegeleicht (Easy-Clean)";
            app.currentColor = "all";
            
            const variant = app.getMatchedVariant(parent);
            if (variant.artNr !== "1372 666.599.130") {
                throw new Error(`Expected variant artNr to be 1372 666.599.130, got ${variant.artNr}`);
            }
            
            // Clean up filter
            app.currentGlasart = "all";
        }
    },
    {
        name: "extractColor resolves .350. products as Schwarz despite Standard tag",
        fn: () => {
            const parent = trays.find(t => t.artNr === "1522 876.100.118"); // parent has variants matching .350.
            if (!parent) throw new Error("Could not find parent 1522 876.100.118");
            
            const blackVariant = parent.variants.find(v => v.artNr === "1522 876.350.118");
            if (!blackVariant) throw new Error("Could not find variant 1522 876.350.118");
            
            const color = app.extractColor(blackVariant);
            if (color !== "Schwarz") {
                throw new Error(`Expected "Schwarz", got "${color}"`);
            }
        }
    },
    {
        name: "extractBand resolves Anschlag links to links",
        fn: () => {
            const item = trays.find(t => t.artNr === "1372 702.599.118"); // Anschlag links parent
            if (!item) throw new Error("Could not find item 1372 702.599.118");
            const band = app.extractBand(item);
            if (band !== "links") throw new Error(`Expected "links", got "${band}"`);
        }
    },
    {
        name: "extractBand resolves Festteil rechts to rechts",
        fn: () => {
            const item = trays.find(t => t.artNr === "1541 772.535.118"); // Festteil rechts parent
            if (!item) throw new Error("Could not find item 1541 772.535.118");
            const band = app.extractBand(item);
            if (band !== "rechts") throw new Error(`Expected "rechts", got "${band}"`);
        }
    },
    {
        name: "extractBand resolves correct hinge side for variant with truncated label",
        fn: () => {
            const parent = trays.find(t => (t.variants || []).some(v => v.artNr === "1565 292.535.130"));
            if (!parent) throw new Error("Could not find parent for 1565 292.535.130");
            const variant = parent.variants.find(v => v.artNr === "1565 292.535.130");
            
            // Merged variant (similar to what getMatchedVariant returns)
            const merged = { ...parent, ...variant };
            const band = app.extractBand(merged);
            if (band !== "rechts") {
                throw new Error(`Expected "rechts" (inherited from parent), got "${band}"`);
            }
        }
    },
    {
        name: "getSpec resolves spec value from corrupted key Ausprgung",
        fn: () => {
            const item = trays.find(t => t.artNr === "1511 147.591.119");
            if (!item) throw new Error("Could not find item 1511 147.591.119");
            const val = app.getSpec(item, "ausprägung");
            if (!val || !val.includes("Band rechts")) {
                throw new Error(`Expected spec containing "Band rechts", got "${val}"`);
            }
        }
    },
    {
        name: "reconstructDescription cleans original suffixes and appends variant suffixes without duplication",
        fn: () => {
            const parent = trays.find(t => (t.variants || []).some(v => v.artNr === "1565 292.535.130"));
            if (!parent) throw new Error("Could not find parent for 1565 292.535.130");
            const variant = parent.variants.find(v => v.artNr === "1565 292.535.130");
            
            const desc = app.reconstructDescription(parent, variant);
            const expected = "Seitenwand Koralle S400 Plus freistehend, Breite 117,5 - 119 cm, Anschlag rechts, mit, schwarz matt, Echtglas klar Glasplus";
            if (desc !== expected) {
                throw new Error(`Expected "${expected}", got "${desc}"`);
            }
        }
    },
    {
        name: "getVirtualGlasart maps brand-specific raw strings to unified categories",
        fn: () => {
            if (app.getVirtualGlasart("Echtglas klar Glasplus") !== "Pflegeleicht (Easy-Clean)") throw new Error("Expected Glasplus to map to Pflegeleicht");
            if (app.getVirtualGlasart("Echtglas klar CareTec Pro") !== "Pflegeleicht (Easy-Clean)") throw new Error("Expected CareTec Pro to map to Pflegeleicht");
            if (app.getVirtualGlasart("Echtglas klar ProCare") !== "Pflegeleicht (Easy-Clean)") throw new Error("Expected ProCare to map to Pflegeleicht");
            if (app.getVirtualGlasart("Echtglas klar Duschguard") !== "Korrosionsgeschützt") throw new Error("Expected Duschguard to map to Korrosionsgeschützt");
            if (app.getVirtualGlasart("Echtglas klar") !== "Standard") throw new Error("Expected Echtglas klar to map to Standard");
        }
    },
    {
        name: "Cross-Brand Glass Filter matches correct variants for different manufacturers",
        fn: () => {
            // 1. Koralle Parent with variants: S300 Eckeinstieg 1372 666.599.118
            const koralleParent = trays.find(t => t.artNr === "1372 666.599.118");
            if (!koralleParent) throw new Error("Could not find Koralle parent");
            
            app.currentGlasart = "Pflegeleicht (Easy-Clean)";
            app.currentColor = "all";
            const koralleVariant = app.getMatchedVariant(koralleParent);
            if (koralleVariant.artNr !== "1372 666.599.130") {
                throw new Error(`Expected Koralle variant to be 1372 666.599.130, got ${koralleVariant.artNr}`);
            }

            // 2. Duscholux/Alterna Flat Products:
            // Liva Schiebetür 1541 612.597.118 (Standard) vs 1541 662.597.119 (CareTec Pro)
            // Let's check that if we run app.filterResults, only the CareTec Pro one is returned
            app.currentColor = "Chrom";
            app.currentBand = "rechts";
            app.currentType = "Schiebetür";
            app.currentManufacturer = "Alterna";
            
            // Mock elements used by filterResults
            const originalGetElementById = global.document.getElementById;
            global.document.getElementById = (id) => {
                if (id.startsWith("input_search_")) return { value: "" };
                return null;
            };

            // Capture results
            const results = trays.filter(l => {
                const o = (l.label || "").toLowerCase();
                return !(
                    o.includes("massaufnahme") || o.includes("anfahrt") || (o.includes("badewanne") && !o.includes("duschwanne")) || 
                    app.extractType(l) === null || 
                    (app.currentManufacturer !== "all" && (l.manufacturer || "") !== app.currentManufacturer) ||
                    (app.currentType !== "all" && app.extractType(l) !== app.currentType) || 
                    (app.currentSituation !== "all" && app.extractSituation(l) !== app.currentSituation) || 
                    (app.currentColor !== "all" && app.extractColor(l) !== app.currentColor && !(l.variants || []).some(v => app.extractColor(v) === app.currentColor)) || 
                    (app.currentBand !== "all" && app.extractBand(l) !== app.currentBand) || 
                    (app.currentOption !== "all" && app.extractOption(l) !== app.currentOption) || 
                    (app.currentGlasart !== "all" && app.getVirtualGlasart(app.extractGlasart(l)) !== app.currentGlasart && !(l.variants || []).some(v => app.getVirtualGlasart(app.extractGlasart(v)) === app.currentGlasart)) || 
                    (app.currentSeries !== "all" && app.extractSeries(l) !== app.currentSeries) ||
                    (app.currentHeight !== "all" && app.extractHeightCm(l) !== app.currentHeight) ||
                    (app.currentWidthBucket !== "all" && app.getWidthBucket(l) !== app.currentWidthBucket)
                );
            });

            // Restore mock
            global.document.getElementById = originalGetElementById;

            // Clean up filters
            app.currentGlasart = "all";
            app.currentColor = "all";
            app.currentBand = "all";
            app.currentType = "all";
            app.currentManufacturer = "all";

            const hasStandard = results.some(r => r.artNr === "1541 612.597.118");
            const hasCareTec = results.some(r => r.artNr === "1541 662.597.119");

            if (hasStandard) throw new Error("Standard glass product 1541 612.597.118 was NOT filtered out by Easy-Clean filter!");
            if (!hasCareTec) throw new Error("CareTec Pro product 1541 662.597.119 was incorrectly filtered out by Easy-Clean filter!");
        }
    },
    {
        name: "S808 standard Pendeltüre supports side walls, but niche-only/Eckeinstieg does not",
        fn: () => {
            const standardDoor = trays.find(t => t.artNr === "1173 941.490.118");
            const nicheDoor = trays.find(t => t.artNr === "1173 959.490.118");
            const eckeinstieg = trays.find(t => t.artNr === "1173 938.490.118");

            if (!standardDoor) throw new Error("Could not find standard door 1173 941.490.118");
            if (!nicheDoor) throw new Error("Could not find niche-only door 1173 959.490.118");
            if (!eckeinstieg) throw new Error("Could not find eckeinstieg 1173 938.490.118");

            if (!app.checkSideWallSupport(standardDoor)) {
                throw new Error("Expected S808 standard door 1173 941.490.118 to support side walls!");
            }
            if (app.checkSideWallSupport(nicheDoor)) {
                throw new Error("Expected S808 niche-only door 1173 959.490.118 NOT to support side walls!");
            }
            if (app.checkSideWallSupport(eckeinstieg)) {
                throw new Error("Expected S808 Eckeinstieg 1173 938.490.118 NOT to support side walls!");
            }
        }
    },
    {
        name: "Correct Montagepauschale is selected for S300 Pendeltüre in niche vs. side-wall installation",
        fn: () => {
            const door = trays.find(t => t.artNr === "1372 690.599.118" || t.artNr === "1372 690.599.130");
            if (!door) throw new Error("Could not find door 1372 690.599.130");

            const r = app.extractSizeScore(door);
            
            const servicesNische = (door.services || []).filter(s => {
                const n = s.label.toLowerCase();
                
                if (n.includes("montagepauschale") && ((n.includes("bis 125") && r > 125) || (n.includes("ab 125") && r <= 125))) {
                    return false;
                }
                
                if (n.includes("mit seitenwand") || n.includes("für seitenwand") || n.includes("fuer seitenwand") || n.includes("eckeinstieg") ||
                    (n.includes(" mit") && !n.includes("nische") && !n.includes("festelement") && !n.includes("pendelelement") && !n.includes("glasteil"))) {
                    return false;
                }
                return true;
            });

            const hasNische = servicesNische.some(s => s.artNr === "1521 889.000.000");
            const hasSideWall = servicesNische.some(s => s.artNr === "1521 074.000.000");

            if (!hasNische) {
                throw new Error("Expected niche Montagepauschale 1521 889.000.000 to be active in niche installation!");
            }
            if (hasSideWall) {
                throw new Error("Expected side-wall Montagepauschale 1521 074.000.000 to be hidden in niche installation!");
            }
        }
    },
    {
        name: "setFilter updates the selected product variant and updates the BOM product number",
        fn: () => {
            const parent = trays.find(t => t.artNr === "1372 666.599.118");
            if (!parent) throw new Error("Could not find parent 1372 666.599.118");

            app.selectTray("1372 666.599.118");

            app.setFilter("Glasart", "Pflegeleicht (Easy-Clean)");

            const html = globalMockElements.bomTableBody.innerHTML || "";
            if (!html.includes("1372 666.599.130")) {
                throw new Error("Expected BOM HTML to contain variant article number 1372 666.599.130, but got: " + html);
            }

            app.setFilter("Glasart", "all");
            app.selectTray(null);
        }
    },
    {
        name: "Correct Montagepauschale is selected for S500 Plus (Breite 875-890 mm) with side-wall installation",
        fn: () => {
            const door = trays.find(t => t.artNr === "1543 267.592.118");
            if (!door) throw new Error("Could not find door 1543 267.592.118");

            const checkWidth = app.extractWidthCm(door);
            if (checkWidth !== 87.5) {
                throw new Error(`Expected extracted width 87.5 cm, got ${checkWidth}`);
            }

            // Test filtering logic for S500 Plus with side wall active (mocked as true)
            const activeServices = (door.services || []).filter(s => {
                const n = s.label.toLowerCase();
                
                // Dynamic mounting service filtering based on side wall selection
                // (simulating hasSideWallActive = true)
                if (n.includes("in nische") || n.includes("für nische") || n.includes("fuer nische")) {
                    return false;
                }

                // Dynamic width-based mounting service filtering (for 100 cm threshold)
                if (checkWidth !== null && n.includes("montagepauschale")) {
                    if (n.includes("bis 100") && checkWidth > 100) return false;
                    if ((n.includes("ab 100") || n.includes("100,1") || n.includes("100.1")) && checkWidth <= 100) return false;
                }
                return true;
            });

            const hasBis100 = activeServices.some(s => s.artNr === "1522 155.000.000"); // bis 100 cm
            const hasAb100 = activeServices.some(s => s.artNr === "1522 156.000.000");  // ab 100.1 cm

            if (!hasBis100) {
                throw new Error("Expected Montagepauschale bis 100 cm (1522 155.000.000) to be selected!");
            }
            if (hasAb100) {
                throw new Error("Expected Montagepauschale ab 100,1 cm (1522 156.000.000) to be excluded!");
            }
        }
    },
    {
        name: "Walk-in/Freistehend doors do not support perpendicular side walls",
        fn: () => {
            const targets = [
                "1522 972.592.118",
                "1522 973.592.118",
                "1522 974.592.118"
            ];
            targets.forEach(artNr => {
                const door = trays.find(t => t.artNr === artNr);
                if (!door) throw new Error(`Could not find door ${artNr}`);
                
                if (app.checkSideWallSupport(door)) {
                    throw new Error(`Expected door ${artNr} NOT to support side walls because it is Walk-in/Freistehend!`);
                }
            });
        }
    },
    {
        name: "Doors to Vormauerung (1522 941.xxx.xxx & 1522 944.xxx.xxx) are niche-only and do not support side walls",
        fn: () => {
            const targets = ["1522 941.535.118", "1522 944.535.118"];
            targets.forEach(artNr => {
                const door = trays.find(t => t.artNr === artNr);
                if (!door) throw new Error(`Could not find door ${artNr}`);

                const situation = app.extractSituation(door);
                if (situation !== "Nische") {
                    throw new Error(`Expected situation to be "Nische", got "${situation}" for ${artNr}`);
                }

                if (app.checkSideWallSupport(door)) {
                    throw new Error(`Expected Vormauerung door ${artNr} NOT to support side walls!`);
                }
            });
        }
    },
    {
        name: "Freestanding/Walk-in side walls are excluded from optional matching side walls list",
        fn: () => {
            const door = trays.find(t => t.artNr === "1543 228.501.118");
            if (!door) throw new Error("Could not find door 1543 228.501.118");

            const matched = app.getMatchingSideWalls(door);
            matched.forEach(w => {
                if (app.extractSituation(w) === "Freistehend / Walk-in") {
                    throw new Error(`Invalid side wall match: freestanding side wall ${w.artNr} matched with door ${door.artNr}!`);
                }
            });
        }
    },
    {
        name: "Doors in range 1543 222 to 1543 229 are niche-only and do not support side walls, while 1543 220/221 do support side walls",
        fn: () => {
            const nichePrefixes = ["1543 222", "1543 223", "1543 224", "1543 225", "1543 226", "1543 227", "1543 228", "1543 229"];
            nichePrefixes.forEach(prefix => {
                const door = trays.find(t => t.artNr.startsWith(prefix));
                if (!door) throw new Error(`Could not find door with prefix ${prefix}`);

                const parentSit = app.extractSituation(door);
                if (parentSit !== "Nische") {
                    throw new Error(`Expected situation to be "Nische", got "${parentSit}" for ${door.artNr}`);
                }
                if (app.checkSideWallSupport(door)) {
                    throw new Error(`Expected door ${door.artNr} NOT to support side walls!`);
                }

                if (door.variants && door.variants.length > 0) {
                    door.variants.forEach(v => {
                        const merged = { ...door, ...v };
                        const varSit = app.extractSituation(merged);
                        if (varSit !== "Nische") {
                            throw new Error(`Expected variant situation to be "Nische", got "${varSit}" for ${v.artNr}`);
                        }
                        if (app.checkSideWallSupport(merged)) {
                            throw new Error(`Expected variant ${v.artNr} NOT to support side walls!`);
                        }
                    });
                }
            });

            const comboPrefixes = ["1543 220", "1543 221"];
            comboPrefixes.forEach(prefix => {
                const door = trays.find(t => t.artNr.startsWith(prefix));
                if (!door) throw new Error(`Could not find door with prefix ${prefix}`);

                if (!app.checkSideWallSupport(door)) {
                    throw new Error(`Expected combination door ${door.artNr} to support side walls!`);
                }
            });
        }
    },
    {
        name: "S606 Plus in-line 'in Flucht' doors support side walls for specified overrides and return Nische",
        fn: () => {
            const inlineDoor = trays.find(t => t.artNr === "1528 347.501.118");
            if (!inlineDoor) throw new Error("Could not find door 1528 347.501.118");

            const situation = app.extractSituation(inlineDoor);
            if (situation !== "Nische") {
                throw new Error(`Expected situation to be "Nische", got "${situation}" for 1528 347.501.118`);
            }

            if (!app.checkSideWallSupport(inlineDoor)) {
                throw new Error("Expected in-line door 1528 347.501.118 to support side walls!");
            }

            const otherInlineDoor = trays.find(t => t.artNr === "1528 333.501.118");
            if (!otherInlineDoor) throw new Error("Could not find door 1528 333.501.118");

            if (app.checkSideWallSupport(otherInlineDoor)) {
                throw new Error("Expected in-line door 1528 333.501.118 NOT to support side walls!");
            }
        }
    },
    {
        name: "S606 Plus door mounting services dynamically adjust based on width and side wall selection",
        fn: () => {
            const getActiveMontage = (door, hasSideWallActive, checkWidth) => {
                const r = app.extractSizeScore(door);
                return (door.services || []).filter(s => {
                    const label = s.label.toLowerCase();
                    if (label.includes("montagepauschale")) {
                        // Size score filter
                        if ((label.includes("bis 125") && r > 125) || (label.includes("ab 125") && r <= 125)) return false;
                        
                        // Situation filter
                        if (hasSideWallActive) {
                            if (label.includes("in nische") || label.includes("für nische") || label.includes("fuer nische")) return false;
                            if (s.artNr === '1521 964.000.000') {
                                const hasSpecificService = (door.services || []).some(srv => 
                                    srv.artNr === '1521 969.000.000' || srv.artNr === '1521 970.000.000' || 
                                    srv.artNr === '1521 971.000.000' || srv.artNr === '1521 896.000.000'
                                );
                                if (hasSpecificService) return false;
                            }
                        } else {
                            if (label.includes("mit seitenwand") || label.includes("für seitenwand") || label.includes("fuer seitenwand") || label.includes("eckeinstieg") ||
                                (label.includes(" mit") && !label.includes("nische") && !label.includes("festelement") && !label.includes("pendelelement") && !label.includes("glasteil"))) {
                                return false;
                            }
                        }

                        // Width filter
                        if (checkWidth !== null) {
                            if (label.includes("bis 100") && checkWidth > 100) return false;
                            if ((label.includes("ab 100") || label.includes("100,1") || label.includes("100.1")) && checkWidth <= 100) return false;
                        }
                        return true;
                    }
                    return false;
                }).map(s => s.artNr);
            };

            // 1. Wide S606 Plus door: 1528 349.501.118 (140 cm)
            const wideDoor = trays.find(t => t.artNr === "1528 349.501.118");
            if (!wideDoor) throw new Error("Could not find door 1528 349.501.118");

            const nicheServicesWide = getActiveMontage(wideDoor, false, 140);
            if (!nicheServicesWide.includes("1521 967.000.000") || nicheServicesWide.includes("1521 971.000.000")) {
                throw new Error(`Incorrect niche services for wide door: ${JSON.stringify(nicheServicesWide)}`);
            }

            const sidewallServicesWide = getActiveMontage(wideDoor, true, 140);
            if (!sidewallServicesWide.includes("1521 971.000.000") || sidewallServicesWide.includes("1521 896.000.000") || sidewallServicesWide.includes("1521 967.000.000")) {
                throw new Error(`Incorrect side wall services for wide door: ${JSON.stringify(sidewallServicesWide)}`);
            }

            // 2. Narrow S606 Plus door: 1528 346.501.118 (100 cm)
            const narrowDoor = trays.find(t => t.artNr === "1528 346.501.118");
            if (!narrowDoor) throw new Error("Could not find door 1528 346.501.118");

            const nicheServicesNarrow = getActiveMontage(narrowDoor, false, 100);
            if (!nicheServicesNarrow.includes("1521 967.000.000") || nicheServicesNarrow.includes("1521 896.000.000")) {
                throw new Error(`Incorrect niche services for narrow door: ${JSON.stringify(nicheServicesNarrow)}`);
            }

            const sidewallServicesNarrow = getActiveMontage(narrowDoor, true, 100);
            if (!sidewallServicesNarrow.includes("1521 896.000.000") || sidewallServicesNarrow.includes("1521 971.000.000") || sidewallServicesNarrow.includes("1521 967.000.000")) {
                throw new Error(`Incorrect side wall services for narrow door: ${JSON.stringify(sidewallServicesNarrow)}`);
            }

            // 3. In-line door: 1528 315.501.118 (100 cm) - narrow
            const inlineNarrowDoor = trays.find(t => t.artNr === "1528 315.501.118");
            if (!inlineNarrowDoor) throw new Error("Could not find door 1528 315.501.118");

            const inlineNicheServicesNarrow = getActiveMontage(inlineNarrowDoor, false, 100);
            if (!inlineNicheServicesNarrow.includes("1521 968.000.000") || inlineNicheServicesNarrow.includes("1521 964.000.000")) {
                throw new Error(`Incorrect niche services for inline narrow door: ${JSON.stringify(inlineNicheServicesNarrow)}`);
            }

            const inlineSidewallServicesNarrow = getActiveMontage(inlineNarrowDoor, true, 100);
            if (!inlineSidewallServicesNarrow.includes("1521 964.000.000") || inlineSidewallServicesNarrow.includes("1521 965.000.000") || inlineSidewallServicesNarrow.includes("1521 968.000.000")) {
                throw new Error(`Incorrect side wall services for inline narrow door: ${JSON.stringify(inlineSidewallServicesNarrow)}`);
            }

            // 4. In-line door: 1528 317.501.118 (140 cm) - wide
            const inlineWideDoor = trays.find(t => t.artNr === "1528 317.501.118");
            if (!inlineWideDoor) throw new Error("Could not find door 1528 317.501.118");

            const inlineNicheServicesWide = getActiveMontage(inlineWideDoor, false, 140);
            if (!inlineNicheServicesWide.includes("1521 968.000.000") || inlineNicheServicesWide.includes("1521 965.000.000")) {
                throw new Error(`Incorrect niche services for inline wide door: ${JSON.stringify(inlineNicheServicesWide)}`);
            }

            const inlineSidewallServicesWide = getActiveMontage(inlineWideDoor, true, 140);
            if (!inlineSidewallServicesWide.includes("1521 965.000.000") || inlineSidewallServicesWide.includes("1521 964.000.000") || inlineSidewallServicesWide.includes("1521 968.000.000")) {
                throw new Error(`Incorrect side wall services for inline wide door: ${JSON.stringify(inlineSidewallServicesWide)}`);
            }

            // 5. In-line door: 1528 331.501.118 (100 cm) - narrow
            const festelementNarrowDoor = trays.find(t => t.artNr === "1528 331.501.118");
            if (!festelementNarrowDoor) throw new Error("Could not find door 1528 331.501.118");

            const festelementSidewallServicesNarrow = getActiveMontage(festelementNarrowDoor, true, 100);
            if (!festelementSidewallServicesNarrow.includes("1521 969.000.000") || festelementSidewallServicesNarrow.includes("1521 970.000.000") || festelementSidewallServicesNarrow.includes("1521 964.000.000")) {
                throw new Error(`Incorrect side wall services for festelement narrow door: ${JSON.stringify(festelementSidewallServicesNarrow)}`);
            }
        }
    },
    {
        name: "Alterna Costa Eckeinstieg door pairing and mandatory side wall configurations",
        fn: () => {
            const app = createGlassApp("DUSCHTRENNWAND", "Test", "img");
            app.trays = trays;
 
            // Test Case 1: Target door 1541 514.591.118 (Costa Eckeinstieg rechts)
            const targetDoor1 = trays.find(t => t.artNr === "1541 514.591.118");
            if (!targetDoor1) throw new Error("Could not find door 1541 514.591.118");
 
            if (!app.checkSideWallSupport(targetDoor1)) {
                throw new Error("Costa Eckeinstieg door should support side wall dropdown");
            }
            if (!app.checkIsMustSideWall(targetDoor1)) {
                throw new Error("Costa Eckeinstieg side wall selection should be mandatory");
            }
 
            const matches1 = app.getMatchingSideWalls(targetDoor1);
            if (matches1.length === 0) {
                throw new Error("No matching opposite door halves found for 1541 514.591.118");
            }
 
            for (const match of matches1) {
                if (!app.isAlternaCostaEckeinstieg(match)) {
                    throw new Error(`Matched product ${match.artNr} is not an Alterna Costa Eckeinstieg product`);
                }
                if (app.extractBand(match) !== "links") {
                    throw new Error(`Matched product ${match.artNr} does not have opposite band links`);
                }
                if (app.getExactColor(match) !== app.getExactColor(targetDoor1)) {
                    throw new Error("Color mismatch");
                }
                if (app.extractHeight(match) !== app.extractHeight(targetDoor1)) {
                    throw new Error("Height mismatch");
                }
            }
 
            const expectedMatch1 = matches1.find(m => m.artNr === "1541 513.591.118");
            if (!expectedMatch1) {
                throw new Error("Costa Eckeinstieg 1541 513.591.118 should be a match for 1541 514.591.118");
            }
 
            // Test Case 2: Target door 1541 493.597.140 (Costa Eckeinstieg links with ACS)
            const targetDoor2 = trays.find(t => t.artNr === "1541 493.597.140");
            if (!targetDoor2) throw new Error("Could not find door 1541 493.597.140");
 
            if (!app.checkSideWallSupport(targetDoor2)) {
                throw new Error("Costa Eckeinstieg door 1541 493.597.140 should support side wall dropdown");
            }
            if (!app.checkIsMustSideWall(targetDoor2)) {
                throw new Error("Costa Eckeinstieg side wall selection should be mandatory for 1541 493.597.140");
            }
 
            const matches2 = app.getMatchingSideWalls(targetDoor2);
            if (matches2.length === 0) {
                throw new Error("No matching opposite door halves found for 1541 493.597.140");
            }
 
            for (const match of matches2) {
                if (!app.isAlternaCostaEckeinstieg(match)) {
                    throw new Error(`Matched product ${match.artNr} is not an Alterna Costa Eckeinstieg product`);
                }
                if (app.extractBand(match) !== "rechts") {
                    throw new Error(`Matched product ${match.artNr} does not have opposite band rechts`);
                }
                if (app.getExactColor(match) !== app.getExactColor(targetDoor2)) {
                    throw new Error("Color mismatch for 1541 493.597.140 match");
                }
                if (app.extractHeight(match) !== app.extractHeight(targetDoor2)) {
                    throw new Error("Height mismatch for 1541 493.597.140 match");
                }
            }
 
            const expectedMatch2 = matches2.find(m => m.artNr === "1541 484.597.140");
            if (!expectedMatch2) {
                throw new Error("Costa Eckeinstieg 1541 484.597.140 should be a match for 1541 493.597.140");
            }
        }
    },
    {
        name: "Alterna Liva in Nische doors are niche-only and do not support side walls",
        fn: () => {
            const app = createGlassApp("DUSCHTRENNWAND", "Test", "img");
            app.trays = trays;
 
            // 1. Nische door: 1541 748.591.118 (contains 'in Nische' in label/description)
            const nischeDoor = trays.find(t => t.artNr === "1541 748.591.118");
            if (!nischeDoor) throw new Error("Could not find door 1541 748.591.118");
 
            const supportsSideWall = app.checkSideWallSupport(nischeDoor);
            if (supportsSideWall) {
                throw new Error("Alterna Liva 'in Nische' door 1541 748.591.118 should NOT support side walls");
            }
            if (app.extractSituation(nischeDoor) !== "Nische") {
                throw new Error("Alterna Liva 'in Nische' door 1541 748.591.118 situation should be Nische");
            }
 
            // 2. Combination door: 1541 756.591.118 (does NOT contain 'in Nische', but 'zur Kombination mit Seitenwand')
            const comboDoor = trays.find(t => t.artNr === "1541 756.591.118");
            if (!comboDoor) throw new Error("Could not find door 1541 756.591.118");
 
            const comboSupportsSideWall = app.checkSideWallSupport(comboDoor);
            if (!comboSupportsSideWall) {
                throw new Error("Alterna Liva combination door 1541 756.591.118 SHOULD support side walls");
            }
        }
    }
];

// 4. Run the test suite
let passed = 0;
let failed = 0;

console.log('--------------------------------------------------');
console.log('⚡ Running Configurator Regression Tests (Duschtrennwand)...');
console.log('--------------------------------------------------\n');

tests.forEach(test => {
    try {
        test.fn();
        console.log(`✅ [PASS] ${test.name}`);
        passed++;
    } catch (err) {
        console.error(`❌ [FAIL] ${test.name}`);
        console.error(`          Reason: ${err.message}\n`);
        failed++;
    }
});

console.log('\n--------------------------------------------------');
console.log(`Summary: ${passed} passed, ${failed} failed.`);
console.log('--------------------------------------------------');

if (failed > 0) {
    process.exit(1);
} else {
    process.exit(0);
}
