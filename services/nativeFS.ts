// services/nativeFS.ts
// Platform-safe file system abstraction.
// On native: uses expo-file-system. On web: provides safe no-op mocks
// that prevent crashes while gracefully degrading functionality.

import { isWeb } from '../utils/platformUtils';

// ─── Native imports (conditionally required at module level) ────────
// On web these imports will throw at module-load time unless guarded.
// We lazy-load them through function wrappers instead of top-level imports.

// ─── Types ────────────────────────────────────────────────────────────

export type FSResult = { status: number };

// ─── Directory helpers ────────────────────────────────────────────────

let _documentDir: string | null = null;

export async function getDocumentDir(): Promise<string> {
  if (isWeb) return '/web-storage/';
  if (!_documentDir) {
    const mod = await import('expo-file-system/legacy');
    _documentDir = mod.documentDirectory ?? '';
  }
  return _documentDir!;
}

export async function makeDirAsync(
  path: string,
  options?: { intermediates?: boolean },
): Promise<void> {
  if (isWeb) return; // no-op on web
  try {
    const mod = await import('expo-file-system/legacy');
    await mod.makeDirectoryAsync(path, options);
  } catch {
    // Directory may already exist — that's fine
  }
}

// ─── File download ────────────────────────────────────────────────────

export async function downloadFileAsync(
  url: string,
  dest: string,
): Promise<FSResult> {
  if (isWeb) {
    // On web, simulate a "downloaded" result without actually saving
    console.log(`[web] Simulated download: ${url} → ${dest}`);
    return { status: 200 };
  }
  try {
    const mod = await import('expo-file-system/legacy');
    return await mod.downloadAsync(url, dest);
  } catch {
    return { status: 500 };
  }
}

// ─── File info ────────────────────────────────────────────────────────

export async function fileInfoAsync(
  path: string,
): Promise<{ exists: boolean }> {
  if (isWeb) return { exists: false };
  try {
    const mod = await import('expo-file-system/legacy');
    return await mod.getInfoAsync(path);
  } catch {
    return { exists: false };
  }
}

// ─── Directory listing ────────────────────────────────────────────────

export async function listDirAsync(
  path: string,
): Promise<string[]> {
  if (isWeb) return [];
  try {
    const mod = await import('expo-file-system/legacy');
    return await mod.readDirectoryAsync(path);
  } catch {
    return [];
  }
}

// ─── Delete ───────────────────────────────────────────────────────────

export async function deleteFileAsync(
  path: string,
  options?: { idempotent?: boolean },
): Promise<void> {
  if (isWeb) return;
  try {
    const mod = await import('expo-file-system/legacy');
    await mod.deleteAsync(path, options);
  } catch {
    // idempotent: ignore failures
  }
}

// ─── Legacy constants ─────────────────────────────────────────────────

/** Absolute download base directory. Returns a web-safe path on web. */
let _baseDir: string | null = null;

export async function getDownloadBaseDir(): Promise<string> {
  if (isWeb) return '/web-storage/yomulog/downloads/';
  if (!_baseDir) {
    const mod = await import('expo-file-system/legacy');
    _baseDir = `${mod.documentDirectory}yomulog/downloads/`;
  }
  return _baseDir;
}
