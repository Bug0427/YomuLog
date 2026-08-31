// __tests__/retentionService.test.ts
// W1b — G-3 retention instrumentation (KPI 1 — D30 retention heartbeat).
// Covers install-id identity, first-launch stamp, and the debounced last-active
// heartbeat in services/retentionService.ts (audit H-9).
//
// NOTE: retentionService keeps a module-level in-memory throttle ref, so each
// test loads a FRESH module instance (shared AsyncStorage store) via
// jest.resetModules() + require() to keep the heartbeat throttle deterministic.
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

const INSTALL_KEY = '@YomuLog:installId';
const FIRST_LAUNCH_KEY = '@YomuLog:firstLaunchAt';
const LAST_ACTIVE_KEY = '@YomuLog:lastActiveAt';

// Load a fresh module graph so the in-memory throttle ref is reset AND the test
// and the SUT share the same AsyncStorage store instance.
function setup() {
  jest.resetModules();
  const AsyncStorageMod: any = require('@react-native-async-storage/async-storage');
  const storage: any = AsyncStorageMod.default ?? AsyncStorageMod;
  const retention = require('../services/retentionService');
  return { storage, retention };
}

describe('retentionService.getOrCreateInstallId', () => {
  it('creates an install id and stamps firstLaunchAt on first launch', async () => {
    const { storage, retention } = setup();
    const id = await retention.getOrCreateInstallId();
    expect(id).toMatch(/^inst_/);
    expect(await storage.getItem(INSTALL_KEY)).toBe(id);
    expect(await storage.getItem(FIRST_LAUNCH_KEY)).toBeTruthy();
  });

  it('is idempotent — returns the same id and does not overwrite firstLaunchAt', async () => {
    const { storage, retention } = setup();
    const id1 = await retention.getOrCreateInstallId();
    const firstAt = await storage.getItem(FIRST_LAUNCH_KEY);
    const id2 = await retention.getOrCreateInstallId();
    expect(id2).toBe(id1);
    expect(await storage.getItem(FIRST_LAUNCH_KEY)).toBe(firstAt);
  });

  it('reuses a pre-existing install id without re-stamping', async () => {
    const { storage, retention } = setup();
    await storage.setItem(INSTALL_KEY, 'inst_existing');
    expect(await retention.getOrCreateInstallId()).toBe('inst_existing');
    expect(await storage.getItem(FIRST_LAUNCH_KEY)).toBeNull();
  });
});

describe('retentionService.recordHeartbeat', () => {
  it('persists a heartbeat and returns its ISO timestamp', async () => {
    const { storage, retention } = setup();
    const ts = await retention.recordHeartbeat();
    expect(ts).toBeTruthy();
    expect(await storage.getItem(LAST_ACTIVE_KEY)).toBe(ts);
  });

  it('is throttled when the persisted heartbeat is fresh (< 60s)', async () => {
    const { storage, retention } = setup();
    const recent = new Date(Date.now() - 10_000).toISOString();
    await storage.setItem(LAST_ACTIVE_KEY, recent);
    const ts = await retention.recordHeartbeat();
    expect(ts).toBeNull();
    expect(await storage.getItem(LAST_ACTIVE_KEY)).toBe(recent); // untouched
  });

  it('writes when the persisted heartbeat is stale (>= 60s)', async () => {
    const { storage, retention } = setup();
    const stale = new Date(Date.now() - 120_000).toISOString();
    await storage.setItem(LAST_ACTIVE_KEY, stale);
    const ts = await retention.recordHeartbeat();
    expect(ts).toBeTruthy();
    expect(await storage.getItem(LAST_ACTIVE_KEY)).toBe(ts);
  });

  it('throttles a second immediate call via the in-memory ref', async () => {
    const { retention } = setup();
    const first = await retention.recordHeartbeat();
    expect(first).toBeTruthy();
    const second = await retention.recordHeartbeat();
    expect(second).toBeNull();
  });
});

describe('retentionService.getRetentionSnapshot', () => {
  it('returns installId + first active (creates install id when missing)', async () => {
    const { retention } = setup();
    const snap = await retention.getRetentionSnapshot();
    expect(snap.installId).toMatch(/^inst_/);
    expect(snap.firstLaunchAt).toBeTruthy();
  });

  it('reflects a recorded heartbeat as lastActiveAt', async () => {
    const { storage, retention } = setup();
    await retention.recordHeartbeat();
    const snap = await retention.getRetentionSnapshot();
    expect(snap.lastActiveAt).toBe(await storage.getItem(LAST_ACTIVE_KEY));
    expect(snap.installId).toBeTruthy();
  });
});
