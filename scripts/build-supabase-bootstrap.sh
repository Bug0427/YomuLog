#!/usr/bin/env bash
# Regenerates supabase/bootstrap-one-paste.sql from the authoritative ordered
# list in supabase/BOOTSTRAP.md (§2). Keep the two in sync: if you add a
# migration, add it here AND to the ordered list in BOOTSTRAP.md.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$ROOT/supabase/bootstrap-one-paste.sql"

FILES=(
  services/migrations/001_reading_progress.sql
  services/migrations/002_user_library.sql
  services/migrations/003_download_queue.sql
  services/migrations/004_sync_state.sql
  services/migrations/005_user_preferences.sql
  services/migrations/006_user_subscriptions.sql
  services/migrations/007_stripe_edge_functions.sql
  services/migrations/008_collections.sql
  services/migrations/009_user_activity.sql
  services/migrations/010_reading_stats.sql
  services/migrations/011_user_events.sql
  supabase/seed-test-users.sql
  supabase/realtime-publication.sql
)

{
  cat <<'HEADER'
-- ============================================================================
-- YomuLog — Supabase bootstrap, ONE PASTE (generated file, do not edit by hand)
-- ============================================================================
-- Regenerate with:  bash scripts/build-supabase-bootstrap.sh
-- Authoritative ordered list, assumptions and verification: supabase/BOOTSTRAP.md
--
-- How to use: Supabase Dashboard → SQL Editor → New query → paste this whole
-- file → Run. Every statement is re-run-safe, so running it twice (or on a
-- project that already has some of the tables) is fine.
--
-- Contains, in order: migrations 001-011, then supabase/seed-test-users.sql,
-- then supabase/realtime-publication.sql.
-- ============================================================================
HEADER

  for f in "${FILES[@]}"; do
    printf '\n\n-- ============================================================================\n'
    printf -- '-- BEGIN %s\n' "$f"
    printf -- '-- ============================================================================\n\n'
    cat "$ROOT/$f"
  done
} > "$OUT"

echo "wrote $OUT ($(wc -l < "$OUT") lines, ${#FILES[@]} files)"
