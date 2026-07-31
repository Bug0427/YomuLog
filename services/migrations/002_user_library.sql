-- Migration 002: user_library table for manga follows/bookmarks
-- Stores which manga the user has bookmarked/followed, with reading status.
-- Run in Supabase SQL Editor.

CREATE TABLE IF NOT EXISTS user_library (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  manga_id TEXT NOT NULL,
  manga_title TEXT NOT NULL,
  manga_image TEXT,
  genres TEXT[],
  bookmarked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reading_status TEXT NOT NULL DEFAULT 'reading'
    CHECK (reading_status IN ('reading', 'completed', 'on_hold', 'dropped', 'plan_to_read')),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, manga_id)
);

-- Index: fast per-user library queries sorted by bookmark date
CREATE INDEX IF NOT EXISTS idx_user_library_user_bookmarked
  ON user_library(user_id, bookmarked_at DESC);

-- Index: filter by reading status
CREATE INDEX IF NOT EXISTS idx_user_library_user_status
  ON user_library(user_id, reading_status);

-- RLS: users can only access their own rows
ALTER TABLE user_library ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own library"
  ON user_library FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own library"
  ON user_library FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own library"
  ON user_library FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own library"
  ON user_library FOR DELETE
  USING (auth.uid() = user_id);
