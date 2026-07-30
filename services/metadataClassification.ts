// services/metadataClassification.ts
// Smart local classification system — tracks user like/unlike/null actions
// and chapter completion rates to build a genre weighting vector for
// personalized manga recommendations.
//
// Vector: per-genre score = (likes - unlikes) × avg completion rate
// Normalised to 0–1 range. Used to fetch personalised recommendations.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { getFavorites, BookmarkedManga } from './favoritesService';
import { getAllChapterProgress, getMangaProgress } from './readingProgress';
import { fetchMangaList, Manga, fetchMangaById } from './mangaAPI';
import { GENRE_TAGS, GenreTag } from '../utils/filters';

// ─── Types ──────────────────────────────────────────────────────────────

export type UserVote = 'like' | 'unlike';

export type VoteEntry = {
  mangaId: string;
  mangaTitle: string;
  genres: string[];
  vote: UserVote;
  votedAt: string; // ISO
};

export type GenreWeight = {
  genre: GenreTag;
  /** Raw score: (likeCount - unlikeCount) * avgCompletionRate, range ≈ -1..1 */
  score: number;
  /** Normalised weight 0..1 */
  weight: number;
};

export type PersonalisedFeed = {
  genres: GenreWeight[];
  manga: Manga[];
};

// ─── Storage keys ───────────────────────────────────────────────────────

const VOTES_KEY = '@YomuLog:metadataVotes';
const WEIGHTS_CACHE_KEY = '@YomuLog:genreWeightsCache';
const WEIGHTS_CACHE_TTL = 1000 * 60 * 60; // 1 hour

let weightsCache: { weights: GenreWeight[]; ts: number } | null = null;

// ─── Helpers ────────────────────────────────────────────────────────────

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

/** Filter genre strings to only known GENRE_TAGS. */
function toKnownTags(genres: string[]): GenreTag[] {
  return genres.filter((g): g is GenreTag =>
    (GENRE_TAGS as readonly string[]).includes(g),
  );
}

// ─── Vote recording ─────────────────────────────────────────────────────

/** Get all vote entries. */
export async function getVotes(): Promise<VoteEntry[]> {
  return getJson<VoteEntry[]>(VOTES_KEY, []);
}

/**
 * Record a like vote for a manga. Called whenever the user adds a favorite.
 * Does NOT duplicate — if a vote already exists, only the timestamp updates.
 */
export async function recordLike(
  mangaId: string,
  mangaTitle: string,
  genres: string[],
): Promise<void> {
  await recordVote(mangaId, mangaTitle, genres, 'like');
}

/**
 * Record an unlike vote (user explicitly not interested).
 * Removes any previous like vote for the same manga.
 */
export async function recordUnlike(
  mangaId: string,
  mangaTitle: string,
  genres: string[],
): Promise<void> {
  await recordVote(mangaId, mangaTitle, genres, 'unlike');
}

async function recordVote(
  mangaId: string,
  mangaTitle: string,
  genres: string[],
  vote: UserVote,
): Promise<void> {
  const votes = await getVotes();
  const idx = votes.findIndex((v) => v.mangaId === mangaId);
  const entry: VoteEntry = {
    mangaId,
    mangaTitle,
    genres,
    vote,
    votedAt: new Date().toISOString(),
  };
  if (idx >= 0) {
    votes[idx] = entry;
  } else {
    votes.push(entry);
  }
  await setJson(VOTES_KEY, votes);
  // Invalidate weights cache
  weightsCache = null;
}

/** Clear a vote (set to null / remove from records). */
export async function clearVote(mangaId: string): Promise<void> {
  const votes = await getVotes();
  await setJson(VOTES_KEY, votes.filter((v) => v.mangaId !== mangaId));
  weightsCache = null;
}

// ─── Genre weight vector computation ─────────────────────────────────────

/**
 * Compute a genre weighting vector from user votes and reading progress.
 *
 * Algorithm:
 *   1. Collect all voted manga (likes + unlikes)
 *   2. For each unique genre among voted manga:
 *        likes  = count of liked  manga having this genre
 *        unlikes = count of unliked manga having this genre
 *        raw    = (likes - unlikes) / max(totalLikes, 1)
 *   3. Multiply raw score by average chapter completion rate for manga
 *      with this genre (from readingProgress).
 *   4. Normalise all scores to [0, 1] range.
 */
