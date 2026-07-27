// screens/main/SearchScreen.tsx
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { RootStackParamList } from '../../navigation/navigation';
import Header from '../../components/layout/Header';
import CardView, { ViewMode, CardItem } from '../../components/cardLayouts/CardView';
import GenreSlider from '../../components/layout/GenreSlider';
import SearchBar from '../../components/layout/SearchBar';
import Filter from '../../components/layout/Filter';
import CollapsibleSection from '../../components/layout/CollapsibleSection';
import { useScrollTracker } from '../../hooks/useScrollTracker';
import Anchor from '../../components/layout/Anchor';
import { GeneralStyles, CardViewStyles } from '../../styles/global';
import { colors } from '../../styles/tokens';
import { getRecentFavoritesUpdates, MangaUpdate } from '../../services/favoritesService';
import { fetchMangaList, MangaListParams, Manga } from '../../services/mangaAPI';
import { FilterState, DEFAULT_FILTER_STATE, hasActiveFilters, GENRE_TAGS, GENRE_TAG_IDS, GenreTag } from '../../utils/filters';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';

const LIMIT = 20;

/** Format genre tag slugs into display labels (e.g. "slice-of-life" → "Slice of Life") */
function genreLabel(tag: GenreTag): string {
  return tag.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

export default function SearchScreen() {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const { isScrolling, handleScrollStart, handleScrollEnd } = useScrollTracker();
  const { colors: theme } = useTheme();
  const listRef = useRef<any>(null);

  // ── Search / filter state ────────────────────────────────────────
  const [searchText, setSearchText] = useState('');
  const [filter, setFilter] = useState<FilterState>(DEFAULT_FILTER_STATE);

  // ── Results state ────────────────────────────────────────────────
  const [results, setResults] = useState<Manga[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  // ── Recent updates (independent of search) ───────────────────────
  const [recentUpdates, setRecentUpdates] = useState<MangaUpdate[]>([]);
  const loadUpdates = useCallback(async () => { setRecentUpdates(await getRecentFavoritesUpdates()); }, []);
  useEffect(() => { loadUpdates(); }, [loadUpdates]);

  // ── Build API params from search text + filter ───────────────────
  const buildParams = useCallback(
    (pageOffset: number): MangaListParams => {
      const params: MangaListParams = { limit: LIMIT, offset: pageOffset };
      if (searchText.trim()) params.title = searchText.trim();
      if (filter.genres.length > 0) {
        params.includedTags = filter.genres
          .map((g) => GENRE_TAG_IDS[g])
          .filter(Boolean);
      }
      if (filter.pubStatus) params.status = filter.pubStatus;
      if (filter.contentRating) {
        params.contentRating = [filter.contentRating];
      }
      return params;
    },
    [searchText, filter]
  );

  // ── Fetch from MangaDex ──────────────────────────────────────────
  const fetchResults = useCallback(
    async (reset: boolean) => {
      const pageOffset = reset ? 0 : offset;
      setLoading(true);
      setError(null);
      try {
        const data = await fetchMangaList(buildParams(pageOffset));
        if (reset) {
          setResults(data);
          setOffset(LIMIT);
        } else {
          setResults((prev) => [...prev, ...data]);
          setOffset((prev) => prev + LIMIT);
        }
        setHasMore(data.length >= LIMIT);
        if (reset && data.length === 0) setError(null); // no results is fine, not an error
      } catch (e) {
        console.error('Search failed:', e);
        if (reset) setError('Failed to load results. Please try again.');
      } finally {
        setLoading(false);
      }
    },
    [buildParams, offset]
  );

  // ── Trigger search on filter / text changes (debounced) ──────────
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchResults(true);
    }, 400);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [searchText, filter]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Map Manga[] → CardItem[] ─────────────────────────────────────
  const cardData: CardItem[] = useMemo(
    () =>
      results.map((m) => ({
        id: m.id,
        title: m.title,
        image: m.coverImageUrl,
        imageUrl: m.coverImageUrl,
      })),
    [results]
  );

  // ── Genre slider handlers ────────────────────────────────────────
  const handleGenrePress = useCallback(
    (displayLabel: string) => {
      // Reverse-map display label back to genre tag
      const tag = GENRE_TAGS.find((t) => genreLabel(t) === displayLabel);
      if (!tag) return;
      setFilter((prev) => {
        const next = prev.genres.includes(tag)
          ? prev.genres.filter((g) => g !== tag)
          : [...prev.genres, tag];
        return { ...prev, genres: next };
      });
    },
    []
  );

  // Highlight active genres in the slider
  const genreSliderItems = useMemo(
    () => GENRE_TAGS.map((t) => genreLabel(t)),
    []
  );

  // ── Header content ───────────────────────────────────────────────
  const HeaderContent = (
    <>
      <Header />
      <SearchBar
        value={searchText}
        onChangeText={setSearchText}
        onSearchPress={() => fetchResults(true)}
        placeholder="Search manga…"
      />
      <View style={[GeneralStyles.alignment, { justifyContent: 'space-between', marginTop: 10 }]}>
        <GenreSlider
          genres={genreSliderItems}
          onGenrePress={handleGenrePress}
        />
      </View>
      {recentUpdates.length > 0 && (
        <CollapsibleSection title="Recently Updated" badgeCount={recentUpdates.length}>
          {recentUpdates.slice(0, 5).map((u) => (
            <Pressable
              key={u.mangaId}
              onPress={() => (navigation as any).navigate('MangaInfoScreen', { mangaId: u.mangaId })}
              style={[CardViewStyles.rowCard, { marginBottom: 6, alignItems: 'center' }]}
            >
              <View style={[CardViewStyles.placeholder, { width: 40, height: 56 }]} />
              <View style={[CardViewStyles.rowTextWrap, { flex: 1 }]}>
                <Text style={CardViewStyles.rowTitle} numberOfLines={1}>
                  {u.mangaTitle}
                </Text>
                <Text style={{ fontSize: 11, color: colors.mutedPlum, marginTop: 2 }}>
                  Ch. {u.chapterNumber}
                </Text>
              </View>
            </Pressable>
          ))}
        </CollapsibleSection>
      )}
      <Filter filter={filter} onChange={setFilter} />
      <View style={[GeneralStyles.alignment, { justifyContent: 'space-between', marginTop: 10 }]}>
        <Text style={GeneralStyles.h1}>
          {hasActiveFilters(filter) || searchText.trim() ? 'Filtered Results' : 'Results'}
        </Text>
        <Pressable
          onPress={() => setViewMode(viewMode === 'grid' ? 'row' : 'grid')}
          accessibilityLabel="Toggle view"
        >
          <MaterialCommunityIcons
            name={viewMode === 'grid' ? 'view-grid' : 'view-agenda'}
            size={24}
            color={colors.plum}
          />
        </Pressable>
      </View>
    </>
  );

  // ── Render ───────────────────────────────────────────────────────
  return (
    <View style={[GeneralStyles.container, { backgroundColor: theme.bg }]}>
      <CardView
        listRef={listRef}
        data={cardData}
        viewMode={viewMode}
        onPressItem={(item) =>
          navigation.navigate('MangaInfoScreen', { mangaId: String(item.id) })
        }
        headerComponent={HeaderContent}
        onScrollBeginDrag={handleScrollStart}
        onScrollEndDrag={handleScrollEnd}
        onMomentumScrollEnd={handleScrollEnd}
        itemStyle={() => CardViewStyles.placeholder}
        isLoading={loading}
        hasMore={hasMore}
        onLoadMore={() => fetchResults(false)}
        emptyMessage={
          error
            ? error
            : searchText.trim() || hasActiveFilters(filter)
            ? 'No results found. Try adjusting your search or filters.'
            : 'Start searching to discover manga!'
        }
      />
      <Anchor scrollRef={listRef} isScrolling={isScrolling} />
    </View>
  );
}
