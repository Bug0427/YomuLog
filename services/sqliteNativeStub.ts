// Stub for expo-sqlite on web.
// Metro aliases to this file when bundling for the web platform.
// nativeDB.ts conditionally imports expo-sqlite only on native;
// this stub prevents Metro from erroring while tracing the dynamic import.

export function openDatabaseSync(_name: string) {
  // Return a mock that matches the shape nativeDB.ts expects
  return {
    runAsync: (_sql: string, _params?: any[]) =>
      Promise.resolve({ rowsAffected: 0 }),
    getAllAsync: <T = unknown>(_sql: string, _params?: any[]) =>
      Promise.resolve([] as T[]),
    getFirstAsync: <T = unknown>(_sql: string, _params?: any[]) =>
      Promise.resolve(null as T | null),
    execAsync: (_sql: string) => Promise.resolve(),
  };
}
