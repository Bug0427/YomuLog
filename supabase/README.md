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

> ⚠️ `services/supabaseClient.ts` currently ships **hardcoded fallback** values
> for both env vars (a default project URL + anon key). Until you set the real
> env vars at build time the app may talk to that default project — set them
> explicitly (see §4).

## 2. Run the SQL scripts

Both scripts are idempotent (safe to re-run). Open **SQL Editor**, paste, Run:

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

## 3. Schema (derived from the app's own code — do not deviate)

All column names/types below are exactly what `services/supabaseSyncService.ts`
and `services/stripeService.ts` read/write. Supabase Auth provides `auth.users`
(id uuid PK); every table is keyed by the Supabase user id.

| Table | App usage | Critical columns |
|-------|-----------|------------------|
| `user_subscriptions` | **Premium entitlement** (stripeService fetch + realtime) | `is_active`, `plan`, `current_period_end` (drive PremiumContext); `cancel_at_period_end`, `stripe_customer_id`, `stripe_subscription_id` |
| `sync_state` | cloud sync status (1 row per user) | `status`, `last_synced_at`, `last_error`, `sync_enabled`, `scope_timestamps` (jsonb) |
| `user_library` | favorites/bookmarks (upsert on `user_id,manga_id`) | `manga_id`, `manga_title`, `manga_image`, `genres`, `bookmarked_at`, `reading_status` |
| `reading_progress` | reading history (upsert on `user_id,chapter_id`) | `chapter_id`, `manga_id`, `manga_title`, `manga_image`, `chapter_title`, `chapter_number`, `scroll_percentage`, `is_read`, `last_read_at` |
| `download_queue` | offline downloads (upsert on `user_id,job_id`) | `job_id`, `chapter_id`, `manga_id`, `manga_title`, `chapter_number`, `chapter_title`, `status`, `progress`, `total_pages`, `downloaded_pages`, `error_message`, `local_dir`, `retry_count`, `created_at` |
| `user_preferences` | settings (1 row per user) | `language`, `alerts_on`, `ai_search_on`, `direction_mode` |

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
