// services/genreSuggestionService.ts
// Suggests top genres based on user's reading behaviour (bookmarked + recently read manga).
// Returns genre slugs matching the GENRE_TAGS constant in utils/filters.
import { getFavorites, BookmarkedManga } from './favoritesService';
import { getRecentlyRead } from './readingProgress';
import { fetchMangaById } from './mangaAPI';
import { GENRE_TAGS, GenreTag } from '../utils/filters';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_KEY = '@YomuLog:genreSuggestions';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const TOP_N = 10;

type GenreCount = { genre: GenreTag; count: number };

let memoryCache: { tags: GenreTag[]; ts: number } | null = null;

// ─── Helpers ───────────────────────────────────────────────────────

/** Return only genres that exist in our known GENRE_TAGS set. */
function toKnownTags(genres: string[]): GenreTag[] {
  return genres.filter((g): g is GenreTag =>
    (GENRE_TAGS as readonly string[]).includes(g),
  );
}

/** Load genre frequency cache from AsyncStorage. */
async function loadCache(): Promise<GenreTag[] | null> {
  if (memoryCache && Date.now() - memoryCache.ts < CACHE_TTL_MS) {
    return memoryCache.tags;
  }
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed: { tags: GenreTag[]; ts: number } = JSON.parse(raw);
    if (Date.now() - parsed.ts > CACHE_TTL_MS) return null; // stale
    memoryCache = parsed;
    return parsed.tags;
  } catch {
    return null;
  }
}

/** Persist genre suggestions to AsyncStorage + memory. */
async function saveCache(tags: GenreTag[]): Promise<void> {
  memoryCache = { tags, ts: Date.now() };
  await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(memoryCache));
}

// ─── Core engine ───────────────────────────────────────────────────

/**
 * Compute the top-N genre suggestions from the user's library.
 * Priority sources (highest first):
 *  1. Genres already stored on bookmarked manga (fast, offline)
 *  2. Fallback: fetch manga details from MangaDex for recently-read titles
 *     that aren't bookmarked (slower, online)
 *
 * Results are cached for 24 hours.
 */
export async function getSuggestedGenres(): Promise<GenreTag[]> {
  const cached = await loadCache();
  if (cached) return cached;

  const genreMap = new Map<GenreTag, number>();

  function addGenres(genres: string[]): void {
    const known = toKnownTags(genres);
    for (const g of known) {
      genreMap.set(g, (genreMap.get(g) ?? 0) + 1);
    }
  }

  // ── Source 1: Bookmarked manga (already has genres cached) ──────
  let bookmarks: BookmarkedManga[];
  try {
    bookmarks = await getFavorites();
  } catch {
    bookmarks = [];
  }
  for (const bm of bookmarks) {
    if (bm.genres && bm.genres.length > 0) {
      addGenres(bm.genres);
    }
  }

  // ── Source 2: Recently-read IDs that aren't already counted ─────
  if (genreMap.size < 3) {
    // Not enough data from bookmarks — try fetching from MangaDex
    try {
      const recent = await getRecentlyRead();
      const bookmarkedIds = new Set(bookmarks.map((b) => b.mangaId));
      const toFetch = recent
        .filter((r) => !bookmarkedIds.has(r.mangaId))
        .slice(0, 5); // limit API calls

      for (const entry of toFetch) {
        try {
          const manga = await fetchMangaById(entry.mangaId);
          if (manga?.genres) {
            addGenres(manga.genres);
          }
        } catch {
          // skip individual failures
        }
      }
    } catch {
      // pass
    }
  }

  // ── Build sorted top-N list ─────────────────────────────────────
  const sorted: GenreCount[] = [...genreMap.entries()]
    .map(([genre, count]) => ({ genre, count }))
    .sort((a, b) => b.count - a.count);

  let topTags = sorted.slice(0, TOP_N).map((g) => g.genre);

  // ── Fallback: if we still have nothing, return a sensible default ──
  if (topTags.length === 0) {
    topTags = (GENRE_TAGS as unknown as GenreTag[]).slice(0, TOP_N);
  }

  await saveCache(topTags);
  return topTags;
}

/** Clear the suggestion cache (e.g. after "Reset AI Recommendations"). */
export async function clearGenreSuggestions(): Promise<void> {
  memoryCache = null;
  await AsyncStorage.removeItem(CACHE_KEY);
}
