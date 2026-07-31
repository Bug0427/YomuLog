// screens/onboarding/FeaturesScreen.tsx
// Onboarding step 2 — Feature highlights with illustrations.

import React from 'react';
import { View, Text, Pressable, StyleSheet, Dimensions } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { colors } from '../../styles/tokens';

const { width } = Dimensions.get('window');

type Props = {
  onNext: () => void;
};

type FeatureCard = {
  icon: string;
  title: string;
  description: string;
};

const FEATURES: FeatureCard[] = [
  {
    icon: 'download-cloud',
    title: 'Offline Reading',
    description: 'Download chapters and read anywhere, even without internet. Smart recovery keeps your downloads safe.',
  },
  {
    icon: 'bookmark',
    title: 'Smart Tracking',
    description: 'Automatically track your reading progress across every manga. Never lose your place again.',
  },
  {
    icon: 'zap',
    title: 'AI Discovery',
    description: 'Find your next favorite manga with natural language search and personalized recommendations.',
  },
];

export default function FeaturesScreen({ onNext }: Props) {
  const { colors: theme } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <View style={styles.content}>
        <Text style={[styles.heading, { color: theme.textPrimary }]}>
          Everything you need
        </Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
          A manga tracker built for readers, not advertisers.
        </Text>

        <View style={styles.cards}>
          {FEATURES.map((feature, i) => (
            <View
              key={i}
              style={[styles.card, { backgroundColor: theme.bgCard, borderColor: theme.border }]}
            >
              <View style={[styles.cardIcon, { backgroundColor: theme.accent + '18' }]}>
                <Feather name={feature.icon as any} size={28} color={theme.accent} />
              </View>
              <View style={styles.cardText}>
                <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>
                  {feature.title}
                </Text>
                <Text style={[styles.cardDesc, { color: theme.textMuted }]}>
                  {feature.description}
                </Text>
              </View>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.bottom}>
        <Pressable
          onPress={onNext}
          style={[styles.cta, { backgroundColor: theme.accent }]}
        >
          <Text style={styles.ctaText}>Continue</Text>
          <Feather name="arrow-right" size={18} color={colors.white} />
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
    paddingHorizontal: 28,
  },
  heading: {
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 15,
    marginBottom: 32,
    lineHeight: 22,
  },
  cards: {
    gap: 14,
  },
  card: {
    flexDirection: 'row',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    alignItems: 'center',
    gap: 14,
  },
  cardIcon: {
    width: 52,
    height: 52,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardText: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  cardDesc: {
    fontSize: 13,
    lineHeight: 19,
  },
  bottom: {
    paddingHorizontal: 28,
    paddingBottom: 40,
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
    color: colors.white,
    fontSize: 17,
    fontWeight: '700',
  },
});
