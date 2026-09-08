// components/reader/ReaderPage.tsx
// Single manga page renderer (extracted from ReaderScreen — H-6 decomposition).
// Uses the reader theme's background for the letterboxed page box.
import React, { useState, useEffect } from 'react';
import { View, Text, Image, ActivityIndicator, StyleSheet } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { SCREEN_W, SCREEN_H } from './pageConstants';

type Props = {
  uri: string;
  index: number;
  isActive: boolean;
  bg: string;
  onLoad?: () => void;
};

export const ReaderPage = React.memo(function ReaderPage({ uri, index, isActive, bg, onLoad }: Props) {
  const { colors: theme } = useTheme();
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (isActive && !loaded) {
      Image.prefetch(uri).catch(() => {});
    }
  }, [isActive, uri, loaded]);

  if (!isActive && !loaded) {
    return <View style={[styles.pagePlaceholder, { backgroundColor: bg }]} />;
  }

  return (
    <View style={styles.pageWrap}>
      {!loaded && !failed && (
        <View style={[styles.pagePlaceholder, { backgroundColor: bg }]}>
          <ActivityIndicator size="small" color={theme.accentLight} />
        </View>
      )}
      {failed ? (
        <View style={[styles.pagePlaceholder, { backgroundColor: bg }]}>
          <Text style={[styles.errorText, { color: theme.error }]}>Failed to load</Text>
        </View>
      ) : (
        <Image
          source={{ uri }}
          style={styles.pageImage}
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
    width: SCREEN_W,
    minHeight: SCREEN_H * 0.8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pageImage: {
    width: SCREEN_W,
    height: SCREEN_H,
  },
  pagePlaceholder: {
    width: SCREEN_W,
    height: SCREEN_H * 0.8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    textAlign: 'center',
    fontSize: 16,
    marginHorizontal: 20,
  },
});