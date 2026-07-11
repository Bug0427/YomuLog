// React & React Native
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, Pressable, Image } from 'react-native';

// Navigation
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { RootStackParamList } from '../../navigation/navigation';

// Components
import Header from '../../components/layout/Header';
import MangaSlider from '../../components/cardLayouts/MangaSlider';
import CardView, { ViewMode } from '../../components/cardLayouts/CardView';
import GenreSlider from '../../components/layout/GenreSlider';
import SearchBar from '../../components/layout/SearchBar';
import FilterBar from '../../components/layout/FilterBar';
import CollapsibleSection from '../../components/layout/CollapsibleSection';
import { useScrollTracker } from '../../hooks/useScrollTracker';
import Anchor from '../../components/layout/Anchor';

// Data & Styles
import { GeneralStyles, CardViewStyles } from '../../styles/global';
import { colors, spacing, u } from '../../styles/tokens';
import { sampleMangaData } from '../../data/sampleMangaData';
import {
  getRecentFavoritesUpdates,
  MangaUpdate,
  ReadingStatus,
  addFavorite,
  removeFavorite,
} from '../../services/favoritesService';

// Icons
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function SearchScreen() {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const [viewMode, setViewMode] = React.useState<ViewMode>('grid');

  const { isScrolling, handleScrollStart, handleScrollEnd } = useScrollTracker();
  const listRef = React.useRef<any>(null);

  // ─── Filter state ─────────────────────────────────────────────────
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<ReadingStatus | null>(null);

  // ─── Recent updates state ─────────────────────────────────────────
  const [recentUpdates, setRecentUpdates] = useState<MangaUpdate[]>([]);

  const loadUpdates = useCallback(async () => {
    const updates = await getRecentFavoritesUpdates();
    setRecentUpdates(updates);
  }, []);

  useEffect(() => {
    loadUpdates();
  }, [loadUpdates]);

  // ─── Handlers ─────────────────────────────────────────────────────
  const hasActiveFilters = selectedGenres.length > 0 || selectedStatus != null;

  const filteredData = React.useMemo(() => {
    // In a real app, this would query the API with filters.
    // For now we just return sample data — the FilterBar UI is functional.
    return sampleMangaData;
  }, [selectedGenres, selectedStatus]);

  // ─── Header ───────────────────────────────────────────────────────
  const HeaderContent = (
    <>
      <Header />
      <SearchBar
        onOpenOrder={() => console.log('Open order menu')}
        onSearchPress={() => console.log('Open search input')}
        onFilterPress={() => console.log('Open filters')}
      />

      {/* Genre slider (quick browse) */}
      <View style={[GeneralStyles.alignment, { justifyContent: 'space-between', marginTop: 10 }]}>
        <GenreSlider
          genres={['Romance', 'Action', 'Fantasy', 'Comedy', 'Drama', 'Slice of Life', 'Mystery']}
          onGenrePress={(genre) => console.log('Selected genre:', genre)}
        />
      </View>

      {/* Collapsible Recently Updated preview for bookmarked series */}
      {recentUpdates.length > 0 && (
        <CollapsibleSection title="Recently Updated" badgeCount={recentUpdates.length}>
          {recentUpdates.slice(0, 5).map((update) => (
            <Pressable
              key={update.mangaId}
              onPress={() =>
                (navigation as any).navigate('MangaInfoScreen', {
                  mangaId: update.mangaId,
                })
              }
              style={[
                CardViewStyles.rowCard,
                { marginBottom: 6, alignItems: 'center' },
              ]}
            >
              <View style={[CardViewStyles.rowMediaBase, { width: 40, height: 56 }]}>
                {update.mangaImage ? (
                  <Image
                    source={{ uri: update.mangaImage }}
                    style={{ width: 40, height: 56, borderRadius: 4 }}
                    resizeMode="contain"
                  />
                ) : (
                  <View style={[CardViewStyles.placeholder, { width: 40, height: 56 }]} />
                )}
              </View>
              <View style={[CardViewStyles.rowTextWrap, { flex: 1 }]}>
                <Text style={CardViewStyles.rowTitle} numberOfLines={1}>
                  {update.mangaTitle}
                </Text>
                <Text style={{ fontSize: 11, color: colors.mutedPlum, marginTop: 2 }}>
                  Ch. {update.chapterNumber}
                </Text>
              </View>
              <MaterialCommunityIcons
                name="open-in-new"
                size={16}
                color={colors.mutedPlum}
                style={{ marginLeft: 8 }}
              />
            </Pressable>
          ))}
        </CollapsibleSection>
      )}

      {/* Custom FilterBar */}
      <FilterBar
        selectedGenres={selectedGenres}
        onGenresChange={setSelectedGenres}
        selectedStatus={selectedStatus}
        onStatusChange={setSelectedStatus}
      />

      {/* Results header */}
      <View style={[GeneralStyles.alignment, { justifyContent: 'space-between', marginTop: 10 }]}>
        <Text style={GeneralStyles.h1}>
          {hasActiveFilters ? 'Filtered Results' : 'Results'}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {/* Clear filters */}
          {hasActiveFilters && (
            <Pressable
              onPress={() => {
                setSelectedGenres([]);
                setSelectedStatus(null);
              }}
              accessibilityLabel="Clear filters"
            >
              <Text style={{ color: colors.error, fontSize: 12, fontWeight: '600' }}>
                Clear
              </Text>
            </Pressable>
          )}
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
      </View>
    </>
  );

  return (
    <View style={GeneralStyles.container}>
      <CardView
        listRef={listRef}
        data={filteredData}
        viewMode={viewMode}
        onPressItem={(item) => console.log('Open', item.id)}
        headerComponent={HeaderContent}
        onScrollBeginDrag={handleScrollStart}
        onScrollEndDrag={handleScrollEnd}
        onMomentumScrollEnd={handleScrollEnd}
        itemStyle={() => CardViewStyles.placeholder}
      />
      <Anchor scrollRef={listRef} isScrolling={isScrolling} />
    </View>
  );
}