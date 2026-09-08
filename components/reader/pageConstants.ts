// components/reader/pageConstants.ts
// Shared reader page-geometry constants (extracted from ReaderScreen — H-6
// decomposition). Both ReaderPage and the vertical-mode windowing need these.
import { Dimensions } from 'react-native';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

export { SCREEN_W, SCREEN_H };

/** Estimated page height — every page box is ~SCREEN_H tall (pageImage is
 * SCREEN_H with `contain` letterboxing; pageWrap minHeight 0.8×SCREEN_H). */
export const PAGE_ESTIMATED_HEIGHT = SCREEN_H;
/** Overscan absorbs the variance; out-of-window pages render as fixed-height
 * placeholders so the ScrollView keeps a stable content height. */
export const PAGE_OVERSCAN = 2;