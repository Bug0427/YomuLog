// components/layout/GenreFilterTags.tsx
// Interactive genre tag pills with three interaction modes:
//   1. Tap – select (add to active filter) / unselect (remove from filter)
//   2. Long-press any tag – enter "remove mode" showing '✕' on each tag
//   3. "Done" button – exit remove mode
// Designed to be shown inside the Filter menu / as an enhancement to GenreSlider.

import React, { FC, useState, useCallback, useMemo } from 'react';
import {
  View,
  ScrollView,
  Pressable,
  Text,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { GenreTag } from '../../utils/filters';
import { spacing } from '../../styles/tokens';

// ─── Display helpers ──────────────────────────────────────────────

/** "slice-of-life" → "Slice of Life" */
export function genreLabel(tag: GenreTag | string): string {
  return tag
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

// ─── Props ────────────────────────────────────────────────────────

type GenreFilterTagsProps = {
  /** All genre tags available (suggestions or full list). */
  genres: GenreTag[];
  /** Currently selected (active) genre filters. */
  selected: GenreTag[];
  /** Called when a tag is toggled in normal mode. */
  onToggle: (tag: GenreTag) => void;
  /** Called when a tag is permanently removed from the suggestion set. */
  onRemove?: (tag: GenreTag) => void;
  /** Optional style overrides. */
  containerStyle?: StyleProp<ViewStyle>;
  /** Label for the Done button (default "Done"). */
  doneLabel?: string;
};

// ─── Component ────────────────────────────────────────────────────

const GenreFilterTags: FC<GenreFilterTagsProps> = ({
  genres,
  selected,
  onToggle,
  onRemove,
  containerStyle,
  doneLabel = 'Done',
}) => {
  const { colors: theme } = useTheme();
  const [removeMode, setRemoveMode] = useState(false);

  const selectedSet = useMemo(() => new Set(selected), [selected]);

  const handlePress = useCallback(
    (tag: GenreTag) => {
      if (removeMode) {
        // In remove mode: tapping removes from suggestion set
        onRemove?.(tag);
      } else {
        onToggle(tag);
      }
    },
    [removeMode, onRemove, onToggle],
  );

  const handleLongPress = useCallback(() => {
    if (!removeMode) setRemoveMode(true);
  }, [removeMode]);

  const exitRemoveMode = useCallback(() => {
    setRemoveMode(false);
  }, []);

  if (genres.length === 0) return null;

  return (
    <View style={[{ paddingHorizontal: spacing.p12, paddingVertical: spacing.p8 }, containerStyle]}>
      {/* ── Header row ─────────────────────────────────────────── */}
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: spacing.p8,
        }}
      >
        <Text
          style={{
            color: theme.textSecondary,
            fontWeight: '600',
            fontSize: 13,
          }}
        >
          {removeMode ? 'Tap to remove unwanted genres' : 'Genres'}
        </Text>
        {removeMode && (
          <Pressable
            onPress={exitRemoveMode}
            style={{
              paddingHorizontal: spacing.p12,
              paddingVertical: spacing.p5,
              borderRadius: 6,
              backgroundColor: theme.accent,
            }}
            accessibilityLabel={doneLabel}
            accessibilityRole="button"
          >
            <Text
              style={{
                color: theme.textInverse,
                fontWeight: '700',
                fontSize: 12,
              }}
            >
              {doneLabel}
            </Text>
          </Pressable>
        )}
      </View>

      {/* ── Genre pill row (horizontal scroll) ──────────────────── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
        }}
      >
        {genres.map((tag) => {
          const isSelected = selectedSet.has(tag);
          const label = genreLabel(tag);

          return (
            <Pressable
              key={tag}
              onPress={() => handlePress(tag)}
              onLongPress={handleLongPress}
              delayLongPress={500}
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: spacing.p14,
                paddingVertical: spacing.p6,
                borderRadius: 20,
                borderWidth: 1.5,
                borderColor: isSelected ? theme.accent : theme.borderLight,
                backgroundColor: isSelected
                  ? theme.accent
                  : pressed
                  ? theme.bgSecondary
                  : theme.bgCard,
                opacity: pressed ? 0.85 : 1,
                // In remove mode, give a subtle indicator
                ...(removeMode
                  ? {
                      borderStyle: 'dashed' as const,
                      borderColor: theme.error,
                    }
                  : {}),
              })}
              accessibilityLabel={
                removeMode ? `Remove ${label}` : `${label}${isSelected ? ' (selected)' : ''}`
              }
              accessibilityRole="button"
            >
              {/* ── Remove-mode X icon ────────────────────────── */}
              {removeMode && (
                <MaterialCommunityIcons
                  name="close-circle"
                  size={15}
                  color={theme.error}
                  style={{ marginRight: 4 }}
                />
              )}
              <Text
                style={{
                  fontWeight: isSelected ? '700' : '500',
                  fontSize: 12,
                  color: isSelected ? theme.textInverse : theme.textPrimary,
                }}
              >
                {label}
              </Text>
              {/* ── Selected check icon ────────────────────────── */}
              {isSelected && !removeMode && (
                <MaterialCommunityIcons
                  name="check"
                  size={13}
                  color={theme.textInverse}
                  style={{ marginLeft: 4 }}
                />
              )}
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
};

export default GenreFilterTags;
