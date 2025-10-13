// React & React Native
import React from 'react';
import { View, Text, Pressable } from 'react-native';

// Components
import Header from '../../components/layout/Header';
import SearchBar from '../../components/layout/SearchBar';
import CardView, { ViewMode } from '../../components/cardLayouts/CardView';

// Scroll
import { useScrollTracker } from '../../hooks/useScrollTracker';
import Anchor from '../../components/layout/Anchor';


// Data & Styles
import { sampleMangaData } from '../../data/sampleMangaData';
import { GeneralStyles, CardViewStyles } from '../../styles/global';

// Icons
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function DownLoadsScreen() {
    const [viewMode, setViewMode] = React.useState<ViewMode>('grid');
    const {isScrolling, handleScrollStart, handleScrollEnd } = useScrollTracker();

    const listRef = React.useRef<any>(null);

    const HeaderContent = (
        <>
            <Header />
            <SearchBar />
            <View style={[GeneralStyles.alignment, { justifyContent: 'space-between', marginTop: 10 }]}> 
                <Text style={GeneralStyles.h1}>Downloads</Text>
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
