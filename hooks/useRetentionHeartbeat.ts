// hooks/useRetentionHeartbeat.ts
// G-3 retention heartbeat (KPI 1 — D30 retention).
//
// Mounted once at the app root. Responsibilities:
//   1. Boot: ensure the install id exists (created on first launch) and stamp
//      the first heartbeat.
//   2. AppState 'active' → record a debounced last-active heartbeat.
//   3. When a Supabase session exists, push the retention snapshot (install id,
//      first launch, last active) to user_activity — throttled so a cold app
//      open doesn't spam the network. This push is intentionally NOT
//      premium-gated: retention must cover every authenticated user
//      (see pushRetentionToCloud docs).
//
// The heartbeat is deliberately separate from useSyncEngine (premium cloud
// sync): anonymous and free users are invisible to the premium sync path, so
// retention needs its own lightweight, non-blocking channel.

import { useEffect, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import {
  getOrCreateInstallId,
  recordHeartbeat,
} from '../services/retentionService';
import {
  pushFunnelEventsToCloud,
  pushRetentionToCloud,
  pushStatsToCloud,
} from '../services/supabaseSyncService';

/** Push the cloud heartbeat at most once every 5 minutes per session. */
const CLOUD_PUSH_MIN_INTERVAL_MS = 5 * 60_000;

export function useRetentionHeartbeat() {
  const lastCloudPushRef = useRef<number>(0);

  useEffect(() => {
    let cancelled = false;

    const onActive = async () => {
      // Local-first: install id + debounced last-active (cheap, always runs).
      await getOrCreateInstallId();
      await recordHeartbeat();

      // Cloud: only when a session exists; both pushes no-op otherwise.
      // Retention (G-3) + measured reading-time stats (G-5) ride the same
      // foreground channel so free AND premium users stay visible cloud-side.
      const now = Date.now();
      if (now - lastCloudPushRef.current >= CLOUD_PUSH_MIN_INTERVAL_MS) {
        lastCloudPushRef.current = now;
        try {
          await pushRetentionToCloud();
          await pushStatsToCloud();
          // G-6: funnel events (paywall→checkout→conversion, KPI 4) ride the
          // same non-premium-gated foreground channel — free users convert too.
          await pushFunnelEventsToCloud();
        } catch {
          // Non-critical instrumentation — retry on next foreground.
        }
      }
    };

    // First launch / app start.
    onActive();

    const sub = AppState.addEventListener('change', (next: AppStateStatus) => {
      if (next === 'active' && !cancelled) onActive();
    });
    return () => {
      cancelled = true;
      sub.remove();
    };
  }, []);
}
