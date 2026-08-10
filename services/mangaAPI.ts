// services/mangaAPI.ts — MangaDex API Integration with tag caching

/** Structured API error for UI error state propagation */
export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
    public readonly endpoint?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export type Manga = {
  id: string; title: string; altTitles?: string[]; author?: string; artist?: string;
  genres?: string[]; status?: 'ongoing' | 'completed' | 'hiatus' | 'cancelled';
  coverImageUrl: string; description?: string; year?: number;
  contentRating?: string; updatedAt?: string; isLiked?: boolean; lastReadChapter?: string;
};
export type MangaChapter = {
  id: string; mangaId: string; chapter: string; title?: string;
  volume?: string; pages: number; updatedAt?: string; language: string; readStatus?: 'read' | 'unread';
  scanlationGroup?: string; // scanlation group name for source identification
};
export type MangaTag = { id: string; name: string; group: string; };

export type SimilarManga = {
  id: string;
  title: string;
  coverImageUrl: string;
};

const BASE_URL = 'https://api.mangadex.org';
const COVER_BASE = 'https://uploads.mangadex.org/covers';
let tagCache: MangaTag[] | null = null;

function extractTitle(attrs: any): string {
  const title = attrs?.title;
  if (!title) return 'Untitled';
  return title.en || Object.values(title)[0] as string || 'Untitled';
}

export async function fetchTags(force?: boolean): Promise<MangaTag[]> {
  if (tagCache && !force) return tagCache;
  try {
    const res = await fetch(`${BASE_URL}/manga/tag`);
    const json = await res.json();
    tagCache = (json?.data ?? []).map((t: any) => ({ id: t.id, name: t.attributes?.name?.en ?? 'Unknown', group: t.attributes?.group ?? 'genre' }));
    return tagCache as MangaTag[];
  } catch (err) { console.warn('Failed to fetch MangaDex tags:', err); return []; }
}

export function getCachedTags(): MangaTag[] { return tagCache ?? []; }

export type MangaListParams = { limit?: number; offset?: number; title?: string; includedTags?: string[]; excludedTags?: string[]; status?: string | string[]; contentRating?: string[]; order?: Record<string, string>; };

export async function fetchMangaList(params: MangaListParams = {}): Promise<Manga[]> {
  const query = new URLSearchParams();
  query.set('limit', String(params.limit ?? 20));
  query.set('offset', String(params.offset ?? 0));
  query.set('includes[]', 'cover_art');
  if (params.title) query.set('title', params.title);
  if (params.status) {
    const statuses = Array.isArray(params.status) ? params.status : [params.status];
    statuses.forEach((s) => query.append('status[]', s));
  }
  if (params.includedTags?.length) { params.includedTags.forEach((id) => query.append('includedTags[]', id)); query.set('includedTagsMode', 'AND'); }
  if (params.excludedTags?.length) { params.excludedTags.forEach((id) => query.append('excludedTags[]', id)); }
  if (params.contentRating?.length) { params.contentRating.forEach((r) => query.append('contentRating[]', r)); }
  else { query.append('contentRating[]', 'safe'); query.append('contentRating[]', 'suggestive'); query.append('contentRating[]', 'erotica'); }
  if (params.order) { Object.entries(params.order).forEach(([k, v]) => query.set(`order[${k}]`, v)); }
  try {
    const res = await fetch(`${BASE_URL}/manga?${query.toString()}`);
    const json = await res.json();
    const rawItems: any[] = json?.data ?? [];
    // Deduplicate by manga ID — keep the entry with the most complete data
    const dedupMap = new Map<string, Manga>();
    for (const item of rawItems) {
      const id = item.id; const attrs = item.attributes ?? {};
      const coverRel = (item.relationships ?? []).find((r: any) => r.type === 'cover_art');
      const coverFileName = coverRel?.attributes?.fileName;
      const tags: string[] = (attrs.tags ?? []).map((t: any) => t.attributes?.name?.en ?? 'Unknown');
      const manga: Manga = {
        id, title: extractTitle(attrs),
        altTitles: attrs.altTitles?.map((t: any) => Object.values(t)[0] as string),
        status: attrs.status ?? undefined,
        coverImageUrl: coverFileName ? `${COVER_BASE}/${id}/${coverFileName}.256.jpg` : '',
        description: attrs.description?.en ?? undefined,
        year: attrs.year ?? undefined,
        contentRating: attrs.contentRating ?? undefined,
        updatedAt: attrs.updatedAt ?? undefined,
        genres: tags,
      };
      const existing = dedupMap.get(id);
      if (!existing || (manga.description ? 1 : 0) + (manga.genres?.length ?? 0) > (existing.description ? 1 : 0) + (existing.genres?.length ?? 0)) {
        dedupMap.set(id, manga);
      }
    }
    return Array.from(dedupMap.values());
  } catch (err) {
    console.warn('Failed to fetch manga list:', err);
    throw new ApiError('Failed to fetch manga list', undefined, '/manga');
  }
}

