// components/cardLayouts/RefreshCard.tsx
// A card-like tile displayed as the final card in the MangaSlider.
// Tapping it triggers a refresh of the slider data from the API.
// Styling matches the MangaSlider card dimensions exactly.

import React from 'react';
import { Text, Pressable } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, spacing, u } from '../../styles/tokens';
import { MangaSliderStyles } from '../../styles/IndependentStyles/MangaSliderStyles';

interface RefreshCardProps {
  /** Called when the user taps the refresh card */
  onRefresh: () => void;
  /** Optional label text (default: "Refresh") */
  label?: string;
}

const RefreshCard: React.FC<RefreshCardProps> = ({ onRefresh, label = 'Refresh' }) => {
  return (
    <Pressable
      onPress={onRefresh}
      style={({ pressed }) => [
        MangaSliderStyles.card,
        MangaSliderStyles.lastCard, // restore right border since footer is outside FlatList data
        { justifyContent: 'center', gap: spacing.p6, opacity: pressed ? 0.7 : 1 },
      ]}
    >
      <MaterialCommunityIcons
        name="refresh"
        size={28}
        color={colors.plum}
      />
      <Text
        style={{
          color: colors.white,
          fontSize: 12,
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
