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
