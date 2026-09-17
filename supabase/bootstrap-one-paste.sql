-- ============================================================================
-- YomuLog — Supabase bootstrap, ONE PASTE (generated file, do not edit by hand)
-- ============================================================================
-- Regenerate with:  bash scripts/build-supabase-bootstrap.sh
-- Authoritative ordered list, assumptions and verification: supabase/BOOTSTRAP.md
--
-- How to use: Supabase Dashboard → SQL Editor → New query → paste this whole
-- file → Run. Every statement is re-run-safe, so running it twice (or on a
-- project that already has some of the tables) is fine.
--
-- Contains, in order: migrations 001-011, then supabase/seed-test-users.sql,
-- then supabase/realtime-publication.sql.
-- ============================================================================


-- ============================================================================
-- BEGIN services/migrations/001_reading_progress.sql
-- ============================================================================

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

DROP POLICY IF EXISTS "Users can read own progress" ON reading_progress;
CREATE POLICY "Users can read own progress"
  ON reading_progress FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own progress" ON reading_progress;
CREATE POLICY "Users can insert own progress"
  ON reading_progress FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own progress" ON reading_progress;
CREATE POLICY "Users can update own progress"
  ON reading_progress FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own progress" ON reading_progress;
CREATE POLICY "Users can delete own progress"
  ON reading_progress FOR DELETE
  USING (auth.uid() = user_id);


-- ============================================================================
-- BEGIN services/migrations/002_user_library.sql
-- ============================================================================

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

DROP POLICY IF EXISTS "Users can read own library" ON user_library;
CREATE POLICY "Users can read own library"
  ON user_library FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own library" ON user_library;
CREATE POLICY "Users can insert own library"
  ON user_library FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own library" ON user_library;
CREATE POLICY "Users can update own library"
  ON user_library FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own library" ON user_library;
CREATE POLICY "Users can delete own library"
  ON user_library FOR DELETE
  USING (auth.uid() = user_id);


-- ============================================================================
-- BEGIN services/migrations/003_download_queue.sql
-- ============================================================================

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

DROP POLICY IF EXISTS "Users can read own downloads" ON download_queue;
CREATE POLICY "Users can read own downloads"
  ON download_queue FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own downloads" ON download_queue;
CREATE POLICY "Users can insert own downloads"
  ON download_queue FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own downloads" ON download_queue;
CREATE POLICY "Users can update own downloads"
  ON download_queue FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own downloads" ON download_queue;
CREATE POLICY "Users can delete own downloads"
  ON download_queue FOR DELETE
  USING (auth.uid() = user_id);


-- ============================================================================
-- BEGIN services/migrations/004_sync_state.sql
-- ============================================================================

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

DROP POLICY IF EXISTS "Users can read own sync state" ON sync_state;
CREATE POLICY "Users can read own sync state"
  ON sync_state FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own sync state" ON sync_state;
CREATE POLICY "Users can insert own sync state"
  ON sync_state FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own sync state" ON sync_state;
CREATE POLICY "Users can update own sync state"
  ON sync_state FOR UPDATE
  USING (auth.uid() = user_id);


-- ============================================================================
-- BEGIN services/migrations/005_user_preferences.sql
-- ============================================================================

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

DROP POLICY IF EXISTS "Users can read own preferences" ON user_preferences;
CREATE POLICY "Users can read own preferences"
  ON user_preferences FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own preferences" ON user_preferences;
CREATE POLICY "Users can insert own preferences"
  ON user_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own preferences" ON user_preferences;
CREATE POLICY "Users can update own preferences"
  ON user_preferences FOR UPDATE
  USING (auth.uid() = user_id);


-- ============================================================================
-- BEGIN services/migrations/006_user_subscriptions.sql
-- ============================================================================

