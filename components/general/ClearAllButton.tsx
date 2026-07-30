import React from 'react';
import { Pressable, Text, StyleSheet } from 'react-native';
import { colors, borders } from '../../styles/tokens';

interface ClearAllButtonProps {
  onPress: () => void;
  accessibilityLabel?: string;
  label?: string;
}

const ClearAllButton: React.FC<ClearAllButtonProps> = ({
  onPress,
  accessibilityLabel = 'Clear all',
  label = 'Clear All',
}) => (
  <Pressable
    style={styles.button}
    onPress={onPress}
    accessibilityLabel={accessibilityLabel}
  >
    <Text style={styles.text}>{label}</Text>
  </Pressable>
);

const styles = StyleSheet.create({
  button: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: borders.radius,
    borderWidth: 1,
    borderColor: colors.error || '#e74c3c',
    backgroundColor: 'transparent',
  },
  text: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.error || '#e74c3c',
  },
});

export default ClearAllButton;
