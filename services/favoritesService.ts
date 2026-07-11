// services/favoritesService.ts
// Manages liked/bookmarked manga locally via AsyncStorage.

import AsyncStorage from '@react-native-async-storage/async-storage';

export type BookmarkedManga = {
  mangaId: string;
  mangaTitle: string;
  mangaImage?: string;
  genres?: string[];
  bookmarkedAt: string;  // ISO timestamp
  readingStatus: ReadingStatus;
};

export type ReadingStatus = 'reading' | 'completed' | 'on_hold' | 'dropped' | 'plan_to_read';

export type MangaUpdate = {
  mangaId: string;
  mangaTitle: string;
  mangaImage?: string;
  updatedAt: string;      // ISO timestamp — when a new chapter dropped
  chapterNumber: number;
};

const STORAGE_KEY = '@YomuLog:favorites';
const UPDATES_KEY = '@YomuLog:recentUpdates';
const MAX_UPDATES = 20;
const MAX_FAVORITES_BANNER = 5;  // shown in collapsible preview

// ─── Favorites ────────────────────────────────────────────────────

async function getFavoritesRaw(): Promise<BookmarkedManga[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function setFavorites(data: BookmarkedManga[]): Promise<void> {
  return AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export async function getFavorites(): Promise<BookmarkedManga[]> {
  return getFavoritesRaw();
}

export async function isFavorite(mangaId: string): Promise<boolean> {
  const list = await getFavoritesRaw();
  return list.some((m) => m.mangaId === mangaId);
}

export async function addFavorite(
  mangaId: string,
  mangaTitle: string,
  mangaImage?: string,
  genres?: string[],
): Promise<void> {
  const list = await getFavoritesRaw();
  if (list.some((m) => m.mangaId === mangaId)) return; // already exists
  list.push({
    mangaId,
    mangaTitle,
    mangaImage,
    genres,
    bookmarkedAt: new Date().toISOString(),
    readingStatus: 'reading',
  });
  await setFavorites(list);
}

export async function removeFavorite(mangaId: string): Promise<void> {
  const list = await getFavoritesRaw();
  await setFavorites(list.filter((m) => m.mangaId !== mangaId));
}

export async function updateReadingStatus(
  mangaId: string,
  status: ReadingStatus,
): Promise<void> {
  const list = await getFavoritesRaw();
  const idx = list.findIndex((m) => m.mangaId === mangaId);
  if (idx >= 0) {
    list[idx].readingStatus = status;
    await setFavorites(list);
  }
}

export async function toggleFavorite(
  mangaId: string,
  mangaTitle: string,
  mangaImage?: string,
  genres?: string[],
): Promise<boolean> {
  const exists = await isFavorite(mangaId);
  if (exists) {
    await removeFavorite(mangaId);
    return false;
  }
  await addFavorite(mangaId, mangaTitle, mangaImage, genres);
  return true;
}

/** Filter favorites by genre(s) and/or reading status. */
export async function filterFavorites(
  genres?: string[],
  status?: ReadingStatus | null,
): Promise<BookmarkedManga[]> {
  let list = await getFavoritesRaw();

  if (status) {
    list = list.filter((m) => m.readingStatus === status);
  }

  if (genres && genres.length > 0) {
    list = list.filter(
      (m) => m.genres && genres.some((g) => (m.genres ?? []).includes(g)),
    );
  }

  return list;
}

// ─── Recent Updates ───────────────────────────────────────────────

async function getUpdatesRaw(): Promise<MangaUpdate[]> {
  try {
    const raw = await AsyncStorage.getItem(UPDATES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function setUpdates(data: MangaUpdate[]): Promise<void> {
  return AsyncStorage.setItem(UPDATES_KEY, JSON.stringify(data));
}

export async function recordUpdate(
  mangaId: string,
  mangaTitle: string,
  chapterNumber: number,
  mangaImage?: string,
): Promise<void> {
  const list = await getUpdatesRaw();
  const now = new Date().toISOString();

  // Remove duplicate entry for the same manga
  const filtered = list.filter((u) => u.mangaId !== mangaId);

  filtered.push({ mangaId, mangaTitle, mangaImage, updatedAt: now, chapterNumber });

  // Sort most recent first
  filtered.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  await setUpdates(filtered.slice(0, MAX_UPDATES));
}

/** Get recent updates only for bookmarked manga (up to MAX_FAVORITES_BANNER). */
export async function getRecentFavoritesUpdates(): Promise<MangaUpdate[]> {
  const [favs, updates] = await Promise.all([getFavoritesRaw(), getUpdatesRaw()]);
  const favIds = new Set(favs.map((f) => f.mangaId));

  return updates
    .filter((u) => favIds.has(u.mangaId))
    .slice(0, MAX_FAVORITES_BANNER);
}

export async function getAllUpdates(): Promise<MangaUpdate[]> {
  return getUpdatesRaw();
}

/** Clear all favorites and updates data. */
export async function clearAllFavorites(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEY);
  await AsyncStorage.removeItem(UPDATES_KEY);
}