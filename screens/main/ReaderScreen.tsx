import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View, Text, Image, FlatList, Pressable, ActivityIndicator,
  Dimensions, StyleSheet, StatusBar, ScrollView, NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { useNavigation, RouteProp, useRoute } from '@react-navigation/native';
import { getChapterPages, buildPageUrlsFromChapterData, getMangaFeed } from '../../services/mangaAPI';
import { RootStackParamList } from '../../navigation/navigation';
import { colors, spacing } from '../../styles/tokens';
import {
  updateChapterProgress,
  markChapterRead,
  getChapterProgress,
} from '../../services/readingProgress';
import { getLocalPageUris } from '../../services/downloadManager';

// ─── Types ───────────────────────────────────────────────────────────────

type ReaderMode = 'vertical' | 'ltr' | 'rtl';
type ReaderTheme = 'dark' | 'light' | 'sepia';

type ReaderRoute = RouteProp<RootStackParamList, 'ReaderScreen'>;

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

// ─── Theme colour maps ──────────────────────────────────────────────────

const THEME_BG: Record<ReaderTheme, string> = {
  dark: '#111111',
  light: '#fff8f0',
  sepia: '#f5e6c8',
};

const THEME_TEXT: Record<ReaderTheme, string> = {
  dark: '#e0e0e0',
  light: '#333333',
  sepia: '#5a4a3a',
};

const THEME_OVERLAY: Record<ReaderTheme, string> = {
  dark: 'rgba(0,0,0,0.85)',
  light: 'rgba(255,248,240,0.92)',
  sepia: 'rgba(245,230,200,0.92)',
};

// ─── Main Component ─────────────────────────────────────────────────────

