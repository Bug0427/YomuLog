import { useWindowDimensions, Platform } from 'react-native';

// ─── Breakpoint source of truth (responsive M-1..M-4) ─────────────────────
// Single place every screen and component reads sizes/breakpoints from.
// Includes:
//  - the fine-grained 5-tier BREAKPOINTS (existing consumers)
//  - the owner-facing 3-tier LayoutTier (mobile / tablet / desktop)
//  - useContentWidth(): the width of the *content column*, not the raw
//    window width — on web it is capped at WEB_MAX_WIDTH to match the
//    ResponsiveContainer in App.tsx, so children never overflow the
//    centred desktop column.

/** Max content width on desktop web (must match App.tsx ResponsiveContainer). */
export const WEB_MAX_WIDTH = 1200;

export const BREAKPOINTS = { xs: 0, sm: 360, md: 600, lg: 840, xl: 1200 } as const;
export type BreakpointKey = keyof typeof BREAKPOINTS;

export const getBreakpoint = (width: number): BreakpointKey => {
  if (width >= BREAKPOINTS.xl) return 'xl';
  if (width >= BREAKPOINTS.lg) return 'lg';
  if (width >= BREAKPOINTS.md) return 'md';
  if (width >= BREAKPOINTS.sm) return 'sm';
  return 'xs';
};

/** Owner-facing tier: mobile <768 · tablet 768–1199 · desktop ≥1200. */
export type LayoutTier = 'mobile' | 'tablet' | 'desktop';

export const getLayoutTier = (width: number): LayoutTier => {
  if (width >= WEB_MAX_WIDTH) return 'desktop';
  if (width >= 768) return 'tablet';
  return 'mobile';
};

// Hook to get the current width
export const useWindowWidth = () => {
  const { width } = useWindowDimensions();
  return width;
};

// Hook to directly get current breakpoint (5-tier, existing consumers)
export const useBreakpoint = (): BreakpointKey => {
  const width = useWindowWidth();
  return getBreakpoint(width);
};

// Hook to directly get the owner-facing tier (mobile/tablet/desktop)
export const useLayoutTier = (): LayoutTier => {
  const width = useWindowWidth();
  return getLayoutTier(width);
};

/**
 * Width of the content column the app actually lays out inside.
 * On web the App ResponsiveContainer caps the layout at WEB_MAX_WIDTH and
 * centres it; on native the content column is the full window.
 */
export const useContentWidth = (): number => {
  const { width } = useWindowDimensions();
  return Platform.OS === 'web' ? Math.min(width, WEB_MAX_WIDTH) : width;
};