

import { useRef } from 'react';

/**
 * Hook to detect triple-tap on a row. Returns a handler you can attach to onPress.
 * If triple-tap detected within 500ms windows, calls the provided callback.
 */
export default function useTripleTap<T>(callback: (item: T) => void, windowMs: number = 500) {
  const tapRef = useRef<{ index: number; count: number; time: number } | null>(null);

  return (index: number, item: T) => {
    const now = Date.now();
    const last = tapRef.current;
    if (last && last.index === index && now - last.time < windowMs) {
      const count = (last.count || 1) + 1;
      if (count >= 3) {
        tapRef.current = null;
        callback(item);
      } else {
        tapRef.current = { index, count, time: now };
      }
    } else {
      tapRef.current = { index, count: 1, time: now };
    }
  };
}