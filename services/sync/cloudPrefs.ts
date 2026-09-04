// services/sync/cloudPrefs.ts
// Preferences scope (H-4 split — moved verbatim from
// services/supabaseSyncService.ts: syncPreferencesReal ~:400–:432 and
// syncPreferencesFallback ~:611–:616). Pushes/pulls user_preferences both on
// the real Supabase path and the AsyncStorage mirror fallback.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../supabaseClient';
import { KEYS, setJson, isoNow } from './types';

export async function syncPreferencesReal(userId: string): Promise<void> {
  // --- Push local → Supabase ---
  const { loadAllPreferences } = await import('../preferencesService');
  const prefs = await loadAllPreferences();
  const { error: pushErr } = await supabase
    .from('user_preferences')
    .upsert({
      user_id: userId,
      language: prefs.language,
      alerts_on: prefs.alertsOn,
      ai_search_on: prefs.aiSearchOn,
      direction_mode: prefs.directionMode,
      updated_at: isoNow(),
    }, { onConflict: 'user_id' });
  if (pushErr) throw new Error(`Preferences push: ${pushErr.message}`);

  // --- Pull Supabase → local ---
  const { data, error: pullErr } = await supabase
    .from('user_preferences')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  if (pullErr && pullErr.code !== 'PGRST116') throw new Error(`Preferences pull: ${pullErr.message}`);
  if (!data) return;

  const { setLanguage, setAlertsOn, setAISearchOn, setDirectionMode } = await import('../preferencesService');
  await Promise.all([
    setLanguage(data.language as 'en' | 'ja' | 'ko'),
    setAlertsOn(data.alerts_on),
    setAISearchOn(data.ai_search_on),
    setDirectionMode(data.direction_mode as 'ltr' | 'rtl' | 'vertical'),
  ]);
}

export async function syncPreferencesFallback(): Promise<void> {
  // Simple fallback: keep local prefs as truth, push to cloud mirror
  const { loadAllPreferences } = await import('../preferencesService');
  const prefs = await loadAllPreferences();
  await setJson(KEYS.CLOUD_PREFERENCES, { ...prefs, updatedAt: isoNow() });
}

/** Destructure cloud-mirror prefs into the local preferences store (fallback pull). */
export async function applyCloudPrefs(cloudPrefs: any): Promise<void> {
  const { setLanguage, setAlertsOn, setAISearchOn, setDirectionMode } = await import('../preferencesService');
  await Promise.all([
    setLanguage(cloudPrefs.language as 'en' | 'ja' | 'ko'),
    setAlertsOn(cloudPrefs.alerts_on),
    setAISearchOn(cloudPrefs.ai_search_on),
    setDirectionMode(cloudPrefs.direction_mode as 'ltr' | 'rtl' | 'vertical'),
  ]);
}

// (No separate public result type — the fallback returns void.)