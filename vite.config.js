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
const { internData } = createRequire(import.meta.url)('./st-scraper/_dataFile.cjs');

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
                                const out = JSON.stringify(internData(JSON.parse(body)), null, 2);
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
