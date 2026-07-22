// services/supabaseSyncService.ts
// Premium Supabase Sync Engine — manages syncing local AsyncStorage library
// states, recently read history, and download logs with a simulated cloud DB.
//
// Sync flow:
//   1. Read local data from AsyncStorage keys
//   2. Read "cloud" data from a mirror key set (simulating Supabase)
//   3. Merge using Last-Write-Wins (based on lastReadAt / updatedAt timestamps)
//   4. Push merged result back to both local and "cloud" stores
//   5. Update sync status and last-synced timestamp
//
// Status states: 'synced' | 'syncing' | 'error' | 'pending'

import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── Types ───────────────────────────────────────────────────────────

export type SyncStatus = 'synced' | 'syncing' | 'error' | 'pending';

export type SyncScope = 'all' | 'favorites' | 'progress' | 'downloads' | 'stats';

export type SyncState = {
  status: SyncStatus;
  lastSyncedAt: string | null;
  lastError: string | null;
  syncEnabled: boolean;
  /** Per-scope last-synced timestamps */
  scopeTimestamps: Partial<Record<SyncScope, string>>;
};

export type SyncQueueItem = {
  id: string;
  scope: SyncScope;
  queuedAt: string;
  attempts: number;
};

export type ConflictResolution = 'lastWriteWins' | 'localWins' | 'cloudWins';

// ─── Local data snapshots (for sync payload) ────────────────────────

export type SyncPayloadFavorites = {
  updatedAt: string; // most recent bookmarkedAt in the list
  items: Array<{
    mangaId: string;
    mangaTitle: string;
    mangaImage?: string;
    genres?: string[];
    bookmarkedAt: string;
    readingStatus: string;
  }>;
};

export type SyncPayloadProgress = {
  updatedAt: string; // most recent lastReadAt in the list
  items: Array<{
    chapterId: string;
    mangaId: string;
    mangaTitle: string;
    mangaImage?: string;
    chapterTitle?: string;
    chapterNumber: number;
    scrollPercentage: number;
    isRead: boolean;
    lastReadAt: string;
  }>;
};

export type SyncPayloadDownloads = {
  updatedAt: string;
  items: Array<{
    jobId: string;
    chapterId: string;
    mangaId: string;
    mangaTitle: string;
    chapterNumber: string;
    chapterTitle?: string;
    status: string;
    progress: number;
    totalPages: number;
    downloadedPages: number;
    errorMessage?: string;
    createdAt: string;
    retryCount: number;
    localDir?: string;
  }>;
};

export type SyncPayloadStats = {
  updatedAt: string;
  totalChaptersRead: number;
  totalChaptersStarted: number;
  totalSeriesRead: number;
  totalSeriesCompleted: number;
  completionRate: number;
  estimatedReadingMinutes: number;
  readingStreakDays: number;
  averageScrollDepth: number;
  favoriteReadingDay: number;
};

// ─── Storage keys ────────────────────────────────────────────────────

const KEYS = {
  // Local stores (existing app keys)
  LOCAL_FAVORITES: '@YomuLog:favorites',
  LOCAL_PROGRESS: '@YomuLog:chapterProgress',
  LOCAL_DOWNLOAD_QUEUE: '@YomuLog:downloadQueue',
  LOCAL_DOWNLOADED: '@YomuLog:downloadedChapters',

  // Simulated cloud mirror keys
  CLOUD_FAVORITES: '@YomuLog:cloud:favorites',
  CLOUD_PROGRESS: '@YomuLog:cloud:chapterProgress',
  CLOUD_DOWNLOAD_QUEUE: '@YomuLog:cloud:downloadQueue',
  CLOUD_DOWNLOADED: '@YomuLog:cloud:downloadedChapters',

  // Sync metadata
  SYNC_STATE: '@YomuLog:syncState',
  SYNC_QUEUE: '@YomuLog:syncQueue',
};

// ─── Helpers ─────────────────────────────────────────────────────────

async function getJson<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function setJson<T>(key: string, value: T): Promise<void> {
  return AsyncStorage.setItem(key, JSON.stringify(value));
}

function isoNow(): string {
  return new Date().toISOString();
}

