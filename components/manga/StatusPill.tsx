// components/manga/StatusPill.tsx
// Colored status badge (extracted from MangaInfoScreen — H-5 decomposition).
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing } from '../../styles/tokens';
import { statusColor } from './MangaInfoHeader';

type Props = {
  status: string;
};

export default function StatusPill({ status }: Props) {
  return (
    <View style={[styles.statusBadge, { backgroundColor: statusColor(status) }]}>
      <Text style={styles.statusText}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  statusBadge: {
    alignSelf: 'flex-start',
    paddingVertical: 3,
    paddingHorizontal: spacing.p10,
    borderRadius: 10,
    marginTop: spacing.p4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.white,
  },
});