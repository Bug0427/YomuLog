-- Migration 003: download_queue table for offline download state
-- Tracks active and completed chapter downloads across devices.
-- Run in Supabase SQL Editor.

CREATE TABLE IF NOT EXISTS download_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  job_id TEXT NOT NULL,
  chapter_id TEXT NOT NULL,
  manga_id TEXT NOT NULL,
  manga_title TEXT NOT NULL,
  chapter_number TEXT NOT NULL,
  chapter_title TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'downloading', 'completed', 'failed', 'cancelled')),
  progress FLOAT NOT NULL DEFAULT 0,
  total_pages INTEGER NOT NULL DEFAULT 0,
  downloaded_pages INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  local_dir TEXT,
  retry_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, job_id)
);

-- Index: per-user download queue sorted by creation date
CREATE INDEX IF NOT EXISTS idx_download_queue_user_created
  ON download_queue(user_id, created_at DESC);

-- Index: filter by status
CREATE INDEX IF NOT EXISTS idx_download_queue_user_status
  ON download_queue(user_id, status);

-- RLS
ALTER TABLE download_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own downloads"
  ON download_queue FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own downloads"
  ON download_queue FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own downloads"
  ON download_queue FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own downloads"
  ON download_queue FOR DELETE
  USING (auth.uid() = user_id);
