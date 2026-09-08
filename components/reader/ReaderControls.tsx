// components/reader/ReaderControls.tsx
// Full-screen reader overlay: top bar (close / theme / mode), bottom bar
// (progress, page indicator, chapter nav) — extracted from ReaderScreen (H-6).
import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import { useReaderTheme } from '../../context/ReaderThemeContext';
import { spacing } from '../../styles/tokens';
import { READER_MODE_LABELS, type ReaderMode } from './types';

type Props = {
  chapterNum: string;
  readerMode: ReaderMode;
  currentPage: number;
  totalPages: number;
  scrollPercent: number;
  isRead: boolean;
  hasPrevChapter: boolean;
  hasNextChapter: boolean;
  onToggleMode: () => void;
  onOpenThemePicker: () => void;
  onClose: () => void;
  onPrevChapter: () => void;
  onNextChapter: () => void;
};

export default function ReaderControls({
  chapterNum, readerMode, currentPage, totalPages,
  scrollPercent, isRead, hasPrevChapter, hasNextChapter,
  onToggleMode, onOpenThemePicker, onClose, onPrevChapter, onNextChapter,
}: Props) {
  const { activeConfig } = useReaderTheme();
  const { colors: theme } = useTheme();
  const insets = useSafeAreaInsets();
  const overlayBg = activeConfig.overlay;
  const textColor = activeConfig.text;

  return (
    <View style={styles.overlay} pointerEvents="box-none">
      {/* Top bar */}
      <View style={[styles.topBar, { backgroundColor: overlayBg, paddingTop: insets.top + spacing.p8 }]}>
        <Pressable
          onPress={onClose}
          style={styles.controlBtn}
          accessibilityRole="button"
          accessibilityLabel="Close reader"
        >
          <Text style={[styles.controlBtnText, { color: textColor }]}>✕</Text>
        </Pressable>
        <Text style={[styles.chapterTitle, { color: textColor }]}>
          Ch. {chapterNum}
        </Text>
        <View style={styles.topRightBtns}>
          <Pressable
            onPress={onOpenThemePicker}
            style={styles.controlBtn}
            accessibilityRole="button"
            accessibilityLabel="Open reader theme picker"
          >
            <Text style={[styles.controlBtnText, { color: textColor, fontSize: 11 }]}>
              {activeConfig.icon} {activeConfig.label}
            </Text>
          </Pressable>
          <Pressable
            onPress={onToggleMode}
            style={[styles.controlBtn, { marginLeft: 6 }]}
            accessibilityRole="button"
            accessibilityLabel="Reading direction"
            accessibilityValue={{ text: READER_MODE_LABELS[readerMode] }}
          >
            <Text style={[styles.controlBtnText, { color: textColor }]}>
              {READER_MODE_LABELS[readerMode]}
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Bottom bar */}
      <View style={[styles.bottomBar, { backgroundColor: overlayBg, paddingBottom: insets.bottom + spacing.p8 }]}>
        {/* Progress bar */}
        <View
          style={styles.progressBar}
          accessible
          accessibilityRole="adjustable"
          accessibilityLabel="Reading progress"
          accessibilityValue={{ min: 0, max: Math.max(0, totalPages - 1), now: currentPage }}
        >
          <View style={[styles.progressFill, { width: `${Math.min(100, scrollPercent)}%`, backgroundColor: theme.accent }]} />
        </View>

        <View style={styles.bottomRow}>
          <Text style={[styles.pageIndicator, { color: textColor }]}>
            {currentPage + 1} / {totalPages} ({scrollPercent}%)
          </Text>
          {isRead && <Text style={[styles.readBadge, { color: theme.success }]}>✓ Read</Text>}
        </View>

        <View style={styles.chapterNavRow}>
          <Pressable
            onPress={onPrevChapter}
            style={[styles.chapterNavBtnSmall, { backgroundColor: theme.bgSecondary }, !hasPrevChapter && styles.chapterNavBtnDisabled]}
            disabled={!hasPrevChapter}
          >
            <Text style={[styles.chapterNavBtnText, { color: theme.textPrimary }]}>◀ Prev Ch.</Text>
          </Pressable>
          <Pressable
            onPress={onNextChapter}
            style={[styles.chapterNavBtnSmall, { backgroundColor: theme.bgSecondary }, !hasNextChapter && styles.chapterNavBtnDisabled]}
            disabled={!hasNextChapter}
          >
            <Text style={[styles.chapterNavBtnText, { color: theme.textPrimary }]}>Next Ch. ▶</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
  // Top bar
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.p12,
    paddingTop: 50,
    paddingBottom: spacing.p12,
  },
  chapterTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  topRightBtns: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  controlBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(128,128,128,0.3)',
  },
  controlBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  // Bottom bar
  bottomBar: {
    paddingHorizontal: spacing.p12,
    paddingBottom: 40,
    paddingTop: spacing.p10,
  },
  progressBar: {
    width: '100%',
    height: 3,
    backgroundColor: 'rgba(128,128,128,0.3)',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: spacing.p8,
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.p8,
  },
  pageIndicator: {
    fontSize: 13,
  },
  readBadge: {
    fontSize: 12,
    fontWeight: '600',
  },
  chapterNavRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  chapterNavBtnSmall: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  chapterNavBtnDisabled: {
    opacity: 0.4,
  },
  chapterNavBtnText: {
    fontWeight: '600',
    fontSize: 13,
  },
});