export default function ReaderScreen() {
  const navigation = useNavigation();
  const route = useRoute<ReaderRoute>();
  const { chapterId, mangaId, chapterNum } = route.params ?? {};

  const [pageUrls, setPageUrls] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [readerMode, setReaderMode] = useState<ReaderMode>('vertical');
  const [readerTheme, setReaderTheme] = useState<ReaderTheme>('dark');
  const [currentPage, setCurrentPage] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const [loadedImages, setLoadedImages] = useState<Set<number>>(new Set());
  const [mangaTitle, setMangaTitle] = useState('');
  const [chapterList, setChapterList] = useState<Array<{ id: string; chapter: string }>>([]);
  const [currentChapterIdx, setCurrentChapterIdx] = useState(-1);
  const [isRead, setIsRead] = useState(false);
  const [scrollPercent, setScrollPercent] = useState(0);

  const flatListRef = useRef<FlatList>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const lastTapRef = useRef(0);
  const progressSavedRef = useRef(false);

  // ─── Fetch chapter pages ──────────────────────────────────────────────

  useEffect(() => {
    if (!chapterId) {
      setError('No chapter ID provided');
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);
    progressSavedRef.current = false;

    // Offline-first chapter fetching
    getLocalPageUris(chapterId).then((localUris) => {
      if (cancelled) return;
      if (localUris && localUris.length > 0) {
        // Loaded from local storage (offline)
        setPageUrls(localUris);
        setLoading(false);
        setCurrentPage(0);
        setLoadedImages(new Set());
        return;
      }

      // Fallback: Fetch pages from online API
      getChapterPages(chapterId).then((data) => {
        if (cancelled) return;
        if (!data) {
          setError('Failed to load chapter pages');
          setLoading(false);
          return;
        }
        const urls = buildPageUrlsFromChapterData(data, 'data-saver');
        setPageUrls(urls);
        setLoading(false);
        setCurrentPage(0);
        setLoadedImages(new Set());
      }).catch((err) => {
        if (!cancelled) {
          setError(err?.message || 'Failed to load chapter');
          setLoading(false);
        }
      });
    }).catch(() => {
      // If getLocalPageUris errors out, fallback to online API
      getChapterPages(chapterId).then((data) => {
        if (cancelled) return;
        if (!data) {
          setError('Failed to load chapter pages');
          setLoading(false);
          return;
        }
        const urls = buildPageUrlsFromChapterData(data, 'data-saver');
        setPageUrls(urls);
        setLoading(false);
        setCurrentPage(0);
        setLoadedImages(new Set());
      }).catch((err) => {
        if (!cancelled) {
          setError(err?.message || 'Failed to load chapter');
          setLoading(false);
        }
      });
    });

    // Fetch chapter list for navigation
    if (mangaId) {
      getMangaFeed(mangaId, 500, 0).then((feed) => {
        if (cancelled) return;
        const chapters = feed.data.map((c) => ({ id: c.id, chapter: c.chapter }));
        // Sort ascending
        chapters.sort((a, b) => parseFloat(a.chapter) - parseFloat(b.chapter));
        setChapterList(chapters);
        const idx = chapters.findIndex((c) => c.id === chapterId);
        setCurrentChapterIdx(idx);
        if (idx >= 0) {
          setMangaTitle(feed.data[idx]?.title ? `Ch. ${feed.data[idx].chapter}` : '');
        }
      }).catch(() => {});
    }

    // Load persisted progress
    if (mangaId && chapterId) {
      getChapterProgress(mangaId, chapterId).then((prog) => {
        if (cancelled || !prog) return;
        setIsRead(prog.isRead);
        setScrollPercent(prog.scrollPercentage);
      }).catch(() => {});
    }

    return () => { cancelled = true; };
  }, [chapterId, mangaId]);

  // ─── Prefetch neighbouring pages ──────────────────────────────────────

  const prefetchPage = useCallback((index: number) => {
    if (index >= 0 && index < pageUrls.length && !loadedImages.has(index)) {
      Image.prefetch(pageUrls[index]).then(() => {
        setLoadedImages((prev) => new Set(prev).add(index));
      }).catch(() => {});
    }
  }, [pageUrls, loadedImages]);

  useEffect(() => {
    if (pageUrls.length > 0) {
      prefetchPage(currentPage);
      for (let i = 1; i <= 3; i++) {
        prefetchPage(currentPage + i);
        prefetchPage(currentPage - i);
      }
    }
  }, [currentPage, pageUrls.length, prefetchPage]);

  // ─── Save progress ────────────────────────────────────────────────────

  const saveProgress = useCallback((page: number, total: number) => {
    if (!mangaId || !chapterId || total === 0) return;
    const pct = Math.round(((page + 1) / total) * 100);
    setScrollPercent(pct);

    const chapterNumNum = chapterNum ? parseFloat(chapterNum) : 0;

    updateChapterProgress({
      chapterId,
      mangaId,
      mangaTitle: mangaTitle || `Chapter ${chapterNum}`,
      chapterNumber: chapterNumNum,
      scrollPercentage: pct,
    }).catch(() => {});

    if (pct >= 90 && !isRead) {
      markChapterRead(mangaId, chapterId, mangaTitle || `Chapter ${chapterNum}`, undefined, undefined, chapterNumNum)
        .then(() => setIsRead(true))
        .catch(() => {});
    }
  }, [mangaId, chapterId, chapterNum, mangaTitle, isRead]);

  // ─── Double-tap to toggle controls ────────────────────────────────────

  const handleDoubleTap = useCallback(() => {
    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      setShowControls((prev) => !prev);
      lastTapRef.current = 0;
    } else {
      lastTapRef.current = now;
    }
  }, []);

  // ─── Navigate to another chapter ──────────────────────────────────────

  const navigateToChapter = useCallback((chapterId: string, chapterNum: string) => {
    setLoading(true);
    setPageUrls([]);
    setError(null);
    // The route params update triggers re-fetch via useEffect
    // We mutate route params by navigating
    navigation.setParams({ chapterId, chapterNum } as any);
  }, [navigation]);

  const goToNextChapter = useCallback(() => {
    if (currentChapterIdx >= 0 && currentChapterIdx < chapterList.length - 1) {
      const next = chapterList[currentChapterIdx + 1];
      navigateToChapter(next.id, next.chapter);
    }
  }, [currentChapterIdx, chapterList, navigateToChapter]);

  const goToPrevChapter = useCallback(() => {
    if (currentChapterIdx > 0) {
      const prev = chapterList[currentChapterIdx - 1];
      navigateToChapter(prev.id, prev.chapter);
    }
  }, [currentChapterIdx, chapterList, navigateToChapter]);

  // ─── Scroll handler for vertical mode ─────────────────────────────────

  const handleScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
    const pct = Math.min(100, Math.max(0, Math.round(
      (contentOffset.y / (contentSize.height - layoutMeasurement.height)) * 100
    )));
    const page = Math.round((pct / 100) * (pageUrls.length - 1));
    setCurrentPage(page);
    if (pageUrls.length > 0 && !progressSavedRef.current) {
      saveProgress(page, pageUrls.length);
    }
  }, [pageUrls.length, saveProgress]);

  // ─── Cycle reader mode ───────────────────────────────────────────────

  const cycleMode = useCallback(() => {
    setReaderMode((prev) => {
      const modes: ReaderMode[] = ['vertical', 'ltr', 'rtl'];
      return modes[(modes.indexOf(prev) + 1) % modes.length];
    });
  }, []);

  // ─── Cycle theme ──────────────────────────────────────────────────────

  const cycleTheme = useCallback(() => {
    setReaderTheme((prev) => {
      const themes: ReaderTheme[] = ['dark', 'light', 'sepia'];
      return themes[(themes.indexOf(prev) + 1) % themes.length];
    });
  }, []);

  // ─── Loading state ───────────────────────────────────────────────────

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: THEME_BG[readerTheme] }]}>
        <StatusBar hidden />
        <ActivityIndicator size="large" color={colors.lavender} />
        <Text style={[styles.loadingText, { color: THEME_TEXT[readerTheme] }]}>
          Loading chapter...
        </Text>
      </View>
    );
  }

  // ─── Error state ─────────────────────────────────────────────────────

  if (error || pageUrls.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: THEME_BG[readerTheme] }]}>
        <StatusBar hidden />
        <Text style={styles.errorText}>{error || 'No pages found'}</Text>
        <Pressable style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnText}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  // ─── Render helpers ──────────────────────────────────────────────────

  const renderPage = (uri: string, index: number) => (
    <ReaderPage
      key={`${index}-${uri}`}
      uri={uri}
      index={index}
      isActive={index === currentPage}
      theme={readerTheme}
      onLoad={() => setLoadedImages((prev) => new Set(prev).add(index))}
    />
  );

  const renderControls = () => (
    <ReaderControls
      chapterNum={chapterNum ?? ''}
      readerMode={readerMode}
      readerTheme={readerTheme}
      currentPage={currentPage}
      totalPages={pageUrls.length}
      scrollPercent={scrollPercent}
      isRead={isRead}
      hasPrevChapter={currentChapterIdx > 0}
      hasNextChapter={currentChapterIdx < chapterList.length - 1}
      onToggleMode={cycleMode}
      onToggleTheme={cycleTheme}
      onClose={() => navigation.goBack()}
      onPrevChapter={goToPrevChapter}
      onNextChapter={goToNextChapter}
    />
  );

  // ═════════════════════════════════════════════════════════════════════
  // VERTICAL SCROLL MODE
  // ═════════════════════════════════════════════════════════════════════

  if (readerMode === 'vertical') {
    return (
      <View style={[styles.container, { backgroundColor: THEME_BG[readerTheme] }]}>
        <StatusBar hidden />
        <ScrollView
          ref={scrollViewRef}
          showsVerticalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={100}
          onMomentumScrollEnd={() => {
            saveProgress(currentPage, pageUrls.length);
          }}
        >
          {pageUrls.map((uri, i) => renderPage(uri, i))}
        </ScrollView>
        {showControls && renderControls()}
        <Pressable style={StyleSheet.absoluteFill} onPress={handleDoubleTap} />
      </View>
    );
  }

  // ═════════════════════════════════════════════════════════════════════
  // LTR / RTL PAGE-BY-PAGE MODE
  // ═════════════════════════════════════════════════════════════════════

  const isRtl = readerMode === 'rtl';
  const canGoBack = isRtl ? currentPage < pageUrls.length - 1 : currentPage > 0;
  const canGoForward = isRtl ? currentPage > 0 : currentPage < pageUrls.length - 1;

  const goPrev = () => {
    const next = isRtl ? currentPage + 1 : currentPage - 1;
    if (next >= 0 && next < pageUrls.length) {
      setCurrentPage(next);
      saveProgress(next, pageUrls.length);
    }
  };

  const goNext = () => {
    const next = isRtl ? currentPage - 1 : currentPage + 1;
    if (next >= 0 && next < pageUrls.length) {
      setCurrentPage(next);
      saveProgress(next, pageUrls.length);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: THEME_BG[readerTheme] }]}>
      <StatusBar hidden />
      <View style={styles.pageContainer}>
        {renderPage(pageUrls[currentPage], currentPage)}
      </View>

      {/* Side navigation arrows */}
      {canGoBack && (
        <Pressable
          style={[styles.navArrow, isRtl ? styles.navRight : styles.navLeft]}
          onPress={goPrev}
        >
          <Text style={styles.navArrowText}>{isRtl ? '▶' : '◀'}</Text>
        </Pressable>
      )}
      {canGoForward && (
        <Pressable
          style={[styles.navArrow, isRtl ? styles.navLeft : styles.navRight]}
          onPress={goNext}
        >
          <Text style={styles.navArrowText}>{isRtl ? '◀' : '▶'}</Text>
        </Pressable>
      )}

      {/* Next/Prev chapter buttons at boundaries */}
      {currentPage === 0 && currentChapterIdx > 0 && (
        <Pressable style={[styles.chapterNavBtn, { left: 20, top: '50%' }]} onPress={goToPrevChapter}>
          <Text style={styles.chapterNavText}>◀ Prev Ch.</Text>
        </Pressable>
      )}
      {currentPage === pageUrls.length - 1 && currentChapterIdx < chapterList.length - 1 && (
        <Pressable style={[styles.chapterNavBtn, { right: 20, top: '50%' }]} onPress={goToNextChapter}>
          <Text style={styles.chapterNavText}>Next Ch. ▶</Text>
        </Pressable>
      )}

      {showControls && renderControls()}
      <Pressable style={StyleSheet.absoluteFill} onPress={handleDoubleTap} />
    </View>
  );
}

