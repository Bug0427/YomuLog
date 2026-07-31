/**
 * readingStatsService.ts — Premium Reading Statistics Engine
 * Computes reading streaks, completion stats, genre breakdowns,
 * session time distribution, and monthly calendar heatmaps.
 */
import { getAllChapterProgress, ChapterProgress, RecentlyReadEntry } from './readingProgress';
import { getFavorites, BookmarkedManga } from './favoritesService';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── Types ───────────────────────────────────────────────────────────

export type ReadingStats = {
  // Existing
  totalChaptersRead: number;
  totalChaptersStarted: number;
  totalSeriesRead: number;
  totalSeriesCompleted: number;
  completionRate: number;
  estimatedReadingMinutes: number;
  readingStreakDays: number;
  averageScrollDepth: number;
  favoriteReadingDay: number;
  recentActivity: ChapterProgress[];
  weeklyActivity: { day: string; count: number }[];

  // New — Enhanced
  longestStreak: number;
  currentStreak: number;
  sessionDistribution: { label: string; count: number; color: string }[];
  genreDistribution: { label: string; count: number; color: string }[];
  monthlyCalendar: { date: string; count: number; level: number }[];
  totalSeriesInLibrary: number;
};

// ─── Constants ───────────────────────────────────────────────────────

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MIN_PER_CH = 3;
const STREAK_STORAGE_KEY = '@YomuLog:readingStats:streak';

const TIME_SLOTS = [
  { label: 'Morning', range: [6, 12], color: '#f59e0b' },
  { label: 'Afternoon', range: [12, 18], color: '#ef4444' },
  { label: 'Evening', range: [18, 22], color: '#8b5cf6' },
  { label: 'Night', range: [22, 24], color: '#1e3a5f' },
  { label: 'Night', range: [0, 6], color: '#1e3a5f' }, // merged with Night
];

const GENRE_COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4',
  '#8b5cf6', '#ec4899', '#f43f5e', '#0ea5e9', '#84cc16',
  '#a855f7', '#14b8a6', '#f59e0b', '#3b82f6', '#d946ef',
];

// ─── Persisted streak ───────────────────────────────────────────────

async function getStoredLongestStreak(): Promise<number> {
  try {
    const raw = await AsyncStorage.getItem(STREAK_STORAGE_KEY);
    return raw ? parseInt(raw, 10) : 0;
  } catch { return 0; }
}

async function saveLongestStreak(streak: number): Promise<void> {
  await AsyncStorage.setItem(STREAK_STORAGE_KEY, String(streak));
}

// ─── Compute ─────────────────────────────────────────────────────────

