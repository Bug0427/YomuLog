// React & React Native
import React, { useState, useCallback, useMemo, useRef } from 'react';
import { View, Text, Pressable, ActivityIndicator, Alert, Modal, TouchableWithoutFeedback } from 'react-native';

// Navigation
import { useNavigation, NavigationProp, useFocusEffect } from '@react-navigation/native';
import { RootStackParamList } from '../../navigation/navigation';

// Components
import Header from '../../components/layout/Header';
import SearchBar from '../../components/layout/SearchBar';
import Filter from '../../components/layout/Filter';
import MangaSlider from '../../components/cardLayouts/MangaSlider';
import CardView, { ViewMode, CardItem } from '../../components/cardLayouts/CardView';
import SelectionActionBar from '../../components/layout/SelectionActionBar';

// Scroll
import { useScrollTracker } from '../../hooks/useScrollTracker';
import Anchor from '../../components/layout/Anchor';

// Services
import {
  getFavorites,
  getRecentFavoritesUpdates,
  BookmarkedManga,
  MangaUpdate,
  removeFavorites,
  updateReadingStatusBatch,
  ReadingStatus,
} from '../../services/favoritesService';

// Styles
import { GeneralStyles, CardViewStyles } from '../../styles/global';

// Theme
import { useTheme } from '../../context/ThemeContext';

// Icons
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../../styles/tokens';

// Filters
import { FilterState, DEFAULT_FILTER_STATE, hasActiveFilters } from '../../utils/filters';