-- Migration 006: user_subscriptions table for Stripe subscription tracking.
-- Populated by the Stripe webhook Edge Function when subscription events occur.
-- PremiumContext reads this table to determine the user's subscription status.
-- Run in Supabase SQL Editor (idempotent — safe to re-run, see "re-run safety" below).
--
-- Security model (hardened after the PR #239 review):
--   * `authenticated` may SELECT only its own row (RLS policy).
--   * `anon` has no access at all (no auth.uid()).
--   * writes (INSERT/UPDATE/DELETE) are service-role only — enforced twice:
--     the write policies are scoped TO service_role AND client write grants are
--     revoked outright, so a leaked anon/authenticated key cannot write here.
--   * `upsert_subscription` (SECURITY DEFINER) is service-role only: EXECUTE is
--     revoked from PUBLIC/anon/authenticated, which Postgres otherwise grants.
--
-- re-run safety: every statement below is CREATE ... IF NOT EXISTS,
-- ADD COLUMN IF NOT EXISTS, DROP POLICY IF EXISTS before CREATE POLICY,
-- CREATE OR REPLACE, or a repetition-safe REVOKE/GRANT/DROP FUNCTION IF EXISTS.

CREATE TABLE IF NOT EXISTS user_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  plan TEXT NOT NULL DEFAULT 'monthly'
    CHECK (plan IN ('monthly', 'yearly')),
  is_active BOOLEAN NOT NULL DEFAULT false,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- High-water mark of the last Stripe webhook event applied to this row.
-- Used by upsert_subscription() to ignore out-of-order (stale) Stripe events.
ALTER TABLE user_subscriptions
  ADD COLUMN IF NOT EXISTS stripe_event_created_at TIMESTAMPTZ;

-- Index: fast per-user lookup
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user
  ON user_subscriptions(user_id);

-- Index: find all active subscriptions
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_active
  ON user_subscriptions(is_active)
  WHERE is_active = true;

-- RLS: users can only read their own subscription
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own subscription" ON user_subscriptions;
CREATE POLICY "Users can read own subscription"
  ON user_subscriptions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Only the service role (Stripe webhook / edge functions) can write.
-- Scoped TO service_role so the permissive predicate can never apply to a
-- client role, even if grants are re-added later.
DROP POLICY IF EXISTS "Service can insert subscriptions" ON user_subscriptions;
CREATE POLICY "Service can insert subscriptions"
  ON user_subscriptions FOR INSERT
  TO service_role
  WITH CHECK (true);

DROP POLICY IF EXISTS "Service can update subscriptions" ON user_subscriptions;
CREATE POLICY "Service can update subscriptions"
  ON user_subscriptions FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Service can delete subscriptions" ON user_subscriptions;
CREATE POLICY "Service can delete subscriptions"
  ON user_subscriptions FOR DELETE
  TO service_role
  USING (true);

-- Belt and braces: strip the client write/read grants Supabase's default
-- privileges hand to anon/authenticated on new public tables.
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON user_subscriptions FROM anon, authenticated;
REVOKE ALL ON user_subscriptions FROM anon;
GRANT SELECT ON user_subscriptions TO authenticated;

-- Function: upsert subscription status from Stripe webhook
-- Called by the edge functions with the service_role key.
--
-- p_event_created_at is the Stripe event's `created` timestamp (NULL for
-- explicit user actions such as the cancel-at-period-end mirror). When it is
-- older than the value already stored on the row, the write is skipped so a
-- delayed/retried Stripe event cannot revoke or restore access incorrectly.
--
-- NOTE: the pre-hardening 7-argument signature is dropped first, because
-- adding a defaulted parameter would otherwise leave both overloads in place
-- and make PostgREST's /rpc resolution ambiguous.
DROP FUNCTION IF EXISTS upsert_subscription(
  UUID, TEXT, TEXT, TEXT, BOOLEAN, TIMESTAMPTZ, BOOLEAN
);

CREATE OR REPLACE FUNCTION upsert_subscription(
  p_user_id UUID,
  p_stripe_customer_id TEXT,
  p_stripe_subscription_id TEXT,
  p_plan TEXT,
  p_is_active BOOLEAN,
  p_current_period_end TIMESTAMPTZ,
  p_cancel_at_period_end BOOLEAN,
  p_event_created_at TIMESTAMPTZ DEFAULT NULL
) RETURNS void AS $$
DECLARE
  v_last_event TIMESTAMPTZ;
