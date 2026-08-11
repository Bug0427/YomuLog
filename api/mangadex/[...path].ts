// api/mangadex/[...path].ts — Vercel Edge Function: MangaDex API CORS proxy.
//
// Thin entry point: all logic lives in services/proxyCore.ts (shared with the
// Supabase Edge Function variant — see supabase/functions/mangadex-proxy/).
//
// Deployed URL shape: https://<your-host>/api/mangadex/<original-path>
// e.g. https://yomulog-proxy.vercel.app/api/mangadex/manga?limit=20
//
// Set EXPO_PUBLIC_MANGADEX_PROXY_URL=https://<your-host>/api/mangadex in the
// Expo web build env so the client routes through it (services/mangaDexProxy.ts).
//
// See README.md in this directory for deployment (Vercel + Supabase Edge variant).

import { handleProxyRequest } from '../../services/proxyCore';

export const config = { runtime: 'edge' };

export default async function handler(req: Request): Promise<Response> {
  return handleProxyRequest(req, '/api/mangadex');
}
