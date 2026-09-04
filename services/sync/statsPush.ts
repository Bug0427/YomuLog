// services/sync/statsPush.ts
// KPI instrumentation pushes (H-4 split — moved verbatim from
// services/supabaseSyncService.ts lines ~434–568): retention heartbeat,
// reading-stats rollup, and funnel-events delivery. These are deliberately
// NOT premium-gated (KPI 1/2/4 must cover free + premium users).

import { supabase, isSupabaseConfigured } from '../supabaseClient';
import { getUserId, isoNow } from './types';
import { getReadingSecondsByDay, toDayKey } from '../readingSessionService';

// ─── Retention scope (G-3, KPI 1 — D30 retention) ──────────────────────

/**
 * Push the device retention snapshot (install id, first launch, last active)
 * to the user_activity table. This is what links an anonymous install to an
 * account: once a Supabase session exists, user_activity.install_id ties the
 * device to the Supabase user id, so the owner can compute install-based and
 * account-based D30 cohorts.
 */
export async function syncRetentionReal(userId: string): Promise<void> {
  const { getRetentionSnapshot } = await import('../retentionService');
  const snap = await getRetentionSnapshot();
  const { error } = await supabase
    .from('user_activity')
    .upsert({
      user_id: userId,
      install_id: snap.installId,
      first_launch_at: snap.firstLaunchAt,
      last_active_at: snap.lastActiveAt,
      updated_at: isoNow(),
    }, { onConflict: 'user_id' });
  if (error) throw new Error(`Retention push: ${error.message}`);
}

/**
 * Lightweight heartbeat push — deliberately NOT premium-gated. Retention
 * (KPI 1) must cover every authenticated user, free or premium, so the
 * last-active heartbeat + install id ride up whenever a session exists.
 * Only device-identity/activity metadata is written (no user content), so the
 * "Cloud Sync is a Premium feature" product line is untouched.
 */
export async function pushRetentionToCloud(): Promise<void> {
  if (!isSupabaseConfigured()) return;
  const userId = await getUserId();
  if (!userId) return;
  try {
    await syncRetentionReal(userId);
  } catch (e) {
    // Non-critical instrumentation — never fail the app/sync on this.
    console.warn('Retention heartbeat push failed (non-critical)', e);
  }
}

// ─── Stats scope (G-5, KPI 2 — reading engagement: hours/week) ─────────

/**
 * Push measured reading time to cloud:
 *   - reading_stats: daily-seconds rollup (last 7 days) — the 'stats' scope.
 *     Hours/week = SUM(seconds_read) over the last 7 days, queryable for the
 *     whole authenticated population.
 *   - reading_progress.seconds_read is pushed separately in syncProgressReal
 *     for per-chapter granularity (server-side SQL aggregation).
 */
export async function syncStatsReal(userId: string): Promise<void> {
  const byDay = await getReadingSecondsByDay();
  const now = isoNow();
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 6);
  cutoff.setHours(0, 0, 0, 0);
  const cutoffKey = toDayKey(cutoff);

  const rows: Array<{ user_id: string; day: string; seconds_read: number; updated_at: string }> = [];
  for (const [day, seconds] of Object.entries(byDay)) {
    if (seconds > 0 && day >= cutoffKey) {
      rows.push({ user_id: userId, day, seconds_read: seconds, updated_at: now });
    }
  }
  if (rows.length === 0) return;

  const { error } = await supabase
    .from('reading_stats')
    .upsert(rows, { onConflict: 'user_id,day' });
  if (error) throw new Error(`Stats push: ${error.message}`);
}

/**
 * Lightweight stats push — deliberately NOT premium-gated, same rationale as
 * pushRetentionToCloud: KPI 2 covers every authenticated user (free + premium)
 * and "free users invisible cloud-side" is exactly the gap this fixes. Only
 * measured reading-time rollups are written (no user content).
 */
export async function pushStatsToCloud(): Promise<void> {
  if (!isSupabaseConfigured()) return;
  const userId = await getUserId();
  if (!userId) return;
  try {
    await syncStatsReal(userId);
  } catch (e) {
    console.warn('Reading stats push failed (non-critical)', e);
  }
}

// ─── Funnel events scope (G-6, KPI 4 — premium conversion funnel) ──────

/**
 * Push the local funnel event log to the user_events table (migration 011).
 * Rows upsert on (user_id, event_id) so re-pushes after a partial failure are
 * idempotent; the local log is cleared only after a successful upsert.
 */
export async function syncFunnelEventsReal(userId: string): Promise<void> {
  const { getFunnelEventLog, clearFunnelEvents } = await import('../funnelService');
  const events = await getFunnelEventLog();
  if (events.length === 0) return;
  const rows = events.map((e) => ({
    user_id: userId,
    event_id: e.event_id,
    install_id: e.install_id,
    event_name: e.name,
    payload: e.payload,
    occurred_at: e.occurred_at,
  }));
  const { error } = await supabase
    .from('user_events')
    .upsert(rows, { onConflict: 'user_id,event_id' });
  if (error) throw new Error(`Funnel events push: ${error.message}`);
  await clearFunnelEvents(events.map((e) => e.event_id));
}

/**
 * Lightweight funnel-events push — deliberately NOT premium-gated, same
 * rationale as pushRetentionToCloud: KPI 4's conversion funnel must include
 * free users (they are the ones converting). Only instrumentation metadata
 * (event name/timestamp/payload) is written — no user content, so the "Cloud
 * Sync is a Premium feature" product line is untouched.
 */
export async function pushFunnelEventsToCloud(): Promise<void> {
  if (!isSupabaseConfigured()) return;
  const userId = await getUserId();
  if (!userId) return;
  try {
    await syncFunnelEventsReal(userId);
  } catch (e) {
    console.warn('Funnel events push failed (non-critical)', e);
  }
}