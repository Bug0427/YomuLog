// utils/platformUtils.ts
// Platform detection and conditional imports for web/native compatibility.
// Use isWeb to guard native-only APIs at call sites.

import { Platform } from 'react-native';

/** True when running in a web browser (react-native-web) */
export const isWeb: boolean = Platform.OS === 'web';

/** True when running on a native mobile platform (iOS or Android) */
export const isNative: boolean = Platform.OS === 'ios' || Platform.OS === 'android';

/**
 * Calls nativeFn on iOS/Android and webFn on web.
 * Both functions must accept the same args and return compatible types.
 */
export function platformSelect<T extends (...args: any[]) => any>(
  nativeFn: T,
  webFn: T,
): T {
  return ((...args: any[]) => {
    if (isWeb) return webFn(...args);
    return nativeFn(...args);
  }) as T;
}

/**
 * Returns value if not on web, otherwise returns the webFallback.
 * Useful for guarding module imports.
 */
export function guardNative<T>(value: T, webFallback: T): T {
  return isWeb ? webFallback : value;
}
