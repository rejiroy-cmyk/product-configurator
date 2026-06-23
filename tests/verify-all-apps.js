// Construction + feature coverage across ALL 13 configurator factories.
// Complements verify-duschtrennwand.js (which deep-tests the Glass/relational door logic).
// Catches the class of bug that the per-app gaps left open: a factory that fails to
// construct, loses its init(), or silently drops a feature.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- Mock browser environment (mirrors verify-duschtrennwand.js) ---
let lastCopiedText = '';
global.alert = () => {};
global.window = {
    copyTextToClipboard: (t) => { lastCopiedText = t; return Promise.resolve(); },
    copyBOMToClipboard: () => {},
    getComputedStyle: () => ({ display: 'block' }),
    productApps: {},
};
const mkEl = () => ({
    style: {}, innerHTML: '', children: [], value: '',
    classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
    querySelectorAll: () => [], querySelector: () => null,
    appendChild() {}, removeChild() {}, setAttribute() {}, addEventListener() {}, replaceChildren() {},
});
global.document = {
    createElement: () => mkEl(),
    body: { appendChild() {}, removeChild() {} },
    getElementById: (id) =>
        ['bomTableBody', 'bomCount', 'bomCountCounter', 'configSidebar', 'backToCatalogBtn'].includes(id) ? mkEl() : null,
    querySelector: () => null,
    querySelectorAll: () => [],
    addEventListener() {},
};
Object.defineProperty(global, 'navigator', { value: { clipboard: {} }, writable: true, configurable: true });

// Dynamic import (after globals are set)
const F = await import('../modules/factories.js');

// Every configurator factory the app ships.
const APP_TYPES = [
    'createFinishesApp', 'createRelationalApp', 'createWashbasinApp', 'createWaschtischMischerApp',
    'createMixAndMatchApp', 'createDuschenmischerApp', 'createBademischerApp', 'createStandardApp',
    'createGlassApp', 'createWCApp', 'createDuschenwanneApp', 'createDuschenrinneApp', 'createBadewanneApp',
];

const tests = [];

// 1. Every factory is exported, constructs a valid app, and exposes init().
for (const name of APP_TYPES) {
    tests.push({
        name: `${name}: exported, constructs, exposes init()`,
        fn: () => {
            const factory = F[name];
            if (typeof factory !== 'function') throw new Error(`${name} is not exported as a function`);
            const app = factory('TEST', 'description', 'placeholder.png');
            if (!app || typeof app !== 'object') throw new Error('did not return an app object');
            if (typeof app.init !== 'function') throw new Error('app is missing init()');
        },
    });
}

// 2. Feature lock — Bademischer UP mixers gain the optional Duschgleitstange (via the trays setter).
tests.push({
    name: 'Bademischer: UP tray gains optional Duschgleitstange',
    fn: () => {
        const app = F.createBademischerApp('TEST', 'description', 'placeholder.png');
        app.trays = [{ label: 'Bademischer UP Endmontage', mountingMaterials: [{ name: 'Rohbauset' }] }];
        const names = app.trays[0].mountingMaterials.map((m) => m.name);
        if (!names.some((n) => (n || '').toLowerCase().includes('gleitstange')))
            throw new Error(`Gleitstange not added. Got: ${JSON.stringify(names)}`);
    },
});

// 3. Feature lock — non-UP mixers must NOT get the Gleitstange (no false positives).
tests.push({
    name: 'Bademischer: non-UP (Aufputz) tray is left untouched',
    fn: () => {
        const app = F.createBademischerApp('TEST', 'description', 'placeholder.png');
        app.trays = [{ label: 'Bademischer Aufputz', mountingMaterials: [{ name: 'Rohbauset' }] }];
        const names = app.trays[0].mountingMaterials.map((m) => m.name);
        if (names.some((n) => (n || '').toLowerCase().includes('gleitstange')))
            throw new Error(`Gleitstange wrongly added to non-UP tray. Got: ${JSON.stringify(names)}`);
    },
});

// 4. Idempotency — a UP tray that already has a Gleitstange must not get a duplicate.
tests.push({
    name: 'Bademischer: existing Gleitstange is not duplicated',
    fn: () => {
        const app = F.createBademischerApp('TEST', 'description', 'placeholder.png');
        app.trays = [{ label: 'Bademischer UP', mountingMaterials: [{ name: 'Duschgleitstange vorhanden' }] }];
        const count = app.trays[0].mountingMaterials.filter((m) => (m.name || '').toLowerCase().includes('gleitstange')).length;
        if (count !== 1) throw new Error(`Expected exactly 1 Gleitstange, got ${count}`);
    },
});

// --- Runner ---
console.log('\n--------------------------------------------------');
console.log('⚡ Running All-Apps Construction & Feature Tests...');
console.log('--------------------------------------------------\n');
let passed = 0, failed = 0;
for (const t of tests) {
    try {
        t.fn();
        console.log(`✅ [PASS] ${t.name}`);
        passed++;
    } catch (e) {
        console.error(`❌ [FAIL] ${t.name}\n     ${e.message}`);
        failed++;
    }
}
console.log('\n--------------------------------------------------');
console.log(`Summary: ${passed} passed, ${failed} failed.`);
console.log('--------------------------------------------------');
process.exit(failed > 0 ? 1 : 0);
