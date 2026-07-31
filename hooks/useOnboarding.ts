// hooks/useOnboarding.ts
// Manages the first-run onboarding flow.
// Persists completion state to AsyncStorage so onboarding only shows once.

import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ONBOARDING_KEY = '@YomuLog:onboarding:completed';

/**
 * Returns whether onboarding has been completed, a function to mark it complete,
 * and a loading flag for the initial AsyncStorage read.
 */
export function useOnboarding() {
  const [completed, setCompleted] = useState<boolean | null>(null);

  // Read persisted flag on mount
  useEffect(() => {
    AsyncStorage.getItem(ONBOARDING_KEY).then((val) => {
      setCompleted(val === 'true');
    });
  }, []);

  const markCompleted = useCallback(async () => {
    await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
    setCompleted(true);
  }, []);

  const resetOnboarding = useCallback(async () => {
    await AsyncStorage.removeItem(ONBOARDING_KEY);
    setCompleted(false);
  }, []);

  return {
    /** null = still loading from storage, true = done, false = needs onboarding */
    completed,
    markCompleted,
    resetOnboarding,
  };
}
