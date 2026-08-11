-- Migration 009: user_activity — retention instrumentation (KPI 1: D30 retention)
-- Referenced by services/supabaseSyncService.ts (syncRetentionReal / pushRetentionToCloud)
-- and services/retentionService.ts (install id, first launch, last-active heartbeat).
-- Run in Supabase SQL Editor.

CREATE TABLE IF NOT EXISTS user_activity (
  user_id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  install_id       TEXT,
  first_launch_at  TIMESTAMPTZ,
  last_active_at   TIMESTAMPTZ,
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE user_activity ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own activity"
  ON user_activity FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own activity"
  ON user_activity FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own activity"
  ON user_activity FOR UPDATE
  USING (auth.uid() = user_id);
