import { useWindowDimensions } from 'react-native';

export const BREAKPOINTS = { xs: 0, sm: 360, md: 600, lg: 840, xl: 1200 } as const;
export type BreakpointKey = keyof typeof BREAKPOINTS;

export const getBreakpoint = (width: number): BreakpointKey => {
  if (width >= BREAKPOINTS.xl) return 'xl';
  if (width >= BREAKPOINTS.lg) return 'lg';
  if (width >= BREAKPOINTS.md) return 'md';
  if (width >= BREAKPOINTS.sm) return 'sm';
  return 'xs';
};

// Hook to get the current width
export const useWindowWidth = () => {
  const { width } = useWindowDimensions();
  return width;
};

// Hook to directly get current breakpoint
export const useBreakpoint = (): BreakpointKey => {
  const width = useWindowWidth();
  return getBreakpoint(width);
};
