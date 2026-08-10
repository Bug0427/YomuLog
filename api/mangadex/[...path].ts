// api/mangadex/[...path].ts — Vercel Edge Function: MangaDex API CORS proxy.
//
// api.mangadex.org does not send Access-Control-Allow-Origin to the YomuLog
// web origin, so browser fetches are CORS-blocked (native apps are unaffected).
// This function forwards every request to https://api.mangadex.org — preserving
// method, path, query string, and safe headers (e.g. Authorization) — and
// returns the response with permissive CORS headers.
//
// Deployed URL shape: https://<your-host>/api/mangadex/<original-path>
// e.g. https://yomulog-proxy.vercel.app/api/mangadex/manga?limit=20
//
// Set EXPO_PUBLIC_MANGADEX_PROXY_URL=https://<your-host>/api/mangadex in the
// Expo web build env so the client routes through it (services/mangaDexProxy.ts).
//
// See README.md in this directory for deployment (Vercel + Supabase Edge variant).

export const config = { runtime: 'edge' };

const TARGET = 'https://api.mangadex.org';

/** Headers we forward to the upstream (keeps Authorization; drops hop-by-hop). */
const FORWARD_HEADERS = [
  'authorization',
  'accept',
  'accept-language',
  'content-type',
  'user-agent',
] as const;

function corsHeaders(): Headers {
  const headers = new Headers();
  headers.set('Access-Control-Allow-Origin', '*');
  headers.set('Access-Control-Allow-Methods', 'GET, HEAD, POST, PUT, PATCH, DELETE, OPTIONS');
  headers.set('Access-Control-Allow-Headers', 'Authorization, Content-Type, Accept, Accept-Language');
  headers.set('Access-Control-Max-Age', '86400');
  return headers;
}

export default async function handler(req: Request): Promise<Response> {
  // CORS preflight — answer immediately with permissive headers.
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }

  const url = new URL(req.url);
  // Strip the function's mount prefix (/api/mangadex) — the catch-all path
  // arrives in url.pathname; keep the original query string.
  const path = url.pathname.replace(/^\/api\/mangadex/, '');
  const targetUrl = `${TARGET}${path}${url.search}`;

  // Forward only the whitelisted, safe headers.
  const proxyHeaders = new Headers();
  for (const name of FORWARD_HEADERS) {
    const value = req.headers.get(name);
    if (value) proxyHeaders.set(name, value);
  }
  proxyHeaders.set('User-Agent', 'YomuLog/1.0 (+https://yomulog.ctonew.app)');

  const upstream = await fetch(targetUrl, {
    method: req.method,
    headers: proxyHeaders,
    body: ['GET', 'HEAD'].includes(req.method) ? undefined : req.body,
  });

  const responseHeaders = new Headers(upstream.headers);
  for (const [key, value] of corsHeaders().entries()) {
    responseHeaders.set(key, value);
  }

  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: responseHeaders,
  });
}
