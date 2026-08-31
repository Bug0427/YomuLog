// __tests__/readingProgress.test.ts
// W1b — Progress Tracking & Sync (KPI 2 engagement + progress correctness).
// Covers 90%-scroll auto-completion, read-merge semantics, and the
// recently-read index in services/readingProgress.ts (audit H-9).
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
  getAllChapterProgress,
  getChapterProgress,
  getMangaProgress,
  updateChapterProgress,
  markChapterRead,
  getRecentlyRead,
  clearAllProgress,
} from '../services/readingProgress';

const PROGRESS_KEY = '@YomuLog:chapterProgress';
const RECENTLY_KEY = '@YomuLog:recentlyRead';

beforeEach(async () => {
  jest.clearAllMocks();
  await AsyncStorage.removeItem(PROGRESS_KEY);
  await AsyncStorage.removeItem(RECENTLY_KEY);
});

const base = {
  mangaId: 'm1',
  mangaTitle: 'Naruto',
  chapterNumber: 1,
};

describe('readingProgress.updateChapterProgress', () => {
  it('sets isRead=true when scrollPercentage >= 90 (90%-scroll auto-completion)', async () => {
    await updateChapterProgress({ ...base, chapterId: 'c1', scrollPercentage: 100 });
    const c = await getChapterProgress('m1', 'c1');
    expect(c).not.toBeNull();
    expect(c!.isRead).toBe(true);
    expect(c!.scrollPercentage).toBe(100);
  });

  it('keeps isRead=false below 90%', async () => {
    await updateChapterProgress({ ...base, chapterId: 'c1', scrollPercentage: 50 });
    const c = await getChapterProgress('m1', 'c1');
    expect(c!.isRead).toBe(false);
    expect(c!.scrollPercentage).toBe(50);
  });

  it('clamps scrollPercentage to [0,100]', async () => {
    await updateChapterProgress({ ...base, chapterId: 'c1', scrollPercentage: 250 });
    await updateChapterProgress({ ...base, chapterId: 'c2', scrollPercentage: -20 });
    expect((await getChapterProgress('m1', 'c1'))!.scrollPercentage).toBe(100);
    expect((await getChapterProgress('m1', 'c2'))!.scrollPercentage).toBe(0);
  });

  it('defaults scrollPercentage to 0 and stamps lastReadAt', async () => {
    await updateChapterProgress({ ...base, chapterId: 'c1' } as any);
    const c = await getChapterProgress('m1', 'c1');
    expect(c!.scrollPercentage).toBe(0);
    expect(c!.isRead).toBe(false);
    expect(c!.lastReadAt).toBeTruthy();
  });

  it('merges: keeps isRead=true once the chapter was read', async () => {
    await updateChapterProgress({ ...base, chapterId: 'c1', scrollPercentage: 100 });
    await updateChapterProgress({ ...base, chapterId: 'c1', scrollPercentage: 20 });
    expect((await getChapterProgress('m1', 'c1'))!.isRead).toBe(true);
    // but scroll% should be overwritten to the latest
    expect((await getChapterProgress('m1', 'c1'))!.scrollPercentage).toBe(20);
  });

  it('dedupes by (mangaId, chapterId) across repeated updates', async () => {
    await updateChapterProgress({ ...base, chapterId: 'c1', scrollPercentage: 10 });
    await updateChapterProgress({ ...base, chapterId: 'c1', scrollPercentage: 40 });
    const all = await getAllChapterProgress();
    expect(all).toHaveLength(1);
    expect(all[0].scrollPercentage).toBe(40);
  });
});

describe('readingProgress.markChapterRead / queries', () => {
  it('markChapterRead writes 100% + isRead', async () => {
    await markChapterRead('m1', 'c1', 'Naruto', 'img.png', 'Ch 1', 1);
    const c = await getChapterProgress('m1', 'c1');
    expect(c!.isRead).toBe(true);
    expect(c!.scrollPercentage).toBe(100);
    expect(c!.chapterNumber).toBe(1);
  });

  it('getMangaProgress filters by mangaId only', async () => {
    await updateChapterProgress({ ...base, chapterId: 'c1', scrollPercentage: 100 });
    await updateChapterProgress({ ...base, mangaId: 'm2', chapterId: 'x1', scrollPercentage: 100 });
    const forM1 = await getMangaProgress('m1');
    expect(forM1).toHaveLength(1);
    expect(forM1[0].mangaId).toBe('m1');
  });

  it('getChapterProgress returns null when untracked', async () => {
    expect(await getChapterProgress('nope', 'nope')).toBeNull();
  });
});

describe('readingProgress.recently-read index', () => {
  it('upserts an entry and counts read chapters', async () => {
    await updateChapterProgress({ ...base, chapterId: 'c1', scrollPercentage: 100 });
    await updateChapterProgress({ ...base, chapterId: 'c2', scrollPercentage: 40 });
    const list = await getRecentlyRead();
    expect(list).toHaveLength(1);
    expect(list[0].mangaId).toBe('m1');
    expect(list[0].readChapters).toBe(1);
    expect(list[0].totalChapters).toBe(2);
  });

  it('sorts most-recent first and keeps one entry per manga', async () => {
    await updateChapterProgress({ ...base, chapterId: 'c1', scrollPercentage: 10 });
    await updateChapterProgress({ ...base, mangaId: 'm2', mangaTitle: 'Bleach', chapterId: 'c1', scrollPercentage: 10 });
    const list = await getRecentlyRead();
    expect(list).toHaveLength(2);
    expect(list.map((e) => e.mangaId).sort()).toEqual(['m1', 'm2']);
  });

  it('caps the list at 30 entries', async () => {
    for (let i = 0; i < 40; i++) {
      await updateChapterProgress({ ...base, mangaId: `m${i}`, mangaTitle: `M${i}`, chapterId: 'c1', scrollPercentage: 10 });
    }
    const list = await getRecentlyRead();
    expect(list.length).toBeLessThanOrEqual(30);
    expect(list).toHaveLength(30);
  });
});

describe('readingProgress.clearAllProgress', () => {
  it('clears both stores', async () => {
    await updateChapterProgress({ ...base, chapterId: 'c1', scrollPercentage: 10 });
    await clearAllProgress();
    expect(await getAllChapterProgress()).toEqual([]);
    expect(await getRecentlyRead()).toEqual([]);
  });
});
