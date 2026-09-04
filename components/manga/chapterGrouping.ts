// components/manga/chapterGrouping.ts
// Pure duplicate-chapter grouping logic used by MangaInfoScreen.
// Primary selection scoring: title > scanlation group > pages.
import type { ChapterWithDownload, ChapterGroup } from './types';

/** Score a chapter for primary selection: title > scanlation group > pages */
export function scoreChapter(ch: ChapterWithDownload): number {
  let s = 0;
  if (ch.title && ch.title.trim().length > 0) s += 15;
  if (ch.scanlationGroup && ch.scanlationGroup.trim().length > 0) s += 5;
  s += Math.min(ch.pages, 50) * 0.1; // cap at +5
  // Prefer English scanlations
  if (ch.language === 'en') s += 2;
  return s;
}

/** Group chapters by chapter number, selecting the highest-scored as primary */
export function groupChapters(chapters: ChapterWithDownload[]): ChapterGroup[] {
  const map = new Map<string, ChapterWithDownload[]>();
  for (const ch of chapters) {
    const num = ch.chapter;
    if (!map.has(num)) map.set(num, []);
    map.get(num)!.push(ch);
  }

  const groups: ChapterGroup[] = [];
  for (const [, chs] of map) {
    // Sort by score descending
    chs.sort((a, b) => scoreChapter(b) - scoreChapter(a));
    groups.push({
      chapterNum: chs[0].chapter,
      primary: chs[0],
      alternates: chs.slice(1),
    });
  }
  // Sort groups by chapter number descending (newest first)
  groups.sort((a, b) => {
    const na = parseFloat(a.chapterNum) || 0;
    const nb = parseFloat(b.chapterNum) || 0;
    return nb - na;
  });
  return groups;
}