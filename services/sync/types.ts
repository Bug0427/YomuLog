// services/sync/types.ts
// Shared sync types, storage keys and low-level helpers for the decomposed
// sync engine (H-4 split: supabaseSyncService → syncCore/cloudPrefs/statsPush).
// Behavior-preserving split — everything here was lifted verbatim from
// services/supabaseSyncService.ts (the thin facade re-exports the public API).

import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, isSupabaseConfigured } from '../supabaseClient';
import type { BookmarkedManga } from '../favoritesService';
import type { ChapterProgress } from '../readingProgress';

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

export const KEYS = {
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

export async function getJson<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function setJson<T>(key: string, value: T): Promise<void> {
  return AsyncStorage.setItem(key, JSON.stringify(value));
}

export function isoNow(): string {
  return new Date().toISOString();
}

// ─── Auth helpers ────────────────────────────────────────────────────

export async function getUserId(): Promise<string | null> {
  if (!isSupabaseConfigured()) return null;
  const { data } = await supabase.auth.getSession();
  return data.session?.user?.id ?? null;
}

export async function useRealSupabase(): Promise<boolean> {
  return isSupabaseConfigured() && (await getUserId()) !== null;
}

// Re-export the types that moved here so deep imports stay unambiguous.
export type { BookmarkedManga, ChapterProgress };