// services/readingProgress.ts
// Persists reading progress locally via AsyncStorage.
// Tracks per-chapter scroll percentage and read status,
// and maintains a "recently read" list of up to 30 manga series.

import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── Types ─────────────────────────────────────────────────────────

export type ChapterProgress = {
  chapterId: string;
  mangaId: string;
  mangaTitle: string;
  mangaImage?: string;
  chapterTitle?: string;
  chapterNumber: number;
  scrollPercentage: number;   // 0–100
  isRead: boolean;             // true when scrollPercentage >= 90
  lastReadAt: string;          // ISO timestamp
};

export type RecentlyReadEntry = {
  mangaId: string;
  mangaTitle: string;
  mangaImage?: string;
  lastReadAt: string;          // ISO timestamp (most recent chapter access)
  totalChapters: number;
  readChapters: number;        // chapters with isRead === true
};

// ─── Storage keys ─────────────────────────────────────────────────

const KEYS = {
  CHAPTER_PROGRESS: '@YomuLog:chapterProgress',
  RECENTLY_READ: '@YomuLog:recentlyRead',
};

const MAX_RECENTLY_READ = 30;
const READ_THRESHOLD = 90; // %

// ─── Helpers ──────────────────────────────────────────────────────

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

// ─── Chapter-level progress ───────────────────────────────────────

/** Get progress for every tracked chapter. */
export async function getAllChapterProgress(): Promise<ChapterProgress[]> {
  return getJson<ChapterProgress[]>(KEYS.CHAPTER_PROGRESS, []);
}

/** Get progress for a specific chapter (or null if untracked). */
export async function getChapterProgress(
  mangaId: string,
  chapterId: string,
): Promise<ChapterProgress | null> {
  const all = await getAllChapterProgress();
  return all.find((c) => c.mangaId === mangaId && c.chapterId === chapterId) ?? null;
}

/** Get all chapter progress for a specific manga series. */
export async function getMangaProgress(
  mangaId: string,
): Promise<ChapterProgress[]> {
  const all = await getAllChapterProgress();
  return all.filter((c) => c.mangaId === mangaId);
}

/**
 * Update (or insert) progress for a single chapter.
 * Automatically sets `isRead` when scrollPercentage >= READ_THRESHOLD (90%).
 * Also updates the recently-read index.
 */
export async function updateChapterProgress(
  progress: Omit<ChapterProgress, 'isRead' | 'lastReadAt'> & { scrollPercentage?: number },
): Promise<void> {
  const now = new Date().toISOString();
  const scrollPct = Math.min(100, Math.max(0, progress.scrollPercentage ?? 0));

  const entry: ChapterProgress = {
    ...progress,
    scrollPercentage: scrollPct,
    isRead: scrollPct >= READ_THRESHOLD,
    lastReadAt: now,
  };

  // Update chapter progress store
  const all = await getAllChapterProgress();
  const idx = all.findIndex(
    (c) => c.mangaId === entry.mangaId && c.chapterId === entry.chapterId,
  );
  if (idx >= 0) {
    // Merge: preserve read status if already read, but allow overwrite
    const existing = all[idx];
    all[idx] = {
      ...existing,
      ...entry,
      // If it was already marked read, keep it read unless explicitly cleared
      isRead: existing.isRead || entry.isRead,
      lastReadAt: now,
    };
  } else {
    all.push(entry);
  }
  await setJson(KEYS.CHAPTER_PROGRESS, all);

  // Mirror into recently read index
  await upsertRecentlyRead(entry.mangaId, entry.mangaTitle, entry.mangaImage);
}

/** Mark a chapter as fully read (100 %). */
export async function markChapterRead(
  mangaId: string,
  chapterId: string,
  mangaTitle: string,
  mangaImage?: string,
  chapterTitle?: string,
  chapterNumber?: number,
): Promise<void> {
  await updateChapterProgress({
    chapterId,
    mangaId,
    mangaTitle,
    mangaImage,
    chapterTitle,
    chapterNumber: chapterNumber ?? 0,
    scrollPercentage: 100,
  });
}

// ─── Recently-read index ──────────────────────────────────────────

/** Get the ordered recently-read list (most recent first). */
export async function getRecentlyRead(): Promise<RecentlyReadEntry[]> {
  return getJson<RecentlyReadEntry[]>(KEYS.RECENTLY_READ, []);
}

async function upsertRecentlyRead(
  mangaId: string,
  mangaTitle: string,
  mangaImage?: string,
): Promise<void> {
  const list = await getRecentlyRead();

  // Recompute read chapter count from progress store
  const chapters = await getMangaProgress(mangaId);
  const readChapters = chapters.filter((c) => c.isRead).length;

  const now = new Date().toISOString();
  const idx = list.findIndex((e) => e.mangaId === mangaId);

  const entry: RecentlyReadEntry = {
    mangaId,
    mangaTitle,
    mangaImage,
    lastReadAt: now,
    totalChapters: Math.max(chapters.length, list[idx]?.totalChapters ?? 1),
    readChapters,
  };

  if (idx >= 0) {
    list[idx] = entry;
  } else {
    list.push(entry);
  }

  // Sort: most recent first, cap at MAX
  list.sort((a, b) => b.lastReadAt.localeCompare(a.lastReadAt));
  const trimmed = list.slice(0, MAX_RECENTLY_READ);

  await setJson(KEYS.RECENTLY_READ, trimmed);
}

/** Clear all progress data (for testing / user reset). */
export async function clearAllProgress(): Promise<void> {
  await AsyncStorage.removeItem(KEYS.CHAPTER_PROGRESS);
  await AsyncStorage.removeItem(KEYS.RECENTLY_READ);
}