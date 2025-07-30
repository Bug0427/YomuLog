import React from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import NavBar from '../components/NavBar'; 
import LoginIcon from '../components/LoginIcon';
import MangaSlider from '../components/MangaSlider';
import { sampleMangaData } from '../data/sampleMangaData';
import {HomeScreenStyles} from '../styles/global';

export default function HomeScreen() {
  return (
    <View style={{ flex: 1 }}>
      <ScrollView
      style={HomeScreenStyles.scrollContainer}
        contentContainerStyle={HomeScreenStyles.container}
        bounces={true}
        alwaysBounceVertical={true}
      >
        <View style={HomeScreenStyles.header}>
          <Text style={HomeScreenStyles.title}>YomuLog</Text>
          <LoginIcon />
        </View>
        <NavBar />
        <View />
        <Pressable onPress={() => {}}>
          <Text style={HomeScreenStyles.h1}>New Manga</Text>
        </Pressable>
        <MangaSlider data={sampleMangaData} />
        <View />
        <Pressable onPress={() => {}}>
          <Text style={HomeScreenStyles.h1}>Popular Picks</Text>
        </Pressable>
        <MangaSlider data={sampleMangaData} />
        <View />
        <Pressable onPress={() => {}}>
          <Text style={HomeScreenStyles.h1}>Recommended</Text>
        </Pressable>
        <MangaSlider data={sampleMangaData} />
        <View />
        <Pressable onPress={() => {}}>
          <Text style={HomeScreenStyles.h1}>Updated</Text>
        </Pressable>
        <MangaSlider data={sampleMangaData} />
        <View />
        <Pressable onPress={() => {}}>
          <Text style={HomeScreenStyles.h1}>Action</Text>
        </Pressable>
        <MangaSlider data={sampleMangaData} />
        <View />
        <Pressable onPress={() => {}}>
          <Text style={HomeScreenStyles.h1}>Comedy</Text>
        </Pressable>
        <MangaSlider data={sampleMangaData} />
        <View />
        <Pressable onPress={() => {}}>
          <Text style={HomeScreenStyles.h1}>Fantasy</Text>
        </Pressable>
        <MangaSlider data={sampleMangaData} />
        <View />
        <Pressable onPress={() => {}}>
          <Text style={HomeScreenStyles.h1}>Reincarnation</Text>
        </Pressable>
        <MangaSlider data={sampleMangaData} />
        <View />
        <Pressable onPress={() => {}}>
          <Text style={HomeScreenStyles.h1}>Romance</Text>
        </Pressable>
        <MangaSlider data={sampleMangaData} />
        <View />
        <Pressable onPress={() => {}}>
          <Text style={HomeScreenStyles.h1}>Si-Fi</Text>
        </Pressable>
        <MangaSlider data={sampleMangaData} />
        <View />
        <Pressable onPress={() => {}}>
          <Text style={HomeScreenStyles.h1}>Slice of Life</Text>
        </Pressable>
        <MangaSlider data={sampleMangaData} />
      </ScrollView>
    </View>
  );
}