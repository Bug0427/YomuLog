// services/sync/syncCore.ts
// Core sync-state orchestration + scope sync engines (H-4 split — moved
// verbatim from services/supabaseSyncService.ts: types/helpers/scope syncs/
// fallback/public orchestration). The prefs scope lives in cloudPrefs.ts; the
// retention/stats/funnel pushes live in statsPush.ts. supabaseSyncService.ts
// remains a thin re-export facade so every existing import keeps working.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, isSupabaseConfigured } from '../supabaseClient';
import type { BookmarkedManga } from '../favoritesService';
import type { ChapterProgress } from '../readingProgress';
import { getReadingSecondsByChapter } from '../readingSessionService';
import { resolveMangaDexUrl } from '../mangaDexProxy';
import { getCachedSubscriptionStatus } from '../stripeService';
import {
  KEYS,
  getJson,
  setJson,
  isoNow,
  getUserId,
  useRealSupabase,
  type SyncStatus,
  type SyncScope,
  type SyncState,
  type SyncQueueItem,
  type SyncPayloadDownloads,
} from './types';
import { syncPreferencesReal, syncPreferencesFallback, applyCloudPrefs } from './cloudPrefs';
import {
  pushRetentionToCloud,
  pushFunnelEventsToCloud,
  pushStatsToCloud,
  syncStatsReal,
  syncRetentionReal,
  syncFunnelEventsReal,
} from './statsPush';

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

