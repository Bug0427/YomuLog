// components/layout/TrackedScrollView.tsx
import React, { useMemo, forwardRef, useImperativeHandle, useEffect } from 'react';
import { ScrollView, ScrollViewProps, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { useScrollTracker } from '../../hooks/useScrollTracker';

type Props = ScrollViewProps & {
  children: React.ReactNode;
  // keep supporting an external ref prop if other components rely on it
  scrollRef?: React.RefObject<ScrollView>;
};

export const TrackedScrollView = forwardRef<ScrollView, Props>((props, ref) => {
  const {
    children,
    style,
    contentContainerStyle,
    scrollRef: externalRef,
    onScrollBeginDrag,
    onScrollEndDrag,
    ...rest
  } = props;

  const { scrollRef: internalRef, handleScrollStart, handleScrollEnd } = useScrollTracker();
  const refToUse = externalRef ?? internalRef;

  // 👇 Expose the full ScrollView instance so the type matches exactly (fixes TS2740)
  useImperativeHandle(ref, () => refToUse.current!, [refToUse]);

  // Also mirror to externalRef if parent passed one (so both refs work)
  useEffect(() => {
    if (!externalRef) return;
    // Assign only when we have a concrete instance; works for both RefObject and MutableRefObject
    if (refToUse.current) {
      (externalRef as React.MutableRefObject<ScrollView>).current = refToUse.current;
    }
  }, [externalRef, refToUse]);

  // ---- style normalization (unchanged) ----
  const flat: ViewStyle = StyleSheet.flatten(style) || {};
  const { paddingHorizontal, paddingLeft, paddingRight, paddingTop, paddingBottom, ...restContainerStyle } = flat;

  const ccPaddingLeft = paddingLeft ?? (typeof paddingHorizontal === 'number' ? paddingHorizontal : undefined);
  const ccPaddingRight = paddingRight ?? (typeof paddingHorizontal === 'number' ? paddingHorizontal : undefined);
  const ccPaddingTop = paddingTop;
  const ccPaddingBottom = paddingBottom ?? 24;

  const normalizedContainerStyle: StyleProp<ViewStyle> = [
    { flex: 1, paddingLeft: 0, paddingRight: 0, paddingHorizontal: 0, paddingTop: 0, paddingBottom: 0 },
    restContainerStyle,
  ];

  const normalizedContentStyle: StyleProp<ViewStyle> = [
    { paddingBottom: 24 },
    contentContainerStyle,
    ccPaddingTop != null ? { paddingTop: ccPaddingTop } : null,
    ccPaddingLeft != null ? { paddingLeft: ccPaddingLeft } : null,
    ccPaddingRight != null ? { paddingRight: ccPaddingRight } : null,
    ccPaddingBottom != null ? { paddingBottom: ccPaddingBottom } : null,
  ];

  const handleBegin = useMemo(
    () => (e: any) => {
      handleScrollStart();
      onScrollBeginDrag?.(e);
    },
    [handleScrollStart, onScrollBeginDrag]
  );

  const handleEnd = useMemo(
    () => (e: any) => {
      handleScrollEnd();
      onScrollEndDrag?.(e);
    },
    [handleScrollEnd, onScrollEndDrag]
  );

  return (
    <ScrollView
      ref={refToUse}
      style={normalizedContainerStyle}
      contentContainerStyle={normalizedContentStyle}
      scrollEventThrottle={16}
      onScrollBeginDrag={handleBegin}
      onScrollEndDrag={handleEnd}
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
});