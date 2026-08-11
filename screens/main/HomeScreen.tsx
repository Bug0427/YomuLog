// screens/main/HomeScreen.tsx
import React, { useState, useCallback, useMemo } from 'react';
import { View, ScrollView, Text, Pressable, ActivityIndicator, RefreshControl, StyleSheet, type NativeSyntheticEvent, type NativeScrollEvent } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, NavigationProp, useFocusEffect } from '@react-navigation/native';
import { RootStackParamList } from '../../navigation/navigation';
import Header from '../../components/layout/Header';
import MangaSlider from '../../components/cardLayouts/MangaSlider';
import RefreshCard from '../../components/cardLayouts/RefreshCard';
import { useScrollTracker } from '../../hooks/useScrollTracker';
import Anchor from '../../components/layout/Anchor';
import { GeneralStyles } from '../../styles/global';
import { colors, spacing } from '../../styles/tokens';
import { fetchMangaList, Manga } from '../../services/mangaAPI';
import { GENRE_TAG_IDS, GenreTag } from '../../utils/filters';
import { getPersonalisedRecommendations } from '../../services/metadataClassification';
import { useTheme, type ThemeColors } from '../../context/ThemeContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import MascotLoader from '../../components/general/MascotLoader';
import { fetchHomeSlidersWithFallback, readCachedData } from '../../services/offlineFallback';

// ── Slider configuration ───────────────────────────────────────────
type SliderConfig =
  | { title: string; type: 'order'; order: Record<string, string> }
  | { title: string; type: 'genre'; genre: GenreTag }
  | { title: string; type: 'personalised' };

const SLIDER_CONFIGS: SliderConfig[] = [
  { title: 'New Manga',       type: 'order', order: { latestUploadedChapter: 'desc' } },
  { title: 'Popular Picks',   type: 'order', order: { followedCount: 'desc' } },
  { title: 'Recommended for You', type: 'personalised' },
  { title: 'Updated',         type: 'order', order: { updatedAt: 'desc' } },
  { title: 'Action',          type: 'genre', genre: 'action' },
  { title: 'Adventure',       type: 'genre', genre: 'adventure' },
  { title: 'Comedy',          type: 'genre', genre: 'comedy' },
  { title: 'Drama',           type: 'genre', genre: 'drama' },
  { title: 'Fantasy',         type: 'genre', genre: 'fantasy' },
  { title: 'Horror',          type: 'genre', genre: 'horror' },
  { title: 'Mystery',         type: 'genre', genre: 'mystery' },
  { title: 'Thriller',        type: 'genre', genre: 'thriller' },
  { title: 'Reincarnation',   type: 'genre', genre: 'isekai' },
  { title: 'Romance',         type: 'genre', genre: 'romance' },
  { title: 'Sci-Fi',          type: 'genre', genre: 'sci-fi' },
  { title: 'Slice of Life',   type: 'genre', genre: 'slice-of-life' },
  { title: 'Shounen',         type: 'genre', genre: 'shounen' },
  { title: 'Shoujo',          type: 'genre', genre: 'shoujo' },
  { title: 'Seinen',          type: 'genre', genre: 'seinen' },
  { title: 'Josei',           type: 'genre', genre: 'josei' },
  { title: 'Sports',          type: 'genre', genre: 'sports' },
  { title: 'Supernatural',    type: 'genre', genre: 'supernatural' },
  { title: 'Psychological',   type: 'genre', genre: 'psychological' },
  { title: 'Historical',      type: 'genre', genre: 'historical' },
];

// ── P-3 vertical windowing ───────────────────────────────────────────
// Estimated rail height (cover + title + padding) used to compute which
// rails are near the viewport. MangaSlider heights vary slightly; the
// 2-rail overscan absorbs the variance. Placeholders keep the outer
// ScrollView's content height approximately stable.
const RAIL_ESTIMATED_HEIGHT = 260;
const RAIL_OVERSCAN = 2;

// ── Helpers ─────────────────────────────────────────────────────────
function toSliderItem(manga: Manga, nav: NavigationProp<RootStackParamList>) {
  return {
    id: manga.id,
    title: manga.title,
    image: manga.coverImageUrl || '',
    onPress: () => nav.navigate('MangaInfoScreen', { mangaId: manga.id }),
  };
}

