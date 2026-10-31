// Netlify function: /api/:action → lib/core.js handle().
import { handle } from '../../lib/core.js';

export default async (req, context) => {
  const action = String(context?.params?.action || new URL(req.url).pathname.split('/').filter(Boolean).pop() || '').toLowerCase();
  let body = {};
  if (req.method !== 'GET' && req.method !== 'HEAD') body = await req.json().catch(() => ({}));
  if (action === 'tutor-stream') {
    const enc = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        await handle(action, body, Object.fromEntries(req.headers), req.method, (evt) => {
          controller.enqueue(enc.encode(`data: ${JSON.stringify(evt)}\n\n`));
        });
        controller.close();
      },
    });
    return new Response(stream, {
      status: 200,
      headers: { 'content-type': 'text/event-stream; charset=utf-8', 'cache-control': 'no-cache, no-store' },
    });
  }
  const out = await handle(action, body, Object.fromEntries(req.headers), req.method);
  return new Response(JSON.stringify(out.body), {
    status: out.status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });
};

export const config = { path: '/api/:action' };
