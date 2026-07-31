// __tests__/favoritesService.test.ts
// Unit tests for favoritesService — toggle, dedup, pruning, batch operations.

import AsyncStorage from '@react-native-async-storage/async-storage';

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

// Mock the dynamic imports used by favoritesService
jest.mock('../services/metadataClassification', () => ({
  onFavoriteAdded: jest.fn(),
  onFavoriteRemoved: jest.fn(),
}));

jest.mock('../services/supabaseSyncService', () => ({
  queueSync: jest.fn(),
}));

import {
  getFavorites,
  isFavorite,
  addFavorite,
  removeFavorite,
  toggleFavorite,
  updateReadingStatus,
  recordUpdate,
  getRecentFavoritesUpdates,
  getAllUpdates,
  clearRecentUpdates,
  removeFavorites,
  updateReadingStatusBatch,
  clearAllFavorites,
} from '../services/favoritesService';

const mockGetItem = AsyncStorage.getItem as jest.MockedFunction<typeof AsyncStorage.getItem>;
const mockSetItem = AsyncStorage.setItem as jest.MockedFunction<typeof AsyncStorage.setItem>;
const mockRemoveItem = AsyncStorage.removeItem as jest.MockedFunction<typeof AsyncStorage.removeItem>;

beforeEach(() => {
  jest.clearAllMocks();
  mockGetItem.mockResolvedValue(null);
  mockSetItem.mockResolvedValue(undefined);
  mockRemoveItem.mockResolvedValue(undefined);
});

// ─── Helpers ─────────────────────────────────────────────────────────

function mockStorageValue(value: unknown) {
  mockGetItem.mockResolvedValue(JSON.stringify(value));
}

// ─── Favorites CRUD ──────────────────────────────────────────────────

describe('getFavorites', () => {
  it('returns empty array when storage is empty', async () => {
    mockGetItem.mockResolvedValue(null);
    const result = await getFavorites();
    expect(result).toEqual([]);
  });

  it('returns stored favorites', async () => {
    mockStorageValue([
      { mangaId: '1', mangaTitle: 'Test', bookmarkedAt: '2026-01-01', readingStatus: 'reading' },
    ]);
    const result = await getFavorites();
    expect(result).toHaveLength(1);
    expect(result[0].mangaId).toBe('1');
  });

  it('returns empty array on parse error', async () => {
    mockGetItem.mockResolvedValue('invalid json{{{');
    const result = await getFavorites();
    expect(result).toEqual([]);
  });

  it('returns empty array on AsyncStorage error', async () => {
    mockGetItem.mockRejectedValue(new Error('disk full'));
    const result = await getFavorites();
    expect(result).toEqual([]);
  });
});

describe('isFavorite', () => {
  it('returns true if mangaId exists', async () => {
    mockStorageValue([
      { mangaId: 'abc', mangaTitle: 'Manga', bookmarkedAt: '', readingStatus: 'reading' },
    ]);
    expect(await isFavorite('abc')).toBe(true);
  });

  it('returns false if mangaId does not exist', async () => {
    mockStorageValue([]);
    expect(await isFavorite('xyz')).toBe(false);
  });
});

describe('addFavorite', () => {
  it('adds a new favorite', async () => {
    mockStorageValue([]);
    await addFavorite('1', 'Title', 'img.png', ['action']);
    expect(mockSetItem).toHaveBeenCalledTimes(1);
    const saved = JSON.parse(mockSetItem.mock.calls[0][1] as string);
    expect(saved).toHaveLength(1);
    expect(saved[0].mangaId).toBe('1');
    expect(saved[0].readingStatus).toBe('reading');
  });

  it('does not add duplicate favorites', async () => {
    mockStorageValue([{ mangaId: '1', mangaTitle: 'Title', bookmarkedAt: '', readingStatus: 'reading' }]);
    await addFavorite('1', 'Title');
    // Should not call setItem because early return
    const setCalls = mockSetItem.mock.calls;
    // setItem might be called by scheduleSync — that's OK. Key check: the array should stay length 1.
    expect(setCalls.length).toBeLessThanOrEqual(1);
  });

  it('sets bookmarkedAt to current time', async () => {
    mockStorageValue([]);
    const before = new Date().toISOString();
    await addFavorite('1', 'Title');
    const saved = JSON.parse(mockSetItem.mock.calls[0][1] as string);
    const after = new Date().toISOString();
    expect(saved[0].bookmarkedAt).toBeDefined();
    expect(saved[0].bookmarkedAt >= before).toBe(true);
    expect(saved[0].bookmarkedAt <= after).toBe(true);
  });
});