export async function fetchMangaById(id: string): Promise<Manga | null> {
  try {
    const res = await fetch(`${BASE_URL}/manga/${id}?includes[]=cover_art&includes[]=author&includes[]=artist`);
    const json = await res.json();
    if (!json?.data) return null;
    const d = json.data;
    const a = d.attributes ?? {};
    const rels = d.relationships ?? [];

    const coverRel = rels.find((r: any) => r.type === 'cover_art');
    const authorRel = rels.find((r: any) => r.type === 'author');
    const artistRel = rels.find((r: any) => r.type === 'artist');
    const tags: string[] = (a.tags ?? []).map((t: any) => t.attributes?.name?.en ?? 'Unknown');

    // Extract alt titles
    const altTitles: string[] = [];
    if (Array.isArray(a.altTitles)) {
      for (const t of a.altTitles) {
        const val = Object.values(t)[0];
        if (val && typeof val === 'string') altTitles.push(val);
      }
    }

    return {
      id: d.id,
      title: extractTitle(a),
      altTitles: altTitles.length > 0 ? altTitles : undefined,
      author: authorRel?.attributes?.name ?? undefined,
      artist: artistRel?.attributes?.name ?? undefined,
      coverImageUrl: coverRel?.attributes?.fileName
        ? `${COVER_BASE}/${d.id}/${coverRel.attributes.fileName}.256.jpg`
        : '',
      genres: tags,
      status: a.status,
      description: a.description?.en,
      year: a.year,
      contentRating: a.contentRating,
      updatedAt: a.updatedAt,
    };
  } catch (err) {
    console.warn(`Failed to fetch manga ${id}:`, err);
    throw new ApiError(`Failed to fetch manga ${id}`, undefined, `/manga/${id}`);
  }
}

export async function fetchChapters(mangaId: string, limit = 100, offset = 0): Promise<MangaChapter[]> {
  const query = new URLSearchParams(); query.set('manga', mangaId); query.set('limit', String(limit)); query.set('offset', String(offset)); query.set('translatedLanguage[]', 'en'); query.set('order[chapter]', 'desc');
  try { const res = await fetch(`${BASE_URL}/chapter?${query.toString()}`); const json = await res.json(); return (json?.data ?? []).map((item: any) => ({ id: item.id, mangaId, chapter: item.attributes?.chapter ?? '0', title: item.attributes?.title, volume: item.attributes?.volume, pages: item.attributes?.pages ?? 0, updatedAt: item.attributes?.updatedAt, language: item.attributes?.translatedLanguage ?? 'en', })); }
  catch (err) { console.warn(`Failed to fetch chapters for ${mangaId}:`, err); throw new ApiError(`Failed to fetch chapters for ${mangaId}`, undefined, '/chapter'); }
}

export async function searchManga(title: string, limit = 20): Promise<Manga[]> {
  return fetchMangaList({ title, limit });
}

export type MangaResult<T> = {
  data: T[];
  total: number;
  limit: number;
  offset: number;
  /** True when the result fell back from English-only to all languages because no English chapters exist */
  languageFallback?: boolean;
};

