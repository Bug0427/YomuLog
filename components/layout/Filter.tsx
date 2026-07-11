// components/layout/Filter.tsx
// Multi-criteria FilterBar: genres (multi-select), publication status, content rating, reading status.
import React, { useState, useCallback } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { colors, borders, spacing, u } from '../../styles/tokens';
import { GENRE_TAGS, GenreTag, PUB_STATUS_OPTIONS, PubStatusValue, CONTENT_RATING_OPTIONS, ContentRatingValue, FilterState, DEFAULT_FILTER_STATE } from '../../utils/filters';
import { ReadingStatus } from '../../services/favoritesService';

type Props = { filter: FilterState; onChange: (s: FilterState) => void; showReadingStatus?: boolean; };

export default function Filter({ filter, onChange, showReadingStatus }: Props) {
  const [pubOpen, setPubOpen] = useState(false);
  const [ratingOpen, setRatingOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);

  const toggleGenre = useCallback((g: GenreTag) => {
    const next = filter.genres.includes(g) ? filter.genres.filter((x) => x !== g) : [...filter.genres, g];
    onChange({ ...filter, genres: next });
  }, [filter, onChange]);

  const setPub = useCallback((v: PubStatusValue | null) => { onChange({ ...filter, pubStatus: v }); setPubOpen(false); }, [filter, onChange]);
  const setRating = useCallback((v: ContentRatingValue | null) => { onChange({ ...filter, contentRating: v }); setRatingOpen(false); }, [filter, onChange]);
  const setReading = useCallback((v: ReadingStatus | null) => { onChange({ ...filter, readingStatus: v }); setStatusOpen(false); }, [filter, onChange]);

  const hasActive = filter.genres.length > 0 || filter.pubStatus !== null || filter.contentRating !== null || filter.readingStatus !== null;
  const label = (g: GenreTag) => g.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

  return (
    <View style={{ paddingHorizontal: spacing.p12, paddingVertical: spacing.p8 }}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          {GENRE_TAGS.map((genre) => {
            const active = filter.genres.includes(genre);
            return (
              <Pressable key={genre} onPress={() => toggleGenre(genre)} style={{ paddingHorizontal: 12, paddingVertical: 5, borderRadius: borders.br20, borderWidth: borders.bw1, borderColor: active ? colors.deepPlum : colors.cocoa, backgroundColor: active ? colors.deepPlum : colors.sand }}>
                <Text style={{ fontSize: 11, fontWeight: '600', color: active ? colors.paleLavender : colors.cocoa }}>{label(genre)}</Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      <View style={{ flexDirection: 'row', gap: 8, marginTop: spacing.p10 }}>
        <DropdownWrap>
          <DropdownBtn label={PUB_STATUS_OPTIONS.find((o) => o.value === filter.pubStatus)?.label ?? 'Status'} open={pubOpen} onToggle={() => setPubOpen((o) => !o)} />
          {pubOpen && (
            <DropdownMenu>
              {PUB_STATUS_OPTIONS.map((opt) => (<DropdownItem key={opt.label} label={opt.label} active={filter.pubStatus === opt.value} onPress={() => setPub(opt.value)} />))}
            </DropdownMenu>
          )}
        </DropdownWrap>
        <DropdownWrap>
          <DropdownBtn label={CONTENT_RATING_OPTIONS.find((o) => o.value === filter.contentRating)?.label ?? 'Rating'} open={ratingOpen} onToggle={() => setRatingOpen((o) => !o)} />
          {ratingOpen && (
            <DropdownMenu>
              {CONTENT_RATING_OPTIONS.map((opt) => (<DropdownItem key={opt.label} label={opt.label} active={filter.contentRating === opt.value} onPress={() => setRating(opt.value)} />))}
            </DropdownMenu>
          )}
        </DropdownWrap>
        {showReadingStatus && (
          <DropdownWrap>
            <DropdownBtn label={filter.readingStatus ? filter.readingStatus.replace(/_/g, ' ') : 'Reading'} open={statusOpen} onToggle={() => setStatusOpen((o) => !o)} />
            {statusOpen && (
              <DropdownMenu>
                {[{ label: 'All', value: null }, { label: 'Reading', value: 'reading' as ReadingStatus }, { label: 'Completed', value: 'completed' as ReadingStatus }, { label: 'On Hold', value: 'on_hold' as ReadingStatus }, { label: 'Dropped', value: 'dropped' as ReadingStatus }, { label: 'Plan to Read', value: 'plan_to_read' as ReadingStatus }].map((opt) => (<DropdownItem key={opt.label} label={opt.label} active={filter.readingStatus === opt.value} onPress={() => setReading(opt.value)} />))}
              </DropdownMenu>
            )}
          </DropdownWrap>
        )}
      </View>
      {hasActive && (
        <Pressable onPress={() => onChange(DEFAULT_FILTER_STATE)} style={{ alignSelf: 'flex-end', marginTop: spacing.p8 }}>
          <Text style={{ color: colors.error, fontSize: 12, fontWeight: '600' }}>Clear all filters</Text>
        </Pressable>
      )}
    </View>
  );
}

function DropdownWrap({ children }: { children: React.ReactNode }) {
  return <View style={{ flex: 1, zIndex: 10 }}>{children}</View>;
}
function DropdownBtn({ label, open, onToggle }: { label: string; open: boolean; onToggle: () => void }) {
  return (
    <Pressable onPress={onToggle} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing.p8, paddingHorizontal: spacing.p10, ...u.border2Cocoa, borderRadius: borders.br8, backgroundColor: colors.sand }}>
      <Text style={{ color: colors.cocoa, fontWeight: '600', fontSize: 12, flex: 1 }} numberOfLines={1}>{label}</Text>
      <Text style={{ color: colors.cocoa, fontSize: 10 }}>{open ? '▲' : '▼'}</Text>
    </Pressable>
  );
}
function DropdownMenu({ children }: { children: React.ReactNode }) {
  return <View style={{ marginTop: 2, ...u.border2Cocoa, borderRadius: borders.br8, backgroundColor: colors.paleLavender, overflow: 'hidden', position: 'absolute', left: 0, right: 0, zIndex: 100 }}>{children}</View>;
}
function DropdownItem({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={{ paddingVertical: spacing.p8, paddingHorizontal: spacing.p10, backgroundColor: active ? colors.deepPlum : 'transparent' }}>
      <Text style={{ fontWeight: active ? '700' : '500', color: active ? colors.paleLavender : colors.plum, fontSize: 12 }}>{label}</Text>
    </Pressable>
  );
}