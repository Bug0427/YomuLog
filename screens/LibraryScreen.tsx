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

// Data & Styles
import { sampleMangaData } from '../data/sampleMangaData';
import { GeneralStyles, SearchScreenStyles } from '../styles/global';

// Icons
import { MaterialCommunityIcons, Feather } from '@expo/vector-icons';

export default function LibraryScreen() {
    const navigation = useNavigation<NavigationProp<RootStackParamList>>();
    const [viewMode, setViewMode] = React.useState<ViewMode>('grid');

    const HeaderContent = (
        <>
            <Header />
            <View style= {SearchScreenStyles.alignment}>
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

            <MangaSlider title="Updated" data={sampleMangaData} onTitlePress={() => navigation.navigate('SearchScreen' as never)} />

            {/* Library header with view toggle */}
            <View style={[SearchScreenStyles.alignment, { justifyContent: 'space-between', marginTop: 10 }]}> 
                <Text style={GeneralStyles.h1}>Library</Text>
                <Pressable onPress={() => setViewMode(viewMode === 'grid' ? 'row' : 'grid')} accessibilityLabel="Toggle view">
                    <MaterialCommunityIcons
                    name={viewMode === 'grid' ? 'view-grid' : 'view-agenda'}
                    size={24}
                    color="#543C27"
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