// React & React Native
import React, { useState, useCallback } from 'react';
import { View, Text, Pressable, Alert, ActivityIndicator } from 'react-native';

// Navigation
import { useNavigation, NavigationProp, useFocusEffect } from '@react-navigation/native';
import { RootStackParamList } from '../../navigation/navigation';

// Components
import { useScrollTracker } from '../../hooks/useScrollTracker';
import Anchor from '../../components/layout/Anchor';
import CardView, { ViewMode, CardItem } from '../../components/cardLayouts/CardView';

// Services
import {
  getAllUpdates,
  getFavorites,
  removeFromRecentUpdates,
  clearRecentUpdates,
  MangaUpdate,
} from '../../services/favoritesService';

// Data & Styles
import { GeneralStyles, CardViewStyles } from '../../styles/global';
import { colors } from '../../styles/tokens';
import { useTheme } from '../../context/ThemeContext';

// Icons
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function RecentlyUpdated() {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const { isScrolling, handleScrollStart, handleScrollEnd } = useScrollTracker();
  const { colors: theme } = useTheme();
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const listRef = React.useRef<any>(null);
  const [updates, setUpdates] = useState<MangaUpdate[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [all, favs] = await Promise.all([getAllUpdates(), getFavorites()]);
      const favIds = new Set(favs.map((f) => f.mangaId));
      const filtered = all.filter((u) => favIds.has(u.mangaId));
      setUpdates(filtered);
    } catch (e) {
      console.error('Failed to load updates:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  // Card data
  const cardData: CardItem[] = React.useMemo(
    () =>
      updates.map((u) => ({
        id: u.mangaId,
        title: u.mangaTitle,
        imageUrl: u.mangaImage,
      })),
    [updates]
  );

  // Long-press: confirm and remove single item
  const handleLongPress = useCallback(
    (item: CardItem) => {
      Alert.alert(
        'Remove from view?',
        'Would you like to remove this item from your recently updated view?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Remove',
            style: 'destructive',
            onPress: async () => {
              await removeFromRecentUpdates(String(item.id));
              setUpdates((prev) => prev.filter((u) => u.mangaId !== String(item.id)));
            },
          },
        ],
      );
    },
    []
  );

  // Clear all
  const handleClearAll = useCallback(() => {
    Alert.alert(
      'Clear all?',
      'Remove all items from your recently updated history?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            await clearRecentUpdates();
            setUpdates([]);
          },
        },
      ],
    );
  }, []);

  const HeaderContent = (
    <>
      {/* Sleek header bar: back arrow + title + clear all */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 12,
          paddingVertical: 10,
          backgroundColor: theme.bg,
        }}
      >
        <Pressable
          onPress={() => navigation.goBack()}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
          accessibilityLabel="Go back"
        >
          <MaterialCommunityIcons name="chevron-left" size={26} color={colors.plum} />
          <Text style={{ color: colors.plum, fontWeight: '600', fontSize: 14 }}>Back</Text>
        </Pressable>

        <Pressable
          onPress={handleClearAll}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
          accessibilityLabel="Clear all"
        >
          <MaterialCommunityIcons name="delete-sweep-outline" size={20} color={colors.error} />
          <Text style={{ color: colors.error, fontWeight: '600', fontSize: 12 }}>Clear All</Text>
        </Pressable>
      </View>

      <View style={[GeneralStyles.alignment, { justifyContent: 'space-between', marginTop: 4 }]}>
        <Text style={GeneralStyles.h1}>Recently Updated</Text>
        <Pressable
          onPress={() => setViewMode(viewMode === 'grid' ? 'row' : 'grid')}
          accessibilityLabel="Toggle view"
        >
          <MaterialCommunityIcons
            name={viewMode === 'grid' ? 'view-grid' : 'view-agenda'}
            size={24}
            color={colors.plum}
          />
        </Pressable>
      </View>
    </>
  );

  return (
    <View style={[GeneralStyles.container, { backgroundColor: theme.bg }]}>
      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.bg }}>
          <ActivityIndicator size="large" color={colors.plum} />
        </View>
      ) : (
        <CardView
          listRef={listRef}
          data={cardData}
          viewMode={viewMode}
          onPressItem={(item) =>
            navigation.navigate('MangaInfoScreen', { mangaId: String(item.id) })
          }
          onLongPress={handleLongPress}
          headerComponent={HeaderContent}
          itemStyle={() => CardViewStyles.placeholder}
          onScrollBeginDrag={handleScrollStart}
          onScrollEndDrag={handleScrollEnd}
          onMomentumScrollEnd={handleScrollEnd}
          emptyMessage="No recently updated manga. Updates from your favorites will appear here."
        />
      )}
      <Anchor scrollRef={listRef} isScrolling={isScrolling} />
    </View>
  );
}
