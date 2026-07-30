// components/general/MarqueeTitle.tsx
// Title component that shows a truncated single-line title by default.
// On press/long-press, animates a horizontal marquee scroll so users can
// read the full title without clipping.
import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  Animated,
  Text,
  View,
  StyleProp,
  TextStyle,
  LayoutChangeEvent,
  Pressable,
} from 'react-native';

type Props = {
  title: string;
  style?: StyleProp<TextStyle>;
};

export default function MarqueeTitle({ title, style }: Props) {
  const [animating, setAnimating] = useState(false);
  const [needsMarquee, setNeedsMarquee] = useState(false);
  const [textWidth, setTextWidth] = useState(0);
  const [containerWidth, setContainerWidth] = useState(0);
  const translateX = useRef(new Animated.Value(0)).current;
  const animRef = useRef<Animated.CompositeAnimation | null>(null);

  // Measure text and container to determine if marquee is needed
  const onTextLayout = useCallback((e: LayoutChangeEvent) => {
    const w = Math.ceil(e.nativeEvent.layout.width);
    if (w !== textWidth) setTextWidth(w);
  }, [textWidth]);

  const onContainerLayout = useCallback((e: LayoutChangeEvent) => {
    const w = Math.ceil(e.nativeEvent.layout.width);
    if (w !== containerWidth) setContainerWidth(w);
  }, [containerWidth]);

  useEffect(() => {
    if (containerWidth > 0 && textWidth > 0) {
      setNeedsMarquee(textWidth > containerWidth + 2);
    }
  }, [textWidth, containerWidth]);

  // Start / stop the marquee animation
  useEffect(() => {
    if (animating && needsMarquee) {
      const distance = -(textWidth - containerWidth + 20);
      animRef.current = Animated.loop(
        Animated.sequence([
          Animated.delay(800),
          Animated.timing(translateX, {
            toValue: distance,
            duration: Math.max(2000, Math.abs(distance) * 8),
            useNativeDriver: true,
          }),
          Animated.delay(800),
          Animated.timing(translateX, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
        ]),
      );
      animRef.current.start();
    } else {
      if (animRef.current) animRef.current.stop();
      translateX.setValue(0);
    }

    return () => {
      if (animRef.current) animRef.current.stop();
    };
  }, [animating, needsMarquee, textWidth, containerWidth, translateX]);

  const handleToggle = useCallback(() => {
    if (needsMarquee) setAnimating((prev) => !prev);
  }, [needsMarquee]);

  return (
    <Pressable onPress={handleToggle} style={{ overflow: 'hidden' }}>
      <View onLayout={onContainerLayout} style={{ overflow: 'hidden', width: '100%' }}>
        <Animated.Text
          onLayout={onTextLayout}
          style={[
            style,
            animating && needsMarquee ? undefined : undefined,
            { transform: [{ translateX }] },
          ]}
          numberOfLines={animating ? undefined : 1}
          ellipsizeMode={animating ? undefined : 'tail'}
        >
          {title}
        </Animated.Text>
      </View>
    </Pressable>
  );
}
