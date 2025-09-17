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

// Data & Styles
import { GeneralStyles, SearchScreenStyles } from '../styles/global';
import { sampleMangaData } from '../data/sampleMangaData';

// Icons
import { MaterialCommunityIcons, Feather } from '@expo/vector-icons';

export default function SearchScreen() {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const [viewMode, setViewMode] = React.useState<ViewMode>('grid');

  const HeaderContent = (
    <>
      <Header />
      <View style={SearchScreenStyles.alignment}>
        <Pressable style={SearchScreenStyles.order}>
          <Text style={SearchScreenStyles.defaultColor}>☰</Text>
        </Pressable>

        <Pressable style={SearchScreenStyles.searchBarIcon}>
          <Text>
            <Feather name="search" size={16.7} color="#543C27" />
          </Text>
          
        </Pressable>
        <Pressable style={SearchScreenStyles.searchBar}>
          <Text style={SearchScreenStyles.defaultColor}>Search (text filter)</Text>
        </Pressable>
        <Pressable style={SearchScreenStyles.filter}>
          <Text>
            <MaterialCommunityIcons name="filter-outline" size={16} color="#543C27" />
          </Text>
        </Pressable>
      </View>

      <View style={[SearchScreenStyles.alignment, { justifyContent: 'space-between', marginTop: 10}]}> 
        <GenreSlider
          genres={['Romance', 'Action', 'Fantasy', 'Comedy', 'Drama', 'Slice of Life', 'Mystery']}
          onGenrePress={(genre) => console.log('Selected genre:', genre)}
        />
      </View>

      <MangaSlider title="Recommended" data={sampleMangaData} onTitlePress={() => navigation.navigate('SearchScreen' as never)} />

      <View style={[SearchScreenStyles.alignment, { justifyContent: 'space-between', marginTop: 10}]}> 
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
        data={sampleMangaData}
        viewMode={viewMode}
        onPressItem={(item) => console.log('Open', item.id)}
        headerComponent={HeaderContent}
      />
    </View>
  );
}