// components/layout/Filter.tsx
// Multi-criteria Filter modal: publication status (multi-select),
// content format (multi-select), and reading status — all inline checklists.
// Genres are handled by the capsule bar on SearchScreen — no longer rendered here.
import React, { useCallback } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { colors, borders, spacing, u } from '../../styles/tokens';
import { useTheme } from '../../context/ThemeContext';
import {
  PUB_STATUS_OPTIONS,
  PubStatusValue,
  CONTENT_FORMAT_OPTIONS,
  ContentFormatValue,
  FilterState,
  DEFAULT_FILTER_STATE,
} from '../../utils/filters';
import { ReadingStatus } from '../../services/favoritesService';

type Props = {
  filter: FilterState;
  onChange: (s: FilterState) => void;
  showReadingStatus?: boolean;
};

export default function Filter({
  filter,
  onChange,
  showReadingStatus,
}: Props) {
  const theme = useTheme();

  /** Multi-select toggle for pub status */
  const togglePub = useCallback(
    (v: PubStatusValue) => {
      const next = filter.pubStatus.includes(v)
        ? filter.pubStatus.filter((s) => s !== v)
        : [...filter.pubStatus, v];
      onChange({ ...filter, pubStatus: next });
    },
    [filter, onChange],
  );

  /** Multi-select toggle for content format */
  const toggleFormat = useCallback(
    (v: ContentFormatValue) => {
      const next = filter.contentFormat.includes(v)
        ? filter.contentFormat.filter((f) => f !== v)
        : [...filter.contentFormat, v];
      onChange({ ...filter, contentFormat: next });
    },
    [filter, onChange],
  );

  const setReading = useCallback(
    (v: ReadingStatus | null) => {
      onChange({ ...filter, readingStatus: v });
    },
    [filter, onChange],
  );

  const hasActive =
    filter.pubStatus.length > 0 ||
    filter.contentFormat.length > 0 ||
    filter.readingStatus !== null;

  return (
    <ScrollView
      style={s.container}
      contentContainerStyle={s.content}
      showsVerticalScrollIndicator={true}
    >
      {/* ── Publication Status ───────────────────────────────── */}
      <SectionLabel label="Publication Status" theme={theme} />
      {PUB_STATUS_OPTIONS.map((opt) => (
        <CheckboxItem
          key={opt.value}
          label={opt.label}
          active={filter.pubStatus.includes(opt.value)}
          onPress={() => togglePub(opt.value)}
        />
      ))}

      {/* ── Content Format ───────────────────────────────────── */}
      <SectionLabel label="Content Format" theme={theme} />
      {CONTENT_FORMAT_OPTIONS.map((opt) => (
        <CheckboxItem
          key={opt.value}
          label={opt.label}
          active={filter.contentFormat.includes(opt.value)}
          onPress={() => toggleFormat(opt.value)}
        />
      ))}

      {/* ── Reading Status ───────────────────────────────────── */}
      {showReadingStatus && (
        <>
          <SectionLabel label="Reading Status" theme={theme} />
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
            <CheckboxItem
              key={opt.label}
              label={opt.label}
              active={filter.readingStatus === opt.value}
              radio
              onPress={() => setReading(opt.value)}
            />
          ))}
        </>
      )}

      {/* ── Clear All ────────────────────────────────────────── */}
      {hasActive && (
        <View style={s.clearArea}>
          <View style={{ height: 1, backgroundColor: theme.border, marginBottom: spacing.p10 }} />
          <ClearAllButton onPress={() => onChange(DEFAULT_FILTER_STATE)} theme={theme} />
        </View>
      )}
    </ScrollView>
  );
}

// ── Section header ───────────────────────────────────────────

function SectionLabel({ label, theme }: { label: string; theme: ReturnType<typeof useTheme> }) {
  return (
    <Text
      style={{
        fontSize: 12,
        fontWeight: '700',
        color: theme.textSecondary,
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginTop: spacing.p12,
        marginBottom: spacing.p6,
        paddingHorizontal: 2,
      }}
    >
      {label}
    </Text>
  );
}

// ── Checkbox / radio item ────────────────────────────────────

function CheckboxItem({
  label,
  active,
  radio,
  onPress,
}: {
  label: string;
  active: boolean;
  radio?: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  const shape = radio ? s.radio : s.checkbox;
  const activeShape = radio ? s.radioActive : s.checkboxActive;
  const inner = radio
    ? (active ? <View style={s.radioDot} /> : null)
    : (active ? <Text style={{ color: theme.bgCard, fontSize: 11, fontWeight: '700' }}>✓</Text> : null);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: spacing.p8,
        paddingHorizontal: 4,
        borderRadius: borders.br6,
        backgroundColor: pressed ? theme.bgSecondary : 'transparent',
        minHeight: 40,
      })}
    >
      <View style={[shape, active && activeShape, { borderColor: active ? theme.accent : theme.borderLight, backgroundColor: active ? theme.accent : 'transparent' }]}>
        {inner}
      </View>
      <Text
        style={{
          fontWeight: active ? '700' : '500',
          color: active ? theme.accent : theme.textPrimary,
          fontSize: 14,
          marginLeft: spacing.p10,
          flex: 1,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

// ── ClearAllButton (themed, inline) ──────────────────────────

function ClearAllButton({
  onPress,
  theme,
}: {
  onPress: () => void;
  theme: ReturnType<typeof useTheme>;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        alignSelf: 'center',
        paddingVertical: spacing.p8,
        paddingHorizontal: spacing.p16,
        borderRadius: borders.br8,
        borderWidth: 1,
        borderColor: theme.borderLight,
        backgroundColor: pressed ? theme.bgSecondary : 'transparent',
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <Text
        style={{
          fontSize: 14,
          fontWeight: '600',
          color: theme.textSecondary,
        }}
      >
        Clear All
      </Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  container: {
    // parent modal controls the height via maxHeight
  },
  content: {
    paddingHorizontal: spacing.p16,
    paddingVertical: spacing.p8,
    paddingBottom: spacing.p24,
  },
  clearArea: {
    marginTop: spacing.p16,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxActive: {},
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioActive: {},
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#fff',
  },
});
