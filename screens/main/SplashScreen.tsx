import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import { useOnboarding } from '../../hooks/useOnboarding';

export default function SplashScreen({ navigation }: any) {
  const { colors: theme } = useTheme();
  const { completed } = useOnboarding();

  useEffect(() => {
    // Wait for onboarding state to load from storage before navigating
    if (completed === null) return; // still loading

    const timer = setTimeout(() => {
      if (completed) {
        navigation.replace('HomeScreen');
      } else {
        navigation.replace('OnboardingFlow');
      }
    }, 2000); // 2-second branded splash

    return () => clearTimeout(timer);
  }, [completed, navigation]);

  return (
    <SafeAreaView style={[{ flex: 1 }, { backgroundColor: theme.bg }]}>
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
        <Text style={[styles.title, { color: theme.textPrimary }]}>YomuLog</Text>
        <Text style={[styles.subtitle, { color: theme.textMuted }]}>
          Your Manga Companion 🧸📚
        </Text>
        {completed === null && (
          <ActivityIndicator size="small" color={theme.accent} style={styles.spinner} />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 36,
    fontWeight: '800',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '500',
  },
  spinner: {
    marginTop: 24,
  },
});
