// components/cardLayouts/RefreshCard.tsx
// A card-like tile displayed as the final card in recommendation sliders.
// Tapping it triggers a refresh/randomization of the displayed suggestions.

import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, spacing, u } from '../../styles/tokens';

interface RefreshCardProps {
  /** Called when the user taps the refresh card */
  onRefresh: () => void;
  /** Optional label text (default: "Refresh Suggestions") */
  label?: string;
}

const RefreshCard: React.FC<RefreshCardProps> = ({ onRefresh, label = 'Refresh Suggestions' }) => {
  return (
    <Pressable
      onPress={onRefresh}
      style={({ pressed }) => [
        {
          width: 80,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.paleLavender,
          borderWidth: 2,
          borderColor: colors.plum,
          padding: spacing.p5,
          gap: spacing.p6,
          opacity: pressed ? 0.7 : 1,
        },
      ]}
    >
      <MaterialCommunityIcons
        name="refresh"
        size={28}
        color={colors.deepPlum}
      />
      <Text
        style={{
          color: colors.deepPlum,
          fontSize: 11,
          fontWeight: '700',
          textAlign: 'center',
          lineHeight: 14,
        }}
        numberOfLines={2}
      >
        {label}
      </Text>
    </Pressable>
  );
};

export default RefreshCard;