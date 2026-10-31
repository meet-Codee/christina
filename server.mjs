// server.mjs: Christina on your laptop. No dependencies: `node server.mjs`, then open http://localhost:3000
// Serves public/ and forwards /api/<action> to lib/core.js. keys.txt and .env are re-read on every API request.

import http from 'node:http';
import { readFile, stat, writeFile, access } from 'node:fs/promises';
import { readFileSync, existsSync } from 'node:fs';
import { join, normalize, extname, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { exec } from 'node:child_process';
import { handle } from './lib/core.js';

const ROOT = dirname(fileURLToPath(import.meta.url));
const PUBLIC = join(ROOT, 'public');
const MAX_BODY = 4.5 * 1024 * 1024;
const KEY_TEMPLATE = `# Christina keys. This file is gitignored: never commit or share it.
# Paste your free Gemini key after the = sign (get one at https://aistudio.google.com/apikey), save, then refresh the page.
GEMINI_API_KEY=
# Optional: Sarvam AI key for Indian-language voices (https://dashboard.sarvam.ai)
SARVAM_API_KEY=
# Optional: require a passcode before anyone can use your quota
# APP_PASSCODE=
`;

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.webmanifest': 'application/manifest+json',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.txt': 'text/plain; charset=utf-8',
};

// ── keys.txt / .env, re-read on every API request (so editing a key needs no restart) ──
const startEnv = new Set(Object.keys(process.env));
let fromFiles = new Set();

function parseEnvFile(path) {
  if (!existsSync(path)) return {};
  const out = {};
  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const m = /^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/.exec(line);
    if (!m || line.trim().startsWith('#')) continue;
    out[m[1]] = m[2].replace(/^(['"])(.*)\1$/, '$2');
  }
  return out;
}

function loadKeys() {
  const vars = { ...parseEnvFile(join(ROOT, '.env')), ...parseEnvFile(join(ROOT, 'keys.txt')) };
  const next = new Set();
  for (const [k, v] of Object.entries(vars)) {
    if (startEnv.has(k)) continue; // real environment variables win
    if (v) { process.env[k] = v; next.add(k); }
  }
  for (const k of fromFiles) if (!next.has(k)) delete process.env[k]; // a key removed from the file is forgotten
  fromFiles = next;
}

async function ensureKeysFile() {
  const p = join(ROOT, 'keys.txt');
  try { await access(p); } catch { await writeFile(p, KEY_TEMPLATE).catch(() => {}); }
}

// ── HTTP ──
function send(res, status, body, headers = {}) {
  res.writeHead(status, { 'x-content-type-options': 'nosniff', ...headers });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const tooBig = () => Object.assign(new Error('too large'), { code: 413 });
    if (Number(req.headers['content-length']) > MAX_BODY) { req.resume(); return reject(tooBig()); }
    let size = 0;
    const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size <= MAX_BODY) chunks.push(c); // past the limit, keep draining so the 413 can be sent
    });
    req.on('end', () => (size > MAX_BODY ? reject(tooBig()) : resolve(Buffer.concat(chunks).toString('utf8'))));
    req.on('error', reject);
  });
}

async function api(req, res, action) {
  loadKeys();
  let body = {};
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    try {
      const raw = await readBody(req);
      body = raw ? JSON.parse(raw) : {};
    } catch (e) {
      const big = e.code === 413;
      return send(res, big ? 413 : 400, JSON.stringify({ error: big ? 'That was too big to send. Try a shorter recording or a smaller photo.' : 'The request was not valid JSON.', code: big ? 'too_large' : 'bad_input' }), { 'content-type': MIME['.json'] });
    }
  }
  const out = await handle(action, body, req.headers, req.method);
  send(res, out.status, JSON.stringify(out.body), { 'content-type': MIME['.json'], 'cache-control': 'no-store' });
}

async function serveStatic(req, res, pathname) {
  let rel = decodeURIComponent(pathname);
  if (rel.endsWith('/')) rel += 'index.html';
  const file = normalize(join(PUBLIC, rel));
  if (!file.startsWith(PUBLIC)) return send(res, 403, 'Forbidden');
  try {
    const s = await stat(file);
    if (!s.isFile()) throw new Error('not a file');
    const ext = extname(file).toLowerCase();
    const data = await readFile(file);
    send(res, 200, req.method === 'HEAD' ? '' : data, {
      'content-type': MIME[ext] || 'application/octet-stream',
      'cache-control': 'no-cache',
      ...(ext === '.js' && rel === '/sw.js' ? { 'service-worker-allowed': '/' } : {}),
    });
  } catch {
    // Unknown paths fall back to the app (single page), except real-looking asset requests.
    if (extname(rel)) return send(res, 404, 'Not found', { 'content-type': MIME['.txt'] });
    const html = await readFile(join(PUBLIC, 'index.html'));
    send(res, 200, html, { 'content-type': MIME['.html'], 'cache-control': 'no-cache' });
  }
}

const server = http.createServer(async (req, res) => {
  try {
    const { pathname } = new URL(req.url, 'http://localhost');
    const m = /^\/api\/([a-z0-9-]+)\/?$/i.exec(pathname);
    if (m) return await api(req, res, m[1]);
    if (pathname.startsWith('/api/')) return send(res, 404, JSON.stringify({ error: 'Unknown action.', code: 'unknown_action' }), { 'content-type': MIME['.json'] });
    if (req.method !== 'GET' && req.method !== 'HEAD') return send(res, 405, 'Method not allowed');
    await serveStatic(req, res, pathname);
  } catch (e) {
    console.error('[christina] server error:', e?.message);
    if (!res.headersSent) send(res, 500, JSON.stringify({ error: 'Something went wrong on the server. Try again.', code: 'server' }), { 'content-type': MIME['.json'] });
  }
});

const HOST = process.env.HOST || '127.0.0.1';
const firstPort = Number(process.env.PORT) || 3000;

function listen(port, triesLeft) {
  server.once('error', (e) => {
    if (e.code === 'EADDRINUSE' && triesLeft > 0) {
      server.removeAllListeners('listening'); // discard the failed port's callback before retrying
      return listen(port + 1, triesLeft - 1);
    }
    console.error(`Could not start: ${e.message}`);
    process.exit(1);
  });
  server.listen(port, HOST, async () => {
    await ensureKeysFile();
    loadKeys();
    const url = `http://localhost:${port}`;
    const hasKey = !!(process.env.GEMINI_API_KEY || process.env.SARVAM_API_KEY);
    console.log(`\n  Christina is running → ${url}\n`);
    if (HOST === '0.0.0.0') console.log('  Also reachable from other devices on your Wi-Fi at this computer\'s IP address.');
    if (!hasKey) console.log('  No AI key yet: paste your Gemini key into keys.txt after GEMINI_API_KEY= and refresh the page.\n');
    if (process.argv.includes('--open')) {
      const cmd = process.platform === 'win32' ? `start "" "${url}"` : process.platform === 'darwin' ? `open "${url}"` : `xdg-open "${url}"`;
      exec(cmd, () => {});
    }
  });
}

listen(firstPort, firstPort === 3000 ? 10 : 0);