export default function LibraryScreen() {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const { isScrolling, handleScrollStart, handleScrollEnd } = useScrollTracker();
  const listRef = useRef<any>(null);
  const { colors: theme } = useTheme();

  // ── Data state ────────────────────────────────────────────────────
  const [favorites, setFavorites] = useState<BookmarkedManga[]>([]);
  const [recentUpdates, setRecentUpdates] = useState<MangaUpdate[]>([]);
  const [filterState, setFilterState] = useState<FilterState>(DEFAULT_FILTER_STATE);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [loading, setLoading] = useState(true);

  // ── Selection state ───────────────────────────────────────────────
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [refreshing, setRefreshing] = useState(false);

  // ── Fetch on focus ────────────────────────────────────────────────
  useFocusEffect(
    useCallback(() => {
      let active = true;
      async function load() {
        setLoading(true);
        try {
          const [favs, updates] = await Promise.all([
            getFavorites(),
            getRecentFavoritesUpdates(),
          ]);
          if (active) {
            setFavorites(favs);
            setRecentUpdates(updates);
          }
        } catch (e) {
          console.error('Failed to load library:', e);
        } finally {
          if (active) setLoading(false);
        }
      }
      load();
      return () => {
        active = false;
      };
    }, [])
  );

  // ── Selection handlers ─────────────────────────────────────────────
  const enterSelectionMode = useCallback((item: CardItem) => {
    setSelectionMode(true);
    setSelectedIds((prev) => new Set(prev).add(String(item.id)));
  }, []);

  const toggleSelection = useCallback((item: CardItem) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      const id = String(item.id);
      if (next.has(id)) {
        next.delete(id);
        // Exit selection mode if nothing is selected
        if (next.size === 0) {
          setSelectionMode(false);
        }
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const cancelSelection = useCallback(() => {
    setSelectionMode(false);
    setSelectedIds(new Set());
  }, []);

  const reloadFavorites = useCallback(async () => {
    try {
      const [favs, updates] = await Promise.all([
        getFavorites(),
        getRecentFavoritesUpdates(),
      ]);
      setFavorites(favs);
      setRecentUpdates(updates);
    } catch (e) {
      console.error('Failed to reload library:', e);
    }
  }, []);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await reloadFavorites();
    setRefreshing(false);
  }, [reloadFavorites]);

  const handleBatchAction = useCallback(
    (action: 'delete' | 'unlike' | 'markRead') => {
      const ids = Array.from(selectedIds);
      if (ids.length === 0) return;

      const titles = ids
        .map((id) => favorites.find((f) => f.mangaId === id)?.mangaTitle ?? 'Unknown')
        .slice(0, 3);
      const preview = titles.join(', ') + (ids.length > 3 ? ` and ${ids.length - 3} more` : '');

      const actionLabels: Record<string, string> = {
        delete: `Remove ${ids.length} manga from your library?`,
        unlike: `Unlike ${ids.length} manga?`,
        markRead: `Mark ${ids.length} manga as read?`,
      };

      Alert.alert(
        'Confirm',
        `${actionLabels[action]}\n\n${preview}`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: action === 'delete' ? 'Remove' : action === 'unlike' ? 'Unlike' : 'Mark Read',
            style: action === 'delete' ? 'destructive' : 'default',
            onPress: async () => {
              try {
                if (action === 'delete') {
                  await removeFavorites(ids);
                } else if (action === 'unlike') {
                  await removeFavorites(ids);
                } else if (action === 'markRead') {
                  await updateReadingStatusBatch(ids, 'completed');
                }
                cancelSelection();
                await reloadFavorites();
              } catch (e) {
                console.error(`Batch ${action} failed:`, e);
              }
            },
          },
        ],
      );
    },
    [selectedIds, favorites, cancelSelection, reloadFavorites],
  );

  // ── Card press handler (depends on selection mode) ─────────────────
  const handlePressItem = useCallback(
    (item: CardItem) => {
      if (selectionMode) {
        toggleSelection(item);
      } else {
        navigation.navigate('MangaInfoScreen', { mangaId: String(item.id) });
      }
    },
    [selectionMode, toggleSelection, navigation],
  );

  // ── Filter favorites by reading status ─────────────────────────────
  const filteredFavorites = useMemo(() => {
    if (!filterState.readingStatus) return favorites;
    return favorites.filter((item) => item.readingStatus === filterState.readingStatus);
  }, [favorites, filterState.readingStatus]);

  // ── Map to CardItem[] for CardView ────────────────────────────────
  const cardData: CardItem[] = useMemo(
    () =>
      filteredFavorites.map((fav) => ({
        id: fav.mangaId,
        title: fav.mangaTitle,
        image: fav.mangaImage,
      })),
    [filteredFavorites]
  );

  // ── Slider data (top 10 recent updates) ───────────────────────────
  const sliderData = useMemo(
    () =>
      recentUpdates.slice(0, 10).map((fav) => ({
        id: fav.mangaId,
        title: fav.mangaTitle,
        image: fav.mangaImage || '',
        onPress: () => navigation.navigate('MangaInfoScreen', { mangaId: fav.mangaId }),
      })),
    [recentUpdates, navigation]
  );

  // ── Header content ────────────────────────────────────────────────
  const filterLabel = filterState.readingStatus
    ? filterState.readingStatus.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
    : 'All';

  const HeaderContent = (
    <>
      <Header />
      <SearchBar onFilterPress={() => setShowFilterModal(true)} />

      {/* Active filter indicator */}
      {hasActiveFilters(filterState) && (
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, marginTop: 4, gap: 6 }}>
          <Text style={{ fontSize: 12, color: theme.textSecondary, fontWeight: '600' }}>
            Filtered: {filterState.readingStatus ? filterLabel : `${filterState.pubStatus.length} statuses`}
          </Text>
          <Pressable
            onPress={() => setFilterState(DEFAULT_FILTER_STATE)}
            style={{ paddingHorizontal: 8, paddingVertical: 2, backgroundColor: theme.borderLight, borderRadius: 10 }}
          >
            <Text style={{ color: theme.textPrimary, fontSize: 10, fontWeight: '700' }}>✕ Clear</Text>
          </Pressable>
        </View>
      )}

      <MangaSlider
        title="Updated"
        data={sliderData}
        onTitlePress={() => navigation.navigate('RecentlyUpdated' as never)}
        seeMoreOnPress={recentUpdates.length > 10 ? () => navigation.navigate('RecentlyUpdated' as never) : undefined}
      />

      <View style={[GeneralStyles.alignment, { justifyContent: 'space-between', marginTop: 10 }]}>
        <Text style={GeneralStyles.h1}>Library ({filteredFavorites.length})</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Pressable
            onPress={() => navigation.navigate('RecentlyReadScreen' as never)}
            accessibilityLabel="Recently read"
          >
            <MaterialCommunityIcons name="history" size={22} color="#463B54" />
          </Pressable>
          <Pressable
            onPress={() => setViewMode(viewMode === 'grid' ? 'row' : 'grid')}
            accessibilityLabel="Toggle view"
          >
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

  // ── Render ────────────────────────────────────────────────────────
  return (
    <View style={[GeneralStyles.section, { backgroundColor: theme.bg }]}>
      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.bg }}>
          <ActivityIndicator size="large" color="#463B54" />
        </View>
      ) : (
        <CardView
          listRef={listRef}
          data={cardData}
          viewMode={viewMode}
          onPressItem={handlePressItem}
          onLongPress={enterSelectionMode}
          selectionMode={selectionMode}
          selectedIds={selectedIds}
          headerComponent={HeaderContent}
          itemStyle={() => CardViewStyles.placeholder}
          onScrollBeginDrag={handleScrollStart}
          onMomentumScrollEnd={handleScrollEnd}
          refreshing={refreshing}
          onRefresh={handleRefresh}
          emptyMessage="No bookmarked manga yet. Start adding favorites!"
        />
      )}
      <Anchor scrollRef={listRef} isScrolling={isScrolling} />

      {/* ── Shared Filter Modal ────────────────────────────────── */}
      <Modal
        visible={showFilterModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowFilterModal(false)}
      >
        <TouchableWithoutFeedback onPress={() => setShowFilterModal(false)}>
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center', padding: 32 }}>
            <TouchableWithoutFeedback onPress={() => {}}>
              <View style={{
                backgroundColor: theme.bgCard,
                borderRadius: 16,
                borderWidth: 1,
                borderColor: theme.border,
                width: '100%',
                maxWidth: 360,
                overflow: 'hidden',
              }}>
                <View style={{ paddingHorizontal: 16, paddingTop: 16 }}>
                  <Text style={{ fontSize: 18, fontWeight: '800', color: theme.textPrimary, marginBottom: 4, textAlign: 'center' }}>
                    Filters
                  </Text>
                </View>
                <Filter
                  filter={filterState}
                  onChange={setFilterState}
                  showReadingStatus
                />
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Batch selection action bar */}
      <SelectionActionBar
        visible={selectionMode}
        selectedCount={selectedIds.size}
        onAction={handleBatchAction}
        onCancel={cancelSelection}
      />
    </View>
  );
}
