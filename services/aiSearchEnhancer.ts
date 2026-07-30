// services/aiSearchEnhancer.ts
// Natural-language semantic search parser for manga discovery.
// Parses conversational queries (e.g. "a story about high school romance
// with fantasy action but without horror") into structured MangaDex
// MangaListParams with genre tags, status filters, and title search.

import { GENRE_TAGS, GENRE_TAG_IDS, GenreTag } from '../utils/filters';
import { MangaListParams } from './mangaAPI';

// ─── Genre keyword mappings ──────────────────────────────────────────
// Maps natural-language words/phrases to GENRE_TAGS slugs.
const GENRE_KEYWORDS: Record<string, GenreTag> = {
  // action cluster
  action: 'action',
  fighting: 'action',
  battle: 'action',
  fights: 'action',
  combat: 'action',
  warrior: 'action',
  martial: 'action',
  // adventure cluster
  adventure: 'adventure',
  journey: 'adventure',
  quest: 'adventure',
  travel: 'adventure',
  exploration: 'adventure',
  exploring: 'adventure',
  // comedy cluster
  comedy: 'comedy',
  funny: 'comedy',
  humor: 'comedy',
  humour: 'comedy',
  hilarious: 'comedy',
  laugh: 'comedy',
  gag: 'comedy',
  // drama cluster
  drama: 'drama',
  dramatic: 'drama',
  emotional: 'drama',
  tearjerker: 'drama',
  tragedy: 'drama',
  sad: 'drama',
  serious: 'drama',
  // fantasy cluster
  fantasy: 'fantasy',
  magic: 'fantasy',
  magical: 'fantasy',
  dragons: 'fantasy',
  dragon: 'fantasy',
  wizard: 'fantasy',
  wizards: 'fantasy',
  sorcery: 'fantasy',
  mythical: 'fantasy',
  enchanted: 'fantasy',
  // horror cluster
  horror: 'horror',
  scary: 'horror',
  terror: 'horror',
  creepy: 'horror',
  frightening: 'horror',
  nightmare: 'horror',
  gore: 'horror',
  zombie: 'horror',
  zombies: 'horror',
  // mystery cluster
  mystery: 'mystery',
  detective: 'mystery',
  whodunit: 'mystery',
  puzzle: 'mystery',
  investigation: 'mystery',
  sleuth: 'mystery',
  crime: 'mystery',
  // romance cluster
  romance: 'romance',
  love: 'romance',
  romantic: 'romance',
  relationship: 'romance',
  relationships: 'romance',
  crush: 'romance',
  dating: 'romance',
  couple: 'romance',
  harem: 'romance',
  // sci-fi cluster
  'sci-fi': 'sci-fi',
  'sci fi': 'sci-fi',
  'science fiction': 'sci-fi',
  scifi: 'sci-fi',
  future: 'sci-fi',
  futuristic: 'sci-fi',
  space: 'sci-fi',
  alien: 'sci-fi',
  aliens: 'sci-fi',
  cyborg: 'sci-fi',
  mecha: 'sci-fi',
  robot: 'sci-fi',
  robots: 'sci-fi',
  technology: 'sci-fi',
  // slice-of-life cluster
  'slice of life': 'slice-of-life',
  'slice-of-life': 'slice-of-life',
  everyday: 'slice-of-life',
  daily: 'slice-of-life',
  'daily life': 'slice-of-life',
  'school life': 'slice-of-life',
  // thriller cluster
  thriller: 'thriller',
  suspense: 'thriller',
  tension: 'thriller',
  intense: 'thriller',
  gripping: 'thriller',
  // isekai cluster
  isekai: 'isekai',
  'another world': 'isekai',
  'other world': 'isekai',
  reincarnation: 'isekai',
  reincarnated: 'isekai',
  transported: 'isekai',
  transmigration: 'isekai',
  // shounen cluster
  shounen: 'shounen',
  shonen: 'shounen',
  'young boy': 'shounen',
  'teen boy': 'shounen',
  'teenage boy': 'shounen',
  // shoujo cluster
  shoujo: 'shoujo',
  shojo: 'shoujo',
  'young girl': 'shoujo',
  'teen girl': 'shoujo',
  'teenage girl': 'shoujo',
  // seinen cluster
  seinen: 'seinen',
  'adult men': 'seinen',
  'young adult male': 'seinen',
  // josei cluster
  josei: 'josei',
  'adult women': 'josei',
  'young adult female': 'josei',
  // sports cluster
  sports: 'sports',
  athletic: 'sports',
  competition: 'sports',
  tournament: 'sports',
  basketball: 'sports',
  soccer: 'sports',
  football: 'sports',
  baseball: 'sports',
  swimming: 'sports',
  tennis: 'sports',
  // supernatural cluster
  supernatural: 'supernatural',
  ghosts: 'supernatural',
  ghost: 'supernatural',
  spirits: 'supernatural',
  vampire: 'supernatural',
  vampires: 'supernatural',
  demon: 'supernatural',
  demons: 'supernatural',
  yokai: 'supernatural',
  monster: 'supernatural',
  monsters: 'supernatural',
  // psychological cluster
  psychological: 'psychological',
  mind: 'psychological',
  mental: 'psychological',
  'mind games': 'psychological',
  philosophical: 'psychological',
  // historical cluster
  historical: 'historical',
  history: 'historical',
  period: 'historical',
  samurai: 'historical',
  medieval: 'historical',
  ancient: 'historical',
  // school / high-school maps to slice-of-life via keyword,
  // but we also map it explicitly to catch "high school"
  'high school': 'slice-of-life',
  school: 'slice-of-life',
  college: 'slice-of-life',
  university: 'slice-of-life',

  // ── Character / theme descriptors ─────────────────────────────
  // Map descriptive phrases to the closest genre tag
  'female lead': 'shoujo',
  'female protagonist': 'shoujo',
  'strong female': 'shoujo',
  'male lead': 'shounen',
  'male protagonist': 'shounen',
  'dark fantasy': 'fantasy',
  dark: 'horror', // "dark" alone suggests horror
  feudal: 'historical',
  japan: 'historical',
  'feudal japan': 'historical',
  ninja: 'action',
  assassin: 'action',
  'post apocalyptic': 'sci-fi',
  'post-apocalyptic': 'sci-fi',
  apocalyptic: 'sci-fi',
  survival: 'thriller',
  'battle royale': 'action',
  'virtual reality': 'sci-fi',
  vr: 'sci-fi',
  gaming: 'sci-fi',
  'video game': 'sci-fi',
  'video games': 'sci-fi',
  guild: 'adventure',
  dungeon: 'adventure',
  'dungeon crawling': 'adventure',
  politics: 'drama',
  political: 'drama',
  war: 'action',
  military: 'action',
  music: 'slice-of-life',
  cooking: 'slice-of-life',
  food: 'slice-of-life',
  healing: 'slice-of-life',
  wholesome: 'slice-of-life',
  'found family': 'drama',
  friendship: 'drama',
  betrayal: 'drama',
  revenge: 'action',
};

