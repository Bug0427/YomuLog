// components/reader/pageConstants.ts
// Shared reader page-geometry (extracted from ReaderScreen — H-6
// decomposition). Both ReaderPage and the vertical-mode windowing need these.
// M-1..M-4: geometry is now reactive (useReaderGeometry) instead of a static
// module-level Dimensions.get — the reader centres pages with a max width on
// tablet/desktop (web content column cap via useContentWidth).
import { useWindowDimensions } from 'react-native';
import { useContentWidth } from '../../utils/findDimensions';

export type ReaderGeometry = {
  /** Page-box width — capped content-column width on web, full window on native. */
  screenW: number;
  /** Page-box height — full window height (portrait pages letterbox). */
  screenH: number;
};

/** Reactive reader geometry — re-renders on resize/rotation. */
export const useReaderGeometry = (): ReaderGeometry => {
  const screenW = useContentWidth();
  const { height: screenH } = useWindowDimensions();
  return { screenW, screenH };
};

/**
 * Estimated page height — every page box is ~screenH tall (pageImage is
 * screenH with `contain` letterboxing; pageWrap minHeight 0.8×screenH).
 * Exposed as a function of the hook so windowing can stay reactive.
 */
export const getPageEstimatedHeight = (g: ReaderGeometry) => g.screenH;

/** Overscan absorbs the variance; out-of-window pages render as fixed-height
 * placeholders so the ScrollView keeps a stable content height. */
export const PAGE_OVERSCAN = 2;