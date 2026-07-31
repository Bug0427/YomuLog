// services/offlineFallback.ts
// Stale-data caching layer for key API responses.
// When fetch fails (network error), returns the last successful cached result
// instead of propagating the error — enabling "offline-first" UX.
//
// Also provides a connectivity hook for reactive UI updates.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Manga } from './mangaAPI';

// ─── Cache types ─────────────────────────────────────────────────────

type CacheEntry<T> = {
  data: T;
  timestamp: number;
};

// ─── Generic stale-data fetcher ──────────────────────────────────────

/**
 * Wraps an async fetch function with stale-data fallback.
 * On success: caches the result and returns it.
 * On failure: returns the last cached result if available, otherwise rethrows.
 *
 * @param cacheKey AsyncStorage key for the cache
 * @param fetcher The actual fetch function
 * @param maxAgeMs Maximum age of cached data (default 30 minutes)
 */
async function withStaleFallback<T>(
  cacheKey: string,
  fetcher: () => Promise<T>,
  maxAgeMs = 30 * 60 * 1000,
): Promise<{ data: T; fromCache: boolean }> {
  try {
    const data = await fetcher();
    // Cache on success
    const entry: CacheEntry<T> = { data, timestamp: Date.now() };
    await AsyncStorage.setItem(cacheKey, JSON.stringify(entry)).catch(() => {});
    return { data, fromCache: false };
  } catch (err) {
    // Try cache on failure
    try {
      const raw = await AsyncStorage.getItem(cacheKey);
      if (raw) {
        const entry: CacheEntry<T> = JSON.parse(raw);
        if (Date.now() - entry.timestamp < maxAgeMs) {
          return { data: entry.data, fromCache: true };
        }
      }
    } catch { /* cache miss */ }
    throw err; // no valid cache — propagate error
  }
}

// ─── Specialised cached fetchers ─────────────────────────────────────

const HOME_CACHE_KEY = '@YomuLog:cache:homeSliders';
const SEARCH_CACHE_PREFIX = '@YomuLog:cache:search:';

export async function fetchHomeSlidersWithFallback(
  fetcher: () => Promise<Record<string, Manga[]>>,
): Promise<{ data: Record<string, Manga[]>; fromCache: boolean }> {
  return withStaleFallback(HOME_CACHE_KEY, fetcher);
}

export async function fetchSearchResultsWithFallback(
  queryKey: string,
  fetcher: () => Promise<Manga[]>,
): Promise<{ data: Manga[]; fromCache: boolean }> {
  return withStaleFallback(`${SEARCH_CACHE_PREFIX}${queryKey}`, fetcher, 5 * 60 * 1000);
}

export async function fetchLibraryWithFallback(
  fetcher: () => Promise<Manga[]>,
): Promise<{ data: Manga[]; fromCache: boolean }> {
  return withStaleFallback('@YomuLog:cache:library', fetcher, 10 * 60 * 1000);
}

// ─── Cache invalidation ──────────────────────────────────────────────

/** Clear all stale-data caches (e.g., on manual refresh) */
export async function clearAllCaches(): Promise<void> {
  const keys = await AsyncStorage.getAllKeys();
  const cacheKeys = keys.filter(k => k.startsWith('@YomuLog:cache:'));
  await Promise.all(cacheKeys.map(k => AsyncStorage.removeItem(k).catch(() => {})));
}
