-- Migration 011: user_events — premium conversion funnel (KPI 4, G-6/G-7).
-- Referenced by services/funnelService.ts (local event log) and
-- services/supabaseSyncService.ts (syncFunnelEventsReal / pushFunnelEventsToCloud).
-- Run in Supabase SQL Editor (idempotent — safe to re-run).
CREATE TABLE IF NOT EXISTS user_events (
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_id     TEXT NOT NULL,               -- `${name}_${ts36}_${rand}` — idempotency key
  install_id   TEXT,                        -- ties pre-signup events to the device (G-3 id)
  event_name   TEXT NOT NULL CHECK (event_name IN
                 ('signup_complete','paywall_viewed','checkout_started','checkout_completed')),
  payload      JSONB NOT NULL DEFAULT '{}'::jsonb,
  occurred_at  TIMESTAMPTZ NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, event_id)
);
CREATE INDEX IF NOT EXISTS idx_user_events_user_time
  ON user_events(user_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_events_name
  ON user_events(event_name, occurred_at);
ALTER TABLE user_events ENABLE ROW LEVEL SECURITY;
-- DO-block pg_policies guard (mirror 009/010 — re-run-safe) then:
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'user_events'
      AND policyname = 'own rows'
  ) THEN
    CREATE POLICY "own rows" ON user_events
      FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;
-- No realtime-publication entry needed — user_events is write-only from the app.
