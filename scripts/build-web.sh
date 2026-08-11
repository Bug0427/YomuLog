#!/usr/bin/env bash
# scripts/build-web.sh — build the YomuLog web bundle (optional MangaDex proxy).
#
# Usage:
#   ./scripts/build-web.sh [OUT_DIR]
#
# OUT_DIR defaults to ./dist-web (relative to the repo root; the script is
# workspace-agnostic — it resolves its own repo root and never hardcodes paths).
#
# MangaDex CORS proxy (web only — see api/mangadex/README.md):
#   The proxy origin is inlined at build time via EXPO_PUBLIC_MANGADEX_PROXY_URL.
#   Provide it either as an environment variable:
#     EXPO_PUBLIC_MANGADEX_PROXY_URL=https://<host>/api/mangadex ./scripts/build-web.sh
#   or via a local .env.web.proxy file in the repo root:
#     # .env.web.proxy
#     EXPO_PUBLIC_MANGADEX_PROXY_URL=https://<host>/api/mangadex
#   Env var wins over the file. If neither is present the export runs exactly
#   like a plain `expo export --platform web` (proxy branch off — direct
#   https://api.mangadex.org calls, matching current live behavior).
#
# Behavior:
#   - Fails loudly (set -euo pipefail) if the export or verification fails.
#   - Prints the exported AppEntry-*.js bundle SHA-256 + size at the end.
#   - When a proxy URL is set, passes --clear to expo export (Metro's transform
#     cache is not keyed on env values, so without --clear a build run after a
#     different-env build would re-inline the stale EXPO_PUBLIC_* value) and
#     greps the bundle to confirm the origin was inlined (fails if it was not).

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

OUT_DIR="${1:-dist-web}"

# ── 1. Resolve the proxy URL (env var > .env.web.proxy file) ──────────────
ENV_FILE="$REPO_ROOT/.env.web.proxy"
if [[ -n "${EXPO_PUBLIC_MANGADEX_PROXY_URL:-}" ]]; then
  echo "→ Proxy: EXPO_PUBLIC_MANGADEX_PROXY_URL from environment: ${EXPO_PUBLIC_MANGADEX_PROXY_URL}"
elif [[ -f "$ENV_FILE" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
  if [[ -n "${EXPO_PUBLIC_MANGADEX_PROXY_URL:-}" ]]; then
    echo "→ Proxy: EXPO_PUBLIC_MANGADEX_PROXY_URL from ${ENV_FILE}: ${EXPO_PUBLIC_MANGADEX_PROXY_URL}"
  else
    echo "→ Proxy: ${ENV_FILE} exists but sets no EXPO_PUBLIC_MANGADEX_PROXY_URL — building without proxy."
  fi
else
  echo "→ Proxy: none (no env var, no ${ENV_FILE}) — building without the MangaDex proxy (direct API calls)."
fi

# ── 2. Export the web bundle ──────────────────────────────────────────────
echo "→ Exporting web bundle to ${OUT_DIR}"
if [[ -n "${EXPO_PUBLIC_MANGADEX_PROXY_URL:-}" ]]; then
  # --clear forces re-transform so the EXPO_PUBLIC_* value is re-inlined
  # (Metro's transform cache is not keyed on env values).
  npx expo export --platform web --output-dir "$OUT_DIR" --clear
else
  npx expo export --platform web --output-dir "$OUT_DIR"
fi

# ── 3. Report the bundle hash ─────────────────────────────────────────────
BUNDLE="$(find "$OUT_DIR" -name 'AppEntry-*.js' -print -quit)"
if [[ -z "$BUNDLE" ]]; then
  echo "!! AppEntry-*.js bundle not found under ${OUT_DIR}" >&2
  exit 1
fi
HASH="$(shasum -a 256 "$BUNDLE" | awk '{print $1}')"
SIZE="$(wc -c < "$BUNDLE" | tr -d ' ')"
echo "→ Bundle: ${BUNDLE}"
echo "→ Size: ${SIZE} bytes"
echo "→ SHA-256: ${HASH}"

# ── 4. Verify the proxy origin was inlined (only when one was set) ────────
if [[ -n "${EXPO_PUBLIC_MANGADEX_PROXY_URL:-}" ]]; then
  if grep -qF "$EXPO_PUBLIC_MANGADEX_PROXY_URL" "$BUNDLE"; then
    echo "✅ Proxy origin confirmed inlined in the bundle"
  else
    echo "!! EXPO_PUBLIC_MANGADEX_PROXY_URL was set but not found in the exported bundle" >&2
    exit 1
  fi
fi

echo "→ Done."
