// React & React Native
import React from 'react';
import { View, TouchableOpacity, Text, Pressable } from 'react-native';

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
import { GeneralStyles, SearchScreenStyles } from '../styles/global';

// Icons
import { MaterialCommunityIcons, Feather } from '@expo/vector-icons';

export default function LibraryScreen() {
    const navigation = useNavigation<NavigationProp<RootStackParamList>>();
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
        <NavBar />
        <View />
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

          {/* Title + slider section moved below with spacing */}
            <View style={{ marginTop: 0 }}>
            <Pressable onPress={() => navigation.navigate('SearchScreen' as never)}>
                <Text style={GeneralStyles.h1}>Updated</Text>
            </Pressable>
            <MangaSlider data={sampleMangaData} />
            </View>
            <Pressable onPress={() => navigation.navigate('SearchScreen' as never)}>
                <Text style={GeneralStyles.h1}>Library</Text>
            </Pressable>
        </TrackedScrollView>
    </View>
    );
}