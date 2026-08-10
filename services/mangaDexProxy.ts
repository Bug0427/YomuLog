// services/mangaDexProxy.ts
// Shared MangaDex URL resolution for the web CORS proxy.
//
// api.mangadex.org does not send Access-Control-Allow-Origin to the YomuLog
// web origin, so every MangaDex API call from the browser is CORS-blocked
// (while native iOS/Android are unaffected). The fix: a server-side proxy
// (see api/mangadex/[...path].ts) that forwards requests to api.mangadex.org
// with permissive CORS headers, and this resolver routes web API calls
// through it when EXPO_PUBLIC_MANGADEX_PROXY_URL is configured.
//
// Behavior:
//   - Web + EXPO_PUBLIC_MANGADEX_PROXY_URL set → `${proxyUrl}${path}`
//   - Native, or web without the var → direct https://api.mangadex.org
//
// Cover images (uploads.mangadex.org) already allow our origin and are NOT
// routed through the proxy (see COVER_BASE in mangaAPI.ts).

import { Platform } from 'react-native';

export const MANGADEX_API_BASE = 'https://api.mangadex.org';

/** The configured proxy origin (trailing slash stripped), or null when unset. */
export function getMangaDexProxyUrl(): string | null {
  const raw = process.env.EXPO_PUBLIC_MANGADEX_PROXY_URL;
  const trimmed = raw?.trim();
  if (!trimmed) return null;
  return trimmed.replace(/\/+$/, '');
}

/**
 * Resolve the effective URL for a MangaDex API path (e.g. `/manga/xyz?limit=20`).
 * On web with a proxy configured, appends the path to the proxy origin;
 * otherwise builds a direct api.mangadex.org URL.
 */
export function resolveMangaDexUrl(path: string): string {
  const proxy = getMangaDexProxyUrl();
  if (Platform.OS === 'web' && proxy) {
    return `${proxy}${path}`;
  }
  return `${MANGADEX_API_BASE}${path}`;
}
