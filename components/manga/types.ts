// components/manga/types.ts
// Shared types for MangaInfoScreen child components (H-5 decomposition).
import type { MangaChapter } from '../../services/mangaAPI';
import type { DownloadStatus } from '../../services/downloadManager';

export type ChapterWithDownload = MangaChapter & {
  isDownloaded: boolean;
  downloadStatus: DownloadStatus | null;
};

/** A grouped set: primary chapter + alternate sources */
export type ChapterGroup = {
  chapterNum: string;
  primary: ChapterWithDownload;
  alternates: ChapterWithDownload[];
};