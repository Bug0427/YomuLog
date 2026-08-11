# MangaDex CORS Proxy — Deployment

`api/mangadex/[...path].ts` is a Vercel Edge Function that forwards requests to
`https://api.mangadex.org` with permissive CORS headers, unblocking every
MangaDex-backed feature in the YomuLog **web** app (Home rails, Search, chapter
feeds, at-home server lookups, connectivity pings). Native iOS/Android do not
need it (no CORS).

## How the client uses it

- `services/mangaDexProxy.ts` — `resolveMangaDexUrl(path)`:
  - **Web** + `EXPO_PUBLIC_MANGADEX_PROXY_URL` set → `${PROXY_URL}${path}`
  - Native, or web without the var → direct `https://api.mangadex.org` (unchanged)
- All `services/mangaAPI.ts` calls and the connectivity pings
  (`hooks/useNetworkStatus.ts`, `services/supabaseSyncService.ts`) use it.

## Deploy (Vercel — recommended)

1. **Push this repo** (or deploy the folder) to Vercel as a new project.
   - Vercel automatically detects `api/` as serverless functions.
   - You do NOT need the Expo app itself hosted here — a standalone proxy
     project with just this repo works; Vercel only runs `api/mangadex/[...path].ts`.
2. Or with the CLI:
   ```bash
   npm i -g vercel
   vercel --prod   # from the repo root; the api/ folder is picked up automatically
   ```
3. Note the deployed base URL, e.g. `https://yomulog-proxy.vercel.app/api/mangadex`.
4. Smoke test:
   ```bash
   curl -i "https://<your-host>/api/mangadex/manga?limit=1" -H "Origin: https://yomulog.ctonew.app"
   # Expect HTTP 200 + Access-Control-Allow-Origin: *
   curl -i -X OPTIONS "https://<your-host>/api/mangadex/manga" -H "Origin: https://yomulog.ctonew.app"
   # Expect HTTP 204 + CORS headers (preflight)
   ```

## Point the web app at it

Set in the **Expo web build environment** (the value is inlined at build time):

```
EXPO_PUBLIC_MANGADEX_PROXY_URL=https://<your-host>/api/mangadex
```

- Add it to the env where the web export/build runs (CI, `expo export`,
  the deploy pipeline for `https://yomulog.ctonew.app`).
- Add it to `.env` for local web dev (`npx expo start --web`).
- **Native builds**: leave it unset (or set — native ignores the proxy branch).
- When unset, everything behaves exactly as before (direct calls), so local
  dev and native still work with zero config.

## Supabase Edge Function variant
A ready-to-deploy Supabase Edge Function lives at
`supabase/functions/mangadex-proxy/index.ts`. It shares the same proxy core
(`services/proxyCore.ts`) as the Vercel handler — no logic is duplicated. The
only difference is the mount prefix: the function is mounted at
`/functions/v1/mangadex-proxy` instead of `/api/mangadex`.

Deploy with the Supabase CLI:

```bash
supabase functions deploy mangadex-proxy --project-ref <your-project>
```

Then set `EXPO_PUBLIC_MANGADEX_PROXY_URL=https://<project-ref>.supabase.co/functions/v1/mangadex-proxy`.

> CORS note for Supabase: the function URL is a different origin from the app,
> so the `Access-Control-Allow-Origin: *` header added by the handler is what
> makes the browser accept the response — no extra CORS config needed.
