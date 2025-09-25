// React & React Native
import React from 'react';
import { View, ScrollView } from 'react-native';

// Navigation
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/navigation';

// Components
import Header from '../components/layout/Header';
import MangaSlider from '../components/cardLayouts/MangaSlider';
import { useScrollTracker } from '../hooks/useScrollTracker';
import Anchor from '../components/layout/Anchor';

// Data & Styles
import { sampleMangaData } from '../data/sampleMangaData';
import {GeneralStyles } from '../styles/global';
export default function HomeScreen() {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const { scrollRef, isScrolling, handleScrollStart, handleScrollEnd } = useScrollTracker();
  return (
    <View style={GeneralStyles.section}>
      <ScrollView
        ref={scrollRef}
        onScrollBeginDrag={handleScrollStart}
        onScrollEndDrag={handleScrollEnd}
        onMomentumScrollEnd={handleScrollEnd}
      >
        <View style={[GeneralStyles.container, { paddingHorizontal: 12 }]}>
          <Header />
        </View>
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