import { defineConfig } from 'vite';
import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import { viteSingleFile } from 'vite-plugin-singlefile';

// Data is embedded as gzip+base64 (inflated at runtime via DecompressionStream) instead of
// raw JSON, so the shipped single-file build stays small and the catalog/prices are not
// casually readable in the file. This renames/obfuscates NOTHING — code is untouched.
const gzipB64 = (absPath) => zlib.gzipSync(fs.readFileSync(absPath), { level: 9 }).toString('base64');
let __isBuildMode = false;   // set by the bundled-data-gzip plugin's config hook

export default defineConfig({
    server: {
        port: 5175,
        strictPort: true
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
                            fs.writeFileSync(dataPath, body);
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