// ─── Status keywords ─────────────────────────────────────────────────
const STATUS_KEYWORDS: Record<string, string> = {
  ongoing: 'ongoing',
  'still publishing': 'ongoing',
  'in progress': 'ongoing',
  continuing: 'ongoing',
  completed: 'completed',
  finished: 'completed',
  'fully released': 'completed',
  concluded: 'completed',
  hiatus: 'hiatus',
  paused: 'hiatus',
  cancelled: 'cancelled',
  canceled: 'cancelled',
  discontinued: 'cancelled',
};

// ─── Negation patterns ───────────────────────────────────────────────
const NEGATION_PATTERNS = [
  /\b(?:but|without|except|excluding|not|cant stand|dislike)\s+(.+?)(?:\s+(?:but|with|and)\b|$)/i,
];

// ─── Stop words to strip ─────────────────────────────────────────────
const STOP_WORDS = new Set([
  'a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'been',
  'about', 'story', 'manga', 'series', 'like', 'that', 'has',
  'have', 'with', 'and', 'or', 'but', 'of', 'in', 'to', 'for',
  'on', 'i', 'me', 'my', 'want', 'looking', 'find', 'show',
  'give', 'need', 'please', 'something', 'some', 'any',
  'dynamic', 'elements', 'kind', 'type', 'sort', 'genre',
]);

// ─── Public API ──────────────────────────────────────────────────────

export type ParsedQuery = {
  /** Detected genre tags to include */
  includedTags: GenreTag[];
  /** Detected genre tags to exclude (negated) */
  excludedTags: GenreTag[];
  /** Detected publication status filter */
  status: string | null;
  /** Remaining meaningful words for title search */
  titleQuery: string;
  /** User-visible summary of what was detected */
  summary: string;
};

/**
 * Parse a natural-language search query into structured search parameters.
 *
 * Example:
 *   "a story about dynamic high school relationships but with fantasy action elements"
 *   → includedTags: [slice-of-life, romance, fantasy, action]
 *   → titleQuery: "high school relationships"
 */
