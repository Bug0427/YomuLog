import React from 'react';
import { Pressable, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { borders } from '../../styles/tokens';

interface BackButtonProps {
  onPress: () => void;
  accessibilityLabel?: string;
}

const BackButton: React.FC<BackButtonProps> = ({ onPress, accessibilityLabel = 'Go back' }) => {
  const { colors: theme } = useTheme();

  return (
    <Pressable
      style={[
        styles.button,
        {
          borderColor: theme.textPrimary,
        },
      ]}
      onPress={onPress}
      accessibilityLabel={accessibilityLabel}
    >
      <Text style={[styles.text, { color: theme.accent }]}>Back</Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  button: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: borders.br8,
    borderWidth: 1,
    backgroundColor: 'transparent',
  },
  text: {
    fontSize: 14,
    fontWeight: '600',
  },
});

export default BackButton;
