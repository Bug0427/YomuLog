// services/downloadManager.ts
// Queue-based offline chapter download manager with background recovery.
// Supports concurrency pool (2-3 pages), interrupted download recovery,
// and API aliases for a clean external interface.
// On web: gracefully degrades — downloads are simulated (no crash).

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getDownloadBaseDir,
  makeDirAsync,
  downloadFileAsync,
  listDirAsync,
  deleteFileAsync,
  getFileSizeAsync,
} from './nativeFS';
import { getChapterPages, buildPageUrlsFromChapterData } from './mangaAPI';
import { isWeb } from '../utils/platformUtils';

// ─── Types ─────────────────────────────────────────────────────────

export type DownloadStatus = 'pending' | 'downloading' | 'completed' | 'failed';

export type DownloadJob = {
  jobId: string;
  chapterId: string;
  mangaId: string;
  mangaTitle: string;
  chapterNumber: string;
  chapterTitle?: string;
  status: DownloadStatus;
  progress: number;          // 0–100
  totalPages: number;
  downloadedPages: number;
  errorMessage?: string;
  createdAt: string;         // ISO timestamp
  /** ISO timestamp set when the job reaches 'completed' (G-2) */
  completedAt?: string;
  retryCount: number;
  /** Absolute local directory where pages are stored */
  localDir?: string;
};

export type DownloadedChapter = {
  chapterId: string;
  mangaId: string;
  mangaTitle: string;
  chapterNumber: string;
  chapterTitle?: string;
  totalPages: number;
  localDir: string;
  downloadedAt: string;
};

// ─── Constants ─────────────────────────────────────────────────────

const DOWNLOAD_QUEUE_KEY = '@YomuLog:downloadQueue';
const DOWNLOADED_CHAPTERS_KEY = '@YomuLog:downloadedChapters';
const MAX_RETRIES = 3;
/** Maximum concurrent page downloads */
const CONCURRENCY_LIMIT = 3;
/**
 * Free-tier offline download cap (chapters queued + downloaded).
 * Premium users are unlimited. Chosen as a sensible free-taste limit:
 * a few chapters to try offline reading, with an upsell prompt at the cap.
 */
export const FREE_DOWNLOAD_LIMIT = 5;

/** Thrown by enqueueDownload when a free user hits the free-tier cap. */
export class DownloadLimitError extends Error {
  constructor(public readonly limit: number) {
    super(`Free tier limit reached (${limit} chapters). Upgrade to Premium for unlimited downloads.`);
    this.name = 'DownloadLimitError';
  }
}

// ─── Download reliability instrumentation (G-2, KPI 3) ──────────────
//
// Cumulative success/failure counters persisted in AsyncStorage so the
// Download Reliability Rate stays computable even after clearCompleted(),
// removeJob() or clearAllDownloads() wipe the queue/index. Counters are
// cumulative since install. Web downloads are SIMULATED (nativeFS always
// returns status 200), so web activity is counted separately and the rate is
// gated to native (webSimulated=true) — see G-8.

const RELIABILITY_KEY = '@YomuLog:downloadReliability';

export type DownloadReliabilityStats = {
  /** Cumulative real (native) downloads completed successfully */
  totalCompleted: number;
  /** Cumulative real (native) downloads that failed permanently (retries exhausted) */
  totalFailed: number;
  /** Cumulative web-simulated completions (informational — not a real metric) */
  webSimulatedCompleted: number;
  /** True on web — the real counters are not populated, rate is not valid */
  webSimulated: boolean;
};

type ReliabilityDelta = {
  completed?: number;
  failed?: number;
  webSimulatedCompleted?: number;
};

export async function getDownloadReliabilityStats(): Promise<DownloadReliabilityStats> {
  const stored = await getJson<Partial<DownloadReliabilityStats>>(RELIABILITY_KEY, {});
  return {
    totalCompleted: stored.totalCompleted ?? 0,
    totalFailed: stored.totalFailed ?? 0,
    webSimulatedCompleted: stored.webSimulatedCompleted ?? 0,
    webSimulated: isWeb,
  };
}

