-- =============================================================================
-- YomuLog — Owner-Side KPI Reporting SQL (all 4 launch KPIs)
-- =============================================================================
-- G-7 deliverable. Owner-run in the Supabase **SQL Editor** (postgres role —
-- RLS bypassed) or with the service_role key. All queries are idempotent and
-- safe to re-run; every query is annotated PASS (runs as-is) or CAVEAT (runs,
-- but read the limitation before trusting the number).
--
-- Data availability: instrumentation only produces rows once (a) the Supabase
-- env keys are in the build AND (b) the owner SQL scripts have run:
--   supabase/seed-test-users.sql
--   supabase/realtime-publication.sql
--   009_user_activity.sql      (retention heartbeat, KPI 1)
--   010_reading_stats.sql      (reading-time rollup, KPI 2)
--   011_user_events.sql        (premium funnel events, KPI 4 — G-6/G-7)
-- Pre-launch all these tables are empty by design.
--
-- Tables: auth.users (Supabase-managed), user_activity, reading_stats,
-- reading_progress, download_queue, user_subscriptions, user_events.
-- Timestamps are TIMESTAMPTZ unless noted.
-- =============================================================================

-- ═══════════════════════════════════════════════════════════════════════════
-- KPI 1 — D30 User Retention Rate
-- Definition: % of signup cohort actively using the app ~30 days after signup.
-- Activity proxy: user_activity.last_active_at (heartbeat on app foreground /
-- reader open; granularity ≈ session-level due to the 5-min cloud throttle).
-- ═══════════════════════════════════════════════════════════════════════════

-- Q1.1 — Signup cohorts by week, active around day 30 (7-day window centered
-- on D30; robust to the session-level heartbeat). ✅ PASS
WITH cohorts AS (
  SELECT date_trunc('week', created_at)::date AS signup_week,
         id AS user_id, created_at
  FROM auth.users
)
SELECT c.signup_week,
       count(*) AS cohort_size,
       count(ua.user_id) FILTER (
         WHERE ua.last_active_at >= c.created_at + interval '28 days'
           AND ua.last_active_at <  c.created_at + interval '35 days'
       ) AS active_d30_window,
       round(100.0 * count(ua.user_id) FILTER (
         WHERE ua.last_active_at >= c.created_at + interval '28 days'
           AND ua.last_active_at <  c.created_at + interval '35 days'
       ) / NULLIF(count(*), 0), 1) AS d30_retention_pct
FROM cohorts c
LEFT JOIN user_activity ua ON ua.user_id = c.user_id
GROUP BY c.signup_week
ORDER BY c.signup_week;

-- Q1.2 — "Still active at D30+" (last_active_at after signup + 30 days —
-- retention-lite). ✅ PASS
WITH cohorts AS (
  SELECT date_trunc('week', created_at)::date AS signup_week,
         id AS user_id, created_at
  FROM auth.users
)
SELECT c.signup_week, count(*) AS cohort_size,
       count(ua.user_id) FILTER (WHERE ua.last_active_at >= c.created_at + interval '30 days') AS still_active_d30plus,
       round(100.0 * count(ua.user_id) FILTER (WHERE ua.last_active_at >= c.created_at + interval '30 days') / NULLIF(count(*), 0), 1) AS pct
FROM cohorts c
LEFT JOIN user_activity ua ON ua.user_id = c.user_id
GROUP BY c.signup_week
ORDER BY c.signup_week;

-- Q1.3 — Activity decay by days-since-signup bucket (diagnostic view). ✅ PASS
SELECT CASE
         WHEN ua.last_active_at IS NULL THEN 'never_active'
         WHEN (ua.last_active_at - u.created_at) < interval '7 days'   THEN '0-6d'
         WHEN (ua.last_active_at - u.created_at) < interval '14 days'  THEN '7-13d'
         WHEN (ua.last_active_at - u.created_at) < interval '30 days'  THEN '14-29d'
         WHEN (ua.last_active_at - u.created_at) < interval '60 days'  THEN '30-59d'
         ELSE '60d+'
       END AS last_active_bucket,
       count(*)