/** Extract most recent timestamp from a list of timestamped items. */
function newestTs(items: Array<{ lastReadAt?: string; bookmarkedAt?: string; createdAt?: string; updatedAt?: string }>): string {
  let best = '';
  for (const it of items) {
    const ts = it.lastReadAt ?? it.bookmarkedAt ?? it.createdAt ?? it.updatedAt ?? '';
    if (ts > best) best = ts;
  }
  return best || isoNow();
}

// ─── Sync State ──────────────────────────────────────────────────────

export async function getSyncState(): Promise<SyncState> {
  return getJson<SyncState>(KEYS.SYNC_STATE, {
    status: 'pending',
    lastSyncedAt: null,
    lastError: null,
    syncEnabled: false,
    scopeTimestamps: {},
  });
}

async function saveSyncState(partial: Partial<SyncState>): Promise<SyncState> {
  const current = await getSyncState();
  const updated: SyncState = { ...current, ...partial };
  await setJson(KEYS.SYNC_STATE, updated);
  return updated;
}

// ─── Sync Queue ──────────────────────────────────────────────────────

export async function getSyncQueue(): Promise<SyncQueueItem[]> {
  return getJson<SyncQueueItem[]>(KEYS.SYNC_QUEUE, []);
}

async function enqueue(scope: SyncScope): Promise<void> {
  const queue = await getSyncQueue();
  queue.push({
    id: `${scope}-${Date.now()}`,
    scope,
    queuedAt: isoNow(),
    attempts: 0,
  });
  // Keep max 50 queue items
  await setJson(KEYS.SYNC_QUEUE, queue.slice(-50));
}

async function clearQueue(): Promise<void> {
  await setJson(KEYS.SYNC_QUEUE, []);
}

// ─── Last-Write-Wins merger ──────────────────────────────────────────

/**
 * Merge two arrays of items keyed by `idKey`, keeping the version with
 * the most recent `tsKey` timestamp. When both have the same timestamp,
 * local wins.
 */
function mergeLWW<T extends Record<string, unknown>>(
  local: T[],
  cloud: T[],
  idKey: keyof T,
  tsKey: keyof T,
): T[] {
  const map = new Map<string, T>();

  for (const item of local) {
    const id = String(item[idKey]);
    map.set(id, item);
  }

  for (const item of cloud) {
    const id = String(item[idKey]);
    const existing = map.get(id);
    if (!existing) {
      map.set(id, item);
    } else {
      const localTs = (existing[tsKey] as string) ?? '';
      const cloudTs = (item[tsKey] as string) ?? '';
      // Local wins on ties
      if (cloudTs > localTs) {
        map.set(id, item);
      }
    }
  }

  return Array.from(map.values());
}

// ─── Scope syncing ───────────────────────────────────────────────────

async function syncFavorites(): Promise<void> {
  const [local, cloud] = await Promise.all([
    getJson<SyncPayloadFavorites['items']>(KEYS.LOCAL_FAVORITES, []),
    getJson<SyncPayloadFavorites['items']>(KEYS.CLOUD_FAVORITES, []),
  ]);

  const merged = mergeLWW(local, cloud, 'mangaId', 'bookmarkedAt');

  await Promise.all([
    setJson(KEYS.LOCAL_FAVORITES, merged),
    setJson(KEYS.CLOUD_FAVORITES, merged),
  ]);
}

async function syncProgress(): Promise<void> {
  const [local, cloud] = await Promise.all([
    getJson<SyncPayloadProgress['items']>(KEYS.LOCAL_PROGRESS, []),
    getJson<SyncPayloadProgress['items']>(KEYS.CLOUD_PROGRESS, []),
  ]);

  // Use composite key: mangaId + chapterId
  const merged = mergeLWWByComposite(
    local,
    cloud,
    (item) => `${item.mangaId}::${item.chapterId}`,
    'lastReadAt',
  );

  await Promise.all([
    setJson(KEYS.LOCAL_PROGRESS, merged),
    setJson(KEYS.CLOUD_PROGRESS, merged),
  ]);
}