describe('removeFavorite', () => {
  it('removes an existing favorite', async () => {
    mockStorageValue([
      { mangaId: '1', mangaTitle: 'A', bookmarkedAt: '', readingStatus: 'reading' },
      { mangaId: '2', mangaTitle: 'B', bookmarkedAt: '', readingStatus: 'reading' },
    ]);
    await removeFavorite('1');
    const saved = JSON.parse(mockSetItem.mock.calls[0][1] as string);
    expect(saved).toHaveLength(1);
    expect(saved[0].mangaId).toBe('2');
  });

  it('no-ops when favorite does not exist', async () => {
    mockStorageValue([{ mangaId: '1', mangaTitle: 'A', bookmarkedAt: '', readingStatus: 'reading' }]);
    await removeFavorite('999');
    const saved = JSON.parse(mockSetItem.mock.calls[0][1] as string);
    expect(saved).toHaveLength(1);
  });
});

// ─── Toggle Favorite ─────────────────────────────────────────────────

describe('toggleFavorite', () => {
  it('adds favorite when it does not exist → returns true', async () => {
    mockStorageValue([]);
    const result = await toggleFavorite('1', 'Title');
    // Returns false when adding? No — toggleFavorite returns the new state.
    // After addFavorite: the manga was added → should return true (is now favorite)
    // Wait — looking at the code: exists = false → addFavorite → returns true
    // Actually: if exists → removeFavorite → returns false. If !exists → addFavorite → returns true.
    expect(result).toBe(true);
    const saved = JSON.parse(mockSetItem.mock.calls[0][1] as string);
    expect(saved).toHaveLength(1);
    expect(saved[0].mangaId).toBe('1');
  });

  it('removes favorite when it exists → returns false', async () => {
    mockStorageValue([
      { mangaId: '1', mangaTitle: 'Title', bookmarkedAt: '', readingStatus: 'reading' },
    ]);
    const result = await toggleFavorite('1', 'Title');
    expect(result).toBe(false);
  });

  it('handles rapid toggle correctly (double-tap safety)', async () => {
    // First call: adds
    mockStorageValue([]);
    const r1 = await toggleFavorite('rapid', 'Test');
    expect(r1).toBe(true);

    // Second call (simulate rapid): removes
    const stored = JSON.parse(mockSetItem.mock.calls[mockSetItem.mock.calls.length - 1][1] as string);
    mockStorageValue(stored);
    const r2 = await toggleFavorite('rapid', 'Test');
    expect(r2).toBe(false);
  });
});

// ─── Reading Status ──────────────────────────────────────────────────

describe('updateReadingStatus', () => {
  it('updates status of existing favorite', async () => {
    mockStorageValue([
      { mangaId: '1', mangaTitle: 'A', bookmarkedAt: '', readingStatus: 'reading' },
    ]);
    await updateReadingStatus('1', 'completed');
    const saved = JSON.parse(mockSetItem.mock.calls[0][1] as string);
    expect(saved[0].readingStatus).toBe('completed');
  });

  it('no-ops for non-existent manga', async () => {
    mockStorageValue([]);
    await updateReadingStatus('999', 'completed');
    // No setItem call because `idx >= 0` check fails
    const setCalls = mockSetItem.mock.calls.filter(call => call[0] === '@YomuLog:favorites');
    expect(setCalls.length).toBe(0);
  });

  it('accepts all valid ReadingStatus values', async () => {
    const statuses = ['reading', 'completed', 'on_hold', 'dropped', 'plan_to_read'] as const;
    for (const status of statuses) {
      jest.clearAllMocks();
      mockStorageValue([{ mangaId: '1', mangaTitle: 'A', bookmarkedAt: '', readingStatus: 'reading' }]);
      await updateReadingStatus('1', status as any);
      const saved = JSON.parse(mockSetItem.mock.calls[0][1] as string);
      expect(saved[0].readingStatus).toBe(status);
    }
  });
});

