// hooks/useReadingSession.ts
// G-4 reader session timer — measures REAL reading time (KPI 2).
//
// Tracks active reading time for the current chapter:
//   - start tick on chapter entry / mount
//   - flush & pause when the app backgrounds; reset tick on resume so
//     background time is never counted
//   - 30s persist safety-net while reading (limits loss on abrupt kill)
//   - flush on unmount / chapter switch (attributed to the chapter that was
//     open when the flush happens — captured in the effect closure)
//
// The timer is fire-and-forget: storage failures are swallowed. It never
// blocks rendering or reading.

import { useEffect, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { recordReadingSeconds } from '../services/readingSessionService';

/** Persist at most once per 30s while a chapter is open. */
const FLUSH_INTERVAL_MS = 30_000;

/** Minimum elapsed time worth persisting (1s) — avoids 0-second noise. */
const MIN_FLUSH_MS = 1_000;

export function useReadingSession(chapterId: string | undefined) {
  const lastTickRef = useRef<number>(Date.now());

  useEffect(() => {
    // Capture the chapter this effect instance belongs to — the cleanup must
    // attribute elapsed time to the OLD chapter on a chapter switch, which is
    // why we don't read a ref that gets updated mid-render.
    const ch = chapterId;
    lastTickRef.current = Date.now();

    const flushNow = () => {
      const now = Date.now();
      const elapsedMs = now - lastTickRef.current;
      lastTickRef.current = now;
      if (ch && elapsedMs >= MIN_FLUSH_MS) {
        recordReadingSeconds(ch, Math.round(elapsedMs / 1000)).catch(() => {});
      }
    };

    // Persist safety-net while reading (crash-kill loses at most 30s).
    const interval = setInterval(flushNow, FLUSH_INTERVAL_MS);

    // Pause on background / resume on foreground (never count background time).
    const sub = AppState.addEventListener('change', (next: AppStateStatus) => {
      if (next === 'active') {
        lastTickRef.current = Date.now();
      } else {
        flushNow();
      }
    });

    return () => {
      flushNow();
      clearInterval(interval);
      sub.remove();
    };
  }, [chapterId]);
}
