// components/settings/GridItem.tsx
// Standard settings-grid tile (extracted from SettingsScreen — H-6 decomposition).
import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { SettingButtonStyles } from '../../styles/global';
import { useTheme } from '../../context/ThemeContext';

type Props = {
  label: string;
  children?: React.ReactNode;
  onPress?: () => void;
};

export default function GridItem({ label, children, onPress }: Props) {
  const { colors: theme } = useTheme();
  return (
    <View style={SettingButtonStyles.cell}>
      <Pressable style={[SettingButtonStyles.button, { backgroundColor: theme.bgCard, borderColor: theme.border }]} onPress={onPress} hitSlop={10}>
        {children}
      </Pressable>
      <Text style={[SettingButtonStyles.cellLabel, { color: theme.textSecondary }]}>{label}</Text>
    </View>
  );
}