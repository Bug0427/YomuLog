// React & React Native
import React from 'react';
import { View, TouchableOpacity, Text, ScrollView } from 'react-native';

// Components
import NavBar from '../components/NavBar';
import LoginIcon from '../components/LoginIcon';
import { TrackedScrollView } from '../components/TrackedScrollView';

// Data & Styles
import {GeneralStyles, SearchScreenStyles} from '../styles/global';

// Icons
import { MaterialCommunityIcons, Feather } from '@expo/vector-icons';

export default function SearchScreen() {
    return (
        <View style={[{ flex: 1, position: 'relative' }, GeneralStyles.scrollContainer]}>
        <TrackedScrollView
            style={GeneralStyles.scrollContainer}
            contentContainerStyle={GeneralStyles.container}
        >
        <View style={GeneralStyles.header}>
          <Text style={GeneralStyles.title}>YomuLog</Text>
          <LoginIcon />
        </View>
        <View>
          <NavBar />
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
                <Text><MaterialCommunityIcons name="filter-outline" size={16} color="#543C27" /></Text>
            </TouchableOpacity>
        </View>
        <View style={SearchScreenStyles.genreSlider}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {['Romance', 'Action', 'Fantasy', 'Comedy', 'Drama', 'Slice of Life', 'Mystery'].map((genre) => (
              <TouchableOpacity key={genre} style={SearchScreenStyles.genrePill}>
                <Text style={SearchScreenStyles.genreText}>{genre}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
        </View>
      </TrackedScrollView>
    </View>
  );
}