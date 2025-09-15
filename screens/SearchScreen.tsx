// React & React Native
import React from 'react';
import { View, TouchableOpacity, Text, ScrollView, Pressable } from 'react-native';

// Navigation
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/navigation';

// Components
import Header from '../components/layout/Header';
import MangaSlider from '../components/cardLayouts/MangaSlider';
import CardView, { ViewMode } from '../components/cardLayouts/CardView';

// Data & Styles
import { GeneralStyles, SearchScreenStyles } from '../styles/global';
import { sampleMangaData } from '../data/sampleMangaData';

// Icons
import { MaterialCommunityIcons, Feather } from '@expo/vector-icons';

export default function SearchScreen() {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const [viewMode, setViewMode] = React.useState<ViewMode>('grid');

  const HeaderContent = (
    <View style={GeneralStyles.section}>
      <Header />

      {/* Search row */}
      <View style={SearchScreenStyles.alignment}>
        <TouchableOpacity style={SearchScreenStyles.order}>
          <Text style={SearchScreenStyles.defaultColor}>☰</Text>
        </TouchableOpacity>

        <TouchableOpacity style={SearchScreenStyles.searchBarIcon}>
          <Text>
            <Feather name="search" size={16.7} color="#543C27" />
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={SearchScreenStyles.searchBar}>
          <Text style={SearchScreenStyles.defaultColor}>Search (text filter)</Text>
        </TouchableOpacity>
        <TouchableOpacity style={SearchScreenStyles.filter}>
          <Text>
            <MaterialCommunityIcons name="filter-outline" size={16} color="#543C27" />
          </Text>
        </TouchableOpacity>
      </View>

      {/* Genre chips */}
      <View style={SearchScreenStyles.genreSlider}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {['Romance', 'Action', 'Fantasy', 'Comedy', 'Drama', 'Slice of Life', 'Mystery'].map((genre) => (
            <TouchableOpacity key={genre} style={SearchScreenStyles.genrePill}>
              <Text style={SearchScreenStyles.genreText}>{genre}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Recommended slider */}
      <View>
        <Pressable onPress={() => navigation.navigate('SearchScreen' as never)}>
          <Text style={GeneralStyles.h1}>Recommended</Text>
        </Pressable>
        <MangaSlider data={sampleMangaData} />
      </View>

      {/* Results header + view toggle */}
      <View style={[SearchScreenStyles.alignment, { justifyContent: 'space-between', marginTop: 10 }]}> 
        <Text style={GeneralStyles.h1}>Results</Text>
        <Pressable onPress={() => setViewMode(viewMode === 'grid' ? 'row' : 'grid')} accessibilityLabel="Toggle view">
          <MaterialCommunityIcons
            name={viewMode === 'grid' ? 'view-grid' : 'view-agenda'}
            size={24}
            color="#543C27"
          />
        </Pressable>
      </View>
    </View>
  );

  return (
    <View style={GeneralStyles.screen}>
      <CardView
        data={sampleMangaData}
        viewMode={viewMode}
        onPressItem={(item) => console.log('Open', item.id)}
        headerComponent={HeaderContent}
      />
    </View>
  );
}