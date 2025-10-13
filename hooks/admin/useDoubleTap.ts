import { useRef } from 'react';

/**
 * Detects a double-tap on an item key within a time window (default 300ms).
 * Returns a handler: call it with (key) from your onPress.
 */
export default function useDoubleTap<T>(callback: (payload: T) => void, windowMs: number = 300) {
  const tapRef = useRef<{ payload: T; time: number } | null>(null);

  return (payload: T) => {
    const now = Date.now();
    const last = tapRef.current;
    if (last && Object.is(last.payload, payload) && now - last.time < windowMs) {
      tapRef.current = null;
      callback(payload);
    } else {
      tapRef.current = { payload, time: now };
    }
  };
}
