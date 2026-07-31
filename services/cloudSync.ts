// services/cloudSync.ts
// Reading-progress cloud sync backed by Supabase.
// Provides push / pull / resolve for per-chapter reading progress.
// Only available to Premium users — gating is handled by the caller
// (e.g. useSyncEngine or the manual sync button in Settings).
//
// Conflict strategy: Last-Write-Wins based on `lastReadAt` timestamp.

import { supabase, isSupabaseConfigured } from './supabaseClient';
import {
  getAllChapterProgress,
  type ChapterProgress,
} from './readingProgress';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── Types ───────────────────────────────────────────────────────────

export type CloudSyncResult = {
  success: boolean;
  pushed: number;   // how many records pushed to cloud
  pulled: number;   // how many records pulled from cloud
  error?: string;
};

// ─── Helpers ─────────────────────────────────────────────────────────

/** Get the current user's Supabase UUID (null if not signed in). */
async function getUserId(): Promise<string | null> {
  if (!isSupabaseConfigured()) return null;
  const { data } = await supabase.auth.getSession();
  return data.session?.user?.id ?? null;
}

// ─── Push ────────────────────────────────────────────────────────────

/**
 * Upload all local reading progress to Supabase.
 * Upserts rows so duplicates are safely overwritten.
 */
export async function syncReadingProgress(): Promise<CloudSyncResult> {
  if (!isSupabaseConfigured()) {
    return { success: false, pushed: 0, pulled: 0, error: 'Supabase not configured' };
  }

  const userId = await getUserId();
  if (!userId) {
    return { success: false, pushed: 0, pulled: 0, error: 'Not signed in' };
  }

  try {
    const local = await getAllChapterProgress();
    if (local.length === 0) {
      return { success: true, pushed: 0, pulled: 0 };
    }

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

    if (error) throw new Error(error.message);

    return { success: true, pushed: rows.length, pulled: 0 };
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown push error';
    return { success: false, pushed: 0, pulled: 0, error: msg };
  }
}

// ─── Pull ────────────────────────────────────────────────────────────

/**
 * Download reading progress from Supabase and merge into local storage.
 * Uses Last-Write-Wins: for each chapter, keep whichever copy
 * (local or cloud) was updated most recently.
 */
export async function pullReadingProgress(): Promise<CloudSyncResult> {
  if (!isSupabaseConfigured()) {
    return { success: false, pushed: 0, pulled: 0, error: 'Supabase not configured' };
  }

  const userId = await getUserId();
  if (!userId) {
    return { success: false, pushed: 0, pulled: 0, error: 'Not signed in' };
  }

  try {
    const { data, error } = await supabase
      .from('reading_progress')
      .select('*')
      .eq('user_id', userId)
      .order('last_read_at', { ascending: false })
      .limit(500);

    if (error) throw new Error(error.message);
    if (!data || data.length === 0) {
      return { success: true, pushed: 0, pulled: 0 };
    }

    const local = await getAllChapterProgress();
    const localMap = new Map(
      local.map((p) => [`${p.mangaId}::${p.chapterId}`, p]),
    );

    for (const cloud of data) {
      const key = `${cloud.manga_id}::${cloud.chapter_id}`;
      localMap.set(key, resolveConflicts(
        localMap.get(key) ?? null,
        {
          chapterId: cloud.chapter_id,
          mangaId: cloud.manga_id,
          mangaTitle: cloud.manga_title,
          mangaImage: cloud.manga_image,
          chapterTitle: cloud.chapter_title,
          chapterNumber: cloud.chapter_number,
          scrollPercentage: cloud.scroll_percentage,
          isRead: cloud.is_read,
          lastReadAt: cloud.last_read_at,
        },
      ));
    }

    // Write merged data back to AsyncStorage
    const merged = Array.from(localMap.values());
    await AsyncStorage.setItem(
      '@YomuLog:chapterProgress',
      JSON.stringify(merged),
    );

    return { success: true, pushed: 0, pulled: data.length };
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown pull error';
    return { success: false, pushed: 0, pulled: 0, error: msg };
  }
}

// ─── Conflict resolution ─────────────────────────────────────────────

/**
 * Resolve a conflict between a local and cloud ChapterProgress entry.
 * Last-Write-Wins: the entry with the most recent `lastReadAt` wins.
 * On tie, local wins.
 */
export function resolveConflicts(
  local: ChapterProgress | null,
  cloud: ChapterProgress,
): ChapterProgress {
  if (!local) return cloud;

  const localTs = new Date(local.lastReadAt).getTime();
  const cloudTs = new Date(cloud.lastReadAt).getTime();

  if (cloudTs > localTs) return cloud;
  return local;
}

// ─── Full sync (push → pull) ─────────────────────────────────────────

/**
 * Run a complete sync cycle: push local → cloud, then pull cloud → local.
 */
export async function fullCloudSync(): Promise<CloudSyncResult> {
  const pushResult = await syncReadingProgress();
  if (!pushResult.success) return pushResult;

  const pullResult = await pullReadingProgress();
  return {
    success: pullResult.success,
    pushed: pushResult.pushed,
    pulled: pullResult.pulled,
    error: pullResult.error,
  };
}
