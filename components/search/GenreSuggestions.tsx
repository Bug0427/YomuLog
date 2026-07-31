// components/search/GenreSuggestions.tsx
// Shows genre recommendations based on the user's reading history.
// Uses genreSuggestionService to compute top genres, then renders chips
// that the user can tap to add to their search filter.

import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, Pressable, ScrollView, ActivityIndicator, StyleSheet } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { colors, spacing } from '../../styles/tokens';
import { getSuggestedGenres } from '../../services/genreSuggestionService';
import { GENRE_TAGS, type GenreTag } from '../../utils/filters';

/** Format genre tag into display label */
function genreLabel(tag: GenreTag): string {
  return tag.split('-').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

type Props = {
  /** Currently selected genres (to avoid suggesting already-selected ones) */
  selectedGenres: GenreTag[];
  /** Currently excluded genres */
  excludedGenres: Set<GenreTag>;
  /** Called when user taps a suggested genre chip */
  onGenrePress: (tag: GenreTag) => void;
};

export default function GenreSuggestions({ selectedGenres, excludedGenres, onGenrePress }: Props) {
  const { colors: theme } = useTheme();
  const [suggestions, setSuggestions] = useState<GenreTag[]>([]);
  const [loading, setLoading] = useState(true);
  const skipSet = new Set([...selectedGenres, ...excludedGenres]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const tags = await getSuggestedGenres();
        if (mounted) {
          // Filter out already-selected/excluded genres
          setSuggestions(tags.filter((t: GenreTag) => !skipSet.has(t)).slice(0, 5));
        }
      } catch {
        // silent — suggestions are optional
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  // Filter again when selected/excluded changes
  const visibleSuggestions = suggestions.filter((t) => !skipSet.has(t));

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="small" color={colors.lavender} />
      </View>
    );
  }

  if (visibleSuggestions.length === 0) return null;

  return (
    <View style={styles.container}>
      <Text style={[styles.heading, { color: theme.textSecondary }]}>
        Recommended for You
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipsRow}
      >
        {visibleSuggestions.map((tag) => (
          <Pressable
            key={tag}
            style={[styles.chip, { backgroundColor: theme.bgCard, borderColor: theme.border }]}
            onPress={() => onGenrePress(tag)}
          >
            <Text style={[styles.chipText, { color: theme.textPrimary }]}>
              {genreLabel(tag)}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: spacing.p12,
    marginTop: spacing.p6,
    paddingVertical: spacing.p6,
  },
  heading: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: spacing.p4,
    marginLeft: spacing.p4,
  },
  chipsRow: {
    gap: spacing.p6,
    paddingHorizontal: spacing.p4,
  },
  chip: {
    paddingVertical: spacing.p5,
    paddingHorizontal: spacing.p12,
    borderRadius: 14,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '500',
  },
});
