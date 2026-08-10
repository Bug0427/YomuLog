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
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  fetchSubscriptionStatus,
  subscribeToSubscriptionChanges,
  type SubscriptionStatus,
} from '../services/stripeService';
import { useAuthContext } from './AuthContext';

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

  const activatePremium = useCallback(async () => {
    setIsPremium(true);
    await saveCachedPremium(true);
    // Re-fetch real status to confirm
    const status = await fetchSubscriptionStatus();
    setSubscriptionStatus(status);
    setIsPremium(status.isActive);
    await saveCachedPremium(status.isActive);
  }, []);

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
    () => ({ isPremium, subscriptionStatus, loading, activatePremium, deactivatePremium, togglePremium }),
    [isPremium, subscriptionStatus, loading, activatePremium, deactivatePremium, togglePremium],
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