export function parseNaturalLanguageQuery(query: string): ParsedQuery {
  const normalized = query.trim();
  if (!normalized) {
    return {
      includedTags: [],
      excludedTags: [],
      status: null,
      titleQuery: '',
      summary: '',
    };
  }

  // Check if this looks like natural language (multiple words, conversational)
  const isNaturalLanguage = normalized.split(/\s+/).length >= 3;

  // If it's a short query, just use it as a title search
  if (!isNaturalLanguage) {
    return {
      includedTags: [],
      excludedTags: [],
      status: null,
      titleQuery: normalized,
      summary: `Searching by title: "${normalized}"`,
    };
  }

  const lower = normalized.toLowerCase();
  const words = lower.split(/\s+/);

  // ── Extract negation zones ─────────────────────────────────────
  let negatedText = '';
  let mainText = lower;

  // Find "but not X", "without X", "except X"
  const negMatch = lower.match(/\b(?:but\s+not|without|except|excluding)\s+(.+)/i);
  if (negMatch) {
    negatedText = negMatch[1];
    mainText = lower.slice(0, negMatch.index).trim();
  }

  // ── Multi-word keyword matching ────────────────────────────────
  const matchedGenres = new Set<GenreTag>();
  const matchedNegatedGenres = new Set<GenreTag>();

  // Try multi-word keys first (longest match wins)
  const multiWordKeys = Object.keys(GENRE_KEYWORDS)
    .filter((k) => k.includes(' '))
    .sort((a, b) => b.length - a.length); // longest first

  for (const key of multiWordKeys) {
    const tag = GENRE_KEYWORDS[key];
    if (matchedGenres.has(tag) && matchedNegatedGenres.has(tag)) continue;

    if (mainText.includes(key)) {
      matchedGenres.add(tag);
      mainText = mainText.replace(new RegExp(key, 'gi'), '');
    }
    if (negatedText && negatedText.includes(key) && !matchedGenres.has(tag)) {
      matchedNegatedGenres.add(tag);
    }
  }

  // Then single-word keys
  const remainingWords = mainText.split(/\s+/).filter((w) => w.length > 1);
  const negWords = negatedText ? negatedText.split(/\s+/) : [];

  for (const word of remainingWords) {
    const tag = GENRE_KEYWORDS[word];
    if (tag && !matchedGenres.has(tag)) {
      matchedGenres.add(tag);
    }
  }
  for (const word of negWords) {
    const tag = GENRE_KEYWORDS[word];
    if (tag && !matchedGenres.has(tag)) {
      matchedNegatedGenres.add(tag);
    }
  }

  // ── Extract status ─────────────────────────────────────────────
  let detectedStatus: string | null = null;
  for (const [key, status] of Object.entries(STATUS_KEYWORDS)) {
    if (lower.includes(key)) {
      detectedStatus = status;
      break;
    }
  }

  // ── Build title query from remaining meaningful words ──────────
  const titleWords = remainingWords
    .filter((w) => !STOP_WORDS.has(w) && !GENRE_KEYWORDS[w])
    .slice(0, 5); // cap at 5 words for effective title search

  const titleQuery = titleWords.join(' ');

  // ── Build user-visible summary ─────────────────────────────────
  const parts: string[] = [];
  const included = Array.from(matchedGenres);
  const excluded = Array.from(matchedNegatedGenres);

  if (included.length > 0) {
    parts.push(
      `Genres: ${included.map((g) => g.replace(/-/g, ' ')).join(', ')}`
    );
  }
  if (excluded.length > 0) {
    parts.push(
      `Excluding: ${excluded.map((g) => g.replace(/-/g, ' ')).join(', ')}`
    );
  }
  if (detectedStatus) {
    parts.push(`Status: ${detectedStatus}`);
  }
  if (titleQuery) {
    parts.push(`Title: "${titleQuery}"`);
  }

  return {
    includedTags: included,
    excludedTags: excluded,
    status: detectedStatus,
    titleQuery,
    summary: parts.join(' · '),
  };
}

/**
 * Convert a ParsedQuery into MangaListParams for fetchMangaList().
 */
export function parsedQueryToParams(
  parsed: ParsedQuery,
  limit = 20,
  offset = 0,
): MangaListParams {
  const params: MangaListParams = { limit, offset };

  if (parsed.titleQuery.trim()) {
    params.title = parsed.titleQuery.trim();
  }
  if (parsed.includedTags.length > 0) {
    params.includedTags = parsed.includedTags
      .map((g) => GENRE_TAG_IDS[g])
      .filter(Boolean);
  }
  if (parsed.excludedTags.length > 0) {
    params.excludedTags = parsed.excludedTags
      .map((g) => GENRE_TAG_IDS[g])
      .filter(Boolean);
  }
  if (parsed.status) {
    params.status = parsed.status;
  }

  return params;
}

/**
 * One-shot: parse a query and return ready-to-use MangaListParams.
 */
export function enhanceSearch(
  query: string,
  limit = 20,
  offset = 0,
): { params: MangaListParams; summary: string } {
  const parsed = parseNaturalLanguageQuery(query);
  return {
    params: parsedQueryToParams(parsed, limit, offset),
    summary: parsed.summary,
  };
}
