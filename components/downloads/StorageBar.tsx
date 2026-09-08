// components/downloads/StorageBar.tsx
// Horizontal storage bar with label (extracted from ManageDownloadsScreen — H-6 decomposition).
import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme, type ThemeColors } from '../../context/ThemeContext';
import { formatBytesCompact } from './formatBytes';

/** Maximum estimated storage a user might consume (used for bar graph scale) */
export const MAX_STORAGE_BUDGET = 500 * 1024 * 1024; // 500 MB reference scale

/** Renders a single horizontal storage bar with label */
export function StorageBar({
  label,
  bytes,
  totalBytes,
  color,
}: {
  label: string;
  bytes: number;
  totalBytes: number;
  color: string;
}) {
  const { colors: theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const pct = totalBytes > 0 ? Math.min((bytes / MAX_STORAGE_BUDGET) * 100, 100) : 0;
  return (
    <View style={styles.barRow}>
      <Text style={styles.barLabel} numberOfLines={1}>
        {label}
      </Text>
      <View style={styles.barTrack}>
        <View style={[styles.barFill, { width: `${pct}%`, backgroundColor: color }]} />
      </View>
      <Text style={styles.barValue}>{formatBytesCompact(bytes)}</Text>
    </View>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  barLabel: {
    width: 90,
    fontSize: 11,
    fontWeight: '600',
    color: c.textPrimary,
  },
  barTrack: {
    flex: 1,
    height: 10,
    borderRadius: 5,
    backgroundColor: c.bgSecondary,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 5,
    minWidth: 2,
  },
  barValue: {
    width: 48,
    fontSize: 10,
    fontWeight: '700',
    color: c.textMuted,
    textAlign: 'right',
  },
});