export async function saveSyncState(partial: Partial<SyncState>): Promise<SyncState> {
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

export async function enqueue(scope: SyncScope): Promise<void> {
  const queue = await getSyncQueue();
  queue.push({
    id: `${scope}-${Date.now()}`,
    scope,
    queuedAt: isoNow(),
    attempts: 0,
  });
  await setJson(KEYS.SYNC_QUEUE, queue.slice(-50));
}

export async function clearQueue(): Promise<void> {
  await setJson(KEYS.SYNC_QUEUE, []);
}

// ─── LWW Merge Utility ───────────────────────────────────────────────

export function mergeLWW<T extends Record<string, unknown>>(
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
//
// TRUE last-write-wins on the real Supabase path. Every scope sync follows the
// same authoritative order:
//
//   1. PULL  — read the cloud rows FIRST, before any local write can touch
//              them. (These functions historically pushed first with
//              `updated_at: isoNow()`, so by pull time the cloud row had been
//              overwritten with the local copy and the timestamp guard could
//              only ever see post-push copies — a genuinely newer change from
//              another device could never win.)
//   2. MERGE — apply the scope's LWW rule into the local store: the cloud copy
//              is adopted only when strictly newer; ties keep local
//              (deterministic tie rule).
//   3. PUSH  — upsert ONLY local rows that are absent in the cloud or whose
//              user-visible fields DIFFER from the cloud copy. Rows the cloud
//              won at merge time are identical to the cloud row, so they are
//              never re-pushed (no unbounded clobbering). Field-diff — not a
//              timestamp-only comparison — is required because production
//              local records carry NO updatedAt: favourites stamp only
//              bookmarkedAt (a readingStatus-only change leaves it untouched)
//              and download jobs stamp only createdAt. A timestamp-only push
//              silently drops exactly those local mutations.

/** Compare a value on both sides, treating undefined/null as equal and
 *  normalising arrays/objects to a stable string (field order preserved). */
function sameValue(a: unknown, b: unknown): boolean {
  const norm = (v: unknown): unknown =>
    v !== null && typeof v === 'object' ? JSON.stringify(v) : (v ?? null);
  return norm(a) === norm(b);
}

function favoriteDiffersFromCloud(
  local: BookmarkedManga,
  cloud: Record<string, any>,
): boolean {
  return (
    !sameValue(local.mangaTitle, cloud.manga_title) ||
    !sameValue(local.mangaImage, cloud.manga_image) ||
    !sameValue(local.genres, cloud.genres) ||
    !sameValue(local.bookmarkedAt, cloud.bookmarked_at) ||
    !sameValue(local.readingStatus, cloud.reading_status)
  );
}

function progressDiffersFromCloud(
  local: ChapterProgress,
  cloud: Record<string, any>,
): boolean {
  return (
    !sameValue(local.mangaId, cloud.manga_id) ||
    !sameValue(local.mangaTitle, cloud.manga_title) ||
    !sameValue(local.mangaImage, cloud.manga_image) ||
    !sameValue(local.chapterTitle, cloud.chapter_title) ||
    !sameValue(local.chapterNumber, cloud.chapter_number) ||
    !sameValue(local.scrollPercentage, cloud.scroll_percentage) ||
    !sameValue(local.isRead, cloud.is_read) ||
    !sameValue(local.lastReadAt, cloud.last_read_at)
  );
}

function downloadDiffersFromCloud(
  local: SyncPayloadDownloads['items'][number],
  cloud: Record<string, any>,
): boolean {
  return (
    !sameValue(local.chapterId, cloud.chapter_id) ||
    !sameValue(local.mangaId, cloud.manga_id) ||
    !sameValue(local.mangaTitle, cloud.manga_title) ||
    !sameValue(local.chapterNumber, cloud.chapter_number) ||
    !sameValue(local.chapterTitle, cloud.chapter_title) ||
    !sameValue(local.status, cloud.status) ||
    !sameValue(local.progress, cloud.progress) ||
    !sameValue(local.totalPages, cloud.total_pages) ||
    !sameValue(local.downloadedPages, cloud.downloaded_pages) ||
    !sameValue(local.errorMessage, cloud.error_message) ||
    !sameValue(local.localDir, cloud.local_dir) ||
    !sameValue(local.retryCount, cloud.retry_count) ||
    !sameValue(local.createdAt, cloud.created_at)
  );
}

/** Build the local download-job shape from a cloud row (merge/adopt helper). */
function adoptDownloadRow(
  cloudRow: Record<string, any>,
): SyncPayloadDownloads['items'][number] {
  return {
    jobId: cloudRow.job_id,
    chapterId: cloudRow.chapter_id,
    mangaId: cloudRow.manga_id,
    mangaTitle: cloudRow.manga_title,
    chapterNumber: cloudRow.chapter_number,
    chapterTitle: cloudRow.chapter_title,
    status: cloudRow.status,
    progress: cloudRow.progress,
    totalPages: cloudRow.total_pages,
    downloadedPages: cloudRow.downloaded_pages,
    errorMessage: cloudRow.error_message,
    localDir: cloudRow.local_dir,
    createdAt: cloudRow.created_at,
    retryCount: cloudRow.retry_count,
  };
}

export async function syncFavoritesReal(userId: string): Promise<void> {
  // 1) PULL Supabase → local FIRST (true LWW — see header comment).
  const { data, error } = await supabase
    .from('user_library')
    .select('*')
    .eq('user_id', userId)
    .order('bookmarked_at', { ascending: false });
  if (error) throw new Error(`Favorites pull: ${error.message}`);
  const cloud = data ?? [];

  const raw = await AsyncStorage.getItem(KEYS.LOCAL_FAVORITES);
  const local: BookmarkedManga[] = raw ? JSON.parse(raw) : [];

  // 2) MERGE: adopt the cloud copy only when its bookmarked_at is strictly
  //    newer; tie → keep local (deterministic).
  const localMap = new Map(local.map((f) => [f.mangaId, f]));
  for (const cloudRow of cloud) {
    const existing = localMap.get(cloudRow.manga_id);
    if (!existing || new Date(cloudRow.bookmarked_at) > new Date(existing.bookmarkedAt)) {
      localMap.set(cloudRow.manga_id, {
        mangaId: cloudRow.manga_id,
        mangaTitle: cloudRow.manga_title,
        mangaImage: cloudRow.manga_image,
        genres: cloudRow.genres,
        bookmarkedAt: cloudRow.bookmarked_at,
        readingStatus: cloudRow.reading_status,
      });
    }
  }
  const merged = Array.from(localMap.values());
  await AsyncStorage.setItem(KEYS.LOCAL_FAVORITES, JSON.stringify(merged));

  // 3) PUSH rows that are absent in the cloud or differ from the cloud copy.
  //    Production favourites carry no updatedAt — a readingStatus-only change
  //    leaves bookmarkedAt untouched, so it is only detectable as a field diff.
  const cloudMap = new Map(cloud.map((c) => [c.manga_id, c]));
  const toPush = merged.filter((f) => {
    const cloudRow = cloudMap.get(f.mangaId);
    return !cloudRow || favoriteDiffersFromCloud(f, cloudRow);
  });
  if (toPush.length > 0) {
    const rows = toPush.map((f) => ({
      user_id: userId,
      manga_id: f.mangaId,
      manga_title: f.mangaTitle,
      manga_image: f.mangaImage ?? null,
      genres: f.genres ?? null,
      bookmarked_at: f.bookmarkedAt,
      reading_status: f.readingStatus,
      updated_at: isoNow(),
    }));
    const { error: pushErr } = await supabase
      .from('user_library')
      .upsert(rows, { onConflict: 'user_id,manga_id' });
    if (pushErr) throw new Error(`Favorites push: ${pushErr.message}`);
  }
}

export async function syncProgressReal(userId: string): Promise<void> {
  // 1) PULL Supabase → local FIRST (true LWW — same rationale as favorites).
  const { data, error } = await supabase
    .from('reading_progress')
    .select('*')
    .eq('user_id', userId)
    .order('last_read_at', { ascending: false })
    .limit(500);
  if (error) throw new Error(`Progress pull: ${error.message}`);
  const cloud = data ?? [];

  const raw = await AsyncStorage.getItem(KEYS.LOCAL_PROGRESS);
  const local: ChapterProgress[] = raw ? JSON.parse(raw) : [];

  // 2) MERGE: adopt the cloud copy only when its last_read_at is strictly
  //    newer; tie → keep local (deterministic).
  const localMap = new Map(local.map((p) => [p.chapterId, p]));
  for (const cloudRow of cloud) {
    const existing = localMap.get(cloudRow.chapter_id);
    if (!existing || new Date(cloudRow.last_read_at) > new Date(existing.lastReadAt)) {
      localMap.set(cloudRow.chapter_id, {
        chapterId: cloudRow.chapter_id,
        mangaId: cloudRow.manga_id,
        mangaTitle: cloudRow.manga_title,
        mangaImage: cloudRow.manga_image,
        chapterTitle: cloudRow.chapter_title,
        chapterNumber: cloudRow.chapter_number,
        scrollPercentage: cloudRow.scroll_percentage,
        isRead: cloudRow.is_read,
        lastReadAt: cloudRow.last_read_at,
      });
    }
  }
  const merged = Array.from(localMap.values());
  await AsyncStorage.setItem(KEYS.LOCAL_PROGRESS, JSON.stringify(merged));

  // 3) PUSH rows absent in the cloud or differing from the cloud copy.
  const cloudMap = new Map(cloud.map((c) => [c.chapter_id, c]));
  const toPush = merged.filter((p) => {
    const cloudRow = cloudMap.get(p.chapterId);
    return !cloudRow || progressDiffersFromCloud(p, cloudRow);
  });
  if (toPush.length > 0) {
    // G-4: attach measured per-chapter reading seconds (real reading time) so
    // the server can SQL-aggregate hours/week from reading_progress.
    const secondsByChapter = await getReadingSecondsByChapter();
    const rows = toPush.map((p) => ({
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
      seconds_read: secondsByChapter[p.chapterId] ?? 0,
    }));
    const { error: pushErr } = await supabase
      .from('reading_progress')
      .upsert(rows, { onConflict: 'user_id,chapter_id' });
    if (pushErr) throw new Error(`Progress push: ${pushErr.message}`);
  }
}

export async function syncDownloadsReal(userId: string): Promise<void> {
  // 1) PULL Supabase → local FIRST (true LWW — same rationale as favorites).
  const { data, error } = await supabase
    .from('download_queue')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(200);
  if (error) throw new Error(`Downloads pull: ${error.message}`);
  const cloud = data ?? [];

  const rawQ = await AsyncStorage.getItem(KEYS.LOCAL_DOWNLOAD_QUEUE);
  const queue: SyncPayloadDownloads['items'] = rawQ ? JSON.parse(rawQ) : [];

  // 2) MERGE. The cloud adopts only when it is genuinely newer:
  //    - when the local row carries an explicit updatedAt, compare
  //      cloud.updated_at against it (explicit local change evidence);
  //    - production downloads carry NO updatedAt (downloadManager stamps only
  //      createdAt). The cloud's updated_at on such rows is a sync watermark
  //      (the legacy push stamped isoNow() at every push), NOT evidence the
  //      download state changed — so the only honest cloud evidence is
  //      created_at: a cloud row created AFTER the local job is a newer job
  //      and wins; otherwise the local copy's semantic state (status/progress)
  //      is the ground truth and must be preserved and propagated.
  const localMap = new Map(queue.map((d) => [d.jobId, d]));
  for (const cloudRow of cloud) {
    const existing = localMap.get(cloudRow.job_id) as any;
    if (!existing) {
      localMap.set(cloudRow.job_id, adoptDownloadRow(cloudRow));
      continue;
    }
    const cloudWins =
      existing.updatedAt !== undefined
        ? new Date(cloudRow.updated_at) > new Date(existing.updatedAt)
        : new Date(cloudRow.created_at) > new Date(existing.createdAt);
    if (cloudWins) localMap.set(cloudRow.job_id, adoptDownloadRow(cloudRow));
  }
  const merged = Array.from(localMap.values());
  await AsyncStorage.setItem(KEYS.LOCAL_DOWNLOAD_QUEUE, JSON.stringify(merged));

  // 3) PUSH rows absent in the cloud or differing from the cloud copy.
  const cloudMap = new Map(cloud.map((c: any) => [c.job_id, c]));
  const toPush = merged.filter((d) => {
    const cloudRow = cloudMap.get(d.jobId);
    return !cloudRow || downloadDiffersFromCloud(d, cloudRow);
  });
  if (toPush.length > 0) {
    const rows = toPush.map((d) => ({
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
}

// Preferences scope lives in cloudPrefs.ts (syncPreferencesReal / syncPreferencesFallback).

// Retention / stats / funnel scopes live in statsPush.ts.

// ─── Fallback: AsyncStorage mirror sync (for unauthenticated users) ──

export async function syncFavoritesFallback(): Promise<void> {
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

export async function syncProgressFallback(): Promise<void> {
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

export async function syncDownloadsFallback(): Promise<void> {
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
      // G-6: funnel events (paywall→checkout→conversion) ride the real sync
      // path as a delivery-durability bonus (heartbeat is the primary channel).
      await pushFunnelEventsToCloud();
      const results = await Promise.allSettled([
        syncFavoritesReal(userId).then(() => 'favorites' as SyncScope),
        syncProgressReal(userId).then(() => 'progress' as SyncScope),
        syncDownloadsReal(userId).then(() => 'downloads' as SyncScope),
        syncPreferencesReal(userId).then(() => 'preferences' as SyncScope),
        syncStatsReal(userId).then(() => 'stats' as SyncScope),
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
      // G-5: measured reading-time rollup rides the push path too.
      await pushStatsToCloud();
      // G-6: funnel events ride the push path too (manual Push-now).
      await pushFunnelEventsToCloud();
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
        await applyCloudPrefs(cloudPrefs);
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
        supabase.from('reading_stats').delete().eq('user_id', userId),
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

// Re-export the moved scope engines for deep imports (used by the facade).
export { syncRetentionReal, syncFunnelEventsReal, syncStatsReal };