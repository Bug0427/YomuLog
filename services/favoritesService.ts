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
const MAX_UPDATES = 50;
const MAX_FAVORITES_BANNER = 10;
const MAX_UPDATE_AGE_DAYS = 14;

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
  if (exists) { await removeFavorite(mangaId); scheduleMetadataUnlike(mangaId); return false; }
  await addFavorite(mangaId, mangaTitle, mangaImage, genres);
  scheduleMetadataLike(mangaId, mangaTitle, genres);
  return true;
}

// ── Fire-and-forget metadata hooks (never block the UI) ────────────
function scheduleMetadataLike(mangaId: string, title: string, genres?: string[]) {
  setTimeout(async () => {
    try {
      const { onFavoriteAdded } = await import('./metadataClassification');
      await onFavoriteAdded(mangaId, title, genres);
    } catch { /* non-critical */ }
  }, 0);
}
function scheduleMetadataUnlike(mangaId: string) {
  setTimeout(async () => {
    try {
      const { onFavoriteRemoved } = await import('./metadataClassification');
      await onFavoriteRemoved(mangaId);
    } catch { /* non-critical */ }
  }, 0);
}

// ─── Recent Updates ────────────────────────────────────────────────
export async function recordUpdate(
  mangaId: string, mangaTitle: string, chapterNumber: number, mangaImage?: string,
): Promise<void> {
  const list = await getJson<MangaUpdate[]>(UPDATES_KEY, []);
  const filtered = list.filter((u) => u.mangaId !== mangaId);
  filtered.push({ mangaId, mangaTitle, mangaImage, updatedAt: new Date().toISOString(), chapterNumber });
  filtered.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  // Enforce 50-item cap
  await setJson(UPDATES_KEY, filtered.slice(0, MAX_UPDATES));
}

// Auto-purge: remove updates older than MAX_UPDATE_AGE_DAYS and mark completed items for removal
function pruneUpdates(list: MangaUpdate[], completedIds: Set<string>): MangaUpdate[] {
  const cutoff = Date.now() - MAX_UPDATE_AGE_DAYS * 24 * 60 * 60 * 1000;
  return list.filter((u) => {
    if (completedIds.has(u.mangaId)) return false;
    if (new Date(u.updatedAt).getTime() < cutoff) return false;
    return true;
  });
}

export async function getRecentFavoritesUpdates(): Promise<MangaUpdate[]> {
  const [favs, updates] = await Promise.all([getFavoritesRaw(), getJson<MangaUpdate[]>(UPDATES_KEY, [])]);
  const favIds = new Set(favs.map((f) => f.mangaId));
  const completedIds = new Set(favs.filter((f) => f.readingStatus === 'completed').map((f) => f.mangaId));
  const relevant = updates.filter((u) => favIds.has(u.mangaId));
  const pruned = pruneUpdates(relevant, completedIds);
  // Persist pruned list
  if (pruned.length !== updates.length) {
    // Only update the stored list for favorited items
    const nonFavUpdates = updates.filter((u) => !favIds.has(u.mangaId));
    await setJson(UPDATES_KEY, [...pruned, ...nonFavUpdates].slice(0, MAX_UPDATES));
  }
  return pruned.slice(0, MAX_FAVORITES_BANNER);
}

export async function getAllUpdates(): Promise<MangaUpdate[]> {
  return getJson<MangaUpdate[]>(UPDATES_KEY, []);
}

export async function removeFromRecentUpdates(mangaId: string): Promise<void> {
  const list = await getJson<MangaUpdate[]>(UPDATES_KEY, []);
  await setJson(UPDATES_KEY, list.filter((u) => u.mangaId !== mangaId));
}

export async function clearRecentUpdates(): Promise<void> {
  await AsyncStorage.removeItem(UPDATES_KEY);
}

export async function removeFavorites(ids: string[]): Promise<void> {
  const idSet = new Set(ids);
  const list = await getFavoritesRaw();
  await setJson(STORAGE_KEY, list.filter((m) => !idSet.has(m.mangaId)));
}

export async function updateReadingStatusBatch(
  ids: string[],
  status: ReadingStatus,
): Promise<void> {
  const idSet = new Set(ids);
  const list = await getFavoritesRaw();
  const updated = list.map((m) =>
    idSet.has(m.mangaId) ? { ...m, readingStatus: status } : m,
  );
  await setJson(STORAGE_KEY, updated);
}

export async function clearAllFavorites(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEY);
  await AsyncStorage.removeItem(UPDATES_KEY);
}