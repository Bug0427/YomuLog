// services/mangaAPI.ts — MangaDex API Integration with tag caching
export type Manga = {
  id: string; title: string; altTitles?: string[]; author?: string; artist?: string;
  genres?: string[]; status?: 'ongoing' | 'completed' | 'hiatus' | 'cancelled';
  coverImageUrl: string; description?: string; year?: number;
  contentRating?: string; updatedAt?: string; isLiked?: boolean; lastReadChapter?: string;
};
export type MangaChapter = {
  id: string; mangaId: string; chapter: string; title?: string;
  volume?: string; pages: number; updatedAt?: string; language: string; readStatus?: 'read' | 'unread';
};
export type MangaTag = { id: string; name: string; group: string; };

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

export type MangaListParams = { limit?: number; offset?: number; title?: string; includedTags?: string[]; excludedTags?: string[]; status?: string; contentRating?: string[]; order?: Record<string, string>; };

export async function fetchMangaList(params: MangaListParams = {}): Promise<Manga[]> {
  const query = new URLSearchParams();
  query.set('limit', String(params.limit ?? 20));
  query.set('offset', String(params.offset ?? 0));
  query.set('includes[]', 'cover_art');
  if (params.title) query.set('title', params.title);
  if (params.status) query.set('status', params.status);
  if (params.includedTags?.length) { params.includedTags.forEach((id) => query.append('includedTags[]', id)); query.set('includedTagsMode', 'AND'); }
  if (params.excludedTags?.length) { params.excludedTags.forEach((id) => query.append('excludedTags[]', id)); }
  if (params.contentRating?.length) { params.contentRating.forEach((r) => query.append('contentRating[]', r)); }
  else { query.append('contentRating[]', 'safe'); query.append('contentRating[]', 'suggestive'); query.append('contentRating[]', 'erotica'); }
  if (params.order) { Object.entries(params.order).forEach(([k, v]) => query.set(`order[${k}]`, v)); }
  try {
    const res = await fetch(`${BASE_URL}/manga?${query.toString()}`);
    const json = await res.json();
    return (json?.data ?? []).map((item: any) => {
      const id = item.id; const attrs = item.attributes ?? {};
      const coverRel = (item.relationships ?? []).find((r: any) => r.type === 'cover_art');
      const coverFileName = coverRel?.attributes?.fileName;
      const tags: string[] = (attrs.tags ?? []).map((t: any) => t.attributes?.name?.en ?? 'Unknown');
      return { id, title: extractTitle(attrs), altTitles: attrs.altTitles?.map((t: any) => Object.values(t)[0] as string), status: attrs.status ?? undefined, coverImageUrl: coverFileName ? `${COVER_BASE}/${id}/${coverFileName}.256.jpg` : '', description: attrs.description?.en ?? undefined, year: attrs.year ?? undefined, contentRating: attrs.contentRating ?? undefined, updatedAt: attrs.updatedAt ?? undefined, genres: tags, };
    });
  } catch (err) { console.warn('Failed to fetch manga list:', err); return []; }
}

export async function fetchMangaById(id: string): Promise<Manga | null> {
  try { const res = await fetch(`${BASE_URL}/manga/${id}?includes[]=cover_art`); const json = await res.json(); if (!json?.data) return null; const d = json.data; const a = d.attributes ?? {}; const coverRel = (d.relationships ?? []).find((r: any) => r.type === 'cover_art'); const tags: string[] = (a.tags ?? []).map((t: any) => t.attributes?.name?.en ?? 'Unknown'); return { id: d.id, title: extractTitle(a), coverImageUrl: coverRel?.attributes?.fileName ? `${COVER_BASE}/${d.id}/${coverRel.attributes.fileName}.256.jpg` : '', genres: tags, status: a.status, description: a.description?.en, year: a.year, contentRating: a.contentRating, updatedAt: a.updatedAt, }; }
  catch (err) { console.warn(`Failed to fetch manga ${id}:`, err); return null; }
}

export async function fetchChapters(mangaId: string, limit = 100, offset = 0): Promise<MangaChapter[]> {
  const query = new URLSearchParams(); query.set('manga', mangaId); query.set('limit', String(limit)); query.set('offset', String(offset)); query.set('translatedLanguage[]', 'en'); query.set('order[chapter]', 'desc');
  try { const res = await fetch(`${BASE_URL}/chapter?${query.toString()}`); const json = await res.json(); return (json?.data ?? []).map((item: any) => ({ id: item.id, mangaId, chapter: item.attributes?.chapter ?? '0', title: item.attributes?.title, volume: item.attributes?.volume, pages: item.attributes?.pages ?? 0, updatedAt: item.attributes?.updatedAt, language: item.attributes?.translatedLanguage ?? 'en', })); }
  catch (err) { console.warn(`Failed to fetch chapters for ${mangaId}:`, err); return []; }
}

export async function searchManga(title: string, limit = 20): Promise<Manga[]> {
  return fetchMangaList({ title, limit });
}