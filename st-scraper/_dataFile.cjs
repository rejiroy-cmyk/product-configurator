/**
 * _dataFile.cjs — the ONE way a script reads or writes custom-data.json.
 *
 * The file is stored INTERNED (see modules/dataHydrate.js for the why and the shape):
 * repeated mountingMaterials options and services live once in a shared `_options` /
 * `_services` table and every tray references them by key. That is ~20 MB off a file
 * already past GitHub's 50 MB warning — and it means a script that does a bare
 * `JSON.parse(fs.readFileSync(DATA))` now sees the STRING "o412" where it expects
 * `{artNr, label, …}`.
 *
 *   readData()        -> parsed AND expanded; the shape every injector already expects
 *   writeData(data)   -> interns, backs up, writes at indent 2
 *
 * Use these instead of fs directly. `writeData` re-interns whatever you hand it, so a
 * script that has expanded data in memory (all of them, after readData) writes a small
 * file without thinking about it.
 *
 * Indent 2 is not a style choice: minified, every edit is a one-line whole-file diff.
 */
'use strict';
const fs = require('fs');
const path = require('path');

const DATA = path.join(__dirname, '..', 'custom-data.json');
const copy = (o) => (typeof structuredClone === 'function' ? structuredClone(o) : JSON.parse(JSON.stringify(o)));

const traysOf = (pool) => {
    const t = (pool && pool.trays) || (Array.isArray(pool) ? pool : null);
    return Array.isArray(t) ? t : null;
};

/** Interned references -> their own copy of the shared object. Idempotent. */
function expandData(data) {
    if (!data || typeof data !== 'object') return data;
    const options = data._options || {};
    const services = data._services || {};
    if (!Object.keys(options).length && !Object.keys(services).length) return data;
    const deref = (table) => (entry) => {
        if (typeof entry !== 'string') return entry;
        const hit = table[entry];
        return hit ? copy(hit) : entry;
    };
    for (const key of Object.keys(data)) {
        if (key === '_options' || key === '_services') continue;
        const trays = traysOf(data[key]);
        if (!trays) continue;
        for (const t of trays) {
            if (!t || typeof t !== 'object') continue;
            if (Array.isArray(t.services)) t.services = t.services.map(deref(services));
            for (const g of t.mountingMaterials || []) {
                if (g && Array.isArray(g.options)) g.options = g.options.map(deref(options));
            }
        }
    }
    delete data._options;
    delete data._services;
    return data;
}

/**
 * The inverse: identical objects collapse into one shared entry. Mutates and returns
 * `data`. Idempotent — an entry that is already a key is left as it is.
 * Keys are assigned in first-encounter order, so re-running on unchanged data
 * produces a byte-identical file rather than a churned diff.
 */
function internData(data) {
    if (!data || typeof data !== 'object') return data;
    const options = new Map();   // serialized -> key
    const services = new Map();
    const ref = (table, prefix) => (entry) => {
        if (typeof entry === 'string') return entry;          // already interned
        if (!entry || typeof entry !== 'object') return entry;
        const s = JSON.stringify(entry);
        if (!table.has(s)) table.set(s, prefix + table.size);
        return table.get(s);
    };
    // Carry over any table already on the file so existing keys keep their meaning.
    for (const [k, v] of Object.entries(data._options || {})) options.set(JSON.stringify(v), k);
    for (const [k, v] of Object.entries(data._services || {})) services.set(JSON.stringify(v), k);

    for (const key of Object.keys(data)) {
        if (key === '_options' || key === '_services') continue;
        const trays = traysOf(data[key]);
        if (!trays) continue;
        for (const t of trays) {
            if (!t || typeof t !== 'object') continue;
            if (Array.isArray(t.services)) t.services = t.services.map(ref(services, 's'));
            for (const g of t.mountingMaterials || []) {
                if (g && Array.isArray(g.options)) g.options = g.options.map(ref(options, 'o'));
            }
        }
    }
    const table = (m) => {
        const out = {};
        for (const [s, k] of m) out[k] = JSON.parse(s);
        return out;
    };
    // Written first so a human opening the file meets the tables before the pools.
    const rest = { ...data };
    for (const k of Object.keys(data)) delete data[k];
    if (options.size) data._options = table(options);
    if (services.size) data._services = table(services);
    for (const [k, v] of Object.entries(rest)) {
        if (k !== '_options' && k !== '_services') data[k] = v;
    }
    return data;
}

function readData() {
    return expandData(JSON.parse(fs.readFileSync(DATA, 'utf8')));
}

/** Interns, backs up, writes at indent 2. Returns the backup path. */
function writeData(data, { backup = true } = {}) {
    internData(data);
    let bak = null;
    if (backup) {
        bak = `${DATA}.bak-${new Date().toISOString().replace(/[:.]/g, '-')}`;
        fs.copyFileSync(DATA, bak);
    }
    fs.writeFileSync(DATA, JSON.stringify(data, null, 2));   // MUST stay indent-2
    return bak;
}

module.exports = { DATA, readData, writeData, expandData, internData };
