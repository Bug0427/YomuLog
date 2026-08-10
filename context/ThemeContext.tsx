// context/ThemeContext.tsx
// Global theme provider managing light, dark, and sepia modes.
// Persists theme choice in AsyncStorage and exposes colors via useTheme().

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  type ReactNode,
} from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── Types ───────────────────────────────────────────────────────────

export type ThemeMode = 'light' | 'dark' | 'sepia';

export type ThemeColors = {
  // Primary backgrounds
  bg: string;
  bgSecondary: string;
  bgCard: string;
  bgInput: string;

  // Text
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  textInverse: string;

  // Accent / brand
  accent: string;
  accentLight: string;
  accentDark: string;

  // Borders
  border: string;
  borderLight: string;

  // Status
  success: string;
  error: string;
  warning: string;

  // Misc
  overlay: string;
  placeholder: string;
  headerBg: string;
};

export type ThemeContextValue = {
  mode: ThemeMode;
  colors: ThemeColors;
  setTheme: (mode: ThemeMode) => Promise<void>;
  cycleTheme: () => Promise<void>;
};

// ─── Theme colour maps ───────────────────────────────────────────────

const THEMES: Record<ThemeMode, ThemeColors> = {
  light: {
    bg: '#AFA6DD',           // lavender — existing app background
    bgSecondary: '#b8b1db',  // paleLavender
    bgCard: '#E3D3BD',       // sand
    bgInput: '#fff8f0',      // creamWhite

    textPrimary: '#543C27',  // cocoa
    textSecondary: '#463B54',// plum
    textMuted: '#7a6e8f',   // mutedPlum
    textInverse: '#ffffff',

    accent: '#463B54',       // plum
    accentLight: '#AFA6DD',  // lavender
    accentDark: '#412d5c',   // deepPlum

    border: '#463B54',       // plum
    borderLight: '#543C27',  // cocoa

    success: '#7bd88f',
    error: '#ff6b6b',
    warning: '#8e6e53',      // splashText

    overlay: 'rgba(0,0,0,0.5)',
    placeholder: '#595360',
    headerBg: '#AFA6DD',
  },

  dark: {
    bg: '#1a1a2e',
    bgSecondary: '#16213e',
    bgCard: '#0f3460',
    bgInput: '#1a1a2e',

    textPrimary: '#e0e0e0',
    textSecondary: '#a0a0c0',
    textMuted: '#6a6a8a',
    textInverse: '#1a1a2e',

    accent: '#7b6ef6',
    accentLight: '#9b8ef8',
    accentDark: '#5a4ed6',

    border: '#3a3a5a',
    borderLight: '#2a2a4a',

    success: '#4caf50',
    error: '#f44336',
    warning: '#ff9800',

    overlay: 'rgba(0,0,0,0.7)',
    placeholder: '#5a5a7a',
    headerBg: '#16213e',
  },

  sepia: {
    bg: '#f4ecd8',
    bgSecondary: '#e8dcc8',
    bgCard: '#d4c4a8',
    bgInput: '#faf5e8',

    textPrimary: '#3b2f1e',
    textSecondary: '#5c4a2e',
    textMuted: '#8a7a5a',
    textInverse: '#f4ecd8',

    accent: '#8b6914',
    accentLight: '#c4a44a',
    accentDark: '#5c4200',

    border: '#8b6914',
    borderLight: '#c4a44a',

    success: '#5a8a3c',
    error: '#a0443c',
    warning: '#b8860b',

    overlay: 'rgba(60,40,10,0.5)',
    placeholder: '#9a8a6a',
    headerBg: '#e8dcc8',
  },
};

const THEME_ORDER: ThemeMode[] = ['light', 'dark', 'sepia'];

// ─── Storage ─────────────────────────────────────────────────────────

const STORAGE_KEY = '@YomuLog:theme';

async function loadTheme(): Promise<ThemeMode> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw === 'dark' || raw === 'sepia' || raw === 'light') return raw;
  } catch {}
  return 'light';
}

async function saveTheme(mode: ThemeMode): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, mode);
}

// ─── Context ─────────────────────────────────────────────────────────

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>('light');
  const [ready, setReady] = useState(false);

  // Load persisted theme on mount
  useEffect(() => {
    loadTheme().then((m) => {
      setMode(m);
      setReady(true);
    });
  }, []);

  const setTheme = useCallback(async (m: ThemeMode) => {
    setMode(m);
    await saveTheme(m);
  }, []);

  const cycleTheme = useCallback(async () => {
    const idx = THEME_ORDER.indexOf(mode);
    const next = THEME_ORDER[(idx + 1) % THEME_ORDER.length];
    await setTheme(next);
  }, [mode, setTheme]);

  const colors = useMemo(() => THEMES[mode], [mode]);

  const value = useMemo<ThemeContextValue>(
    () => ({ mode, colors, setTheme, cycleTheme }),
    [mode, colors, setTheme, cycleTheme],
  );

  // Show a loading indicator while theme loads from storage
  // instead of returning null (which causes a blank white screen on slow AsyncStorage)
  if (!ready) {
    return (
      <View style={loadingStyles.container}>
        <ActivityIndicator size="large" color="#AFA6DD" />
      </View>
    );
  }

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

const loadingStyles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#AFA6DD',
  },
});

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return ctx;
}
