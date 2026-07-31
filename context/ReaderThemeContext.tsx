// context/ReaderThemeContext.tsx
// Premium-gated reader theme management — presets, brightness, font size.
// Persists to AsyncStorage per-user. Free users get 3 base themes;
// Premium unlocks Night (OLED black) and Mint presets.

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  type ReactNode,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { usePremium } from './PremiumContext';

// ─── Types ───────────────────────────────────────────────────────────

export type ReaderThemePreset = 'dark' | 'light' | 'sepia' | 'night' | 'mint';

export type ReaderThemeConfig = {
  preset: ReaderThemePreset;
  /** Background color for the reading surface */
  bg: string;
  /** Primary text / UI chrome color */
  text: string;
  /** Semi-transparent overlay for the controls bar */
  overlay: string;
  /** Label for display in picker */
  label: string;
  /** Emoji icon for toolbar display */
  icon: string;
  /** Whether this preset requires Premium */
  isPremium: boolean;
};

export type ReaderThemeState = {
  /** Active preset */
  preset: ReaderThemePreset;
  /** Brightness multiplier 0.3–1.0 (1.0 = native, lower = dimmer) */
  brightness: number;
  /** Font size in pts (12–24) */
  fontSize: number;
};

export type ReaderThemeContextValue = ReaderThemeState & {
  /** All available preset configs */
  presets: ReaderThemeConfig[];
  /** Active preset config */
  activeConfig: ReaderThemeConfig;
  /** Set a new preset (may be gated) */
  setPreset: (preset: ReaderThemePreset) => Promise<void>;
  /** Adjust brightness 0.3–1.0 */
  setBrightness: (val: number) => Promise<void>;
  /** Adjust font size 12–24 */
  setFontSize: (val: number) => Promise<void>;
};

// ─── Theme presets ────────────────────────────────────────────────────

const PRESETS: Record<ReaderThemePreset, Omit<ReaderThemeConfig, 'preset' | 'isPremium'>> = {
  dark: {
    bg: '#111111',
    text: '#e0e0e0',
    overlay: 'rgba(0,0,0,0.85)',
    label: 'Dark',
    icon: '🌙',
  },
  light: {
    bg: '#fff8f0',
    text: '#333333',
    overlay: 'rgba(255,248,240,0.92)',
    label: 'Light',
    icon: '☀️',
  },
  sepia: {
    bg: '#f5e6c8',
    text: '#5a4a3a',
    overlay: 'rgba(245,230,200,0.92)',
    label: 'Sepia',
    icon: '📜',
  },
  night: {
    bg: '#000000',
    text: '#cccccc',
    overlay: 'rgba(0,0,0,0.95)',
    label: 'Night',
    icon: '🖤',
  },
  mint: {
    bg: '#e8f5e9',
    text: '#2e4a2e',
    overlay: 'rgba(232,245,233,0.94)',
    label: 'Mint',
    icon: '🌿',
  },
};

const PREMIUM_PRESETS: ReaderThemePreset[] = ['night', 'mint'];
const FREE_PRESETS: ReaderThemePreset[] = ['dark', 'light', 'sepia'];

// ─── Storage ──────────────────────────────────────────────────────────

const STORAGE_KEY = '@YomuLog:readerThemeState';

const DEFAULT_STATE: ReaderThemeState = {
  preset: 'dark',
  brightness: 1.0,
  fontSize: 14,
};

async function loadState(): Promise<ReaderThemeState> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_STATE;
    const parsed = JSON.parse(raw);
    return {
      preset: validatePreset(parsed.preset),
      brightness: clamp(parsed.brightness ?? 1.0, 0.3, 1.0),
      fontSize: clamp(parsed.fontSize ?? 14, 12, 24),
    };
  } catch {
    return DEFAULT_STATE;
  }
}

async function saveState(state: ReaderThemeState): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function validatePreset(v: unknown): ReaderThemePreset {
  const valid: ReaderThemePreset[] = ['dark', 'light', 'sepia', 'night', 'mint'];
  return valid.includes(v as ReaderThemePreset) ? (v as ReaderThemePreset) : 'dark';
}

function clamp(val: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, val));
}

// ─── Context ──────────────────────────────────────────────────────────

const ReaderThemeContext = createContext<ReaderThemeContextValue | null>(null);

export function ReaderThemeProvider({ children }: { children: ReactNode }) {
  const { isPremium } = usePremium();
  const [state, setState] = useState<ReaderThemeState>(DEFAULT_STATE);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    loadState().then((s) => {
      // If user downgraded from Premium, fall back to a free preset
      if (!isPremium && PREMIUM_PRESETS.includes(s.preset)) {
        s.preset = 'dark';
      }
      setState(s);
      setReady(true);
    });
  }, [isPremium]);

  const persist = useCallback(async (patch: Partial<ReaderThemeState>) => {
    setState((prev) => {
      const next = { ...prev, ...patch };
      saveState(next);
      return next;
    });
  }, []);

  const setPreset = useCallback(
    async (preset: ReaderThemePreset) => {
      if (PREMIUM_PRESETS.includes(preset) && !isPremium) return; // silently reject
      await persist({ preset });
    },
    [isPremium, persist],
  );

  const setBrightness = useCallback(
    async (val: number) => {
      await persist({ brightness: clamp(val, 0.3, 1.0) });
    },
    [persist],
  );

  const setFontSize = useCallback(
    async (val: number) => {
      await persist({ fontSize: clamp(val, 12, 24) });
    },
    [persist],
  );

  // Build preset configs with premium flag
  const presets = useMemo<ReaderThemeConfig[]>(
    () =>
      (Object.keys(PRESETS) as ReaderThemePreset[]).map((key) => ({
        preset: key,
        ...PRESETS[key],
        isPremium: PREMIUM_PRESETS.includes(key),
      })),
    [],
  );

  const activeConfig = useMemo<ReaderThemeConfig>(
    () => presets.find((p) => p.preset === state.preset) ?? presets[0],
    [presets, state.preset],
  );

  const value = useMemo<ReaderThemeContextValue>(
    () => ({
      ...state,
      presets,
      activeConfig,
      setPreset,
      setBrightness,
      setFontSize,
    }),
    [state, presets, activeConfig, setPreset, setBrightness, setFontSize],
  );

  if (!ready) return null;

  return (
    <ReaderThemeContext.Provider value={value}>
      {children}
    </ReaderThemeContext.Provider>
  );
}

export function useReaderTheme(): ReaderThemeContextValue {
  const ctx = useContext(ReaderThemeContext);
  if (!ctx) {
    throw new Error('useReaderTheme must be used within a ReaderThemeProvider');
  }
  return ctx;
}
