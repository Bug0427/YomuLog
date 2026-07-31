// components/layout/GenreFilterModal.tsx
// Modern genre filter modal with categorized grid, checkmark badges,
// per-category Select/Clear All, and persistent state.
//
// Replaces the dated horizontal-scroll-only GenreSlider approach with
// a visually polished grid-based selector.

import React, { FC, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  Modal as RNModal,
  TouchableWithoutFeedback,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme, type ThemeColors } from '../../context/ThemeContext';
import { GenreTag, GENRE_TAGS, GENRE_TAG_IDS } from '../../utils/filters';
import { spacing } from '../../styles/tokens';

// ─── Category grouping ────────────────────────────────────────────

type GenreCategory = {
  key: string;
  label: string;
  tags: GenreTag[];
};

const GENRE_CATEGORIES: GenreCategory[] = [
  {
    key: 'genre',
    label: 'Genre',
    tags: [
      'action', 'adventure', 'comedy', 'drama', 'fantasy',
      'horror', 'mystery', 'romance', 'sci-fi', 'slice-of-life', 'thriller',
    ],
  },
  {
    key: 'demographic',
    label: 'Demographic',
    tags: ['shounen', 'shoujo', 'seinen', 'josei'],
  },
  {
    key: 'special',
    label: 'Theme',
    tags: ['isekai', 'sports', 'supernatural', 'psychological', 'historical'],
  },
];

// ─── Display helper ───────────────────────────────────────────────

export function genreLabel(tag: GenreTag): string {
  return tag
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

// ─── Props ────────────────────────────────────────────────────────

export type GenreFilterModalProps = {
  visible: boolean;
  selected: GenreTag[];
  onClose: () => void;
  onSelect: (tag: GenreTag) => void;
  onUnselect: (tag: GenreTag) => void;
  onSelectCategory: (tags: GenreTag[]) => void;
  onClearCategory: (tags: GenreTag[]) => void;
};

// ─── Component ────────────────────────────────────────────────────

const GenreFilterModal: FC<GenreFilterModalProps> = ({
  visible,
  selected,
  onClose,
  onSelect,
  onUnselect,
  onSelectCategory,
  onClearCategory,
}) => {
  const { colors: theme } = useTheme();
  const selectedSet = useMemo(() => new Set(selected), [selected]);

  const handleToggle = useCallback(
    (tag: GenreTag) => {
      if (selectedSet.has(tag)) {
        onUnselect(tag);
      } else {
        onSelect(tag);
      }
    },
    [selectedSet, onSelect, onUnselect],
  );

  return (
    <RNModal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={[styles.backdrop, { backgroundColor: theme.overlay }]}>
          <TouchableWithoutFeedback onPress={() => {}}>
            <View style={[styles.modal, { backgroundColor: theme.bgCard, borderColor: theme.border }]}>
              {/* ── Header ─────────────────────────────────────── */}
              <View style={[styles.header, { borderBottomColor: theme.borderLight }]}>
                <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>
                  Filter by Genre
                </Text>
                <Pressable
                  onPress={onClose}
                  hitSlop={12}
                  style={({ pressed }) => ({
                    padding: 4,
                    borderRadius: 20,
                    backgroundColor: pressed ? theme.bgSecondary : 'transparent',
                  })}
                  accessibilityLabel="Close genre filter"
                  accessibilityRole="button"
                >
                  <MaterialCommunityIcons name="close" size={22} color={theme.textSecondary} />
                </Pressable>
              </View>

              {/* ── Body ──────────────────────────────────────── */}
              <ScrollView
                style={styles.scroll}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={true}
              >
                {GENRE_CATEGORIES.map((category) => {
                  const catSelected = category.tags.filter((t) => selectedSet.has(t));
                  const allSelected = catSelected.length === category.tags.length;

                  return (
                    <View key={category.key} style={styles.category}>
                      {/* Category header + actions */}
                      <View style={styles.categoryHeader}>
                        <Text style={[styles.categoryLabel, { color: theme.textSecondary }]}>
                          {category.label}
                        </Text>
                        <View style={styles.categoryActions}>
                          {allSelected ? (
                            <Pressable
                              onPress={() => onClearCategory(category.tags)}
                              style={({ pressed }) => ({
                                paddingHorizontal: spacing.p10,
                                paddingVertical: spacing.p4,
                                borderRadius: 6,
                                backgroundColor: pressed ? theme.bgSecondary : 'transparent',
                                borderWidth: 1,
                                borderColor: theme.borderLight,
                              })}
                              accessibilityLabel={`Clear all ${category.label}`}
                              accessibilityRole="button"
                            >
                              <Text style={[styles.actionText, { color: theme.textSecondary }]}>
                                Clear
                              </Text>
                            </Pressable>
                          ) : (
                            <Pressable
                              onPress={() => onSelectCategory(category.tags)}
                              style={({ pressed }) => ({
                                paddingHorizontal: spacing.p10,
                                paddingVertical: spacing.p4,
                                borderRadius: 6,
                                backgroundColor: pressed ? theme.accentLight : theme.accent,
                                borderWidth: 1,
                                borderColor: theme.accent,
                              })}
                              accessibilityLabel={`Select all ${category.label}`}
                              accessibilityRole="button"
                            >
                              <Text style={[styles.actionText, { color: theme.textInverse }]}>
                                Select All
                              </Text>
                            </Pressable>
                          )}
                        </View>
                      </View>

                      {/* Genre grid */}
                      <View style={styles.genreGrid}>
                        {category.tags.map((tag) => {
                          const isSelected = selectedSet.has(tag);
                          const label = genreLabel(tag);

                          return (
                            <Pressable
                              key={tag}
                              onPress={() => handleToggle(tag)}
                              style={({ pressed }) => [
                                styles.genreChip,
                                {
                                  backgroundColor: isSelected
                                    ? theme.accent
                                    : pressed
                                    ? theme.bgSecondary
                                    : theme.bg,
                                  borderColor: isSelected ? theme.accent : theme.borderLight,
                                },
                              ]}
                              accessibilityLabel={`${label}${isSelected ? ' (selected)' : ''}`}
                              accessibilityRole="button"
                            >
                              <Text
                                style={[
                                  styles.genreChipText,
                                  {
                                    color: isSelected ? theme.textInverse : theme.textPrimary,
                                    fontWeight: isSelected ? ('700' as const) : ('500' as const),
                                  },
                                ]}
                                numberOfLines={1}
                              >
                                {label}
                              </Text>
                              {isSelected && (
                                <MaterialCommunityIcons
                                  name="check"
                                  size={14}
                                  color={theme.textInverse}
                                  style={{ marginLeft: 4 }}
                                />
                              )}
                            </Pressable>
                          );
                        })}
                      </View>
                    </View>
                  );
                })}
              </ScrollView>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </RNModal>
  );
};

// ─── Styles ────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modal: {
    width: '100%',
    maxWidth: 420,
    maxHeight: '80%',
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.p16,
    paddingVertical: spacing.p14,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.p16,
    paddingVertical: spacing.p12,
    paddingBottom: spacing.p24,
  },
  category: {
    marginBottom: spacing.p20,
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.p10,
  },
  categoryLabel: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  categoryActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionText: {
    fontSize: 12,
    fontWeight: '600',
  },
  genreGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  genreChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.p12,
    paddingVertical: spacing.p7,
    borderRadius: 20,
    borderWidth: 1.5,
    minHeight: 36,
  },
  genreChipText: {
    fontSize: 13,
  },
});

export default GenreFilterModal;
