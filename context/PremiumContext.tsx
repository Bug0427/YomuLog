// context/PremiumContext.tsx
// Premium subscription state management with AsyncStorage persistence.
// Provides isPremium flag, upgrade/downgrade, and feature-gate helpers.
// Stripe payment flow will be wired later — currently uses a local toggle for testing.

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  type ReactNode,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── Types ───────────────────────────────────────────────────────────

export type PremiumContextValue = {
  /** Whether the user currently has an active premium subscription */
  isPremium: boolean;
  /** Activate premium (simulated — will be replaced with Stripe webhook) */
  activatePremium: () => Promise<void>;
  /** Deactivate premium (graceful downgrade — preserves local data) */
  deactivatePremium: () => Promise<void>;
  /** Toggle for dev testing */
  togglePremium: () => Promise<void>;
};

// ─── Storage ─────────────────────────────────────────────────────────

const STORAGE_KEY = '@YomuLog:premium';

async function loadPremium(): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return raw === 'true';
  } catch {
    return false;
  }
}

async function savePremium(value: boolean): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, value ? 'true' : 'false');
}

// ─── Context ─────────────────────────────────────────────────────────

const PremiumContext = createContext<PremiumContextValue | null>(null);

export function PremiumProvider({ children }: { children: ReactNode }) {
  const [isPremium, setIsPremium] = useState<boolean>(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    loadPremium().then((v) => {
      setIsPremium(v);
      setReady(true);
    });
  }, []);

  const activatePremium = useCallback(async () => {
    setIsPremium(true);
    await savePremium(true);
  }, []);

  const deactivatePremium = useCallback(async () => {
    // Graceful downgrade: local data is preserved.
    // Cloud sync will be paused by the sync service when isPremium flips to false.
    setIsPremium(false);
    await savePremium(false);
  }, []);

  const togglePremium = useCallback(async () => {
    if (isPremium) {
      await deactivatePremium();
    } else {
      await activatePremium();
    }
  }, [isPremium, activatePremium, deactivatePremium]);

  const value = useMemo<PremiumContextValue>(
    () => ({ isPremium, activatePremium, deactivatePremium, togglePremium }),
    [isPremium, activatePremium, deactivatePremium, togglePremium],
  );

  if (!ready) return null;

  return <PremiumContext.Provider value={value}>{children}</PremiumContext.Provider>;
}

export function usePremium(): PremiumContextValue {
  const ctx = useContext(PremiumContext);
  if (!ctx) {
    throw new Error('usePremium must be used within a PremiumProvider');
  }
  return ctx;
}
