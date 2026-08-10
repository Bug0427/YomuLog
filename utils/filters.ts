// utils/filters.ts
// Filter types, constants, and helper utilities for manga catalog filtering.
import type { ReadingStatus } from '../services/favoritesService';

export const GENRE_TAGS = [
  'action', 'adventure', 'comedy', 'drama', 'fantasy', 'horror',
  'mystery', 'romance', 'sci-fi', 'slice-of-life', 'thriller',
  'isekai', 'shounen', 'shoujo', 'seinen', 'josei',
  'sports', 'supernatural', 'psychological', 'historical',
] as const;
export type GenreTag = typeof GENRE_TAGS[number];

export const GENRE_TAG_IDS: Record<GenreTag, string> = {
  action: '391b0423-d847-456f-aff0-8b0cfc03066b',
  adventure: '87cc87cd-a395-47af-b27a-93258283bbc6',
  comedy: '4d32cc48-9f00-4cca-9b5a-a839f0764984',
  drama: 'b9af3a63-f058-46de-a9a0-e0c13906197a',
  fantasy: 'cdc58593-87dd-415e-bbc0-2ec27bf404cc',
  horror: 'cdad7e68-1419-41dd-bdce-27753074a640',
  mystery: 'ee968100-4191-4968-93d3-f82d72be7e46',
  romance: '423e2eae-a7a2-4a8b-ac03-a8351462d71d',
  'sci-fi': '256c8bd9-4904-4360-bf4f-508a76d67183',
  'slice-of-life': 'e5301a23-ebd9-49dd-a0cb-2add944c7fe9',
  thriller: '07251805-a27e-4d59-b488-f0bfbec15168',
  isekai: 'ace04997-f6bd-436e-b261-779182193d3d',
  // Shounen/Shoujo/Seinen/Josei are demographics (publicationDemographic),
  // not genre tags. MangaDex does not have these as tag UUIDs.
  // Slider for these uses the genre tags as closest match, but
  // full demographic support requires fetchMangaList param extension.
  shounen: '391b0423-d847-456f-aff0-8b0cfc03066b',  // Action (closest genre proxy)
  shoujo: '423e2eae-a7a2-4a8b-ac03-a8351462d71d',   // Romance (closest genre proxy)
  seinen: 'b9af3a63-f058-46de-a9a0-e0c13906197a',   // Drama (closest genre proxy)
  josei: '3b60b75c-a2d7-4860-ab56-05f391bb889c',    // Psychological (closest genre proxy)
  sports: '69964a64-2f90-4d33-beeb-f3ed2875eb4c',
  supernatural: 'eabc5b4c-6aff-42f3-b657-3e90cbd00b75',
  psychological: '3b60b75c-a2d7-4860-ab56-05f391bb889c',
  historical: '33771934-028e-4cb3-8744-691e866a923e',
};

export const PUB_STATUS_OPTIONS = [
  { label: 'Ongoing', value: 'ongoing' as const },
  { label: 'Completed', value: 'completed' as const },
  { label: 'Hiatus', value: 'hiatus' as const },
  { label: 'Cancelled', value: 'cancelled' as const },
];
export type PubStatusValue = 'ongoing' | 'completed' | 'hiatus' | 'cancelled';

/** Content format filters — replaces inappropriate content rating tags */
export const CONTENT_FORMAT_OPTIONS = [
  { label: 'Manga', value: 'manga' as const },
  { label: 'Webtoon', value: 'webtoon' as const },
  { label: 'Manhua', value: 'manhua' as const },
  { label: 'Manhwa', value: 'manhwa' as const },
];
export type ContentFormatValue = 'manga' | 'webtoon' | 'manhua' | 'manhwa';

export type FilterState = {
  genres: GenreTag[];
  /** Multi-select — user can toggle any combination */
  pubStatus: PubStatusValue[];
  /** Replaces contentRating; each format maps to MangaDex publicationDemographic/originalLanguage */
  contentFormat: ContentFormatValue[];
  readingStatus: ReadingStatus | null;
};
export const DEFAULT_FILTER_STATE: FilterState = {
  genres: [], pubStatus: [], contentFormat: [], readingStatus: null,
};
export function hasActiveFilters(state: FilterState): boolean {
  return state.genres.length > 0 || state.pubStatus.length > 0 || state.contentFormat.length > 0 || state.readingStatus !== null;
}
export function buildMangaDexQuery(state: FilterState): string {
  const params: string[] = [];
  if (state.genres.length > 0) {
    state.genres.forEach((g) => { const id = GENRE_TAG_IDS[g]; if (id) params.push(`includedTags[]=${id}`); });
    params.push('includedTagsMode=AND');
  }
  if (state.pubStatus.length > 0) {
    state.pubStatus.forEach((s) => params.push(`status[]=${s}`));
  }
  if (state.contentFormat.length > 0) {
    // MangaDex doesn't have a direct "format" field in the main manga query.
    // We exclude unsupported engines; instead, we'll add these as a custom comment.
    // For now, contentFormat is client-side only (extension point for future API).
  }
  return params.length > 0 ? `?${params.join('&')}` : '';
}