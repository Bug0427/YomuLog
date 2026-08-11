// services/supabaseSyncService.ts
// Premium Supabase Sync Engine — manages syncing local AsyncStorage data
// with real Supabase database tables for authenticated users.
//
// When Supabase is configured and user is signed in:
//   → Uses real Supabase tables (user_library, user_progress, reading_progress,
//     download_queue, sync_state, user_preferences)
//
// When Supabase is not configured or user is not signed in:
//   → Falls back to AsyncStorage mirror keys (backward compatible)
//
// Sync flow:
//   1. Read local data from AsyncStorage keys
//   2. Push local to Supabase (upsert)
//   3. Pull cloud data from Supabase
//   4. Merge using Last-Write-Wins (based on timestamps)
//   5. Write merged result back to local AsyncStorage
//   6. Update sync_state in Supabase
//
// Status states: 'synced' | 'syncing' | 'error' | 'pending'

import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, isSupabaseConfigured } from './supabaseClient';
import type { BookmarkedManga } from './favoritesService';
import type { ChapterProgress } from './readingProgress';
import { resolveMangaDexUrl } from './mangaDexProxy';
import { getCachedSubscriptionStatus } from './stripeService';

// ─── Types ───────────────────────────────────────────────────────────

export type SyncStatus = 'synced' | 'syncing' | 'error' | 'pending';

export type SyncScope = 'all' | 'favorites' | 'progress' | 'downloads' | 'stats' | 'preferences';

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

// ─── Storage keys (AsyncStorage — local only) ────────────────────────