// ─── Reader Page Component ─────────────────────────────────────────────

function ReaderPage({ uri, index, isActive, theme, onLoad }: {
  uri: string;
  index: number;
  isActive: boolean;
  theme: ReaderTheme;
  onLoad?: () => void;
}) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (isActive && !loaded) {
      Image.prefetch(uri).catch(() => {});
    }
  }, [isActive, uri, loaded]);

  if (!isActive && !loaded) {
    return <View style={[styles.pagePlaceholder, { backgroundColor: THEME_BG[theme] }]} />;
  }

  return (
    <View style={styles.pageWrap}>
      {!loaded && !failed && (
        <View style={[styles.pagePlaceholder, { backgroundColor: THEME_BG[theme] }]}>
          <ActivityIndicator size="small" color={colors.lavender} />
        </View>
      )}
      {failed ? (
        <View style={[styles.pagePlaceholder, { backgroundColor: THEME_BG[theme] }]}>
          <Text style={styles.errorText}>Failed to load</Text>
        </View>
      ) : (
        <Image
          source={{ uri }}
          style={styles.pageImage}
          resizeMode="contain"
          onLoad={() => { setLoaded(true); onLoad?.(); }}
          onError={() => setFailed(true)}
        />
      )}
    </View>
  );
}

// ─── Reader Controls Overlay ───────────────────────────────────────────

