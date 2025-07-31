// React & React Native
import React from 'react';
import { View, Text, Pressable } from 'react-native';

// Navigation
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/navigation';

// Components
import NavBar from '../components/NavBar';
import LoginIcon from '../components/LoginIcon';
import MangaSlider from '../components/MangaSlider';
import { TrackedScrollView } from '../components/TrackedScrollView';

// Data & Styles
import { sampleMangaData } from '../data/sampleMangaData';
import { HomeScreenStyles, GeneralStyles } from '../styles/global';
export default function HomeScreen() {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();

  return (
    
    <View style={[{ flex: 1, position: 'relative' }, GeneralStyles.scrollContainer]}>
      <TrackedScrollView
          style={GeneralStyles.scrollContainer}
          contentContainerStyle={GeneralStyles.container}
      >
        <View style={HomeScreenStyles.header}>
          <Text style={HomeScreenStyles.title}>YomuLog</Text>
          <LoginIcon />
        </View>
        <NavBar />
        <View />
                <Pressable onPress={() => navigation.navigate('SearchScreen' as never)}>
          <Text style={GeneralStyles.h1}>New Manga</Text>
        </Pressable>
        <MangaSlider data={sampleMangaData} />
        <View />
        <Pressable onPress={() => navigation.navigate('SearchScreen' as never)}>
          <Text style={GeneralStyles.h1}>Popular Picks</Text>
        </Pressable>
        <MangaSlider data={sampleMangaData} />
        <View />
        <Pressable onPress={() => navigation.navigate('SearchScreen' as never)}>
          <Text style={GeneralStyles.h1}>Recommended</Text>
        </Pressable>
        <MangaSlider data={sampleMangaData} />
        <View />
        <Pressable onPress={() => navigation.navigate('SearchScreen' as never)}>
          <Text style={GeneralStyles.h1}>Updated</Text>
        </Pressable>
        <MangaSlider data={sampleMangaData} />
        <View />
        <Pressable onPress={() => navigation.navigate('SearchScreen' as never)}>
          <Text style={GeneralStyles.h1}>Action</Text>
        </Pressable>
        <MangaSlider data={sampleMangaData} />
        <View />
        <Pressable onPress={() => navigation.navigate('SearchScreen' as never)}>
          <Text style={GeneralStyles.h1}>Comedy</Text>
        </Pressable>
        <MangaSlider data={sampleMangaData} />
        <View />
        <Pressable onPress={() => navigation.navigate('SearchScreen' as never)}>
          <Text style={GeneralStyles.h1}>Fantasy</Text>
        </Pressable>
        <MangaSlider data={sampleMangaData} />
        <View />
        <Pressable onPress={() => navigation.navigate('SearchScreen' as never)}>
          <Text style={GeneralStyles.h1}>Reincarnation</Text>
        </Pressable>
        <MangaSlider data={sampleMangaData} />
        <View />
        <Pressable onPress={() => navigation.navigate('SearchScreen' as never)}>
          <Text style={GeneralStyles.h1}>Romance</Text>
        </Pressable>
        <MangaSlider data={sampleMangaData} />
        <View />
        <Pressable onPress={() => navigation.navigate('SearchScreen' as never)}>
          <Text style={GeneralStyles.h1}>Si-Fi</Text>
        </Pressable>
        <MangaSlider data={sampleMangaData} />
        <View />
        <Pressable onPress={() => navigation.navigate('SearchScreen' as never)}>
          <Text style={GeneralStyles.h1}>Slice of Life</Text>
        </Pressable>
        <MangaSlider data={sampleMangaData} />
      </TrackedScrollView>
    </View>
  );
}