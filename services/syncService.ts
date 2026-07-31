// services/syncService.ts
// Real Supabase-backed cloud sync for Premium users.
// Replaces the simulated AsyncStorage mirror approach in supabaseSyncService.ts
// with actual Supabase database tables.
//
// Tables required (run these in Supabase SQL editor):
//
//   CREATE TABLE user_favorites (
//     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
//     user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
//     manga_id TEXT NOT NULL,
//     manga_title TEXT NOT NULL,
//     manga_image TEXT,
//     genres TEXT[],
//     bookmarked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
//     reading_status TEXT NOT NULL DEFAULT 'reading',
//     UNIQUE(user_id, manga_id)
//   );
//
//   CREATE TABLE user_progress (
//     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
//     user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
//     chapter_id TEXT NOT NULL,
//     manga_id TEXT NOT NULL,
//     manga_title TEXT NOT NULL,
//     manga_image TEXT,
//     chapter_title TEXT,
//     chapter_number FLOAT NOT NULL DEFAULT 0,
//     scroll_percentage FLOAT NOT NULL DEFAULT 0,
//     is_read BOOLEAN NOT NULL DEFAULT false,
//     last_read_at TIMESTAMPTZ NOT NULL DEFAULT now(),
//     UNIQUE(user_id, chapter_id)
//   );
//
//   CREATE TABLE user_preferences (
//     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
//     user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
//     language TEXT NOT NULL DEFAULT 'en',
//     alerts_on BOOLEAN NOT NULL DEFAULT true,
//     ai_search_on BOOLEAN NOT NULL DEFAULT false,
//     direction_mode TEXT NOT NULL DEFAULT 'ltr',
//     updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
//   );
//
// Conflict resolution: Last-write-wins based on timestamp comparison.
// Row-level UNIQUE constraints prevent duplicates, UPSERT handles conflicts.

import { supabase, isSupabaseConfigured } from './supabaseClient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { BookmarkedManga } from './favoritesService';
import type { SyncStatus } from './supabaseSyncService';

// ─── Types ───────────────────────────────────────────────────────────

export type CloudSyncStatus = 'synced' | 'syncing' | 'error' | 'offline' | 'unauthenticated';

export type CloudSyncState = {
  status: CloudSyncStatus;
  lastSyncedAt: string | null;
  lastError: string | null;
};

// ─── Auth helpers ────────────────────────────────────────────────────

/** Get current user ID, or null if not signed in. */
export async function getUserId(): Promise<string | null> {
  if (!isSupabaseConfigured()) return null;
  const { data } = await supabase.auth.getSession();
  return data.session?.user?.id ?? null;
}

/** Check if user is authenticated with Supabase. */
export async function isAuthenticated(): Promise<boolean> {
  const uid = await getUserId();
  return uid !== null;
}

// ─── Favorites sync ──────────────────────────────────────────────────

export async function pushFavorites(): Promise<void> {
  const userId = await getUserId();
  if (!userId || !isSupabaseConfigured()) return;

  const raw = await AsyncStorage.getItem('@YomuLog:favorites');
  const favorites: BookmarkedManga[] = raw ? JSON.parse(raw) : [];

  if (favorites.length === 0) return;

  const rows = favorites.map((f) => ({
    user_id: userId,
    manga_id: f.mangaId,
    manga_title: f.mangaTitle,
    manga_image: f.mangaImage ?? null,
    genres: f.genres ?? null,
    bookmarked_at: f.bookmarkedAt,
    reading_status: f.readingStatus,
  }));

  // UPSERT: insert or update on conflict
  const { error } = await supabase
    .from('user_favorites')
    .upsert(rows, { onConflict: 'user_id,manga_id' });

  if (error) throw new Error(`Favorites push failed: ${error.message}`);
}

