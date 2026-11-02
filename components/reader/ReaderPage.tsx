// components/reader/ReaderPage.tsx
// Single manga page renderer (extracted from ReaderScreen — H-6 decomposition).
// Uses the reader theme's background for the letterboxed page box.
import React, { useState, useMemo } from 'react';
import { View, Text, Image, ActivityIndicator, StyleSheet } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { useReaderGeometry } from './pageConstants';

type Props = {
  uri: string;
  index: number;
  isActive: boolean;
  bg: string;
  onLoad?: () => void;
};

export const ReaderPage = React.memo(function ReaderPage({ uri, index, isActive, bg, onLoad }: Props) {
  const { colors: theme } = useTheme();
  const { screenW, screenH } = useReaderGeometry();
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  // M-1..M-4: geometry is reactive — rebuild dynamic size styles on resize
  // (the style *properties* live in the module stylesheet; only the px sizes
  // are re-derived here so memo identity stays cheap).
  const dyn = useMemo(
    () => ({
      pageWrap: { width: screenW, minHeight: screenH * 0.8 },
      pageImage: { width: screenW, height: screenH },
      pagePlaceholder: { width: screenW, height: screenH * 0.8 },
    }),
    [screenW, screenH],
  );

  // F2(c): no Image.prefetch here — the screen-level prefetch (currentPage ±3,
  // deduped in ReaderScreen) already covers every page that can become active;
  // this duplicated every one of those fetches on activation.

  if (!isActive && !loaded) {
    return <View style={[styles.pagePlaceholder, dyn.pagePlaceholder, { backgroundColor: bg }]} />;
  }

  return (
    <View style={[styles.pageWrap, dyn.pageWrap]}>
      {!loaded && !failed && (
        <View style={[styles.pagePlaceholder, dyn.pagePlaceholder, { backgroundColor: bg }]}>
          <ActivityIndicator size="small" color={theme.accentLight} />
        </View>
      )}
      {failed ? (
        <View style={[styles.pagePlaceholder, dyn.pagePlaceholder, { backgroundColor: bg }]}>
          <Text style={[styles.errorText, { color: theme.error }]}>Failed to load</Text>
        </View>
      ) : (
        <Image
          source={{ uri }}
          style={[styles.pageImage, dyn.pageImage]}
          resizeMode="contain"
          onLoad={() => { setLoaded(true); onLoad?.(); }}
          onError={() => setFailed(true)}
          accessibilityLabel={`Manga page ${index + 1}`}
          accessibilityRole="image"
        />
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  pageWrap: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  pageImage: {
    resizeMode: 'contain',
  },
  pagePlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    textAlign: 'center',
    fontSize: 16,
    marginHorizontal: 20,
  },
});