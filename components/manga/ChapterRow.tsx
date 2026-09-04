// components/manga/ChapterRow.tsx
// Single chapter row with source toggle + download button, plus an
// expandable "other sources" dropdown (extracted from MangaInfoScreen — H-5 decomposition).
import React from 'react';
import { View, Text, Pressable, ActivityIndicator, StyleSheet } from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import type { ChapterGroup } from './types';
import { colors, spacing, borders } from '../../styles/tokens';
import { useTheme, type ThemeColors } from '../../context/ThemeContext';

type Props = {
  group: ChapterGroup;
  expanded: boolean;
  downloadingIds: Set<string>;
  onReadChapter: (ch: ChapterGroup['primary']) => void;
  onDownloadChapter: (ch: ChapterGroup['primary']) => void;
  onToggleExpanded: (chapterNum: string) => void;
};

function formatDate(iso?: string): string {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function ChapterRow({
  group,
  expanded,
  downloadingIds,
  onReadChapter,
  onDownloadChapter,
  onToggleExpanded,
}: Props) {
  const { colors: theme } = useTheme();
  const styles = useStyles(theme);
  const ch = group.primary;
  const isDownloading = downloadingIds.has(ch.id);

  const downloadIcon = (
    chapter: typeof ch,
    isDownloading: boolean,
  ): { name: keyof typeof Feather.glyphMap; color: string } => {
    if (isDownloading || chapter.downloadStatus === 'downloading') {
      return { name: 'loader', color: theme.textMuted };
    }
    if (chapter.isDownloaded || chapter.downloadStatus === 'completed') {
      return { name: 'check-circle', color: colors.success };
    }
    if (chapter.downloadStatus === 'failed') {
      return { name: 'alert-circle', color: colors.error };
    }
    return { name: 'download', color: theme.textSecondary };
  };

  return (
    <View>
      {/* Primary chapter row */}
      <View style={styles.chapterRow}>
        <Pressable
          style={styles.chapterInfo}
          onPress={() => onReadChapter(ch)}
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
              {ch.updatedAt ? ` · ${formatDate(ch.updatedAt)}` : ''}
              {/* Show language badge for non-English chapters */}
              {ch.language && ch.language !== 'en' ? ` · ${ch.language.toUpperCase()}` : ''}
            </Text>
          </View>
        </Pressable>

        {/* Source/version selector (if alternates exist) */}
        {group.alternates.length > 0 && (
          <Pressable
            style={[
              styles.sourceToggle,
              expanded && styles.sourceToggleActive,
            ]}
            onPress={() => onToggleExpanded(group.chapterNum)}
            accessibilityLabel={`${group.alternates.length} other version${group.alternates.length > 1 ? 's' : ''} available`}
          >
            <Text style={styles.sourceToggleLabel} numberOfLines={1}>
              {ch.scanlationGroup || 'Unknown'}
            </Text>
            <MaterialCommunityIcons
              name={expanded ? 'chevron-up' : 'chevron-down'}
              size={14}
              color={theme.textMuted}
            />
            <Text style={styles.sourceToggleBadge}>
              +{group.alternates.length}
            </Text>
          </Pressable>
        )}

        {/* Download button */}
        <Pressable
          style={styles.downloadBtn}
          onPress={() => onDownloadChapter(ch)}
          disabled={isDownloading || ch.downloadStatus === 'downloading'}
        >
          {isDownloading || ch.downloadStatus === 'downloading' ? (
            <ActivityIndicator size="small" color={theme.textMuted} />
          ) : (
            <Feather name={downloadIcon(ch, isDownloading).name} size={18} color={downloadIcon(ch, isDownloading).color} />
          )}
        </Pressable>
      </View>

      {/* Alternate sources dropdown */}
      {expanded && group.alternates.length > 0 && (
        <View style={styles.altSources}>
          <Text style={styles.altSourcesLabel}>Other sources:</Text>
          {group.alternates.map((alt) => {
            const altDl = downloadIcon(alt, downloadingIds.has(alt.id));
            return (
              <View key={alt.id} style={styles.altRow}>
                <Pressable
                  style={styles.altChapterInfo}
                  onPress={() => onReadChapter(alt)}
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
                  onPress={() => onDownloadChapter(alt)}
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
}

function useStyles(c: ThemeColors) {
  return StyleSheet.create({
    chapterRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: c.bgInput,
      borderRadius: borders.br8,
      borderWidth: 1,
      borderColor: c.border,
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
      backgroundColor: c.bg,
      paddingVertical: spacing.p4,
      paddingHorizontal: spacing.p8,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: c.border,
    },
    chapterNumText: {
      fontSize: 13,
      fontWeight: '800',
      color: c.textPrimary,
    },
    chapterTextCol: {
      flex: 1,
    },
    chapterTitle: {
      fontSize: 14,
      fontWeight: '700',
      color: c.textSecondary,
    },
    chapterVol: {
      fontSize: 11,
      color: c.textMuted,
      fontWeight: '600',
    },
    chapterMeta: {
      fontSize: 11,
      color: c.textMuted,
      marginTop: 1,
    },
    downloadBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.bgCard,
      borderWidth: 1,
      borderColor: c.border,
    },
    sourceToggle: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: spacing.p8,
      paddingVertical: spacing.p5,
      borderRadius: 8,
      backgroundColor: c.bgCard,
      borderWidth: 1,
      borderColor: c.border,
      marginRight: spacing.p6,
      maxWidth: 140,
    },
    sourceToggleActive: {
      borderColor: c.border,
      backgroundColor: c.bg,
    },
    sourceToggleLabel: {
      fontSize: 10,
      fontWeight: '600',
      color: c.textSecondary,
      flexShrink: 1,
    },
    sourceToggleBadge: {
      fontSize: 10,
      fontWeight: '700',
      color: c.textMuted,
      backgroundColor: c.bgSecondary,
      paddingHorizontal: 4,
      borderRadius: 4,
      overflow: 'hidden',
    },
    altSources: {
      backgroundColor: c.bgInput,
      borderRadius: borders.br8,
      borderWidth: 1,
      borderColor: c.border,
      marginTop: -spacing.p4,
      marginBottom: spacing.p8,
      padding: spacing.p10,
      marginLeft: spacing.p16,
    },
    altSourcesLabel: {
      fontSize: 12,
      fontWeight: '700',
      color: c.textMuted,
      marginBottom: spacing.p6,
    },
    altRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: spacing.p6,
      borderTopWidth: 1,
      borderTopColor: c.borderLight,
    },
    altChapterInfo: {
      flex: 1,
    },
    altSourceName: {
      fontSize: 13,
      fontWeight: '600',
      color: c.textSecondary,
    },
    altMeta: {
      fontSize: 11,
      color: c.textMuted,
      marginTop: 1,
    },
    altDownloadBtn: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.bgCard,
    },
  });
}