// components/settings/SyncGridItem.tsx
// Full-width sync section tile (extracted from SettingsScreen — H-6 decomposition).
import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { spacing } from '../../styles/tokens';

type Props = {
  label: string;
  subtitle?: string;
  children?: React.ReactNode;
  onPress?: () => void;
  bg: string;
  borderColor: string;
  iconBg: string;
  textColor: string;
  subColor: string;
};

export default function SyncGridItem({
  label,
  subtitle,
  children,
  onPress,
  bg,
  borderColor,
  iconBg,
  textColor,
  subColor,
}: Props) {
  return (
    <View style={{
      width: '100%',
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: spacing.p12,
      paddingHorizontal: spacing.p12,
      marginBottom: 8,
      backgroundColor: bg,
      borderRadius: 12,
      borderWidth: 2,
      borderColor: borderColor,
    }}>
      <Pressable
        style={{
          width: 56,
          height: 56,
          borderRadius: 12,
          backgroundColor: iconBg,
          borderWidth: 3,
          borderColor: borderColor,
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: 14,
        }}
        onPress={onPress}
        hitSlop={10}
      >
        {children}
      </Pressable>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 15, fontWeight: '700', color: textColor }}>{label}</Text>
        {subtitle ? (
          <Text style={{ fontSize: 12, color: subColor, marginTop: 2 }}>{subtitle}</Text>
        ) : null}
      </View>
    </View>
  );
}