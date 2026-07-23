// screens/main/HomeScreen.tsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, ScrollView, Text, Pressable } from 'react-native';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { RootStackParamList } from '../../navigation/navigation';
import Header from '../../components/layout/Header';
import MangaSlider from '../../components/cardLayouts/MangaSlider';
import RefreshCard from '../../components/cardLayouts/RefreshCard';
import CollapsibleSection from '../../components/layout/CollapsibleSection';
import { useScrollTracker } from '../../hooks/useScrollTracker';
import Anchor from '../../components/layout/Anchor';
import { sampleMangaData } from '../../data/sampleMangaData';
import { GeneralStyles, CardViewStyles } from '../../styles/global';
import { colors } from '../../styles/tokens';
import { getRecentFavoritesUpdates, MangaUpdate } from '../../services/favoritesService';

// Slider configurations with their titles and genre tags
const SLIDER_CONFIGS = [
  { title: 'New Manga', genre: '' },
  { title: 'Popular Picks', genre: '' },
  { title: 'Recommended', genre: '' },
  { title: 'Updated', genre: '' },
  { title: 'Action', genre: 'action' },
  { title: 'Comedy', genre: 'comedy' },
  { title: 'Fantasy', genre: 'fantasy' },
  { title: 'Reincarnation', genre: 'reincarnation' },
  { title: 'Romance', genre: 'romance' },
  { title: 'Si-Fi', genre: 'sci-fi' },
  { title: 'Slice of Life', genre: 'slice-of-life' },
];

/** Fisher-Yates shuffle for randomization */
function shuffle<T>(array: T[]): T[] {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export default function HomeScreen() {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const { scrollRef, isScrolling, handleScrollStart, handleScrollEnd } = useScrollTracker();
  const [recentUpdates, setRecentUpdates] = useState<MangaUpdate[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);

  const loadUpdates = useCallback(async () => { setRecentUpdates(await getRecentFavoritesUpdates()); }, []);
  useEffect(() => { loadUpdates(); }, [loadUpdates]);

  /** Shuffle sample data and bump refreshKey to re-render all sliders */
  const handleRefresh = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  /** Memoized shuffled datasets so each title gets a random order */
  const shuffledData = useMemo(
    () =>
      SLIDER_CONFIGS.map(() => ({
        id: `shuffled-${refreshKey}`,
        items: shuffle(sampleMangaData.slice(0, 10)).map((m) => ({
          id: `${m.id}-${refreshKey}`,
          title: m.title,
          image: m.image,
          onPress: () => (navigation as any).navigate('MangaInfoScreen', { mangaId: m.id }),
        })),
      })),
    [refreshKey, navigation],
  );

  return (
    <View style={GeneralStyles.section}>
      <ScrollView ref={scrollRef} onScrollBeginDrag={handleScrollStart} onScrollEndDrag={handleScrollEnd} onMomentumScrollEnd={handleScrollEnd} showsVerticalScrollIndicator={false} showsHorizontalScrollIndicator={false}>
        <View style={[GeneralStyles.container, { paddingHorizontal: 12 }]}><Header /></View>
        {recentUpdates.length > 0 && (
          <CollapsibleSection title="Recently Updated" badgeCount={recentUpdates.length}>
            {recentUpdates.slice(0, 5).map((u) => (
              <Pressable key={u.mangaId} onPress={() => (navigation as any).navigate('MangaInfoScreen', { mangaId: u.mangaId })} style={[CardViewStyles.rowCard, { marginBottom: 6, alignItems: 'center' }]}>
                <View style={{ width: 40, height: 56, backgroundColor: colors.sand, borderRadius: 4 }} />
                <View style={[CardViewStyles.rowTextWrap, { flex: 1 }]}>
                  <Text style={CardViewStyles.rowTitle} numberOfLines={1}>{u.mangaTitle}</Text>
                  <Text style={{ fontSize: 11, color: colors.mutedPlum, marginTop: 2 }}>Ch. {u.chapterNumber}</Text>
                </View>
              </Pressable>
            ))}
          </CollapsibleSection>
        )}
        {SLIDER_CONFIGS.map((config, idx) => (
          <MangaSlider
            key={`${config.title}-${refreshKey}`}
            title={config.title}
            data={shuffledData[idx]?.items ?? []}
            onTitlePress={() => navigation.navigate('SearchScreen' as never)}
            footerComponent={<RefreshCard onRefresh={handleRefresh} />}
          />
        ))}
      </ScrollView>
      <Anchor scrollRef={scrollRef} isScrolling={isScrolling} />
    </View>
  );
}