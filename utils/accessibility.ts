// utils/accessibility.ts
// Reusable accessibility helpers for consistent screen reader support across YomuLog.

import { Platform, AccessibilityProps } from 'react-native';

// ─── Minimum touch target ────────────────────────────────────────────

/** WCAG-compliant minimum touch target size (44x44pt) */
export const MIN_TOUCH_SIZE = 44;

/** Returns style properties to ensure a minimum 44x44pt touch target.
 *  Use this on small interactive elements like icon-only buttons. */
export function hitSlop44(): { hitSlop: { top: number; bottom: number; left: number; right: number } } {
  return { hitSlop: { top: 12, bottom: 12, left: 12, right: 12 } };
}

/** Returns minHeight/minWidth style for 44pt touch target enforcement */
export const touchTargetStyle = {
  minHeight: MIN_TOUCH_SIZE,
  minWidth: MIN_TOUCH_SIZE,
  justifyContent: 'center' as const,
  alignItems: 'center' as const,
};

// ─── Label builders ──────────────────────────────────────────────────

/** Build accessibility props for an interactive element.
 *  Automatically merges role, label, hint, and state. */
export function a11yProps(label: string, role?: AccessibilityProps['accessibilityRole'], hint?: string): AccessibilityProps {
  return {
    accessible: true,
    accessibilityLabel: label,
    accessibilityRole: role,
    accessibilityHint: hint,
    ...(Platform.OS === 'android' ? { accessibilityLiveRegion: 'polite' as const } : {}),
  };
}

/** Accessibility props for icon-only buttons.
 *  Requires a descriptive label since there's no visible text. */
export function iconButtonA11y(label: string, hint?: string): AccessibilityProps {
  return a11yProps(label, 'button', hint);
}

/** Accessibility props for navigation tab items */
export function tabA11y(label: string): AccessibilityProps {
  return a11yProps(label, 'tab', `Navigate to ${label}`);
}

/** Accessibility props for images that convey content */
export function imageA11y(description: string): AccessibilityProps {
  return {
    accessible: true,
    accessibilityLabel: description,
    accessibilityRole: 'image',
  };
}

/** Accessibility props for decorative images (hidden from screen readers) */
export function decorativeImageA11y(): AccessibilityProps {
  return {
    accessible: false,
    importantForAccessibility: 'no-hide-descendants' as const,
  };
}

// ─── State descriptors ───────────────────────────────────────────────

/** Returns "selected" or "not selected" for toggle state announcement */
export function selectedState(selected: boolean): string {
  return selected ? 'selected' : 'not selected';
}

/** Describes a toggle element (e.g., checkbox, switch) */
export function toggleA11y(label: string, checked: boolean): AccessibilityProps {
  return {
    ...a11yProps(label, 'switch', `Toggle ${label}`),
    accessibilityState: { checked },
  };
}

// ─── Screen reader order helpers ─────────────────────────────────────

/** Group related elements for screen reader focus ordering */
export function accessibilityGroup(label: string): AccessibilityProps {
  return {
    accessible: true,
    accessibilityLabel: label,
    accessibilityRole: 'summary',
  };
}

// ─── WCAG AA Color Contrast ──────────────────────────────────────────

/** Calculate relative luminance per WCAG 2.1 */
export function luminance(hex: string): number {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const toSRGB = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * toSRGB(r) + 0.7152 * toSRGB(g) + 0.0722 * toSRGB(b);
}

/** Calculate WCAG 2.1 contrast ratio between two hex colors */
export function contrastRatio(hex1: string, hex2: string): number {
  const l1 = luminance(hex1);
  const l2 = luminance(hex2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

/** Check if contrast meets WCAG AA minimum (4.5:1 for normal text, 3:1 for large text) */
export function meetsWCAGAA(foreground: string, background: string, isLargeText = false): boolean {
  const ratio = contrastRatio(foreground, background);
  return isLargeText ? ratio >= 3.0 : ratio >= 4.5;
}
