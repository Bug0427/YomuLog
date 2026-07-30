// components/layout/Filter.tsx
// Multi-criteria FilterBar: dynamic genre filter tags, publication status,
// content rating, and reading status.
import React, { useState, useCallback } from 'react';
import { View, Text, Pressable } from 'react-native';
import { colors, borders, spacing, u } from '../../styles/tokens';
import {
  PUB_STATUS_OPTIONS,
  PubStatusValue,
  CONTENT_RATING_OPTIONS,
  ContentRatingValue,
  FilterState,
  DEFAULT_FILTER_STATE,
  GenreTag,
} from '../../utils/filters';
import { ReadingStatus } from '../../services/favoritesService';
import GenreFilterTags from './GenreFilterTags';
import ClearAllButton from '../general/ClearAllButton';

type Props = {
  filter: FilterState;
  onChange: (s: FilterState) => void;
  showReadingStatus?: boolean;
  /** Dynamic genre suggestions (top-N from reading behaviour). */
  suggestedGenres?: GenreTag[];
  /** Called when a genre is removed from the suggestion set. */
  onRemoveGenre?: (tag: GenreTag) => void;
};

export default function Filter({
  filter,
  onChange,
  showReadingStatus,
  suggestedGenres,
  onRemoveGenre,
}: Props) {
  const [pubOpen, setPubOpen] = useState(false);
  const [ratingOpen, setRatingOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);

  const setPub = useCallback(
    (v: PubStatusValue | null) => {
      onChange({ ...filter, pubStatus: v });
      setPubOpen(false);
    },
    [filter, onChange],
  );
  const setRating = useCallback(
    (v: ContentRatingValue | null) => {
      onChange({ ...filter, contentRating: v });
      setRatingOpen(false);
    },
    [filter, onChange],
  );
  const setReading = useCallback(
    (v: ReadingStatus | null) => {
      onChange({ ...filter, readingStatus: v });
      setStatusOpen(false);
    },
    [filter, onChange],
  );

  /** Toggle a genre in/out of the active filter. */
  const handleGenreToggle = useCallback(
    (tag: GenreTag) => {
      const next = filter.genres.includes(tag)
        ? filter.genres.filter((g) => g !== tag)
        : [...filter.genres, tag];
      onChange({ ...filter, genres: next });
    },
    [filter, onChange],
  );

  const hasActive =
    filter.genres.length > 0 ||
    filter.pubStatus !== null ||
    filter.contentRating !== null ||
    filter.readingStatus !== null;

  return (
    <View style={{ paddingHorizontal: spacing.p12, paddingVertical: spacing.p8 }}>
      {/* ── Dynamic Genre Filter Tags (with remove mode) ───────── */}
      {suggestedGenres && suggestedGenres.length > 0 && (
        <GenreFilterTags
          genres={suggestedGenres}
          selected={filter.genres}
          onToggle={handleGenreToggle}
          onRemove={onRemoveGenre}
        />
      )}

      {/* ── Dropdown filters ───────────────────────────────────── */}
      <View style={{ flexDirection: 'row', gap: 8, marginTop: spacing.p10 }}>
        <DropdownWrap>
          <DropdownBtn
            label={
              PUB_STATUS_OPTIONS.find((o) => o.value === filter.pubStatus)?.label ?? 'Status'
            }
            open={pubOpen}
            onToggle={() => setPubOpen((o) => !o)}
          />
          {pubOpen && (
            <DropdownMenu>
              {PUB_STATUS_OPTIONS.map((opt) => (
                <DropdownItem
                  key={opt.label}
                  label={opt.label}
                  active={filter.pubStatus === opt.value}
                  onPress={() => setPub(opt.value)}
                />
              ))}
            </DropdownMenu>
          )}
        </DropdownWrap>
        <DropdownWrap>
          <DropdownBtn
            label={
              CONTENT_RATING_OPTIONS.find((o) => o.value === filter.contentRating)?.label ??
              'Rating'
            }
            open={ratingOpen}
            onToggle={() => setRatingOpen((o) => !o)}
          />
          {ratingOpen && (
            <DropdownMenu>
              {CONTENT_RATING_OPTIONS.map((opt) => (
                <DropdownItem
                  key={opt.label}
                  label={opt.label}
                  active={filter.contentRating === opt.value}
                  onPress={() => setRating(opt.value)}
                />
              ))}
            </DropdownMenu>
          )}
        </DropdownWrap>
        {showReadingStatus && (
          <DropdownWrap>
            <DropdownBtn
              label={
                filter.readingStatus
                  ? filter.readingStatus.replace(/_/g, ' ')
                  : 'Reading'
              }
              open={statusOpen}
              onToggle={() => setStatusOpen((o) => !o)}
            />
            {statusOpen && (
              <DropdownMenu>
                {(
                  [
                    { label: 'All', value: null },
                    { label: 'Reading', value: 'reading' as ReadingStatus },
                    { label: 'Completed', value: 'completed' as ReadingStatus },
                    { label: 'On Hold', value: 'on_hold' as ReadingStatus },
                    { label: 'Dropped', value: 'dropped' as ReadingStatus },
                    { label: 'Plan to Read', value: 'plan_to_read' as ReadingStatus },
                  ] as const
                ).map((opt) => (
                  <DropdownItem
                    key={opt.label}
                    label={opt.label}
                    active={filter.readingStatus === opt.value}
                    onPress={() => setReading(opt.value)}
                  />
                ))}
              </DropdownMenu>
            )}
          </DropdownWrap>
        )}
      </View>

      {/* ── Clear all ───────────────────────────────────────────── */}
      {hasActive && (
        <ClearAllButton onPress={() => onChange(DEFAULT_FILTER_STATE)} />
      )}
    </View>
  );
}

// ── Internal sub-components (unchanged) ──────────────────────────

function DropdownWrap({ children }: { children: React.ReactNode }) {
  return <View style={{ flex: 1, zIndex: 10 }}>{children}</View>;
}

function DropdownBtn({
  label,
  open,
  onToggle,
}: {
  label: string;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <Pressable
      onPress={onToggle}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: spacing.p8,
        paddingHorizontal: spacing.p10,
        ...u.border2Cocoa,
        borderRadius: borders.br8,
        backgroundColor: colors.sand,
      }}
    >
      <Text
        style={{ color: colors.cocoa, fontWeight: '600', fontSize: 12, flex: 1 }}
        numberOfLines={1}
      >
        {label}
      </Text>
      <Text style={{ color: colors.cocoa, fontSize: 10 }}>{open ? '▲' : '▼'}</Text>
    </Pressable>
  );
}

function DropdownMenu({ children }: { children: React.ReactNode }) {
  return (
    <View
      style={{
        marginTop: 2,
        ...u.border2Cocoa,
        borderRadius: borders.br8,
        backgroundColor: colors.paleLavender,
        overflow: 'hidden',
        position: 'absolute',
        left: 0,
        right: 0,
        zIndex: 100,
      }}
    >
      {children}
    </View>
  );
}

function DropdownItem({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        paddingVertical: spacing.p8,
        paddingHorizontal: spacing.p10,
        backgroundColor: active ? colors.deepPlum : 'transparent',
      }}
    >
      <Text
        style={{
          fontWeight: active ? '700' : '500',
          color: active ? colors.paleLavender : colors.plum,
          fontSize: 12,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}
