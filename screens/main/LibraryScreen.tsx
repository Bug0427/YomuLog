// React & React Native
import React from 'react';
import { View, Text, Pressable } from 'react-native';

// Navigation
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { RootStackParamList } from '../../navigation/navigation';

// Components
import Header from '../../components/layout/Header';
import SearchBar from '../../components/layout/SearchBar';
import MangaSlider from '../../components/cardLayouts/MangaSlider';
import CardView, { ViewMode } from '../../components/cardLayouts/CardView';

// Scroll
import { useScrollTracker } from '../../hooks/useScrollTracker';
import Anchor from '../../components/layout/Anchor';


// Data & Styles
import { sampleMangaData } from '../../data/sampleMangaData';
import { GeneralStyles, CardViewStyles } from '../../styles/global';

// Icons
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function LibraryScreen() {
    const navigation = useNavigation<NavigationProp<RootStackParamList>>();
    const [viewMode, setViewMode] = React.useState<ViewMode>('grid');
    const {isScrolling, handleScrollStart, handleScrollEnd } = useScrollTracker();

    const listRef = React.useRef<any>(null);

    const HeaderContent = (
        <>
            <Header />
            <SearchBar />

            <MangaSlider title="Updated" data={sampleMangaData} onTitlePress={() => navigation.navigate('RecentlyUpdated' as never)} />

            <View style={[GeneralStyles.alignment, { justifyContent: 'space-between', marginTop: 10 }]}> 
                <Text style={GeneralStyles.h1}>Library</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Pressable
                        onPress={() => navigation.navigate('RecentlyReadScreen' as never)}
                        accessibilityLabel="Recently read"
                    >
                        <MaterialCommunityIcons
                        name="history"
                        size={22}
                        color="#463B54"
                        />
                    </Pressable>
                    <Pressable onPress={() => setViewMode(viewMode === 'grid' ? 'row' : 'grid')} accessibilityLabel="Toggle view">
                        <MaterialCommunityIcons
                        name={viewMode === 'grid' ? 'view-grid' : 'view-agenda'}
                        size={24}
                        color="#463B54"
                        
                        />
                    </Pressable>
                </View>
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
        itemStyle={() => (CardViewStyles.placeholder)}
        onScrollBeginDrag={handleScrollStart}
        onMomentumScrollEnd={handleScrollEnd}
        />
        <Anchor scrollRef={listRef} isScrolling={isScrolling} />
    </View>
    );
}