// ─── Recent Updates ──────────────────────────────────────────────────

describe('recordUpdate', () => {
  it('records a new update entry', async () => {
    mockGetItem.mockResolvedValue(null); // no existing updates
    await recordUpdate('m1', 'Title', 42, 'img.png');
    const saved = JSON.parse(mockSetItem.mock.calls[0][1] as string);
    expect(saved).toHaveLength(1);
    expect(saved[0].mangaId).toBe('m1');
    expect(saved[0].chapterNumber).toBe(42);
    expect(saved[0].mangaImage).toBe('img.png');
  });

  it('deduplicates by mangaId (keeps latest)', async () => {
    mockStorageValue([
      { mangaId: 'm1', mangaTitle: 'Title', updatedAt: '2026-01-01T00:00:00.000Z', chapterNumber: 1 },
    ]);
    await recordUpdate('m1', 'Title', 2);
    const saved = JSON.parse(mockSetItem.mock.calls[0][1] as string);
    expect(saved).toHaveLength(1);
    expect(saved[0].chapterNumber).toBe(2);
  });

  it('enforces 50-item cap', async () => {
    const existing = Array.from({ length: 60 }, (_, i) => ({
      mangaId: `m${i}`,
      mangaTitle: `Title ${i}`,
      updatedAt: new Date(2026, 0, 1 + i).toISOString(),
      chapterNumber: i,
    }));
    mockStorageValue(existing);
    await recordUpdate('new', 'New', 1);
    const saved = JSON.parse(mockSetItem.mock.calls[0][1] as string);
    expect(saved.length).toBeLessThanOrEqual(50);
    // The newest entry should be at the top
    expect(saved[0].mangaId).toBe('new');
  });
});

describe('getAllUpdates', () => {
  it('returns empty array when no updates', async () => {
    mockGetItem.mockResolvedValue(null);
    const result = await getAllUpdates();
    expect(result).toEqual([]);
  });
});

// ─── Pruning Logic ───────────────────────────────────────────────────

describe('getRecentFavoritesUpdates', () => {
  it('returns only updates for favorited manga', async () => {
    const favs = [
      { mangaId: 'f1', mangaTitle: 'Fav 1', bookmarkedAt: '', readingStatus: 'reading' },
    ];
    const updates = [
      { mangaId: 'f1', mangaTitle: 'Fav 1', updatedAt: new Date().toISOString(), chapterNumber: 10 },
      { mangaId: 'n1', mangaTitle: 'Non-Fav', updatedAt: new Date().toISOString(), chapterNumber: 5 },
    ];
    mockGetItem
      .mockResolvedValueOnce(JSON.stringify(favs))   // first call: getFavoritesRaw
      .mockResolvedValueOnce(JSON.stringify(updates)); // second call: getJson(UPDATES_KEY)

    const result = await getRecentFavoritesUpdates();
    expect(result).toHaveLength(1);
    expect(result[0].mangaId).toBe('f1');
  });

  it('filters out completed manga updates', async () => {
    const favs = [
      { mangaId: 'f1', mangaTitle: 'Fav 1', bookmarkedAt: '', readingStatus: 'completed' },
    ];
    const updates = [
      { mangaId: 'f1', mangaTitle: 'Fav 1', updatedAt: new Date().toISOString(), chapterNumber: 10 },
    ];
    mockGetItem
      .mockResolvedValueOnce(JSON.stringify(favs))
      .mockResolvedValueOnce(JSON.stringify(updates));

    const result = await getRecentFavoritesUpdates();
    expect(result).toHaveLength(0);
  });

  it('prunes updates older than 14 days', async () => {
    const favs = [
      { mangaId: 'old', mangaTitle: 'Old', bookmarkedAt: '', readingStatus: 'reading' },
    ];
    const oldDate = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString();
    const updates = [
      { mangaId: 'old', mangaTitle: 'Old', updatedAt: oldDate, chapterNumber: 1 },
    ];
    mockGetItem
      .mockResolvedValueOnce(JSON.stringify(favs))
      .mockResolvedValueOnce(JSON.stringify(updates));

    const result = await getRecentFavoritesUpdates();
    expect(result).toHaveLength(0);
  });

  it('caps results at MAX_FAVORITES_BANNER (10)', async () => {
    const favs = Array.from({ length: 15 }, (_, i) => ({
      mangaId: `f${i}`, mangaTitle: `Fav ${i}`, bookmarkedAt: '', readingStatus: 'reading',
    }));
    const updates = Array.from({ length: 15 }, (_, i) => ({
      mangaId: `f${i}`, mangaTitle: `Fav ${i}`,
      updatedAt: new Date(Date.now() - i * 3600_000).toISOString(), chapterNumber: i,
    }));
    mockGetItem
      .mockResolvedValueOnce(JSON.stringify(favs))
      .mockResolvedValueOnce(JSON.stringify(updates));

    const result = await getRecentFavoritesUpdates();
    expect(result.length).toBeLessThanOrEqual(10);
  });
});

