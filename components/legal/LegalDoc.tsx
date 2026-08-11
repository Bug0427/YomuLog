// components/legal/LegalDoc.tsx
// Shared layout for static legal documents (Privacy Policy / Terms of Service).
// Theme-aware, scrollable, BackButton header — mirrors the ReaderThemeSettingsScreen
// screen conventions so the legal screens feel native to the app.

import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import BackButton from '../general/BackButton';
import { useTheme } from '../../context/ThemeContext';
import { spacing } from '../../styles/tokens';

export interface LegalSection {
  heading: string;
  paragraphs: string[];
}

interface LegalDocProps {
  title: string;
  updatedLabel: string;
  intro: string[];
  sections: LegalSection[];
}

export default function LegalDoc({ title, updatedLabel, intro, sections }: LegalDocProps) {
  const navigation = useNavigation();
  const { colors: theme } = useTheme();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <BackButton onPress={() => navigation.goBack()} accessibilityLabel={`Back from ${title}`} />
          <Text style={[styles.title, { color: theme.textPrimary }]}>{title}</Text>
        </View>

        <Text style={[styles.updated, { color: theme.textMuted }]}>{updatedLabel}</Text>

        {intro.map((p, i) => (
          <Text key={`intro-${i}`} style={[styles.paragraph, { color: theme.textSecondary }]}>
            {p}
          </Text>
        ))}

        {sections.map((section, i) => (
          <View key={`section-${i}`} style={styles.section}>
            <Text style={[styles.heading, { color: theme.textPrimary }]}>{section.heading}</Text>
            {section.paragraphs.map((p, j) => (
              <Text key={`p-${j}`} style={[styles.paragraph, { color: theme.textSecondary }]}>
                {p}
              </Text>
            ))}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingBottom: spacing.p50, paddingHorizontal: spacing.p16 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: spacing.p16,
    marginBottom: spacing.p16,
  },
  title: { fontSize: 20, fontWeight: '700', marginLeft: spacing.p12 },
  updated: { fontSize: 12, marginBottom: spacing.p12 },
  section: { marginBottom: spacing.p16 },
  heading: { fontSize: 15, fontWeight: '700', marginBottom: spacing.p8 },
  paragraph: { fontSize: 13.5, lineHeight: 20, marginBottom: spacing.p8 },
});
