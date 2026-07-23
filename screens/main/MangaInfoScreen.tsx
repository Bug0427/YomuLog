// screens/main/MangaInfoScreen.tsx
// Full manga details screen — displays metadata, chapter list,
// offline download status, and bookmark toggle.
// Fetches real data from MangaDex API using mangaId route param.

import React, { useState, useEffect, useCallback } from 'react';
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
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { fetchMangaById, getMangaFeed, type Manga, type MangaChapter } from '../../services/mangaAPI';
import {
  isFavorite,
  addFavorite,
  removeFavorite,
} from '../../services/favoritesService';
import {
  enqueueDownload,
  isChapterDownloaded,
  getChapterDownloadStatus,
  processAllDownloads,
  type DownloadStatus,
} from '../../services/downloadManager';
import { colors, spacing, borders } from '../../styles/tokens';
import { RootStackParamList } from '../../navigation/navigation';
import { updateChapterProgress } from '../../services/readingProgress';

// ─── Types ───────────────────────────────────────────────────────────

type MangaInfoRoute = RouteProp<RootStackParamList, 'MangaInfoScreen'>;

type ChapterWithDownload = MangaChapter & {
  isDownloaded: boolean;
  downloadStatus: DownloadStatus | null;
};

// ─── Constants ───────────────────────────────────────────────────────

const { width: SCREEN_W } = Dimensions.get('window');
const COVER_SIZE = SCREEN_W * 0.4;

// ─── Component ───────────────────────────────────────────────────────

