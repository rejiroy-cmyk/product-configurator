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
 * For the same reason `writeData` SEEDS the interning keys from the file it is about to
 * replace — see `internData` — so an untouched option keeps its `o412` and a four-tray
 * edit reads as a four-tray diff instead of a renumbered whole file.
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

/** `o412` -> 412; anything that is not `<prefix><digits>` -> null. */
const keyIndex = (prefix, k) =>
    typeof k === 'string' && k.startsWith(prefix) && /^\d+$/.test(k.slice(prefix.length))
        ? Number(k.slice(prefix.length))
        : null;

/**
 * Hands out interning keys for ONE table, seeded from the tables it is given.
 *
 * `tables` are consulted in order and the first one wins, so a table still sitting on
 * `data` (a file that was never expanded) outranks the seed read off disk.
 * Only what the data actually references is emitted — a seeded entry nobody uses drops
 * out rather than accumulating forever.
 */
function interner(prefix, ...tables) {
    const byJson = new Map();    // serialized -> the key it already holds
    const byKey = new Map();     // key -> serialized, so a pass-through reference keeps its definition
    let highest = -1;
    for (const t of tables) {
        if (!t || typeof t !== 'object') continue;
        for (const [k, v] of Object.entries(t)) {
            const s = JSON.stringify(v);
            if (!byJson.has(s)) byJson.set(s, k);
            if (!byKey.has(k)) byKey.set(k, s);
            const n = keyIndex(prefix, k);
            if (n !== null && n > highest) highest = n;
        }
    }
    const out = new Map();       // key -> serialized; ONLY what this file still uses
    const assigned = new Map();  // serialized -> key
    let next = highest + 1;      // new entries land above every key the seed knows

    const ref = (entry) => {
        if (typeof entry === 'string') {                 // already interned
            const def = byKey.get(entry);
            if (def !== undefined && !out.has(entry)) out.set(entry, def);
            return entry;                                // unknown key: leave it, never invent one
        }
        if (!entry || typeof entry !== 'object') return entry;
        const s = JSON.stringify(entry);
        let k = assigned.get(s);
        if (k === undefined) {
            k = byJson.get(s);
            // Two seed tables can disagree about one key; mint rather than clobber.
            if (k === undefined || (out.has(k) && out.get(k) !== s)) k = prefix + (next++);
            assigned.set(s, k);
        }
        out.set(k, s);
        return k;
    };
    // Emitted in KEY order, not first-encounter order: reordering the file's pools must
    // not reshuffle the table underneath them.
    const table = () => {
        const keys = [...out.keys()].sort((a, b) => {
            const na = keyIndex(prefix, a), nb = keyIndex(prefix, b);
            if (na !== null && nb !== null) return na - nb;
            if (na !== null) return -1;
            if (nb !== null) return 1;
            return a < b ? -1 : a > b ? 1 : 0;
        });
        const o = {};
        for (const k of keys) o[k] = JSON.parse(out.get(k));
        return o;
    };
    return { ref, table, get size() { return out.size; } };
}

/**
 * The inverse: identical objects collapse into one shared entry. Mutates and returns
 * `data`. Idempotent — an entry that is already a key is left as it is.
 *
 * KEY STABILITY IS THE POINT, and it is why `opts.seed` exists. Keys used to be handed
 * out in first-encounter order on every write, so deleting one option that happened to
 * sit low in the table renumbered every key above it: a four-tray edit came back as a
 * ~24,000-line diff with 752 of 1,893 keys silently changing meaning. Seeded from the
 * table already on disk, an option nobody touched keeps the key it had and the diff is
 * the size of the edit. `writeData` supplies the seed (see `diskTables`); a caller
 * interning data that is not on disk at all can pass its own, or none.
 *
 * The rules, once seeded:
 *   · an object byte-identical to a seeded one takes that seeded key
 *   · anything new takes a fresh key above the highest the seed knows
 *   · a seeded key whose option no longer appears anywhere simply drops out
 *   · a string reference is passed through and its definition carried along, so a
 *     half-interned file survives the round trip
 */
function internData(data, { seed } = {}) {
    if (!data || typeof data !== 'object') return data;
    const options = interner('o', data._options, seed && seed._options);
    const services = interner('s', data._services, seed && seed._services);

    for (const key of Object.keys(data)) {
        if (key === '_options' || key === '_services') continue;
        const trays = traysOf(data[key]);
        if (!trays) continue;
        for (const t of trays) {
            if (!t || typeof t !== 'object') continue;
            if (Array.isArray(t.services)) t.services = t.services.map(services.ref);
            for (const g of t.mountingMaterials || []) {
                if (g && Array.isArray(g.options)) g.options = g.options.map(options.ref);
            }
        }
    }
    // Written first so a human opening the file meets the tables before the pools.
    const rest = { ...data };
    for (const k of Object.keys(data)) delete data[k];
    if (options.size) data._options = options.table();
    if (services.size) data._services = services.table();
    for (const [k, v] of Object.entries(rest)) {
        if (k !== '_options' && k !== '_services') data[k] = v;
    }
    return data;
}

/**
 * The `_options` / `_services` tables as they stand in the file right now — the seed
 * that keeps keys stable across a read -> mutate -> write cycle. Read from disk rather
 * than remembered from `readData`, because `expandData` strips the tables off `data`
 * (deliberately: it is what keeps it in step with the ESM twin) and because the admin
 * panel's /api/save posts data this process never read.
 */
function diskTables() {
    try {
        const d = JSON.parse(fs.readFileSync(DATA, 'utf8'));
        return { _options: d._options || {}, _services: d._services || {} };
    } catch (e) {
        // No file yet is normal; anything else means keys are about to be reassigned,
        // which is a whole-file diff — say so rather than let it pass as a real change.
        if (e.code !== 'ENOENT') {
            console.warn(`[_dataFile] could not read the key table from ${path.basename(DATA)} (${e.message}) — keys will be reassigned.`);
        }
        return { _options: {}, _services: {} };
    }
}

function readData() {
    return expandData(JSON.parse(fs.readFileSync(DATA, 'utf8')));
}

/**
 * Interns, backs up, writes at indent 2. Returns the backup path.
 * The seed is read off the file being replaced, so an option this edit did not touch
 * keeps its key and the diff stays the size of the edit.
 */
function writeData(data, { backup = true, seed = diskTables() } = {}) {
    internData(data, { seed });
    let bak = null;
    if (backup) {
        bak = `${DATA}.bak-${new Date().toISOString().replace(/[:.]/g, '-')}`;
        fs.copyFileSync(DATA, bak);
    }
    fs.writeFileSync(DATA, JSON.stringify(data, null, 2));   // MUST stay indent-2
    return bak;
}

module.exports = { DATA, readData, writeData, expandData, internData, diskTables };
