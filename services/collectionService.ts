// services/collectionService.ts
// Manages user-defined manga collections, custom tags, and reading lists.
// Persisted to AsyncStorage with Supabase cloud sync.

import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── Types ───────────────────────────────────────────────────────────

export type CollectionType = 'standard' | 'reading_list';

export interface Collection {
  id: string;
  name: string;
  type: CollectionType;
  description?: string;
  mangaIds: string[];          // ordered for reading lists
  tags: string[];              // custom tags applied to the entire collection
  createdAt: string;
  updatedAt: string;
}

export interface MangaTag {
  mangaId: string;
  tags: string[];
}

// ─── Storage keys ────────────────────────────────────────────────────

const COLLECTIONS_KEY = '@YomuLog:collections';
const MANGA_TAGS_KEY = '@YomuLog:mangaTags';

// ─── Helpers ─────────────────────────────────────────────────────────

function generateId(): string {
  return `col_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

async function getJson<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch { return fallback; }
}

function setJson<T>(key: string, value: T): Promise<void> {
  return AsyncStorage.setItem(key, JSON.stringify(value));
}

function scheduleSync() {
  setTimeout(async () => {
    try {
      const { queueSync } = await import('./supabaseSyncService');
      await queueSync('favorites');
    } catch { /* non-critical */ }
  }, 0);
}

// ─── Collection CRUD ─────────────────────────────────────────────────

export async function getCollections(): Promise<Collection[]> {
  return getJson<Collection[]>(COLLECTIONS_KEY, []);
}

export async function getCollection(id: string): Promise<Collection | null> {
  const all = await getCollections();
  return all.find(c => c.id === id) ?? null;
}

export async function createCollection(
  name: string,
  type: CollectionType = 'standard',
  description?: string,
  initialMangaIds?: string[],
): Promise<Collection> {
  const all = await getCollections();
  const now = new Date().toISOString();
  const col: Collection = {
    id: generateId(),
    name: name.trim(),
    type,
    description,
    mangaIds: initialMangaIds ?? [],
    tags: [],
    createdAt: now,
    updatedAt: now,
  };
  all.push(col);
  await setJson(COLLECTIONS_KEY, all);
  scheduleSync();
  return col;
}

export async function updateCollection(
  id: string,
  updates: Partial<Pick<Collection, 'name' | 'description' | 'mangaIds' | 'tags'>>,
): Promise<Collection | null> {
  const all = await getCollections();
  const idx = all.findIndex(c => c.id === id);
  if (idx === -1) return null;
  all[idx] = { ...all[idx], ...updates, updatedAt: new Date().toISOString() };
  await setJson(COLLECTIONS_KEY, all);
  scheduleSync();
  return all[idx];
}

export async function deleteCollection(id: string): Promise<boolean> {
  const all = await getCollections();
  const filtered = all.filter(c => c.id !== id);
  if (filtered.length === all.length) return false;
  await setJson(COLLECTIONS_KEY, filtered);
  scheduleSync();
  return true;
}

export async function addMangaToCollection(collectionId: string, mangaId: string): Promise<Collection | null> {
  const col = await getCollection(collectionId);
  if (!col) return null;
  if (col.mangaIds.includes(mangaId)) return col;
  return updateCollection(collectionId, { mangaIds: [...col.mangaIds, mangaId] });
}

export async function removeMangaFromCollection(collectionId: string, mangaId: string): Promise<Collection | null> {
  const col = await getCollection(collectionId);
  if (!col) return null;
  return updateCollection(collectionId, { mangaIds: col.mangaIds.filter(id => id !== mangaId) });
}

/** Reorder a manga within a reading list collection */
export async function reorderMangaInCollection(
  collectionId: string,
  mangaId: string,
  newIndex: number,
): Promise<Collection | null> {
  const col = await getCollection(collectionId);
  if (!col || col.type !== 'reading_list') return null;
  const ids = col.mangaIds.filter(id => id !== mangaId);
  ids.splice(Math.min(newIndex, ids.length), 0, mangaId);
  return updateCollection(collectionId, { mangaIds: ids });
}

/** Get all collections that contain a given manga */
export async function getCollectionsForManga(mangaId: string): Promise<Collection[]> {
  const all = await getCollections();
  return all.filter(c => c.mangaIds.includes(mangaId));
}

// ─── Custom Manga Tags ───────────────────────────────────────────────

export async function getMangaTags(mangaId: string): Promise<string[]> {
  const all = await getJson<MangaTag[]>(MANGA_TAGS_KEY, []);
  return all.find(mt => mt.mangaId === mangaId)?.tags ?? [];
}

export async function setMangaTags(mangaId: string, tags: string[]): Promise<void> {
  const all = await getJson<MangaTag[]>(MANGA_TAGS_KEY, []);
  const idx = all.findIndex(mt => mt.mangaId === mangaId);
  const cleaned = tags.map(t => t.trim().toLowerCase()).filter(Boolean);
  if (idx >= 0) {
    all[idx] = { mangaId, tags: cleaned };
  } else {
    all.push({ mangaId, tags: cleaned });
  }
  await setJson(MANGA_TAGS_KEY, all);
  scheduleSync();
}

export async function addMangaTag(mangaId: string, tag: string): Promise<void> {
  const existing = await getMangaTags(mangaId);
  const cleaned = tag.trim().toLowerCase();
  if (!cleaned || existing.includes(cleaned)) return;
  await setMangaTags(mangaId, [...existing, cleaned]);
}

export async function removeMangaTag(mangaId: string, tag: string): Promise<void> {
  const existing = await getMangaTags(mangaId);
  await setMangaTags(mangaId, existing.filter(t => t !== tag.trim().toLowerCase()));
}

/** Get all unique tags across all manga */
export async function getAllTags(): Promise<string[]> {
  const all = await getJson<MangaTag[]>(MANGA_TAGS_KEY, []);
  const tagSet = new Set<string>();
  all.forEach(mt => mt.tags.forEach(t => tagSet.add(t)));
  return [...tagSet].sort();
}

/** Search manga by tag */
export async function findMangaByTag(tag: string): Promise<string[]> {
  const all = await getJson<MangaTag[]>(MANGA_TAGS_KEY, []);
  const normalized = tag.trim().toLowerCase();
  return all.filter(mt => mt.tags.includes(normalized)).map(mt => mt.mangaId);
}
