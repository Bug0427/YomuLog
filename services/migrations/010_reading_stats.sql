-- Migration 010: measured reading time (KPI 2 — G-4/G-5)
-- Referenced by services/supabaseSyncService.ts (syncProgressReal /
-- syncStatsReal / pushStatsToCloud) and services/readingSessionService.ts
-- (reader session timer → per-chapter + per-day seconds).
-- Run in Supabase SQL Editor.

-- 1) Per-chapter measured reading seconds on the existing reading_progress
--    table (idempotent — safe to re-run after 001).
ALTER TABLE reading_progress
  ADD COLUMN IF NOT EXISTS seconds_read integer NOT NULL DEFAULT 0;

-- 2) Daily rollup table written by the declared 'stats' sync scope.
--    Hours/week for a user = SUM(seconds_read) over the last 7 days.
CREATE TABLE IF NOT EXISTS reading_stats (
  user_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  day            DATE NOT NULL,
  seconds_read   INTEGER NOT NULL DEFAULT 0,
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, day)
);

-- RLS: the app reads/writes this table with the anon key (JWT), so each user
-- must have access to their own rows. CREATE POLICY has no IF NOT EXISTS
-- clause, so policy creation is guarded by a pg_policies check (same pattern
-- as seed-test-users.sql #189 and migration 009 #199) to keep this migration
-- re-run-safe. Policy set matches the README DDL ("own rows" FOR ALL, like
-- every other table; FOR ALL also covers the delete performed by resetSync).
ALTER TABLE reading_stats ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'reading_stats'
      AND policyname = 'own rows'
  ) THEN
    CREATE POLICY "own rows" ON reading_stats
      FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;
