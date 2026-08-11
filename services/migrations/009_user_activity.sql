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

-- RLS: the app reads/writes this table with the anon key (JWT), so each user
-- must have access to their own rows. CREATE POLICY has no IF NOT EXISTS
-- clause, so policy creation is guarded by a pg_policies check (same pattern
-- as seed-test-users.sql #189) to keep this migration re-run-safe. Policy set
-- matches the README DDL ("own rows" FOR ALL, like every other table).
ALTER TABLE user_activity ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'user_activity'
      AND policyname = 'own rows'
  ) THEN
    CREATE POLICY "own rows" ON user_activity
      FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;
