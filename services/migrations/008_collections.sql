-- services/migrations/008_collections.sql
-- Supabase migration for user-defined manga collections and custom tags.

-- ─── Collections table ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_collections (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  type          TEXT NOT NULL CHECK (type IN ('standard', 'reading_list')) DEFAULT 'standard',
  description   TEXT,
  manga_ids     UUID[] NOT NULL DEFAULT '{}',
  tags          TEXT[] NOT NULL DEFAULT '{}',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── Custom manga tags table ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_manga_tags (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  manga_id  UUID NOT NULL,
  tags      TEXT[] NOT NULL DEFAULT '{}',
  UNIQUE(user_id, manga_id)
);

-- ─── RLS for user_collections ───────────────────────────────────────
ALTER TABLE user_collections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own collections"
  ON user_collections FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own collections"
  ON user_collections FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own collections"
  ON user_collections FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own collections"
  ON user_collections FOR DELETE
  USING (auth.uid() = user_id);

-- ─── RLS for user_manga_tags ────────────────────────────────────────
ALTER TABLE user_manga_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own manga tags"
  ON user_manga_tags FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own manga tags"
  ON user_manga_tags FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own manga tags"
  ON user_manga_tags FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own manga tags"
  ON user_manga_tags FOR DELETE
  USING (auth.uid() = user_id);

-- ─── Indexes ────────────────────────────────────────────────────────
CREATE INDEX idx_collections_user ON user_collections(user_id);
CREATE INDEX idx_manga_tags_user ON user_manga_tags(user_id);
CREATE INDEX idx_manga_tags_manga ON user_manga_tags(user_id, manga_id);
