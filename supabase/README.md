# YomuLog — Supabase setup (premium sync + entitlement)

Everything needed to configure Supabase for the premium cloud-sync path. This
is **prep only** — nothing here deploys or calls Supabase. When you have the
keys (below), setup is copy-paste.

## 1. What you need from the Supabase dashboard

Open your project → **Settings → API**:

| Item | Where | Used for |
|------|-------|----------|
| `Project URL` | Settings → API → Project URL | `EXPO_PUBLIC_SUPABASE_URL` |
| `anon public` key | Settings → API → Project API keys | `EXPO_PUBLIC_SUPABASE_ANON_KEY` (safe in the web bundle) |
| `service_role` key (optional) | Settings → API → Project API keys (hidden; reveal) | only for scripted seeding via the admin API — never ship it in the app |

> ℹ️ `services/supabaseClient.ts` is **env-only** (PR #190): without
> `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_ANON_KEY` at build time the
> app runs **local-only by design** (`isSupabaseConfigured()` = false — no
> fallback project, no silent traffic). Set the real env vars at build time to
> enable cloud sync/premium (see §4).

## 2. Run the SQL scripts

All scripts are idempotent (safe to re-run). Open **SQL Editor**, paste, Run:

1. **`supabase/seed-test-users.sql`** — creates the three auth test users
   (`admin@yomulog.test` / `AdminPass1!`, `paid@yomulog.test` / `PaidPass1!`,
   `regular@yomulog.test` / `P@22w0rd` — credentials from
   `services/feedbackRepo.ts`), ensures `user_subscriptions`, and sets the
   **paid row flip**: `paid@yomulog.test` gets `is_active = true`,
   `plan = 'monthly'`, `current_period_end = now() + 30 days`.
   No service-role key needed — the SQL Editor runs as postgres.
   Alternatives are documented in the file header (service-role admin API,
   or Authentication → Users → Add user).
2. **`supabase/realtime-publication.sql`** — adds `user_subscriptions` to the
   `supabase_realtime` publication so the app's `subscription-changes` channel
   (services/stripeService.ts) receives INSERT/UPDATE/DELETE events.
   Dashboard alternative: Database → Publications → `supabase_realtime` →
   tick `user_subscriptions`.
3. **`services/migrations/009_user_activity.sql`** — retention heartbeat table
   (KPI 1, G-3) with own-rows RLS.
4. **`services/migrations/010_reading_stats.sql`** — measured reading-time
   daily rollup (KPI 2, G-5) with own-rows RLS.
5. **`services/migrations/011_user_events.sql`** — premium conversion funnel
   event log (KPI 4, G-6) with own-rows RLS (write-only from the app; no
   realtime publication needed). Owner-side reporting queries live in
   **`supabase/reporting/kpi-reporting.sql`** (Q1.1–Q4.4).

## 3. Schema (derived from the app's own code — do not deviate)

All column names/types below are exactly what `services/supabaseSyncService.ts`
and `services/stripeService.ts` read/write. Supabase Auth provides `auth.users`
(id uuid PK); every table is keyed by the Supabase user id.

| Table | App usage | Critical columns |
|-------|-----------|------------------|
| `user_subscriptions` | **Premium entitlement** (stripeService fetch + realtime) | `is_active`, `plan`, `current_period_end` (drive PremiumContext); `cancel_at_period_end`, `stripe_customer_id`, `stripe_subscription_id` |
| `sync_state` | cloud sync status (1 row per user) | `status`, `last_synced_at`, `last_error`, `sync_enabled`, `scope_timestamps` (jsonb) |
| `user_library` | favorites/bookmarks (upsert on `user_id,manga_id`) | `manga_id`, `manga_title`, `manga_image`, `genres`, `bookmarked_at`, `reading_status` |
| `reading_progress` | reading history (upsert on `user_id,chapter_id`) | `chapter_id`, `manga_id`, `manga_title`, `manga_image`, `chapter_title`, `chapter_number`, `scroll_percentage`, `is_read`, `last_read_at`, `seconds_read` (measured reading time per chapter, G-4) |
| `download_queue` | offline downloads (upsert on `user_id,job_id`) | `job_id`, `chapter_id`, `manga_id`, `manga_title`, `chapter_number`, `chapter_title`, `status`, `progress`, `total_pages`, `downloaded_pages`, `error_message`, `local_dir`, `retry_count`, `created_at` |
| `user_preferences` | settings (1 row per user) | `language`, `alerts_on`, `ai_search_on`, `direction_mode` |
| `user_activity` | retention heartbeat (KPI 1, G-3) — links anonymous install to account | `install_id`, `first_launch_at`, `last_active_at` |
| `reading_stats` | measured reading time daily rollup (KPI 2, G-5) — the `'stats'` sync scope | `day`, `seconds_read` (hours/week = SUM over last 7 days) |
| `user_events` | premium conversion funnel events (KPI 4, G-6) — append-only, write-only from the app | `event_id` (idempotency key), `install_id`, `event_name`, `payload` (jsonb), `occurred_at` |

### Copy-paste DDL (SQL Editor)

```sql
-- Premium entitlement (app-critical: PremiumContext reads is_active/current_period_end)
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

-- Cloud sync state (1 row per user)
create table if not exists public.sync_state (
  user_id           uuid primary key references auth.users (id) on delete cascade,
  status            text not null default 'pending',
  last_synced_at    timestamptz,
  last_error        text,
  sync_enabled      boolean not null default false,
  scope_timestamps  jsonb not null default '{}'::jsonb,
  updated_at        timestamptz not null default now()
);

-- Favorites / library (upsert on user_id,manga_id)
create table if not exists public.user_library (
  user_id         uuid not null references auth.users (id) on delete cascade,
  manga_id        text not null,
  manga_title     text,
  manga_image     text,
  genres          text[],
  bookmarked_at   timestamptz,
  reading_status  text,
  updated_at      timestamptz not null default now(),
  primary key (user_id, manga_id)
);

-- Reading progress (upsert on user_id,chapter_id)
create table if not exists public.reading_progress (
  user_id            uuid not null references auth.users (id) on delete cascade,
  chapter_id         text not null,
  manga_id           text,
  manga_title        text,
  manga_image        text,
  chapter_title      text,
  chapter_number     numeric,
  scroll_percentage  numeric,
  is_read            boolean not null default false,
  last_read_at       timestamptz,
  seconds_read       integer not null default 0,
  primary key (user_id, chapter_id)
);

-- Offline download queue (upsert on user_id,job_id)
create table if not exists public.download_queue (
  user_id           uuid not null references auth.users (id) on delete cascade,
  job_id            text not null,
  chapter_id        text,
  manga_id          text,
  manga_title       text,
  chapter_number    numeric,
  chapter_title     text,
  status            text,
  progress          numeric,
  total_pages       integer,
  downloaded_pages  integer,
  error_message     text,
  local_dir         text,
  retry_count       integer not null default 0,
  created_at        timestamptz,
  updated_at        timestamptz not null default now(),
  primary key (user_id, job_id)
);

-- User preferences (1 row per user)
create table if not exists public.user_preferences (
  user_id         uuid primary key references auth.users (id) on delete cascade,
  language        text,
  alerts_on       boolean,
  ai_search_on    boolean,
  direction_mode  text,
  updated_at      timestamptz not null default now()
);

-- Retention heartbeat (1 row per user; KPI 1 — D30 retention, G-3).
-- install_id links the device (anonymous install) to the account; the owner
-- can join this to auth.users.created_at for signup cohorts.
create table if not exists public.user_activity (
  user_id           uuid primary key references auth.users (id) on delete cascade,
  install_id        text,
  first_launch_at   timestamptz,
  last_active_at    timestamptz,
  updated_at        timestamptz not null default now()
);

-- Measured reading time daily rollup (KPI 2 — hours/week, G-5 'stats' scope).
-- Hours/week = SUM(seconds_read) over the last 7 days, per user.
create table if not exists public.reading_stats (
  user_id        uuid not null references auth.users (id) on delete cascade,
  day            date not null,
  seconds_read   integer not null default 0,
  updated_at     timestamptz not null default now(),
  primary key (user_id, day)
);

-- Premium conversion funnel events (KPI 4 — G-6 'funnel' instrumentation).
-- Append-only, multi-row, write-only from the app (services/funnelService.ts →
-- supabaseSyncService.pushFunnelEventsToCloud). event_id is the idempotency
-- key so re-pushes upsert cleanly; install_id ties pre-signup events to the
-- device. No realtime publication needed — nothing subscribes to it.
create table if not exists public.user_events (
  user_id      uuid not null references auth.users (id) on delete cascade,
  event_id     text not null,
  install_id   text,
  event_name   text not null check (event_name in
                 ('signup_complete','paywall_viewed','checkout_started','checkout_completed')),
  payload      jsonb not null default '{}'::jsonb,
  occurred_at  timestamptz not null,
  created_at   timestamptz not null default now(),
  primary key (user_id, event_id)
);
create index if not exists idx_user_events_user_time on public.user_events (user_id, occurred_at desc);
create index if not exists idx_user_events_name on public.user_events (event_name, occurred_at);
```

The app reads/writes these tables with the **anon key**, so row-level security
must allow each user access to their own rows:

```sql
alter table public.user_subscriptions enable row level security;
create policy "own rows" on public.user_subscriptions for select using (auth.uid() = user_id);
create policy "own rows" on public.sync_state         for all using (auth.uid() = user_id);
create policy "own rows" on public.user_library       for all using (auth.uid() = user_id);
create policy "own rows" on public.reading_progress   for all using (auth.uid() = user_id);
create policy "own rows" on public.download_queue     for all using (auth.uid() = user_id);
create policy "own rows" on public.user_preferences   for all using (auth.uid() = user_id);
create policy "own rows" on public.user_activity      for all using (auth.uid() = user_id);
create policy "own rows" on public.reading_stats      for all using (auth.uid() = user_id);
create policy "own rows" on public.user_events        for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
```

## 4. Env vars at web build time

Set these where the web export/build runs (CI, `scripts/build-web.sh`, deploy):

```
EXPO_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<anon public key>
EXPO_PUBLIC_MANGADEX_PROXY_URL=https://<proxy-host>/api/mangadex   # optional, web-only
```

- **Native builds**: leave Supabase vars unset to keep sync/premium off, or set
  them to enable cloud features (they are not secrets).
- `EXPO_PUBLIC_MANGADEX_PROXY_URL` is optional and only used on web — see
  `api/mangadex/README.md`.

## 5. MangaDex CORS proxy (web) — deploy one of the two options

Both share one core (`services/proxyCore.ts`); no logic is duplicated.

**Option A — Supabase Edge Function** (already in this repo):
```bash
supabase functions deploy mangadex-proxy --project-ref <your-project>
```
→ base URL `https://<project-ref>.supabase.co/functions/v1/mangadex-proxy`

**Option B — Vercel** (see `api/mangadex/README.md`): deploy the repo with
Vercel → base URL `https://<your-host>/api/mangadex`

Then rebuild the web app with `EXPO_PUBLIC_MANGADEX_PROXY_URL` set
(`./scripts/build-web.sh <outdir>`).

## 6. Smoke test (once keys are in)

1. Sign in to the web app with `paid@yomulog.test` / `PaidPass1!` → premium
   badge/stats unlock immediately (`user_subscriptions.is_active = true`).
2. Toggle cloud sync → `sync_state` row appears for that user.
3. Flip `is_active` to `false` on the paid row in the SQL Editor → the app's
   premium UI should downgrade within seconds via the `subscription-changes`
   realtime channel.
4. `regular@yomulog.test` / `P@22w0rd` stays free; `admin@yomulog.test` /
   `AdminPass1!` is the admin account.
