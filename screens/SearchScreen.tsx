// React & React Native
import React from 'react';
import { View, Text, Pressable } from 'react-native';

// Navigation
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/navigation';

// Components
import Header from '../components/layout/Header';
import MangaSlider from '../components/cardLayouts/MangaSlider';
import CardView, { ViewMode } from '../components/cardLayouts/CardView';
import GenreSlider from '../components/layout/GenreSlider';
import SearchBar from '../components/layout/SearchBar';
import { useScrollTracker } from '../hooks/useScrollTracker';
import Anchor from '../components/layout/Anchor';

// Data & Styles
import { GeneralStyles, CardViewStyles } from '../styles/global';
import { sampleMangaData } from '../data/sampleMangaData';

// Icons
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function SearchScreen() {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const [viewMode, setViewMode] = React.useState<ViewMode>('grid');

  const { isScrolling, handleScrollStart, handleScrollEnd } = useScrollTracker();
  const listRef = React.useRef<any>(null);

  const HeaderContent = (
    <>
      <Header />
      <SearchBar
        onOpenOrder={() => console.log('Open order menu')}
        onSearchPress={() => console.log('Open search input')}
        onFilterPress={() => console.log('Open filters')}
      />

      <View style={[GeneralStyles.alignment, { justifyContent: 'space-between', marginTop: 10}]}> 
        <GenreSlider
          genres={['Romance', 'Action', 'Fantasy', 'Comedy', 'Drama', 'Slice of Life', 'Mystery']}
          onGenrePress={(genre) => console.log('Selected genre:', genre)}
        />
      </View>

      <MangaSlider title="Recommended" data={sampleMangaData} onTitlePress={() => navigation.navigate('SearchScreen' as never)} />

      <View style={[GeneralStyles.alignment, { justifyContent: 'space-between', marginTop: 10}]}> 
        <Text style={GeneralStyles.h1}>Results</Text>
        <Pressable onPress={() => setViewMode(viewMode === 'grid' ? 'row' : 'grid')} accessibilityLabel="Toggle view">
          <MaterialCommunityIcons
            name={viewMode === 'grid' ? 'view-grid' : 'view-agenda'}
            size={24}
            color="#463B54"
          />
        </Pressable>
      </View>
    </>
  );

  return (
    <View style={GeneralStyles.container}>
      <CardView
        listRef={listRef}
        data={sampleMangaData}
        viewMode={viewMode}
        onPressItem={(item) => console.log('Open', item.id)}
        headerComponent={HeaderContent}
        onScrollBeginDrag={handleScrollStart}
        onScrollEndDrag={handleScrollEnd}
        onMomentumScrollEnd={handleScrollEnd}
        itemStyle={() => (CardViewStyles.placeholder)}
      />
      <Anchor scrollRef={listRef} isScrolling={isScrolling} />
    </View>
  );
}