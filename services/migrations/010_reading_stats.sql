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

-- RLS
ALTER TABLE reading_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own stats"
  ON reading_stats FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own stats"
  ON reading_stats FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own stats"
  ON reading_stats FOR UPDATE
  USING (auth.uid() = user_id);
