// services/funnelService.ts
// G-6 premium conversion funnel events (KPI 4 — Premium Conversion Rate).
//
// Lightweight, local-first event log recording the premium funnel steps:
//   signup_complete → paywall_viewed → checkout_started → checkout_completed
//
// Mirrors retentionService's AsyncStorage pattern: events are recorded
// locally (works for anonymous and free users alike), then pushed to
// Supabase (user_events table, migration 011) by
// supabaseSyncService.pushFunnelEventsToCloud() once a session exists. The
// install_id rides along so pre-signup events get attributed to the user who
// signs up on this device (spec §2.1).
//
// Deliberately non-blocking: recordFunnelEvent is fire-and-forget — callers
// never await it and storage failures degrade to a console.warn at most, so
// instrumentation can never break the checkout/premium flow it observes.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { getOrCreateInstallId } from './retentionService';

// ─── Keys & constants ──────────────────────────────────────────────────

const EVENT_LOG_KEY = '@YomuLog:eventLog';

/** Cap the local event log so a never-synced install can't grow unbounded. */
const EVENT_LOG_MAX = 500;

// ─── Types ─────────────────────────────────────────────────────────────

export type FunnelEventName =
  | 'signup_complete'
  | 'paywall_viewed'
  | 'checkout_started'
  | 'checkout_completed';

export type FunnelEvent = {
  /** Idempotency key: `${name}_${ts36}_${rand}` — upsert PK (user_id, event_id). */
  event_id: string;
  name: FunnelEventName;
  /** ISO timestamp of when the event happened (client clock). */
  occurred_at: string;
  /** Stable per-install id (G-3) — ties pre-signup events to the device. */
  install_id: string;
  payload: Record<string, unknown>;
};

// ─── E5 dedupe ─────────────────────────────────────────────────────────

/**
 * Last recorded subscription id for checkout_completed. Realtime and the
 * foreground refresh can both observe the same conversion; the write is
 * skipped if the same subscription id was already recorded (spec §2.4), so a
 * single conversion can never double-count.
 */
let lastSubscriptionIdRef: string | null = null;

// ─── Helpers ───────────────────────────────────────────────────────────

async function readLog(): Promise<FunnelEvent[]> {
  try {
    const raw = await AsyncStorage.getItem(EVENT_LOG_KEY);
    return raw ? (JSON.parse(raw) as FunnelEvent[]) : [];
  } catch {
    return [];
  }
}

async function writeLog(events: FunnelEvent[]): Promise<void> {
  await AsyncStorage.setItem(EVENT_LOG_KEY, JSON.stringify(events));
}

function generateEventId(name: string): string {
  // Same generator style as retentionService's install id: timestamp base-36
  // + random segments — collision-resistant, works on every platform.
  const rand =
    Math.random().toString(36).slice(2, 10) +
    Math.random().toString(36).slice(2, 10);
  return `${name}_${Date.now().toString(36)}_${rand}`;
}

// ─── Public API ────────────────────────────────────────────────────────

/**
 * Record a funnel event. Fire-and-forget — never throws; callers may `void`
 * the returned promise. Deduplicates checkout_completed per subscription id
 * so Realtime + refreshStatus can't double-count one conversion.
 */
export async function recordFunnelEvent(
  name: FunnelEventName,
  payload: Record<string, unknown> = {},
): Promise<void> {
  try {
    // E5 dedupe: at most one checkout_completed per subscription id.
    if (name === 'checkout_completed') {
      const subId = payload.subscriptionId;
      if (typeof subId === 'string' && subId === lastSubscriptionIdRef) {
        return;
      }
      if (typeof subId === 'string') lastSubscriptionIdRef = subId;
    }

    const log = await readLog();
    log.push({
      event_id: generateEventId(name),
      name,
      occurred_at: new Date().toISOString(),
      install_id: await getOrCreateInstallId(),
      payload,
    });

    // Prune: keep only the newest EVENT_LOG_MAX entries.
    const pruned = log.length > EVENT_LOG_MAX ? log.slice(-EVENT_LOG_MAX) : log;
    await writeLog(pruned);
  } catch (e) {
    console.warn('funnelService: event record failed (non-critical)', e);
  }
}

/** Full local event log — used by the cloud push path and local spot-checks. */
export async function getFunnelEventLog(): Promise<FunnelEvent[]> {
  return readLog();
}

/** Remove already-pushed events (called after a successful cloud upsert). */
export async function clearFunnelEvents(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  try {
    const log = await readLog();
    const idSet = new Set(ids);
    await writeLog(log.filter((e) => !idSet.has(e.event_id)));
  } catch (e) {
    console.warn('funnelService: clear failed (non-critical)', e);
  }
}
