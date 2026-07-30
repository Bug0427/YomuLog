// components/layout/Filter.tsx
// Multi-criteria Filter modal: publication status (multi-select),
// content format (multi-select), and reading status.
// Genres are handled by the capsule bar on SearchScreen — no longer rendered here.
import React, { useState, useCallback } from 'react';
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
  const [pubOpen, setPubOpen] = useState(false);
  const [formatOpen, setFormatOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);

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
      setStatusOpen(false);
    },
    [filter, onChange],
  );

  const hasActive =
    filter.pubStatus.length > 0 ||
    filter.contentFormat.length > 0 ||
    filter.readingStatus !== null;

  /** Label for a multi-select dropdown button */
  const pubLabel =
    filter.pubStatus.length === 0
      ? 'Status'
      : filter.pubStatus.length === 1
      ? filter.pubStatus[0]
      : `${filter.pubStatus.length} selected`;

  const formatLabel =
    filter.contentFormat.length === 0
      ? 'Format'
      : filter.contentFormat.length === 1
      ? filter.contentFormat[0]
      : `${filter.contentFormat.length} selected`;

  return (
    <ScrollView
      style={s.container}
      contentContainerStyle={s.content}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Dropdowns row ─────────────────────────────────────── */}
      <View style={s.dropdownRow}>
        {/* Pub status multi-select */}
        <DropdownWrap>
          <DropdownBtn label={pubLabel} open={pubOpen} onToggle={() => setPubOpen((o) => !o)} />
          {pubOpen && (
            <DropdownMenu>
              {PUB_STATUS_OPTIONS.map((opt) => (
                <DropdownItem
                  key={opt.value}
                  label={opt.label}
                  active={filter.pubStatus.includes(opt.value)}
                  multi
                  onPress={() => togglePub(opt.value)}
                />
              ))}
            </DropdownMenu>
          )}
        </DropdownWrap>

        {/* Content format multi-select */}
        <DropdownWrap>
          <DropdownBtn
            label={formatLabel}
            open={formatOpen}
            onToggle={() => setFormatOpen((o) => !o)}
          />
          {formatOpen && (
            <DropdownMenu>
              {CONTENT_FORMAT_OPTIONS.map((opt) => (
                <DropdownItem
                  key={opt.value}
                  label={opt.label}
                  active={filter.contentFormat.includes(opt.value)}
                  multi
                  onPress={() => toggleFormat(opt.value)}
                />
              ))}
            </DropdownMenu>
          )}
        </DropdownWrap>

        {/* Reading status (still single-select) */}
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

// ── Internal sub-components ──────────────────────────────────

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
  const theme = useTheme();
  return (
    <Pressable
      onPress={onToggle}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: spacing.p10,
        paddingHorizontal: spacing.p12,
        borderWidth: 1.5,
        borderColor: theme.borderLight,
        borderRadius: borders.br8,
        backgroundColor: theme.bgCard,
        minHeight: 42,
      }}
    >
      <Text
        style={{ color: theme.textPrimary, fontWeight: '600', fontSize: 13, flex: 1 }}
        numberOfLines={1}
      >
        {label}
      </Text>
      <Text style={{ color: theme.textSecondary, fontSize: 10, marginLeft: 4 }}>
        {open ? '▲' : '▼'}
      </Text>
    </Pressable>
  );
}

function DropdownMenu({ children }: { children: React.ReactNode }) {
  const theme = useTheme();
  return (
    <View
      style={{
        marginTop: 4,
        borderWidth: 1.5,
        borderColor: theme.border,
        borderRadius: borders.br8,
        backgroundColor: theme.bgCard,
        overflow: 'hidden',
        position: 'absolute',
        left: 0,
        right: 0,
        zIndex: 100,
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
      }}
    >
      {children}
    </View>
  );
}

function DropdownItem({
  label,
  active,
  multi,
  onPress,
}: {
  label: string;
  active: boolean;
  multi?: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: spacing.p10,
        paddingHorizontal: spacing.p12,
        backgroundColor: active
          ? theme.accent + '22'
          : pressed
          ? theme.bgSecondary
          : 'transparent',
        minHeight: 44,
      })}
    >
      {multi && (
        <View
          style={{
            width: 18,
            height: 18,
            borderRadius: 4,
            borderWidth: 1.5,
            borderColor: active ? theme.accent : theme.borderLight,
            backgroundColor: active ? theme.accent : 'transparent',
            marginRight: spacing.p8,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {active && (
            <Text style={{ color: theme.bgCard, fontSize: 11, fontWeight: '700' }}>✓</Text>
          )}
        </View>
      )}
      <Text
        style={{
          fontWeight: active ? '700' : '500',
          color: active ? theme.accent : theme.textPrimary,
          fontSize: 13,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  container: {
    maxHeight: 420,
  },
  content: {
    paddingHorizontal: spacing.p16,
    paddingVertical: spacing.p12,
  },
  dropdownRow: {
    flexDirection: 'row',
    gap: 10,
  },
  clearArea: {
    marginTop: spacing.p16,
  },
});
