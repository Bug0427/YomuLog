// components/manga/MangaActionBar.tsx
// Fixed top action bar: back + truncated title + download-all + bookmark
// (extracted from MangaInfoScreen — H-5 decomposition).
import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import BackButton from '../general/BackButton';
import { colors, spacing } from '../../styles/tokens';
import { useTheme, type ThemeColors } from '../../context/ThemeContext';

type Props = {
  title: string;
  bookmarked: boolean;
  onBack: () => void;
  onDownloadAll: () => void;
  onToggleBookmark: () => void;
};

export default function MangaActionBar({
  title,
  bookmarked,
  onBack,
  onDownloadAll,
  onToggleBookmark,
}: Props) {
  const { colors: theme } = useTheme();
  const styles = useStyles(theme);

  return (
    <View style={[styles.headerBar, { backgroundColor: theme.headerBg, borderBottomColor: theme.border }]}>
      {/* Back */}
      <BackButton onPress={onBack} />

      {/* Title (truncated) */}
      <Text style={[styles.headerTitle, { color: theme.textPrimary }]} numberOfLines={1}>
        {title}
      </Text>

      {/* Actions */}
      <View style={styles.headerActions}>
        {/* Download All */}
        <Pressable
          style={styles.headerBtn}
          onPress={onDownloadAll}
          accessibilityLabel="Download all chapters"
          android_ripple={{ color: 'rgba(0,0,0,0.1)', borderless: true }}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Feather name="download-cloud" size={20} color={theme.accent} />
        </Pressable>

        {/* Heart bookmark */}
        <Pressable
          style={styles.headerBtn}
          onPress={onToggleBookmark}
          accessibilityLabel={bookmarked ? 'Remove bookmark' : 'Add bookmark'}
          android_ripple={{ color: 'rgba(0,0,0,0.1)', borderless: true }}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <MaterialCommunityIcons
            name={bookmarked ? 'heart' : 'heart-outline'}
            size={22}
            color={bookmarked ? colors.error : theme.textSecondary}
          />
        </Pressable>
      </View>
    </View>
  );
}

function useStyles(c: ThemeColors) {
  return StyleSheet.create({
    headerBar: {
      position: 'absolute',
      // top set dynamically via useSafeAreaInsets
      left: 0,
      right: 0,
      height: 56,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing.p10,
      borderBottomWidth: 1,
      zIndex: 100,
      backgroundColor: c.bg,
    },
    headerBtn: {
      width: 40,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 20,
      backgroundColor: 'transparent',
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
  });
}