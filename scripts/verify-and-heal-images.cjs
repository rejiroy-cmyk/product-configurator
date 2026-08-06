const fs = require('fs');
const https = require('https');
const path = require('path');

const HOST = 'profishop.sanitastroesch.ch';
const ORIGIN = 'https://' + HOST;
const CONC_HEAD = 5;
const CONC_API = 2;

const IGNORE_FILES = new Set(['package.json', 'package-lock.json']);
const sleep = ms => new Promise(r => setTimeout(r, ms));

function getFiles(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    for (const file of list) {
        const filePath = path.resolve(dir, file);
        const stat = fs.statSync(filePath);
        if (stat && stat.isDirectory()) {
            if (!file.includes('node_modules') && !file.includes('.git') && !file.includes('backups')) {
                results = results.concat(getFiles(filePath));
            }
        } else if (file.endsWith('.json') && !IGNORE_FILES.has(file)) {
            results.push(filePath);
        }
    }
    return results;
}

const digits = (a) => String(a).replace(/[^0-9]/g, '');

function checkHead(url, cookie) {
    return new Promise(r => {
        if (!url || typeof url !== 'string' || !url.startsWith('https://')) return r(0);
        const headers = {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
            ...(cookie ? { Cookie: cookie } : {})
        };
        https.request(url, { method: 'HEAD', headers, timeout: 5000 }, res => {
            r(res.statusCode);
            res.resume();
        }).on('error', () => r(0)).on('timeout', function() { this.destroy(); r(0); }).end();
    });
}

