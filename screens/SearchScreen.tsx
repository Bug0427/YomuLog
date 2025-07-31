import NavBar from '../components/NavBar'; 
import {GeneralStyles, SearchScreenStyles} from '../styles/global';
import { View, TouchableOpacity, Text } from 'react-native';
import React from 'react';
import { TrackedScrollView } from '../components/TrackedScrollView';
import { MaterialCommunityIcons, Feather } from '@expo/vector-icons';

export default function SearchScreen() {
    return (
        <View style={[{ flex: 1, position: 'relative' }, GeneralStyles.scrollContainer]}>
        <TrackedScrollView
            style={GeneralStyles.scrollContainer}
            contentContainerStyle={GeneralStyles.container}
        >
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
        </View>
        </TrackedScrollView>
        </View>
    );
}