async function syncDownloads(): Promise<void> {
  const [localQ, cloudQ] = await Promise.all([
    getJson<SyncPayloadDownloads['items']>(KEYS.LOCAL_DOWNLOAD_QUEUE, []),
    getJson<SyncPayloadDownloads['items']>(KEYS.CLOUD_DOWNLOAD_QUEUE, []),
  ]);
  const [localD, cloudD] = await Promise.all([
    getJson<SyncPayloadDownloads['items']>(KEYS.LOCAL_DOWNLOADED, []),
    getJson<SyncPayloadDownloads['items']>(KEYS.CLOUD_DOWNLOADED, []),
  ]);

  const mergedQ = mergeLWW(localQ, cloudQ, 'jobId', 'createdAt');
  const mergedD = mergeLWW(localD, cloudD, 'chapterId', 'createdAt');

  await Promise.all([
    setJson(KEYS.LOCAL_DOWNLOAD_QUEUE, mergedQ),
    setJson(KEYS.CLOUD_DOWNLOAD_QUEUE, mergedQ),
    setJson(KEYS.LOCAL_DOWNLOADED, mergedD),
    setJson(KEYS.CLOUD_DOWNLOADED, mergedD),
  ]);
}

/** LWW merge where the key is computed via a composite function. */
function mergeLWWByComposite<T extends Record<string, unknown>>(
  local: T[],
  cloud: T[],
  keyFn: (item: T) => string,
  tsKey: keyof T,
): T[] {
  const map = new Map<string, T>();

  for (const item of local) {
    map.set(keyFn(item), item);
  }

  for (const item of cloud) {
    const key = keyFn(item);
    const existing = map.get(key);
    if (!existing) {
      map.set(key, item);
    } else {
      const localTs = (existing[tsKey] as string) ?? '';
      const cloudTs = (item[tsKey] as string) ?? '';
      if (cloudTs > localTs) {
        map.set(key, item);
      }
    }
  }

  return Array.from(map.values());
}

// ─── Public API ──────────────────────────────────────────────────────

/**
 * Enable or disable cloud sync.
 * When enabling, performs an immediate full sync.
 */
export async function setSyncEnabled(enabled: boolean): Promise<SyncState> {
  if (enabled) {
    await saveSyncState({ syncEnabled: true, status: 'syncing' });
    try {
      await performFullSync();
      return await saveSyncState({ status: 'synced', lastSyncedAt: isoNow(), lastError: null });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unknown sync error';
      return await saveSyncState({ status: 'error', lastError: msg });
    }
  } else {
    return await saveSyncState({ syncEnabled: false, status: 'pending' });
  }
}

/**
 * Check if sync is enabled (convenience).
 */
export async function isSyncEnabled(): Promise<boolean> {
  const state = await getSyncState();
  return state.syncEnabled;
}

/**
 * Perform a full sync of all scopes.
 * Manages status transitions: pending → syncing → synced | error.
 */
