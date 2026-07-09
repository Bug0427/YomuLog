// hooks/useReadingProgress.ts
// Convenience hook for consuming reading progress data in components.

import { useState, useEffect, useCallback } from 'react';
import {
  ChapterProgress,
  RecentlyReadEntry,
  getAllChapterProgress,
  getRecentlyRead,
  updateChapterProgress,
  markChapterRead,
  clearAllProgress,
} from '../services/readingProgress';

export function useReadingProgress() {
  const [recentlyRead, setRecentlyRead] = useState<RecentlyReadEntry[]>([]);
  const [allProgress, setAllProgress] = useState<ChapterProgress[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const [rr, ap] = await Promise.all([
      getRecentlyRead(),
      getAllChapterProgress(),
    ]);
    setRecentlyRead(rr);
    setAllProgress(ap);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const saveProgress = useCallback(
    async (
      progress: Parameters<typeof updateChapterProgress>[0],
    ) => {
      await updateChapterProgress(progress);
      await refresh();
    },
    [refresh],
  );

  const markRead = useCallback(
    async (
      mangaId: string,
      chapterId: string,
      mangaTitle: string,
      mangaImage?: string,
      chapterTitle?: string,
      chapterNumber?: number,
    ) => {
      await markChapterRead(mangaId, chapterId, mangaTitle, mangaImage, chapterTitle, chapterNumber);
      await refresh();
    },
    [refresh],
  );

  const clearAll = useCallback(async () => {
    await clearAllProgress();
    await refresh();
  }, [refresh]);

  return {
    recentlyRead,
    allProgress,
    loading,
    refresh,
    saveProgress,
    markRead,
    clearAll,
  };
}