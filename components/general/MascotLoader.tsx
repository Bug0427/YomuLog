// components/general/MascotLoader.tsx
// Custom animated mascot loader replacing default OS spinner for pull-to-refresh.
// Uses React Native Animated API — pure JS, no Lottie/SVG dependencies needed.
// Pulls color palette dynamically from global ThemeContext (Light/Dark/Sepia).

import React, { useEffect, useRef } from 'react';
import { Animated, View, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { colors } from '../../styles/tokens';

type Props = {
  /** Size of the mascot icon in pixels (default 36) */
  size?: number;
};

const MascotLoader: React.FC<Props> = ({ size = 36 }) => {
  const { colors: theme } = useTheme();

  // ── Animated values ────────────────────────────────────────────────
  const spinAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const bounceAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Continuous rotation
    const spin = Animated.loop(
      Animated.timing(spinAnim, {
        toValue: 1,
        duration: 1200,
        useNativeDriver: true,
      })
    );

    // Pulsing scale (breathe effect)
    const scale = Animated.loop(
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.15,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
      ])
    );

    // Vertical bounce
    const bounce = Animated.loop(
      Animated.sequence([
        Animated.spring(bounceAnim, {
          toValue: -8,
          friction: 3,
          tension: 40,
          useNativeDriver: true,
        }),
        Animated.spring(bounceAnim, {
          toValue: 0,
          friction: 3,
          tension: 40,
          useNativeDriver: true,
        }),
      ])
    );

    spin.start();
    scale.start();
    bounce.start();

    return () => {
      spin.stop();
      scale.stop();
      bounce.stop();
    };
  }, [spinAnim, scaleAnim, bounceAnim]);

  // Interpolate rotation
  const rotate = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={styles.container}>
      <Animated.View
        style={{
          transform: [
            { rotate },
            { scale: scaleAnim },
            { translateY: bounceAnim },
          ],
        }}
      >
        <MaterialCommunityIcons
          name="fruit-citrus"
          size={size}
          color={theme.accent}
        />
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
});

export default MascotLoader;