export async function performFullSync(): Promise<SyncState> {
  const state = await getSyncState();
  if (!state.syncEnabled) {
    return state;
  }

  // Set syncing
  await saveSyncState({ status: 'syncing', lastError: null });

  try {
    // Sync all scopes in parallel
    const results = await Promise.allSettled([
      syncFavorites().then(() => 'favorites' as SyncScope),
      syncProgress().then(() => 'progress' as SyncScope),
      syncDownloads().then(() => 'downloads' as SyncScope),
    ]);

    // Collect any errors
    const errors = results
      .filter((r): r is PromiseRejectedResult => r.status === 'rejected')
      .map((r) => (r.reason instanceof Error ? r.reason.message : String(r.reason)));

    const syncedAt = isoNow();
    const scopeTimestamps: SyncState['scopeTimestamps'] = {};

    for (const r of results) {
      if (r.status === 'fulfilled') {
        scopeTimestamps[r.value] = syncedAt;
      }
    }

    if (errors.length > 0) {
      const combined = errors.join('; ');
      return await saveSyncState({
        status: 'error',
        lastError: combined,
        lastSyncedAt: syncedAt,
        scopeTimestamps: { ...state.scopeTimestamps, ...scopeTimestamps },
      });
    }

    // Queue is cleared after successful full sync
    await clearQueue();

    return await saveSyncState({
      status: 'synced',
      lastSyncedAt: syncedAt,
      lastError: null,
      scopeTimestamps: { ...state.scopeTimestamps, ...scopeTimestamps },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown sync error';
    return await saveSyncState({ status: 'error', lastError: msg });
  }
}

/**
 * Queue a scope for sync. The actual sync happens when performFullSync
 * or processQueue is called. Useful for debounced auto-sync.
 */
export async function queueSync(scope: SyncScope): Promise<void> {
  await enqueue(scope);
  const state = await getSyncState();
  if (state.status !== 'syncing' && state.syncEnabled) {
    // If not currently syncing and sync is enabled, process immediately
    await performFullSync();
  }
}

/**
 * Process the pending sync queue.
 */
export async function processQueue(): Promise<SyncState> {
  const queue = await getSyncQueue();
  if (queue.length === 0) return getSyncState();

  return await performFullSync();
}

/**
 * Push current local data to cloud without merging (force-push).
 * Used when local is considered the source of truth.
 */
export async function pushLocalToCloud(): Promise<SyncState> {
  const state = await getSyncState();
  if (!state.syncEnabled) return state;

  await saveSyncState({ status: 'syncing', lastError: null });

  try {
    const [favs, progress, dlQueue, dlDone] = await Promise.all([
      getJson(KEYS.LOCAL_FAVORITES, []),
      getJson(KEYS.LOCAL_PROGRESS, []),
      getJson(KEYS.LOCAL_DOWNLOAD_QUEUE, []),
      getJson(KEYS.LOCAL_DOWNLOADED, []),
    ]);

    await Promise.all([
      setJson(KEYS.CLOUD_FAVORITES, favs),
      setJson(KEYS.CLOUD_PROGRESS, progress),
      setJson(KEYS.CLOUD_DOWNLOAD_QUEUE, dlQueue),
      setJson(KEYS.CLOUD_DOWNLOADED, dlDone),
    ]);

    const syncedAt = isoNow();
    return await saveSyncState({
      status: 'synced',
      lastSyncedAt: syncedAt,
      lastError: null,
      scopeTimestamps: {
        favorites: syncedAt,
        progress: syncedAt,
        downloads: syncedAt,
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown sync error';
    return await saveSyncState({ status: 'error', lastError: msg });
  }
}

/**
 * Pull cloud data down to local (force-pull). Overwrites local.
 */
export async function pullCloudToLocal(): Promise<SyncState> {
  const state = await getSyncState();
  if (!state.syncEnabled) return state;

  await saveSyncState({ status: 'syncing', lastError: null });

  try {
    const [cloudFavs, cloudProgress, cloudDlQ, cloudDlDone] = await Promise.all([
      getJson(KEYS.CLOUD_FAVORITES, []),
      getJson(KEYS.CLOUD_PROGRESS, []),
      getJson(KEYS.CLOUD_DOWNLOAD_QUEUE, []),
      getJson(KEYS.CLOUD_DOWNLOADED, []),
    ]);

    await Promise.all([
      setJson(KEYS.LOCAL_FAVORITES, cloudFavs),
      setJson(KEYS.LOCAL_PROGRESS, cloudProgress),
      setJson(KEYS.LOCAL_DOWNLOAD_QUEUE, cloudDlQ),
      setJson(KEYS.LOCAL_DOWNLOADED, cloudDlDone),
    ]);

    const syncedAt = isoNow();
    return await saveSyncState({
      status: 'synced',
      lastSyncedAt: syncedAt,
      lastError: null,
      scopeTimestamps: {
        favorites: syncedAt,
        progress: syncedAt,
        downloads: syncedAt,
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown sync error';
    return await saveSyncState({ status: 'error', lastError: msg });
  }
}

/**
 * Reset all sync state and clear cloud data.
 */
export async function resetSync(): Promise<void> {
  await Promise.all([
    AsyncStorage.removeItem(KEYS.CLOUD_FAVORITES),
    AsyncStorage.removeItem(KEYS.CLOUD_PROGRESS),
    AsyncStorage.removeItem(KEYS.CLOUD_DOWNLOAD_QUEUE),
    AsyncStorage.removeItem(KEYS.CLOUD_DOWNLOADED),
    AsyncStorage.removeItem(KEYS.SYNC_STATE),
    AsyncStorage.removeItem(KEYS.SYNC_QUEUE),
  ]);
}

/**
 * Format a timestamp for display in the UI.
 */
export function formatSyncTimestamp(iso: string | null): string {
  if (!iso) return 'Never';
  const d = new Date(iso);
  const now = new Date();
  const diffSec = Math.floor((now.getTime() - d.getTime()) / 1000);

  if (diffSec < 60) return 'Just now';
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;

  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}
