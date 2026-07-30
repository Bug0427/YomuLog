// services/preferencesService.ts
// Persistent user preferences using AsyncStorage.
// Used by SettingsScreen for language, alerts, AI search, direction mode.

import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── Types ────────────────────────────────────────────────────────────

export type Language = 'en' | 'ja' | 'ko';
export type DirectionMode = 'ltr' | 'rtl' | 'vertical';

export type UserPreferences = {
  language: Language;
  alertsOn: boolean;
  aiSearchOn: boolean;
  directionMode: DirectionMode;
};

// ─── Storage keys ─────────────────────────────────────────────────────

const KEYS = {
  language: '@YomuLog:prefs:language',
  alertsOn: '@YomuLog:prefs:alertsOn',
  aiSearchOn: '@YomuLog:prefs:aiSearchOn',
  directionMode: '@YomuLog:prefs:directionMode',
};

// ─── Defaults ─────────────────────────────────────────────────────────

const DEFAULTS: UserPreferences = {
  language: 'en',
  alertsOn: true,
  aiSearchOn: false,
  directionMode: 'ltr',
};

// ─── Getters / setters ────────────────────────────────────────────────

async function getString(key: string, fallback: string): Promise<string> {
  try {
    const val = await AsyncStorage.getItem(key);
    return val ?? fallback;
  } catch {
    return fallback;
  }
}

async function getBool(key: string, fallback: boolean): Promise<boolean> {
  try {
    const val = await AsyncStorage.getItem(key);
    if (val === null) return fallback;
    return val === 'true';
  } catch {
    return fallback;
  }
}

export async function getLanguage(): Promise<Language> {
  const val = await getString(KEYS.language, DEFAULTS.language);
  if (val === 'ja' || val === 'ko') return val;
  return 'en';
}

export async function setLanguage(lang: Language): Promise<void> {
  await AsyncStorage.setItem(KEYS.language, lang);
}

export async function getAlertsOn(): Promise<boolean> {
  return getBool(KEYS.alertsOn, DEFAULTS.alertsOn);
}

export async function setAlertsOn(val: boolean): Promise<void> {
  await AsyncStorage.setItem(KEYS.alertsOn, val ? 'true' : 'false');
}

export async function getAISearchOn(): Promise<boolean> {
  return getBool(KEYS.aiSearchOn, DEFAULTS.aiSearchOn);
}

export async function setAISearchOn(val: boolean): Promise<void> {
  await AsyncStorage.setItem(KEYS.aiSearchOn, val ? 'true' : 'false');
}

export async function getDirectionMode(): Promise<DirectionMode> {
  const val = await getString(KEYS.directionMode, DEFAULTS.directionMode);
  if (val === 'rtl' || val === 'vertical') return val;
  return 'ltr';
}

export async function setDirectionMode(mode: DirectionMode): Promise<void> {
  await AsyncStorage.setItem(KEYS.directionMode, mode);
}

/** Bulk load all preferences at once */
export async function loadAllPreferences(): Promise<UserPreferences> {
  const [language, alertsOn, aiSearchOn, directionMode] = await Promise.all([
    getLanguage(),
    getAlertsOn(),
    getAISearchOn(),
    getDirectionMode(),
  ]);
  return { language, alertsOn, aiSearchOn, directionMode };
}
