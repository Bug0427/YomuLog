// components/premium/PremiumGate.tsx
// Wraps premium-gated features. If the user is not premium, it shows
// an upgrade prompt overlay instead of the protected content.
// Free users see a nudge — premium users see the children seamlessly.

import React, { type ReactNode } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { usePremium } from '../../context/PremiumContext';
import { useTheme } from '../../context/ThemeContext';
import { colors, spacing } from '../../styles/tokens';
import { useNavigation } from '@react-navigation/native';
import type { RootStackParamList } from '../../navigation/navigation';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

type Props = {
  /** The feature id (for analytics / messaging) */
  featureId: string;
  /** Name of the feature shown in the upgrade prompt */
  featureName: string;
  /** The protected content to show to premium users */
  children: ReactNode;
  /** Optional fallback content to show to free users (instead of the default prompt) */
  fallback?: ReactNode;
};

export default function PremiumGate({ featureId, featureName, children, fallback }: Props) {
  const { isPremium } = usePremium();
  const { colors: theme } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  if (isPremium) return <>{children}</>;

  if (fallback) return <>{fallback}</>;

  return (
    <View style={[styles.container, { backgroundColor: theme.bgSecondary, borderColor: theme.border }]}>
      <Feather name="lock" size={28} color={colors.lavender} style={styles.lockIcon} />
      <Text style={[styles.title, { color: theme.textPrimary }]}>Premium Feature</Text>
      <Text style={[styles.description, { color: theme.textSecondary }]}>
        {featureName} is available with YomuLog Premium.
      </Text>
      <Pressable
        style={[styles.upgradeButton, { backgroundColor: colors.plum }]}
        onPress={() => navigation.navigate('UpgradeScreen' as any)}
      >
        <Text style={styles.upgradeButtonText}>Upgrade to Premium</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.p24,
    paddingHorizontal: spacing.p16,
    marginHorizontal: spacing.p12,
    borderRadius: 12,
    borderWidth: 1,
    minHeight: 160,
  },
  lockIcon: {
    marginBottom: spacing.p10,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: spacing.p6,
  },
  description: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: spacing.p16,
    paddingHorizontal: spacing.p8,
  },
  upgradeButton: {
    paddingVertical: spacing.p10,
    paddingHorizontal: spacing.p24,
    borderRadius: 10,
  },
  upgradeButtonText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '600',
  },
});
