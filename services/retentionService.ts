// =============================================================================
// retentionService.ts
// G-3 retention instrumentation (KPI 1 — D30 retention).
//
// Device-level identity + activity timestamps, stored local-first in
// AsyncStorage so anonymous (non-account) users are trackable too:
//   - installId      — generated once per install, stable forever after
//   - firstLaunchAt  — set at the same moment installId is created
//   - lastActiveAt   — debounced heartbeat (app foreground / reader open)
//
// The snapshot flows to Supabase (user_activity, keyed by Supabase user id)
// when an account exists — see supabaseSyncService.pushRetentionToCloud() /
// syncRetentionReal(). This is what links an anonymous install to an account:
// once a session exists, user_activity.install_id ties the device to the user.
//
// No expo-secure-store here on purpose: the id must survive reinstalls of the
// JS layer and be readable everywhere (AsyncStorage works on all platforms
// including web, where SecureStore is an empty stub).
// =============================================================================

import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── Keys & constants ──────────────────────────────────────────────────

const INSTALL_ID_KEY = '@YomuLog:installId';
const FIRST_LAUNCH_KEY = '@YomuLog:firstLaunchAt';
const LAST_ACTIVE_KEY = '@YomuLog:lastActiveAt';

/** Persist the heartbeat at most once per minute (lightweight, debounced). */
const HEARTBEAT_MIN_INTERVAL_MS = 60_000;

// In-memory throttle so rapid foreground events don't hit AsyncStorage.
let lastHeartbeatWriteRef: number | null = null;

// ─── Types ─────────────────────────────────────────────────────────────

export type RetentionSnapshot = {
  installId: string;
  firstLaunchAt: string | null;
  lastActiveAt: string | null;
};

// ─── Helpers ───────────────────────────────────────────────────────────

function isoNow(): string {
  return new Date().toISOString();
}

async function generateInstallId(): Promise<string> {
  // Collision-resistant enough for a device id: timestamp base-36 + two random
  // segments (works on every platform, no crypto dependency needed).
  const rand =
    Math.random().toString(36).slice(2, 10) +
    Math.random().toString(36).slice(2, 10);
  return `inst_${Date.now().toString(36)}_${rand}`;
}

// ─── Public API ────────────────────────────────────────────────────────

/**
 * Get the stable per-install id, creating it (and stamping firstLaunchAt)
 * on the very first launch. Never throws — degrades to an in-memory id if
 * storage is unavailable so app boot can't fail on instrumentation.
 */
export async function getOrCreateInstallId(): Promise<string> {
  try {
    const existing = await AsyncStorage.getItem(INSTALL_ID_KEY);
    if (existing) return existing;
    const id = await generateInstallId();
    await AsyncStorage.multiSet([
      [INSTALL_ID_KEY, id],
      [FIRST_LAUNCH_KEY, isoNow()],
    ]);
    return id;
  } catch (e) {
    console.warn('retentionService: install id fallback (storage unavailable)', e);
    return `inst_${Date.now().toString(36)}`;
  }
}

/**
 * Debounced last-active heartbeat. Safe to call on every foreground / reader
 * open — writes at most once per minute. Returns the persisted ISO timestamp,
 * or null when throttled / on failure.
 */
export async function recordHeartbeat(): Promise<string | null> {
  const now = Date.now();
  if (
    lastHeartbeatWriteRef !== null &&
    now - lastHeartbeatWriteRef < HEARTBEAT_MIN_INTERVAL_MS
  ) {
    return null; // throttled in-memory
  }
  try {
    const lastPersisted = await AsyncStorage.getItem(LAST_ACTIVE_KEY);
    const lastTs = lastPersisted ? new Date(lastPersisted).getTime() : 0;
    if (now - lastTs < HEARTBEAT_MIN_INTERVAL_MS) return null; // already fresh on disk
    const iso = isoNow();
    await AsyncStorage.setItem(LAST_ACTIVE_KEY, iso);
    lastHeartbeatWriteRef = now;
    return iso;
  } catch (e) {
    console.warn('retentionService: heartbeat write failed (non-critical)', e);
    return null;
  }
}

/**
 * Full retention snapshot for this install (creates the install id when
 * missing). Used by the cloud sync path (supabaseSyncService).
 */
export async function getRetentionSnapshot(): Promise<RetentionSnapshot> {
  const installId = await getOrCreateInstallId();
  const entries = await AsyncStorage.multiGet([FIRST_LAUNCH_KEY, LAST_ACTIVE_KEY]);
  return {
    installId,
    firstLaunchAt: entries[0][1],
    lastActiveAt: entries[1][1],
  };
}
