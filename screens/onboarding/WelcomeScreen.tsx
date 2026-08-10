// screens/onboarding/WelcomeScreen.tsx
// Onboarding step 1 — Welcome with app name and tagline.

import React from 'react';
import { View, Text, Pressable, StyleSheet, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { colors, spacing } from '../../styles/tokens';

const { width } = Dimensions.get('window');

type Props = {
  onNext: () => void;
};

export default function WelcomeScreen({ onNext }: Props) {
  const { colors: theme } = useTheme();

  return (
    <SafeAreaView style={[{ flex: 1 }, { backgroundColor: theme.bg }]}>
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
        <View style={styles.content}>
          {/* Icon */}
          <View style={[styles.iconCircle, { backgroundColor: theme.accent + '20' }]}>
            <Feather name="book-open" size={56} color={theme.accent} />
          </View>

          {/* Title */}
          <Text style={[styles.title, { color: theme.textPrimary }]}>YomuLog</Text>
          <Text style={[styles.tagline, { color: theme.textSecondary }]}>
            Your manga library,{'\n'}always in sync.
          </Text>

          {/* Feature bullets */}
          <View style={styles.bullets}>
            <Bullet icon="download" label="Read offline, anywhere" theme={theme} />
            <Bullet icon="bar-chart-2" label="Track your reading progress" theme={theme} />
            <Bullet icon="search" label="AI-powered manga discovery" theme={theme} />
          </View>
        </View>

        {/* Bottom CTA */}
        <View style={styles.bottom}>
          <Pressable
            onPress={onNext}
            style={[styles.cta, { backgroundColor: theme.accent }]}
          >
            <Text style={styles.ctaText}>Get Started</Text>
            <Feather name="arrow-right" size={18} color={colors.white} />
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

function Bullet({ icon, label, theme }: { icon: string; label: string; theme: any }) {
  return (
    <View style={styles.bullet}>
      <Feather name={icon as any} size={18} color={theme.accent} style={{ marginRight: 10 }} />
      <Text style={[styles.bulletText, { color: theme.textPrimary }]}>{label}</Text>
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
    paddingHorizontal: spacing.p24 + spacing.p8,
  },
  iconCircle: {
    width: 110,
    height: 110,
    borderRadius: 55,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.p24,
  },
  title: {
    fontSize: 36,
    fontWeight: '800',
    marginBottom: spacing.p8,
  },
  tagline: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: spacing.p24 + spacing.p16,
  },
  bullets: {
    alignSelf: 'stretch',
    paddingHorizontal: spacing.p16,
    gap: spacing.p16,
  },
  bullet: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bulletText: {
    fontSize: 15,
    fontWeight: '500',
  },
  bottom: {
    paddingHorizontal: spacing.p24 + spacing.p8,
    paddingBottom: spacing.p24 + spacing.p16,
  },
  cta: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.p16,
    borderRadius: 14,
    gap: spacing.p8,
  },
  ctaText: {
    color: colors.white,
    fontSize: 17,
    fontWeight: '700',
  },
});
