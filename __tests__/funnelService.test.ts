// __tests__/funnelService.test.ts
// Unit tests for funnelService — G-6 premium funnel event log:
// record/dedupe/clear/prune + install-id attribution.
import AsyncStorage from '@react-native-async-storage/async-storage';

// In-memory AsyncStorage mock (getItem/setItem/multiSet/multiGet — multiSet is
// used by retentionService.getOrCreateInstallId, which funnelService relies on
// for the install_id attribution).
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
      pairs.forEach(([key, value]) => {
        store[key] = value;
      });
      return Promise.resolve();
    }),
    multiGet: jest.fn((keys: string[]) =>
      Promise.resolve(keys.map((key: string) => [key, store[key] ?? null])),
    ),
  };
});

import {
  recordFunnelEvent,
  getFunnelEventLog,
  clearFunnelEvents,
} from '../services/funnelService';

const EVENT_LOG_KEY = '@YomuLog:eventLog';

async function readRawLog(): Promise<any[]> {
  const raw = await AsyncStorage.getItem(EVENT_LOG_KEY);
  return raw ? JSON.parse(raw) : [];
}

beforeEach(() => {
  jest.clearAllMocks();
  // Reset the in-memory store so tests are isolated.
  const store = (AsyncStorage as any).getItem;
  // Clear by removing the event log + install-id keys.
  return Promise.all([
    AsyncStorage.removeItem(EVENT_LOG_KEY),
    AsyncStorage.removeItem('@YomuLog:installId'),
    AsyncStorage.removeItem('@YomuLog:firstLaunchAt'),
  ]);
});

describe('funnelService', () => {
  it('records an event with event_id, occurred_at and install_id', async () => {
    await recordFunnelEvent('paywall_viewed', { source: 'modal:settings' });

    const log = await getFunnelEventLog();
    expect(log).toHaveLength(1);
    const e = log[0];
    expect(e.name).toBe('paywall_viewed');
    expect(e.payload).toEqual({ source: 'modal:settings' });
    expect(e.event_id).toMatch(/^paywall_viewed_[a-z0-9]+_[a-z0-9]+$/);
    expect(new Date(e.occurred_at).getTime()).not.toBeNaN();
    expect(e.install_id).toMatch(/^inst_/);
  });

  it('appends multiple events in order', async () => {
    await recordFunnelEvent('signup_complete', { provider: 'local' });
    await recordFunnelEvent('paywall_viewed', { source: 'onboarding' });

    const log = await getFunnelEventLog();
    expect(log).toHaveLength(2);
    expect(log.map((e) => e.name)).toEqual(['signup_complete', 'paywall_viewed']);
  });

  it('dedupes checkout_completed per subscription id (E5, spec §2.4)', async () => {
    await recordFunnelEvent('checkout_completed', {
      subscriptionId: 'sub_123',
      plan: 'monthly',
    });
    // Realtime + refreshStatus observing the same conversion must not double-count.
    await recordFunnelEvent('checkout_completed', {
      subscriptionId: 'sub_123',
      plan: 'monthly',
    });

    const log = await getFunnelEventLog();
    expect(log).toHaveLength(1);
    expect(log[0].payload.subscriptionId).toBe('sub_123');

    // A different subscription (renewal / new conversion) is a new event.
    await recordFunnelEvent('checkout_completed', {
      subscriptionId: 'sub_456',
      plan: 'monthly',
    });
    const after = await getFunnelEventLog();
    expect(after).toHaveLength(2);
  });

  it('clearFunnelEvents removes only the pushed ids', async () => {
    await recordFunnelEvent('signup_complete', { provider: 'supabase' });
    await recordFunnelEvent('paywall_viewed', { source: 'upgrade_screen' });
    await recordFunnelEvent('checkout_started', { plan: 'monthly' });

    const log = await getFunnelEventLog();
    const [first, ...rest] = log;
    await clearFunnelEvents([first.event_id]);

    const remaining = await getFunnelEventLog();
    expect(remaining).toHaveLength(2);
    expect(remaining.some((e) => e.event_id === first.event_id)).toBe(false);
    expect(remaining.map((e) => e.event_id).sort()).toEqual(
      rest.map((e) => e.event_id).sort(),
    );
  });

  it('clearFunnelEvents([]) is a no-op', async () => {
    await recordFunnelEvent('paywall_viewed', { source: 'onboarding' });
    await clearFunnelEvents([]);
    expect(await getFunnelEventLog()).toHaveLength(1);
  });

  it('prunes the log to the newest 500 entries', async () => {
    for (let i = 0; i < 505; i++) {
      await recordFunnelEvent('paywall_viewed', { source: 'load_test', i });
    }
    const log = await getFunnelEventLog();
    expect(log).toHaveLength(500);
    // The oldest entries were dropped — the newest remain.
    expect(log[0].payload.i).toBe(5);
    expect(log[499].payload.i).toBe(504);
  });

  it('never throws on storage failures (fire-and-forget contract)', async () => {
    (AsyncStorage.getItem as jest.Mock).mockRejectedValueOnce(new Error('boom'));
    await expect(
      recordFunnelEvent('paywall_viewed', { source: 'onboarding' }),
    ).resolves.toBeUndefined();
  });
});