export async function computeReadingStats(): Promise<ReadingStats> {
  const [all, favorites] = await Promise.all([
    getAllChapterProgress(),
    getFavorites(),
  ]);

  const read = all.filter((c) => c.isRead);
  const totalChaptersRead = read.length;
  const totalChaptersStarted = all.length;
  const totalSeriesRead = new Set(all.map((c) => c.mangaId)).size;

  // Series completion
  const sm = new Map<string, ChapterProgress[]>();
  for (const ch of all) {
    const a = sm.get(ch.mangaId) ?? [];
    a.push(ch);
    sm.set(ch.mangaId, a);
  }
  let totalSeriesCompleted = 0;
  for (const [, chs] of sm) {
    if (chs.length > 0 && chs.every((c) => c.isRead)) totalSeriesCompleted++;
  }

  const completionRate = totalChaptersStarted > 0
    ? Math.round((totalChaptersRead / totalChaptersStarted) * 100) : 0;
  const estimatedReadingMinutes = totalChaptersRead * MIN_PER_CH;
  const avgDepth = all.length > 0
    ? Math.round(all.reduce((s, c) => s + c.scrollPercentage, 0) / all.length) : 0;

  // Streaks
  const sorted = [...all].sort(
    (a, b) => new Date(b.lastReadAt).getTime() - new Date(a.lastReadAt).getTime()
  );
  const uniqueDays = [...new Set(sorted.map((c) => c.lastReadAt.slice(0, 10)))].sort().reverse();

  // Current streak
  let currentStreak = 0;
  let check = toISODate(new Date());
  for (const d of uniqueDays) {
    if (d === check) { currentStreak++; check = prevDayStr(check); }
    else if (d === prevDayStr(check)) { currentStreak++; check = d; }
    else break;
  }

  // Longest streak (across all history)
  let longestEver = 0;
  let run = 0;
  let prevDate = '';
  for (const d of uniqueDays) {
    if (!prevDate) { run = 1; }
    else if (d === prevDayStr(prevDate)) { run++; }
    else { run = 1; }
    if (run > longestEver) longestEver = run;
    prevDate = d;
  }

  // Persist longest streak
  const storedLongest = await getStoredLongestStreak();
  const longestStreak = Math.max(longestEver, storedLongest);
  if (longestStreak > storedLongest) await saveLongestStreak(longestStreak);

  // Favorite day
  const dc = [0, 0, 0, 0, 0, 0, 0];
  for (const c of all) dc[new Date(c.lastReadAt).getDay()]++;
  const favoriteReadingDay = dc.indexOf(Math.max(...dc));

  // Recent
  const recent = sorted.slice(0, 10);

  // Weekly
  const weekly: { day: string; count: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    weekly.push({
      day: DAYS[d.getDay()],
      count: all.filter((c) => c.lastReadAt.slice(0, 10) === toISODate(d)).length,
    });
  }

  // ── Session time distribution ──────────────────────────────────
  const sessionCounts = TIME_SLOTS.map((s) => ({ ...s, count: 0 }));
  for (const c of all) {
    const hour = new Date(c.lastReadAt).getHours();
    for (const slot of sessionCounts) {
      if (hour >= slot.range[0] && hour < slot.range[1]) {
        slot.count++;
        break;
      }
    }
  }
  // Merge the two Night slots
  const nightTotal = sessionCounts[3].count + sessionCounts[4].count;
  const sessionDistribution = [
    sessionCounts[0],
    sessionCounts[1],
    sessionCounts[2],
    { label: 'Night', range: [0, 6], color: '#1e3a5f', count: nightTotal },
  ];

  // ── Genre distribution (from favorites) ────────────────────────
  const genreMap = new Map<string, number>();
  for (const fav of favorites) {
    const genres = fav.genres ?? [];
    for (const g of genres) {
      genreMap.set(g, (genreMap.get(g) ?? 0) + 1);
    }
  }
  const genreDistribution = Array.from(genreMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([label, count], i) => ({
      label: label.replace(/-/g, ' '),
      count,
      color: GENRE_COLORS[i % GENRE_COLORS.length],
    }));

  // ── Monthly calendar heatmap (last 4 months) ───────────────────
  const calendarMap = new Map<string, number>();
  for (const c of all) {
    const date = c.lastReadAt.slice(0, 10);
    calendarMap.set(date, (calendarMap.get(date) ?? 0) + 1);
  }

  const maxCal = Math.max(1, ...calendarMap.values());
  const monthlyCalendar: { date: string; count: number; level: number }[] = [];
  const now = new Date();
  for (let i = 120; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dateStr = toISODate(d);
    const count = calendarMap.get(dateStr) ?? 0;
    const level = count === 0 ? 0 : count <= maxCal * 0.25 ? 1 : count <= maxCal * 0.5 ? 2 : count <= maxCal * 0.75 ? 3 : 4;
    monthlyCalendar.push({ date: dateStr, count, level });
  }

  return {
    totalChaptersRead,
    totalChaptersStarted,
    totalSeriesRead,
    totalSeriesCompleted,
    completionRate,
    estimatedReadingMinutes,
    readingStreakDays: currentStreak,
    averageScrollDepth: avgDepth,
    favoriteReadingDay,
    recentActivity: recent,
    weeklyActivity: weekly,
    longestStreak,
    currentStreak,
    sessionDistribution,
    genreDistribution,
    monthlyCalendar,
    totalSeriesInLibrary: favorites.length,
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────

function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function prevDayStr(s: string): string {
  const d = new Date(s);
  d.setDate(d.getDate() - 1);
  return toISODate(d);
}

export function fmtTime(m: number): string {
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r > 0 ? `${h}h ${r}m` : `${h}h`;
}

export function fmtLastRead(s: string): string {
  const d = new Date(s);
  const diff = Math.floor((Date.now() - d.getTime()) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  if (diff < 7) return `${diff}d ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