const KEYS = {
  LOCAL_FAVORITES: '@YomuLog:favorites',
  LOCAL_PROGRESS: '@YomuLog:chapterProgress',
  LOCAL_DOWNLOAD_QUEUE: '@YomuLog:downloadQueue',
  LOCAL_DOWNLOADED: '@YomuLog:downloadedChapters',

  // Fallback cloud mirror keys (used when Supabase is unavailable)
  CLOUD_FAVORITES: '@YomuLog:cloud:favorites',
  CLOUD_PROGRESS: '@YomuLog:cloud:chapterProgress',
  CLOUD_DOWNLOAD_QUEUE: '@YomuLog:cloud:downloadQueue',
  CLOUD_DOWNLOADED: '@YomuLog:cloud:downloadedChapters',
  CLOUD_PREFERENCES: '@YomuLog:cloud:preferences',

  // Sync metadata (always in AsyncStorage as cache)
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

// ─── Auth helpers ────────────────────────────────────────────────────

async function getUserId(): Promise<string | null> {
  if (!isSupabaseConfigured()) return null;
  const { data } = await supabase.auth.getSession();
  return data.session?.user?.id ?? null;
}

async function useRealSupabase(): Promise<boolean> {
  return isSupabaseConfigured() && (await getUserId()) !== null;
}

// ─── Sync State (cached in AsyncStorage, synced to Supabase) ─────────

export async function getSyncState(): Promise<SyncState> {
  // Try Supabase first if configured
  const userId = await getUserId();
  if (userId) {
    try {
      const { data, error } = await supabase
        .from('sync_state')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();
      if (!error && data) {
        return {
          status: data.status as SyncStatus,
          lastSyncedAt: data.last_synced_at,
          lastError: data.last_error,
          syncEnabled: data.sync_enabled,
          scopeTimestamps: (data.scope_timestamps as SyncState['scopeTimestamps']) ?? {},
        };
      }
    } catch { /* fall through to local cache */ }
  }

  // Fallback to local AsyncStorage
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

  // Always cache locally
  await setJson(KEYS.SYNC_STATE, updated);

  // Push to Supabase if authenticated
  const userId = await getUserId();
  if (userId) {
    try {
      await supabase.from('sync_state').upsert({
        user_id: userId,
        status: updated.status,
        last_synced_at: updated.lastSyncedAt,
        last_error: updated.lastError,
        sync_enabled: updated.syncEnabled,
        scope_timestamps: updated.scopeTimestamps ?? {},
        updated_at: isoNow(),
      }, { onConflict: 'user_id' });
    } catch { /* non-critical, local cache is authoritative */ }
  }

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
  await setJson(KEYS.SYNC_QUEUE, queue.slice(-50));
}

async function clearQueue(): Promise<void> {
  await setJson(KEYS.SYNC_QUEUE, []);
}

// ─── LWW Merge Utility ───────────────────────────────────────────────

function mergeLWW<T extends Record<string, unknown>>(
  local: T[],
  cloud: T[],
  idKey: keyof T,
  tsKey: keyof T,
): T[] {
  const map = new Map<string, T>();
  for (const item of local) map.set(String(item[idKey]), item);
  for (const item of cloud) {
    const id = String(item[idKey]);
    const existing = map.get(id);
    if (!existing) {
      map.set(id, item);
    } else {
      const localTs = (existing[tsKey] as string) ?? '';
      const cloudTs = (item[tsKey] as string) ?? '';
      if (cloudTs > localTs) map.set(id, item);
    }
  }
  return Array.from(map.values());
}

// ─── Supabase-backed scope sync ──────────────────────────────────────

async function syncFavoritesReal(userId: string): Promise<void> {
  // --- Push local → Supabase ---
  const raw = await AsyncStorage.getItem(KEYS.LOCAL_FAVORITES);
  const local: BookmarkedManga[] = raw ? JSON.parse(raw) : [];
  if (local.length > 0) {
    const rows = local.map((f) => ({
      user_id: userId,
      manga_id: f.mangaId,
      manga_title: f.mangaTitle,
      manga_image: f.mangaImage ?? null,
      genres: f.genres ?? null,
      bookmarked_at: f.bookmarkedAt,
      reading_status: f.readingStatus,
      updated_at: isoNow(),
    }));
    const { error } = await supabase
      .from('user_library')
      .upsert(rows, { onConflict: 'user_id,manga_id' });
    if (error) throw new Error(`Favorites push: ${error.message}`);
  }

  // --- Pull Supabase → local (LWW merge) ---
  const { data, error } = await supabase
    .from('user_library')
    .select('*')
    .eq('user_id', userId)
    .order('bookmarked_at', { ascending: false });
  if (error) throw new Error(`Favorites pull: ${error.message}`);
  if (!data || data.length === 0) return;

  const localMap = new Map(local.map((f) => [f.mangaId, f]));
  for (const cloud of data) {
    const existing = localMap.get(cloud.manga_id);
    if (!existing || new Date(cloud.bookmarked_at) > new Date(existing.bookmarkedAt)) {
      localMap.set(cloud.manga_id, {
        mangaId: cloud.manga_id,
        mangaTitle: cloud.manga_title,
        mangaImage: cloud.manga_image,
        genres: cloud.genres,
        bookmarkedAt: cloud.bookmarked_at,
        readingStatus: cloud.reading_status,
      });
    }
  }
  await AsyncStorage.setItem(KEYS.LOCAL_FAVORITES, JSON.stringify(Array.from(localMap.values())));
}

async function syncProgressReal(userId: string): Promise<void> {
  // --- Push local → Supabase ---
  const raw = await AsyncStorage.getItem(KEYS.LOCAL_PROGRESS);
  const local: ChapterProgress[] = raw ? JSON.parse(raw) : [];
  if (local.length > 0) {
    const rows = local.map((p) => ({
      user_id: userId,
      chapter_id: p.chapterId,
      manga_id: p.mangaId,
      manga_title: p.mangaTitle,
      manga_image: p.mangaImage ?? null,
      chapter_title: p.chapterTitle ?? null,
      chapter_number: p.chapterNumber,
      scroll_percentage: p.scrollPercentage,
      is_read: p.isRead,
      last_read_at: p.lastReadAt,
    }));
    const { error } = await supabase
      .from('reading_progress')
      .upsert(rows, { onConflict: 'user_id,chapter_id' });
    if (error) throw new Error(`Progress push: ${error.message}`);
  }

  // --- Pull Supabase → local ---
  const { data, error } = await supabase
    .from('reading_progress')
    .select('*')
    .eq('user_id', userId)
    .order('last_read_at', { ascending: false })
    .limit(500);
  if (error) throw new Error(`Progress pull: ${error.message}`);
  if (!data || data.length === 0) return;

  const localMap = new Map(local.map((p) => [p.chapterId, p]));
  for (const cloud of data) {
    const existing = localMap.get(cloud.chapter_id);
    if (!existing || new Date(cloud.last_read_at) > new Date(existing.lastReadAt)) {
      localMap.set(cloud.chapter_id, {
        chapterId: cloud.chapter_id,
        mangaId: cloud.manga_id,
        mangaTitle: cloud.manga_title,
        mangaImage: cloud.manga_image,
        chapterTitle: cloud.chapter_title,
        chapterNumber: cloud.chapter_number,
        scrollPercentage: cloud.scroll_percentage,
        isRead: cloud.is_read,
        lastReadAt: cloud.last_read_at,
      });
    }
  }
  await AsyncStorage.setItem(KEYS.LOCAL_PROGRESS, JSON.stringify(Array.from(localMap.values())));
}

async function syncDownloadsReal(userId: string): Promise<void> {
  // --- Push local → Supabase ---
  const rawQ = await AsyncStorage.getItem(KEYS.LOCAL_DOWNLOAD_QUEUE);
  const queue: SyncPayloadDownloads['items'] = rawQ ? JSON.parse(rawQ) : [];
  if (queue.length > 0) {
    const rows = queue.map((d) => ({
      user_id: userId,
      job_id: d.jobId,
      chapter_id: d.chapterId,
      manga_id: d.mangaId,
      manga_title: d.mangaTitle,
      chapter_number: d.chapterNumber,
      chapter_title: d.chapterTitle ?? null,
      status: d.status,
      progress: d.progress,
      total_pages: d.totalPages,
      downloaded_pages: d.downloadedPages,
      error_message: d.errorMessage ?? null,
      local_dir: d.localDir ?? null,
      retry_count: d.retryCount,
      created_at: d.createdAt,
      updated_at: isoNow(),
    }));
    const { error: pushErr } = await supabase
      .from('download_queue')
      .upsert(rows, { onConflict: 'user_id,job_id' });
    if (pushErr) throw new Error(`Downloads push: ${pushErr.message}`);
  }

  // --- Pull Supabase → local ---
  const { data, error } = await supabase
    .from('download_queue')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(200);
  if (error) throw new Error(`Downloads pull: ${error.message}`);
  if (!data || data.length === 0) return;

  const localMap = new Map(queue.map((d: any) => [d.jobId, d]));
  for (const cloud of data) {
    const existing = localMap.get(cloud.job_id) as any;
    if (!existing || new Date(cloud.updated_at) > new Date(existing.updatedAt || existing.createdAt || 0)) {
      localMap.set(cloud.job_id, {
        jobId: cloud.job_id,
        chapterId: cloud.chapter_id,
        mangaId: cloud.manga_id,
        mangaTitle: cloud.manga_title,
        chapterNumber: cloud.chapter_number,
        chapterTitle: cloud.chapter_title,
        status: cloud.status,
        progress: cloud.progress,
        totalPages: cloud.total_pages,
        downloadedPages: cloud.downloaded_pages,
        errorMessage: cloud.error_message,
        localDir: cloud.local_dir,
        createdAt: cloud.created_at,
        retryCount: cloud.retry_count,
      });
    }
  }
  await AsyncStorage.setItem(KEYS.LOCAL_DOWNLOAD_QUEUE, JSON.stringify(Array.from(localMap.values())));
}

async function syncPreferencesReal(userId: string): Promise<void> {
  // --- Push local → Supabase ---
  const { loadAllPreferences } = await import('./preferencesService');
  const prefs = await loadAllPreferences();
  const { error: pushErr } = await supabase
    .from('user_preferences')
    .upsert({
      user_id: userId,
      language: prefs.language,
      alerts_on: prefs.alertsOn,
      ai_search_on: prefs.aiSearchOn,
      direction_mode: prefs.directionMode,
      updated_at: isoNow(),
    }, { onConflict: 'user_id' });
  if (pushErr) throw new Error(`Preferences push: ${pushErr.message}`);

  // --- Pull Supabase → local ---
  const { data, error: pullErr } = await supabase
    .from('user_preferences')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  if (pullErr && pullErr.code !== 'PGRST116') throw new Error(`Preferences pull: ${pullErr.message}`);
  if (!data) return;

  const { setLanguage, setAlertsOn, setAISearchOn, setDirectionMode } = await import('./preferencesService');
  await Promise.all([
    setLanguage(data.language as 'en' | 'ja' | 'ko'),
    setAlertsOn(data.alerts_on),
    setAISearchOn(data.ai_search_on),
    setDirectionMode(data.direction_mode as 'ltr' | 'rtl' | 'vertical'),
  ]);
}

// ─── Retention scope (G-3, KPI 1 — D30 retention) ──────────────────────

/**
 * Push the device retention snapshot (install id, first launch, last active)
 * to the user_activity table. This is what links an anonymous install to an
 * account: once a Supabase session exists, user_activity.install_id ties the
 * device to the Supabase user id, so the owner can compute install-based and
 * account-based D30 cohorts.
 */
async function syncRetentionReal(userId: string): Promise<void> {
  const { getRetentionSnapshot } = await import('./retentionService');
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

// ─── Fallback: AsyncStorage mirror sync (for unauthenticated users) ──

async function syncFavoritesFallback(): Promise<void> {
  const [local, cloud] = await Promise.all([
    getJson<BookmarkedManga[]>(KEYS.LOCAL_FAVORITES, []),
    getJson<BookmarkedManga[]>(KEYS.CLOUD_FAVORITES, []),
  ]);
  const merged = mergeLWW(local as any[], cloud as any[], 'mangaId', 'bookmarkedAt');
  await Promise.all([
    setJson(KEYS.LOCAL_FAVORITES, merged),
    setJson(KEYS.CLOUD_FAVORITES, merged),
  ]);
}

async function syncProgressFallback(): Promise<void> {
  const [local, cloud] = await Promise.all([
    getJson<ChapterProgress[]>(KEYS.LOCAL_PROGRESS, []),
    getJson<ChapterProgress[]>(KEYS.CLOUD_PROGRESS, []),
  ]);
  const compositeMerge = (
    local: ChapterProgress[],
    cloud: ChapterProgress[],
  ): ChapterProgress[] => {
    const map = new Map<string, ChapterProgress>();
    for (const item of local) map.set(`${item.mangaId}::${item.chapterId}`, item);
    for (const item of cloud) {
      const key = `${item.mangaId}::${item.chapterId}`;
      const existing = map.get(key);
      if (!existing || item.lastReadAt > existing.lastReadAt) {
        map.set(key, item);
      }
    }
    return Array.from(map.values());
  };
  const merged = compositeMerge(local, cloud);
  await Promise.all([
    setJson(KEYS.LOCAL_PROGRESS, merged),
    setJson(KEYS.CLOUD_PROGRESS, merged),
  ]);
}

async function syncPreferencesFallback(): Promise<void> {
  // Simple fallback: keep local prefs as truth, push to cloud mirror
  const { loadAllPreferences } = await import('./preferencesService');
  const prefs = await loadAllPreferences();
  await setJson(KEYS.CLOUD_PREFERENCES, { ...prefs, updatedAt: isoNow() });
}

async function syncDownloadsFallback(): Promise<void> {
  const [localQ, cloudQ] = await Promise.all([
    getJson<any[]>(KEYS.LOCAL_DOWNLOAD_QUEUE, []),
    getJson<any[]>(KEYS.CLOUD_DOWNLOAD_QUEUE, []),
  ]);
  const merged = mergeLWW(localQ, cloudQ, 'jobId', 'createdAt');
  await Promise.all([
    setJson(KEYS.LOCAL_DOWNLOAD_QUEUE, merged),
    setJson(KEYS.CLOUD_DOWNLOAD_QUEUE, merged),
  ]);
}

// ─── Public API ──────────────────────────────────────────────────────

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

export async function isSyncEnabled(): Promise<boolean> {
  const state = await getSyncState();
  return state.syncEnabled;
}

/**
 * Perform a full sync of all scopes.
 * Uses real Supabase when authenticated, falls back to AsyncStorage mirrors.
 */
export async function performFullSync(): Promise<SyncState> {
  const state = await getSyncState();
  if (!state.syncEnabled) return state;

  await saveSyncState({ status: 'syncing', lastError: null });

  const isRealSync = await useRealSupabase();
  // G-4: Real cloud sync is a Premium feature. UI layers gate first
  // (useSyncEngine, SettingsScreen); this service-level check is defense in
  // depth so a stale `syncEnabled` from a lapsed subscription can never push
  // data to Supabase. Local AsyncStorage mirror sync stays available.
  if (isRealSync) {
    const cachedStatus = await getCachedSubscriptionStatus();
    if (!cachedStatus.isActive) {
      return await saveSyncState({
        status: 'error',
        lastError: 'Cloud Sync requires an active Premium subscription',
      });
    }
  }

  try {
    if (isRealSync) {
      const userId = (await getUserId())!;
      // G-3: retention metadata (install id / first launch / last active)
      // rides the real sync path too. Non-fatal by design.
      await pushRetentionToCloud();
      const results = await Promise.allSettled([
        syncFavoritesReal(userId).then(() => 'favorites' as SyncScope),
        syncProgressReal(userId).then(() => 'progress' as SyncScope),
        syncDownloadsReal(userId).then(() => 'downloads' as SyncScope),
        syncPreferencesReal(userId).then(() => 'preferences' as SyncScope),
      ]);

      const errors = results
        .filter((r): r is PromiseRejectedResult => r.status === 'rejected')
        .map((r) => (r.reason instanceof Error ? r.reason.message : String(r.reason)));

      const syncedAt = isoNow();
      const scopeTimestamps: SyncState['scopeTimestamps'] = {};
      for (const r of results) {
        if (r.status === 'fulfilled') scopeTimestamps[r.value] = syncedAt;
      }

      if (errors.length > 0) {
        return await saveSyncState({
          status: 'error',
          lastError: errors.join('; '),
          lastSyncedAt: syncedAt,
          scopeTimestamps: { ...state.scopeTimestamps, ...scopeTimestamps },
        });
      }

      await clearQueue();
      return await saveSyncState({
        status: 'synced',
        lastSyncedAt: syncedAt,
        lastError: null,
        scopeTimestamps: { ...state.scopeTimestamps, ...scopeTimestamps },
      });
    } else {
      // Fallback: AsyncStorage mirrors
      const results = await Promise.allSettled([
        syncFavoritesFallback().then(() => 'favorites' as SyncScope),
        syncProgressFallback().then(() => 'progress' as SyncScope),
        syncDownloadsFallback().then(() => 'downloads' as SyncScope),
        syncPreferencesFallback().then(() => 'preferences' as SyncScope),
      ]);

      const errors = results
        .filter((r): r is PromiseRejectedResult => r.status === 'rejected')
        .map((r) => (r.reason instanceof Error ? r.reason.message : String(r.reason)));

      const syncedAt = isoNow();
      const scopeTimestamps: SyncState['scopeTimestamps'] = {};
      for (const r of results) {
        if (r.status === 'fulfilled') scopeTimestamps[r.value] = syncedAt;
      }

      if (errors.length > 0) {
        return await saveSyncState({
          status: 'error',
          lastError: errors.join('; '),
          lastSyncedAt: syncedAt,
          scopeTimestamps: { ...state.scopeTimestamps, ...scopeTimestamps },
        });
      }

      await clearQueue();
      return await saveSyncState({
        status: 'synced',
        lastSyncedAt: syncedAt,
        lastError: null,
        scopeTimestamps: { ...state.scopeTimestamps, ...scopeTimestamps },
      });
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown sync error';
    return await saveSyncState({ status: 'error', lastError: msg });
  }
}

export async function queueSync(scope: SyncScope): Promise<void> {
  await enqueue(scope);
  const state = await getSyncState();
  if (state.status !== 'syncing' && state.syncEnabled) {
    await performFullSync();
  }
}

export async function processQueue(): Promise<SyncState> {
  const queue = await getSyncQueue();
  if (queue.length === 0) return getSyncState();
  return await performFullSync();
}

/**
 * Migrate existing AsyncStorage mirror data to Supabase on first sync.
 * Safe to call multiple times — skips if already migrated or not authenticated.
 */
export async function migrateLocalToSupabase(): Promise<{ migrated: number; error?: string }> {
  const userId = await getUserId();
  if (!userId || !isSupabaseConfigured()) {
    return { migrated: 0, error: 'Not authenticated or Supabase not configured' };
  }

  let count = 0;
  try {
    // Check if sync_state already exists for this user (skip if so)
    const { data: existing } = await supabase
      .from('sync_state')
      .select('user_id')
      .eq('user_id', userId)
      .maybeSingle();

    if (!existing) {
      // First-time migration: push all local data to Supabase
      await syncFavoritesReal(userId);
      await syncProgressReal(userId);
      await syncDownloadsReal(userId);
      await syncPreferencesReal(userId);

      // Count migrated items
      const [favs, progress] = await Promise.all([
        AsyncStorage.getItem(KEYS.LOCAL_FAVORITES),
        AsyncStorage.getItem(KEYS.LOCAL_PROGRESS),
      ]);
      const favCount = favs ? JSON.parse(favs).length : 0;
      const progCount = progress ? JSON.parse(progress).length : 0;
      count = favCount + progCount;
    }

    return { migrated: count };
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Migration failed';
    return { migrated: 0, error: msg };
  }
}

export async function pushLocalToCloud(): Promise<SyncState> {
  const state = await getSyncState();
  if (!state.syncEnabled) return state;

  await saveSyncState({ status: 'syncing', lastError: null });

  try {
    const isRealSync = await useRealSupabase();
    if (isRealSync) {
      const userId = (await getUserId())!;
      // G-3: retention metadata rides the push path too (non-fatal by design).
      await pushRetentionToCloud();
      await Promise.all([
        syncFavoritesReal(userId),
        syncProgressReal(userId),
        syncDownloadsReal(userId),
        syncPreferencesReal(userId),
      ]);
    } else {
      const [favs, progress, dlQ] = await Promise.all([
        getJson(KEYS.LOCAL_FAVORITES, []),
        getJson(KEYS.LOCAL_PROGRESS, []),
        getJson(KEYS.LOCAL_DOWNLOAD_QUEUE, []),
      ]);
      await Promise.all([
        setJson(KEYS.CLOUD_FAVORITES, favs),
        setJson(KEYS.CLOUD_PROGRESS, progress),
        setJson(KEYS.CLOUD_DOWNLOAD_QUEUE, dlQ),
      ]);
      await syncPreferencesFallback();
    }

    const syncedAt = isoNow();
    return await saveSyncState({
      status: 'synced',
      lastSyncedAt: syncedAt,
      lastError: null,
      scopeTimestamps: { favorites: syncedAt, progress: syncedAt, downloads: syncedAt, preferences: syncedAt },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown sync error';
    return await saveSyncState({ status: 'error', lastError: msg });
  }
}

export async function pullCloudToLocal(): Promise<SyncState> {
  const state = await getSyncState();
  if (!state.syncEnabled) return state;

  await saveSyncState({ status: 'syncing', lastError: null });

  try {
    const isRealSync = await useRealSupabase();
    if (isRealSync) {
      const userId = (await getUserId())!;
      await Promise.all([
        syncFavoritesReal(userId),
        syncProgressReal(userId),
        syncDownloadsReal(userId),
        syncPreferencesReal(userId),
      ]);
    } else {
      const [cloudFavs, cloudProgress, cloudDlQ, cloudPrefs] = await Promise.all([
        getJson(KEYS.CLOUD_FAVORITES, []),
        getJson(KEYS.CLOUD_PROGRESS, []),
        getJson(KEYS.CLOUD_DOWNLOAD_QUEUE, []),
        getJson<any>(KEYS.CLOUD_PREFERENCES, null),
      ]);
      await Promise.all([
        setJson(KEYS.LOCAL_FAVORITES, cloudFavs),
        setJson(KEYS.LOCAL_PROGRESS, cloudProgress),
        setJson(KEYS.LOCAL_DOWNLOAD_QUEUE, cloudDlQ),
      ]);
      if (cloudPrefs) {
        const { setLanguage, setAlertsOn, setAISearchOn, setDirectionMode } = await import('./preferencesService');
        await Promise.all([
          setLanguage(cloudPrefs.language as 'en' | 'ja' | 'ko'),
          setAlertsOn(cloudPrefs.alerts_on),
          setAISearchOn(cloudPrefs.ai_search_on),
          setDirectionMode(cloudPrefs.direction_mode as 'ltr' | 'rtl' | 'vertical'),
        ]);
      }
    }

    const syncedAt = isoNow();
    return await saveSyncState({
      status: 'synced',
      lastSyncedAt: syncedAt,
      lastError: null,
      scopeTimestamps: { favorites: syncedAt, progress: syncedAt, downloads: syncedAt, preferences: syncedAt },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown sync error';
    return await saveSyncState({ status: 'error', lastError: msg });
  }
}

export async function resetSync(): Promise<void> {
  const userId = await getUserId();
  if (userId) {
    try {
      await Promise.all([
        supabase.from('user_library').delete().eq('user_id', userId),
        supabase.from('reading_progress').delete().eq('user_id', userId),
        supabase.from('download_queue').delete().eq('user_id', userId),
        supabase.from('sync_state').delete().eq('user_id', userId),
        supabase.from('user_preferences').delete().eq('user_id', userId),
      ]);
    } catch { /* best effort */ }
  }

  // Clear local cloud mirrors
  await Promise.all([
    AsyncStorage.removeItem(KEYS.CLOUD_FAVORITES),
    AsyncStorage.removeItem(KEYS.CLOUD_PROGRESS),
    AsyncStorage.removeItem(KEYS.CLOUD_DOWNLOAD_QUEUE),
    AsyncStorage.removeItem(KEYS.CLOUD_DOWNLOADED),
    AsyncStorage.removeItem(KEYS.CLOUD_PREFERENCES),
    AsyncStorage.removeItem(KEYS.SYNC_STATE),
    AsyncStorage.removeItem(KEYS.SYNC_QUEUE),
  ]);
}

/**
 * Check if the device has internet connectivity.
 * Pings MangaDex via the shared resolver so the check also works on web
 * (direct api.mangadex.org is CORS-blocked in the browser, which would
 * otherwise make every sync attempt report "offline").
 */
export async function checkConnectivity(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    const res = await fetch(resolveMangaDexUrl('/ping'), {
      method: 'HEAD',
      signal: controller.signal,
    });
    clearTimeout(timeout);
    return res.ok;
  } catch {
    return false;
  }
}

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
