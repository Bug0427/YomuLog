// hooks/useNetworkStatus.ts
import { useState, useEffect } from 'react';

type NetworkState = {
  isOnline: boolean;
  type: string | null; // 'wifi', 'cellular', 'unknown', null
};

// Basic implementation using navigator.onLine for web and a periodic
// fetch health check for native. NetInfo would be ideal but adds a dependency.
let globalOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

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

    if (typeof window !== 'undefined') {
      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);
    }

    // Periodic health check for environments where events may not fire
    const interval = setInterval(async () => {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        await fetch('https://api.mangadex.org/ping', {
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

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      }
      clearInterval(interval);
    };
  }, []);

  return state;
}