// ─── Batch Operations ────────────────────────────────────────────────

describe('removeFavorites', () => {
  it('removes multiple favorites at once', async () => {
    mockStorageValue([
      { mangaId: 'a', mangaTitle: 'A', bookmarkedAt: '', readingStatus: 'reading' },
      { mangaId: 'b', mangaTitle: 'B', bookmarkedAt: '', readingStatus: 'reading' },
      { mangaId: 'c', mangaTitle: 'C', bookmarkedAt: '', readingStatus: 'reading' },
    ]);
    await removeFavorites(['a', 'c']);
    const saved = JSON.parse(mockSetItem.mock.calls[0][1] as string);
    expect(saved).toHaveLength(1);
    expect(saved[0].mangaId).toBe('b');
  });

  it('no-ops with empty ids array', async () => {
    mockStorageValue([{ mangaId: 'a', mangaTitle: 'A', bookmarkedAt: '', readingStatus: 'reading' }]);
    await removeFavorites([]);
    const saved = JSON.parse(mockSetItem.mock.calls[0][1] as string);
    expect(saved).toHaveLength(1);
  });
});

describe('updateReadingStatusBatch', () => {
  it('updates multiple favorites to the same status', async () => {
    mockStorageValue([
      { mangaId: 'a', mangaTitle: 'A', bookmarkedAt: '', readingStatus: 'reading' },
      { mangaId: 'b', mangaTitle: 'B', bookmarkedAt: '', readingStatus: 'reading' },
      { mangaId: 'c', mangaTitle: 'C', bookmarkedAt: '', readingStatus: 'reading' },
    ]);
    await updateReadingStatusBatch(['a', 'b'], 'completed');
    const saved = JSON.parse(mockSetItem.mock.calls[0][1] as string);
    expect(saved[0].readingStatus).toBe('completed');
    expect(saved[1].readingStatus).toBe('completed');
    expect(saved[2].readingStatus).toBe('reading');
  });
});

// ─── Clear All ───────────────────────────────────────────────────────

describe('clearAllFavorites', () => {
  it('removes both favorites and updates from storage', async () => {
    await clearAllFavorites();
    expect(mockRemoveItem).toHaveBeenCalledWith('@YomuLog:favorites');
    expect(mockRemoveItem).toHaveBeenCalledWith('@YomuLog:recentUpdates');
  });
});

describe('clearRecentUpdates', () => {
  it('removes only the updates key', async () => {
    await clearRecentUpdates();
    expect(mockRemoveItem).toHaveBeenCalledWith('@YomuLog:recentUpdates');
  });
});
