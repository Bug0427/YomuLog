// screens/main/SearchScreen.tsx
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { View, Text, Pressable, Modal, TouchableWithoutFeedback, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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
import SortModal, { SortOption } from '../../components/general/SortModal';
import { GeneralStyles, CardViewStyles } from '../../styles/global';
import { spacing, colors } from '../../styles/tokens';
import { getRecentFavoritesUpdates, MangaUpdate } from '../../services/favoritesService';
import { fetchMangaList, MangaListParams, Manga } from '../../services/mangaAPI';
import { enhanceSearch } from '../../services/aiSearchEnhancer';
import {
  FilterState,
  DEFAULT_FILTER_STATE,
  hasActiveFilters,
  GENRE_TAGS,
  GENRE_TAG_IDS,
  GenreTag,
} from '../../utils/filters';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { usePremium } from '../../context/PremiumContext';
import PremiumUpgradeModal from '../../components/layout/PremiumUpgradeModal';
import GenreFilterModal, { genreLabel as genreDisplay } from '../../components/layout/GenreFilterModal';
import ReverseImageSearchModal from '../../components/layout/ReverseImageSearchModal';
import GenreSuggestions from '../../components/search/GenreSuggestions';
import { pickImageFromLibrary, searchByImage, RisMatch } from '../../services/reverseImageSearch';

const LIMIT = 20;

/** Format genre tag slugs into display labels (e.g. "slice-of-life" → "Slice of Life") */
function genreLabel(tag: GenreTag): string {
  return tag.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

const SEARCH_SORT_OPTIONS: SortOption[] = [
  { key: 'relevance', label: 'Relevance' },
  { key: 'latest', label: 'Latest Updates' },
  { key: 'rating', label: 'Highest Rated' },
  { key: 'title_asc', label: 'A to Z' },
  { key: 'title_desc', label: 'Z to A' },
];

export default function SearchScreen() {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const { isScrolling, handleScrollStart, handleScrollEnd } = useScrollTracker();
  const { colors: theme } = useTheme();
  const { isPremium } = usePremium();
  const listRef = useRef<any>(null);

  // ── Search / filter state ────────────────────────────────────────
  const [searchText, setSearchText] = useState('');
  const [filter, setFilter] = useState<FilterState>(DEFAULT_FILTER_STATE);
  const [aiMode, setAiMode] = useState<'auto' | 'on' | 'off'>('auto');
  const [showSortModal, setShowSortModal] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showGenreModal, setShowGenreModal] = useState(false);
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [sortOrder, setSortOrder] = useState<string>('relevance');
  const [excludedGenres, setExcludedGenres] = useState<Set<GenreTag>>(new Set());
  const [refreshing, setRefreshing] = useState(false);

  // ── AI enhancer summary ──────────────────────────────────────────
  const [aiSummary, setAiSummary] = useState('');

  // ── Results state ────────────────────────────────────────────────
  const [results, setResults] = useState<Manga[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  // ── Recent updates (independent of search) ───────────────────────
  const [recentUpdates, setRecentUpdates] = useState<MangaUpdate[]>([]);
  const loadUpdates = useCallback(async () => {
    setRecentUpdates(await getRecentFavoritesUpdates());
  }, []);
  useEffect(() => {
    loadUpdates();
  }, [loadUpdates]);

  // ── Reverse image search state ─────────────────────────────────────
  const [risVisible, setRisVisible] = useState(false);
  const [risQueryUri, setRisQueryUri] = useState<string | null>(null);
  const [risResults, setRisResults] = useState<RisMatch[]>([]);
  const [risLoading, setRisLoading] = useState(false);
  const [risError, setRisError] = useState<string | null>(null);

  /** Launch the reverse image search flow: pick → fingerprint → match. */
  const handleRisPress = useCallback(async () => {
    setRisError(null);
    const asset = await pickImageFromLibrary();
    if (!asset) return;

    const uri = asset.uri;
    setRisQueryUri(uri);
    setRisVisible(true);
    setRisResults([]);
    setRisLoading(true);

    try {
      const matches = await searchByImage(uri);
      setRisResults(matches);
      if (matches.length === 0) setRisError(null); // no error, just no matches
    } catch (e) {
      console.error('[RIS] search failed:', e);
      setRisError('Search failed. Please try a different image.');
    } finally {
      setRisLoading(false);
    }
  }, []);

  /** Navigate to manga detail from RIS result. */
  const handleRisSelectManga = useCallback(
    (mangaId: string) => {
      setRisVisible(false);
      (navigation as any).navigate('MangaInfoScreen', { mangaId });
    },
    [navigation]
  );

  // ── Effective AI mode — auto-enables for natural language queries (3+ words)
  const isNaturalLanguage = searchText.trim().split(/\s+/).length >= 3;
  const effectiveAiMode = aiMode === 'on' || (aiMode === 'auto' && isNaturalLanguage);

  // ── Build API params: NLP-enhanced search + manual filter merge ──
  const buildParams = useCallback(
    (pageOffset: number): MangaListParams => {
      let params: MangaListParams = { limit: LIMIT, offset: pageOffset };

      if (effectiveAiMode && searchText.trim()) {
        // AI enhancer mode: use NLP parser
        const enhanced = enhanceSearch(searchText.trim(), LIMIT, pageOffset);
        params = enhanced.params;
        setAiSummary(enhanced.summary);
      } else {
        // Normal mode: direct title search
        setAiSummary('');
        if (searchText.trim()) params.title = searchText.trim();
      }

      // Merge manual filter choices on top (user can override/refine AI)
      if (filter.genres.length > 0) {
        const manualTagIds = filter.genres
          .map((g) => GENRE_TAG_IDS[g])
          .filter(Boolean);
        const existing = new Set(params.includedTags ?? []);
        manualTagIds.forEach((id) => existing.add(id));
        params.includedTags = Array.from(existing);
      }
      // Add excluded genre tag IDs
      if (excludedGenres.size > 0) {
        params.excludedTags = Array.from(excludedGenres)
          .map((g) => GENRE_TAG_IDS[g])
          .filter(Boolean);
      }
      if (filter.pubStatus.length > 0) {
        params.status = [...filter.pubStatus];
      }
      if (filter.contentFormat.length > 0) {
        // MangaDex does not support a direct "format" parameter;
        // contentFormat filters are applied client-side for now.
      }
      if (sortOrder !== 'relevance') {
        if (sortOrder === 'latest') params.order = { updatedAt: 'desc' };
        else if (sortOrder === 'rating') params.order = { rating: 'desc' };
        else if (sortOrder === 'title_asc') params.order = { title: 'asc' };
        else if (sortOrder === 'title_desc') params.order = { title: 'desc' };
      }

      return params;
    },
    [searchText, filter, effectiveAiMode, sortOrder, excludedGenres]
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
          setResults((prev) => {
            const seen = new Set(prev.map((m) => m.id));
            const unique = data.filter((m) => !seen.has(m.id));
            return [...prev, ...unique];
          });
          setOffset((prev) => prev + LIMIT);
        }
        setHasMore(data.length >= LIMIT);
        if (reset && data.length === 0) setError(null);
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
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchText, filter, effectiveAiMode, sortOrder, excludedGenres]);

  // ── Pull-to-refresh ────────────────────────────────────────────
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchResults(true);
    setRefreshing(false);
  }, [fetchResults]);

  // ── Map Manga[] → CardItem[] (deduplicated by id) ─────────────────
  const cardData: CardItem[] = useMemo(
    () => {
      const seen = new Set<string>();
      return results
        .filter((m) => {
          if (seen.has(m.id)) return false;
          seen.add(m.id);
          return true;
        })
        .map((m) => ({
          id: m.id,
          title: m.title,
          image: m.coverImageUrl,
          imageUrl: m.coverImageUrl,
        }));
    },
    [results]
  );

  // ── Genre three-state toggle: unselected → selected → excluded → unselected ──
  const handleGenrePress = useCallback((displayLabel: string) => {
    const tag = GENRE_TAGS.find((t) => genreLabel(t) === displayLabel);
    if (!tag) return;

    const isSelected = filter.genres.includes(tag);
    const isExcluded = excludedGenres.has(tag);

    if (!isSelected && !isExcluded) {
      // 1st tap: unselected → selected
      setFilter((prev) => ({ ...prev, genres: [...prev.genres, tag] }));
    } else if (isSelected && !isExcluded) {
      // 2nd tap: selected → excluded
      setFilter((prev) => ({ ...prev, genres: prev.genres.filter((g) => g !== tag) }));
      setExcludedGenres((prev) => new Set(prev).add(tag));
    } else {
      // 3rd tap: excluded → unselected
      setExcludedGenres((prev) => {
        const next = new Set(prev);
        next.delete(tag);
        return next;
      });
    }
  }, [filter.genres, excludedGenres]);

  const genreSliderItems = useMemo(() => GENRE_TAGS.map((t) => genreLabel(t)), []);

  // ── Header content ───────────────────────────────────────────────
  const HeaderContent = (
    <>
      <Header />
      <SearchBar
        value={searchText}
        onChangeText={setSearchText}
        onSearchPress={() => fetchResults(true)}
        onFilterPress={() => setShowFilterModal(true)}
        onGenrePress={() => setShowGenreModal(true)}
        onOpenOrder={() => setShowSortModal(true)}
        placeholder="Search items..."
      />
      {/* AI mode toggle + Reverse Image Search */}
      <SafeAreaView style={[{ flex: 1 }, { backgroundColor: theme.bg }]}>
      <View style={{ flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', paddingHorizontal: spacing.p12, marginTop: spacing.p4, gap: spacing.p8 }}>
          {/* Reverse image search button */}
          <Pressable
            onPress={handleRisPress}
            accessibilityLabel="Search by image"
            style={{
              width: 34,
              height: 34,
              borderRadius: 17,
              borderWidth: 1,
              borderColor: theme.border,
              backgroundColor: theme.bgCard,
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <MaterialCommunityIcons name="image-search" size={18} color={theme.textPrimary} />
          </Pressable>
          <Pressable
            onPress={() => {
              if (!isPremium) { setShowPremiumModal(true); return; }
              setAiMode((prev) => {
                if (prev === 'auto') return 'on';
                if (prev === 'on') return 'off';
                return 'auto';
              });
            }}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing.p6,
              paddingVertical: spacing.p5,
              paddingHorizontal: spacing.p12,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: effectiveAiMode ? theme.accent : theme.border,
              backgroundColor: effectiveAiMode ? theme.accent : 'transparent',
            }}
          >
            <MaterialCommunityIcons
              name="robot"
              size={14}
              color={effectiveAiMode ? theme.textInverse : theme.textMuted}
            />
            <Text
              style={{
                fontSize: 11,
                fontWeight: '600',
                color: effectiveAiMode ? theme.textInverse : theme.textMuted,
              }}
            >
              {aiMode === 'auto'
                ? (isNaturalLanguage ? '🤖 AI Auto (detected)' : '🤖 AI Auto (standby)')
                : aiMode === 'on'
                  ? '🤖 AI Enhancer ON'
                  : 'AI Enhancer OFF'}
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
      {aiSummary ? (
        <View
          style={{
            marginHorizontal: spacing.p12,
            marginTop: spacing.p6,
            paddingVertical: spacing.p8,
            paddingHorizontal: spacing.p12,
            backgroundColor: colors.deepPlum,
            borderRadius: 8,
          }}
        >
          <Text style={{ color: colors.paleLavender, fontSize: 11, fontWeight: '600' }}>
            🤖 AI understood: {aiSummary}
          </Text>
        </View>
      ) : null}
      <GenreSuggestions
        selectedGenres={filter.genres}
        excludedGenres={excludedGenres}
        onGenrePress={(tag) => {
          if (!filter.genres.includes(tag)) {
            setFilter((prev) => ({ ...prev, genres: [...prev.genres, tag] }));
          }
        }}
      />
      <View style={[GeneralStyles.alignment, { justifyContent: 'space-between', marginTop: 10 }]}>
        <GenreSlider genres={genreSliderItems} onGenrePress={handleGenrePress} selectedGenres={filter.genres.map(genreLabel)} excludedGenres={Array.from(excludedGenres).map(genreLabel)} />
      </View>
      {recentUpdates.length > 0 && (
        <CollapsibleSection title="Recently Updated" badgeCount={recentUpdates.length}>
          {recentUpdates.slice(0, 5).map((u) => (
            <Pressable
              key={u.mangaId}
              onPress={() =>
                (navigation as any).navigate('MangaInfoScreen', { mangaId: u.mangaId })
              }
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
      {showFilterModal && (
        <Modal
          visible={showFilterModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowFilterModal(false)}
        >
          <TouchableWithoutFeedback onPress={() => setShowFilterModal(false)}>
            <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }}>
              <TouchableWithoutFeedback onPress={() => {}}>
                <View style={{ backgroundColor: theme.bgCard, borderRadius: 12, padding: 0, width: '90%', maxHeight: '85%' }}>
                  <ScrollView showsVerticalScrollIndicator={true}>
                    <Filter
                      filter={filter}
                      onChange={setFilter}
                    />
                  </ScrollView>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </Modal>
      )}

      {/* Genre filter modal — replaces horizontal GenreSlider for richer UX */}
      <GenreFilterModal
        visible={showGenreModal}
        selected={filter.genres}
        onClose={() => setShowGenreModal(false)}
        onSelect={(tag) => setFilter((prev) => ({ ...prev, genres: [...prev.genres, tag] }))}
        onUnselect={(tag) => setFilter((prev) => ({ ...prev, genres: prev.genres.filter((g) => g !== tag) }))}
        onSelectCategory={(tags) => setFilter((prev) => {
          const existing = new Set(prev.genres);
          tags.forEach((t) => existing.add(t));
          return { ...prev, genres: Array.from(existing) };
        })}
        onClearCategory={(tags) => {
          const tagSet = new Set(tags);
          setFilter((prev) => ({ ...prev, genres: prev.genres.filter((g) => !tagSet.has(g)) }));
        }}
      />

      {/* Sort order modal — shared SortModal component */}
      <SortModal
        visible={showSortModal}
        options={SEARCH_SORT_OPTIONS}
        selectedKey={sortOrder}
        onSelect={setSortOrder}
        onClose={() => setShowSortModal(false)}
      />
      {/* Premium upgrade modal */}
      <PremiumUpgradeModal
        visible={showPremiumModal}
        onClose={() => setShowPremiumModal(false)}
      />
      {/* Reverse image search modal */}
      <ReverseImageSearchModal
        visible={risVisible}
        onClose={() => setRisVisible(false)}
        queryImageUri={risQueryUri}
        results={risResults}
        loading={risLoading}
        error={risError}
        onSelectManga={handleRisSelectManga}
      />
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
        refreshing={refreshing}
        onRefresh={handleRefresh}
        emptyMessage={
          error
            ? error
            : searchText.trim() || hasActiveFilters(filter)
            ? 'No results found. Try adjusting your search or filters.'
            : 'Start searching to discover manga! Try natural language like "high school romance with fantasy action".'
        }
      />
      <Anchor scrollRef={listRef} isScrolling={isScrolling} />
    </View>
  );
}
