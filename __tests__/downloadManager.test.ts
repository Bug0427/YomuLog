// __tests__/downloadManager.test.ts
// Unit tests for downloadManager — queue state transitions, dedup, recovery.

import AsyncStorage from '@react-native-async-storage/async-storage';

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  removeMany: jest.fn(),
  multiRemove: jest.fn(),
}));

// Mock nativeFS
jest.mock('../services/nativeFS', () => ({
  getDownloadBaseDir: jest.fn(() => Promise.resolve('/mock/base/')),
  makeDirAsync: jest.fn(() => Promise.resolve()),
  downloadFileAsync: jest.fn(() => Promise.resolve({ status: 200 })),
  listDirAsync: jest.fn(() => Promise.resolve([])),
  deleteFileAsync: jest.fn(() => Promise.resolve()),
  getFileSizeAsync: jest.fn(() => Promise.resolve(50000)),
}));

// Mock mangaAPI
jest.mock('../services/mangaAPI', () => ({
  getChapterPages: jest.fn(() =>
    Promise.resolve({
      pages: Array.from({ length: 5 }, (_, i) => ({ url: `https://example.com/page_${i + 1}.jpg` })),
    }),
  ),
  buildPageUrlsFromChapterData: jest.fn((data, _quality) =>
    data.pages.map((p: any) => p.url),
  ),
}));

// Mock platformUtils
jest.mock('../utils/platformUtils', () => ({
  isWeb: false,
}));

import {
  enqueueDownload,
  getDownloadQueue,
  getChapterDownloadStatus,
  processNextDownload,
  processAllDownloads,
  resumeInterruptedDownloads,
  retryFailedDownloads,
  getDownloadedChapters,
  isChapterDownloaded,
  getDownloadStats,
  clearCompleted,
  removeJob,
  clearAllDownloads,
  downloadChapter,
  deleteDownloadedChapter,
} from '../services/downloadManager';

import { getChapterPages } from '../services/mangaAPI';
import { downloadFileAsync } from '../services/nativeFS';

const mockGetItem = AsyncStorage.getItem as jest.MockedFunction<typeof AsyncStorage.getItem>;
const mockSetItem = AsyncStorage.setItem as jest.MockedFunction<typeof AsyncStorage.setItem>;

function mockStorageValue(value: unknown) {
  mockGetItem.mockResolvedValue(JSON.stringify(value));
}

