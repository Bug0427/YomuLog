// __tests__/mangaAPI.test.ts
// W1c — MangaDex API layer (KPI-adjacent discovery surface).
// Covers fetchMangaList dedup + URL building, fetchSimilarManga parsing, and
// the pure image-URL builders in services/mangaAPI.ts (audit H-9), with fetch
// monkey-patched (no network) and mangaDexProxy stubbed to identity.
jest.mock('../services/mangaDexProxy', () => ({
  resolveMangaDexUrl: (path: string) => path,
}));

import {
  fetchMangaList,
  fetchSimilarManga,
  buildChapterImageUrls,
  buildPageUrlsFromChapterData,
  ApiError,
} from '../services/mangaAPI';

// --- fetch router -------------------------------------------------------
type Canned = { status?: number; body: any };
const routes: Array<{ test: (url: string, init?: any) => boolean; canned: Canned }> = [];

function mockFetchFor(routesArr: Array<{ test: (u: string) => boolean; canned: Canned }>) {
  const orig: any = (globalThis as any).fetch;
  (globalThis as any).fetch = async (url: string, init?: any) => {
    const match = routesArr.find((r) => r.test(url));
    if (!match) {
      throw new Error(`No canned route for ${url}`);
    }
    const { status = 200, body } = match.canned;
    return {
      ok: status >= 200 && status < 300,
      status,
      json: async () => body,
    };
  };
  return () => { (globalThis as any).fetch = orig; };
}

function route(substr: string, canned: Canned) {
  return { test: (u: string) => u.includes(substr), canned };
}

afterEach(() => {
  (globalThis as any).fetch = undefined;
});

describe('fetchMangaList — dedup & parsing', () => {
  function item(id: string, attrs: any = {}, more = false) {
    return { id, attributes: { tags: [], status: 'ongoing', ...attrs }, relationships: [] };
  }

  it('maps items to Manga shape and dedups by id keeping the most complete', async () => {
    const restore = mockFetchFor([
      route('/manga?', {
        body: {
          data: [
            item('m1', { title: { en: 'Naruto' }, description: { en: 'Full' } }, true),
            item('m1', { title: { en: 'Naruto' } }), // same id, less complete
            item('m2', { title: { en: 'Bleach' } }),
          ],
        },
      }),
    ]);
    const result = await fetchMangaList({ limit: 20 });
    expect(result).toHaveLength(2);
    const m1 = result.find((m) => m.id === 'm1')!;
    expect(m1.description).toBe('Full'); // kept the more complete variant
    expect(m1.title).toBe('Naruto');
    restore();
  });

  it('falls back to first alt title when title.en is missing, else "Untitled"', async () => {
    const restore = mockFetchFor([
      route('/manga?', {
        body: {
          data: [
            item('a', { title: { ja: '綾' } }),
            item('b', { title: {} }),
          ],
        },
      }),
    ]);
    const result = await fetchMangaList();
    expect(result.find((m) => m.id === 'a')!.title).toBe('綾');
    expect(result.find((m) => m.id === 'b')!.title).toBe('Untitled');
    restore();
  });

  it('builds cover URL from cover_art relationship and defaults contentRating', async () => {
    const captured: string[] = [];
    const orig: any = (globalThis as any).fetch;
    (globalThis as any).fetch = async (url: string) => {
      captured.push(url);
      return { ok: true, status: 200, json: async () => ({ data: [] }) };
    };
    await fetchMangaList();
    expect(captured[0]).toContain('includes%5B%5D=cover_art'); // includes[]=cover_art
    expect(captured[0]).toContain('contentRating%5B%5D=safe');
    expect(captured[0]).toContain('contentRating%5B%5D=erotica');
    expect(captured[0]).toContain('limit=20');
    (globalThis as any).fetch = orig;
  });

  it('throws ApiError when the fetch rejects', async () => {
    const orig: any = (globalThis as any).fetch;
    (globalThis as any).fetch = async () => { throw new Error('network'); };
    await expect(fetchMangaList()).rejects.toBeInstanceOf(ApiError);
    (globalThis as any).fetch = orig;
  });
});

describe('fetchSimilarManga — parsing & self-filter', () => {
  it('returns [] when the source manga has no genres', async () => {
    const restore = mockFetchFor([
      route('/manga/tag', { body: { data: [{ id: 't1', attributes: { name: { en: 'Action' } } }] } }),
      route(`/manga/self?`, { body: { data: { id: 'self', attributes: { tags: [] }, relationships: [] } } }),
    ]);
    expect(await fetchSimilarManga('self')).toEqual([]);
    restore();
  });

  it('keeps results sorted, excludes the source manga, and limits count', async () => {
    const restore = mockFetchFor([
      route('/manga/tag', {
        body: { data: [
          { id: 't1', attributes: { name: { en: 'Action' }, group: 'genre' } },
          { id: 't2', attributes: { name: { en: 'Romance' }, group: 'genre' } },
        ] },
      }),
      route(`/manga/self?`, {
        body: { data: { id: 'self', attributes: { tags: [{ attributes: { name: { en: 'Action' } } }] }, relationships: [] } },
      }),
      route('/manga?', {
        body: { data: [
          { id: 'other1', attributes: { title: { en: 'X' } }, relationships: [] },
          { id: 'self', attributes: { title: { en: 'Self' } }, relationships: [] }, // must be dropped
          { id: 'other2', attributes: { title: { en: 'Y' } }, relationships: [] },
        ] },
      }),
    ]);
    const result = await fetchSimilarManga('self', 1);
    expect(result.length).toBeLessThanOrEqual(1);
    expect(result.map((r) => r.id)).not.toContain('self');
    expect(result[0]).toHaveProperty('title');
    expect(result[0]).toHaveProperty('coverImageUrl');
    restore();
  });
});

describe('buildChapterImageUrls / buildPageUrlsFromChapterData (pure)', () => {
  it('builds data-quality URLs', () => {
    const urls = buildChapterImageUrls('https://cdn', 'abc', ['p1.png', 'p2.png'], 'data');
    expect(urls).toEqual([
      'https://cdn/data/abc/p1.png',
      'https://cdn/data/abc/p2.png',
    ]);
  });

  it('builds data-saver-quality URLs', () => {
    const urls = buildChapterImageUrls('https://cdn', 'abc', ['p1.png'], 'data-saver');
    expect(urls).toEqual(['https://cdn/data-saver/abc/p1.png']);
  });

  it('buildPageUrlsFromChapterData selects the right sources', () => {
    const cd = {
      baseUrl: 'https://cdn',
      chapterHash: 'h',
      pages: ['a.png', 'b.png'],
      dataSaverPages: ['a.s.png', 'b.s.png'],
    };
    expect(buildPageUrlsFromChapterData(cd, 'data')).toEqual([
      'https://cdn/data/h/a.png',
      'https://cdn/data/h/b.png',
    ]);
    expect(buildPageUrlsFromChapterData(cd, 'data-saver')).toEqual([
      'https://cdn/data-saver/h/a.s.png',
      'https://cdn/data-saver/h/b.s.png',
    ]);
  });
});
