// components/manga/LanguageFallbackBanner.tsx
// Notice shown when English chapters are missing (all languages shown)
// (extracted from MangaInfoScreen — H-5 decomposition).
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { spacing, borders } from '../../styles/tokens';
import { useTheme, type ThemeColors } from '../../context/ThemeContext';

export default function LanguageFallbackBanner() {
  const { colors: theme } = useTheme();
  const styles = useStyles(theme);

  return (
    <View style={styles.languageFallbackBanner}>
      <Feather name="globe" size={14} color={theme.textSecondary} />
      <Text style={styles.languageFallbackText}>
        English chapters not available — showing all languages
      </Text>
    </View>
  );
}

function useStyles(c: ThemeColors) {
  return StyleSheet.create({
    languageFallbackBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.p6,
      backgroundColor: c.bgCard,
      borderRadius: borders.br8,
      borderWidth: 1,
      borderColor: c.border,
      paddingVertical: spacing.p8,
      paddingHorizontal: spacing.p10,
      marginBottom: spacing.p10,
    },
    languageFallbackText: {
      fontSize: 12,
      color: c.textPrimary,
      fontWeight: '600',
      flex: 1,
    },
  });
}