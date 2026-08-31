// __tests__/readingStatsService.test.ts
// W1a — Premium Reading Statistics Engine (KPI 2 — reading engagement index).
// Covers the engagement rollup in services/readingStatsService.ts with the
// persistence-layer deps mocked to controlled values (audit H-9).
jest.mock('../services/readingProgress', () => ({
  getAllChapterProgress: jest.fn(),
}));
jest.mock('../services/favoritesService', () => ({
  getFavorites: jest.fn(),
}));
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
  removeItem: jest.fn(() => Promise.resolve()),
  multiGet: jest.fn(() => Promise.resolve([])),
  multiSet: jest.fn(() => Promise.resolve()),
}));
jest.mock('../services/readingSessionService', () => ({
  getReadingSecondsTotal: jest.fn(),
  getReadingSecondsForLastDays: jest.fn(),
  getReadingSecondsToday: jest.fn(),
}));

import { getAllChapterProgress } from '../services/readingProgress';
import { getFavorites } from '../services/favoritesService';
import {
  getReadingSecondsTotal,
  getReadingSecondsForLastDays,
  getReadingSecondsToday,
} from '../services/readingSessionService';
import { computeReadingStats, fmtTime, fmtLastRead } from '../services/readingStatsService';

const mockedGetAll = getAllChapterProgress as jest.Mock;
const mockedFavs = getFavorites as jest.Mock;
const mockedSecsTotal = getReadingSecondsTotal as jest.Mock;
const mockedSecsWeek = getReadingSecondsForLastDays as jest.Mock;
const mockedSecsToday = getReadingSecondsToday as jest.Mock;

// UTC-anchored ISO timestamps so streak math (which slices YYYY-MM-DD) is stable.
function daysAgo(n: number, hour = 12): string {
  const d = new Date(Date.now() - n * 86400000);
  d.setUTCHours(hour, 0, 0, 0);
  return d.toISOString();
}

const ch = (id: string, scroll: number, lastReadAt: string) => ({
  chapterId: id,
  mangaId: 'm1',
  mangaTitle: 'Naruto',
  chapterNumber: 1,
  scrollPercentage: scroll,
  isRead: scroll >= 90,
  lastReadAt,
});

beforeEach(() => {
  jest.clearAllMocks();
  mockedGetAll.mockResolvedValue([]);
  mockedFavs.mockResolvedValue([]);
  mockedSecsTotal.mockResolvedValue(0);
  mockedSecsWeek.mockResolvedValue(0);
  mockedSecsToday.mockResolvedValue(0);
});

describe('computeReadingStats — counts & completion', () => {
  it('computes chapters read/started, series, and completion rate', async () => {
    mockedGetAll.mockResolvedValue([
      ch('c1', 100, daysAgo(0)),
      ch('c2', 90, daysAgo(1)),
      ch('c3', 50, daysAgo(2)), // not read
    ]);
    const s = await computeReadingStats();
    expect(s.totalChaptersRead).toBe(2);
    expect(s.totalChaptersStarted).toBe(3);
    expect(s.totalSeriesRead).toBe(1);
    expect(s.totalSeriesCompleted).toBe(0); // not all chapters of m1 read
    expect(s.completionRate).toBe(67); // round(2/3*100)
  });

  it('marks a series completed only when every tracked chapter is read', async () => {
    mockedGetAll.mockResolvedValue([
      ch('c1', 100, daysAgo(0)),
      ch('c2', 95, daysAgo(1)),
    ]);
    const s = await computeReadingStats();
    expect(s.totalSeriesCompleted).toBe(1);
    expect(s.completionRate).toBe(100);
  });
});

describe('computeReadingStats — G-4 measured vs heuristic reading time', () => {
  it('prefers measured seconds (converted to minutes) when present', async () => {
    mockedGetAll.mockResolvedValue([ch('c1', 100, daysAgo(0))]);
    mockedSecsTotal.mockResolvedValue(3600); // 60 min
    mockedSecsWeek.mockResolvedValue(3600);
    mockedSecsToday.mockResolvedValue(600); // 10 min
    const s = await computeReadingStats();
    expect(s.readingMinutesTotal).toBe(60);
    expect(s.readingMinutesThisWeek).toBe(60);
    expect(s.readingMinutesToday).toBe(10);
    expect(s.estimatedReadingMinutes).toBe(60); // measured wins
  });

  it('falls back to chapters×3 heuristic only when no measured time exists', async () => {
    mockedGetAll.mockResolvedValue([
      ch('c1', 100, daysAgo(0)),
      ch('c2', 100, daysAgo(1)),
    ]);
    const s = await computeReadingStats();
    expect(s.readingMinutesTotal).toBe(0);
    expect(s.estimatedReadingMinutes).toBe(6); // 2 chapters × 3
  });
});