function mockEmptyStorage() {
  mockGetItem.mockImplementation((key: string) => {
    if (typeof key === 'string' && key.startsWith('@YomuLog:')) {
      return Promise.resolve(null);
    }
    return Promise.resolve(null);
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  mockEmptyStorage();
});

// ─── Queue Management ────────────────────────────────────────────────

describe('enqueueDownload', () => {
  it('adds a new job to the queue', async () => {
    mockEmptyStorage();
    const job = await enqueueDownload('ch1', 'm1', 'Test Manga', '1', 'First Chapter');
    expect(job.chapterId).toBe('ch1');
    expect(job.status).toBe('pending');
    expect(job.progress).toBe(0);
    expect(job.retryCount).toBe(0);

    const saved = JSON.parse(mockSetItem.mock.calls[0][1] as string);
    expect(saved).toHaveLength(1);
  });

  it('prevents duplicate non-failed jobs', async () => {
    const existing = {
      jobId: 'dl_old',
      chapterId: 'ch1',
      mangaId: 'm1',
      mangaTitle: 'Test',
      chapterNumber: '1',
      status: 'pending' as const,
      progress: 0,
      totalPages: 0,
      downloadedPages: 0,
      createdAt: new Date().toISOString(),
      retryCount: 0,
    };
    mockStorageValue([existing]);

    const job = await enqueueDownload('ch1', 'm1', 'Test', '1');
    expect(job.jobId).toBe('dl_old'); // returns existing, doesn't add new
    // setItem should not be called for a new job
    const savesForQueue = mockSetItem.mock.calls.filter(
      c => (c[0] as string) === '@YomuLog:downloadQueue',
    );
    expect(savesForQueue.length).toBe(0);
  });

  it('resets a failed job for retry', async () => {
    const failed = {
      jobId: 'dl_fail',
      chapterId: 'ch1',
      mangaId: 'm1',
      mangaTitle: 'Test',
      chapterNumber: '1',
      status: 'failed' as const,
      progress: 50,
      totalPages: 10,
      downloadedPages: 5,
      errorMessage: 'network error',
      createdAt: new Date().toISOString(),
      retryCount: 2,
    };
    mockStorageValue([failed]);

    const job = await enqueueDownload('ch1', 'm1', 'Test', '1');
    expect(job.status).toBe('pending');
    expect(job.progress).toBe(0);
    expect(job.downloadedPages).toBe(0);
    expect(job.errorMessage).toBeUndefined();
    expect(job.retryCount).toBe(0);
  });

  it('generates unique jobIds', async () => {
    mockEmptyStorage();
    const job1 = await enqueueDownload('ch1', 'm1', 'T', '1');
    const job2 = await enqueueDownload('ch2', 'm2', 'T2', '2');
    expect(job1.jobId).not.toBe(job2.jobId);
  });
});

// ─── Status Queries ──────────────────────────────────────────────────

describe('getChapterDownloadStatus', () => {
  it('returns null for unknown chapter', async () => {
    mockEmptyStorage();
    const status = await getChapterDownloadStatus('unknown');
    expect(status).toBeNull();
  });

  it('returns status for known chapter', async () => {
    mockStorageValue([{
      jobId: 'j1', chapterId: 'ch1', mangaId: 'm1', mangaTitle: 'T',
      chapterNumber: '1', status: 'completed', progress: 100,
      totalPages: 5, downloadedPages: 5,
      createdAt: '', retryCount: 0,
    }]);
    const status = await getChapterDownloadStatus('ch1');
    expect(status).toBe('completed');
  });
});

// ─── Download Execution ──────────────────────────────────────────────

describe('processNextDownload', () => {
  it('processes a pending job through to completion', async () => {
    mockStorageValue([{
      jobId: 'j1', chapterId: 'ch1', mangaId: 'm1', mangaTitle: 'Test',
      chapterNumber: '1', status: 'pending', progress: 0,
      totalPages: 0, downloadedPages: 0,
      createdAt: '', retryCount: 0,
    }]);

    const result = await processNextDownload();
    expect(result).toBe(true);

    // Verify final state: completed
    const finalSave = JSON.parse(mockSetItem.mock.calls[mockSetItem.mock.calls.length - 1][1] as string);
    // The last call might be the downloaded chapters index, check the queue save
    const allSaves = mockSetItem.mock.calls.map(c => JSON.parse(c[1] as string));
    const queueSaves = mockSetItem.mock.calls
      .filter(c => c[0] === '@YomuLog:downloadQueue')
      .map(c => JSON.parse(c[1] as string));

    const lastQueueState = queueSaves[queueSaves.length - 1];
    expect(lastQueueState[0].status).toBe('completed');
    expect(lastQueueState[0].progress).toBe(100);
    expect(lastQueueState[0].downloadedPages).toBe(5);
  });

  it('marks job as failed when getChapterPages throws', async () => {
    (getChapterPages as jest.Mock).mockRejectedValueOnce(new Error('API down'));
    mockStorageValue([{
      jobId: 'j1', chapterId: 'ch1', mangaId: 'm1', mangaTitle: 'Test',
      chapterNumber: '1', status: 'pending', progress: 0,
      totalPages: 0, downloadedPages: 0,
      createdAt: '', retryCount: 0,
    }]);

    const result = await processNextDownload();
    expect(result).toBe(false);

    const queueSaves = mockSetItem.mock.calls
      .filter(c => c[0] === '@YomuLog:downloadQueue')
      .map(c => JSON.parse(c[1] as string));
    const lastState = queueSaves[queueSaves.length - 1];
    expect(lastState[0].status).toBe('failed');
    expect(lastState[0].errorMessage).toContain('API down');
  });

  it('returns false when queue is empty', async () => {
    mockStorageValue([]);
    const result = await processNextDownload();
    expect(result).toBe(false);
  });

  it('skips jobs that have exceeded max retries', async () => {
    mockStorageValue([{
      jobId: 'j1', chapterId: 'ch1', mangaId: 'm1', mangaTitle: 'Test',
      chapterNumber: '1', status: 'failed', progress: 0,
      totalPages: 5, downloadedPages: 0,
      createdAt: '', retryCount: 3, // MAX_RETRIES = 3, so this is exhausted
    }]);
    const result = await processNextDownload();
    expect(result).toBe(false);
  });
});

// ─── Recovery ────────────────────────────────────────────────────────

describe('resumeInterruptedDownloads', () => {
  it('resets stuck downloading jobs to pending', async () => {
    const stuck = {
      jobId: 'j1', chapterId: 'ch1', mangaId: 'm1', mangaTitle: 'Test',
      chapterNumber: '1', status: 'downloading' as const, progress: 45,
      totalPages: 10, downloadedPages: 4,
      createdAt: new Date().toISOString(), retryCount: 1,
      localDir: '/mock/base/m1/ch1/',
    };
    mockStorageValue([stuck]);

    // listDirAsync returns files for pages 1-4 (highest consecutive)
    const { listDirAsync } = require('../services/nativeFS');
    (listDirAsync as jest.Mock).mockResolvedValue([
      'page_001.jpg', 'page_002.jpg', 'page_003.jpg', 'page_004.jpg',
    ]);

    const count = await resumeInterruptedDownloads();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  it('returns 0 when no interrupted jobs', async () => {
    mockStorageValue([{
      jobId: 'j1', chapterId: 'ch1', mangaId: 'm1', mangaTitle: 'Test',
      chapterNumber: '1', status: 'completed', progress: 100,
      totalPages: 5, downloadedPages: 5,
      createdAt: '', retryCount: 0,
    }]);
    const count = await resumeInterruptedDownloads();
    expect(count).toBe(0);
  });
});

describe('retryFailedDownloads', () => {
  it('resets failed jobs with retries remaining', async () => {
    mockStorageValue([{
      jobId: 'j1', chapterId: 'ch1', mangaId: 'm1', mangaTitle: 'Test',
      chapterNumber: '1', status: 'failed', progress: 50,
      totalPages: 10, downloadedPages: 5,
      createdAt: '', retryCount: 1, errorMessage: 'network error',
    }]);
    const count = await retryFailedDownloads();
    expect(count).toBe(1);
  });

  it('skips jobs that exceeded max retries', async () => {
    mockStorageValue([{
      jobId: 'j1', chapterId: 'ch1', mangaId: 'm1', mangaTitle: 'Test',
      chapterNumber: '1', status: 'failed', progress: 50,
      totalPages: 10, downloadedPages: 5,
      createdAt: '', retryCount: 3, errorMessage: 'exhausted',
    }]);
    const count = await retryFailedDownloads();
    expect(count).toBe(0);
  });
});

// ─── Downloaded Chapters ─────────────────────────────────────────────

describe('isChapterDownloaded', () => {
  it('returns true for downloaded chapters', async () => {
    mockGetItem.mockImplementation((key: string) => {
      if (key === '@YomuLog:downloadedChapters') {
        return Promise.resolve(JSON.stringify([{ chapterId: 'ch1', mangaId: 'm1', mangaTitle: 'T', chapterNumber: '1', totalPages: 5, localDir: '/mock/', downloadedAt: '' }]));
      }
      return Promise.resolve(null);
    });
    expect(await isChapterDownloaded('ch1')).toBe(true);
  });

  it('returns false for unknown chapters', async () => {
    mockEmptyStorage();
    expect(await isChapterDownloaded('unknown')).toBe(false);
  });
});

// ─── Stats ───────────────────────────────────────────────────────────

describe('getDownloadStats', () => {
  it('counts jobs by status', async () => {
    mockStorageValue([
      { jobId: 'j1', chapterId: 'c1', mangaId: 'm1', mangaTitle: 'T1', chapterNumber: '1', status: 'completed', progress: 100, totalPages: 5, downloadedPages: 5, createdAt: '', retryCount: 0 },
      { jobId: 'j2', chapterId: 'c2', mangaId: 'm2', mangaTitle: 'T2', chapterNumber: '1', status: 'failed', progress: 30, totalPages: 5, downloadedPages: 1, createdAt: '', retryCount: 2, errorMessage: 'err' },
      { jobId: 'j3', chapterId: 'c3', mangaId: 'm3', mangaTitle: 'T3', chapterNumber: '1', status: 'pending', progress: 0, totalPages: 0, downloadedPages: 0, createdAt: '', retryCount: 0 },
      { jobId: 'j4', chapterId: 'c4', mangaId: 'm4', mangaTitle: 'T4', chapterNumber: '1', status: 'downloading', progress: 50, totalPages: 10, downloadedPages: 5, createdAt: '', retryCount: 1 },
    ]);
    const stats = await getDownloadStats();
    expect(stats.total).toBe(4);
    expect(stats.completed).toBe(1);
    expect(stats.failed).toBe(1);
    expect(stats.pending).toBe(1);
    expect(stats.downloading).toBe(1);
  });
});

// ─── Queue Maintenance ───────────────────────────────────────────────

describe('clearCompleted', () => {
  it('removes only completed jobs', async () => {
    mockStorageValue([
      { jobId: 'j1', chapterId: 'c1', mangaId: 'm1', mangaTitle: 'T1', chapterNumber: '1', status: 'completed', progress: 100, totalPages: 5, downloadedPages: 5, createdAt: '', retryCount: 0 },
      { jobId: 'j2', chapterId: 'c2', mangaId: 'm2', mangaTitle: 'T2', chapterNumber: '1', status: 'pending', progress: 0, totalPages: 0, downloadedPages: 0, createdAt: '', retryCount: 0 },
    ]);
    await clearCompleted();
    const saved = JSON.parse(mockSetItem.mock.calls[0][1] as string);
    expect(saved).toHaveLength(1);
    expect(saved[0].jobId).toBe('j2');
  });
});

describe('removeJob', () => {
  it('removes a specific job by jobId', async () => {
    mockStorageValue([
      { jobId: 'j1', chapterId: 'c1', mangaId: 'm1', mangaTitle: 'T1', chapterNumber: '1', status: 'pending', progress: 0, totalPages: 0, downloadedPages: 0, createdAt: '', retryCount: 0 },
      { jobId: 'j2', chapterId: 'c2', mangaId: 'm2', mangaTitle: 'T2', chapterNumber: '1', status: 'pending', progress: 0, totalPages: 0, downloadedPages: 0, createdAt: '', retryCount: 0 },
    ]);
    await removeJob('j1');
    const saved = JSON.parse(mockSetItem.mock.calls[0][1] as string);
    expect(saved).toHaveLength(1);
    expect(saved[0].jobId).toBe('j2');
  });
});

// ─── API Aliases ─────────────────────────────────────────────────────

describe('downloadChapter (alias)', () => {
  it('delegates to enqueueDownload', async () => {
    mockEmptyStorage();
    const job = await downloadChapter('ch1', 'm1', 'Test', '1');
    expect(job.chapterId).toBe('ch1');
    expect(job.status).toBe('pending');
  });
});