BEGIN
  SELECT u.stripe_event_created_at
    INTO v_last_event
    FROM user_subscriptions u
   WHERE u.user_id = p_user_id;

  IF p_event_created_at IS NOT NULL
     AND v_last_event IS NOT NULL
     AND p_event_created_at < v_last_event THEN
    -- Stale Stripe event: keep the newer entitlement state.
    RETURN;
  END IF;

  INSERT INTO user_subscriptions (
    user_id, stripe_customer_id, stripe_subscription_id,
    plan, is_active, current_period_end, cancel_at_period_end,
    stripe_event_created_at, updated_at
  ) VALUES (
    p_user_id, p_stripe_customer_id, p_stripe_subscription_id,
    p_plan, p_is_active, p_current_period_end, p_cancel_at_period_end,
    p_event_created_at, now()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    stripe_customer_id = EXCLUDED.stripe_customer_id,
    stripe_subscription_id = EXCLUDED.stripe_subscription_id,
    plan = EXCLUDED.plan,
    is_active = EXCLUDED.is_active,
    current_period_end = EXCLUDED.current_period_end,
    cancel_at_period_end = EXCLUDED.cancel_at_period_end,
    stripe_event_created_at = GREATEST(
      user_subscriptions.stripe_event_created_at,
      EXCLUDED.stripe_event_created_at
    ),
    updated_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- SECURITY DEFINER functions are executable by PUBLIC by default, which would
-- let any anon/authenticated client write arbitrary entitlement rows through
-- PostgREST. Only the service role may call it.
REVOKE ALL ON FUNCTION upsert_subscription(
  UUID, TEXT, TEXT, TEXT, BOOLEAN, TIMESTAMPTZ, BOOLEAN, TIMESTAMPTZ
) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION upsert_subscription(
  UUID, TEXT, TEXT, TEXT, BOOLEAN, TIMESTAMPTZ, BOOLEAN, TIMESTAMPTZ
) TO service_role;


-- ============================================================================
-- BEGIN services/migrations/007_stripe_edge_functions.sql
-- ============================================================================

-- services/migrations/007_stripe_edge_functions.sql
-- Reference index for the Stripe Supabase Edge Functions.
-- NOTE: checkout is a Stripe-hosted payment link (no stripe-checkout function
-- exists or is needed — the app opens PREMIUM_CHECKOUT_URL directly). The
-- deployable functions live in supabase/functions/ and are deployed via
-- `supabase functions deploy <name> [flags] --project-ref <project>`:
--   stripe-portal   (Manage screen → portal URL) — keep JWT verification ON (no flag)
--   stripe-cancel   (Manage screen → cancel at period end) — keep JWT verification ON (no flag)
--   stripe-webhook  (Stripe → user_subscriptions entitlement) — deploy with
--                    `--no-verify-jwt` (caller is Stripe: sends a Stripe-Signature
--                    header, never a Supabase JWT; requiring one 401s every write).
--   mangadex-proxy  (CORS proxy) — deploy with `--no-verify-jwt` (browser calls it
--                    with a bare fetch(); see api/mangadex/README.md).
-- The pseudocode sketches below document the request/response shapes the app
-- expects (services/stripeService.ts). They are NOT SQL — do not paste this
-- file into the SQL Editor.
--
-- Required secrets (set via `supabase secrets set`) — exactly what the
-- deployed functions read via Deno.env.get():
--   STRIPE_SECRET_KEY=sk_live_...        all three functions (Stripe REST calls)
--   STRIPE_WEBHOOK_SECRET=whsec_...      stripe-webhook only (signature check)
--   SUPABASE_URL=https://<project-ref>.supabase.co
--   SUPABASE_SERVICE_ROLE_KEY=sb_secret_...  all three (PostgREST + Auth calls)
-- The monthly/yearly prices are NOT read by any function: checkout is a Stripe
-- hosted payment link (PREMIUM_CHECKOUT_URL in services/stripeService.ts) and
-- the plan is derived from the price's lookup key on the subscription.
--
-- Environment variables in .env (client-side):
--   EXPO_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
--   EXPO_PUBLIC_SUPABASE_ANON_KEY=<anon public key>
--
-- Authorization model (hardened after the PR #239 review):
--   stripe-portal / stripe-cancel require the caller's Supabase access token
--   (`Authorization: Bearer <access token>`); the JWT subject is verified with
--   Supabase Auth and must match the `userId` in the body. They write only
--   through the service role, and upsert_subscription is revoked from
--   PUBLIC/anon/authenticated (migration 006).

-- The edge function creates a Stripe Checkout Session for subscriptions
-- and returns the client_secret for the React Native SDK.

-- ─────────────────────────────────────────────────────────────────────
-- stripe-checkout Edge Function (pseudocode):
-- ─────────────────────────────────────────────────────────────────────
--
-- import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
-- import Stripe from 'https://esm.sh/stripe@13.11.0'
--
-- const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!)
-- const MONTHLY_PRICE = Deno.env.get('STRIPE_MONTHLY_PRICE_ID')!
-- const YEARLY_PRICE = Deno.env.get('STRIPE_YEARLY_PRICE_ID')!
--
-- serve(async (req) => {
--   const { plan, userId } = await req.json()
--   const priceId = plan === 'yearly' ? YEARLY_PRICE : MONTHLY_PRICE
--
--   const session = await stripe.checkout.sessions.create({
--     mode: 'subscription',
--     line_items: [{ price: priceId, quantity: 1 }],
--     client_reference_id: userId,
--     success_url: 'yomulog://subscription-success',
--     cancel_url: 'yomulog://subscription-cancel',
--   })
--
--   return new Response(JSON.stringify({ clientSecret: session.client_secret }), {
--     headers: { 'Content-Type': 'application/json' },
--   })
-- })
--
-- ─────────────────────────────────────────────────────────────────────
-- stripe-webhook Edge Function (pseudocode):
-- ─────────────────────────────────────────────────────────────────────
--
-- serve(async (req) => {
--   const sig = req.headers.get('stripe-signature')!
--   const body = await req.text()
--   const event = stripe.webhooks.constructEvent(body, sig, WEBHOOK_SECRET)
--
--   switch (event.type) {
--     case 'checkout.session.completed': {
--       const session = event.data.object
--       const userId = session.client_reference_id
--       const subscription = await stripe.subscriptions.retrieve(session.subscription)
--       // Call upsert_subscription(userId, ...) via Supabase
--       break
--     }
--     case 'customer.subscription.updated':
--     case 'customer.subscription.deleted': {
--       const sub = event.data.object
--       // Find user by stripe_customer_id, update subscription status
--       break
--     }
--   }
--   return new Response(JSON.stringify({ received: true }))
-- })
--
-- ─────────────────────────────────────────────────────────────────────
-- stripe-portal Edge Function (pseudocode):
-- ─────────────────────────────────────────────────────────────────────
--
-- serve(async (req) => {
--   const { userId } = await req.json()
--   // Look up stripe_customer_id from user_subscriptions
--   const portal = await stripe.billingPortal.sessions.create({
--     customer: customerId,
--     return_url: 'yomulog://settings',
--   })
--   return new Response(JSON.stringify({ url: portal.url }))
-- })
--
-- ─────────────────────────────────────────────────────────────────────
-- stripe-cancel Edge Function (pseudocode):
-- ─────────────────────────────────────────────────────────────────────
--
-- serve(async (req) => {
--   const { userId } = await req.json()
--   // Cancel at period end
--   await stripe.subscriptions.update(subscriptionId, {
--     cancel_at_period_end: true,
--   })
--   return new Response(JSON.stringify({ success: true }))
-- })


-- ============================================================================
-- BEGIN services/migrations/008_collections.sql
-- ============================================================================

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

DROP POLICY IF EXISTS "Users can read own collections" ON user_collections;
CREATE POLICY "Users can read own collections"
  ON user_collections FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own collections" ON user_collections;
CREATE POLICY "Users can insert own collections"
  ON user_collections FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own collections" ON user_collections;
CREATE POLICY "Users can update own collections"
  ON user_collections FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own collections" ON user_collections;
CREATE POLICY "Users can delete own collections"
  ON user_collections FOR DELETE
  USING (auth.uid() = user_id);

-- ─── RLS for user_manga_tags ────────────────────────────────────────
ALTER TABLE user_manga_tags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own manga tags" ON user_manga_tags;
CREATE POLICY "Users can read own manga tags"
  ON user_manga_tags FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own manga tags" ON user_manga_tags;
CREATE POLICY "Users can insert own manga tags"
  ON user_manga_tags FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own manga tags" ON user_manga_tags;
CREATE POLICY "Users can update own manga tags"
  ON user_manga_tags FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own manga tags" ON user_manga_tags;
CREATE POLICY "Users can delete own manga tags"
  ON user_manga_tags FOR DELETE
  USING (auth.uid() = user_id);

-- ─── Indexes ────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_collections_user ON user_collections(user_id);
CREATE INDEX IF NOT EXISTS idx_manga_tags_user ON user_manga_tags(user_id);
CREATE INDEX IF NOT EXISTS idx_manga_tags_manga ON user_manga_tags(user_id, manga_id);


-- ============================================================================
-- BEGIN services/migrations/009_user_activity.sql
-- ============================================================================

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


-- ============================================================================
-- BEGIN services/migrations/010_reading_stats.sql
-- ============================================================================

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

-- RLS: the app reads/writes this table with the anon key (JWT), so each user
-- must have access to their own rows. CREATE POLICY has no IF NOT EXISTS
-- clause, so policy creation is guarded by a pg_policies check (same pattern
-- as seed-test-users.sql #189 and migration 009 #199) to keep this migration
-- re-run-safe. Policy set matches the README DDL ("own rows" FOR ALL, like
-- every other table; FOR ALL also covers the delete performed by resetSync).
ALTER TABLE reading_stats ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'reading_stats'
      AND policyname = 'own rows'
  ) THEN
    CREATE POLICY "own rows" ON reading_stats
      FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;


-- ============================================================================
-- BEGIN services/migrations/011_user_events.sql
-- ============================================================================

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


-- ============================================================================
-- BEGIN supabase/seed-test-users.sql
-- ============================================================================

-- ============================================================================
-- YomuLog — Supabase seed: test users + premium subscription row
-- ============================================================================
-- Purpose: pre-provision the Supabase Auth test users used by the app's
-- E2E/premium flows so that once the owner provides env keys, sign-in and the
-- premium "paid row flip" work immediately.
--
-- Credentials source: services/feedbackRepo.ts (the app's own local seed data).
--   admin@yomulog.test   / AdminPass1!   (role 1)
--   paid@yomulog.test    / PaidPass1!    (role 2)
--   regular@yomulog.test / P@22w0rd      (role 3)
--
-- IMPORTANT — two ways to run this:
--
--   A) Supabase SQL Editor (postgres role): paste + Run. The SQL Editor runs
--      as the postgres superuser, which is allowed to INSERT into auth.users.
--      This is the simplest path — no service-role key needed.
--
--   B) Service-role API (for scripts/CI): use the admin API instead — raw
--      INSERTs into auth.users via the REST layer are blocked. Equivalent:
--        SUPABASE_SERVICE_ROLE_KEY=<key> \
--        curl -X POST https://<project-ref>.supabase.co/auth/v1/admin/users \
--          -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
--          -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" -H "Content-Type: application/json" \
--          -d '{"email":"paid@yomulog.test","password":"PaidPass1!","email_confirm":true}'
--      (repeat for admin@ / regular@)
--
--   C) Dashboard (no keys at all): Authentication → Users → "Add user" →
--      enter email + password → Save (email is auto-confirmed). Repeat for
--      the three emails. Then run ONLY the user_subscriptions section below.
--
-- Idempotent: safe to re-run any number of times. Existing users keep their
-- id; the premium row is refreshed on every run (the "paid row flip").
-- ============================================================================

