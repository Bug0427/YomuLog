// screens/main/HomeScreen.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { View, ScrollView, Text, Pressable, Image } from 'react-native';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { RootStackParamList } from '../../navigation/navigation';
import Header from '../../components/layout/Header';
import MangaSlider from '../../components/cardLayouts/MangaSlider';
import CollapsibleSection from '../../components/layout/CollapsibleSection';
import { useScrollTracker } from '../../hooks/useScrollTracker';
import Anchor from '../../components/layout/Anchor';
import { sampleMangaData } from '../../data/sampleMangaData';
import { GeneralStyles, CardViewStyles } from '../../styles/global';
import { colors } from '../../styles/tokens';
import { getRecentFavoritesUpdates, MangaUpdate } from '../../services/favoritesService';

export default function HomeScreen() {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const { scrollRef, isScrolling, handleScrollStart, handleScrollEnd } = useScrollTracker();
  const [recentUpdates, setRecentUpdates] = useState<MangaUpdate[]>([]);
  const loadUpdates = useCallback(async () => { setRecentUpdates(await getRecentFavoritesUpdates()); }, []);
  useEffect(() => { loadUpdates(); }, [loadUpdates]);

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
        <MangaSlider title="New Manga" data={sampleMangaData} onTitlePress={() => navigation.navigate('SearchScreen' as never)} />
        <MangaSlider title="Popular Picks" data={sampleMangaData} onTitlePress={() => navigation.navigate('SearchScreen' as never)} />
        <MangaSlider title="Recommended" data={sampleMangaData} onTitlePress={() => navigation.navigate('SearchScreen' as never)} />
        <MangaSlider title="Updated" data={sampleMangaData} onTitlePress={() => navigation.navigate('SearchScreen' as never)} />
        <MangaSlider title="Action" data={sampleMangaData} onTitlePress={() => navigation.navigate('SearchScreen' as never)} />
        <MangaSlider title="Comedy" data={sampleMangaData} onTitlePress={() => navigation.navigate('SearchScreen' as never)} />
        <MangaSlider title="Fantasy" data={sampleMangaData} onTitlePress={() => navigation.navigate('SearchScreen' as never)} />
        <MangaSlider title="Reincarnation" data={sampleMangaData} onTitlePress={() => navigation.navigate('SearchScreen' as never)} />
        <MangaSlider title="Romance" data={sampleMangaData} onTitlePress={() => navigation.navigate('SearchScreen' as never)} />
        <MangaSlider title="Si-Fi" data={sampleMangaData} onTitlePress={() => navigation.navigate('SearchScreen' as never)} />
        <MangaSlider title="Slice of Life" data={sampleMangaData} onTitlePress={() => navigation.navigate('SearchScreen' as never)} />
      </ScrollView>
      <Anchor scrollRef={scrollRef} isScrolling={isScrolling} />
    </View>
  );
}