function primeCookie() {
    return new Promise(res => {
        https.get({ host: HOST, path: '/business/', headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' }, timeout: 15000 },
            r => {
                const sc = r.headers['set-cookie'];
                r.resume();
                res(sc ? sc.map(c => c.split(';')[0]).join('; ') : '');
            })
            .on('error', () => res(''))
            .on('timeout', function () { this.destroy(); res(''); });
    });
}

function getJson(pathname, cookie) {
    return new Promise(res => {
        const req = https.get({ host: HOST, path: pathname, timeout: 15000,
            headers: { 'Accept': 'application/json', 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36', ...(cookie ? { Cookie: cookie } : {}) } },
            r => {
                let d = '';
                r.on('data', c => d += c);
                r.on('end', () => {
                    let j = null;
                    try { j = JSON.parse(d); } catch (e) {}
                    res({ status: r.statusCode, json: j });
                });
            });
        req.on('error', () => res({ status: 0, json: null }));
        req.on('timeout', () => { req.destroy(); res({ status: 0, json: null }); });
    });
}

// Find all objects with imgUrl and artNr recursively
function findTargets(obj, targets, file) {
    if (!obj || typeof obj !== 'object') return;
    
    if (obj.imgUrl && typeof obj.imgUrl === 'string' && obj.imgUrl.includes('profishop') && obj.artNr) {
        if (obj.imgUrl.includes('_nV') || obj.imgUrl.includes('_100_000') || obj.imgUrl.includes('_000_000')) {
            targets.push({ obj, file });
        }
    }
    
    for (const key in obj) {
        if (Object.hasOwnProperty.call(obj, key)) {
            findTargets(obj[key], targets, file);
        }
    }
}

async function run() {
    const dir = path.resolve(__dirname, '../');
    console.log(`📂 Scanning directory: ${dir}`);
    const jsonFiles = getFiles(dir);
    console.log(`📄 Found ${jsonFiles.length} JSON files. Scanning for targets...`);
    
    let allTargets = [];
    const fileDataMap = new Map();
    
    for (const file of jsonFiles) {
        try {
            const content = fs.readFileSync(file, 'utf8');
            const data = JSON.parse(content);
            fileDataMap.set(file, data);
            findTargets(data, allTargets, file);
        } catch (e) {
            // Ignore parse errors or non-json contents
        }
    }
    
    console.log(`🎯 Found ${allTargets.length} products with imgUrl and artNr.`);
    
    console.log(`Starting Fast Validation...`);
    
    let brokenTargets = [];
    let checked = 0;
    
    // FAST VALIDATION (HEAD requests)
    async function headWorker() {
        while (allTargets.length > 0) {
            const target = allTargets.pop();
            await sleep(100 + Math.random() * 200); // Wait 100-300ms between requests to avoid WAF flags
            const status = await checkHead(target.obj.imgUrl);
            checked++;
            if (checked % 100 === 0) console.log(`⚡ Validated ${checked} URLs...`);
            
            // Error 15 from Imperva often comes back as a 403 or we might just see a socket close.
            if (status !== 200) {
                brokenTargets.push(target);
            }
        }
    }
    
    const headWorkers = Array.from({ length: CONC_HEAD }, headWorker);
    await Promise.all(headWorkers);
    
    console.log(`\n❌ Found ${brokenTargets.length} broken images. Starting Rescue Scrape...`);
    if (brokenTargets.length === 0) {
        console.log('✅ All images are already valid!');
        return;
    }
    
    let cookie = process.env.COOKIE;
    if (process.env.COOKIE_FILE) {
        try {
            cookie = fs.readFileSync(process.env.COOKIE_FILE, 'utf8').trim();
        } catch (err) {
            console.error(`🚨 ERROR: Could not read cookie file: ${process.env.COOKIE_FILE}`);
            process.exit(1);
        }
    }
    if (!cookie) cookie = await primeCookie();
    console.log(`🍪 Obtained Session Cookie, length: ${cookie.length}`);
    
    let healed = 0;
    let failed = 0;
    const modifiedFiles = new Set();
    
    let abortRescue = false;
    
    // RESCUE SCRAPE (API requests)
    async function apiWorker() {
        while (brokenTargets.length > 0 && !abortRescue) {
            const target = brokenTargets.pop();
            const artNr = digits(target.obj.artNr);
            if (artNr.length >= 7) {
                const { json } = await getJson(`/business(bD1kZSZjPTAwMQ==)/webservices/article.ws?event=GET_DETAILS&matnr=${artNr}&menge=1`, cookie);
                if (json && json.status === 'NOSESSION') {
                    abortRescue = true;
                    console.error('\n🚨 ERROR: The Profishop API requires a valid browser session cookie to fetch images, but the provided cookie was rejected (NOSESSION).');
                    console.error('👉 Please visit profishop.sanitastroesch.ch in your browser, copy your complete Cookie header from the Network tab, and run the script like this:');
                    console.error('COOKIE="your_cookie_string_here" npm run heal-images\n');
                    break;
                }
                if (json && json.result && json.result.image) {
                    const newUrl = ORIGIN + json.result.image;
                    target.obj.imgUrl = newUrl;
                    modifiedFiles.add(target.file);
                    healed++;
                    if (healed % 50 === 0) console.log(`🚑 Healed ${healed} images...`);
                } else {
                    failed++;
                }
            } else {
                failed++;
            }
        }
    }
    
    const apiWorkers = Array.from({ length: CONC_API }, apiWorker);
    await Promise.all(apiWorkers);
    
    if (abortRescue) {
        console.log(`💾 Saving ${modifiedFiles.size} files that were healed before the session aborted...`);
        for (const file of modifiedFiles) {
            fs.writeFileSync(file, JSON.stringify(fileDataMap.get(file), null, 2));
        }
        process.exit(1);
    }
    
    console.log(`\n🎉 Healing complete! Healed: ${healed}, Failed to find: ${failed}`);
    
    console.log(`💾 Saving ${modifiedFiles.size} modified files...`);
    for (const file of modifiedFiles) {
        fs.writeFileSync(file, JSON.stringify(fileDataMap.get(file), null, 2));
    }
    console.log('✅ Done!');
}

run();