-- ── 0. pgcrypto (for crypt()/gen_salt() bcrypt password hashing) ───────────
create extension if not exists pgcrypto;

-- ── 1. auth.users: ensure the three test users exist ───────────────────────
-- (existence check per email — auth.users has no usable ON CONFLICT target
--  because its unique index is on lower(email), so we guard with DO blocks)
do $$
declare v_id uuid;
begin
  -- admin@yomulog.test (admin)
  select id into v_id from auth.users where lower(email) = lower('admin@yomulog.test');
  if v_id is null then
    insert into auth.users
      (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
       raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
    values
      ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated',
       'admin@yomulog.test', crypt('AdminPass1!', gen_salt('bf')), now(),
       '{"provider":"email","providers":["email"]}', '{}', now(), now());
    raise notice 'created admin@yomulog.test';
  end if;

  -- paid@yomulog.test (premium)
  select id into v_id from auth.users where lower(email) = lower('paid@yomulog.test');
  if v_id is null then
    insert into auth.users
      (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
       raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
    values
      ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated',
       'paid@yomulog.test', crypt('PaidPass1!', gen_salt('bf')), now(),
       '{"provider":"email","providers":["email"]}', '{}', now(), now());
    raise notice 'created paid@yomulog.test';
  end if;

  -- regular@yomulog.test (free)
  select id into v_id from auth.users where lower(email) = lower('regular@yomulog.test');
  if v_id is null then
    insert into auth.users
      (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
       raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
    values
      ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated',
       'regular@yomulog.test', crypt('P@22w0rd', gen_salt('bf')), now(),
       '{"provider":"email","providers":["email"]}', '{}', now(), now());
    raise notice 'created regular@yomulog.test';
  end if;
