-- Migration 004: sync_state table for per-user sync metadata
-- Tracks last sync timestamps, status, and scope-level progress.
-- Run in Supabase SQL Editor.

CREATE TABLE IF NOT EXISTS sync_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('synced', 'syncing', 'error', 'pending')),
  last_synced_at TIMESTAMPTZ,
  last_error TEXT,
  sync_enabled BOOLEAN NOT NULL DEFAULT false,
  scope_timestamps JSONB DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE sync_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own sync state"
  ON sync_state FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sync state"
  ON sync_state FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sync state"
  ON sync_state FOR UPDATE
  USING (auth.uid() = user_id);
