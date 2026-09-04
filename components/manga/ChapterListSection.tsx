// components/manga/ChapterListSection.tsx
// Chapters section: header + language fallback banner + loading/error/empty
// states + deduplicated chapter list with source switching
// (extracted from MangaInfoScreen — H-5 decomposition).
import React from 'react';
import { View, Text, ActivityIndicator, Pressable, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import ChapterRow from './ChapterRow';
import LanguageFallbackBanner from './LanguageFallbackBanner';
import type { ChapterGroup, ChapterWithDownload } from './types';
import { colors, spacing } from '../../styles/tokens';
import { useTheme, type ThemeColors } from '../../context/ThemeContext';

type Props = {
  chapterGroups: ChapterGroup[];
  duplicateCount: number;
  languageFallback: boolean;
  chaptersLoading: boolean;
  chaptersError: string | null;
  downloadingIds: Set<string>;
  expandedGroups: Set<string>;
  onLoadChapters: () => void;
  onReadChapter: (ch: ChapterWithDownload) => void;
  onDownloadChapter: (ch: ChapterWithDownload) => void;
  onToggleGroupExpanded: (chapterNum: string) => void;
};

export default function ChapterListSection({
  chapterGroups,
  duplicateCount,
  languageFallback,
  chaptersLoading,
  chaptersError,
  downloadingIds,
  expandedGroups,
  onLoadChapters,
  onReadChapter,
  onDownloadChapter,
  onToggleGroupExpanded,
}: Props) {
  const { colors: theme } = useTheme();
  const styles = useStyles(theme);

  return (
    <View style={styles.chaptersSection}>
      <View style={styles.chapterHeaderRow}>
        <Text style={styles.sectionTitle}>
          Chapters{chapterGroups.length > 0 ? ` (${chapterGroups.length})` : ''}
        </Text>
        {duplicateCount > 0 && (
          <Text style={styles.dupeNote}>
            +{duplicateCount} alt sources hidden
          </Text>
        )}
      </View>

      {/* Language fallback notice */}
      {languageFallback && chapterGroups.length > 0 && (
        <LanguageFallbackBanner />
      )}

      {/* Chapters loading state */}
      {chaptersLoading && (
        <View style={styles.chapterStateContainer}>
          <ActivityIndicator size="small" color={theme.accent} />
          <Text style={styles.chapterStateText}>Loading chapters...</Text>
        </View>
      )}

      {/* Chapters error state */}
      {!chaptersLoading && chaptersError && (
        <View style={styles.chapterStateContainer}>
          <Feather name="wifi-off" size={20} color={theme.error} />
          <Text style={[styles.chapterStateText, { color: colors.error }]}>
            {chaptersError}
          </Text>
          <Pressable style={styles.chapterRetryBtn} onPress={onLoadChapters}>
            <Text style={styles.chapterRetryText}>Retry</Text>
          </Pressable>
        </View>
      )}

      {/* Empty chapters (no error) */}
      {!chaptersLoading && !chaptersError && chapterGroups.length === 0 && (
        <View style={styles.chapterStateContainer}>
          <Feather name="book-open" size={20} color={theme.textMuted} />
          <Text style={styles.emptyText}>No chapters available.</Text>
          <Pressable style={styles.chapterRetryBtn} onPress={onLoadChapters}>
            <Text style={styles.chapterRetryText}>Refresh</Text>
          </Pressable>
        </View>
      )}

      {/* Chapter list */}
      {!chaptersLoading && !chaptersError && chapterGroups.length > 0 && (
        chapterGroups.map((group) => (
          <ChapterRow
            key={`${group.chapterNum}-${group.primary.id}`}
            group={group}
            expanded={expandedGroups.has(group.chapterNum)}
            downloadingIds={downloadingIds}
            onReadChapter={onReadChapter}
            onDownloadChapter={onDownloadChapter}
            onToggleExpanded={onToggleGroupExpanded}
          />
        ))
      )}
    </View>
  );
}

function useStyles(c: ThemeColors) {
  return StyleSheet.create({
    chaptersSection: {
      marginBottom: spacing.p16,
    },
    chapterHeaderRow: {
      flexDirection: 'row',
      alignItems: 'baseline',
      justifyContent: 'space-between',
      marginBottom: spacing.p8,
    },
    sectionTitle: {
      fontSize: 17,
      fontWeight: '800',
      color: c.textPrimary,
      marginBottom: spacing.p8,
    },
    dupeNote: {
      fontSize: 12,
      color: c.textMuted,
      fontStyle: 'italic',
    },
    chapterStateContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: spacing.p20,
      gap: spacing.p8,
    },
    chapterStateText: {
      fontSize: 13,
      color: c.textMuted,
      fontWeight: '600',
    },
    chapterRetryBtn: {
      marginTop: spacing.p4,
      paddingVertical: spacing.p6,
      paddingHorizontal: spacing.p16,
      backgroundColor: c.accentDark,
      borderRadius: 8,
    },
    chapterRetryText: {
      color: colors.white,
      fontWeight: '700',
      fontSize: 13,
    },
    emptyText: {
      fontSize: 14,
      color: c.textMuted,
      fontStyle: 'italic',
    },
  });
}