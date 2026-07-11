// components/layout/FilterBar.tsx
// Custom FilterBar for filtering by genres and reading status.

import React, { useState, useCallback } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { colors, borders, spacing, u } from '../../styles/tokens';
import { ReadingStatus } from '../../services/favoritesService';

// ─── Constants ───────────────────────────────────────────────────

export const ALL_GENRES = [
  'Action', 'Adventure', 'Comedy', 'Drama', 'Fantasy', 'Horror',
  'Mystery', 'Romance', 'Sci-Fi', 'Slice of Life', 'Thriller',
];

export const READING_STATUS_OPTIONS: { label: string; value: ReadingStatus | null }[] = [
  { label: 'All', value: null },
  { label: 'Reading', value: 'reading' },
  { label: 'Completed', value: 'completed' },
  { label: 'On Hold', value: 'on_hold' },
  { label: 'Dropped', value: 'dropped' },
  { label: 'Plan to Read', value: 'plan_to_read' },
];

// ─── Props ────────────────────────────────────────────────────────

type FilterBarProps = {
  selectedGenres: string[];
  onGenresChange: (genres: string[]) => void;
  selectedStatus: ReadingStatus | null;
  onStatusChange: (status: ReadingStatus | null) => void;
};

// ─── Component ────────────────────────────────────────────────────

export default function FilterBar({
  selectedGenres,
  onGenresChange,
  selectedStatus,
  onStatusChange,
}: FilterBarProps) {
  const [statusOpen, setStatusOpen] = useState(false);

  const toggleGenre = useCallback(
    (genre: string) => {
      if (selectedGenres.includes(genre)) {
        onGenresChange(selectedGenres.filter((g) => g !== genre));
      } else {
        onGenresChange([...selectedGenres, genre]);
      }
    },
    [selectedGenres, onGenresChange],
  );

  return (
    <View style={{ paddingHorizontal: spacing.p12, paddingVertical: spacing.p8 }}>
      {/* Genre pills — multi-select */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {ALL_GENRES.map((genre) => {
            const active = selectedGenres.includes(genre);
            return (
              <Pressable
                key={genre}
                onPress={() => toggleGenre(genre)}
                style={[
                  {
                    paddingHorizontal: 14,
                    paddingVertical: 6,
                    borderRadius: borders.br20,
                    borderWidth: borders.bw1,
                    borderColor: active ? colors.deepPlum : colors.cocoa,
                    backgroundColor: active ? colors.deepPlum : colors.sand,
                  },
                ]}
              >
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: '600',
                    color: active ? colors.paleLavender : colors.cocoa,
                  }}
                >
                  {genre}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      {/* Reading status dropdown */}
      <View style={{ marginTop: spacing.p10 }}>
        <Pressable
          onPress={() => setStatusOpen((o) => !o)}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingVertical: spacing.p8,
            paddingHorizontal: spacing.p12,
            ...u.border2Cocoa,
            borderRadius: borders.br8,
            backgroundColor: colors.sand,
          }}
        >
          <Text style={{ color: colors.cocoa, fontWeight: '600', fontSize: 14 }}>
            Status:{' '}
            <Text style={{ color: colors.plum }}>
              {READING_STATUS_OPTIONS.find((o) => o.value === selectedStatus)?.label ?? 'All'}
            </Text>
          </Text>
          <Text style={{ color: colors.cocoa, fontSize: 12 }}>
            {statusOpen ? '▲' : '▼'}
          </Text>
        </Pressable>

        {statusOpen && (
          <View
            style={{
              marginTop: 4,
              ...u.border2Cocoa,
              borderRadius: borders.br8,
              backgroundColor: colors.paleLavender,
              overflow: 'hidden',
            }}
          >
            {READING_STATUS_OPTIONS.map((opt) => {
              const active = selectedStatus === opt.value;
              return (
                <Pressable
                  key={opt.label}
                  onPress={() => {
                    onStatusChange(opt.value);
                    setStatusOpen(false);
                  }}
                  style={{
                    paddingVertical: spacing.p10,
                    paddingHorizontal: spacing.p12,
                    backgroundColor: active ? colors.deepPlum : 'transparent',
                  }}
                >
                  <Text
                    style={{
                      fontWeight: active ? '700' : '500',
                      color: active ? colors.paleLavender : colors.plum,
                    }}
                  >
                    {opt.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        )}
      </View>
    </View>
  );
}