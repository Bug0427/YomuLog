// services/reverseImageSearch.ts
// Reverse image search — pick an image from camera roll, extract a color fingerprint,
// and match against MangaDex covers to find visually similar manga.

import * as ImagePicker from 'expo-image-picker';
import { manipulateAsync } from 'expo-image-manipulator';
import { fetchMangaList, Manga } from './mangaAPI';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RisMatch {
  manga: Manga;
  /** Similarity score 0–1 (higher = more similar) */
  score: number;
}

/** Internal fingerprint: 64-bin normalised histogram */
type Fingerprint = Float64Array;

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const FINGERPRINT_SIZE = 64;       // 64-bin histogram
const THUMBNAIL_SIZE = 64;         // resize images to 64×64 for fingerprinting
const CANDIDATE_COUNT = 30;        // how many manga covers to compare against
const FINGERPRINT_BINS = FINGERPRINT_SIZE;
const BYTES_PER_BIN = 256 / FINGERPRINT_BINS; // 4

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Open the system image library and return the selected asset.
 * Returns null when the user cancels or an error occurs.
 */
export async function pickImageFromLibrary(): Promise<ImagePicker.ImagePickerAsset | null> {
  try {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      console.warn('[RIS] Media library permission denied');
      return null;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: 0.9,
    });

    if (result.canceled || !result.assets || result.assets.length === 0) {
      return null;
    }

    return result.assets[0];
  } catch (err) {
    console.error('[RIS] pickImageFromLibrary error:', err);
    return null;
  }
}

/**
 * Search for manga visually similar to the image at `imageUri`.
 * Returns matches sorted by similarity score (best first).
 */
export async function searchByImage(imageUri: string): Promise<RisMatch[]> {
  // 1. Fingerprint user image
  const userFp = await computeFingerprint(imageUri);
  if (!userFp) return [];

  // 2. Fetch candidate manga with covers from MangaDex
  const candidates = await fetchCandidates();
  if (candidates.length === 0) return [];

  // 3. Download + fingerprint each candidate cover, compute similarity
  const matches: RisMatch[] = [];
  const COVER_BASE = 'https://uploads.mangadex.org/covers';

  for (const m of candidates) {
    if (!m.coverImageUrl) continue;
    try {
      // MangaDex cover URLs are like: https://uploads.mangadex.org/covers/{mangaId}/{fileName}.256.jpg
      const coverFp = await computeFingerprint(m.coverImageUrl);
      if (!coverFp) continue;
      const score = compareHistograms(userFp, coverFp);
      matches.push({ manga: m, score });
    } catch {
      // skip covers that fail to download
    }
  }

  // 4. Sort by score descending
  matches.sort((a, b) => b.score - a.score);
  return matches;
}

// ---------------------------------------------------------------------------
// Fingerprint helpers
// ---------------------------------------------------------------------------

/**
 * Download an image, resize to THUMBNAIL_SIZE×THUMBNAIL_SIZE JPEG, fetch the
 * resulting bytes, and build a 64-bin colour histogram.
 * Returns null on any failure.
 */
async function computeFingerprint(uri: string): Promise<Fingerprint | null> {
  try {
    // Resize to small uniform thumbnail
    const resized = await manipulateAsync(
      uri,
      [{ resize: { width: THUMBNAIL_SIZE, height: THUMBNAIL_SIZE } }],
      { format: 'jpeg' as any, compress: 0.7, base64: false }
    );

    // Fetch resized image bytes
    const response = await fetch(resized.uri);
    if (!response.ok) return null;
    const buffer = await response.arrayBuffer();
    const bytes = new Uint8Array(buffer);

    // Build histogram from raw JPEG bytes (sampling at regular intervals)
    const hist = new Float64Array(FINGERPRINT_BINS);
    const step = Math.max(1, Math.floor(bytes.length / (THUMBNAIL_SIZE * THUMBNAIL_SIZE)));
    let sampled = 0;

    for (let i = 0; i < bytes.length && sampled < THUMBNAIL_SIZE * THUMBNAIL_SIZE; i += step) {
      const bin = Math.min(FINGERPRINT_BINS - 1, Math.floor(bytes[i] / BYTES_PER_BIN));
      hist[bin]++;
      sampled++;
    }

    // Normalise
    const total = sampled || 1;
    for (let i = 0; i < FINGERPRINT_BINS; i++) {
      hist[i] /= total;
    }

    return hist;
  } catch (err) {
    console.warn('[RIS] computeFingerprint error:', err);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Candidate fetching
// ---------------------------------------------------------------------------

/** Fetch popular manga with valid cover art from MangaDex. */
async function fetchCandidates(): Promise<Manga[]> {
  try {
    // Fetch popular manga sorted by rating (good diversity of covers)
    const popular = await fetchMangaList({
      limit: CANDIDATE_COUNT,
      order: { rating: 'desc' },
      includedTags: [], // no tag filter — get broad diversity
    });
    return popular.filter((m) => !!m.coverImageUrl);
  } catch (err) {
    console.warn('[RIS] fetchCandidates error:', err);
    return [];
  }
}

// ---------------------------------------------------------------------------
// Comparison
// ---------------------------------------------------------------------------

/**
 * Histogram intersection score (0–1).
 * Higher = more similar colour distribution.
 */
function compareHistograms(a: Fingerprint, b: Fingerprint): number {
  let intersection = 0;
  for (let i = 0; i < FINGERPRINT_BINS; i++) {
    intersection += Math.min(a[i], b[i]);
  }
  // Clamp to [0, 1] for safety
  return Math.min(1, Math.max(0, intersection));
}
