// screens/onboarding/OnboardingFlow.tsx
// Manages the multi-step onboarding flow (Welcome → Features → Premium).
// Shows a paging indicator and persists completion to AsyncStorage.

import React, { useState, useRef } from 'react';
import {
  View,
  ScrollView,
  Dimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import WelcomeScreen from './WelcomeScreen';
import FeaturesScreen from './FeaturesScreen';
import PremiumUpsellScreen from './PremiumUpsellScreen';
import { useOnboarding } from '../../hooks/useOnboarding';
import { useTheme } from '../../context/ThemeContext';

const { width } = Dimensions.get('window');
const TOTAL_STEPS = 3;

type Props = {
  navigation: any;
};

export default function OnboardingFlow({ navigation }: Props) {
  const { markCompleted } = useOnboarding();
  const { colors: theme } = useTheme();
  const [currentStep, setCurrentStep] = useState(0);
  const scrollRef = useRef<ScrollView>(null);

  const goToStep = (step: number) => {
    scrollRef.current?.scrollTo({ x: step * width, animated: true });
    setCurrentStep(step);
  };

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const step = Math.round(e.nativeEvent.contentOffset.x / width);
    setCurrentStep(step);
  };

  const handleFinish = async () => {
    await markCompleted();
    navigation.replace('HomeScreen');
  };

  return (
    <SafeAreaView style={[{ flex: 1 }, { backgroundColor: theme.bg }]}>
    <View style={[styles.root, { backgroundColor: theme.bg }]}>
        {/* Page indicator dots */}
        <View style={styles.dots}>
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                {
                  backgroundColor: i === currentStep ? theme.accent : theme.borderLight,
                  width: i === currentStep ? 24 : 8,
                },
              ]}
            />
          ))}
        </View>

        {/* Horizontal paged scroll */}
        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={handleScroll}
          scrollEventThrottle={16}
        >
          <WelcomeScreen onNext={() => goToStep(1)} />
          <FeaturesScreen onNext={() => goToStep(2)} />
          <PremiumUpsellScreen onFinish={handleFinish} onSkip={handleFinish} />
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    paddingTop: 16,
    paddingBottom: 12,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
});
