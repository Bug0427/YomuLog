// screens/main/MangaInfoScreen.tsx
// Full manga details screen — displays metadata, chapter list,
// offline download status, bookmark toggle, duplicate chapter
// filtering with source switching, alt titles, and similar manga slider.
// Fetches real data from MangaDex API using mangaId route param.
// (H-5 decomposition: child components live in components/manga/)
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { useRoute, useNavigation, RouteProp, NavigationProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import {
  fetchMangaById,
  getMangaFeed,
  fetchSimilarManga,
  type Manga,
  type MangaChapter,
  type SimilarManga,
} from '../../services/mangaAPI';
import {
  toggleFavorite,
  isFavorite,
} from '../../services/favoritesService';
import { onFavoriteAdded, onFavoriteRemoved } from '../../services/metadataClassification';
import {
  enqueueDownload,
  isChapterDownloaded,
  getChapterDownloadStatus,
  processAllDownloads,
  DownloadLimitError,
  type DownloadStatus,
} from '../../services/downloadManager';
import { colors } from '../../styles/tokens';
import { RootStackParamList } from '../../navigation/navigation';
import { updateChapterProgress } from '../../services/readingProgress';
import { useTheme, type ThemeColors } from '../../context/ThemeContext';
import { openPremiumCheckout } from '../../services/stripeService';
import PremiumUpgradeModal from '../../components/layout/PremiumUpgradeModal';
import MangaActionBar from '../../components/manga/MangaActionBar';
import MangaInfoHeader from '../../components/manga/MangaInfoHeader';
import MangaGenres from '../../components/manga/MangaGenres';
import ChapterListSection from '../../components/manga/ChapterListSection';
import SimilarMangaSlider from '../../components/manga/SimilarMangaSlider';
import { groupChapters } from '../../components/manga/chapterGrouping';
import type { ChapterWithDownload } from '../../components/manga/types';

// ─── Types ───────────────────────────────────────────────────────────

type MangaInfoRoute = RouteProp<RootStackParamList, 'MangaInfoScreen'>;

// ─── Constants ───────────────────────────────────────────────────────

const { width: SCREEN_W } = Dimensions.get('window');
const COVER_SIZE = SCREEN_W * 0.4;
const HEADER_HEIGHT = 56;
const SIMILAR_ITEM_W = 110;

// ─── Component ───────────────────────────────────────────────────────

export default function MangaInfoScreen() {
  const route = useRoute<MangaInfoRoute>();
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const mangaId = route.params?.mangaId;
  const { colors: theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const insets = useSafeAreaInsets();
  const [showPremiumModal, setShowPremiumModal] = useState(false);

  const [manga, setManga] = useState<Manga | null>(null);
  const [chapters, setChapters] = useState<ChapterWithDownload[]>([]);
  const [loading, setLoading] = useState(true);
  const [bookmarked, setBookmarked] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [chaptersError, setChaptersError] = useState<string | null>(null);
  const [chaptersLoading, setChaptersLoading] = useState(false);
  const [languageFallback, setLanguageFallback] = useState(false);
  const [descExpanded, setDescExpanded] = useState(false);
  const [downloadingIds, setDownloadingIds] = useState<Set<string>>(new Set());
  const [similar, setSimilar] = useState<SimilarManga[]>([]);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  // ─── Fetch data ──────────────────────────────────────────────────

  const loadData = useCallback(async () => {
    if (!mangaId) {
      setError('No manga ID provided.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    setChaptersError(null);

    try {
      const [mangaData, fav, similarData] = await Promise.all([
        fetchMangaById(mangaId),
        isFavorite(mangaId),
        fetchSimilarManga(mangaId, 10),
      ]);

      if (!mangaData) {
        setError('Failed to load manga details.');
        setLoading(false);
        return;
      }

      setManga(mangaData);
      setBookmarked(fav);
      setSimilar(similarData);
      setLoading(false);

      // Load chapters separately so manga details render immediately
      await loadChapters();
    } catch (e) {
      setError('An unexpected error occurred.');
      console.warn('MangaInfoScreen load error:', e);
      setLoading(false);
    }
  }, [mangaId]);

  const loadChapters = useCallback(async () => {
    if (!mangaId) return;

    setChaptersLoading(true);
    setChaptersError(null);
    setLanguageFallback(false);

    try {
      const feedResult = await getMangaFeed(mangaId, 100, 0);

      if (feedResult.data.length === 0) {
        setChapters([]);
        setChaptersLoading(false);
        return;
      }

      if (feedResult.languageFallback) {
        setLanguageFallback(true);
      }

      // Check download status for each chapter
      const chs: ChapterWithDownload[] = await Promise.all(
        feedResult.data.map(async (ch) => {
          const [downloaded, status] = await Promise.all([
            isChapterDownloaded(ch.id),
            getChapterDownloadStatus(ch.id),
          ]);
          return { ...ch, isDownloaded: downloaded, downloadStatus: status };
        }),
      );

      setChapters(chs);
    } catch (e) {
      console.warn('MangaInfoScreen chapter load error:', e);
      setChaptersError('Failed to load chapters. Check your connection and try again.');
    } finally {
      setChaptersLoading(false);
    }
  }, [mangaId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ─── Chapter groups (deduplicated) ───────────────────────────────

  const chapterGroups = useMemo(() => groupChapters(chapters), [chapters]);
  const duplicateCount = chapters.length - chapterGroups.length;

  // ─── Handlers ────────────────────────────────────────────────────

  const handleToggleBookmark = async () => {
    if (!manga) return;
    try {
      const newState = await toggleFavorite(
        manga.id,
        manga.title,
        manga.coverImageUrl,
        manga.genres,
      );
      setBookmarked(newState);
      if (newState) {
        onFavoriteAdded(manga.id, manga.title, manga.genres);
      } else {
        onFavoriteRemoved(manga.id);
      }
    } catch (e) {
      console.warn('handleToggleBookmark error:', e);
      Alert.alert('Error', 'Failed to update favorites. Please try again.');
    }
  };

  const handleDownloadAll = async () => {
    if (!manga || chapters.length === 0) {
      Alert.alert('No Chapters', 'No chapters available to download.');
      return;
    }

    Alert.alert(
      'Download All',
      `Queue all ${chapters.length} chapters for download?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Download',
          onPress: async () => {
            try {
              const ids = new Set<string>();
              for (const ch of chapters) {
                if (!ch.isDownloaded && ch.downloadStatus !== 'downloading') {
                  ids.add(ch.id);
                }
              }
              if (ids.size === 0) {
                Alert.alert('Info', 'All chapters are already downloaded or queued.');
                return;
              }

              setDownloadingIds(ids);

              for (const ch of chapters) {
                if (ids.has(ch.id)) {
                  await enqueueDownload(
                    ch.id,
                    manga.id,
                    manga.title,
                    ch.chapter,
                    ch.title,
                  );
                }
              }

              processAllDownloads().catch(() => {});
              Alert.alert('Queued', `${ids.size} chapters queued for download.`);

              // Refresh statuses
              const refreshed = await Promise.all(
                chapters.map(async (ch) => {
                  if (!ids.has(ch.id)) return ch;
                  const [downloaded, status] = await Promise.all([
                    isChapterDownloaded(ch.id),
                    getChapterDownloadStatus(ch.id),
                  ]);
                  return { ...ch, isDownloaded: downloaded, downloadStatus: status };
                }),
              );
              setChapters(refreshed);
            } catch (e) {
              if (e instanceof DownloadLimitError) {
                setShowPremiumModal(true);
              } else {
                Alert.alert('Error', 'Failed to queue downloads.');
              }
            } finally {
              setDownloadingIds(new Set());
            }
          },
        },
      ],
    );
  };

  const handleDownloadChapter = async (chapter: ChapterWithDownload) => {
    if (!manga) return;

    try {
      setDownloadingIds((prev) => new Set(prev).add(chapter.id));

      await enqueueDownload(
        chapter.id,
        manga.id,
        manga.title,
        chapter.chapter,
        chapter.title,
      );

      processAllDownloads().catch(() => {});

      // Refresh download status
      const status = await getChapterDownloadStatus(chapter.id);
      const downloaded = await isChapterDownloaded(chapter.id);
      setChapters((prev) =>
        prev.map((c) =>
          c.id === chapter.id ? { ...c, downloadStatus: status, isDownloaded: downloaded } : c,
        ),
      );
    } catch (e) {
      if (e instanceof DownloadLimitError) {
        setShowPremiumModal(true);
      } else {
        Alert.alert('Download Error', 'Failed to queue chapter for download.');
      }
    } finally {
      setDownloadingIds((prev) => {
        const next = new Set(prev);
        next.delete(chapter.id);
        return next;
      });
    }
  };

  const handleReadChapter = async (chapter: ChapterWithDownload) => {
    if (!manga) return;

    await updateChapterProgress({
      chapterId: chapter.id,
      mangaId: manga.id,
      mangaTitle: manga.title,
      mangaImage: manga.coverImageUrl,
      chapterTitle: chapter.title ?? `Chapter ${chapter.chapter}`,
      chapterNumber: parseFloat(chapter.chapter) || 0,
      scrollPercentage: 0,
    });

    navigation.navigate('ReaderScreen', {
      chapterId: chapter.id,
      mangaId: manga.id,
      chapterNum: chapter.chapter,
    });
  };

  // Toggle alternate source dropdown for a chapter group
  const toggleGroupExpanded = (chapterNum: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(chapterNum)) next.delete(chapterNum);
      else next.add(chapterNum);
      return next;
    });
  };

  // ─── Loading state ───────────────────────────────────────────────

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.bg }]}>
        <ActivityIndicator size="large" color={theme.accent} />
        <Text style={styles.loadingText}>Loading manga details...</Text>
      </View>
    );
  }

  // ─── Error state ─────────────────────────────────────────────────

  if (error || !manga) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.bg }]}>
        <Feather name="alert-triangle" size={40} color={colors.error} />
        <Text style={styles.errorText}>{error ?? 'Manga not found.'}</Text>
        <Pressable style={styles.retryBtn} onPress={loadData}>
          <Text style={styles.retryText}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  // ─── Main render ─────────────────────────────────────────────────

  return (
    <View style={[styles.screen, { backgroundColor: theme.bg }]}>
      {/* Status bar background fill — keeps the area above the header opaque */}
      <View style={[styles.statusBarBg, { height: insets.top, backgroundColor: theme.headerBg }]} />

      {/* ── Fixed Action Bar (below safe area) ──────────────────── */}
      <MangaActionBar
        title={manga.title}
        bookmarked={bookmarked}
        onBack={() => navigation.goBack()}
        onDownloadAll={handleDownloadAll}
        onToggleBookmark={handleToggleBookmark}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + HEADER_HEIGHT + 10 },
        ]}
        showsVerticalScrollIndicator={false}
        pointerEvents="box-none"
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Header row: cover + title/metadata ────────────────── */}
        <MangaInfoHeader manga={manga} coverSize={COVER_SIZE} />

        {/* ── Genres / alt titles / description ─────────────────── */}
        <MangaGenres
          manga={manga}
          descExpanded={descExpanded}
          onToggleDesc={() => setDescExpanded((prev) => !prev)}
        />

        {/* ── Chapters section ───────────────────────────────────── */}
        <ChapterListSection
          chapterGroups={chapterGroups}
          duplicateCount={duplicateCount}
          languageFallback={languageFallback}
          chaptersLoading={chaptersLoading}
          chaptersError={chaptersError}
          downloadingIds={downloadingIds}
          expandedGroups={expandedGroups}
          onLoadChapters={loadChapters}
          onReadChapter={handleReadChapter}
          onDownloadChapter={handleDownloadChapter}
          onToggleGroupExpanded={toggleGroupExpanded}
        />

        {/* ── Similar Manga Slider ────────────────────────────────── */}
        {similar.length > 0 && (
          <SimilarMangaSlider
            similar={similar}
            itemWidth={SIMILAR_ITEM_W}
            onPressManga={(id) => navigation.navigate('MangaInfoScreen', { mangaId: id })}
          />
        )}

        {/* Bottom spacer for safe area */}
        <View style={{ height: 40 }} />
      </ScrollView>
      <PremiumUpgradeModal
        visible={showPremiumModal}
        onClose={() => setShowPremiumModal(false)}
        onUpgrade={openPremiumCheckout}
        source="modal:manga_info"
      />
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: c.bg,
  },

  // ── Header bar ──────────────────────────────────────────────────
  statusBarBg: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 101,
  },

  // ── Scroll ──────────────────────────────────────────────────────
  scroll: {
    flex: 1,
  },
  scrollContent: {
    // paddingTop set dynamically via useSafeAreaInsets
    paddingHorizontal: 16,
    paddingBottom: 24,
  },

  // ── Centered states ───────────────────────────────────────────
  centered: {
    flex: 1,
    backgroundColor: c.bg,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 12,
  },
  loadingText: {
    fontSize: 15,
    color: c.textMuted,
    fontWeight: '600',
    marginTop: 8,
  },
  errorText: {
    fontSize: 16,
    color: c.error,
    fontWeight: '700',
    textAlign: 'center',
  },
  retryBtn: {
    paddingVertical: 10,
    paddingHorizontal: 24,
    backgroundColor: c.accentDark,
    borderRadius: 8,
    marginTop: 8,
  },
  retryText: {
    color: colors.white,
    fontWeight: '700',
    fontSize: 15,
  },
});