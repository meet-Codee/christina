// Vercel function: /api/<action> → lib/core.js handle(). Max duration is set in vercel.json.
import { handle } from '../lib/core.js';

export default async function handler(req, res) {
  const action = String(req.query?.action || '').toLowerCase();
  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
  if (action === 'tutor-stream') {
    let headersSent = false;
    const out = await handle(action, body || {}, req.headers || {}, req.method, (evt) => {
      if (!headersSent) {
        headersSent = true;
        res.setHeader('content-type', 'text/event-stream; charset=utf-8');
        res.setHeader('cache-control', 'no-cache, no-store');
        res.setHeader('x-accel-buffering', 'no');
        res.status(200);
      }
      res.write(`data: ${JSON.stringify(evt)}\n\n`);
      res.flush?.();
    });
    if (!headersSent) {
      res.setHeader('content-type', 'application/json; charset=utf-8');
      res.setHeader('cache-control', 'no-store');
      return res.status(out.status).send(JSON.stringify(out.body));
    }
    return res.end();
  }
  const out = await handle(action, body || {}, req.headers || {}, req.method);
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.setHeader('cache-control', 'no-store');
  res.status(out.status).send(JSON.stringify(out.body));
}
