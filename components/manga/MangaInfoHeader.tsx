// components/manga/MangaInfoHeader.tsx
// Header row: cover + title/metadata + status badge + content rating
// (extracted from MangaInfoScreen — H-5 decomposition).
import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { Manga } from '../../services/mangaAPI';
import { colors, spacing, borders } from '../../styles/tokens';
import { useTheme, type ThemeColors } from '../../context/ThemeContext';
import StatusPill from './StatusPill';

type Props = {
  manga: Manga;
  coverSize: number;
};

/** Status badge color mapping shared by MangaInfoHeader */
export function statusColor(status?: string): string {
  switch (status) {
    case 'ongoing': return '#2e7d32';
    case 'completed': return '#412d5c';
    case 'hiatus': return '#6d4c41';
    case 'cancelled': return '#c62828';
    default: return '#546e7a';
  }
}

export default function MangaInfoHeader({ manga, coverSize }: Props) {
  const { colors: theme } = useTheme();
  const styles = useStyles(theme);

  return (
    <View style={styles.headerRow}>
      {/* Cover image */}
      <View style={styles.coverWrap}>
        {manga.coverImageUrl ? (
          <Image
            source={{ uri: manga.coverImageUrl }}
            style={[styles.cover, { width: coverSize, height: coverSize * 1.45 }]}
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.cover, styles.coverPlaceholder, { width: coverSize, height: coverSize * 1.45 }]}>
            <Feather name="image" size={32} color={theme.textMuted} />
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
          <StatusPill status={manga.status} />
        ) : null}

        {manga.contentRating ? (
          <Text style={styles.ratingText}>{manga.contentRating.toUpperCase()}</Text>
        ) : null}
      </View>
    </View>
  );
}

function useStyles(c: ThemeColors) {
  return StyleSheet.create({
    headerRow: {
      flexDirection: 'row',
      gap: spacing.p16,
      marginBottom: spacing.p16,
    },
    coverWrap: {
      borderRadius: borders.br8,
      overflow: 'hidden',
      borderWidth: borders.bw2,
      borderColor: c.border,
    },
    cover: {
      backgroundColor: c.bgCard,
    },
    coverPlaceholder: {
      backgroundColor: c.bgCard,
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
      color: c.textPrimary,
      marginBottom: spacing.p4,
    },
    metaText: {
      fontSize: 13,
      color: c.textPrimary,
      lineHeight: 18,
    },
    metaLabel: {
      fontWeight: '700',
      color: c.textSecondary,
    },
    ratingText: {
      fontSize: 11,
      color: c.textMuted,
      fontWeight: '600',
      marginTop: 2,
    },
  });
}