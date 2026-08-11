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
