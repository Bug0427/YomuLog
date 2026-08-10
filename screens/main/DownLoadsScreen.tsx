// screens/main/DownLoadsScreen.tsx
// Displays downloaded chapters and download queue with progress.
// Tapping a downloaded chapter navigates to ReaderScreen.

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, Pressable, FlatList, Modal, TouchableWithoutFeedback } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { RootStackParamList } from '../../navigation/navigation';
import Header from '../../components/layout/Header';
import SearchBar from '../../components/layout/SearchBar';
import Filter from '../../components/layout/Filter';
import { useScrollTracker } from '../../hooks/useScrollTracker';
import Anchor from '../../components/layout/Anchor';
import { GeneralStyles, CardViewStyles } from '../../styles/global';
import { colors, spacing, t } from '../../styles/tokens';
import { useTheme } from '../../context/ThemeContext';
import { usePremium } from '../../context/PremiumContext';
import PremiumUpgradeModal from '../../components/layout/PremiumUpgradeModal';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Feather } from '@expo/vector-icons';
import {
  getDownloadedChapters,
  getDownloadQueue,
  DownloadJob,
  DownloadedChapter,
  processAllDownloads,
  retryFailedDownloads,
  removeJob,
  clearCompleted,
  getDownloadStats,
} from '../../services/downloadManager';

import { FilterState, DEFAULT_FILTER_STATE, hasActiveFilters } from '../../utils/filters';
import { getFavorites, BookmarkedManga } from '../../services/favoritesService';

// ─── Stat box component ────────────────────────────────────────────

function StatBox({ label, value }: { label: string; value: number }) {
  const { colors: theme } = useTheme();
  return (
    <SafeAreaView style={[{ flex: 1 }, { backgroundColor: theme.bg }]}>
    <View style={{ alignItems: 'center' }}>
        <Text style={{ fontSize: 20, fontWeight: '700', color: theme.accentDark }}>
          {value}
        </Text>
        <Text style={{ fontSize: 11, color: theme.textMuted }}>{label}</Text>
      </View>
    </SafeAreaView>
  );
}

// ─── Download job row ──────────────────────────────────────────────

function JobRow({ item, onRemove }: { item: DownloadJob; onRemove: (id: string) => void }) {
  const { colors: theme } = useTheme();
  return (
    <View style={[CardViewStyles.rowCard, { marginBottom: 6, alignItems: 'center', backgroundColor: theme.bgCard }]}>
      <View style={[CardViewStyles.rowTextWrap, { flex: 1 }]}>
        <Text style={[CardViewStyles.rowTitle, { color: theme.textSecondary }]} numberOfLines={1}>
          {item.mangaTitle} · Ch. {item.chapterNumber}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
          <View
            style={{
              paddingHorizontal: 6,
              paddingVertical: 2,
              borderRadius: 4,
              backgroundColor:
                item.status === 'completed' ? theme.success :
                item.status === 'failed' ? theme.error :
                item.status === 'downloading' ? theme.bg :
                theme.bgSecondary,
            }}
          >
            <Text style={{ fontSize: 10, fontWeight: '600', color: theme.textSecondary }}>
              {item.status === 'downloading' ? `${item.progress}%` : item.status}
            </Text>
          </View>
          {item.status === 'downloading' && (
            <View
              style={{
                flex: 1,
                height: 4,
                borderRadius: 2,
                backgroundColor: theme.bgSecondary,
                overflow: 'hidden',
              }}
            >
              <View
                style={{
                  width: `${item.progress}%`,
                  height: '100%',
                  backgroundColor: theme.accent,
                  borderRadius: 2,
                }}
              />
            </View>
          )}
        </View>
        {item.errorMessage && (
          <Text style={{ fontSize: 10, color: theme.error, marginTop: 2 }} numberOfLines={1}>
            {item.errorMessage}
          </Text>
        )}
      </View>
      {item.status === 'failed' && (
        <Pressable onPress={() => onRemove(item.jobId)}>
          <MaterialCommunityIcons name="close" size={18} color={theme.error} />
        </Pressable>
      )}
    </View>
  );
}

// ─── Downloaded chapter row (navigates to ReaderScreen on tap) ─────

