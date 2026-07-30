// screens/main/MangaInfoScreen.tsx
// Full manga details screen — displays metadata, chapter list,
// offline download status, bookmark toggle, duplicate chapter
// filtering with source switching, alt titles, and similar manga slider.
// Fetches real data from MangaDex API using mangaId route param.

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
  FlatList,
} from 'react-native';
import { useRoute, useNavigation, RouteProp, NavigationProp } from '@react-navigation/native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
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
import { useTheme } from '../../context/ThemeContext';

// ─── Types ───────────────────────────────────────────────────────────

type MangaInfoRoute = RouteProp<RootStackParamList, 'MangaInfoScreen'>;

type ChapterWithDownload = MangaChapter & {
  isDownloaded: boolean;
  downloadStatus: DownloadStatus | null;
};

/** A grouped set: primary chapter + alternate sources */
type ChapterGroup = {
  chapterNum: string;
  primary: ChapterWithDownload;
  alternates: ChapterWithDownload[];
};

// ─── Constants ───────────────────────────────────────────────────────

const { width: SCREEN_W } = Dimensions.get('window');
const COVER_SIZE = SCREEN_W * 0.4;
const HEADER_HEIGHT = 56;
const SIMILAR_ITEM_W = 110;

// ─── Duplicate scoring ───────────────────────────────────────────────

/** Score a chapter for primary selection: title > scanlation group > pages */
function scoreChapter(ch: ChapterWithDownload): number {
  let s = 0;
  if (ch.title && ch.title.trim().length > 0) s += 15;
  if (ch.scanlationGroup && ch.scanlationGroup.trim().length > 0) s += 5;
  s += Math.min(ch.pages, 50) * 0.1; // cap at +5
  // Prefer English scanlations
  if (ch.language === 'en') s += 2;
  return s;
}

/** Group chapters by chapter number, selecting the highest-scored as primary */
function groupChapters(chapters: ChapterWithDownload[]): ChapterGroup[] {
  const map = new Map<string, ChapterWithDownload[]>();
  for (const ch of chapters) {
    const num = ch.chapter;
    if (!map.has(num)) map.set(num, []);
    map.get(num)!.push(ch);
  }

  const groups: ChapterGroup[] = [];
  for (const [, chs] of map) {
    // Sort by score descending
    chs.sort((a, b) => scoreChapter(b) - scoreChapter(a));
    groups.push({
      chapterNum: chs[0].chapter,
      primary: chs[0],
      alternates: chs.slice(1),
    });
  }
  // Sort groups by chapter number descending (newest first)
  groups.sort((a, b) => {
    const na = parseFloat(a.chapterNum) || 0;
    const nb = parseFloat(b.chapterNum) || 0;
    return nb - na;
  });
  return groups;
}

// ─── Component ───────────────────────────────────────────────────────

