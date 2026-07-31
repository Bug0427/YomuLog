-- Migration 005: user_preferences table for cross-device preferences sync
-- Referenced by services/syncService.ts (pushPreferences/pullPreferences).
-- Run in Supabase SQL Editor.

CREATE TABLE IF NOT EXISTS user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  language TEXT NOT NULL DEFAULT 'en',
  alerts_on BOOLEAN NOT NULL DEFAULT true,
  ai_search_on BOOLEAN NOT NULL DEFAULT false,
  direction_mode TEXT NOT NULL DEFAULT 'ltr',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own preferences"
  ON user_preferences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own preferences"
  ON user_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own preferences"
  ON user_preferences FOR UPDATE
  USING (auth.uid() = user_id);
