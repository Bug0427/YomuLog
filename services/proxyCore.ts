// services/proxyCore.ts — shared MangaDex CORS proxy core (pure TS).
//
// Zero imports: runs unchanged in Node 22 (local harness), Vercel Edge, and
// Deno (Supabase Edge Functions) — all provide fetch/Request/Response/Headers.
//
// api.mangadex.org does not send Access-Control-Allow-Origin to the YomuLog
// web origin, so browser fetches are CORS-blocked (native apps are unaffected).
// handleProxyRequest forwards every request to https://api.mangadex.org —
// preserving method, path, query string, and safe headers (e.g. Authorization)
// — and returns the response with permissive CORS headers.
//
// Mounts:
//   - Vercel Edge:  api/mangadex/[...path].ts
//     → handleProxyRequest(req, '/api/mangadex')
//   - Supabase Edge: supabase/functions/mangadex-proxy/index.ts
//     → handleProxyRequest(req, '/functions/v1/mangadex-proxy')

export const MANGADEX_TARGET = 'https://api.mangadex.org';

/** Headers we forward to the upstream (keeps Authorization; drops hop-by-hop). */
export const FORWARD_HEADERS = [
  'authorization',
  'accept',
  'accept-language',
  'content-type',
  'user-agent',
] as const;

/** Permissive CORS headers returned on every response (incl. preflight). */
export function corsHeaders(): Headers {
  const headers = new Headers();
  headers.set('Access-Control-Allow-Origin', '*');
  headers.set('Access-Control-Allow-Methods', 'GET, HEAD, POST, PUT, PATCH, DELETE, OPTIONS');
  headers.set('Access-Control-Allow-Headers', 'Authorization, Content-Type, Accept, Accept-Language');
  headers.set('Access-Control-Max-Age', '86400');
  return headers;
}

/** Strip a mount prefix (e.g. "/api/mangadex") from the start of a pathname —
 * only at a segment boundary ("/api/mangadex/manga" → "/manga"; a sibling like
 * "/api/mangadex-other" is left untouched). */
function stripMountPrefix(pathname: string, mountPrefix: string): string {
  if (!mountPrefix || !pathname.startsWith(mountPrefix)) return pathname;
  const rest = pathname.slice(mountPrefix.length);
  if (rest === '' || rest.startsWith('/')) return rest;
  return pathname;
}

/**
 * Forward a request to MangaDex, stripping `mountPrefix` from the path.
 * - OPTIONS preflight → 204 + CORS headers, no upstream call.
 * - Path = url.pathname minus mountPrefix; query string preserved.
 * - Only FORWARD_HEADERS are proxied; User-Agent is overridden to YomuLog's.
 * - GET/HEAD send no body.
 * - Upstream status/statusText/headers are echoed with CORS merged on top.
 */
export async function handleProxyRequest(req: Request, mountPrefix: string): Promise<Response> {
  // CORS preflight — answer immediately with permissive headers.
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }

  const url = new URL(req.url);
  const path = stripMountPrefix(url.pathname, mountPrefix);
  const targetUrl = `${MANGADEX_TARGET}${path}${url.search}`;

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
