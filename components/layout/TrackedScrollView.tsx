// components/TrackedScrollView.tsx
import React from 'react';
import { ScrollView, ScrollViewProps } from 'react-native';
import { useScrollTracker } from '../../hooks/useScrollTracker';

type Props = ScrollViewProps & { children: React.ReactNode };

export function TrackedScrollView(props: Props) {
  const { children, style, contentContainerStyle, ...rest } = props;
  const { scrollRef, handleScrollStart, handleScrollEnd } = useScrollTracker();

  return (
    <ScrollView
      ref={scrollRef}
      style={[{ flex: 1 }, style]}
      contentContainerStyle={[{ paddingBottom: 24 }, contentContainerStyle]}
      scrollEventThrottle={16}
      onScrollBeginDrag={handleScrollStart}
      onScrollEndDrag={handleScrollEnd}
      keyboardDismissMode="on-drag"
      keyboardShouldPersistTaps="handled"
      contentInsetAdjustmentBehavior="automatic"
      showsVerticalScrollIndicator
      bounces
      alwaysBounceVertical
      {...rest}
    >
      {children}
    </ScrollView>
  );
}