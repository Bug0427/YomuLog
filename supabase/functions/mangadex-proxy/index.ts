// supabase/functions/mangadex-proxy/index.ts — Supabase Edge Function:
// MangaDex API CORS proxy (Deno entry point).
//
// Shares the proxy core with the Vercel variant (services/proxyCore.ts — the
// import below requires the explicit ".ts" extension, as Deno mandates).
// The function is mounted at /functions/v1/mangadex-proxy, so that is the
// mount prefix stripped from the path before forwarding (Vercel uses
// /api/mangadex instead).
//
// Deploy:
//   supabase functions deploy mangadex-proxy --project-ref <your-project>
// Then set EXPO_PUBLIC_MANGADEX_PROXY_URL=
// https://<project-ref>.supabase.co/functions/v1/mangadex-proxy
// in the Expo web build env (see api/mangadex/README.md).
//
// CORS note: the function URL is a different origin from the app, so the
// Access-Control-Allow-Origin: * header added by the core is what makes the
// browser accept the response — no extra CORS config needed.

import { handleProxyRequest } from '../../../services/proxyCore.ts';

// Minimal type for the Deno global (tsc has no Deno types; the declaration is
// type-only and erased at runtime, where the real Deno global exists).
declare const Deno: {
  serve(handler: (req: Request) => Response | Promise<Response>): void;
};

Deno.serve((req: Request) => handleProxyRequest(req, '/functions/v1/mangadex-proxy'));