async function incrementReliability(delta: ReliabilityDelta): Promise<void> {
  const stats = await getDownloadReliabilityStats();
  await setJson(RELIABILITY_KEY, {
    totalCompleted: stats.totalCompleted + (delta.completed ?? 0),
    totalFailed: stats.totalFailed + (delta.failed ?? 0),
    webSimulatedCompleted: stats.webSimulatedCompleted + (delta.webSimulatedCompleted ?? 0),
  });
}

/**
 * Download Reliability Rate — completed / (completed + failed), cumulative
 * since install. `valid: false` on web (downloads are simulated there, so the
 * rate would be meaningless) or when there is no history yet (rate: null).
 */
export async function getDownloadReliabilityRate(): Promise<{
  valid: boolean;
  rate: number | null;
  totalCompleted: number;
  totalFailed: number;
}> {
  const stats = await getDownloadReliabilityStats();
  if (stats.webSimulated) {
    return { valid: false, rate: null, totalCompleted: stats.totalCompleted, totalFailed: stats.totalFailed };
  }
  const denominator = stats.totalCompleted + stats.totalFailed;
  return {
    valid: true,
    rate: denominator === 0 ? null : stats.totalCompleted / denominator,
    totalCompleted: stats.totalCompleted,
    totalFailed: stats.totalFailed,
  };
}

/** True when the cached premium entitlement is set (fail-closed: false on error). */
export async function isCachedPremium(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem('@YomuLog:premium')) === 'true';
  } catch {
    return false;
  }
}

/** Chapters currently queued (non-failed) or already downloaded. */
export async function getDownloadUsage(): Promise<number> {
  const queue = await getDownloadQueue();
  const queued = queue.filter((j) => j.status !== 'failed').length;
  const downloaded = (await getDownloadedChapters()).length;
  return queued + downloaded;
}

/** Free-tier allowance snapshot for the UI (upsell prompt at the cap). */
export async function getDownloadAllowance(): Promise<{
  premium: boolean;
  limit: number;
  used: number;
  allowed: boolean;
}> {
  const premium = await isCachedPremium();
  const used = await getDownloadUsage();
  return { premium, limit: FREE_DOWNLOAD_LIMIT, used, allowed: premium || used < FREE_DOWNLOAD_LIMIT };
}

let _downloadBaseDir: string | null = null;
async function resolveBaseDir(): Promise<string> {
  if (!_downloadBaseDir) {
    _downloadBaseDir = await getDownloadBaseDir();
  }
  return _downloadBaseDir;
}

// ─── Helpers ───────────────────────────────────────────────────────

async function getJson<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch { return fallback; }
}

function setJson<T>(key: string, value: T): Promise<void> {
  return AsyncStorage.setItem(key, JSON.stringify(value));
}

