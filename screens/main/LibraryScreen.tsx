// React & React Native
import React, { useState, useCallback, useMemo, useRef } from 'react';
import { View, Text, Pressable, ActivityIndicator } from 'react-native';

// Navigation
import { useNavigation, NavigationProp, useFocusEffect } from '@react-navigation/native';
import { RootStackParamList } from '../../navigation/navigation';

// Components
import Header from '../../components/layout/Header';
import SearchBar from '../../components/layout/SearchBar';
import MangaSlider from '../../components/cardLayouts/MangaSlider';
import CardView, { ViewMode, CardItem } from '../../components/cardLayouts/CardView';
import Filter from '../../components/layout/Filter';

// Scroll
import { useScrollTracker } from '../../hooks/useScrollTracker';
import Anchor from '../../components/layout/Anchor';

// Services
import {
  getFavorites,
  getRecentFavoritesUpdates,
  BookmarkedManga,
  MangaUpdate,
} from '../../services/favoritesService';

// Styles
import { GeneralStyles, CardViewStyles } from '../../styles/global';

// Filters
import { FilterState, DEFAULT_FILTER_STATE } from '../../utils/filters';

// Icons
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function LibraryScreen() {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const { isScrolling, handleScrollStart, handleScrollEnd } = useScrollTracker();
  const listRef = useRef<any>(null);

  // ── Data state ────────────────────────────────────────────────────
  const [favorites, setFavorites] = useState<BookmarkedManga[]>([]);
  const [recentUpdates, setRecentUpdates] = useState<MangaUpdate[]>([]);
  const [filter, setFilter] = useState<FilterState>(DEFAULT_FILTER_STATE);
  const [loading, setLoading] = useState(true);

  // ── Fetch on focus ────────────────────────────────────────────────
  useFocusEffect(
    useCallback(() => {
      let active = true;
      async function load() {
        setLoading(true);
        try {
          const [favs, updates] = await Promise.all([
            getFavorites(),
            getRecentFavoritesUpdates(),
          ]);
          if (active) {
            setFavorites(favs);
            setRecentUpdates(updates);
          }
        } catch (e) {
          console.error('Failed to load library:', e);
        } finally {
          if (active) setLoading(false);
        }
      }
      load();
      return () => {
        active = false;
      };
    }, [])
  );

  // ── Filter favorites ─────────────────────────────────────────────
  const filteredFavorites = useMemo(() => {
    return favorites.filter((item) => {
      // Reading status filter
      if (filter.readingStatus && item.readingStatus !== filter.readingStatus) {
        return false;
      }
      // Genre filter (item must match at least one selected genre)
      if (filter.genres.length > 0) {
        if (!item.genres || item.genres.length === 0) return false;
        if (!filter.genres.some((g) => item.genres!.includes(g))) return false;
      }
      // pubStatus and contentRating don't apply to local bookmarks — ignore them
      return true;
    });
  }, [favorites, filter]);

  // ── Map to CardItem[] for CardView ────────────────────────────────
  const cardData: CardItem[] = useMemo(
    () =>
      filteredFavorites.map((fav) => ({
        id: fav.mangaId,
        title: fav.mangaTitle,
        image: fav.mangaImage,
      })),
    [filteredFavorites]
  );

  // ── Slider data (most recent bookmarks, sorted by bookmarkedAt) ───
  const sliderData = useMemo(
    () =>
      [...favorites]
        .sort((a, b) => b.bookmarkedAt.localeCompare(a.bookmarkedAt))
        .slice(0, 10)
        .map((fav) => ({
          id: fav.mangaId,
          title: fav.mangaTitle,
          image: fav.mangaImage || '',
          onPress: () => navigation.navigate('MangaInfoScreen', { mangaId: fav.mangaId }),
        })),
    [favorites, navigation]
  );

  // ── Header content ────────────────────────────────────────────────
  const HeaderContent = (
    <>
      <Header />
      <SearchBar />

      <MangaSlider
        title="Updated"
        data={sliderData}
        onTitlePress={() => navigation.navigate('RecentlyUpdated' as never)}
      />

      <Filter filter={filter} onChange={setFilter} showReadingStatus />

      <View style={[GeneralStyles.alignment, { justifyContent: 'space-between', marginTop: 10 }]}>
        <Text style={GeneralStyles.h1}>Library</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Pressable
            onPress={() => navigation.navigate('RecentlyReadScreen' as never)}
            accessibilityLabel="Recently read"
          >
            <MaterialCommunityIcons name="history" size={22} color="#463B54" />
          </Pressable>
          <Pressable
            onPress={() => setViewMode(viewMode === 'grid' ? 'row' : 'grid')}
            accessibilityLabel="Toggle view"
          >
            <MaterialCommunityIcons
              name={viewMode === 'grid' ? 'view-grid' : 'view-agenda'}
              size={24}
              color="#463B54"
            />
          </Pressable>
        </View>
      </View>
    </>
  );

  // ── Render ────────────────────────────────────────────────────────
  return (
    <View style={GeneralStyles.container}>
      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#463B54" />
        </View>
      ) : (
        <CardView
          listRef={listRef}
          data={cardData}
          viewMode={viewMode}
          onPressItem={(item) =>
            navigation.navigate('MangaInfoScreen', { mangaId: String(item.id) })
          }
          headerComponent={HeaderContent}
          itemStyle={() => CardViewStyles.placeholder}
          onScrollBeginDrag={handleScrollStart}
          onMomentumScrollEnd={handleScrollEnd}
          emptyMessage="No bookmarked manga yet. Start adding favorites!"
        />
      )}
      <Anchor scrollRef={listRef} isScrolling={isScrolling} />
    </View>
  );
}