/** Internal helper: fetch manga feed with an optional language filter */
async function _fetchFeed(
  mangaId: string,
  limit: number,
  offset: number,
  language?: string,
): Promise<{ data: MangaChapter[]; total: number }> {
  const query = new URLSearchParams();
  query.set('limit', String(Math.min(limit, 100)));
  query.set('offset', String(offset));
  if (language) query.set('translatedLanguage[]', language);
  query.set('order[chapter]', 'desc');
  query.set('contentRating[]', 'safe');
  query.set('contentRating[]', 'suggestive');
  query.set('contentRating[]', 'erotica');
  query.set('contentRating[]', 'pornographic');
  query.set('includes[]', 'scanlation_group');
  const res = await fetch(`${BASE_URL}/manga/${mangaId}/feed?${query.toString()}`);
  if (!res.ok) {
    console.warn(`getMangaFeed HTTP ${res.status} for manga ${mangaId}`);
    return { data: [], total: 0 };
  }
  const json = await res.json();
  if (json.result !== 'ok') {
    console.warn(`getMangaFeed API error for manga ${mangaId}:`, json.errors);
    return { data: [], total: 0 };
  }
  const data: MangaChapter[] = (json?.data ?? []).map((item: any) => {
    const scanRel = (item.relationships ?? []).find((r: any) => r.type === 'scanlation_group');
    return {
      id: item.id, mangaId,
      chapter: item.attributes?.chapter ?? '0',
      title: item.attributes?.title,
      volume: item.attributes?.volume,
      pages: item.attributes?.pages ?? 0,
      updatedAt: item.attributes?.updatedAt,
      language: item.attributes?.translatedLanguage ?? 'en',
      scanlationGroup: scanRel?.attributes?.name ?? undefined,
    };
  });
  return { data, total: json?.total ?? data.length };
}

export async function getMangaFeed(
  mangaId: string,
  limit = 100,
  offset = 0,
): Promise<MangaResult<MangaChapter>> {
  try {
    // Try English first (most users prefer English)
    const enResult = await _fetchFeed(mangaId, limit, offset, 'en');

    // If English returned chapters, use that
    if (enResult.data.length > 0) {
      return { data: enResult.data, total: enResult.total, limit, offset };
    }

    // Fallback: retry without language filter to get chapters in any language
    const allResult = await _fetchFeed(mangaId, limit, offset);
    return {
      data: allResult.data,
      total: allResult.total,
      limit,
      offset,
      languageFallback: allResult.data.length > 0,
    };
  } catch (err) {
    console.warn(`getMangaFeed network error for manga ${mangaId}:`, err);
    throw new ApiError(`Failed to fetch feed for manga ${mangaId}`, undefined, `/manga/${mangaId}/feed`);
  }
}

// ─── Similar manga / recommendations ──────────────────────────────

export async function fetchSimilarManga(mangaId: string, limit = 10): Promise<SimilarManga[]> {
  try {
    // Use the MangaDex relation endpoint for "related" manga
    const tagIds = await fetchTags();
    // Fallback: fetch manga with overlapping genres
    const manga = await fetchMangaById(mangaId);
    if (!manga?.genres || manga.genres.length === 0) return [];

    const includedTags = tagIds
      .filter((t) => manga.genres!.includes(t.name))
      .map((t) => t.id)
      .slice(0, 3);

    if (includedTags.length === 0) return [];

    const results = await fetchMangaList({
      includedTags,
      limit,
      order: { followedCount: 'desc' },
    });

    return results
      .filter((m) => m.id !== mangaId)
      .slice(0, limit)
      .map((m) => ({ id: m.id, title: m.title, coverImageUrl: m.coverImageUrl }));
  } catch {
    throw new ApiError(`Failed to fetch similar manga for ${mangaId}`, undefined, '/manga');
  }
}

// ─── Chapter page fetching (for offline download manager) ──────────

export async function getChapterPages(
  chapterId: string, signal?: AbortSignal,
): Promise<{ baseUrl: string; chapterHash: string; pages: string[]; dataSaverPages: string[] } | null> {
  try {
    const res = await fetch(`${BASE_URL}/at-home/server/${chapterId}`, { signal });
    const json = await res.json();
    if (json.result !== 'ok') return null;
    return { baseUrl: json.baseUrl, chapterHash: json.chapter.hash, pages: json.chapter.data, dataSaverPages: json.chapter.dataSaver };
  } catch { throw new ApiError(`Failed to fetch pages for chapter ${chapterId}`, undefined, `/at-home/server/${chapterId}`); }
}

export function buildChapterImageUrls(
  baseUrl: string, hash: string, pages: string[], quality: 'data' | 'data-saver' = 'data',
): string[] {
  const suffix = quality === 'data-saver' ? 'data-saver' : 'data';
  return pages.map((p) => `${baseUrl}/${suffix}/${hash}/${p}`);
}

export function buildPageUrlsFromChapterData(
  cd: NonNullable<Awaited<ReturnType<typeof getChapterPages>>>,
  quality: 'data' | 'data-saver' = 'data',
): string[] {
  const pages = quality === 'data-saver' ? cd.dataSaverPages : cd.pages;
  return buildChapterImageUrls(cd.baseUrl, cd.chapterHash, pages, quality);
}