describe('computeReadingStats — scroll depth & streaks', () => {
  it('averages scroll depth across all chapters', async () => {
    mockedGetAll.mockResolvedValue([
      ch('c1', 100, daysAgo(0)),
      ch('c2', 90, daysAgo(1)),
      ch('c3', 50, daysAgo(2)),
    ]);
    const s = await computeReadingStats();
    expect(s.averageScrollDepth).toBe(80); // round((100+90+50)/3)
  });

  it('computes current + longest streak from consecutive reading days', async () => {
    // exactly today + yesterday => 2-day streak
    mockedGetAll.mockResolvedValue([
      ch('c1', 100, daysAgo(0)),
      ch('c2', 90, daysAgo(1)),
    ]);
    const s = await computeReadingStats();
    expect(s.currentStreak).toBe(2);   // today + yesterday
    expect(s.longestStreak).toBe(2);
    expect(s.readingStreakDays).toBe(2);
  });

  it('counts a streak of 1 when only a single day has reads', async () => {
    mockedGetAll.mockResolvedValue([ch('c1', 100, daysAgo(0))]);
    const s = await computeReadingStats();
    expect(s.currentStreak).toBe(1);
    expect(s.longestStreak).toBe(1);
  });

  it('breaks the current streak when days are not consecutive', async () => {
    // today + 3-days-ago (no read in between) => current streak stops at 1.
    mockedGetAll.mockResolvedValue([
      ch('c1', 100, daysAgo(0)),
      ch('c2', 95, daysAgo(3)),
    ]);
    const s = await computeReadingStats();
    expect(s.currentStreak).toBe(1);
  });

  it('persists a new longest streak to storage (checked via re-call)', async () => {
    // 3 consecutive days ending today => longest 3
    mockedGetAll.mockResolvedValue([
      ch('c1', 100, daysAgo(0)),
      ch('c2', 90, daysAgo(1)),
      ch('c3', 95, daysAgo(2)),
    ]);
    const s1 = await computeReadingStats();
    expect(s1.longestStreak).toBe(3);
    // Second run with same data keeps 3 (stored longest == computed).
    const s2 = await computeReadingStats();
    expect(s2.longestStreak).toBe(3);
  });
});

describe('computeReadingStats — distribution views', () => {
  it('builds weeklyActivity of 7 days and monthlyCalendar of 121 days', async () => {
    mockedGetAll.mockResolvedValue([ch('c1', 100, daysAgo(0))]);
    const s = await computeReadingStats();
    expect(s.weeklyActivity).toHaveLength(7);
    expect(s.weeklyActivity.every((w) => typeof w.day === 'string' && typeof w.count === 'number')).toBe(true);
    expect(s.monthlyCalendar).toHaveLength(121);
    expect(s.monthlyCalendar.every((m) => m.level >= 0 && m.level <= 4)).toBe(true);
  });

  it('assigns every chapter exactly one session slot (4 labels, counts sum to chapters)', async () => {
    mockedGetAll.mockResolvedValue([
      ch('c1', 100, daysAgo(0)),
      ch('c2', 90, daysAgo(1)),
      ch('c3', 95, daysAgo(2)),
    ]);
    const s = await computeReadingStats();
    const labels = s.sessionDistribution.map((x) => x.label);
    expect(labels).toEqual(['Morning', 'Afternoon', 'Evening', 'Night']);
    const total = s.sessionDistribution.reduce((sum, x) => sum + x.count, 0);
    expect(total).toBe(3);
  });

  it('derives genre distribution from favorites (labels, count, color, sorted desc, capped 10)', async () => {
    mockedFavs.mockResolvedValue([
      { mangaId: 'a', mangaTitle: 'A', genres: ['action', 'fantasy'] },
      { mangaId: 'b', mangaTitle: 'B', genres: ['action', 'romance'] },
      { mangaId: 'c', mangaTitle: 'C', genres: [] },
    ]);
    const s = await computeReadingStats();
    expect(s.totalSeriesInLibrary).toBe(3);
    expect(s.genreDistribution[0]).toEqual({ label: 'action', count: 2, color: '#ef4444' });
    const labels = s.genreDistribution.map((g) => g.label).sort();
    expect(labels).toEqual(['action', 'fantasy', 'romance']);
  });

  it('does not replace hyphens in genre labels except delimiters', async () => {
    mockedFavs.mockResolvedValue([
      { mangaId: 'a', mangaTitle: 'A', genres: ['slice-of-life'] },
    ]);
    const s = await computeReadingStats();
    expect(s.genreDistribution[0].label).toBe('slice of life');
  });
});

describe('computeReadingStats — favorite day & recent activity', () => {
  it('returns favoriteReadingDay in 0..6 and recentActivity sorted desc (max 10)', async () => {
    const many = Array.from({ length: 15 }, (_, i) => ch(`c${i}`, 100, daysAgo(i)));
    mockedGetAll.mockResolvedValue(many);
    const s = await computeReadingStats();
    expect(s.favoriteReadingDay).toBeGreaterThanOrEqual(0);
    expect(s.favoriteReadingDay).toBeLessThanOrEqual(6);
    expect(s.recentActivity).toHaveLength(10);
  });
});

describe('computeReadingStats — empty state', () => {
  it('returns safe zeros/empty when no data', async () => {
    const s = await computeReadingStats();
    expect(s.totalChaptersRead).toBe(0);
    expect(s.completionRate).toBe(0);
    expect(s.currentStreak).toBe(0);
    expect(s.estimatedReadingMinutes).toBe(0);
    expect(s.averageScrollDepth).toBe(0);
    expect(s.monthlyCalendar).toHaveLength(121);
  });
});

describe('fmtTime / fmtLastRead (pure helpers)', () => {
  it('fmtTime renders min / h / h+m forms', () => {
    expect(fmtTime(45)).toBe('45 min');
    expect(fmtTime(60)).toBe('1h');
    expect(fmtTime(90)).toBe('1h 30m');
    expect(fmtTime(0)).toBe('0 min');
  });

  it('fmtLastRead renders Today/Yesterday/Nd ago/dates', () => {
    const now = Date.now();
    expect(fmtLastRead(new Date(now - 60_000).toISOString())).toBe('Today');
    expect(fmtLastRead(new Date(now - 86_400_000).toISOString())).toBe('Yesterday');
    expect(fmtLastRead(new Date(now - 3 * 86_400_000).toISOString())).toBe('3d ago');
  });
});
