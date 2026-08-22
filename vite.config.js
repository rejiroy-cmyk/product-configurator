import { defineConfig } from 'vite';
import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { createRequire } from 'module';

// custom-data.json is stored INTERNED (see modules/dataHydrate.js): repeated
// mountingMaterials options and services live once in a shared table. /api/data serves
// the file as it is and the client expands it; /api/save has to intern again, or the
// admin panel posting its expanded in-memory copy would undo ~20 MB of it on first save.
const { internData, diskTables } = createRequire(import.meta.url)('./st-scraper/_dataFile.cjs');

// Data is embedded as gzip+base64 (inflated at runtime via DecompressionStream) instead of
// raw JSON, so the shipped single-file build stays small and the catalog/prices are not
// casually readable in the file. This renames/obfuscates NOTHING — code is untouched.
const gzipB64 = (absPath) => zlib.gzipSync(fs.readFileSync(absPath), { level: 9 }).toString('base64');
let __isBuildMode = false;   // set by the bundled-data-gzip plugin's config hook

export default defineConfig({
    // `host: true` binds 0.0.0.0 instead of localhost, so a phone/tablet on the same Wi-Fi
    // can reach the dev server at http://<this-machine-LAN-IP>:5175. Without it Vite prints
    // "Network: use --host to expose" and only ever answers on the machine running it.
    server: {
        port: 5175,
        strictPort: true,
        host: true
    },
    // Same for `npm run preview`, which serves the real single-file build from dist/ —
    // that's the honest way to test the shipped artifact on a phone.
    preview: {
        port: 4175,
        strictPort: true,
        host: true
    },
    plugins: [
        viteSingleFile(),
        {
            // The catalogue moves weekly. The scheduled LaunchAgent is the primary
            // reminder, but it needs Full Disk Access to reach a repo on ~/Desktop and
            // silently does nothing without it — so the dev server, which runs in a
            // terminal that HAS access, says so too. Belt and braces, zero permissions.
            name: 'catalog-staleness-notice',
            apply: 'serve',
            configureServer() {
                try {
                    const dir = path.resolve('st-scraper/census');
                    const files = fs.existsSync(dir)
                        ? fs.readdirSync(dir).filter(f => /^\d{4}-\d{2}-\d{2}\.json(\.gz)?$/.test(f)).sort()
                        : [];
                    const newest = files[files.length - 1];
                    const days = newest
                        ? Math.floor((Date.now() - Date.parse(newest.slice(0, 10))) / 86400000)
                        : Infinity;
                    if (days <= 8) return;
                    const age = newest ? `${days} Tage alt (${newest.slice(0, 10)})` : 'nie erstellt';
                    console.log('\n\x1b[33m┌─────────────────────────────────────────────────────────────┐');
                    console.log(`│ Katalog-Zensus ist ${age.padEnd(41)}│`);
                    console.log('│ Nicht-mehr-lieferbar-Liste und Preise könnten veraltet sein.│');
                    console.log('│   bash scripts/weekly-catalog-check.sh                      │');
                    console.log('└─────────────────────────────────────────────────────────────┘\x1b[0m\n');
                } catch (e) { /* a notice must never stop the dev server */ }
            },
        },
        {
            // Provides the embedded data as gzip+base64 virtual modules.
            // - custom-data: only bundled for the static BUILD (the dev server serves fresh
            //   data via /api/data, so dev returns an empty blob and skips this fallback).
            // - prices: always bundled (dev + build); it's small and has no /api endpoint.
            name: 'bundled-data-gzip',
            config(_, { command }) { __isBuildMode = command === 'build'; },
            resolveId(id) {
                if (id === 'virtual:bundled-data-gz' || id === 'virtual:bundled-prices-gz') return '\0' + id;
            },
            load(id) {
                if (id === '\0virtual:bundled-data-gz') {
                    const b64 = __isBuildMode ? gzipB64(path.join(__dirname, 'custom-data.json')) : '';
                    return `export default ${JSON.stringify(b64)};`;
                }
                if (id === '\0virtual:bundled-prices-gz') {
                    return `export default ${JSON.stringify(gzipB64(path.join(__dirname, 'prices.json')))};`;
                }
            }
        },
        {
            name: 'local-api',
            configureServer(server) {
                server.middlewares.use((req, res, next) => {
                    const url = req.url.split('?')[0]; // Ignore query params
                    
                    if (url === '/api/data' && req.method === 'GET') {
                        const dataPath = path.join(__dirname, 'custom-data.json');
                        if (fs.existsSync(dataPath)) {
                            res.setHeader('Content-Type', 'application/json');
                            res.end(fs.readFileSync(dataPath));
                        } else {
                            res.setHeader('Content-Type', 'application/json');
                            res.end(JSON.stringify({}));
                        }
                        return;
                    }

                    if (url === '/api/save' && req.method === 'POST') {
                        let body = '';
                        req.on('data', chunk => {
                            body += chunk.toString();
                        });
                        req.on('end', () => {
                            console.log('[VITE] /api/save called. Body length received:', body.length);
                            const dataPath = path.join(__dirname, 'custom-data.json');
                            try {
                                // Re-intern whatever the client posted, and keep indent 2:
                                // minified, every future edit is a one-line whole-file diff.
                                // Seeded from the file on disk, or an admin edit to one tray
                                // renumbers the whole option table underneath it.
                                const out = JSON.stringify(internData(JSON.parse(body), { seed: diskTables() }), null, 2);
                                fs.writeFileSync(dataPath, out);
                                console.log(`[VITE] /api/save wrote ${(out.length / 1048576).toFixed(2)} MB (interned).`);
                            } catch (e) {
                                // Unparseable body: write it through rather than lose the edit,
                                // and say so — a silently dropped save is worse than a big file.
                                console.warn('[VITE] /api/save could not intern, writing raw:', e.message);
                                fs.writeFileSync(dataPath, body);
                            }
                            res.setHeader('Content-Type', 'application/json');
                            res.end(JSON.stringify({ success: true }));
                        });
                        return;
                    }
                    next();
                });
            }
        }
    ]
});