end $$;

-- ── 2. user_subscriptions: ensure the table exists ─────────────────────────
-- Columns are EXACTLY what the app reads (services/stripeService.ts):
--   .from('user_subscriptions').select('*').eq('user_id', userId).maybeSingle()
-- plus realtime (subscription-changes channel, filter user_id=eq.<id>).
-- user_id is the primary key: one subscription row per Supabase Auth user.
create table if not exists public.user_subscriptions (
  user_id                 uuid primary key references auth.users (id) on delete cascade,
  is_active               boolean not null default false,
  plan                    text,
  current_period_end      timestamptz,
  cancel_at_period_end    boolean not null default false,
  stripe_customer_id      text,
  stripe_subscription_id  text,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

-- RLS: the app reads this table with the anon key (JWT), so the owner must
-- grant select to the row's own user. CREATE POLICY has no IF NOT EXISTS
-- clause, so the policy creation is guarded by a pg_policies check to keep
-- the script idempotent (safe to re-run, as the E2E re-runs this file).
alter table public.user_subscriptions enable row level security;
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'user_subscriptions'
      and policyname = 'user_subscriptions_select_own'
  ) then
    create policy "user_subscriptions_select_own" on public.user_subscriptions
      for select using (auth.uid() = user_id);
  end if;
end $$;

