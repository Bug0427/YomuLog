// screens/main/HomeScreen.tsx
import React, { useState, useCallback } from 'react';
import { View, ScrollView, Text, Pressable, ActivityIndicator, RefreshControl } from 'react-native';
import { useNavigation, NavigationProp, useFocusEffect } from '@react-navigation/native';
import { RootStackParamList } from '../../navigation/navigation';
import Header from '../../components/layout/Header';
import MangaSlider from '../../components/cardLayouts/MangaSlider';
import RefreshCard from '../../components/cardLayouts/RefreshCard';
import CollapsibleSection from '../../components/layout/CollapsibleSection';
import { useScrollTracker } from '../../hooks/useScrollTracker';
import Anchor from '../../components/layout/Anchor';
import { GeneralStyles, CardViewStyles } from '../../styles/global';
import { colors } from '../../styles/tokens';
import { getRecentFavoritesUpdates, MangaUpdate } from '../../services/favoritesService';
import { fetchMangaList, Manga } from '../../services/mangaAPI';
import { GENRE_TAG_IDS, GenreTag } from '../../utils/filters';
import { getPersonalisedRecommendations } from '../../services/metadataClassification';
import { useTheme } from '../../context/ThemeContext';
import MascotLoader from '../../components/general/MascotLoader';

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
  { title: 'Comedy',          type: 'genre', genre: 'comedy' },
  { title: 'Fantasy',         type: 'genre', genre: 'fantasy' },
  { title: 'Reincarnation',   type: 'genre', genre: 'isekai' },
  { title: 'Romance',         type: 'genre', genre: 'romance' },
  { title: 'Si-Fi',           type: 'genre', genre: 'sci-fi' },
  { title: 'Slice of Life',   type: 'genre', genre: 'slice-of-life' },
];

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

  const [recentUpdates, setRecentUpdates] = useState<MangaUpdate[]>([]);
  const [sliderDataMap, setSliderDataMap] = useState<SliderDataMap>({});
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  // ── Load all data ──────────────────────────────────────────────────
  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const updates = await getRecentFavoritesUpdates();
      setRecentUpdates(updates);

      // Fetch all sliders in parallel
      const map: SliderDataMap = {};
      await Promise.all(
        SLIDER_CONFIGS.map(async (config) => {
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
              map[config.title] = result.map((m) => toSliderItem(m, navigation));
            }
          } catch (e) {
            console.warn(`Failed to load slider "${config.title}":`, e);
          }
        })
      );
      setSliderDataMap(map);
    } catch (e) {
      console.error('Failed to load home data:', e);
    } finally {
      setLoading(false);
    }
  }, [navigation]);

  useFocusEffect(
    useCallback(() => {
      loadAll();
    }, [loadAll])
  );

  // ── Refresh (re-fetch all) ─────────────────────────────────────────
  const handleRefresh = useCallback(async () => {
    setRefreshKey((k) => k + 1);
    setRefreshing(true);
    await loadAll();
    setRefreshing(false);
  }, [loadAll]);

  // ── Render ─────────────────────────────────────────────────────────
  return (
    <View style={[GeneralStyles.section, { backgroundColor: theme.bg }]}>
      <ScrollView
        ref={scrollRef}
        onScrollBeginDrag={handleScrollStart}
        onScrollEndDrag={handleScrollEnd}
        onMomentumScrollEnd={handleScrollEnd}
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
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
        <View style={{ paddingHorizontal: 12, backgroundColor: theme.bg }}>
          <Header />
        </View>

        {/* Recently Updated collapsible section */}
        {recentUpdates.length > 0 && (
          <CollapsibleSection title="Recently Updated" badgeCount={recentUpdates.length}>
            {recentUpdates.slice(0, 5).map((u) => (
              <Pressable
                key={u.mangaId}
                onPress={() => navigation.navigate('MangaInfoScreen', { mangaId: u.mangaId })}
                style={[CardViewStyles.rowCard, { marginBottom: 6, alignItems: 'center' }]}
              >
                <View style={{ width: 40, height: 56, backgroundColor: colors.sand, borderRadius: 4 }} />
                <View style={[CardViewStyles.rowTextWrap, { flex: 1 }]}>
                  <Text style={CardViewStyles.rowTitle} numberOfLines={1}>{u.mangaTitle}</Text>
                  <Text style={{ fontSize: 11, color: colors.mutedPlum, marginTop: 2 }}>Ch. {u.chapterNumber}</Text>
                </View>
              </Pressable>
            ))}
          </CollapsibleSection>
        )}

        {/* Loading */}
        {loading && (
          <View style={{ paddingVertical: 40, alignItems: 'center' }}>
            <ActivityIndicator size="large" color={colors.plum} />
          </View>
        )}

        {/* Genre / ordered sliders — only render when data loaded */}
        {!loading && (
          <View key={`sliders-${refreshKey}`}>
            {SLIDER_CONFIGS.map((config, idx) => {
              const items = sliderDataMap[config.title];
              if (!items || items.length === 0) return null;
              const isLast = idx === SLIDER_CONFIGS.length - 1;
              return (
                <MangaSlider
                  key={`${config.title}-${refreshKey}`}
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
              );
            })}
          </View>
        )}
      </ScrollView>
      <Anchor scrollRef={scrollRef} isScrolling={isScrolling} />
    </View>
  );
}
