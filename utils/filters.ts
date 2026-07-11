// utils/filters.ts
// Filter types, constants, and helper utilities for manga catalog filtering.
import { ReadingStatus } from '../services/favoritesService';

export const GENRE_TAGS = [
  'action', 'adventure', 'comedy', 'drama', 'fantasy', 'horror',
  'mystery', 'romance', 'sci-fi', 'slice-of-life', 'thriller',
  'isekai', 'shounen', 'shoujo', 'seinen', 'josei',
  'sports', 'supernatural', 'psychological', 'historical',
] as const;
export type GenreTag = typeof GENRE_TAGS[number];

export const GENRE_TAG_IDS: Record<GenreTag, string> = {
  action: 'ee968100-4191-4968-93d3-f82d72be7e46',
  adventure: '87cc87cd-a395-47af-b27a-93258283e7e4',
  comedy: '4d2cc4ac-1e7e-4c11-a9bf-d9b217939ce2',
  drama: 'b13b2a48-c720-44a9-9c77-39c9979373fb',
  fantasy: 'cdc58593-87dd-415e-bc3b-6b66d7b0c7ba',
  horror: '0a39b5a1-b235-4886-a747-1dcf0ad156f2',
  mystery: 'c7f47fd3-eb1a-4d28-9282-4b32f8123c9f',
  romance: 'a3c35750-d7d3-4155-82d4-33d8b93fc907',
  'sci-fi': '256978c0-4e5f-45b6-b20f-6a6980f8dde8',
  'slice-of-life': 'e530cfea-0c62-4219-8ca2-2b46c0e0c4c9',
  thriller: 'b1e3c6c1-7d6d-4f4a-9b9e-0a5c5d7e8f9a',
  isekai: '7b2f6c3e-1a4d-4b5c-8d9e-0f1a2b3c4d5e',
  shounen: '0a1b2c3d-4e5f-6a7b-8c9d-0e1f2a3b4c5d',
  shoujo: '1b2c3d4e-5f6a-7b8c-9d0e-1f2a3b4c5d6e',
  seinen: '2c3d4e5f-6a7b-8c9d-0e1f-2a3b4c5d6e7f',
  josei: '3d4e5f6a-7b8c-9d0e-1f2a-3b4c5d6e7f8a',
  sports: '4e5f6a7b-8c9d-0e1f-2a3b-4c5d6e7f8a9b',
  supernatural: '5f6a7b8c-9d0e-1f2a-3b4c-5d6e7f8a9b0c',
  psychological: '6a7b8c9d-0e1f-2a3b-4c5d-6e7f8a9b0c1d',
  historical: '7b8c9d0e-1f2a-3b4c-5d6e-7f8a9b0c1d2e',
};

export const PUB_STATUS_OPTIONS = [
  { label: 'All', value: null },
  { label: 'Ongoing', value: 'ongoing' as const },
  { label: 'Completed', value: 'completed' as const },
  { label: 'Hiatus', value: 'hiatus' as const },
  { label: 'Cancelled', value: 'cancelled' as const },
];
export type PubStatusValue = 'ongoing' | 'completed' | 'hiatus' | 'cancelled';

export const CONTENT_RATING_OPTIONS = [
  { label: 'All', value: null },
  { label: 'Safe', value: 'safe' as const },
  { label: 'Suggestive', value: 'suggestive' as const },
  { label: 'Erotica', value: 'erotica' as const },
  { label: 'Pornographic', value: 'pornographic' as const },
];
export type ContentRatingValue = 'safe' | 'suggestive' | 'erotica' | 'pornographic';
export type { ReadingStatus };

export type FilterState = {
  genres: GenreTag[];
  pubStatus: PubStatusValue | null;
  contentRating: ContentRatingValue | null;
  readingStatus: ReadingStatus | null;
};
export const DEFAULT_FILTER_STATE: FilterState = {
  genres: [], pubStatus: null, contentRating: null, readingStatus: null,
};
export function hasActiveFilters(state: FilterState): boolean {
  return state.genres.length > 0 || state.pubStatus !== null || state.contentRating !== null || state.readingStatus !== null;
}
export function buildMangaDexQuery(state: FilterState): string {
  const params: string[] = [];
  if (state.genres.length > 0) {
    state.genres.forEach((g) => { const id = GENRE_TAG_IDS[g]; if (id) params.push(`includedTags[]=${id}`); });
    params.push('includedTagsMode=AND');
  }
  if (state.pubStatus) params.push(`status=${state.pubStatus}`);
  if (state.contentRating) params.push(`contentRating[]=${state.contentRating}`);
  return params.length > 0 ? `?${params.join('&')}` : '';
}