-- ── 3. The premium "paid row flip" ─────────────────────────────────────────
-- Marks paid@yomulog.test as an ACTIVE premium subscriber with a future
-- expiry, so PremiumContext sees isActive=true. Re-run whenever the E2E
-- flow needs the paid state restored.
insert into public.user_subscriptions
  (user_id, is_active, plan, current_period_end, cancel_at_period_end,
   stripe_customer_id, stripe_subscription_id, updated_at)
select
  u.id, true, 'monthly', now() + interval '30 days', false,
  'cus_test_paid', 'sub_test_paid', now()
from auth.users u
where lower(u.email) = lower('paid@yomulog.test')
on conflict (user_id) do update set
  is_active              = excluded.is_active,
  plan                   = excluded.plan,
  current_period_end     = excluded.current_period_end,
  cancel_at_period_end   = excluded.cancel_at_period_end,
  stripe_customer_id     = excluded.stripe_customer_id,
  stripe_subscription_id = excluded.stripe_subscription_id,
  updated_at             = now();

-- Verify: expect 3 auth users and 1 premium row for paid@yomulog.test.
select email from auth.users where email like '%yomulog.test' order by email;
select u.email, s.is_active, s.plan, s.current_period_end
from public.user_subscriptions s
join auth.users u on u.id = s.user_id;


-- ============================================================================
-- BEGIN supabase/realtime-publication.sql
-- ============================================================================

-- ============================================================================
-- YomuLog — Supabase Realtime publication for premium entitlement (P-5)
-- ============================================================================
-- The app listens for subscription changes via Supabase Realtime:
--   services/stripeService.ts → subscribeToSubscriptionChanges()
--     channel: 'subscription-changes'
--     event:   '*' (INSERT / UPDATE / DELETE)
--     schema:  'public', table: 'user_subscriptions'
--     filter:  'user_id=eq.<userId>'
-- context/PremiumContext.tsx subscribes on mount so the premium status UI
-- flips the moment the row changes (e.g. after a Stripe webhook updates it).
--
-- This is the ONLY postgres_changes listener in the codebase, so
-- user_subscriptions is the only table that must be published.
--
-- Run in the Supabase SQL Editor (or via psql/`supabase db execute`).
-- Dashboard alternative: Database → Publications → supabase_realtime →
-- tick "user_subscriptions" → Save.
-- ============================================================================

-- Idempotent: add the table only if it isn't already in the publication.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'user_subscriptions'
  ) then
    alter publication supabase_realtime add table public.user_subscriptions;
    raise notice 'added public.user_subscriptions to supabase_realtime';
  else
    raise notice 'public.user_subscriptions already in supabase_realtime';
  end if;
end $$;

-- Optional but recommended for UPDATE events: emits the full old row in
-- payload.old (default identity only carries the primary key). The app
-- currently reads payload.new only, so this is not strictly required.
alter table public.user_subscriptions replica identity full;

-- Verify:
select pubname, schemaname, tablename
from pg_publication_tables
where pubname = 'supabase_realtime' and tablename = 'user_subscriptions';
