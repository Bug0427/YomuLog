// hooks/useSyncEngine.ts
// Central sync orchestration hook — handles AppState foreground detection,
// connectivity checks, and debounced auto-sync.
// Uses real Supabase cloud sync when authenticated, falls back to simulated sync.

import { useEffect, useRef, useCallback, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import {
  getSyncState,
  performFullSync,
  checkConnectivity,
  type SyncState,
  type SyncStatus,
} from '../services/supabaseSyncService';
import {
  performCloudSync,
  isAuthenticated as isSupabaseAuthenticated,
} from '../services/syncService';
import { usePremium } from '../context/PremiumContext';
import { useAuthContext } from '../context/AuthContext';

const FOREGROUND_SYNC_DEBOUNCE_MS = 10_000; // 10s cooldown between foreground syncs
const AUTO_SYNC_DEBOUNCE_MS = 5_000; // 5s cooldown for auto-sync after mutations

export type SyncEngineState = {
  status: SyncStatus;
  lastSyncedAt: string | null;
  lastError: string | null;
  syncEnabled: boolean;
  isOnline: boolean;
};

/**
 * Central sync engine. Call once in App.tsx.
 * - Listens to AppState for foreground → sync trigger
 * - Performs periodic connectivity checks
 * - Exposes reactive sync state for UI indicators
 */
export function useSyncEngine() {
  const { isPremium } = usePremium();
  const { isLoggedIn } = useAuthContext();
  const [state, setState] = useState<SyncEngineState>({
    status: 'pending',
    lastSyncedAt: null,
    lastError: null,
    syncEnabled: false,
    isOnline: true,
  });

  const lastForegroundSyncRef = useRef<number>(0);
  const lastAutoSyncRef = useRef<number>(0);
  const syncInProgressRef = useRef<boolean>(false);

  // Load initial state
  useEffect(() => {
    let mounted = true;
    (async () => {
      const ss = await getSyncState();
      if (mounted) {
        setState((prev) => ({
          ...prev,
          status: ss.status,
          lastSyncedAt: ss.lastSyncedAt,
          lastError: ss.lastError,
          syncEnabled: ss.syncEnabled,
        }));
      }
    })();
    return () => { mounted = false; };
  }, []);

  // Refresh state after sync
  const refreshState = useCallback(async () => {
    const ss = await getSyncState();
    setState((prev) => ({
      ...prev,
      status: ss.status,
      lastSyncedAt: ss.lastSyncedAt,
      lastError: ss.lastError,
      syncEnabled: ss.syncEnabled,
    }));
  }, []);

  // Perform sync if conditions are met
  const doSync = useCallback(async () => {
    const ss = await getSyncState();
    if (!ss.syncEnabled || !isPremium) return;
    if (syncInProgressRef.current) return;

    syncInProgressRef.current = true;
    setState((prev) => ({ ...prev, status: 'syncing' }));

    try {
      const online = await checkConnectivity();
      if (!online) {
        setState((prev) => ({ ...prev, status: 'error', lastError: 'No internet connection', isOnline: false }));
        syncInProgressRef.current = false;
        return;
      }

      setState((prev) => ({ ...prev, isOnline: true }));

      // Try real Supabase cloud sync first (if authenticated)
      const isSbAuthed = await isSupabaseAuthenticated();
      if (isSbAuthed) {
        const cloudResult = await performCloudSync();
        setState((prev) => ({
          ...prev,
          status: cloudResult.status === 'synced' ? 'synced' : 'error',
          lastSyncedAt: cloudResult.lastSyncedAt,
          lastError: cloudResult.lastError,
          isOnline: true,
        }));
      } else {
        // Fall back to simulated sync
        const result = await performFullSync();
        setState((prev) => ({
          ...prev,
          status: result.status,
          lastSyncedAt: result.lastSyncedAt,
          lastError: result.lastError,
          syncEnabled: result.syncEnabled,
          isOnline: true,
        }));
      }
    } catch (e) {
      setState((prev) => ({
        ...prev,
        status: 'error',
        lastError: e instanceof Error ? e.message : 'Sync failed',
      }));
    } finally {
      syncInProgressRef.current = false;
    }
  }, [isPremium]);

  // AppState listener — sync on foreground
  useEffect(() => {
    const handleAppState = (nextState: AppStateStatus) => {
      if (nextState === 'active') {
        const now = Date.now();
        if (now - lastForegroundSyncRef.current > FOREGROUND_SYNC_DEBOUNCE_MS) {
          lastForegroundSyncRef.current = now;
          doSync();
        }
      }
    };

    const sub = AppState.addEventListener('change', handleAppState);
    return () => sub.remove();
  }, [doSync]);

  // Expose a debounced auto-sync for use after mutations
  const triggerAutoSync = useCallback(() => {
    const now = Date.now();
    if (now - lastAutoSyncRef.current > AUTO_SYNC_DEBOUNCE_MS) {
      lastAutoSyncRef.current = now;
      doSync();
    }
  }, [doSync]);

  // Manual sync
  const manualSync = useCallback(async () => {
    await doSync();
  }, [doSync]);

  return {
    ...state,
    refreshState,
    triggerAutoSync,
    manualSync,
  };
}
