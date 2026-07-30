// components/general/MarqueeText.tsx
// Tap-to-scroll text component — when pressed, horizontally scrolls
// truncated text so users can read the full content.
import React, { useRef, useState, useCallback } from 'react';
import { Animated, Pressable, Text, View, StyleProp, TextStyle, LayoutChangeEvent } from 'react-native';

type Props = {
  style?: StyleProp<TextStyle>;
  children: string;
  /** Max width of the chip/container before truncation */
  maxWidth?: number;
  /** Duration of the marquee scroll animation in ms */
  duration?: number;
};

export default function MarqueeText({ style, children, maxWidth = 200, duration = 3000 }: Props) {
  const translateX = useRef(new Animated.Value(0)).current;
  const [textWidth, setTextWidth] = useState(0);
  const [containerWidth, setContainerWidth] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const needsScroll = textWidth > containerWidth && containerWidth > 0;

  const handleTextLayout = useCallback((e: LayoutChangeEvent) => {
    setTextWidth(Math.ceil(e.nativeEvent.layout.width));
  }, []);

  const handleContainerLayout = useCallback((e: LayoutChangeEvent) => {
    setContainerWidth(Math.ceil(e.nativeEvent.layout.width));
  }, []);

  const handlePress = useCallback(() => {
    if (!needsScroll || isAnimating) return;
    setIsAnimating(true);
    const scrollDistance = textWidth - containerWidth + 16; // slight overshoot for readability

    Animated.sequence([
      // Pause at start
      Animated.delay(200),
      // Scroll left to reveal end
      Animated.timing(translateX, {
        toValue: -scrollDistance,
        duration: duration * 0.6,
        useNativeDriver: true,
      }),
      // Pause at end
      Animated.delay(800),
      // Scroll back to start
      Animated.timing(translateX, {
        toValue: 0,
        duration: duration * 0.3,
        useNativeDriver: true,
      }),
    ]).start(() => setIsAnimating(false));
  }, [needsScroll, isAnimating, textWidth, containerWidth, duration, translateX]);

  return (
    <Pressable onPress={handlePress}>
      <View
        style={{ maxWidth, overflow: 'hidden' }}
        onLayout={handleContainerLayout}
      >
        {/* Hidden measurement text */}
        <Text
          style={[style, { position: 'absolute', opacity: 0, zIndex: -1 }]}
          onLayout={handleTextLayout}
          numberOfLines={1}
        >
          {children}
        </Text>
        {/* Visible animated text */}
        <Animated.Text
          style={[style, { transform: [{ translateX }] }]}
          numberOfLines={1}
        >
          {children}
        </Animated.Text>
      </View>
    </Pressable>
  );
}
