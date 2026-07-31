-- Migration 006: user_subscriptions table for Stripe subscription tracking.
-- Populated by the Stripe webhook Edge Function when subscription events occur.
-- PremiumContext reads this table to determine the user's subscription status.
-- Run in Supabase SQL Editor.

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

-- Index: fast per-user lookup
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user
  ON user_subscriptions(user_id);

-- Index: find all active subscriptions
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_active
  ON user_subscriptions(is_active)
  WHERE is_active = true;

-- RLS: users can only read their own subscription
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own subscription"
  ON user_subscriptions FOR SELECT
  USING (auth.uid() = user_id);

-- Only the service role (Stripe webhook) can insert/update/delete
CREATE POLICY "Service can insert subscriptions"
  ON user_subscriptions FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Service can update subscriptions"
  ON user_subscriptions FOR UPDATE
  USING (true);

CREATE POLICY "Service can delete subscriptions"
  ON user_subscriptions FOR DELETE
  USING (true);

-- Function: upsert subscription status from Stripe webhook
-- Called by the Edge Function with service_role key
CREATE OR REPLACE FUNCTION upsert_subscription(
  p_user_id UUID,
  p_stripe_customer_id TEXT,
  p_stripe_subscription_id TEXT,
  p_plan TEXT,
  p_is_active BOOLEAN,
  p_current_period_end TIMESTAMPTZ,
  p_cancel_at_period_end BOOLEAN
) RETURNS void AS $$
BEGIN
  INSERT INTO user_subscriptions (
    user_id, stripe_customer_id, stripe_subscription_id,
    plan, is_active, current_period_end, cancel_at_period_end,
    updated_at
  ) VALUES (
    p_user_id, p_stripe_customer_id, p_stripe_subscription_id,
    p_plan, p_is_active, p_current_period_end, p_cancel_at_period_end,
    now()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    stripe_customer_id = EXCLUDED.stripe_customer_id,
    stripe_subscription_id = EXCLUDED.stripe_subscription_id,
    plan = EXCLUDED.plan,
    is_active = EXCLUDED.is_active,
    current_period_end = EXCLUDED.current_period_end,
    cancel_at_period_end = EXCLUDED.cancel_at_period_end,
    updated_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
