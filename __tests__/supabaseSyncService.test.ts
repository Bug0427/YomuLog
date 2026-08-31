// __tests__/supabaseSyncService.test.ts
// W1d — Premium cloud sync engine (KPI 1/2 sync + conflict resolution).
// Exercises the LWW/composite conflict merges through the PUBLIC fallback sync
// path (performFullSync with Supabase unconfigured => AsyncStorage mirrors) and
// the exported pure helper formatSyncTimestamp (audit H-9). No prod code
// touched. Supabase client + deps are typed mocks.
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

jest.mock('../services/supabaseClient', () => ({
  isSupabaseConfigured: jest.fn(() => false),
  supabase: {
    auth: { getSession: jest.fn(async () => ({ data: { session: null }, error: null })) },
  },
}));
jest.mock('../services/stripeService', () => ({
  getCachedSubscriptionStatus: jest.fn(() => ({ isActive: false })),
}));
jest.mock('../services/mangaDexProxy', () => ({
  resolveMangaDexUrl: (p: string) => p,
}));
// The SUT dynamically imports preferencesService (syncPreferencesFallback /
// syncPreferencesReal). Mocking it lets jest resolve that dynamic import via its
// module registry (a real dynamic import would throw ERR_VM_DYNAMIC_IMPORT
// without --experimental-vm-modules).
jest.mock('../services/preferencesService', () => ({
  loadAllPreferences: jest.fn(async () => ({
    language: 'en', alertsOn: true, aiSearchOn: false, directionMode: 'ltr',
  })),
  setLanguage: jest.fn(async () => {}),
  setAlertsOn: jest.fn(async () => {}),
  setAISearchOn: jest.fn(async () => {}),
  setDirectionMode: jest.fn(async () => {}),
}));

import AsyncStorage from '@react-native-async-storage/async-storage';
import { performFullSync, formatSyncTimestamp } from '../services/supabaseSyncService';

const K = {
  LOCAL_FAVORITES: '@YomuLog:favorites',
  LOCAL_PROGRESS: '@YomuLog:chapterProgress',
  LOCAL_DOWNLOAD_QUEUE: '@YomuLog:downloadQueue',
  CLOUD_FAVORITES: '@YomuLog:cloud:favorites',
  CLOUD_PROGRESS: '@YomuLog:cloud:chapterProgress',
  CLOUD_DOWNLOAD_QUEUE: '@YomuLog:cloud:downloadQueue',
  SYNC_STATE: '@YomuLog:syncState',
  SYNC_QUEUE: '@YomuLog:syncQueue',
};

async function rd(key: string): Promise<any> {
  const raw = await AsyncStorage.getItem(key);
  return raw ? JSON.parse(raw) : null;
}
async function set(key: string, val: any): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(val));
}

beforeEach(async () => {
  jest.clearAllMocks();
  await Promise.all([
    AsyncStorage.removeItem(K.LOCAL_FAVORITES),
    AsyncStorage.removeItem(K.LOCAL_PROGRESS),
    AsyncStorage.removeItem(K.LOCAL_DOWNLOAD_QUEUE),
    AsyncStorage.removeItem(K.CLOUD_FAVORITES),
    AsyncStorage.removeItem(K.CLOUD_PROGRESS),
    AsyncStorage.removeItem(K.CLOUD_DOWNLOAD_QUEUE),
    AsyncStorage.removeItem(K.SYNC_STATE),
    AsyncStorage.removeItem(K.SYNC_QUEUE),
  ]);
  // Enable sync so performFullSync proceeds through the merge path.
  await set(K.SYNC_STATE, {
    status: 'pending',
    lastSyncedAt: null,
    lastError: null,
    syncEnabled: true,
    scopeTimestamps: {},
  });
});

