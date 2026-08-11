// context/PremiumContext.tsx
// Premium subscription state management with Stripe integration.
// On mount, fetches real subscription status from Supabase (set by Stripe webhooks).
// Falls back to cached AsyncStorage status when offline.
// Listens to Supabase Realtime for immediate status updates.

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
  type ReactNode,
} from 'react';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  fetchSubscriptionStatus,
  subscribeToSubscriptionChanges,
  type SubscriptionStatus,
} from '../services/stripeService';
import { useAuthContext } from './AuthContext';
import { recordFunnelEvent } from '../services/funnelService';

// ─── Types ───────────────────────────────────────────────────────────

export type PremiumContextValue = {
  /** Whether the user currently has an active premium subscription */
  isPremium: boolean;
  /** Raw subscription status from Stripe/Supabase */
  subscriptionStatus: SubscriptionStatus | null;
  /** Whether the initial status check is still loading */
  loading: boolean;
  /** Activate premium (called after successful Stripe checkout) */
  activatePremium: () => Promise<void>;
  /** Deactivate premium (called when subscription ends or is cancelled) */
  deactivatePremium: () => Promise<void>;
  /** Toggle for dev testing (only when not using real Stripe) */
  togglePremium: () => Promise<void>;
  /**
   * Re-fetch subscription status from Supabase and sync context + cache.
   * Used on app foreground (AppState) and by the Manage Subscription
   * "Refresh" button so a completed checkout is picked up without restart.
   * Returns the freshly fetched status.
   */
  refreshStatus: () => Promise<SubscriptionStatus>;
};

// ─── Storage ─────────────────────────────────────────────────────────

const STORAGE_KEY = '@YomuLog:premium';

async function loadCachedPremium(): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return raw === 'true';
  } catch {
    return false;
  }
}

async function saveCachedPremium(value: boolean): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, value ? 'true' : 'false');
}

// ─── Context ─────────────────────────────────────────────────────────

const PremiumContext = createContext<PremiumContextValue | null>(null);

export function PremiumProvider({ children }: { children: ReactNode }) {
  const [isPremium, setIsPremium] = useState<boolean>(false);
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const realtimeUnsubRef = useRef<(() => void) | null>(null);
  // G-6 (E5): previous server-confirmed isActive, so checkout_completed is
  // recorded only on a real false→true transition. Initial load is skipped
  // (prev === null) — a subscription already active on boot is not a new
  // conversion. Realtime + refreshStatus + foreground recovery all flow
  // through setSubscriptionStatus, so this one watcher covers every path.
  const prevActiveRef = useRef<boolean | null>(null);
  // Re-fetch entitlement whenever the (local) auth state changes — the
  // Supabase session is established by the sign-in flow (supabaseAuth),
  // so login/logout must trigger a fresh status fetch + Realtime channel.
  const { isLoggedIn } = useAuthContext();

  // Fetch real subscription status + subscribe to Realtime.
  // Keyed on isLoggedIn so a login (session now exists) or logout (session
  // cleared) refreshes entitlement immediately — no app restart required.
  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        // Load cached value first for instant rendering
        const cached = await loadCachedPremium();
        if (mounted) setIsPremium(cached);

        // Then fetch real status from Supabase (uses the current session)
        const status = await fetchSubscriptionStatus();
        if (mounted) {
          setSubscriptionStatus(status);
          setIsPremium(status.isActive);

          // Sync cache with real status
          await saveCachedPremium(status.isActive);
        }
      } catch {
        // Keep cached value on error
      } finally {
        if (mounted) setLoading(false);
      }

      // Subscribe to real-time subscription changes via Supabase Realtime
      if (!mounted) return;
      realtimeUnsubRef.current = subscribeToSubscriptionChanges((next) => {
        setSubscriptionStatus(next);
        setIsPremium(next.isActive);
        saveCachedPremium(next.isActive);
      });
    })();

    return () => {
      mounted = false;
      realtimeUnsubRef.current?.();
      realtimeUnsubRef.current = null;
    };
  }, [isLoggedIn]);

  // G-6 (E5): checkout_completed — watch the server-confirmed status flip
  // false→true (Realtime webhook callback, refreshStatus, foreground
  // recovery — all funnel through setSubscriptionStatus). Dedupe is
  // threefold: this prev-ref (one flip per session), funnelService's
  // lastSubscriptionIdRef (same subscription id can't be recorded twice),
  // and the server itself (upsert on user_id,event_id).
  useEffect(() => {
    const status = subscriptionStatus;
    if (!status) return;
    const prev = prevActiveRef.current;
    prevActiveRef.current = status.isActive;
    if (prev !== false || !status.isActive || !status.subscriptionId) return;
    void recordFunnelEvent('checkout_completed', {
      subscriptionId: status.subscriptionId,
      plan: status.plan ?? 'monthly',
      currentPeriodEnd: status.currentPeriodEnd ?? undefined,
    });
  }, [subscriptionStatus]);

  const activatePremium = useCallback(async () => {
    setIsPremium(true);
    await saveCachedPremium(true);
    // Re-fetch real status to confirm
    const status = await fetchSubscriptionStatus();
    setSubscriptionStatus(status);
    setIsPremium(status.isActive);
    await saveCachedPremium(status.isActive);
  }, []);

  /**
   * Re-fetch entitlement from Supabase. Used by the AppState foreground
   * listener (G-7: recover when Realtime misses the webhook-driven change)
   * and by the Manage Subscription "Refresh" button.
   */
  const refreshStatus = useCallback(async () => {
    const status = await fetchSubscriptionStatus();
    setSubscriptionStatus(status);
    setIsPremium(status.isActive);
    await saveCachedPremium(status.isActive);
    return status;
  }, []);

  // G-7: re-fetch subscription status whenever the app returns to the
  // foreground. Covers the case where Supabase Realtime failed to deliver
  // the post-checkout change — a paying user should not stay free until
  // restart. Debounced to avoid hammering on rapid app switches.
  useEffect(() => {
    if (!isLoggedIn) return;
    let lastForegroundRefresh = 0;
    const FOREGROUND_REFRESH_DEBOUNCE_MS = 15_000;
    const sub = AppState.addEventListener('change', (nextState) => {
      if (nextState !== 'active') return;
      const now = Date.now();
      if (now - lastForegroundRefresh >= FOREGROUND_REFRESH_DEBOUNCE_MS) {
        lastForegroundRefresh = now;
        refreshStatus();
      }
    });
    return () => sub.remove();
  }, [isLoggedIn, refreshStatus]);

  const deactivatePremium = useCallback(async () => {
    setIsPremium(false);
    await saveCachedPremium(false);
    const status = await fetchSubscriptionStatus();
    setSubscriptionStatus(status);
    setIsPremium(status.isActive);
    await saveCachedPremium(status.isActive);
  }, []);

  const togglePremium = useCallback(async () => {
    if (isPremium) {
      await deactivatePremium();
    } else {
      await activatePremium();
    }
  }, [isPremium, activatePremium, deactivatePremium]);

  const value = useMemo<PremiumContextValue>(
    () => ({ isPremium, subscriptionStatus, loading, activatePremium, deactivatePremium, togglePremium, refreshStatus }),
    [isPremium, subscriptionStatus, loading, activatePremium, deactivatePremium, togglePremium, refreshStatus],
  );

  return <PremiumContext.Provider value={value}>{children}</PremiumContext.Provider>;
}

export function usePremium(): PremiumContextValue {
  const ctx = useContext(PremiumContext);
  if (!ctx) {
    throw new Error('usePremium must be used within a PremiumProvider');
  }
  return ctx;
}
