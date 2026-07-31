// screens/onboarding/PremiumUpsellScreen.tsx
// Onboarding step 3 — Premium upsell with skip option.

import React from 'react';
import { View, Text, Pressable, StyleSheet, Dimensions } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { colors } from '../../styles/tokens';

const { width } = Dimensions.get('window');

type Props = {
  onFinish: () => void;
  onSkip: () => void;
};

const PERKS = [
  { icon: 'cloud', label: 'Cloud backup & cross-device sync' },
  { icon: 'download', label: 'Unlimited offline downloads' },
  { icon: 'cpu', label: 'AI search & smart recommendations' },
  { icon: 'bar-chart-2', label: 'Advanced reading analytics' },
];

export default function PremiumUpsellScreen({ onFinish, onSkip }: Props) {
  const { colors: theme } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <View style={styles.content}>
        {/* Crown badge */}
        <View style={[styles.badge, { backgroundColor: theme.warning + '25' }]}>
          <Feather name="star" size={40} color={theme.warning} />
        </View>

        <Text style={[styles.heading, { color: theme.textPrimary }]}>
          Go Premium
        </Text>
        <Text style={[styles.price, { color: theme.accent }]}>
          $2.99/month
        </Text>

        <View style={styles.perks}>
          {PERKS.map((p, i) => (
            <View key={i} style={styles.perk}>
              <Feather name={p.icon as any} size={18} color={theme.accent} />
              <Text style={[styles.perkText, { color: theme.textPrimary }]}>
                {p.label}
              </Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.bottom}>
        <Pressable
          onPress={onFinish}
          style={[styles.cta, { backgroundColor: theme.warning }]}
        >
          <Feather name="star" size={18} color={colors.white} />
          <Text style={styles.ctaText}>Try Premium Free</Text>
        </Pressable>

        <Pressable
          onPress={onSkip}
          style={[styles.skipBtn, { borderColor: theme.border }]}
        >
          <Text style={[styles.skipText, { color: theme.textMuted }]}>
            Maybe later
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  badge: {
    width: 90,
    height: 90,
    borderRadius: 45,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  heading: {
    fontSize: 30,
    fontWeight: '800',
    marginBottom: 4,
  },
  price: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 32,
  },
  perks: {
    alignSelf: 'stretch',
    gap: 14,
    paddingHorizontal: 8,
  },
  perk: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  perkText: {
    fontSize: 15,
    fontWeight: '500',
  },
  bottom: {
    paddingHorizontal: 32,
    paddingBottom: 40,
    gap: 12,
  },
  cta: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    borderRadius: 14,
    gap: 8,
  },
  ctaText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },
  skipBtn: {
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  skipText: {
    fontSize: 15,
    fontWeight: '500',
  },
});
