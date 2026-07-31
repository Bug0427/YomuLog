-- Migration 001: reading_progress table for cloud sync
-- Run in Supabase SQL Editor to set up the cloud sync backend.

-- Enable Row Level Security
CREATE TABLE IF NOT EXISTS reading_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  chapter_id TEXT NOT NULL,
  manga_id TEXT NOT NULL,
  manga_title TEXT NOT NULL,
  manga_image TEXT,
  chapter_title TEXT,
  chapter_number FLOAT NOT NULL DEFAULT 0,
  scroll_percentage FLOAT NOT NULL DEFAULT 0,
  is_read BOOLEAN NOT NULL DEFAULT false,
  last_read_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, chapter_id)
);

-- Index for fast per-user queries
CREATE INDEX IF NOT EXISTS idx_reading_progress_user
  ON reading_progress(user_id, last_read_at DESC);

-- RLS: users can only access their own rows
ALTER TABLE reading_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own progress"
  ON reading_progress FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own progress"
  ON reading_progress FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own progress"
  ON reading_progress FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own progress"
  ON reading_progress FOR DELETE
  USING (auth.uid() = user_id);
