import React from 'react';
import { Pressable, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { borders, spacing } from '../../styles/tokens';

interface ClearAllButtonProps {
  onPress: () => void;
  accessibilityLabel?: string;
  label?: string;
}

const ClearAllButton: React.FC<ClearAllButtonProps> = ({
  onPress,
  accessibilityLabel = 'Clear all',
  label = 'Clear All',
}) => {
  const theme = useTheme();

  return (
    <Pressable
      style={({ pressed }) => [
        styles.button,
        {
          borderColor: theme.borderLight,
          opacity: pressed ? 0.7 : 1,
          backgroundColor: pressed ? theme.bgSecondary : 'transparent',
        },
      ]}
      onPress={onPress}
      accessibilityLabel={accessibilityLabel}
    >
      <Text style={[styles.text, { color: theme.textSecondary }]}>{label}</Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  button: {
    paddingVertical: spacing.p6,
    paddingHorizontal: spacing.p14,
    borderRadius: borders.br8,
    borderWidth: 1,
    backgroundColor: 'transparent',
  },
  text: {
    fontSize: 14,
    fontWeight: '600',
  },
});

export default ClearAllButton;
