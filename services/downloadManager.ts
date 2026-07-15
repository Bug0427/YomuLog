// services/downloadManager.ts
// Queue-based offline chapter download manager with background recovery.
// Supports concurrency pool (2-3 pages), interrupted download recovery,
// and API aliases for a clean external interface.

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  documentDirectory,
  makeDirectoryAsync,
  downloadAsync,
  getInfoAsync,
  deleteAsync,
} from 'expo-file-system/legacy';
import { getChapterPages, buildPageUrlsFromChapterData } from './mangaAPI';

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
const DOWNLOAD_BASE_DIR = `${documentDirectory}yomulog/downloads/`;
/** Maximum concurrent page downloads */
const CONCURRENCY_LIMIT = 3;

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

  // Remove from downloaded index
  let downloaded = await getDownloadedChaptersRaw();
  downloaded = downloaded.filter((c) => c.chapterId !== chapterId);
  await setJson(DOWNLOADED_CHAPTERS_KEY, downloaded);

  // Clean up local files
  const chapter = downloaded.find((c) => c.chapterId === chapterId);
  if (chapter?.localDir) {
    await deleteAsync(chapter.localDir, { idempotent: true }).catch(() => {});
  }
}

// ─── Download execution ────────────────────────────────────────────

/** Download a single page and return whether it succeeded. */
async function downloadPage(url: string, dest: string): Promise<boolean> {
  try {
    const result = await downloadAsync(url, dest);
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
    const localDir = `${DOWNLOAD_BASE_DIR}${job.mangaId}/${job.chapterId}/`;
    await makeDirectoryAsync(localDir, { intermediates: true });

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

    return true;
  } catch (err: any) {
    job.status = 'failed';
    job.errorMessage = err?.message ?? 'Unknown error';
    job.localDir = `${DOWNLOAD_BASE_DIR}${job.mangaId}/${job.chapterId}/`;
    await saveQueue(queue);
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

    const localDir = job.localDir || `${DOWNLOAD_BASE_DIR}${job.mangaId}/${job.chapterId}/`;

    // Scan for existing pages
    let highestCompletedPage = 0;
    try {
      for (let i = 1; i <= 999; i++) {
        let found = false;
        for (const ext of ['jpg', 'png', 'webp']) {
          const uri = `${localDir}page_${String(i).padStart(3, '0')}.${ext}`;
          const info = await getInfoAsync(uri);
          if (info.exists) {
            found = true;
            break;
          }
        }
        if (found) {
          highestCompletedPage = i;
        } else {
          break;
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

/** Get local file URIs for a downloaded chapter's pages. */
export async function getLocalPageUris(chapterId: string): Promise<string[] | null> {
  const list = await getDownloadedChaptersRaw();
  const chapter = list.find((c) => c.chapterId === chapterId);
  if (!chapter) return null;

  const uris: string[] = [];
  for (let i = 1; i <= chapter.totalPages; i++) {
    let found = false;
    for (const ext of ['jpg', 'png', 'webp']) {
      if (found) break;
      const uri = `${chapter.localDir}page_${String(i).padStart(3, '0')}.${ext}`;
      const info = await getInfoAsync(uri);
      if (info.exists) {
        uris.push(uri);
        found = true;
      }
    }
  }
  return uris.length > 0 ? uris : null;
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
  await AsyncStorage.removeMany([DOWNLOAD_QUEUE_KEY, DOWNLOADED_CHAPTERS_KEY]);
  await deleteAsync(DOWNLOAD_BASE_DIR, { idempotent: true });
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