function ReaderControls({
  chapterNum, readerMode, readerTheme, currentPage, totalPages,
  scrollPercent, isRead, hasPrevChapter, hasNextChapter,
  onToggleMode, onToggleTheme, onClose, onPrevChapter, onNextChapter,
}: {
  chapterNum: string;
  readerMode: ReaderMode;
  readerTheme: ReaderTheme;
  currentPage: number;
  totalPages: number;
  scrollPercent: number;
  isRead: boolean;
  hasPrevChapter: boolean;
  hasNextChapter: boolean;
  onToggleMode: () => void;
  onToggleTheme: () => void;
  onClose: () => void;
  onPrevChapter: () => void;
  onNextChapter: () => void;
}) {
  const modeLabels: Record<ReaderMode, string> = {
    vertical: 'Scroll',
    ltr: 'L→R',
    rtl: 'R→L',
  };
  const themeLabels: Record<ReaderTheme, string> = {
    dark: '🌙 Dark',
    light: '☀️ Light',
    sepia: '📜 Sepia',
  };
  const overlayBg = THEME_OVERLAY[readerTheme];
  const textColor = THEME_TEXT[readerTheme];

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {/* Top bar */}
      <View style={[styles.topBar, { backgroundColor: overlayBg }]}>
        <Pressable onPress={onClose} style={styles.controlBtn}>
          <Text style={[styles.controlBtnText, { color: textColor }]}>✕</Text>
        </Pressable>
        <Text style={[styles.chapterTitle, { color: textColor }]}>
          Ch. {chapterNum}
        </Text>
        <View style={styles.topRightBtns}>
          <Pressable onPress={onToggleTheme} style={styles.controlBtn}>
            <Text style={[styles.controlBtnText, { color: textColor, fontSize: 11 }]}>
              {themeLabels[readerTheme]}
            </Text>
          </Pressable>
          <Pressable onPress={onToggleMode} style={[styles.controlBtn, { marginLeft: 6 }]}>
            <Text style={[styles.controlBtnText, { color: textColor }]}>
              {modeLabels[readerMode]}
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Bottom bar */}
      <View style={[styles.bottomBar, { backgroundColor: overlayBg }]}>
        {/* Progress bar */}
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${Math.min(100, scrollPercent)}%` }]} />
        </View>

        <View style={styles.bottomRow}>
          <Text style={[styles.pageIndicator, { color: textColor }]}>
            {currentPage + 1} / {totalPages} ({scrollPercent}%)
          </Text>
          {isRead && <Text style={styles.readBadge}>✓ Read</Text>}
        </View>

        <View style={styles.chapterNavRow}>
          <Pressable
            onPress={onPrevChapter}
            style={[styles.chapterNavBtnSmall, !hasPrevChapter && styles.chapterNavBtnDisabled]}
            disabled={!hasPrevChapter}
          >
            <Text style={styles.chapterNavBtnText}>◀ Prev Ch.</Text>
          </Pressable>
          <Pressable
            onPress={onNextChapter}
            style={[styles.chapterNavBtnSmall, !hasNextChapter && styles.chapterNavBtnDisabled]}
            disabled={!hasNextChapter}
          >
            <Text style={styles.chapterNavBtnText}>Next Ch. ▶</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingText: {
    textAlign: 'center',
    marginTop: 12,
    fontSize: 15,
  },
  errorText: {
    color: '#f87171',
    textAlign: 'center',
    fontSize: 16,
    marginHorizontal: 20,
  },
  backBtn: {
    alignSelf: 'center',
    marginTop: 20,
    paddingVertical: 10,
    paddingHorizontal: 24,
    backgroundColor: colors.lavender,
    borderRadius: 8,
  },
  backBtnText: {
    color: colors.deepPlum,
    fontWeight: '600',
  },
  pageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
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
    backgroundColor: colors.lavender,
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
    color: colors.success,
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
    backgroundColor: colors.lavender,
    borderRadius: 6,
    alignItems: 'center',
  },
  chapterNavBtnDisabled: {
    opacity: 0.4,
  },
  chapterNavBtnText: {
    color: colors.deepPlum,
    fontWeight: '600',
    fontSize: 13,
  },
  // Side navigation arrows
  navArrow: {
    position: 'absolute',
    top: '45%',
    zIndex: 10,
    padding: 16,
  },
  navLeft: { left: 4 },
  navRight: { right: 4 },
  navArrowText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 32,
  },
  // Chapter nav at boundaries
  chapterNavBtn: {
    position: 'absolute',
    zIndex: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(139,92,246,0.8)',
    borderRadius: 8,
  },
  chapterNavText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
});