FROM auth.users u
LEFT JOIN user_activity ua ON ua.user_id = u.id
GROUP BY 1 ORDER BY 1;

-- CAVEAT (KPI 1): user_activity is FK'd to auth.users, so anonymous installs
-- have no server-side channel; D30 numbers are signup-based (correct for the
-- KPI as written), not install-based.

-- ═══════════════════════════════════════════════════════════════════════════
-- KPI 2 — Reading Engagement Index
-- Definition: hours/week from measured reading time (reading_stats.seconds_read);
-- chapters read from reading_progress.is_read (90%-scroll auto-complete).
-- Active reader = ≥1 reading_stats row with seconds_read > 0 in trailing 7 days.
-- ═══════════════════════════════════════════════════════════════════════════

-- Q2.1 — Hours/week per active user (the KPI-2 headline). ✅ PASS
SELECT count(*) AS active_reading_users,
       round(avg(hours), 2) AS avg_hours_per_active_user,
       round(sum(hours), 1) AS total_hours_last7d
FROM (
  SELECT user_id, SUM(seconds_read) / 3600.0 AS hours
  FROM reading_stats
  WHERE day >= CURRENT_DATE - interval '8 days'   -- server-side filter; see UTC caveat below
  GROUP BY user_id
) w
WHERE hours > 0;

-- Q2.2 — Weekly cohort of readers + chapters read per reader (is_read based). ✅ PASS
SELECT date_trunc('week', last_read_at)::date AS week,
       count(DISTINCT user_id) AS readers,
       count(*) FILTER (WHERE is_read) AS chapters_read,
       round(1.0 * count(*) FILTER (WHERE is_read) / NULLIF(count(DISTINCT user_id), 0), 2) AS avg_chapters_per_reader
FROM reading_progress
WHERE last_read_at >= now() - interval '4 weeks'
GROUP BY 1 ORDER BY 1;

-- Q2.3 — Per-user detail (top readers, for anomaly check). ✅ PASS
SELECT user_id, SUM(seconds_read) AS seconds_7d, round(SUM(seconds_read)/3600.0, 2) AS hours_7d
FROM reading_stats
WHERE day >= CURRENT_DATE - interval '8 days'
GROUP BY user_id
ORDER BY seconds_7d DESC
LIMIT 25;

-- CAVEAT (KPI 2): reading_stats.day is the client's LOCAL date key; always
-- filter server-side by `day >= CURRENT_DATE - interval '8 days'` (one-day
-- safety margin) rather than trusting the pushed window.

-- ═══════════════════════════════════════════════════════════════════════════
-- KPI 3 — Download Reliability Rate ⚠️ NOT server-authoritative
-- The KPI as defined (completed / (completed + failed), cumulative since
-- install) is local-only by design (G-2): counters live in AsyncStorage and
-- are exposed via getDownloadReliabilityRate(). This is the coarse owner-side
-- proxy from download_queue; the exact rate must be read on-device.
-- ═══════════════════════════════════════════════════════════════════════════

-- Q3.1 — Server-side proxy (coarse job-outcome view; premium users only). ⚠️ CAVEAT
SELECT status,
       count(*) AS jobs,
       round(100.0 * count(*) FILTER (WHERE status = 'completed') / NULLIF(count(*), 0), 1) AS completion_pct
FROM download_queue
WHERE created_at >= now() - interval '30 days'
GROUP BY status
ORDER BY status;

-- CAVEAT (KPI 3): download_queue is synced only for premium 'downloads' scope
-- users; retries collapse into final status; web traffic is simulated. The
-- cumulative reliability rate never leaves the device — verify on-device.

-- ═══════════════════════════════════════════════════════════════════════════
-- KPI 4 — Premium Conversion Rate
-- Definition: % of free users upgrading to Premium.
-- ═══════════════════════════════════════════════════════════════════════════

-- Q4.1 — Signup → premium funnel (exclude seed/test users). ✅ PASS
SELECT count(*) AS total_signups,
       count(us.user_id) AS ever_premium,
       count(us.user_id) FILTER (WHERE us.is_active) AS currently_premium,
       round(100.0 * count(us.user_id) / NULLIF(count(*), 0), 1) AS ever_conversion_pct,
       round(100.0 * count(us.user_id) FILTER (WHERE us.is_active) / NULLIF(count(*), 0), 1) AS active_conversion_pct
