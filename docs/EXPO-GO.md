# Running YomuLog in Expo Go (quick-start)

YomuLog is an Expo (SDK 54) React Native app. The fastest way to run it on a
physical device is the **Expo Go** app. This guide covers the dev-server flow
(`npx expo start`) that Expo Go connects to.

> Verified 2026-08-11: the SDK 54 dev server serves a valid manifest and a
> bundle for both iOS and Android (`expo/AppEntry.js` → `App`, 0 missing-module
> errors). If you hit "Expo Go won't load the application", follow the steps
> below — the usual causes are an SDK mismatch or the app running with no
> configured services (see "What runs without env vars" at the bottom).

## Prerequisites

- **Node.js** (LTS, e.g. 20/22)
- **Expo Go** app installed on your phone:
  - iOS: App Store → "Expo Go"
  - Android: Google Play → "Expo Go"
  - Use a version that matches **SDK 54** (the app's `expo` dependency version).
- Phone and computer on the **same Wi-Fi network** (for the default LAN mode).

## Quick start

```bash
git clone https://github.com/Bug0427/YomuLog.git
cd YomuLog
npm install              # installs dependencies (incl. Expo SDK 54)
npx expo start           # starts the dev server + Metro bundler
```

`npx expo start` prints a QR code and a list of options:

- **Scan the QR code** with your phone's camera (iOS) or the Expo Go app
  (Android). Expo Go opens YomuLog and connects to the dev server.
- Press **`a`** to open on an Android emulator, **`i`** for the iOS simulator.

### On a different network / physical device off-LAN

If the phone is not on the same Wi-Fi (or the LAN connection times out), start
the server in tunnel mode so Expo Go connects through an Expo-managed tunnel:

```bash
npx expo start --tunnel
```

Tunnel mode needs an Expo account login (`npx expo login`) the first time. The
QR code then points at the tunnel URL instead of your LAN address.

## What to expect on first load

1. The dev server bundles the app on demand — the first load takes ~30–60 s
   (Metro compiles `expo/AppEntry.js` → `App`). Subsequent loads are cached.
2. The app boots to the splash screen and then the onboarding/home flow.
3. Console logs from your device appear in the terminal where `expo start`
   is running.

## What runs without env vars (local-only mode)

YomuLog is **local-only by design** when no service keys are configured. Copy
`.env.example` to `.env` and fill in what you have:

- **No `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_ANON_KEY`** → auth,
  Premium entitlement, and Cloud Sync stay off; the app works fully offline
  with local tracking (WebMockDB + AsyncStorage). Accounts created in-app are
  local-only.
- **No `EXPO_PUBLIC_MANGADEX_PROXY_URL`** → MangaDex-powered discovery/search
  content is unavailable from the browser (CORS), but the reader and
  downloadable content work on native (no browser CORS on native builds).

Set the keys **before** starting the dev server, and restart it afterwards
(`Ctrl+C`, then `npx expo start` again) — Metro's transform cache does not pick
up env changes on a running server.

## Troubleshooting

| Symptom | Fix |
|---|---|
| Expo Go shows "Something went wrong" / won't load | Confirm your Expo Go supports **SDK 54**; update Expo Go. |
| Bundling takes forever / hangs | First bundle is slow (30–60 s); wait. If it never finishes, `Ctrl+C` and run `npx expo start --clear` (clears the Metro cache). |
| Device can't reach the dev server | Same Wi-Fi? Try `npx expo start --tunnel`. |
| App loads but data is missing | Local-only mode — see "What runs without env vars". |
| Port 8081 already in use | `npx expo start --port 8082` (Expo Go will use the port in the QR URL). |

## Notes

- `npm install` may need `--legacy-peer-deps` on some Node versions due to
  pinned Expo/React Native dependency ranges.
- The dev server is for development. Production builds use `expo export`
  (see the repo's build scripts) — Expo Go is not a distribution channel.
