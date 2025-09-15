// components/TrackedScrollView.tsx
import React from 'react';
import { ScrollView, ScrollViewProps, StyleSheet, StyleProp, ViewStyle, Platform } from 'react-native';
import { useScrollTracker } from '../../hooks/useScrollTracker';

type Props = ScrollViewProps & { children: React.ReactNode };

export function TrackedScrollView(props: Props) {
  const { children, style, contentContainerStyle, ...rest } = props;
  const { scrollRef, handleScrollStart, handleScrollEnd } = useScrollTracker();

  // Normalize incoming style so any horizontal padding goes to contentContainerStyle
  const flat: ViewStyle = StyleSheet.flatten(style) || {};
  const {
    paddingHorizontal,
    paddingLeft,
    paddingRight,
    paddingTop,
    paddingBottom,
    // keep background/borders/etc. on the ScrollView itself
    ...restContainerStyle
  } = flat;

  // Compute final paddings for content only (so the scrollbar hugs the right edge)
  const ccPaddingLeft = paddingLeft ?? (typeof paddingHorizontal === 'number' ? paddingHorizontal : undefined);
  const ccPaddingRight = paddingRight ?? (typeof paddingHorizontal === 'number' ? paddingHorizontal : undefined);
  const ccPaddingTop = paddingTop; // leave vertical padding on content if provided
  const ccPaddingBottom = paddingBottom ?? 24; // ensure a bottom cushion by default

  const normalizedContainerStyle: StyleProp<ViewStyle> = [
    // remove all paddings from the ScrollView so indicators are not inset
    { flex: 1, paddingLeft: 0, paddingRight: 0, paddingHorizontal: 0, paddingTop: 0, paddingBottom: 0 },
    restContainerStyle,
  ];

  const normalizedContentStyle: StyleProp<ViewStyle> = [
    { paddingBottom: 24 }, // base default
    contentContainerStyle,
    // apply user-provided paddings to the content instead of the container
    ccPaddingTop != null ? { paddingTop: ccPaddingTop } : null,
    ccPaddingLeft != null ? { paddingLeft: ccPaddingLeft } : null,
    ccPaddingRight != null ? { paddingRight: ccPaddingRight } : null,
    ccPaddingBottom != null ? { paddingBottom: ccPaddingBottom } : null,
  ];

  // indicatorInsets and scrollIndicatorInsets are removed; always hide vertical indicator
  return (
    <ScrollView
      ref={scrollRef}
      style={normalizedContainerStyle}
      contentContainerStyle={normalizedContentStyle}
      scrollEventThrottle={16}
      onScrollBeginDrag={handleScrollStart}
      onScrollEndDrag={handleScrollEnd}
      keyboardDismissMode="on-drag"
      keyboardShouldPersistTaps="handled"
      contentInsetAdjustmentBehavior="automatic"
      showsVerticalScrollIndicator={false}
      bounces
      alwaysBounceVertical
      {...rest}
    >
      {children}
    </ScrollView>
  );
}