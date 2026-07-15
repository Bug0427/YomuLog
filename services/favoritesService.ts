// services/favoritesService.ts
// Manages liked/bookmarked manga locally via AsyncStorage.
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ReadingStatus = 'reading' | 'completed' | 'on_hold' | 'dropped' | 'plan_to_read';

export type BookmarkedManga = {
  mangaId: string;
  mangaTitle: string;
  mangaImage?: string;
  genres?: string[];
  bookmarkedAt: string;
  readingStatus: ReadingStatus;
};

export type MangaUpdate = {
  mangaId: string;
  mangaTitle: string;
  mangaImage?: string;
  updatedAt: string;
  chapterNumber: number;
};

const STORAGE_KEY = '@YomuLog:favorites';
const UPDATES_KEY = '@YomuLog:recentUpdates';
const MAX_UPDATES = 20;
const MAX_FAVORITES_BANNER = 5;

// ─── Helpers ───────────────────────────────────────────────────────
async function getJson<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch { return fallback; }
}

function setJson<T>(key: string, value: T): Promise<void> {
  return AsyncStorage.setItem(key, JSON.stringify(value));
}

// ─── Favorites ────────────────────────────────────────────────────
async function getFavoritesRaw(): Promise<BookmarkedManga[]> {
  return getJson<BookmarkedManga[]>(STORAGE_KEY, []);
}

export async function getFavorites(): Promise<BookmarkedManga[]> {
  return getFavoritesRaw();
}

export async function isFavorite(mangaId: string): Promise<boolean> {
  const list = await getFavoritesRaw();
  return list.some((m) => m.mangaId === mangaId);
}

export async function addFavorite(
  mangaId: string, mangaTitle: string,
  mangaImage?: string, genres?: string[],
): Promise<void> {
  const list = await getFavoritesRaw();
  if (list.some((m) => m.mangaId === mangaId)) return;
  list.push({ mangaId, mangaTitle, mangaImage, genres, bookmarkedAt: new Date().toISOString(), readingStatus: 'reading' });
  await setJson(STORAGE_KEY, list);
}

export async function removeFavorite(mangaId: string): Promise<void> {
  const list = await getFavoritesRaw();
  await setJson(STORAGE_KEY, list.filter((m) => m.mangaId !== mangaId));
}

export async function updateReadingStatus(mangaId: string, status: ReadingStatus): Promise<void> {
  const list = await getFavoritesRaw();
  const idx = list.findIndex((m) => m.mangaId === mangaId);
  if (idx >= 0) { list[idx].readingStatus = status; await setJson(STORAGE_KEY, list); }
}

export async function toggleFavorite(
  mangaId: string, mangaTitle: string,
  mangaImage?: string, genres?: string[],
): Promise<boolean> {
  const exists = await isFavorite(mangaId);
  if (exists) { await removeFavorite(mangaId); return false; }
  await addFavorite(mangaId, mangaTitle, mangaImage, genres);
  return true;
}

// ─── Recent Updates ────────────────────────────────────────────────
export async function recordUpdate(
  mangaId: string, mangaTitle: string, chapterNumber: number, mangaImage?: string,
): Promise<void> {
  const list = await getJson<MangaUpdate[]>(UPDATES_KEY, []);
  const filtered = list.filter((u) => u.mangaId !== mangaId);
  filtered.push({ mangaId, mangaTitle, mangaImage, updatedAt: new Date().toISOString(), chapterNumber });
  filtered.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  await setJson(UPDATES_KEY, filtered.slice(0, MAX_UPDATES));
}

export async function getRecentFavoritesUpdates(): Promise<MangaUpdate[]> {
  const [favs, updates] = await Promise.all([getFavoritesRaw(), getJson<MangaUpdate[]>(UPDATES_KEY, [])]);
  const favIds = new Set(favs.map((f) => f.mangaId));
  return updates.filter((u) => favIds.has(u.mangaId)).slice(0, MAX_FAVORITES_BANNER);
}

export async function getAllUpdates(): Promise<MangaUpdate[]> {
  return getJson<MangaUpdate[]>(UPDATES_KEY, []);
}

export async function clearAllFavorites(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEY);
  await AsyncStorage.removeItem(UPDATES_KEY);
}