export async function computeGenreWeights(): Promise<GenreWeight[]> {
  // Check cache
  if (weightsCache && Date.now() - weightsCache.ts < WEIGHTS_CACHE_TTL) {
    return weightsCache.weights;
  }

  const votes = await getVotes();
  const allProgress = await getAllChapterProgress();

  if (votes.length === 0) {
    // No user data — return neutral vector
    const neutral: GenreWeight[] = GENRE_TAGS.map((g) => ({ genre: g as GenreTag, score: 0, weight: 0.5 }));
    return neutral;
  }

  const likes = votes.filter((v) => v.vote === 'like');
  const unlikes = votes.filter((v) => v.vote === 'unlike');
  const totalLikes = likes.length || 1;
  const totalUnlikes = unlikes.length || 1;

  // Build per-genre like/unlike counts
  const genreMap = new Map<GenreTag, { likeCount: number; unlikeCount: number; mangaIds: Set<string> }>();

  for (const v of votes) {
    const known = toKnownTags(v.genres);
    for (const g of known) {
      const entry = genreMap.get(g) ?? { likeCount: 0, unlikeCount: 0, mangaIds: new Set() };
      if (v.vote === 'like') entry.likeCount++;
      else entry.unlikeCount++;
      entry.mangaIds.add(v.mangaId);
      genreMap.set(g, entry);
    }
  }

  // Also include all GENRE_TAGS for coverage (even if no votes)
  for (const g of GENRE_TAGS) {
    if (!genreMap.has(g as GenreTag)) {
      genreMap.set(g as GenreTag, { likeCount: 0, unlikeCount: 0, mangaIds: new Set() });
    }
  }

  // Build progress index: mangaId → avg completion rate
  const progressByManga = new Map<string, number>();
  for (const p of allProgress) {
    const existing = progressByManga.get(p.mangaId);
    if (existing === undefined) {
      progressByManga.set(p.mangaId, p.scrollPercentage);
    } else {
      // Running average
      progressByManga.set(p.mangaId, (existing + p.scrollPercentage) / 2);
    }
  }

  // Compute raw scores
  const scored: GenreWeight[] = [];
  for (const [genre, data] of genreMap) {
    const likeRatio = data.likeCount / totalLikes;
    const unlikeRatio = data.unlikeCount / totalUnlikes;
    let raw = likeRatio - unlikeRatio;

    // Weight by avg completion rate for manga with this genre
    let avgCompletion = 0;
    let completedCount = 0;
    for (const mid of data.mangaIds) {
      const rate = progressByManga.get(mid);
      if (rate !== undefined) {
        avgCompletion += rate;
        completedCount++;
      }
    }
    if (completedCount > 0) {
      avgCompletion /= completedCount;
      // Scale: 0.5 (no reading) to 1.5 (fully read)
      const completionMultiplier = 0.5 + (avgCompletion / 100);
      raw *= completionMultiplier;
    }

    scored.push({ genre, score: raw, weight: 0 /* computed below */ });
  }

  // Normalise weights to [0, 1]
  const scores = scored.map((s) => s.score);
  const minScore = Math.min(...scores);
  const maxScore = Math.max(...scores);
  const range = maxScore - minScore || 1;

  for (const s of scored) {
    s.weight = (s.score - minScore) / range;
  }

  // Sort descending by weight
  scored.sort((a, b) => b.weight - a.weight);

  // Cache
  weightsCache = { weights: scored, ts: Date.now() };
  await setJson(WEIGHTS_CACHE_KEY, { weights: scored, ts: weightsCache.ts });

  return scored;
}

// ─── Personalised recommendations ────────────────────────────────────────

/**
 * Fetch personalised manga recommendations based on the user's genre weights.
 * Uses the top-weighted genres to query MangaDex, excluding already-voted manga.
 *
 * @param limit Max number of manga to return (default 10).
 */
export async function getPersonalisedRecommendations(limit = 10): Promise<Manga[]> {
  const weights = await computeGenreWeights();

  // Pick top 3 positively-weighted genres
  const topGenres = weights
    .filter((w) => w.weight > 0.5 && w.score > 0)
    .slice(0, 3);

  if (topGenres.length === 0) {
    // Fallback: use top genres by weight regardless of score
    topGenres.push(...weights.slice(0, 3));
  }

  // Get IDs for top genres
  const { GENRE_TAG_IDS } = await import('../utils/filters');
  const tagIds = topGenres
    .map((w) => GENRE_TAG_IDS[w.genre])
    .filter(Boolean);

  if (tagIds.length === 0) {
    // Ultimate fallback: popular manga
    return fetchMangaList({ limit, order: { followedCount: 'desc' } });
  }

  // Get already-voted manga IDs to exclude
  const votes = await getVotes();
  const excludeIds = new Set(votes.map((v) => v.mangaId));

  try {
    const results = await fetchMangaList({
      limit: limit + excludeIds.size,
      includedTags: tagIds,
      order: { rating: 'desc' },
    });

    return results
      .filter((m) => !excludeIds.has(m.id))
      .slice(0, limit);
  } catch {
    return [];
  }
}

/**
 * Convenience: auto-record a like vote when user adds a favorite.
 * Should be called alongside addFavorite().
 */
export async function onFavoriteAdded(
  mangaId: string,
  mangaTitle: string,
  genres?: string[],
): Promise<void> {
  // Try to fetch genres from MangaDex if not provided
  let resolvedGenres = genres ?? [];
  if (resolvedGenres.length === 0) {
    try {
      const manga = await fetchMangaById(mangaId);
      if (manga?.genres) resolvedGenres = manga.genres;
    } catch { /* pass */ }
  }
  await recordLike(mangaId, mangaTitle, resolvedGenres);
}

/**
 * Convenience: clear vote when user removes a favorite.
 * (We don't auto-record unlike — that's a separate explicit action.)
 */
export async function onFavoriteRemoved(mangaId: string): Promise<void> {
  await clearVote(mangaId);
}