export default function MangaInfoScreen() {
  const route = useRoute<MangaInfoRoute>();
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const mangaId = route.params?.mangaId;
  const { colors: theme } = useTheme();

  const [manga, setManga] = useState<Manga | null>(null);
  const [chapters, setChapters] = useState<ChapterWithDownload[]>([]);
  const [loading, setLoading] = useState(true);
  const [bookmarked, setBookmarked] = useState(false);
  const [error, setError] = useState<string | null>(null);
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

    try {
      const [mangaData, feedResult, fav, similarData] = await Promise.all([
        fetchMangaById(mangaId),
        getMangaFeed(mangaId, 100, 0),
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
    } catch (e) {
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
              Alert.alert('Error', 'Failed to queue downloads.');
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

  const downloadIcon = (
    ch: ChapterWithDownload,
    isDownloading: boolean,
  ): { name: keyof typeof Feather.glyphMap; color: string } => {
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
      <View style={[styles.centered, { backgroundColor: theme.bg }]}>
        <ActivityIndicator size="large" color={colors.deepPlum} />
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
      {/* ── Fixed Header Bar ──────────────────────────────────────── */}
      <View style={[styles.headerBar, { backgroundColor: theme.headerBg, borderBottomColor: theme.border }]}>
        {/* Back */}
        <Pressable
          style={styles.headerBtn}
          onPress={() => navigation.goBack()}
          accessibilityLabel="Go back"
        >
          <Feather name="arrow-left" size={22} color={theme.textSecondary} />
        </Pressable>

        {/* Title (truncated) */}
        <Text style={[styles.headerTitle, { color: theme.textPrimary }]} numberOfLines={1}>
          {manga.title}
        </Text>

        {/* Actions */}
        <View style={styles.headerActions}>
          {/* Download All */}
          <Pressable
            style={styles.headerBtn}
            onPress={handleDownloadAll}
            accessibilityLabel="Download all chapters"
          >
            <Feather name="download-cloud" size={20} color={theme.accent} />
          </Pressable>

          {/* Heart bookmark */}
          <Pressable
            style={styles.headerBtn}
            onPress={handleToggleBookmark}
            accessibilityLabel={bookmarked ? 'Remove bookmark' : 'Add bookmark'}
          >
            <MaterialCommunityIcons
              name={bookmarked ? 'heart' : 'heart-outline'}
              size={22}
              color={bookmarked ? colors.error : theme.textSecondary}
            />
          </Pressable>
        </View>
      </View>

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

        {/* ── Alternative Titles ─────────────────────────────────── */}
        {manga.altTitles && manga.altTitles.length > 0 && (
          <View style={styles.altTitlesSection}>
            <Text style={styles.sectionTitle}>Also Known As</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {manga.altTitles.map((alt, idx) => (
                <View key={`alt-${idx}`} style={styles.altTitleChip}>
                  <Text style={styles.altTitleText} numberOfLines={1}>{alt}</Text>
                </View>
              ))}
            </ScrollView>
          </View>
        )}

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
          <View style={styles.chapterHeaderRow}>
            <Text style={styles.sectionTitle}>
              Chapters ({chapterGroups.length})
            </Text>
            {duplicateCount > 0 && (
              <Text style={styles.dupeNote}>
                +{duplicateCount} alt sources hidden
              </Text>
            )}
          </View>

          {chapterGroups.length === 0 ? (
            <Text style={styles.emptyText}>No chapters available.</Text>
          ) : (
            chapterGroups.map((group) => {
              const ch = group.primary;
              const isDownloading = downloadingIds.has(ch.id);
              const dlIcon = downloadIcon(ch, isDownloading);

              return (
                <View key={`${ch.chapter}-${ch.id}`}>
                  {/* Primary chapter row */}
                  <View style={styles.chapterRow}>
                    <Pressable
                      style={styles.chapterInfo}
                      onPress={() => handleReadChapter(ch)}
                    >
                      <View style={styles.chapterNumBadge}>
                        <Text style={styles.chapterNumText}>
                          Ch. {ch.chapter}
                        </Text>
                      </View>
                      <View style={styles.chapterTextCol}>
                        <Text style={styles.chapterTitle} numberOfLines={1}>
                          {ch.title || 'Untitled'}
                        </Text>
                        {ch.volume ? (
                          <Text style={styles.chapterVol}>Vol. {ch.volume}</Text>
                        ) : null}
                        <Text style={styles.chapterMeta}>
                          {ch.pages > 0 ? `${ch.pages} pages` : ''}
                          {ch.scanlationGroup ? ` · ${ch.scanlationGroup}` : ''}
                          {ch.updatedAt
                            ? ` · ${new Date(ch.updatedAt).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              })}`
                            : ''}
                        </Text>
                      </View>
                    </Pressable>

                    {/* Source/version selector (if alternates exist) */}
                    {group.alternates.length > 0 && (
                      <Pressable
                        style={[
                          styles.sourceToggle,
                          expandedGroups.has(group.chapterNum) && styles.sourceToggleActive,
                        ]}
                        onPress={() => toggleGroupExpanded(group.chapterNum)}
                        accessibilityLabel={`${group.alternates.length} other version${group.alternates.length > 1 ? 's' : ''} available`}
                      >
                        <Text style={styles.sourceToggleLabel} numberOfLines={1}>
                          {ch.scanlationGroup || 'Unknown'}
                        </Text>
                        <MaterialCommunityIcons
                          name={expandedGroups.has(group.chapterNum) ? 'chevron-up' : 'chevron-down'}
                          size={14}
                          color={colors.mutedPlum}
                        />
                        <Text style={styles.sourceToggleBadge}>
                          +{group.alternates.length}
                        </Text>
                      </Pressable>
                    )}

                    {/* Download button */}
                    <Pressable
                      style={styles.downloadBtn}
                      onPress={() => handleDownloadChapter(ch)}
                      disabled={isDownloading || ch.downloadStatus === 'downloading'}
                    >
                      {isDownloading || ch.downloadStatus === 'downloading' ? (
                        <ActivityIndicator size="small" color={colors.mutedPlum} />
                      ) : (
                        <Feather name={dlIcon.name} size={18} color={dlIcon.color} />
                      )}
                    </Pressable>
                  </View>

                  {/* Alternate sources dropdown */}
                  {expandedGroups.has(group.chapterNum) && group.alternates.length > 0 && (
                    <View style={styles.altSources}>
                      <Text style={styles.altSourcesLabel}>Other sources:</Text>
                      {group.alternates.map((alt) => {
                        const altDl = downloadIcon(alt, downloadingIds.has(alt.id));
                        return (
                          <View key={alt.id} style={styles.altRow}>
                            <Pressable
                              style={styles.altChapterInfo}
                              onPress={() => handleReadChapter(alt)}
                            >
                              <Text style={styles.altSourceName} numberOfLines={1}>
                                {alt.scanlationGroup ?? 'Unknown group'}
                              </Text>
                              <Text style={styles.altMeta}>
                                {alt.pages > 0 ? `${alt.pages}p` : ''}
                                {alt.title ? ` — ${alt.title}` : ' — Untitled'}
                              </Text>
                            </Pressable>
                            <Pressable
                              style={styles.altDownloadBtn}
                              onPress={() => handleDownloadChapter(alt)}
                              disabled={downloadingIds.has(alt.id)}
                            >
                              <Feather name={altDl.name} size={16} color={altDl.color} />
                            </Pressable>
                          </View>
                        );
                      })}
                    </View>
                  )}
                </View>
              );
            })
          )}
        </View>

        {/* ── Similar Manga Slider ────────────────────────────────── */}
        {similar.length > 0 && (
          <View style={styles.similarSection}>
            <Text style={styles.sectionTitle}>Similar Manga</Text>
            <FlatList
              horizontal
              data={similar}
              keyExtractor={(item) => item.id}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.similarList}
              renderItem={({ item: sim }) => (
                <Pressable
                  style={styles.similarCard}
                  onPress={() =>
                    navigation.navigate('MangaInfoScreen', { mangaId: sim.id })
                  }
                >
                  {sim.coverImageUrl ? (
                    <Image
                      source={{ uri: sim.coverImageUrl }}
                      style={styles.similarCover}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={[styles.similarCover, styles.similarCoverPlaceholder]}>
                      <Feather name="image" size={20} color={colors.mutedPlum} />
                    </View>
                  )}
                  <Text style={styles.similarTitle} numberOfLines={2}>
                    {sim.title}
                  </Text>
                </Pressable>
              )}
            />
          </View>
        )}

        {/* Bottom spacer for safe area */}
        <View style={{ height: 40 }} />
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

  // ── Header bar ──────────────────────────────────────────────────
  headerBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: HEADER_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.p10,
    paddingTop: 20, // safe area
    borderBottomWidth: 1,
    zIndex: 100,
    backgroundColor: colors.lavender,
  },
  headerBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
  },
  headerTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '800',
    marginHorizontal: spacing.p8,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.p4,
  },

  // ── Scroll ──────────────────────────────────────────────────────
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: HEADER_HEIGHT + spacing.p10,
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

  // ── Alt titles ─────────────────────────────────────────────────
  altTitlesSection: {
    marginBottom: spacing.p16,
  },
  altTitleChip: {
    paddingVertical: spacing.p6,
    paddingHorizontal: spacing.p12,
    backgroundColor: colors.creamWhite,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.plum,
    marginRight: spacing.p8,
    maxWidth: 200,
  },
  altTitleText: {
    fontSize: 13,
    color: colors.cocoa,
    fontWeight: '600',
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
  chapterHeaderRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: spacing.p8,
  },
  dupeNote: {
    fontSize: 12,
    color: colors.mutedPlum,
    fontStyle: 'italic',
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

  // ── Source switching ──────────────────────────────────────────
  sourceToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.p8,
    paddingVertical: spacing.p5,
    borderRadius: 8,
    backgroundColor: colors.sand,
    borderWidth: 1,
    borderColor: colors.mutedPlum,
    marginRight: spacing.p6,
    maxWidth: 140,
  },
  sourceToggleActive: {
    borderColor: colors.plum,
    backgroundColor: colors.lavender,
  },
  sourceToggleLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.plum,
    flexShrink: 1,
  },
  sourceToggleBadge: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.mutedPlum,
    backgroundColor: colors.paleLavender,
    paddingHorizontal: 4,
    borderRadius: 4,
    overflow: 'hidden',
  },
  altSources: {
    backgroundColor: colors.creamWhite,
    borderRadius: borders.br8,
    borderWidth: 1,
    borderColor: colors.plum,
    marginTop: -spacing.p4,
    marginBottom: spacing.p8,
    padding: spacing.p10,
    marginLeft: spacing.p16,
  },
  altSourcesLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.mutedPlum,
    marginBottom: spacing.p6,
  },
  altRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.p6,
    borderTopWidth: 1,
    borderTopColor: colors.sand,
  },
  altChapterInfo: {
    flex: 1,
  },
  altSourceName: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.plum,
  },
  altMeta: {
    fontSize: 11,
    color: colors.mutedPlum,
    marginTop: 1,
  },
  altDownloadBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.sand,
  },

  // ── Similar manga slider ──────────────────────────────────────
  similarSection: {
    marginBottom: spacing.p16,
  },
  similarList: {
    gap: spacing.p10,
    paddingRight: spacing.p16,
  },
  similarCard: {
    width: SIMILAR_ITEM_W,
  },
  similarCover: {
    width: SIMILAR_ITEM_W,
    height: SIMILAR_ITEM_W * 1.45,
    borderRadius: borders.br8,
    borderWidth: 1,
    borderColor: colors.plum,
  },
  similarCoverPlaceholder: {
    backgroundColor: colors.sand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  similarTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.plum,
    marginTop: spacing.p6,
    textAlign: 'center',
  },
});