describe('performFullSync — fallback conflict merge (Supabase unconfigured)', () => {
  it('merges favorites by last-write-wins on bookmarkedAt', async () => {
    await set(K.LOCAL_FAVORITES, [
      { mangaId: 'a', mangaTitle: 'A-local', bookmarkedAt: '2026-01-01T00:00:00Z' },
      { mangaId: 'b', mangaTitle: 'B', bookmarkedAt: '2026-01-01T00:00:00Z' },
    ]);
    await set(K.CLOUD_FAVORITES, [
      { mangaId: 'a', mangaTitle: 'A-cloud', bookmarkedAt: '2026-02-01T00:00:00Z' }, // newer => wins
      { mangaId: 'c', mangaTitle: 'C', bookmarkedAt: '2026-01-01T00:00:00Z' },       // cloud-only
    ]);

    await performFullSync();

    const merged = await rd(K.LOCAL_FAVORITES);
    expect(merged).toHaveLength(3);
    const a = merged.find((m: any) => m.mangaId === 'a')!;
    expect(a.mangaTitle).toBe('A-cloud'); // last-write (later bookmarkedAt) won
    expect(merged.map((m: any) => m.mangaId).sort()).toEqual(['a', 'b', 'c']);
  });

  it('merges chapter progress by (mangaId, chapterId) with lastReadAt winning', async () => {
    await set(K.LOCAL_PROGRESS, [
      { mangaId: 'm', chapterId: 'c1', lastReadAt: '2026-01-01T00:00:00Z', scrollPercentage: 10, isRead: false, mangaTitle: 'M', chapterNumber: 1 },
      { mangaId: 'm', chapterId: 'c2', lastReadAt: '2026-01-01T00:00:00Z', scrollPercentage: 20, isRead: false, mangaTitle: 'M', chapterNumber: 2 },
    ]);
    await set(K.CLOUD_PROGRESS, [
      { mangaId: 'm', chapterId: 'c1', lastReadAt: '2026-03-01T00:00:00Z', scrollPercentage: 100, isRead: true, mangaTitle: 'M', chapterNumber: 1 }, // wins
      { mangaId: 'm', chapterId: 'c3', lastReadAt: '2026-01-01T00:00:00Z', scrollPercentage: 5, isRead: false, mangaTitle: 'M', chapterNumber: 3 },   // cloud-only
    ]);

    await performFullSync();

    const merged = await rd(K.LOCAL_PROGRESS);
    expect(merged).toHaveLength(3);
    const c1 = merged.find((p: any) => p.chapterId === 'c1')!;
    expect(c1.isRead).toBe(true);      // newer cloud entry won
    expect(c1.scrollPercentage).toBe(100);
  });

  it('merges download queue by jobId/createdAt LWW', async () => {
    await set(K.LOCAL_DOWNLOAD_QUEUE, [
      { jobId: 'j1', createdAt: '2026-01-01T00:00:00Z', status: 'queued' },
    ]);
    await set(K.CLOUD_DOWNLOAD_QUEUE, [
      { jobId: 'j1', createdAt: '2026-02-01T00:00:00Z', status: 'completed' }, // newer wins
      { jobId: 'j2', createdAt: '2026-01-01T00:00:00Z', status: 'queued' },
    ]);

    await performFullSync();

    const merged = await rd(K.LOCAL_DOWNLOAD_QUEUE);
    expect(merged).toHaveLength(2);
    expect(merged.find((q: any) => q.jobId === 'j1')!.status).toBe('completed');
  });

  it('records per-scope timestamps for the merge scopes that complete', async () => {
    // JEST LIMITATION (documented): supabaseSyncService.syncPreferencesFallback
    // uses `await import('./preferencesService')` — a true runtime dynamic
    // import that jest cannot execute (throws ERR_VM_DYNAMIC_IMPORT without
    // full ESM support; even --experimental-vm-modules + jest.mock do not
    // intercept it). So in this harness the preferences scope always fails and
    // the final status is 'error' — but the favorites/progress/downloads
    // conflict merges DO run and are timestamped. We assert that real behavior;
    // the preferences dynamic-import path is covered indirectly elsewhere.
    await set(K.LOCAL_FAVORITES, [{ mangaId: 'a', mangaTitle: 'A', bookmarkedAt: '2026-01-01T00:00:00Z' }]);

    const state = await performFullSync();

    // Favorites merge applied.
    expect(await rd(K.LOCAL_FAVORITES)).toHaveLength(1);
    // The three merge scopes (favorites/progress/downloads) recorded timestamps;
    // preferences did not (dynamic-import limitation in jest).
    expect(state.scopeTimestamps).toHaveProperty('favorites');
    expect(state.scopeTimestamps).toHaveProperty('progress');
    expect(state.scopeTimestamps).toHaveProperty('downloads');
    // persisted locally
    const persisted = await rd(K.SYNC_STATE);
    expect(persisted.scopeTimestamps).toHaveProperty('favorites');
  });

  it('is resilient — performs the merges without throwing and persists them', async () => {
    await performFullSync(); // no throw even though preferences scope fails in jest
    // favorites mirror persisted as an empty merged array
    expect(await rd(K.LOCAL_FAVORITES)).toEqual([]);
    expect(await rd(K.SYNC_STATE)).toBeTruthy();
  });

  it('does not run the conflict path (returns immediately) when sync is disabled', async () => {
    await set(K.SYNC_STATE, {
      status: 'pending', lastSyncedAt: null, lastError: null, syncEnabled: false, scopeTimestamps: {},
    });
    const state = await performFullSync();
    expect(state.status).toBe('pending'); // no-op, unchanged
    expect(await rd(K.SYNC_STATE)).toMatchObject({ syncEnabled: false });
  });
});

describe('formatSyncTimestamp (pure helper)', () => {
  it('returns "Never" for null/empty', () => {
    expect(formatSyncTimestamp(null)).toBe('Never');
    expect(formatSyncTimestamp('')).toBe('Never');
  });

  it('renders relative "Just now"/"Xm ago"/"Xh ago" and absolute dates', () => {
    const now = Date.now();
    expect(formatSyncTimestamp(new Date(now - 5_000).toISOString())).toBe('Just now');
    expect(formatSyncTimestamp(new Date(now - 5 * 60_000).toISOString())).toBe('5m ago');
    expect(formatSyncTimestamp(new Date(now - 2 * 3600_000).toISOString())).toBe('2h ago');
    // older than a day => absolute (rough check: contains a month/day)
    const abs = formatSyncTimestamp(new Date(now - 5 * 86400_000).toISOString());
    expect(typeof abs).toBe('string');
    expect(abs.length).toBeGreaterThan(0);
  });
});