export default function MangaInfoScreen() {
  const route = useRoute<MangaInfoRoute>();
  const navigation = useNavigation();
  const mangaId = route.params?.mangaId;

  const [manga, setManga] = useState<Manga | null>(null);
  const [chapters, setChapters] = useState<ChapterWithDownload[]>([]);
  const [loading, setLoading] = useState(true);
  const [bookmarked, setBookmarked] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [descExpanded, setDescExpanded] = useState(false);
  const [downloadingIds, setDownloadingIds] = useState<Set<string>>(new Set());

  // ─── Fetch data ──────────────────────────────────────────────────

  const loadData = useCallback(async () => {
    if (!mangaId) {
      setError('No manga ID provided.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const [mangaData, feedResult, fav] = await Promise.all([
        fetchMangaById(mangaId),
        getMangaFeed(mangaId, 100, 0),
        isFavorite(mangaId),
      ]);

      if (!mangaData) {
        setError('Failed to load manga details.');
        setLoading(false);
        return;
      }

      setManga(mangaData);
      setBookmarked(fav);

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
      setError('An unexpected error occurred.');
      console.warn('MangaInfoScreen load error:', e);
    } finally {
      setLoading(false);
    }
  }, [mangaId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ─── Handlers ────────────────────────────────────────────────────

  const handleToggleBookmark = async () => {
    if (!manga) return;
    try {
      if (bookmarked) {
        await removeFavorite(manga.id);
        setBookmarked(false);
      } else {
        await addFavorite(manga.id, manga.title, manga.coverImageUrl, manga.genres);
        setBookmarked(true);
      }
    } catch (e) {
      Alert.alert('Error', 'Failed to update favorites.');
    }
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

      // Trigger background processing
      processAllDownloads().catch(() => {});

      Alert.alert('Download Queued', `Chapter ${chapter.chapter} has been queued for download.`);

      // Refresh download status
      const status = await getChapterDownloadStatus(chapter.id);
      const downloaded = await isChapterDownloaded(chapter.id);
      setChapters((prev) =>
        prev.map((c) =>
          c.id === chapter.id ? { ...c, downloadStatus: status, isDownloaded: downloaded } : c,
        ),
      );
    } catch (e) {
      Alert.alert('Download Error', 'Failed to queue chapter for download.');
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

    // Record reading progress before navigating
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

  // ─── Status helpers ──────────────────────────────────────────────

  const statusColor = (status?: string): string => {
    switch (status) {
      case 'ongoing': return colors.success;
      case 'completed': return colors.deepPlum;
      case 'hiatus': return colors.splashText;
      case 'cancelled': return colors.error;
      default: return colors.mutedPlum;
    }
  };

  const downloadIcon = (ch: ChapterWithDownload, isDownloading: boolean): { name: keyof typeof Feather.glyphMap; color: string } => {
    if (isDownloading || ch.downloadStatus === 'downloading') {
      return { name: 'loader', color: colors.mutedPlum };
    }
    if (ch.isDownloaded || ch.downloadStatus === 'completed') {
      return { name: 'check-circle', color: colors.success };
    }
    if (ch.downloadStatus === 'failed') {
      return { name: 'alert-circle', color: colors.error };
    }
    return { name: 'download', color: colors.plum };
  };

  // ─── Loading state ───────────────────────────────────────────────

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.deepPlum} />
        <Text style={styles.loadingText}>Loading manga details...</Text>
      </View>
    );
  }

  // ─── Error state ─────────────────────────────────────────────────

  if (error || !manga) {
    return (
      <View style={styles.centered}>
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
    <View style={styles.screen}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header row: cover + title/metadata ────────────────── */}
        <View style={styles.headerRow}>
          {/* Cover image */}
          <View style={styles.coverWrap}>
            {manga.coverImageUrl ? (
              <Image
                source={{ uri: manga.coverImageUrl }}
                style={styles.cover}
                resizeMode="cover"
              />
            ) : (
              <View style={[styles.cover, styles.coverPlaceholder]}>
                <Feather name="image" size={32} color={colors.mutedPlum} />
              </View>
            )}
          </View>

          {/* Title + metadata */}
          <View style={styles.metaCol}>
            <Text style={styles.title} numberOfLines={3}>{manga.title}</Text>

            {manga.author ? (
              <Text style={styles.metaText}>
                <Text style={styles.metaLabel}>Author: </Text>
                {manga.author}
              </Text>
            ) : null}

            {manga.artist ? (
              <Text style={styles.metaText}>
                <Text style={styles.metaLabel}>Artist: </Text>
                {manga.artist}
              </Text>
            ) : null}

            {manga.year ? (
              <Text style={styles.metaText}>
                <Text style={styles.metaLabel}>Year: </Text>
                {manga.year}
              </Text>
            ) : null}

            {/* Status badge */}
            {manga.status ? (
              <View style={[styles.statusBadge, { backgroundColor: statusColor(manga.status) }]}>
                <Text style={styles.statusText}>
                  {manga.status.charAt(0).toUpperCase() + manga.status.slice(1)}
                </Text>
              </View>
            ) : null}

            {manga.contentRating ? (
              <Text style={styles.ratingText}>{manga.contentRating.toUpperCase()}</Text>
            ) : null}
          </View>
        </View>

        {/* ── Genres ─────────────────────────────────────────────── */}
        {manga.genres && manga.genres.length > 0 && (
          <View style={styles.genresWrap}>
            {manga.genres.map((genre, idx) => (
              <View key={`${genre}-${idx}`} style={styles.genreChip}>
                <Text style={styles.genreText}>{genre}</Text>
              </View>
            ))}
          </View>
        )}

        {/* ── Action buttons row ─────────────────────────────────── */}
        <View style={styles.actionsRow}>
          {/* Bookmark toggle */}
          <Pressable
            style={[styles.actionBtn, bookmarked && styles.actionBtnActive]}
            onPress={handleToggleBookmark}
          >
            <Feather
              name={bookmarked ? 'bookmark' : 'bookmark'}
              size={18}
              color={bookmarked ? colors.creamWhite : colors.plum}
            />
            <Text style={[styles.actionBtnText, bookmarked && styles.actionBtnTextActive]}>
              {bookmarked ? 'Bookmarked' : 'Bookmark'}
            </Text>
          </Pressable>
        </View>

        {/* ── Description ────────────────────────────────────────── */}
        {manga.description ? (
          <View style={styles.descSection}>
            <Text style={styles.sectionTitle}>Description</Text>
            <Text
              style={styles.descText}
              numberOfLines={descExpanded ? undefined : 4}
            >
              {manga.description}
            </Text>
            {manga.description.length > 200 && (
              <Pressable onPress={() => setDescExpanded((prev) => !prev)}>
                <Text style={styles.expandText}>
                  {descExpanded ? 'Show less' : 'Show more'}
                </Text>
              </Pressable>
            )}
          </View>
        ) : null}

        {/* ── Chapters section ───────────────────────────────────── */}
        <View style={styles.chaptersSection}>
          <Text style={styles.sectionTitle}>
            Chapters ({chapters.length})
          </Text>

          {chapters.length === 0 ? (
            <Text style={styles.emptyText}>No chapters available.</Text>
          ) : (
            chapters.map((chapter) => {
              const isDownloading = downloadingIds.has(chapter.id);
              const dlIcon = downloadIcon(chapter, isDownloading);

              return (
                <View key={chapter.id} style={styles.chapterRow}>
                  {/* Read button — tap to open reader */}
                  <Pressable
                    style={styles.chapterInfo}
                    onPress={() => handleReadChapter(chapter)}
                  >
                    <View style={styles.chapterNumBadge}>
                      <Text style={styles.chapterNumText}>
                        Ch. {chapter.chapter}
                      </Text>
                    </View>
                    <View style={styles.chapterTextCol}>
                      {chapter.title ? (
                        <Text style={styles.chapterTitle} numberOfLines={1}>
                          {chapter.title}
                        </Text>
                      ) : null}
                      {chapter.volume ? (
                        <Text style={styles.chapterVol}>Vol. {chapter.volume}</Text>
                      ) : null}
                      <Text style={styles.chapterMeta}>
                        {chapter.pages > 0 ? `${chapter.pages} pages` : ''}
                        {chapter.updatedAt
                          ? ` · ${new Date(chapter.updatedAt).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })}`
                          : ''}
                      </Text>
                    </View>
                  </Pressable>

                  {/* Download button */}
                  <Pressable
                    style={styles.downloadBtn}
                    onPress={() => handleDownloadChapter(chapter)}
                    disabled={isDownloading || chapter.downloadStatus === 'downloading'}
                  >
                    {isDownloading || chapter.downloadStatus === 'downloading' ? (
                      <ActivityIndicator size="small" color={colors.mutedPlum} />
                    ) : (
                      <Feather name={dlIcon.name} size={18} color={dlIcon.color} />
                    )}
                  </Pressable>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.lavender,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 52,
    paddingHorizontal: spacing.p16,
    paddingBottom: spacing.p24,
  },

  // ── Centered states ───────────────────────────────────────────
  centered: {
    flex: 1,
    backgroundColor: colors.lavender,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.p24,
    gap: spacing.p12,
  },
  loadingText: {
    fontSize: 15,
    color: colors.mutedPlum,
    fontWeight: '600',
    marginTop: spacing.p8,
  },
  errorText: {
    fontSize: 16,
    color: colors.error,
    fontWeight: '700',
    textAlign: 'center',
  },
  retryBtn: {
    paddingVertical: spacing.p10,
    paddingHorizontal: spacing.p24,
    backgroundColor: colors.plum,
    borderRadius: borders.br8,
    marginTop: spacing.p8,
  },
  retryText: {
    color: colors.creamWhite,
    fontWeight: '700',
    fontSize: 15,
  },

  // ── Header ────────────────────────────────────────────────────
  headerRow: {
    flexDirection: 'row',
    gap: spacing.p16,
    marginBottom: spacing.p16,
  },
  coverWrap: {
    borderRadius: borders.br8,
    overflow: 'hidden',
    borderWidth: borders.bw2,
    borderColor: colors.plum,
  },
  cover: {
    width: COVER_SIZE,
    height: COVER_SIZE * 1.45,
  },
  coverPlaceholder: {
    backgroundColor: colors.sand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metaCol: {
    flex: 1,
    justifyContent: 'flex-start',
    gap: spacing.p4,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.deepPlum,
    marginBottom: spacing.p4,
  },
  metaText: {
    fontSize: 13,
    color: colors.cocoa,
    lineHeight: 18,
  },
  metaLabel: {
    fontWeight: '700',
    color: colors.plum,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingVertical: 3,
    paddingHorizontal: spacing.p10,
    borderRadius: 10,
    marginTop: spacing.p4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.creamWhite,
  },
  ratingText: {
    fontSize: 11,
    color: colors.mutedPlum,
    fontWeight: '600',
    marginTop: 2,
  },

  // ── Genres ────────────────────────────────────────────────────
  genresWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.p6,
    marginBottom: spacing.p16,
  },
  genreChip: {
    paddingVertical: spacing.p4,
    paddingHorizontal: spacing.p10,
    backgroundColor: colors.sand,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.plum,
  },
  genreText: {
    fontSize: 12,
    color: colors.plum,
    fontWeight: '600',
  },

  // ── Action buttons ────────────────────────────────────────────
  actionsRow: {
    flexDirection: 'row',
    gap: spacing.p10,
    marginBottom: spacing.p16,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.p6,
    paddingVertical: spacing.p10,
    paddingHorizontal: spacing.p16,
    borderRadius: borders.br8,
    borderWidth: borders.bw2,
    borderColor: colors.plum,
    backgroundColor: colors.sand,
  },
  actionBtnActive: {
    backgroundColor: colors.plum,
    borderColor: colors.deepPlum,
  },
  actionBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.plum,
  },
  actionBtnTextActive: {
    color: colors.creamWhite,
  },

  // ── Description ───────────────────────────────────────────────
  descSection: {
    marginBottom: spacing.p16,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.deepPlum,
    marginBottom: spacing.p8,
  },
  descText: {
    fontSize: 14,
    color: colors.cocoa,
    lineHeight: 20,
  },
  expandText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.plum,
    marginTop: spacing.p4,
  },

  // ── Chapters ──────────────────────────────────────────────────
  chaptersSection: {
    marginBottom: spacing.p16,
  },
  emptyText: {
    fontSize: 14,
    color: colors.mutedPlum,
    fontStyle: 'italic',
  },
  chapterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.creamWhite,
    borderRadius: borders.br8,
    borderWidth: 1,
    borderColor: colors.plum,
    paddingVertical: spacing.p10,
    paddingHorizontal: spacing.p12,
    marginBottom: spacing.p8,
  },
  chapterInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.p10,
  },
  chapterNumBadge: {
    backgroundColor: colors.lavender,
    paddingVertical: spacing.p4,
    paddingHorizontal: spacing.p8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.plum,
  },
  chapterNumText: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.deepPlum,
  },
  chapterTextCol: {
    flex: 1,
  },
  chapterTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.plum,
  },
  chapterVol: {
    fontSize: 11,
    color: colors.mutedPlum,
    fontWeight: '600',
  },
  chapterMeta: {
    fontSize: 11,
    color: colors.mutedPlum,
    marginTop: 1,
  },
  downloadBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.sand,
    borderWidth: 1,
    borderColor: colors.plum,
  },
});