export async function pullFavorites(): Promise<void> {
  const userId = await getUserId();
  if (!userId || !isSupabaseConfigured()) return;

  const { data, error } = await supabase
    .from('user_favorites')
    .select('*')
    .eq('user_id', userId)
    .order('bookmarked_at', { ascending: false });

  if (error) throw new Error(`Favorites pull failed: ${error.message}`);
  if (!data || data.length === 0) return;

  // Merge with local using LWW
  const raw = await AsyncStorage.getItem('@YomuLog:favorites');
  const local: BookmarkedManga[] = raw ? JSON.parse(raw) : [];
  const localMap = new Map(local.map((f) => [f.mangaId, f]));

  for (const cloud of data) {
    const localItem = localMap.get(cloud.manga_id);
    if (!localItem || new Date(cloud.bookmarked_at) > new Date(localItem.bookmarkedAt)) {
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

  await AsyncStorage.setItem('@YomuLog:favorites', JSON.stringify(Array.from(localMap.values())));
}

// ─── Progress sync ───────────────────────────────────────────────────

export async function pushProgress(): Promise<void> {
  const userId = await getUserId();
  if (!userId || !isSupabaseConfigured()) return;

  const raw = await AsyncStorage.getItem('@YomuLog:chapterProgress');
  const progress: Array<{
    chapterId: string; mangaId: string; mangaTitle: string;
    mangaImage?: string; chapterTitle?: string; chapterNumber: number;
    scrollPercentage: number; isRead: boolean; lastReadAt: string;
  }> = raw ? JSON.parse(raw) : [];

  if (progress.length === 0) return;

  const rows = progress.map((p) => ({
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
    .from('user_progress')
    .upsert(rows, { onConflict: 'user_id,chapter_id' });

  if (error) throw new Error(`Progress push failed: ${error.message}`);
}

export async function pullProgress(): Promise<void> {
  const userId = await getUserId();
  if (!userId || !isSupabaseConfigured()) return;

  const { data, error } = await supabase
    .from('user_progress')
    .select('*')
    .eq('user_id', userId)
    .order('last_read_at', { ascending: false })
    .limit(500);

  if (error) throw new Error(`Progress pull failed: ${error.message}`);
  if (!data || data.length === 0) return;

  const raw = await AsyncStorage.getItem('@YomuLog:chapterProgress');
  const local: Array<Record<string, unknown>> = raw ? JSON.parse(raw) : [];
  const localMap = new Map(local.map((p: any) => [p.chapterId, p]));

  for (const cloud of data) {
    const localItem = localMap.get(cloud.chapter_id) as any;
    if (!localItem || new Date(cloud.last_read_at) > new Date(localItem.lastReadAt || 0)) {
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

  await AsyncStorage.setItem('@YomuLog:chapterProgress', JSON.stringify(Array.from(localMap.values())));
}

// ─── Preferences sync ────────────────────────────────────────────────

export async function pushPreferences(): Promise<void> {
  const userId = await getUserId();
  if (!userId || !isSupabaseConfigured()) return;

  const { loadAllPreferences } = await import('./preferencesService');
  const prefs = await loadAllPreferences();

  const { error } = await supabase
    .from('user_preferences')
    .upsert({
      user_id: userId,
      language: prefs.language,
      alerts_on: prefs.alertsOn,
      ai_search_on: prefs.aiSearchOn,
      direction_mode: prefs.directionMode,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });

  if (error) throw new Error(`Preferences push failed: ${error.message}`);
}

export async function pullPreferences(): Promise<void> {
  const userId = await getUserId();
  if (!userId || !isSupabaseConfigured()) return;

  const { data, error } = await supabase
    .from('user_preferences')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error && error.code !== 'PGRST116') throw new Error(`Preferences pull failed: ${error.message}`);
  if (!data) return;

  const { setLanguage, setAlertsOn, setAISearchOn, setDirectionMode } = await import('./preferencesService');
  await Promise.all([
    setLanguage(data.language as 'en' | 'ja' | 'ko'),
    setAlertsOn(data.alerts_on),
    setAISearchOn(data.ai_search_on),
    setDirectionMode(data.direction_mode as 'ltr' | 'rtl' | 'vertical'),
  ]);
}

// ─── Full sync ───────────────────────────────────────────────────────

/**
 * Full cloud sync: push local → cloud, then pull cloud → local.
 * Uses LWW merge semantics. Only syncs if user is authenticated and
 * Supabase is configured.
 */
export async function performCloudSync(): Promise<CloudSyncState> {
  if (!isSupabaseConfigured()) {
    return { status: 'unauthenticated', lastSyncedAt: null, lastError: 'Supabase not configured' };
  }

  const userId = await getUserId();
  if (!userId) {
    return { status: 'unauthenticated', lastSyncedAt: null, lastError: 'Not signed in' };
  }

  try {
    // Push local changes up first, then pull cloud changes down
    await Promise.all([
      pushFavorites(),
      pushProgress(),
      pushPreferences(),
    ]);

    await Promise.all([
      pullFavorites(),
      pullProgress(),
      pullPreferences(),
    ]);

    const now = new Date().toISOString();
    return { status: 'synced', lastSyncedAt: now, lastError: null };
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown sync error';
    return { status: 'error', lastSyncedAt: null, lastError: msg };
  }
}
