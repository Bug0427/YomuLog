/**
 * readingStatsService.ts — Premium Reading Statistics Engine
 */
import { getAllChapterProgress, ChapterProgress } from './readingProgress';

export type ReadingStats = {
  totalChaptersRead: number; totalChaptersStarted: number;
  totalSeriesRead: number; totalSeriesCompleted: number;
  completionRate: number; estimatedReadingMinutes: number;
  readingStreakDays: number; averageScrollDepth: number;
  favoriteReadingDay: number;
  recentActivity: ChapterProgress[];
  weeklyActivity: { day: string; count: number }[];
};

const DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const MIN_PER_CH = 3;

export async function computeReadingStats(): Promise<ReadingStats> {
  const all = await getAllChapterProgress();
  const read = all.filter((c) => c.isRead);
  const totalChaptersRead = read.length;
  const totalChaptersStarted = all.length;
  const totalSeriesRead = new Set(all.map((c) => c.mangaId)).size;

  const sm = new Map<string, ChapterProgress[]>();
  for (const ch of all) { const a = sm.get(ch.mangaId) ?? []; a.push(ch); sm.set(ch.mangaId, a); }
  let completed = 0;
  for (const [, chs] of sm) { if (chs.length > 0 && chs.every((c) => c.isRead)) completed++; }

  const rate = totalChaptersStarted > 0 ? Math.round((totalChaptersRead / totalChaptersStarted) * 100) : 0;
  const mins = totalChaptersRead * MIN_PER_CH;
  const avgDepth = all.length > 0 ? Math.round(all.reduce((s, c) => s + c.scrollPercentage, 0) / all.length) : 0;

  const sorted = [...all].sort((a, b) => new Date(b.lastReadAt).getTime() - new Date(a.lastReadAt).getTime());
  const days = [...new Set(sorted.map((c) => c.lastReadAt.slice(0, 10)))].sort().reverse();
  let streak = 0; let check = new Date().toISOString().slice(0, 10);
  for (const d of days) { if (d === check || d === prevDay(check)) { streak++; check = d; } else if (d < check) break; }

  const dc = [0,0,0,0,0,0,0];
  for (const c of all) dc[new Date(c.lastReadAt).getDay()]++;
  const favDay = dc.indexOf(Math.max(...dc));

  const recent = sorted.slice(0, 10);
  const weekly = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    weekly.push({ day: DAYS[d.getDay()], count: all.filter((c) => c.lastReadAt.slice(0, 10) === d.toISOString().slice(0, 10)).length });
  }
  return { totalChaptersRead, totalChaptersStarted, totalSeriesRead, totalSeriesCompleted: completed, completionRate: rate, estimatedReadingMinutes: mins, readingStreakDays: streak, averageScrollDepth: avgDepth, favoriteReadingDay: favDay, recentActivity: recent, weeklyActivity: weekly };
}

function prevDay(s: string): string { const d = new Date(s); d.setDate(d.getDate() - 1); return d.toISOString().slice(0, 10); }

export function fmtTime(m: number): string { if (m < 60) return `${m} min`; const h = Math.floor(m / 60); const r = m % 60; return r > 0 ? `${h}h ${r}m` : `${h}h`; }

export function fmtLastRead(s: string): string {
  const d = new Date(s); const diff = Math.floor((Date.now() - d.getTime()) / 86400000);
  if (diff === 0) return 'Today'; if (diff === 1) return 'Yesterday'; if (diff < 7) return `${diff}d ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}