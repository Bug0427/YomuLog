// =============================================================================
// readingSessionService.ts
// G-4 measured reading time (KPI 2 — reading engagement index).
//
// Persists REAL reading time (not the chapters×3 heuristic) in two AsyncStorage
// maps so the stats engine and the cloud sync path can consume it:
//   - @YomuLog:readingSecondsByChapter — { [chapterId]: cumulative seconds }
//     (task requirement: per-chapter reading seconds)
//   - @YomuLog:readingSecondsByDay     — { 'YYYY-MM-DD': seconds }
//     (powers hours/week, total minutes, today)
//
// Anonymous + free users are covered too — this is plain AsyncStorage, no
// account required. The cloud path (supabaseSyncService 'stats' scope) pushes
// a 7-day rollup when a session exists.
// =============================================================================

import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── Keys & constants ──────────────────────────────────────────────────

const CHAPTER_SECONDS_KEY = '@YomuLog:readingSecondsByChapter';
const DAILY_SECONDS_KEY = '@YomuLog:readingSecondsByDay';

/** Entries older than this many days are pruned on write (keeps the map tiny). */
const MAX_DAYS_KEPT = 120;

// ─── Helpers ───────────────────────────────────────────────────────────

async function getJson<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function toDayKey(d: Date): string {
  // Local date key (YYYY-MM-DD). Local timezone, not UTC — a session at 11pm
  // counts toward the user's local day.
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function pruneDays(map: Record<string, number>): Record<string, number> {
  const cutoff = Date.now() - MAX_DAYS_KEPT * 86_400_000;
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(map)) {
    const t = new Date(k).getTime();
    if (!Number.isNaN(t) && t >= cutoff) out[k] = v;
  }
  return out;
}

// ─── Public API ────────────────────────────────────────────────────────

/**
 * Accumulate measured reading seconds for a chapter. Also rolls the same
 * seconds into the current local day. Safe to call frequently (debounced by
 * the caller); no-op when chapterId is missing or seconds <= 0.
 */
export async function recordReadingSeconds(
  chapterId: string,
  seconds: number,
): Promise<void> {
  if (!chapterId || !Number.isFinite(seconds) || seconds <= 0) return;
  const rounded = Math.round(seconds);
  if (rounded <= 0) return;

  const day = toDayKey(new Date());
  try {
    const [byChapter, byDay] = await Promise.all([
      getJson<Record<string, number>>(CHAPTER_SECONDS_KEY, {}),
      getJson<Record<string, number>>(DAILY_SECONDS_KEY, {}),
    ]);
    byChapter[chapterId] = (byChapter[chapterId] ?? 0) + rounded;
    byDay[day] = (byDay[day] ?? 0) + rounded;
    await Promise.all([
      AsyncStorage.setItem(CHAPTER_SECONDS_KEY, JSON.stringify(byChapter)),
      AsyncStorage.setItem(DAILY_SECONDS_KEY, JSON.stringify(pruneDays(byDay))),
    ]);
  } catch (e) {
    console.warn('readingSessionService: record failed (non-critical)', e);
  }
}

/** Per-chapter cumulative seconds (e.g. for the cloud per-chapter column). */
export async function getReadingSecondsByChapter(): Promise<Record<string, number>> {
  return getJson<Record<string, number>>(CHAPTER_SECONDS_KEY, {});
}

/** Per-local-day cumulative seconds. */
export async function getReadingSecondsByDay(): Promise<Record<string, number>> {
  return getJson<Record<string, number>>(DAILY_SECONDS_KEY, {});
}

/** Total measured reading seconds across all history. */
export async function getReadingSecondsTotal(): Promise<number> {
  const byDay = await getReadingSecondsByDay();
  return Object.values(byDay).reduce((s, v) => s + v, 0);
}

/** Measured reading seconds over the trailing N days (includes today). */
export async function getReadingSecondsForLastDays(days: number): Promise<number> {
  const byDay = await getReadingSecondsByDay();
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - (days - 1));
  cutoff.setHours(0, 0, 0, 0);
  const cutoffKey = toDayKey(cutoff);
  let total = 0;
  for (const [k, v] of Object.entries(byDay)) {
    if (k >= cutoffKey) total += v;
  }
  return total;
}

/** Measured reading seconds today. */
export async function getReadingSecondsToday(): Promise<number> {
  const byDay = await getReadingSecondsByDay();
  return byDay[toDayKey(new Date())] ?? 0;
}
