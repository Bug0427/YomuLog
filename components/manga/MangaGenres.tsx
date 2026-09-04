// components/manga/MangaGenres.tsx
// Genre chips row + alternative titles + description section
// (extracted from MangaInfoScreen — H-5 decomposition).
import React from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import MarqueeText from '../general/MarqueeText';
import { spacing, borders } from '../../styles/tokens';
import { useTheme, type ThemeColors } from '../../context/ThemeContext';
import type { Manga } from '../../services/mangaAPI';

type Props = {
  manga: Manga;
  descExpanded: boolean;
  onToggleDesc: () => void;
};

export default function MangaGenres({ manga, descExpanded, onToggleDesc }: Props) {
  const { colors: theme } = useTheme();
  const styles = useStyles(theme);

  return (
    <>
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
                <MarqueeText style={styles.altTitleText} maxWidth={184}>
                  {alt}
                </MarqueeText>
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
            <Pressable onPress={onToggleDesc}>
              <Text style={styles.expandText}>
                {descExpanded ? 'Show less' : 'Show more'}
              </Text>
            </Pressable>
          )}
        </View>
      ) : null}
    </>
  );
}

function useStyles(c: ThemeColors) {
  return StyleSheet.create({
    genresWrap: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.p6,
      marginBottom: spacing.p16,
    },
    genreChip: {
      paddingVertical: spacing.p4,
      paddingHorizontal: spacing.p10,
      backgroundColor: c.bgCard,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: c.border,
    },
    genreText: {
      fontSize: 12,
      color: c.textSecondary,
      fontWeight: '600',
    },
    altTitlesSection: {
      marginBottom: spacing.p16,
    },
    altTitleChip: {
      paddingVertical: spacing.p6,
      paddingHorizontal: spacing.p12,
      backgroundColor: c.bgInput,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: c.border,
      marginRight: spacing.p8,
      maxWidth: 200,
    },
    altTitleText: {
      fontSize: 13,
      color: c.textPrimary,
      fontWeight: '600',
    },
    descSection: {
      marginBottom: spacing.p16,
    },
    sectionTitle: {
      fontSize: 17,
      fontWeight: '800',
      color: c.textPrimary,
      marginBottom: spacing.p8,
    },
    descText: {
      fontSize: 14,
      color: c.textPrimary,
      lineHeight: 20,
    },
    expandText: {
      fontSize: 13,
      fontWeight: '700',
      color: c.textSecondary,
      marginTop: spacing.p4,
    },
  });
}