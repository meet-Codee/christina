// Vercel function: /api/<action> → lib/core.js handle(). Max duration is set in vercel.json.
import { handle } from '../lib/core.js';

export default async function handler(req, res) {
  const action = String(req.query?.action || '').toLowerCase();
  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
  const out = await handle(action, body || {}, req.headers || {}, req.method);
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.setHeader('cache-control', 'no-store');
  res.status(out.status).send(JSON.stringify(out.body));
}