FROM auth.users u
LEFT JOIN user_subscriptions us ON us.user_id = u.id
WHERE u.email NOT LIKE '%@yomulog.test';   -- seed accounts (paid@ etc.) would inflate the funnel

-- Q4.2 — MRR-ish view (approximate; flat $2.99/mo assumption). ⚠️ CAVEAT
SELECT date_trunc('month', current_period_end)::date AS period_end_month,
       count(*) FILTER (WHERE is_active) AS active_subs,
       round(count(*) FILTER (WHERE is_active) * 2.99, 2) AS approx_mrr_usd
FROM user_subscriptions
GROUP BY 1 ORDER BY 1;
-- CAVEAT (Q4.2): annual $24.99 plans make the flat-2.99 view approximate.
-- Stripe is the billing source of truth; use Supabase for the product funnel.

-- Q4.3 — Event-based step funnel per signup cohort (G-6/G-7; needs 011_user_events.sql).
-- Where do we leak? signup → paywall view → checkout start → conversion. ✅ PASS
WITH funnel AS (
  SELECT user_id,
         bool_or(event_name = 'signup_complete')      AS signed_up,
         bool_or(event_name = 'paywall_viewed')       AS saw_paywall,
         bool_or(event_name = 'checkout_started')     AS started_checkout,
         bool_or(event_name = 'checkout_completed')   AS completed_checkout
  FROM user_events
  WHERE occurred_at >= now() - interval '90 days'
  GROUP BY user_id
)
SELECT count(*) AS users,
       count(*) FILTER (WHERE signed_up)            AS signups,
       count(*) FILTER (WHERE saw_paywall)          AS saw_paywall,
       count(*) FILTER (WHERE started_checkout)     AS started_checkout,
       count(*) FILTER (WHERE completed_checkout)   AS completed,
       round(100.0 * count(*) FILTER (WHERE saw_paywall) /
         NULLIF(count(*) FILTER (WHERE signed_up), 0), 1)   AS paywall_view_pct_of_signups,
       round(100.0 * count(*) FILTER (WHERE started_checkout) /
         NULLIF(count(*) FILTER (WHERE saw_paywall), 0), 1)  AS checkout_start_pct,
       round(100.0 * count(*) FILTER (WHERE completed_checkout) /
         NULLIF(count(*) FILTER (WHERE started_checkout), 0), 1) AS checkout_complete_pct
FROM funnel;

-- Q4.4 — Per-source paywall view breakdown (diagnostic; needs 011). ✅ PASS
SELECT payload->>'source' AS source,
       count(*) AS views,
       count(DISTINCT user_id) AS users
FROM user_events
WHERE event_name = 'paywall_viewed'
  AND occurred_at >= now() - interval '90 days'
GROUP BY 1
ORDER BY views DESC;

-- CAVEAT (Q4.3/Q4.4): events only accumulate after 011_user_events.sql runs
-- and a build with the Supabase env keys ships; pre-signup events are
-- attributed to the user who signs up on that install (one install → one
-- user in practice). The onboarding "Get Premium" CTA currently finishes
-- onboarding without opening checkout (display-only), so onboarding
-- paywall_viewed → checkout_started is expected to be ~0 until wired.

-- ═══════════════════════════════════════════════════════════════════════════
-- Quick reference
--   Q1.1/Q1.2/Q1.3  D30 retention        PASS
--   Q2.1/Q2.2/Q2.3  Engagement           PASS
--   Q3.1            Download reliability CAVEAT (premium-only, retries collapse, web simulated)
--   Q4.1            Conversion funnel    PASS (excludes seed users)
--   Q4.2            MRR-ish view         CAVEAT (approximate)
--   Q4.3            Step funnel          PASS (needs 011_user_events.sql)
--   Q4.4            Per-source views     PASS (needs 011_user_events.sql)
-- =============================================================================
