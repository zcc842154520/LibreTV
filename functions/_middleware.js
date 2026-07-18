import { sha256 } from '../js/sha256.js';

// Cloudflare Pages Middleware: inject env vars + force no-cache on all responses
export async function onRequest(context) {
  const { request, env, next } = context;
  const response = await next();
  const contentType = response.headers.get('content-type') || '';

  // Clone headers and force no-cache on ALL responses
  const newHeaders = new Headers(response.headers);
  newHeaders.set('Cache-Control', 'no-cache, no-store, must-revalidate, max-age=0');
  newHeaders.set('Pragma', 'no-cache');
  newHeaders.set('Expires', '0');

  if (contentType.includes('text/html')) {
    let html = await response.text();
    const password = env.PASSWORD || '';
    let passwordHash = '';
    if (password) {
      passwordHash = await sha256(password);
    }
    html = html.replace('window.__ENV__.PASSWORD = "{{PASSWORD}}";',
                        window.__ENV__.PASSWORD = "";);
    return new Response(html, {
      headers: newHeaders,
      status: response.status,
      statusText: response.statusText,
    });
  }

  return new Response(response.body, {
    headers: newHeaders,
    status: response.status,
    statusText: response.statusText,
  });
}
