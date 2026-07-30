import React from 'react';
import { Pressable, Text, StyleSheet } from 'react-native';
import { colors, borders } from '../../styles/tokens';

interface BackButtonProps {
  onPress: () => void;
  accessibilityLabel?: string;
}

const BackButton: React.FC<BackButtonProps> = ({ onPress, accessibilityLabel = 'Go back' }) => (
  <Pressable
    style={styles.button}
    onPress={onPress}
    accessibilityLabel={accessibilityLabel}
  >
    <Text style={styles.text}>Back</Text>
  </Pressable>
);

const styles = StyleSheet.create({
  button: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: borders.radius,
    borderWidth: 1,
    borderColor: colors.cocoa,
    backgroundColor: 'transparent',
  },
  text: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.plum,
  },
});

export default BackButton;
