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
