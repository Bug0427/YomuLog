// screens/main/SearchScreen.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { RootStackParamList } from '../../navigation/navigation';
import Header from '../../components/layout/Header';
import MangaSlider from '../../components/cardLayouts/MangaSlider';
import CardView, { ViewMode } from '../../components/cardLayouts/CardView';
import GenreSlider from '../../components/layout/GenreSlider';
import SearchBar from '../../components/layout/SearchBar';
import Filter from '../../components/layout/Filter';
import CollapsibleSection from '../../components/layout/CollapsibleSection';
import { useScrollTracker } from '../../hooks/useScrollTracker';
import Anchor from '../../components/layout/Anchor';
import { GeneralStyles, CardViewStyles } from '../../styles/global';
import { colors } from '../../styles/tokens';
import { sampleMangaData } from '../../data/sampleMangaData';
import { getRecentFavoritesUpdates, MangaUpdate } from '../../services/favoritesService';
import { FilterState, DEFAULT_FILTER_STATE, hasActiveFilters } from '../../utils/filters';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function SearchScreen() {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const { isScrolling, handleScrollStart, handleScrollEnd } = useScrollTracker();
  const listRef = React.useRef<any>(null);
  const [filter, setFilter] = useState<FilterState>(DEFAULT_FILTER_STATE);
  const [recentUpdates, setRecentUpdates] = useState<MangaUpdate[]>([]);
  const loadUpdates = useCallback(async () => { setRecentUpdates(await getRecentFavoritesUpdates()); }, []);
  useEffect(() => { loadUpdates(); }, [loadUpdates]);

  const HeaderContent = (
    <>
      <Header />
      <SearchBar onOpenOrder={() => console.log('Open order menu')} onSearchPress={() => console.log('Open search input')} onFilterPress={() => console.log('Open filters')} />
      <View style={[GeneralStyles.alignment, { justifyContent: 'space-between', marginTop: 10 }]}>
        <GenreSlider genres={['Romance', 'Action', 'Fantasy', 'Comedy', 'Drama', 'Slice of Life', 'Mystery']} onGenrePress={(g) => console.log('Genre:', g)} />
      </View>
      {recentUpdates.length > 0 && (
        <CollapsibleSection title="Recently Updated" badgeCount={recentUpdates.length}>
          {recentUpdates.slice(0, 5).map((u) => (
            <Pressable key={u.mangaId} onPress={() => (navigation as any).navigate('MangaInfoScreen', { mangaId: u.mangaId })} style={[CardViewStyles.rowCard, { marginBottom: 6, alignItems: 'center' }]}>
              <View style={[CardViewStyles.placeholder, { width: 40, height: 56 }]} />
              <View style={[CardViewStyles.rowTextWrap, { flex: 1 }]}>
                <Text style={CardViewStyles.rowTitle} numberOfLines={1}>{u.mangaTitle}</Text>
                <Text style={{ fontSize: 11, color: colors.mutedPlum, marginTop: 2 }}>Ch. {u.chapterNumber}</Text>
              </View>
            </Pressable>
          ))}
        </CollapsibleSection>
      )}
      <Filter filter={filter} onChange={setFilter} />
      <View style={[GeneralStyles.alignment, { justifyContent: 'space-between', marginTop: 10 }]}>
        <Text style={GeneralStyles.h1}>{hasActiveFilters(filter) ? 'Filtered Results' : 'Results'}</Text>
        <Pressable onPress={() => setViewMode(viewMode === 'grid' ? 'row' : 'grid')} accessibilityLabel="Toggle view">
          <MaterialCommunityIcons name={viewMode === 'grid' ? 'view-grid' : 'view-agenda'} size={24} color={colors.plum} />
        </Pressable>
      </View>
    </>
  );

  return (
    <View style={GeneralStyles.container}>
      <CardView listRef={listRef} data={sampleMangaData} viewMode={viewMode} onPressItem={(item) => console.log('Open', item.id)} headerComponent={HeaderContent} onScrollBeginDrag={handleScrollStart} onScrollEndDrag={handleScrollEnd} onMomentumScrollEnd={handleScrollEnd} itemStyle={() => CardViewStyles.placeholder} />
      <Anchor scrollRef={listRef} isScrolling={isScrolling} />
    </View>
  );
}