type SliderDataMap = Record<string, ReturnType<typeof toSliderItem>[]>;

export default function HomeScreen() {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const { scrollRef, isScrolling, handleScrollStart, handleScrollEnd } = useScrollTracker();
  const { colors: theme } = useTheme();
  const retryCardStyles = useMemo(() => makeRetryCardStyles(theme), [theme]);

  const [sliderDataMap, setSliderDataMap] = useState<SliderDataMap>({});
  const [failedSliders, setFailedSliders] = useState<Set<string>>(new Set());
  const [usingCachedData, setUsingCachedData] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  // ── P-3: vertical windowing of the 24 rails ─────────────────────────
  // Only rails near the viewport are mounted (real content); the rest are
  // fixed-height placeholders so the outer ScrollView keeps a stable
  // content height. Window = viewport ± 2 rails, recomputed on scroll.
  const [visibleRange, setVisibleRange] = useState<{ start: number; end: number }>({
    start: 0,
    end: Math.min(SLIDER_CONFIGS.length - 1, 7),
  });
  const handleRailWindowScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetY = e.nativeEvent.contentOffset.y;
    const viewportH = e.nativeEvent.layoutMeasurement.height || 800;
    const start = Math.max(0, Math.floor(offsetY / RAIL_ESTIMATED_HEIGHT) - RAIL_OVERSCAN);
    const end = Math.min(
      SLIDER_CONFIGS.length - 1,
      Math.floor((offsetY + viewportH) / RAIL_ESTIMATED_HEIGHT) + RAIL_OVERSCAN,
    );
    setVisibleRange((prev) => (prev.start === start && prev.end === end ? prev : { start, end }));
  }, []);

  // ── Batch helper: process array in chunks with delay ──────────────
  async function batchProcess<T, R>(
    items: T[],
    batchSize: number,
    delayMs: number,
    fn: (item: T) => Promise<R>,
  ): Promise<R[]> {
    const results: R[] = [];
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      const batchResults = await Promise.all(batch.map(fn));
      results.push(...batchResults);
      if (i + batchSize < items.length) {
        await new Promise((r) => setTimeout(r, delayMs));
      }
    }
    return results;
  }

  // ── Load all data ──────────────────────────────────────────────────
  // P-2: `{ background: true }` skips the loading spinner / failed-slider
  // reset so a stale-while-revalidate refresh on tab focus is invisible
  // (rails already render instantly from cache).
  const loadAll = useCallback(async (opts?: { background?: boolean }) => {
    const isBackground = opts?.background === true;
    if (!isBackground) {
      setLoading(true);
      setFailedSliders(new Set());
    }
    try {
      // Fetch sliders in batches of 3 with 350ms delay — MangaDex allows ~5 req/s
      const map: SliderDataMap = {};
      // P-2: raw Manga[] per rail for the cache — SliderItem[] can't be
      // cached losslessly (JSON strips the onPress closures), and both the
      // SWR path and the offline fallback rehydrate through toSliderItem.
      const rawMap: Record<string, Manga[]> = {};
      const failed = new Set<string>();

      await batchProcess(SLIDER_CONFIGS, 3, 350, async (config) => {
        try {
          let result: Manga[] = [];
          if (config.type === 'order') {
            result = await fetchMangaList({ limit: 10, order: config.order });
          } else if (config.type === 'genre') {
            const tagId = GENRE_TAG_IDS[config.genre];
            if (tagId) {
              result = await fetchMangaList({ limit: 10, includedTags: [tagId] });
            }
          } else if (config.type === 'personalised') {
            result = await getPersonalisedRecommendations(10);
          }
          if (result.length) {
            rawMap[config.title] = result;
            map[config.title] = result.map((m) => toSliderItem(m, navigation));
          }
        } catch (e) {
          console.warn(`Failed to load slider "${config.title}":`, e);
          failed.add(config.title);
        }
      });

      setSliderDataMap(map);
      setFailedSliders(failed);
      setUsingCachedData(false);
      // Cache raw Manga[] for offline/SWR fallback (see rawMap note above)
      AsyncStorage.setItem('@YomuLog:cache:homeSliders', JSON.stringify({
        data: rawMap, timestamp: Date.now(),
      })).catch(() => {});
    } catch (e) {
      console.error('Failed to load home data:', e);
      // Try stale cache fallback
      try {
        const cached = await fetchHomeSlidersWithFallback(async () => { throw new Error('offline'); });
        // Rebuild slider items from cached Manga[]
        const cachedMap: SliderDataMap = {};
        for (const config of SLIDER_CONFIGS) {
          const mangas = cached.data[config.title];
          if (mangas && mangas.length) {
            cachedMap[config.title] = mangas.map((m) => toSliderItem(m, navigation));
          }
        }
        if (Object.keys(cachedMap).length) {
          setSliderDataMap(cachedMap);
          setUsingCachedData(true);
        }
      } catch { /* no cache available */ }
    } finally {
      if (!isBackground) {
        setLoading(false);
      }
    }
  }, [navigation]);

  // P-2: stale-while-revalidate on tab focus. Render cached rails instantly
  // (≤5 min old, rehydrated through toSliderItem for fresh closures + covers),
  // then refresh in the background — returning to Home no longer blocks on a
  // full 24-rail refetch. No usable cache → full loading path (spinner) as
  // before. The offline banner is intentionally NOT set here (we're online;
  // it only appears if the background refresh fails).
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        const cached = await readCachedData<Record<string, Manga[]>>(
          '@YomuLog:cache:homeSliders',
          5 * 60_000,
        );
        if (cancelled) return;
        if (cached) {
          const cachedMap: SliderDataMap = {};
          for (const config of SLIDER_CONFIGS) {
            const mangas = cached.data[config.title];
            if (mangas && mangas.length) {
              cachedMap[config.title] = mangas.map((m) => toSliderItem(m, navigation));
            }
          }
          if (Object.keys(cachedMap).length) {
            setSliderDataMap(cachedMap);
            // HOTFIX (regression p23): on cold start `loading` begins `true`, and
            // the background loadAll below skips its `finally` setLoading(false) —
            // without this the cached rails render but the spinner never drops.
            // Cached content IS the first paint, so clear loading immediately.
            setLoading(false);
            loadAll({ background: true });
            return;
          }
        }
        loadAll();
      })();
      return () => { cancelled = true; };
    }, [loadAll, navigation])
  );

  // ── Retry a single failed slider ────────────────────────────────────
  const retrySlider = useCallback(async (config: SliderConfig) => {
    try {
      let result: Manga[] = [];
      if (config.type === 'order') {
        result = await fetchMangaList({ limit: 10, order: config.order });
      } else if (config.type === 'genre') {
        const tagId = GENRE_TAG_IDS[config.genre];
        if (tagId) {
          result = await fetchMangaList({ limit: 10, includedTags: [tagId] });
        }
      } else if (config.type === 'personalised') {
        result = await getPersonalisedRecommendations(10);
      }
      if (result.length) {
        setSliderDataMap((prev) => ({
          ...prev,
          [config.title]: result.map((m) => toSliderItem(m, navigation)),
        }));
      }
      setFailedSliders((prev) => {
        const next = new Set(prev);
        next.delete(config.title);
        return next;
      });
    } catch (e) {
      console.warn(`Retry failed for "${config.title}":`, e);
    }
  }, [navigation]);

  // ── Refresh (re-fetch all) ─────────────────────────────────────────
  const handleRefresh = useCallback(async () => {
    setRefreshKey((k) => k + 1);
    setRefreshing(true);
    await loadAll();
    setRefreshing(false);
  }, [loadAll]);

  // ── Render ─────────────────────────────────────────────────────────
  return (
    <View style={[GeneralStyles.container, { backgroundColor: theme.bg }]}>
        <ScrollView
          ref={scrollRef}
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: spacing.p24 }}
          onScrollBeginDrag={handleScrollStart}
          onScrollEndDrag={handleScrollEnd}
          onMomentumScrollEnd={handleScrollEnd}
          onScroll={handleRailWindowScroll}
          scrollEventThrottle={16}
          showsVerticalScrollIndicator={false}
          showsHorizontalScrollIndicator={false}
          removeClippedSubviews={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor="transparent"
              colors={['transparent']}
              progressViewOffset={20}
            >
              <MascotLoader />
            </RefreshControl>
          }
        >
          <Header />

          {/* Stale-data offline indicator */}
          {usingCachedData && (
            <View style={{
              marginHorizontal: spacing.p12, marginTop: spacing.p4, paddingVertical: spacing.p6, paddingHorizontal: spacing.p12,
              backgroundColor: theme.warning + '18', borderRadius: 8, flexDirection: 'row', alignItems: 'center', gap: 6,
            }}>
              <MaterialCommunityIcons name="wifi-off" size={14} color={theme.warning} />
              <Text style={{ fontSize: 11, color: theme.warning, fontWeight: '600', flex: 1 }}>
                Showing cached data — pull to refresh when back online
              </Text>
            </View>
          )}

          {/* Loading */}
          {loading && (
            <View style={{ paddingVertical: 40, alignItems: 'center' }}>
              <ActivityIndicator size="large" color={theme.textSecondary} />
            </View>
          )}

          {/* Genre / ordered sliders — only render when data loaded */}
          {!loading && (
            <View key={`sliders-${refreshKey}`}>
              {SLIDER_CONFIGS.map((config, idx) => {
                // P-3: windowing — mount only rails near the viewport;
                // fixed-height placeholder preserves scroll height.
                if (idx < visibleRange.start || idx > visibleRange.end) {
                  return (
                    <View
                      key={`${config.title}-${refreshKey}`}
                      style={{ height: RAIL_ESTIMATED_HEIGHT }}
                    />
                  );
                }
                const items = sliderDataMap[config.title];
                const isFailed = failedSliders.has(config.title);
                const isLast = idx === SLIDER_CONFIGS.length - 1;
                // Show failed as retry card, empty as placeholder, or data as slider
                if ((!items || items.length === 0) && !isFailed) {
                  // Render slider with emptyMessage — maintains visual structure
                  return (
                    <View key={`${config.title}-${refreshKey}`}>
                      <MangaSlider
                        title={config.title}
                        data={[]}
                        emptyMessage={`No manga available in ${config.title}`}
                        footerComponent={
                          isLast ? <RefreshCard onRefresh={handleRefresh} /> : undefined
                        }
                      />
                    </View>
                  );
                }
                return (
                  <View key={`${config.title}-${refreshKey}`}>
                    {isFailed ? (
                      /* Retry card for failed slider */
                      <View style={retryCardStyles.wrapper}>
                        <View style={retryCardStyles.header}>
                          <Text style={[retryCardStyles.title, { color: theme.textSecondary }]}>{config.title}</Text>
                        </View>
                        <Pressable
                          style={retryCardStyles.retryBtn}
                          onPress={() => retrySlider(config)}
                        >
                          <MaterialCommunityIcons name="refresh" size={18} color={theme.textSecondary} />
                          <Text style={[retryCardStyles.retryText, { color: theme.textSecondary }]}>Tap to retry</Text>
                        </Pressable>
                      </View>
                    ) : items ? (
                      <MangaSlider
                        title={config.title}
                        data={items}
                        onTitlePress={() => navigation.navigate('SearchScreen' as never)}
                        seeMoreOnPress={() =>
                          (navigation as any).navigate('SearchScreen', {
                            presetGenre: config.type === 'genre' ? config.genre : undefined,
                            presetOrder: config.type === 'order' ? config.order : undefined,
                          })
                        }
                        footerComponent={
                          isLast ? <RefreshCard onRefresh={handleRefresh} /> : undefined
                        }
                      />
                    ) : null}
                  </View>
                );
              })}
            </View>
          )}
        </ScrollView>
        <Anchor scrollRef={scrollRef} isScrolling={isScrolling} />
    </View>
  );
}

const makeRetryCardStyles = (c: ThemeColors) => StyleSheet.create({
  wrapper: {
    marginBottom: spacing.p20,
    paddingHorizontal: spacing.p12,
  },
  header: {
    marginBottom: spacing.p8,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: spacing.p16,
    backgroundColor: c.bgCard,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: c.border,
    borderStyle: 'dashed',
  },
  retryText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
