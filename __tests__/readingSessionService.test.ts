// __tests__/readingSessionService.test.ts
// W1b — G-4 measured reading time (KPI 2 — reading engagement index).
// Covers the pure time-math + AsyncStorage accumulation in
// services/readingSessionService.ts (audit H-9).
jest.mock('@react-native-async-storage/async-storage', () => {
  const store: Record<string, string> = {};
  return {
    getItem: jest.fn((key: string) => Promise.resolve(store[key] ?? null)),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value;
      return Promise.resolve();
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
      return Promise.resolve();
    }),
    multiSet: jest.fn((pairs: Array<[string, string]>) => {
      pairs.forEach(([k, v]) => { store[k] = v; });
      return Promise.resolve();
    }),
    multiGet: jest.fn((keys: string[]) =>
      Promise.resolve(keys.map((k: string) => [k, store[k] ?? null])),
    ),
  };
});

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  toDayKey,
  recordReadingSeconds,
  getReadingSecondsByChapter,
  getReadingSecondsByDay,
  getReadingSecondsTotal,
  getReadingSecondsForLastDays,
  getReadingSecondsToday,
} from '../services/readingSessionService';

const CHAPTER_KEY = '@YomuLog:readingSecondsByChapter';
const DAY_KEY = '@YomuLog:readingSecondsByDay';

async function readJson(key: string): Promise<Record<string, number>> {
  const raw = await AsyncStorage.getItem(key);
  return raw ? JSON.parse(raw) : {};
}

beforeEach(async () => {
  jest.clearAllMocks();
  await AsyncStorage.removeItem(CHAPTER_KEY);
  await AsyncStorage.removeItem(DAY_KEY);
});

describe('readingSessionService.toDayKey', () => {
  it('formats a local YYYY-MM-DD key', () => {
    const d = new Date(2026, 7, 11); // Aug 11 2026 local
    expect(toDayKey(d)).toBe('2026-08-11');
  });
  it('left-pads months and days', () => {
    expect(toDayKey(new Date(2026, 0, 5))).toBe('2026-01-05');
    expect(toDayKey(new Date(2026, 11, 31))).toBe('2026-12-31');
  });
});

describe('readingSessionService.recordReadingSeconds', () => {
  it('is a no-op for missing chapterId or non-positive seconds', async () => {
    await recordReadingSeconds('', 10);
    await recordReadingSeconds('ch1', 0);
    await recordReadingSeconds('ch1', -5);
    await recordReadingSeconds('ch1', NaN);
    expect(await getReadingSecondsByChapter()).toEqual({});
    expect(await getReadingSecondsByDay()).toEqual({});
  });

  it('accumulates per-chapter and per-day seconds', async () => {
    await recordReadingSeconds('ch1', 10.4);
    await recordReadingSeconds('ch1', 5.6);
    await recordReadingSeconds('ch2', 30);
    expect(await getReadingSecondsByChapter()).toEqual({ ch1: 16, ch2: 30 });
    const byDay = await getReadingSecondsByDay();
    const today = toDayKey(new Date());
    expect(byDay[today]).toBe(46);
  });

  it('rounds total using Math.round on each call then sums', async () => {
    await recordReadingSeconds('ch1', 0.4); // rounds to 0 -> skipped
    await recordReadingSeconds('ch1', 0.6); // rounds to 1
    expect(await getReadingSecondsByChapter()).toEqual({ ch1: 1 });
  });

  it('rolls seconds into the correct local day (one call each)', async () => {
    await recordReadingSeconds('a', 5);
    await recordReadingSeconds('b', 5);
    const byDay = await readJson(DAY_KEY);
    const today = toDayKey(new Date());
    expect(byDay[today]).toBe(10);
  });
});

describe('readingSessionService.getters', () => {
  it('getReadingSecondsTotal sums all days', async () => {
    await AsyncStorage.setItem(DAY_KEY, JSON.stringify({ '2026-08-01': 60, '2026-08-02': 90 }));
    expect(await getReadingSecondsTotal()).toBe(150);
  });

  it('getReadingSecondsForLastDays counts only days >= cutoff (lexical key compare)', async () => {
    const today = new Date();
    const d1 = toDayKey(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 6));
    const old = toDayKey(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 10));
    const future = toDayKey(new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1));
    await AsyncStorage.setItem(DAY_KEY, JSON.stringify({
      [d1]: 100,      // within last 7
      [old]: 999,     // outside
      [future]: 1,    // today or future counts
    }));
    const week = await getReadingSecondsForLastDays(7);
    expect(week).toBe(101);
  });

  it('getReadingSecondsToday returns current local day seconds (or 0)', async () => {
    expect(await getReadingSecondsToday()).toBe(0);
    const today = toDayKey(new Date());
    await AsyncStorage.setItem(DAY_KEY, JSON.stringify({ [today]: 42, '2026-08-01': 7 }));
    expect(await getReadingSecondsToday()).toBe(42);
  });

  it('prunes day entries older than 120 days on write', async () => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 200);
    const old = toDayKey(cutoff);
    await AsyncStorage.setItem(DAY_KEY, JSON.stringify({ [old]: 500, '2026-01-01': 2 }));
    await recordReadingSeconds('chX', 1);
    const byDay = await readJson(DAY_KEY);
    expect(byDay).not.toHaveProperty(old);
    expect(byDay).toHaveProperty(toDayKey(new Date()));
  });
});