function generateJobId(): string {
  return `dl_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

// ─── Queue management ──────────────────────────────────────────────

export async function getDownloadQueue(): Promise<DownloadJob[]> {
  return getJson<DownloadJob[]>(DOWNLOAD_QUEUE_KEY, []);
}

async function saveQueue(queue: DownloadJob[]): Promise<void> {
  await setJson(DOWNLOAD_QUEUE_KEY, queue);
}

/** Add a chapter to the download queue. */
export async function enqueueDownload(
  chapterId: string,
  mangaId: string,
  mangaTitle: string,
  chapterNumber: string,
  chapterTitle?: string,
): Promise<DownloadJob> {
  const queue = await getDownloadQueue();

  // Avoid duplicates — if already enqueued (and not failed), return it
  if (queue.some((j) => j.chapterId === chapterId && j.status !== 'failed')) {
    return queue.find((j) => j.chapterId === chapterId)!;
  }

  // If a failed entry exists, reset it for retry
  const existing = queue.find((j) => j.chapterId === chapterId && j.status === 'failed');
  if (existing) {
    existing.status = 'pending';
    existing.progress = 0;
    existing.downloadedPages = 0;
    existing.errorMessage = undefined;
    existing.retryCount = 0;
    await saveQueue(queue);
    return existing;
  }

  // Free-tier cap — premium users are unlimited; free users get FREE_DOWNLOAD_LIMIT.
  // Fail-closed: cached entitlement read; throws so the UI can show the upsell.
  const { allowed } = await getDownloadAllowance();
  if (!allowed) throw new DownloadLimitError(FREE_DOWNLOAD_LIMIT);

  const job: DownloadJob = {
    jobId: generateJobId(),
    chapterId,
    mangaId,
    mangaTitle,
    chapterNumber,
    chapterTitle,
    status: 'pending',
    progress: 0,
    totalPages: 0,
    downloadedPages: 0,
    createdAt: new Date().toISOString(),
    retryCount: 0,
  };

  queue.push(job);
  await saveQueue(queue);
  return job;
}

// ─── API Aliases ───────────────────────────────────────────────────

/** Alias: downloadChapter → enqueueDownload */
export async function downloadChapter(
  chapterId: string,
  mangaId: string,
  mangaTitle: string,
  chapterNumber: string,
): Promise<DownloadJob> {
  return enqueueDownload(chapterId, mangaId, mangaTitle, chapterNumber);
}

/** Alias: getChapterDownloadStatus → returns status string for a chapter */
export async function getChapterDownloadStatus(chapterId: string): Promise<DownloadStatus | null> {
  const queue = await getDownloadQueue();
  const job = queue.find((j) => j.chapterId === chapterId);
  return job ? job.status : null;
}

/** Alias: deleteDownloadedChapter → removes a chapter from both queue and index */
export async function deleteDownloadedChapter(chapterId: string): Promise<void> {
  // Remove from queue
  let queue = await getDownloadQueue();
  queue = queue.filter((j) => j.chapterId !== chapterId);
  await saveQueue(queue);

  // Remove from downloaded index — capture localDir before filtering
  const downloaded = await getDownloadedChaptersRaw();
  const chapterToDelete = downloaded.find((c) => c.chapterId === chapterId);
  const remaining = downloaded.filter((c) => c.chapterId !== chapterId);
  await setJson(DOWNLOADED_CHAPTERS_KEY, remaining);

  // Clean up local files
  if (chapterToDelete?.localDir) {
    await deleteFileAsync(chapterToDelete.localDir, { idempotent: true }).catch(() => {});
  }
}

// ─── Download execution ────────────────────────────────────────────

/** Download a single page and return whether it succeeded. */
async function downloadPage(url: string, dest: string): Promise<boolean> {
  try {
    const result = await downloadFileAsync(url, dest);
    return result.status === 200;
  } catch {
    return false;
  }
}

/**
 * Process the next pending (or retryable failed) job in the queue.
 * Downloads pages concurrently in batches of CONCURRENCY_LIMIT.
 */
export async function processNextDownload(): Promise<boolean> {
  const queue = await getDownloadQueue();
  const job = queue.find(
    (j) => j.status === 'pending' || (j.status === 'failed' && j.retryCount < MAX_RETRIES),
  );

  if (!job) return false;

  // Mark as downloading
  job.status = 'downloading';
  job.retryCount += 1;
  await saveQueue(queue);

  try {
    // 1. Get chapter page data from MangaDex
    const chapterData = await getChapterPages(job.chapterId);
    if (!chapterData) throw new Error('Failed to fetch chapter page data');

    job.totalPages = chapterData.pages.length;
    const pageUrls = buildPageUrlsFromChapterData(chapterData, 'data-saver');

    // 2. Create local directory
    const baseDir = await resolveBaseDir();
    const localDir = `${baseDir}${job.mangaId}/${job.chapterId}/`;
    await makeDirAsync(localDir, { intermediates: true });

    // 3. Download pages concurrently in batches of CONCURRENCY_LIMIT
    let downloaded = 0;
    let lastPersistedMilestone = -1;

    for (let i = 0; i < pageUrls.length; i += CONCURRENCY_LIMIT) {
      const batch = pageUrls.slice(i, i + CONCURRENCY_LIMIT);
      const batchResults = await Promise.all(
        batch.map(async (url, idx) => {
          const pageIndex = i + idx;
          const ext = url.split('.').pop() || 'jpg';
          const dest = `${localDir}page_${String(pageIndex + 1).padStart(3, '0')}.${ext}`;
          const ok = await downloadPage(url, dest);
          return ok ? 1 : 0;
        }),
      );

      downloaded += batchResults.reduce<number>((sum, val) => sum + val, 0);

      // Update progress — persist at milestones to reduce AsyncStorage writes
      job.downloadedPages = downloaded;
      job.progress = Math.round((downloaded / pageUrls.length) * 100);
      const milestone = Math.floor(job.progress / 10);
      if (milestone > lastPersistedMilestone) {
        await saveQueue(queue);
        lastPersistedMilestone = milestone;
      }
    }

    // Ensure final progress is persisted
    if (downloaded === pageUrls.length) {
      await saveQueue(queue);
    }

    // 4. Mark as completed
    job.status = 'completed';
    job.progress = 100;
    job.localDir = localDir;
    job.completedAt = new Date().toISOString();
    await saveQueue(queue);

    // 5. Record in downloaded chapters index
    await recordDownloadedChapter({
      chapterId: job.chapterId,
      mangaId: job.mangaId,
      mangaTitle: job.mangaTitle,
      chapterNumber: job.chapterNumber,
      chapterTitle: job.chapterTitle,
      totalPages: job.totalPages,
      localDir,
      downloadedAt: new Date().toISOString(),
    });

    // G-2: persist the cumulative success counter. On web downloads are
    // simulated (nativeFS always returns 200) — count them separately so the
    // real reliability metric isn't polluted (G-8).
    if (isWeb) {
      await incrementReliability({ webSimulatedCompleted: 1 });
    } else {
      await incrementReliability({ completed: 1 });
    }

    return true;
  } catch (err: any) {
    job.status = 'failed';
    job.errorMessage = err?.message ?? 'Unknown error';
    const baseDir = await resolveBaseDir();
    job.localDir = `${baseDir}${job.mangaId}/${job.chapterId}/`;
    await saveQueue(queue);

    // G-2: count only permanent failures (retries exhausted) as a failure —
    // a retryable attempt that will be retried isn't a final outcome. Web
    // downloads are simulated → excluded from the real counters.
    if (!isWeb && job.retryCount >= MAX_RETRIES) {
      await incrementReliability({ failed: 1 });
    }
    return false;
  }
}

/** Process all pending downloads in the queue sequentially. */
export async function processAllDownloads(): Promise<void> {
  let processed = true;
  while (processed) {
    processed = await processNextDownload();
  }
}

// ─── Intelligent Download Recovery ─────────────────────────────────

/**
 * Scan for interrupted downloads (status 'downloading' or 'pending' with
 * existing local files) and resume from the last successfully completed page.
 * Returns the number of jobs resumed.
 */
export async function resumeInterruptedDownloads(): Promise<number> {
  const queue = await getDownloadQueue();
  let resumed = 0;

  for (const job of queue) {
    if (job.status !== 'downloading' && job.status !== 'pending') continue;

    const baseDir = await resolveBaseDir();
    const localDir = job.localDir || `${baseDir}${job.mangaId}/${job.chapterId}/`;

    // Scan for existing pages using listDirAsync (faster than sequential getInfoAsync)
    let highestCompletedPage = 0;
    try {
      const files = await listDirAsync(localDir);
      const pageNumbers = files
        .filter((f) => /^page_\d+\.(jpg|png|webp)$/i.test(f))
        .map((f) => parseInt(f.match(/\d+/)?.[0] ?? '0', 10))
        .filter((n) => n > 0)
        .sort((a, b) => a - b);

      // Find the highest consecutive page number from 1
      for (const num of pageNumbers) {
        if (num === highestCompletedPage + 1) {
          highestCompletedPage = num;
        } else {
          break; // gap found — stop counting
        }
      }
    } catch {
      // Directory doesn't exist yet
    }

    if (highestCompletedPage > 0) {
      job.downloadedPages = highestCompletedPage;
      job.status = 'pending';
      job.retryCount = 0;
      job.errorMessage = undefined;
      job.localDir = localDir;
      resumed++;
    } else if (job.status === 'downloading') {
      job.status = 'pending';
      job.retryCount = 0;
      job.errorMessage = undefined;
      job.localDir = localDir;
      resumed++;
    }
  }

  if (resumed > 0) {
    await saveQueue(queue);
    await processAllDownloads();
  }

  return resumed;
}

/** Retry failed downloads. */
export async function retryFailedDownloads(): Promise<number> {
  const queue = await getDownloadQueue();
  const failed = queue.filter((j) => j.status === 'failed' && j.retryCount < MAX_RETRIES);
  if (failed.length === 0) return 0;

  for (const job of failed) {
    job.status = 'pending';
    job.progress = 0;
    job.downloadedPages = 0;
    job.errorMessage = undefined;
  }
  await saveQueue(queue);
  await processAllDownloads();
  return failed.length;
}

// ─── Downloaded chapters index ─────────────────────────────────────

async function getDownloadedChaptersRaw(): Promise<DownloadedChapter[]> {
  return getJson<DownloadedChapter[]>(DOWNLOADED_CHAPTERS_KEY, []);
}

async function recordDownloadedChapter(chapter: DownloadedChapter): Promise<void> {
  const list = await getDownloadedChaptersRaw();
  const idx = list.findIndex((c) => c.chapterId === chapter.chapterId);
  if (idx >= 0) {
    list[idx] = chapter;
  } else {
    list.push(chapter);
  }
  await setJson(DOWNLOADED_CHAPTERS_KEY, list);
}

/** Get all downloaded chapters. */
export async function getDownloadedChapters(): Promise<DownloadedChapter[]> {
  return getDownloadedChaptersRaw();
}

/** Get downloaded chapters grouped by manga. */
export async function getDownloadedByManga(): Promise<Map<string, DownloadedChapter[]>> {
  const list = await getDownloadedChaptersRaw();
  const map = new Map<string, DownloadedChapter[]>();
  for (const ch of list) {
    const existing = map.get(ch.mangaId) ?? [];
    existing.push(ch);
    map.set(ch.mangaId, existing);
  }
  return map;
}

/** Check if a specific chapter is downloaded. */
export async function isChapterDownloaded(chapterId: string): Promise<boolean> {
  const list = await getDownloadedChaptersRaw();
  return list.some((c) => c.chapterId === chapterId);
}

/**
 * G-2: remove a corrupted chapter from the completed index and re-queue its
 * job (mark failed with retries reset) so the normal retry machinery re-downloads
 * it instead of silently serving a broken chapter. Counts one failure.
 */
async function handleCorruptedDownload(chapter: DownloadedChapter): Promise<void> {
  // Remove from the completed index so offline reads fall back to online
  const list = await getDownloadedChaptersRaw();
  await setJson(DOWNLOADED_CHAPTERS_KEY, list.filter((c) => c.chapterId !== chapter.chapterId));

  // Re-queue: reset the job to retryable 'failed' (retryCount 0) so
  // processNextDownload/retryFailedDownloads picks it up again.
  const queue = await getDownloadQueue();
  const job = queue.find((j) => j.chapterId === chapter.chapterId);
  if (job) {
    job.status = 'failed';
    job.errorMessage = 'Download corrupted (missing or empty pages) — retry to re-download';
    job.retryCount = 0;
    job.completedAt = undefined;
    await saveQueue(queue);
  }

  // A corrupted completed download is a failed outcome for the reliability rate
  if (!isWeb) {
    await incrementReliability({ failed: 1 });
  }
}

/** Get local file URIs for a downloaded chapter's pages. */
export async function getLocalPageUris(chapterId: string): Promise<string[] | null> {
  const list = await getDownloadedChaptersRaw();
  const chapter = list.find((c) => c.chapterId === chapterId);
  if (!chapter) return null;

  try {
    const files = await listDirAsync(chapter.localDir);
    const pageFiles = files
      .filter((f) => /^page_(\d+)\.(jpg|png|webp)$/i.test(f))
      .sort((a, b) => {
        const numA = parseInt(a.match(/\d+/)?.[0] ?? '0', 10);
        const numB = parseInt(b.match(/\d+/)?.[0] ?? '0', 10);
        return numA - numB;
      });

    // G-2 corruption check (lightweight): every expected page must be present
    // (count vs the chapter's recorded totalPages) and non-empty on native.
    if (pageFiles.length < chapter.totalPages) {
      await handleCorruptedDownload(chapter);
      return null;
    }
    if (!isWeb) {
      for (const f of pageFiles) {
        const size = await getFileSizeAsync(`${chapter.localDir}${f}`);
        if (size === 0) {
          await handleCorruptedDownload(chapter);
          return null;
        }
      }
    }

    const uris = pageFiles.map((f) => `${chapter.localDir}${f}`);
    return uris.length > 0 ? uris : null;
  } catch {
    return null;
  }
}

/** Get download stats. */
export async function getDownloadStats(): Promise<{
  total: number;
  completed: number;
  failed: number;
  pending: number;
  downloading: number;
}> {
  const queue = await getDownloadQueue();
  return {
    total: queue.length,
    completed: queue.filter((j) => j.status === 'completed').length,
    failed: queue.filter((j) => j.status === 'failed').length,
    pending: queue.filter((j) => j.status === 'pending').length,
    downloading: queue.filter((j) => j.status === 'downloading').length,
  };
}

/** Clear all download data (for testing / user reset). */
export async function clearAllDownloads(): Promise<void> {
  await AsyncStorage.multiRemove([DOWNLOAD_QUEUE_KEY, DOWNLOADED_CHAPTERS_KEY]);
  const baseDir = await resolveBaseDir();
  await deleteFileAsync(baseDir, { idempotent: true });
}

/** Remove a specific job from the queue. */
export async function removeJob(jobId: string): Promise<void> {
  let queue = await getDownloadQueue();
  queue = queue.filter((j) => j.jobId !== jobId);
  await saveQueue(queue);
}

/** Remove all completed jobs from the queue. */
export async function clearCompleted(): Promise<void> {
  let queue = await getDownloadQueue();
  queue = queue.filter((j) => j.status !== 'completed');
  await saveQueue(queue);
}

// ─── Storage stats ──────────────────────────────────────────────────

/** Estimated average size per manga page in bytes (JPEG data-saver quality) */
const ESTIMATED_PAGE_BYTES = 50_000; // ~50 KB

export type MangaStorageStat = {
  mangaId: string;
  mangaTitle: string;
  chapterCount: number;
  totalPages: number;
  /** Estimated storage in bytes (actual on native, estimated on web) */
  storageBytes: number;
  /** Human-readable storage string (e.g. "12.3 MB") */
  storageLabel: string;
};

export async function getStorageStats(): Promise<{
  totalBytes: number;
  totalLabel: string;
  byManga: MangaStorageStat[];
}> {
  const chapters = await getDownloadedChaptersRaw();

  // Group by manga
  const byManga = new Map<string, MangaStorageStat>();

  for (const ch of chapters) {
    let stat = byManga.get(ch.mangaId);
    if (!stat) {
      stat = {
        mangaId: ch.mangaId,
        mangaTitle: ch.mangaTitle,
        chapterCount: 0,
        totalPages: 0,
        storageBytes: 0,
        storageLabel: '',
      };
      byManga.set(ch.mangaId, stat);
    }
    stat.chapterCount += 1;
    stat.totalPages += ch.totalPages;

    // Try to get actual file sizes from local filesystem
    let chapterBytes = 0;
    try {
      const { getFileSizeAsync, listDirAsync } = await import('./nativeFS');
      const files = await listDirAsync(ch.localDir);
      for (const f of files) {
        if (/^page_\d+\.(jpg|png|webp)$/i.test(f)) {
          chapterBytes += await getFileSizeAsync(`${ch.localDir}${f}`);
        }
      }
    } catch {
      // Fallback to estimate
    }
    if (chapterBytes === 0) {
      chapterBytes = ch.totalPages * ESTIMATED_PAGE_BYTES;
    }
    stat.storageBytes += chapterBytes;
  }

  // Calculate totals and format labels
  let totalBytes = 0;
  const results: MangaStorageStat[] = [];

  for (const stat of byManga.values()) {
    totalBytes += stat.storageBytes;
    stat.storageLabel = formatBytes(stat.storageBytes);
    results.push(stat);
  }

  // Sort by storage (largest first)
  results.sort((a, b) => b.storageBytes - a.storageBytes);

  return {
    totalBytes,
    totalLabel: formatBytes(totalBytes),
    byManga: results,
  };
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  let unitIdx = 0;
  let size = bytes;
  while (size >= 1024 && unitIdx < units.length - 1) {
    size /= 1024;
    unitIdx++;
  }
  return `${size.toFixed(unitIdx === 0 ? 0 : 1)} ${units[unitIdx]}`;
}