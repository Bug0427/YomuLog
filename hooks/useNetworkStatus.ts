// hooks/useNetworkStatus.ts
// Network *reachability* hook — powers the Header "You're offline" banner.
//
// IMPORTANT (SW-03): this must reflect device connectivity, not API
// availability. A content API (MangaDex) can fail while the user is fully
// online (CORS, API outage, rate limit) — in that case the calling screens
// surface their own graceful error UI ("Tap to retry") and the offline
// banner must NOT appear. The banner is scoped to real network reachability:
//
// - Web: navigator.onLine + window online/offline events are the
//   authoritative reachability signal. No periodic API probe is run here —
//   a probe against a content API would conflate API/CORS failures with
//   connectivity and show a false "offline" banner.
// - Native: there are no window online/offline events, so we poll a
//   reachability endpoint every 30s as a best-effort proxy. NetInfo would
//   be ideal but adds a dependency.
import { useState, useEffect } from 'react';
import { resolveMangaDexUrl } from '../services/mangaDexProxy';

type NetworkState = {
  isOnline: boolean;
  type: string | null; // 'wifi', 'cellular', 'unknown', null
};

const isWeb = typeof window !== 'undefined';
// Web: navigator.onLine is the source of truth. Native: start optimistic
// (true) — the periodic probe corrects the state within 30s; starting
// pessimistic would flash the offline banner at every native boot.
let globalOnline = isWeb ? navigator.onLine : true;

export function getIsOnline(): boolean {
  return globalOnline;
}

export function useNetworkStatus(): NetworkState {
  const [state, setState] = useState<NetworkState>({
    isOnline: globalOnline,
    type: null,
  });

  useEffect(() => {
    const handleOnline = () => {
      globalOnline = true;
      setState((prev) => ({ ...prev, isOnline: true }));
    };
    const handleOffline = () => {
      globalOnline = false;
      setState((prev) => ({ ...prev, isOnline: false }));
    };

    // ── Web: navigator.onLine + events only (authoritative) ──────────
    if (isWeb) {
      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);
      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      };
    }

    // ── Native: periodic reachability probe (no window events) ───────
    const interval = setInterval(async () => {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        await fetch(resolveMangaDexUrl('/ping'), {
          method: 'HEAD',
          signal: controller.signal,
        });
        clearTimeout(timeout);
        if (!globalOnline) {
          globalOnline = true;
          setState((prev) => ({ ...prev, isOnline: true }));
        }
      } catch {
        if (globalOnline) {
          globalOnline = false;
          setState((prev) => ({ ...prev, isOnline: false }));
        }
      }
    }, 30000); // Check every 30s
    return () => clearInterval(interval);
  }, []);

  return state;
}
