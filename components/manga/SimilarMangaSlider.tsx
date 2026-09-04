// components/manga/SimilarMangaSlider.tsx
// Horizontal slider of similar manga cards (extracted from MangaInfoScreen — H-5 decomposition).
import React from 'react';
import { View, Text, Image, FlatList, Pressable, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { SimilarManga } from '../../services/mangaAPI';
import { spacing, borders } from '../../styles/tokens';
import { useTheme, type ThemeColors } from '../../context/ThemeContext';

type Props = {
  similar: SimilarManga[];
  itemWidth: number;
  onPressManga: (id: string) => void;
};

export default function SimilarMangaSlider({ similar, itemWidth, onPressManga }: Props) {
  const { colors: theme } = useTheme();
  const styles = useStyles(theme);

  return (
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
            style={[styles.similarCard, { width: itemWidth }]}
            onPress={() => onPressManga(sim.id)}
          >
            {sim.coverImageUrl ? (
              <Image
                source={{ uri: sim.coverImageUrl }}
                style={[styles.similarCover, { width: itemWidth, height: itemWidth * 1.45 }]}
                resizeMode="cover"
              />
            ) : (
              <View style={[styles.similarCover, styles.similarCoverPlaceholder, { width: itemWidth, height: itemWidth * 1.45 }]}>
                <Feather name="image" size={20} color={theme.textMuted} />
              </View>
            )}
            <Text style={styles.similarTitle} numberOfLines={2}>
              {sim.title}
            </Text>
          </Pressable>
        )}
      />
    </View>
  );
}

function useStyles(c: ThemeColors) {
  return StyleSheet.create({
    similarSection: {
      marginBottom: spacing.p16,
    },
    similarList: {
      gap: spacing.p10,
      paddingRight: spacing.p16,
    },
    similarCard: {
      // width set dynamically via itemWidth prop
    },
    similarCover: {
      borderRadius: borders.br8,
      borderWidth: 1,
      borderColor: c.border,
    },
    similarCoverPlaceholder: {
      backgroundColor: c.bgCard,
      alignItems: 'center',
      justifyContent: 'center',
    },
    similarTitle: {
      fontSize: 12,
      fontWeight: '700',
      color: c.textSecondary,
      marginTop: spacing.p6,
      textAlign: 'center',
    },
    sectionTitle: {
      fontSize: 17,
      fontWeight: '800',
      color: c.textPrimary,
      marginBottom: spacing.p8,
    },
  });
}