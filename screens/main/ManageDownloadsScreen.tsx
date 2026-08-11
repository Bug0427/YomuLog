// screens/main/ManageDownloadsScreen.tsx
// Custom downloads management dashboard with storage footprint visualization,
// per-title breakdown, and manual cleanup controls (BUG-17).

import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Alert,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import Header from '../../components/layout/Header';
import { colors, spacing, t } from '../../styles/tokens';
import { useTheme, type ThemeColors } from '../../context/ThemeContext';
import { useSortPreference, applySortOrder } from '../../hooks/useSortPreference';
import {
  getStorageStats,
  deleteDownloadedChapter,
  getDownloadStats,
  clearAllDownloads,
  type MangaStorageStat,
} from '../../services/downloadManager';
import {
  getDownloadedChapters,
  type DownloadedChapter,
} from '../../services/downloadManager';

// ─── Constants ───────────────────────────────────────────────────────

/** Maximum estimated storage a user might consume (used for bar graph scale) */
const MAX_STORAGE_BUDGET = 500 * 1024 * 1024; // 500 MB reference scale

// ─── Components ─────────────────────────────────────────────────────

/** Renders a single horizontal storage bar with label */
function StorageBar({
  label,
  bytes,
  totalBytes,
  color,
}: {
  label: string;
  bytes: number;
  totalBytes: number;
  color: string;
}) {
  const { colors: theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const pct = totalBytes > 0 ? Math.min((bytes / MAX_STORAGE_BUDGET) * 100, 100) : 0;
  return (
    <View style={styles.barRow}>
      <Text style={styles.barLabel} numberOfLines={1}>
        {label}
      </Text>
      <View style={styles.barTrack}>
        <View style={[styles.barFill, { width: `${pct}%`, backgroundColor: color }]} />
      </View>
      <Text style={styles.barValue}>{formatBytesCompact(bytes)}</Text>
    </View>
  );
}

/** Per-manga card with title, chapter/page counts, storage, and delete button */
function MangaStorageCard({
  stat,
  chapters,
  onDelete,
  deleting,
}: {
  stat: MangaStorageStat;
  chapters: DownloadedChapter[];
  onDelete: (stat: MangaStorageStat) => void;
  deleting: boolean;
}) {
  const { colors: theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  return (
    <View style={[styles.mangaCard, { backgroundColor: theme.bgCard }]}>
      {/* Left: icon / placeholder */}
      <View style={styles.mangaIconWrap}>
        <MaterialCommunityIcons name="book-open-page-variant" size={28} color={theme.textSecondary} />
      </View>

      {/* Center: info */}
      <View style={styles.mangaInfo}>
        <Text style={styles.mangaTitle} numberOfLines={1}>
          {stat.mangaTitle}
        </Text>
        <Text style={styles.mangaMeta}>
          {stat.chapterCount} chapter{stat.chapterCount !== 1 ? 's' : ''} · {stat.totalPages} pages
        </Text>
        <Text style={styles.mangaStorage}>{stat.storageLabel}</Text>
      </View>

      {/* Right: delete button */}
      <Pressable
        onPress={() => onDelete(stat)}
        disabled={deleting}
        style={({ pressed }) => [
          styles.deleteBtn,
          { opacity: pressed ? 0.6 : deleting ? 0.4 : 1 },
        ]}
      >
        {deleting ? (
          <ActivityIndicator size="small" color={colors.error} />
        ) : (
          <Feather name="trash-2" size={18} color={colors.error} />
        )}
      </Pressable>
    </View>
  );
}

function formatBytesCompact(bytes: number): string {
  if (bytes === 0) return '0 MB';
  if (bytes >= 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ─── Main screen ─────────────────────────────────────────────────────

export default function ManageDownloadsScreen() {
  const navigation = useNavigation();
  const { colors: theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const insets = useSafeAreaInsets();

  const [storageStats, setStorageStats] = useState<{
    totalBytes: number;
    totalLabel: string;
    byManga: MangaStorageStat[];
  } | null>(null);
  const [downloadedChapters, setDownloadedChapters] = useState<DownloadedChapter[]>([]);
  const [downloadStats, setDLStats] = useState({ completed: 0, pending: 0, failed: 0 });
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  // ── Sort state (persisted via AsyncStorage) ──────────────────────────
  const { sortOrder, cycleSort, label: sortLabel, icon: sortIcon } = useSortPreference();

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [stats, chapters, dlStats] = await Promise.all([
        getStorageStats(),
        getDownloadedChapters(),
        getDownloadStats(),
      ]);
      setStorageStats(stats);
      setDownloadedChapters(chapters);
      setDLStats(dlStats);
    } catch (e) {
      console.warn('Failed to load download stats', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  /** Delete all downloads for a specific manga title */
  const handleDeleteManga = useCallback(
    (stat: MangaStorageStat) => {
      const title = stat.mangaTitle.length > 30 ? stat.mangaTitle.slice(0, 30) + '…' : stat.mangaTitle;
      Alert.alert(
        `Delete "${title}"`,
        `This will remove ${stat.chapterCount} chapter${stat.chapterCount !== 1 ? 's' : ''} and free approximately ${stat.storageLabel}.\n\nThis action cannot be undone.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              setDeleting(true);
              try {
                const toDelete = downloadedChapters.filter(
                  (ch) => ch.mangaId === stat.mangaId,
                );
                for (const ch of toDelete) {
                  await deleteDownloadedChapter(ch.chapterId);
                }
                await refresh();
              } catch (e) {
                Alert.alert('Error', 'Failed to delete some downloads. Please try again.');
              } finally {
                setDeleting(false);
              }
            },
          },
        ],
      );
    },
    [downloadedChapters, refresh],
  );

  /** Clear all downloads (nuclear option) */
  const handleClearAll = useCallback(() => {
    Alert.alert(
      'Clear All Downloads',
      `This will permanently delete all ${downloadedChapters.length} downloaded chapters and free approximately ${storageStats?.totalLabel ?? '0 MB'}.\n\nThis action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete All',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            try {
              await clearAllDownloads();
              setStorageStats({ totalBytes: 0, totalLabel: '0 B', byManga: [] });
              setDownloadedChapters([]);
              setDLStats({ completed: 0, pending: 0, failed: 0 });
            } catch (e) {
              Alert.alert('Error', 'Failed to clear downloads.');
            } finally {
              setDeleting(false);
            }
          },
        },
      ],
    );
  }, [downloadedChapters.length, storageStats]);

  const totalBytes = storageStats?.totalBytes ?? 0;
  const storagePct = totalBytes > 0 ? Math.min((totalBytes / MAX_STORAGE_BUDGET) * 100, 100) : 0;

  // ── Sort byManga entries ────────────────────────────────────────────
  const sortedByManga = useMemo(
    () =>
      storageStats
        ? applySortOrder(storageStats.byManga, sortOrder, (item) => item.mangaTitle)
        : [],
    [storageStats, sortOrder],
  );

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: theme.bg }]}>
      {/* Fixed header bar with back button */}
      <View style={[styles.headerBar, { backgroundColor: theme.headerBg, paddingTop: insets.top }]}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={12}>
          <Feather name="arrow-left" size={24} color={theme.textSecondary} />
        </Pressable>
        <Text style={styles.headerTitle}>Manage Downloads</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Pressable
            onPress={cycleSort}
            accessibilityLabel={`Sort: ${sortLabel}`}
            accessibilityRole="button"
            hitSlop={12}
          >
            <MaterialCommunityIcons name={sortIcon} size={20} color={theme.textSecondary} />
          </Pressable>
          {downloadedChapters.length > 0 && (
            <Pressable onPress={handleClearAll} disabled={deleting} hitSlop={12}>
              <Feather name="trash-2" size={20} color={deleting ? theme.textMuted : colors.error} />
            </Pressable>
          )}
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ─── Storage Footprint Section ──────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Storage Footprint</Text>

          <View style={[styles.footprintCard, { backgroundColor: theme.bgCard }]}>
            {/* Total used header */}
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total Used</Text>
              <Text style={styles.totalValue}>
                {loading ? '...' : (storageStats?.totalLabel ?? '0 B')}
              </Text>
            </View>

            {/* Main storage bar */}
            <View style={styles.mainBarTrack}>
              <View
                style={[
                  styles.mainBarFill,
                  {
                    width: `${storagePct}%`,
                    backgroundColor:
                      storagePct > 80 ? colors.error : storagePct > 50 ? colors.modalPurple : colors.modalPurple,
                  },
                ]}
              />
            </View>

            {/* Scale labels */}
            <View style={styles.scaleRow}>
              <Text style={styles.scaleLabel}>0</Text>
              <Text style={styles.scaleLabel}>{formatBytesCompact(MAX_STORAGE_BUDGET / 2)}</Text>
              <Text style={styles.scaleLabel}>{formatBytesCompact(MAX_STORAGE_BUDGET)}</Text>
            </View>

            {/* Quick stats grid */}
            <View style={styles.quickStats}>
              <View style={styles.quickStatBox}>
                <MaterialCommunityIcons name="file-download" size={18} color={colors.success} />
                <Text style={styles.quickStatValue}>{downloadStats.completed}</Text>
                <Text style={styles.quickStatLabel}>Completed</Text>
              </View>
              <View style={styles.quickStatBox}>
                <Feather name="clock" size={18} color={colors.modalPurple} />
                <Text style={styles.quickStatValue}>{downloadStats.pending}</Text>
                <Text style={styles.quickStatLabel}>Pending</Text>
              </View>
              <View style={styles.quickStatBox}>
                <Feather name="alert-triangle" size={18} color={colors.error} />
                <Text style={styles.quickStatValue}>{downloadStats.failed}</Text>
                <Text style={styles.quickStatLabel}>Failed</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Navigation link to Downloads screen */}
        <Pressable
        onPress={() => navigation.navigate('DownLoadsScreen' as never)}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
          paddingVertical: spacing.p10,
          marginHorizontal: spacing.p16,
          marginBottom: spacing.p8,
          backgroundColor: theme.bgCard,
          borderRadius: 8,
          borderWidth: 1,
          borderColor: theme.border,
        }}
        >
        <Feather name="download" size={14} color={theme.textMuted} />
        <Text style={{ fontSize: 12, color: theme.textMuted, fontWeight: '600' }}>
          View My Downloads
        </Text>
        </Pressable>

        {/* ─── Per-Title Breakdown ─────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Storage by Title</Text>

          {loading ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator size="large" color={theme.accent} />
              <Text style={styles.loadingText}>Calculating storage…</Text>
            </View>
          ) : storageStats && sortedByManga.length > 0 ? (
            <>
              {/* Storage bars per title */}
              {sortedByManga.map((stat) => (
                <StorageBar
                  key={stat.mangaId}
                  label={stat.mangaTitle}
                  bytes={stat.storageBytes}
                  totalBytes={totalBytes}
                  color={
                    stat.storageBytes > 100 * 1024 * 1024
                      ? colors.error
                      : stat.storageBytes > 50 * 1024 * 1024
                        ? colors.modalPurple
                        : colors.modalPurple
                  }
                />
              ))}

              {/* Per-manga cards with delete */}
              <View style={styles.divider} />
              <Text style={[styles.sectionTitle, { fontSize: 15, marginTop: 4 }]}>
                Manual Cleanup
              </Text>
              <Text style={styles.cleanupHint}>
                Tap the trash icon to remove all chapters for a title and free up storage.
              </Text>

              {sortedByManga.map((stat) => (
                <MangaStorageCard
                  key={stat.mangaId}
                  stat={stat}
                  chapters={downloadedChapters.filter((ch) => ch.mangaId === stat.mangaId)}
                  onDelete={handleDeleteManga}
                  deleting={deleting}
                />
              ))}
            </>
          ) : (
            <View style={styles.emptyWrap}>
              <MaterialCommunityIcons name="download-off" size={48} color={theme.textMuted} />
              <Text style={styles.emptyText}>
                No downloads yet. Open a manga and save chapters for offline reading.
              </Text>
            </View>
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  root: {
    flex: 1,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    // paddingTop set dynamically via useSafeAreaInsets
    paddingBottom: spacing.p12,
    paddingHorizontal: spacing.p16,
    backgroundColor: c.bgSecondary,
  },
  backBtn: {
    padding: 4,
    marginRight: spacing.p12,
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: '800',
    color: c.textPrimary,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.p16,
    paddingTop: spacing.p12,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: c.textPrimary,
    marginBottom: 10,
  },
  // ── Footprint card ────────────────────────────────────────────────
  footprintCard: {
    borderRadius: 14,
    padding: 16,
    backgroundColor: c.bgInput,
    borderWidth: 2,
    borderColor: c.borderLight,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 12,
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: c.textMuted,
  },
  totalValue: {
    fontSize: 26,
    fontWeight: '800',
    color: c.textPrimary,
  },
  mainBarTrack: {
    height: 16,
    borderRadius: 8,
    backgroundColor: c.bgSecondary,
    overflow: 'hidden',
    marginBottom: 6,
  },
  mainBarFill: {
    height: '100%',
    borderRadius: 8,
    minWidth: 4,
  },
  scaleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  scaleLabel: {
    fontSize: 10,
    color: c.textMuted,
  },
  quickStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    borderTopColor: c.borderLight,
    paddingTop: spacing.p12,
  },
  quickStatBox: {
    alignItems: 'center',
    gap: 3,
  },
  quickStatValue: {
    fontSize: 18,
    fontWeight: '700',
    color: c.textPrimary,
  },
  quickStatLabel: {
    fontSize: 10,
    color: c.textMuted,
    fontWeight: '500',
  },
  // ── Storage bars ──────────────────────────────────────────────────
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  barLabel: {
    width: 90,
    fontSize: 11,
    fontWeight: '600',
    color: c.textPrimary,
  },
  barTrack: {
    flex: 1,
    height: 10,
    borderRadius: 5,
    backgroundColor: c.bgSecondary,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 5,
    minWidth: 2,
  },
  barValue: {
    width: 48,
    fontSize: 10,
    fontWeight: '700',
    color: c.textMuted,
    textAlign: 'right',
  },
  // ── Divider ───────────────────────────────────────────────────────
  divider: {
    height: 2,
    backgroundColor: c.accentDark,
    opacity: 0.2,
    marginVertical: 16,
  },
  // ── Cleanup section ───────────────────────────────────────────────
  cleanupHint: {
    fontSize: 12,
    color: c.textMuted,
    marginBottom: 12,
    fontStyle: 'italic',
  },
  // ── Manga card ────────────────────────────────────────────────────
  mangaCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.p12,
    paddingHorizontal: spacing.p12,
    marginBottom: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: c.borderLight,
  },
  mangaIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: c.bgCard,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  mangaInfo: {
    flex: 1,
  },
  mangaTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: c.textPrimary,
    marginBottom: 2,
  },
  mangaMeta: {
    fontSize: 11,
    color: c.textMuted,
    marginBottom: 1,
  },
  mangaStorage: {
    fontSize: 12,
    fontWeight: '600',
    color: c.textSecondary,
  },
  deleteBtn: {
    width: 38,
    height: 38,
    borderRadius: 8,
    backgroundColor: c.bgSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  // ── Loading / Empty ───────────────────────────────────────────────
  loadingWrap: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 13,
    color: c.textMuted,
  },
  emptyWrap: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 24,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 14,
    color: c.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
});
