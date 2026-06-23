import { defineConfig } from 'vite';
import fs from 'fs';
import path from 'path';
import { viteSingleFile } from 'vite-plugin-singlefile';

export default defineConfig({
    server: {
        port: 5175,
        strictPort: true
    },
    plugins: [
        viteSingleFile(),
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
