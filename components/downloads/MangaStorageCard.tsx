// components/downloads/MangaStorageCard.tsx
// Per-manga card with title, chapter/page counts, storage, and delete button
// (extracted from ManageDownloadsScreen — H-6 decomposition).
import React, { useMemo } from 'react';
import { View, Text, Pressable, ActivityIndicator, StyleSheet } from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, spacing } from '../../styles/tokens';
import { useTheme, type ThemeColors } from '../../context/ThemeContext';
import type { MangaStorageStat } from '../../services/downloadManager';
import type { DownloadedChapter } from '../../services/downloadManager';

type Props = {
  stat: MangaStorageStat;
  chapters: DownloadedChapter[];
  onDelete: (stat: MangaStorageStat) => void;
  deleting: boolean;
};

export function MangaStorageCard({
  stat,
  chapters,
  onDelete,
  deleting,
}: Props) {
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

const makeStyles = (c: ThemeColors) => StyleSheet.create({
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
});