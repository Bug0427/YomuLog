// React & React Native
import React from 'react';
import { View, Text, Pressable } from 'react-native';

// Navigation
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { RootStackParamList } from '../../navigation/navigation';

// Components
import { useScrollTracker } from '../../hooks/useScrollTracker';
import Anchor from '../../components/layout/Anchor';
import CardView, { ViewMode } from '../../components/cardLayouts/CardView';

// Data & Styles
import { sampleMangaData } from '../../data/sampleMangaData';
import { GeneralStyles } from '../../styles/global';
import { UpdatedStyles } from '../../styles/IndependentStyles/UpdatedStyles';

// Icons
import { MaterialCommunityIcons } from '@expo/vector-icons';


export default function RecentlyUpdated() {
    const navigation = useNavigation<NavigationProp<RootStackParamList>>();
    const { isScrolling, handleScrollStart, handleScrollEnd } = useScrollTracker();
    const [viewMode, setViewMode] = React.useState<ViewMode>('grid');
    const listRef = React.useRef<any>(null);
    const HeaderContent = (
        <>
        <View style={[UpdatedStyles.container,]}>
            <Pressable style={[UpdatedStyles.navItem,{alignItems: 'flex-start'}]}　
                onPress={() => navigation.goBack()}>
            </Pressable>
            <Pressable style={[UpdatedStyles.navItem, { borderRightWidth: 2, borderLeftWidth: 0 }]}　
                onPress={() => console.log("Clear pressed")}>
            </Pressable>
        </View>
        <View style={[GeneralStyles.alignment, { justifyContent: 'space-between', marginTop: 10}]}> 
            <Text style={GeneralStyles.h1}>Recently Updated</Text>
            <Pressable onPress={() => setViewMode(viewMode === 'grid' ? 'row' : 'grid')} accessibilityLabel="Toggle view">
                <MaterialCommunityIcons
                name={viewMode === 'grid' ? 'view-grid' : 'view-agenda'}
                size={24}
                color="#463B54"
                />
            </Pressable>
        </View>
        </>

    )
    
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
            />
            <Anchor scrollRef={listRef} isScrolling={isScrolling} />
        </View>
  );
}