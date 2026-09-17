#!/usr/bin/env node
// e2e-proxy-harness.mjs — local MangaDex CORS proxy harness (E2E STEP 1).
//
// Serves the REAL shared proxy core (services/proxyCore.ts) from this box so a
// web export built with EXPO_PUBLIC_MANGADEX_PROXY_URL=http://localhost:<port>/api/mangadex
// exercises the app's genuine discovery/search/filter/reader data path against
// the live MangaDex API — no deployed Vercel/Supabase proxy required.
//
// Why Node can do this: Node >= 22 provides global fetch/Request/Response, and
// proxies core's only dependency. proxyCore.ts is zero-import pure TS, so it
// loads under `node --experimental-strip-types` unchanged.
//
// Run (from the repo root):
//   node --experimental-strip-types scripts/e2e-proxy-harness.mjs [port]
//   # default port 8091 — the value QA should bake into their export:
//   # EXPO_PUBLIC_MANGADEX_PROXY_URL=http://localhost:8091/api/mangadex
//
// On start it self-checks the two things the real deployment must get right:
//   1. OPTIONS preflight  -> 204 + Access-Control-Allow-Origin: *   (no upstream call)
//   2. GET upstream       -> 200 + CORS headers + MangaDex JSON     (live api.mangadex.org)
// and prints PASS/FAIL for each. Ctrl-C (SIGINT) stops the server.
//
// Honest coverage boundary (repeat in every report that uses this harness):
//   PROVES:   app data path + shared proxy core + MangaDex API, end to end.
//   NOT PROVES: that a *deployed* Vercel/Supabase proxy is reachable — host,
//   DNS, TLS and edge config stay unverified until the owner deploys B-1.
//   "Local proxy green" is NOT "B-1 deployed".

import http from 'node:http';
import { Readable } from 'node:stream';

const MOUNT = '/api/mangadex';
const PORT = Number(process.argv[2] || 8091);

const { handleProxyRequest } = await import(
  new URL('../services/proxyCore.ts', import.meta.url).href
);

function log(...args) {
  console.log(`[proxy-harness]`, ...args);
}

/** Node IncomingMessage -> web Request (method/url/headers/body). */
function toWebRequest(req, bodyBuffer, originBase) {
  const headers = new Headers();
  for (const [k, v] of Object.entries(req.headers)) {
    if (v === undefined) continue;
    if (Array.isArray(v)) for (const item of v) headers.append(k, item);
    else headers.set(k, v);
  }
  const init = { method: req.method, headers };
  // GET/HEAD/OPTIONS carry no body; strip any content-length-vs-body mismatch.
  if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method) && bodyBuffer.length > 0) {
    init.body = bodyBuffer;
  } else {
    headers.delete('content-length');
  }
  return new Request(`${originBase}${req.url}`, init);
}

/** web Response -> Node ServerResponse. */
async function writeNodeResponse(res, response) {
  const headers = Object.fromEntries(response.headers.entries());
  // Node rejects an empty-string statusMessage? It is fine — omit it.
  res.writeHead(response.status, headers);
  if (response.body) {
    Readable.fromWeb(response.body).pipe(res);
  } else {
    res.end();
  }
}

async function selfCheck(originBase) {
  let preflightOk = false;
  let upstreamOk = false;
  try {
    const preflight = await fetch(`${originBase}${MOUNT}/manga?limit=1`, { method: 'OPTIONS' });
    const acao = preflight.headers.get('access-control-allow-origin');
    preflightOk = preflight.status === 204 && acao === '*';
    log(`OPTIONS preflight  -> ${preflight.status} ACAO=${acao || '(none)'} : ${preflightOk ? 'PASS' : 'FAIL'}`);
  } catch (e) {
    log(`OPTIONS preflight  -> ERROR ${e.message} : FAIL`);
  }
  try {
    const upstream = await fetch(`${originBase}${MOUNT}/manga?limit=1`);
    const json = await upstream.json().catch(() => null);
    const acao = upstream.headers.get('access-control-allow-origin');
    const hasData = Array.isArray(json?.data) && json.data.length > 0;
    upstreamOk = upstream.status === 200 && acao === '*' && hasData;
    log(`GET /manga?limit=1 -> ${upstream.status} ACAO=${acao || '(none)'} items=${json?.data?.length ?? 'n/a'} : ${upstreamOk ? 'PASS' : 'FAIL'}`);
  } catch (e) {
    log(`GET /manga?limit=1 -> ERROR ${e.message} : FAIL`);
  }
  return { preflightOk, upstreamOk };
}

const server = http.createServer(async (req, res) => {
  const startedAt = Date.now();
  const originBase = `http://localhost:${PORT}`;
  try {
    const chunks = [];
    for await (const c of req) chunks.push(c);
    const body = Buffer.concat(chunks);
    const webReq = toWebRequest(req, body, originBase);
    const webRes = await handleProxyRequest(webReq, MOUNT);
    await writeNodeResponse(res, webRes);
    log(`${req.method} ${req.url} -> ${webRes.status} (${Date.now() - startedAt} ms)`);
  } catch (e) {
    log(`ERROR handling ${req.method} ${req.url}: ${e.message}`);
    res.writeHead(500, { 'content-type': 'text/plain' });
    res.end(`proxy harness error: ${e.message}`);
  }
});

server.listen(PORT, () => {
  log(`listening on http://localhost:${PORT}  (mount ${MOUNT})`);
  log(``);
  log(`For QA — export the web build with:`);
  log(`  EXPO_PUBLIC_MANGADEX_PROXY_URL=http://localhost:${PORT}/api/mangadex npx expo export -p web`);
  log(`Stop this server with Ctrl-C.`);
  log(``);
  selfCheck(`http://localhost:${PORT}`).then(({ preflightOk, upstreamOk }) => {
    log(`self-check: preflight ${preflightOk ? 'PASS' : 'FAIL'} · upstream ${upstreamOk ? 'PASS' : 'FAIL'}`);
    if (preflightOk && upstreamOk) {
      log(`READY — local proxy proves app + proxy core + MangaDex end-to-end.`);
      log(`BOUNDARY — this does NOT prove a deployed Vercel/Supabase proxy is reachable.`);
    } else {
      log(`SELF-CHECK FAILED — see lines above (MangaDex unreachable from this box, or CORS headers wrong).`);
    }
  });
});

server.on('error', (e) => {
  if (e.code === 'EADDRINUSE') {
    log(`port ${PORT} already in use — pick another:  node scripts/e2e-proxy-harness.mjs <port>`);
  } else {
    log(`server error: ${e.message}`);
  }
  process.exit(1);
});

process.on('SIGINT', () => {
  log('stopping.');
  server.close(() => process.exit(0));
});