function DownloadedRow({
  item,
  onPress,
}: {
  item: DownloadedChapter;
  onPress: (item: DownloadedChapter) => void;
}) {
  const { colors: theme } = useTheme();
  return (
    <Pressable onPress={() => onPress(item)}>
      <View style={[CardViewStyles.rowCard, { marginBottom: 6, alignItems: 'center', backgroundColor: theme.bgCard }]}>
        <View
          style={[
            CardViewStyles.rowMediaBase,
            { width: 40, height: 56, backgroundColor: theme.bgCard },
          ]}
        />
        <View style={[CardViewStyles.rowTextWrap, { flex: 1 }]}>
          <Text style={[CardViewStyles.rowTitle, { color: theme.textSecondary }]} numberOfLines={1}>
            {item.mangaTitle}
          </Text>
          <Text style={{ fontSize: 12, color: theme.textMuted, marginTop: 2 }}>
            Ch. {item.chapterNumber} · {item.totalPages} pages
          </Text>
        </View>
        <MaterialCommunityIcons name="check-circle" size={18} color={theme.success} />
      </View>
    </Pressable>
  );
}

// ─── Main screen ───────────────────────────────────────────────────

export default function DownLoadsScreen() {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const { isScrolling, handleScrollStart, handleScrollEnd } = useScrollTracker();
  const { colors: theme } = useTheme();
  const { isPremium } = usePremium();
  const scrollRef = React.useRef<any>(null);

  const [downloaded, setDownloaded] = useState<DownloadedChapter[]>([]);
  const [queue, setQueue] = useState<DownloadJob[]>([]);
  const [favorites, setFavorites] = useState<BookmarkedManga[]>([]);
  const [filterState, setFilterState] = useState<FilterState>(DEFAULT_FILTER_STATE);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [stats, setStats] = useState({ total: 0, completed: 0, failed: 0, pending: 0, downloading: 0 });
  const [processing, setProcessing] = useState(false);

  const refresh = useCallback(async () => {
    const [dl, q, s, favs] = await Promise.all([
      getDownloadedChapters(),
      getDownloadQueue(),
      getDownloadStats(),
      getFavorites(),
    ]);
    dl.sort((a, b) => b.downloadedAt.localeCompare(a.downloadedAt));
    setDownloaded(dl);
    setQueue(q);
    setFavorites(favs);
    setStats(s);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  // ── Filter downloaded chapters by reading status (cross-reference favorites) ──
  const filteredDownloaded = useMemo(() => {
    if (!filterState.readingStatus) return downloaded;
    const favMap = new Map(favorites.map((f) => [f.mangaId, f.readingStatus]));
    return downloaded.filter((ch) => favMap.get(ch.mangaId) === filterState.readingStatus);
  }, [downloaded, favorites, filterState.readingStatus]);

  const handleProcessAll = useCallback(async () => {
    setProcessing(true);
    try {
      await processAllDownloads();
      await refresh();
    } finally {
      setProcessing(false);
    }
  }, [refresh]);

  const handleRetry = useCallback(async () => {
    setProcessing(true);
    try {
      await retryFailedDownloads();
      await refresh();
    } finally {
      setProcessing(false);
    }
  }, [refresh]);

  const handleRemove = useCallback(async (jobId: string) => {
    await removeJob(jobId);
    await refresh();
  }, [refresh]);

  const handleClearCompleted = useCallback(async () => {
    await clearCompleted();
    await refresh();
  }, [refresh]);

  /** Navigate to ReaderScreen when tapping a downloaded chapter. */
  const handleChapterPress = useCallback(
    (chapter: DownloadedChapter) => {
      navigation.navigate('ReaderScreen', {
        chapterId: chapter.chapterId,
        mangaId: chapter.mangaId,
        chapterNum: chapter.chapterNumber,
      });
    },
    [navigation],
  );

  const hasActiveDownload = stats.pending > 0 || stats.downloading > 0 || stats.failed > 0;
  const isEmpty = downloaded.length === 0 && queue.length === 0;

  return (
    <View style={[GeneralStyles.container, { backgroundColor: theme.bg }]}>
      <FlatList
        ref={scrollRef as any}
        data={filteredDownloaded}
        keyExtractor={(item) => item.chapterId}
        renderItem={({ item }) => <DownloadedRow item={item} onPress={handleChapterPress} />}
        onScrollBeginDrag={handleScrollStart}
        onScrollEndDrag={handleScrollEnd}
        onMomentumScrollEnd={handleScrollEnd}
        contentContainerStyle={{ paddingBottom: spacing.p24 }}
        ListHeaderComponent={
          <>
            <Header />
            <SearchBar onFilterPress={() => setShowFilterModal(true)} />
            <View style={[GeneralStyles.alignment, { justifyContent: 'space-between', marginTop: 10 }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={GeneralStyles.h1}>Downloads</Text>
                {!isPremium && (
                  <Pressable
                    onPress={() => setShowPremiumModal(true)}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      backgroundColor: theme.accent + '22',
                      borderRadius: 6,
                      paddingHorizontal: spacing.p6,
                      paddingVertical: spacing.p3,
                      gap: 3,
                    }}
                  >
                    <Feather name="lock" size={10} color={theme.accent} />
                    <Text style={{ fontSize: 9, fontWeight: '700', color: theme.accent, textTransform: 'uppercase' }}>
                      Premium
                    </Text>
                  </Pressable>
                )}
              </View>
            </View>

            {/* Stats row */}
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-around',
                paddingVertical: spacing.p10,
                marginHorizontal: spacing.p12,
                backgroundColor: theme.bgSecondary,
                borderRadius: 8,
                marginBottom: spacing.p10,
              }}
            >
              <StatBox label="Downloaded" value={stats.completed} />
              <StatBox label="Pending" value={stats.pending} />
              <StatBox label="Failed" value={stats.failed} />
            </View>

            {/* Action buttons */}
            {hasActiveDownload && (
              <View
                style={{
                  flexDirection: 'row',
                  gap: 8,
                  paddingHorizontal: spacing.p12,
                  marginBottom: spacing.p10,
                }}
              >
                <Pressable
                  onPress={handleProcessAll}
                  disabled={processing}
                  style={{
                    flex: 1,
                    paddingVertical: 8,
                    backgroundColor: theme.accentDark,
                    borderRadius: 6,
                    alignItems: 'center',
                    opacity: processing ? 0.6 : 1,
                  }}
                >
                  <Text style={{ color: theme.textInverse, fontWeight: '600', fontSize: 13 }}>
                    {processing ? 'Processing…' : 'Download All'}
                  </Text>
                </Pressable>
                {stats.failed > 0 && (
                  <Pressable
                    onPress={handleRetry}
                    disabled={processing}
                    style={{
                      flex: 1,
                      paddingVertical: 8,
                      backgroundColor: theme.error,
                      borderRadius: 6,
                      alignItems: 'center',
                      opacity: processing ? 0.6 : 1,
                    }}
                  >
                    <Text style={{ color: theme.textInverse, fontWeight: '600', fontSize: 13 }}>
                      Retry Failed
                    </Text>
                  </Pressable>
                )}
                <Pressable
                  onPress={handleClearCompleted}
                  style={{
                    paddingVertical: 8,
                    paddingHorizontal: 12,
                    backgroundColor: theme.bgCard,
                    borderRadius: 6,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <MaterialCommunityIcons name="delete-sweep" size={18} color={theme.accentDark} />
                </Pressable>
              </View>
            )}

            {/* Manage Storage link */}
            <Pressable
              onPress={() => navigation.navigate('ManageDownloadsScreen')}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                paddingVertical: spacing.p8,
                marginHorizontal: spacing.p12,
                marginBottom: spacing.p10,
                backgroundColor: theme.bgCard,
                borderRadius: 8,
                borderWidth: 1,
                borderColor: theme.border,
              }}
            >
              <Feather name="hard-drive" size={14} color={theme.textMuted} />
              <Text style={{ fontSize: 12, color: theme.textMuted, fontWeight: '600' }}>
                Manage Storage
              </Text>
            </Pressable>

            {/* Queue section */}
            {queue.length > 0 && (
              <>
                <Text style={[t.h2, { marginHorizontal: spacing.p12, marginTop: spacing.p8, marginBottom: spacing.p6 }]}>
                                Queue ({queue.length})
                              </Text>
                {queue.map((job) => (
                  <View key={job.jobId} style={{ marginHorizontal: spacing.p12 }}>
                    <JobRow item={job} onRemove={handleRemove} />
                  </View>
                ))}
              </>
            )}

            {/* Section header for downloaded */}
            {downloaded.length > 0 && (
              <Text style={[t.h2, { marginHorizontal: spacing.p12, marginTop: spacing.p8, marginBottom: spacing.p6 }]}>
                Saved Chapters ({downloaded.length})
              </Text>
            )}
          </>
        }
        ListEmptyComponent={
          filteredDownloaded.length === 0 && downloaded.length > 0 ? (
            <Text style={{ fontSize: 14, color: theme.textMuted, fontStyle: 'italic', textAlign: 'center', marginTop: 40 }}>
              No downloaded chapters match the selected filter.
            </Text>
          ) : !isEmpty ? null : (
            <Text style={{ fontSize: 14, color: theme.textMuted, fontStyle: 'italic', textAlign: 'center', marginTop: 40 }}>
              No downloads yet. Open a manga and save chapters for offline reading.
            </Text>
          )
        }
      />
      <Anchor scrollRef={scrollRef} isScrolling={isScrolling} />

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
                maxHeight: '85%',
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

      <PremiumUpgradeModal
        visible={showPremiumModal}
        onClose={() => setShowPremiumModal(false)}
      />
    </View>
  );
}